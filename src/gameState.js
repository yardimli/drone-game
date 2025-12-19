import { Vector3 } from "@babylonjs/core";

export const GameState = {
	money: 1250,
	activeDroneIndex: 0,
	
	// --- MODIFIED: Drones array with GLB config and transforms ---
	drones: [
		{
			id: "drone1",
			name: "Sparrow",
			lift: 5.0,
			speed: 1.0,
			baseWeight: 1.0,
			model: "drone1.glb",
			scale: new Vector3(2, 2, 2), // Adjust scale per model
			rotationOffset: new Vector3(0, Math.PI, 0) // Adjust rotation if model faces wrong way
		},
		{
			id: "drone2",
			name: "Hawk",
			lift: 8.0,
			speed: 1.2,
			baseWeight: 2.0,
			model: "drone2.glb",
			scale: new Vector3(1.2, 1.2, 1.2),
			rotationOffset: new Vector3(0, Math.PI, 0)
		},
		{
			id: "drone3",
			name: "Titan",
			lift: 15.0,
			speed: 0.7,
			baseWeight: 4.0,
			model: "drone3.glb",
			scale: new Vector3(1.5, 1.5, 1.5),
			rotationOffset: new Vector3(0, Math.PI, 0)
		}
	],
	
	// --- NEW: Package Types Array with weights and transforms ---
	packageTypes: [
		{
			id: "pkg1",
			weight: 0.5,
			model: "package1.glb",
			scale: new Vector3(0.5, 0.5, 0.5),
			rotationOffset: new Vector3(0, 0, 0)
		},
		{
			id: "pkg2",
			weight: 1.0,
			model: "package2.glb",
			scale: new Vector3(0.6, 0.6, 0.6),
			rotationOffset: new Vector3(0, 0, 0)
		},
		{
			id: "pkg3",
			weight: 2.0,
			model: "package3.glb",
			scale: new Vector3(0.7, 0.7, 0.7),
			rotationOffset: new Vector3(0, 0, 0)
		},
		{
			id: "pkg4",
			weight: 3.5,
			model: "package4.glb",
			scale: new Vector3(0.8, 0.8, 0.8),
			rotationOffset: new Vector3(0, 0, 0)
		},
		{
			id: "pkg5",
			weight: 5.0,
			model: "package5.glb",
			scale: new Vector3(0.9, 0.9, 0.9),
			rotationOffset: new Vector3(0, 0, 0)
		}
	],
	
	// Current loadout state
	currentBattery: null, // { charge, weight, maxCharge, mesh, uiText }
	currentPackage: null, // { weight, distance, reward, mesh }
	
	checkFlightStatus: function() {
		const drone = this.drones[this.activeDroneIndex];
		
		if (!this.currentBattery || !this.currentPackage) {
			return { valid: false, msg: "LOAD COMPONENTS", color: "#95a5a6" };
		}
		
		const totalWeight = drone.baseWeight + this.currentBattery.weight + this.currentPackage.weight;
		const weightValid = totalWeight <= drone.lift;
		const rangeValid = this.currentBattery.charge >= this.currentPackage.distance;
		
		if (!weightValid) return { valid: false, msg: "OVERWEIGHT!", color: "#c0392b" };
		if (!rangeValid) return { valid: false, msg: "LOW RANGE", color: "#e67e22" };
		
		return { valid: true, msg: "DELIVER", color: "#27ae60" };
	}
};
