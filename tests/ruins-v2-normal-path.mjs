import assert from 'node:assert/strict';
import {fresh,step,action,DT,serialize,restore,retry} from '../versions/v2/games/ruins/engine.mjs';
// Model/controller test, not a browser test. Only resume/pause toggles are set directly.
// All progress, movement, combat, damage, and room transitions use public actions + step.
const reports=[];
const input=(dx,dy)=>({right:dx>1.7,left:dx< -1.7,down:dy>1.7,up:dy< -1.7});
function tick(s,i={},combat=false){if(combat){action(s,'attack');if(s.echo)action(s,'echo');}step(s,i,DT);assert.notEqual(s.status,'dead',`died level ${s.level} room ${s.room}`);}
function go(s,x,y,{combat=true,max=1800}={}){for(let n=0;n<max;n++){if(Math.hypot(s.p.x-x,s.p.y-y)<5)return;tick(s,input(x-s.p.x,y-s.p.y),combat);}throw Error(`stuck level ${s.level} room ${s.room} at ${s.p.x},${s.p.y} toward ${x},${y}`);}
function use(s,x,y){go(s,x,y);action(s,'interact');}
function start(level){const s=fresh(level);s.paused=false;return s;}
const a=start(0);use(a,864,288);go(a,300,180);go(a,760,120);action(a,'interact');assert(a.key);go(a,840,180);use(a,864,288);go(a,730,220);use(a,730,288);assert(a.lamp);go(a,730,180);go(a,180,180);use(a,96,288);go(a,840,180);go(a,300,180);use(a,96,288);use(a,144,288);assert.equal(a.status,'won');reports.push({level:1,status:a.status,hp:a.p.hp,seconds:a.time});
const b=start(1);use(b,480,480);go(b,480,160);go(b,760,160);use(b,760,360);assert(b.echo);go(b,760,160);use(b,480,96);go(b,520,220);go(b,575,220);for(let n=0;n<100&&!b.switch;n++){tick(b,{right:true},false);action(b,'echo');}assert(b.switch);go(b,560,480);go(b,800,480);use(b,864,288);go(b,780,200);use(b,790,288);assert.equal(b.status,'won');reports.push({level:2,status:b.status,hp:b.p.hp,seconds:b.time});
const c=start(2);go(c,180,440);use(c,96,288);go(c,800,150);use(c,220,150);assert(c.west);go(c,800,150);use(c,864,288);go(c,180,440);go(c,800,440);use(c,864,288);go(c,180,150);use(c,740,150);assert(c.east);go(c,180,150);use(c,96,288);
let shieldsBroken=0,previousExposed=0,damage=0,previousHp=10;const boss=c.rooms[0].enemies[0];
for(let n=0;n<18000&&boss.hp>0;n++){
 let i={};
 if(boss.phase==='windup'||boss.phase==='attack'){
  const horizontal=boss.dir==='left'||boss.dir==='right';
  const tx=horizontal?c.p.x:boss.x+(c.p.x<boss.x?-100:100);
  const ty=horizontal?boss.y+(c.p.y<boss.y?-100:100):c.p.y;
  i=input(tx-c.p.x,ty-c.p.y);
 }else{
  const tx=boss.x,ty=boss.y+58;i=input(tx-c.p.x,ty-c.p.y);
  if(Math.abs(c.p.x-boss.x)<8&&Math.abs(c.p.y-ty)<8){i=c.p.dir==='up'?{}:{up:true};if(c.p.dir==='up'){if(boss.phase==='recover')action(c,'echo');if(boss.exposed>0)action(c,'attack');}}
 }
 tick(c,i);
 if(boss.exposed>previousExposed+.5)shieldsBroken++;
 if(boss.hp<previousHp){assert(boss.exposed>0,'boss damage requires exposure');damage+=previousHp-boss.hp;}
 previousHp=boss.hp;previousExposed=boss.exposed;
}
assert.equal(boss.hp,0,'boss defeated by L in recovery then J');assert(shieldsBroken>0);assert.equal(damage,10);use(c,480,100);assert.equal(c.status,'won');reports.push({level:3,status:c.status,hp:c.p.hp,seconds:c.time,shieldsBroken,bossDamage:damage});
console.log(JSON.stringify({type:'controller/model; not browser',normalPaths:reports},null,2));
