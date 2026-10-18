import assert from 'node:assert/strict';
import {LEVELS,COLS,ROWS} from '../games/maze/levels.mjs';
import {createGame,start,pause,update,plant,detonate,blastCells,snapshot} from '../games/maze/engine.mjs';
let passed=0;function test(name,fn){fn();passed++;console.log(`PASS ${name}`);}
function tick(g,seconds,input={}){for(let i=0;i<Math.ceil(seconds*60);i++)update(g,1/60,input);}
function fixture(){const g=createGame();start(g);g.enemies=[];return g;}
test('ten unique original maps: dimensions, boundary, safe start, all spawns, full floor connectivity after crates',()=>{
 assert.equal(LEVELS.length,10);assert.equal(new Set(LEVELS.map(l=>l.grid.join(''))).size,10);
 for(const l of LEVELS){assert.equal(l.grid.length,ROWS);assert(l.grid.every(r=>r.length===COLS&&/^[#.+]+$/.test(r)));assert(l.grid[0].split('').every(c=>c==='#'));assert(l.grid.at(-1).split('').every(c=>c==='#'));assert(l.grid.every(r=>r[0]==='#'&&r.at(-1)==='#'));
  for(const [x,y] of [[1,1],[2,1],[1,2],[1,3],[2,3],[13,11]])assert.equal(l.grid[y][x],'.');assert.equal(l.grid[1][3],'+');assert.equal(l.grid[1][5],'+');assert.equal(l.grid[5][1],'+');
  for(const e of l.enemies){assert.equal(l.grid[e.y][e.x],'.');assert(Math.abs(e.x-1)+Math.abs(e.y-1)>=6);}
  const q=[[1,1]],seen=new Set(['1,1']);for(let i=0;i<q.length;i++){const [x,y]=q[i];for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){const nx=x+dx,ny=y+dy,k=`${nx},${ny}`;if(l.grid[ny]?.[nx]&&l.grid[ny][nx]!=='#'&&!seen.has(k)){seen.add(k);q.push([nx,ny]);}}}
  assert.equal(seen.size,l.grid.join('').split('').filter(c=>c!=='#').length);assert(seen.has('13,11'));
 }
});
test('ready, start and pause freeze the clock and bombs',()=>{const g=createGame();tick(g,1);assert.equal(g.time,0);start(g);plant(g);pause(g);tick(g,4);assert.equal(g.bombs[0].fuse,2.4);pause(g);tick(g,.5);assert(g.time>.4);});
test('capacity, duplicate cell and leave-own-bomb/re-entry collision',()=>{const g=fixture();assert(plant(g));assert(!plant(g));tick(g,.02,{direction:1});assert.equal(g.player.x,2);tick(g,.25,{direction:3});assert.equal(g.player.x,2);assert(!plant(g));});
test('fuse, self damage once per blast, destructible wall and first crate stops ray',()=>{const g=fixture();g.player.x=2;plant(g);tick(g,2.35);assert.equal(g.stats.crates,0);tick(g,.1);assert.equal(g.grid[1][3],'.');assert.equal(g.grid[1][5],'+');assert.equal(g.player.hp,2);tick(g,.4);assert.equal(g.player.hp,2);});
test('stone permanently stops the cross',()=>{const g=fixture();const cells=blastCells(g,{x:1,y:2,range:6});assert(!cells.some(c=>c.x===2&&c.y===2));assert.equal(g.grid[2][2],'#');});
test('chain triggers a later bomb immediately and never twice',()=>{const g=fixture();g.bombs=[{id:1,x:1,y:1,range:2,fuse:.1},{id:2,x:2,y:1,range:2,fuse:2}];detonate(g,[1]);assert.equal(g.bombs.length,0);assert.equal(g.stats.chains,1);assert.equal(g.events.filter(e=>e.type==='explode').length,2);detonate(g,[2]);assert.equal(g.events.filter(e=>e.type==='explode').length,2);});
test('same-wave crate still blocks a chained ray after destruction',()=>{const g=fixture();g.grid[3][3]='+';g.bombs=[{id:1,x:3,y:1,range:2,fuse:.1},{id:2,x:3,y:2,range:5,fuse:2}];detonate(g,[1]);assert(!g.flames.some(f=>f.x===3&&f.y===4));});
test('three hits produce failure; restarting restores full distinct state',()=>{const g=fixture();for(let i=0;i<3;i++){g.player.invulnerable=0;g.bombs=[{id:i,x:1,y:1,range:2,fuse:0}];detonate(g,[i]);}assert.equal(g.state,'lost');assert.equal(g.player.hp,0);assert.equal(createGame().player.hp,3);assert.equal(createGame().stats.planted,0);});
test('enemy contact damages with protection, explosion removes enemies',()=>{const g=fixture();g.enemies=[{id:1,x:1,y:1,type:'roamer',cooldown:10,age:1}];tick(g,.05);assert.equal(g.player.hp,2);tick(g,.1);assert.equal(g.player.hp,2);g.bombs=[{id:1,x:1,y:1,range:2}];detonate(g,[1]);assert.equal(g.enemies.length,0);assert.equal(g.stats.kills,1);});
test('upgrades require flame to expire and clamp capacity/range/speed',()=>{const g=fixture();g.items=[{x:1,y:1,type:'capacity'},{x:1,y:1,type:'range'},{x:1,y:1,type:'speed'}];g.flames=[{x:1,y:1,ttl:.1}];tick(g,.05);assert.equal(g.player.capacity,1);tick(g,.15);assert.equal(g.player.capacity,2);assert.equal(g.player.range,3);assert(g.player.step<.22);for(let i=0;i<8;i++){g.items=['capacity','range','speed'].map(type=>({x:1,y:1,type}));tick(g,.02);}assert.equal(g.player.capacity,4);assert.equal(g.player.range,6);assert.equal(g.player.step,.14);});
test('exit requires no enemy and stepping onto exit; damage resolves before victory',()=>{const g=createGame();start(g);g.player.x=13;g.player.y=11;tick(g,.02);assert.equal(g.state,'playing');g.enemies=[];tick(g,.02);assert.equal(g.state,'won');const h=fixture();h.player.x=13;h.player.y=11;h.player.hp=1;h.flames=[{x:13,y:11,ttl:.4}];tick(h,.02);assert.equal(h.state,'lost');});
test('tracker routes around a stone toward nearby player',()=>{const g=fixture();g.grid=g.grid.map(r=>r.map(c=>c==='+'?'.':c));g.player.x=3;g.player.y=3;g.enemies=[{id:1,x:1,y:3,type:'tracker',dir:0,cooldown:0,age:1}];tick(g,.02);assert.equal(g.enemies[0].x,2);});
test('charger has a burst and a real cooling interval',()=>{const g=fixture();g.player.x=13;g.player.y=11;g.enemies=[{id:1,x:7,y:11,fromX:7,fromY:11,type:'charger',dir:1,cooldown:0,age:1,burst:0}];g.grid[11]=g.grid[11].map(c=>c==='+'?'.':c);tick(g,.61);assert.equal(g.enemies[0].x,10);assert(g.enemies[0].cooldown>.8);});
test('read-only snapshot cannot mutate the real board or actors',()=>{const g=createGame(),s=snapshot(g);s.grid[1][1]='#';s.player.hp=0;s.enemies[0].x=0;assert.equal(g.grid[1][1],'.');assert.equal(g.player.hp,3);assert.notEqual(g.enemies[0].x,0);});
console.log(JSON.stringify({passed,levels:LEVELS.length,kind:'pure-logic fixtures; not real browser input'}));
