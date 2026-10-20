// Original transparent vector commando poses. Feet anchor stays at the model's feet.
export function drawCommando(c,a,t){
 c.save();c.translate(a.x+12,a.y);c.scale(a.facing,1);c.lineJoin='round';c.lineCap='round';
 const poly=(pts,fill,stroke='#192f41',width=1.25)=>{c.beginPath();pts.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();c.fillStyle=fill;c.fill();if(stroke){c.strokeStyle=stroke;c.lineWidth=width;c.stroke();}};
 const rect=(x,y,w,h,fill)=>{c.fillStyle=fill;c.fillRect(x,y,w,h)};
 const limb=(x,y,xx,yy,color,width=4)=>{c.beginPath();c.moveTo(x,y);c.lineTo(xx,yy);c.strokeStyle='#192f41';c.lineWidth=width+2;c.stroke();c.strokeStyle=color;c.lineWidth=width;c.stroke()};
 const helmet=(x,y)=>{poly([[x-7,y+1],[x-4,y-2],[x+4,y-2],[x+8,y+2],[x+8,y+8],[x-5,y+9],[x-8,y+5]],'#e3e9c6','#203c4d',1.25);rect(x-5,y,11,2,'#749c9e');poly([[x-2,y+3],[x+9,y+3],[x+8,y+6],[x,y+7]],'#1e475a');rect(x+2,y+3,5,1,'#8ae1df');rect(x+6,y+7,3,3,'#e8b98b');rect(x-8,y+4,3,4,'#d69c69')};
 const gun=(x,y,up=false)=>{c.save();c.translate(x,y);if(up)c.rotate(-Math.PI/4);poly([[-2,-3],[5,-3],[7,-2],[19,-2],[19,2],[6,2],[4,4],[-2,3]],'#c6d6bd');rect(8,-1,14,2,'#294a5d');rect(18,-3,4,6,'#182f40');rect(1,-2,5,2,'#f3ce7f');rect(3,3,3,3,'#304a59');c.restore()};
 if(a.crouched){
  poly([[-11,8],[-6,5],[3,6],[9,11],[9,17],[-11,17]],'#e2d9b3','#f6e3b0',1.1);
  limb(-7,12,-10,16,'#416b7b',5);limb(-8,15,0,15,'#b9c5ab',4);rect(-12,15,8,3,'#1e3647');
  poly([[-10,7],[-3,5],[5,8],[4,14],[-7,13]],'#315d73');rect(-9,8,6,3,'#7ba4a3');poly([[-7,5],[-11,7],[-12,11],[-8,10]],'#b75c45');
  helmet(3,2);limb(0,10,9,11,'#d5b691',3);limb(7,11,14,9,'#e5c49b',3);gun(8,9);
 }else{
  const air=!a.grounded,walk=Math.abs(a.vx)>5?Math.sin(t*14)*3:0;
  if(air){limb(-4,25,-9,29,'#a8c3b3',4);limb(-9,29,-4,33,'#3e6375',4);limb(5,24,10,27,'#b5c7aa',4);limb(10,27,7,31,'#3e6375',4);rect(-6,31,7,3,'#192f41');rect(6,30,8,3,'#192f41');}
  else{limb(-5,24,-6+walk,32,'#a9c1aa',4);limb(5,24,6-walk,32,'#a9c1aa',4);rect(-10+walk,32,8,4,'#1a3548');rect(3-walk,32,9,4,'#1a3548');rect(-10+walk,32,7,1,'#d5d7b5');rect(4-walk,32,7,1,'#d5d7b5');}
  poly([[-9,12],[-3,10],[6,12],[9,23],[5,27],[-8,26],[-11,20]],'#325d72','#e4ddbc',1.2);
  rect(-7,14,11,7,'#759c9d');rect(-6,15,3,4,'#c1c8a6');rect(-1,15,3,4,'#c1c8a6');rect(-8,24,15,2,'#b19970');rect(-2,24,3,2,'#f2d78f');
  poly([[-6,10],[-11,14],[-14,20],[-10,18],[-7,14]],'#c87151');helmet(0,3);
  limb(-8,15,-9,22,'#e2bf96',3);limb(4,15,9,19,'#d6b58d',3);limb(9,19,14,17,'#ebc69b',3);gun(8,17,a.aimUp);
 }
 c.restore();
}
