export const WIDTH=900,HEIGHT=620,STEP=1/120,GRAVITY=840,DURATION=60;
export const FRUIT={pear:{name:'星梨',radius:27,points:10,color:'#b8cd65'},citrus:{name:'灯柑',radius:29,points:10,color:'#f3a343'},berry:{name:'露莓',radius:24,points:10,color:'#e86580'},bell:{name:'铃果',radius:30,points:15,color:'#eccc65'},frost:{name:'霜果',radius:29,points:10,color:'#b8ecf5'},thorn:{name:'荆核',radius:27,points:0,color:'#665565'}};
function make(id){const waves=[];for(let n=0;n<27;n++){const at=.65+n*2.15,cx=[310,570,420,520,360,590][n%6], kinds=['pear','citrus','berry','bell'];
 if(id===1){ // Staggered launches converge around the apex, not an instant row.
  for(let j=0;j<3;j++){const delay=j*.09,flight=.94-delay,x=cx+(j-1)*112;waves.push({time:at+delay,targets:[{kind:n%5===2&&j===1?'frost':kinds[(n+j)%4],x,y:680,vx:(cx+(j-1)*52-x)/flight,vy:(285-680-.5*GRAVITY*flight*flight)/flight}]});}
  if(n%3===2)waves.push({time:at+.15,targets:[{kind:'thorn',x:cx<450?730:170,y:680,vx:0,vy:-810}]});
 }else{ // Two safe branches, with a thorn in the tempting connecting line.
  const shift=n%2?32:-32;waves.push({time:at,targets:[{kind:n%5===2?'frost':kinds[n%4],x:cx-133,y:680,vx:25,vy:-840},{kind:kinds[(n+1)%4],x:cx+133,y:680,vx:-25,vy:-850},{kind:'thorn',x:cx+shift,y:680,vx:-shift*.3,vy:-840}]});
  waves.push({time:at+.28,targets:[{kind:kinds[(n+2)%4],x:cx+(n%2?160:-160),y:680,vx:n%2?-34:34,vy:-850}]});
 }}waves.sort((a,b)=>a.time-b.time);return{id,name:id===1?'聚果场':'分枝场',theme:id===1?'breeze':'moon',wind:id===1?5:-5,waves,total:waves.reduce((a,w)=>a+w.targets.filter(t=>t.kind!=='thorn').length,0),hint:id===1?'等错峰果实聚到空中，再用一条短弧收下连切。':'果实分居荆核两侧：抬刀分切，或沿外侧绕弧；危险果可以放过。'};}
export const LEVELS=[make(1),make(2)];
