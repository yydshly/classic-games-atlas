// A public-input football pilot. Decisions are sampled every 100 ms and held;
// the campaign never assigns any engine state, positions, scores, or physics.
import {createGame,start,step,FIXED_DT,PITCH} from '../games/meadow/engine.mjs';
const sign=(d,dead=8)=>Math.abs(d)<=dead?0:Math.sign(d);
export function pilotInput(s,memory={}){
  if(s.state!=='playing')return {x:0,y:0,shoot:false,pass:false,switch:false};
  const p=s.players[s.controlled],b=s.ball;const out={x:0,y:0,shoot:false,pass:false,switch:false};
  if(b.owner===p.id){
    if(memory.owner!==p.id){memory.lane=memory.config?.lane??(p.y<300?225:375);memory.route=0;memory.owner=p.id;}
    const lane=memory.lane??225;
    if(s.charging){out.x=1;out.y=0;out.shoot=s.charge<(memory.config?.charge??(s.levelIndex===5?.48:.38));return out;}
    if(p.x>(memory.config?.shootX??690)&&Math.abs(p.y-lane)<12){out.x=1;out.shoot=true;return out;}
    const defenders=s.players.filter(q=>q.team===1&&q.role==='outfield');
    const near=defenders.sort((a,b)=>Math.hypot(a.x-p.x,a.y-p.y)-Math.hypot(b.x-p.x,b.y-p.y))[0];
    if(p.x<(memory.config?.turnX??580)){const wide=lane<300?125:475;out.x=1;out.y=sign(wide-p.y,10);}
    else {out.x=1;out.y=sign(lane-p.y,10);}
    return out;
  }
  memory.owner=null;
  const owner=b.owner===null?null:s.players[b.owner];
  if(owner?.team===0){if(owner.role==='outfield'&&owner.id!==p.id)out.switch=true;return out;}
  const target=owner??b;const mate=s.players[p.id===0?1:0],d=Math.hypot(target.x-p.x,target.y-p.y),md=Math.hypot(target.x-mate.x,target.y-mate.y);
  if(md+65<d){out.switch=true;return out;}
  out.x=sign(target.x+(target.vx||0)*.12-p.x,5);out.y=sign(target.y+(target.vy||0)*.12-p.y,5);
  if(owner&&d<52&&p.cooldown<=0)out.pass=true;
  return out;
}
export function createPilot(config={}){const memory={config};return s=>pilotInput(s,memory);}
export function playLevel(index,options={}){const s=createGame(index),pilot=createPilot(options.pilot);start(s);const decisionTicks=6,maxTicks=options.maxTicks??14000;let input={},ticks=0;for(;ticks<maxTicks&&!['won','lost'].includes(s.state);ticks++){if(ticks%decisionTicks===0)input=pilot(s);step(s,FIXED_DT,input);}return {state:s,ticks,won:s.state==='won',score:[...s.score],stats:JSON.parse(JSON.stringify(s.stats))};}
if(process.argv[1]&&import.meta.url===new URL(`file://${process.argv[1]}`).href){for(let i=0;i<8;i++){const r=playLevel(i);console.log(i+1,r.state.state,r.score,JSON.stringify(r.stats));}}
