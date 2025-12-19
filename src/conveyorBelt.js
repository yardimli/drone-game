import { MeshBuilder, Vector3, Color3 } from "@babylonjs/core";
import { GameState } from './gameState'; // --- NEW: Import GameState for package config

export class ConveyorBelt {
	// --- MODIFIED: Accept assets in constructor ---
	constructor (scene, materials, registerDragCallback, assets) {
		this.scene = scene;
		this.materials = materials;
		this.registerDragCallback = registerDragCallback;
		this.assets = assets; // Store assets
		this.packages = [];
		
		this.state = "WAITING";
		this.waitTimer = 0;
		this.waitTime = 3000;
		this.moveProgress = 0;
		this.moveTarget = 2.5;
		this.moveSpeed = 5.0;
		
		this.createBeltMesh();
		
		this.spawnPackage(0);
		this.spawnPackage(2.5);
		this.spawnPackage(5.0);
	}
	
	createBeltMesh () {
		const belt = MeshBuilder.CreateBox("belt", { width: 14, height: 0.2, depth: 2 }, this.scene);
		belt.position.y = 4;
	}
	
	spawnPackage (offsetX = 0) {
		// --- NEW: Pick random package type from GameState ---
		const typeIndex = Math.floor(Math.random() * GameState.packageTypes.length);
		const pkgData = GameState.packageTypes[typeIndex];
		
		let pkg;
		const container = this.assets[pkgData.id];
		
		if (container) {
			// Instantiate GLB
			const entries = container.instantiateModelsToScene();
			const root = entries.rootNodes[0];
			
			// Wrapper for consistent logic
			pkg = MeshBuilder.CreateBox("pkgWrapper", { size: 0.5 }, this.scene);
			pkg.visibility = 0;
			
			root.parent = pkg;
			root.scaling = pkgData.scale;
			root.rotation = pkgData.rotationOffset;
			
			// Ensure pickable
			root.getChildMeshes().forEach(m => {
				m.isPickable = true;
			});
		} else {
			// Fallback
			pkg = MeshBuilder.CreateBox("package", { size: 0.6 }, this.scene);
		}
		
		pkg.position = new Vector3(8 + offsetX, 4.5, 0);
		
		// Calculate stats based on config + random distance
		const dist = parseFloat((Math.random() * 5 + 1).toFixed(1));
		const weight = pkgData.weight; // Use weight from config
		const reward = Math.floor(dist * 10 + weight * 5);
		
		pkg.metadata = {
			type: "package",
			distance: dist,
			weight: weight,
			reward: reward,
			isDragging: false,
			onDrone: false,
			targetX: pkg.position.x
		};
		
		this.packages.push(pkg);
		
		if (this.registerDragCallback) {
			this.registerDragCallback(pkg);
		}
	}
	
	update () {
		const dt = this.scene.getEngine().getDeltaTime();
		
		if (this.state === "WAITING") {
			this.waitTimer += dt;
			if (this.waitTimer >= this.waitTime) {
				this.state = "MOVING";
				this.waitTimer = 0;
				this.moveProgress = 0;
				
				this.spawnPackage(0);
				
				this.packages.forEach(p => {
					if (!p || p.isDisposed()) return;
					if (!p.metadata) return;
					
					if (!p.metadata.isDragging && !p.metadata.onDrone) {
						p.metadata.targetX = p.position.x - this.moveTarget;
					}
				});
			}
		} else if (this.state === "MOVING") {
			const step = (this.moveSpeed * dt) / 1000;
			this.moveProgress += step;
			
			let allReached = true;
			
			this.packages.forEach(p => {
				if (!p || p.isDisposed()) return;
				if (!p.metadata) return;
				
				if (!p.metadata.isDragging && !p.metadata.onDrone) {
					if (p.position.x > p.metadata.targetX) {
						p.position.x -= step;
						allReached = false;
					} else {
						p.position.x = p.metadata.targetX;
					}
				}
			});
			
			if (allReached || this.moveProgress >= this.moveTarget) {
				this.state = "WAITING";
			}
		}
		
		for (let i = this.packages.length - 1; i >= 0; i--) {
			const p = this.packages[i];
			
			if (!p || p.isDisposed()) {
				this.packages.splice(i, 1);
				continue;
			}
			
			if (p.metadata && (p.metadata.isDragging || p.metadata.onDrone)) continue;
			
			if (p.position.x < -8) {
				p.dispose();
				this.packages.splice(i, 1);
			}
		}
	}
}
