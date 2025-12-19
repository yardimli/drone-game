import { MeshBuilder, Vector3, Color3 } from "@babylonjs/core";

export class ConveyorBelt {
	constructor (scene, materials, registerDragCallback) {
		this.scene = scene;
		this.materials = materials;
		this.registerDragCallback = registerDragCallback; // Callback to add drag behavior
		this.packages = [];
		this.lastPackageSpawn = 0;
		
		this.createBeltMesh();
	}
	
	createBeltMesh () {
		const belt = MeshBuilder.CreateBox("belt", { width: 14, height: 0.2, depth: 2 }, this.scene);
		belt.position.y = 4;
	}
	
	spawnPackage () {
		const width = 0.6 + Math.random() * 0.4;
		const height = 0.6 + Math.random() * 0.4;
		const depth = 0.6 + Math.random() * 0.4;
		
		const pkg = MeshBuilder.CreateBox("package", { width, height, depth }, this.scene);
		pkg.position = new Vector3(8, 4.5, 0);
		
		const r = 0.5 + Math.random() * 0.2;
		const g = 0.3 + Math.random() * 0.2;
		const b = 0.1 + Math.random() * 0.1;
		const mat = this.materials.matPackage.clone("pkgMat");
		mat.diffuseColor = new Color3(r, g, b);
		pkg.material = mat;
		
		const tapeX = MeshBuilder.CreateBox("tapeX", { width: width + 0.01, height: 0.1, depth: depth + 0.01 }, this.scene);
		tapeX.parent = pkg;
		tapeX.material = this.materials.matTape;
		
		const tapeY = MeshBuilder.CreateBox("tapeY", { width: 0.1, height: height + 0.01, depth: depth + 0.01 }, this.scene);
		tapeY.parent = pkg;
		tapeY.material = this.materials.matTape;
		
		const dist = parseFloat((Math.random() * 5 + 1).toFixed(1));
		const weight = parseFloat((Math.random() * 3 + 0.5).toFixed(1));
		const reward = Math.floor(dist * 10 + weight * 5);
		
		pkg.metadata = {
			type: "package",
			distance: dist,
			weight: weight,
			reward: reward,
			isDragging: false,
			onDrone: false
		};
		
		this.packages.push(pkg);
		
		// Register drag behavior in main scene
		if (this.registerDragCallback) {
			this.registerDragCallback(pkg);
		}
	}
	
	update () {
		const now = Date.now();
		if (now - this.lastPackageSpawn > 2000) {
			if (Math.random() < 0.4) {
				this.spawnPackage();
				this.lastPackageSpawn = now;
			}
		}
		
		for (let i = this.packages.length - 1; i >= 0; i--) {
			const p = this.packages[i];
			
			if (!p || p.isDisposed()) {
				this.packages.splice(i, 1);
				continue;
			}
			
			if (!p.metadata.isDragging && !p.metadata.onDrone) {
				p.position.x -= 0.02;
				
				if (p.position.x < -8) {
					p.dispose();
					this.packages.splice(i, 1);
				}
			}
		}
	}
}
