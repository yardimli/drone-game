import { MeshBuilder, Vector3 } from "@babylonjs/core";
import { AdvancedDynamicTexture, TextBlock } from "@babylonjs/gui";

export class BatteryRack {
	constructor (scene, materials, registerDragCallback) {
		this.scene = scene;
		this.materials = materials;
		this.registerDragCallback = registerDragCallback;
		this.batteries = [];
		
		this.createRackMesh();
		
		// Initial Spawn
		this.spawnBattery(-2, 1);
		this.spawnBattery(0, 2);
		this.spawnBattery(2, 3);
	}
	
	createRackMesh () {
		const rack = MeshBuilder.CreateBox("rack", { width: 8, height: 0.2, depth: 1 }, this.scene);
		rack.position.y = 1.5;
	}
	
	spawnBattery (xPos, tier) {
		const batRoot = MeshBuilder.CreateBox("batteryRoot", { width: 0.6, height: 0.8, depth: 0.4 }, this.scene);
		batRoot.position = new Vector3(xPos, 2, 0);
		batRoot.visibility = 0;
		
		const cellCount = 3;
		for (let i = 0; i < cellCount; i++) {
			const cell = MeshBuilder.CreateCylinder("cell" + i, { diameter: 0.15, height: 0.7 }, this.scene);
			cell.parent = batRoot;
			cell.position.x = (i - 1) * 0.18;
			cell.rotation.z = Math.PI / 2;
			cell.rotation.x = Math.PI / 2;
			cell.material = this.materials.matBatteryCell;
		}
		
		const casing = MeshBuilder.CreateBox("casing", { width: 0.55, height: 0.75, depth: 0.35 }, this.scene);
		casing.parent = batRoot;
		casing.material = this.materials.matBatteryCasing;
		
		// 3D UI Label
		const plane = MeshBuilder.CreatePlane("labelPlane", { size: 1 }, this.scene);
		plane.parent = batRoot;
		plane.position.y = 0.5;
		plane.position.z = -0.2;
		plane.billboardMode = MeshBuilder.BILLBOARDMODE_ALL;
		
		const advancedTexture = AdvancedDynamicTexture.CreateForMesh(plane);
		const textBlock = new TextBlock();
		textBlock.text = "---";
		textBlock.color = "white";
		textBlock.fontSize = 240;
		textBlock.fontWeight = "bold";
		advancedTexture.addControl(textBlock);
		
		const weight = tier * 0.5;
		const maxCharge = tier * 3.0;
		
		// Random initial charge between 50% and 90%
		const initialPct = 0.5 + (Math.random() * 0.4);
		const currentCharge = maxCharge * initialPct;
		
		batRoot.metadata = {
			type: "battery",
			weight: weight,
			charge: currentCharge,
			maxCharge: maxCharge,
			isDragging: false,
			onDrone: false,
			uiText: textBlock
		};
		
		this.batteries.push(batRoot);
		
		if (this.registerDragCallback) {
			this.registerDragCallback(batRoot);
		}
	}
	
	update () {
		// Get time delta in seconds for accurate charging
		const deltaTime = this.scene.getEngine().getDeltaTime() / 1000;
		
		this.batteries.forEach(bat => {
			if (!bat || bat.isDisposed()) return;
			
			const meta = bat.metadata;
			
			// Auto-charge if not dragging and not on drone (sitting on rack)
			if (!meta.isDragging && !meta.onDrone) {
				if (meta.charge < meta.maxCharge) {
					// Charge 1% of max capacity per second
					const chargeRate = meta.maxCharge * 0.01;
					meta.charge += chargeRate * deltaTime;
					
					if (meta.charge > meta.maxCharge) meta.charge = meta.maxCharge;
				}
			}
			
			// Update Visuals
			const pct = Math.floor((meta.charge / meta.maxCharge) * 100);
			if (meta.uiText) {
				meta.uiText.text = `${pct}%`;
				// Green if high charge, Red if low
				meta.uiText.color = pct < 30 ? "#e74c3c" : "#2ecc71";
			}
		});
	}
}
