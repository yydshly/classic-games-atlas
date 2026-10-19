export const STEP=1/120,WIDTH=960,HEIGHT=600,JUMP_SECONDS=1.05,SLIDE_SECONDS=1.05,TURN_WINDOW=16,LOOKAHEAD=85;
const row=(id,d,kind,lane=1)=>({id,d,kind,lanes:kind==='mail'?[]:kind==='crate'?[0,1,2].filter(n=>n!==lane):[0,1,2],parcels:[{id:id+'p',lane,value:10}]});
export const LEVELS=[
 {id:1,name:'晨谷 · 两封转角来信',theme:'valley',speed:12,length:360,goal:6,hint:'左转 → 右转；转弯后留足直路，再跳矮栏、滑横梁。',turns:[{d:96,dir:'left'},{d:216,dir:'right'}],rows:[row('a1',36,'mail'),row('a2',60,'crate',0),row('a3',132,'jump'),row('a4',164,'slide'),row('a5',188,'mail'),row('a6',252,'jump'),row('a7',284,'slide'),row('a8',324,'mail')]},
 {id:2,name:'竹桥 · 三折山间邮路',theme:'bamboo',speed:12,length:432,goal:7,hint:'右转 → 左转 → 右转；转弯窗口内按方向，直路上换道收信。',turns:[{d:96,dir:'right'},{d:216,dir:'left'},{d:336,dir:'right'}],rows:[row('b1',36,'mail'),row('b2',60,'crate',2),row('b3',132,'crate',0),row('b4',164,'jump'),row('b5',188,'mail'),row('b6',252,'crate',2),row('b7',284,'slide'),row('b8',308,'mail'),row('b9',372,'jump'),row('b10',408,'mail')]}
];
