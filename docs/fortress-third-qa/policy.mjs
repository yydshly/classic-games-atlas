// Copied-snapshot targeting and grid routing. Live page receives WASD+J only.

const V=[[0,-1],[1,0],[0,1],[-1,0]],center=n=>n*24+12,cell=n=>Math.floor(n/24),dist=(a,b)=>Math.abs(a.x-b.x)+Math.abs(a.y-b.y);
function walk(g,x,y){return x>0&&y>0&&x<24&&y<24&&!['S','B','W'].includes(g.tiles[y]?.[x])&&!(x===12&&y===23);}
function line(g,a,b){const dx=b.x-a.x,dy=b.y-a.y;if(Math.abs(dx)>8&&Math.abs(dy)>8)return-1;const dir=Math.abs(dx)<=8?(dy<0?0:2):(dx<0?3:1),v=V[dir],len=Math.max(Math.abs(dx),Math.abs(dy));for(let d=16;d<len-10;d+=6){if(['S','B'].includes(g.tiles[cell(a.y+v[1]*d)]?.[cell(a.x+v[0]*d)]))return-1;}return dir;}
function turn(p,dir){return dir;}
function baseDecide(g,{aggression=.35,home=19,staging={x:204,y:center(home)},collectItems=true}={}){const p=g.players[0];if(p.dead)return{dir:null,fire:false};const enemies=g.enemies.filter(e=>!e.dead).sort((a,b)=>dist(a,g.base)-dist(b,g.base));
for(const e of enemies){const d=line(g,p,e);if(d>=0&&dist(p,e)<490){const dir=turn(p,d);return{dir:p.dir===d?null:dir,fire:true,aim:e.id};}}
const sx=cell(p.x),sy=cell(p.y),q=[[sx,sy]],visited=new Map([[sx+','+sy,{n:0,first:null}]]);for(let i=0;i<q.length;i++){const[x,y]=q[i],here=visited.get(x+','+y);for(let d=0;d<4;d++){const[nx,ny]=[x+V[d][0],y+V[d][1]],k=nx+','+ny;if(!walk(g,nx,ny)||visited.has(k)||g.enemies.some(e=>cell(e.x)===nx&&cell(e.y)===ny))continue;visited.set(k,{n:here.n+1,first:here.first??[nx,ny]});q.push([nx,ny]);}}
let best={score:Infinity,target:null,point:null};for(const e of enemies){for(const[x,y]of q){const a={x:center(x),y:center(y)},r=dist(a,e),d=line(g,a,e);if(d<0||r<45||r>420)continue;const path=visited.get(x+','+y),score=path.n*24+r*aggression+dist(e,g.base)*.7+Math.max(0,center(home)-a.y)*.02;if(score<best.score)best={score,target:e.id,point:a,path};}}
if(!best.point){const item=collectItems&&(g.items.find(x=>x.type==='shield'&&p.shield<1)||g.items.find(x=>x.type==='rapid'&&p.rapid<1));const a=item||staging,path=visited.get(cell(a.x)+','+cell(a.y));best={point:{x:center(cell(a.x)),y:center(cell(a.y))},path,target:'staging'};}
let a=best.point;if(best.path?.first)a={x:center(best.path.first[0]),y:center(best.path.first[1])};const dx=a.x-p.x,dy=a.y-p.y;let d=Math.abs(dx)>Math.abs(dy)?dx>0?1:3:dy>0?2:0;
if(Math.abs(dx)<3&&Math.abs(dy)<3)return{dir:null,fire:best.target!=='staging',target:best.target};d=turn(p,d);return{dir:d,fire:best.target!=='staging',target:best.target};}


function towards(g,x,y,{fire=false,target='route'}={}){
 const p=g.players[0],sx=cell(p.x),sy=cell(p.y),q=[[sx,sy]],seen=new Map([[`${sx},${sy}`,null]]);let found=null;
 for(let i=0;i<q.length;i++){const a=q[i];if(a[0]===x&&a[1]===y){found=a;break;}for(let d=0;d<4;d++){const nx=a[0]+V[d][0],ny=a[1]+V[d][1],k=`${nx},${ny}`;if(!walk(g,nx,ny)||seen.has(k))continue;seen.set(k,{from:a,dir:d});q.push([nx,ny]);}}
 if(!found)return{dir:null,fire,target,reason:'route unavailable'};
 let a=found,back=seen.get(`${a[0]},${a[1]}`);while(back&&!(back.from[0]===sx&&back.from[1]===sy)){a=back.from;back=seen.get(`${a[0]},${a[1]}`);}
 const dx=center(a[0])-p.x,dy=center(a[1])-p.y;if(Math.abs(dx)<3&&Math.abs(dy)<3)return{dir:null,fire,target,arrived:true};
 const d=Math.abs(dx)>Math.abs(dy)?dx>0?1:3:dy>0?2:0;return{dir:turn(p,d),fire,target};
}
export function decide(g,{strategy='flank'}={}){
 const p=g.players[0];if(p.dead)return{dir:null,fire:false};
 if(strategy==='overextend'&&g.time>=3){const a=towards(g,7,3,{target:'wrong plan: chase northern spawn; leave base uncovered'});return a.arrived?{dir:p.dir===0?null:0,fire:true,target:a.target}:a;}
 if(strategy==='breach'||strategy==='overextend'){
  const centralOpen=[11,12,13].some(x=>g.tiles[18][x]!== 'B');
  if(!centralOpen){
   if(cell(p.x)<11||cell(p.x)>13||cell(p.y)!==19)return towards(g,12,19,{target:'central breach approach'});
   return{dir:p.dir===0?null:turn(p,0),fire:p.dir===0,target:'central brick gate',reason:'open shortcut; expose the same firing lane'};
  }
  const open=[11,12,13].find(x=>g.tiles[18][x]!== 'B');
  if(g.time<5&&cell(p.y)>=18)return towards(g,open,17,{target:'cross opened central gate'});
  return baseDecide(g,{aggression:.7,home:16,staging:{x:center(open),y:center(16)},collectItems:false});
 }
 return baseDecide(g,{aggression:.2,home:19});
}
