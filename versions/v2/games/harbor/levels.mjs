export const WIDTH=900,HEIGHT=560;
export const TYPES=Object.freeze({skiff:{name:'轻舟',cost:5,capacity:1,mark:'Ⅰ'},barge:{name:'驳艇',cost:9,capacity:2,mark:'Ⅱ'}});
export const GOODS=Object.freeze({cotton:{name:'雾棉',mark:'◇',color:'#bc8c50',weight:1,reward:5},wick:{name:'灯芯',mark:'✚',color:'#638d87',weight:1,reward:5},anchor:{name:'晶锚',mark:'▣',color:'#9b758f',weight:2,reward:8}});
const N=(id,name,x,y,slots=1)=>({id,name,x,y,slots,upgradeCost:4});
const E=(a,b,cost,travel=1,fare=1)=>({id:[a,b].sort().join(''),a,b,cost,travel,fare,capacity:1});
const C=(kind,origin,destination,count,release=0,due=null)=>({kind,origin,destination,count,release,due});
export const LEVELS=[
 {id:1,name:'从一段短线开始',theme:'coast',budget:11,limit:28,goal:'先送三箱短途货，再用收入把航线延到D港。',tip:'11币只能启动短线。先建A—B并购轻舟；三箱交付后，空舱停在B港时建设B—C—D并改线。第8回合有新批次。',nodes:[N('A','苇湾仓',110,300),N('B','浮标集市',330,300),N('C','云阶',550,300),N('D','织帆港',780,300)],edges:[E('A','B',2),E('B','C',4),E('C','D',4),E('A','D',10,3,2)],cargo:[C('cotton','A','B',3,0,10),C('wick','B','D',2,8,23),C('cotton','D','B',1,13,27)]},
 {id:2,name:'交汇口的两种生意',theme:'sky',budget:32,limit:24,goal:'比较升级C港与B—E绕行，两种方案都能交付。',tip:'两艘船在C港会排队。花4币升级双泊位可同回合放行不同航道；也可花7币建B—E绕行（航时3）。每条航道始终只容一船。',nodes:[N('A','北棉仓',110,140),N('B','南灯仓',110,420),N('C','云心港',420,280),N('D','织坊',780,140),N('E','灯坊',780,420)],edges:[E('A','C',2),E('B','C',2),E('C','D',2),E('C','E',2),E('B','E',7,3)],cargo:[C('cotton','A','D',3,0,22),C('wick','B','E',3,0,22)]},
 {id:3,name:'回程重箱与预告货潮',theme:'night',budget:14,limit:25,goal:'靠短途与重箱返程盈利，接住第7回合的新批次。',tip:'驳艇先送A→B两箱；第3回合B→A晶锚占满两格。返航卸货后用收入建设B—C—D—E—F并改线；第7回合B港发两箱，第11回合F港备好重箱返程。',nodes:[N('A','星棉仓',100,300),N('B','灯市',240,300),N('C','西闸',380,180),N('D','天桥',520,180),N('E','东闸',660,300),N('F','星锚港',800,300)],edges:[E('A','B',2),E('B','C',2),E('C','D',2),E('D','E',2),E('E','F',2),E('B','E',7,2),E('A','F',12,3,3)],cargo:[C('cotton','A','B',2,0,6),C('anchor','B','A',1,3,9),C('wick','B','F',2,7,18),C('anchor','F','A',1,11,24)]}
];
