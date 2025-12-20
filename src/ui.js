import {AdvancedDynamicTexture, StackPanel, TextBlock, Button, Control, Grid, Rectangle} from "@babylonjs/gui";
import {Animation} from "@babylonjs/core";
import {GameState} from './gameState';

export class UIManager {
	constructor (scene, onDeliver) {
		this.adt = AdvancedDynamicTexture.CreateFullscreenUI("UI", true, scene);
		this.onDeliver = onDeliver;
		
		// Flag to prevent update() from overwriting the money text during animation
		this.isAnimatingMoney = false;
		
		this.createHUD();
		this.createControlDeck();
	};
	
	createHUD () {
		// Zone 1: The HUD (Top 5%)
		const topPanel = new Grid();
		topPanel.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
		topPanel.height = "5%";
		topPanel.background = "rgba(44, 62, 80, 0.9)";
		topPanel.addColumnDefinition(0.5);
		topPanel.addColumnDefinition(0.5);
		this.adt.addControl(topPanel);
		
		this.moneyText = new TextBlock();
		// Initial set with decimal formatting
		this.moneyText.text = `$${GameState.money.toFixed(2)}`;
		this.moneyText.color = "#2ecc71";
		this.moneyText.fontSize = "28px";
		this.moneyText.fontWeight = "bold";
		this.moneyText.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
		this.moneyText.paddingLeft = "20px";
		topPanel.addControl(this.moneyText, 0, 0);
		
		this.fleetText = new TextBlock();
		this.fleetText.text = "SPARROW";
		this.fleetText.color = "white";
		this.fleetText.fontSize = "20px";
		this.fleetText.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_RIGHT;
		this.fleetText.paddingRight = "20px";
		topPanel.addControl(this.fleetText, 0, 1);
	};
	
	createControlDeck () {
		const bottomContainer = new StackPanel();
		bottomContainer.verticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM;
		bottomContainer.height = "15%";
		bottomContainer.background = "#2c3e50";
		this.adt.addControl(bottomContainer);
		
		this.statsText = new TextBlock();
		this.statsText.text = "Weight: 0.0 / 0.0 kg";
		this.statsText.color = "#bdc3c7";
		this.statsText.fontSize = "14px";
		this.statsText.height = "40px";
		bottomContainer.addControl(this.statsText);
		
		const buttonGrid = new Grid();
		buttonGrid.height = "80px";
		buttonGrid.addColumnDefinition(0.25);
		buttonGrid.addColumnDefinition(0.5);
		buttonGrid.addColumnDefinition(0.25);
		bottomContainer.addControl(buttonGrid);
		
		const shopBtn = Button.CreateSimpleButton("btnShop", "SHOP");
		shopBtn.width = "90%";
		shopBtn.height = "50px";
		shopBtn.color = "white";
		shopBtn.background = "#34495e";
		shopBtn.cornerRadius = 5;
		shopBtn.fontSize = "14px";
		buttonGrid.addControl(shopBtn, 0, 0);
		
		this.deliverBtn = Button.CreateSimpleButton("btnDeliver", "LOAD COMPONENTS");
		this.deliverBtn.width = "95%";
		this.deliverBtn.height = "60px";
		this.deliverBtn.color = "white";
		this.deliverBtn.cornerRadius = 10;
		this.deliverBtn.background = "#95a5a6";
		this.deliverBtn.fontSize = "20px";
		this.deliverBtn.fontWeight = "bold";
		
		this.deliverBtn.onPointerUpObservable.add(() => {
			const status = GameState.checkFlightStatus();
			if (status.valid) {
				this.onDeliver();
			}
		});
		buttonGrid.addControl(this.deliverBtn, 0, 1);
		
		const upgradeBtn = Button.CreateSimpleButton("btnUpgrade", "UPGRADE");
		upgradeBtn.width = "90%";
		upgradeBtn.height = "50px";
		upgradeBtn.color = "white";
		upgradeBtn.background = "#34495e";
		upgradeBtn.cornerRadius = 5;
		upgradeBtn.fontSize = "14px";
		buttonGrid.addControl(upgradeBtn, 0, 2);
	};
	
	fadeIn () {
		const fadeRect = new Rectangle("fadeRect");
		fadeRect.background = "black";
		fadeRect.thickness = 0;
		fadeRect.alpha = 1;
		fadeRect.zIndex = 100; // Ensure it covers everything
		this.adt.addControl(fadeRect);
		
		const frameRate = 60;
		const animFade = new Animation("fadeIn", "alpha", frameRate, Animation.ANIMATIONTYPE_FLOAT, Animation.ANIMATIONLOOPMODE_CONSTANT);
		const keys = [
			{frame: 0, value: 1},
			{frame: 60, value: 0} // Fade to transparent over 1 second
		];
		animFade.setKeys(keys);
		
		const scene = this.adt.getScene();
		if (scene) {
			scene.beginDirectAnimation(fadeRect, [animFade], 0, 60, false, 1.0, () => {
				fadeRect.dispose();
			});
		}
	}
	
	// Helper to set money text with formatting
	setMoneyText (amount) {
		this.moneyText.text = `$${amount.toFixed(2)}`;
	}
	
	update () {
		// Only update money from GameState if we aren't currently animating the counter
		if (!this.isAnimatingMoney) {
			this.setMoneyText(GameState.money);
		}
		
		this.fleetText.text = GameState.drones[GameState.activeDroneIndex].name.toUpperCase();
		
		const status = GameState.checkFlightStatus();
		this.deliverBtn.textBlock.text = status.msg;
		this.deliverBtn.background = status.color;
		this.deliverBtn.isEnabled = status.valid;
		
		const drone = GameState.drones[GameState.activeDroneIndex];
		let currentWeight = drone.baseWeight;
		let batText = "No Bat";
		let pkgText = "No Pkg";
		
		if (GameState.currentBattery) {
			currentWeight += GameState.currentBattery.weight;
			const charge = Math.floor((GameState.currentBattery.charge / GameState.currentBattery.maxCharge) * 100);
			batText = `Bat: ${charge}% (${GameState.currentBattery.weight}kg)`;
		}
		
		if (GameState.currentPackage) {
			currentWeight += GameState.currentPackage.weight;
			pkgText = `Pkg: ${GameState.currentPackage.weight}kg`;
		}
		
		this.statsText.text = `Payload: ${currentWeight.toFixed(1)} / ${drone.lift} kg  |  ${batText}  |  ${pkgText}`;
	};
}
