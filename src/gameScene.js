import {
	Scene,
	Vector3,
	HemisphericLight,
	StandardMaterial,
	Color3,
	PointerDragBehavior,
	ArcRotateCamera,
	PointerEventTypes
} from "@babylonjs/core";
import { GameState } from './gameState';
import { ConveyorBelt } from './conveyorBelt';
import { BatteryRack } from './batteryRack';
import { DroneView } from './droneView';
export class GameScene {
	constructor (engine, uiManager) {
		this.engine = engine;
		this.uiManager = uiManager;
		this.scene = new Scene(engine);
		this.scene.clearColor = new Color3(0.1, 0.1, 0.15);
		// Sub-modules
		this.conveyor = null;
		this.rack = null;
		this.droneView = null;
	}
	
	async init () {
		this.createCamera();
		const light = new HemisphericLight("light", new Vector3(0, 1, 0), this.scene);
		light.intensity = 0.8;
		
		this.initMaterials();
		
		// Initialize Sub-modules
		// We pass a callback to register drag behavior so the sub-modules don't need to know about the drone logic directly
		const dragCallback = (mesh) => this.addDragBehavior(mesh);
		
		this.droneView = new DroneView(this.scene, this.getMaterialsObject());
		this.conveyor = new ConveyorBelt(this.scene, this.getMaterialsObject(), dragCallback);
		this.rack = new BatteryRack(this.scene, this.getMaterialsObject(), dragCallback);
		
		this.setupDroneSwipe();
		
		this.scene.registerBeforeRender(() => {
			this.conveyor.update();
			this.rack.update();
			this.droneView.updateVisuals();
		});
	}
	
	createCamera () {
		const camera = new ArcRotateCamera("Camera", -Math.PI / 2, Math.PI / 2.5, 16, Vector3.Zero(), this.scene);
		camera.inputs.clear();
	}
	
	initMaterials () {
		this.matPackage = new StandardMaterial("matPkg", this.scene);
		this.matPackage.diffuseColor = new Color3(0.6, 0.4, 0.2);
		
		this.matTape = new StandardMaterial("matTape", this.scene);
		this.matTape.diffuseColor = new Color3(0.8, 0.8, 0.8);
		
		this.matBatteryCasing = new StandardMaterial("matBatCase", this.scene);
		this.matBatteryCasing.diffuseColor = new Color3(0.1, 0.5, 0.1);
		this.matBatteryCasing.alpha = 0.5;
		
		this.matBatteryCell = new StandardMaterial("matBatCell", this.scene);
		this.matBatteryCell.diffuseColor = new Color3(0.2, 0.9, 0.2);
		
		this.matDrone = new StandardMaterial("matDrone", this.scene);
		this.matRotor = new StandardMaterial("matRotor", this.scene);
		this.matRotor.diffuseColor = new Color3(0.1, 0.1, 0.1);
	}

// Helper to pass materials to sub-modules
	getMaterialsObject () {
		return {
			matPackage: this.matPackage,
			matTape: this.matTape,
			matBatteryCasing: this.matBatteryCasing,
			matBatteryCell: this.matBatteryCell,
			matDrone: this.matDrone,
			matRotor: this.matRotor
		};
	}

	setupDroneSwipe () {
		let startX = 0;
		let isSwipeTarget = false;
		
		this.scene.onPointerObservable.add((pointerInfo) => {
			switch (pointerInfo.type) {
				case PointerEventTypes.POINTERDOWN:
					if (pointerInfo.pickInfo.hit && pointerInfo.pickInfo.pickedMesh) {
						// Check if the picked mesh is part of the drone hierarchy
						const droneMesh = this.droneView ? this.droneView.mesh : null;
						if (droneMesh) {
							let mesh = pointerInfo.pickInfo.pickedMesh;
							let isDrone = false;
							
							// Traverse parents to find if we clicked the drone or its parts
							while (mesh) {
								if (mesh === droneMesh) {
									isDrone = true;
									break;
								}
								mesh = mesh.parent;
							}
							
							if (isDrone) {
								isSwipeTarget = true;
								startX = this.scene.pointerX;
							}
						}
					}
					break;
				
				case PointerEventTypes.POINTERUP:
					if (isSwipeTarget) {
						const endX = this.scene.pointerX;
						const diff = endX - startX;
						const threshold = 20; // Sensitivity threshold
						
						if (Math.abs(diff) > threshold) {
							// Swipe Left (diff < 0) -> Next Drone
							// Swipe Right (diff > 0) -> Previous Drone
							if (diff > 0) {
								this.changeDrone(-1);
							} else {
								this.changeDrone(1);
							}
						}
						isSwipeTarget = false;
					}
					break;
			}
		});
	}
	
	addDragBehavior (mesh) {
		const dragBehavior = new PointerDragBehavior({ dragPlaneNormal: new Vector3(0, 0, 1) });
		
		dragBehavior.onDragStartObservable.add((event) => {
			mesh.metadata.isDragging = true;
			
			// Detach from drone if attached
			if (mesh.metadata.onDrone) {
				mesh.setParent(null);
				mesh.metadata.onDrone = false;
				
				// Clear GameState
				if (mesh.metadata.type === 'package') GameState.currentPackage = null;
				if (mesh.metadata.type === 'battery') GameState.currentBattery = null;
			}
		});
		
		dragBehavior.onDragEndObservable.add((event) => {
			mesh.metadata.isDragging = false;
			
			const droneMesh = this.droneView ? this.droneView.mesh : null;
			
			// Check intersection with drone
			if (droneMesh && !droneMesh.isDisposed() && mesh.intersectsMesh(droneMesh, false)) {
				// Load logic
				if (mesh.metadata.type === 'package' && !GameState.currentPackage) {
					mesh.setParent(droneMesh);
					mesh.position = new Vector3(0, -0.8, 0);
					mesh.rotation = Vector3.Zero();
					mesh.metadata.onDrone = true;
					GameState.currentPackage = mesh.metadata;
					GameState.currentPackage.mesh = mesh;
				} else if (mesh.metadata.type === 'battery' && !GameState.currentBattery) {
					mesh.setParent(droneMesh);
					mesh.position = new Vector3(0, 0.4, 0);
					mesh.rotation = Vector3.Zero();
					mesh.metadata.onDrone = true;
					GameState.currentBattery = mesh.metadata;
					GameState.currentBattery.mesh = mesh;
				} else {
					// Slot occupied
					this.returnToSource(mesh);
				}
			} else {
				// Missed drone
				this.returnToSource(mesh);
			}
		});
		
		mesh.addBehavior(dragBehavior);
	}
	
	returnToSource (mesh) {
		if (mesh.metadata.type === 'battery') {
			mesh.position.y = 2;
			mesh.position.z = 0;
			mesh.position.x = Math.max(-3.5, Math.min(3.5, mesh.position.x));
			mesh.rotation = Vector3.Zero();
		} else {
			mesh.position.y = 4.5;
			mesh.position.z = 0;
			mesh.rotation = Vector3.Zero();
		}
	}
	
	animateDelivery () {
		this.droneView.animateDelivery(() => {
			this.resetDrone();
		});
	}
	
	resetDrone () {
		if (GameState.currentPackage && GameState.currentPackage.mesh) {
			GameState.currentPackage.mesh.dispose();
			GameState.currentPackage = null;
		}
		
		if (GameState.currentBattery && GameState.currentBattery.mesh) {
			GameState.currentBattery.charge = 0;
			if (GameState.currentBattery.uiText) {
				GameState.currentBattery.uiText.text = "0%";
				GameState.currentBattery.uiText.color = "#e74c3c";
			}
		}
		
		this.droneView.animateReturn();
	}
	
	changeDrone (dir) {
		GameState.activeDroneIndex += dir;
		if (GameState.activeDroneIndex < 0) GameState.activeDroneIndex = GameState.drones.length - 1;
		if (GameState.activeDroneIndex >= GameState.drones.length) GameState.activeDroneIndex = 0;
		
		if (GameState.currentPackage && GameState.currentPackage.mesh) {
			this.returnToSource(GameState.currentPackage.mesh);
			GameState.currentPackage = null;
		}
		if (GameState.currentBattery && GameState.currentBattery.mesh) {
			this.returnToSource(GameState.currentBattery.mesh);
			GameState.currentBattery = null;
		}
		
		this.droneView.createMesh();
	}
}
