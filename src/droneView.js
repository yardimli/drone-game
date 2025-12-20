import {MeshBuilder, Vector3, Color3, Animation, AnimationGroup, CubicEase, EasingFunction} from "@babylonjs/core";
import {GameState} from './gameState';

export class DroneView {
	constructor(scene, materials, assets) {
		this.scene = scene;
		this.materials = materials;
		this.assets = assets;
		this.mesh = null;
		this.createMesh();
	}
	
	createMesh(startPosition = null) {
		const droneData = GameState.drones[GameState.activeDroneIndex];
		
		let mesh;
		const container = this.assets[droneData.id];
		
		if (container) {
			const entries = container.instantiateModelsToScene();
			const root = entries.rootNodes[0];
			
			// Increased size from 0.1 to 2.5 to create a larger hit box for drag and drop detection
			mesh = MeshBuilder.CreateBox("droneWrapper", {size: 2.5}, this.scene);
			mesh.visibility = 0;
			mesh.isPickable = false; // Disable picking so it doesn't block cargo interaction
			
			root.parent = mesh;
			root.scaling = droneData.scale;
			root.rotation = droneData.rotationOffset;
			
			root.getChildMeshes().forEach(m => {
				m.isPickable = true;
			});
		} else {
			mesh = MeshBuilder.CreateBox("droneFallback", {size: 1}, this.scene);
		}
		
		// Default Position
		mesh.position = startPosition || new Vector3(0, -1, 0);
		
		const batSlot = MeshBuilder.CreateBox("batSlot", {size: 0.5}, this.scene);
		batSlot.parent = mesh;
		batSlot.position.y = 0.3;
		batSlot.position.z = -0.4;
		batSlot.visibility = 0;
		
		const pkgSlot = MeshBuilder.CreateBox("pkgSlot", {size: 0.8}, this.scene);
		pkgSlot.parent = mesh;
		pkgSlot.position.y = -0.6;
		pkgSlot.visibility = 0;
		
		if (!this.mesh && !startPosition) {
			this.mesh = mesh;
		}
		
		return mesh;
	}
	
	switchDrone(direction) {
		const oldMesh = this.mesh;
		const slideDist = 15;
		const frameRate = 60;
		
		if (oldMesh) {
			const animOut = new Animation("slideOut", "position.x", frameRate, Animation.ANIMATIONTYPE_FLOAT, Animation.ANIMATIONLOOPMODE_CONSTANT);
			const keysOut = [
				{frame: 0, value: oldMesh.position.x},
				{frame: 30, value: -direction * slideDist}
			];
			animOut.setKeys(keysOut);
			oldMesh.animations = [animOut];
			this.scene.beginAnimation(oldMesh, 0, 30, false, 1.0, () => {
				oldMesh.dispose();
			});
		}
		
		const startX = direction * slideDist;
		const newMesh = this.createMesh(new Vector3(startX, -1, 0));
		this.mesh = newMesh;
		
		const animIn = new Animation("slideIn", "position.x", frameRate, Animation.ANIMATIONTYPE_FLOAT, Animation.ANIMATIONLOOPMODE_CONSTANT);
		const keysIn = [
			{frame: 0, value: startX},
			{frame: 40, value: 0}
		];
		
		const ease = new CubicEase();
		ease.setEasingMode(EasingFunction.EASINGMODE_EASEOUT);
		animIn.setEasingFunction(ease);
		
		animIn.setKeys(keysIn);
		newMesh.animations = [animIn];
		this.scene.beginAnimation(newMesh, 0, 40, false);
	}
	
	animateSnapBack() {
		if (!this.mesh) return;
		
		const frameRate = 60;
		const anim = new Animation("snapBack", "position.x", frameRate, Animation.ANIMATIONTYPE_FLOAT, Animation.ANIMATIONLOOPMODE_CONSTANT);
		
		const keys = [
			{frame: 0, value: this.mesh.position.x},
			{frame: 20, value: 0}
		];
		
		anim.setKeys(keys);
		const ease = new CubicEase();
		ease.setEasingMode(EasingFunction.EASINGMODE_EASEOUT);
		anim.setEasingFunction(ease);
		
		this.mesh.animations = [anim];
		this.scene.beginAnimation(this.mesh, 0, 20, false);
	}
	
	updateVisuals() {
		if (!this.mesh) return;
		
		const status = GameState.checkFlightStatus();
		const baseY = -1;
		
		if (status.msg.includes("OVERWEIGHT")) {
			this.mesh.position.y = (baseY - 0.2) + Math.sin(Date.now() * 0.05) * 0.03;
		} else {
			if (Math.abs(this.mesh.position.x) < 0.1 && Math.abs(this.mesh.position.y - baseY) < 0.5) {
				this.mesh.position.y = baseY + Math.sin(Date.now() * 0.002) * 0.05;
			}
		}
	}
	
	animateDelivery(onComplete) {
		if (!this.mesh) return;
		const frameRate = 60;
		const animGroup = new AnimationGroup("delivery");
		
		const animY = new Animation("flyY", "position.y", frameRate, Animation.ANIMATIONTYPE_FLOAT, Animation.ANIMATIONLOOPMODE_CONSTANT);
		const keysY = [
			{frame: 0, value: -1.0},
			{frame: 20, value: -0.8},
			{frame: 40, value: -1.2},
			{frame: 60, value: -1.0},
			{frame: 80, value: -1.0},
			{frame: 120, value: 0},
			{frame: 180, value: 6}
		];
		animY.setKeys(keysY);
		
		const animX = new Animation("flyX", "position.x", frameRate, Animation.ANIMATIONTYPE_FLOAT, Animation.ANIMATIONLOOPMODE_CONSTANT);
		const keysX = [
			{frame: 0, value: 0},
			{frame: 80, value: 0},
			{frame: 120, value: 2},
			{frame: 150, value: 8},
			{frame: 180, value: 25}
		];
		animX.setKeys(keysX);
		
		const animRot = new Animation("flyRot", "rotation.z", frameRate, Animation.ANIMATIONTYPE_FLOAT, Animation.ANIMATIONLOOPMODE_CONSTANT);
		const keysRot = [
			{frame: 0, value: 0},
			{frame: 20, value: 0.05},
			{frame: 40, value: -0.05},
			{frame: 60, value: 0},
			{frame: 80, value: -0.1},
			{frame: 100, value: -0.3},
			{frame: 180, value: -0.4}
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
	
	animateReturn() {
		if (!this.mesh) return;
		this.mesh.position = new Vector3(-25, 5, 0);
		this.mesh.rotation.z = -0.4;
		
		const frameRate = 60;
		const animGroup = new AnimationGroup("return");
		
		const animX = new Animation("returnX", "position.x", frameRate, Animation.ANIMATIONTYPE_FLOAT, Animation.ANIMATIONLOOPMODE_CONSTANT);
		const keysX = [
			{frame: 0, value: -25},
			{frame: 50, value: 3},
			{frame: 80, value: -0.5},
			{frame: 100, value: 0.2},
			{frame: 120, value: 0}
		];
		animX.setKeys(keysX);
		
		const animY = new Animation("returnY", "position.y", frameRate, Animation.ANIMATIONTYPE_FLOAT, Animation.ANIMATIONLOOPMODE_CONSTANT);
		const keysY = [
			{frame: 0, value: 5},
			{frame: 50, value: 1},
			{frame: 80, value: 0},
			{frame: 120, value: -1.0}
		];
		animY.setKeys(keysY);
		
		const animRot = new Animation("returnRot", "rotation.z", frameRate, Animation.ANIMATIONTYPE_FLOAT, Animation.ANIMATIONLOOPMODE_CONSTANT);
		const keysRot = [
			{frame: 0, value: -0.4},
			{frame: 40, value: -0.4},
			{frame: 60, value: 0.2},
			{frame: 90, value: -0.1},
			{frame: 120, value: 0}
		];
		animRot.setKeys(keysRot);
		
		animGroup.addTargetedAnimation(animX, this.mesh);
		animGroup.addTargetedAnimation(animY, this.mesh);
		animGroup.addTargetedAnimation(animRot, this.mesh);
		
		animGroup.play(false);
	}
}
