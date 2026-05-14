import * as THREE from "three";

export type InputState = {
  forward: number;
  strafe: number;
  vertical: number;
  sprint: boolean;
};

export type FirstPersonControlsOptions = {
  domElement: HTMLElement;
  camera: THREE.PerspectiveCamera;
  /** Returns the local up-vector (typically the surface normal at the walker's position). */
  getUp: () => THREE.Vector3;
  onLockChange?: (locked: boolean) => void;
};

type ListenerCleanup = () => void;

/**
 * Custom first-person controller — three.js' built-in PointerLockControls is
 * tuned for axis-aligned Y-up scenes, which doesn't translate well to the ECEF
 * world where "up" is the surface normal of the WGS84 ellipsoid. This class
 * keeps yaw/pitch in the walker's local frame and exports a velocity vector
 * the canvas integrates into the camera pose.
 */
export class FirstPersonControls {
  readonly input: InputState = { forward: 0, strafe: 0, vertical: 0, sprint: false };
  readonly velocity = new THREE.Vector3();
  yaw = 0;
  pitch = 0;
  locked = false;
  flyMode = false;
  mouseSensitivity = 0.0022;
  private readonly cleanups: ListenerCleanup[] = [];
  private readonly options: FirstPersonControlsOptions;
  private readonly keys = new Set<string>();
  private touchYaw = 0;
  private touchPitch = 0;
  private lastTouchPoint: { x: number; y: number } | null = null;
  private joystickVector: { x: number; y: number } = { x: 0, y: 0 };

  constructor(options: FirstPersonControlsOptions) {
    this.options = options;
    this.attach();
  }

  private attach() {
    const { domElement } = this.options;
    const onPointerLockChange = () => {
      this.locked = document.pointerLockElement === domElement;
      this.options.onLockChange?.(this.locked);
    };
    document.addEventListener("pointerlockchange", onPointerLockChange);
    this.cleanups.push(() =>
      document.removeEventListener("pointerlockchange", onPointerLockChange),
    );

    const onMouseDown = () => {
      if (this.locked) return;
      domElement.requestPointerLock?.();
    };
    domElement.addEventListener("mousedown", onMouseDown);
    this.cleanups.push(() => domElement.removeEventListener("mousedown", onMouseDown));

    const onMouseMove = (event: MouseEvent) => {
      if (!this.locked) return;
      this.yaw -= event.movementX * this.mouseSensitivity;
      this.pitch -= event.movementY * this.mouseSensitivity;
      this.clampPitch();
    };
    document.addEventListener("mousemove", onMouseMove);
    this.cleanups.push(() => document.removeEventListener("mousemove", onMouseMove));

    const onKeyDown = (event: KeyboardEvent) => {
      this.keys.add(event.code);
      if (event.code === "KeyF") {
        this.flyMode = !this.flyMode;
      }
      this.refreshInputFromKeys();
    };
    const onKeyUp = (event: KeyboardEvent) => {
      this.keys.delete(event.code);
      this.refreshInputFromKeys();
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    this.cleanups.push(() => window.removeEventListener("keydown", onKeyDown));
    this.cleanups.push(() => window.removeEventListener("keyup", onKeyUp));

    // Touch support — single-finger drag rotates the camera, joystick events
    // (forward/strafe) come from the touch-joystick component via setJoystick.
    const onTouchStart = (event: TouchEvent) => {
      const touch = event.touches[event.touches.length - 1];
      if (!touch) return;
      this.lastTouchPoint = { x: touch.clientX, y: touch.clientY };
    };
    const onTouchMove = (event: TouchEvent) => {
      if (!this.lastTouchPoint) return;
      const touch = event.touches[event.touches.length - 1];
      if (!touch) return;
      const dx = touch.clientX - this.lastTouchPoint.x;
      const dy = touch.clientY - this.lastTouchPoint.y;
      this.touchYaw -= dx * 0.0042;
      this.touchPitch -= dy * 0.0042;
      this.yaw = this.touchYaw;
      this.pitch = this.touchPitch;
      this.clampPitch();
      this.lastTouchPoint = { x: touch.clientX, y: touch.clientY };
    };
    const onTouchEnd = () => {
      this.lastTouchPoint = null;
    };
    domElement.addEventListener("touchstart", onTouchStart, { passive: true });
    domElement.addEventListener("touchmove", onTouchMove, { passive: true });
    domElement.addEventListener("touchend", onTouchEnd, { passive: true });
    this.cleanups.push(() => domElement.removeEventListener("touchstart", onTouchStart));
    this.cleanups.push(() => domElement.removeEventListener("touchmove", onTouchMove));
    this.cleanups.push(() => domElement.removeEventListener("touchend", onTouchEnd));
  }

  setJoystick(vector: { x: number; y: number }) {
    this.joystickVector = vector;
    this.input.forward = -vector.y;
    this.input.strafe = vector.x;
  }

  private clampPitch() {
    const lim = Math.PI / 2 - 0.05;
    if (this.pitch > lim) this.pitch = lim;
    if (this.pitch < -lim) this.pitch = -lim;
  }

  private refreshInputFromKeys() {
    let forward = 0;
    let strafe = 0;
    let vertical = 0;
    if (this.keys.has("KeyW") || this.keys.has("ArrowUp")) forward += 1;
    if (this.keys.has("KeyS") || this.keys.has("ArrowDown")) forward -= 1;
    if (this.keys.has("KeyA") || this.keys.has("ArrowLeft")) strafe -= 1;
    if (this.keys.has("KeyD") || this.keys.has("ArrowRight")) strafe += 1;
    if (this.keys.has("Space")) vertical += 1;
    if (this.keys.has("ShiftLeft") || this.keys.has("ShiftRight"))
      this.input.sprint = true;
    else this.input.sprint = false;
    if (this.keys.has("KeyQ") || this.keys.has("PageDown")) vertical -= 1;
    if (this.keys.has("KeyE") || this.keys.has("PageUp")) vertical += 1;
    // Allow joystick to add to keyboard.
    if (forward === 0 && strafe === 0) {
      this.input.forward = -this.joystickVector.y;
      this.input.strafe = this.joystickVector.x;
    } else {
      this.input.forward = forward;
      this.input.strafe = strafe;
    }
    this.input.vertical = vertical;
  }

  releaseLock() {
    if (document.pointerLockElement === this.options.domElement) {
      document.exitPointerLock?.();
    }
  }

  dispose() {
    for (const cleanup of this.cleanups) cleanup();
    this.cleanups.length = 0;
    this.releaseLock();
  }
}
