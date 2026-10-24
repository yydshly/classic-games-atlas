import {dockState} from './presentation.mjs?v=gentle-home-9bcd0fc-r1';
function baseFeedback(s){
 if(s.state==='woke')return{title:'哐——修理师醒了。',message:'这次碰撞太响。回零件盘旁，再试试提前制动或绕软垫。'};
 if(s.state==='fell'){
  if(s.fallFrom?.material==='soft')return{title:'滚出了软垫桌沿。',message:'软垫安静，但桌沿很窄。回入口，转向前先把横向速度刹住。'};
  if(s.fallFrom?.material==='metal')return{title:'滚出了工作台边缘。',message:'宽桌面也有尽头。接近外沿前，先松开方向并制动。'};
  return{title:'滚出了桌沿。',message:'脚下没有桌面托住你。回入口再试，留意落脚的位置，提前制动。'};
 }
 if(s.state==='charged')return{title:'轻轻回窝了。',message:'触点已接通。修理师还睡着，桌面又安静下来。'};
 if(s.player){const dock=dockState(s);if(dock==='too-fast')return{title:'已经到了，先刹住。',message:'窝里的双竖线亮着：还在滑行，触点尚未接通。按住 Shift / 制动。'};if(dock==='approach')return{title:'充电窝就在眼前。',message:'松开方向，轻轻制动，停进软垫上的两条铜触点。'};}
 if(s.lastImpact&&s.time-s.lastImpact.time<1.8)return{title:s.lastImpact.material==='soft'?'布包接住了这声轻碰。':'工具响了，他动了一下。',message:'松开冲力，提前制动；安静下来就会继续睡。'};
 return{title:s.noise>.55?'他睡得浅了，轻一点。':'轻轻回到充电窝。',message:'工具区宽，怕撞；软垫边安静，转弯要先刹住。'};
}

// A small cross refers only to an observed supporting contact, never a guessed route.
export function fallMarker(s){
 const p=s.fallPoint;return s.state==='fell'&&Array.isArray(p)&&p.length===3&&p.every(Number.isFinite)?[p[0],p[1]+.045,p[2]]:null;
}

export function feedback(s){
 const result=baseFeedback(s);return fallMarker(s)?{...result,message:'小叉标出最后托住你的位置。'+result.message}:result;
}
