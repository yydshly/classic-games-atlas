// First-court model feasibility only. Not browser play.
import fs from 'node:fs';import {play} from '../../scripts/duel_v2_pilot.mjs';import {snapshot} from '../../versions/v2/games/duel/engine.mjs';
const s=snapshot(play(0));const r={kind:'single first-court production-model feasibility; not browser play',level:s.level,state:s.state,hp:s.player.hp,enemyHP:s.enemy.hp,seconds:s.time,stats:s.stats,commands:s.log.length,events:s.events,invariants:s.invariants};fs.writeFileSync(new URL('model-feasibility.json',import.meta.url),JSON.stringify(r,null,2)+'\n');console.log(JSON.stringify(r));
