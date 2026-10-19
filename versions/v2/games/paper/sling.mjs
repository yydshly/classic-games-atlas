export const MAX_PULL = 72;
export const RELEASE_SECONDS = 0.12;
export const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));

export function poseFor(angle, power, anchor) {
  const radius = MAX_PULL * clamp(power, 15, 100) / 100;
  const radians = clamp(angle, 12, 75) * Math.PI / 180;
  return { x: anchor.x - Math.cos(radians) * radius,
    y: anchor.y + Math.sin(radians) * radius, radius };
}

export function aimFromPointer(point, anchor) {
  const dx = anchor.x - point.x, dy = point.y - anchor.y;
  const distance = Math.hypot(dx, dy);
  return { valid: dx > 0 && dy >= 0 && distance >= 8,
    angle: Math.round(clamp(Math.atan2(dy, dx) * 180 / Math.PI, 12, 75)),
    power: Math.round(clamp(distance / MAX_PULL * 100, 15, 100)) };
}

export function releasePose(start, anchor, elapsed) {
  const t = clamp(elapsed / RELEASE_SECONDS, 0, 1);
  const ease = 1 - (1 - t) ** 3;
  return { x: start.x + (anchor.x - start.x) * ease,
    y: start.y + (anchor.y - start.y) * ease, radius: start.radius * (1 - ease) };
}
