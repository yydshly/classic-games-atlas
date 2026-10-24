function baseFeedback(s){
 if(s.state==='woke')return{title:'哐——修理师醒了。',message:'这次碰撞太响。回零件盘旁，再试试提前制动或绕软垫。'};
 if(s.state==='fell'){
  if(s.fallFrom?.material==='soft')return{title:'滚出了软垫桌沿。',message:'软垫安静，但桌沿很窄。回入口，转向前先把横向速度刹住。'};
  if(s.fallFrom?.material==='metal')return{title:'从金属桌边滚下去了。',message:'较宽的桌面也没有护栏。回入口再试，接近外沿前先松开方向并制动。'};
  return{title:'滚出了桌沿。',message:'脚下没有桌面托住你。回入口再试，留意落脚的位置，提前制动。'};
 }
 if(s.state==='charged')return{title:'充上电了，他还睡着。',message:'桌面又安静下来。你可以重新试另一条路，没有路线奖励。'};
 if(s.lastImpact&&s.time-s.lastImpact.time<1.8)return{title:s.lastImpact.material==='soft'?'软垫接住了这声轻碰。':'工具碰响了，修理师动了一下。',message:'看他的反应和睡眠指示。松开冲力，提前制动，不必原地等满。'};
 return{title:s.noise>.55?'他睡得浅了，轻一点。':'回到桌子另一头的充电座。',message:'金属桌面较宽，工具怕撞；软垫绕路更安静，但桌沿很窄。'};
}

// A small cross refers only to an observed supporting contact, never a guessed route.
export function fallMarker(s){
 const p=s.fallPoint;return s.state==='fell'&&Array.isArray(p)&&p.length===3&&p.every(Number.isFinite)?[p[0],p[1]+.045,p[2]]:null;
}

export function feedback(s){
 const result=baseFeedback(s);return fallMarker(s)?{...result,message:'小叉标出最后托住你的位置。'+result.message}:result;
}
