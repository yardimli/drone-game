import {
	Scene,
	Vector3,
	Color3,
	FreeCamera,
	HemisphericLight,
	SceneLoader,
	MeshBuilder, ArcRotateCamera
} from "@babylonjs/core";
import "@babylonjs/loaders/glTF";
import {AdvancedDynamicTexture, TextBlock, Control} from "@babylonjs/gui";
import {GameState} from './gameState';

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

		// const camera = new FreeCamera("splashCam", new Vector3(0, 0, -25), this.scene);
		// camera.setTarget(Vector3.Zero());
		
		const light = new HemisphericLight("light", new Vector3(0, 1, 0), this.scene);
		light.intensity = 1.0;
		
		// UI
		const adt = AdvancedDynamicTexture.CreateFullscreenUI("SplashUI", true, this.scene);
		
		const title = new TextBlock();
		title.text = "SkyDrop Logistics";
		title.color = "white";
		title.fontSize = 40;
		title.fontWeight = "bold";
		title.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
		title.paddingTop = "50px";
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
		
		// Collect all assets to display
		const assetsToLoad = [
			...GameState.drones.map(d => ({...d, type: 'drone'})),
			...GameState.packageTypes.map(p => ({...p, type: 'package'}))
		];
		
		for (const item of assetsToLoad) {
			try {
				// Random Position (Portrait distribution)
				const x = (Math.random() * 6) - 3;
				const y = (Math.random() * 16) - 8;
				
				const result = await SceneLoader.ImportMeshAsync("", "./assets/", item.model, this.scene);
				
				// The first mesh is usually the root for GLB
				const root = result.meshes[0];
				
				// Normalize parent for positioning
				root.position = new Vector3(x, y, 0);
				
				if (item.scale) {
					root.scaling = item.scale.clone();
				}
				
				if (item.rotationOffset) {
					// Clone to avoid modifying the global GameState when spinning
					root.rotation = item.rotationOffset.clone();
				}
				
				// Spin Animation
				this.scene.registerBeforeRender(() => {
					if (root && !root.isDisposed()) {
						root.rotation.y += 0.02;
					}
				});
				
				// Create ID Label
				const plane = MeshBuilder.CreatePlane("lbl_" + item.id, {width: 6, height: 3}, this.scene);
				plane.position = new Vector3(x, y, -3);
				plane.billboardMode = MeshBuilder.BILLBOARDMODE_ALL;
				
				const labelAdt = AdvancedDynamicTexture.CreateForMesh(plane);
				const text = new TextBlock();
				text.text = item.id;
				text.color = "#f1c40f";
				text.fontSize = 80;
				text.fontWeight = "bold";
				text.outlineColor = "black";
				text.outlineWidth = 8;
				labelAdt.addControl(text);
				
				// Delay to allow visual update
				await new Promise(resolve => setTimeout(resolve, 250));
				
			} catch (err) {
				console.error("Error loading " + item.id, err);
			}
		}
		
		statusText.alpha = 1;
		
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
