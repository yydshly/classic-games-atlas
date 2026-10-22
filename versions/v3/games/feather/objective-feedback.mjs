import {SPECIES,phase,progress,readiness} from './model.mjs';

// Display the existing milestones in the context of the current activity.
// Preparation eligibility, commands and save records remain model-owned.
export function journeyObjective(state) {
 const mode=phase(state),p=progress(state);
 if(p.completed)return '旅途已完成，归羽营地仍欢迎自由出行。';
 if(mode==='trial')return '属性和来招都已预告：每次行动都占一拍，看清再决定。';
 if(mode==='camp')return readiness(state)||'准备就绪：可以自由编队，在营地迎接浅滩回响。';
 if(!p.discovered){
  const newcomers=state.base.pending.filter(q=>['bud','fin'].includes(q.id));
  if(newcomers.length)return '当前目标：带'+newcomers.map(q=>SPECIES[q.id].name).join('、')+'回营入册，再调整出行队伍。';
  return mode==='encounter'?'当前目标：用羽结结识新伙伴；成功后带回营入册。':'当前目标：结识新伙伴。前往晶芽草间或回声浅湾，羽结回应后带回营。';
 }
 if(!p.adjusted)return '当前目标：回营调整队伍，把任意一位新伙伴换入出行位。';
 if(!p.grown)return '当前目标：让任意伙伴参与两次有结果的相遇，获得一次成长；之后回营准备。';
 return '准备就绪：回营后可迎接浅滩回响，或继续自由探索。';
}
