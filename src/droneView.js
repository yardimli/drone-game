import { MeshBuilder, Vector3, Color3, Animation, AnimationGroup } from "@babylonjs/core";
import { GameState } from './gameState';
export class DroneView {
	constructor (scene, materials) {
		this.scene = scene;
		this.materials = materials;
		this.mesh = null;
		this.createMesh();
	}
	
	createMesh () {
		if (this.mesh) this.mesh.dispose();
		
		const droneData = GameState.drones[GameState.activeDroneIndex];
		this.materials.matDrone.diffuseColor = Color3.FromHexString(droneData.color);
		
		this.mesh = MeshBuilder.CreateBox("droneFrame", { width: 1.2, height: 0.2, depth: 1.2 }, this.scene);
		this.mesh.position.y = -3;
		this.mesh.material = this.materials.matDrone;
		
		const rotorOffsets = [
			new Vector3(0.8, 0, 0.8),
			new Vector3(-0.8, 0, 0.8),
			new Vector3(0.8, 0, -0.8),
			new Vector3(-0.8, 0, -0.8)
		];
		
		rotorOffsets.forEach((offset, index) => {
			const arm = MeshBuilder.CreateBox("arm" + index, { width: 1.0, height: 0.1, depth: 0.1 }, this.scene);
			arm.parent = this.mesh;
			arm.position = offset.scale(0.5);
			arm.lookAt(this.mesh.position.add(offset));
			
			const rotor = MeshBuilder.CreateCylinder("rotor" + index, { diameter: 0.8, height: 0.1 }, this.scene);
			rotor.parent = this.mesh;
			rotor.position = offset;
			rotor.material = this.materials.matRotor;
		});
		
		const batSlot = MeshBuilder.CreateBox("batSlot", { size: 0.5 }, this.scene);
		batSlot.parent = this.mesh;
		batSlot.position.y = 0.3;
		batSlot.position.z = -0.4;
		batSlot.visibility = 0.3;
		
		const pkgSlot = MeshBuilder.CreateBox("pkgSlot", { size: 0.8 }, this.scene);
		pkgSlot.parent = this.mesh;
		pkgSlot.position.y = -0.6;
		pkgSlot.visibility = 0.3;
	}
	
	updateVisuals () {
		if (!this.mesh) return;
		
		const status = GameState.checkFlightStatus();
		if (status.msg.includes("OVERWEIGHT")) {
			this.mesh.position.y = -3.2 + Math.sin(Date.now() * 0.05) * 0.03;
		} else {
			// Only apply idle wobble if roughly at start position to avoid fighting the animation
			if (Math.abs(this.mesh.position.x) < 0.1 && Math.abs(this.mesh.position.y - (-3)) < 0.5) {
				this.mesh.position.y = -3 + Math.sin(Date.now() * 0.002) * 0.05;
			}
		}
	}
	
	animateDelivery (onComplete) {
		const frameRate = 60;
		const animGroup = new AnimationGroup("delivery");
		
		// Y Animation: Wobble -> Up
		const animY = new Animation("flyY", "position.y", frameRate, Animation.ANIMATIONTYPE_FLOAT, Animation.ANIMATIONLOOPMODE_CONSTANT);
		const keysY = [
			{ frame: 0, value: -3 },
			{ frame: 20, value: -2.9 }, // Wobble up
			{ frame: 40, value: -3.1 }, // Wobble down
			{ frame: 60, value: -3 },   // Back to base
			{ frame: 80, value: -3 },   // Hold
			{ frame: 120, value: 0 },   // Lift off
			{ frame: 180, value: 6 }    // Fly out high
		];
		animY.setKeys(keysY);
		
		// X Animation: Hold -> Fly Right (Speeding up)
		const animX = new Animation("flyX", "position.x", frameRate, Animation.ANIMATIONTYPE_FLOAT, Animation.ANIMATIONLOOPMODE_CONSTANT);
		const keysX = [
			{ frame: 0, value: 0 },
			{ frame: 80, value: 0 },    // Wait for wobble/tilt
			{ frame: 120, value: 2 },   // Slow start
			{ frame: 150, value: 8 },   // Accelerate
			{ frame: 180, value: 25 }   // Fast exit
		];
		animX.setKeys(keysX);
		
		// Rotation Animation: Wobble -> Tilt
		const animRot = new Animation("flyRot", "rotation.z", frameRate, Animation.ANIMATIONTYPE_FLOAT, Animation.ANIMATIONLOOPMODE_CONSTANT);
		const keysRot = [
			{ frame: 0, value: 0 },
			{ frame: 20, value: 0.05 },  // Wobble left
			{ frame: 40, value: -0.05 }, // Wobble right
			{ frame: 60, value: 0 },     // Center
			{ frame: 80, value: -0.1 },  // Anticipation tilt
			{ frame: 100, value: -0.3 }, // Full tilt
			{ frame: 180, value: -0.4 }  // Maintain tilt
		];
		animRot.setKeys(keysRot);
		
		animGroup.addTargetedAnimation(animY, this.mesh);
		animGroup.addTargetedAnimation(animX, this.mesh);
		animGroup.addTargetedAnimation(animRot, this.mesh);
		
		animGroup.play(false);
		animGroup.onAnimationEndObservable.add(() => {
			if (onComplete) onComplete();
		});
	}
	
	animateReturn () {
		// Reset position for incoming animation
		this.mesh.position = new Vector3(-25, 5, 0);
		this.mesh.rotation.z = -0.4; // Tilted forward
		
		const frameRate = 60;
		const animGroup = new AnimationGroup("return");
		
		// X Animation: Fast in -> Overshoot -> Settle
		const animX = new Animation("returnX", "position.x", frameRate, Animation.ANIMATIONTYPE_FLOAT, Animation.ANIMATIONLOOPMODE_CONSTANT);
		const keysX = [
			{ frame: 0, value: -25 },
			{ frame: 50, value: 3 },    // Fast approach, overshoot 0
			{ frame: 80, value: -0.5 }, // Correct back
			{ frame: 100, value: 0.2 }, // Small oscillation
			{ frame: 120, value: 0 }    // Stop
		];
		animX.setKeys(keysX);
		
		// Y Animation: High -> Dive -> Hover -> Land
		const animY = new Animation("returnY", "position.y", frameRate, Animation.ANIMATIONTYPE_FLOAT, Animation.ANIMATIONLOOPMODE_CONSTANT);
		const keysY = [
			{ frame: 0, value: 5 },
			{ frame: 50, value: -1 },   // Dive down
			{ frame: 80, value: -2.5 }, // Slowing descent
			{ frame: 120, value: -3 }   // Landed
		];
		animY.setKeys(keysY);
		
		// Rotation: Forward Tilt -> Brake Tilt -> Wobble -> Flat
		const animRot = new Animation("returnRot", "rotation.z", frameRate, Animation.ANIMATIONTYPE_FLOAT, Animation.ANIMATIONLOOPMODE_CONSTANT);
		const keysRot = [
			{ frame: 0, value: -0.4 },  // Leaning in
			{ frame: 40, value: -0.4 }, // Still leaning
			{ frame: 60, value: 0.2 },  // Brake (tilt back) at overshoot
			{ frame: 90, value: -0.1 }, // Correct
			{ frame: 120, value: 0 }    // Flat
		];
		animRot.setKeys(keysRot);
		
		animGroup.addTargetedAnimation(animX, this.mesh);
		animGroup.addTargetedAnimation(animY, this.mesh);
		animGroup.addTargetedAnimation(animRot, this.mesh);
		
		animGroup.play(false);
	}
}
