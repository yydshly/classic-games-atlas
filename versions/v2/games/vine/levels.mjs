export const W=12,H=10;
export const DIRS=[{x:1,y:0,name:'右'},{x:0,y:1,name:'下'},{x:-1,y:0,name:'左'},{x:0,y:-1,name:'上'}];
const cell=(x,y)=>y*W+x;
export const LEVELS=[
 {id:1,name:'晨露庭',subtitle:'一片空地，许多条归路',target:8,period:.29,seed:84167,rocks:[],exit:cell(10,1),body:[cell(4,5),cell(3,5),cell(2,5)],dir:0,tip:'宽阔空地随你转向。别追着青芽钻进自己的包围圈，给尾巴留下回旋余地。'},
 {id:2,name:'双石岛',subtitle:'绕岛而行，也能从中穿过',target:10,period:.27,seed:86436,rocks:[cell(3,3),cell(4,3),cell(3,4),cell(4,4),cell(7,5),cell(8,5),cell(7,6),cell(8,6)],exit:cell(10,1),body:[cell(4,7),cell(3,7),cell(2,7)],dir:0,tip:'两座石岛之间、上方与下方都可通行。选择近路之前，先看清身体将封住哪条退路。'}
].map(l=>({...l,floors:Array.from({length:W*H},(_,i)=>i).filter(i=>!l.rocks.includes(i))}));
