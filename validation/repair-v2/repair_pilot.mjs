// Test-only ordinary-input strategy. Never imported by the game or its UI.
// It issues the same legal build, hire, assign, upgrade and maintenance commands
// available through buttons; it never writes simulation state or awards wins.
import { command, canCommand, COSTS } from '../../versions/v2/games/repair/engine.mjs';

export function prepareRepair(s) {
  const results = [];
  const act = cmd => results.push(command(s, cmd));
  if (s.levelIndex === 1) act({ type: 'build', slot: 'B', stationType: 'electrical' });
  if (s.levelIndex === 1 || s.levelIndex === 3) {
    act({ type: 'hire' }); act({ type: 'assign', staffId: 't3', stationId: 'station-B' });
  }
  return results;
}
export function pilotRepair(s) {
  if (s.state !== 'playing' || s.tick % 5 !== 0) return [];
  const results = [];
  for (const st of s.stations) if (st.broken && !st.maintenance && canCommand(s, { type: 'maintain', stationId: st.id }).ok) results.push(command(s, { type: 'maintain', stationId: st.id }));
  // Keep cash for the next wage and two repairs. Spending every last coin is
  // deliberately unsafe during the sixth shift.
  for (const type of ['mechanical', 'electrical', 'diagnosis']) {
    const st = s.stations.find(st => st.type === type && st.level < 3);
    if (st && s.credits >= COSTS.upgrade[st.level] + 60 && canCommand(s, { type: 'upgrade', stationId: st.id }).ok) results.push(command(s, { type: 'upgrade', stationId: st.id }));
  }
  return results;
}
export default pilotRepair;
