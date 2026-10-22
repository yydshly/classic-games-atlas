import {LEVELS,WIDTH,HEIGHT,DIRECTIONS} from './levels.mjs';
export {LEVELS,WIDTH,HEIGHT,DIRECTIONS};
export const STEP=.02,PLAYER_STEP=.12,ENEMY_STEP=.32,PATROL_STEP=.38;
export const WARNING_TIME=.5;
const clone=v=>JSON.parse(JSON.stringify(v)),key=(x,y)=>y*WIDTH+x,inside=(x,y)=>x>=0&&x<WIDTH&&y>=0&&y<HEIGHT,dirs=Object.values(DIRECTIONS),terminal=g=>g.state==='won'||g.state==='lost';
const same=(a,b)=>a.x===b.x&&a.y===b.y;
const event=(g,text)=>{g.events.push({time:g.time,text});if(g.events.length>12)g.events.shift();};
export const perimeter=()=>[...Array.from({length:WIDTH},(_,x)=>({x,y:0})),...Array.from({length:HEIGHT-1},(_,i)=>({x:WIDTH-1,y:i+1})),...Array.from({length:WIDTH-1},(_,i)=>({x:WIDTH-2-i,y:HEIGHT-1})),...Array.from({length:HEIGHT-2},(_,i)=>({x:0,y:HEIGHT-2-i}))];
export const isClaimed=(g,x,y)=>inside(x,y)&&g.grid.claimed[key(x,y)];
export function createGame(index=0){if(!Number.isInteger(index)||!LEVELS[index])throw new RangeError('不存在这一湾');const l=LEVELS[index],initialSafe=Array(WIDTH*HEIGHT).fill(false);for(let y=0;y<HEIGHT;y++)for(let x=0;x<WIDTH;x++)if(!x||!y||x===WIDTH-1||y===HEIGHT-1)initialSafe[key(x,y)]=true;for(const p of l.safe)initialSafe[key(p.x,p.y)]=true;const coast=perimeter(),g={version:3,level:l.id,title:l.name,brief:l.brief,state:'ready',time:0,ticks:0,accumulator:0,limit:l.limit,target:l.target,grid:{width:WIDTH,height:HEIGHT,claimed:[...initialSafe]},initialSafe,initialClaimable:initialSafe.map(v=>!v),totalClaimable:initialSafe.filter(v=>!v).length,claimedCount:0,percent:0,player:{...l.start,clock:0,dir:null,invulnerable:1},start:{...l.start},trail:[],trailStart:null,drawArmed:false,enemies:l.enemies.map((e,i)=>({...e,id:i+1,type:'current',clock:0,behavior:'patrol',tellTimer:0,target:null})),patroller:{...coast[l.patrollerIndex],index:l.patrollerIndex,dir:1,clock:0},lives:3,stats:{cuts:0,losses:0,filled:0,steps:0},effects:[],lastCapture:null,events:[],reason:'在安全区选择织线，再按方向进入水域。'};g.objectives=makeObjectives(g,l);return g;}
export function start(g){if(g.state==='ready'||g.state==='paused'){g.state='playing';g.reason='织线中不能撤销；连回安全区才算闭合。';return true;}return false;}
export function pause(g){if(g.state==='playing'){g.state='paused';return true;}if(g.state==='paused')return start(g);return false;}
export function inspectDraw(g){if(!['playing','paused'].includes(g.state))return {ok:false,reason:'开始或继续这一湾后才能准备织线。'};if(g.trail.length)return {ok:false,reason:'风险线尚未闭合，不能中途收线或抹去。'};return {ok:true,reason:g.drawArmed?'可取消准备，继续沿安全区移动。':'准备后可离岸；进入水域即留下风险线。'};}
export function toggleDraw(g){const r=inspectDraw(g);if(!r.ok)return r;g.drawArmed=!g.drawArmed;g.reason=g.drawArmed?'已准备织线；进入水域后须连回安全区。':'已收起织线，只能在安全区移动。';return {ok:true,reason:g.reason};}
function loseLife(g,why,force=false){if(g.state!=='playing'||!force&&g.player.invulnerable>0)return false;g.lives--;g.stats.losses++;g.trail=[];g.trailStart=null;g.drawArmed=false;Object.assign(g.player,g.start,{clock:0,dir:null,invulnerable:1});resetThreats(g);g.reason=why+'，风险线已清除，已织岸线保留。';event(g,g.reason);if(g.lives===0){g.state='lost';g.reason='三盏织灯已熄，重试这一湾可以重新规划。';event(g,g.reason);}return true;}
export function previewCapture(g,trail){const blocked=new Set(trail.map(p=>key(p.x,p.y))),reachable=new Set(),queue=[];for(const e of g.enemies){const k=key(e.x,e.y);if(!g.grid.claimed[k]&&!blocked.has(k)&&!reachable.has(k)){reachable.add(k);queue.push(e);}}
 for(let n=0;n<queue.length;n++)for(const d of dirs){const x=queue[n].x+d.x,y=queue[n].y+d.y,k=key(x,y);if(inside(x,y)&&!g.grid.claimed[k]&&!blocked.has(k)&&!reachable.has(k)){reachable.add(k);queue.push({x,y});}}
 const cells=[];for(let y=0;y<HEIGHT;y++)for(let x=0;x<WIDTH;x++){const k=key(x,y);if(!g.grid.claimed[k]&&!reachable.has(k))cells.push({x,y});}return cells;
}
function closeTrail(g){const source=clone(g.trailStart),end={x:g.player.x,y:g.player.y};const cells=previewCapture(g,g.trail);for(const p of cells)g.grid.claimed[key(p.x,p.y)]=true;g.claimedCount=g.initialClaimable.reduce((n,v,i)=>n+(v&&g.grid.claimed[i]?1:0),0);g.percent=g.claimedCount/g.totalClaimable*100;g.stats.cuts++;g.stats.filled=g.claimedCount;refreshObjectives(g);g.effects.push({kind:'capture',cells:clone(cells),ttl:.8,duration:.8});g.lastCapture={added:cells.length,percent:g.percent,time:g.time,start:source,end,steps:g.stats.steps,objectives:g.objectives.map(({id,percent,complete})=>({id,percent,complete}))};g.reason=goalReason(g);g.trail=[];g.trailStart=null;g.drawArmed=false;resetThreats(g);event(g,'闭合成功，新增'+cells.length+'格，已织'+g.percent.toFixed(1)+'%。');}
function enemyStep(g,e){
 const chase=e.behavior==='chasing'?nearestLine(g,e,g.trail):null;
 if(chase?.path.length){const next=chase.path[0];e.dir=dirs.findIndex(d=>d.x===next.x-e.x&&d.y===next.y-e.y);Object.assign(e,next);}
 else{const order=[e.dir,(e.dir+1)%4,(e.dir+3)%4,(e.dir+2)%4];for(const dir of order){const d=dirs[dir],x=e.x+d.x,y=e.y+d.y;if(inside(x,y)&&!isClaimed(g,x,y)){e.x=x;e.y=y;e.dir=dir;break;}}}
 if(g.trail.some(p=>same(p,e))||g.trail.length&&same(g.player,e))return loseLife(g,'潮影'+e.id+'碰到了风险线',true);return false;
}
function playerStep(g,dir){const d=DIRECTIONS[dir];if(!d)return;const next={x:g.player.x+d.x,y:g.player.y+d.y};if(!inside(next.x,next.y))return;
 if(same(next,g.patroller)&&g.player.invulnerable<=0){loseLife(g,'岸巡迎面碰撞');return;}
 if(g.trail.length===1&&same(next,g.trailStart)){loseLife(g,'织线回踩或交叉',true);return;}
 if(isClaimed(g,next.x,next.y)){Object.assign(g.player,next,{dir});g.stats.steps++;if(g.trail.length)closeTrail(g);return;}
 if(!g.drawArmed){g.reason='这里仍是水域，先在安全区准备织线。';return;}
 if(g.trail.some(p=>same(p,next))){loseLife(g,'织线回踩或交叉',true);return;}
 if(g.enemies.some(e=>same(e,next))){loseLife(g,'与水域游光相撞',true);return;}
 if(!g.trail.length)g.trailStart={x:g.player.x,y:g.player.y};Object.assign(g.player,next,{dir});g.trail.push(next);g.stats.steps++;syncThreats(g);
}
function tick(g,input){g.ticks++;g.time=Math.round(g.ticks*STEP*100)/100;const before=g.stats.losses;g.player.invulnerable=Math.max(0,g.player.invulnerable-STEP);for(const f of g.effects)f.ttl-=STEP;g.effects=g.effects.filter(f=>f.ttl>0);
 for(const e of g.enemies){if(e.behavior==='warning'){e.tellTimer=Math.max(0,e.tellTimer-STEP);if(e.tellTimer<=1e-8){e.tellTimer=0;e.behavior='chasing';}}if(e.behavior!=='patrol'){const target=nearestLine(g,e,g.trail);e.target=target?{...target.target}:null;}if(e.behavior!=='warning')e.clock+=STEP;if(e.clock+1e-8>=ENEMY_STEP){e.clock-=ENEMY_STEP;enemyStep(g,e);}if(g.state==='lost')return;}
 syncThreats(g);const coast=perimeter();g.patroller.clock+=STEP;if(g.patroller.clock+1e-8>=PATROL_STEP){g.patroller.clock-=PATROL_STEP;g.patroller.index=(g.patroller.index+g.patroller.dir+coast.length)%coast.length;Object.assign(g.patroller,coast[g.patroller.index]);}
 if(same(g.patroller,g.player)&&g.player.invulnerable<=0)loseLife(g,'岸巡碰到了织灯');if(g.state==='lost')return;
 if(g.stats.losses===before){g.player.clock=Math.min(PLAYER_STEP,g.player.clock+STEP);if(DIRECTIONS[input.dir]&&g.player.clock+1e-8>=PLAYER_STEP){g.player.clock-=PLAYER_STEP;playerStep(g,input.dir);}}
 if(g.state==='playing'&&g.stats.losses===before&&g.percent+1e-8>=g.target&&g.objectives.every(o=>o.complete)){g.state='won';g.reason='这一湾已织成'+g.percent.toFixed(1)+'%，可以继续归岸。';event(g,g.reason);}else if(g.state==='playing'&&g.time>=g.limit){g.state='lost';g.reason='潮时已过，还未织到目标；重试这一湾重新规划。';event(g,g.reason);}
}
export function update(g,dt,input={}){if(g.state!=='playing'||!Number.isFinite(dt)||dt<=0)return;g.accumulator+=Math.min(dt,.1);while(g.accumulator+1e-9>=STEP&&g.state==='playing'){g.accumulator-=STEP;tick(g,input);}g.accumulator=Math.max(0,g.accumulator);}
export const snapshot=g=>{const s=clone(g);refreshObjectives(s);return s;};
export const checkpoint=g=>snapshot(g);
export function restore(raw){
 try{
  const g=clone(raw),finite=v=>typeof v==='number'&&Number.isFinite(v),integer=v=>Number.isInteger(v),pos=p=>p&&integer(p.x)&&integer(p.y)&&inside(p.x,p.y),between=(v,a,b)=>finite(v)&&v>=a-1e-8&&v<=b+1e-8;
  if(!g||g.version!==3||!integer(g.level)||!LEVELS[g.level-1]||!['ready','playing','paused','won','lost'].includes(g.state))return null;
  const b=createGame(g.level-1),eq=(x,y)=>JSON.stringify(x)===JSON.stringify(y);
  if(g.title!==b.title||g.brief!==b.brief||g.limit!==b.limit||g.target!==b.target||!eq(g.start,b.start)||!eq(g.initialSafe,b.initialSafe)||!eq(g.initialClaimable,b.initialClaimable)||g.totalClaimable!==b.totalClaimable)return null;
  if(!g.grid||g.grid.width!==WIDTH||g.grid.height!==HEIGHT||!Array.isArray(g.grid.claimed)||g.grid.claimed.length!==WIDTH*HEIGHT||g.grid.claimed.some(v=>typeof v!=='boolean')||g.initialSafe.some((v,i)=>v&&!g.grid.claimed[i]))return null;
  if(!eq(g.objectives,makeObjectives(g,LEVELS[g.level-1])))return null;
  const count=g.initialClaimable.reduce((n,v,i)=>n+(v&&g.grid.claimed[i]?1:0),0);
  if(g.claimedCount!==count||!between(g.percent,0,100)||Math.abs(g.percent-count/g.totalClaimable*100)>1e-8||!integer(g.ticks)||g.ticks<0||!between(g.time,0,g.limit)||Math.abs(g.time-g.ticks*STEP)>1e-8||!between(g.accumulator,0,.1))return null;
  if(!integer(g.lives)||g.lives<0||g.lives>3||!g.stats||['cuts','losses','filled','steps'].some(k=>!integer(g.stats[k])||g.stats[k]<0)||g.stats.losses!==3-g.lives||g.stats.filled!==count||typeof g.reason!=='string'||typeof g.drawArmed!=='boolean')return null;
  if(!pos(g.player)||!between(g.player.clock,0,PLAYER_STEP)||!between(g.player.invulnerable,0,1)||!(g.player.dir===null||DIRECTIONS[g.player.dir]))return null;
  if(!Array.isArray(g.trail)||g.trail.length>g.totalClaimable||new Set(g.trail.map(p=>pos(p)?key(p.x,p.y):-1)).size!==g.trail.length||g.trail.some(p=>!pos(p)||isClaimed(g,p.x,p.y)))return null;
  if(g.trail.length){if(!pos(g.trailStart)||!isClaimed(g,g.trailStart.x,g.trailStart.y)||!g.drawArmed||!same(g.player,g.trail.at(-1)))return null;let previous=g.trailStart;for(const p of g.trail){if(Math.abs(p.x-previous.x)+Math.abs(p.y-previous.y)!==1)return null;previous=p;}}
  else if(g.trailStart!==null||!isClaimed(g,g.player.x,g.player.y))return null;
  if(!Array.isArray(g.enemies)||g.enemies.length!==b.enemies.length||g.enemies.some((e,i)=>!pos(e)||e.id!==i+1||e.type!=='current'||!integer(e.dir)||e.dir<0||e.dir>3||!between(e.clock,0,ENEMY_STEP)||isClaimed(g,e.x,e.y)||g.trail.some(p=>same(e,p))||!['patrol','warning','chasing'].includes(e.behavior)||!between(e.tellTimer,0,WARNING_TIME)||!(e.target===null||pos(e.target))))return null;
  for(const e of g.enemies){const t=nearestLine(g,e,g.trail);if(e.behavior==='patrol'){if(e.tellTimer!==0||e.target!==null||g.level>1&&t)return null;}else{if(g.level===1||!g.trail.length||!t||!e.target||!same(e.target,t.target)||e.behavior==='warning'&&e.tellTimer<=0||e.behavior==='chasing'&&e.tellTimer!==0)return null;}}
  const coast=perimeter(),p=g.patroller;if(!p||!integer(p.index)||p.index<0||p.index>=coast.length||![1,-1].includes(p.dir)||!between(p.clock,0,PATROL_STEP)||!same(p,coast[p.index]))return null;
  if(!Array.isArray(g.effects)||g.effects.length>50||g.effects.some(f=>!f||f.kind!=='capture'||f.duration!==.8||!between(f.ttl,0,.8)||f.ttl<=0||!Array.isArray(f.cells)||f.cells.some(p=>!pos(p)||!isClaimed(g,p.x,p.y))))return null;
  if(!Array.isArray(g.events)||g.events.length>12||g.events.some(e=>!e||!between(e.time,0,g.time)||typeof e.text!=='string'))return null;
  if(g.lastCapture!==null){const c=g.lastCapture;if(!c||!integer(c.added)||c.added<0||!between(c.percent,0,g.percent)||!between(c.time,0,g.time)||!pos(c.start)||!pos(c.end)||!isClaimed(g,c.start.x,c.start.y)||!isClaimed(g,c.end.x,c.end.y)||!integer(c.steps)||c.steps<0||c.steps>g.stats.steps||!Array.isArray(c.objectives)||c.objectives.length!==g.objectives.length||c.objectives.some((o,i)=>!o||o.id!==g.objectives[i].id||!between(o.percent,0,g.objectives[i].percent)||typeof o.complete!=='boolean'||o.complete!==(o.percent+1e-8>=g.objectives[i].target)))return null;}
  if(g.state==='won'&&(g.lives===0||g.percent+1e-8<g.target||!g.objectives.every(o=>o.complete)||g.trail.length))return null;
  if(g.state==='lost'&&g.lives>0&&g.time<g.limit)return null;
  if(['ready','playing','paused'].includes(g.state)&&(g.lives===0||g.time>=g.limit||g.percent+1e-8>=g.target&&g.objectives.every(o=>o.complete)))return null;
  if(g.state==='ready'&&(g.time!==0||g.stats.steps||g.stats.losses||g.claimedCount||g.trail.length))return null;
  if(g.state==='playing')g.state='paused';
  return g;
 }catch{return null;}
}

function makeObjectives(g,level){return level.objectives.map(o=>{
 const queue=[o.seed],seen=new Set([key(o.seed.x,o.seed.y)]);
 for(let i=0;i<queue.length;i++)for(const d of dirs){const x=queue[i].x+d.x,y=queue[i].y+d.y,k=key(x,y);if(inside(x,y)&&!g.initialSafe[k]&&!seen.has(k)){seen.add(k);queue.push({x,y});}}
 const cells=queue.map(p=>({...p})),claimed=cells.filter(p=>isClaimed(g,p.x,p.y)).length,total=cells.length,percent=claimed/total*100;
 return {id:o.id,label:o.label,target:o.target,cells,total,claimed,percent,complete:percent+1e-8>=o.target,labelAt:{...o.labelAt}};
 });}
function refreshObjectives(g){g.objectives=makeObjectives(g,LEVELS[g.level-1]);}
function goalReason(g){const missing=g.objectives.filter(o=>!o.complete);if(missing.length)return (g.percent+1e-8>=g.target?'总体已达标；':'')+'还需织成'+missing.map(o=>o.label+' '+o.percent.toFixed(1)+'%/'+o.target+'%').join('、')+'。';return '各湾已达标；总体'+g.percent.toFixed(1)+'%/'+g.target+'%。';}
function nearestLine(g,e,trail){
 if(!trail.length)return null;const targets=new Set(trail.map(p=>key(p.x,p.y))),q=[{x:e.x,y:e.y,path:[]}],seen=new Set([key(e.x,e.y)]);
 for(let n=0;n<q.length;n++){const p=q[n];if(targets.has(key(p.x,p.y)))return {target:{x:p.x,y:p.y},path:p.path,distance:p.path.length};for(const d of dirs){const x=p.x+d.x,y=p.y+d.y,k=key(x,y);if(inside(x,y)&&!isClaimed(g,x,y)&&!seen.has(k)){seen.add(k);q.push({x,y,path:[...p.path,{x,y}]});}}}return null;
}
function resetThreats(g){for(const e of g.enemies){e.behavior='patrol';e.tellTimer=0;e.target=null;}}
function syncThreats(g){if(g.level===1)return;for(const e of g.enemies){const target=nearestLine(g,e,g.trail);if(target){if(e.behavior==='patrol'){e.behavior='warning';e.tellTimer=WARNING_TIME;}e.target={...target.target};}else{e.behavior='patrol';e.tellTimer=0;e.target=null;}}}
export function previewThreat(g,dir){
 const d=DIRECTIONS[dir],from={x:g.player.x,y:g.player.y},base={ok:false,reason:'请选择一个通向水域的方向。',from,to:null,cells:[],closeIn:null,hitIn:null,risk:'blocked',margin:null,enemies:[]};
 if(!d||!['ready','playing','paused'].includes(g.state))return base;
 const cells=[];let to=null;for(let n=1;n<=WIDTH+HEIGHT;n++){const p={x:from.x+d.x*n,y:from.y+d.y*n};if(!inside(p.x,p.y))break;if(isClaimed(g,p.x,p.y)){if(cells.length||g.trail.length)to=p;break;}cells.push(p);}
 if(!to)return {...base,reason:'此方向没有直接可达的下一处安全落脚点；先沿岸移动。'};
 const closeIn=Math.max(0,PLAYER_STEP-g.player.clock)+(cells.length)*PLAYER_STEP;
 const full=[...g.trail,...cells],enemies=g.enemies.map(e=>{const n=nearestLine(g,e,full);return n?{id:e.id,from:{x:e.x,y:e.y},target:n.target,distance:n.distance,path:n.path,hitIn:null}:null;}).filter(Boolean);
 const sim=clone(g),losses=sim.stats.losses,cuts=sim.stats.cuts,at=sim.time;if(sim.state!=='playing')start(sim);if(!sim.trail.length&&!sim.drawArmed)toggleDraw(sim);
 let hitIn=null;for(let i=0;i<Math.ceil((closeIn+.25)/STEP)&&sim.state==='playing'&&sim.stats.cuts===cuts&&sim.stats.losses===losses;i++)update(sim,STEP,{dir});
 if(sim.stats.losses>losses)hitIn=sim.time-at;
 const risk=hitIn===null?'safe':'danger',margin=hitIn===null?null:hitIn-closeIn;
 if(hitIn!==null){const source=sim.events.slice().reverse().find(e=>e.time>at&&/潮影\d/.test(e.text))?.text||sim.reason,m=source.match(/潮影(\d+)/);if(m){const e=enemies.find(e=>e.id===Number(m[1]));if(e)e.hitIn=hitIn;}}
 return {ok:true,from,to,cells,closeIn,hitIn,margin,risk,enemies,reason:hitIn===null?'按当前可见状态持续直行，预计'+closeIn.toFixed(2)+'秒闭合；途中改变方向会改变预测。':'按当前可见状态持续直行，预计'+hitIn.toFixed(2)+'秒发生碰撞，早于'+closeIn.toFixed(2)+'秒闭合；请换落脚点或方向。'};
}
