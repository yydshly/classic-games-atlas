import {pathToFileURL} from 'node:url';
import {LEVELS,RULES,FIXED_DT,createGame,start,step,pointAt} from '../engine.mjs';
// This pilot uses exactly the digital wheel/brake/drift/item controls exposed by the UI.
// No state edits, special lap advance, AI override, continuous steering or forced outcomes.
const heldInputs=new WeakMap();
export function pilotInput(g,{holdTicks=6}={}){const slot=Math.floor(g.ticks/holdTicks),old=heldInputs.get(g);if(old&&old.slot===slot&&old.holdTicks===holdTicks)return {...old.input};if(g.state!=='playing')return {steer:0,brake:false,drift:false,item:false};const c=g.cars[0],l=LEVELS[g.level-1];let maxCurve=0;for(let d=0;d<=Math.max(30,c.speed*.55);d+=7)maxCurve=Math.max(maxCurve,Math.abs(pointAt(l,c.s+d).curvature));
 const here=pointAt(l,c.s),wind=l.wind*Math.sin(c.s/l.track.length*Math.PI*2+.4);let lane=0;
 for(const o of l.obstacles){const ahead=(o.s-c.s%l.track.length+l.track.length)%l.track.length;if(ahead<90)lane=o.lateral<0?12:-12;}
 const desiredError=Math.max(-.36,Math.min(.36,-.025*(c.lateral-lane)-wind/Math.max(24,c.speed)));
 const safe=Math.max(18,Math.min(100,RULES.steerRate*l.grip*1.12/(maxCurve+.001)-28));
 const brake=c.speed>safe||Math.abs(c.headingError)>.42;
 const drift=Math.abs(here.curvature)>.005&&Math.abs(here.curvature)<.035&&c.speed>40&&Math.abs(c.lateral)<18;
 const rate=RULES.steerRate*c.speed/(c.speed+28)*l.grip*(drift?1.16:1);
 const steer=Math.max(-1,Math.min(1,Math.round(((desiredError-c.headingError)/(FIXED_DT*holdTicks)+here.curvature*c.speed)/Math.max(.1,rate))));
 const item=c.item==='boost'?maxCurve<.014&&!brake:c.item==='shield'?Math.abs(c.lateral)>17||g.cars.some(o=>o.id!==0&&Math.abs(o.s-c.s)<30):c.item==='pulse'?g.cars.some(o=>o.id!==0&&o.s>c.s&&o.s-c.s<50):false;
 const input={steer,brake,drift,item};heldInputs.set(g,{slot,holdTicks,input});return {...input};}
export function playLevel(index=0,{limit=200,collect=false}={}){const game=createGame(index),inputs=[];start(game);for(let i=0;i<limit/FIXED_DT&&!['won','lost'].includes(game.state);i++){const input=pilotInput(game);if(collect)inputs.push(input);step(game,FIXED_DT,input);}return {game,inputs,state:game.state,place:game.rank,time:game.time,stats:{...game.stats}};}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){for(let i=0;i<8;i++){const r=playLevel(i);console.log(JSON.stringify({level:i+1,state:r.state,place:r.place,time:+r.time.toFixed(2),stats:r.stats,cars:r.game.cars.map(c=>({id:c.id,s:+c.s.toFixed(1),speed:+c.speed.toFixed(1),lateral:+c.lateral.toFixed(1)}))}));} }
