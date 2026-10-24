import {QuietWorld,ROOM} from '../../../experiments/quiet-workbench-preview/physics.mjs';
export const DT=1/60;
// All controls are keyboard-representable: x/z -1, 0 or 1, plus brake.
// The policy reads live state and calls step/retry, never rewrites state.
export function sequences(){
 const runs={};
 function create(name){const world=new QuietWorld(),frames=[];const add=(input={},phase='')=>{const controls=world.state==='playing'?input:{};world.step(controls,DT);frames.push({index:frames.length,phase,input:{...controls},snapshot:world.snapshot(),angularVelocity:world.player.angularVelocity.toArray()});};const hold=(count,input,phase)=>{for(let i=0;i<count;i++)add(input,phase);};const until=(condition,input,phase,max=1800)=>{for(let i=0;i<max&&!condition()&&world.state==='playing';i++)add(typeof input==='function'?input():input,phase);};const go=(x,z)=>{for(let i=0;i<2400&&world.state==='playing';i++){const p=world.player.position,v=world.player.velocity,dx=x-p.x,dz=z-p.z;if(Math.hypot(dx,dz)<.055&&Math.hypot(v.x,v.z)<.13)break;add({x:Math.abs(dx)>.025?Math.sign(dx):0,z:Math.abs(dz)>.025?Math.sign(dz):0,brake:true},'route');}};runs[name]=frames;hold(15,{},'settle');return{world,frames,add,hold,until,go};}
 {
  const r=create('rolling-brake');r.hold(24,{z:-1},'roll');r.hold(6,{brake:true},'brake-held');r.hold(12,{},'brake-released');r.hold(18,{brake:true},'brake-held');r.hold(12,{},'brake-released');r.hold(18,{x:-1,brake:true},'turn');
 }
 {
  const r=create('light-recovery');r.until(()=>!!r.world.lastImpact,()=>({z:-1,brake:r.world.player.position.z>2.10}),'gentle-approach');r.hold(270,{brake:true},'quiet-recovery');
 }
 {
  const r=create('two-tools');r.until(()=>!!r.world.lastImpact,{z:-1,brake:true},'first-tool');const first=r.world.lastImpact?.tool;
  r.until(()=>r.world.lastImpact?.tool!==first,()=>({x:1,z:r.world.player.position.z<2.85?1:0}), 'second-tool');r.hold(100,{},'settle-after-second');
 }
 {
  const r=create('dock');for(const p of [[-1.95,2.5],[-1.95,.55],[-.3,.55],[-.3,-2.55]])r.go(...p);
  r.until(()=>Math.hypot(r.world.player.position.x-ROOM.goal[0],r.world.player.position.z-ROOM.goal[2])<ROOM.goalRadius,{z:-1},'dock-fast');
  r.until(()=>r.world.state==='charged',{brake:true},'dock-brake',120);r.hold(100,{},'charged-settle');r.world.retry();r.hold(12,{},'retry');
 }
 for(const [name,input]of [['fall',{z:1}],['wake',{z:-1}]]){
  const r=create(name);r.until(()=>r.world.state!=='playing',input,'terminal-approach');r.hold(100,{},'terminal-settle');r.world.retry();r.hold(12,{},'retry');
 }
 return runs;
}
