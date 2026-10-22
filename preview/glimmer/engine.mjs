import {GEAR,LEVELS,ENEMY_TYPES} from './levels.mjs';
export {GEAR,LEVELS,ENEMY_TYPES};
const STEP=1/30, PR=.24, ER=.28;
const clone=v=>JSON.parse(JSON.stringify(v));
const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const unit=(x,y)=>{const d=Math.hypot(x,y);return d?{x:x/d,y:y/d}:{x:1,y:0};};
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const terminal=g=>g.state==='won'||g.state==='lost';
const event=(g,text)=>{g.events.push({time:g.time,text});if(g.events.length>12)g.events.shift();};
const effect=(g,kind,x,y,radius,dx=0,dy=0,ttl=.25)=>g.effects.push({id:'f'+g.nextId++,kind,x,y,radius,dx,dy,ttl,duration:ttl});
export function deriveStats(value){
 const gear=value?.player?.gear??value?.gear??value??{},w=GEAR[gear.weapon]??GEAR.worn,c=GEAR[gear.charm]??{};
 return {damage:w.damage,attackInterval:w.attackInterval,attackRange:w.attackRange,attackArc:w.arc,maxHp:95+(c.maxHp??0),maxEnergy:80+(c.maxEnergy??0),speed:3+(c.speed??0),skillDamage:18+(c.skillDamage??0),skillCost:24+(c.skillCost??0),skillCooldown:4+(c.skillCooldown??0),skillRadius:2.35,energyRegen:2.5+(c.energyRegen??0),dodgeCooldown:1.6+(c.dodgeCooldown??0),dodgeInvuln:.32,heal:38+(c.heal??0)};
}
export function wallAt(g,x,y){return x<0||y<0||x>=g.grid.width||y>=g.grid.height||g.grid.walls.some(p=>p.x===Math.floor(x)&&p.y===Math.floor(y));}
export function canStand(g,x,y,r=PR){
 if(!Number.isFinite(x)||!Number.isFinite(y))return false;
 for(let ty=Math.floor(y-r);ty<=Math.floor(y+r);ty++)for(let tx=Math.floor(x-r);tx<=Math.floor(x+r);tx++){
  if(wallAt(g,tx+.5,ty+.5)){const nx=clamp(x,tx,tx+1),ny=clamp(y,ty,ty+1);if(Math.hypot(x-nx,y-ny)<r-.00001)return false;}}
 return true;
}
function move(g,p,dx,dy,r){if(canStand(g,p.x+dx,p.y,r))p.x+=dx;if(canStand(g,p.x,p.y+dy,r))p.y+=dy;}
export function lineOfSight(g,a,b){const d=dist(a,b),n=Math.ceil(d/.12);for(let i=1;i<n;i++)if(wallAt(g,a.x+(b.x-a.x)*i/n,a.y+(b.y-a.y)*i/n))return false;return true;}
export function nextWaypoint(g,from,to){
 const sx=Math.floor(from.x),sy=Math.floor(from.y),tx=Math.floor(to.x),ty=Math.floor(to.y);if(sx===tx&&sy===ty)return {x:to.x,y:to.y};
 const q=[{x:sx,y:sy,first:null}],seen=new Set([sx+','+sy]);for(let n=0;n<q.length;n++){const p=q[n];for(const [dx,dy]of [[1,0],[0,1],[-1,0],[0,-1]]){const x=p.x+dx,y=p.y+dy,k=x+','+y;if(seen.has(k)||!canStand(g,x+.5,y+.5,ER))continue;seen.add(k);const first=p.first??{x:x+.5,y:y+.5};if(x===tx&&y===ty)return first;q.push({x,y,first});}}
 return null;
}
export function createGame(index=0,entry={}){
 if(!Number.isInteger(index)||!LEVELS[index])throw new RangeError('不存在这段旅程');const l=LEVELS[index],wanted=entry?.gear??entry??{},gear={weapon:GEAR[wanted.weapon]?.slot==='weapon'?wanted.weapon:'worn',charm:GEAR[wanted.charm]?.slot==='charm'?wanted.charm:null},s=deriveStats(gear);
 const g={version:1,level:index+1,levelId:l.id,title:l.name,brief:l.brief,state:'ready',time:0,ticks:0,accumulator:0,nextId:1,grid:clone(l.grid),entryGear:clone(gear),player:{...l.spawn,hp:s.maxHp,maxHp:s.maxHp,energy:s.maxEnergy,maxEnergy:s.maxEnergy,gear,facing:{x:1,y:0},attackCooldown:0,skillCooldown:0,dodgeCooldown:0,invuln:0,dodgeTime:0},
 enemies:l.enemies.map(v=>({...clone(v),name:ENEMY_TYPES[v.type].name,hp:ENEMY_TYPES[v.type].maxHp,maxHp:ENEMY_TYPES[v.type].maxHp,state:'approach',windup:0,windupMax:0,recovery:0,attack:null,alive:true,phase:1,attackCount:0})),projectiles:[],effects:[],chests:l.chests.map(v=>({...clone(v),opened:false,resolved:false,chosen:null})),exit:{...l.exit,open:false},relic:false,heals:1,kills:0,stats:{damageDealt:0,damageTaken:0,attacks:0,skills:0,dodges:0,heals:0,loot:0},events:[],choice:null,goals:[],reason:'先看清行动方式，再开始这段旅程。',nearby:null};
 sync(g);return g;
}
export function start(g){if(g.state==='ready'||g.state==='paused'){g.state='playing';g.reason='清路、选择装备，再从亮起的石门离开。';return true;}return false;}
export function pause(g){if(g.state==='playing'){g.state='paused';g.reason='已暂停，恢复后才会继续战斗。';return true;}return false;}
export function getNearby(g){
 const chest=g.chests.filter(c=>!c.resolved&&dist(c,g.player)<=1.3).sort((a,b)=>dist(a,g.player)-dist(b,g.player))[0];
 if(chest){const locks=chest.lockedBy.filter(id=>g.enemies.some(e=>e.id===id&&e.alive));return {type:'chest',id:chest.id,label:locks.length?'遗匣仍受'+locks.length+'名守卫看管':'打开遗匣，选择一件装备',enabled:locks.length===0,reason:locks.length?'先击败看管遗匣的侧室守卫':''};}
 if(dist(g.player,g.exit)<=1.4)return {type:'exit',id:'exit',label:g.exit.open?'离开本段':'石门尚未亮起',enabled:g.exit.open,reason:g.exit.open?'':'先完成本段必需目标'};return null;
}
function sync(g){
 const remaining=g.enemies.filter(e=>e.alive&&!e.optional).length,requiredChest=g.chests.filter(c=>c.required&&!c.resolved).length;
 g.exit.open=remaining===0&&requiredChest===0&&(g.level!==3||g.relic);
 g.goals=[{id:'clear',label:'清理通路敌人（剩余'+remaining+'）',done:remaining===0},...(g.level===1?[{id:'loot',label:'查看遗匣并决定装备',done:requiredChest===0}]:[]),...(g.level===2?[{id:'side',label:'可选：探索侧室并决定护符',done:g.chests.every(c=>c.resolved),optional:true}]:[]),...(g.level===3?[{id:'relic',label:'取得守望者的砾光印记',done:g.relic}]:[]),{id:'exit',label:'前往亮起的石门，完成本段',done:g.state==='won'}];
 g.nearby=getNearby(g);
}
export function command(g,c){
 const no=reason=>({ok:false,reason});if(!g||!c||terminal(g))return no('本段已结束。');
 if(c.type==='choose'){
  if(g.state!=='choosing'||!g.choice)return no('请先打开附近的遗匣。');if(!g.choice.offers.includes(c.gearId)||!GEAR[c.gearId])return no('只能选择遗匣列出的装备。');
  const chest=g.chests.find(v=>v.id===g.choice.chestId);if(!chest||chest.resolved)return no('这个遗匣已经取过装备。');const old=deriveStats(g),item=GEAR[c.gearId];g.player.gear[item.slot]=item.id;const s=deriveStats(g);g.player.hp=clamp(g.player.hp+s.maxHp-old.maxHp,0,s.maxHp);g.player.maxHp=s.maxHp;g.player.energy=clamp(g.player.energy+s.maxEnergy-old.maxEnergy,0,s.maxEnergy);g.player.maxEnergy=s.maxEnergy;
  chest.resolved=true;chest.chosen=item.id;g.stats.loot++;g.choice=null;g.state='playing';g.reason='已装备'+item.name+'。';event(g,g.reason);sync(g);return {ok:true,reason:g.reason};
 }
 if(c.type==='leaveChoice'){
  if(g.state!=='choosing')return no('现在没有正在查看的遗匣。');const chest=g.chests.find(v=>v.id===g.choice.chestId);chest.resolved=true;chest.chosen=null;g.choice=null;g.state='playing';g.reason='保留当前装备，遗匣已封存。';event(g,g.reason);sync(g);return {ok:true,reason:g.reason};
 }
 if(g.state!=='playing')return no('请先开始或继续本段。');
 if(c.type==='heal'){
  if(g.heals<=0)return no('本段的治疗药已经用完。');if(g.player.hp>=g.player.maxHp)return no('生命已满，治疗药保留。');const amount=Math.min(deriveStats(g).heal,g.player.maxHp-g.player.hp);g.heals--;g.player.hp+=amount;g.stats.heals++;effect(g,'heal',g.player.x,g.player.y,.7,0,0,.5);event(g,'使用治疗药，实际恢复'+Math.round(amount)+'点生命。');sync(g);return {ok:true,reason:'治疗药已使用，生命恢复。'};
 }
 const near=getNearby(g);if(c.type==='interact'&&near?.type==='chest')return command(g,{type:'open',chestId:near.id});
 if(c.type==='open'){
  const chest=g.chests.find(v=>v.id===c.chestId);if(!chest||chest.resolved)return no('这个遗匣已经封存或不存在。');if(dist(chest,g.player)>1.3)return no('靠近遗匣后才能打开。');if(chest.lockedBy.some(id=>g.enemies.some(e=>e.id===id&&e.alive)))return no('先击败看管遗匣的守卫。');
  chest.opened=true;g.choice={chestId:chest.id,offers:[...chest.offers]};g.state='choosing';g.reason='选择时战斗已暂停；只取一件，替换对应装备槽。';sync(g);return {ok:true,reason:g.reason};
 }
 if(c.type==='exit'||c.type==='interact'){
  if(dist(g.player,g.exit)>1.4)return no('靠近亮起的石门后离开。');if(!g.exit.open)return no('石门尚未亮起，先完成必需目标。');g.state='won';g.reason=g.level===3?'砾光印记已带出石庭，三段旅程抵达终点。':'已走出本段，整备后可继续下一段。';g.projectiles=[];event(g,g.reason);sync(g);return {ok:true,reason:g.reason};
 }
 return no('请选择已有的交互动作。');
}
function damageEnemy(g,e,n){if(!e.alive)return;const before=e.hp;e.hp=Math.max(0,e.hp-n);g.stats.damageDealt+=Math.min(n,before);effect(g,'hit',e.x,e.y,.4);if(e.hp<=0){e.alive=false;e.state='dead';e.windup=0;e.attack=null;g.kills++;event(g,e.name+'已被击退。');if(e.type==='warden'){g.relic=true;effect(g,'relic',e.x,e.y,1,0,0,1.5);event(g,'取得砾光印记，守望者已沉静。');}}else if(e.type==='warden'&&e.phase===1&&e.hp<=e.maxHp/2){e.phase=2;event(g,'守望者转入第二阶段：留意圆形震波与三束矿火。');}}
function damagePlayer(g,n){if(g.player.invuln>0||g.state!=='playing')return;const actual=Math.min(n,g.player.hp);g.player.hp-=actual;g.stats.damageTaken+=actual;g.player.invuln=.24;effect(g,'enemyhit',g.player.x,g.player.y,.55,0,0,.35);if(g.player.hp<=0){g.state='lost';g.reason='生命耗尽。本段可重试，前段成果和入场装备保留。';g.projectiles=[];event(g,g.reason);}}
function playerActions(g,input,dt){
 const p=g.player,s=deriveStats(g);for(const k of ['attackCooldown','skillCooldown','dodgeCooldown','invuln','dodgeTime'])p[k]=Math.max(0,p[k]-dt);p.energy=Math.min(s.maxEnergy,p.energy+s.energyRegen*dt);
 let direction=unit(Number(input.x)||0,Number(input.y)||0);const moving=Math.hypot(Number(input.x)||0,Number(input.y)||0)>.01;if(moving)p.facing=direction;
 if(input.dodge&&p.dodgeCooldown<=0){p.dodgeCooldown=s.dodgeCooldown;p.invuln=Math.max(p.invuln,s.dodgeInvuln);p.dodgeTime=.18;g.stats.dodges++;effect(g,'dodge',p.x,p.y,.5,p.facing.x,p.facing.y,.25);}
 if(moving)move(g,p,direction.x*s.speed*(p.dodgeTime>0?2.2:1)*dt,direction.y*s.speed*(p.dodgeTime>0?2.2:1)*dt,PR);
 if(input.attack&&p.attackCooldown<=0){p.attackCooldown=s.attackInterval;g.stats.attacks++;const target=g.enemies.filter(e=>e.alive&&dist(e,p)<=4&&lineOfSight(g,p,e)).sort((a,b)=>dist(a,p)-dist(b,p))[0];if(target)p.facing=unit(target.x-p.x,target.y-p.y);effect(g,'slash',p.x,p.y,s.attackRange,p.facing.x,p.facing.y,.16);
  for(const e of g.enemies)if(e.alive&&dist(e,p)<=s.attackRange+ER&&lineOfSight(g,p,e)){const v=unit(e.x-p.x,e.y-p.y);if(v.x*p.facing.x+v.y*p.facing.y>=s.attackArc)damageEnemy(g,e,s.damage);}}
 if(input.skill&&p.skillCooldown<=0&&p.energy>=s.skillCost){p.energy-=s.skillCost;p.skillCooldown=s.skillCooldown;g.stats.skills++;effect(g,'pulse',p.x,p.y,s.skillRadius,0,0,.4);for(const e of g.enemies)if(e.alive&&dist(e,p)<=s.skillRadius+ER&&lineOfSight(g,p,e))damageEnemy(g,e,s.skillDamage);}
}
function fire(g,e,angle){const speed=4.1;g.projectiles.push({id:'p'+g.nextId++,owner:e.id,x:e.x,y:e.y,vx:Math.cos(angle)*speed,vy:Math.sin(angle)*speed,damage:ENEMY_TYPES[e.type].damage,radius:.13,ttl:3.5});}
function resolveAttack(g,e){
 const a=e.attack,p=g.player,kind=a.kind;if(kind==='bolt'){const angle=Math.atan2(a.dy,a.dx);for(const off of e.type==='warden'?[-.35,0,.35]:[0])fire(g,e,angle+off);}
 else if(kind==='nova'){effect(g,'pulse',a.x,a.y,a.radius,0,0,.35);if(dist(a,p)<=a.radius+PR&&lineOfSight(g,a,p))damagePlayer(g,ENEMY_TYPES[e.type].damage);}
 else if(dist(e,p)<=a.range+PR&&lineOfSight(g,e,p)){const v=unit(p.x-e.x,p.y-e.y);if(v.x*a.dx+v.y*a.dy>.15)damagePlayer(g,ENEMY_TYPES[e.type].damage);}
 e.attackCount++;e.state='recover';e.recovery=ENEMY_TYPES[e.type].recovery;e.windup=0;e.attack=null;
}
function enemyStep(g,e,dt){
 if(!e.alive||g.state!=='playing')return;const spec=ENEMY_TYPES[e.type],d=dist(e,g.player);
 if(e.state==='windup'){e.windup=Math.max(0,e.windup-dt);if(e.windup<=0)resolveAttack(g,e);return;}
 if(e.state==='recover'){e.recovery=Math.max(0,e.recovery-dt);if(e.recovery<=0)e.state='approach';return;}
 if(d>spec.aggro)return;const bossSecond=e.type==='warden'&&e.phase===2;let kind=e.type==='wisp'?'bolt':bossSecond?(e.attackCount%2===0?'nova':'bolt'):'melee';const range=kind==='bolt'?4.3:kind==='nova'?2.5:spec.range;
 if(d<=range&&lineOfSight(g,e,g.player)){const v=unit(g.player.x-e.x,g.player.y-e.y);e.attack={kind,x:e.x,y:e.y,dx:v.x,dy:v.y,radius:kind==='nova'?2.15:kind==='bolt'?.13:spec.range,range:kind==='bolt'?4.3:spec.range};e.windup=kind==='nova'?1.05:spec.windup;e.windupMax=e.windup;e.state='windup';return;}
 const w=nextWaypoint(g,e,g.player);if(w){const v=unit(w.x-e.x,w.y-e.y),speed=spec.speed*(bossSecond?1.15:1);move(g,e,v.x*speed*dt,v.y*speed*dt,ER);}
}
function tick(g,input){
 g.ticks++;g.time=g.ticks/30;playerActions(g,input,STEP);for(const e of g.enemies)enemyStep(g,e,STEP);
 if(g.state==='playing')for(const p of g.projectiles){p.ttl-=STEP;const old={x:p.x,y:p.y};p.x+=p.vx*STEP;p.y+=p.vy*STEP;if(!canStand(g,p.x,p.y,p.radius)||!lineOfSight(g,old,p)){p.ttl=0;continue;}if(dist(p,g.player)<=p.radius+PR){damagePlayer(g,p.damage);p.ttl=0;}}
 g.projectiles=g.projectiles.filter(p=>p.ttl>0);for(const f of g.effects)f.ttl-=STEP;g.effects=g.effects.filter(f=>f.ttl>0);sync(g);
}
export function update(g,dt,input={}){if(g.state!=='playing'||!Number.isFinite(dt)||dt<=0)return;g.accumulator+=Math.min(dt,.25);let n=0;while(g.accumulator+1e-9>=STEP&&g.state==='playing'&&n++<9){g.accumulator-=STEP;tick(g,input);}g.accumulator=Math.max(0,g.accumulator);}
export function snapshot(g){const s=clone(g);s.nearby=getNearby(g);return s;}
export function checkpoint(g){return {format:'glimmer-checkpoint',version:1,game:snapshot(g)};}
export function restore(cp){
 try{
  if(cp?.format!=='glimmer-checkpoint'||cp.version!==1)return null;const s=clone(cp.game),base=createGame(s.level-1,s.entryGear),stats=deriveStats(s);
  if(s.version!==1||s.levelId!==base.levelId||s.title!==base.title||s.brief!==base.brief||JSON.stringify(s.grid)!==JSON.stringify(base.grid)||!['ready','playing','paused','choosing','won','lost'].includes(s.state)||!Number.isSafeInteger(s.ticks)||s.ticks<0||s.time!==s.ticks/30||!Number.isFinite(s.accumulator)||s.accumulator<0||s.accumulator>.25001||!Number.isInteger(s.nextId)||s.nextId<1||typeof s.reason!=='string')return null;
  const p=s.player;if(GEAR[p.gear.weapon]?.slot!=='weapon'||p.gear.charm!==null&&GEAR[p.gear.charm]?.slot!=='charm'||GEAR[s.entryGear.weapon]?.slot!=='weapon'||s.entryGear.charm!==null&&GEAR[s.entryGear.charm]?.slot!=='charm'||!canStand(s,p.x,p.y)||p.maxHp!==stats.maxHp||p.maxEnergy!==stats.maxEnergy||!Number.isFinite(p.hp)||p.hp<0||p.hp>p.maxHp||!Number.isFinite(p.energy)||p.energy<0||p.energy>p.maxEnergy||!Number.isFinite(p.facing.x)||!Number.isFinite(p.facing.y)||Math.abs(Math.hypot(p.facing.x,p.facing.y)-1)>.0001)return null;
  if(['attackCooldown','skillCooldown','dodgeCooldown','invuln','dodgeTime'].some(k=>!Number.isFinite(p[k])||p[k]<0||p[k]>10)||!Number.isInteger(s.heals)||s.heals<0||s.heals>1||!Number.isInteger(s.kills)||s.kills<0)return null;
  if(!Array.isArray(s.enemies)||s.enemies.length!==base.enemies.length||new Set(s.enemies.map(e=>e.id)).size!==base.enemies.length)return null;
  for(const e of s.enemies){const b=base.enemies.find(v=>v.id===e.id);if(!b||e.type!==b.type||e.name!==b.name||e.optional!==b.optional||e.maxHp!==b.maxHp||!Number.isFinite(e.hp)||e.hp<0||e.hp>e.maxHp||e.alive!==(e.hp>0)||!canStand(s,e.x,e.y,ER)||!['approach','windup','recover','dead'].includes(e.state)||e.alive===(e.state==='dead')||!Number.isFinite(e.windup)||e.windup<0||e.windup>1.1||!Number.isFinite(e.windupMax)||e.windupMax<0||e.windupMax>1.1||!Number.isFinite(e.recovery)||e.recovery<0||e.recovery>2||![1,2].includes(e.phase)||e.type!=='warden'&&e.phase!==1||!Number.isInteger(e.attackCount)||e.attackCount<0)return null;
   if(e.state==='windup'){const a=e.attack;if(!a||!['melee','bolt','nova'].includes(a.kind)||!['x','y','dx','dy','radius','range'].every(k=>Number.isFinite(a[k]))||a.radius<0||a.radius>3||a.range<0||a.range>5||e.windup<=0)return null;}else if(e.attack!==null)return null;}
  if(s.kills!==s.enemies.filter(e=>!e.alive).length||typeof s.relic!=='boolean'||s.relic!==s.enemies.some(e=>e.type==='warden'&&!e.alive)||!Array.isArray(s.chests)||s.chests.length!==base.chests.length||new Set(s.chests.map(c=>c.id)).size!==base.chests.length)return null;
  for(const c of s.chests){const b=base.chests.find(v=>v.id===c.id);if(!b||c.x!==b.x||c.y!==b.y||JSON.stringify(c.offers)!==JSON.stringify(b.offers)||JSON.stringify(c.lockedBy)!==JSON.stringify(b.lockedBy)||c.required!==b.required||typeof c.opened!=='boolean'||typeof c.resolved!=='boolean'||c.resolved&&!c.opened||c.chosen!==null&&(!c.resolved||!c.offers.includes(c.chosen)))return null;}
  if(s.state==='choosing'){const c=s.chests.find(c=>c.id===s.choice?.chestId);if(!c||!c.opened||c.resolved||dist(c,p)>1.30001||c.lockedBy.some(id=>s.enemies.some(e=>e.id===id&&e.alive))||JSON.stringify(s.choice.offers)!==JSON.stringify(c.offers))return null;}else if(s.choice!==null)return null;
  if(!Array.isArray(s.projectiles)||s.projectiles.length>100||s.projectiles.some(p=>!['x','y','vx','vy','damage','radius','ttl'].every(k=>Number.isFinite(p[k]))||p.ttl<=0||p.ttl>3.6||p.damage<0||p.damage>25||p.radius!==.13||!base.enemies.some(e=>e.id===p.owner)))return null;
  if(!Array.isArray(s.effects)||s.effects.length>150||s.effects.some(f=>!['x','y','radius','dx','dy','ttl','duration'].every(k=>Number.isFinite(f[k]))||f.radius<0||f.radius>3||f.ttl<=0||f.ttl>f.duration||f.duration>2||!['slash','pulse','dodge','hit','heal','enemyhit','relic'].includes(f.kind)))return null;
  const visuals=[...s.projectiles,...s.effects];if(new Set(visuals.map(v=>v.id)).size!==visuals.length||visuals.some(v=>!/^[pf]\d+$/.test(v.id)||Number(v.id.slice(1))>=s.nextId))return null;
  if(!s.stats||['damageDealt','damageTaken','attacks','skills','dodges','heals','loot'].some(k=>!Number.isInteger(s.stats[k])||s.stats[k]<0)||!Array.isArray(s.events)||s.events.length>12||s.events.some(v=>!Number.isFinite(v.time)||v.time<0||v.time>s.time||typeof v.text!=='string'||v.text.length>1000))return null;
  if(s.exit.x!==base.exit.x||s.exit.y!==base.exit.y||typeof s.exit.open!=='boolean'||s.state==='lost'&&p.hp!==0||s.state!=='lost'&&p.hp<=0||s.state==='won'&&!s.exit.open||s.state==='ready'&&(s.ticks!==0||p.x!==base.player.x||p.y!==base.player.y||p.hp!==p.maxHp||s.enemies.some(e=>e.hp!==e.maxHp)))return null;
  const wasOpen=s.exit.open;sync(s);if(wasOpen!==s.exit.open)return null;if(s.state==='playing'){s.state='paused';s.reason='已恢复本段；继续后才会推进战斗。';}return s;
 }catch{return null;}
}
