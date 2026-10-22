// Read-only input suggestion. Model proof only; the controller must issue ordinary UI inputs.
import {deriveStats,nextWaypoint,canStand,lineOfSight} from '../../preview/glimmer/engine.mjs';
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const steering=(g,to)=>{const p=g.player,w=nextWaypoint(g,p,to)??to;return {x:Math.abs(w.x-p.x)>.12?Math.sign(w.x-p.x):0,y:Math.abs(w.y-p.y)>.12?Math.sign(w.y-p.y):0};};
export function chooseInput(g,options={}){
 const idle={x:0,y:0,attack:false,skill:false,dodge:false};
 if(g.state==='ready'||g.state==='paused')return {input:idle,command:{type:'start'}};
 if(g.state==='choosing'){const id=g.choice.offers.find(id=>id===(g.level===1?(options.weapon??'blade'):(options.charm??'ward')))??g.choice.offers[0];return {input:idle,command:{type:'choose',gearId:id}};}
 if(g.state!=='playing')return {input:idle};
 const p=g.player,s=deriveStats(g);if(g.heals&&p.hp<p.maxHp*.48)return {input:idle,command:{type:'heal'}};
 let target=null,chest=null;
 if(g.level===1||g.level===2&&!options.skipSide){chest=g.chests.find(c=>!c.resolved);if(chest){const guards=g.enemies.filter(e=>e.alive&&chest.lockedBy.includes(e.id));if(guards.length)target=guards.sort((a,b)=>distance(a,p)-distance(b,p))[0];else if(distance(chest,p)<=1.25)return {input:idle,command:{type:'open',chestId:chest.id}};else return {input:steering(g,chest)};}}
 if(!target)target=g.enemies.filter(e=>e.alive&&!e.optional).sort((a,b)=>distance(a,p)-distance(b,p))[0];
 if(!target){if(distance(p,g.exit)<=1.3)return {input:idle,command:{type:'exit'}};return {input:steering(g,g.exit)};}
 const d=distance(target,p),input={...idle,attack:d<=s.attackRange+.2,skill:d<=s.skillRadius-.1};
 if(!lineOfSight(g,p,target)||d>s.attackRange-.03)Object.assign(input,steering(g,target));
 const danger=g.enemies.filter(e=>e.alive&&e.state==='windup'&&e.windup<.5).find(e=>e.attack.kind==='bolt'?distance(e,p)<4.5:distance(e.attack,p)<e.attack.radius+.6);
 if(danger){const a=danger.attack,dx=p.x-a.x,dy=p.y-a.y;
  const away=a.kind==='bolt'?{x:-dy,y:dx}:{x:dx,y:dy};let len=Math.hypot(away.x,away.y)||1;const wanted={x:p.x+away.x/len*.6,y:p.y+away.y/len*.6};
  if(canStand(g,wanted.x,wanted.y)){input.x=Math.sign(away.x);input.y=Math.sign(away.y);}else {input.x=Math.sign(-away.x);input.y=Math.sign(-away.y);}input.dodge=p.dodgeCooldown<=0;}
 return {input,target:target.id};
}
