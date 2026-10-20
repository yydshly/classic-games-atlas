// Offline inspection of checkpoints produced by ordinary UI; never attached to a live game.
import {createInterface} from 'node:readline';
import {isDeepStrictEqual} from 'node:util';
import {restore,snapshot,conservation,step} from '../../versions/v2/games/orchard/engine.mjs';
function inspect(raw){const p=JSON.parse(raw),g=restore(p.resume);if(!g)throw Error('Invalid UI checkpoint');return {progress:p,snapshot:snapshot(g),conservation:conservation(g),frostSeconds:Math.max(0,(g.frostUntil-g.ticks)/120),flying:g.targets.filter(t=>t.state==='flying').length};}
for await(const line of createInterface({input:process.stdin})){try{const x=JSON.parse(line);if(x.kind==='advance'){const a=inspect(x.before),b=inspect(x.after),g=a.snapshot,from=g.ticks;g.state='playing';while(g.ticks<b.snapshot.ticks)step(g);g.state='paused';if(!isDeepStrictEqual(g,b.snapshot))throw Error('Normal no-input progression differs');console.log(JSON.stringify({kind:'offline audit of real UI checkpoints, not UI play',from,to:b.snapshot.ticks,allSnapshotFieldsEqual:true,conservation:conservation(g)}));}else console.log(JSON.stringify(inspect(x.raw)));}catch(e){console.log(JSON.stringify({error:String(e)}));}}
