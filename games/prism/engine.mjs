import {LEVELS,WIDTH,HEIGHT,BRICK_W,BRICK_H,BRICK_GAP_X,BRICK_GAP_Y,BRICK_LEFT,BRICK_TOP} from './levels.mjs';
export const RADIUS=7,WALL_LEFT=24,WALL_RIGHT=576,WALL_TOP=36,PADDLE_Y=650,PADDLE_H=14,PADDLE_W=118,WIDE_W=176;
const EPS=.035,MIN_VERTICAL=.32,MAX_ANGLE=1.08;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export const remaining=g=>g.bricks.filter(b=>!b.steel&&b.hp>0).length;
export const paddleWidth=g=>g.buffs.wide>0?WIDE_W:PADDLE_W;
export function stabilize(b){
 const length=Math.hypot(b.dx,b.dy)||1;b.dx/=length;b.dy/=length;
 if(Math.abs(b.dy)<MIN_VERTICAL){b.dy=(b.dy<0?-1:1)*MIN_VERTICAL;b.dx=(b.dx<0?-1:1)*Math.sqrt(1-MIN_VERTICAL**2);}
}
function newBall(g,x,y,dx=.28,dy=-.96,attached=false){const b={id:g.nextBall++,x,y,dx,dy,attached,alive:true,contact:null};stabilize(b);return b;}
function serve(g){g.serving=true;g.balls=[newBall(g,g.paddle.x,PADDLE_Y-PADDLE_H/2-RADIUS-3,.28,-.96,true)];}
export function createGame(index=0){
 const l=LEVELS[clamp(index,0,LEVELS.length-1)],bricks=[];
 for(let row=0;row<l.rows.length;row++)for(let col=0;col<10;col++){const c=l.rows[row][col];if(c==='.')continue;const steel=c==='#';bricks.push({id:row*10+col,x:BRICK_LEFT+col*(BRICK_W+BRICK_GAP_X),y:BRICK_TOP+row*(BRICK_H+BRICK_GAP_Y),w:BRICK_W,h:BRICK_H,steel,hp:steel?-1:Number(c),maxHP:steel?-1:Number(c),power:null});}
 const breakable=bricks.filter(b=>!b.steel);for(let i=0;i<breakable.length;i++)if(i===1||i===4||i===7||i>7&&i%7===0)breakable[i].power=['split','wide','slow'][i===1?0:i===4?1:i===7?2:Math.floor(i/7)%3];
 const g={state:'ready',level:l.id,time:0,bricks,initial:breakable.length,paddle:{x:300,velocity:0},balls:[],nextBall:1,nextDrop:1,serving:true,lives:3,speed:l.speed,buffs:{wide:0,slow:0},drops:[],effects:[],events:[],sinceHit:0,reason:'',stats:{score:0,hits:0,destroyed:0,paddleHits:0,livesLost:0,corrections:0,powers:{wide:0,split:0,slow:0}}};serve(g);return g;
}
export function start(g){if(g.state==='ready')g.state='playing';}
export function pause(g){if(g.state==='playing')g.state='paused';else if(g.state==='paused')g.state='playing';}
export function launch(g){if(g.state!=='playing'||!g.serving)return false;g.serving=false;const b=g.balls[0];b.attached=false;b.dx=(g.paddle.velocity<0?-1:1)*.28;b.dy=-.96;stabilize(b);g.events.push({type:'launch'});return true;}
function touching(b,rect,margin=.1){const x=clamp(b.x,rect.x,rect.x+rect.w),y=clamp(b.y,rect.y,rect.y+rect.h);return (b.x-x)**2+(b.y-y)**2<=(RADIUS+margin)**2;}
// Exact swept circle vs faces and rounded corners. Returns the earliest contact.
export function sweepCircle(x,y,vx,vy,r,rect,dt){
 const hits=[],add=(t,nx,ny)=>{if(t>=-1e-9&&t<=dt+1e-9&&vx*nx+vy*ny<-1e-7)hits.push({t:Math.max(0,t),nx,ny});};
 if(vx>1e-9){const t=(rect.x-r-x)/vx,q=y+vy*t;if(q>=rect.y-1e-8&&q<=rect.y+rect.h+1e-8)add(t,-1,0);}
 if(vx<-1e-9){const t=(rect.x+rect.w+r-x)/vx,q=y+vy*t;if(q>=rect.y-1e-8&&q<=rect.y+rect.h+1e-8)add(t,1,0);}
 if(vy>1e-9){const t=(rect.y-r-y)/vy,q=x+vx*t;if(q>=rect.x-1e-8&&q<=rect.x+rect.w+1e-8)add(t,0,-1);}
 if(vy<-1e-9){const t=(rect.y+rect.h+r-y)/vy,q=x+vx*t;if(q>=rect.x-1e-8&&q<=rect.x+rect.w+1e-8)add(t,0,1);}
 const a=vx*vx+vy*vy;
 if(a>1e-12)for(const [cx,cy,sx,sy] of [[rect.x,rect.y,-1,-1],[rect.x+rect.w,rect.y,1,-1],[rect.x,rect.y+rect.h,-1,1],[rect.x+rect.w,rect.y+rect.h,1,1]]){
  const ox=x-cx,oy=y-cy,b=2*(ox*vx+oy*vy),c=ox*ox+oy*oy-r*r,disc=b*b-4*a*c;if(disc<0)continue;
  const t=(-b-Math.sqrt(disc))/(2*a),hx=x+vx*t,hy=y+vy*t;
  if((hx-cx)*sx>=-1e-8&&(hy-cy)*sy>=-1e-8)add(t,(hx-cx)/r,(hy-cy)/r);
 }
 return hits.sort((a,b)=>a.t-b.t)[0]||null;
}
function win(g){if(g.state!=='playing')return;g.state='won';g.stats.score+=500+g.lives*100;g.events.push({type:'win'});}
function damage(g,brick,b){
 if(brick.steel||brick.hp<=0||b.contact===brick.id)return;
 b.contact=brick.id;brick.hp--;g.stats.hits++;g.stats.score+=10;g.sinceHit=0;g.events.push({type:'hit',x:brick.x+brick.w/2,y:brick.y+brick.h/2});
 if(brick.hp===0){g.stats.destroyed++;g.stats.score+=40*brick.maxHP;g.speed=Math.min(420,g.speed+.6);g.effects.push({x:brick.x+brick.w/2,y:brick.y+brick.h/2,ttl:.4,kind:'brick'});g.events.push({type:'brick'});if(brick.power)g.drops.push({id:g.nextDrop++,x:brick.x+brick.w/2,y:brick.y+brick.h/2,type:brick.power});if(!remaining(g))win(g);}
}
function advanceBall(g,b,dt){
 let left=dt;
 for(let iteration=0;iteration<12&&left>1e-7&&g.state==='playing';iteration++){
  if(b.contact!==null){const old=g.bricks.find(x=>x.id===b.contact);if(!old||old.hp===0||!touching(b,old))b.contact=null;}
  stabilize(b);const speed=g.speed*(g.buffs.slow>0?.68:1),vx=b.dx*speed,vy=b.dy*speed,hits=[];
  if(vx<0){const t=(WALL_LEFT+RADIUS-b.x)/vx;if(t>=-1e-8&&t<=left)hits.push({t:Math.max(0,t),nx:1,ny:0,kind:'wall'});}
  if(vx>0){const t=(WALL_RIGHT-RADIUS-b.x)/vx;if(t>=-1e-8&&t<=left)hits.push({t:Math.max(0,t),nx:-1,ny:0,kind:'wall'});}
  if(vy<0){const t=(WALL_TOP+RADIUS-b.y)/vy;if(t>=-1e-8&&t<=left)hits.push({t:Math.max(0,t),nx:0,ny:1,kind:'wall'});}
  for(const brick of g.bricks){if(!brick.steel&&brick.hp<=0)continue;const hit=sweepCircle(b.x,b.y,vx,vy,RADIUS,brick,left);if(hit)hits.push({...hit,kind:'brick',brick});}
  const pw=paddleWidth(g),rect={x:g.paddle.x-pw/2,y:PADDLE_Y-PADDLE_H/2,w:pw,h:PADDLE_H};
  if(vy>0){const hit=sweepCircle(b.x,b.y,vx,vy,RADIUS,rect,left);if(hit&&b.y+vy*hit.t<=PADDLE_Y)hits.push({...hit,kind:'paddle'});}
  const hit=hits.sort((a,b)=>a.t-b.t||({paddle:0,brick:1,wall:2}[a.kind]-{paddle:0,brick:1,wall:2}[b.kind]))[0];
  if(!hit){b.x+=vx*left;b.y+=vy*left;left=0;break;}
  b.x+=vx*hit.t;b.y+=vy*hit.t;left-=hit.t;
  if(hit.kind==='paddle'){
   const offset=clamp((b.x-g.paddle.x)/(pw/2),-1,1),angle=offset*MAX_ANGLE;b.dx=Math.sin(angle);b.dy=-Math.cos(angle);
   if(Math.abs(b.dx)<.11)b.dx=(g.paddle.velocity<0?-1:g.paddle.velocity>0?1:b.id%2?1:-1)*.11;
   g.stats.paddleHits++;g.events.push({type:'paddle'});b.contact=null;
  }else{const dot=b.dx*hit.nx+b.dy*hit.ny;b.dx-=2*dot*hit.nx;b.dy-=2*dot*hit.ny;if(hit.kind==='brick')damage(g,hit.brick,b);}
  stabilize(b);b.x+=hit.nx*EPS;b.y+=hit.ny*EPS;
 }
 if(b.y>HEIGHT+RADIUS)b.alive=false;
}
export function applyPower(g,type){
 if(g.state!=='playing'||!['wide','split','slow'].includes(type))return false;
 g.stats.powers[type]++;g.stats.score+=25;
 if(type==='wide')g.buffs.wide=16;
 if(type==='slow')g.buffs.slow=12;
 if(type==='split'){
  const sources=g.balls.filter(b=>!b.attached&&b.alive);if(!sources.length){g.buffs.wide=Math.max(g.buffs.wide,8);}
  else{const source=sources[0];for(const angle of [-.36,.36]){if(g.balls.length>=4)break;const dx=source.dx*Math.cos(angle)-source.dy*Math.sin(angle),dy=source.dx*Math.sin(angle)+source.dy*Math.cos(angle);g.balls.push(newBall(g,source.x,source.y,dx,dy));}}
 }
 const half=paddleWidth(g)/2;g.paddle.x=clamp(g.paddle.x,WALL_LEFT+half,WALL_RIGHT-half);g.events.push({type:'power',power:type});return true;
}
export function update(g,dt,input={}){
 if(!['playing','won','lost'].includes(g.state))return;dt=clamp(dt,0,.05);g.effects=g.effects.map(e=>({...e,ttl:e.ttl-dt})).filter(e=>e.ttl>0);if(g.state!=='playing')return;
 g.time+=dt;for(const type of ['wide','slow'])g.buffs[type]=Math.max(0,g.buffs[type]-dt);
 const half=paddleWidth(g)/2,old=g.paddle.x,target=Number.isFinite(input.pointerX)?input.pointerX:old+(Number(input.direction)||0)*600*dt;
 g.paddle.x=clamp(old+clamp(target-old,-1050*dt,1050*dt),WALL_LEFT+half,WALL_RIGHT-half);g.paddle.velocity=dt?(g.paddle.x-old)/dt:0;
 for(const b of g.balls)if(b.attached){b.x=g.paddle.x;b.y=PADDLE_Y-PADDLE_H/2-RADIUS-3;}
 if(input.launch)launch(g);
 for(const b of [...g.balls]){if(b.alive&&!b.attached)advanceBall(g,b,dt);if(g.state==='won')return;}
 g.balls=g.balls.filter(b=>b.alive);
 if(!g.balls.length){
  g.lives--;g.stats.livesLost++;g.drops=[];g.buffs={wide:0,slow:0};g.events.push({type:'life'});
  if(g.lives<=0){g.state='lost';g.reason='光球全部落下，生命已用完。重新挑战时，提前向落点移动。';g.events.push({type:'lose'});return;}
  serve(g);g.sinceHit=0;
 }
 for(const drop of g.drops){drop.y+=190*dt;if(drop.y>=PADDLE_Y-18&&drop.y<=PADDLE_Y+18&&Math.abs(drop.x-g.paddle.x)<=paddleWidth(g)/2+12){drop.collected=true;applyPower(g,drop.type);}}
 g.drops=g.drops.filter(d=>!d.collected&&d.y<HEIGHT+20);
 if(!g.serving){g.sinceHit+=dt;if(g.sinceHit>9){
  const targets=g.bricks.filter(b=>!b.steel&&b.hp>0),ball=g.balls.find(b=>!b.attached);if(ball&&targets.length){const t=targets.reduce((a,b)=>Math.abs(b.x+23-ball.x)<Math.abs(a.x+23-ball.x)?b:a);ball.dx=clamp((t.x+23-ball.x)/280,-.65,.65);if(Math.abs(ball.dx)<.13)ball.dx=.19*(ball.id%2?1:-1);ball.dy=(ball.dy<0?-1:1)*Math.sqrt(1-ball.dx**2);stabilize(ball);g.stats.corrections++;g.events.push({type:'correction'});}g.sinceHit=0;
 }}
}
export function snapshot(g){return JSON.parse(JSON.stringify({...g,events:undefined}));}
