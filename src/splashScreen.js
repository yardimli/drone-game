import {
	Scene,
	Vector3,
	Color3,
	HemisphericLight,
	SceneLoader,
	MeshBuilder,
	ArcRotateCamera,
	Animation,
	CubicEase,
	EasingFunction,
	TransformNode
} from "@babylonjs/core";
import "@babylonjs/loaders/glTF";
import { AdvancedDynamicTexture, TextBlock, Control } from "@babylonjs/gui";
import { GameState } from './gameState';

export class SplashScreen {
	constructor(engine) {
		this.engine = engine;
		this.scene = new Scene(engine);
		this.scene.clearColor = new Color3(0.1, 0.1, 0.15);
	}
	
	async show() {
		// Setup Scene
		const camera = new ArcRotateCamera("Camera", -Math.PI / 2, Math.PI / 2, 18, new Vector3(0, 3, 0), this.scene);
		camera.inputs.clear();
		
		const light = new HemisphericLight("light", new Vector3(0, 1, 0), this.scene);
		light.intensity = 1.0;
		
		// UI
		const adt = AdvancedDynamicTexture.CreateFullscreenUI("SplashUI", true, this.scene);
		
		const title = new TextBlock();
		title.text = "SkyDrop Logistics";
		title.color = "white";
		title.fontSize = 40;
		title.fontWeight = "bold";
		// Modified: Center alignment to allow items above and below
		title.verticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;
		adt.addControl(title);
		
		const statusText = new TextBlock();
		statusText.text = "Tap to Start";
		statusText.color = "white";
		statusText.fontSize = 30;
		statusText.verticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM;
		statusText.paddingBottom = "50px";
		statusText.alpha = 0; // Hidden until loaded
		adt.addControl(statusText);
		
		const renderLoop = () => {
			this.scene.render();
		};
		this.engine.runRenderLoop(renderLoop);
		
		// Track placed positions to prevent overlap
		const placedPositions = [];
		const minDistance = 2;
		const rangeX = 3.5;
		
		// Helper function to spawn an item in a specific Y range
		const spawnItem = async (item, minY, maxY) => {
			try {
				// Find a valid position
				let x, y, pos;
				let attempts = 0;
				let valid = false;
				
				while (!valid && attempts < 50) {
					x = (Math.random() * (rangeX * 2)) - rangeX;
					y = minY + (Math.random() * (maxY - minY));
					pos = new Vector3(x, y, 0);
					
					valid = true;
					for (const existing of placedPositions) {
						if (Vector3.Distance(pos, existing) < minDistance) {
							valid = false;
							break;
						}
					}
					attempts++;
				}
				
				if (!valid) {
					console.log("Could not place " + item.id);
					return;
				}
				
				placedPositions.push(pos);
				console.log(item.id + " placed at " + pos.toString());
				
				// Create a Group (TransformNode) to hold both mesh and label
				const group = new TransformNode("group_" + item.id, this.scene);
				
				// Determine start position for scroll-in (Left or Right)
				const startX = x > 0 ? 25 : -25;
				group.position = new Vector3(startX, y, 0);
				
				// Load the actual model
				const result = await SceneLoader.ImportMeshAsync("", "./assets/", item.model, this.scene);
				const root = result.meshes[0];
				
				// Parent model to group
				root.parent = group;
				root.position = Vector3.Zero();
				
				if (item.scale) {
					root.scaling = item.scale.clone();
				}
				
				if (item.rotationOffset) {
					root.rotation = item.rotationOffset.clone();
				}
				
				// Spin Animation (Rotates the model locally)
				this.scene.registerBeforeRender(() => {
					if (root && !root.isDisposed()) {
						root.rotation.y += 0.02;
					}
				});
				
				// Calculate Label Position based on scale to keep it close
				const labelY = 0;
				
				// Create ID Label
				const planeWidth = 4;
				const planeHeight = 2;
				const plane = MeshBuilder.CreatePlane("lbl_" + item.id, { width: planeWidth, height: planeHeight }, this.scene);
				plane.parent = group;
				// Position above the object
				plane.position = new Vector3(0, labelY, -0.5);
				plane.billboardMode = MeshBuilder.BILLBOARDMODE_ALL;
				plane.visibility = 0; // Start hidden
				
				// Create texture with matching aspect ratio (2:1) to prevent text squashing
				const labelAdt = AdvancedDynamicTexture.CreateForMesh(plane, 512, 256);
				const text = new TextBlock();
				text.text = item.id;
				text.color = "#f1c40f";
				text.fontSize = 60;
				text.fontWeight = "bold";
				text.outlineColor = "black";
				text.outlineWidth = 5;
				labelAdt.addControl(text);
				
				// Scroll In Animation for the Group
				const frameRate = 60;
				const animSlide = new Animation("slideIn", "position.x", frameRate, Animation.ANIMATIONTYPE_FLOAT, Animation.ANIMATIONLOOPMODE_CONSTANT);
				
				const duration = 45 + Math.random() * 15; // Randomize speed slightly
				
				const keys = [
					{ frame: 0, value: startX },
					{ frame: duration, value: x }
				];
				
				animSlide.setKeys(keys);
				const ease = new CubicEase();
				ease.setEasingMode(EasingFunction.EASINGMODE_EASEOUT);
				animSlide.setEasingFunction(ease);
				
				group.animations = [animSlide];
				
				// Play scroll animation
				this.scene.beginAnimation(group, 0, duration, false, 1.0, () => {
					// Once scroll finishes, fade in the label
					const animFade = new Animation("fadeIn", "visibility", frameRate, Animation.ANIMATIONTYPE_FLOAT, Animation.ANIMATIONLOOPMODE_CONSTANT);
					const keysFade = [
						{ frame: 0, value: 0 },
						{ frame: 30, value: 1 }
					];
					animFade.setKeys(keysFade);
					plane.animations = [animFade];
					this.scene.beginAnimation(plane, 0, 30, false);
				});
				
				// Stagger the loading slightly
				await new Promise(resolve => setTimeout(resolve, 150));
				
			} catch (err) {
				console.error("Error loading " + item.id, err);
			}
		};
		
		// Spawn Drones Above Title (Y: 4.5 to 8.5)
		for (const drone of GameState.drones) {
			await spawnItem({ ...drone, type: 'drone' }, 4.5, 8.5);
		}
		
		// Spawn Packages Below Title (Y: -2.5 to 1.5)
		for (const pkg of GameState.packageTypes) {
			await spawnItem({ ...pkg, type: 'package' }, -2.5, 1.5);
		}
		
		// Fade in the "Tap to Start" text
		const animText = new Animation("textFade", "alpha", 60, Animation.ANIMATIONTYPE_FLOAT, Animation.ANIMATIONLOOPMODE_CONSTANT);
		const keysText = [
			{ frame: 0, value: 0 },
			{ frame: 60, value: 1 }
		];
		animText.setKeys(keysText);
		this.scene.beginDirectAnimation(statusText, [animText], 0, 60, false);
		
		return new Promise((resolve) => {
			// Wait for user input to proceed
			this.scene.onPointerUp = () => {
				this.engine.stopRenderLoop(renderLoop);
				this.scene.dispose();
				resolve();
			};
		});
	}
}
