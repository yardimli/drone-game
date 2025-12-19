import {Vector3} from "@babylonjs/core";

export const GameState = {
	money: 1250,
	activeDroneIndex: 0,
	
	// Customer Profiles
	customers: [
		{file: "girl1.jpg", name: "Alice", trait: "Generous", payMult: 1.3, timeMult: 1.0},
		{file: "girl2.jpg", name: "Bella", trait: "Urgent", payMult: 1.2, timeMult: 0.7},
		{file: "girl3.jpg", name: "Carla", trait: "Standard", payMult: 1.0, timeMult: 1.0},
		{file: "girl4.jpg", name: "Diana", trait: "Patient", payMult: 0.9, timeMult: 1.4},
		{file: "boy1.jpg", name: "Evan", trait: "Stingy", payMult: 0.8, timeMult: 1.0},
		{file: "boy2.jpg", name: "Frank", trait: "Generous", payMult: 1.25, timeMult: 1.0},
		{file: "boy3.jpg", name: "George", trait: "Urgent", payMult: 1.15, timeMult: 0.6},
		{file: "boy4.jpg", name: "Henry", trait: "Standard", payMult: 1.0, timeMult: 1.0},
		{file: "boy5.jpg", name: "Ian", trait: "Patient", payMult: 0.95, timeMult: 1.3},
		{file: "boy6.jpg", name: "Jack", trait: "Stingy", payMult: 0.75, timeMult: 1.1}
	],
	
	// Dialogue Templates
	dialogue: {
		greetings: [
			"Hello there!",
			"Excuse me, I need help.",
			"Hi! Are you available?",
			"Greetings, pilot."
		],
		weight: [
			"I have a package weighing {w}kg.",
			"This box is {w}kg heavy.",
			"I need to transport {w}kg.",
			"The cargo weight is {w}kg."
		],
		urgency: [
			"It must arrive in {t} seconds.",
			"I only have {t} seconds!",
			"Can you do it in {t} seconds?",
			"Deadline is {t} seconds."
		],
		payment: [
			"I will pay you ${p}.",
			"My offer is ${p}.",
			"Is ${p} enough?",
			"Reward: ${p}."
		]
	},
	
	drones: [
		{
			id: "drone1",
			name: "Sparrow",
			lift: 5.0,
			speed: 1.0,
			baseWeight: 1.0,
			model: "drone1.glb",
			scale: new Vector3(2, 2, 2),
			rotationOffset: new Vector3(0, Math.PI, 0)
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
	
	packageTypes: [
		{
			id: "pkg1",
			weight: 0.5,
			model: "package1.glb",
			scale: new Vector3(4, 4, 4),
			rotationOffset: new Vector3(0, 10, 0)
		},
		{
			id: "pkg2",
			weight: 1.0,
			model: "package2.glb",
			scale: new Vector3(4, 4, 4),
			rotationOffset: new Vector3(0, 10, 0)
		},
		{
			id: "pkg3",
			weight: 2.0,
			model: "package3.glb",
			scale: new Vector3(5, 5, 5),
			rotationOffset: new Vector3(0, 10, 0)
		},
		{
			id: "pkg4",
			weight: 3.5,
			model: "package4.glb",
			scale: new Vector3(1.5, 1.5, 1.5),
			rotationOffset: new Vector3(0, 10, 0)
		},
		{
			id: "pkg5",
			weight: 5.0,
			model: "package5.glb",
			scale: new Vector3(1.5, 1.5, 1.5),
			rotationOffset: new Vector3(0, 10, 0)
		}
	],
	
	currentBattery: null,
	currentPackage: null,
	
	checkFlightStatus: function () {
		const drone = this.drones[this.activeDroneIndex];
		
		if (!this.currentBattery || !this.currentPackage) {
			return {valid: false, msg: "LOAD COMPONENTS", color: "#95a5a6"};
		}
		
		const totalWeight = drone.baseWeight + this.currentBattery.weight + this.currentPackage.weight;
		const weightValid = totalWeight <= drone.lift;
		const rangeValid = this.currentBattery.charge >= this.currentPackage.distance;
		
		if (!weightValid) return {valid: false, msg: "OVERWEIGHT!", color: "#c0392b"};
		if (!rangeValid) return {valid: false, msg: "LOW RANGE", color: "#e67e22"};
		
		return {valid: true, msg: "DELIVER", color: "#27ae60"};
	}
};
