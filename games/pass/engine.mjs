import {LEVELS,TOWERS,ENEMIES} from './levels.mjs';
export function pathLength(path){return path.slice(1).reduce((n,p,i)=>n+Math.hypot(p.x-path[i].x,p.y-path[i].y),0);}
export function pointAt(path,d){for(let i=1;i<path.length;i++){const a=path[i-1],b=path[i],n=Math.hypot(b.x-a.x,b.y-a.y);if(d<=n)return {x:a.x+(b.x-a.x)*Math.max(0,d)/n,y:a.y+(b.y-a.y)*Math.max(0,d)/n};d-=n;}return {...path.at(-1)};}
export function createGame(index=0){const l=LEVELS[Math.max(0,Math.min(7,index))];return {state:'ready',level:l.id,path:l.path.map(p=>({...p})),length:pathLength(l.path),sites:l.sites.map(p=>({...p})),waves:l.waves,gold:l.gold,hp:l.hp,maxHP:l.hp,wave:0,waveTotal:l.waves.length,time:0,speed:1,phase:'build',enemies:[],towers:[],effects:[],spawn:[],spawnClock:0,nextId:1,kills:0,leaks:0,earned:0,spent:0,sold:0,events:[],reason:''};}
export function start(g){if(g.state==='ready')g.state='playing';}
export function pause(g){if(g.state==='playing')g.state='paused';else if(g.state==='paused')g.state='playing';}
export function setSpeed(g,speed){if([1,2].includes(speed))g.speed=speed;}
export const towerStats=t=>TOWERS[t.type].levels[t.level-1];
export function build(g,siteId,type){if(g.state!=='playing'||!TOWERS[type]||!g.sites.some(s=>s.id===siteId)||g.towers.some(t=>t.site===siteId)||g.gold<TOWERS[type].cost)return false;const cost=TOWERS[type].cost,site=g.sites.find(s=>s.id===siteId);g.gold-=cost;g.spent+=cost;g.towers.push({site:siteId,type,level:1,x:site.x,y:site.y,cooldown:0,invested:cost,angle:0});g.events.push({type:'build'});return true;}
export function upgrade(g,siteId){const t=g.towers.find(t=>t.site===siteId);if(g.state!=='playing'||!t||t.level!==1||g.gold<TOWERS[t.type].upgrade)return false;const cost=TOWERS[t.type].upgrade;g.gold-=cost;g.spent+=cost;t.invested+=cost;t.level=2;g.events.push({type:'upgrade'});return true;}
export const saleValue=t=>Math.floor(t.invested*.7);
export function sell(g,siteId){const t=g.towers.find(t=>t.site===siteId);if(g.state!=='playing'||!t)return false;const refund=saleValue(t);g.gold+=refund;g.sold+=refund;g.towers=g.towers.filter(v=>v!==t);g.events.push({type:'sell'});return true;}
export function nextWave(g){if(g.state!=='playing'||g.phase!=='build'||g.wave>=g.waveTotal)return false;const plan=g.waves[g.wave];g.wave++;g.spawn=plan.flatMap(group=>Array.from({length:group.count},()=>({type:group.type,gap:group.gap})));g.spawnClock=.2;g.phase='wave';g.events.push({type:'wave'});return true;}
export function spawnEnemy(g,type){const spec=ENEMIES[type],scale=LEVELS[g.level-1].hpScale*(1+(g.wave-1)*.10),hp=Math.round(spec.hp*scale);const e={id:g.nextId++,type,hp,maxHP:hp,d:0,...pointAt(g.path,0),slowEffects:[],dead:false,escaped:false};g.enemies.push(e);return e;}
export function slowFactor(e){return e.slowEffects.reduce((n,s)=>s.until>0?Math.min(n,s.factor):n,1);}
export function applySlow(e,factor,duration){e.slowEffects.push({factor,until:duration});}
export function damage(g,e,amount){if(e.dead||e.escaped||e.hp<=0)return false;e.hp=Math.max(0,e.hp-amount);if(e.hp===0){e.dead=true;const reward=ENEMIES[e.type].reward;g.gold+=reward;g.earned+=reward;g.kills++;g.events.push({type:'kill'});}return true;}
export function targetFor(g,t){const r=towerStats(t).range;return g.enemies.filter(e=>!e.dead&&!e.escaped&&e.hp>0&&Math.hypot(e.x-t.x,e.y-t.y)<=r).sort((a,b)=>b.d-a.d||a.id-b.id)[0]??null;}
export function shoot(g,t,e){const s=towerStats(t);t.angle=Math.atan2(e.y-t.y,e.x-t.x);const targets=s.splash?g.enemies.filter(v=>!v.dead&&!v.escaped&&Math.hypot(v.x-e.x,v.y-e.y)<=s.splash):[e];const x=e.x,y=e.y;for(const victim of targets){if(damage(g,victim,s.damage)&&s.slow&&victim.hp>0)applySlow(victim,s.slow,s.duration);}g.effects.push({kind:t.type,x,y,fromX:t.x,fromY:t.y,r:s.splash||0,ttl:.24,max:.24});t.cooldown=s.cooldown;g.events.push({type:'shot',kind:t.type});}
function tick(g,dt){
 g.time+=dt;g.effects.forEach(e=>e.ttl-=dt);g.effects=g.effects.filter(e=>e.ttl>0);for(const t of g.towers)t.cooldown=Math.max(0,t.cooldown-dt);
 if(g.phase!=='wave')return;
 g.spawnClock-=dt;while(g.spawn.length&&g.spawnClock<=0){const entry=g.spawn.shift();spawnEnemy(g,entry.type);g.spawnClock+=entry.gap;}
 for(const e of g.enemies){if(e.dead||e.escaped)continue;for(const s of e.slowEffects)s.until-=dt;e.slowEffects=e.slowEffects.filter(s=>s.until>0);e.d+=ENEMIES[e.type].speed*slowFactor(e)*dt;Object.assign(e,pointAt(g.path,e.d));if(e.d>=g.length){e.escaped=true;g.hp=Math.max(0,g.hp-ENEMIES[e.type].leak);g.leaks++;g.events.push({type:'leak'});}}
 // Base destruction takes precedence over a simultaneous last enemy/last wave.
 if(g.hp===0){g.state='lost';g.reason='山口失守';g.events.push({type:'lost'});return;}
 for(const t of g.towers){if(t.cooldown>1e-8)continue;const e=targetFor(g,t);if(e)shoot(g,t,e);}
 g.enemies=g.enemies.filter(e=>!e.dead&&!e.escaped);
 if(!g.spawn.length&&!g.enemies.length){g.phase='build';g.gold+=LEVELS[g.level-1].reward+g.wave*5;g.earned+=LEVELS[g.level-1].reward+g.wave*5;if(g.wave===g.waveTotal){g.state='won';g.events.push({type:'won'});}else g.events.push({type:'clear'});}
}
export function update(g,realDt){if(g.state!=='playing'||!Number.isFinite(realDt)||realDt<=0)return;let left=Math.min(.25,realDt)*g.speed;while(left>1e-8&&g.state==='playing'){const dt=Math.min(1/60,left);tick(g,dt);left-=dt;}}
export function preview(g){return (g.waves[g.phase==='build'?g.wave:g.wave-1]||[]).map(x=>({...x,...ENEMIES[x.type],count:x.count}));}
export function snapshot(g){return JSON.parse(JSON.stringify(g, (key,value)=>key==='events'?undefined:value));}
