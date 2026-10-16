import {writeFileSync,mkdirSync} from 'node:fs';
import {geometry,reachable,lowerBound,DIRECTIONS,solve} from './crate_solver.mjs';
const names=['一箱启程','绕柱入位','窄门转身','双位初见','回廊调头','双箱接力','侧舱让行','两路归仓','三角周转','交换通道','错位装卸','折返货廊','四向中庭','长巷回旋','分区入仓','交叉调度','五箱合流','深舱回转','终端换线','仓格归一'];
let seed=1;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
function shuffled(a){const b=[...a];for(let i=b.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[b[i],b[j]]=[b[j],b[i]];}return b;}
const originals=[
 {grid:['######','#....#','#....#','#..#.#','#....#','######'],player:{x:1,y:2},boxes:[{x:2,y:2}],goals:[{x:4,y:2}]},
 {grid:['#######','#.....#','#.....#','#..#..#','#.....#','#.....#','#######'],player:{x:2,y:4},boxes:[{x:3,y:4}],goals:[{x:4,y:2}]},
 {grid:['#######','#.....#','#..#..#','#..#..#','#.....#','#.....#','#######'],player:{x:1,y:4},boxes:[{x:2,y:4}],goals:[{x:4,y:2}]},
];
function generate(index,attempt){
 seed=530107+index*1009+attempt*173;const authoredSeed=seed,count=index<8?2:index<12?3:index<16?4:5,w=count===2?8+(index%2):count===3?8+(index%2):count===4?9:10,h=count<=2?7+(index>=6?1:0):count===3?8:9;
 const grid=Array.from({length:h},(_,y)=>Array.from({length:w},(_,x)=>!x||!y||x===w-1||y===h-1?'#':'.'));
 const available=[];for(let y=2;y<h-2;y++)for(let x=2;x<w-2;x++)available.push({x,y});
 for(const p of shuffled(available).slice(0,1+(index%4)))grid[p.y][p.x]='#';
 const temp={grid:grid.map(r=>r.join('')),goals:[],boxes:[],player:{x:1,y:1}},g0=geometry(temp);if(reachable(g0,w+1,[]).size!==g0.floor.size)return null;
 const goalPool=shuffled(available.filter(p=>grid[p.y][p.x]==='.'));if(count>=4)goalPool.sort((a,b)=>a.x+a.y-b.x-b.y);const goals=[];
 for(const p of goalPool)if(goals.every(q=>Math.abs(p.x-q.x)+Math.abs(p.y-q.y)>=2)){goals.push(p);if(goals.length===count)break;}if(goals.length!==count)return null;
 const level={...temp,goals},geo=geometry(level);let boxes=goals.map(p=>p.y*w+p.x),player=[...geo.floor].find(p=>!boxes.includes(p)),seen=new Set([boxes.slice().sort((a,b)=>a-b).join(',')]),reverse='',lastId=-1;
 const target=count===2?4+(index-3):count===3?9+(index-8):count===4?12+(index-12)*2:18+(index-16)*2;
 for(let pull=0;pull<90;pull++){
  const paths=reachable(geo,player,boxes),occupied=new Set(boxes),options=[];
  for(let i=0;i<boxes.length;i++)for(const d of DIRECTIONS){const stand=geo.adjacent(boxes[i],d),end=geo.adjacent(stand,d);if(!paths.has(stand)||!geo.floor.has(end)||occupied.has(end))continue;const next=[...boxes];next[i]=stand;const key=next.slice().sort((a,b)=>a-b).join(',');if(seen.has(key))continue;const cost=lowerBound(geo,next);if(!Number.isFinite(cost))continue;options.push({i,stand,end,dir:d.key,next,key,score:cost+(i!==lastId?.5:0)+random()*2,cost,path:paths.get(stand)});}
  if(!options.length)return null;options.sort((a,b)=>b.score-a.score);const choice=options[Math.floor(random()**3*Math.min(4,options.length))];reverse+=choice.path+choice.dir;boxes=choice.next;player=choice.end;seen.add(choice.key);lastId=choice.i;
  if(choice.cost>=target){return {...level,player:{x:player%w,y:Math.floor(player/w)},boxes:boxes.map(p=>({x:p%w,y:Math.floor(p/w)})),generation:{method:'original seeded room, reverse-pull construction, independent forward search',seed:authoredSeed,attempt,pulls:pull+1,lowerBound:choice.cost}};}
 }
 return null;
}
const levels=[],solutions=[];
for(let index=0;index<20;index++){
 let level,result;
 for(let attempt=0;attempt<120;attempt++){
  level=index<3?{...originals[index],generation:{method:'original hand design'}}:generate(index,attempt);if(!level)continue;result=solve(level,100000);if(result.solved)break;level=null;
 }
 if(!level||!result?.solved)throw Error('Could not generate verified level '+(index+1));
 const count=level.boxes.length;level={id:index+1,name:names[index],band:count===1?'单箱起步':count===2?'双箱协调':count===3?'三箱周转':count===4?'四箱调度':'五箱合流',tip:count===1?'先走到箱子背后，再把它推上目标。撤销始终可用。':count===2?'先给另一只箱子留出站位。只推不拉，转身比抢步更重要。':count===3?'留意通路和站位。暂时离开目标，可能让另一只箱子顺利通过。':'先规划通道，再逐一归位。可以随时撤销，不必一次想完。',...level};
 levels.push(level);solutions.push({stage:level.id,name:level.name,method:result.method,actions:result.actions,moves:result.actions.length,pushes:result.pushes,expanded:result.expanded,boxCount:count,generation:level.generation});console.log(JSON.stringify({stage:level.id,boxes:count,moves:result.actions.length,pushes:result.pushes,expanded:result.expanded}));
}
mkdirSync('games/crate',{recursive:true});mkdirSync('docs/crate-qa',{recursive:true});writeFileSync('games/crate/levels.mjs','// Original hand designs and seeded reverse-pull rooms. See scripts/generate_crate.mjs.\nexport const LEVELS='+JSON.stringify(levels,null,2)+';\n');writeFileSync('docs/crate-qa/solutions.json',JSON.stringify({generatedAt:new Date().toISOString(),kind:'independent push-space search; normal U/R/D/L routes; no optimality claim',solutions},null,2)+'\n');
