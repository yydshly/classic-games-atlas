import {LEVELS} from './levels.mjs';
export const DIRS=[{key:'U',dx:0,dy:-1},{key:'R',dx:1,dy:0},{key:'D',dx:0,dy:1},{key:'L',dx:-1,dy:0}],TYPES={tracker:{name:'循迹灯',role:'沿最短路跟随行进格',color:'#cf9c86'},cutter:{name:'截路灯',role:'瞄准前方三格交汇处',color:'#baa7d8'},roamer:{name:'巡航灯',role:'往返四处巡航航标',color:'#86bbc2'}};
export const tileKey=(x,y)=>`${x},${y}`;
export const floor=(g,x,y)=>g.grid[y]?.[x]==='.';
export const safe=(g,x,y)=>g.safe.some(p=>p.x===x&&p.y===y);
export function stepTo(g,p,dir){const d=DIRS[dir];if(!d)return null;let x=p.x+d.dx,y=p.y+d.dy;if(g.tunnelRows.includes(y)&&p.y===y){if(x<0)x=g.cols-1;else if(x>=g.cols)x=0;}return floor(g,x,y)?{x,y,dir}:null;}
export function neighbours(g,p,enemy=false){return DIRS.map((d,dir)=>stepTo(g,p,dir)).filter(n=>n&&(!enemy||!safe(g,n.x,n.y)));}
export function actorDistance(g,a,b){let dx=Math.abs(a.x-b.x);if(g.tunnelRows.some(y=>Math.abs(a.y-y)<.01&&Math.abs(b.y-y)<.01))dx=Math.min(dx,g.cols-dx);return Math.hypot(dx,a.y-b.y);}
export function distances(g,target,enemy=false){const q=[target],d=new Map([[tileKey(target.x,target.y),0]]);for(let i=0;i<q.length;i++)for(const n of neighbours(g,q[i],enemy)){const k=tileKey(n.x,n.y);if(d.has(k))continue;d.set(k,d.get(tileKey(q[i].x,q[i].y))+1);q.push(n);}return d;}
function actor(x,y){return {x,y,fromX:x,fromY:y,toX:x,toY:y,progress:1,moving:false,dir:null,queued:null,segment:0};}
export function createGame(index=0){const l=LEVELS[Math.max(0,Math.min(LEVELS.length-1,Number.isInteger(index)?index:0))],dots=[];for(let y=0;y<l.grid.length;y++)for(let x=0;x<l.grid[0].length;x++)if(l.grid[y][x]==='.'&&!(x===l.home.x&&y===l.home.y))dots.push({x,y,power:l.powers.some(p=>p.x===x&&p.y===y),taken:false});return {tunnelRows:[...l.tunnelRows],phase:'patrol',phaseLeft:l.patrolDuration,state:'ready',level:l.id,grid:[...l.grid],cols:l.grid[0].length,rows:l.grid.length,safe:l.safe.map(p=>({...p})),home:{...l.home},waypoints:l.waypoints.map(p=>({...p})),player:{...actor(l.start.x,l.start.y),invulnerable:1.5},enemies:l.enemyTypes.map((type,i)=>({...actor(l.home.x,l.home.y),id:i+1,type,mode:'waiting',timer:2.2+i*.7,harmless:0,waypoint:i%4})),dots,power:0,powerDuration:l.powerDuration,lives:3,time:0,stats:{collected:0,captures:0,deaths:0,turns:0},events:[],reason:''};}
export const remaining=g=>g.dots.filter(d=>!d.taken).length;
export function start(g){if(g.state==='ready')g.state='playing';}
export function pause(g){if(g.state==='playing')g.state='paused';else if(g.state==='paused')g.state='playing';}
export function requestTurn(g,dir){if(g.state!=='playing')return false;const d=typeof dir==='number'?dir:DIRS.findIndex(d=>d.key===dir);if(d<0||d>3)return false;g.player.queued=d;return true;}
export function clearTurn(g){g.player.queued=null;}
function resetActor(a,p){const serial=a.segment+1;Object.assign(a,actor(p.x,p.y));a.segment=serial;}
export function loseLife(g){if(g.state!=='playing'||g.player.invulnerable>0||safe(g,Math.round(g.player.x),Math.round(g.player.y)))return false;g.lives--;g.stats.deaths++;g.power=0;g.events.push({type:'hurt'});if(g.lives===0){g.state='lost';g.reason='风帆的三盏航灯已经熄灭';g.events.push({type:'lost'});return true;}resetActor(g.player,LEVELS[g.level-1].start);g.player.invulnerable=1.7;for(const e of g.enemies){resetActor(e,g.home);e.mode='waiting';e.timer=1.7+e.id*.3;e.harmless=0;}return true;}
export function targetFor(g,e){if(g.phase==='patrol')return g.waypoints[(e.id-1)%g.waypoints.length];const p=g.player,here={x:p.moving?p.toX:Math.round(p.x),y:p.moving?p.toY:Math.round(p.y)};if(e.type==='tracker')return here;if(e.type==='cutter'){const d=DIRS[p.dir];if(d)for(let i=0;i<3;i++){const n=stepTo(g,here,p.dir);if(!n||safe(g,n.x,n.y))break;here.x=n.x;here.y=n.y;}return here;}const target=g.waypoints[e.waypoint%g.waypoints.length];if(Math.abs(e.x-target.x)+Math.abs(e.y-target.y)<.1)e.waypoint=(e.waypoint+1)%g.waypoints.length;return g.waypoints[e.waypoint%g.waypoints.length];}
export function enemyDirection(g,e){const cell={x:Math.round(e.x),y:Math.round(e.y)},next=neighbours(g,cell,true);if(!next.length)return null;if(e.mode==='returning'){if(cell.x===g.home.x&&cell.y===g.home.y)return null;const d=distances(g,g.home,true);return next.sort((a,b)=>(d.get(tileKey(a.x,a.y))??999)-(d.get(tileKey(b.x,b.y))??999)||a.dir-b.dir)[0].dir;}
 if(g.power>0){const d=distances(g,{x:(Math.round(g.player.x)+g.cols)%g.cols,y:Math.round(g.player.y)});return next.sort((a,b)=>(d.get(tileKey(b.x,b.y))??999)-(d.get(tileKey(a.x,a.y))??999)||((a.dir+e.id)%4)-((b.dir+e.id)%4))[0].dir;}
 let target=targetFor(g,e);if(safe(g,target.x,target.y)){const candidates=[];for(let y=0;y<g.rows;y++)for(let x=0;x<g.cols;x++)if(floor(g,x,y)&&!safe(g,x,y))candidates.push({x,y});target=candidates.sort((a,b)=>Math.abs(a.x-target.x)+Math.abs(a.y-target.y)-Math.abs(b.x-target.x)-Math.abs(b.y-target.y)||a.y-b.y||a.x-b.x)[0];}const d=distances(g,target,true);return next.sort((a,b)=>(d.get(tileKey(a.x,a.y))??999)-(d.get(tileKey(b.x,b.y))??999)||((a.dir+e.id)%4)-((b.dir+e.id)%4))[0].dir;
}
function advance(g,a,distance,choose,enemy=false){let left=distance;for(let guard=0;guard<5&&left>1e-8;guard++){
 if(!a.moving){const dir=choose();if(dir===null||dir===undefined)return;const n=stepTo(g,{x:Math.round(a.x),y:Math.round(a.y)},dir);if(!n||(enemy&&safe(g,n.x,n.y)))return;const {x,y}=n;a.fromX=Math.round(a.x);a.fromY=Math.round(a.y);a.toX=x;a.toY=y;a.progress=0;a.moving=true;a.dir=dir;a.segment++;}
 const step=Math.min(left,1-a.progress);a.progress+=step;left-=step;a.x=a.fromX+(Math.abs(a.toX-a.fromX)>1?DIRS[a.dir].dx:a.toX-a.fromX)*a.progress;if(a.x<-.5)a.x+=g.cols;else if(a.x>g.cols-.5)a.x-=g.cols;a.y=a.fromY+(a.toY-a.fromY)*a.progress;if(a.progress>=1-1e-8){a.x=a.toX;a.y=a.toY;a.progress=1;a.moving=false;}
 }}
function playerDirection(g){const p=g.player;for(const dir of [p.queued,p.dir]){if(dir===null)continue;const d=DIRS[dir];if(stepTo(g,{x:Math.round(p.x),y:Math.round(p.y)},dir)){if(p.dir!==dir)g.stats.turns++;p.dir=dir;if(p.queued===dir)p.queued=null;return dir;}}return null;}
export function contacts(g){for(const e of g.enemies){if(e.mode!=='active'||e.harmless>0||actorDistance(g,e,g.player)>.54)continue;if(g.power>0){e.mode='returning';e.queued=null;g.stats.captures++;g.events.push({type:'capture',enemy:e.id});}else if(loseLife(g))return true;}return false;}
function tick(g,dt){g.time+=dt;g.phaseLeft-=dt;if(g.phaseLeft<=0){g.phase=g.phase==='patrol'?'chase':'patrol';g.phaseLeft+=LEVELS[g.level-1][g.phase==='patrol'?'patrolDuration':'chaseDuration'];g.events.push({type:'phase',phase:g.phase});}g.power=Math.max(0,g.power-dt);g.player.invulnerable=Math.max(0,g.player.invulnerable-dt);const l=LEVELS[g.level-1];advance(g,g.player,l.playerSpeed*dt,()=>playerDirection(g));
 for(const e of g.enemies){e.harmless=Math.max(0,e.harmless-dt);if(e.mode==='waiting'){e.timer=Math.max(0,e.timer-dt);if(e.timer===0){e.mode='active';e.harmless=1.1;}continue;}advance(g,e,(e.mode==='returning'?6:l.enemySpeed*(e.type==='roamer'?.9:e.type==='cutter'?.96:1)*(g.power>0?.68:1))*dt,()=>enemyDirection(g,e),true);if(e.mode==='returning'&&Math.hypot(e.x-g.home.x,e.y-g.home.y)<.001){resetActor(e,g.home);e.mode='waiting';e.timer=2;e.harmless=0;}}
 const candidate=g.dots.find(d=>!d.taken&&Math.hypot(d.x-g.player.x,d.y-g.player.y)<.12);
 // A newly picked power protects this same tick; an expired power does not.
 if(candidate?.power){candidate.taken=true;g.stats.collected++;g.power=g.powerDuration;g.events.push({type:'power'});}
 // A lethal contact cancels the ordinary last dot in this tick, so death cannot auto-win.
 if(contacts(g))return;
 if(candidate&&!candidate.taken){candidate.taken=true;g.stats.collected++;g.events.push({type:'dot'});}
 if(remaining(g)===0){g.state='won';g.events.push({type:'won'});}
}
export function update(g,realDt){if(g.state!=='playing'||!Number.isFinite(realDt)||realDt<=0)return;let left=Math.min(.1,realDt);while(left>1e-8&&g.state==='playing'){const dt=Math.min(1/120,left);tick(g,dt);left-=dt;}}
export const snapshot=g=>JSON.parse(JSON.stringify(g,(key,value)=>key==='events'?undefined:value));


export const checkpoint=g=>['ready','playing','paused','won','lost'].includes(g.state)?snapshot(g):null;
export function restore(value){
 try{
  const l=LEVELS[value?.level-1];if(!l||!Number.isSafeInteger(value.level))return null;const g=JSON.parse(JSON.stringify(value)),base=createGame(g.level-1),finite=Number.isFinite,nonnegative=n=>finite(n)&&n>=0,int=n=>Number.isSafeInteger(n)&&n>=0,eq=(a,b)=>JSON.stringify(a)===JSON.stringify(b),near=(a,b)=>Math.abs(a-b)<1e-6;
  if(!['ready','playing','paused','won','lost'].includes(g.state)||!['patrol','chase'].includes(g.phase)||!finite(g.phaseLeft)||g.phaseLeft<=0||g.phaseLeft>l[g.phase==='patrol'?'patrolDuration':'chaseDuration']+1e-6||!nonnegative(g.time)||!nonnegative(g.power)||g.power>l.powerDuration+1e-6||g.powerDuration!==l.powerDuration||!Number.isSafeInteger(g.lives)||g.lives<0||g.lives>3||typeof g.reason!=='string')return null;
  if(g.cols!==base.cols||g.rows!==base.rows||!eq(g.grid,base.grid)||!eq(g.tunnelRows,base.tunnelRows)||!eq(g.safe,base.safe)||!eq(g.home,base.home)||!eq(g.waypoints,base.waypoints))return null;
  function validActor(a,enemy=false){
   if(!a||!['x','y','fromX','fromY','toX','toY','progress'].every(k=>finite(a[k]))||!['fromX','fromY','toX','toY'].every(k=>Number.isSafeInteger(a[k]))||!floor(g,a.fromX,a.fromY)||!floor(g,a.toX,a.toY)||typeof a.moving!=='boolean'||a.progress<0||a.progress>1||!int(a.segment)||a.dir!==null&&(!Number.isSafeInteger(a.dir)||a.dir<0||a.dir>3)||a.queued!==null&&(!Number.isSafeInteger(a.queued)||a.queued<0||a.queued>3))return false;
   if(enemy&&(safe(g,a.fromX,a.fromY)||safe(g,a.toX,a.toY)||a.queued!==null))return false;
   const changing=a.fromX!==a.toX||a.fromY!==a.toY;
   if(changing){const next=stepTo(g,{x:a.fromX,y:a.fromY},a.dir);if(!next||next.x!==a.toX||next.y!==a.toY)return false;}
   if(a.moving){if(!changing||a.progress>=1)return false;let x=a.fromX+(Math.abs(a.toX-a.fromX)>1?DIRS[a.dir].dx:a.toX-a.fromX)*a.progress;if(x<-.5)x+=g.cols;else if(x>g.cols-.5)x-=g.cols;const y=a.fromY+(a.toY-a.fromY)*a.progress;if(!near(a.x,x)||!near(a.y,y))return false;}
   else if(a.progress!==1||a.x!==a.toX||a.y!==a.toY)return false;
   return true;
  }
  if(!validActor(g.player)||!nonnegative(g.player.invulnerable)||g.player.invulnerable>1.700001||!Array.isArray(g.enemies)||g.enemies.length!==base.enemies.length||new Set(g.enemies.map(e=>e.id)).size!==base.enemies.length)return null;
  for(const e of g.enemies){const b=base.enemies.find(b=>b.id===e.id);if(!b||e.type!==b.type||!validActor(e,true)||!['waiting','active','returning'].includes(e.mode)||!nonnegative(e.timer)||e.timer>3.600001||!nonnegative(e.harmless)||e.harmless>1.100001||!int(e.waypoint))return null;if(e.mode==='waiting'&&(e.moving||e.x!==g.home.x||e.y!==g.home.y))return null;}
  if(!Array.isArray(g.dots)||g.dots.length!==base.dots.length||!g.dots.every((d,i)=>d&&d.x===base.dots[i].x&&d.y===base.dots[i].y&&d.power===base.dots[i].power&&typeof d.taken==='boolean')||!g.stats||!['collected','captures','deaths','turns'].every(k=>int(g.stats[k]))||g.stats.collected!==g.dots.filter(d=>d.taken).length||g.stats.deaths!==3-g.lives)return null;
  const left=remaining(g);if(g.state==='won'&&(left!==0||g.lives<1)||g.state==='lost'&&(g.lives!==0||left===0)||!['won','lost'].includes(g.state)&&(g.lives<1||left===0)||g.state==='ready'&&(g.time!==0||g.stats.collected!==0||g.stats.deaths!==0))return null;
  if(g.state==='playing')g.state='paused';g.player.queued=null;for(const e of g.enemies)e.queued=null;g.events=[];return g;
 }catch{return null;}
}
