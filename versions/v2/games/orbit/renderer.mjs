import{WIDTH,HEIGHT,SHAPES,LOCK_DELAY}from'./levels.mjs';
import{cells,landing}from'./engine.mjs';
export const COLORS={I:'#a8dccb',O:'#edcc81',T:'#c3b0e4',L:'#edac7e',J:'#8ebcdb',S:'#b6d391',Z:'#df9caa'};
export function createRenderer(canvas,preview){
 const c=canvas.getContext('2d'),pc=preview?.getContext('2d'),u=40,l=20,t=20;
 function block(ctx,x,y,type,size=40,ghost=false){
  ctx.save();ctx.strokeStyle=ghost?'#e2efce':'#f8fff27d';ctx.lineWidth=ghost?2:1;
  if(ghost){ctx.setLineDash([4,3]);ctx.strokeRect(x+4,y+4,size-8,size-8);}
  else{
   ctx.fillStyle=COLORS[type]||'#bec9c7';ctx.fillRect(x+2,y+2,size-4,size-4);
   ctx.fillStyle='#ffffff28';ctx.fillRect(x+3,y+3,size-6,Math.max(3,size*.14));
   ctx.fillStyle='#0c29352a';ctx.fillRect(x+3,y+size-7,size-6,4);
   ctx.strokeRect(x+4,y+4,size-8,size-8);
   ctx.fillStyle='#17313c';ctx.font=`700 ${Math.round(size*.32)}px system-ui`;ctx.textAlign='center';
   ctx.fillText(type,x+size/2,y+size*.63);
  }ctx.restore();
 }
 return{draw(g,reduced=false){
  c.fillStyle='#0b1923';c.fillRect(0,0,360,688);
  c.fillStyle='#142b37';c.fillRect(l,t,WIDTH*u,HEIGHT*u);
  for(let y=0;y<HEIGHT;y++)for(let x=0;x<WIDTH;x++){
   c.strokeStyle='#acc4bf13';c.lineWidth=1;c.strokeRect(l+x*u+.5,t+y*u+.5,u,u);
   if(g.board[y][x])block(c,l+x*u,t+y*u,g.board[y][x].type);
  }
  c.setLineDash([3,5]);c.strokeStyle='#df9caa70';c.beginPath();c.moveTo(l,t+2*u);c.lineTo(l+WIDTH*u,t+2*u);c.stroke();c.setLineDash([]);
  if(g.active&&g.state!=='lost'){
   const p=g.active,y=landing(g.board,p);
   for(const[x,z]of cells({...p,y}))block(c,l+x*u,t+z*u,p.type,u,true);
   for(const[x,z]of cells(p))block(c,l+x*u,t+z*u,p.type);
   if(p.lockAge!==null){c.fillStyle='#354b55';c.fillRect(l,668,320,4);c.fillStyle='#edc078';c.fillRect(l,668,320*Math.min(1,p.lockAge/LOCK_DELAY),4);}
  }
  const f=g.lastClear,age=f?(g.ticks-f.tick)/120:9;
  if(!reduced&&f?.rows.length&&age<.26){
   c.fillStyle=`rgba(239,223,158,${.40*(1-age/.26)})`;
   for(const y of f.rows)c.fillRect(l,t+y*u,WIDTH*u,u);
  }
  const danger=g.board.slice(0,4).some(row=>row.some(Boolean));
  c.strokeStyle=danger?'#df9caa':'#658b8c';c.lineWidth=2;c.strokeRect(l-2,t-2,WIDTH*u+4,HEIGHT*u+4);
  if(pc){
   pc.clearRect(0,0,220,300);g.queue.slice(g.nextIndex,g.nextIndex+3).forEach((type,i)=>{
    const shape=SHAPES[type][0],w=Math.max(...shape.map(p=>p[0]))+1;
    pc.fillStyle='#263e4a';pc.fillRect(10,8+i*98,200,88);
    pc.fillStyle='#b8ccca';pc.font='11px system-ui';pc.textAlign='left';pc.fillText(String(i+1).padStart(2,'0'),18,26+i*98);
    for(const[x,y]of shape)block(pc,55+(4-w)*15+x*30,22+i*98+y*30,type,30);
   });
  }
 }};
}
