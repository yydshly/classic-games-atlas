import { LEVELS } from './levels.mjs';
export { LEVELS } from './levels.mjs';
const freeze = value => { if (value && typeof value === 'object' && !Object.isFrozen(value)) { Object.values(value).forEach(freeze); Object.freeze(value); } return value; };
const clone = value => JSON.parse(JSON.stringify(value));
export const WIDTH = 7, HEIGHT = 6, ACTIONS_PER_TURN = 3;
export const ROAD_COSTS = freeze({land:{wood:1},bridge:{wood:3,stone:2}});
export const RESOURCE_NAMES = freeze({ food:'粮食', wood:'木材', stone:'石料', insight:'学识' });
export const BUILDINGS = freeze({
  village:{name:'村庄',cost:{food:8,wood:6,stone:4},terrain:['plain'],produces:null,description:'新增2位居民，向周围2格提供建设范围。'},
  farm:{name:'农田',cost:{wood:3},terrain:['plain'],produces:'food',description:'1位居民：晴天6粮，雨天7粮，干旱3粮，风暴4粮。'},
  lumber:{name:'林场',cost:{wood:2},terrain:['forest'],produces:'wood',description:'1位居民：每轮3木；风暴轮1木。'},
  quarry:{name:'采石场',cost:{wood:3},terrain:['hill'],produces:'stone',description:'1位居民：每轮3石。'},
  study:{name:'书院',cost:{wood:3,stone:2},terrain:['plain'],produces:'insight',description:'1位居民：每轮3学识。'},
  market:{name:'集市',cost:{wood:4,stone:3},terrain:['plain'],produces:null,description:'接通村庄与港口后，每轮花1木1石送达2份货；风暴停航。'},
  beacon:{name:'灯塔',cost:{wood:12,stone:10,insight:8},terrain:['plain','hill'],produces:null,description:'完成全部研究后，在本章指定岬角修建。'},
  port:{name:'港口',cost:{},terrain:['plain'],produces:null,description:'连续道路的终点；风暴时停航。'},
});
export const RESEARCH = freeze({
  harvest:{name:'丰收',cost:{insight:6},description:'每块有居民的农田每轮额外产2粮。'},
  stonecraft:{name:'石工',cost:{insight:6},description:'每座有居民的采石场每轮额外产1石。'},
  navigation:{name:'渡航',cost:{insight:6},description:'允许水上铺桥，也允许从已探索水面继续勘测。'},
});
export const WEATHER = freeze({
  sun:{id:'sun',name:'晴朗',description:'农田6粮，林场3木，港口通航。'},
  rain:{id:'rain',name:'润雨',description:'农田7粮，林场3木，港口通航。'},
  drought:{id:'drought',name:'干旱',description:'农田3粮；提前囤粮或研究丰收。'},
  storm:{id:'storm',name:'风暴',description:'农田4粮，林场1木，港口暂停送货。'},
});
const RESOURCE_KEYS = Object.keys(RESOURCE_NAMES), MAX_COMMANDS = 256;
const zero = () => ({food:0,wood:0,stone:0,insight:0});
const undoStacks = new WeakMap();
const tileAt = (s,id) => Number.isInteger(id) && id >= 0 && id < WIDTH * HEIGHT ? s.tiles[id] : null;
const distance = (a,b) => Math.abs(a.col-b.col)+Math.abs(a.row-b.row);
const neighbors = (s,t) => s.tiles.filter(n=>distance(n,t)===1);
const villages = s => s.tiles.filter(t=>t.building==='village');
const inRange = (s,t) => villages(s).some(v=>distance(v,t)<=2);
const cue = (s,text) => { s.message=text; s.events.push(text); if(s.events.length>10)s.events.shift(); };
const reveal = (s,t) => { t.revealed=true; for(const n of neighbors(s,t))n.revealed=true; };
const validResourceState = s => RESOURCE_KEYS.every(k=>Number.isSafeInteger(s.resources[k])&&s.resources[k]>=0);
const roadNode = t => t.revealed && (t.road || ['village','market','port'].includes(t.building));
function pathsFrom(s, starts) {
  const parents=new Map(), queue=[];
  for(const t of starts){parents.set(t.id,null);queue.push(t.id);}
  for(let i=0;i<queue.length;i++){ const t=s.tiles[queue[i]]; for(const n of neighbors(s,t))if(roadNode(n)&&!parents.has(n.id)){parents.set(n.id,t.id);queue.push(n.id);} }
  return parents;
}
function routeFrom(parents,id){const route=[];while(id!==null&&parents.has(id)){route.push(id);id=parents.get(id);}return route.reverse();}
export function connectivity(s) {
  const fromVillages=pathsFrom(s,villages(s));
  const ports=s.tiles.filter(t=>t.building==='port'&&t.revealed);
  const fromPorts=pathsFrom(s,ports), markets=s.tiles.filter(t=>t.building==='market'&&fromVillages.has(t.id)&&fromPorts.has(t.id));
  return {reachable:[...fromVillages.keys()],connectedMarkets:markets.map(t=>t.id),routes:markets.map(t=>routeFrom(fromPorts,t.id).reverse())};
}
export function createGame(index=0) {
  index=Number.isInteger(index)?Math.max(0,Math.min(LEVELS.length-1,index)):0;
  const level=LEVELS[index], dict={P:'plain',F:'forest',H:'hill',W:'water'};
  const tiles=level.map.flatMap((line,row)=>[...line].map((char,col)=>({id:row*WIDTH+col,col,row,terrain:dict[char],revealed:level.reveal==='all',building:null,worker:false,road:false,landmark:null})));
  const home=tiles[level.village];home.building='village';home.road=true;
  if(level.reveal!=='all')for(const t of tiles)if(distance(t,home)<=level.reveal)t.revealed=true;
  if(level.port!==undefined){tiles[level.port].building='port';tiles[level.port].road=true;}
  for(const init of level.initial){const t=tiles[init.tileId];t.building=init.building;t.worker=!!init.worker;t.revealed=true;}
  for(const landmark of level.landmarks||[])tiles[landmark.tileId].landmark=landmark.name;
  const s={state:'ready',started:false,levelIndex:index,level,turn:1,maxTurns:level.maxTurns,actions:ACTIONS_PER_TURN,resources:clone(level.resources),population:level.population,tiles,research:[],tradeDelivered:0,produced:zero(),harvested:0,droughtsSurvived:0,turnsSettled:0,events:[],history:[],lastTurn:null,lastAction:null,message:level.tip,reason:'',result:null,commandLog:[]};
  undoStacks.set(s,[]);return s;
}
export function start(s){if(s.state==='ready'){s.state='playing';s.started=true;cue(s,'新一轮开始：先查看天气与粮食，再安排三点行动。');}return s;}
export function pause(s){if(s.state==='playing')s.state='paused';return s;}
export function resume(s){if(s.state==='paused'){s.state=s.started?'playing':'ready';if(!s.started)start(s);}return s;}
export function retry(s){const fresh=createGame(s.levelIndex);for(const key of Object.keys(s))delete s[key];Object.assign(s,fresh);undoStacks.set(s,[]);return s;}
const schema={explore:['type','tileId'],build:['type','tileId','building'],assign:['type','tileId','worker'],road:['type','tileId'],research:['type','research'],settle:['type','tileId'],endTurn:['type']};
function canonical(raw){
  if(!raw||typeof raw!=='object'||Array.isArray(raw)||!Object.hasOwn(schema,raw.type))return null;
  const keys=schema[raw.type];if(Object.keys(raw).length!==keys.length||keys.some(k=>!Object.hasOwn(raw,k)))return null;
  if(keys.includes('tileId')&&!Number.isInteger(raw.tileId))return null;
  if(raw.type==='assign'&&typeof raw.worker!=='boolean')return null;
  if(raw.type==='build'&&(typeof raw.building!=='string'||!Object.hasOwn(BUILDINGS,raw.building)))return null;
  if(raw.type==='research'&&(typeof raw.research!=='string'||!Object.hasOwn(RESEARCH,raw.research)))return null;
  return Object.fromEntries(keys.map(k=>[k,raw[k]]));
}
const reject=reason=>({ok:false,reason,cost:{}});
export function canCommand(s,raw){
  const cmd=canonical(raw);if(!cmd)return reject('操作格式无效。');
  if(s.state!=='playing')return reject(s.state==='paused'?'先继续，再安排本轮行动。':['won','lost'].includes(s.state)?'本章已经结束，请重试或选择下一章。':'先开始本章。');
  if(s.commandLog.length>=MAX_COMMANDS)return reject('本章操作记录已满，请重试。');
  if(!validResourceState(s))return reject('资源数据无效，请重试。');
  if(cmd.type==='endTurn')return {ok:true,reason:'',cost:{}};
  if(s.actions<=0)return reject('本轮行动已用完，请结算本轮。');
  let cost={};const t=tileAt(s,cmd.tileId);
  if(cmd.type==='research'){
    if(s.research.includes(cmd.research))return reject('这项研究已经完成。');
    if(!s.tiles.some(n=>n.building==='study'&&n.worker))return reject('先给书院派驻一位居民。');
    cost=RESEARCH[cmd.research].cost;
  }else{
    if(!t)return reject('请选择地图中的格子。');
    if(cmd.type==='explore'){
      if(t.revealed)return reject('这里已经探索过了。');
      if(!neighbors(s,t).some(n=>n.revealed&&(n.terrain!=='water'||s.research.includes('navigation'))))return reject('请从已知陆地边缘开始探索；渡航后可继续勘测水面。');
    }else{
      if(!t.revealed)return reject('先探索这里。');
      if(cmd.type==='assign'){
        if(!t.building||!BUILDINGS[t.building].produces)return reject('只有农田、林场、采石场和书院需要派工。');
        if(t.worker===cmd.worker)return reject(cmd.worker?'这里已经有居民了。':'这里没有居民可以撤回。');
        if(cmd.worker&&s.tiles.filter(n=>n.worker).length>=s.population)return reject('居民都已上岗；先撤回一位，或建立新村。');
      }else if(cmd.type==='road'){
        if(t.road||['village','market','port'].includes(t.building))return reject('这里已经有路面。');
        if(t.terrain==='water'&&!s.research.includes('navigation'))return reject('先研究渡航，才能在水上架桥。');
        cost=t.terrain==='water'?ROAD_COSTS.bridge:ROAD_COSTS.land;
      }else if(cmd.type==='settle'){
        if(t.terrain!=='plain'||t.building)return reject('新村需要一块空旷平原。');
        if(villages(s).length>=2)return reject('每章最多建设两座村庄。');
        if(villages(s).some(v=>distance(v,t)<4))return reject('新村与旧村至少相距4格。');
        const reachable=connectivity(s).reachable;
        if(!t.road||!reachable.includes(t.id))return reject('先铺一条连续道路，把新村选址接到旧村。');
        cost=BUILDINGS.village.cost;
      }else if(cmd.type==='build'){
        if(['village','port'].includes(cmd.building))return reject('村庄使用建村行动；港口是已有设施。');
        if(t.building)return reject('这块地已经有建筑。');
        if(!inRange(s,t))return reject('请在任一村庄2格以内建设。');
        if(!BUILDINGS[cmd.building].terrain.includes(t.terrain))return reject('这种建筑不适合这里的地形。');
        if(cmd.building==='beacon'){
          if(s.level.beaconSite!==t.id)return reject('灯塔只能建在第八章的指定岬角。');
          if(s.research.length!==Object.keys(RESEARCH).length)return reject('先完成丰收、石工和渡航三项研究。');
        }
        cost=BUILDINGS[cmd.building].cost;
      }
    }
  }
  for(const [resource,amount]of Object.entries(cost))if(s.resources[resource]<amount)return {ok:false,reason:`${RESOURCE_NAMES[resource]}不足，需要${amount}。`,cost:clone(cost)};
  return {ok:true,reason:'',cost:clone(cost)};
}
export function previewTurn(s){
  const weather=WEATHER[s.level.weather[Math.min(s.turn-1,s.level.weather.length-1)]],production=zero(),consumption=zero(),tradeCost=zero();
  for(const t of s.tiles.filter(n=>n.worker)){
    if(t.building==='farm')production.food+=({sun:6,rain:7,drought:3,storm:4}[weather.id])+(s.research.includes('harvest')?2:0);
    if(t.building==='lumber')production.wood+=weather.id==='storm'?1:3;
    if(t.building==='quarry')production.stone+=3+(s.research.includes('stonecraft')?1:0);
    if(t.building==='study')production.insight+=3;
  }
  consumption.food=s.population;
  const net=connectivity(s);let tradeGain=0;const tradeRoutes=[];
  if(weather.id!=='storm')for(let i=0;i<net.connectedMarkets.length;i++)if(s.resources.wood+production.wood-tradeCost.wood>=1&&s.resources.stone+production.stone-tradeCost.stone>=1){tradeCost.wood++;tradeCost.stone++;tradeGain+=2;tradeRoutes.push(net.routes[i]);}
  const delta=zero(),after=zero();for(const k of RESOURCE_KEYS){delta[k]=production[k]-consumption[k]-tradeCost[k];after[k]=s.resources[k]+delta[k];}
  return freeze({turn:s.turn,weather:clone(weather),production,consumption,tradeCost,tradeGain,delta,after,shortage:Math.max(0,-after.food),connectedMarkets:net.connectedMarkets,tradeRoutes,nextWeather:clone(WEATHER[s.level.weather[Math.min(s.turn,s.level.weather.length-1)]])});
}
export function objectives(s){
  return s.level.goals.map((g,index)=>{let current=0;
    if(g.kind==='stock')current=s.resources[g.resource];
    if(g.kind==='harvest')current=s.harvested;
    if(g.kind==='produced')current=s.produced[g.resource];
    if(g.kind==='landmarks')current=s.tiles.filter(t=>t.landmark&&t.revealed).length;
    if(g.kind==='trade')current=s.tradeDelivered;
    if(g.kind==='connected')current=connectivity(s).connectedMarkets.length;
    if(g.kind==='villages')current=villages(s).length;
    if(g.kind==='bridges')current=s.tiles.filter(t=>t.terrain==='water'&&t.road).length;
    if(g.kind==='droughts')current=s.droughtsSurvived;
    if(g.kind==='research')current=s.research.length;
    if(g.kind==='staffed')current=s.tiles.filter(t=>t.worker).length;
    if(g.kind==='beacon')current=s.tiles.filter(t=>t.building==='beacon').length;
    return {id:`goal-${index}`,label:g.label,current,target:g.target,complete:current>=g.target};
  });
}
function finish(s,won,reason){s.state=won?'won':'lost';s.reason=reason;s.result={won,reason};cue(s,reason);undoStacks.set(s,[]);}
function settleTurn(s){
  const ledger=clone(previewTurn(s));s.lastTurn=ledger;s.history.push(ledger);if(s.history.length>8)s.history.shift();
  for(const k of RESOURCE_KEYS){s.resources[k]=Math.max(0,ledger.after[k]);s.produced[k]+=ledger.production[k];}
  s.harvested+=ledger.production.food;s.tradeDelivered+=ledger.tradeGain;s.turnsSettled++;
  if(ledger.weather.id==='drought'&&!ledger.shortage)s.droughtsSurvived++;
  undoStacks.set(s,[]);
  if(ledger.shortage){finish(s,false,`第${s.turn}轮缺粮${ledger.shortage}，居民无法继续留守。重新安排农田与粮食储备吧。`);return;}
  if(objectives(s).every(g=>g.complete)){finish(s,true,'本章目标全部达成，潮原又亮起了一处家园。');return;}
  if(s.turn>=s.maxTurns){finish(s,false,`${s.maxTurns}轮已经结束，还有目标未完成。重试时为关键建设留出行动。`);return;}
  cue(s,`第${s.turn}轮结算：收粮${ledger.production.food}、吃粮${ledger.consumption.food}，送达${ledger.tradeGain}份货。`);
  s.turn++;s.actions=ACTIONS_PER_TURN;
}
export function command(s,raw){
  const check=canCommand(s,raw);if(!check.ok)return check;const cmd=canonical(raw);
  if(cmd.type!=='endTurn'){const stack=undoStacks.get(s)||[];stack.push(clone(s));undoStacks.set(s,stack);s.actions--;}
  for(const [resource,amount]of Object.entries(check.cost))s.resources[resource]-=amount;
  const t=tileAt(s,cmd.tileId);s.lastAction={...cmd,turn:s.turn};s.commandLog.push(cmd);
  if(cmd.type==='endTurn')settleTurn(s);
  else if(cmd.type==='explore'){reveal(s,t);cue(s,`${t.landmark?`发现${t.landmark}！`:'海雾散开了。'}已探索${s.tiles.filter(n=>n.revealed).length}/42格。`);}
  else if(cmd.type==='build'){t.building=cmd.building;if(cmd.building==='market')t.road=true;cue(s,`${BUILDINGS[cmd.building].name}建成。${BUILDINGS[cmd.building].produces?'再派驻1位居民才会产出。':''}`);}
  else if(cmd.type==='assign'){t.worker=cmd.worker;cue(s,`${BUILDINGS[t.building].name}${cmd.worker?'已有1位居民上岗。':'的居民已回村待命。'}`);}
  else if(cmd.type==='road'){t.road=true;cue(s,t.terrain==='water'?'桥面铺好了，驮队现在可以越过这一格河面。':'道路铺好了。连续连接集市与港口才能送货。');}
  else if(cmd.type==='research'){s.research.push(cmd.research);cue(s,`研究完成：${RESEARCH[cmd.research].name}。${RESEARCH[cmd.research].description}`);}
  else if(cmd.type==='settle'){t.building='village';t.road=true;s.population+=2;reveal(s,t);cue(s,'第二座村庄落成，两位新居民加入；每轮也要多准备2粮。');}
  return {ok:true,reason:'',cost:check.cost};
}
export function undo(s){
  if(s.state!=='playing')return reject('请在进行中的本轮撤销行动。');
  const stack=undoStacks.get(s)||[];if(!stack.length)return reject('本轮没有可撤销的行动；已经结算的轮次不能撤销。');
  const prior=stack.pop();for(const key of Object.keys(s))delete s[key];Object.assign(s,prior);undoStacks.set(s,stack);return {ok:true,reason:'',cost:{}};
}
export function snapshot(s){return freeze({...clone(s),forecast:clone(previewTurn(s)),objectives:objectives(s),connectivity:connectivity(s),undoAvailable:s.state==='playing'&&(undoStacks.get(s)?.length||0)>0});}
function digest(s){
  const copy=clone(s);copy.state=s.result?s.state:s.started?'playing':'ready';
  let hash=2166136261;for(const char of JSON.stringify(copy)){hash^=char.charCodeAt(0);hash=Math.imul(hash,16777619);}return (hash>>>0).toString(16);
}
export function checkpoint(s){return freeze({version:1,levelIndex:s.levelIndex,started:s.started,commands:clone(s.commandLog),checksum:digest(s)});}
export function restore(raw){
  try{
    if(typeof raw==='string'){if(raw.length>64000)return null;raw=JSON.parse(raw);}
    if(!raw||typeof raw!=='object'||Array.isArray(raw)||Object.keys(raw).sort().join(',')!=='checksum,commands,levelIndex,started,version')return null;
    if(raw.version!==1||!Number.isInteger(raw.levelIndex)||raw.levelIndex<0||raw.levelIndex>=LEVELS.length||typeof raw.started!=='boolean'||typeof raw.checksum!=='string'||!/^[a-f0-9]{1,8}$/.test(raw.checksum)||!Array.isArray(raw.commands)||raw.commands.length>MAX_COMMANDS||(!raw.started&&raw.commands.length))return null;
    const s=createGame(raw.levelIndex);if(raw.started)start(s);
    for(const cmd of raw.commands)if(!command(s,cmd).ok)return null;
    if(digest(s)!==raw.checksum)return null;
    if(s.state==='playing'||s.state==='ready')s.state='paused';
    return s;
  }catch{return null;}
}
