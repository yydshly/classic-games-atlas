// Read-only ordinary-pointer pilot, adapted from this repository's cloud-later-qa pilot.
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
function distanceSegment(ax,ay,bx,by){const dx=bx-ax,dy=by-ay,n=dx*dx+dy*dy,t=n?clamp(-(ax*dx+ay*dy)/n,0,1):0;return Math.hypot(ax+dx*t,ay+dy*t);}
function futureX(e,t,level){return e.type==='elite'?(level===1?300+Math.sin((e.age+t)*.62)*155:300+Math.tanh(Math.sin((e.age+t)*.85))*170):e.baseX+Math.sin((e.age+t)*(e.type==='dart'?1.8:e.type==='fan'?1.2:1.1)+e.phase)*(e.type==='dart'?58:e.type==='fan'?35:22);}
export function chooseAction(g){
 const p=g.player;if(g.state!=='playing')return {target:{x:p.x,y:p.y},shieldPressed:false};let goalX=300;
 const enemy=g.enemies.filter(e=>!e.dead&&e.y>10&&e.y<540).sort((a,b)=>(b.type==='elite'?1000:b.y-Math.abs(b.x-p.x)*.25)-(a.type==='elite'?1000:a.y-Math.abs(a.x-p.x)*.25))[0];if(enemy)goalX=clamp(futureX(enemy,Math.max(0,(p.y-enemy.y)/850),g.level),36,564);
 const wanted=g.level===2||g.time>14&&(g.level===3)||g.time>31?'focus':'spread';
 const item=g.items.filter(i=>!i.taken&&!i.dead&&i.y>380&&i.y<715&&(i.type===wanted||i.type==='repair'&&p.hp<3)).sort((a,b)=>(a.type==='repair'?-100:0)-(b.type==='repair'?-100:0)||b.y-a.y)[0];if(item)goalX=item.x;
 const xs=[goalX,p.x,p.x-40,p.x+40,p.x-85,p.x+85,60,140,220,300,380,460,540].map(x=>clamp(x,28,572)),ys=item?[clamp(item.y+30,570,675),635,675]:[605,635,675],threats=g.bullets.filter(b=>!b.dead&&b.y>120&&b.y<760);let best=null;
 for(const x of xs)for(const y of ys){const dx=x-p.x,dy=y-p.y,n=Math.hypot(dx,dy)||1;let danger=0;for(const b of threats){let lastX=b.x-p.x,lastY=b.y-p.y;for(let step=1;step<=7;step++){const t=step*.16,travel=Math.min(n,320*t),px=p.x+dx/n*travel,py=p.y+dy/n*travel,rx=b.x+b.vx*t-px,ry=b.y+b.vy*t-py,d=distanceSegment(lastX,lastY,rx,ry);danger+=d<15?2500+(15-d)*300:d<33?(33-d)*1.3:0;lastX=rx;lastY=ry;}}
  for(const e of g.enemies)if(e.y>420){const t=Math.max(0,(y-e.y)/Math.max(1,e.vy));if(t<1.2&&Math.abs(futureX(e,t,g.level)-x)<e.r+14)danger+=15000;}
  if(p.invulnerable>.4||p.shield>.4)danger*=.025;const score=danger+Math.abs(x-goalX)*(item?.12:.045)+Math.abs(y-635)*.018+Math.hypot(dx,dy)*.005;if(!best||score<best.score)best={x,y,score,danger};
 }
 return {target:{x:best.x,y:best.y},shieldPressed:best.danger>1800&&p.invulnerable<.1&&p.shield===0&&p.charges>0};
}
export function chaseDanger(g){const p=g.player,b=g.bullets.filter(b=>!b.dead&&b.y<710).sort((a,b)=>Math.hypot(a.x-p.x,a.y-p.y)-Math.hypot(b.x-p.x,b.y-p.y))[0],enemy=g.enemies.filter(e=>!e.dead).sort((a,b)=>b.y-a.y)[0];return {target:b?{x:b.x+b.vx*.08,y:b.y+b.vy*.08}:enemy?{x:enemy.x,y:enemy.y+enemy.r+5}:{x:300,y:180},shieldPressed:false};}
export const chooseFailureAction=chaseDanger;
