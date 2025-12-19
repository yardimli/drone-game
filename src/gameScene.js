import {
	Scene,
	Vector3,
	HemisphericLight,
	StandardMaterial,
	Color3,
	PointerDragBehavior,
	ArcRotateCamera,
	PointerEventTypes,
	SceneLoader,
	Camera // --- NEW: Import Camera for constants
} from "@babylonjs/core";
import "@babylonjs/loaders/glTF";
import { GameState } from './gameState';
import { PackageShelf } from './packageShelf';
import { CustomerCounter } from './customerCounter';
import { BatteryRack } from './batteryRack';
import { DroneView } from './droneView';

export class GameScene {
	constructor (engine, uiManager) {
		this.engine = engine;
		this.uiManager = uiManager;
		this.scene = new Scene(engine);
		this.scene.clearColor = new Color3(0.1, 0.1, 0.15);
		
		this.shelf = null;
		this.customer = null;
		this.rack = null;
		this.droneView = null;
		
		this.assets = {};
	}
	
	async init () {
		this.createCamera();
		const light = new HemisphericLight("light", new Vector3(0, 1, 0), this.scene);
		light.intensity = 0.8;
		
		this.initMaterials();
		
		await this.loadAssets();
		
		const dragCallback = (mesh) => this.addDragBehavior(mesh);
		
		this.droneView = new DroneView(this.scene, this.getMaterialsObject(), this.assets);
		this.shelf = new PackageShelf(this.scene, this.getMaterialsObject(), dragCallback, this.assets);
		this.customer = new CustomerCounter(this.scene, this.shelf);
		this.rack = new BatteryRack(this.scene, this.getMaterialsObject(), dragCallback);
		
		this.setupDroneSwipe();
		
		this.scene.registerBeforeRender(() => {
			this.shelf.update();
			this.customer.update();
			this.rack.update();
			this.droneView.updateVisuals();
		});
	}
	
	async loadAssets () {
		const loadPromises = [];
		
		GameState.drones.forEach(drone => {
			const p = SceneLoader.LoadAssetContainerAsync("./assets/", drone.model, this.scene)
				.then(container => {
					this.assets[drone.id] = container;
				});
			loadPromises.push(p);
		});
		
		GameState.packageTypes.forEach(pkg => {
			const p = SceneLoader.LoadAssetContainerAsync("./assets/", pkg.model, this.scene)
				.then(container => {
					this.assets[pkg.id] = container;
				});
			loadPromises.push(p);
		});
		
		await Promise.all(loadPromises);
		console.log("All assets loaded");
	}
	
	createCamera () {
		const camera = new ArcRotateCamera("Camera", -Math.PI / 2, Math.PI / 2, 18, new Vector3(0, 3, 0), this.scene);
		
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
						const droneMesh = this.droneView ? this.droneView.mesh : null;
						if (droneMesh) {
							let mesh = pointerInfo.pickInfo.pickedMesh;
							let isDrone = false;
							
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
						const threshold = 20;
						
						if (Math.abs(diff) > threshold) {
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
			
			if (mesh.metadata.onDrone) {
				mesh.setParent(null);
				mesh.metadata.onDrone = false;
				
				if (mesh.metadata.type === 'package') GameState.currentPackage = null;
				if (mesh.metadata.type === 'battery') GameState.currentBattery = null;
			}
		});
		
		dragBehavior.onDragEndObservable.add((event) => {
			mesh.metadata.isDragging = false;
			
			const droneMesh = this.droneView ? this.droneView.mesh : null;
			
			if (droneMesh && !droneMesh.isDisposed() && mesh.intersectsMesh(droneMesh, true)) {
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
					this.returnToSource(mesh);
				}
			} else {
				this.returnToSource(mesh);
			}
		});
		
		mesh.addBehavior(dragBehavior);
	}
	
	returnToSource (mesh) {
		mesh.setParent(null);
		if (mesh.metadata) mesh.metadata.onDrone = false;
		
		if (mesh.metadata.type === 'battery') {
			// --- MODIFIED: Return to new Rack Y position ---
			mesh.position.y = 2;
			mesh.position.z = 0;
			mesh.position.x = Math.max(-3.5, Math.min(3.5, mesh.position.x));
			mesh.rotation = Vector3.Zero();
		} else {
			// --- MODIFIED: Return to new Shelf Y position ---
			mesh.position = new Vector3(0, 4.5, 1);
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
		
		this.droneView.switchDrone(dir);
	}
}
