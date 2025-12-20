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
	Camera,
	Animation,
	CubicEase,
	EasingFunction
} from "@babylonjs/core";
import "@babylonjs/loaders/glTF";
import { GameState } from './gameState';
import { PackageShelf } from './packageShelf';
import { CustomerCounter } from './customerCounter';
import { BatteryRack } from './batteryRack';
import { DroneView } from './droneView';
import { Decorations } from './decorations';

export class GameScene {
	constructor(engine, uiManager) {
		this.engine = engine;
		this.uiManager = uiManager;
		this.scene = new Scene(engine);
		this.scene.clearColor = new Color3(0.1, 0.1, 0.15);
		this.shelf = null;
		this.customer = null;
		this.rack = null;
		this.droneView = null;
		this.decorations = null;
		
		this.assets = {};
	}
	
	async init() {
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
		
		// Initialize Decorations (Clock and Art)
		this.decorations = new Decorations(this.scene);
		
		this.setupDroneSwipe();
		
		this.scene.registerBeforeRender(() => {
			this.shelf.update();
			this.customer.update();
			this.rack.update();
			this.droneView.updateVisuals();
			// Update clock and other decorations
			if (this.decorations) this.decorations.update();
		});
	}
	
	async loadAssets() {
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
	
	createCamera() {
		const camera = new ArcRotateCamera("Camera", -Math.PI / 2, Math.PI / 2, 18, new Vector3(0, 3, 0), this.scene);
		
		camera.inputs.clear();
	}
	
	initMaterials() {
		this.matPackage = new StandardMaterial("matPkg", this.scene);
		this.matPackage.diffuseColor = new Color3(0.6, 0.4, 0.2);
		
		this.matTape = new StandardMaterial("matTape", this.scene);
		this.matTape.diffuseColor = new Color3(0.8, 0.8, 0.8);
		
		this.matBatteryCasing = new StandardMaterial("matBatCase", this.scene);
		this.matBatteryCasing.diffuseColor = new Color3(0.1, 0.5, 0.1);
		this.matBatteryCasing.alpha = 0.5;
		
		this.matBatteryCell = new StandardMaterial("matBatCell", this.scene);
		this.matBatteryCasing.diffuseColor = new Color3(0.2, 0.9, 0.2);
		
		this.matDrone = new StandardMaterial("matDrone", this.scene);
		this.matRotor = new StandardMaterial("matRotor", this.scene);
		this.matRotor.diffuseColor = new Color3(0.1, 0.1, 0.1);
	}
	
	getMaterialsObject() {
		return {
			matPackage: this.matPackage,
			matTape: this.matTape,
			matBatteryCasing: this.matBatteryCasing,
			matBatteryCell: this.matBatteryCell,
			matDrone: this.matDrone,
			matRotor: this.matRotor
		};
	}
	
	setupDroneSwipe() {
		let startX = 0;
		let isSwipeTarget = false;
		let droneStartPosX = 0;
		
		this.scene.onPointerObservable.add((pointerInfo) => {
			const droneMesh = this.droneView ? this.droneView.mesh : null;
			
			switch (pointerInfo.type) {
				case PointerEventTypes.POINTERDOWN:
					if (pointerInfo.pickInfo.hit && pointerInfo.pickInfo.pickedMesh && droneMesh) {
						let mesh = pointerInfo.pickInfo.pickedMesh;
						let isDrone = false;
						
						// Check if we clicked the drone or its children
						let tempMesh = mesh;
						while (tempMesh) {
							if (tempMesh === droneMesh) {
								isDrone = true;
								break;
							}
							tempMesh = tempMesh.parent;
						}
						
						if (isDrone) {
							// Check if it is a package or battery attached to drone
							// Since we made wrappers pickable and children unpickable,
							// 'mesh' should be the wrapper itself if it's cargo.
							let isCargo = false;
							let checkMesh = mesh;
							
							while (checkMesh && checkMesh !== droneMesh) {
								if (checkMesh.metadata && (checkMesh.metadata.type === 'package' || checkMesh.metadata.type === 'battery')) {
									isCargo = true;
									break;
								}
								checkMesh = checkMesh.parent;
							}
							
							if (!isCargo) {
								isSwipeTarget = true;
								startX = this.scene.pointerX;
								droneStartPosX = droneMesh.position.x;
							}
						}
					}
					break;
				
				case PointerEventTypes.POINTERMOVE:
					if (isSwipeTarget && droneMesh) {
						const currentX = this.scene.pointerX;
						const diff = currentX - startX;
						const deadzone = 10;
						
						// Visual feedback with deadzone
						if (Math.abs(diff) > deadzone) {
							const sensitivity = 0.03;
							// Apply offset based on diff minus deadzone direction
							const offset = (diff > 0 ? diff - deadzone : diff + deadzone) * sensitivity;
							droneMesh.position.x = droneStartPosX + offset;
						}
					}
					break;
				
				case PointerEventTypes.POINTERUP:
					if (isSwipeTarget && droneMesh) {
						const endX = this.scene.pointerX;
						const diff = endX - startX;
						const threshold = 50; // Pixels
						
						if (Math.abs(diff) > threshold) {
							if (diff < 0) {
								this.changeDrone(1);
							} else {
								this.changeDrone(-1);
							}
						} else {
							// Snap back if threshold not met
							this.droneView.animateSnapBack();
						}
						isSwipeTarget = false;
					}
					break;
			}
		});
	}
	
	addDragBehavior(mesh) {
		const dragBehavior = new PointerDragBehavior({ dragPlaneNormal: new Vector3(0, 0, 1) });
		let hasMoved = false;
		
		dragBehavior.onDragStartObservable.add((event) => {
			hasMoved = false;
			mesh.metadata.isDragging = true;
			
			if (mesh.metadata.onDrone) {
				mesh.setParent(null);
				mesh.metadata.onDrone = false;
				
				if (mesh.metadata.type === 'package') GameState.currentPackage = null;
				if (mesh.metadata.type === 'battery') GameState.currentBattery = null;
			}
		});
		
		dragBehavior.onDragObservable.add(() => {
			hasMoved = true;
		});
		
		dragBehavior.onDragEndObservable.add((event) => {
			mesh.metadata.isDragging = false;
			
			if (!hasMoved) {
				// Treat as click
				this.animateReturnToSource(mesh);
				return;
			}
			
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
					this.animateReturnToSource(mesh);
				}
			} else {
				this.animateReturnToSource(mesh);
			}
		});
		
		mesh.addBehavior(dragBehavior);
	}
	
	animateReturnToSource(mesh) {
		mesh.setParent(null);
		if (mesh.metadata) mesh.metadata.onDrone = false;
		
		let targetPos;
		const currentPos = mesh.position;
		
		if (mesh.metadata.type === 'battery') {
			const x = Math.max(-3.5, Math.min(3.5, currentPos.x));
			targetPos = new Vector3(x, 2, 0);
		} else {
			// Package logic
			const isNearShelf = (
				Math.abs(currentPos.x) < 3.5 &&
				currentPos.z > -0.5 && currentPos.z < 3.0 &&
				currentPos.y > 3.0 && currentPos.y < 8.0
			);
			
			if (isNearShelf) {
				const clampedX = Math.max(-2.3, Math.min(2.3, currentPos.x));
				const clampedZ = Math.max(0.4, Math.min(1.6, currentPos.z));
				const distBottom = Math.abs(currentPos.y - 4.85);
				const distTop = Math.abs(currentPos.y - 6.35);
				const snappedY = distBottom < distTop ? 4.85 : 6.35;
				targetPos = new Vector3(clampedX, snappedY, clampedZ);
			} else {
				targetPos = new Vector3(0, 4.85, 1);
			}
		}
		
		// Animation
		const frameRate = 60;
		const animPos = new Animation("returnPos", "position", frameRate, Animation.ANIMATIONTYPE_VECTOR3, Animation.ANIMATIONLOOPMODE_CONSTANT);
		const keys = [
			{ frame: 0, value: currentPos },
			{ frame: 30, value: targetPos }
		];
		animPos.setKeys(keys);
		
		const ease = new CubicEase();
		ease.setEasingMode(EasingFunction.EASINGMODE_EASEOUT);
		animPos.setEasingFunction(ease);
		
		const animRot = new Animation("returnRot", "rotation", frameRate, Animation.ANIMATIONTYPE_VECTOR3, Animation.ANIMATIONLOOPMODE_CONSTANT);
		const keysRot = [
			{ frame: 0, value: mesh.rotation },
			{ frame: 30, value: Vector3.Zero() }
		];
		animRot.setKeys(keysRot);
		animRot.setEasingFunction(ease);
		
		mesh.animations = [animPos, animRot];
		this.scene.beginAnimation(mesh, 0, 30, false);
	}
	
	animateDelivery() {
		this.droneView.animateDelivery(() => {
			this.resetDrone();
		});
	}
	
	resetDrone() {
		if (GameState.currentPackage && GameState.currentPackage.mesh) {
			GameState.currentPackage.mesh.dispose();
			GameState.currentPackage = null;
		}
		
		if (GameState.currentBattery && GameState.currentBattery.mesh) {
			// Change: Removed the logic that forced charge to 0.
			// The charge is now deducted in index.js based on distance/weight.
			// The BatteryRack.update() loop will handle the visual updates (bars/text).
		}
		
		this.droneView.animateReturn();
	}
	
	changeDrone(dir) {
		GameState.activeDroneIndex += dir;
		if (GameState.activeDroneIndex < 0) GameState.activeDroneIndex = GameState.drones.length - 1;
		if (GameState.activeDroneIndex >= GameState.drones.length) GameState.activeDroneIndex = 0;
		
		if (GameState.currentPackage && GameState.currentPackage.mesh) {
			this.animateReturnToSource(GameState.currentPackage.mesh);
			GameState.currentPackage = null;
		}
		if (GameState.currentBattery && GameState.currentBattery.mesh) {
			this.animateReturnToSource(GameState.currentBattery.mesh);
			GameState.currentBattery = null;
		}
		
		this.droneView.switchDrone(dir);
	}
}
