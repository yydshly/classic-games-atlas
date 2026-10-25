// Three authored chapters, one movement/throw model. The first geometry is unchanged.
const first={id:'rain-dock',title:'雨后货栈',destination:'雨湾收货站',theme:'harbor',width:2440,height:560,goal:2290,goalY:440,
  introduction:'穿过巡逻机和水道，抵达右侧亮灯的收货站。先认识木箱、投掷与跳跃。',
  next:'收货站已到。下一段去上层转运台：先看高低货台，再选择从哪里开路。',
  solids:[
    {id:'start-dock',x:0,y:440,w:660,h:120,material:'wood'},
    {id:'middle-dock',x:770,y:440,w:680,h:120,material:'wood'},
    {id:'last-dock',x:1580,y:440,w:860,h:120,material:'wood'},
    {id:'high-shelf',x:1010,y:332,w:290,h:20,material:'shelf'},
    {id:'low-freight',x:1720,y:406,w:86,h:34,material:'cargo'}],
  supplies:[{id:'first',x:225,y:440},{id:'middle',x:860,y:440},{id:'last',x:1625,y:440}],
  enemies:[{id:'crawler-1',x:490,y:440,min:430,max:570,dir:-1},{id:'crawler-2',x:1130,y:440,min:1040,max:1250,dir:1},{id:'crawler-3',x:2040,y:440,min:1940,max:2140,dir:-1}]};
const second={id:'two-storeys',title:'双层货栈',destination:'上层转运台',theme:'warehouse',width:2420,height:560,goal:2320,goalY:248,
  introduction:'这次终点在上层。下层可投箱清路，也可借矮货台或轻放的箱子登上货架。箱子用来攻击还是垫脚，由你决定。',
  next:'上层转运台已到。最后一段回到灯港，沿水道把举投和跳跃连起来。',
  solids:[
    {id:'start-dock',x:0,y:440,w:780,h:120,material:'wood'},
    {id:'middle-dock',x:880,y:440,w:560,h:120,material:'wood'},
    {id:'last-dock',x:1540,y:440,w:880,h:120,material:'wood'},
    {id:'entry-step',x:350,y:406,w:74,h:34,material:'cargo'},
    {id:'entry-shelf',x:480,y:332,w:120,h:20,material:'shelf'},
    {id:'shelf-a',x:650,y:248,w:120,h:20,material:'shelf'},
    {id:'shelf-b',x:880,y:248,w:550,h:20,material:'shelf'},
    {id:'shelf-c',x:1540,y:248,w:230,h:20,material:'shelf'},
    {id:'upper-link',x:1880,y:248,w:120,h:20,material:'shelf'},
    {id:'upper-arrival',x:2120,y:248,w:300,h:20,material:'shelf'},
    {id:'exit-step',x:1980,y:406,w:74,h:34,material:'cargo'},
    {id:'exit-shelf',x:2070,y:332,w:40,h:20,material:'shelf'}],
  supplies:[{id:'first',x:230,y:440},{id:'upper-first',x:540,y:332},{id:'middle',x:970,y:440},{id:'upper-mid',x:1030,y:248},{id:'last',x:1610,y:440},{id:'upper-last',x:1590,y:248},{id:'arrival',x:2160,y:248}],
  enemies:[{id:'crawler-1',x:690,y:440,min:600,max:740,dir:-1},{id:'crawler-2',x:1190,y:248,min:1110,max:1320,dir:1},{id:'crawler-3',x:1210,y:440,min:1130,max:1380,dir:-1},{id:'crawler-4',x:2230,y:248,min:2180,max:2260,dir:-1}]};
const third={id:'evening-bay',title:'回湾夜递',destination:'回湾灯港',theme:'evening',width:2540,height:560,goal:2410,goalY:440,
  introduction:'最后一段到回湾灯港。水道之间有矮货台和上层通路：出手前看落点，落地后松开跳键再准备下一跳。',
  next:'三段路线已走完。回看自己的选择，也可以从码头再走一遍。',
  solids:[
    {id:'start-dock',x:0,y:440,w:620,h:120,material:'wood'},
    {id:'middle-dock',x:730,y:440,w:480,h:120,material:'wood'},
    {id:'return-dock',x:1330,y:440,w:510,h:120,material:'wood'},
    {id:'last-dock',x:1950,y:440,w:590,h:120,material:'wood'},
    {id:'start-step',x:165,y:406,w:60,h:34,material:'cargo'},
    {id:'early-shelf',x:280,y:332,w:260,h:20,material:'shelf'},
    {id:'middle-step',x:920,y:406,w:80,h:34,material:'cargo'},
    {id:'middle-shelf',x:1030,y:332,w:110,h:20,material:'shelf'},
    {id:'return-step',x:1550,y:406,w:75,h:34,material:'cargo'}],
  supplies:[{id:'first',x:150,y:440},{id:'early-upper',x:330,y:332},{id:'middle',x:785,y:440},{id:'middle-upper',x:1080,y:332},{id:'return',x:1380,y:440},{id:'last',x:2020,y:440}],
  enemies:[{id:'crawler-1',x:445,y:440,min:365,max:525,dir:-1},{id:'crawler-2',x:870,y:440,min:810,max:900,dir:1},{id:'crawler-3',x:1720,y:440,min:1660,max:1780,dir:1},{id:'crawler-4',x:2220,y:440,min:2150,max:2310,dir:-1}]};
function freeze(value){if(value&&typeof value==='object'){for(const v of Object.values(value))freeze(v);Object.freeze(value);}return value;}
export const LEVELS=freeze([first,second,third]);
export const LEVEL=LEVELS[0];
export const getLevel=g=>LEVELS[g.stageIndex??0];
