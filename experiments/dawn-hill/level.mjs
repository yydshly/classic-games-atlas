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
const freezeLevel=data=>Object.freeze({...data,terrain:Object.freeze(data.terrain.map(Object.freeze)),blocks:Object.freeze(data.blocks.map(Object.freeze)),enemies:Object.freeze(data.enemies.map(Object.freeze)),seeds:Object.freeze(data.seeds.map(Object.freeze))});
const second=freezeLevel({title:'露渠果园',destination:'渠尾小亭',theme:'orchard',goalText:'穿过露渠果园，到右侧的渠尾小亭。',choice:'第一块石阶处分路：上方步道少接敌，树下可顶匣取果。两种体型都能走，不必收齐。',width:2600,floor:420,start:90,goal:2460,
 terrain:[{id:'orchard-left',x:0,y:420,w:1040,h:160},{id:'orchard-main',x:1120,y:420,w:890,h:160},{id:'orchard-out',x:2110,y:420,w:490,h:160},{id:'entry-step',x:400,y:365,w:95,h:55},{id:'middle-step',x:530,y:300,w:105,h:18},{id:'quiet-walk',x:660,y:235,w:270,h:20},{id:'return-step',x:940,y:365,w:90,h:55},{id:'field-step',x:1310,y:365,w:110,h:55},{id:'far-step',x:1770,y:350,w:110,h:70}],
 blocks:[{id:'canal-fruit',x:715,y:315,w:38,h:30},{id:'late-fruit',x:1600,y:300,w:38,h:30}],
 enemies:[{id:'orchard-1',x:660,y:420,left:605,right:805,speed:35},{id:'orchard-2',x:1530,y:420,left:1460,right:1700,speed:-40},{id:'orchard-3',x:2240,y:420,left:2170,right:2350,speed:43}],
 seeds:[{id:'canal-a',x:765,y:390},{id:'canal-b',x:1550,y:390},{id:'canal-c',x:1650,y:390}]});
const third=freezeLevel({title:'晚风归坡',destination:'风铃驿',theme:'evening',goalText:'沿高低石台到右侧的风铃驿。',choice:'高台有巡逻。可先停在宽台看时机，也可从低处跑跳；奖励不必收齐。',width:2680,floor:420,start:90,goal:2530,
 terrain:[{id:'ridge-start',x:0,y:420,w:880,h:160},{id:'ridge-middle',x:990,y:420,w:590,h:160},{id:'ridge-far',x:1680,y:420,w:560,h:160},{id:'ridge-home',x:2330,y:420,w:350,h:160},{id:'watch-step',x:350,y:365,w:140,h:55},{id:'perch',x:580,y:310,w:150,h:18},{id:'gap-walk',x:820,y:235,w:220,h:20},{id:'rest-step',x:1190,y:365,w:110,h:55},{id:'wind-step',x:1380,y:300,w:130,h:18},{id:'launch-step',x:1510,y:235,w:95,h:20},{id:'last-step',x:2030,y:365,w:110,h:55}],
 blocks:[{id:'ridge-fruit',x:190,y:315,w:38,h:30},{id:'rest-fruit',x:1820,y:315,w:38,h:30}],
 enemies:[{id:'ridge-1',x:420,y:365,left:385,right:465,speed:33},{id:'ridge-2',x:660,y:310,left:615,right:700,speed:-35},{id:'ridge-3',x:1810,y:420,left:1730,right:1930,speed:40}],
 seeds:[{id:'ridge-a',x:625,y:280},{id:'ridge-b',x:1430,y:270},{id:'ridge-c',x:1570,y:315}]});
export const LEVELS=Object.freeze([first,second,third]);
export const LEVEL=LEVELS[0]; // First-level compatibility for historical route checks.
export function getLevel(g){const level=LEVELS[g.stageIndex??0];if(!level)throw Error('unknown chapter');return level;}
export const STEP=1/120;
