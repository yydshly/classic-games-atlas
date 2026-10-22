export const WIDTH=22,HEIGHT=16;
export const LEVELS=[
 {id:1,name:'第一湾 · 岸线初织',brief:'在岸线上准备织线，进入水域后连回安全区。游光会切断风险线，岸巡只沿外缘行走。目标为原水域的50%。',target:50,limit:75,start:{x:1,y:0},safe:[],enemies:[{x:18,y:8,dir:0}],patrollerIndex:36},
 {id:2,name:'第二湾 · 汀口与浮岛',brief:'顶部汀口可缩短第一刀，浮岛可以分段落脚。选择少量长线，或沿汀口分两段扩展；占原水域60%。',target:60,limit:85,start:{x:1,y:0},safe:[...Array.from({length:5},(_,i)=>({x:5,y:i+1})),{x:12,y:7},{x:13,y:7},{x:12,y:8},{x:13,y:8}],enemies:[{x:18,y:10,dir:0}],patrollerIndex:36},
 {id:3,name:'第三湾 · 双流织岛',brief:'两道游光都必须留在水域。中央浮岛可把穿湾长线分段，或避开岛走两条更长的线；右岸汀口改变安全返回处。目标65%。',target:65,limit:90,start:{x:1,y:0},safe:[{x:3,y:1},{x:3,y:2},{x:3,y:3},{x:10,y:5},{x:11,y:5},{x:10,y:6},{x:11,y:6},{x:19,y:10},{x:20,y:10}],enemies:[{x:17,y:8,dir:0},{x:19,y:12,dir:0}],patrollerIndex:36}
];
export const DIRECTIONS={U:{x:0,y:-1,index:0},R:{x:1,y:0,index:1},D:{x:0,y:1,index:2},L:{x:-1,y:0,index:3}};
