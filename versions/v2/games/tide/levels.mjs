export const W=720,H=560;
export const COLORS=[{name:'青玉',fill:'#478a78',ink:'#f0f3db',shape:'dot'},{name:'琥珀',fill:'#c4a04f',ink:'#fff4cf',shape:'diamond'},{name:'珊瑚',fill:'#b66c5f',ink:'#ffe9d6',shape:'triangle'},{name:'月蓝',fill:'#697f9f',ink:'#edf0e3',shape:'cross'}];
export const LEVELS=[
 {id:1,name:'开阔湾 · 收拢潮声',theme:'bay',shooter:{x:360,y:340},points:[[80,160],[160,90],[360,75],[565,100],[650,210],[600,345],[450,445],[230,465],[80,395]],chain:[0,0,1,1,0,0,1,1,0,0],colors:[0,1],obstacles:[],slow:0,back:0,speed:13,supplyEvery:2.7,target:36,limit:150,tip:'两色开阔弧。每2.7秒尝试从入口供一珠，入口须留足珠距。清除36颗供珠填满潮表，停供后再清完残局。'},
 {id:2,name:'回弯湾 · 最后一缕',theme:'moon',shooter:{x:360,y:350},points:[[75,190],[145,95],[370,80],[600,110],[650,235],[545,280],[300,240],[135,310],[140,440],[365,480],[625,435]],chain:[0,0,1,1,2,2,0,0,1,1,2,2],colors:[0,1,2],obstacles:[],slow:0,back:0,speed:14,supplyEvery:2.3,target:42,limit:150,tip:'三色回弯。每2.3秒尝试供一珠；近段会挡远段射线。消除42颗供珠后入口关闭，再收拢全部余珠。'}
];
