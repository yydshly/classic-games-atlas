export const SAVE_KEY = 'lamp-shadow-v2';
export const BUILD = 'lamp-shadow-v2-shadow-sound-1';

const plans = [
  {name:'一 · 暗格候灯', lesson:'暗格可穿行，站进去能避开灯锥；等巡卫转身再拿档案。', map:[
    '###########','#.......DX#','#...###...#','#..C......#','#..###....#','#.........#','#.........#','#S........#','###########'], guards:[[[4,3],[8,3]]], chimes:1},
  {name:'二 · 双门渡廊', lesson:'上门短但接近巡线，暗格可等时机；下门较远，可不花声响。', map:[
    '###########','#.C......X#','#S...#....#','#....#....#','#....#C.D.#','#....#....#','#....#....#','#.........#','###########'], guards:[[[3,1],[7,1]],[[7,4],[9,4]]], chimes:1},
  {name:'三 · 交叉哨', lesson:'两条巡线交会。声响只影响近处巡卫，还会让灯锥转向发声点。', map:[
    '###########','#........X#','#..##.....#','#......C..#','#.C.....D.#','#.....##..#','#.........#','#S........#','###########'], guards:[[[3,4],[8,4]],[[8,2],[8,6]]], chimes:1},
  {name:'四 · 分卷档', lesson:'两份档案分处两翼；选暗格观察或消耗两次声响完成回访。', map:[
    '###########','#D..###..X#','#..##C..DC#','#...###...#','#....##...#','#C........#','#.........#','#S........#','###########'], guards:[[[2,5],[6,5]],[[6,2],[9,2]]], chimes:2},
  {name:'五 · 回声总台', lesson:'近路跨巡线，南墙可绕行；暗格与一次声响用于调整节奏。', map:[
    '###########','#........X#','#..#####..#','#C......D.#','#..#####..#','#.........#','#....C....#','#S........#','###########'], guards:[[[2,3],[8,3]],[[6,6],[9,6]]], chimes:1}
];
export const STAGES = plans.map((p,i)=>({...p,id:i+1, width:11,height:9, documents:p.map.join('').split('D').length-1}));

export function newRecord(){return {schema:2,unlocked:1,completed:[],best:{},run:null};}
export function validateRecord(raw){
  if(!raw || raw.schema!==2 || !Number.isInteger(raw.unlocked) || raw.unlocked<1 || raw.unlocked>5 || !Array.isArray(raw.completed)) return newRecord();
  const r=newRecord(); r.unlocked=raw.unlocked; r.completed=[...new Set(raw.completed.filter(n=>Number.isInteger(n)&&n>=1&&n<=5))];
  r.best=raw.best && typeof raw.best==='object'?raw.best:{};
  if(raw.run && Number.isInteger(raw.run.stage) && raw.run.stage>=1 && raw.run.stage<=r.unlocked && ['ready','running','paused','won','failed','complete'].includes(raw.run.phase)){
    const s=createRun(raw.run.stage); const src=raw.run;
    if(Number.isInteger(src.x)&&Number.isInteger(src.y)&&tile(s,src.x,src.y)!=='#'){
      s.x=src.x;s.y=src.y;s.phase=src.phase==='running'?'paused':src.phase;
      s.notice=s.phase==='paused'?'已从上次位置恢复并自动暂停。':'已恢复本段记录。';
      s.steps=Math.max(0,Number(src.steps)||0);s.time=Math.max(0,Number(src.time)||0);s.chimes=Math.min(s.plan.chimes,Math.max(0,Number(src.chimes)||0));
      s.suspicion=Math.min(.7,Math.max(0,Number(src.suspicion)||0));s.stride=Math.min(.16,Math.max(0,Number(src.stride)||0));s.guardClock=Math.min(.72,Math.max(0,Number(src.guardClock)||0));s.ring=Math.min(.5,Math.max(0,Number(src.ring)||0));
      s.collected=Array.isArray(src.collected)?[...new Set(src.collected.filter(k=>typeof k==='string'&&/^\d+,\d+$/.test(k)&&tile(s,...k.split(',').map(Number))==='D'))]:[];
      s.guards=s.guards.map((g,i)=>({...g,index:Math.min(g.path.length-1,Math.max(0,Number(src.guards?.[i]?.index)||0)),dir:src.guards?.[i]?.dir===-1?-1:1,linger:Math.min(2,Math.max(0,Number(src.guards?.[i]?.linger)||0)),focus:['up','down','left','right'].includes(src.guards?.[i]?.focus)?src.guards[i].focus:null}));
      r.run=s;
    }
  }
  return r;
}
export function createRun(stage){
  const plan=STAGES[stage-1]; if(!plan) throw Error('unknown stage');
  const y=plan.map.findIndex(row=>row.includes('S')), x=plan.map[y].indexOf('S');
  return {stage,plan,x,y,facing:'up',phase:'ready',steps:0,time:0,stride:0,suspicion:0,chimes:plan.chimes,ring:0,collected:[],guards:plan.guards.map(([a,b])=>{
    const path=[],dx=Math.sign(b[0]-a[0]),dy=Math.sign(b[1]-a[1]),n=Math.max(Math.abs(b[0]-a[0]),Math.abs(b[1]-a[1]));
    for(let i=0;i<=n;i++)path.push([a[0]+dx*i,a[1]+dy*i]);return {path,index:0,dir:1,linger:0,focus:null};
  }),guardClock:0,notice:'读懂巡卫灯锥后开始。'};
}
export function tile(s,x,y){return s.plan.map[y]?.[x]||'#';}
export function guardPosition(g){return g.path[g.index];}
export function guardFacing(g){if(g.linger>0&&g.focus)return g.focus;const a=g.path[g.index],next=g.index+g.dir,reverse=next<0||next>=g.path.length,b=g.path[reverse?g.index-g.dir:next]||a;return b[0]>a[0]?'right':b[0]<a[0]?'left':b[1]>a[1]?'down':'up';}
export function sightCells(s,g){
  const [x,y]=guardPosition(g),f=guardFacing(g),[dx,dy]=({up:[0,-1],down:[0,1],left:[-1,0],right:[1,0]})[f],out=[];
  for(let n=1;n<=3;n++){const px=x+dx*n,py=y+dy*n;if(tile(s,px,py)==='#') break;out.push([px,py]);}
  return out;
}
export function seen(s){return s.guards.some(g=>{const [gx,gy]=guardPosition(g);return (gx===s.x&&gy===s.y)||(tile(s,s.x,s.y)!=='C'&&sightCells(s,g).some(([x,y])=>x===s.x&&y===s.y));});}
export function move(s,dir){
  if(s.phase!=='running') return false;
  const d={up:[0,-1],down:[0,1],left:[-1,0],right:[1,0]}[dir];if(!d)return false;
  if(s.stride>0)return false;
  s.facing=dir;const nx=s.x+d[0],ny=s.y+d[1];if(tile(s,nx,ny)==='#'){s.notice='墙挡住了路，换个方向。';return false;}
  s.x=nx;s.y=ny;s.steps++;s.stride=.16;
  if(tile(s,nx,ny)==='D'&&!s.collected.includes(`${nx},${ny}`)){s.collected.push(`${nx},${ny}`);s.notice=`取得档案 ${s.collected.length}/${s.plan.documents}。`;}
  if(tile(s,nx,ny)==='X'){
    if(s.collected.length>=s.plan.documents){s.phase=s.stage===5?'complete':'won';s.notice=s.stage===5?'五处档案已送回，任务完成。':'档案到手，抵达出口。';}
    else s.notice=`还缺 ${s.plan.documents-s.collected.length} 份档案，出口暂不能交接。`;
  }
  return true;
}
export function chime(s){
  if(s.phase!=='running'||s.chimes<=0)return false;
  if(s.ring>0){s.notice='声响仍在扩散；稍后才能再次发声，次数未扣。';return false;}
  const nearby=s.guards.filter(g=>{const [x,y]=guardPosition(g);return Math.abs(x-s.x)+Math.abs(y-s.y)<=4;});
  if(!nearby.length){s.notice='巡卫都在四格听距之外；声响没有消耗。';return false;}
  s.chimes--;s.ring=.5;
  nearby.forEach(g=>{const [x,y]=guardPosition(g),dx=s.x-x,dy=s.y-y;g.linger=1.8;g.focus=Math.abs(dx)>=Math.abs(dy)?(dx>=0?'right':'left'):(dy>=0?'down':'up');});
  s.notice=`声响引住 ${nearby.length} 名近处巡卫；灯锥朝发声点转动，快躲进暗格。`;return true;
}
export function tick(s,dt){
  if(s.phase!=='running')return;
  dt=Math.min(0.08,Math.max(0,dt));s.time+=dt;s.guardClock+=dt;s.stride=Math.max(0,s.stride-dt);s.ring=Math.max(0,s.ring-dt);
  if(s.guardClock>=0.72){s.guardClock-=0.72;s.guards.forEach(g=>{if(g.linger<=0){if(g.index+g.dir<0||g.index+g.dir>=g.path.length)g.dir*=-1;g.index+=g.dir;}});}
  s.guards.forEach(g=>{g.linger=Math.max(0,g.linger-dt);if(!g.linger)g.focus=null;});
  s.suspicion=Math.max(0,s.suspicion+(seen(s)?dt:-dt*1.6));
  if(s.suspicion>=0.7){s.suspicion=0.7;s.phase='failed';s.notice='被巡卫看清了。可重试本段，已完成段落保留。';}
}
export function finish(record,s){
  if(!['won','complete'].includes(s.phase))return false;
  if(!record.completed.includes(s.stage))record.completed.push(s.stage);
  record.unlocked=Math.max(record.unlocked,Math.min(5,s.stage+1));
  const prior=record.best[s.stage];if(!prior||s.time<prior.time)record.best[s.stage]={time:Math.round(s.time*10)/10,steps:s.steps,chimesUsed:s.plan.chimes-s.chimes};
  record.run=s;return true;
}
export function snapshot(s){
  if(!s)return null;
  const {stage,x,y,facing,phase,steps,time,chimes,collected,guards,suspicion,stride,guardClock,ring}=s;
  return {stage,x,y,facing,phase,steps,time,chimes,suspicion,stride,guardClock,ring,collected:[...collected],guards:guards.map(({index,dir,linger,focus})=>({index,dir,linger,focus}))};
}
