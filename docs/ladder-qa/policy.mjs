import {neighbors,inspectDig,holeAt,supported} from './engine.mjs';
const same=(a,b)=>a.x===b.x&&a.y===b.y;
export const ORDERS={main:[['buried','loft','rope'],['upper','rope','middle','lower'],['upperLeft','middleLeft','lower','middleRight','upperRight']],alternate:[['buried','rope','loft'],['rope','middle','lower','upper'],['upperRight','middleRight','lower','middleLeft','upperLeft']]};
function inspection(g,dir){if(g.state==='paused'){const p={...g,state:'playing'};return inspectDig(p,dir);}return inspectDig(g,dir);}
export function pathSafe(g,target){const q=[{x:g.player.x,y:g.player.y,path:[],cost:0}],costs=new Map([[g.player.y*g.width+g.player.x,0]]);while(q.length){q.sort((a,b)=>a.cost-b.cost);const p=q.shift();if(same(p,target))return p.path;for(const n of neighbors(g,p)){let cost=p.cost+1;for(const e of g.enemies)if(e.state!=='trapped'){const d=Math.abs(e.x-n.x)+Math.abs(e.y-n.y);if(!d)cost+=1000;else if(d===1)cost+=14;else if(d===2)cost+=5;else if(d===3)cost+=1;}const k=n.y*g.width+n.x;if(cost<(costs.get(k)??Infinity)){costs.set(k,cost);q.push({...n,cost,path:[...p.path,n]});}}}return null;}
function output(g,target,reason){const path=pathSafe(g,target),dir=path?.[0]?.dir;return {dir:dir==='wait'?null:dir||null,input:dir&&dir!=='wait'?{[dir]:true}:{},target,reason};}
export function chooseAction(g,variant='main'){
 if(!['playing','paused'].includes(g.state))return {dir:null,input:{}};const alt=variant==='alternate';
 const order=(alt?ORDERS.alternate:ORDERS.main)[g.level-1],next=order.map(id=>g.cores.find(c=>c.id===id)).find(c=>!c.collected);
 if(!next)return output(g,g.exit,'星核齐，返回出口。');
 if(g.level===1&&next.id==='buried'){
  if(holeAt(g,5,12))return output(g,{x:5,y:12},'落洞取核后立即向右借梯退出。');
  if(same(g.player,{x:4,y:11})){const r=inspection(g,1);if(r.ok)return {dir:null,input:{},dig:1,target:r.target,reason:r.reason};}
  return output(g,{x:4,y:11},'先到埋核左上方开右下洞。');
 }
 if(alt&&g.level===2&&next.id==='rope'&&g.player.y<=3){if(holeAt(g,10,4))return output(g,next,'从开洞直落悬绳。');if(same(g.player,{x:9,y:3})){const r=inspection(g,1);if(r.ok)return {dir:null,input:{},dig:1,target:r.target,reason:r.reason};}return output(g,{x:9,y:3},'直落方案：顶层开洞落到悬绳。');}
 if(alt&&g.level===2&&next.id==='lower'&&g.player.y<=7){if(holeAt(g,12,8))return output(g,next,'从临时洞换到下层。');if(same(g.player,{x:11,y:7})){const r=inspection(g,1);if(r.ok)return {dir:null,input:{},dig:1,target:r.target,reason:r.reason};}return output(g,{x:11,y:7},'直落方案：中层开洞换层。');}
 if(alt&&g.level===3&&next.id==='middleRight'&&g.player.y<=3){if(holeAt(g,16,4))return output(g,next,'从右上开洞避开侧梯迎面守卫。');if(same(g.player,{x:15,y:3})){const r=inspection(g,1);if(r.ok)return {dir:null,input:{},dig:1,target:r.target,reason:r.reason};}return output(g,{x:15,y:3},'右先行方案：在侧梯之外直落悬绳。');}
 // A visible same-floor approach can be interrupted with a legal temporary hole.
 if(supported(g,g.player))for(const e of g.enemies)if(e.state!=='trapped'&&e.y===g.player.y&&Math.abs(e.x-g.player.x)>=2&&Math.abs(e.x-g.player.x)<=4){const dir=Math.sign(e.x-g.player.x),r=inspection(g,dir);if(r.ok)return {dir:null,input:{},dig:dir,target:r.target,reason:'巡守同层靠近，开软砖洞截住它，再换梯路。'};}
 return output(g,next,'按当前守卫位置沿梯绳取下一枚星核。');
}
