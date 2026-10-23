import {PALETTE} from './levels.mjs';
import {RADIUS,TOP,SHOOTER,DANGER,cells,centre,traceShot} from './engine.mjs';
export class Renderer{
 constructor(canvas){this.canvas=canvas;this.ctx=canvas.getContext('2d',{alpha:false});this.preview=null;this.previewKey='';this.lastOffset=null;this.pressurePulseUntil=0;}
 bubble(x,y,color,r=RADIUS,alpha=1){
  if(color===null||color===undefined)return;const c=this.ctx,p=PALETTE[color];c.save();c.globalAlpha=alpha;c.translate(x,y);
  c.fillStyle='#07162677';c.beginPath();c.ellipse(1,r*.62,r*.91,r*.48,0,0,Math.PI*2);c.fill();
  const gr=c.createRadialGradient(-r*.32,-r*.4,1,0,0,r);gr.addColorStop(0,'#fff2d8');gr.addColorStop(.25,p.fill);gr.addColorStop(.78,p.fill);gr.addColorStop(1,p.dark);c.fillStyle=gr;c.beginPath();c.arc(0,0,r-1,0,Math.PI*2);c.fill();
  c.strokeStyle=p.dark;c.lineWidth=1.5;c.beginPath();c.arc(0,0,r-1,0,Math.PI*2);c.stroke();c.fillStyle='#ffffff99';c.beginPath();c.ellipse(-r*.28,-r*.36,r*.2,r*.1,-.5,0,Math.PI*2);c.fill();
  c.strokeStyle='#f5ebd377';c.lineWidth=1;c.beginPath();c.arc(0,0,r-4,-2.7,-.5);c.stroke();c.fillStyle=p.dark;c.font=`bold ${Math.floor(r*.66)}px system-ui`;c.textAlign='center';c.textBaseline='middle';// Geometric identity marks remain readable without platform glyph fonts.
  const q=r*.22;c.beginPath();
  if(color===0)c.arc(0,1,q*.66,0,Math.PI*2);
  if(color===1){c.moveTo(0,1-q);c.lineTo(q,1);c.lineTo(0,1+q);c.lineTo(-q,1);c.closePath();}
  if(color===2){c.moveTo(0,1-q);c.lineTo(q,1+q*.8);c.lineTo(-q,1+q*.8);c.closePath();}
  if(color===3)c.rect(-q*.8,1-q*.8,q*1.6,q*1.6);
  if(color===4){for(let i=0;i<8;i++){const a=-Math.PI/2+i*Math.PI/4,rr=i%2?q*.42:q*1.2;const x=Math.cos(a)*rr,y=1+Math.sin(a)*rr;i?c.lineTo(x,y):c.moveTo(x,y);}c.closePath();}
  c.fill();c.restore();
 }
 draw(g,clock=0){
  if(this.lastOffset!==null&&g.offset>this.lastOffset)this.pressurePulseUntil=clock+.6;this.lastOffset=g.offset;
  const c=this.ctx;c.fillStyle='#182a38';c.fillRect(0,0,600,660);
  const sky=c.createLinearGradient(0,0,0,660);sky.addColorStop(0,'#243d4e');sky.addColorStop(1,'#132635');c.fillStyle=sky;c.fillRect(36,32,528,508);
  for(let i=1;i<65;i++){const x=45+(i*137)%510,y=42+(i*83)%480;c.fillStyle=i%4?'#b8c5ba33':'#d5c99d66';c.fillRect(x,y,i%4?1:2,i%4?1:2);}
  c.strokeStyle='#9aacb133';c.lineWidth=1;c.strokeRect(36.5,32.5,527,507);
  for(let y=40;y<540;y+=20){c.strokeStyle=y%80===40?'#c7b58b77':'#6f8b9555';c.beginPath();c.moveTo(29,y);c.lineTo(35,y);c.moveTo(565,y);c.lineTo(571,y);c.stroke();}
  c.fillStyle='#a2b7b7';c.font='9px monospace';c.textAlign='left';c.fillText('CELESTIAL CHART / '+String(g.level).padStart(2,'0'),45,21);c.textAlign='right';c.fillText('02 ORIGINAL CHARTS',555,21);
  // This plate is the actual moving ceiling, not a decorative timer.
  const plateY=TOP-RADIUS+g.offset;c.fillStyle='#101e29';c.fillRect(37,32,526,Math.max(0,plateY-32));
  const metal=c.createLinearGradient(0,plateY-10,0,plateY+2);metal.addColorStop(0,'#526b70');metal.addColorStop(.55,'#aabdb1');metal.addColorStop(1,'#415d65');c.fillStyle=metal;c.fillRect(37,plateY-8,526,8);if(clock<this.pressurePulseUntil){c.fillStyle=`rgba(243,209,139,${Math.max(0,(this.pressurePulseUntil-clock)*.45)})`;c.fillRect(37,plateY,526,14);}
  c.fillStyle='#d3c38d';for(let x=43;x<560;x+=24)c.fillRect(x,plateY-5,11,2);c.fillStyle='#ebd9a5';c.font='9px monospace';c.textAlign='center';if(plateY>55)c.fillText(`DESCENT ${g.descents} · NEXT IN ${g.shotsUntilDrop}`,300,plateY-17);
  c.setLineDash([5,7]);c.strokeStyle='#dd9b7d99';c.beginPath();c.moveTo(37,DANGER);c.lineTo(563,DANGER);c.stroke();c.setLineDash([]);c.fillStyle='#be9785';c.font='9px monospace';c.textAlign='left';c.fillText('RETURN LINE',43,555);
  const stamp=g.grid.map(row=>row.map(x=>x??'.').join('')).join('/'),key=`${g.angle}:${g.offset}:${stamp}`;
  if(key!==this.previewKey){this.preview=traceShot(g,g.angle);this.previewKey=key;}
  if(g.state==='playing'&&!g.flight&&this.preview){
   c.fillStyle='#e7dfbd';for(let i=1;i<this.preview.points.length;i++){const p=this.preview.points[i];c.globalAlpha=.28+(i%3)*.13;c.beginPath();c.arc(p.x,p.y,1.7,0,Math.PI*2);c.fill();}c.globalAlpha=1;
   if(this.preview.cell){const p=centre(this.preview.cell.r,this.preview.cell.c,g.offset);c.strokeStyle=PALETTE[g.current]?.fill||'#e4dfc6';c.setLineDash([3,4]);c.lineWidth=1.5;c.beginPath();c.arc(p.x,p.y,RADIUS-1,0,Math.PI*2);c.stroke();c.setLineDash([]);}
  }
  for(const b of cells(g))this.bubble(b.x,b.y,b.color);
  for(const e of g.effects){const age=(e.kind==='drop'?.8:.4)-e.ttl,y=e.kind==='drop'?e.y+age*age*580:e.y;this.bubble(e.x,y,e.color,RADIUS*(e.kind==='pop'?Math.max(.2,1-age*1.8):1),Math.min(1,e.ttl*3));}
  // A compass-inspired launcher; artwork and animation are drawn from geometry.
  c.strokeStyle='#90a9a455';c.lineWidth=1;c.beginPath();c.arc(300,629,53,Math.PI,Math.PI*2);c.stroke();
  c.save();c.translate(SHOOTER.x,SHOOTER.y);c.rotate(g.angle);c.fillStyle='#637f87';c.beginPath();c.roundRect(-11,-45,22,50,5);c.fill();c.fillStyle='#aec8c4';c.fillRect(-7,-42,14,5);c.restore();
  c.fillStyle='#213e49';c.beginPath();c.arc(300,626,30,0,Math.PI*2);c.fill();c.strokeStyle='#b9b38d';c.stroke();
  if(g.flight)this.bubble(g.flight.x,g.flight.y,g.flight.color);
  else this.bubble(300,610,g.current);
  this.bubble(430,614,g.next,18,g.swapped?.65:1);
  c.fillStyle='#c7c5aa';c.font='10px monospace';c.textAlign='center';c.fillText('当前',300,573);c.fillText('下一颗',430,582);c.fillStyle='#8ea9aa';c.font='9px monospace';c.fillText('X 交换',430,649);c.fillText(`${Math.abs(g.angle*180/Math.PI).toFixed(0)}° ${g.angle<-.02?'←':g.angle>.02?'→':'↑'}`,300,652);
 }
}
