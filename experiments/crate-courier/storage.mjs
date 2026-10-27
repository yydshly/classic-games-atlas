// One isolated journey key. Constant-time snapshot validation, never tick replay.
import {LEVELS,LEGACY_SIXTH,getLevel} from './levels.mjs?v=crate-courier-seven-1';
export const SAVE_KEY='classic-games-atlas:crate-courier:journey:v1';
const ok=(condition,message)=>{if(!condition)throw Error(message);};
const obj=x=>x&&typeof x==='object'&&!Array.isArray(x);
const num=(x,min=-1e4,max=1e4)=>typeof x==='number'&&Number.isFinite(x)&&x>=min&&x<=max;
const integer=(x,min=0,max=Number.MAX_SAFE_INTEGER)=>Number.isSafeInteger(x)&&x>=min&&x<=max;
const keys=(x,list)=>obj(x)&&Object.keys(x).sort().join('|')===list.slice().sort().join('|');
const equal=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const runKeys=['shots','hits','damage','jumps','places'];
const eventNames=new Set(['start','jump','lift','throw','placed','place-blocked','empty-hands','enemy-hit','box-landed','box-broken','box-water','hurt','released-on-hurt','supply','failed','arrived']);
function runValid(run,ticks,hp){return keys(run,runKeys)&&runKeys.every(k=>integer(run[k],0,ticks))&&run.hits<=run.shots&&run.damage===3-hp;}
export function decodeSave(raw){
  ok(typeof raw==='string'&&raw.length<=65536,'存档尺寸无效');const parsed=JSON.parse(raw);ok(keys(parsed,['version','game'])&&parsed.version===1,'存档版本无效');const g=parsed.game;
  const gameFields=['stageIndex','phase','tick','player','boxes','enemies','sources','previous','events','lastEvent','learned','result','run','journey'];
  ok(keys(g,gameFields)||keys(g,[...gameFields,'levelVersion']),'存档字段无效');
  ok(integer(g.stageIndex,0,LEVELS.length-1)&&integer(g.tick),'章节/时间无效');
  ok(!('levelVersion'in g)||([5,6].includes(g.stageIndex)&&[1,2].includes(g.levelVersion)),'关卡版本无效');
  const level=getLevel(g),p=g.player;
  ok(['ready','playing','paused','failed','won'].includes(g.phase),'状态无效');
  ok(keys(p,['x','y','vx','vy','w','h','face','grounded','support','hp','invulnerable','holding','coyote','buffer','pose']),'角色字段无效');
  ok(num(p.x,14,level.width-14)&&num(p.y,-100,1000)&&num(p.vx,-216,216)&&num(p.vy,-2000,2000)&&p.w===28&&p.h===46&&[-1,1].includes(p.face)&&typeof p.grounded==='boolean'&&integer(p.hp,0,3),'角色状态无效');
  ok(num(p.invulnerable,0,1.251)&&num(p.coyote,0,.081)&&num(p.buffer,0,.111)&&num(p.pose,0,.221),'角色计时无效');
  ok(Array.isArray(g.boxes)&&g.boxes.length===level.supplies.length&&Array.isArray(g.sources)&&g.sources.length===level.supplies.length,'木箱数量无效');
  const boxIds=new Set(g.boxes.map((b,i)=>'box-'+i));
  for(let i=0;i<g.boxes.length;i++){const b=g.boxes[i],s=level.supplies[i],source=g.sources[i];
    ok(keys(b,['id','source','x','y','vx','vy','mode','armed','age','angle'])&&b.id==='box-'+i&&b.source===s.id,'木箱身份无效');
    ok(['rest','held','flying','spent'].includes(b.mode)&&typeof b.armed==='boolean'&&num(b.x,-500,level.width+500)&&num(b.y,-200,1000)&&num(b.vx,-500,500)&&num(b.vy,-2000,2000)&&num(b.age,0,1e9)&&num(b.angle,-1e9,1e9),'木箱状态无效');
    ok(keys(source,['id','x','y','cooldown'])&&source.id===s.id&&source.x===s.x&&source.y===s.y&&num(source.cooldown,0,1.81),'补箱状态无效');
  }
  const held=g.boxes.filter(b=>b.mode==='held');ok((p.holding===null&&held.length===0)||(held.length===1&&held[0].id===p.holding&&held[0].x===p.x&&held[0].y===p.y-49),'持箱关系无效');
  const supportIds=new Set([...level.solids.map(s=>s.id),...boxIds]);ok(p.support===null||supportIds.has(p.support),'承托身份无效');
  ok(Array.isArray(g.enemies)&&g.enemies.length===level.enemies.length,'巡逻数量无效');
  for(let i=0;i<g.enemies.length;i++){const e=g.enemies[i],s=level.enemies[i];ok(keys(e,['id','x','y','min','max','dir','w','h','alive','hitAt'])&&e.id===s.id&&e.y===s.y&&e.min===s.min&&e.max===s.max&&e.w===38&&e.h===32&&[-1,1].includes(e.dir)&&typeof e.alive==='boolean'&&num(e.x,s.min-70,s.max+70)&&integer(e.hitAt,-1,g.tick),'巡逻状态无效');}
  ok(obj(g.previous)&&Object.keys(g.previous).every(k=>['left','right','jump','action','down'].includes(k)&&typeof g.previous[k]==='boolean'),'旧按键字段无效');
  ok(keys(g.learned,['lift','throw','jump','hit'])&&Object.values(g.learned).every(v=>typeof v==='boolean')&&runValid(g.run,g.tick,p.hp),'本关记录无效');
  ok(g.run.hits===g.enemies.filter(e=>!e.alive).length,'击中记录不一致');
  ok(keys(g.journey,['completed','retries'])&&Array.isArray(g.journey.retries)&&[3,6,LEVELS.length].includes(g.journey.retries.length)&&g.journey.retries.every(n=>integer(n))&&Array.isArray(g.journey.completed)&&g.journey.completed.length>=g.stageIndex&&g.journey.completed.length<=g.stageIndex+1,'行程记录无效');
  ok(g.stageIndex<g.journey.retries.length,'旧版行程无效');
  for(let i=0;i<g.journey.completed.length;i++){const c=g.journey.completed[i],maxEnemies=i===5?LEGACY_SIXTH.enemies.length:LEVELS[i].enemies.length;ok(keys(c,['stageIndex','title','ticks','hp','retries',...runKeys])&&c.stageIndex===i&&c.title===LEVELS[i].title&&integer(c.ticks,1)&&integer(c.hp,1,3)&&integer(c.retries,0,g.journey.retries[i])&&runValid(Object.fromEntries(runKeys.map(k=>[k,c[k]])),c.ticks,c.hp)&&c.hits<=maxEnemies,'通关回顾无效');}
  const enemyIds=new Set(g.enemies.map(e=>e.id));ok(Array.isArray(g.events)&&g.events.length<=36,'事件数量无效');let lastTick=0;
  for(const e of g.events){ok(obj(e)&&eventNames.has(e.type)&&integer(e.tick,lastTick,g.tick)&&Object.keys(e).every(k=>['type','tick','box','enemy','x','y','hp','cause'].includes(k)),'事件字段无效');lastTick=e.tick;if('box'in e)ok(boxIds.has(e.box),'事件木箱无效');if('enemy'in e)ok(enemyIds.has(e.enemy),'事件巡逻无效');for(const k of ['x','y'])if(k in e)ok(num(e[k],-500,level.width+1000),'事件位置无效');if('hp'in e)ok(integer(e.hp,0,3),'事件体力无效');if('cause'in e)ok(typeof e.cause==='string'&&e.cause.length<100,'事件原因无效');}
  ok(equal(g.lastEvent,g.events.at(-1)||null),'最近事件无效');
  if(g.phase==='won'){ok(p.hp>0&&p.grounded&&p.x>=level.goal&&(g.stageIndex===0||Math.abs(p.y-level.goalY)<.01)&&keys(g.result,['cause','ticks'])&&g.result.cause==='抵达收货站'&&g.result.ticks===g.tick&&g.journey.completed.length===g.stageIndex+1,'到站状态无效');const c=g.journey.completed[g.stageIndex];ok(c.ticks===g.tick&&c.hp===p.hp&&runKeys.every(k=>c[k]===g.run[k]),'到站回顾不一致');}
  else if(g.phase==='failed')ok(keys(g.result,['cause','x','y'])&&['巡逻机连续撞到了你','落进了货栈之间的水道'].includes(g.result.cause)&&g.result.x===p.x&&g.result.y===p.y&&(p.hp===0||p.y>575),'失败现场无效');
  else ok(g.result===null&&p.hp>0,'进行中状态无效');
  const restored=structuredClone(g);while(restored.journey.retries.length<LEVELS.length)restored.journey.retries.push(0);if(restored.phase==='playing')restored.phase='paused';restored.previous={};return restored;
}
export function encodeSave(g){const raw=JSON.stringify({version:1,game:g});decodeSave(raw);return raw;}
export function openStore(storage){let protectedBytes=false,status='empty';
  function read(){try{const raw=storage?.getItem(SAVE_KEY);if(raw===null||raw===undefined){status='empty';return null;}const g=decodeSave(raw);status='loaded';return g;}catch(error){protectedBytes=true;status=error instanceof SyntaxError?'invalid':'read-error';return null;}}
  function save(g,{replace=false}={}){if(protectedBytes&&!replace)return false;try{if(!storage)throw Error('storage unavailable');const raw=encodeSave(g);storage.setItem(SAVE_KEY,raw);protectedBytes=false;status='saved';return true;}catch{status=protectedBytes?'protected':'write-error';return false;}}
  return {read,save,get status(){return status;},get protected(){return protectedBytes;}};
}
