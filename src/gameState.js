export const GameState = {
	money: 1250,
	activeDroneIndex: 0,
	drones: [
		{ name: "Sparrow", lift: 5.0, speed: 1.0, baseWeight: 1.0, color: "#3498db" },
		{ name: "Hawk", lift: 8.0, speed: 1.2, baseWeight: 2.0, color: "#e74c3c" },
		{ name: "Titan", lift: 15.0, speed: 0.7, baseWeight: 4.0, color: "#f1c40f" }
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
