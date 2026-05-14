/**
 * Pure movement math — kept framework-agnostic so it can be exercised under
 * Vitest with deterministic inputs.
 */

export type MovementInput = {
  forward: number; // -1 .. 1
  strafe: number; // -1 .. 1
  vertical: number; // -1 .. 1 (only used in free-fly)
};

export type MovementConfig = {
  walkingSpeed: number;
  sprintMultiplier: number;
  flightSpeed: number;
  maxSpeed: number;
  /** Time constant for exponential decay when input is released. */
  friction: number;
};

export const DEFAULT_MOTION_CONFIG: MovementConfig = {
  walkingSpeed: 1.8,
  sprintMultiplier: 2.2,
  flightSpeed: 12,
  maxSpeed: 30,
  friction: 6,
};

/**
 * Integrate a 1-D velocity component under a target acceleration plus an
 * exponential friction decay. Returns the new velocity.
 *
 * Pure: no globals, no time-of-day.
 */
export function integrateVelocity(
  current: number,
  target: number,
  deltaSeconds: number,
  friction: number,
): number {
  const damping = Math.exp(-friction * deltaSeconds);
  // exponential approach: v(t) = v0 * damping + target * (1 - damping)
  return current * damping + target * (1 - damping);
}

/**
 * Compute the desired horizontal velocity vector for a frame in
 * walker-local space (forward / right basis). Caller is responsible for
 * rotating this into world space.
 */
export function computeDesiredVelocity(
  input: MovementInput,
  config: MovementConfig,
  options: { sprint: boolean; fly: boolean },
): { forward: number; right: number; up: number } {
  const baseSpeed = options.fly
    ? config.flightSpeed
    : options.sprint
      ? config.walkingSpeed * config.sprintMultiplier
      : config.walkingSpeed;
  // Clamp inputs into the unit disk so diagonal motion isn't faster than axis-aligned.
  const magnitude = Math.hypot(input.forward, input.strafe);
  const normalisedForward = magnitude > 1 ? input.forward / magnitude : input.forward;
  const normalisedStrafe = magnitude > 1 ? input.strafe / magnitude : input.strafe;
  const speed = Math.min(baseSpeed, config.maxSpeed);
  return {
    forward: normalisedForward * speed,
    right: normalisedStrafe * speed,
    up: options.fly ? Math.max(-1, Math.min(1, input.vertical)) * speed : 0,
  };
}

/** Clamp a value to the closed interval [min, max]. */
export function clamp(value: number, min: number, max: number): number {
  if (value < min) return min;
  if (value > max) return max;
  return value;
}
