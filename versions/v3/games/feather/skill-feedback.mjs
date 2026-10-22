import {SPECIES,V2,phase,active,maxHP,allowed,trialHit} from './model.mjs';

// Presentation only: use the existing model's current target and damage estimate.
export function skillFeedback(state) {
 const mode=phase(state);
 if(!['encounter','trial'].includes(mode))return null;
 const b=state.base,p=active(b),trial=mode==='trial';
 const calm=trial?state.trial.calm:b.wild.calm;
 const hit=()=>trial?trialHit(state,true):V2.estimateHit(b,true);
 const damage=()=>trial?'余势−'+hit():'造成'+hit()+'伤害';
 const heal=limit=>Math.min(limit,maxHP(p)-p.hp);
 const soothe=limit=>Math.min(limit,60-calm);
 const effects={
  a:()=>damage()+'；接下来2次来招减半',
  b:()=>'自身先恢复'+heal(28)+'体力（最多28）',
  c:()=>'自身先恢复'+heal(18)+'体力；'+(trial?'合奏安心':'安心')+'+'+soothe(10),
  bud:()=>(trial?'合奏安心':'安心')+'+'+soothe(22)+'；下次来招减半',
  fin:()=>damage()+'；本次18护盾'
 };
 const reason=allowed(state,trial?'trialSkill':'skill');
 return {name:SPECIES[p.id].skill,cost:'耗2能量 · 当前'+p.energy+'/3',effect:effects[p.id](),reason};
}
