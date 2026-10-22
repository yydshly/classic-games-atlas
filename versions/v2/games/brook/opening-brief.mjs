// A ready-state summary of the already public spawn schedule, not a simulation rule.
export function openingBrief(level,names){
 const first=level?.spawns?.[0];
 if(!first)return '先读来敌预告，再开始布防。准备时不计时。';
 const arrivals=level.spawns.filter(s=>s.at===first.at).map(s=>`${s.row+1}行 · ${names[s.type]?.name||s.type}`);
 return `最先入场：开场第${first.at}秒，${arrivals.join(' / ')}。准备时不计时，开始后再部署。`;
}
