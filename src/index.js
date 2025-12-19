import { Engine } from "@babylonjs/core";
import { GameScene } from './gameScene';
import { UIManager } from './ui';
import { GameState } from './gameState';
import { SplashScreen } from './splashScreen';

const canvas = document.getElementById("renderCanvas");
const engine = new Engine(canvas, true);
const initGame = async () => {
	const splash = new SplashScreen(engine);
	await splash.show();
	
	const handleDeliver = () => {
		const status = GameState.checkFlightStatus();
		if (status.valid) {
			// Calculate energy cost using the new formula
			const energyCost = GameState.calculateFlightCost();
			
			GameState.money += GameState.currentPackage.reward;
			GameState.currentBattery.charge -= energyCost;
			gameScene.animateDelivery();
		}
	};
	
	const gameScene = new GameScene(engine, null);
	const uiManager = new UIManager(gameScene.scene, handleDeliver);
	gameScene.uiManager = uiManager;
	
	await gameScene.init();
	
	uiManager.adt.getScene = () => gameScene.scene;
	uiManager.fadeIn();
	
	engine.runRenderLoop(() => {
		gameScene.scene.render();
		uiManager.update();
	});
	
	window.addEventListener("resize", () => {
		engine.resize();
	});
};
initGame();
