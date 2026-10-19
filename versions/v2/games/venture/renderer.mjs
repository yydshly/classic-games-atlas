import {scenarios,netWorth,rent} from './engine.mjs?sale-rounding-r1';
export const WIDTH=1100,HEIGHT=660;
// Positions trace the promenade clockwise. Buildings sit above their tile baseline.
export const points=[[230,140],[430,140],[630,140],[830,140],[950,270],[950,435],[830,560],[630,560],[430,560],[230,560],[115,435],[115,270]];
const colors=['#147d78','#bb583c'];
const tokenPoint=i=>{const [x,y]=points[i];return [x+(x<150?95:x>900?-95:0),y+(y<200?85:y>500?70:10)];};
export async function loadAssets(loader=src=>new Promise((resolve,reject)=>{const im=new Image();im.onload=()=>resolve(im);im.onerror=reject;im.src=src;})){
 const names=['market.webp','shops.webp','merchants.webp']; const loaded=await Promise.all(names.map(n=>loader(new URL('./assets/'+n,import.meta.url))));return Object.fromEntries(names.map((n,i)=>[n,loaded[i]]));
}
function rounded(c,x,y,w,h,r=12){c.beginPath();c.roundRect(x,y,w,h,r);}
function txt(c,text,x,y,size=16,color='#263f3c',align='center',weight='500'){c.fillStyle=color;c.font=`${weight} ${size}px sans-serif`;c.textAlign=align;c.textBaseline='middle';c.fillText(text,x,y);}
function money(c,t,x,y,color){txt(c,t,x,y,18,color,'center','700');}
export function render(c,s,assets={},motion=null,now=0){
 c.clearRect(0,0,WIDTH,HEIGHT);c.fillStyle='#e6ddc0';c.fillRect(0,0,WIDTH,HEIGHT);
 if(assets['market.webp'])c.drawImage(assets['market.webp'],0,0,WIDTH,HEIGHT);
 c.fillStyle=s.scenario==='rain'?'rgba(32,69,84,.18)':s.scenario==='lantern'?'rgba(47,38,67,.25)':'rgba(255,246,211,.07)';c.fillRect(0,0,WIDTH,HEIGHT);
 // A translucent laid-paper promenade keeps ownership and price readable over painted scenery.
 c.strokeStyle='rgba(251,246,222,.85)';c.lineWidth=85;c.lineJoin='round';c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();c.stroke();c.strokeStyle='rgba(134,116,80,.32)';c.lineWidth=2;c.setLineDash([3,9]);c.stroke();c.setLineDash([]);
 const scene=scenarios.find(x=>x.id===s.scenario)||scenarios[0],cells=scene.board||scene.layout;
 for(let i=0;i<12;i++){
  const [x,y]=points[i],cell=cells[i],prop=s.shops[i],own=prop.owner;
  c.save();c.shadowColor='rgba(36,47,33,.2)';c.shadowBlur=9;c.shadowOffsetY=4;rounded(c,x-64,y-32,128,69,14);c.fillStyle=own===null?'rgba(255,252,236,.94)':own===0?'#e6f5e8':'#fae9d9';c.fill();c.shadowBlur=0;c.shadowOffsetY=0;c.strokeStyle=own===null?'#c9bea1':colors[own];c.lineWidth=own===null?1:3;c.stroke();
  if(cell.type==='shop'){
   let type=cell.category??cell.kind??0;type=typeof type==='number'?type:({'culture':0,'food':1,'craft':2}[type]??0);
   if(assets['shops.webp']){const im=assets['shops.webp'],cw=im.width/3,ch=im.height/2,lev=Math.max(1,prop.level);c.drawImage(im,type*cw,(lev-1)*ch,cw,ch,x-46,y-136,92,123);}
   txt(c,cell.name,x,y-5,14,'#2e4037','center','700');txt(c,own===null?`购 ${cell.price}`:`${own===0?'青旗':'朱旗'} · ${prop.level}级 · 租 ${rent(s,i)}`,x,y+19,11,own===null?'#7f7762':colors[own]);
   if(own!==null){c.fillStyle=colors[own];c.beginPath();c.moveTo(x+38,y-63);c.lineTo(x+63,y-57);c.lineTo(x+38,y-49);c.fill();c.fillRect(x+36,y-64,2,33);}
  }else{txt(c,({start:'街口',park:'茶歇',market:'商会',tax:'维护'})[cell.type]||'街市',x,y-7,17,'#8b7346','center','700');txt(c,cell.name,x,y+15,11,'#8b795d');}
  txt(c,String(i+1).padStart(2,'0'),x-53,y+25,8,'#aaa188');c.restore();
 }
 // Merchant stands are deliberately separated even when both arrive on one cell.
 for(let id=0;id<2;id++){
  let [x,y]=tokenPoint(s.players[id].position);
  if(motion&&motion.actor===id){let t=Math.min(1,Math.max(0,(now-motion.start)/motion.duration)),d=t*motion.steps,k=Math.min(motion.steps-1,Math.floor(d)),f=t===1?1:d-k;const a=tokenPoint((motion.from+k)%12),b=tokenPoint((motion.from+k+1)%12);x=a[0]+(b[0]-a[0])*f;y=a[1]+(b[1]-a[1])*f;}
  x+=id===0?-22:22;c.save();c.fillStyle='rgba(29,45,39,.2)';c.beginPath();c.ellipse(x,y+7,19,6,0,0,Math.PI*2);c.fill();
  if(assets['merchants.webp']){const im=assets['merchants.webp'],cw=im.width/2;c.drawImage(im,id*cw,0,cw,im.height,x-24,y-62,48,72);}else{c.fillStyle=colors[id];c.beginPath();c.arc(x,y-10,12,0,Math.PI*2);c.fill();}
  rounded(c,x-17,y+12,34,17,6);c.fillStyle=colors[id];c.fill();txt(c,id===0?'你':'对手',x,y+20,10,'#fff');c.restore();
 }
 // Quiet central pavilion panel carries turn state while the edge stays spatial.
 c.save();rounded(c,310,252,480,177,20);c.fillStyle='rgba(255,250,230,.91)';c.fill();c.strokeStyle='rgba(174,151,103,.55)';c.lineWidth=1;c.stroke();
 txt(c,({morning:'晨市 · 第一局',rain:'雨桥 · 第二局',lantern:'灯会 · 第三局'})[s.scenario],550,281,13,'#8a7a56');txt(c,s.phase==='finished'?(s.winner==='draw'?'两商并立 · 平局':s.winner===0?'青旗胜出':'朱旗胜出'):`第 ${s.round} / ${scene.rounds} 轮`,550,320,31,'#294e47','center','700');
 txt(c,s.phase==='finished'?`净资产 ${netWorth(s,0)} : ${netWorth(s,1)}`:s.turn===1?'朱旗正在经营':s.phase==='ready'?'掷骰，或用定步券选择落点':'看清租金与现金，再决定经营',550,359,15,'#687263');
 const last=(s.events||[]).filter(e=>e.type==='transaction').at(-1);if(last)txt(c,last.kind==='rent'?`${last.from===0?'青旗':'朱旗'} → ${last.to===0?'青旗':'朱旗'}  租金 ${last.amount}`:`本次交易 · ${last.amount}`,550,399,13,last.kind==='rent'?'#a75e34':'#73816c');else txt(c,'两家同类铺面 · 租金加成',550,399,12,'#978c70');c.restore();
 if(s.scenario==='rain'){c.strokeStyle='rgba(220,242,247,.35)';c.lineWidth=1;for(let j=0;j<70;j++){let x=(j*157)%1100,y=(j*89+now*.025)%660;c.beginPath();c.moveTo(x,y);c.lineTo(x-5,y+13);c.stroke();}}
 if(s.scenario==='lantern'){for(const x of [50,1050]){const glow=c.createRadialGradient(x,70,0,x,70,100);glow.addColorStop(0,'rgba(255,183,76,.35)');glow.addColorStop(1,'rgba(255,183,76,0)');c.fillStyle=glow;c.fillRect(x-100,0,200,170);}}
}
