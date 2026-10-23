import * as CANNON from './vendor/cannon-es.mjs';
const STEP=1/120,RADIUS=.45;
export const COURSE={
 units:'metres',player:{radius:RADIUS,mass:2},
 surfaces:[
  {id:'near-dock',kind:'dock',position:[0,-.5,0],size:[12,1,12]},
  {id:'arrival-dock',kind:'dock',position:[0,-.5,-24],size:[12,1,8]},
  {id:'left-fence',kind:'barrier',position:[-5,1.3,-5.5],size:[6,2.6,.5]},
  {id:'right-fence',kind:'barrier',position:[5,1.3,-5.5],size:[6,2.6,.5]},
 ],
 spawn:[0,.55,3.5],arrivalSpawn:[0,.55,-22],
 gate:{position:[0,1.3,-5.5],size:[4,2.6,.5],lift:2.8},
 plate:{position:[-3,.035,-1],size:[2.2,.07,2.2]},
 crate:{position:[-3,.65,2],platePosition:[-3,.65,-1],size:[1.2,1.2,1.2],mass:5},
 ferry:{position:[0,-.25,-8],size:[4,.5,4],near:[0,-.25,-8],far:[0,-.25,-18],dwell:6,travel:6,period:24},
 goal:{position:[0,.45,-23.5],radius:1.25},fallY:-7,
};
const v=a=>new CANNON.Vec3(...a),arr=a=>[a.x,a.y,a.z],clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const pose=b=>({position:arr(b.position),quaternion:[b.quaternion.x,b.quaternion.y,b.quaternion.z,b.quaternion.w],velocity:arr(b.velocity)});
const count=n=>Number.isSafeInteger(n)&&n>=0?n:0;
function box(data,options={}){return new CANNON.Body({...options,position:v(data.position),shape:new CANNON.Box(v(data.size.map(n=>n/2)))});}
export class FerryWorld{
 constructor(saved=null){
  this.world=new CANNON.World({gravity:new CANNON.Vec3(0,-9.82,0)});this.world.solver.iterations=14;this.world.solver.tolerance=1e-7;
  const floor=new CANNON.Material('dock'),orb=new CANNON.Material('robot'),cargo=new CANNON.Material('cargo'),deck=new CANNON.Material('ferry');
  for(const[a,b,friction]of[[floor,orb,.45],[floor,cargo,.0001],[orb,cargo,.18],[deck,orb,1]])this.world.addContactMaterial(new CANNON.ContactMaterial(a,b,{friction,restitution:0,contactEquationStiffness:1e7,contactEquationRelaxation:4}));
  this.surfaces=COURSE.surfaces.map(s=>{const b=box(s,{mass:0,material:floor});b.courseId=s.id;this.world.addBody(b);return b;});
  this.gate=box(COURSE.gate,{mass:0,type:CANNON.Body.KINEMATIC,material:floor});this.world.addBody(this.gate);
  this.plate=box(COURSE.plate,{mass:0,material:floor});this.plate.collisionResponse=false;this.world.addBody(this.plate);
  this.player=new CANNON.Body({mass:2,shape:new CANNON.Sphere(RADIUS),material:orb,linearDamping:.12,angularDamping:.65,allowSleep:false});this.world.addBody(this.player);
  this.crate=box(COURSE.crate,{mass:5,material:cargo,linearDamping:.8,angularDamping:.65,allowSleep:false});this.world.addBody(this.crate);
  this.ferry=box(COURSE.ferry,{mass:0,type:CANNON.Body.KINEMATIC,material:deck});this.world.addBody(this.ferry);
  const valid=saved?.schema===2;this.dockStage=valid&&saved.dockStage==='arrival'?'arrival':'near';
  this.completed=Boolean(valid&&this.dockStage==='arrival'&&saved.completed===true);
  this.falls=valid?count(saved.falls):0;this.jumps=valid?count(saved.jumps):0;this.crateResets=0;this.crateLost=false;
  const restoredCrate=valid&&saved.crateStableOnPlate===true;
  this.crate.position.copy(v(restoredCrate?COURSE.crate.platePosition:COURSE.crate.position));
  this.player.position.copy(v(this.completed?COURSE.goal.position:this.dockStage==='arrival'?COURSE.arrivalSpawn:COURSE.spawn));
  this.gateAmount=restoredCrate?1:0;this.gate.position.y=COURSE.gate.position[1]+COURSE.gate.lift*this.gateAmount;this.gateState=restoredCrate?'open':'closed';this.heldClosing=false;
  this.time=0;this.accumulator=0;this.grounded=false;this.onBoat=false;this.plateBy=restoredCrate?'crate':null;this.stableCrateOnPlate=restoredCrate;this.events=[];
  this._coyote=0;this._jumpBuffer=0;this._jumpHeld=false;this._landLock=0;this._airTime=0;this._lastFerryPhase='dwellNear';this.lastSafeSupport=null;this._departure=null;
 }
 _emit(type,detail={}){this.events.push({type,time:this.time,...detail});if(this.events.length>64)this.events.shift();}
 _motion(t){
  const p=((t%24)+24)%24;let phase='dwellNear',u=0,dwellRemaining=0;
  if(p<6)dwellRemaining=6-p;
  else if(p<12){phase='outbound';u=(1-Math.cos((p-6)*Math.PI/6))/2;}
  else if(p<18){phase='dwellFar';u=1;dwellRemaining=18-p;}
  else{phase='inbound';u=(1+Math.cos((p-18)*Math.PI/6))/2;}
  return{position:new CANNON.Vec3(0,-.25,-8-10*u),phase,dwellRemaining,progress:u};
 }
 _pressure(){
  const p=this.player.position,c=this.crate.position;
  const player=this.grounded&&Math.abs(p.x+3)<.9&&Math.abs(p.z+1)<.9&&p.y>.25&&p.y<.85;
  const crate=!this.crateLost&&Math.abs(c.x+3)<.82&&Math.abs(c.z+1)<.82&&c.y>.4&&c.y<.9;
  return{by:player&&crate?'both':player?'player':crate?'crate':null,crate};
 }
 _occupiedGate(){
  const p=this.player.position,c=this.crate.position;
  return Math.abs(p.x)<2.5&&Math.abs(p.z+5.5)<.95&&p.y>-.6&&p.y<4.8||!this.crateLost&&Math.abs(c.x)<2.65&&Math.abs(c.z+5.5)<1.15&&c.y>-.6&&c.y<4.8;
 }
 _supportVelocity(){
  const result=new CANNON.Vec3();let best=.55;
  if(this.grounded)for(const c of this.world.contacts){
   if(!c.enabled)continue;let other=null,offset=null,normal=0;
   if(c.bi===this.player){other=c.bj;offset=c.rj;normal=-c.ni.y;}else if(c.bj===this.player){other=c.bi;offset=c.ri;normal=c.ni.y;}
   if(other&&normal>best){const point=new CANNON.Vec3();other.position.vadd(offset,point);other.getVelocityAtWorldPoint(point,result);best=normal;}
  }
  return result;
 }
 step(input={},dt=STEP){
  if(this.completed)return;
  if(input.jump&&!this._jumpHeld)this._jumpBuffer=.18;this._jumpHeld=Boolean(input.jump);
  this.accumulator+=clamp(Number.isFinite(dt)?dt:0,0,.25);
  while(this.accumulator+1e-10>=STEP&&!this.completed){this.accumulator=Math.max(0,this.accumulator-STEP);this._tick(input);}
 }
 _tick(input){
  const p=this.player;this._jumpBuffer=Math.max(0,this._jumpBuffer-STEP);this._landLock=Math.max(0,this._landLock-STEP);this._coyote=this.grounded?.12:Math.max(0,this._coyote-STEP);
  let x=clamp(Number.isFinite(input.x)?input.x:0,-1,1),z=clamp(Number.isFinite(input.z)?input.z:0,-1,1),n=Math.hypot(x,z);if(n>1){x/=n;z/=n;}
  const strength=this.grounded?22:9,speed=Math.hypot(p.velocity.x,p.velocity.z),forward=p.velocity.x*x+p.velocity.z*z;
  if(speed<6||forward<0)p.applyForce(new CANNON.Vec3(x*2*strength,0,z*2*strength));
  if(input.brake){const support=this._supportVelocity();p.applyForce(new CANNON.Vec3(-(p.velocity.x-support.x)*36,0,-(p.velocity.z-support.z)*36));}
  if(this._jumpBuffer>0&&this._coyote>0){p.applyImpulse(new CANNON.Vec3(0,12.8,0));this._jumpBuffer=0;this._coyote=0;this.grounded=false;this._landLock=.15;this.jumps++;this._emit('jump');}
  const pressure=this._pressure(),oldGateState=this.gateState;
  this.heldClosing=!pressure.by&&this.gateAmount>.03&&this._occupiedGate();
  const amount=pressure.by?Math.min(1,this.gateAmount+STEP*1.8):this.heldClosing?this.gateAmount:Math.max(0,this.gateAmount-STEP*3);
  this.gate.velocity.set(0,(COURSE.gate.position[1]+COURSE.gate.lift*amount-this.gate.position.y)/STEP,0);this.gateAmount=amount;
  this.gateState=this.heldClosing?'held':amount===1?'open':amount===0?'closed':pressure.by?'opening':'closing';
  if(this.gateState!==oldGateState)this._emit('gate',{state:this.gateState,heldClosing:this.heldClosing});
  const motion=this._motion(this.time+STEP);motion.position.vsub(this.ferry.position,this.ferry.velocity);this.ferry.velocity.scale(1/STEP,this.ferry.velocity);
  this.world.step(STEP);this.time+=STEP;
  const wasGrounded=this.grounded;this.grounded=false;this.onBoat=false;
  if(!this._landLock)for(const c of this.world.contacts){if(!c.enabled)continue;let other=null,normal=0;if(c.bi===p){other=c.bj;normal=-c.ni.y;}else if(c.bj===p){other=c.bi;normal=c.ni.y;}if(other&&normal>.55){this.grounded=true;if(other===this.ferry){this.onBoat=true;this.lastSafeSupport='ferry';}else if(other===this.surfaces[0])this.lastSafeSupport='nearDock';else if(other===this.surfaces[1])this.lastSafeSupport='arrivalDock';}}
  if(wasGrounded&&!this.grounded)this._departure={support:this.lastSafeSupport,phase:motion.phase,gap:Math.max(0,-8-this.ferry.position.z),boardingLane:Math.abs(p.position.x)<2.8&&p.position.z< -5.6};
  if(this.grounded){if(!wasGrounded&&this._airTime>.12)this._emit('land');this._airTime=0;}else this._airTime+=STEP;
  const post=this._pressure();if(post.by!==this.plateBy){this.plateBy=post.by;this._emit('plate',{by:this.plateBy});}
  this.stableCrateOnPlate=Boolean(post.crate&&this.crate.velocity.length()<.12&&this.crate.angularVelocity.length()<.2);
  if(motion.phase!==this._lastFerryPhase){this._lastFerryPhase=motion.phase;this._emit('ferry',{phase:motion.phase});}
  if(p.position.y<COURSE.fallY){
   const fellFromBoat=this.lastSafeSupport==='ferry',missed=Boolean(this._departure?.support==='nearDock'&&this._departure.boardingLane&&this._departure.gap>.8);
   this.falls++;this._emit('fall',{reason:fellFromBoat?'left-ferry-support':missed?'no-deck-at-departure':'unclassified',fellFromBoat,lastSafeSupport:this.lastSafeSupport,gapAtDeparture:this._departure?.gap??null,gapAtFall:Math.max(0,-8-this.ferry.position.z),ferryPhaseAtDeparture:this._departure?.phase??null,ferryPhaseAtFall:motion.phase});this.respawn();
  }
  if(!this.crateLost&&this.crate.position.y<COURSE.fallY){this.crateLost=true;this.stableCrateOnPlate=false;this.world.removeBody(this.crate);this._emit('crate-lost');}
  const arrivalContact=this.world.contacts.some(c=>c.enabled&&((c.bi===p&&c.bj===this.surfaces[1]&&-c.ni.y>.55)||(c.bj===p&&c.bi===this.surfaces[1]&&c.ni.y>.55)));
  if(arrivalContact&&p.position.z< -20.4&&this.dockStage!=='arrival'){this.dockStage='arrival';this._emit('arrival');}
  if(this.dockStage==='arrival'&&arrivalContact&&p.position.distanceTo(v(COURSE.goal.position))<COURSE.goal.radius){this.completed=true;this._emit('complete');}
 }
 respawn(){
  if(this.completed)return false;this.player.position.copy(v(this.dockStage==='arrival'?COURSE.arrivalSpawn:COURSE.spawn));this.player.velocity.setZero();this.player.angularVelocity.setZero();this.player.force.setZero();this.player.torque.setZero();this.player.quaternion.set(0,0,0,1);this.player.aabbNeedsUpdate=true;this.player.wakeUp();
  this.grounded=false;this.onBoat=false;this._coyote=0;this._jumpBuffer=0;this._landLock=.12;this._airTime=0;this.lastSafeSupport=null;this._departure=null;this._emit('respawn',{dockStage:this.dockStage});return true;
 }
 resetCrate(){
  if(this.completed)return{ok:false,reason:'旅程已完成，重新开始后可再调整箱子。'};
  const origin=COURSE.crate.position,half=COURSE.crate.size.map(n=>n/2),p=this.player.position;
  const distance=Math.hypot(Math.max(0,Math.abs(p.x-origin[0])-half[0]),Math.max(0,Math.abs(p.y-origin[1])-half[1]),Math.max(0,Math.abs(p.z-origin[2])-half[2]));
  if(distance<RADIUS+.08)return{ok:false,reason:'货箱原位被你占住了，请先挪开一点再归位。'};
  if(this.crateLost)this.world.addBody(this.crate);
  this.crateLost=false;this.crate.position.copy(v(COURSE.crate.position));this.crate.velocity.setZero();this.crate.angularVelocity.setZero();this.crate.force.setZero();this.crate.torque.setZero();this.crate.quaternion.set(0,0,0,1);this.crate.aabbNeedsUpdate=true;this.crate.wakeUp();this.crateResets++;this.stableCrateOnPlate=false;this._emit('crate-reset');
  return{ok:true,reason:'箱子已回到近岸原位；压板与闸门仍按当前实际压力响应。'};
 }
 snapshot(){const motion=this._motion(this.time);return{player:pose(this.player),crate:pose(this.crate),ferry:{...pose(this.ferry),phase:motion.phase,dwellRemaining:motion.dwellRemaining,progress:motion.progress},gate:{...pose(this.gate),openAmount:this.gateAmount,state:this.gateState,heldClosing:this.heldClosing},gateOpen:this.gateAmount>.95,platePressed:Boolean(this.plateBy),plateBy:this.plateBy,onBoat:this.onBoat,grounded:this.grounded,stableCrateOnPlate:this.stableCrateOnPlate,crateLost:this.crateLost,dockStage:this.dockStage,completed:this.completed,time:this.time,falls:this.falls,jumps:this.jumps,crateResets:this.crateResets};}
 drainEvents(){return this.events.splice(0);}
 checkpointRecord(){return{schema:2,dockStage:this.dockStage,crateStableOnPlate:this.stableCrateOnPlate,completed:this.completed,falls:this.falls,jumps:this.jumps};}
}
export {FerryWorld as KineticWorld};
