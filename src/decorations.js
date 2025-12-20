import {
	MeshBuilder,
	Vector3,
	StandardMaterial,
	Color3,
	DynamicTexture,
	Texture
} from "@babylonjs/core";

export class Decorations {
	constructor(scene) {
		this.scene = scene;
		this.clockHands = {};
		
		this.createClock();
		this.createArt();
	}
	
	createClock() {
		// Clock Position: Top Right
		const clockPos = new Vector3(3.0, 9.0, 3.0);
		
		// Clock Face
		const face = MeshBuilder.CreateCylinder("clockFace", { diameter: 1.5, height: 0.1 }, this.scene);
		face.position = clockPos;
		// Rotate -90 degrees on X so the top face points towards -Z (Camera)
		face.rotation.x = -Math.PI / 2;
		
		const matFace = new StandardMaterial("matClockFace", this.scene);
		matFace.diffuseColor = new Color3(0.9, 0.9, 0.9);
		face.material = matFace;
		
		// Rim
		const rim = MeshBuilder.CreateTorus("clockRim", { diameter: 1.5, thickness: 0.1, tessellation: 32 }, this.scene);
		rim.parent = face;
//		rim.rotation.x = Math.PI / 2; // Align with cylinder
		rim.rotation.y = Math.PI / 2; // Rotate to face forward
		const matRim = new StandardMaterial("matRim", this.scene);
		matRim.diffuseColor = new Color3(0.2, 0.2, 0.2);
		rim.material = matRim;
		
		// Helper to create clock hands
		// length: how long the hand is
		// thickness: how wide/thick the hand is
		// zOffset: how far out from the face (along global Z) to stack the hands
		const createHand = (name, length, thickness, color, zOffset) => {
			// Create an invisible pivot at the center of the clock face
			const pivot = MeshBuilder.CreateBox(name + "_pivot", { size: 0.01 }, this.scene);
			pivot.parent = face;
			// Position the pivot slightly in front of the clock face for stacking
			pivot.position.y = zOffset;
			
			
			// Create the hand mesh. Its length will be along its local X-axis.
			const mesh = MeshBuilder.CreateBox(name, { width: length, height: thickness, depth: thickness }, this.scene);
			mesh.parent = pivot;
			// Position the hand so its base is at the pivot point, and it extends along the pivot's local X.
			mesh.position.x = length / 2;
			
			const mat = new StandardMaterial("mat" + name, this.scene);
			mat.diffuseColor = color;
			mesh.material = mat;
			
			return pivot; // Return the pivot for rotation
		};
		
		// Create hands with adjusted thickness for visibility
		this.clockHands.hour = createHand("handHour", 0.4, 0.08, Color3.Black(), 0.06);
		this.clockHands.minute = createHand("handMin", 0.6, 0.05, Color3.Black(), 0.07);
		this.clockHands.second = createHand("handSec", 0.65, 0.02, Color3.Red(), 0.08);
		
		// Ticks
		const tickLength = 0.1;
		const tickThickness = 0.05;
		const tickRadius = 0.65; // Distance from center to the middle of the tick
		for (let i = 0; i < 12; i++) {
			const tick = MeshBuilder.CreateBox("tick" + i, { width: tickLength, height: tickThickness, depth: 0.01 }, this.scene);
			tick.parent = face;
			tick.position.y = 0.051; // Stacking along face's local Y (global Z)
			
			const angle = (i * 30) * (Math.PI / 180);
			
			// Position the tick radially
			tick.position.x = Math.cos(angle) * tickRadius;
			tick.position.z = Math.sin(angle) * tickRadius;
			
			// Rotate the tick to align radially
			tick.rotation.y = -angle;
			
			tick.material = matRim;
		}
	}
	
	createArt() {
		// Frame Position: Above Shelf
		const framePos = new Vector3(-2, 9.5, 2.0);
		
		// Frame Mesh
		const frame = MeshBuilder.CreateBox("artFrame", { width: 2.2, height: 1.7, depth: 0.1 }, this.scene);
		frame.position = framePos;
		const matFrame = new StandardMaterial("matFrame", this.scene);
		matFrame.diffuseColor = new Color3(0.8, 0.6, 0.4); // Lighter frame color
		frame.material = matFrame;
		
		// Canvas Mesh
		const canvasMesh = MeshBuilder.CreatePlane("artCanvas", { width: 2, height: 1.5 }, this.scene);
		canvasMesh.parent = frame;
		canvasMesh.position.z = -0.06; // Slightly in front of the frame
		// No rotation.y = Math.PI here, assuming default plane faces camera or light
		
		// Dynamic Texture for Abstract Art
		const textureSize = 512;
		const dynamicTexture = new DynamicTexture("artTex", { width: textureSize, height: textureSize }, this.scene, false);
		const ctx = dynamicTexture.getContext();
		
		// Background - light
		ctx.fillStyle = "#ecf0f1";
		ctx.fillRect(0, 0, textureSize, textureSize);
		
		// Random Shapes - dark
		const colors = ["#2c3e50", "#c0392b", "#e67e22", "#27ae60", "#8e44ad", "#34495e"]; // Darker colors for abstract art
		
		for (let i = 0; i < 15; i++) {
			ctx.fillStyle = colors[Math.floor(Math.random() * colors.length)];
			ctx.globalAlpha = 0.6 + Math.random() * 0.4;
			
			const type = Math.random();
			const x = Math.random() * textureSize;
			const y = Math.random() * textureSize;
			const size = (Math.random() * 100) + 50;
			
			ctx.beginPath();
			if (type > 0.5) {
				// Rectangle
				ctx.fillRect(x - size / 2, y - size / 2, size, size);
			} else {
				// Circle
				ctx.arc(x, y, size / 2, 0, 2 * Math.PI);
				ctx.fill();
			}
		}
		
		dynamicTexture.update();
		
		const matCanvas = new StandardMaterial("matCanvas", this.scene);
		matCanvas.diffuseTexture = dynamicTexture;
		matCanvas.specularColor = Color3.Black();
		matCanvas.emissiveTexture = dynamicTexture; // Make the art self-illuminating
		canvasMesh.material = matCanvas;
	}
	
	update() {
		const now = new Date();
		const h = now.getHours();
		const m = now.getMinutes();
		const s = now.getSeconds();
		const ms = now.getMilliseconds();
		
		// Calculate angles (Radians)
		// For a vertical clock face rotating around its local Y-axis (global Y)
		const rS = (s + ms / 1000) * 6 * (Math.PI / 180);
		const rM = (m + s / 60) * 6 * (Math.PI / 180);
		const rH = ((h % 12) + m / 60) * 30 * (Math.PI / 180);
		
		// Apply rotation to the Y-axis of the hand pivots
		if (this.clockHands.second) this.clockHands.second.rotation.y = -rS;
		if (this.clockHands.minute) this.clockHands.minute.rotation.y = -rM;
		if (this.clockHands.hour) this.clockHands.hour.rotation.y = -rH;
	}
}
