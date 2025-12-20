import {
	MeshBuilder,
	Vector3,
	StandardMaterial,
	Texture,
	Color3,
	Animation,
	CubicEase,
	EasingFunction
} from "@babylonjs/core";
import { AdvancedDynamicTexture, TextBlock, Rectangle, Button, StackPanel, Control } from "@babylonjs/gui";
import { GameState } from './gameState';

export class CustomerCounter {
	constructor(scene, shelfInstance) {
		this.scene = scene;
		this.shelf = shelfInstance;
		
		this.state = "WAITING";
		this.timer = 0;
		this.nextSpawnTime = 2000;
		
		this.currentJob = null;
		this.activeCustomerProfile = null;
		
		this.createCustomerMesh();
		this.createSpeechBubble();
	}
	
	createCustomerMesh() {
		this.customerMesh = MeshBuilder.CreatePlane("customer", { width: 2, height: 2 }, this.scene);
		
		// Modified positions: Left side of screen, slightly lower
		this.hiddenPos = new Vector3(-2.5, 5, 3); // Hidden below desk
		this.visiblePos = new Vector3(-2.5, 8.5, 3); // Visible above desk
		
		this.customerMesh.position = this.hiddenPos;
		this.customerMesh.billboardMode = MeshBuilder.BILLBOARDMODE_Y;
		this.customerMesh.visibility = 0;
		this.customerMesh.renderingGroupId = 1; // Ensure customer renders in front of decorations
		
		this.customerMat = new StandardMaterial("matCustomer", this.scene);
		this.customerMat.specularColor = Color3.Black();
		this.customerMat.emissiveColor = Color3.White();
		this.customerMesh.material = this.customerMat;
	}
	
	createSpeechBubble() {
		this.bubblePlane = MeshBuilder.CreatePlane("bubble", { width: 4, height: 3 }, this.scene);
		
		// Modified position: To the right of the customer and above
		this.bubblePlane.position = new Vector3(1, 9.5, 3);
		this.bubblePlane.billboardMode = MeshBuilder.BILLBOARDMODE_ALL;
		this.bubblePlane.visibility = 0;
		this.bubblePlane.isPickable = false;
		this.bubblePlane.renderingGroupId = 1; // Ensure speech bubble renders in front of decorations
		
		this.adt = AdvancedDynamicTexture.CreateForMesh(this.bubblePlane);
		
		// Container to hold bubble parts
		const container = new Rectangle();
		container.thickness = 0;
		this.adt.addControl(container);
		
		// The Tail (Rotated square at bottom left)
		const tail = new Rectangle();
		tail.width = "60px";
		tail.height = "60px";
		tail.background = "white";
		tail.color = "black";
		tail.thickness = 4;
		tail.rotation = Math.PI / 4;
		tail.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
		tail.verticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM;
		tail.left = "60px"; // Moved inside to be visible
		tail.top = "-20px"; // Moved up to intersect with body
		container.addControl(tail);
		
		// Main Bubble Body
		const bg = new Rectangle();
		bg.background = "white";
		bg.color = "black";
		bg.thickness = 4;
		bg.cornerRadius = 60; // Increased radius
		bg.height = "85%"; // Leave room for tail visual
		bg.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
		container.addControl(bg);
		
		// Patch to hide the border between tail and body
		const patch = new Rectangle();
		patch.width = "80px";
		patch.height = "50px";
		patch.background = "white";
		patch.thickness = 0;
		patch.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
		patch.verticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM;
		patch.left = "70px"; // Aligned with tail
		patch.top = "-55px"; // Positioned over the intersection
		container.addControl(patch);
		
		const panel = new StackPanel();
		bg.addControl(panel);
		
		this.textBlock = new TextBlock();
		this.textBlock.text = "";
		this.textBlock.color = "black";
		this.textBlock.fontSize = 80;
		this.textBlock.textWrapping = true;
		this.textBlock.resizeToFit = true;
		this.textBlock.paddingTop = "20px";
		this.textBlock.paddingLeft = "30px";
		this.textBlock.paddingRight = "30px";
		this.textBlock.height = "250px";
		this.textBlock.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
		this.textBlock.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
		panel.addControl(this.textBlock);
		
		this.btnPanel = new StackPanel();
		this.btnPanel.isVertical = false;
		this.btnPanel.height = "200px";
		this.btnPanel.width = "800px";
		this.btnPanel.isVisible = false;
		panel.addControl(this.btnPanel);
		
		const btnAccept = Button.CreateSimpleButton("btnAcc", "ACCEPT");
		btnAccept.width = "360px";
		btnAccept.height = "160px";
		btnAccept.color = "white";
		btnAccept.background = "#2ecc71";
		btnAccept.cornerRadius = 20;
		btnAccept.fontSize = 60;
		btnAccept.paddingRight = "10px";
		btnAccept.onPointerUpObservable.add(() => this.acceptJob());
		this.btnPanel.addControl(btnAccept);
		
		const btnDecline = Button.CreateSimpleButton("btnDec", "DECLINE");
		btnDecline.width = "360px";
		btnDecline.height = "160px";
		btnDecline.color = "white";
		btnDecline.background = "#e74c3c";
		btnDecline.cornerRadius = 20;
		btnDecline.fontSize = 60;
		btnDecline.paddingLeft = "10px";
		btnDecline.onPointerUpObservable.add(() => this.declineJob());
		this.btnPanel.addControl(btnDecline);
	}
	
	update() {
		const dt = this.scene.getEngine().getDeltaTime();
		
		if (this.state === "WAITING") {
			this.timer += dt;
			if (this.timer >= this.nextSpawnTime) {
				this.spawnCustomer();
			}
		}
	}
	
	spawnCustomer() {
		this.state = "ARRIVING";
		
		const customers = GameState.customers;
		this.activeCustomerProfile = customers[Math.floor(Math.random() * customers.length)];
		
		const tex = new Texture(`assets/${this.activeCustomerProfile.file}`, this.scene);
		this.customerMat.diffuseTexture = tex;
		this.customerMat.emissiveTexture = tex;
		this.customerMesh.visibility = 1;
		
		const frameRate = 60;
		const anim = new Animation("popIn", "position.y", frameRate, Animation.ANIMATIONTYPE_FLOAT, Animation.ANIMATIONLOOPMODE_CONSTANT);
		const keys = [
			{ frame: 0, value: this.hiddenPos.y },
			{ frame: 40, value: this.visiblePos.y }
		];
		anim.setKeys(keys);
		const ease = new CubicEase();
		ease.setEasingMode(EasingFunction.EASINGMODE_EASEOUT);
		anim.setEasingFunction(ease);
		
		this.customerMesh.animations = [anim];
		this.scene.beginAnimation(this.customerMesh, 0, 40, false, 1.0, () => {
			this.generateJob();
		});
	}
	
	generateJob() {
		this.state = "TALKING";
		
		const typeIndex = Math.floor(Math.random() * GameState.packageTypes.length);
		const pkgData = GameState.packageTypes[typeIndex];
		
		const dist = parseFloat((Math.random() * 8 + 2).toFixed(1));
		
		let baseTime = Math.floor(Math.random() * 30) + 30;
		let baseOffer = Math.floor((dist * 15) + (pkgData.weight * 10));
		if (baseTime < 45) baseOffer += 50;
		
		const profile = this.activeCustomerProfile;
		const finalTime = Math.floor(baseTime * profile.timeMult);
		const finalOffer = Math.floor(baseOffer * profile.payMult);
		
		this.currentJob = {
			pkgId: pkgData.id,
			weight: pkgData.weight,
			scale: pkgData.scale,
			rotationOffset: pkgData.rotationOffset,
			distance: dist,
			timeLimit: finalTime,
			reward: finalOffer
		};
		
		const d = GameState.dialogue;
		const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
		
		const greeting = pick(d.greetings);
		const weightText = pick(d.weight).replace("{w}", pkgData.weight);
		const urgencyText = pick(d.urgency).replace("{t}", finalTime);
		const payText = pick(d.payment).replace("{p}", finalOffer);
		
		const message = `${greeting}\n${weightText} ${dist}km away.\n${urgencyText}\n${payText}`;
		
		this.startTypewriter(message);
	}
	
	startTypewriter(fullText) {
		this.bubblePlane.visibility = 1;
		this.bubblePlane.isPickable = true;
		this.textBlock.text = "";
		this.btnPanel.isVisible = false;
		
		let charIndex = 0;
		const speed = 30;
		
		if (this.typeInterval) clearInterval(this.typeInterval);
		
		this.typeInterval = setInterval(() => {
			charIndex++;
			this.textBlock.text = fullText.substring(0, charIndex);
			
			if (charIndex >= fullText.length) {
				clearInterval(this.typeInterval);
				this.btnPanel.isVisible = true;
			}
		}, speed);
	}
	
	acceptJob() {
		if (this.shelf.addPackage(this.currentJob)) {
			this.leaveCustomer();
		} else {
			this.textBlock.text = "Your shelf is full!\nI can't leave it here.";
		}
	}
	
	declineJob() {
		this.leaveCustomer();
	}
	
	leaveCustomer() {
		this.state = "LEAVING";
		this.bubblePlane.visibility = 0;
		this.bubblePlane.isPickable = false;
		if (this.typeInterval) clearInterval(this.typeInterval);
		
		const frameRate = 60;
		const anim = new Animation("popOut", "position.y", frameRate, Animation.ANIMATIONTYPE_FLOAT, Animation.ANIMATIONLOOPMODE_CONSTANT);
		const keys = [
			{ frame: 0, value: this.visiblePos.y },
			{ frame: 30, value: this.hiddenPos.y }
		];
		anim.setKeys(keys);
		
		this.customerMesh.animations = [anim];
		this.scene.beginAnimation(this.customerMesh, 0, 30, false, 1.0, () => {
			this.customerMesh.visibility = 0;
			this.state = "WAITING";
			this.timer = 0;
			this.nextSpawnTime = (Math.random() * 5000) + 10000;
		});
	}
}
