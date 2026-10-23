// Guidance follows the current physical place, not a latched journey milestone.
export function dockFeedback(s,course,{plateTried=false}={}){
 const p=s.player.position,r=course.player.radius;
 const onShore=def=>{const [x,y,z]=def.position,[w,h,d]=def.size;return Math.abs(p[0]-x)<=w/2&&Math.abs(p[2]-z)<=d/2&&Math.abs(p[1]-r-(y+h/2))<.4;};
 const arrival=course.surfaces.find(d=>d.id==='arrival-dock'),near=course.surfaces.find(d=>d.id==='near-dock');
 if(s.completed)return{context:'complete',objective:'接应灯亮了。你搭上了这一趟。',message:'到了。接应灯为你亮起；可以看看新岸，也可以打开到岸回顾。',detail:'对岸泊位 · 已抵达'};
 if(s.onBoat){
  if(s.ferry.phase==='dwellFar')return{context:'ferry',objective:'渡台靠岸了，向接应灯走去。',message:'前方是对岸甲板，慢行上岸，走向接应灯。',detail:'渡台 · 对岸停靠'};
  return{context:'ferry',objective:'你在船上了。稳住，看看对岸。',message:s.ferry.phase==='inbound'?'渡台正在返航。站稳，留意下一次靠岸。':'渡台正载着你过水。稳住后，可以看看对岸的接应灯。',detail:'渡台 · 已登船'};
 }
 if(arrival&&onShore(arrival))return{context:'arrival',objective:'已经上岸了，向接应灯走去。',message:'你已到对岸。前面的接应灯在等你，继续向它走去。',detail:'对岸泊位 · 已上岸'};
 if(!near||!onShore(near))return{context:'air',objective:'看准脚下的甲板，留出落脚与制动的距离。',message:'留意脚下的落点；R可回到最近的安全岸边。',detail:'留意脚下'};
 const by=s.plateBy;
 if(s.gate?.heldClosing)return{context:'near',objective:'登船口有人，栏杆正在等通道空出。',message:'栏杆暂缓关闭。先离开门口，再看踏板与门的变化。',detail:'登船口 · 安全保持'};
 if(by==='player')return{context:'near',objective:'门开了，可你还留在踏板上。',message:'踏板亮了，登船口正在打开；你一离开，重量也会离开。',detail:'你压着踏板，灯带亮了。'};
 if(by==='crate'||by==='both')return{context:'near',objective:'登船口保持开放，渡台会来接你。',message:'货箱接过了重量，登船口保持开放。等渡台靠稳再上船。',detail:by==='both'?'你和货箱都压着踏板。':'货箱留在踏板上，灯带亮着。'};
 return{context:'near',objective:plateTried?'你一离开，登船口就合上了。':'对岸亮着接应灯，找个办法搭上渡台。',message:plateTried?'重量离开，踏板的灯熄了，登船口也会合上。':'登船口还关着，附近的灯带似乎连着它。',detail:plateTried?'重量离开，踏板的灯熄了。':'岸上的灯带通向登船口。'};
}
