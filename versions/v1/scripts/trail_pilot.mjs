// Read-only policy: produces ordinary direction/jump controls for production physics.
import {solids} from '../games/trail/engine.mjs';
export function createPilot(){return {held:0,release:0};}
export function controls(g,memory,dt=1/60){
 memory.held=Math.max(0,memory.held-dt);memory.release=Math.max(0,memory.release-dt);const p=g.player,foot=p.y+p.h;
 const groundAhead=g.solids.some(s=>s.kind==='ground'&&p.x+52>=s.x&&p.x+52<=s.x+s.w),nearBlock=solids(g).some(s=>!s.oneWay&&s.kind!=='ground'&&s.x>=p.x+p.w-1&&s.x-p.x-p.w<48&&s.y<foot-4&&s.y+s.h>p.y),nearEnemy=g.enemies.some(e=>e.x+e.w>p.x&&e.x-p.x<77&&e.y<foot+2);
 let jumpPressed=false;if((p.grounded||p.coyote>0)&&memory.held===0&&memory.release===0&&(!groundAhead||nearBlock||nearEnemy)){memory.held=.43;memory.release=.52;jumpPressed=true;}
 return {axis:1,jumpPressed,jumpHeld:memory.held>0};
}
