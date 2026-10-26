import {ROOMS,ITEMS,NOTES,CAPACITY,distance,walkable} from './world.mjs?v=echoes-slice-1';
export const FIXED_STEP=1/60;
const copy=x=>structuredClone(x);
export function createGame(){return {schema:1,room:'hall',player:{x:10,y:8.8,angle:-Math.PI/2,hp:100,invulnerable:0},inventory:['pistol','rounds','herb','cloth','flare'],box:['herb','cloth'],loaded:4,reserve:5,flags:{},taken:[],notes:[],visited:['hall'],enemy:{x:10,y:6,hp:4,cooldown:0,stun:0,windup:0,target:null},rescued:false,mode:'intro',message:'找到阿遥，修复撤离线索，再一起回门厅。',elapsed:0,cooldown:0,transition:0,aim:false,shot:0,stats:{shots:0,hits:0,damage:0,distance:0,doors:0,stores:0,full:0},events:[]};}
export function say(s,message){s.message=message;}
export function near(s){return [...ROOMS[s.room].props.filter(p=>!s.taken.includes(p.id)),...ROOMS[s.room].doors].filter(p=>distance(s.player,p)<1.3).sort((a,b)=>distance(s.player,a)-distance(s.player,b))[0]||null;}
function move(s,actor,dx,dy,r=.26,blockEnemy=false){
 const legal=(x,y)=>walkable(s.room,x,y,r)&&!(blockEnemy&&s.room==='corridor'&&s.enemy.hp>0&&Math.hypot(s.enemy.x-x,s.enemy.y-y)<.56);
 const ox=actor.x,oy=actor.y;
 if(legal(actor.x+dx,actor.y))actor.x+=dx;
 if(legal(actor.x,actor.y+dy))actor.y+=dy;
 return Math.hypot(actor.x-ox,actor.y-oy);
}
function rayClear(s,a,b){const n=Math.ceil(distance(a,b)*8);for(let i=1;i<n;i++)if(!walkable(s.room,a.x+(b.x-a.x)*i/n,a.y+(b.y-a.y)*i/n,.05))return false;return true;}
function shoot(s){
 if(!s.aim||s.cooldown>0)return;
 if(!s.inventory.includes('pistol'))return say(s,'信号枪不在背包里。');
 if(!s.loaded)return say(s,'弹仓空了。打开背包，把镇止弹盒与枪组合装填。');
 s.loaded--;s.stats.shots++;s.cooldown=.62;s.shot=.12;s.events.push('shot');
 if(s.room==='corridor'&&s.enemy.hp>0){const e=s.enemy,d=distance(s.player,e),angle=Math.atan2(e.y-s.player.y,e.x-s.player.x),delta=Math.atan2(Math.sin(angle-s.player.angle),Math.cos(angle-s.player.angle));
  if(d<8&&Math.abs(delta)<.17&&rayClear(s,s.player,e)){e.hp--;e.stun=.35;e.windup=0;s.stats.hits++;say(s,e.hp?'镇止弹命中，巡馆偶短暂停顿。':'巡馆偶停止了。这条常用通道现在可以安全回访。');}else say(s,'弹丸落在地面。举枪后先调整朝向。');
 }else say(s,'枪声消散。弹药不会恢复。');
}
function enemyStep(s,dt){
 const e=s.enemy;if(e.hp<=0||s.room!=='corridor')return;
 e.cooldown=Math.max(0,e.cooldown-dt);e.stun=Math.max(0,e.stun-dt);if(e.stun>0)return;
 const d=distance(e,s.player);
 if(e.windup>0){e.windup=Math.max(0,e.windup-dt);if(e.windup===0){if(d<1.02&&s.player.invulnerable<=0){s.player.hp=Math.max(0,s.player.hp-25);s.player.invulnerable=1.5;s.stats.damage+=25;s.events.push('hurt');say(s,'被巡馆偶推倒：体力 −25。趁它收势离开，或留出距离举枪。');}e.cooldown=1.4;}return;}
 if(d<.87&&e.cooldown<=0){e.windup=.65;return;}
 if(d<7&&rayClear(s,e,s.player))e.target={x:s.player.x,y:s.player.y};
 if(e.target){const len=distance(e,e.target);if(len>.12)move(s,e,(e.target.x-e.x)/len*.82*dt,(e.target.y-e.y)/len*.82*dt,.29);else e.target=null;}
}
export function tick(s,input={},dt=FIXED_STEP){
 if(s.mode!=='playing')return s;dt=Math.min(Math.max(dt,0),.05);s.elapsed+=dt;s.cooldown=Math.max(0,s.cooldown-dt);s.shot=Math.max(0,s.shot-dt);s.player.invulnerable=Math.max(0,s.player.invulnerable-dt);s.transition=Math.max(0,s.transition-dt);s.aim=!!input.aim;
 let dx=Number(!!input.right)-Number(!!input.left),dy=Number(!!input.down)-Number(!!input.up);const len=Math.hypot(dx,dy);
 if(len){dx/=len;dy/=len;s.player.angle=Math.atan2(dy,dx);if(!s.aim){const speed=s.rescued?2.25:3.15;s.stats.distance+=move(s,s.player,dx*speed*dt,dy*speed*dt,.25,true);}}
 if(input.fire)shoot(s);enemyStep(s,dt);
 if(s.player.hp<=0){s.mode='lost';s.aim=false;say(s,'体力耗尽。可以从值班室记录点重试，或重新开始本次救援。');}
 return s;
}
export function interact(s){
 if(s.mode!=='playing'||s.transition>0)return;const p=near(s);if(!p)return say(s,'走近门、纸页或物品，再按 E 查看。');
 if(p.to){
  if(p.lock==='loop'&&!s.flags.loop){if(s.room!=='greenhouse')return say(s,'门从温室一侧闩住了。');s.flags.loop=true;say(s,'内闩打开。值班室与温室的回环可以双向通行了。');}
  if(p.lock==='archive'&&!s.flags.archive)return say(s,'黄铜锁。检查馆钥，再在门旁使用。');
  if(p.lock==='power'&&!s.flags.power)return say(s,'前室门断电锁闭。先修复档案室北侧电柜。');
  s.room=p.to;s.player.x=p.tx;s.player.y=p.ty;s.player.angle=Math.atan2(7-p.ty,10-p.tx);s.aim=false;s.transition=.4;s.stats.doors++;if(!s.visited.includes(s.room))s.visited.push(s.room);s.events.push('door');say(s,ROOMS[s.room].subtitle);return;
 }
 switch(p.kind){
 case 'note':if(!s.notes.includes(p.id))s.notes.push(p.id);say(s,NOTES[p.id]);break;
 case 'pickup':if(s.inventory.length>=CAPACITY){s.stats.full++;return say(s,'六格已满，物品仍留在原处。组合药叶与净布可省一格，或去值班室寄存。');}s.inventory.push(p.item);s.taken.push(p.id);say(s,'收起'+ITEMS[p.item].name+'。');break;
 case 'box':s.mode='box';s.aim=false;say(s,'铁柜暂停时间。寄存物品不会消失，取回仍需要空格。');break;
 case 'checkpoint':s.flags.checkpoint=true;say(s,'已在灯下记录。重试会回到此刻的资源与房间。');s.events.push('checkpoint');break;
 case 'panel':say(s,s.flags.power?'电柜稳定运转。':'缺一枚修复熔芯。把熔芯与绝缘线组合，再在这里使用。');break;
 case 'patient':say(s,s.rescued?'阿遥：我跟着你，回门厅南座发信标。':'阿遥：给我一个清凉敷包，我就能跟你走。请在这里使用敷包。');break;
 case 'beacon':say(s,s.rescued?'在这里使用背包里的撤离信标。':'先找到并照料阿遥，再一起回到这里。');break;
 }
}
export function inspect(s,item){if(!s.inventory.includes(item))return;if(item==='key'){s.flags.keyChecked=true;say(s,'翻开铭牌：东档案锁 · 槽口向上。现在可以在阅览室东门旁使用馆钥。');}else say(s,ITEMS[item].description);}
export function combine(s,a,b){
 if(a===b||!s.inventory.includes(a)||!s.inventory.includes(b))return;
 const pair=[a,b].sort().join('+');let result;
 if(pair==='cloth+herb')result='kit';if(pair==='fuse+wire')result='repaired';
 if(pair==='pistol+rounds'){
  const n=Math.min(4-s.loaded,s.reserve);s.loaded+=n;s.reserve-=n;if(!s.reserve)s.inventory=s.inventory.filter(i=>i!=='rounds');say(s,n?'装入'+n+'发；弹仓 '+s.loaded+'/4，盒内 '+s.reserve+'。':'弹仓已满。');return;
 }
 if(!result)return say(s,'这两件物品无法组合。');s.inventory.splice(s.inventory.indexOf(a),1);s.inventory.splice(s.inventory.indexOf(b),1);s.inventory.push(result);say(s,'制成'+ITEMS[result].name+'，空出一格。');
}
export function useItem(s,item){
 if(!s.inventory.includes(item))return;const p=near(s),consume=()=>s.inventory.splice(s.inventory.indexOf(item),1);
 if(item==='key'){
  if(!s.flags.keyChecked)return say(s,'先检查钥柄铭牌，确认是哪把锁。');
  if(p?.lock!=='archive')return say(s,'需要站在阅览室东侧的黄铜锁门旁。');
  s.flags.archive=true;return say(s,'档案门已解锁。钥匙仍占一格，可在值班室寄存。');
 }
 if(item==='repaired'){
  if(p?.id!=='panel')return say(s,'在档案室北侧电柜旁使用。');consume();s.flags.power=true;return say(s,'电柜亮起，撤离前室的门锁通电了。');
 }
 if(item==='kit'&&p?.id==='patient'&&!s.rescued){consume();s.rescued=true;return say(s,'阿遥已包扎，能够慢慢跟上。一起回到门厅南座，发出撤离信标。');}
 if(item==='herb'||item==='kit'){
  if(s.player.hp>=100)return say(s,'体力充足，暂不消耗治疗。');const heal=item==='kit'?60:25;consume();s.player.hp=Math.min(100,s.player.hp+heal);return say(s,'体力恢复至 '+s.player.hp+'。留意阿遥还需要敷包。');
 }
 if(item==='flare'){
  if(!s.rescued||p?.id!=='beacon')return say(s,'带阿遥回门厅南侧发射座，再使用信标。');consume();s.mode='won';s.aim=false;s.events.push('won');return say(s,'信标照亮雨檐。接应者已收到位置，你和阿遥一同离开旧馆。');
 }
 say(s,ITEMS[item].description);
}
export function transfer(s,item,direction){
 if(s.mode!=='box')return false;const from=direction==='store'?s.inventory:s.box,to=direction==='store'?s.box:s.inventory;
 if(!from.includes(item))return false;
 if(direction!=='store'&&to.length>=CAPACITY){say(s,'背包六格已满，请先寄存一件。');return false;}
 from.splice(from.indexOf(item),1);to.push(item);s.stats.stores++;say(s,(direction==='store'?'寄存':'取出')+ITEMS[item].name+'。');return true;
}
export function objective(s){return s.mode==='won'?'本段救援完成':s.rescued?'护送阿遥回门厅南座，使用撤离信标':s.flags.power?'进入北侧风口前室，用敷包照料阿遥':s.flags.archive?'寻找熔芯与绝缘线，修复档案室电柜':s.inventory.includes('key')?'检查馆钥，在阅览室东门使用':'到北侧阅览室寻找馆钥；值班室可寄存';}
export function snapshot(s){const v=copy(s);v.mode=s.mode==='won'?'won':s.mode==='lost'?'lost':'paused';v.aim=false;v.events=[];v.shot=0;return v;}
