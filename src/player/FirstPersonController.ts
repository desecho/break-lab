import * as THREE from "three";
import { PLAYER } from "../app/config";

export class FirstPersonController {
  private yaw = 0;
  private pitch = -0.08;
  private readonly keys = new Set<string>();
  private enabled = false;
  private aiming = false;
  private readonly direction = new THREE.Vector3();
  private readonly right = new THREE.Vector3();

  constructor(
    private readonly camera: THREE.PerspectiveCamera,
    private readonly canvas: HTMLCanvasElement,
    private readonly sensitivity: () => number,
    private readonly onLockChange: (locked: boolean) => void,
  ) {
    camera.position.set(0, PLAYER.height, 5.4);
    this.applyRotation();
    document.addEventListener("pointerlockchange", this.handleLock);
    document.addEventListener("mousemove", this.handleMouseMove);
    window.addEventListener("keydown", this.handleKeyDown);
    window.addEventListener("keyup", this.handleKeyUp);
    canvas.addEventListener("contextmenu", this.handleContextMenu);
    canvas.addEventListener("mousedown", this.handleMouseDown);
    canvas.addEventListener("mouseup", this.handleMouseUp);
  }

  requestLock(): void {
    void this.canvas.requestPointerLock();
  }

  update(delta: number): void {
    const targetFov = this.aiming ? 47 : 58;
    this.camera.fov = THREE.MathUtils.damp(this.camera.fov, targetFov, 12, delta);
    this.camera.updateProjectionMatrix();
    if (!this.enabled) return;
    this.direction.set(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
    this.right.set(Math.cos(this.yaw), 0, -Math.sin(this.yaw));
    const movement = new THREE.Vector3();
    if (this.keys.has("KeyW")) movement.add(this.direction);
    if (this.keys.has("KeyS")) movement.sub(this.direction);
    if (this.keys.has("KeyD")) movement.add(this.right);
    if (this.keys.has("KeyA")) movement.sub(this.right);
    if (movement.lengthSq() > 0) movement.normalize().multiplyScalar(PLAYER.speed * delta);
    const [nextX, nextZ] = constrainPlayerPosition(
      this.camera.position.x + movement.x,
      this.camera.position.z + movement.z,
    );
    this.camera.position.set(nextX, PLAYER.height, nextZ);
  }

  dispose(): void {
    document.removeEventListener("pointerlockchange", this.handleLock);
    document.removeEventListener("mousemove", this.handleMouseMove);
    window.removeEventListener("keydown", this.handleKeyDown);
    window.removeEventListener("keyup", this.handleKeyUp);
    this.canvas.removeEventListener("contextmenu", this.handleContextMenu);
    this.canvas.removeEventListener("mousedown", this.handleMouseDown);
    this.canvas.removeEventListener("mouseup", this.handleMouseUp);
  }

  private readonly handleLock = (): void => {
    this.enabled = document.pointerLockElement === this.canvas;
    this.onLockChange(this.enabled);
  };

  private readonly handleMouseMove = (event: MouseEvent): void => {
    if (!this.enabled) return;
    const scale = PLAYER.sensitivity * this.sensitivity();
    this.yaw -= event.movementX * scale;
    this.pitch = THREE.MathUtils.clamp(this.pitch - event.movementY * scale, -1.25, 1.15);
    this.applyRotation();
  };

  private readonly handleKeyDown = (event: KeyboardEvent): void => { this.keys.add(event.code); };
  private readonly handleKeyUp = (event: KeyboardEvent): void => { this.keys.delete(event.code); };
  private readonly handleContextMenu = (event: MouseEvent): void => event.preventDefault();
  private readonly handleMouseDown = (event: MouseEvent): void => { if (event.button === 2) this.aiming = true; };
  private readonly handleMouseUp = (event: MouseEvent): void => { if (event.button === 2) this.aiming = false; };

  private applyRotation(): void {
    this.camera.rotation.order = "YXZ";
    this.camera.rotation.set(this.pitch, this.yaw, 0);
  }
}

export function constrainPlayerPosition(x: number, z: number): [number, number] {
  let nextX = THREE.MathUtils.clamp(x, -PLAYER.boundsX, PLAYER.boundsX);
  let nextZ = THREE.MathUtils.clamp(z, PLAYER.minZ, PLAYER.maxZ);
  const distance = Math.hypot(nextX, nextZ);
  if (distance < PLAYER.pedestalRadius) {
    if (distance < 0.0001) return [0, PLAYER.pedestalRadius];
    const correction = PLAYER.pedestalRadius / distance;
    nextX *= correction;
    nextZ *= correction;
  }
  return [nextX, nextZ];
}
