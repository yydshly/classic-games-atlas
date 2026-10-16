import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
import {createGame,update,start,pause,fire,spawnEnemy,route,applyPower,ENEMY_TYPES,canOccupy} from '../games/fortress/engine.mjs';
import {LEVELS,GRID,TILE,BASE,PLAYER_SPAWN,SPAWNS} from '../games/fortress/levels.mjs';

const results=[];
function test(name,run){try{run();results.push({name,status:'passed'});}catch(error){results.push({name,status:'failed',error:error.message});}}
const point=(x,y)=>({x:x*TILE+12,y:y*TILE+12});
function advance(game,seconds,input={}){for(let i=0;i<Math.ceil(seconds*60);i++)update(game,input,1/60);}
function fixture(){const g=createGame();for(let y=1;y<24;y++)for(let x=1;x<24;x++){g.tiles[y][x]='.';g.brickHP[y][x]=0;}g.items=[];g.spawnClock=Infinity;start(g);return g;}
function enemyShot(g,target){g.bullets.push({x:target.x,y:target.y-22,dir:2,enemy:true,speed:300,damage:1,ttl:1,owner:'test-enemy'});advance(g,.08);}

test('Ten distinct 25x25 maps, valid symbols, clear staging and increasing waves',()=>{
  assert.equal(LEVELS.length,10);assert.equal(new Set(LEVELS.map(l=>l.map.join(''))).size,10);
  for(const [index,level]of LEVELS.entries()){
    assert.equal(level.map.length,GRID);assert.ok(level.map.every(row=>row.length===GRID&&/^[.BSW]+$/.test(row)));
    for(const spawn of [...SPAWNS,PLAYER_SPAWN,BASE])assert.equal(level.map[spawn.y][spawn.x],'.');
    assert.ok(level.queue.every(type=>ENEMY_TYPES[type]));assert.ok(level.maxActive>=2&&level.maxActive<=4);
    if(index)assert.ok(level.queue.length>=LEVELS[index-1].queue.length);
  }
});
test('All ten stages: player, supplies and three enemy entrances reachable without crossing steel or water',()=>{
  for(let index=0;index<10;index++){
    const g=createGame(index);
    for(const spawn of SPAWNS){assert.ok(route(g,point(spawn.x,spawn.y),g.base).length>0,`stage ${index+1} enemy path`);assert.ok(route(g,g.player,point(spawn.x,spawn.y)).length>0,`stage ${index+1} player path`);}
    assert.ok(route(g,g.player,g.items[0]).length>0);
    assert.ok(canOccupy(g,g.player,g.player.x,g.player.y));
  }
});
test('Ready and pause freeze simulation; resume advances fixed-step time',()=>{const g=createGame();advance(g,1);assert.equal(g.time,0);start(g);advance(g,1);assert.ok(g.time>.99);pause(g);const t=g.time;advance(g,1);assert.equal(g.time,t);start(g);advance(g,.2);assert.ok(g.time>t);});
test('Vehicle collides with steel, brick, water and another tank',()=>{
  for(const material of ['S','B','W']){const g=fixture();Object.assign(g.player,point(5,5),{dir:0});g.tiles[4][5]=material;const before=g.player.y;advance(g,1,{dir:0});assert.ok(g.player.y>=129&&g.player.y<before,material);}
  const g=fixture();Object.assign(g.player,point(5,7),{dir:0});const e=spawnEnemy(g,'heavy',{x:5,y:5});e.speed=0;e.cooldown=Infinity;advance(g,1,{dir:0});assert.ok(Math.abs(g.player.y-e.y)>=19);
});
test('Two normal projectile hits destroy brick; steel survives; shots do not tunnel',()=>{
  const g=fixture();Object.assign(g.player,point(5,7),{dir:0});g.tiles[5][5]='B';g.brickHP[5][5]=2;
  fire(g,g.player);advance(g,.1);assert.equal(g.brickHP[5][5],1);assert.equal(g.tiles[5][5],'B');g.player.cooldown=0;fire(g,g.player);advance(g,.1);assert.equal(g.tiles[5][5],'.');
  g.tiles[5][5]='S';g.player.cooldown=0;fire(g,g.player);advance(g,.2);assert.equal(g.tiles[5][5],'S');assert.equal(g.bullets.length,0);
});
test('Three enemy classes have distinct armour, speed and firing cadence',()=>{const g=fixture();const enemies=Object.keys(ENEMY_TYPES).map((type,index)=>spawnEnemy(g,type,SPAWNS[index]));assert.equal(new Set(enemies.map(t=>t.hp)).size,3);assert.equal(new Set(enemies.map(t=>t.speed)).size,3);assert.equal(new Set(Object.values(ENEMY_TYPES).map(t=>t.rate)).size,3);});
test('Enemy AI physically advances along a valid route and fires',()=>{const g=fixture();const enemy=spawnEnemy(g,'scout',{x:12,y:2});const y=enemy.y;advance(g,2.5);assert.ok(enemy.y>y+40);assert.ok(g.events.some(e=>e.type==='fire'&&e.enemy));});
test('Heavy armour absorbs normal hits; rapid damage destroys enemies and scores',()=>{
  const g=fixture();Object.assign(g.player,point(5,7),{dir:0});const enemy=spawnEnemy(g,'heavy',{x:5,y:5});Object.assign(enemy,{speed:0,cooldown:Infinity,spawnShield:0});
  fire(g,g.player);advance(g,.13);assert.equal(enemy.hp,3);applyPower(g,'rapid');g.player.cooldown=0;advance(g,.6,{fire:true});assert.equal(g.enemies.length,0);assert.equal(g.kills,1);assert.ok(g.score>=300);
});
test('Opposing projectiles intercept each other',()=>{const g=fixture();g.bullets=[{x:200,y:200,dir:1,enemy:false,speed:300,damage:1,ttl:1},{x:220,y:200,dir:3,enemy:true,speed:300,damage:1,ttl:1}];advance(g,.1);assert.equal(g.bullets.length,0);});
test('Enemy shots damage beacon and cause base-loss after three effective hits',()=>{const g=fixture();for(let i=0;i<3;i++){g.base.shield=0;enemyShot(g,g.base);}assert.equal(g.base.hp,0);assert.equal(g.state,'lost');assert.match(g.resultReason,/基地/);});
test('Player damage respawns with protection and exhausts three deployments',()=>{const g=fixture();for(let i=0;i<3;i++){g.player.invulnerable=0;g.player.shield=0;enemyShot(g,g.player);if(i<2){assert.equal(g.lives,2-i);assert.ok(g.player.invulnerable>0);}}assert.equal(g.lives,0);assert.equal(g.state,'lost');});
test('Player shots never damage their own beacon',()=>{const g=fixture();g.bullets=[{x:g.base.x,y:g.base.y-22,dir:2,enemy:false,speed:300,damage:1,ttl:1}];advance(g,.1);assert.equal(g.base.hp,3);});
test('Repair caps health; shield prevents damage; rapid fire expires and emits labelled feedback',()=>{
  const g=fixture();g.base.hp=2;g.lives=2;applyPower(g,'repair');applyPower(g,'repair');assert.equal(g.base.hp,3);assert.equal(g.lives,3);
  applyPower(g,'shield');g.player.invulnerable=0;enemyShot(g,g.player);enemyShot(g,g.base);assert.equal(g.lives,3);assert.equal(g.base.hp,3);
  applyPower(g,'rapid');assert.equal(g.player.rapid,10);advance(g,10.1);assert.equal(g.player.rapid,0);assert.ok(g.events.some(e=>e.type==='power'&&e.powerType==='rapid'));
});
test('All queued targets cleared triggers victory; restart creates independent clean state',()=>{const g=fixture();g.spawned=g.level.queue.length;update(g,{},1/60);assert.equal(g.state,'won');assert.ok(g.score>0);const fresh=createGame(g.index);assert.equal(fresh.state,'ready');assert.equal(fresh.score,0);assert.equal(fresh.spawned,0);assert.equal(fresh.base.hp,3);assert.equal(fresh.lives,3);});

test('Every undefended map naturally resolves to defeat within 180 simulated seconds',()=>{
  for(let index=0;index<10;index++){const g=createGame(index);start(g);advance(g,180);assert.equal(g.state,'lost',`stage ${index+1} must not stall`);}
});

const report={testedAt:new Date().toISOString(),kind:'deterministic engine simulation, not browser input',passed:results.filter(r=>r.status==='passed').length,total:results.length,results};
mkdirSync('docs/fortress-qa',{recursive:true});writeFileSync('docs/fortress-qa/logic-report.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));if(report.passed!==report.total)process.exitCode=1;
