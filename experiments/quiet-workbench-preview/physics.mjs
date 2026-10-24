import * as C from '../kinetic/vendor/cannon-es.mjs';
const STEP=1/120,R=.34;
export const ROOM={radius:R,spawn:[0,.42,3.7],goal:[0,.35,-3.65],goalRadius:.65,
 surfaces:[
  {id:'metal-table',material:'metal',position:[.5,-.3,.1],size:[6.6,.6,9.2]},
  {id:'soft-entry',material:'soft',position:[-3.1,-.3,3.7],size:[4.8,.6,1.3]},
  {id:'soft-edge',material:'soft',position:[-4.9,-.3,.05],size:[1.3,.6,8.6]},
  {id:'soft-return',material:'soft',position:[-3.1,-.3,-3.6],size:[4.8,.6,1.3]},
 ],
 tools:[
  {id:'spanner-tray',material:'metal',position:[0,.24,1.5],size:[2.4,.48,.48]},
  {id:'socket-tray',material:'metal',position:[1.6,.24,-1.1],size:[2,.48,.48]},
  {id:'screwdriver-tray',material:'metal',position:[-2,.24,-2.8],size:[1.6,.48,.6]},
  {id:'practice-metal',material:'metal',position:[2.7,.24,3.6],size:[.35,.48,1]},
  {id:'practice-soft',material:'soft',position:[-1.65,.24,4.25],size:[.8,.48,.3]},
  {id:'foam-edge',material:'soft',position:[-5.35,.24,.3],size:[.22,.48,1.1]},
 ]};
const vector=a=>new C.Vec3(...a),pose=b=>({position:b.position.toArray(),quaternion:[b.quaternion.x,b.quaternion.y,b.quaternion.z,b.quaternion.w],velocity:b.velocity.toArray()});
export class QuietWorld{
 constructor(){
  this.world=new C.World({gravity:new C.Vec3(0,-9.82,0)});this.world.solver.iterations=14;
  const floor=new C.Material('surface'),robot=new C.Material('robot');this.world.addContactMaterial(new C.ContactMaterial(floor,robot,{friction:.35,restitution:0}));
  this.static=[];for(const def of [...ROOM.surfaces,...ROOM.tools]){const b=new C.Body({mass:0,material:floor,position:vector(def.position),shape:new C.Box(vector(def.size.map(x=>x/2)))});b.label=def.id;b.soundMaterial=def.material;this.world.addBody(b);this.static.push(b);}
  this.player=new C.Body({mass:1.5,material:robot,shape:new C.Sphere(R),position:vector(ROOM.spawn),linearDamping:.12,angularDamping:.6,allowSleep:false});this.world.addBody(this.player);
  this.contacts=[];this.player.addEventListener('collide',e=>{if(ROOM.tools.some(t=>t.id===e.body.label))this.contacts.push({body:e.body,contact:e.contact,speed:Math.abs(e.contact.getImpactVelocityAlongNormal())});});
  this.time=0;this.accumulator=0;this.noise=0;this.state='playing';this.grounded=false;this.events=[];this.lastImpact=null;this.lastSupport=null;this.fallFrom=null;this.lastSupportPoint=null;this.fallPoint=null;this.resets=0;
 }
 step(input={},dt=STEP){if(this.state!=='playing')return;this.accumulator+=Math.max(0,Math.min(.1,Number.isFinite(dt)?dt:0));while(this.accumulator>=STEP&&this.state==='playing'){this.accumulator-=STEP;this.tick(input);}}
 tick(input){
  this.time+=STEP;let x=Math.max(-1,Math.min(1,Number(input.x)||0)),z=Math.max(-1,Math.min(1,Number(input.z)||0));const n=Math.hypot(x,z);if(n>1){x/=n;z/=n;}
  const p=this.player,force=this.grounded?19:3;if(Math.hypot(p.velocity.x,p.velocity.z)<4.8||p.velocity.x*x+p.velocity.z*z<0)p.applyForce(new C.Vec3(x*force,0,z*force));
  if(input.brake)p.applyForce(new C.Vec3(-p.velocity.x*24,0,-p.velocity.z*24));
  this.contacts.length=0;this.world.step(STEP);const supports=this.world.contacts.filter(c=>c.enabled&&((c.bi===p&&-c.ni.y>.55)||(c.bj===p&&c.ni.y>.55))).map(c=>({body:c.bi===p?c.bj:c.bi,offset:c.bi===p?c.rj:c.ri}));
  this.grounded=supports.length>0;
  // Attribute a fall to the last actual supporting contact, not a guessed route.
  // At the entry/return overlap, the soft mat is the visible upper covering.
  if(supports.length){const contact=supports.find(c=>c.body.soundMaterial==='soft')||supports[0],support=contact.body;this.lastSupport={id:support.label||null,material:support.soundMaterial||null};
   // Surface-side contact, not the robot's later airborne position or a guessed edge.
   this.lastSupportPoint=support.position.vadd(contact.offset).toArray();}
  this.noise=Math.max(0,this.noise-STEP*.18);
  for(const {body,contact,speed} of this.contacts){
   // The solver's contact force times the fixed step is the actual normal
   // impulse. Only new tool contact contributes, not keys or time spent pushing.
   const impulse=Math.max(0,contact.multiplier*STEP),gain=Math.max(0,impulse-.12)*(body.soundMaterial==='soft'?.035:.24);
   if(gain<.01)continue;this.noise=Math.min(1.5,this.noise+gain);this.lastImpact={tool:body.label,material:body.soundMaterial,impulse,speed,gain,time:this.time};this.events.push({type:'impact',...this.lastImpact});
  }
  if(this.noise>=1){this.state='woke';this.events.push({type:'woke'});}
  else if(p.position.y< -3){this.state='fell';this.fallPoint=this.lastSupportPoint?[...this.lastSupportPoint]:null;this.fallFrom=this.lastSupport?{...this.lastSupport}:null;this.events.push({type:'fell',point:this.fallPoint?[...this.fallPoint]:null,from:this.fallFrom?{...this.fallFrom}:null});}
  else if(this.grounded&&Math.hypot(p.position.x-ROOM.goal[0],p.position.z-ROOM.goal[2])<ROOM.goalRadius&&Math.hypot(p.velocity.x,p.velocity.z)<.55){this.state='charged';this.events.push({type:'charged'});}
 }
 retry(){this.player.position.copy(vector(ROOM.spawn));this.player.velocity.setZero();this.player.angularVelocity.setZero();this.player.force.setZero();this.player.torque.setZero();this.player.quaternion.set(0,0,0,1);this.player.aabbNeedsUpdate=true;this.noise=0;this.state='playing';this.grounded=false;this.lastImpact=null;this.lastSupport=null;this.fallFrom=null;this.lastSupportPoint=null;this.fallPoint=null;this.accumulator=0;this.contacts=[];this.events=[];this.resets++;}
 snapshot(){return{player:pose(this.player),noise:this.noise,state:this.state,grounded:this.grounded,time:this.time,lastImpact:this.lastImpact?{...this.lastImpact}:null,lastSupport:this.lastSupport?{...this.lastSupport}:null,fallFrom:this.fallFrom?{...this.fallFrom}:null,lastSupportPoint:this.lastSupportPoint?[...this.lastSupportPoint]:null,fallPoint:this.fallPoint?[...this.fallPoint]:null,resets:this.resets};}
 drainEvents(){return this.events.splice(0);}
}
