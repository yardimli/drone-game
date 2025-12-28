import {
	ParticleSystem,
	Texture,
	Vector3,
	Color4,
	DynamicTexture
} from "@babylonjs/core";

export class CashAnimation {
	constructor (scene, uiManager) {
		this.scene = scene;
		this.uiManager = uiManager;
		this.particleSystem = null;
		this.billTexture = this.createBillTexture();
	}
	
	/**
	 * Creates a dynamic texture representing a dollar bill
	 */
	createBillTexture () {
		const width = 128;
		const height = 64;
		const dynamicTexture = new DynamicTexture("billTex", { width, height }, this.scene, false);
		const ctx = dynamicTexture.getContext();
		
		// Green background
		ctx.fillStyle = "#27ae60";
		ctx.fillRect(0, 0, width, height);
		
		// Border
		ctx.strokeStyle = "#2ecc71";
		ctx.lineWidth = 4;
		ctx.strokeRect(2, 2, width - 4, height - 4);
		
		// Dollar Sign
		ctx.font = "bold 40px Arial";
		ctx.fillStyle = "#ffffff";
		ctx.textAlign = "center";
		ctx.textBaseline = "middle";
		ctx.fillText("$", width / 2, height / 2);
		
		dynamicTexture.update();
		return dynamicTexture;
	}
	
	/**
	 * Plays the cash animation: Particles + Counter Increment
	 * @param {Vector3} spawnPosition - World position to spawn confetti (usually drone pos)
	 * @param {number} startAmount - Money before reward
	 * @param {number} rewardAmount - The amount being added
	 */
	play (spawnPosition, startAmount, rewardAmount) {
		this.triggerParticles(spawnPosition);
		this.animateCounter(startAmount, rewardAmount);
	}
	
	triggerParticles (position) {
		// Create a particle system
		const ps = new ParticleSystem("cashParticles", 50, this.scene);
		ps.particleTexture = this.billTexture;
		
		// Emitter location
		ps.emitter = position.clone();
		ps.minEmitBox = new Vector3(-0.5, 0, -0.5);
		ps.maxEmitBox = new Vector3(0.5, 0.5, 0.5);
		
		// Color (Greenish)
		ps.color1 = new Color4(1, 1, 1, 1.0);
		ps.color2 = new Color4(1, 1, 1, 1.0);
		ps.colorDead = new Color4(1, 1, 1, 0.0);
		
		// Size (Smaller)
		ps.minSize = 0.15;
		ps.maxSize = 0.25;
		
		// Lifetime
		ps.minLifeTime = 1.0;
		ps.maxLifeTime = 2.0;
		
		// Emission rate
		// Reduced from 30 to 10 to make it less intense
		ps.emitRate = 10;
		
		// Speed and Direction (Flying Up)
		// Reduced power slightly
		ps.minEmitPower = 1.5;
		ps.maxEmitPower = 3;
		ps.updateSpeed = 0.02;
		ps.direction1 = new Vector3(-1, 8, -1);
		ps.direction2 = new Vector3(1, 8, 1);
		
		// Gravity (Float up then drift)
		ps.gravity = new Vector3(0, -2, 0);
		
		// Rotation
		ps.minAngularSpeed = 0;
		ps.maxAngularSpeed = Math.PI;
		
		// Start
		ps.start();
		
		// Stop emission after a short burst
		setTimeout(() => {
			ps.stop();
		}, 1000); // Emit for 1 second
		
		// Cleanup
		setTimeout(() => {
			ps.dispose();
		}, 3000);
	}
	
	animateCounter (startAmount, rewardAmount) {
		const targetAmount = startAmount + rewardAmount;
		let currentDisplay = startAmount;
		
		// Tell UI to stop syncing with GameState automatically
		this.uiManager.isAnimatingMoney = true;
		
		const intervalTime = 50; // 50ms
		const increment = 10; // $10 per tick
		
		const timer = setInterval(() => {
			// Increment logic
			if (currentDisplay + increment < targetAmount) {
				currentDisplay += increment;
			} else {
				// Close enough, snap to target
				currentDisplay = targetAmount;
				clearInterval(timer);
				// Release UI lock
				this.uiManager.isAnimatingMoney = false;
			}
			
			// Update UI
			this.uiManager.setMoneyText(currentDisplay);
		}, intervalTime);
	}
}
