import {DIRECTIONS,isClaimed,WIDTH,HEIGHT} from './engine.mjs';
const cut=(x,y,tx,ty)=>({from:{x,y},to:{x:tx,y:ty}});
export const PLANS={
 main:[
  [cut(10,0,10,15)],
  [cut(0,4,8,4),cut(11,6,21,6)],
  [cut(0,3,6,3),cut(17,0,17,15),cut(7,11,13,11)]
 ],
 alternate:[
  [cut(10,0,10,15)],
  [cut(4,15,4,0),cut(11,6,21,6)],
  [cut(0,4,6,4),cut(18,0,18,15),cut(9,9,13,9)]
 ]
};
function cells(c){const dx=Math.sign(c.to.x-c.from.x),dy=Math.sign(c.to.y-c.from.y),n=Math.abs(c.to.x-c.from.x)+Math.abs(c.to.y-c.from.y);return Array.from({length:n+1},(_,i)=>({x:c.from.x+dx*i,y:c.from.y+dy*i}));}
function route(g,target){const q=[{x:g.player.x,y:g.player.y,first:null}],seen=new Set([g.player.y*WIDTH+g.player.x]);for(let n=0;n<q.length;n++){const p=q[n];if(p.x===target.x&&p.y===target.y)return p.first;for(const [name,d]of Object.entries(DIRECTIONS)){const x=p.x+d.x,y=p.y+d.y,k=y*WIDTH+x;if(x>=0&&x<WIDTH&&y>=0&&y<HEIGHT&&!seen.has(k)&&isClaimed(g,x,y)){seen.add(k);q.push({x,y,first:p.first||name});}}}return null;}
export function chooseAction(g,variant='main'){
 if(!['playing','paused'].includes(g.state))return {dir:null};
 const plan=PLANS[variant]?.[g.level-1]||PLANS.main[g.level-1];
 for(const c of plan){const ps=cells(c);if(ps.every(p=>isClaimed(g,p.x,p.y)))continue;
  const dir=c.to.x>c.from.x?'R':c.to.x<c.from.x?'L':c.to.y>c.from.y?'D':'U';
  if(g.trail.length)return {dir};
  if(ps.some(p=>p.x===g.player.x&&p.y===g.player.y)){if(!g.drawArmed)return {dir:null,toggleDraw:true};return {dir};}
  return {dir:route(g,c.from)};
 }
 return {dir:null};
}
export function chooseFailureAction(g){if(!['playing','paused'].includes(g.state))return {dir:null};if(!g.trail.length)return g.drawArmed?{dir:'D'}:{dir:null,toggleDraw:true};if(g.trail.length===1)return {dir:'R'};const a=g.trail.at(-2),b=g.trail.at(-1);return {dir:Object.keys(DIRECTIONS).find(k=>DIRECTIONS[k].x===a.x-b.x&&DIRECTIONS[k].y===a.y-b.y)||'L'};}
