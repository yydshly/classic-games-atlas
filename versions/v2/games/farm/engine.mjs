import {CROPS,CHAPTERS,BUILDINGS,weatherAt} from './levels.mjs';
export {CROPS,CHAPTERS,BUILDINGS,weatherAt};
const copy=x=>JSON.parse(JSON.stringify(x));
const phase=(g,s)=>{g.phase=s;g.state=s;};
const current=g=>CHAPTERS[g.chapter-1];
const orderById=id=>CHAPTERS.flatMap(c=>c.orders).find(o=>o.id===id);
function captureEntry(g){g.entry=copy(Object.fromEntries(Object.entries(g).filter(([k])=>!['entry','log','events','revision'].includes(k))));}
export function createGame(){const g={version:2,chapter:1,level:1,chapterStartDay:1,chapterDay:1,deadline:6,day:1,phase:'ready',state:'ready',actions:4,cash:8,plots:Array(4).fill(null),nextPlant:1,plantings:[],batches:[],units:[],completed:[],buildings:[],construction:[],ledger:{seeds:0,income:0,buildings:0},revision:0,log:[],history:[],events:[],reason:null,stats:{actions:0,plants:0,waterings:0,harvests:0,produced:0,delivered:0,orders:0,daysEnded:0,growth:0,dryWaits:0,coldWaits:0,settlements:0}};captureEntry(g);return g;}
export const inventory=g=>Object.fromEntries(Object.keys(CROPS).map(k=>[k,g.units.filter(u=>u.crop===k&&u.place==='inventory').length]));
export const remaining=g=>current(g).orders.filter(o=>!g.completed.some(c=>c.id===o.id)).length;
export const score=g=>Math.max(0,(g.phase==='won'?1000:0)+g.cash*15+(g.deadline-g.day)*40-g.stats.actions*3);
function finished(g){return !remaining(g)&&(!current(g).building||g.buildings.includes(current(g).building));}
export function proposal(g,c){const no=reason=>({ok:false,reason,revision:g.revision});const yes=(title,reason,money=0,actionCost=0)=>({ok:true,title,reason,money,after:g.cash-money,actionCost,actionsAfter:g.actions-actionCost,revision:g.revision});
 if(!c)return no('未知操作。');
 if(c.kind==='start')return g.phase==='ready'?yes('开始农场','第一天有4次行动。'):no('已经开始。');
 if(c.kind==='retry')return g.phase==='lost'?yes('重试本章','恢复进入本章那一刻的农场；之前章节不会回滚。'):no('本章尚未失败。');
 if(c.kind==='next')return g.phase==='chapterComplete'?yes('继续下一章','时间、行动、现金、土地、库存和作物原样保留；今天计为下一章第一天。'):no('请先交齐订单并完成本章建设。');
 if(g.phase!=='playing')return no('请先开始或继续；章节完成后请选择下一章。');
 const w=weatherAt(current(g),g.chapterDay);
 if(c.kind==='end')return yes('结束本日，推进一天',`第${g.day}天·${w.name}：${w.note}${g.day===g.deadline?'这是最后一天；未完成本章将失败。':''}`);
 if(!['plant','water','harvest','deliver','build'].includes(c.kind))return no('未知操作。');
 if(g.actions<=0)return no('今日行动已用完，请结束本日。');
 if(c.kind==='build'){const b=BUILDINGS[c.building];if(!b||b.chapter!==g.chapter)return no('本章没有这项建设。');if(g.buildings.includes(b.id))return no('已经建成，不能重复付款。');if(g.cash<b.cost)return no('建设费用不足，未扣款。');return yes(`建造${b.name}`,b.note,b.cost,1);}
 if(c.kind==='deliver'){const o=current(g).orders.find(o=>o.id===c.order);if(!o)return no('本章没有此订单。');if(g.completed.some(x=>x.id===o.id))return no('此单已经交付，不能重复回款。');const stock=inventory(g);if(Object.entries(o.need).some(([k,n])=>stock[k]<n))return no('仓库份数不足；先收获入仓，再整单交付。');return yes(`交付${o.title}`,Object.entries(o.need).map(([k,n])=>`${CROPS[k].name}${n}份`).join(' + ')+` → 回款${o.reward}币。`,-o.reward,1);}
 if(!Number.isInteger(c.plot)||c.plot<0||c.plot>=g.plots.length)return no('请选择一块土地。');const p=g.plots[c.plot];
 if(c.kind==='plant'){if(p)return no('这块地已有作物。');const t=Object.hasOwn(CROPS,c.crop)&&CROPS[c.crop];if(!t)return no('未知作物。');if(g.cash<t.cost)return no('种子费不足；未扣款。');return yes(`种下${t.name}`,`${t.days}次有效生长后收${t.yield}份；自带1格水。`,t.cost,1);}
 if(!p)return no('这里是空地。');const t=CROPS[p.crop];
 if(c.kind==='harvest'){if(p.age<t.days)return no(`还差${t.days-p.age}次有效生长。`);if(g.batches.some(b=>b.id===p.id))return no('这株已经收过。');return yes(`收获${t.name}`,`${t.yield}份入仓。`,0,1);}
 if(p.age>=t.days)return no('已经成熟，请收获。');if(p.moisture>=2)return no('已有2格水。');if(w.rain)return no('今天细雨自动补水，无需浇水。');return yes(`照料${t.name}`,`水分${p.moisture} → 2格。${w.cold&&!t.hardy?'寒潮保水停长。':''}`,0,1);
}
function settle(g,s,reason){phase(g,s);g.reason=reason;g.stats.settlements++;g.events.push({type:s});}
export function act(g,c,revision=g.revision){if(!c||revision!==g.revision||!proposal(g,c).ok)return false;let saved;
 if(c.kind==='start'){phase(g,'playing');saved={kind:'start'};}
 else if(c.kind==='retry'){const entry=copy(g.entry),log=g.log,rev=g.revision;Object.assign(g,copy(entry));g.entry=entry;g.log=log;g.revision=rev;g.events=[];phase(g,'playing');g.reason=null;saved={kind:'retry'};}
 else if(c.kind==='next'){g.chapter++;g.level=g.chapter;g.chapterStartDay=g.day;g.chapterDay=1;g.deadline=g.day+current(g).limit-1;phase(g,'playing');g.reason=null;saved={kind:'next'};}
 else if(c.kind==='end'){const w=weatherAt(current(g),g.chapterDay);for(const p of g.plots){if(!p||p.age>=CROPS[p.crop].days)continue;if(w.rain)p.moisture=2;if(w.cold&&!CROPS[p.crop].hardy){g.stats.coldWaits++;continue;}if(p.moisture){p.moisture--;p.age++;g.stats.growth++;g.events.push({type:'growth',plant:p.id,crop:p.crop});}else{g.stats.dryWaits++;g.events.push({type:'dry',plant:p.id});}}g.stats.daysEnded++;if(g.day>=g.deadline)settle(g,'lost',`第${g.day}天结束，本章期限已到。`);else{g.day++;g.chapterDay++;g.actions=4;}saved={kind:'end'};}
 else {g.actions--;g.stats.actions++;
 if(c.kind==='plant'){const t=CROPS[c.crop],p={id:g.nextPlant++,crop:c.crop,age:0,moisture:1,plantedDay:g.day};g.plots[c.plot]=p;g.plantings.push({id:p.id,crop:p.crop,plot:c.plot,day:g.day,cost:t.cost});g.cash-=t.cost;g.ledger.seeds+=t.cost;g.stats.plants++;saved={kind:'plant',plot:c.plot,crop:c.crop};}
 else if(c.kind==='water'){g.plots[c.plot].moisture=2;g.stats.waterings++;saved={kind:'water',plot:c.plot};}
 else if(c.kind==='harvest'){const p=g.plots[c.plot],t=CROPS[p.crop];g.batches.push({id:p.id,crop:p.crop,yield:t.yield,plot:c.plot,day:g.day});for(let n=1;n<=t.yield;n++)g.units.push({id:`${p.id}:${n}`,batch:p.id,crop:p.crop,place:'inventory',order:null});g.plots[c.plot]=null;g.stats.harvests++;g.stats.produced+=t.yield;saved={kind:'harvest',plot:c.plot};}
 else if(c.kind==='build'){const b=BUILDINGS[c.building];g.cash-=b.cost;g.ledger.buildings+=b.cost;g.buildings.push(b.id);g.construction.push({id:b.id,day:g.day,cost:b.cost});g.plots.push(...Array(b.plots).fill(null));saved={kind:'build',building:b.id};}
 else if(c.kind==='deliver'){const o=current(g).orders.find(o=>o.id===c.order),ids=[];for(const[k,n]of Object.entries(o.need)){for(const u of g.units.filter(u=>u.crop===k&&u.place==='inventory').slice(0,n)){u.place='delivered';u.order=o.id;ids.push(u.id);}}g.completed.push({id:o.id,chapter:g.chapter,day:g.day,units:ids});g.cash+=o.reward;g.ledger.income+=o.reward;g.stats.delivered+=ids.length;g.stats.orders++;saved={kind:'deliver',order:o.id};}
 if(finished(g))settle(g,g.chapter===CHAPTERS.length?'won':'chapterComplete',g.chapter===CHAPTERS.length?'三章订单全部完成，邻居们来庭院相聚。':'本章订单与建设完成；确认后原样进入下一章。');
 }
 g.revision++;g.log.push(saved);if(saved.kind!=='retry')g.history.push(saved);g.events.push({type:saved.kind});if(saved.kind==='next')captureEntry(g);return true;
}
export function pause(g){if(g.phase==='playing'){phase(g,'paused');g.revision++;return true;}if(g.phase==='paused'){phase(g,'playing');g.revision++;return true;}return false;}
export const snapshot=g=>copy(Object.fromEntries(Object.entries(g).filter(([k])=>k!=='events')));
export function checkpoint(g){return{version:2,game:'continuous-farm-v2',phase:g.phase,revision:g.revision,commands:copy(g.log)};}
export function restore(c){try{if(!c||c.version!==2||c.game!=='continuous-farm-v2'||!Array.isArray(c.commands)||c.commands.length>10000||!Number.isInteger(c.revision)||c.revision<c.commands.length)return null;const g=createGame();for(const cmd of c.commands)if(!act(g,cmd))return null;if(c.phase!==(g.phase==='playing'&&c.phase==='paused'?'paused':g.phase))return null;g.revision=c.revision;if(g.phase==='playing')phase(g,'paused');g.events=[];if(!Object.values(conservation(g)).every(Boolean))return null;return g;}catch{return null;}}
export function conservation(g){const batches=g.batches.map(b=>b.id),plants=g.plantings.map(p=>p.id),ids=g.units.map(u=>u.id),used=g.completed.flatMap(o=>o.units),live=g.plots.filter(Boolean);return{
 cashMatches:g.cash===8-g.ledger.seeds-g.ledger.buildings+g.ledger.income,
 nonnegative:g.cash>=0&&g.actions>=0&&g.actions<=4,
 seedLedger:g.ledger.seeds===g.plantings.reduce((a,p)=>a+CROPS[p.crop].cost,0)&&g.stats.plants===plants.length,
 actionLedger:g.stats.actions===g.history.filter(c=>['plant','water','harvest','deliver','build'].includes(c.kind)).length,
 uniquePlants:new Set(plants).size===plants.length&&g.nextPlant===plants.length+1&&live.every(p=>plants.includes(p.id))&&new Set(live.map(p=>p.id)).size===live.length&&plants.every(id=>live.some(p=>p.id===id)||batches.includes(id)),
 uniqueHarvest:new Set(batches).size===batches.length&&g.stats.harvests===batches.length&&live.every(p=>!batches.includes(p.id))&&batches.every(id=>plants.includes(id)),
 allProduced:g.units.length===g.batches.reduce((a,b)=>a+b.yield,0)&&g.stats.produced===g.units.length&&g.batches.every(b=>b.yield===CROPS[b.crop].yield&&g.units.filter(u=>u.batch===b.id&&u.crop===b.crop).length===b.yield),
 uniqueUnits:new Set(ids).size===ids.length&&g.units.every(u=>['inventory','delivered'].includes(u.place)&&batches.includes(u.batch)),
 orderConservation:new Set(used).size===used.length&&g.completed.every(c=>{const o=orderById(c.id);return o&&Object.entries(o.need).every(([k,n])=>c.units.filter(id=>g.units.some(u=>u.id===id&&u.crop===k&&u.place==='delivered'&&u.order===o.id)).length===n)&&c.units.length===Object.values(o.need).reduce((a,b)=>a+b,0);})&&g.units.filter(u=>u.place==='delivered').every(u=>used.includes(u.id))&&g.stats.delivered===used.length,
 uniqueOrders:new Set(g.completed.map(o=>o.id)).size===g.completed.length&&g.stats.orders===g.completed.length&&g.ledger.income===g.completed.reduce((a,c)=>a+orderById(c.id).reward,0),
 buildingLedger:new Set(g.buildings).size===g.buildings.length&&g.construction.length===g.buildings.length&&g.construction.every(b=>g.buildings.includes(b.id)&&b.cost===BUILDINGS[b.id].cost)&&g.ledger.buildings===g.buildings.reduce((a,id)=>a+BUILDINGS[id].cost,0)&&g.plots.length===4+g.buildings.reduce((a,id)=>a+BUILDINGS[id].plots,0),
 growthBounds:live.every(p=>Number.isInteger(p.age)&&p.age>=0&&p.age<=CROPS[p.crop].days&&Number.isInteger(p.moisture)&&p.moisture>=0&&p.moisture<=2),
 chapterClock:g.chapterDay===g.day-g.chapterStartDay+1&&g.deadline===g.chapterStartDay+current(g).limit-1&&g.day<=g.deadline,
 phaseMatches:g.phase===g.state&&(!['won','chapterComplete'].includes(g.phase)||finished(g))
 };}
