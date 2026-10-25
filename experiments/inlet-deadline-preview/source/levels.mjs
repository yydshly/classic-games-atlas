export const WIDTH=22,HEIGHT=16;
const v=(x,a,b)=>Array.from({length:b-a+1},(_,i)=>({x,y:a+i}));
const h=(y,a,b)=>Array.from({length:b-a+1},(_,i)=>({x:a+i,y}));
const unique=ps=>[...new Map(ps.map(p=>[p.y*WIDTH+p.x,p])).values()];
export const LEVELS=[
 {id:1,name:'第一湾 · 岸线初织',brief:'练习一条安全落脚的织线。总体目标50%，从水域离开后必须连回岸线；风险线回踩会失去一盏灯。',target:50,limit:75,start:{x:1,y:0},safe:[],
  enemies:[{x:18,y:8,dir:0}],patrollerIndex:36,
  objectives:[{id:'bay',label:'初织湾',target:40,seed:{x:10,y:8},labelAt:{x:10,y:9}}]},
 {id:2,name:'第二湾 · 折堤双汀',brief:'折堤隔开两片水域，每片40%、总体60%。离岸后同湾潮影原地预警半秒，再按原步速追最近风险线。先看方向预测，选择远岸长线或借岛短线；触堤立即闭合。',target:60,limit:85,start:{x:1,y:0},
  safe:unique([...v(8,1,5),...h(6,8,11),...v(11,7,14),{x:16,y:3},{x:17,y:3},{x:16,y:4},{x:17,y:4}]),
  enemies:[{x:7,y:1,dir:3},{x:12,y:14,dir:1}],patrollerIndex:36,
  objectives:[{id:'reed',label:'苇汀',target:40,seed:{x:3,y:8},labelAt:{x:3,y:8}},{id:'islet',label:'岛汀',target:40,seed:{x:18,y:10},labelAt:{x:18,y:10}}]},
 {id:3,name:'第三湾 · 阶堤三湾',brief:'三湾各40%、总体65%。潮影会在半秒预警后同速追线；离它远时长线收益高，靠岛堤分段可缩短每次暴露。红色方向预测表示按当前状态直行会碰线，出发前可以换落脚点。',target:65,limit:90,start:{x:1,y:0},
  safe:unique([...v(6,1,4),...h(5,6,9),...v(9,6,9),...h(10,7,9),...v(7,11,14),...v(15,1,6),...h(7,13,15),...v(13,8,11),...h(12,13,16),...v(16,13,14),{x:11,y:3},{x:12,y:3},{x:18,y:9},{x:19,y:9},{x:18,y:10},{x:19,y:10}]),
  enemies:[{x:5,y:1,dir:3},{x:12,y:14,dir:1},{x:20,y:1,dir:3}],patrollerIndex:36,
  objectives:[{id:'fern',label:'蕨湾',target:40,seed:{x:3,y:8},labelAt:{x:3,y:8}},{id:'lantern',label:'灯湾',target:40,seed:{x:11,y:8},labelAt:{x:11,y:8}},{id:'tide',label:'潮湾',target:40,seed:{x:18,y:8},labelAt:{x:18,y:8}}]}
];
export const DIRECTIONS={U:{x:0,y:-1,index:0},R:{x:1,y:0,index:1},D:{x:0,y:1,index:2},L:{x:-1,y:0,index:3}};
