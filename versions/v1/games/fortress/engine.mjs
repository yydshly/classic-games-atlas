import { BASE, GRID, LEVELS, PLAYER_SPAWN, SIZE, SPAWNS, TILE } from './levels.mjs';

export const VECTORS = [{x:0,y:-1},{x:1,y:0},{x:0,y:1},{x:-1,y:0}];
export const ENEMY_TYPES = {
  scout: {name:'侦察车',hp:1,speed:61,rate:2.15,bulletSpeed:220,score:100},
  gunner:{name:'突击炮',hp:2,speed:43,rate:1.45,bulletSpeed:270,score:180},
  heavy: {name:'重装车',hp:4,speed:32,rate:1.9,bulletSpeed:245,score:300},
};
export const POWER_TYPES = ['repair','rapid','shield'];
const center = n => n*TILE+TILE/2;
const cell = n => Math.floor(n/TILE);
const near = (a,b,r) => Math.abs(a.x-b.x)<r && Math.abs(a.y-b.y)<r;
const clamp = (n,min,max) => Math.max(min,Math.min(n,max));
const coordinates = point => ({x:center(point.x),y:center(point.y)});

export function createGame(index=0,{seed=104729+index*7919}={}) {
  const level=LEVELS[clamp(index,0,9)];
  return {level,index:level.id-1,tiles:level.map.map(row=>row.split('')),brickHP:level.map.map(row=>[...row].map(t=>t==='B'?2:0)),
    player:{id:'player',...coordinates(PLAYER_SPAWN),dir:0,speed:104,invulnerable:2.6,cooldown:0,rapid:0,shield:0},
    base:{...coordinates(BASE),hp:3,shield:0,flash:0},lives:3,enemies:[],bullets:[],items:[{...coordinates({x:10,y:20}),type:level.initialPower,ttl:30}],
    state:'ready',time:0,score:0,kills:0,shots:0,spawned:0,spawnClock:1.8,enemyId:0,events:[],terrainVersion:0,seed:seed>>>0,
    lastHit:null,resultReason:'',slowTime:0};
}
function random(game) { game.seed=(1664525*game.seed+1013904223)>>>0; return game.seed/4294967296; }
function emit(game,type,data={}) { game.events.push({type,...data}); if(game.events.length>80)game.events.shift(); }
export function start(game) { if(game.state==='ready'||game.state==='paused')game.state='playing'; }
export function pause(game) { if(game.state==='playing')game.state='paused'; }

export function isSolid(game,x,y) {
  const c=cell(x),r=cell(y);
  return c<0||r<0||c>=GRID||r>=GRID||['S','B','W'].includes(game.tiles[r][c]);
}
export function canOccupy(game,tank,x,y,includeTanks=true) {
  const radius=9.2;
  for(const dx of [-radius,radius])for(const dy of [-radius,radius])if(isSolid(game,x+dx,y+dy))return false;
  if(near({x,y},game.base,19))return false;
  if(includeTanks)for(const other of [game.player,...game.enemies])if(other!==tank && !other.dead && near({x,y},other,19.3))return false;
  return true;
}

export function fire(game,tank,enemy=false) {
  if(tank.cooldown>0||game.state!=='playing')return false;
  const vector=VECTORS[tank.dir];
  const rapid=!enemy&&tank.rapid>0;
  const type=enemy?ENEMY_TYPES[tank.type]:null;
  tank.cooldown=enemy?type.rate:(rapid?.14:.34);
  game.bullets.push({x:tank.x+vector.x*15,y:tank.y+vector.y*15,dir:tank.dir,enemy,owner:tank.id,speed:enemy?type.bulletSpeed:(rapid?340:300),damage:rapid?2:1,ttl:3.5});
  if(!enemy)game.shots++;
  emit(game,'fire',{x:tank.x+vector.x*17,y:tank.y+vector.y*17,dir:tank.dir,enemy});
  return true;
}

// BFS accepts bricks as demolishable terrain; steel and water never enter a route.
export function route(game,from,to,{includeBricks=true,avoidTanks=false}={}) {
  const sx=cell(from.x),sy=cell(from.y),gx=clamp(cell(to.x),1,23),gy=clamp(cell(to.y),1,23);
  const queue=[{x:sx,y:sy}],previous=new Map([[`${sx},${sy}`,null]]);
  const occupied=new Set(avoidTanks?game.enemies.filter(t=>t!==from&&!t.dead).map(t=>`${cell(t.x)},${cell(t.y)}`):[]);
  for(let head=0;head<queue.length;head++) {
    const here=queue[head];
    if(here.x===gx&&here.y===gy)break;
    // Downward-first ordering makes defensive pressure readable, not random teleporting.
    const horizontal=here.x<gx?1:3;
    for(const direction of [2,horizontal,(horizontal+2)%4,0]) {
      const vector=VECTORS[direction],x=here.x+vector.x,y=here.y+vector.y,key=`${x},${y}`;
      if(x<1||y<1||x>23||y>23||previous.has(key)||occupied.has(key))continue;
      const tile=game.tiles[y][x];
      if(tile==='S'||tile==='W'||(!includeBricks&&tile==='B'))continue;
      previous.set(key,here);queue.push({x,y});
    }
  }
  const goal=`${gx},${gy}`;
  if(!previous.has(goal))return [];
  const path=[];let point={x:gx,y:gy};
  while(previous.get(`${point.x},${point.y}`)) {path.unshift({...point});point=previous.get(`${point.x},${point.y}`);}
  return path;
}

function movePlayer(game,input,dt) {
  const player=game.player;
  if(input.dir!==null&&input.dir!==undefined) {
    const desired=input.dir;
    if(desired%2!==player.dir%2) {
      const aligned=desired%2===1?center(cell(player.y)):center(cell(player.x));
      const distance=Math.abs((desired%2===1?player.y:player.x)-aligned);
      if(distance<=7) {
        const x=desired%2===1?player.x:aligned,y=desired%2===1?aligned:player.y;
        if(canOccupy(game,player,x,y)){player.x=x;player.y=y;player.dir=desired;}
      }
    } else player.dir=desired;
    const vector=VECTORS[player.dir],x=player.x+vector.x*player.speed*dt,y=player.y+vector.y*player.speed*dt;
    if(canOccupy(game,player,x,y)){player.x=x;player.y=y;}
  }
  if(input.fire)fire(game,player);
}

function clearShot(game,tank,target) {
  const dx=target.x-tank.x,dy=target.y-tank.y;
  if(Math.abs(dx)>10&&Math.abs(dy)>10)return -1;
  const direction=Math.abs(dx)<10?(dy<0?0:2):(dx<0?3:1),vector=VECTORS[direction];
  const length=Math.max(Math.abs(dx),Math.abs(dy));
  for(let d=16;d<length-10;d+=9) {
    const tile=game.tiles[cell(tank.y+vector.y*d)]?.[cell(tank.x+vector.x*d)];
    if(tile==='S'||tile==='B')return -1;
  }
  return direction;
}

function moveEnemy(game,tank,dt) {
  tank.think-=dt;
  const aimed=clearShot(game,tank,game.player);
  if(aimed>=0&&Math.hypot(tank.x-game.player.x,tank.y-game.player.y)<200&&tank.cooldown<=0) {
    tank.aimCharge=(tank.aimCharge||0)+dt;tank.dir=aimed;
    const windup=tank.type==='heavy'?.75:tank.type==='gunner'?.55:.45;
    if(tank.aimCharge>=windup){fire(game,tank,true);tank.aimCharge=0;tank.waypoint=null;}
    return;
  } else tank.aimCharge=0;
  if(tank.think<=0||!tank.waypoint) {
    const path=route(game,tank,game.base,{avoidTanks:tank.stuck>.6});
    tank.waypoint=path[0]?coordinates(path[0]):null;tank.think=.65;
  }
  const point=tank.waypoint;
  if(point) {
    const dx=point.x-tank.x,dy=point.y-tank.y;
    if(Math.abs(dx)>1.2||Math.abs(dy)>1.2) {
      const cellX=center(cell(tank.x)),cellY=center(cell(tank.y));
      // Align to the current lane before turning. Otherwise a hull can clip a
      // neighbouring pillar and remain wedged while BFS keeps choosing its lane.
      if(Math.abs(point.x-cellX)<.5&&Math.abs(dx)>.3)tank.dir=dx>0?1:3;
      else if(Math.abs(point.y-cellY)<.5&&Math.abs(dy)>.3)tank.dir=dy>0?2:0;
      else tank.dir=Math.abs(dx)>Math.abs(dy)?(dx>0?1:3):(dy>0?2:0);
      const vector=VECTORS[tank.dir],distance=Math.min(tank.speed*dt,tank.dir%2?Math.abs(dx):Math.abs(dy));
      const x=tank.x+vector.x*distance,y=tank.y+vector.y*distance;
      if(canOccupy(game,tank,x,y)){tank.x=x;tank.y=y;tank.stuck=0;}
      else {tank.stuck+=dt;if(tank.stuck>.8)tank.think=0;}
    } else {tank.x=point.x;tank.y=point.y;tank.waypoint=null;}
  }
  const baseAim=clearShot(game,tank,game.base);
  const baseInRange=baseAim>=0&&Math.hypot(tank.x-game.base.x,tank.y-game.base.y)<210;
  if(baseInRange)tank.dir=baseAim;
  const front=VECTORS[tank.dir];
  const frontTile=game.tiles[cell(tank.y+front.y*24)]?.[cell(tank.x+front.x*24)];
  // Fire at a target or at a demolishable obstruction, not blindly across the map.
  if(baseInRange||frontTile==='B')fire(game,tank,true);
}

export function spawnEnemy(game,type,point=SPAWNS[game.spawned%3]) {
  const definition=ENEMY_TYPES[type],position=coordinates(point);
  if([game.player,...game.enemies].some(tank=>near(position,tank,28)))return false;
  const enemy={id:`enemy-${++game.enemyId}`,type,...position,dir:2,hp:definition.hp,maxHp:definition.hp,speed:definition.speed,cooldown:1+random(game),think:0,stuck:0,waypoint:null,flash:0,spawnShield:.65};
  game.enemies.push(enemy);emit(game,'spawn',position);return enemy;
}

function lose(game,reason) {game.state='lost';game.resultReason=reason;emit(game,'lose',{reason});}
function damageBase(game) {
  if(game.base.hp<=0)return;
  if(game.base.shield>0){emit(game,'deflect',game.base);return;}
  game.base.hp--;game.base.flash=.5;game.base.shield=1.5;emit(game,'base-hit',game.base);
  if(game.base.hp<=0)lose(game,'信标熄灭：基地耐久已经耗尽。');
}
function damagePlayer(game) {
  if(game.lives<=0)return;
  const player=game.player;
  if(player.invulnerable>0||player.shield>0){emit(game,'deflect',player);return;}
  game.lives--;emit(game,'player-hit',{x:player.x,y:player.y});
  if(game.lives<=0){lose(game,'出击次数耗尽：装甲车需要重新整备。');return;}
  Object.assign(player,coordinates(PLAYER_SPAWN),{dir:0,invulnerable:2.5,cooldown:.2});
}
function killEnemy(game,tank) {
  tank.dead=true;game.kills++;game.score+=ENEMY_TYPES[tank.type].score;
  emit(game,'explosion',{x:tank.x,y:tank.y,enemyType:tank.type});
  if(game.kills%2===0) {
    const type=POWER_TYPES[(Math.floor(game.kills/2)-1+game.index)%3];
    game.items.push({x:tank.x,y:tank.y,type,ttl:20});emit(game,'drop',{x:tank.x,y:tank.y,powerType:type});
  }
}
export function applyPower(game,type) {
  if(type==='repair'){game.base.hp=Math.min(3,game.base.hp+1);game.lives=Math.min(3,game.lives+1);}
  if(type==='rapid')game.player.rapid=10;
  if(type==='shield'){game.player.shield=8;game.base.shield=Math.max(game.base.shield,8);}
  game.score+=50;emit(game,'power',{powerType:type,x:game.player.x,y:game.player.y});
}

function moveBullet(game,bullet,dt) {
  bullet.ttl-=dt;
  const vector=VECTORS[bullet.dir],steps=Math.ceil(bullet.speed*dt/4),distance=bullet.speed*dt/steps;
  for(let step=0;step<steps&&!bullet.dead;step++) {
    bullet.x+=vector.x*distance;bullet.y+=vector.y*distance;
    const x=cell(bullet.x),y=cell(bullet.y),tile=game.tiles[y]?.[x];
    if(!tile||tile==='S'||tile==='B') {
      bullet.dead=true;
      if(tile==='B') {
        game.brickHP[y][x]-=bullet.damage;game.terrainVersion++;
        if(game.brickHP[y][x]<=0)game.tiles[y][x]='.';
        emit(game,'brick',{x:bullet.x,y:bullet.y});
      } else emit(game,'spark',{x:bullet.x,y:bullet.y});
      break;
    }
    if(near(bullet,game.base,14)) {
      bullet.dead=true;if(bullet.enemy)damageBase(game);else emit(game,'deflect',game.base);break;
    }
    if(bullet.enemy) {
      if(near(bullet,game.player,11)){bullet.dead=true;damagePlayer(game);}
    } else for(const tank of game.enemies) {
      if(!tank.dead&&near(bullet,tank,12)) {
        bullet.dead=true;
        if(tank.spawnShield<=0){tank.hp-=bullet.damage;tank.flash=.12;emit(game,'hit',{x:tank.x,y:tank.y});if(tank.hp<=0)killEnemy(game,tank);}
        break;
      }
    }
  }
  if(bullet.ttl<=0||bullet.x<0||bullet.x>SIZE||bullet.y<0||bullet.y>SIZE)bullet.dead=true;
}

export function update(game,input={},delta=1/60) {
  if(game.state!=='playing')return;
  const dt=clamp(delta,0,1/30);
  game.time+=dt;
  for(const key of ['cooldown','invulnerable','rapid','shield'])game.player[key]=Math.max(0,game.player[key]-dt);
  game.base.shield=Math.max(0,game.base.shield-dt);game.base.flash=Math.max(0,game.base.flash-dt);
  movePlayer(game,input,dt);
  for(const tank of game.enemies) {
    tank.cooldown=Math.max(0,tank.cooldown-dt);tank.flash=Math.max(0,tank.flash-dt);tank.spawnShield=Math.max(0,tank.spawnShield-dt);moveEnemy(game,tank,dt);
  }
  for(const bullet of game.bullets)moveBullet(game,bullet,dt);
  for(let a=0;a<game.bullets.length;a++)for(let b=a+1;b<game.bullets.length;b++) {
    const first=game.bullets[a],second=game.bullets[b];
    if(!first.dead&&!second.dead&&first.enemy!==second.enemy&&near(first,second,7)){first.dead=true;second.dead=true;emit(game,'spark',first);}
  }
  game.bullets=game.bullets.filter(bullet=>!bullet.dead);game.enemies=game.enemies.filter(tank=>!tank.dead);
  if(game.state!=='playing')return;
  game.items=game.items.filter(item=>{item.ttl-=dt;if(near(item,game.player,22)){applyPower(game,item.type);return false;}return item.ttl>0;});
  game.spawnClock-=dt;
  if(game.spawned<game.level.queue.length&&game.enemies.length<game.level.maxActive&&game.spawnClock<=0) {
    if(spawnEnemy(game,game.level.queue[game.spawned])){game.spawned++;game.spawnClock=game.level.spawnGap;}
  }
  if(game.spawned>=game.level.queue.length&&!game.enemies.length) {
    game.state='won';game.score+=game.base.hp*150+game.lives*100;emit(game,'win',{score:game.score});
  }
}

export function snapshot(game) {
  return {state:game.state,level:game.level.id,time:game.time,score:game.score,shots:game.shots,kills:game.kills,spawned:game.spawned,total:game.level.queue.length,
    lives:game.lives,player:{...game.player},base:{...game.base},enemies:game.enemies.map(t=>({...t,waypoint:t.waypoint?{...t.waypoint}:null})),bullets:game.bullets.map(b=>({...b})),items:game.items.map(i=>({...i})),tiles:game.tiles.map(row=>row.join(''))};
}
