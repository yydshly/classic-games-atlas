import { GRID, SIZE, SPAWNS, TILE } from './levels.mjs';

const colors={scout:'#e98558',gunner:'#d5a263',heavy:'#be858f'};
function polygon(ctx,points){ctx.beginPath();points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.closePath();}
function bolt(ctx,x,y){ctx.fillStyle='#9aabaa';ctx.fillRect(x,y,2,2);ctx.fillStyle='#263e43';ctx.fillRect(x+1,y+1,1,1);}

export class Renderer {
  constructor(canvas){
    this.canvas=canvas;this.ctx=canvas.getContext('2d',{alpha:false});this.dpr=Math.min(2,devicePixelRatio||1);
    canvas.width=SIZE*this.dpr;canvas.height=SIZE*this.dpr;
    this.terrain=document.createElement('canvas');this.terrain.width=SIZE;this.terrain.height=SIZE;
    this.terrainKey='';this.particles=[];this.rings=[];this.shake=0;
    this.reduceMotion=matchMedia('(prefers-reduced-motion: reduce)').matches;
  }
  effects(events){
    for(const event of events){
      if(['explosion','player-hit','base-hit','brick','hit','spark','fire'].includes(event.type)){
        const large=['explosion','player-hit','base-hit'].includes(event.type),count=large?22:event.type==='fire'?3:7;
        for(let i=0;i<count;i++){
          const angle=Math.random()*Math.PI*2,speed=(large?70:25)+Math.random()*(large?130:70);
          this.particles.push({x:event.x,y:event.y,vx:Math.cos(angle)*speed,vy:Math.sin(angle)*speed,life:large?.7:.26,max:large?.7:.26,size:large?2+Math.random()*4:2,color:i%3?'#f3c383':'#ee835a'});
        }
        if(large){this.rings.push({x:event.x,y:event.y,life:.4,max:.4,color:'#f2ae70'});if(!this.reduceMotion)this.shake=4;}
      }
      if(['power','spawn','deflect'].includes(event.type))this.rings.push({x:event.x,y:event.y,life:.55,max:.55,color:'#a3e7c2'});
    }
    if(this.particles.length>220)this.particles.splice(0,this.particles.length-220);
  }
  buildTerrain(game){
    const key=`${game.level.id}:${game.terrainVersion}`;if(this.terrainKey===key)return;
    this.terrainKey=key;const ctx=this.terrain.getContext('2d');
    ctx.fillStyle='#17272b';ctx.fillRect(0,0,SIZE,SIZE);
    for(let y=0;y<GRID;y++)for(let x=0;x<GRID;x++){
      const left=x*TILE,top=y*TILE,tile=game.tiles[y][x];
      ctx.fillStyle=(x+y)%2?'#192b2f':'#18292d';ctx.fillRect(left,top,TILE,TILE);
      ctx.fillStyle='#21343a';ctx.fillRect(left+((x*7+y*11)%20),top+((x*13+y*3)%20),2,1);
      ctx.strokeStyle='#213237';ctx.strokeRect(left+.5,top+.5,TILE,TILE);
      if(tile==='B'){
        const damage=game.brickHP[y][x]===1;
        ctx.fillStyle='#343335';ctx.fillRect(left,top,24,24);
        for(let row=0;row<3;row++)for(let brick=0;brick<3;brick++){
          const bx=left+brick*10-(row%2?5:0),by=top+row*8;
          const start=Math.max(left,bx),width=Math.min(left+23,bx+9)-start;
          if(width<=0||(damage&&((row+brick)%3===0)))continue;
          ctx.fillStyle=(row+brick)%2?'#a36b50':'#b17a57';ctx.fillRect(start,by,width,7);
          ctx.fillStyle='#c98d62';ctx.fillRect(start,by,width,1);ctx.fillStyle='#76513f';ctx.fillRect(start,by+6,width,1);
        }
        if(damage){ctx.strokeStyle='#392d29';ctx.beginPath();ctx.moveTo(left+13,top);ctx.lineTo(left+8,top+10);ctx.lineTo(left+15,top+14);ctx.lineTo(left+9,top+24);ctx.stroke();}
      } else if(tile==='S'){
        ctx.fillStyle='#344950';ctx.fillRect(left,top,24,24);ctx.fillStyle='#60777b';ctx.fillRect(left+2,top+2,20,19);
        ctx.fillStyle='#7c9291';ctx.fillRect(left+2,top+2,20,2);ctx.fillStyle='#405960';ctx.fillRect(left+3,top+18,19,3);
        ctx.strokeStyle='#4b6369';ctx.beginPath();ctx.moveTo(left+5,top+16);ctx.lineTo(left+16,top+5);ctx.stroke();
        bolt(ctx,left+4,top+4);bolt(ctx,left+18,top+17);
      } else if(tile==='W'){
        ctx.fillStyle='#163e51';ctx.fillRect(left,top,24,24);ctx.fillStyle='#1d5263';ctx.fillRect(left+1,top+2,22,4);
      }
    }
  }
  tank(tank,game,player=false){
    const ctx=this.ctx,body=player?(tank.number===2?'#89c7ff':'#edce79'):colors[tank.type];
    if(player&&tank.invulnerable>0&&Math.floor(game.time*9)%2===0)ctx.globalAlpha=.6;
    ctx.save();ctx.translate(tank.x,tank.y);ctx.rotate(tank.dir*Math.PI/2);
    ctx.fillStyle='#09181c';ctx.fillRect(-12,-9,25,24);
    for(const side of [-1,1]){
      ctx.fillStyle='#172125';ctx.fillRect(side===-1?-12:7,-12,5,25);
      ctx.fillStyle='#52605c';ctx.fillRect(side===-1?-11:8,-11,3,23);
      ctx.fillStyle='#202e2e';for(let tread=0;tread<7;tread++)ctx.fillRect(side===-1?-12:7,-12+(tread*4+game.time*tank.speed*.35)%26,5,2);
    }
    ctx.fillStyle=body;polygon(ctx,[[-7,-11],[7,-11],[9,-5],[9,10],[-9,10],[-9,-5]]);ctx.fill();
    ctx.fillStyle='#ffffff25';ctx.fillRect(-6,-9,12,3);ctx.fillStyle='#142b2a88';ctx.fillRect(-7,5,14,4);
    ctx.fillStyle=tank.flash>0?'#fff3cb':body;ctx.beginPath();ctx.arc(0,0,tank.type==='heavy'?8:7,0,Math.PI*2);ctx.fill();
    ctx.strokeStyle='#253c3a';ctx.lineWidth=1.5;ctx.stroke();
    ctx.fillStyle='#233d3d';ctx.fillRect(-3,-19,6,20);ctx.fillStyle=body;ctx.fillRect(-2,-18,4,18);
    ctx.fillStyle='#fff1c5';ctx.fillRect(-2,-19,4,2);ctx.fillStyle='#203f3e';ctx.fillRect(-3,-2,6,5);
    if(player){ctx.strokeStyle='#d5f7d5';ctx.lineWidth=1.5;ctx.strokeRect(-4,1,8,3);}
    else {ctx.fillStyle='#252e34';const marks=tank.type==='heavy'?3:tank.type==='gunner'?2:1;for(let i=0;i<marks;i++)ctx.fillRect(-marks*2+i*4,6,2,2);}
    ctx.restore();ctx.globalAlpha=1;
    if((player&&(tank.shield>0||tank.invulnerable>0))||(!player&&tank.spawnShield>0)){
      ctx.strokeStyle=player?'#8de4cf88':'#e1b48688';ctx.lineWidth=1.4;ctx.beginPath();ctx.arc(tank.x,tank.y,17+Math.sin(game.time*6)*1.5,0,Math.PI*2);ctx.stroke();
    }
    if(!player){const width=22;ctx.fillStyle='#112025';ctx.fillRect(tank.x-width/2,tank.y-20,width,3);ctx.fillStyle=body;ctx.fillRect(tank.x-width/2,tank.y-20,width*tank.hp/tank.maxHp,3);if(tank.aimCharge>0){ctx.strokeStyle='#ffca78';ctx.lineWidth=2;ctx.beginPath();ctx.arc(tank.x,tank.y,18,-Math.PI/2,-Math.PI/2+Math.min(1,tank.aimCharge/.45)*Math.PI*2);ctx.stroke();}}
    else {ctx.fillStyle=body;ctx.font='bold 10px monospace';ctx.textAlign='center';ctx.fillText(`${tank.number}P`,tank.x,tank.y-25);for(let i=0;i<3;i++){ctx.fillStyle=i<tank.lives?body:'#30464c';ctx.fillRect(tank.x-10+i*7,tank.y+23,5,3);}ctx.fillStyle='#d5f7d5';polygon(ctx,[[tank.x-3,tank.y+18],[tank.x+3,tank.y+18],[tank.x,tank.y+14]]);ctx.fill();}
  }
  beacon(game){
    const ctx=this.ctx,base=game.base,alive=base.hp>0;
    ctx.save();ctx.translate(base.x,base.y);
    const glow=ctx.createRadialGradient(0,0,2,0,0,38);glow.addColorStop(0,alive?'#73dec64d':'#ef76404d');glow.addColorStop(1,'#73dec600');ctx.fillStyle=glow;ctx.fillRect(-38,-38,76,76);
    ctx.fillStyle='#092126';polygon(ctx,[[-13,-7],[0,-15],[13,-7],[13,7],[0,15],[-13,7]]);ctx.fill();
    ctx.strokeStyle=base.flash>0?'#ffd89d':alive?'#83cdb5':'#ba6656';ctx.lineWidth=2;ctx.stroke();
    ctx.fillStyle=alive?'#a4ebd3':'#5c4845';polygon(ctx,[[0,-10],[7,-2],[0,8],[-7,-2]]);ctx.fill();ctx.fillStyle='#dcffe7';ctx.fillRect(-2,-6,4,9);
    for(let i=0;i<3;i++){ctx.fillStyle=i<base.hp?'#82d4b5':'#4d4b47';ctx.fillRect(-10+i*8,11,5,3);}
    if(base.shield>.8){ctx.strokeStyle='#8ae9d4aa';ctx.setLineDash([5,4]);ctx.beginPath();ctx.arc(0,0,23,game.time*.6,Math.PI*2+game.time*.6);ctx.stroke();}
    ctx.restore();
  }
  item(item,time){
    const ctx=this.ctx,x=item.x,y=item.y+Math.sin(time*4)*1.5;
    ctx.save();ctx.translate(x,y);ctx.shadowColor='#a5dfb0';ctx.shadowBlur=10;
    ctx.fillStyle='#173c38';ctx.fillRect(-10,-10,20,20);ctx.shadowBlur=0;ctx.strokeStyle='#beddb1';ctx.lineWidth=1.5;ctx.strokeRect(-10,-10,20,20);
    ctx.fillStyle='#dcf0ba';ctx.strokeStyle='#dcf0ba';ctx.lineWidth=2;
    if(item.type==='repair'){ctx.fillRect(-2,-6,4,12);ctx.fillRect(-6,-2,12,4);}
    if(item.type==='rapid'){polygon(ctx,[[2,-7],[-5,1],[0,1],[-2,7],[6,-2],[1,-2]]);ctx.fill();}
    if(item.type==='shield'){polygon(ctx,[[-6,-6],[6,-6],[5,3],[0,7],[-5,3]]);ctx.stroke();}
    ctx.restore();
  }
  draw(game,delta){
    const ctx=this.ctx;ctx.setTransform(this.dpr,0,0,this.dpr,0,0);ctx.imageSmoothingEnabled=false;
    ctx.fillStyle='#0d1e22';ctx.fillRect(0,0,SIZE,SIZE);
    ctx.save();if(this.shake>0){ctx.translate((Math.random()-.5)*this.shake,(Math.random()-.5)*this.shake);this.shake=Math.max(0,this.shake-delta*15);}
    this.buildTerrain(game);ctx.drawImage(this.terrain,0,0);
    ctx.strokeStyle='#35758b66';ctx.lineWidth=1;
    for(let y=1;y<24;y++)for(let x=1;x<24;x++)if(game.tiles[y][x]==='W'){
      const shift=(game.time*8+x*5)%13;ctx.beginPath();ctx.moveTo(x*TILE+2,y*TILE+8+shift*.4);ctx.lineTo(x*TILE+16,y*TILE+8+shift*.4);ctx.stroke();
    }
    for(const spawn of (game.level.spawns||SPAWNS)){ctx.strokeStyle='#dca97432';ctx.lineWidth=1;ctx.strokeRect(spawn.x*TILE+3,spawn.y*TILE+3,18,18);ctx.fillStyle='#dca97477';ctx.fillRect(spawn.x*TILE+10,spawn.y*TILE+3,4,2);}
    this.beacon(game);
    for(const item of game.items)this.item(item,game.time);
    for(const tank of game.enemies)this.tank(tank,game);
    for(const player of game.players)if(!player.dead)this.tank(player,game,true);
    for(const bullet of game.bullets){const vector=[{x:0,y:-1},{x:1,y:0},{x:0,y:1},{x:-1,y:0}][bullet.dir];ctx.strokeStyle=bullet.enemy?'#ed9976':'#e9e7aa';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(bullet.x-vector.x*6,bullet.y-vector.y*6);ctx.lineTo(bullet.x,bullet.y);ctx.stroke();ctx.fillStyle='#fff1d3';ctx.fillRect(bullet.x-1,bullet.y-1,2,2);}
    for(const particle of this.particles){particle.life-=delta;particle.x+=particle.vx*delta;particle.y+=particle.vy*delta;particle.vx*=.96;particle.vy*=.96;ctx.globalAlpha=Math.max(0,particle.life/particle.max);ctx.fillStyle=particle.color;ctx.fillRect(particle.x,particle.y,particle.size,particle.size);}
    this.particles=this.particles.filter(p=>p.life>0);ctx.globalAlpha=1;
    for(const ring of this.rings){ring.life-=delta;ctx.globalAlpha=Math.max(0,ring.life/ring.max);ctx.strokeStyle=ring.color;ctx.lineWidth=2;ctx.beginPath();ctx.arc(ring.x,ring.y,4+(1-ring.life/ring.max)*30,0,Math.PI*2);ctx.stroke();}
    this.rings=this.rings.filter(r=>r.life>0);ctx.globalAlpha=1;
    ctx.restore();
  }
}

