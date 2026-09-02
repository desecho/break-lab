import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import type { WeaponId } from "../destruction/types";

const MATERIALS = {
  gunmetal: new THREE.MeshStandardMaterial({ color: 0x727c7f, metalness: 0.82, roughness: 0.26 }),
  darkMetal: new THREE.MeshStandardMaterial({ color: 0x3c4548, metalness: 0.75, roughness: 0.34 }),
  inset: new THREE.MeshStandardMaterial({ color: 0x090c0d, metalness: 0.55, roughness: 0.42 }),
  polymer: new THREE.MeshStandardMaterial({ color: 0x485152, metalness: 0.08, roughness: 0.68 }),
  grip: new THREE.MeshStandardMaterial({ color: 0x343c3c, metalness: 0.05, roughness: 0.9 }),
  wood: new THREE.MeshStandardMaterial({ color: 0x75462b, metalness: 0.02, roughness: 0.56 }),
  woodDark: new THREE.MeshStandardMaterial({ color: 0x3f2518, metalness: 0.02, roughness: 0.72 }),
  brass: new THREE.MeshStandardMaterial({ color: 0xb58a45, metalness: 0.8, roughness: 0.25 }),
} as const;

export class WeaponView {
  readonly group = new THREE.Group();
  private readonly pistol: THREE.Group;
  private readonly shotgun: THREE.Group;
  private readonly machineGun: THREE.Group;
  private readonly muzzle: THREE.PointLight;
  private readonly viewLight: THREE.PointLight;
  private readonly muzzleFlash: THREE.Group;
  private readonly basePosition = new THREE.Vector3(0.36, -0.3, -0.66);
  private recoil = 0;
  private flash = 0;
  private weaponId: WeaponId = "pistol";

  constructor(private readonly camera: THREE.PerspectiveCamera) {
    this.group.position.copy(this.basePosition);
    this.group.rotation.set(-0.015, 0.07, -0.025);
    this.pistol = createPistol();
    this.shotgun = createShotgun();
    this.machineGun = createMachineGun();
    this.shotgun.visible = false;
    this.machineGun.visible = false;
    this.muzzle = new THREE.PointLight(0xffb23c, 0, 2.8);
    this.viewLight = new THREE.PointLight(0xe4f0ed, 10, 3, 1);
    this.viewLight.position.set(-0.25, 0.38, 0.18);
    this.muzzleFlash = createMuzzleFlash();
    this.muzzleFlash.visible = false;
    this.group.add(this.pistol, this.shotgun, this.machineGun, this.muzzle, this.muzzleFlash);
    this.setMuzzlePosition("pistol");
    camera.add(this.group, this.viewLight);
  }

  fire(id: WeaponId, reducedFlashes: boolean): void {
    this.recoil = id === "shotgun" ? 1 : id === "machine-gun" ? 0.28 : 0.52;
    this.flash = reducedFlashes ? 0.018 : id === "shotgun" ? 0.065 : id === "machine-gun" ? 0.032 : 0.045;
    this.muzzle.intensity = reducedFlashes ? 2 : id === "shotgun" ? 13 : id === "machine-gun" ? 7 : 8;
    this.muzzleFlash.visible = true;
    this.muzzleFlash.scale.setScalar(id === "shotgun" ? 1.45 : id === "machine-gun" ? 0.72 : 0.8);
    this.muzzleFlash.rotation.z = Math.random() * Math.PI;
  }

  setWeapon(id: WeaponId): void {
    this.weaponId = id;
    this.pistol.visible = id === "pistol";
    this.shotgun.visible = id === "shotgun";
    this.machineGun.visible = id === "machine-gun";
    this.basePosition.set(id === "pistol" ? 0.36 : 0.39, id === "pistol" ? -0.3 : -0.34, id === "shotgun" ? -0.78 : id === "machine-gun" ? -0.74 : -0.66);
    this.setMuzzlePosition(id);
  }

  update(delta: number): void {
    this.recoil = THREE.MathUtils.damp(this.recoil, 0, this.weaponId === "shotgun" ? 10 : this.weaponId === "machine-gun" ? 19 : 16, delta);
    this.group.position.x = this.basePosition.x;
    this.group.position.y = this.basePosition.y - this.recoil * 0.025;
    this.group.position.z = this.basePosition.z + this.recoil * (this.weaponId === "shotgun" ? 0.19 : this.weaponId === "machine-gun" ? 0.09 : 0.11);
    this.group.rotation.x = -0.015 + this.recoil * (this.weaponId === "shotgun" ? 0.095 : this.weaponId === "machine-gun" ? 0.045 : 0.065);
    this.flash -= delta;
    if (this.flash <= 0) {
      this.muzzle.intensity = 0;
      this.muzzleFlash.visible = false;
    }
  }

  dispose(): void {
    this.camera.remove(this.group);
    this.camera.remove(this.viewLight);
    const materials = new Set<THREE.Material>();
    this.group.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose();
        const childMaterials = Array.isArray(child.material) ? child.material : [child.material];
        for (const material of childMaterials) materials.add(material);
      }
    });
    for (const material of materials) material.dispose();
  }

  private setMuzzlePosition(id: WeaponId): void {
    const position: [number, number, number] = id === "shotgun" ? [0, 0.1, -1.195] : id === "machine-gun" ? [0, 0.09, -1.03] : [0, 0.065, -0.4];
    this.muzzle.position.set(...position);
    this.muzzleFlash.position.set(...position);
  }
}

function createPistol(): THREE.Group {
  const pistol = new THREE.Group();

  addRoundedBox(pistol, [0.19, 0.15, 0.53], [0, 0.07, -0.1], MATERIALS.gunmetal, 0.018);
  addRoundedBox(pistol, [0.175, 0.105, 0.36], [0, -0.045, 0], MATERIALS.polymer, 0.025);
  addCylinder(pistol, 0.042, 0.45, [0, 0.065, -0.12], MATERIALS.darkMetal);
  addCylinder(pistol, 0.049, 0.035, [0, 0.065, -0.382], MATERIALS.gunmetal);
  addBox(pistol, [0.098, 0.009, 0.12], [0, 0.149, -0.025], MATERIALS.inset);

  const grip = addRoundedBox(pistol, [0.145, 0.34, 0.17], [0, -0.225, 0.13], MATERIALS.grip, 0.025);
  grip.rotation.x = -0.16;
  for (let index = 0; index < 5; index++) {
    const y = -0.12 - index * 0.048;
    const leftRib = addBox(pistol, [0.004, 0.012, 0.105], [-0.075, y, 0.125], MATERIALS.polymer);
    const rightRib = addBox(pistol, [0.004, 0.012, 0.105], [0.075, y, 0.125], MATERIALS.polymer);
    leftRib.rotation.x = rightRib.rotation.x = -0.16;
  }

  addTriggerGuard(pistol, [0, -0.12, -0.045], 0.068, MATERIALS.darkMetal);
  const trigger = addBox(pistol, [0.018, 0.09, 0.018], [0, -0.12, -0.035], MATERIALS.gunmetal);
  trigger.rotation.x = -0.3;
  addRoundedBox(pistol, [0.158, 0.025, 0.18], [0, -0.398, 0.18], MATERIALS.darkMetal, 0.008);
  addCylinder(pistol, 0.021, 0.012, [-0.1, -0.01, 0.02], MATERIALS.brass, "x");
  addBox(pistol, [0.038, 0.035, 0.04], [0, 0.165, -0.31], MATERIALS.inset);
  addBox(pistol, [0.08, 0.035, 0.045], [0, 0.165, 0.115], MATERIALS.inset);
  addBox(pistol, [0.014, 0.018, 0.014], [0, 0.19, -0.315], MATERIALS.brass);

  for (let index = 0; index < 5; index++) {
    const z = 0.085 + index * 0.027;
    const left = addBox(pistol, [0.006, 0.105, 0.012], [-0.097, 0.07, z], MATERIALS.inset);
    const right = addBox(pistol, [0.006, 0.105, 0.012], [0.097, 0.07, z], MATERIALS.inset);
    left.rotation.x = right.rotation.x = -0.2;
  }

  pistol.rotation.y = -0.035;
  return pistol;
}

function createShotgun(): THREE.Group {
  const shotgun = new THREE.Group();

  addRoundedBox(shotgun, [0.205, 0.205, 0.45], [0, 0.015, 0.08], MATERIALS.gunmetal, 0.025);
  addBox(shotgun, [0.213, 0.085, 0.2], [0, 0.09, -0.22], MATERIALS.darkMetal);
  addCylinder(shotgun, 0.044, 1.05, [0, 0.1, -0.66], MATERIALS.darkMetal);
  addCylinder(shotgun, 0.052, 0.035, [0, 0.1, -1.195], MATERIALS.gunmetal);
  addCylinder(shotgun, 0.034, 0.83, [0, -0.015, -0.58], MATERIALS.gunmetal);
  addCylinder(shotgun, 0.04, 0.04, [0, -0.015, -1.01], MATERIALS.brass);

  addRoundedBox(shotgun, [0.19, 0.15, 0.34], [0, -0.025, -0.5], MATERIALS.wood, 0.035);
  for (let index = 0; index < 7; index++) {
    addBox(shotgun, [0.196, 0.155, 0.012], [0, -0.025, -0.64 + index * 0.047], MATERIALS.woodDark);
  }

  const stock = addRoundedBox(shotgun, [0.19, 0.225, 0.62], [0, -0.03, 0.57], MATERIALS.wood, 0.035);
  stock.rotation.x = -0.045;
  const wrist = addRoundedBox(shotgun, [0.15, 0.26, 0.19], [0, -0.16, 0.27], MATERIALS.woodDark, 0.025);
  wrist.rotation.x = -0.28;
  const butt = addRoundedBox(shotgun, [0.205, 0.255, 0.045], [0, -0.045, 0.895], MATERIALS.grip, 0.012);
  butt.rotation.x = -0.045;

  addBox(shotgun, [0.215, 0.065, 0.17], [0, -0.1, 0.07], MATERIALS.inset);
  addBox(shotgun, [0.008, 0.085, 0.19], [-0.107, 0.04, -0.015], MATERIALS.inset);
  addCylinder(shotgun, 0.018, 0.018, [0.112, 0.01, 0.2], MATERIALS.brass, "x");
  addTriggerGuard(shotgun, [0, -0.13, 0.17], 0.072, MATERIALS.darkMetal);
  const trigger = addBox(shotgun, [0.018, 0.085, 0.018], [0, -0.13, 0.18], MATERIALS.gunmetal);
  trigger.rotation.x = -0.28;
  addBox(shotgun, [0.014, 0.025, 0.014], [0, 0.157, -1.08], MATERIALS.brass);
  addBox(shotgun, [0.055, 0.03, 0.07], [0, 0.15, 0.07], MATERIALS.inset);

  shotgun.rotation.y = -0.025;
  return shotgun;
}

function createMachineGun(): THREE.Group {
  const weapon = new THREE.Group();

  // Receiver, barrel, ventilated handguard, and compact muzzle brake.
  addRoundedBox(weapon, [0.21, 0.205, 0.5], [0, 0.015, 0.08], MATERIALS.gunmetal, 0.024);
  addCylinder(weapon, 0.037, 0.64, [0, 0.09, -0.69], MATERIALS.darkMetal);
  addCylinder(weapon, 0.052, 0.09, [0, 0.09, -1.035], MATERIALS.gunmetal);
  addRoundedBox(weapon, [0.19, 0.18, 0.45], [0, 0.055, -0.38], MATERIALS.polymer, 0.03);
  for (let index = 0; index < 4; index++) {
    addBox(weapon, [0.2, 0.035, 0.035], [0, 0.115, -0.53 + index * 0.095], MATERIALS.inset);
  }

  // Adjustable stock and rubber shoulder pad.
  addRoundedBox(weapon, [0.165, 0.17, 0.5], [0, 0.01, 0.55], MATERIALS.polymer, 0.03);
  addBox(weapon, [0.09, 0.08, 0.22], [0, 0.115, 0.35], MATERIALS.darkMetal);
  addRoundedBox(weapon, [0.185, 0.205, 0.05], [0, 0.005, 0.825], MATERIALS.grip, 0.014);

  // Pistol grip, removable magazine, trigger group, selector, and charging handle.
  const grip = addRoundedBox(weapon, [0.145, 0.3, 0.17], [0, -0.19, 0.22], MATERIALS.grip, 0.025);
  grip.rotation.x = -0.22;
  const magazine = addRoundedBox(weapon, [0.14, 0.36, 0.14], [0, -0.245, -0.05], MATERIALS.darkMetal, 0.022);
  magazine.rotation.x = 0.12;
  addTriggerGuard(weapon, [0, -0.125, 0.125], 0.07, MATERIALS.darkMetal);
  const trigger = addBox(weapon, [0.018, 0.085, 0.018], [0, -0.125, 0.13], MATERIALS.gunmetal);
  trigger.rotation.x = -0.25;
  addCylinder(weapon, 0.021, 0.016, [-0.115, 0.02, 0.15], MATERIALS.brass, "x");
  addBox(weapon, [0.055, 0.025, 0.11], [-0.125, 0.1, 0.01], MATERIALS.darkMetal);

  // Front and rear aperture sights plus a top accessory rail.
  addBox(weapon, [0.08, 0.025, 0.43], [0, 0.145, 0.045], MATERIALS.inset);
  for (let index = 0; index < 7; index++) {
    addBox(weapon, [0.09, 0.018, 0.018], [0, 0.165, -0.12 + index * 0.06], MATERIALS.gunmetal);
  }
  addBox(weapon, [0.07, 0.07, 0.045], [0, 0.19, 0.2], MATERIALS.inset);
  addBox(weapon, [0.045, 0.075, 0.04], [0, 0.19, -0.83], MATERIALS.inset);
  addBox(weapon, [0.012, 0.018, 0.012], [0, 0.235, -0.835], MATERIALS.brass);

  weapon.rotation.y = -0.02;
  return weapon;
}

function createMuzzleFlash(): THREE.Group {
  const flash = new THREE.Group();
  const material = new THREE.MeshBasicMaterial({ color: 0xffc55d, transparent: true, opacity: 0.9, depthWrite: false });
  const outer = new THREE.Mesh(new THREE.ConeGeometry(0.075, 0.28, 7), material);
  outer.rotation.x = -Math.PI / 2;
  outer.position.z = -0.13;
  const cross = new THREE.Mesh(new THREE.ConeGeometry(0.045, 0.18, 5), material);
  cross.rotation.set(-Math.PI / 2, 0, Math.PI / 2);
  cross.position.z = -0.07;
  flash.add(outer, cross);
  return flash;
}

function addRoundedBox(
  parent: THREE.Group,
  size: [number, number, number],
  position: [number, number, number],
  material: THREE.Material,
  radius: number,
): THREE.Mesh {
  const mesh = new THREE.Mesh(new RoundedBoxGeometry(size[0], size[1], size[2], 3, radius), material);
  mesh.position.set(...position);
  parent.add(mesh);
  return mesh;
}

function addBox(
  parent: THREE.Group,
  size: [number, number, number],
  position: [number, number, number],
  material: THREE.Material,
): THREE.Mesh {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), material);
  mesh.position.set(...position);
  parent.add(mesh);
  return mesh;
}

function addCylinder(
  parent: THREE.Group,
  radius: number,
  length: number,
  position: [number, number, number],
  material: THREE.Material,
  axis: "x" | "z" = "z",
): THREE.Mesh {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, length, 16), material);
  mesh.position.set(...position);
  if (axis === "z") mesh.rotation.x = -Math.PI / 2;
  else mesh.rotation.z = Math.PI / 2;
  parent.add(mesh);
  return mesh;
}

function addTriggerGuard(
  parent: THREE.Group,
  position: [number, number, number],
  radius: number,
  material: THREE.Material,
): THREE.Mesh {
  const guard = new THREE.Mesh(new THREE.TorusGeometry(radius, 0.011, 7, 20), material);
  guard.position.set(...position);
  guard.rotation.y = Math.PI / 2;
  guard.scale.y = 0.72;
  parent.add(guard);
  return guard;
}
