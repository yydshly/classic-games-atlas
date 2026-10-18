export const WIDTH=900,HEIGHT=620,STEP=1/120,GRAVITY=840;
export const FRUIT={pear:{name:'星梨',radius:27,points:10,color:'#a3bc77'},citrus:{name:'灯柑',radius:29,points:10,color:'#e8a45e'},berry:{name:'露莓',radius:24,points:10,color:'#cb7c85'},bell:{name:'铃果',radius:30,points:15,color:'#d3bc6a'},thorn:{name:'荆核',radius:27,points:0,color:'#665565'}};
function wave(time,cx,count,vy,mode='none',variant=0){const fruits=Array.from({length:count},(_,i)=>{const d=i-(count-1)/2;return{kind:variant>=6&&i===count-1?'bell':['pear','citrus','berry'][(i+variant)%3],x:cx+d*(mode==='split'?125:61),y:680,vx:(450-cx)*.12+d*7,vy:vy-d*8};});if(mode!=='none'){const x=mode==='split'?cx:Math.max(135,Math.min(765,cx+(cx<450?245:-245)));fruits.push({kind:'thorn',x,y:680,vx:(450-x)*.12,vy:mode==='split'?vy+65:vy+20});}return{time,targets:fruits};}
function level(id,name,theme,centers,counts,modes,vy,interval,wind=0){const waves=centers.map((x,i)=>wave(.8+i*interval,x,counts[i],vy+(i%2?25:-15),modes[i],id+i)),total=counts.reduce((a,n)=>a+n,0),minCuts=total-(id===1?0:id===2?1:2);return{id,name,theme,wind,waves,total,minCuts,minScore:minCuts*10,minCombo:id===1?1:id<5?2:3,errorLimit:3,hint:({1:'按下并拖过果实，点击不会收集。先练三次完整划线。',2:'一条划线连续切过同波两个果实，就能得到连击加分。',3:'荆核带十字与尖刺，碰到扣一次失误；从安全一侧划过果实。',4:'不同高度和大小的果实需要稍微弯曲轨迹，别追落到底部的目标。',5:'暖风让抛物线缓缓侧移。至少完成一次三连切，短时连续切中才算一组。',6:'分开的果实之间有荆核。可以绕上方画弧线，不要直穿危险物。',7:'金色铃果值15分，仍然只得分一次；选择安全轨迹比追高分更重要。',8:'组合会交替从两侧抛出。目标一波波到来，不必一直按住不放。',9:'月光场景同样有清楚的果形和荆核十字，靠轨迹与时机判断。',10:'密集三果组合之间要控制弧线高度，先看荆核，再落刀。',11:'分离组合与普通组合交替。超过短暂间隔的连击会重新计数。',12:'七波混合目标收官：满足切果、分数和三连切要求，且失误少于三次。'})[id]};}
export const LEVELS=[
level(1,'晨园第一划','dawn',[240,450,660],[1,1,1],['none','none','none'],-820,1.65),
level(2,'双果成串','dawn',[260,620,360,550],[2,2,2,2],['none','none','none','none'],-835,1.65),
level(3,'荆核在旁','dawn',[260,620,360,550],[2,2,2,2],['side','none','side','none'],-845,1.7),
level(4,'高低两枝','dawn',[240,650,340,580,450],[2,2,2,2,2],['none','side','none','side','side'],-870,1.6),
level(5,'暖风三果','breeze',[280,600,370,520],[3,3,3,3],['side','none','side','side'],-850,1.75,18),
level(6,'绕开荆心','breeze',[300,600,370,550,450],[3,3,3,3,3],['side','split','side','split','side'],-865,1.75,-15),
level(7,'铃果金光','breeze',[270,600,330,560,440],[2,3,2,3,3],['side','side','none','split','side'],-840,1.65,12),
level(8,'风过两岸','breeze',[250,630,350,550,300,600],[3,3,2,3,3,2],['side','split','side','side','split','side'],-870,1.65,-18),
level(9,'月园初灯','moon',[290,610,360,550,450],[3,2,3,2,3],['side','side','split','side','split'],-850,1.7),
level(10,'月弧六奏','moon',[270,620,350,550,310,590],[3,3,3,3,3,3],['side','split','side','split','side','split'],-880,1.6,10),
level(11,'曲线留白','moon',[260,620,340,570,420,510],[2,3,3,2,3,3],['side','split','split','side','split','side'],-860,1.65,-10),
level(12,'果园的合奏','moon',[280,620,350,570,300,590,450],[3,3,3,3,3,3,3],['side','split','side','split','side','split','split'],-875,1.6,8)
];
