import { ACTIONS, LEVELS } from './levels.mjs';
export { ACTIONS, LEVELS };
const STEP=0.1, WALK=0.3, NEEDS=['hunger','energy','hygiene','mood'];
const clone=v=>JSON.parse(JSON.stringify(v));
const clamp=n=>Math.max(0,Math.min(100,n));
const terminal=g=>g.state==='won'||g.state==='lost';
const xy=p=>p.x+','+p.y;
const event=(g,text)=>{g.events.push({time:g.time,text});if(g.events.length>16)g.events.shift();};
const isFloor=(g,x,y)=>x>=0&&x<g.grid.width&&y>=0&&y<g.grid.height&&!g.grid.walls.some(p=>p.x===x&&p.y===y)&&!g.objects.some(p=>p.x===x&&p.y===y);
function stands(g,o){return [{x:o.x,y:o.y+1},{x:o.x-1,y:o.y},{x:o.x+1,y:o.y},{x:o.x,y:o.y-1}].filter(p=>isFloor(g,p.x,p.y));}
function path(g,from,to){
 const q=[{x:from.x,y:from.y,path:[]}],seen=new Set([xy(from)]);
 for(let n=0;n<q.length;n++){const p=q[n];if(p.x===to.x&&p.y===to.y)return p.path;
  for(const d of [[0,1],[-1,0],[1,0],[0,-1]]){const v={x:p.x+d[0],y:p.y+d[1]};if(isFloor(g,v.x,v.y)&&!seen.has(xy(v))){seen.add(xy(v));q.push({...v,path:[...p.path,v]});}}}
 return null;
}
function refreshStands(g){for(const o of g.objects)o.stands=stands(g,o);}
export function createGame(index=0,layout={}){
 if(!Number.isInteger(index)||!LEVELS[index])throw new RangeError('不存在这一日');
 const l=LEVELS[index],g={version:1,level:index+1,levelId:l.id,title:l.name,brief:l.brief,state:'ready',time:0,limit:l.limit,ticks:0,accumulator:0,nextId:1,
 grid:clone(l.grid),actors:clone(l.actors).map(a=>({...a,current:null,queue:[],completed:{}})),objects:clone(l.objects),meals:0,goals:l.goals.map(([id,label])=>({id,label,done:false})),thresholds:clone(l.thresholds),closure:clone(l.closure??null),gatheringWindow:clone(l.gatheringWindow??null),reason:'先安排今日行动，再开始一天。',events:[]};
 for(const id of ['desk','bench'])if(layout?.[id]){const o=g.objects.find(o=>o.id===id),p=layout[id];if(o.placements.some(v=>v.x===p.x&&v.y===p.y)){o.x=p.x;o.y=p.y;}}
 refreshStands(g);for(const goal of g.goals)goal.done=goalDone(g,goal.id);return g;
}
export function start(g){if(g.state==='ready'||g.state==='paused'){g.state='playing';g.reason='按安排过日子；随时可以暂停调整。';return true;}return false;}
export function pause(g){if(g.state==='playing'){g.state='paused';g.reason='已暂停，时间与需求停止变化。';return true;}return false;}
function removeJob(g,id){for(const a of g.actors){a.queue=a.queue.filter(j=>j.id!==id);if(a.current?.id===id)a.current=null;}for(const o of g.objects)if(o.busyBy===id)o.busyBy=null;}
export function allowedActions(g,actor){return Object.entries(ACTIONS).filter(([,v])=>!v.joint||g.actors.length===2).map(([kind,v])=>({kind,...v,enabled:!terminal(g)&&g.actors.some(a=>a.id===actor),reason:terminal(g)?'今日已结束':''}));}
export function command(g,c){
 const reject=reason=>({ok:false,reason});if(!g||!c||terminal(g))return reject('今日已结束，请重试本日或前往下一日。');
 if(c.type==='place'){
  if(g.state!=='ready')return reject('陈设只能在开始前调整。');const o=g.objects.find(o=>o.id===c.object);
  if(!o||!['desk','bench'].includes(o.type))return reject('只能移动书桌和双人长座。');
  if(!o.placements.some(p=>p.x===c.x&&p.y===c.y))return reject('请选择标示的可用陈设位置。');
  if(g.objects.some(v=>v.id!==o.id&&v.x===c.x&&v.y===c.y)||g.actors.some(a=>a.x===c.x&&a.y===c.y))return reject('该位置已有家具或住户。');
  const old={x:o.x,y:o.y};o.x=c.x;o.y=c.y;refreshStands(g);
  if(g.objects.some(v=>!v.stands.length||g.actors.some(a=>!v.stands.some(s=>path(g,a,s)!==null)))){Object.assign(o,old);refreshStands(g);return reject('此处会挡住通路。');}
  return {ok:true,reason:'陈设已调整，原行动仍指向这件家具。'};
 }
 const a=g.actors.find(a=>a.id===c.actor);if(!a)return reject('请先选择住户。');
 if(c.type==='cancel'){
  const j=c.jobId?[a.current,...a.queue].find(j=>j?.id===c.jobId):a.current??a.queue[0];if(!j)return reject('没有可取消的行动。');
  removeJob(g,j.id);const reason=j.joint?'两人的共同行动均已取消；已用餐食和时间不退回。':'行动已取消；已用餐食和时间不退回。';event(g,reason);return {ok:true,reason};
 }
 if(c.type!=='enqueue'||!ACTIONS[c.kind])return reject('请选择已提供的行动。');
 const spec=ACTIONS[c.kind];if(spec.joint&&g.actors.length!==2)return reject('这项行动需要两位住户。');
 const target=c.target??spec.target,o=g.objects.find(o=>o.id===target&&o.type===spec.target);if(!o)return reject('这件家具不支持该行动。');
 const members=spec.joint?g.actors:[a];if(members.some(a=>a.queue.length+(a.current?1:0)>=3))return reject('每位住户最多安排3项行动（包括正在进行的）。');
 const id='j'+g.nextId++;for(const actor of members)actor.queue.push({id,kind:c.kind,target,joint:!!spec.joint,phase:'waiting',remaining:spec.duration,duration:spec.duration,reason:'等待前面的行动完成',path:[],walkClock:0,started:false});
 return {ok:true,reason:spec.joint?'已同时排入两人的队列；双方到齐才会开始。':'已加入行动队列。',jobId:id};
}
function waitingReason(g,j,o){
 if(o.busyBy&&o.busyBy!==j.id)return '设施正在被另一项行动使用';
 if(j.kind==='cook'&&g.meals>=2)return '餐食已满2份，先吃饭腾出餐台';
 if(j.kind==='cook'&&g.closure&&g.time>=g.closure.start&&g.time<g.closure.end)return '灶台维护中，'+g.closure.end+'秒后可开始';
 if(j.kind==='eat'&&g.meals<1)return '还没有餐食，先安排做饭';
 if(j.kind==='dinner'&&g.meals<2)return '共享晚餐需要2份餐食';
 if(j.kind==='dinner'&&g.gatheringWindow&&g.time<g.gatheringWindow.start)return '相聚时段尚未开始（'+g.gatheringWindow.start+'秒）';
 if(j.kind==='dinner'&&g.gatheringWindow&&g.time>g.gatheringWindow.end)return '相聚时段已结束，今日无法再开始共享晚餐';
 return '';
}
function begin(g,members){
 const j=members[0].current,o=g.objects.find(o=>o.id===j.target);let reason=waitingReason(g,j,o);
 if(!reason&&members.length===2&&members.some(a=>a.current?.id!==j.id))reason='等待同伴完成前面的行动';
 if(reason){for(const a of members)a.current.reason=reason;return;}
 const routes=[];const used=new Set();
 for(const a of members){let best=null;for(const s of o.stands){if(used.has(xy(s)))continue;const p=path(g,a,s);if(p!==null&&(!best||p.length<best.path.length))best={s,path:p};}if(!best){for(const b of members)b.current.reason='家具旁没有可达的空位';return;}used.add(xy(best.s));routes.push(best.path);}
 o.busyBy=j.id;if(j.kind==='eat')g.meals--;if(j.kind==='dinner')g.meals-=2;
 for(let i=0;i<members.length;i++){const k=members[i].current;k.started=true;k.path=routes[i];k.phase=k.path.length?'walking':'waiting';k.reason=k.path.length?'正在走向'+o.name:'等待同伴就位';}
 event(g,members.map(a=>a.name).join('与')+'开始'+ACTIONS[j.kind].label+(j.kind==='eat'?'（使用1份餐食）':j.kind==='dinner'?'（使用2份餐食）':''));
}
function effect(g,members){
 const j=members[0].current;for(const a of members){a.completed[j.kind]=(a.completed[j.kind]??0)+1;const n=a.needs;
  if(j.kind==='eat')n.hunger=clamp(n.hunger+42);if(j.kind==='sleep')n.energy=clamp(n.energy+38);if(j.kind==='wash')n.hygiene=clamp(n.hygiene+42);if(j.kind==='work'){n.energy=clamp(n.energy-9);n.mood=clamp(n.mood-4);}if(j.kind==='relax'){n.mood=clamp(n.mood+28);n.energy=clamp(n.energy+5);}if(j.kind==='chat')n.mood=clamp(n.mood+24);if(j.kind==='dinner'){n.hunger=clamp(n.hunger+42);n.mood=clamp(n.mood+18);}}
 if(j.kind==='cook')g.meals=Math.min(2,g.meals+1);event(g,members.map(a=>a.name).join('与')+'完成'+ACTIONS[j.kind].label);removeJob(g,j.id);
}
function goalDone(g,id){
 if(id==='needs')return g.actors.every(a=>NEEDS.every(k=>a.needs[k]>=g.thresholds[k]));
 if(id.includes('-')){const [actor,kind]=id.split('-');return (g.actors.find(a=>a.id===actor)?.completed[kind]??0)>0;}
 return g.actors.some(a=>(a.completed[id]??0)>0);
}
function goals(g){
 for(const goal of g.goals)goal.done=goalDone(g,goal.id);
 if(g.goals.every(v=>v.done)){g.state='won';g.reason='今日安排完成，窗灯照亮了这段日常。';event(g,g.reason);for(const a of g.actors){a.current=null;a.queue=[];}for(const o of g.objects)o.busyBy=null;}
}
function tick(g){
 g.ticks++;g.time=Math.round(g.ticks*STEP*10)/10;
 for(const a of g.actors){for(const [k,rate]of Object.entries({hunger:.12,energy:.10,hygiene:.06,mood:.05}))a.needs[k]=clamp(a.needs[k]-rate*STEP);if(!a.current&&a.queue.length)a.current=a.queue.shift();}
 const seen=new Set();for(const a of g.actors){const j=a.current;if(!j||seen.has(j.id))continue;seen.add(j.id);
  const members=j.joint?g.actors.filter(v=>v.current?.id===j.id):[a];if(j.joint&&members.length!==2){j.reason='等待同伴完成前面的行动';continue;}if(!j.started)begin(g,members);if(!j.started)continue;
  for(const actor of members){const k=actor.current;if(k.path.length){k.walkClock+=STEP;if(k.walkClock+1e-8>=WALK){k.walkClock-=WALK;const p=k.path.shift();actor.x=p.x;actor.y=p.y;}k.phase=k.path.length?'walking':'waiting';k.reason=k.path.length?'正在走向家具':'等待同伴就位';}}
  if(members.every(actor=>!actor.current.path.length)){for(const actor of members){actor.current.phase='working';actor.current.reason='正在'+ACTIONS[j.kind].label;actor.current.remaining=Math.max(0,Math.round((actor.current.remaining-STEP)*10)/10);}if(j.remaining<=0)effect(g,members);}
 }
 goals(g);if(g.state==='playing'&&(g.time>=g.limit||g.actors.some(a=>a.needs.hunger<=0||a.needs.energy<=0))){g.state='lost';g.reason=g.time>=g.limit?'一天结束了，还有目标未完成。重试本日可重新安排，前日成果会保留。':'饱腹或精力耗尽，需要重新安排本日。';event(g,g.reason);for(const a of g.actors){a.current=null;a.queue=[];}for(const o of g.objects)o.busyBy=null;}
}
export function update(g,dt){if(g.state!=='playing'||!Number.isFinite(dt)||dt<=0)return;g.accumulator+=Math.min(dt,.5);let count=0;while(g.accumulator+1e-8>=STEP&&g.state==='playing'&&count++<6){g.accumulator-=STEP;tick(g);}g.accumulator=Math.max(0,g.accumulator);}
export function snapshot(g){return clone(g);}
export function checkpoint(g){return {format:'windowlife-checkpoint',version:1,game:snapshot(g)};}
export function restore(cp){
 try{
  if(cp?.format!=='windowlife-checkpoint'||cp.version!==1)return null;const s=clone(cp.game),base=createGame(s.level-1);
  if(s.version!==1||s.levelId!==base.levelId||s.title!==base.title||s.brief!==base.brief||typeof s.reason!=='string'||s.reason.length>1000||!['ready','playing','paused','won','lost'].includes(s.state)||!Number.isInteger(s.ticks)||s.ticks<0||s.ticks>base.limit*10||s.time!==s.ticks/10||!Number.isFinite(s.accumulator)||s.accumulator<0||s.accumulator>.50001||!Number.isInteger(s.nextId)||s.nextId<1||!Number.isInteger(s.meals)||s.meals<0||s.meals>2)return null;
  if(JSON.stringify(s.grid)!==JSON.stringify(base.grid)||s.limit!==base.limit||JSON.stringify(s.thresholds)!==JSON.stringify(base.thresholds)||JSON.stringify(s.closure)!==JSON.stringify(base.closure)||JSON.stringify(s.gatheringWindow)!==JSON.stringify(base.gatheringWindow)||s.actors.length!==base.actors.length||s.objects.length!==base.objects.length||new Set(s.actors.map(a=>a.id)).size!==base.actors.length||new Set(s.objects.map(o=>o.id)).size!==base.objects.length)return null;
  for(const o of s.objects){const b=base.objects.find(v=>v.id===o.id);if(!b||o.type!==b.type||o.name!==b.name||!b.placements.some(p=>p.x===o.x&&p.y===o.y)||JSON.stringify(o.placements)!==JSON.stringify(b.placements))return null;}
  refreshStands(s);const ids=new Map();for(const a of s.actors){if(!base.actors.some(b=>b.id===a.id&&b.name===a.name&&b.color===a.color)||!isFloor(s,a.x,a.y)||!Number.isInteger(a.x)||!Number.isInteger(a.y)||!NEEDS.every(k=>Number.isFinite(a.needs[k])&&a.needs[k]>=0&&a.needs[k]<=100)||!a.completed||Object.entries(a.completed).some(([k,v])=>!ACTIONS[k]||!Number.isInteger(v)||v<0)||!Array.isArray(a.queue)||a.queue.length+(a.current?1:0)>3)return null;
   for(const j of [a.current,...a.queue].filter(Boolean)){if(!/^j\d+$/.test(j.id)||Number(j.id.slice(1))>=s.nextId||!ACTIONS[j.kind]||j.target!==ACTIONS[j.kind].target||j.joint!==!!ACTIONS[j.kind].joint||!['walking','waiting','working'].includes(j.phase)||!Number.isFinite(j.remaining)||j.remaining<0||j.remaining>ACTIONS[j.kind].duration||j.duration!==ACTIONS[j.kind].duration||!Array.isArray(j.path)||j.path.some(p=>!Number.isInteger(p.x)||!Number.isInteger(p.y)||!isFloor(s,p.x,p.y))||!Number.isFinite(j.walkClock)||j.walkClock<0||j.walkClock>WALK+.00001||typeof j.started!=='boolean')return null;
    if(typeof j.reason!=='string'||j.reason.length>1000||(a.current!==j||!j.started)&&(j.phase!=='waiting'||j.path.length||j.remaining!==j.duration||j.walkClock!==0))return null;
    let prev=a;for(const p of j.path){if(Math.abs(prev.x-p.x)+Math.abs(prev.y-p.y)!==1)return null;prev=p;}
    if(j.started&&((j.phase==='walking')!==!!j.path.length))return null;ids.set(j.id,[...(ids.get(j.id)??[]),{a:a.id,j,current:a.current===j}]);}}
  for(const [id,list]of ids){const j=list[0].j;if(j.joint){if(list.length!==2||new Set(list.map(v=>v.a)).size!==2||list.some(v=>v.j.kind!==j.kind||v.j.started!==j.started||v.j.remaining!==j.remaining))return null;}else if(list.length!==1)return null;const o=s.objects.find(o=>o.id===j.target);if(j.started&&(!list.every(v=>v.current)||o.busyBy!==id))return null;}
  if(s.objects.some(o=>o.busyBy!==null&&(!ids.has(o.busyBy)||!ids.get(o.busyBy).some(v=>v.j.target===o.id&&v.j.started))))return null;
  if(!Array.isArray(s.goals)||s.goals.length!==base.goals.length||s.goals.some((v,i)=>v.id!==base.goals[i].id||v.label!==base.goals[i].label||typeof v.done!=='boolean')||!Array.isArray(s.events)||s.events.length>16||s.events.some(e=>!Number.isFinite(e.time)||e.time<0||e.time>s.time||typeof e.text!=='string'||e.text.length>1000))return null;
  if(s.state!=='ready'&&s.goals.some(v=>v.done!==goalDone(s,v.id)))return null;if(s.state==='won'&&!s.goals.every(v=>v.done))return null;
  if(s.state==='ready'&&(s.ticks!==0||s.actors.some(a=>a.current)))return null;
  if(terminal(s)&&(s.actors.some(a=>a.current||a.queue.length)||s.objects.some(o=>o.busyBy)))return null;if(s.state==='playing')s.state='paused';s.reason=s.state==='paused'?'已恢复今日安排；继续后时间才会前进。':s.reason;return s;
 }catch{return null;}
}
