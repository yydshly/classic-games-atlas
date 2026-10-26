// Original route and dimensions. This is not a recreation of Nintendo's map.
const first=Object.freeze({title:'晨露坡',destination:'晨钟亭',theme:'morning',goalText:'穿过草坡和两道断口，到晨钟亭。',choice:'先试走跑与长短跳；高路有额外奖励，不必收齐。',width:2420,floor:420,start:90,goal:2290,
  terrain:Object.freeze([
    {id:'meadow',x:0,y:420,w:950,h:160},{id:'orchard',x:1040,y:420,w:860,h:160},{id:'home',x:2010,y:420,w:410,h:160},
    {id:'low-step',x:1140,y:380,w:90,h:40},{id:'middle',x:1290,y:318,w:100,h:18},{id:'high',x:1450,y:255,w:155,h:20},{id:'descent',x:1700,y:330,w:100,h:18}
  ].map(Object.freeze)),
  blocks:Object.freeze([{id:'first',x:350,y:315,w:38,h:30},{id:'upper',x:1504,y:160,w:38,h:30}].map(Object.freeze)),
  enemies:Object.freeze([{id:'sprig-1',x:690,y:420,left:610,right:790,speed:35},{id:'sprig-2',x:1340,y:420,left:1260,right:1410,speed:-40},{id:'sprig-3',x:1760,y:420,left:1610,right:1830,speed:43}].map(Object.freeze)),
  seeds:Object.freeze([{id:'a',x:1325,y:292},{id:'b',x:1480,y:229},{id:'c',x:1580,y:229}].map(Object.freeze))
});
const freezeLevel=data=>Object.freeze({...data,...(data.bricks?{bricks:Object.freeze(data.bricks.map(Object.freeze))}:{}),terrain:Object.freeze(data.terrain.map(Object.freeze)),blocks:Object.freeze(data.blocks.map(Object.freeze)),enemies:Object.freeze(data.enemies.map(Object.freeze)),seeds:Object.freeze(data.seeds.map(Object.freeze))});
const second=freezeLevel({title:'露渠果园',destination:'渠尾小亭',theme:'orchard',goalText:'穿过露渠果园，到右侧的渠尾小亭。',choice:'第一块石阶处分路：上方步道少接敌，树下可顶匣取果。两种体型都能走，不必收齐。',width:2600,floor:420,start:90,goal:2460,
 terrain:[{id:'orchard-left',x:0,y:420,w:1040,h:160},{id:'orchard-main',x:1120,y:420,w:890,h:160},{id:'orchard-out',x:2110,y:420,w:490,h:160},{id:'entry-step',x:400,y:365,w:95,h:55},{id:'middle-step',x:530,y:300,w:105,h:18},{id:'quiet-walk',x:660,y:235,w:270,h:20},{id:'return-step',x:940,y:365,w:90,h:55},{id:'field-step',x:1310,y:365,w:110,h:55},{id:'far-step',x:1770,y:350,w:110,h:70}],
 blocks:[{id:'canal-fruit',x:715,y:315,w:38,h:30},{id:'late-fruit',x:1600,y:300,w:38,h:30}],
 enemies:[{id:'orchard-1',x:660,y:420,left:605,right:805,speed:35},{id:'orchard-2',x:1530,y:420,left:1460,right:1700,speed:-40},{id:'orchard-3',x:2240,y:420,left:2170,right:2350,speed:43}],
 seeds:[{id:'canal-a',x:765,y:390},{id:'canal-b',x:1550,y:390},{id:'canal-c',x:1650,y:390}]});
const thirdLegacy=freezeLevel({title:'晚风归坡',destination:'风铃驿',theme:'evening',goalText:'沿高低石台到右侧的风铃驿。',choice:'高台有巡逻。可先停在宽台看时机，也可从低处跑跳；奖励不必收齐。',width:2680,floor:420,start:90,goal:2530,
 terrain:[{id:'ridge-start',x:0,y:420,w:880,h:160},{id:'ridge-middle',x:990,y:420,w:590,h:160},{id:'ridge-far',x:1680,y:420,w:560,h:160},{id:'ridge-home',x:2330,y:420,w:350,h:160},{id:'watch-step',x:350,y:365,w:140,h:55},{id:'perch',x:580,y:310,w:150,h:18},{id:'gap-walk',x:820,y:235,w:220,h:20},{id:'rest-step',x:1190,y:365,w:110,h:55},{id:'wind-step',x:1380,y:300,w:130,h:18},{id:'launch-step',x:1510,y:235,w:95,h:20},{id:'last-step',x:2030,y:365,w:110,h:55}],
 blocks:[{id:'ridge-fruit',x:190,y:315,w:38,h:30},{id:'rest-fruit',x:1820,y:315,w:38,h:30}],
 enemies:[{id:'ridge-1',x:420,y:365,left:385,right:465,speed:33},{id:'ridge-2',x:660,y:310,left:615,right:700,speed:-35},{id:'ridge-3',x:1810,y:420,left:1730,right:1930,speed:40}],
 seeds:[{id:'ridge-a',x:625,y:280},{id:'ridge-b',x:1430,y:270},{id:'ridge-c',x:1570,y:315}]});
// R3 snapshots retain their original map; new journeys use this local revision.
const third=freezeLevel({...thirdLegacy,goalText:'穿过晚风石洲，到右侧的风铃驿。',choice:'中段低路分两跳，在宽石洲落稳取籽；高路可越过石洲，少一次停留。两路都到风铃驿。',
 terrain:[...thirdLegacy.terrain.map(t=>t.id==='ridge-middle'?{...t,w:510}:t.id==='ridge-far'?{...t,x:1720,w:520}:t.id==='wind-step'?{...t,x:1360,w:90}:t),{id:'stepping-isle',x:1570,y:420,w:80,h:160}],
 blocks:thirdLegacy.blocks.map(b=>b.id==='rest-fruit'?{...b,x:1950}:b),
 enemies:thirdLegacy.enemies.map(e=>e.id==='ridge-3'?{...e,x:1880,left:1850,right:1920}:e),
 seeds:thirdLegacy.seeds.map(s=>s.id==='ridge-c'?{...s,x:1610,y:390}:s)});
const fourth=freezeLevel({title:'草穗阶谷',destination:'穗风亭',theme:'grain',goalText:'穿过阶谷与低石棚，到右侧的穗风亭。',choice:'阶梯可停稳；低棚下提早松开跳，落稳再跳。高台的籽是可选奖励。',width:2600,floor:420,start:90,goal:2460,
 terrain:[{id:'grain-start',x:0,y:420,w:760,h:160},{id:'grain-main',x:840,y:420,w:880,h:160},{id:'grain-home',x:1820,y:420,w:780,h:160},{id:'grain-first',x:310,y:385,w:110,h:35},{id:'grain-second',x:480,y:350,w:110,h:18},{id:'grain-third',x:620,y:315,w:90,h:18},{id:'low-canopy',x:980,y:310,w:340,h:18},{id:'short-one',x:1060,y:398,w:50,h:22},{id:'short-two',x:1210,y:394,w:55,h:26}],
 blocks:[{id:'grain-fruit',x:180,y:315,w:38,h:30},{id:'grain-rest-fruit',x:1600,y:315,w:38,h:30}],
 enemies:[{id:'grain-1',x:1480,y:420,left:1425,right:1540,speed:35},{id:'grain-2',x:2150,y:420,left:2080,right:2230,speed:-35}],
 seeds:[{id:'grain-a',x:525,y:320},{id:'grain-b',x:690,y:285},{id:'grain-c',x:1235,y:365}]});
const fifth=freezeLevel({title:'钟影望台',destination:'铜钟楼',theme:'watch',goalText:'看清望台上的巡逻，前往右侧铜钟楼。',choice:'有宽台可以停住观察。脚印标示巡逻边界，先看方向，再选择踩过或跳绕。',width:2620,floor:420,start:90,goal:2480,
 terrain:[{id:'watch-start',x:0,y:420,w:920,h:160},{id:'watch-main',x:1030,y:420,w:1590,h:160},{id:'lookout',x:390,y:365,w:130,h:55},{id:'patrol-step',x:1110,y:365,w:120,h:55},{id:'balcony-step',x:1450,y:365,w:100,h:55},{id:'bell-balcony',x:1600,y:300,w:300,h:18}],
 blocks:[{id:'watch-fruit',x:180,y:315,w:38,h:30},{id:'watch-return-fruit',x:2330,y:315,w:38,h:30}],
 enemies:[{id:'watch-1',x:670,y:420,left:610,right:740,speed:35},{id:'watch-2',x:1185,y:365,left:1145,right:1205,speed:-32},{id:'watch-3',x:1790,y:300,left:1730,right:1850,speed:35},{id:'watch-4',x:2140,y:420,left:2070,right:2210,speed:-40}],
 seeds:[{id:'watch-a',x:700,y:390},{id:'watch-b',x:1710,y:270},{id:'watch-c',x:2250,y:390}]});
const sixth=freezeLevel({title:'双径归庭',destination:'归庭大钟',theme:'courtyard',goalText:'选择高低两径，在右侧归庭大钟前落稳。',choice:'两处分路可混合选择：高台奖励伴随巡逻，低路有断口与地面巡逻。奖励不必收齐。',width:2920,floor:420,start:90,goal:2780,
 terrain:[{id:'court-start',x:0,y:420,w:1080,h:160},{id:'court-main',x:1180,y:420,w:830,h:160},{id:'court-home',x:2120,y:420,w:800,h:160},{id:'court-first',x:400,y:380,w:100,h:40},{id:'court-middle',x:550,y:315,w:120,h:18},{id:'court-upper',x:710,y:235,w:260,h:18},{id:'court-return',x:1540,y:365,w:120,h:55},{id:'court-climb',x:1700,y:300,w:140,h:18},{id:'court-crossing',x:1890,y:235,w:290,h:18},{id:'court-last',x:2320,y:365,w:120,h:55}],
 blocks:[{id:'court-fruit',x:180,y:315,w:38,h:30},{id:'court-upper-fruit',x:920,y:140,w:38,h:30},{id:'court-middle-fruit',x:1330,y:315,w:38,h:30}],
 enemies:[{id:'court-1',x:760,y:420,left:700,right:850,speed:35},{id:'court-2',x:855,y:235,left:810,right:880,speed:-34},{id:'court-3',x:2070,y:235,left:1980,right:2130,speed:35},{id:'court-4',x:2500,y:420,left:2470,right:2600,speed:-40}],
 seeds:[{id:'court-a',x:795,y:205},{id:'court-b',x:905,y:205},{id:'court-c',x:2060,y:205}]});
// Empty ordinary bricks are distinct from fruit crates; all routes are original.
const seventh=freezeLevel({title:'陶拱初开',destination:'陶拱驿',theme:'brick',goalText:'学会从下方顶破普通砖，选择陶拱上路或地面路，到陶拱驿。',choice:'大体型能顶破红砖，小体型只弹动；叶纹匣仍出果。地面路始终可通，开口是避开巡逻和断口的可选捷径。',width:2200,floor:420,start:90,goal:2070,
 terrain:[{id:'clay-start',x:0,y:420,w:970,h:160},{id:'clay-main',x:1060,y:420,w:490,h:160},{id:'clay-home',x:1640,y:420,w:560,h:160},{id:'clay-left-pier',x:455,y:220,w:25,h:124},{id:'clay-right-pier',x:670,y:220,w:25,h:124},{id:'clay-high-road',x:695,y:220,w:440,h:18}],
 bricks:[{id:'clay-learn',x:330,y:315,w:38,h:24},...Array.from({length:5},(_,i)=>({id:'clay-floor-'+i,x:480+i*38,y:320,w:38,h:24}))],
 blocks:[{id:'clay-fruit',x:180,y:315,w:38,h:30},{id:'clay-rest-fruit',x:1300,y:315,w:38,h:30}],
 enemies:[{id:'clay-1',x:835,y:420,left:780,right:900,speed:35},{id:'clay-2',x:1830,y:420,left:1770,right:1920,speed:-35}],
 seeds:[{id:'clay-a',x:349,y:285},{id:'clay-b',x:835,y:190},{id:'clay-c',x:1200,y:390}]});
const eighth=freezeLevel({title:'青檐留桥',destination:'青檐亭',theme:'arcade',goalText:'选择左阶、就地开口或地面路，穿过青檐回廊到青檐亭。',choice:'可以早走左阶，或留在地面观察后再就地开口，不用折返。大体型开口时留住旁边的砖作落脚。小体型可走左阶上桥，也可沿地面走；拆空上路也不会堵住地面。',width:2700,floor:420,start:90,goal:2560,
 terrain:[{id:'arc-start',x:0,y:420,w:1550,h:160},{id:'arc-main',x:1650,y:420,w:550,h:160},{id:'arc-home',x:2290,y:420,w:410,h:160},{id:'arc-first-step',x:350,y:350,w:110,h:18},{id:'arc-left-deck',x:500,y:315,w:180,h:18},{id:'arc-right-deck',x:946,y:315,w:80,h:18},{id:'arc-upper-deck',x:1040,y:235,w:280,h:18}],
 bricks:Array.from({length:7},(_,i)=>({id:'arc-floor-'+i,x:680+i*38,y:315,w:38,h:24})),
 blocks:[{id:'arc-fruit',x:180,y:315,w:38,h:30},{id:'arc-rest-fruit',x:1410,y:315,w:38,h:30}],
 enemies:[{id:'arc-1',x:1160,y:420,left:1120,right:1250,speed:35},{id:'arc-2',x:1180,y:235,left:1110,right:1270,speed:-35},{id:'arc-3',x:1870,y:420,left:1810,right:1980,speed:38}],
 seeds:[{id:'arc-a',x:985,y:285},{id:'arc-b',x:1260,y:205},{id:'arc-c',x:1450,y:390}]});
const ninth=freezeLevel({title:'窑灯归廊',destination:'窑灯广场',theme:'kiln',goalText:'在高处开口或沿低路前进，到窑灯广场落稳，完成这一段旅程。',choice:'宽石阶上可停看，再从下顶破砖底进入高廊；上面有奖励与巡逻。缩小或不取果都能回到地面主路，奖励不锁终点。',width:2920,floor:420,start:90,goal:2780,
 terrain:[{id:'kiln-start',x:0,y:420,w:960,h:160},{id:'kiln-main',x:1050,y:420,w:770,h:160},{id:'kiln-rest',x:1910,y:420,w:310,h:160},{id:'kiln-home',x:2300,y:420,w:620,h:160},{id:'kiln-watch-step',x:600,y:365,w:110,h:55},{id:'kiln-entry-step',x:720,y:365,w:110,h:18},{id:'kiln-left-pier',x:685,y:165,w:25,h:119},{id:'kiln-right-pier',x:824,y:165,w:25,h:119},{id:'kiln-high-road',x:849,y:165,w:271,h:18},{id:'kiln-return',x:1170,y:300,w:130,h:18}],
 bricks:Array.from({length:3},(_,i)=>({id:'kiln-floor-'+i,x:710+i*38,y:260,w:38,h:24})),
 blocks:[{id:'kiln-fruit',x:180,y:315,w:38,h:30},{id:'kiln-high-fruit',x:1200,y:195,w:38,h:30},{id:'kiln-rest-fruit',x:1500,y:315,w:38,h:30}],
 enemies:[{id:'kiln-1',x:535,y:420,left:495,right:575,speed:33},{id:'kiln-2',x:960,y:165,left:910,right:1050,speed:-35},{id:'kiln-3',x:2050,y:420,left:2000,right:2140,speed:38}],
 seeds:[{id:'kiln-a',x:915,y:135},{id:'kiln-b',x:1080,y:135},{id:'kiln-c',x:2060,y:390}]});
export const LAYOUT_REVISION=2;
export const LEGACY_LEVELS=Object.freeze([first,second,thirdLegacy,fourth,fifth,sixth,seventh,eighth,ninth]);
export const LEVELS=Object.freeze([first,second,third,fourth,fifth,sixth,seventh,eighth,ninth]);
export const LEVEL=LEVELS[0]; // First-level compatibility for historical route checks.
export function getLevel(g){const revision=g.layoutRevision??1;if(![1,LAYOUT_REVISION].includes(revision))throw Error('unknown layout revision');const level=(revision===1?LEGACY_LEVELS:LEVELS)[g.stageIndex??0];if(!level)throw Error('unknown chapter');return level;}
export const STEP=1/120;
