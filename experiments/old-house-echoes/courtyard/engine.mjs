import {ROOMS,ITEMS,NOTES,CAPACITY,slots,distance,walkable} from './world.mjs';
export const FIXED_STEP=1/60;
const copy=x=>structuredClone(x);
export function createGame(){return {schema:1,chapter:'courtyard',room:'yard',player:{x:10,y:8.8,angle:-Math.PI/2,hp:100,invulnerable:0},inventory:['badge','sleeve'],box:['pistol','rounds','herb','cloth'],loaded:4,reserve:3,flags:{},taken:[],notes:[],visited:['yard'],enemy:{x:10,y:6,hp:4,cooldown:0,stun:0,windup:0,target:null},mode:'intro',message:'阿遥已安全离馆。带回档案册，留意出门时背包还有多少空位。',elapsed:0,cooldown:0,transition:0,aim:false,shot:0,stats:{shots:0,hits:0,damage:0,distance:0,doors:0,stores:0,full:0},events:[]};}
export function say(s,message){s.message=message;}
export function near(s){return [...ROOMS[s.room].props.filter(p=>!s.taken.includes(p.id)),...ROOMS[s.room].doors].filter(p=>distance(s.player,p)<1.3).sort((a,b)=>distance(s.player,a)-distance(s.player,b))[0]||null;}
function move(s,actor,dx,dy,r=.26,blockEnemy=false){
 const legal=(x,y)=>walkable(s.room,x,y,r)&&!(blockEnemy&&s.room==='corridor'&&s.enemy.hp>0&&Math.hypot(s.enemy.x-x,s.enemy.y-y)<.56);
 const ox=actor.x,oy=actor.y;if(legal(actor.x+dx,actor.y))actor.x+=dx;if(legal(actor.x,actor.y+dy))actor.y+=dy;return Math.hypot(actor.x-ox,actor.y-oy);
}
function rayClear(s,a,b){const n=Math.ceil(distance(a,b)*8);for(let i=1;i<n;i++)if(!walkable(s.room,a.x+(b.x-a.x)*i/n,a.y+(b.y-a.y)*i/n,.05))return false;return true;}
function shoot(s){
 if(!s.aim||s.cooldown>0)return;
 if(!s.inventory.includes('pistol'))return say(s,'枪在铁柜里。返庭院取枪，或走花架避开石廊。');
 if(!s.loaded)return say(s,'弹仓空了。可把弹盒与枪组合装填，或撤到花架。');
 s.loaded--;s.stats.shots++;s.cooldown=.62;s.shot=.12;s.events.push('shot');
 if(s.room==='corridor'&&s.enemy.hp>0){const e=s.enemy,d=distance(s.player,e),a=Math.atan2(e.y-s.player.y,e.x-s.player.x),delta=Math.atan2(Math.sin(a-s.player.angle),Math.cos(a-s.player.angle));
  if(d<8&&Math.abs(delta)<.17&&rayClear(s,s.player,e)){e.hp--;e.stun=.35;e.windup=0;s.stats.hits++;say(s,e.hp?'镇止弹命中，巡馆偶停顿。':'巡馆偶停下了。石廊的往返路已清。');}else say(s,'射偏了。弹药有限，举枪后先调整方向。');
 }else say(s,'枪声散在雨庭。弹药不会恢复。');
}
function enemyStep(s,dt){
 const e=s.enemy;if(e.hp<=0||s.room!=='corridor')return;e.cooldown=Math.max(0,e.cooldown-dt);e.stun=Math.max(0,e.stun-dt);if(e.stun>0)return;
 const d=distance(e,s.player);if(e.windup>0){e.windup=Math.max(0,e.windup-dt);if(e.windup===0){if(d<1.02&&s.player.invulnerable<=0){s.player.hp=Math.max(0,s.player.hp-25);s.player.invulnerable=1.5;s.stats.damage+=25;s.events.push('hurt');say(s,'巡馆偶推击：体力 −25。趁收势侧移，或改走花架。');}e.cooldown=1.4;}return;}
 if(d<.87&&e.cooldown<=0){e.windup=.65;return;}if(d<7&&rayClear(s,e,s.player))e.target={x:s.player.x,y:s.player.y};if(e.target){const len=distance(e,e.target);if(len>.12)move(s,e,(e.target.x-e.x)/len*.82*dt,(e.target.y-e.y)/len*.82*dt,.29);else e.target=null;}
}
export function tick(s,input={},dt=FIXED_STEP){
 if(s.mode!=='playing')return s;dt=Math.min(Math.max(dt,0),.05);s.elapsed+=dt;s.cooldown=Math.max(0,s.cooldown-dt);s.shot=Math.max(0,s.shot-dt);s.player.invulnerable=Math.max(0,s.player.invulnerable-dt);s.transition=Math.max(0,s.transition-dt);s.aim=!!input.aim;
 let dx=Number(!!input.right)-Number(!!input.left),dy=Number(!!input.down)-Number(!!input.up);const len=Math.hypot(dx,dy);if(len){dx/=len;dy/=len;s.player.angle=Math.atan2(dy,dx);if(!s.aim)s.stats.distance+=move(s,s.player,dx*3.15*dt,dy*3.15*dt,.25,true);}
 if(input.fire)shoot(s);enemyStep(s,dt);if(s.player.hp<=0){s.mode='lost';s.aim=false;say(s,'体力耗尽。可从庭院记录点重试，或重新开始第二段。');}return s;
}
export function interact(s){
 if(s.mode!=='playing'||s.transition>0)return;const p=near(s);if(!p)return say(s,'走近门、纸页、铁柜或物品，再按 E 调查。');
 if(p.to){
  if(p.lock==='loop'&&!s.flags.loop){if(s.room!=='pump')return say(s,'内闩从排水间一侧扣住。');s.flags.loop=true;say(s,'排水间内闩打开，补给铁柜的回环已通。');}
  if(p.lock==='vault'&&!s.flags.vault)return say(s,'柜号不符。检查值守章，与拓片组合后在门旁使用。');
  s.room=p.to;s.player.x=p.tx;s.player.y=p.ty;s.player.angle=Math.atan2(7-p.ty,10-p.tx);s.aim=false;s.transition=.4;s.stats.doors++;if(!s.visited.includes(s.room))s.visited.push(s.room);s.events.push('door');say(s,ROOMS[s.room].subtitle);return;
 }
 switch(p.kind){
 case 'note':if(!s.notes.includes(p.id))s.notes.push(p.id);say(s,NOTES[p.id]);break;
 case 'pickup':if(slots(s.inventory)+ITEMS[p.item].slots>CAPACITY){s.stats.full++;return say(s,'六格放不下'+ITEMS[p.item].name+'；物品仍在原处。组合药布、省下弹盒位置，或回庭院铁柜。');}s.inventory.push(p.item);s.taken.push(p.id);say(s,'收起'+ITEMS[p.item].name+'（占'+ITEMS[p.item].slots+'格）。');break;
 case 'box':s.mode='box';s.aim=false;say(s,'铁柜暂停时间。出门带枪弹或治疗，也可以留空位；物资不再生。');break;
 case 'checkpoint':s.flags.checkpoint=true;s.events.push('checkpoint');say(s,'庭院记录完成。重试会回到此刻的资源与位置。');break;
 case 'exit':say(s,'把封好的调度册带回这里，从背包使用。');break;
 }
}
export function inspect(s,item){if(!s.inventory.includes(item))return;if(item==='badge'){s.flags.badgeChecked=true;say(s,'章背压痕朝北，编号被磨掉。带到档案翼与压印拓片比对。');}else say(s,ITEMS[item].description);}
export function combine(s,a,b){
 if(a===b||!s.inventory.includes(a)||!s.inventory.includes(b))return;const pair=[a,b].sort().join('+');let result;
 if(pair==='badge+rubbing'){if(!s.flags.badgeChecked)return say(s,'先检查值守章背面的压痕。');result='marked';}
 if(pair==='ledger+sleeve')result='wrapped';if(pair==='cloth+herb')result='kit';
 if(pair==='pistol+rounds'){const n=Math.min(4-s.loaded,s.reserve);s.loaded+=n;s.reserve-=n;if(!s.reserve)s.inventory.splice(s.inventory.indexOf('rounds'),1);return say(s,n?'装入'+n+'发；弹仓 '+s.loaded+'/4，盒内 '+s.reserve+'。':'弹仓已满。');}
 if(!result)return say(s,'这两件无法组合。');s.inventory.splice(s.inventory.indexOf(a),1);s.inventory.splice(s.inventory.indexOf(b),1);s.inventory.push(result);say(s,'制成'+ITEMS[result].name+'，当前占格 '+slots(s.inventory)+'/6。');
}
export function useItem(s,item){
 if(!s.inventory.includes(item))return;const p=near(s),consume=()=>s.inventory.splice(s.inventory.indexOf(item),1);
 if(item==='marked'){if(p?.lock!=='vault')return say(s,'到档案翼北侧的干燥室门旁使用。');s.flags.vault=true;return say(s,'柜号吻合，干燥室解锁。对号章仍可寄存。');}
 if(item==='herb'||item==='kit'){if(s.player.hp>=100)return say(s,'体力充足，暂不消耗治疗。');consume();s.player.hp=Math.min(100,s.player.hp+(item==='kit'?60:25));return say(s,'体力恢复至 '+s.player.hp+'。');}
 if(item==='wrapped'){if(p?.id!=='exit')return say(s,'把封好的调度册带回庭院南侧接应台。');consume();s.mode='won';s.aim=false;s.events.push('won');return say(s,'调度册交给接应者。阿遥已安全，雨庭的最后线索也被带出了旧馆。');}
 say(s,ITEMS[item].description);
}
export function transfer(s,item,direction){
 if(s.mode!=='box')return false;const from=direction==='store'?s.inventory:s.box,to=direction==='store'?s.box:s.inventory;
 if(!from.includes(item))return false;if(direction!=='store'&&slots(to)+ITEMS[item].slots>CAPACITY){say(s,'背包六格已满，请先寄存一件。');return false;}
 if(direction==='store'&&s.box.length>=16){say(s,'铁柜已满。');return false;}
 from.splice(from.indexOf(item),1);to.push(item);s.stats.stores++;say(s,(direction==='store'?'寄存':'取出')+ITEMS[item].name+'。');return true;
}
export function objective(s){return s.mode==='won'?'第二段完成 · 调度册已交接':s.inventory.includes('wrapped')?'带封好的调度册回庭院接应台':s.room==='vault'||s.flags.vault?'干燥室取两格调度册，与防潮套组合':s.inventory.includes('marked')?'在档案翼北门使用对号值守章':s.inventory.includes('rubbing')?'检查值守章，与压印拓片组合':'从石廊或花架到档案翼；出门前安排六格';}
export function snapshot(s){const v=copy(s);v.mode=s.mode==='won'?'won':s.mode==='lost'?'lost':'paused';v.aim=false;v.events=[];v.shot=0;return v;}
