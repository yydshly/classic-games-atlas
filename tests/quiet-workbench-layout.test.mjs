import assert from 'node:assert/strict';import {QuietWorld,ROOM} from '../experiments/quiet-workbench/physics.mjs';
function go(w,x,z,speed=1.6,dt=1/120){for(let i=0;i<15/dt&&w.state==='playing';i++){const p=w.player.position,v=w.player.velocity,dx=x-p.x,dz=z-p.z,n=Math.hypot(dx,dz);if(n<.08&&Math.hypot(v.x,v.z)<.2)return true;const f=Math.min(speed,n*2);w.step({x:((n?dx/n*f:0)-v.x)*1.2,z:((n?dz/n*f:0)-v.z)*1.2,brake:n<.12},dt);}return w.state==='charged';}
const evidence=[];
for(const dt of [1/120,1/30,.1])for(const side of [-1,1])for(const offset of [-.2,0,.2]){
 const w=new QuietWorld(),route=[[side*1.95+offset,2.5],[side*1.95+offset,.55],[-.3+offset,.55],[-.3+offset,-3.65],[0,-3.65]];
 for(const p of route)assert(go(w,...p,1.6,dt),JSON.stringify({side,offset,dt,state:w.snapshot()}));assert.equal(w.state,'charged');assert.equal(w.lastImpact,null);evidence.push({side,offset,dt,seconds:w.time});
}
for(const offset of [-.2,0,.2]){const w=new QuietWorld();for(const p of [[-4.9+offset,3.7],[-4.9+offset,-3.6],[0,-3.65]])assert(go(w,...p));assert.equal(w.state,'charged');if(w.lastImpact)assert.equal(w.lastImpact.material,'soft');}
// These were no-contact straight corridors in the original arrangement. Do not
// require all imaginable shortcuts to fail; skilled collision-free turns above
// are intended and must remain possible without a forced hit or waiting tax.
for(const x of [-2.2,-1.9,1.65,1.8,2]){const w=new QuietWorld();for(const p of [[0,2.5],[x,2.5],[x,-3.65],[0,-3.65]])if(!go(w,...p,2.4))break;assert.equal(w.state,'woke');assert.equal(w.lastImpact.material,'metal');assert(['socket-tray','screwdriver-tray'].includes(w.lastImpact.tool));}
assert.equal(ROOM.tools.length,6);assert.equal(ROOM.surfaces.find(s=>s.id==='soft-edge').size[0],1.3);
console.log(JSON.stringify({passed:true,kind:'legal-input geometry and tolerance, not UI/fun acceptance',metalApproaches:evidence,softOffsets:3,oldStraightRush:'hits actual tools',addedObstacles:0}));
