// v2 original procedural art. The recovered v1 renderer was unavailable.
// All terrain/buildings/roads are drawn from the real immutable simulation snapshot.
export const VIEW = Object.freeze({width:1200,height:800,x:560,y:176,sx:78,sy:39});
export function projectTile(id){return {x:VIEW.x+(id%7-Math.floor(id/7))*VIEW.sx,y:VIEW.y+(id%7+Math.floor(id/7))*VIEW.sy};}
export function hitTile(x,y){
  let best=null;
  for(let id=0;id<42;id++){const p=projectTile(id);if(Math.abs(x-p.x)/VIEW.sx+Math.abs(y-p.y)/VIEW.sy<=1)best=id;}
  return best;
}
const colors={plain:'#b6ca8d',forest:'#7fa582',hill:'#b7b095',water:'#3a8391'};
function poly(c,pts,fill,stroke){c.beginPath();pts.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();if(fill){c.fillStyle=fill;c.fill();}if(stroke){c.strokeStyle=stroke;c.stroke();}}
function diamond(c,x,y,fill,stroke){poly(c,[[x,y-38],[x+77,y],[x,y+38],[x-77,y]],fill,stroke);}
function line(c,pts,color,width=1){c.beginPath();pts.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.strokeStyle=color;c.lineWidth=width;c.lineCap='round';c.lineJoin='round';c.stroke();}
function ellipse(c,x,y,rx,ry,fill){c.beginPath();c.ellipse(x,y,rx,ry,0,0,Math.PI*2);c.fillStyle=fill;c.fill();}
function text(c,t,x,y,size=16,color='#eff4df',align='center'){c.font=`${size}px "Noto Sans CJK SC", sans-serif`;c.fillStyle=color;c.textAlign=align;c.textBaseline='middle';c.fillText(t,x,y);}
function tree(c,x,y,s=1){c.save();c.translate(x,y);c.scale(s,s);line(c,[[0,0],[0,-30]],'#58684b',5);poly(c,[[-16,-17],[0,-50],[16,-17]],'#456f58');poly(c,[[-19,-9],[0,-40],[19,-9]],'#527e5f');poly(c,[[0,-40],[19,-9],[0,-13]],'#628e68');c.restore();}
function house(c,x,y,scale=1,roof='#bd7253'){c.save();c.translate(x,y);c.scale(scale,scale);ellipse(c,0,2,30,11,'#4c62483f');poly(c,[[-24,-4],[0,8],[0,-23],[-24,-35]],'#e7d8ad');poly(c,[[0,8],[25,-5],[25,-36],[0,-23]],'#c4bc91');poly(c,[[-30,-34],[-5,-55],[29,-37],[0,-19]],roof);poly(c,[[-5,-55],[29,-37],[25,-36]],'#e5a17b');poly(c,[[6,-3],[14,-7],[14,-23],[6,-19]],'#596556');poly(c,[[-16,-14],[-8,-10],[-8,-21],[-16,-25]],'#6d8c89');c.restore();}
function building(c,t,p,time,motion){const{x,y}=p;c.save();c.translate(x,y-8);
  switch(t.building){
    case 'village':house(c,-19,0,.82);house(c,17,7,.66,'#d3a15d');line(c,[[9,-37],[9,-65]],'#e9dfbb',2);poly(c,[[9,-65],[31,-59],[9,-53]],'#e6bd60');break;
    case 'farm':
      poly(c,[[-49,-4],[-6,-25],[48,1],[5,22]],'#8e8050');
      for(let j=0;j<5;j++)for(let i=0;i<5;i++){let a=-36+i*11+j*8,b=-3-i*5+j*4;line(c,[[a,b],[a,b-10]],'#e3c466',2);line(c,[[a,b-4],[a-3,b-8],[a,b-5],[a+3,b-9]],'#f0d687',1.4);}
      house(c,35,-8,.35,'#a46b49');break;
    case 'lumber':house(c,-10,-2,.67,'#9b6d4f');for(let i=0;i<3;i++){line(c,[[13+i*7,12-i*3],[33+i*7,2-i*3]],'#916e4b',7);ellipse(c,13+i*7,12-i*3,3,4,'#d7b279');}break;
    case 'quarry':for(let i=0;i<3;i++)poly(c,[[-34+i*20,6],[-28+i*20,-17-i*4],[-13+i*20,-26],[1+i*20,-5],[-10+i*20,13]],['#a4a89b','#d1cbb2','#c1bfa8'][i]);line(c,[[18,-13],[18,-51],[43,-39],[43,0]],'#77694d',4);line(c,[[18,-51],[40,-20]],'#877d5a',2);break;
    case 'study':house(c,0,1,1,'#657d91');poly(c,[[-12,-47],[0,-55],[13,-48],[0,-40]],'#d9c99e');line(c,[[-10,-48],[-1,-43],[0,-50],[0,-41],[11,-47]],'#f5ead0',2);break;
    case 'market':house(c,-7,-2,.72,'#d89d52');for(let i=0;i<5;i++)poly(c,[[-32+i*12,-13],[-28+i*12,-27],[-16+i*12,-21],[-20+i*12,-7]],i%2?'#f0db9d':'#c47454');line(c,[[-32,-12],[-32,8],[28,4],[28,-7]],'#6d6c48',2);break;
    case 'port':poly(c,[[-45,3],[-13,-13],[49,17],[17,33]],'#b79c73');for(let i=0;i<6;i++)line(c,[[-40+i*10,5-i*4],[-2+i*10,24-i*4]],'#887853',2);line(c,[[17,6],[17,-52]],'#ded5b5',3);poly(c,[[20,-51],[43,-16],[20,-19]],'#eee9cb');poly(c,[[7,-6],[41,9],[34,19],[12,14]],'#a66d49');break;
    case 'beacon':poly(c,[[-15,8],[-12,-69],[12,-69],[17,8],[0,17]],'#e1ddba');poly(c,[[0,17],[17,8],[12,-69],[0,-66]],'#b8bcac');poly(c,[[-17,-70],[0,-80],[18,-70],[0,-60]],'#e5b357');poly(c,[[-10,-70],[-10,-91],[10,-91],[11,-70]],'#e6d69c');poly(c,[[-16,-91],[0,-107],[17,-91]],'#a3664c');ellipse(c,0,-80,5,8,'#fff2bc');if(motion){c.globalAlpha=.12+.06*Math.sin(time/500);poly(c,[[0,-80],[-135,-122],[-145,-70]],'#ffe7a0');}break;
  }
  if(t.worker){ellipse(c,32,11,10,6,'#f8e6b3');ellipse(c,32,2,5,6,'#48685c');ellipse(c,32,-6,4,4,'#f3d6a7');}
  c.restore();
}
export function render(c,s,{width=1200,height=800,time=0,reducedMotion=false,selectedTile=null}={}){
 c.save();c.clearRect(0,0,width,height);const scale=Math.min(width/1200,height/800);c.translate((width-1200*scale)/2,(height-800*scale)/2);c.scale(scale,scale);
 const bg=c.createLinearGradient(0,0,0,800);bg.addColorStop(0,'#193d4c');bg.addColorStop(1,'#397d83');c.fillStyle=bg;c.fillRect(0,0,1200,800);
 // Fine ocean currents and distant land contours, with no gameplay meaning.
 c.globalAlpha=.17;for(let j=0;j<16;j++){let yy=110+j*42;line(c,Array.from({length:10},(_,i)=>[i*140-40,yy+Math.sin(i*.8+j)*10]),'#bad6c5',1);}c.globalAlpha=1;
 text(c,'潮 原 海 湾',90,72,19,'#cadace','left');text(c,'COASTAL CHRONICLE',90,99,10,'#91b8b7','left');
 text(c,`${String(s.levelIndex+1).padStart(2,'0')} / 08`,1108,76,18,'#d9dfc4');
 ellipse(c,602,430,489,194,'#142d3548');
 // Coordinates align with the exact same projection used by pointer hit testing.
 for(let col=0;col<7;col++){const p=projectTile(col);text(c,String.fromCharCode(65+col),p.x+8,p.y-64,14,'#b8d1c8');}
 for(let row=0;row<6;row++){const p=projectTile(row*7);text(c,String(row+1),p.x-95,p.y+1,14,'#b8d1c8');}
 for(const t of s.tiles){const p=projectTile(t.id),x=p.x,y=p.y;
   if(!t.revealed){diamond(c,x,y,'#638887','#799a95');ellipse(c,x-8,y,30,9,'#7da29a40');continue;}
   const water=t.terrain==='water',h=water?0:12;
   if(!water){poly(c,[[x-77,y],[x,y+38],[x,y+50],[x-77,y+12]],'#7b9375');poly(c,[[x,y+38],[x+77,y],[x+77,y+12],[x,y+50]],'#617d69');}
   diamond(c,x,y,colors[t.terrain],water?'#77a5a134':'#dde3ad55');
   if(water){c.globalAlpha=.3;line(c,[[x-28,y],[x-7,y+2],[x+10,y-1]],'#b5ded1',1.6);c.globalAlpha=1;}
   else if(!t.building){
     if(t.terrain==='forest'){tree(c,x-20,y+5,.75);tree(c,x+20,y+4,.85);tree(c,x,y-9,1.05);}
     if(t.terrain==='hill'){poly(c,[[x-48,y+10],[x-18,y-27],[x+4,y+10]],'#919c85');poly(c,[[x-18,y-27],[x+4,y+10],[x+18,y+1]],'#ccd0b0');poly(c,[[x-10,y+17],[x+23,y-34],[x+48,y+3]],'#a3ac92');poly(c,[[x+23,y-34],[x+48,y+3],[x+31,y+15]],'#d1d3b8');}
     if(t.terrain==='plain'){for(let k=0;k<3;k++){const xx=x-30+k*24,yy=y+6-k*4;line(c,[[xx,yy],[xx-2,yy-5],[xx,yy],[xx+3,yy-4]],'#769d6c',1.4);}}
   }
   if(t.road){const ns=s.tiles.filter(n=>n.revealed&&(n.road||['village','market','port'].includes(n.building))&&Math.abs(n.col-t.col)+Math.abs(n.row-t.row)===1);
      if(!ns.length)ellipse(c,x,y,8,4,'#e6d1a1');
      for(const n of ns){const q=projectTile(n.id);line(c,[[x,y],[(x+q.x)/2,(y+q.y)/2]],water?'#dbc092':'#e3d2a7',water?14:8);if(water){line(c,[[x-3,y-5],[(x+q.x)/2-3,(y+q.y)/2-5]],'#826e4e',2);}}
   }
   if(t.landmark&&!t.building){line(c,[[x+23,y-5],[x+23,y-35]],'#726851',2);poly(c,[[x+23,y-35],[x+43,y-30],[x+23,y-25]],'#e2ba68');}
   if(t.building)building(c,t,p,time,!reducedMotion);
 }
 // Trade animation follows only an actual connected and funded route in forecast.
 if(s.forecast)for(const route of s.forecast.tradeRoutes){for(let i=1;i<route.length;i++){const a=projectTile(route[i-1]),b=projectTile(route[i]);line(c,[[a.x,a.y],[b.x,b.y]],'#f8d786',2);}if(route.length>1){const phase=reducedMotion?.4:(time/1400)%1,seg=Math.min(route.length-2,Math.floor(phase*(route.length-1))),a=projectTile(route[seg]),b=projectTile(route[seg+1]),f=phase*(route.length-1)-seg;ellipse(c,a.x+(b.x-a.x)*f,a.y+(b.y-a.y)*f-5,5,4,'#fff1bb');}}
 if(selectedTile!==null&&s.tiles[selectedTile]){const p=projectTile(selectedTile);c.lineWidth=3;diamond(c,p.x,p.y,null,'#ffde8d');const t=s.tiles[selectedTile];text(c,`${String.fromCharCode(65+t.col)}${t.row+1}`,p.x,p.y+28,13,'#183e45');}
 // Small compass and bottom legend remain outside the map's interactive extent.
 line(c,[[1054,615],[1054,670]],'#a9c9bb',2);poly(c,[[1054,602],[1045,626],[1063,626]],'#dfd5a9');text(c,'N',1054,587,13,'#e0e5cb');
 const legend=[['#b6ca8d','平原'],['#527e5f','森林'],['#c1bfa8','丘陵'],['#61a4ad','水域']];legend.forEach(([color,label],i)=>{ellipse(c,99+i*105,703,6,6,color);text(c,label,114+i*105,704,14,'#d0e0cf','left');});
 text(c,s.tiles.some(t=>!t.revealed)?'海雾遮住的土地，可以沿已知边缘探索。':'点选地块 → 建造 / 派工 → 查看预览 → 结束回合',90,745,15,'#b5d0c6','left');
 c.restore();
}
