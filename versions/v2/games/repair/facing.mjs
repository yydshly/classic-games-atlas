/** Presentation-only direction: use the next nonzero actual engine waypoint, never mutate the route. */
export const WALK_FRAME_MS = 130;
export const FACING_DIRECTIONS = Object.freeze(['down', 'right', 'up', 'left']);
export function walkingPose(entity = {}, time = 0, reducedMotion = false) {
  if (!['walking', 'leaving'].includes(entity.status) || !Array.isArray(entity.path)) return { moving: false, direction: 'down', frame: 0, dx: 0, dy: 0 };
  const target = entity.path.find(point => Number.isFinite(point?.x) && Number.isFinite(point?.y) && Math.hypot(point.x - entity.x, point.y - entity.y) > .001);
  if (!target) return { moving: false, direction: 'down', frame: 0, dx: 0, dy: 0 };
  const dx = target.x - entity.x, dy = .86 * (target.y - entity.y);
  const direction = Math.abs(dx) >= Math.abs(dy) ? (dx >= 0 ? 'right' : 'left') : (dy >= 0 ? 'down' : 'up');
  const seed = [...String(entity.id || '')].reduce((sum, char) => sum + char.charCodeAt(0), 0);
  const frame = reducedMotion ? 0 : ((Math.floor(Math.max(0, Number(time) || 0) / WALK_FRAME_MS) + seed) % 4);
  return { moving: true, direction, frame, dx, dy };
}
