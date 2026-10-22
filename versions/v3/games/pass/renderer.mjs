import {TYPES,FOES,pathFor,sitesFor,MAPS} from './engine.mjs';
export class Renderer{
 constructor(canvas){this.c=canvas;this.x=canvas.getContext('2d');this.bg=new Image;this.bg.src=new URL('../../../v2/games/pass/assets/valley.webp',import.meta.url).href;this.terrains=new Map;this.units=Array.from({length:8},(_,i)=>{let a=new Image;a.src=new URL('../../../v2/games/pass/assets/unit-'+i+'.webp',import.meta.url).href;return a});}
 sprite(i,x,y,w,h,alpha=1,flip=false){let c=this.x,im=this.units[i];if(!im.complete||!im.naturalWidth)return;c.save();c.globalAlpha=alpha;c.translate(x,y);if(flip)c.scale(-1,1);c.drawImage(im,-w/2,-h,w,h);c.restore();}
 text(s,x,y,color='#fff0c8',size=13){let c=this.x;c.font=`600 ${size}px system-ui`;c.textAlign='center';c.lineWidth=3;c.strokeStyle='#182b28';c.strokeText(s,x,y);c.fillStyle=color;c.fillText(s,x,y);}
 draw(g,selected,aim){let c=this.x,PATH=pathFor(g),SITES=sitesFor(g),map=MAPS[g.mapIndex||0];c.clearRect(0,0,800,533);c.fillStyle='#6c7a4b';c.fillRect(0,0,800,533);if((g.mapIndex||0)===0){if(this.bg.complete&&this.bg.naturalWidth)c.drawImage(this.bg,0,0,800,533);}else{let index=g.mapIndex||0;if(!this.terrains.has(index))this.terrains.set(index,makeTerrain(index,PATH,SITES,map));c.drawImage(this.terrains.get(index),0,0);}
 if(aim){c.save();c.lineWidth=34;c.strokeStyle='#5bf1d844';c.lineJoin='round';c.beginPath();PATH.forEach((p,i)=>i?c.lineTo(...p):c.moveTo(...p));c.stroke();c.restore();this.text('点击山路部署双人盾卫 · Esc 取消',400,40,'#baffed',17);}
 let chosen=g.towers.find(t=>t.id===selected);if(selected&&SITES.some(s=>s.id===selected)){let s=SITES.find(s=>s.id===selected);c.beginPath();c.arc(s.x,s.y,TYPES[chosen?.type||'bolt'].range,0,Math.PI*2);c.fillStyle='#e9d99817';c.fill();c.strokeStyle='#ffe9a580';c.setLineDash([5,7]);c.lineWidth=1.5;c.stroke();c.setLineDash([]);}
 for(let s of SITES){c.save();c.translate(s.x,s.y);c.scale(1,.45);c.beginPath();c.arc(0,0,31,0,Math.PI*2);c.fillStyle='#27362abb';c.fill();c.lineWidth=4;c.strokeStyle=s.id===selected?'#ffe3a0':'#c6b890';c.stroke();c.restore();if(!g.towers.some(t=>t.id===s.id)){this.text('+',s.x,s.y+3,'#fff0bd',25);this.text(String(s.id),s.x+25,s.y+19,'#e2e4c4',12);}}
 // Sort all physical figures by their feet to keep foreground occlusion coherent.
 let objects=[...g.towers.map(t=>({kind:'tower',y:t.y,v:t})),...g.enemies.map(e=>({kind:'enemy',y:e.y,v:e})),...g.guards.map(s=>({kind:'guard',y:s.y+5,v:s}))].sort((a,b)=>a.y-b.y);
 for(let o of objects){let v=o.v;if(o.kind==='tower'){this.sprite(TYPES[v.type].art,v.x,v.y-v.recoil*15,v.type==='heavy'?78:82,v.type==='heavy'?111:94);this.text(String(v.id),v.x,v.y+18,'#fff0c8',12);continue;}
 if(o.kind==='enemy'){let brute=v.type==='brute',w=brute?47:v.type==='rider'?52:32,h=brute?57:v.type==='rider'?43:43;let bob=v.blocked?Math.sin(g.time*18)*1.8:Math.sin(g.time*12+v.id)*1.7;this.sprite(FOES[v.type].art,v.x,v.y+bob,w,h);if(v.flash>0){c.fillStyle='#ffe5a0bb';c.beginPath();c.arc(v.x,v.y-h*.5,11,0,Math.PI*2);c.fill();}if(v.slow>0){c.strokeStyle='#a3f4a6';c.lineWidth=2;c.beginPath();c.ellipse(v.x,v.y-4,17,6,0,0,Math.PI*2);c.stroke();}c.fillStyle='#211b19';c.fillRect(v.x-17,v.y-h-7,34,4);c.fillStyle=brute?'#efc77f':'#e88967';c.fillRect(v.x-17,v.y-h-7,34*v.hp/v.maxHP,4);
 }else{let e=g.enemies.find(e=>e.id===v.target),x=e?e.x-17:v.x,y=e?e.y+8:v.y+6;let lunge=e?Math.sin(g.time*10)*3:0;c.fillStyle='#183c3cbb';c.strokeStyle='#a0fff0';c.lineWidth=2;c.beginPath();c.ellipse(x,y,18,6,0,0,Math.PI*2);c.fill();c.stroke();this.sprite(4,x+lunge,y,34,47);c.fillStyle='#162f31';c.fillRect(x-16,y-53,32,4);c.fillStyle='#76e4d3';c.fillRect(x-16,y-53,32*Math.max(0,v.hp/v.maxHP),4);}}
 for(let e of g.effects){let a=e.ttl/e.max;c.save();c.globalAlpha=a;if(['bolt','heavy','snare','mortar'].includes(e.kind)){let p=1-a,x=e.fromX+(e.x-e.fromX)*p,y=e.fromY+(e.y-22-e.fromY)*p;let dx=e.x-e.fromX,dy=e.y-22-e.fromY,n=Math.hypot(dx,dy)||1;c.strokeStyle=e.kind==='snare'?'#bcf3a3':e.kind==='heavy'?'#ffe7ad':'#f5ce91';c.lineWidth=e.kind==='heavy'?5:2;c.beginPath();c.moveTo(x-dx/n*17,y-dy/n*17);c.lineTo(x,y);c.stroke();if(e.kind==='mortar'){c.fillStyle='#f7b456';c.beginPath();c.arc(e.x,e.y-15,45*(1-a),0,Math.PI*2);c.fill();}if(e.kind==='snare'){c.strokeStyle='#9be293';c.beginPath();c.ellipse(e.x,e.y-18,22*(1-a),13*(1-a),-.3,0,Math.PI*2);c.stroke();}}
 else if(e.kind==='fall')this.sprite(e.art,e.x,e.y+10*(1-a),30,33,a);
 else if(e.kind==='retreat'){this.sprite(4,e.x-35*(1-a),e.y+25*(1-a),32,43,a);this.text('撤退',e.x,e.y-48,'#a7ecdf',12);}
 else if(e.kind==='clash'){c.strokeStyle='#fff1b7';c.lineWidth=3;c.beginPath();c.moveTo(e.x-10,e.y-30);c.lineTo(e.x+10,e.y-10);c.moveTo(e.x+10,e.y-30);c.lineTo(e.x-10,e.y-10);c.stroke();}
 else if(e.kind==='leak')this.text('城门受损',e.x-45,e.y-45,'#ffb09a',18);
 else if(e.kind==='upgrade'){c.strokeStyle='#eaffae';c.lineWidth=4;c.beginPath();c.ellipse(e.x,e.y-20,45*(1-a),50*(1-a),0,0,Math.PI*2);c.stroke();}c.restore();}
 if((g.mapIndex||0)===0){if(g.baseFlash>0){c.fillStyle=`rgba(196,46,24,${g.baseFlash*.45})`;c.fillRect(711,80,89,160);}this.text('山匪来袭 →',68,91,'#f7d39a',12);this.text(`城门 ${g.hp}/12`,751,75,g.hp<5?'#ffafa0':'#f9edc4',13);}else{let base=map.base||{x:751,y:190},incoming=map.incoming||{x:68,y:91};if(g.baseFlash>0){c.fillStyle=`rgba(196,46,24,${g.baseFlash*.45})`;c.fillRect(base.x-44,base.y-100,88,140);}this.text(incoming.label||'山匪来袭 →',Math.max(68,incoming.x),Math.max(25,incoming.y-34),'#f7d39a',12);this.text(`城门 ${g.hp}/12`,Math.min(751,base.x),Math.max(25,base.y-112),g.hp<5?'#ffafa0':'#f9edc4',13);}
 if(g.state==='paused'||['won','lost'].includes(g.state)){c.fillStyle='#10292bd9';c.fillRect(0,0,800,533);this.text(g.state==='paused'?'守望暂歇':g.state==='won'?'山口守住了':'城门失守',400,232,'#ffe7b4',37);this.text(g.state==='paused'?'点击继续或按 P':`第 ${g.wave} 波 · 击退 ${g.kills} · 漏过 ${g.leaks}`,400,275,'#d7e8dd',18);this.text(g.state==='paused'?'战斗、援军和计时均冻结':g.state==='lost'?'下方重试当前图，前图战报保留':g.mapIndex===2?'最终战报见上方，可返回大厅':'上方查看战报并前往下一隘',400,310,'#d7e8dd',14);}}
}

// New campaign scenes are original code-native terrain. The first map keeps
// the exact valley image above. Every new road below is drawn from MAPS.path.
function makeTerrain(index,path,sites,map){
 const canvas=document.createElement('canvas');canvas.width=800;canvas.height=533;
 const c=canvas.getContext('2d');let seed=58279+index*731;
 const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
 const ellipse=(x,y,rx,ry,color)=>{c.beginPath();c.ellipse(x,y,rx,ry,0,0,Math.PI*2);c.fillStyle=color;c.fill();};
 const poly=(points,color,stroke)=>{c.beginPath();points.forEach((p,i)=>i?c.lineTo(...p):c.moveTo(...p));c.closePath();c.fillStyle=color;c.fill();if(stroke){c.strokeStyle=stroke;c.lineWidth=1;c.stroke();}};
 const dist=(x,y)=>{let best=Infinity;for(let i=1;i<path.length;i++){let a=path[i-1],b=path[i],dx=b[0]-a[0],dy=b[1]-a[1],n=dx*dx+dy*dy,t=Math.max(0,Math.min(1,((x-a[0])*dx+(y-a[1])*dy)/n));best=Math.min(best,Math.hypot(x-a[0]-t*dx,y-a[1]-t*dy));}return best;};
 const protectedAt=(x,y,r=0)=>dist(x,y)<43+r||sites.some(s=>Math.hypot(s.x-x,s.y-y)<48+r)||Math.hypot(map.base.x-x,map.base.y-y)<60+r;
 const gradient=c.createLinearGradient(0,0,0,533);gradient.addColorStop(0,index===1?'#9caa68':'#9cae70');gradient.addColorStop(.45,index===1?'#b4b775':'#b6bf79');gradient.addColorStop(1,'#9eaa65');c.fillStyle=gradient;c.fillRect(0,0,800,533);
 // Broad washes and dense, tiny grass flecks keep the existing illustrated
 // earthy palette without adding a second, obsolete painted road.
 for(let i=0;i<240;i++){const x=random()*840-20,y=random()*570-20;ellipse(x,y,18+random()*70,7+random()*20,['#d5c78016','#e9cc7b18','#637d5b12','#6e825115'][i%4]);}
 for(let i=0;i<4300;i++){const x=random()*800,y=random()*533,w=.6+random()*2.8;ellipse(x,y,w,.4+random(),['#e3d39135','#e7d29144','#758c4f2a','#6f815126'][i%4]);}
 // Low cliff shelves in the unused margins; their silhouettes never conceal
 // a route or a tower footprint.
 for(let i=0;i<42;i++){const x=random()*800,y=random()*533,r=13+random()*30;if(!protectedAt(x,y,r*.45))rock(x,y,r);}
 if(index===2){
  // Separated courtyards are linked by an exposed central ridge. Terrain
  // contours remain quiet behind actual combat, and do not imply extra roads.
  c.strokeStyle='#71805c30';c.lineWidth=3;for(let y=387;y<530;y+=22){c.beginPath();c.moveTo(220,y);c.bezierCurveTo(330,y-22,460,y+18,620,y-8);c.stroke();}
 }
 // Draw EXACT geometric centerline with rounded earth shoulders and two ruts.
 const trace=(width,color)=>{c.beginPath();path.forEach((p,i)=>i?c.lineTo(...p):c.moveTo(...p));c.lineJoin='round';c.lineCap='round';c.lineWidth=width;c.strokeStyle=color;c.stroke();};
 trace(51,'#7c855b35');trace(45,'#b49b68');trace(39,'#e0bb83');trace(30,'#e8c68f');trace(22,'#eac994');
 c.save();c.strokeStyle='#a8865630';c.lineWidth=1.3;
 for(const offset of[-10,10]){c.beginPath();path.forEach((p,i)=>{const prev=path[Math.max(0,i-1)],next=path[Math.min(path.length-1,i+1)],dx=next[0]-prev[0],dy=next[1]-prev[1],n=Math.hypot(dx,dy)||1;const x=p[0]-dy/n*offset,y=p[1]+dx/n*offset;i?c.lineTo(x,y):c.moveTo(x,y);});c.stroke();}c.restore();
 for(let i=0;i<500;i++){const x=random()*800,y=random()*533,d=dist(x,y);if(d<17)ellipse(x,y,.5+random()*1.2,.5,'#b3976539');else if(d<31&&d>24)ellipse(x,y,1+random()*2,1,'#e0c78366');}
 // Conifers and boulders line the edges, using the same dark green and stone
 // vocabulary as the original valley. No scenery overlaps a legal tower site.
 for(let i=0;i<54;i++){const x=random()*800,y=random()*533,s=.55+random()*.8;if(!protectedAt(x,y,12*s))tree(x,y,s);}
 for(let i=0;i<28;i++){const x=random()*800,y=random()*533;if(!protectedAt(x,y,5))rock(x,y,6+random()*8);}
 drawGate(c,map.base.x,map.base.y,index);
 // A slight grounded vignette leaves both playable centers bright and clear.
 const vignette=c.createRadialGradient(400,255,180,400,255,520);vignette.addColorStop(0,'#29372800');vignette.addColorStop(1,'#27392b28');c.fillStyle=vignette;c.fillRect(0,0,800,533);
 return canvas;
 function rock(x,y,r){ellipse(x+2,y+r*.3,r*1.12,r*.4,'#48544629');poly([[x-r,y],[x-r*.62,y-r*.66],[x+r*.26,y-r*.8],[x+r,y-r*.16],[x+r*.71,y+r*.44],[x-r*.55,y+r*.4]],'#8a8c75');poly([[x-r,y],[x-r*.62,y-r*.66],[x+r*.26,y-r*.8],[x+r*.08,y-r*.11],[x-r*.54,y+r*.15]],'#b2ac8c');poly([[x+r*.08,y-r*.11],[x+r*.26,y-r*.8],[x+r,y-r*.16],[x+r*.71,y+r*.44]],'#727b6c');poly([[x-r*.62,y-r*.66],[x+r*.26,y-r*.8],[x-r*.02,y-r*.6]],'#d0bc92');ellipse(x-r*.18,y-r*.61,r*.28,r*.07,'#b9b06e');}
 function tree(x,y,s){c.save();c.translate(x,y);c.scale(s,s);ellipse(3,5,18,7,'#203b332c');c.fillStyle='#6e654b';c.fillRect(-2,-12,4,19);for(let j=0;j<4;j++){const yy=-54+j*13,w=7+j*4;poly([[0,yy-12],[-w,yy+15],[-w*.4,yy+11],[-w*.77,yy+20],[w*.85,yy+18],[w*.4,yy+11],[w,yy+13]],j%2?'#3b5f47':'#496b4d');poly([[0,yy-12],[-w,yy+15],[-w*.4,yy+11],[0,yy+7]],'#62764e');}c.restore();}
}

function drawGate(c,x,y,index){
 c.save();c.translate(x,y);c.lineJoin='round';
 c.fillStyle='#3f4b3c33';c.beginPath();c.ellipse(0,16,52,20,0,0,Math.PI*2);c.fill();
 c.fillStyle='#9a9b81';c.fillRect(-39,-57,78,78);c.fillStyle='#bdba9a';c.fillRect(-40,-64,80,12);
 for(let yy=-52;yy<20;yy+=13){c.strokeStyle='#737f6b';c.lineWidth=1;c.beginPath();c.moveTo(-38,yy);c.lineTo(38,yy);c.stroke();for(let xx=-32+(yy%2?5:0);xx<40;xx+=18){c.beginPath();c.moveTo(xx,yy);c.lineTo(xx,yy+12);c.stroke();}}
 c.fillStyle='#405447';c.beginPath();c.moveTo(-15,24);c.lineTo(-15,-13);c.quadraticCurveTo(0,-39,15,-13);c.lineTo(15,24);c.closePath();c.fill();
 c.strokeStyle='#c9c1a2';c.lineWidth=7;c.stroke();c.fillStyle='#656e58';c.fillRect(-11,-10,22,32);c.strokeStyle='#384a3b';c.lineWidth=2;for(let xx=-7;xx<10;xx+=5){c.beginPath();c.moveTo(xx,-11);c.lineTo(xx,21);c.stroke();}
 for(const side of[-1,1]){const tx=side*36;c.fillStyle='#aaa98c';c.fillRect(tx-12,-80,24,99);c.fillStyle='#c8c1a0';c.fillRect(tx-14,-84,28,9);c.fillStyle='#3e6c66';c.beginPath();c.moveTo(tx-18,-84);c.lineTo(tx,-110);c.lineTo(tx+18,-84);c.closePath();c.fill();c.strokeStyle='#b1b192';c.lineWidth=1;c.stroke();c.fillStyle='#4d6555';c.fillRect(tx-3,-70,6,14);c.fillStyle='#d1c39c';c.fillRect(tx-12,15,24,5);}
 c.strokeStyle='#5d7355';c.lineWidth=3;c.beginPath();c.moveTo(0,-65);c.lineTo(0,-93);c.stroke();c.fillStyle=index===1?'#c89562':'#bdaf76';c.beginPath();c.moveTo(1,-92);c.lineTo(18,-88);c.lineTo(2,-80);c.closePath();c.fill();
 c.restore();
}
