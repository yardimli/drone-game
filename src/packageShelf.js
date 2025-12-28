import { MeshBuilder, Vector3, ActionManager, ExecuteCodeAction } from "@babylonjs/core";
import { AdvancedDynamicTexture, TextBlock, Rectangle, Control } from "@babylonjs/gui";

export class PackageShelf {
	constructor(scene, materials, registerDragCallback, assets) {
		this.scene = scene;
		this.materials = materials;
		this.registerDragCallback = registerDragCallback;
		this.assets = assets;
		this.packages = [];
		this.shelfPosition = new Vector3(0, 4.5, 1);
		
		// Changed: Initialize slot tracking
		// 10 slots (2 rows x 5 columns)
		this.slots = [];
		this.slotContent = new Array(10).fill(null);
		
		this.initSlots();
		this.createShelfMesh();
	}
	
	initSlots() {
		// Calculate slot positions relative to shelf center
		// Shelf width is 7. Spacing approx 1.3 to fit 5 items.
		const yPos = [0.2, 1.7]; // Bottom row, Top row
		const xStart = -2.6;
		const xStep = 1.3;
		
		for (let r = 0; r < 2; r++) {
			for (let c = 0; c < 5; c++) {
				this.slots.push(new Vector3(xStart + (c * xStep), yPos[r], 0));
			}
		}
	}
	
	createShelfMesh() {
		const shelf = MeshBuilder.CreateBox("shelf", { width: 7, height: 0.2, depth: 1.5 }, this.scene);
		shelf.position = this.shelfPosition;
		shelf.material = this.materials.matBatteryCasing;
		shelf.isPickable = false;
		
		const topShelf = shelf.clone("topShelf");
		topShelf.position.y = this.shelfPosition.y + 1.5;
		
		const leftLeg = MeshBuilder.CreateBox("legL", { width: 0.2, height: 4, depth: 1.4 }, this.scene);
		leftLeg.position = this.shelfPosition.add(new Vector3(-3.5, 0, 0));
		leftLeg.isPickable = false;
		
		const rightLeg = MeshBuilder.CreateBox("legR", { width: 0.2, height: 4, depth: 1.4 }, this.scene);
		rightLeg.position = this.shelfPosition.add(new Vector3(3.5, 0, 0));
		rightLeg.isPickable = false;
		
		this.root = MeshBuilder.CreateBox("shelfRoot", { size: 0.1 }, this.scene);
		this.root.visibility = 0;
		this.root.isPickable = false;
		
		shelf.parent = this.root;
		topShelf.parent = this.root;
		leftLeg.parent = this.root;
		rightLeg.parent = this.root;
	}
	
	// New: Check if shelf has space
	isFull() {
		return this.getFreeSlot() === -1;
	}
	
	// New: Find first empty slot index
	getFreeSlot() {
		return this.slotContent.findIndex(slot => slot === null);
	}
	
	// New: Find closest slot to a world position (for drag & drop)
	getClosestSlotIndex(worldPos) {
		const localPos = worldPos.subtract(this.shelfPosition);
		let closestIndex = -1;
		let minDist = 0.8; // Threshold distance to snap
		
		this.slots.forEach((slotPos, i) => {
			const dist = Vector3.Distance(localPos, slotPos);
			if (dist < minDist) {
				minDist = dist;
				closestIndex = i;
			}
		});
		
		return closestIndex;
	}
	
	// New: Assign a mesh to a specific slot
	assignToSlot(mesh, index) {
		// Clear previous slot if the mesh was already on shelf
		this.removePackageFromSlot(mesh);
		
		this.slotContent[index] = mesh;
		mesh.metadata.slotIndex = index;
		
		// Calculate target position
		const targetPos = this.slots[index].add(this.shelfPosition);
		mesh.metadata.initialPosition = targetPos.clone();
		
		// Note: We don't set mesh.position here immediately if dragging,
		// the animation logic in GameScene will handle the move.
		// But for initial spawn, we should set it.
		if (!mesh.metadata.isDragging) {
			mesh.position = targetPos;
		}
	}
	
	// New: Clear slot record for a mesh
	removePackageFromSlot(mesh) {
		if (mesh.metadata.slotIndex !== undefined && mesh.metadata.slotIndex !== -1) {
			if (this.slotContent[mesh.metadata.slotIndex] === mesh) {
				this.slotContent[mesh.metadata.slotIndex] = null;
			}
			mesh.metadata.slotIndex = -1;
		}
	}
	
	addPackage(jobData) {
		const slotIndex = this.getFreeSlot();
		if (slotIndex === -1) {
			console.log("Shelf is full!");
			return false;
		}
		
		// Create mesh logic (same as before)
		let pkg;
		const container = this.assets[jobData.pkgId];
		
		if (container) {
			const entries = container.instantiateModelsToScene();
			const root = entries.rootNodes[0];
			
			pkg = MeshBuilder.CreateBox("pkgWrapper", { size: 1.0 }, this.scene);
			pkg.visibility = 0;
			pkg.isPickable = true;
			
			root.parent = pkg;
			root.scaling = jobData.scale;
			root.rotation = jobData.rotationOffset;
			
			root.getChildMeshes().forEach(m => {
				m.isPickable = false;
			});
		} else {
			pkg = MeshBuilder.CreateBox("package", { size: 0.6 }, this.scene);
			pkg.material = this.materials.matPackage;
			pkg.isPickable = true;
		}
		
		pkg.metadata = {
			type: "package",
			distance: jobData.distance,
			weight: jobData.weight,
			reward: jobData.reward,
			timeLimit: jobData.timeLimit,
			isDragging: false,
			onDrone: false,
			slotIndex: -1 // Initialize
		};
		
		// Assign to the found slot
		this.assignToSlot(pkg, slotIndex);
		
		this.createLabel(pkg, jobData);
		
		this.packages.push(pkg);
		
		if (this.registerDragCallback) {
			this.registerDragCallback(pkg);
		}
		
		return true;
	}
	
	createLabel(parentMesh, data) {
		const plane = MeshBuilder.CreatePlane("pkgLabel", { width: 1.5, height: 1 }, this.scene);
		plane.parent = parentMesh;
		plane.position.y = 0.8;
		plane.billboardMode = MeshBuilder.BILLBOARDMODE_ALL;
		plane.renderingGroupId = 1;
		plane.isPickable = false;
		plane.isVisible = false;
		
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
		infoText.fontSize = 150;
		infoText.fontWeight = "bold";
		infoText.textWrapping = true;
		adt.addControl(infoText);
		
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
			}, 50);
		};
		
		actionManager.registerAction(new ExecuteCodeAction(ActionManager.OnPointerOverTrigger, show));
		actionManager.registerAction(new ExecuteCodeAction(ActionManager.OnPointerOutTrigger, hide));
		
		parentMesh.actionManager = actionManager;
	}
	
	update() {
		for (let i = this.packages.length - 1; i >= 0; i--) {
			if (this.packages[i].isDisposed() || this.packages[i].parent !== null) {
				// If parent is not null (e.g. attached to drone), we stop tracking it in the shelf list
				// Note: Slot content should have been cleared by drag logic already
				this.packages.splice(i, 1);
			}
		}
	}
}
