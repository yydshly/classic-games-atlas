import {DIRECTIONS,isClaimed,WIDTH,HEIGHT} from './engine.mjs';
// Read-only geometric plans: each complete column is a deliberate safe-to-safe cut.
export const PLANS={
 main:[[{x:10,from:0,to:15}],[{x:14,from:0,to:15}],[{x:14,from:0,to:15}]],
 alternate:[[{x:10,from:0,to:15}],[{x:5,from:0,to:15},{x:14,from:0,to:15}],[{x:10,from:0,to:15},{x:12,from:0,to:15},{x:15,from:0,to:15}]]
};
function route(g,target){const q=[{x:g.player.x,y:g.player.y,first:null}],seen=new Set([g.player.y*WIDTH+g.player.x]);for(let n=0;n<q.length;n++){const p=q[n];if(p.x===target.x&&p.y===target.y)return p.first;for(const [name,d]of Object.entries(DIRECTIONS)){const x=p.x+d.x,y=p.y+d.y,k=y*WIDTH+x;if(x>=0&&x<WIDTH&&y>=0&&y<HEIGHT&&!seen.has(k)&&isClaimed(g,x,y)){seen.add(k);q.push({x,y,first:p.first||name});}}}return null;}
export function chooseAction(g,variant='main'){
 if(!['playing','paused'].includes(g.state))return {dir:null};
 const plan=PLANS[variant]?.[g.level-1]||PLANS.main[g.level-1];
 for(const cut of plan){
  const low=Math.min(cut.from,cut.to),high=Math.max(cut.from,cut.to),done=Array.from({length:high-low+1},(_,i)=>isClaimed(g,cut.x,i+low)).every(Boolean);if(done)continue;
  const dir=cut.to>cut.from?'D':'U';
  if(g.trail.length)return {dir};
  if(g.player.x===cut.x&&g.player.y>=low&&g.player.y<=high){if(!g.drawArmed)return {dir:null,toggleDraw:true};return {dir};}
  return {dir:route(g,{x:cut.x,y:cut.from})};
 }
 return {dir:null};
}
export function chooseFailureAction(g){
 if(!['playing','paused'].includes(g.state))return {dir:null};
 if(!g.trail.length)return g.drawArmed?{dir:'D'}:{dir:null,toggleDraw:true};
 if(g.trail.length===1)return {dir:'R'};
 const a=g.trail.at(-2),b=g.trail.at(-1),d={x:a.x-b.x,y:a.y-b.y};return {dir:Object.keys(DIRECTIONS).find(k=>DIRECTIONS[k].x===d.x&&DIRECTIONS[k].y===d.y)||'L'};
}
