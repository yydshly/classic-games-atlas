const originalPath=[[-25,125],[210,125],[239,148],[249,259],[267,281],[325,301],[390,342],[459,366],[514,361],[551,344],[569,294],[579,245],[607,218],[690,203],[835,188]];
const originalSites=[{id:1,x:160,y:215},{id:2,x:320,y:210},{id:3,x:385,y:260},{id:4,x:500,y:270},{id:5,x:665,y:285}];
const distance=path=>path.slice(1).reduce((sum,p,i)=>sum+Math.hypot(p[0]-path[i][0],p[1]-path[i][1]),0);
export const MAPS=[
 {id:'old-pass',name:'断桥隘口',objective:'守住原山口的四轮进攻。',hint:'原图路径、塔位、波次与战斗规则完整保留。',routeKind:'original',path:originalPath,sites:originalSites,base:{x:780,y:190},incoming:{x:45,y:125}},
 {id:'folded-quarry',name:'回折石谷',objective:'利用折返路线，让同一火力圈覆盖前后两段。',hint:'中央塔位可以打到相邻折返；先控制哪一段，再把敌人留在交叉火力里？',routeKind:'folded',path:[[-25,100],[150,100],[150,320],[360,320],[360,120],[570,120],[570,320],[710,320],[835,250]],sites:[{id:1,x:65,y:220},{id:2,x:255,y:220},{id:3,x:465,y:220},{id:4,x:650,y:215},{id:5,x:725,y:115}],base:{x:780,y:281},incoming:{x:40,y:100}},
 {id:'split-terraces',name:'双庭岭道',objective:'在前庭与后岭分配火力，守住四轮进攻。',hint:'早段与末段的覆盖不再重叠。破甲专精守哪一侧，另一侧由谁收尾？',routeKind:'separated',path:[[-25,175],[170,175],[230,115],[400,115],[460,175],[460,335],[620,335],[680,275],[680,125],[835,125]],sites:[{id:1,x:150,y:270},{id:2,x:320,y:220},{id:3,x:560,y:220},{id:4,x:760,y:235},{id:5,x:580,y:65}],base:{x:780,y:125},incoming:{x:40,y:175}}
].map(map=>({...map,length:distance(map.path)}));
export function mapFor(value=0){const index=typeof value==='number'?value:value?.mapIndex??0;return MAPS[index]??MAPS[0];}
export const sitesFor=g=>mapFor(g).sites;
export const pathFor=g=>mapFor(g).path;
