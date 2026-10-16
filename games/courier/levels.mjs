export const STEP=1/120,WIDTH=900,HEIGHT=620,LOOKAHEAD=82,JUMP_SECONDS=.84,SLIDE_SECONDS=.78;
export const THEMES={valley:{name:'晨谷邮路',sky:'#e8eee5',mountain:'#9cab91',far:'#c2cdb6',road:'#d6c5a5',edge:'#526c5b',accent:'#e16c3b'},bamboo:{name:'竹桥回响',sky:'#dcebe6',mountain:'#688f80',far:'#b0c9ba',road:'#c4b997',edge:'#355f56',accent:'#c67938'},cloud:{name:'云台来信',sky:'#e5e5ef',mountain:'#81859d',far:'#c5c5d8',road:'#c5bdd0',edge:'#555d7e',accent:'#ce6758'}};
// Each row is 26 metres apart. Even at the final speed there is >1.04s
// between rows; a two-lane crossing needs .2s and actions finish in <.85s.
const definitions=[
 ['出发，带上一封信','valley','先看前方的路牌。左右换道，矮栏跳过，横梁滑过。',['crate','crate','jump','crate','slide','fork','jump','slide','crate']],
 ['溪声在左手边','valley','两边都是路，信件决定你想走哪一边。',['crate','fork','jump','crate','slide','jump','fork','slide','crate']],
 ['石阶上的节奏','valley','换道可以在空中或滑行时进行；跳跃与滑行不能同时使用。',['jump','crate','slide','fork','jump','slide','crate','jump','slide']],
 ['把晨光送到山口','valley','连着读两块路牌，动作结束后再准备下一次。',['crate','jump','slide','fork','crate','slide','jump','crate','jump','slide']],
 ['竹影的第一道弯','bamboo','竹桥仍有三条完整的路。选择信件所在的空道。',['fork','crate','jump','slide','crate','jump','fork','slide','jump','crate']],
 ['桥上有回音','bamboo','橙色矮栏看脚下，蓝色横梁看头顶；形状与文字一起提示。',['jump','slide','crate','fork','slide','jump','crate','slide','jump','fork']],
 ['两岸的来信','bamboo','岔路左右各有一封信，一次经过通常只能选择一封。',['crate','jump','fork','slide','jump','crate','slide','fork','jump','slide','crate']],
 ['风穿过竹帘','bamboo','先换到有信的道，再把动作留给障碍前的一拍。',['slide','jump','crate','slide','fork','jump','slide','crate','jump','fork','slide']],
 ['云台在望','cloud','速度稍快，预警仍超过三秒。别等障碍来到脚边才读路牌。',['fork','jump','slide','crate','jump','slide','fork','crate','slide','jump','crate']],
 ['把风装进信袋','cloud','交错的方向不是连续长按；每次按键只换一条道。',['jump','crate','slide','fork','jump','slide','crate','jump','fork','slide','jump','crate']],
 ['最后一段山脊','cloud','连贯动作之间有完整恢复时间。先看下一组，再稳稳通过。',['slide','jump','crate','fork','slide','jump','crate','slide','jump','fork','slide','jump']],
 ['所有来信，都有归处','cloud','三种障碍交替出现。保留体力，让有限路程成为完整一趟。',['crate','jump','slide','fork','jump','crate','slide','jump','fork','slide','crate','jump']]
];
export const LEVELS=definitions.map(([name,theme,hint,kinds],index)=>{
 const rows=kinds.map((kind,i)=>{const lane=(i*2+index)%3,id=`${index+1}-${i+1}`;return{id,d:44+i*26,kind,lanes:kind==='crate'?[0,1,2].filter(x=>x!==lane):kind==='fork'?[1]:[0,1,2],parcels:(kind==='fork'?[0,2]:[lane]).map((x,j)=>({id:`${id}-p${j}`,lane:x,value:(i+index)%4===0?15:10}))};});
 return{id:index+1,name,theme,hint,speed:20+index*.45,length:rows.at(-1).d+28,goal:rows.length-2,rows,collectible:rows.reduce((n,r)=>n+r.parcels.length,0),reachable:rows.length};
});
