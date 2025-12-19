import { MeshBuilder, Vector3, StandardMaterial, Color3 } from "@babylonjs/core";
import { AdvancedDynamicTexture, TextBlock } from "@babylonjs/gui";

export class BatteryRack {
	constructor (scene, materials, registerDragCallback) {
		this.scene = scene;
		this.materials = materials;
		this.registerDragCallback = registerDragCallback;
		this.batteries = [];
		
		// --- MODIFIED: Rack Base Height ---
		this.rackHeight = 1.5;
		
		this.matBarOn = new StandardMaterial("matBarOn", this.scene);
		this.matBarOn.diffuseColor = new Color3(0.2, 1, 0.2);
		this.matBarOn.emissiveColor = new Color3(0.2, 1, 0.2);
		
		this.matBarOff = new StandardMaterial("matBarOff", this.scene);
		this.matBarOff.diffuseColor = new Color3(0.1, 0.1, 0.1);
		this.matBarOff.emissiveColor = new Color3(0, 0, 0);
		
		this.createRackMesh();
		
		this.spawnBattery(-2, 1);
		this.spawnBattery(0, 2);
		this.spawnBattery(2, 3);
	}
	
	createRackMesh () {
		const rack = MeshBuilder.CreateBox("rack", { width: 8, height: 0.2, depth: 1 }, this.scene);
		rack.position.y = this.rackHeight;
	}
	
	spawnBattery (xPos, tier) {
		const batRoot = MeshBuilder.CreateBox("batteryRoot", { width: 0.6, height: 0.8, depth: 0.4 }, this.scene);
		// --- MODIFIED: Spawn relative to rack height ---
		batRoot.position = new Vector3(xPos, this.rackHeight + 0.5, 0);
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
		
		const bars = [];
		for (let i = 0; i < 4; i++) {
			const bar = MeshBuilder.CreateBox("bar" + i, { width: 0.1, height: 0.05, depth: 0.02 }, this.scene);
			bar.parent = casing;
			bar.position.z = -0.18;
			bar.position.y = -0.25 + (i * 0.15);
			bar.material = this.matBarOff;
			bars.push(bar);
		}
		
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
		
		const initialPct = 0.5 + (Math.random() * 0.4);
		const currentCharge = maxCharge * initialPct;
		
		batRoot.metadata = {
			type: "battery",
			weight: weight,
			charge: currentCharge,
			maxCharge: maxCharge,
			isDragging: false,
			onDrone: false,
			uiText: textBlock,
			bars: bars
		};
		
		this.batteries.push(batRoot);
		
		if (this.registerDragCallback) {
			this.registerDragCallback(batRoot);
		}
	}
	
	update () {
		const deltaTime = this.scene.getEngine().getDeltaTime() / 1000;
		
		this.batteries.forEach(bat => {
			if (!bat || bat.isDisposed()) return;
			
			const meta = bat.metadata;
			if (!meta) return;
			
			if (!meta.isDragging && !meta.onDrone) {
				if (meta.charge < meta.maxCharge) {
					const chargeRate = meta.maxCharge * 0.01;
					meta.charge += chargeRate * deltaTime;
					
					if (meta.charge > meta.maxCharge) meta.charge = meta.maxCharge;
				}
			}
			
			const pct = meta.charge / meta.maxCharge;
			const pctInt = Math.floor(pct * 100);
			
			if (meta.uiText) {
				meta.uiText.text = `${pctInt}%`;
				meta.uiText.color = pctInt < 30 ? "#e74c3c" : "#2ecc71";
			}
			
			if (meta.bars) {
				const barsLit = Math.ceil(pct * 4);
				
				meta.bars.forEach((bar, index) => {
					if (index < barsLit) {
						bar.material = this.matBarOn;
					} else {
						bar.material = this.matBarOff;
					}
				});
			}
		});
	}
}
