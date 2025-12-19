import {
	Scene,
	Vector3,
	Color3,
	FreeCamera,
	HemisphericLight,
	MeshBuilder,
	StandardMaterial,
	Animation,
	CubicEase,
	EasingFunction
} from "@babylonjs/core";
import { AdvancedDynamicTexture, TextBlock, Rectangle } from "@babylonjs/gui";
export class SplashScreen {
	constructor (engine) {
		this.engine = engine;
		this.scene = new Scene(engine);
		this.scene.clearColor = new Color3(0.1, 0.1, 0.15); // Match game background
	}
	async show () {
		// Setup Scene
		const camera = new FreeCamera("splashCam", new Vector3(0, 0, -10), this.scene);
		camera.setTarget(Vector3.Zero());
		
		const light = new HemisphericLight("light", new Vector3(0, 1, 0), this.scene);
		light.intensity = 1.0;
		
		// Create Drone Mesh (Simplified visual)
		const drone = this.createDrone();
		drone.position.x = -10; // Start off-screen left
		
		// UI Overlay
		const adt = AdvancedDynamicTexture.CreateFullscreenUI("SplashUI", true, this.scene);
		
		const title = new TextBlock();
		title.text = "SkyDrop Logistics";
		title.color = "white";
		title.fontSize = 48;
		title.fontWeight = "bold";
		title.alpha = 0;
		adt.addControl(title);
		
		// Fade Rectangle (starts transparent, fades to black)
		const fadeRect = new Rectangle();
		fadeRect.background = "black";
		fadeRect.alpha = 0;
		fadeRect.thickness = 0;
		adt.addControl(fadeRect);
		
		// --- Animations ---
		const frameRate = 60;
		
		// 1. Drone Fly In (Left to Center to Right)
		const animDrone = new Animation("droneFly", "position.x", frameRate, Animation.ANIMATIONTYPE_FLOAT, Animation.ANIMATIONLOOPMODE_CONSTANT);
		const keysDrone = [
			{ frame: 0, value: -10 },
			{ frame: 60, value: 0 },   // Arrive center
			{ frame: 120, value: 0 },  // Hover
			{ frame: 180, value: 10 }  // Fly out right
		];
		animDrone.setKeys(keysDrone);
		
		const ease = new CubicEase();
		ease.setEasingMode(EasingFunction.EASINGMODE_EASEOUT);
		animDrone.setEasingFunction(ease);
		
		drone.animations.push(animDrone);
		
		// 2. Title Fade In/Out
		const animTitle = new Animation("titleFade", "alpha", frameRate, Animation.ANIMATIONTYPE_FLOAT, Animation.ANIMATIONLOOPMODE_CONSTANT);
		const keysTitle = [
			{ frame: 0, value: 0 },
			{ frame: 40, value: 1 },   // Fade in
			{ frame: 140, value: 1 },  // Hold
			{ frame: 160, value: 0 }   // Fade out
		];
		animTitle.setKeys(keysTitle);
		
		// 3. Screen Fade Out (To Black)
		const animFade = new Animation("screenFade", "alpha", frameRate, Animation.ANIMATIONTYPE_FLOAT, Animation.ANIMATIONLOOPMODE_CONSTANT);
		const keysFade = [
			{ frame: 150, value: 0 },
			{ frame: 180, value: 1 }   // Full black at end
		];
		animFade.setKeys(keysFade);
		
		// Start Animations
		this.scene.beginAnimation(drone, 0, 180, false);
		this.scene.beginDirectAnimation(title, [animTitle], 0, 180, false);
		this.scene.beginDirectAnimation(fadeRect, [animFade], 0, 180, false);
		
		return new Promise((resolve) => {
			const renderLoop = () => {
				this.scene.render();
			};
			this.engine.runRenderLoop(renderLoop);
			
			// End after 3 seconds (180 frames @ 60fps)
			setTimeout(() => {
				this.engine.stopRenderLoop(renderLoop);
				this.scene.dispose();
				resolve();
			}, 1000);
		});
	}
	
	createDrone () {
		const mesh = MeshBuilder.CreateBox("drone", { width: 1.2, height: 0.2, depth: 1.2 }, this.scene);
		const mat = new StandardMaterial("droneMat", this.scene);
		mat.diffuseColor = new Color3(0.2, 0.6, 1);
		mesh.material = mat;
		
		// Simple Rotors
		const offsets = [
			new Vector3(0.8, 0, 0.8), new Vector3(-0.8, 0, 0.8),
			new Vector3(0.8, 0, -0.8), new Vector3(-0.8, 0, -0.8)
		];
		
		offsets.forEach(offset => {
			const arm = MeshBuilder.CreateBox("arm", { width: 1.0, height: 0.1, depth: 0.1 }, this.scene);
			arm.parent = mesh;
			arm.position = offset.scale(0.5);
			arm.lookAt(mesh.position.add(offset));
			
			const rotor = MeshBuilder.CreateCylinder("rotor", { diameter: 0.8, height: 0.1 }, this.scene);
			rotor.parent = mesh;
			rotor.position = offset;
			const rMat = new StandardMaterial("rMat", this.scene);
			rMat.diffuseColor = new Color3(0.1, 0.1, 0.1);
			rotor.material = rMat;
		});
		
		return mesh;
	}
}
