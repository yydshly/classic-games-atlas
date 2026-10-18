// Read-only prediction. Used by simulations and by a normal-input browser pilot.
import {sweepCircle,RADIUS,WALL_LEFT,WALL_RIGHT,WALL_TOP,PADDLE_Y,PADDLE_H,paddleWidth} from '../games/prism/engine.mjs';
import {createInterface} from 'node:readline';
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x)),cache=new Map();
export function landingX(b){const low=WALL_LEFT+RADIUS,span=WALL_RIGHT-WALL_LEFT-2*RADIUS;let q=(b.x+b.dx/b.dy*(PADDLE_Y-PADDLE_H/2-RADIUS-b.y)-low)%(2*span);if(q<0)q+=2*span;return low+(q>span?2*span-q:q);}
function firstBrick(g,x,angle){
 let y=PADDLE_Y-PADDLE_H/2-RADIUS-.1,dx=Math.sin(angle),dy=-Math.cos(angle),distance=0;
 for(let i=0;i<10;i++){
  const hits=[];
  if(dx<0)hits.push({t:(WALL_LEFT+RADIUS-x)/dx,nx:1,ny:0});if(dx>0)hits.push({t:(WALL_RIGHT-RADIUS-x)/dx,nx:-1,ny:0});if(dy<0)hits.push({t:(WALL_TOP+RADIUS-y)/dy,nx:0,ny:1});if(dy>0)hits.push({t:(PADDLE_Y-y)/dy,end:true});
  for(const brick of g.bricks){if(!brick.steel&&brick.hp<=0)continue;const h=sweepCircle(x,y,dx,dy,RADIUS,brick,2000);if(h)hits.push({...h,brick});}
  const h=hits.filter(h=>h.t>=0).sort((a,b)=>a.t-b.t)[0];if(!h||h.end)return null;x+=dx*h.t;y+=dy*h.t;distance+=h.t;
  if(h.brick&&!h.brick.steel)return {brick:h.brick,distance};
  const dot=dx*h.nx+dy*h.ny;dx-=2*dot*h.nx;dy-=2*dot*h.ny;x+=h.nx*.05;y+=h.ny*.05;
 }
 return null;
}
function aim(g,b,px){
 const key=`${g.level}:${b.id}:${g.stats.paddleHits}:${g.stats.hits}:${paddleWidth(g)}`;if(cache.has(key))return cache.get(key);
 const half=paddleWidth(g)/2,options=[];
 for(const brick of g.bricks.filter(x=>!x.steel&&x.hp>0))for(const tx of [brick.x+brick.w/2,2*(WALL_LEFT+RADIUS)-(brick.x+brick.w/2),2*(WALL_RIGHT-RADIUS)-(brick.x+brick.w/2)]){
  const angle=Math.atan2(tx-px,PADDLE_Y-brick.y-brick.h/2);if(Math.abs(angle)>1.07)continue;
  const paddle=clamp(px-angle/1.08*half,WALL_LEFT+half,WALL_RIGHT-half),actual=(px-paddle)/half*1.08,hit=firstBrick(g,px,actual);
  if(hit)options.push({paddle,score:100+25/hit.brick.hp+(hit.brick.power?6:0)-hit.distance*.012});
 }
 const answer=options.sort((a,b)=>b.score-a.score)[0]?.paddle??px;cache.set(key,answer);if(cache.size>300)cache.clear();return answer;
}
export function inputFor(g){
 if(g.serving)return {pointerX:g.paddle.x,launch:true};
 const speed=g.speed*(g.buffs.slow>0?.68:1),bottom=Math.max(350,...g.bricks.filter(b=>b.steel||b.hp>0).map(b=>b.y+b.h+RADIUS));
 const falling=g.balls.filter(b=>!b.attached&&b.dy>0&&b.y>bottom).map(b=>({b,time:(PADDLE_Y-PADDLE_H/2-RADIUS-b.y)/(speed*b.dy)})).filter(x=>x.time>-.05).sort((a,b)=>a.time-b.time);
 const drop=g.drops.filter(d=>d.y>320).sort((a,b)=>b.y-a.y)[0];
 if(drop&&(!falling.length||falling[0].time>.85)&&drop.y>PADDLE_Y-220)return {pointerX:drop.x};
 if(falling.length){const b=falling[0].b,px=landingX(b);return {pointerX:aim(g,b,px)};}
 if(drop)return {pointerX:drop.x};
 return {pointerX:g.balls[0]?.x??300};
}
if(process.argv.includes('--stdio')){const lines=createInterface({input:process.stdin,crlfDelay:Infinity});for await(const line of lines){try{console.log(JSON.stringify(inputFor(JSON.parse(line))));}catch(e){console.log(JSON.stringify({error:e.message}));}}}
