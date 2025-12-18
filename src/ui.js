import { AdvancedDynamicTexture, StackPanel, TextBlock, Button, Control, Grid } from "@babylonjs/gui";
import { GameState } from './gameState';

export class UIManager {
    constructor (scene, onDeliver) {
        this.adt = AdvancedDynamicTexture.CreateFullscreenUI("UI", true, scene);
        this.onDeliver = onDeliver;

        this.createHUD();
        this.createControlDeck();
    };

    createHUD () {
        // Zone 1: The HUD (Top 10%)
        const topPanel = new Grid();
        topPanel.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
        topPanel.height = "10%";
        topPanel.background = "rgba(44, 62, 80, 0.9)";
        topPanel.addColumnDefinition(0.5);
        topPanel.addColumnDefinition(0.5);
        this.adt.addControl(topPanel);

        this.moneyText = new TextBlock();
        this.moneyText.text = `$${GameState.money}`;
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
        // Zone 5: Control Deck (Bottom 20%)
        const bottomContainer = new StackPanel();
        bottomContainer.verticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM;
        bottomContainer.height = "20%";
        bottomContainer.background = "#2c3e50";
        this.adt.addControl(bottomContainer);

        this.statsText = new TextBlock();
        this.statsText.text = "Weight: 0.0 / 0.0 kg";
        this.statsText.color = "#bdc3c7";
        this.statsText.fontSize = "16px";
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
        // MODIFIED: Added check to ensure button is only clickable when flight status is valid
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

        const helpText = new TextBlock();
        helpText.text = "Use Arrow Keys or Swipe to Swap Drones";
        helpText.fontSize = "12px";
        helpText.color = "#7f8c8d";
        helpText.height = "30px";
        bottomContainer.addControl(helpText);
    };

    update () {
        this.moneyText.text = `$${Math.floor(GameState.money)}`;
        this.fleetText.text = GameState.drones[GameState.activeDroneIndex].name.toUpperCase();

        const status = GameState.checkFlightStatus();
        this.deliverBtn.textBlock.text = status.msg;
        this.deliverBtn.background = status.color;
        this.deliverBtn.isEnabled = status.valid;

        const drone = GameState.drones[GameState.activeDroneIndex];
        let currentWeight = drone.baseWeight;
        if (GameState.currentBattery) currentWeight += GameState.currentBattery.weight;
        if (GameState.currentPackage) currentWeight += GameState.currentPackage.weight;

        this.statsText.text = `Payload: ${currentWeight.toFixed(1)} / ${drone.lift} kg`;
    };
};