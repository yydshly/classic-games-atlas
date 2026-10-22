import {DIRS,neighbours,distances,tileKey,safe}from'../versions/v3/games/lantern/engine.mjs';
function routes(g,start){const q=[{...start,path:[]}],seen=new Set([tileKey(start.x,start.y)]);for(let n=0;n<q.length;n++)for(const next of neighbours(g,q[n])){const k=tileKey(next.x,next.y);if(seen.has(k))continue;seen.add(k);q.push({x:next.x,y:next.y,path:[...q[n].path,next]});}return new Map(q.map(n=>[tileKey(n.x,n.y),n.path]));}
export function chooseAction(g,options={}){
 if(g.state!=='playing')return null;const p=g.player,here={x:p.moving?p.toX:Math.round(p.x),y:p.moving?p.toY:Math.round(p.y)},paths=routes(g,here);
 if(options.refuge&&safe(g,here.x,here.y)&&g.power<1&&g.phase==='chase')return 0;
 const live=g.enemies.filter(e=>e.mode==='active'&&e.harmless<.3),hazards=live.map(e=>distances(g,{x:e.moving?e.toX:Math.round(e.x),y:e.moving?e.toY:Math.round(e.y)}));
 const targets=g.dots.filter(d=>!d.taken&&!(d.x===here.x&&d.y===here.y)).map(d=>({d,path:paths.get(tileKey(d.x,d.y))})).filter(v=>v.path?.length);
 const maxPower=g.power,invulnerable=p.invulnerable;
 function risk(path){let score=0;for(let i=0;i<Math.min(5,path.length);i++){const cell=path[i],t=(i+1)/4.2;if(maxPower>t+.35||invulnerable>t+.15)continue;const k=tileKey(cell.x,cell.y),danger=Math.min(99,...hazards.map(h=>h.get(k)??99));if(danger<=1)score+=35;else if(danger<=2)score+=14;else if(danger<=3)score+=3;}return score;}
 for(const t of targets)t.score=t.path.length+risk(t.path)+(t.d.power&&g.power<2.5?-Math.min(6,t.path.length*.8):0);
 if(options.refuge&&g.power<1&&g.phase==='chase'&&hazards.some(h=>(h.get(tileKey(here.x,here.y))??99)<5))for(const pocket of g.safe){const path=paths.get(tileKey(pocket.x,pocket.y));if(path?.length)targets.push({d:pocket,path,score:path.length+risk(path)-5});}
 targets.sort((a,b)=>a.score-b.score||a.path.length-b.path.length||a.d.y-b.d.y||a.d.x-b.d.x);return targets[0]?.path[0]?.dir??null;
}
