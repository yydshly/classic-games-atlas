import {LEVELS,PHYSICS as P} from './levels.mjs?v=trail-v2-r1';
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),overlap=(a,b)=>a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y;
export function createGame(index=0){const l=LEVELS[clamp(index,0,2)];return {state:'ready',level:l.id,width:l.width,height:l.height,time:0,camera:0,solids:l.ground.concat(l.platforms).map(s=>({...s})),movers:l.movers.map(m=>({...m,prevX:m.x,prevY:m.y})),enemies:l.enemies.map(e=>({...e})),coins:l.coins.map(c=>({...c,collected:false})),player:{...l.start,w:22,h:30,vx:0,vy:0,grounded:true,support:'g0',coyote:P.coyote,buffer:0,invulnerable:.9,lock:0,facing:1},lives:3,energy:72,projectiles:[],attackCooldown:0,attackFlash:0,deaths:0,checkpoint:false,checkpointPos:{...l.start},goal:l.goal,events:[],stats:{jumps:0,collected:0,moverLandings:0},reason:''};}
export function start(g){if(g.state==='ready')g.state='playing';}
export function pause(g){if(g.state==='playing')g.state='paused';else if(g.state==='paused')g.state='playing';}
export const solids=g=>g.solids.concat(g.movers);
export const collected=g=>g.coins.filter(c=>c.collected).length;
export function hurt(g,reason='碰到巡游者'){
 if(g.state!=='playing'||g.player.invulnerable>0&&!['跌落','体力耗尽'].includes(reason))return false;
 g.lives--;g.deaths++;g.projectiles=[];g.energy=72;g.events.push({type:'hurt',reason});if(g.lives<=0){g.state='lost';g.reason=reason;g.events.push({type:'lost'});return true;}
 const p=g.player;Object.assign(p,g.checkpointPos,{vx:0,vy:0,grounded:false,support:null,coyote:0,buffer:0,invulnerable:1.8,lock:.28});g.camera=clamp(p.x-180,0,g.width-600);g.events.push({type:'respawn'});return true;
}
function tick(g,dt,input){
 g.time+=dt;g.energy=Math.max(0,g.energy-dt*5);if(g.energy<=0){hurt(g,'体力耗尽');return;}g.attackCooldown=Math.max(0,g.attackCooldown-dt);g.attackFlash=Math.max(0,g.attackFlash-dt);const p=g.player;p.invulnerable=Math.max(0,p.invulnerable-dt);p.lock=Math.max(0,p.lock-dt);p.buffer=Math.max(0,p.buffer-dt);p.coyote=p.grounded?P.coyote:Math.max(0,p.coyote-dt);
 for(const m of g.movers){m.prevX=m.x;m.prevY=m.y;const angle=g.time*Math.PI*2/m.period+m.phase;m.x=m.baseX+Math.sin(angle)*m.rx;m.y=m.baseY+Math.sin(angle)*m.ry;if(p.grounded&&p.support===m.id){p.x+=m.x-m.prevX;p.y+=m.y-m.prevY;}}
 for(const e of g.enemies){if(!e.alive)continue;e.x+=e.vx*dt;if(e.x<e.min){e.x=e.min;e.vx=Math.abs(e.vx);}if(e.x>e.max){e.x=e.max;e.vx=-Math.abs(e.vx);}}
 const axis=p.lock>0?0:clamp(input.axis||0,-1,1),desired=axis*P.speed,accel=(axis?(p.grounded?P.acceleration:P.airAcceleration):P.friction)*dt;p.vx+=clamp(desired-p.vx,-accel,accel);if(axis)p.facing=Math.sign(axis);
 if(p.buffer>0&&p.coyote>0&&p.lock===0){p.vy=-P.jump;p.grounded=false;p.support=null;p.coyote=0;p.buffer=0;g.stats.jumps++;g.events.push({type:'jump'});}
 if(!input.jumpHeld&&p.vy<-P.cut)p.vy=-P.cut;
 const terrain=solids(g),oldX=p.x,oldY=p.y;
 for(const b of g.projectiles){b.vy+=560*dt;b.x+=b.vx*dt;b.y+=b.vy*dt;b.ttl-=dt;for(const e of g.enemies)if(e.alive&&overlap(b,e)){e.alive=false;b.ttl=0;g.events.push({type:'hit',x:e.x,y:e.y});break;}}g.projectiles=g.projectiles.filter(b=>b.ttl>0&&b.y<450);p.x=clamp(p.x+p.vx*dt,0,g.width-p.w);
 for(const s of terrain)if(!s.oneWay&&overlap(p,s)){if(p.vx>0&&oldX+p.w<=s.x+.5)p.x=s.x-p.w;else if(p.vx<0&&oldX>=s.x+s.w-.5)p.x=s.x+s.w;p.vx=0;}
 p.vy=Math.min(P.fall,p.vy+P.gravity*dt);p.y+=p.vy*dt;p.grounded=false;const previousSupport=p.support;p.support=null;
 if(p.vy>=0){let landing=null;for(const s of terrain)if(p.x+p.w>s.x+.01&&p.x<s.x+s.w-.01&&oldY+p.h<=s.y+1.1&&p.y+p.h>=s.y&&(!landing||s.y<landing.y))landing=s;if(landing){p.y=landing.y-p.h;p.vy=0;p.grounded=true;p.support=landing.id;if(landing.kind==='moving'&&previousSupport!==landing.id){g.stats.moverLandings++;g.events.push({type:'platform'});}}}
 else for(const s of terrain)if(!s.oneWay&&overlap(p,s)&&oldY>=s.y+s.h-.5){p.y=s.y+s.h;p.vy=0;}
 if(p.y>g.height+80){hurt(g,'跌落');return;}
 if(p.invulnerable===0&&g.enemies.some(e=>e.alive&&overlap(p,e))){hurt(g);return;}
 const l=LEVELS[g.level-1];if(!g.checkpoint&&Math.abs(p.x-l.checkpoint.x)<35&&p.y<350){g.checkpoint=true;g.events.push({type:'save'});g.checkpointPos={...l.checkpoint};g.events.push({type:'checkpoint'});}
 for(const c of g.coins)if(!c.collected&&p.x+p.w>c.x-11&&p.x<c.x+11&&p.y+p.h>c.y-12&&p.y<c.y+12){c.collected=true;g.energy=Math.min(100,g.energy+32);g.stats.collected++;g.events.push({type:'coin'});}
 if(p.x>=g.goal&&p.y+p.h<=350){g.state='won';p.vx=0;g.events.push({type:'won'});}
 const target=clamp(p.x-190,0,g.width-600);g.camera+=clamp(1-Math.exp(-6*dt),0,1)*(target-g.camera);
}
export function update(g,realDt,input={}){if(g.state!=='playing'||!Number.isFinite(realDt)||realDt<=0)return;if(input.attackPressed&&g.attackCooldown<=0&&g.player.lock===0){const p=g.player;g.projectiles.push({x:p.x+p.w/2,y:p.y+10,w:13,h:13,vx:p.facing*350,vy:-110,ttl:1.2});g.attackCooldown=.32;g.attackFlash=.2;g.events.push({type:'throw'});}if(input.jumpPressed&&g.player.lock===0)g.player.buffer=P.buffer;let remaining=Math.min(.1,realDt);while(remaining>1e-8&&g.state==='playing'){const dt=Math.min(P.step,remaining);tick(g,dt,input);remaining-=dt;}}
export const snapshot=g=>JSON.parse(JSON.stringify(g, (key,v)=>key==='events'?undefined:v));


export function serialize(g){return JSON.stringify({version:2,game:snapshot(g)});}
export function restore(raw){try{const v=JSON.parse(raw);if(v?.version!==2) return null;const s=v.game;if(!s||!Number.isInteger(s.level)||s.level<1||s.level>3||!['ready','playing','paused','won','lost'].includes(s.state))return null;const fresh=createGame(s.level-1);const finite=(v,a,b)=>Number.isFinite(v)&&v>=a&&v<=b;if(!finite(s.time,0,86400)||!finite(s.energy,0,100)||!Number.isInteger(s.lives)||s.lives<0||s.lives>3||!finite(s.player?.x,0,3400)||!finite(s.player?.y,-300,fresh.height+80+P.fall*P.step+1)||!finite(s.player?.vx,-1000,1000)||!finite(s.player?.vy,-1000,1000)||!Array.isArray(s.coins)||s.coins.length!==5||!Array.isArray(s.enemies)||s.enemies.length!==fresh.enemies.length||s.enemies.some(e=>!finite(e.x,0,3400)||!finite(e.vx,-100,100)||typeof e.alive!=='boolean')||s.coins.some(c=>typeof c.collected!=='boolean')||typeof s.checkpoint!=='boolean'||!Number.isInteger(s.deaths)||s.deaths<0||s.deaths>3||s.deaths!==3-s.lives||typeof s.reason!=='string'||s.reason.length>100||(s.state==='lost'?(s.lives!==0||!s.reason):s.lives===0)||(s.state==='won'&&(s.player.x<fresh.goal||s.player.y+fresh.player.h>350)))return null;
 fresh.state=s.state==='playing'?'paused':s.state;fresh.time=s.time;fresh.energy=s.energy;fresh.lives=s.lives;fresh.deaths=s.deaths;fresh.reason=s.reason;fresh.checkpoint=s.checkpoint;fresh.checkpointPos=s.checkpoint?{...LEVELS[s.level-1].checkpoint}:{...LEVELS[s.level-1].start};Object.assign(fresh.player,{x:s.player.x,y:s.player.y,vx:0,vy:0,grounded:false,support:null,coyote:0,buffer:0,invulnerable:.9,facing:s.player.facing===-1?-1:1});fresh.camera=clamp(fresh.player.x-190,0,2800);fresh.coins.forEach((c,i)=>c.collected=s.coins[i].collected);fresh.enemies.forEach((e,i)=>Object.assign(e,{x:s.enemies[i].x,vx:s.enemies[i].vx,alive:s.enemies[i].alive}));fresh.stats.collected=fresh.coins.filter(c=>c.collected).length;return fresh;}catch{return null;}}
