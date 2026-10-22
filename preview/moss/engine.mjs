import {LEVELS,TOOLS} from './levels.mjs';
export {LEVELS,TOOLS};
export const STEP=.05,SPEED=1.25,MAX_FALL=2.2;
const clone=v=>JSON.parse(JSON.stringify(v)),solid=c=>['#',':','='].includes(c),terminal=g=>g.state==='won'||g.state==='lost';
export const tileAt=(g,x,y)=>g.grid.tiles[y]?.[x]??'#';
const setTile=(g,x,y,ch)=>{const row=g.grid.tiles[y];g.grid.tiles[y]=row.slice(0,x)+ch+row.slice(x+1);};
const event=(g,text)=>{g.events.push({time:g.time,text});if(g.events.length>12)g.events.shift();};
function spawnActor(g){const id=++g.spawned;g.actors.push({id,name:'苔灯 '+id,color:['#dbaf72','#8fb69b','#a7aecb'][id%3],x:g.spawn.x,y:g.spawn.y,dir:g.spawn.dir,state:'walking',job:null,vy:0,fallStart:g.spawn.y,turnCooldown:0});}
export function createGame(index=0){if(!Number.isInteger(index)||!LEVELS[index])throw new RangeError('不存在这段归途');const l=LEVELS[index],g={version:1,level:l.id,title:l.name,brief:l.brief,state:'ready',time:0,ticks:0,accumulator:0,limit:l.limit,grid:{width:24,height:12,tiles:[...l.grid]},spawn:clone(l.spawn),exit:clone(l.exit),total:l.total,quota:l.quota,spawned:0,spawnClock:l.interval,rescued:0,lost:0,actors:[],resources:clone(l.resources),stats:{blocks:0,bridges:0,digs:0,releases:0},log:[],events:[],reason:'先看清断口和出口，开始后也可以暂停安排。'};spawnActor(g);return g;}
export function start(g){if(g.state==='ready'||g.state==='paused'){g.state='playing';g.reason='同伴会自主前行；暂停时也可以安排工具。';return true;}return false;}
export function pause(g){if(g.state==='playing'){g.state='paused';g.reason='已暂停；可以查看同伴并施令，计时和作业都已停住。';return true;}if(g.state==='paused')return start(g);return false;}
function standing(g,a){return Math.abs(a.y-Math.round(a.y))<.001&&solid(tileAt(g,Math.floor(a.x),Math.round(a.y)));}
export function inspect(g,id,tool){
 const no=reason=>({ok:false,reason,cost:0,preview:[]}),a=g.actors.find(a=>a.id===id);
 if(!['playing','paused'].includes(g.state))return no('开始或继续这一程后才能施令。');if(!a||['rescued','lost'].includes(a.state))return no('请选择仍在归途上的同伴。');if(!TOOLS[tool])return no('请选择已有工具。');
 if(tool==='release')return a.state==='blocking'?{ok:true,reason:'免费放行，沿驻足前的方向继续。',cost:0,preview:[]}:no('只有驻足挡员可以放行。');
 if(a.state!=='walking'||!standing(g,a))return no(a.state==='blocking'?'这位同伴正在挡路，先免费放行。':'这位同伴正在施工或坠落，暂时不能接新工具。');
 if(g.resources[tool]<=0)return no('这一程的'+TOOLS[tool].name+'次数已经用完。');
 if(tool==='block')return {ok:true,reason:'站定后会让从两侧接近的同伴转向；请记得放行。',cost:1,preview:[{x:Math.floor(a.x),y:Math.floor(a.y-.45)}]};
 const x=Math.floor(a.x),y=Math.round(a.y),cells=[];
 if(tool==='bridge'){
  for(let i=1;i<=4;i++){const tx=x+a.dir*i,c=tileAt(g,tx,y);if(solid(c)){if(!cells.length)return no('前方地面完整，不需要架桥。');break;}if(i===4)return no('断口超过3格，这份材料跨不过去。');if(solid(tileAt(g,tx,y-1))||tileAt(g,tx,y-1)==='~')return no('断口上方有障碍，不能沿这里搭桥。');cells.push({x:tx,y});}
 }else if(tool==='dig'){
  for(let i=1;i<=4;i++){const tx=x+a.dir*i,c=tileAt(g,tx,y-1);if(c!==':'){if(!cells.length)return no(c==='#'?'石墙不能开土。':'前方没有连续土墙。');if(solid(c))return no('土墙后仍是硬障碍，不能挖出通路。');break;}if(i===4)return no('土墙超过3格，这次工具挖不通。');cells.push({x:tx,y:y-1});}
 }
 if(!cells.length)return no('这里没有合适的施工目标。');if(g.actors.some(b=>b.job&&b.job.cells.some(p=>cells.some(c=>c.x===p.x&&c.y===p.y))))return no('已有同伴在这段施工，不能重复花材料。');
 return {ok:true,reason:tool==='bridge'?'可跨'+cells.length+'格；整桥完成前仍是断口。':'可开通'+cells.length+'格土墙；不会挖掉地板。',cost:1,preview:cells,duration:cells.length*.7};
}
export function assign(g,id,tool){const check=inspect(g,id,tool);if(!check.ok)return check;const a=g.actors.find(a=>a.id===id);if(tool==='release'){a.state='walking';g.stats.releases++;}else{g.resources[tool]--;if(tool==='block'){a.state='blocking';g.stats.blocks++;}else{a.state=tool==='bridge'?'bridging':'digging';a.job={tool,remaining:check.duration,duration:check.duration,cells:clone(check.preview)};g.stats[tool==='bridge'?'bridges':'digs']++;}}g.log.push({time:g.time,actorId:id,tool,cells:clone(check.preview)});event(g,a.name+'：'+TOOLS[tool].name);return {...check,reason:tool==='release'?'已免费放行。':tool==='block'?'已驻足；记得在安全后放行。':'开始施工，暂停时进度也会停止。'};}
function lose(g,a,why){if(['lost','rescued'].includes(a.state))return;a.state='lost';a.job=null;g.lost++;event(g,a.name+'失足：'+why);}
function horizontal(g,a,dt){const next=a.x+a.dir*SPEED*dt,row=Math.floor(a.y-.45),lead=Math.floor(next+a.dir*.2);if(solid(tileAt(g,lead,row))){a.dir=-a.dir;return;}
 for(const b of g.actors)if(b.id!==a.id&&b.state==='blocking'&&Math.abs(b.y-a.y)<.35&&(b.x-a.x)*a.dir>0&&(b.x-next)*a.dir<=.56){a.x=b.x-a.dir*.56;a.dir=-a.dir;a.turnCooldown=.25;return;}a.x=next;
}
function actorStep(g,a,dt){
 if(['rescued','lost','blocking'].includes(a.state))return;
 if(a.job){a.job.remaining=Math.max(0,Math.round((a.job.remaining-dt)*1000)/1000);if(a.job.remaining<=0){for(const p of a.job.cells)setTile(g,p.x,p.y,a.job.tool==='bridge'?'=':'.');event(g,a.name+'完工，通路已开放。');a.job=null;a.state='walking';}return;}
 a.turnCooldown=Math.max(0,a.turnCooldown-dt);horizontal(g,a,dt);
 const underX=Math.floor(a.x);if(tileAt(g,underX,Math.floor(a.y+.01))==='~'||tileAt(g,underX,Math.floor(a.y-.45))==='~'){lose(g,a,'落入水隙');return;}
 if(a.state==='walking'&&!standing(g,a)){a.state='falling';a.vy=0;a.fallStart=a.y;}
 if(a.state==='falling'){const before=a.y;a.vy=Math.min(7,a.vy+8*dt);const next=a.y+a.vy*dt;let landed=false;for(let y=Math.ceil(before-.00001);y<=Math.floor(next+.00001);y++){const tile=tileAt(g,underX,y);if(tile==='~'){lose(g,a,'落入水隙');return;}if(solid(tile)){a.y=y;a.vy=0;landed=true;if(y-a.fallStart>MAX_FALL){lose(g,a,'落差超过安全高度');return;}a.state='walking';break;}}if(!landed)a.y=next;if(a.y>g.grid.height+.5){lose(g,a,'离开了归途');return;}}
 if(a.state==='walking'&&Math.abs(a.x-g.exit.x)<.45&&Math.abs(a.y-g.exit.y)<.2){a.state='rescued';a.job=null;g.rescued++;event(g,a.name+'抵达苔灯门。');}
}
function settle(g){if(g.spawned===g.total&&g.rescued+g.lost===g.total){g.state=g.rescued>=g.quota?'won':'lost';g.reason=g.state==='won'?'全部同伴已有去向，救回'+g.rescued+'/'+g.total+'，达到'+g.quota+'人的目标。':'所有同伴已有去向，未达到救援目标。';event(g,g.reason);}else if(g.time>=g.limit){g.state='lost';g.reason='归途时间结束；还有同伴未抵达，重试这一程可以重新安排。';event(g,g.reason);}}
function tick(g){g.ticks++;g.time=Math.round(g.ticks*STEP*100)/100;if(g.spawned<g.total){g.spawnClock-=STEP;while(g.spawned<g.total&&g.spawnClock<=.00001){spawnActor(g);g.spawnClock+=LEVELS[g.level-1].interval;}if(g.spawned===g.total)g.spawnClock=Math.max(0,g.spawnClock);}for(const a of g.actors)actorStep(g,a,STEP);settle(g);}
export function update(g,dt){if(g.state!=='playing'||!Number.isFinite(dt)||dt<=0)return;g.accumulator+=Math.min(dt,.1);while(g.accumulator+1e-9>=STEP&&g.state==='playing'){g.accumulator-=STEP;tick(g);}g.accumulator=Math.max(0,g.accumulator);}
export const snapshot=g=>clone(g);
export const checkpoint=g=>snapshot(g);
export function restore(value){
 try{
  const l=LEVELS[value?.level-1];if(!l||!Number.isInteger(value.level))return null;const g=clone(value),base=createGame(g.level-1),int=v=>Number.isSafeInteger(v)&&v>=0,finite=Number.isFinite,eq=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
  if(g.version!==1||g.title!==l.name||g.brief!==l.brief||!['ready','playing','paused','won','lost'].includes(g.state)||!int(g.ticks)||g.time!==Math.round(g.ticks*STEP*100)/100||g.time>l.limit||!finite(g.accumulator)||g.accumulator<0||g.accumulator>.100001||g.limit!==l.limit||g.total!==l.total||g.quota!==l.quota||!eq(g.spawn,l.spawn)||!eq(g.exit,l.exit)||!int(g.spawned)||g.spawned<1||g.spawned>g.total||!finite(g.spawnClock)||g.spawnClock<0||g.spawnClock>l.interval+.00001||!int(g.rescued)||!int(g.lost)||!Array.isArray(g.actors)||g.actors.length!==g.spawned||!g.grid||g.grid.width!==24||g.grid.height!==12||!Array.isArray(g.grid.tiles)||g.grid.tiles.length!==12||g.grid.tiles.some(row=>typeof row!=='string'||row.length!==24||/[^#:.~=]/.test(row))||!Array.isArray(g.log)||typeof g.reason!=='string')return null;
  const used={block:0,bridge:0,dig:0,release:0},expected=[...l.grid];let previous=0;
  for(const order of g.log){if(!TOOLS[order.tool]||!finite(order.time)||order.time<previous||order.time>g.time||!Number.isInteger(order.actorId)||order.actorId<1||order.actorId>g.spawned||!Array.isArray(order.cells))return null;previous=order.time;used[order.tool]++;
   if(order.tool==='release'&&order.cells.length!==0||order.tool==='block'&&order.cells.length!==1||['bridge','dig'].includes(order.tool)&&(order.cells.length<1||order.cells.length>3))return null;
   for(let i=0;i<order.cells.length;i++){const p=order.cells[i];if(!Number.isInteger(p.x)||!Number.isInteger(p.y)||p.x<1||p.x>22||p.y<1||p.y>11||i>0&&(p.y!==order.cells[i-1].y||Math.abs(p.x-order.cells[i-1].x)!==1)||i>1&&p.x-order.cells[i-1].x!==order.cells[i-1].x-order.cells[i-2].x)return null;}
  }
  if(!g.resources||!['block','bridge','dig'].every(tool=>int(g.resources[tool])&&g.resources[tool]===l.resources[tool]-used[tool])||!g.stats||g.stats.blocks!==used.block||g.stats.bridges!==used.bridge||g.stats.digs!==used.dig||g.stats.releases!==used.release||used.release>used.block)return null;
  const activeCells=new Set();
  for(let i=0;i<g.actors.length;i++){const a=g.actors[i];if(a.id!==i+1||a.name!=='苔灯 '+a.id||typeof a.color!=='string'||!finite(a.x)||a.x<0||a.x>24||!finite(a.y)||a.y<0||a.y>13||![1,-1].includes(a.dir)||!['walking','blocking','bridging','digging','falling','rescued','lost'].includes(a.state)||!finite(a.vy)||a.vy<0||a.vy>7||!finite(a.fallStart)||a.fallStart<0||a.fallStart>12||!finite(a.turnCooldown)||a.turnCooldown<0||a.turnCooldown>.250001)return null;
   if(['walking','blocking','bridging','digging'].includes(a.state)&&(!standing(g,a)||solid(tileAt(g,Math.floor(a.x),Math.floor(a.y-.45)))))return null;
   if(a.state==='rescued'&&(Math.abs(a.x-g.exit.x)>=.45||Math.abs(a.y-g.exit.y)>=.2))return null;
   if(a.job){const j=a.job,tool=a.state==='bridging'?'bridge':a.state==='digging'?'dig':null;if(!tool||j.tool!==tool||!Array.isArray(j.cells)||j.cells.length<1||j.cells.length>3||j.duration!==j.cells.length*.7||!finite(j.remaining)||j.remaining<=0||j.remaining>j.duration+.00001||!g.log.some(o=>o.actorId===a.id&&o.tool===j.tool&&eq(o.cells,j.cells)))return null;
    for(const p of j.cells){const k=p.x+','+p.y;if(activeCells.has(k))return null;activeCells.add(k);}
   }else if(['bridging','digging'].includes(a.state))return null;
  }
  for(const order of g.log)if(['bridge','dig'].includes(order.tool)){
   for(const p of order.cells){const old=l.grid[p.y][p.x];if(order.tool==='bridge'&&!['.','~'].includes(old)||order.tool==='dig'&&old!==':')return null;}
   const active=g.actors.some(a=>a.id===order.actorId&&a.job?.tool===order.tool&&eq(a.job.cells,order.cells));if(!active)for(const p of order.cells){const row=expected[p.y];expected[p.y]=row.slice(0,p.x)+(order.tool==='bridge'?'=':'.')+row.slice(p.x+1);}
  }
  if(g.spawned!==Math.min(g.total,1+Math.floor((g.time+.00001)/l.interval))||!eq(g.grid.tiles,expected)||g.rescued!==g.actors.filter(a=>a.state==='rescued').length||g.lost!==g.actors.filter(a=>a.state==='lost').length||g.actors.filter(a=>a.state==='blocking').length!==used.block-used.release||!Array.isArray(g.events)||g.events.length>12||g.events.some(e=>!finite(e.time)||e.time<0||e.time>g.time||typeof e.text!=='string'))return null;
  const complete=g.spawned===g.total&&g.rescued+g.lost===g.total,success=complete&&g.rescued>=g.quota;
  if(g.state==='won'&&!success||g.state==='lost'&&(success||!complete&&g.time<g.limit)||!['won','lost'].includes(g.state)&&(complete||g.time>=g.limit)||g.state==='ready'&&(g.time!==0||g.log.length||g.spawned!==1))return null;
  if(g.state==='playing'){g.state='paused';g.reason='归途已恢复；继续后同伴和施工才会前进。';}return g;
 }catch{return null;}
}
