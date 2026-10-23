import {neighbors,inspectDig,holeAt,supported} from './engine.mjs';
const same=(a,b)=>a.x===b.x&&a.y===b.y;
export const ORDERS={main:[['inner','low','high'],['left','right','high'],['upperLeft','middleLeft','lower','gate']],alternate:[['high','inner','low'],['high','right','left'],['gate','lower','middleLeft','upperLeft']]};
function inspection(g,dir){return inspectDig(g.state==='paused'?{...g,state:'playing'}:g,dir);}
export function pathSafe(g,target){const q=[{x:g.player.x,y:g.player.y,path:[],cost:0}],costs=new Map([[g.player.y*g.width+g.player.x,0]]);while(q.length){q.sort((a,b)=>a.cost-b.cost);const p=q.shift();if(same(p,target))return p.path;for(const n of neighbors(g,p)){let cost=p.cost+1;for(const e of g.enemies)if(e.state!=='trapped'){const d=Math.abs(e.x-n.x)+Math.abs(e.y-n.y);if(!d)cost+=1000;else if(d===1)cost+=30;else if(d===2)cost+=14;else if(d===3)cost+=6;else if(d===4)cost+=2;}const k=n.y*g.width+n.x;if(cost<(costs.get(k)??Infinity)){costs.set(k,cost);q.push({...n,cost,path:[...p.path,n]});}}}return null;}
function output(g,target,reason){const path=pathSafe(g,target),dir=path?.[0]?.dir;return {dir:dir==='wait'?null:dir||null,input:dir&&dir!=='wait'?{[dir]:true}:{},target,reason};}
function excavate(g,stands,target,reason){if(holeAt(g,target.x,target.y))return output(g,target,reason);let best=null;for(const stand of stands){const path=pathSafe(g,stand);if(!path)continue;let cost=path.length;for(const p of [...path,stand])for(const e of g.enemies)if(e.state!=='trapped'){const d=Math.abs(p.x-e.x)+Math.abs(p.y-e.y);cost+=d===0?1000:d===1?14:d===2?5:0;}if(!best||cost<best.cost)best={...stand,cost};}if(!best)return {dir:null,input:{},target,reason:'先沿侧梯寻找安全接近埋核的落脚点。'};if(same(g.player,best)){const r=inspection(g,best.dig);if(r.ok)return {dir:null,input:{},dig:best.dig,target:r.target,reason};}return output(g,best,reason);}
export function chooseAction(g,variant='main'){
 if(!['playing','paused'].includes(g.state))return {dir:null,input:{}};const alt=variant==='alternate',order=(alt?ORDERS.alternate:ORDERS.main)[g.level-1],next=order.map(id=>g.cores.find(c=>c.id===id)).find(c=>!c.collected);
 if(!next)return output(g,g.exit,'星核已齐，选择未被巡守堵住的回港梯路。');
 if(g.level===1&&next.id==='inner'){
  if(g.player.y===5&&g.player.x>=9&&g.player.x<=13||same(g.player,{x:11,y:6}))return excavate(g,alt?[{x:12,y:5,dig:-1}]:[{x:10,y:5,dig:1}],next,'入口回填也不必退回；在内绳室开第二层，取核后从旁侧下撤。');
  const entry=alt?{x:13,y:5}:{x:9,y:5},stand=alt?{x:14,y:4,dig:-1}:{x:8,y:4,dig:1},inner=alt?{x:12,y:5}:{x:10,y:5};if(holeAt(g,entry.x,entry.y))return output(g,inner,'先落入有绳索的内室，下一层需要另开一洞。');if(same(g.player,stand)){const r=inspection(g,stand.dig);if(r.ok)return {dir:null,input:{},dig:stand.dig,target:r.target,reason:'开上层入口，进入可站稳的内绳室。'};}return output(g,stand,alt?'高索先行后从另一侧进入砖室。':'先走近侧入口，再由下层回环取远核。');
 }
 if(g.level===2&&next.id==='left')return excavate(g,[{x:4,y:7,dig:1},{x:6,y:7,dig:-1}],next,'接近左埋核时观察巡守；洞后可借内梯或落到底层绕回。');
 if(g.level===2&&next.id==='right')return excavate(g,[{x:14,y:7,dig:1},{x:16,y:7,dig:-1}],next,'右埋核旁也是巡守入口；选择开洞的一侧，或经底层绕另一条梯。');
 if(g.level===3&&next.id==='gate'){
  if(g.player.x>=16&&g.player.y>=7&&g.enemies.some(e=>e.state!=='trapped'&&Math.abs(e.x-16)+Math.abs(e.y-7)<=4))return output(g,{x:18,y:6},'右侧梯口有巡守，先借梯顶短索从上方绕过，再进上层。');
  return excavate(g,[{x:13,y:3,dig:1},{x:15,y:3,dig:-1}],next,'上层软口是必经的埋核；开洞后会落到中索，返回要选中央或侧环。');
 }
 if(alt&&g.level===3&&next.id==='middleLeft'&&g.player.y>=8)return output(g,{x:18,y:7},'下层巡守在近侧追来，先绕远侧外梯返回中索，再补左侧星核。');
 if(supported(g,g.player))for(const e of g.enemies)if(e.state!=='trapped'&&e.y===g.player.y&&Math.abs(e.x-g.player.x)>=2&&Math.abs(e.x-g.player.x)<=4){const dir=Math.sign(e.x-g.player.x),r=inspection(g,dir);if(r.ok)return {dir:null,input:{},dig:dir,target:r.target,reason:'巡守迎面接近，利用现有软砖洞再换一条梯索。'};}
 return output(g,next,'根据当前巡守位置，按选定取核顺序走错开的梯索。');
}
