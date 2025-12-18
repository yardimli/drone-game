import {
    Scene,
    Vector3,
    HemisphericLight,
    MeshBuilder,
    StandardMaterial,
    Color3,
    PointerDragBehavior,
    PointerEventTypes,
    Animation,
    ArcRotateCamera
} from "@babylonjs/core";
import { GameState } from './gameState';

export class GameScene {
    constructor (engine, uiManager) {
        this.engine = engine;
        this.uiManager = uiManager;
        this.scene = new Scene(engine);
        this.scene.clearColor = new Color3(0.1, 0.1, 0.15);

        // State
        this.packages = [];
        this.batteries = [];
        this.droneMesh = null;
    };

    async init () {
        this.createCamera();
        const light = new HemisphericLight("light", new Vector3(0, 1, 0), this.scene);
        light.intensity = 0.8;

        this.initMaterials();
        this.createZones();
        this.setupInput();

        this.scene.registerBeforeRender(() => {
            this.updateConveyor();
            this.updateDroneVisuals();
        });
    };

    createCamera () {
        const camera = new ArcRotateCamera("Camera", -Math.PI / 2, Math.PI / 2.5, 16, Vector3.Zero(), this.scene);
        camera.inputs.clear();
    };

    initMaterials () {
        this.matPackage = new StandardMaterial("matPkg", this.scene);
        this.matPackage.diffuseColor = new Color3(0.6, 0.4, 0.2);

        this.matBattery = new StandardMaterial("matBat", this.scene);
        this.matBattery.diffuseColor = new Color3(0.2, 0.8, 0.2);

        this.matDrone = new StandardMaterial("matDrone", this.scene);
        this.matRotor = new StandardMaterial("matRotor", this.scene);
        this.matRotor.diffuseColor = new Color3(0.1, 0.1, 0.1);
    };

    createZones () {
        const belt = MeshBuilder.CreateBox("belt", { width: 10, height: 0.2, depth: 2 }, this.scene);
        belt.position.y = 4;

        const rack = MeshBuilder.CreateBox("rack", { width: 8, height: 0.2, depth: 1 }, this.scene);
        rack.position.y = 1.5;

        this.spawnBattery(-2, 1);
        this.spawnBattery(0, 2);
        this.spawnBattery(2, 3);

        this.createDroneMesh();
    };

    createDroneMesh () {
        if (this.droneMesh) this.droneMesh.dispose();

        const droneData = GameState.drones[GameState.activeDroneIndex];
        this.matDrone.diffuseColor = Color3.FromHexString(droneData.color);

        this.droneMesh = MeshBuilder.CreateBox("droneFrame", { width: 1.2, height: 0.2, depth: 1.2 }, this.scene);
        this.droneMesh.position.y = -3;
        this.droneMesh.material = this.matDrone;

        const rotorOffsets = [
            new Vector3(0.8, 0, 0.8),
            new Vector3(-0.8, 0, 0.8),
            new Vector3(0.8, 0, -0.8),
            new Vector3(-0.8, 0, -0.8)
        ];

        rotorOffsets.forEach((offset, index) => {
            const arm = MeshBuilder.CreateBox("arm" + index, { width: 1.0, height: 0.1, depth: 0.1 }, this.scene);
            arm.parent = this.droneMesh;
            arm.position = offset.scale(0.5);
            arm.lookAt(this.droneMesh.position.add(offset));

            const rotor = MeshBuilder.CreateCylinder("rotor" + index, { diameter: 0.8, height: 0.1 }, this.scene);
            rotor.parent = this.droneMesh;
            rotor.position = offset;
            rotor.material = this.matRotor;
        });

        const batSlot = MeshBuilder.CreateBox("batSlot", { size: 0.5 }, this.scene);
        batSlot.parent = this.droneMesh;
        batSlot.position.y = 0.3;
        batSlot.position.z = -0.4;
        batSlot.visibility = 0.3;

        const pkgSlot = MeshBuilder.CreateBox("pkgSlot", { size: 0.8 }, this.scene);
        pkgSlot.parent = this.droneMesh;
        pkgSlot.position.y = -0.6;
        pkgSlot.visibility = 0.3;
    };

    spawnPackage () {
        const pkg = MeshBuilder.CreateBox("package", { size: 0.8 }, this.scene);
        pkg.position = new Vector3(6, 4.5, 0);
        pkg.material = this.matPackage;

        const dist = parseFloat((Math.random() * 5 + 1).toFixed(1));
        const weight = parseFloat((Math.random() * 3 + 0.5).toFixed(1));
        const reward = Math.floor(dist * 10 + weight * 5);

        pkg.metadata = { type: "package", distance: dist, weight: weight, reward: reward, isDragging: false, onDrone: false };
        this.packages.push(pkg);
    };

    spawnBattery (xPos, tier) {
        const bat = MeshBuilder.CreateBox("battery", { width: 0.5, height: 0.8, depth: 0.3 }, this.scene);
        bat.position = new Vector3(xPos, 2, 0);
        bat.material = this.matBattery;

        const weight = tier * 0.5;
        const charge = tier * 3.0;

        bat.metadata = { type: "battery", weight: weight, charge: charge, isDragging: false, onDrone: false };
        this.batteries.push(bat);
    };

    updateConveyor () {
        if (Math.random() < 0.015) this.spawnPackage();

        for (let i = this.packages.length - 1; i >= 0; i--) {
            const p = this.packages[i];

            // MODIFIED: Added safety check for disposed meshes to prevent "isDragging" null error
            if (!p || p.isDisposed()) {
                this.packages.splice(i, 1);
                continue;
            }

            if (!p.metadata.isDragging && !p.metadata.onDrone) {
                p.position.x -= 0.01;

                if (p.position.x < -6) {
                    p.dispose();
                    this.packages.splice(i, 1);
                }
            }
        }
    };

    setupInput () {
        const dragBehavior = new PointerDragBehavior({ dragPlaneNormal: new Vector3(0, 0, 1) });

        this.scene.onPointerObservable.add((pointerInfo) => {
            if (pointerInfo.type === PointerEventTypes.POINTERDOWN) {
                if (pointerInfo.pickInfo.hit && pointerInfo.pickInfo.pickedMesh) {
                    const mesh = pointerInfo.pickInfo.pickedMesh;
                    if (mesh.metadata && (mesh.metadata.type === 'package' || mesh.metadata.type === 'battery')) {
                        if (!mesh.behaviors || mesh.behaviors.length === 0) {
                            mesh.addBehavior(dragBehavior);
                        }
                    }
                }
            }
        });

        dragBehavior.onDragStartObservable.add((event) => {
            const mesh = dragBehavior.attachedNode;
            mesh.metadata.isDragging = true;

            if (mesh.metadata.onDrone) {
                mesh.setParent(null);
                mesh.metadata.onDrone = false;
                if (mesh.metadata.type === 'package') GameState.currentPackage = null;
                if (mesh.metadata.type === 'battery') GameState.currentBattery = null;
            }
        });

        dragBehavior.onDragEndObservable.add((event) => {
            const mesh = dragBehavior.attachedNode;
            mesh.metadata.isDragging = false;

            if (mesh.intersectsMesh(this.droneMesh, false)) {
                if (mesh.metadata.type === 'package' && !GameState.currentPackage) {
                    mesh.setParent(this.droneMesh);
                    mesh.position = new Vector3(0, -0.8, 0);
                    mesh.rotation = Vector3.Zero();
                    mesh.metadata.onDrone = true;
                    GameState.currentPackage = mesh.metadata;
                    GameState.currentPackage.mesh = mesh;
                } else if (mesh.metadata.type === 'battery' && !GameState.currentBattery) {
                    mesh.setParent(this.droneMesh);
                    mesh.position = new Vector3(0, 0.4, 0);
                    mesh.rotation = Vector3.Zero();
                    mesh.metadata.onDrone = true;
                    GameState.currentBattery = mesh.metadata;
                    GameState.currentBattery.mesh = mesh;
                } else {
                    this.returnToSource(mesh);
                }
            } else {
                this.returnToSource(mesh);
            }
        });
    };

    returnToSource (mesh) {
        if (mesh.metadata.type === 'battery') {
            mesh.position = new Vector3(mesh.position.x, 2, 0);
            mesh.rotation = Vector3.Zero();
        } else {
            mesh.position = new Vector3(mesh.position.x, 4.5, 0);
            mesh.rotation = Vector3.Zero();
        }
    };

    updateDroneVisuals () {
        const status = GameState.checkFlightStatus();
        if (status.msg.includes("OVERWEIGHT")) {
            this.droneMesh.position.y = -3.2 + Math.sin(Date.now() * 0.05) * 0.03;
        } else {
            this.droneMesh.position.y = -3;
        }
    };

    animateDelivery () {
        const anim = new Animation("fly", "position.y", 60, Animation.ANIMATIONTYPE_FLOAT, Animation.ANIMATIONLOOPMODE_CONSTANT);
        const keys = [{ frame: 0, value: -3 }, { frame: 60, value: 10 }];
        anim.setKeys(keys);

        this.droneMesh.animations = [anim];
        this.scene.beginAnimation(this.droneMesh, 0, 60, false, 1, () => {
            this.resetDrone();
        });
    };

    resetDrone () {
        this.droneMesh.position.y = -3;

        // MODIFIED: Explicitly dispose meshes and clear state to ensure updateConveyor skips them
        if (GameState.currentPackage && GameState.currentPackage.mesh) {
            GameState.currentPackage.mesh.dispose();
            GameState.currentPackage = null;
        }

        if (GameState.currentBattery && GameState.currentBattery.mesh) {
            GameState.currentBattery.mesh.dispose();
            GameState.currentBattery = null;
        }
    };

    changeDrone (dir) {
        GameState.activeDroneIndex += dir;
        if (GameState.activeDroneIndex < 0) GameState.activeDroneIndex = GameState.drones.length - 1;
        if (GameState.activeDroneIndex >= GameState.drones.length) GameState.activeDroneIndex = 0;

        if (GameState.currentPackage && GameState.currentPackage.mesh) {
            GameState.currentPackage.mesh.dispose();
            GameState.currentPackage = null;
        }
        if (GameState.currentBattery && GameState.currentBattery.mesh) {
            GameState.currentBattery.mesh.dispose();
            GameState.currentBattery = null;
        }

        this.createDroneMesh();
    };
}