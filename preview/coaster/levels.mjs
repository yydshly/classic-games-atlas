// Eight hand-authored, fixed closed alignments. Ground coordinates are drawing
// units; elevations and engineering lengths are metres. No generated campaign.
const freeze = value => { if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value); } return value; };
export const MODULES = freeze({
  rail: { id: 'rail', name: '普通轨道', short: '滑行', cost: 0, color: '#b69b87', description: '自由滑行；高差换速度，滚动阻力会耗掉能量。' },
  lift: { id: 'lift', name: '链条提升', short: '提升', cost: 160, color: '#dab76b', description: '仅用于上升至少 3 米的坡段；牵引爬升，出口稳定在 8 米/秒，避免回滚。' },
  drive: { id: 'drive', name: '轮胎驱动', short: '驱动', cost: 140, color: '#73b2aa', description: '仅用于平段或上升不超过 10 米的缓坡；出段速度至少 21 米/秒，增加刺激和过弯压力。' },
  trim: { id: 'trim', name: '调速制动', short: '调速', cost: 75, color: '#c8896c', description: '将出段速度限制到 18 米/秒；不能消除入段已有的超速。' },
  brake: { id: 'brake', name: '站前制动', short: '制动', cost: 60, color: '#b87989', description: '将出段速度限制到 10 米/秒；用于站前停车，提前使用会失去爬坡能量。' },
  bank: { id: 'bank', name: '倾斜弯轨', short: '倾斜', cost: 105, color: '#859cc7', description: '保持滑行速度，将横向力降至普通轨道的 55%；不能防止回滚或绝对超速。' }
});
const names = ['出站爬升','首落云坡','远端弧弯','二次上坡','花谷下坠','镜湖回弯','缓升连桥','云边落坡','长廊滑行','回家弧弯','站外平直','站前进场'];
const maps = [
 { name:'第一朵笑声', subtitle:'链条、重力与安全回站', tip:'先给 1 号上坡装提升，再给 12 号进场装制动。试车报告会告诉你还缺什么。', budget:380,minThrill:31,minComfort:83,targetRevenue:260,targetReputation:150,maxRuns:3,ticketPrice:16,seats:10, speedLimit:32, radii:[140,160,78,170,150,72,160,140,190,78,190,140],
 points:[[220,440,8],[140,300,28],[240,140,8],[420,95,10],[600,130,17],[770,240,6],[810,400,6],[690,520,14],[520,550,6],[370,510,8],[290,410,8],[280,465,8]] },
 { name:'晴空落差',subtitle:'先控制下坡出口速度',tip:'最高点更高了。首落段的调速器可以在速度带入后面的弯道前收住它。',budget:520,minThrill:26,minComfort:82,targetRevenue:310,targetReputation:156,maxRuns:3,ticketPrice:18,seats:11,speedLimit:27,radii:[130,170,74,170,160,65,160,140,150,66,150,130],
 points:[[220,460,8],[130,280,44],[260,100,8],[450,80,12],[660,150,19],[800,280,6],[805,460,7],[650,550,14],[470,565,6],[330,505,9],[290,415,8],[280,480,8]] },
 { name:'蓝湖转弯',subtitle:'速度保留，横向力减少',tip:'急弯需要倾斜轨道。一路刹车虽然安全，却可能让游客觉得不够刺激。',budget:650,minThrill:36,minComfort:81,targetRevenue:360,targetReputation:158,maxRuns:3,ticketPrice:20,seats:12,speedLimit:32,radii:[130,150,30,170,160,28,160,140,180,32,160,130],
 points:[[240,460,8],[130,310,32],[230,130,7],[440,100,10],[650,180,18],[780,320,6],[710,470,7],[580,560,14],[400,530,7],[330,380,9],[290,400,8],[300,485,8]] },
 { name:'双峰邮车',subtitle:'第二个高点也需要动力',tip:'二次上坡高过第一座山。不要指望一次下坠就能越过更高的山峰。',budget:720,minThrill:33,minComfort:82,targetRevenue:400,targetReputation:160,maxRuns:3,ticketPrice:21,seats:13,speedLimit:31,radii:[140,160,65,170,160,72,160,150,160,74,160,130],
 points:[[240,475,8],[125,300,27],[230,110,10],[420,80,13],[610,110,40],[800,260,9],[820,440,9],[650,540,18],[470,570,8],[330,520,10],[295,415,8],[300,490,8]] },
 { name:'微风加速',subtitle:'平缓线路也要有期待感',tip:'低矮的山坡缺少刺激。试着给平直长廊加驱动，同时检查接下来的弯道。',budget:650,minThrill:34,minComfort:86,targetRevenue:420,targetReputation:162,maxRuns:3,ticketPrice:22,seats:13,speedLimit:31,radii:[130,160,70,160,160,64,160,150,200,65,180,130],
 points:[[225,450,8],[145,300,18],[270,140,10],[450,105,11],[650,170,15],[800,290,9],[800,450,9],[640,530,13],[460,550,8],[330,500,9],[285,405,8],[285,475,8]] },
 { name:'铜币回廊',subtitle:'把每一枚预算用在关键处',tip:'调速比倾斜轨道便宜，但会影响后段能量。预算紧时，先看报告再决定投在哪里。',budget:455,minThrill:33,minComfort:83,targetRevenue:450,targetReputation:164,maxRuns:3,ticketPrice:23,seats:14,speedLimit:29,radii:[130,160,35,160,160,33,160,140,160,60,160,130],
 points:[[230,455,8],[135,310,34],[250,125,8],[440,95,10],[630,150,18],[790,260,7],[790,430,8],[640,530,15],[465,550,8],[330,500,10],[290,410,8],[290,480,8]] },
 { name:'静湾约定',subtitle:'舒适和刺激都要达标',tip:'游客在意整圈乘坐感。倾斜弯轨让高速更柔和，提早的轻制动也可能比最后猛刹更舒服。',budget:800,minThrill:38,minComfort:91,targetRevenue:500,targetReputation:168,maxRuns:3,ticketPrice:25,seats:14,speedLimit:31,radii:[130,170,38,170,160,36,160,150,190,39,180,130],
 points:[[225,455,8],[125,300,32],[255,125,8],[450,85,11],[650,150,20],[810,280,7],[805,445,8],[645,550,17],[460,560,8],[325,510,10],[280,400,8],[285,480,8]] },
 { name:'云岬开园日',subtitle:'完整的双峰设计与运营验收',tip:'把提升、调速、倾斜弯轨和站前制动放在各自需要的位置。最终要同时通过预算、体验和营业目标。',budget:960,minThrill:34,minComfort:86,targetRevenue:550,targetReputation:170,maxRuns:3,ticketPrice:27,seats:15,speedLimit:28,radii:[130,160,34,170,180,33,170,150,160,35,170,130],
 points:[[230,465,8],[110,290,43],[245,100,9],[455,70,12],[660,125,46],[830,265,7],[820,455,8],[640,565,20],[440,580,8],[305,510,10],[275,405,8],[290,490,8]] }
];
export const LEVELS = freeze(maps.map((m,i) => {
 const points=m.points.map(([x,y,z])=>({x,y,z}));
 const segments=points.map((a,j)=>{const b=points[(j+1)%points.length],dz=b.z-a.z;return {id:j,name:names[j],from:j,to:(j+1)%points.length,length:Math.hypot((b.x-a.x)*.15,(b.y-a.y)*.15,dz),turnRadius:m.radii[j],kind:j===11?'station':dz>=3?'climb':dz<=-3?'drop':j===2||j===5||j===9?'turn':'run'};});
 const {radii,...data}=m;
 return {...data,id:i+1,points,segments,initialModules:points.map(()=> 'rail'),briefing:`在 ${m.budget} 建造预算内完成试车；${m.maxRuns} 班以内达到收入 ${m.targetRevenue}、口碑 ${m.targetReputation}。`,rules:{stationSpeed:12,lateralLimit:1.35,minSpeed:4},palette:i%4};
}));
