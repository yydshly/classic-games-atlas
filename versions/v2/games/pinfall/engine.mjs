import{LEVELS,WIDTH,HEIGHT}from'./levels.mjs';
export const STEP=1/180,RADIUS=7,GRAVITY=500,SPEED=430,LEFT=24,RIGHT=WIDTH-24,TOP=25,EXIT=724,BUCKET_WIDTH=112,PULSE_RADIUS=110,MAX_FLIGHT=12;
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
export const remaining=g=>g.pegs.filter(p=>p.kind==='target'&&!p.hit).length;
export const bucketX=g=>WIDTH/2+235*Math.sin(g.tick*STEP*.86+g.bucketPhase);
export function buildGame(l){return{state:'ready',level:l.id,phase:'aiming',aim:0,shots:l.shots,initialShots:l.shots,initialTargets:l.pegs.filter(p=>p.kind==='target').length,pegs:l.pegs.map(p=>({...p,hit:false})),stones:l.stones.map(p=>({...p})),bucketPhase:l.phase,tick:0,accumulator:0,time:0,ball:null,shot:null,angles:[],powers:[],power:'refraction',uses:2,armed:false,preShot:null,effects:[],events:[],reason:null,stats:{score:0,shots:0,targets:0,normal:0,pulses:0,hits:0,contacts:0,catches:0,maxChain:0,nudges:0,retrievals:0,collisionCaps:0,settlements:0}};}
export const createGame=(index=0)=>{if(!LEVELS[index])throw Error('Unknown pinfall stage');return buildGame(LEVELS[index]);};
export function start(g){if(g.state!=='ready')return false;g.state='playing';return true;}
export function pause(g){if(g.state==='playing')g.state='paused';else if(g.state==='paused')g.state='playing';else return false;return true;}
export function setAim(g,angle){if(g.state!=='playing'||g.ball||!Number.isFinite(angle))return false;g.aim=Math.round(clamp(angle,-68,68)*2)/2;return true;}
export function selectPower(g,power){if(g.state!=='ready'||!['refraction','echo'].includes(power))return false;g.power=power;g.armed=false;return true;}
export function armPower(g){if(g.state!=='playing'||g.ball||g.uses<=0)return false;g.armed=!g.armed;return true;}
export function launch(g){if(g.state!=='playing'||g.ball||g.shots<=0)return false;g.preShot=checkpoint(g);const powered=g.armed&&g.uses>0;if(powered)g.uses--;g.armed=false;const a=g.aim*Math.PI/180;g.shots--;g.stats.shots++;g.ball={x:WIDTH/2,y:58,vx:Math.sin(a)*SPEED,vy:Math.cos(a)*SPEED};g.shot={angle:g.aim,powered,echo:powered&&g.power==='echo',echoUsed:false,hits:0,targets:0,ticks:0,slowTicks:0,nudges:0};g.phase='flying';g.accumulator=0;g.events.push({type:'launch'});return true;}
export function sweepCircle(x,y,vx,vy,cx,cy,r,dt){const ox=x-cx,oy=y-cy,a=vx*vx+vy*vy,c=ox*ox+oy*oy-r*r;if(a<1e-12)return null;const b=2*(ox*vx+oy*vy),disc=b*b-4*a*c;if(disc<0)return null;let t=(-b-Math.sqrt(disc))/(2*a);if(c<0)t=0;if(t< -1e-8||t>dt+1e-8)return null;t=Math.max(0,t);const hx=x+vx*t-cx,hy=y+vy*t-cy,len=Math.hypot(hx,hy);const nx=len>1e-8?hx/len:-vx/Math.sqrt(a),ny=len>1e-8?hy/len:-vy/Math.sqrt(a);if(vx*nx+vy*ny>=-1e-7)return null;return{t,nx,ny};}
function mark(g,p,fromPulse=false){if(p.hit)return;p.hit=true;g.shot.hits++;g.stats.hits++;g.stats[p.kind==='target'?'targets':p.kind==='normal'?'normal':'pulses']++;if(p.kind==='target')g.shot.targets++;const base=p.kind==='target'?100:p.kind==='pulse'?60:20;g.stats.score+=base+Math.min(8,g.shot.hits-1)*5;g.stats.maxChain=Math.max(g.stats.maxChain,g.shot.hits);g.effects.push({x:p.x,y:p.y,r:p.r,kind:p.kind,ttl:.65});g.events.push({type:'hit',kind:p.kind});if(p.kind==='pulse'&&!fromPulse){g.effects.push({x:p.x,y:p.y,r:PULSE_RADIUS,kind:'wave',ttl:.65});g.events.push({type:'pulse'});for(const q of g.pegs)if(!q.hit&&Math.hypot(q.x-p.x,q.y-p.y)<=PULSE_RADIUS)mark(g,q,true);}}
function finishShot(g,caught=false,retrieved=false){if(!g.ball)return;const shot=g.shot;if(caught&&shot.hits>0){g.shots++;g.stats.catches++;g.stats.score+=100;g.events.push({type:'catch'});}if(retrieved){g.stats.retrievals++;g.events.push({type:'retrieve'});}g.pegs=g.pegs.filter(p=>!p.hit);g.angles.push(shot.angle);g.powers.push(shot.powered);g.preShot=null;g.ball=null;g.shot=null;g.phase='aiming';g.accumulator=0;g.events.push({type:'settled'});if(!remaining(g)){g.state='won';g.stats.score+=500+g.shots*150;g.stats.settlements++;g.events.push({type:'won'});}else if(g.shots===0){g.state='lost';g.reason='shots';g.stats.settlements++;g.events.push({type:'lost'});}}
function physicsStep(g){
 const b=g.ball;if(!b)return;g.tick++;g.shot.ticks++;b.vy+=GRAVITY*STEP;const speed=Math.hypot(b.vx,b.vy);if(speed>1100){b.vx*=1100/speed;b.vy*=1100/speed;}let left=STEP;
 for(let iteration=0;left>1e-9&&iteration<16;iteration++){
  let best=null;const take=h=>{if(h&&h.t>=-1e-8&&h.t<=left+1e-8&&(!best||h.t<best.t-1e-9))best=h;};
  if(b.vx< -1e-8)take({t:Math.max(0,(LEFT+RADIUS-b.x)/b.vx),nx:1,ny:0,kind:'wall'});if(b.vx>1e-8)take({t:Math.max(0,(RIGHT-RADIUS-b.x)/b.vx),nx:-1,ny:0,kind:'wall'});if(b.vy< -1e-8)take({t:Math.max(0,(TOP+RADIUS-b.y)/b.vy),nx:0,ny:1,kind:'wall'});
  if(b.vy>1e-8)take({t:(EXIT-b.y)/b.vy,nx:0,ny:-1,kind:'exit'});
  for(const p of g.pegs){const r=p.r+RADIUS;if(Math.abs(p.x-b.x)>Math.abs(b.vx*left)+r||Math.abs(p.y-b.y)>Math.abs(b.vy*left)+r)continue;const h=sweepCircle(b.x,b.y,b.vx,b.vy,p.x,p.y,r,left);if(h)take({...h,kind:'peg',p});}
  for(const p of g.stones){const r=p.r+RADIUS;if(Math.abs(p.x-b.x)>Math.abs(b.vx*left)+r||Math.abs(p.y-b.y)>Math.abs(b.vy*left)+r)continue;const h=sweepCircle(b.x,b.y,b.vx,b.vy,p.x,p.y,r,left);if(h)take({...h,kind:'stone',p});}
  if(!best){b.x+=b.vx*left;b.y+=b.vy*left;left=0;break;}
  b.x+=b.vx*best.t;b.y+=b.vy*best.t;left-=best.t;if(best.kind==='exit'){
   const caught=Math.abs(b.x-bucketX(g))<=BUCKET_WIDTH/2-RADIUS;
   if(!caught&&g.shot.echo&&!g.shot.echoUsed){g.shot.echoUsed=true;b.vy=-Math.max(650,Math.abs(b.vy)*.82);b.y=EXIT-.03;g.events.push({type:'echo',x:b.x,y:b.y});g.effects.push({x:b.x,y:EXIT,r:90,kind:'echo',ttl:.65});continue;}
   finishShot(g,caught);return;
  }
  const dot=b.vx*best.nx+b.vy*best.ny,restitution=best.kind==='wall'?.94:best.kind==='stone'?.9:.86;b.vx-=(1+restitution)*dot*best.nx;b.vy-=(1+restitution)*dot*best.ny;
  if(best.p){const min=best.p.r+RADIUS+.03;b.x=best.p.x+best.nx*min;b.y=best.p.y+best.ny*min;}else{b.x+=best.nx*.03;b.y+=best.ny*.03;}b.x=clamp(b.x,LEFT+RADIUS,RIGHT-RADIUS);b.y=Math.max(TOP+RADIUS,b.y);g.stats.contacts++;g.events.push({type:'contact',x:b.x,y:b.y,kind:best.kind});if(best.kind==='peg')mark(g,best.p);if(iteration===15&&left>1e-9)g.stats.collisionCaps++;
 }
 if(!g.ball)return;const sh=g.shot;if(Math.hypot(b.vx,b.vy)<70)sh.slowTicks++;else sh.slowTicks=0;if(sh.slowTicks>=216&&sh.nudges<2){b.vx+=sh.nudges%2?-115:115;b.vy=-160;sh.nudges++;sh.slowTicks=0;g.stats.nudges++;g.events.push({type:'nudge'});}if(sh.ticks>=MAX_FLIGHT/STEP)finishShot(g,false,true);
}
export function update(g,dt){if(g.state!=='playing'||!Number.isFinite(dt)||dt<=0)return;dt=Math.min(dt,.1);g.time+=dt;g.effects=g.effects.map(e=>({...e,ttl:e.ttl-dt})).filter(e=>e.ttl>0);if(!g.ball)return;g.accumulator+=dt;while(g.accumulator>=STEP-1e-10&&g.ball&&g.state==='playing'){g.accumulator=Math.max(0,g.accumulator-STEP);physicsStep(g);}}
export const snapshot=g=>JSON.parse(JSON.stringify(g,(k,v)=>k==='events'?undefined:v));
export function checkpoint(g){
 if(g.ball)return g.preShot?JSON.parse(JSON.stringify(g.preShot)):null;
 return ['ready','playing','paused'].includes(g.state)?{version:2,state:g.state,level:g.level,aim:g.aim,time:g.time,angles:g.angles.slice(),powers:g.powers.slice(),power:g.power,armed:g.armed}:null;
}
export function restore(v){try{
 if(!v||v.version!==2||!['ready','playing','paused'].includes(v.state)||!Number.isInteger(v.level)||v.level<1||v.level>LEVELS.length||!Number.isFinite(v.time)||v.time<0||!Number.isFinite(v.aim)||v.aim< -68||v.aim>68||Math.round(v.aim*2)!==v.aim*2||!Array.isArray(v.angles)||v.angles.length>80||!Array.isArray(v.powers)||v.powers.length!==v.angles.length||v.powers.some(x=>typeof x!=='boolean')||v.powers.filter(Boolean).length>2||!['refraction','echo'].includes(v.power)||typeof v.armed!=='boolean'||(v.state==='ready'&&v.angles.length))return null;
 const g=createGame(v.level-1);selectPower(g,v.power);g.aim=v.aim;g.time=v.time;
 if(v.state==='ready'){if(v.armed)return null;return g;}
 start(g);
 for(let i=0;i<v.angles.length;i++){const angle=v.angles[i];if(!Number.isFinite(angle)||angle< -68||angle>68||Math.round(angle*2)!==angle*2)return null;setAim(g,angle);if(v.powers[i]&&!armPower(g))return null;if(!launch(g))return null;for(let n=0;n<2200&&g.ball;n++)update(g,STEP);if(g.state!=='playing'||g.ball)return null;}
 if(v.armed&&!armPower(g))return null;setAim(g,v.aim);g.state='paused';g.time=v.time;g.effects=[];g.events=[];return g;
 }catch{return null;}}
export function trajectory(g){
 if(g.ball||!['playing','ready'].includes(g.state))return [];
 const copy=snapshot(g);copy.state='playing';copy.events=[];launch(copy);
 const points=[{x:copy.ball.x,y:copy.ball.y,after:false}];let first=-1;
 for(let i=0;i<700&&copy.ball;i++){
  update(copy,STEP);
  const contact=copy.events.find(e=>e.type==='contact');
  if(contact&&first<0){first=i;points.push({x:contact.x,y:contact.y,after:false});if(!(g.armed&&g.power==='refraction'))break;}
  copy.events=[];
  if(copy.ball&&(i%3===0||i===first))points.push({x:copy.ball.x,y:copy.ball.y,after:first>=0});
  if(first>=0&&i-first>=76)break;
 }
 return points;
}
