import { MeshBuilder, Vector3, ActionManager, ExecuteCodeAction } from "@babylonjs/core";
import { AdvancedDynamicTexture, TextBlock, Rectangle, Control } from "@babylonjs/gui";

export class PackageShelf {
	constructor (scene, materials, registerDragCallback, assets) {
		this.scene = scene;
		this.materials = materials;
		this.registerDragCallback = registerDragCallback;
		this.assets = assets;
		this.packages = [];
		
		this.shelfPosition = new Vector3(0, 4.5, 1);
		
		this.slots = [
			new Vector3(-1.5, 0.5, 0),
			new Vector3(0, 0.5, 0),
			new Vector3(1.5, 0.5, 0),
			new Vector3(-1.5, 1.8, 0),
			new Vector3(0, 1.8, 0),
			new Vector3(1.5, 1.8, 0)
		];
		
		this.createShelfMesh();
	}
	
	createShelfMesh () {
		const shelf = MeshBuilder.CreateBox("shelf", { width: 5, height: 0.2, depth: 1.5 }, this.scene);
		shelf.position = this.shelfPosition;
		shelf.material = this.materials.matBatteryCasing;
		
		const topShelf = shelf.clone("topShelf");
		topShelf.position.y = this.shelfPosition.y + 1.5;
		
		const leftLeg = MeshBuilder.CreateBox("legL", { width: 0.2, height: 4, depth: 1.4 }, this.scene);
		leftLeg.position = this.shelfPosition.add(new Vector3(-2.4, 0, 0));
		
		const rightLeg = MeshBuilder.CreateBox("legR", { width: 0.2, height: 4, depth: 1.4 }, this.scene);
		rightLeg.position = this.shelfPosition.add(new Vector3(2.4, 0, 0));
		
		this.root = MeshBuilder.CreateBox("shelfRoot", { size: 0.1 }, this.scene);
		this.root.visibility = 0;
		
		shelf.parent = this.root;
		topShelf.parent = this.root;
		leftLeg.parent = this.root;
		rightLeg.parent = this.root;
	}
	
	addPackage (jobData) {
		const slotIndex = this.packages.length;
		if (slotIndex >= this.slots.length) {
			console.log("Shelf is full!");
			return false;
		}
		
		const targetPos = this.slots[slotIndex].add(this.shelfPosition);
		
		let pkg;
		const container = this.assets[jobData.pkgId];
		
		if (container) {
			const entries = container.instantiateModelsToScene();
			const root = entries.rootNodes[0];
			
			pkg = MeshBuilder.CreateBox("pkgWrapper", { size: 0.5 }, this.scene);
			pkg.visibility = 0;
			
			root.parent = pkg;
			root.scaling = jobData.scale;
			root.rotation = jobData.rotationOffset;
			
			root.getChildMeshes().forEach(m => {
				m.isPickable = true;
			});
		} else {
			pkg = MeshBuilder.CreateBox("package", { size: 0.6 }, this.scene);
			pkg.material = this.materials.matPackage;
		}
		
		pkg.position = targetPos;
		
		pkg.metadata = {
			type: "package",
			distance: jobData.distance,
			weight: jobData.weight,
			reward: jobData.reward,
			timeLimit: jobData.timeLimit,
			isDragging: false,
			onDrone: false
		};
		
		// Create Label for the package
		this.createLabel(pkg, jobData);
		
		this.packages.push(pkg);
		
		if (this.registerDragCallback) {
			this.registerDragCallback(pkg);
		}
		
		return true;
	}
	
	createLabel (parentMesh, data) {
		const plane = MeshBuilder.CreatePlane("pkgLabel", { width: 1.5, height: 1 }, this.scene);
		plane.parent = parentMesh;
		plane.position.y = 0.8; // Above the package
		plane.billboardMode = MeshBuilder.BILLBOARDMODE_ALL;
		plane.renderingGroupId = 1; // Ensure it renders on top of other meshes
		plane.isPickable = false; // Prevent label from blocking mouse events
		plane.isVisible = false; // Start hidden
		
		const adt = AdvancedDynamicTexture.CreateForMesh(plane);
		
		const bg = new Rectangle();
		bg.background = "rgba(0,0,0,0.6)";
		bg.thickness = 0;
		bg.cornerRadius = 20;
		adt.addControl(bg);
		
		const stack = new Control();
		bg.addControl(stack);
		
		const infoText = new TextBlock();
		infoText.text = `${data.weight}kg | ${data.distance}km\n$${data.reward}`;
		infoText.color = "#f1c40f";
		infoText.fontSize = 120;
		infoText.fontWeight = "bold";
		infoText.textWrapping = true;
		adt.addControl(infoText);
		
		// Hover Logic
		const actionManager = new ActionManager(this.scene);
		
		let hideTimer = null;
		const show = () => {
			if (hideTimer) {
				clearTimeout(hideTimer);
				hideTimer = null;
			}
			plane.isVisible = true;
		};
		
		const hide = () => {
			hideTimer = setTimeout(() => {
				plane.isVisible = false;
			}, 50); // Small delay to prevent flickering when moving between child meshes
		};
		
		actionManager.registerAction(new ExecuteCodeAction(ActionManager.OnPointerOverTrigger, show));
		actionManager.registerAction(new ExecuteCodeAction(ActionManager.OnPointerOutTrigger, hide));
		
		parentMesh.actionManager = actionManager;
		// Attach same action manager to all children (the visible parts of the package)
		parentMesh.getChildMeshes().forEach(m => {
			m.actionManager = actionManager;
		});
	}
	
	update () {
		for (let i = this.packages.length - 1; i >= 0; i--) {
			if (this.packages[i].isDisposed() || this.packages[i].parent !== null) {
				this.packages.splice(i, 1);
			}
		}
	}
}
