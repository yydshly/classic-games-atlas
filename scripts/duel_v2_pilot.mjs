import{createGame,input,advanceTicks,snapshot}from'../versions/v2/games/duel/engine.mjs';
export function choose(g){const p=g.player,e=g.enemy,dist=e.x-p.x,out=[],put=(kind,value)=>out.push(value===undefined?{kind}:{kind,value});if(g.state!=='playing'||p.action||g.ticks<p.stunUntil)return out;
if(p.jumpAge!==null){if(p.y>45&&p.y<115&&dist<118)put('aerial');return out;}
if(p.face!==1){put('move',1);put('move',0);}
const threat=e.action&&e.action.kind!=='dash'&&e.action.age<e.action.wind+e.action.active;
if(threat&&dist<=e.action.range+20){if(e.action.kind==='throw'){if(p.guard)put('guard',false);put('jump');}else if(e.action.kind==='aerial'&&dist<107&&p.energy>=22&&g.ticks>=p.cooldown){if(p.guard)put('guard',false);put('anti');}else put('guard',true);return out;}
if(p.guard)put('guard',false);
if(e.jumpAge!==null&&dist<106&&e.y>35&&p.energy>=22){put('anti');return out;}
if(e.guard){if(dist<=64)put('throw');else put('move',1);return out;}
const recovery=e.action&&e.action.kind!=='dash'&&e.action.age>=e.action.wind+e.action.active;
if(recovery&&dist<=146&&g.ticks>=p.cooldown&&p.energy>=20){put('heavy');return out;}
put('move',dist>123?1:0);return out;}
export function play(i){const g=createGame(i);input(g,{kind:'start'});while(g.state==='playing'){for(const c of choose(g))input(g,c);advanceTicks(g,4);}return g;}
if(process.argv[1]?.endsWith('duel_v2_pilot.mjs'))console.log(JSON.stringify(Array.from({length:8},(_,i)=>{const s=snapshot(play(i));return{level:s.level,state:s.state,hp:s.player.hp,enemy:s.enemy.hp,ticks:s.ticks,commands:s.log.length,actions:[...new Set(s.log.map(x=>x.kind))],invariants:s.invariants}}),null,2));
