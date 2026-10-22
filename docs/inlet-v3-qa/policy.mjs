import {update,toggleDraw,previewThreat,DIRECTIONS,isClaimed,WIDTH,HEIGHT,STEP} from './engine.mjs';
const clone=v=>JSON.parse(JSON.stringify(v)),same=(a,b)=>a.x===b.x&&a.y===b.y,key=p=>p.y*WIDTH+p.x;
const memos=new Map();
function reached(g){const q=[{x:g.player.x,y:g.player.y,path:[]}],seen=new Set([key(g.player)]);for(let n=0;n<q.length;n++)for(const [dir,d]of Object.entries(DIRECTIONS)){const p={x:q[n].x+d.x,y:q[n].y+d.y},k=key(p);if(p.x>=0&&p.x<WIDTH&&p.y>=0&&p.y<HEIGHT&&isClaimed(g,p.x,p.y)&&!seen.has(k)){seen.add(k);q.push({...p,path:[...q[n].path,{...p,dir}]});}}return q;}
function moveTo(g,path){for(const p of path){let guard=0;while(!same(g.player,p)&&g.state==='playing'&&guard++<20)update(g,STEP,{dir:p.dir});if(!same(g.player,p))return false;}return true;}
function simulate(g,p,dir,style,reachable){const sim=clone(g),losses=sim.stats.losses,cuts=sim.stats.cuts;sim.state='playing';if(sim.drawArmed)toggleDraw(sim);if(!moveTo(sim,p.path)||sim.stats.losses!==losses)return null;
 const threat=previewThreat(sim,dir);if(!threat.ok||threat.risk!=='safe')return null;
 toggleDraw(sim);while(sim.state==='playing'&&sim.stats.losses===losses&&sim.stats.cuts===cuts&&sim.time-g.time<15)update(sim,STEP,{dir});
 if(sim.stats.losses!==losses||sim.stats.cuts===cuts)return null;
 const gain=sim.claimedCount-g.claimedCount;if(gain<=0)return null;
 const goalGain=sim.objectives.reduce((n,o,i)=>n+Math.min(o.target,o.percent)-Math.min(g.objectives[i].target,g.objectives[i].percent),0),finished=sim.objectives.filter((o,i)=>o.complete&&!g.objectives[i].complete).length;
 const length=threat.cells.length,initialStop=sim.initialSafe[key(threat.to)]&&threat.to.x>0&&threat.to.x<WIDTH-1&&threat.to.y>0&&threat.to.y<HEIGHT-1,freshStop=!reachable.has(key(threat.to));
 // Both styles evaluate current enemy phase and reject predicted collisions.
 // Long favors area/goal progress; sheltered favors efficient short exposures and island stops.
 let score=style==='sheltered'?(gain+goalGain*1.2+finished*15)/(length+1)-length*1.6-p.path.length*.035+(initialStop?5:0)+(freshStop?20:0):gain+goalGain*.8+finished*15-p.path.length*.35+length*3;
 if(sim.state==='won')score+=style==='sheltered'?20:80;
 return {anchor:{x:p.x,y:p.y},dir,to:threat.to,length,gain,goalGain,finished,score,threat,approach:p.path.length,freshStop,readEnemies:g.enemies.map(({id,x,y,dir,behavior,tellTimer})=>({id,x,y,dir,behavior,tellTimer})),chosenAt:g.time,style};
}
function plan(g,style){const anchors=reached(g),reachable=new Set(anchors.map(key));let best=null;for(const p of anchors)for(const dir of Object.keys(DIRECTIONS)){const d=DIRECTIONS[dir];if(isClaimed(g,p.x+d.x,p.y+d.y))continue;const result=simulate(g,p,dir,style,reachable);if(result&&(!best||result.score>best.score))best=result;}return best;}
export function chooseAction(g,variant='main'){
 if(!['playing','paused'].includes(g.state))return {dir:null};
 const style=['alternate','sheltered','short'].includes(variant)?'sheltered':'long',tag=g.level+':'+style;
 let memo=memos.get(tag);if(!memo||memo.cuts!==g.stats.cuts||memo.losses!==g.stats.losses||g.time<memo.chosenAt-1e-8){const choice=plan(g,style);memo=choice?{...choice,cuts:g.stats.cuts,losses:g.stats.losses}:null;if(memo)memos.set(tag,memo);else memos.delete(tag);}
 if(g.trail.length){if(memo)return {dir:memo.dir};const possible=Object.keys(DIRECTIONS).map(dir=>({dir,p:previewThreat(g,dir)})).filter(x=>x.p.ok&&x.p.risk==='safe').sort((a,b)=>a.p.closeIn-b.p.closeIn);return {dir:possible[0]?.dir||g.player.dir};}
 if(!memo)return {dir:null};
 if(same(g.player,memo.anchor)){
  const forecast=previewThreat(g,memo.dir);if(forecast.risk!=='safe'){memos.delete(tag);if(g.drawArmed)return {dir:null,toggleDraw:true};return chooseAction(g,variant);}
  const decision={...memo,launchEnemies:g.enemies.map(({id,x,y,dir,behavior,tellTimer})=>({id,x,y,dir,behavior,tellTimer})),forecast};
  if(!g.drawArmed)return {dir:null,toggleDraw:true,previewDir:memo.dir,decision,reason:style==='sheltered'?'借堤岛缩短暴露；按当前潮影状态重新预测。':'选择当前远离潮影的较长收益线；出发前重新预测。'};return {dir:memo.dir,previewDir:memo.dir,decision};
 }
 if(g.drawArmed)return {dir:null,toggleDraw:true};
 const next=reached(g).find(p=>same(p,memo.anchor));return {dir:next?.path[0]?.dir||null};
}
export function resetPolicy(){memos.clear();}
function dangerPlan(g){let best=null;for(const p of reached(g))for(const dir of Object.keys(DIRECTIONS)){const d=DIRECTIONS[dir];if(isClaimed(g,p.x+d.x,p.y+d.y))continue;const sim=clone(g),losses=g.stats.losses;sim.state='playing';if(sim.drawArmed)toggleDraw(sim);if(!moveTo(sim,p.path)||sim.stats.losses!==losses)continue;const threat=previewThreat(sim,dir);if(!threat.ok||threat.risk!=='danger'||!threat.enemies.some(e=>e.hitIn!==null))continue;const score=-p.path.length-threat.hitIn*2;if(!best||score>best.score)best={anchor:{x:p.x,y:p.y},dir,threat,score,chosenAt:g.time,cuts:g.stats.cuts,losses};}return best;}
export function chooseFailureAction(g){
 if(!['playing','paused'].includes(g.state))return {dir:null};
 const tag='danger:'+g.level;let memo=memos.get(tag);if(!memo||memo.cuts!==g.stats.cuts||memo.losses!==g.stats.losses||g.time<memo.chosenAt){memo=dangerPlan(g);if(memo)memos.set(tag,memo);}
 if(!memo)return {dir:null};if(g.trail.length)return {dir:memo.dir};
 if(same(g.player,memo.anchor)){const forecast=previewThreat(g,memo.dir);if(forecast.risk!=='danger'||!forecast.enemies.some(e=>e.hitIn!==null)){memos.delete(tag);if(g.drawArmed)return {dir:null,toggleDraw:true};return chooseFailureAction(g);}return {dir:g.drawArmed?memo.dir:null,toggleDraw:!g.drawArmed,previewDir:memo.dir,decision:{...memo,forecast},reason:'测试反例：已经看到碰线预测，仍保持这条方向，不回避潮影。'};}
 if(g.drawArmed)return {dir:null,toggleDraw:true};const next=reached(g).find(p=>same(p,memo.anchor));return {dir:next?.path[0]?.dir||null};
}
