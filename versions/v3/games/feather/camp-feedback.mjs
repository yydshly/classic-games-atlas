import {SPECIES} from './model.mjs';

// No current target or battle forecast exists in camp. Reuse the fixed skill
// definitions, distinguishing base power and capped recovery from actual effects.
export function campSkillInfo(partner) {
 const sp=SPECIES[partner.id];
 return {name:sp.skill,cost:'耗2能量',effect:sp.skillHint.replace(/^2能量 · /,'')
  .replace('10威力','基础威力10').replace('自身恢复','自身最多恢复')
  .replace('安心+','安心最多+').replace('自身获得18护盾','本次18护盾')};
}
