import {getLevel,heldBox,pickupBox,forecastThrow,LEVELS} from './engine.mjs?v=crate-courier-seven-fourth-cue-1';
const C={ink:'#203b42',deep:'#244b53',teal:'#397d79',mint:'#98bfac',paper:'#f5e8cc',gold:'#eab96c',wood:'#b0784c',darkwood:'#654c3c',red:'#d27357'};
function block(c,x,y,w,h,r,fill,stroke=null){c.fillStyle=fill;c.beginPath();c.roundRect(x,y,w,h,r);c.fill();if(stroke){c.strokeStyle=stroke;c.lineWidth=2;c.stroke();}}
function line(c,points,color,width=2){c.strokeStyle=color;c.lineWidth=width;c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.stroke();}
function oval(c,x,y,rx,ry,fill){c.fillStyle=fill;c.beginPath();c.ellipse(x,y,rx,ry,0,0,Math.PI*2);c.fill();}
function label(c,text,x,y,color=C.ink,size=14,align='left'){c.fillStyle=color;c.font=`600 ${size}px sans-serif`;c.textAlign=align;c.fillText(text,x,y);}
export class Renderer{
  constructor(canvas){this.canvas=canvas;this.c=canvas.getContext('2d');if(!this.c)throw Error('Canvas2D 初始化失败');this.camera=0;this.width=960;this.height=560;this.scale=1;this.needsCameraFit=true;this.prediction=null;this.predictionTick=-10;this.predictionFace=null;this.predictionBox=null;this.predictionPhase=null;}
  resize(width,height,dpr=1){if(width!==this.width||height!==this.height)this.needsCameraFit=true;this.width=width;this.height=height;this.scale=height/560;this.canvas.width=Math.round(width*Math.min(1.5,dpr));this.canvas.height=Math.round(height*Math.min(1.5,dpr));}
  draw(g,{snapCamera=false}={}){const c=this.c,w=this.width/this.scale,p=g.player,level=getLevel(g);
    // Once the sixth chapter reaches the far bank, narrow screens show the patrol before committing a throw.
    const cameraAnchor=level===LEVELS[5]&&w<650&&p.x>=770 ? .16 : .33;
    const desired=Math.max(0,Math.min(level.width-w,p.x-w*cameraAnchor));this.camera=(snapCamera||g.tick===0||this.needsCameraFit)?desired:g.phase==='playing'?this.camera+(desired-this.camera)*.13:this.camera;this.needsCameraFit=false;
    c.setTransform(this.canvas.width/this.width,0,0,this.canvas.height/this.height,0,0);c.clearRect(0,0,this.width,this.height);c.scale(this.scale,this.scale);
    this.sky(c,w,g.tick/120,level);c.save();c.translate(-this.camera,0);this.docks(c,level);this.setting(c,level);if(level===LEVELS[1])this.twoStoreyMarks(c);if(level.id==='shifting-stacks')this.fourthGoalCues(c,level);if(level.theme==='north-open')this.northRoutes(c);this.supplies(c,g);
    const focus=heldBox(g)||pickupBox(g);if(focus&&['playing','paused'].includes(g.phase)){
      if(focus.mode==='held'){
        if(!this.prediction||g.tick-this.predictionTick>=6||this.predictionFace!==p.face||this.predictionBox!==focus.id||this.predictionPhase!==g.phase){this.prediction=forecastThrow(g);this.predictionTick=g.tick;this.predictionFace=p.face;this.predictionBox=focus.id;this.predictionPhase=g.phase;}
        if(this.prediction){const points=this.prediction.points;
          for(let i=0;i<points.length-1;i+=2){const a=points[i],b=points[i+1];line(c,[[a.x,a.y],[b.x,b.y]],C.deep,4.5);line(c,[[a.x,a.y],[b.x,b.y]],C.paper,2.3);}
          const end=points.at(-1);if(end){const x=end.x,y=end.y;
            // An unfilled, crate-sized outline shows space, never a solid ledge or target lock.
            for(const [sx,sy]of [[-1,-1],[1,-1],[-1,1],[1,1]]){const corner=[[x+sx*7,y+sy*15],[x+sx*15,y+sy*15],[x+sx*15,y+sy*7]];line(c,corner,C.deep,4.5);line(c,corner,C.paper,2.3);}
            if(this.prediction.outcome==='ground'){line(c,[[x-19,y+15],[x+19,y+15]],C.deep,4.5);line(c,[[x-19,y+15],[x+19,y+15]],C.gold,2.3);}
          }
        }
      }else{this.prediction=null;line(c,[[focus.x-18,focus.y-37],[focus.x,focus.y-43],[focus.x+18,focus.y-37]],C.gold,3);}
    }else this.prediction=null;
    for(const e of g.enemies)this.enemy(c,e,g.tick);
    for(const b of g.boxes)if(b.mode!=='spent')this.crate(c,b);
    if(level===LEVELS[0]||level===LEVELS[1]||level===LEVELS[2]||level===LEVELS[5])this.expressiveCourier(c,g);else this.person(c,p,g.tick,g.phase);
    const recent=g.lastEvent;if(recent&&g.tick-recent.tick<50&&recent.type==='enemy-hit'){
      const t=(g.tick-recent.tick)/50;c.globalAlpha=1-t;for(let i=0;i<5;i++){const a=i*Math.PI*2/5;line(c,[[recent.x+Math.cos(a)*(18+t*28),recent.y-20+Math.sin(a)*(18+t*20)],[recent.x+Math.cos(a)*(25+t*28),recent.y-20+Math.sin(a)*(25+t*20)]],C.gold,3);}c.globalAlpha=1;
    }
    if(g.phase==='won'){if(g.stageIndex!==1)label(c,g.stageIndex===2?'归港！':'到站！',level.goal,level.goalY-118,C.paper,23,'center');for(let i=0;i<4;i++)line(c,[[level.goal-70+i*38,level.goalY-102],[level.goal-70+i*38,level.goalY-92]],C.gold,3);}
    c.restore();
    // A small distance ribbon gives direction without drawing false platforms.
    block(c,18,18,Math.min(w-36,250),34,10,'#f5e8ccdd');label(c,`${g.stageIndex+1}/${LEVELS.length}  ${level.title} → ${level.destination}`,30,40,C.deep,12);
  }
  sky(c,w,t,level){if(level===LEVELS[0]){this.rainYardSky(c,w);return;}if(level===LEVELS[1]){this.twoStoreyHallSky(c,w);return;}if(level===LEVELS[2]){this.returnHarborSky(c,w);return;}if(level===LEVELS[5]){this.dawnRelaySky(c,w);return;}if(level.theme!=='harbor'){this.otherSky(c,w,t,level);return;}const gradient=c.createLinearGradient(0,0,0,560);gradient.addColorStop(0,'#aac8be');gradient.addColorStop(.7,'#dce0c2');gradient.addColorStop(1,'#7aa9a1');c.fillStyle=gradient;c.fillRect(0,0,w,560);
    oval(c,w*.78-this.camera*.03,96,40,40,'#f5e6b8');
    for(let i=-1;i<8;i++){const x=i*210-(this.camera*.18)%210;block(c,x,180+(i%2)*18,174,160,5,'#709992');line(c,[[x-8,183+(i%2)*18],[x+87,133+(i%2)*18],[x+182,183+(i%2)*18]],'#5e8580',10);for(let j=0;j<3;j++)block(c,x+22+j*46,220+(i%2)*18,22,46,4,'#b1c4ac');}
    c.fillStyle='#6f9d94';c.fillRect(0,338,w,222);c.fillStyle='#7ca99c';c.fillRect(0,369,w,191);
    for(let i=0;i<20;i++){const x=(i*93-this.camera*.42)%(w+100);line(c,[[x,387+(i%4)*39],[x+26+(i%3)*9,387+(i%4)*39]],'#a8c5b0',2);}
    const drift=Math.sin(t*.3)*8;line(c,[[w*.59+drift,103],[w*.59+7+drift,99],[w*.59+14+drift,103]],'#5e8580',2);
  }
  rainYardSky(c,w){
    // Distant roofs stay soft; only the real dock edge receives a hard, warm line.
    const sky=c.createLinearGradient(0,0,0,560);
    sky.addColorStop(0,'#839fa7');sky.addColorStop(.58,'#becdc5');sky.addColorStop(1,'#789c99');
    c.fillStyle=sky;c.fillRect(0,0,w,560);
    const lightX=w*.79-this.camera*.025,lightY=112;
    oval(c,lightX,lightY,136,100,'#eee6c419');
    oval(c,lightX,lightY,82,68,'#eee6c432');
    oval(c,lightX,lightY,26,26,'#eee6c4');
    for(let i=-1;i<10;i++){
      const x=i*238-(this.camera*.12)%238,roof=235+(i%3)*15;
      block(c,x,roof,210,155,3,'#9bb3ae');
      line(c,[[x-9,roof+2],[x+105,roof-37],[x+219,roof+2]],'#8aa7a4',6);
      for(const pane of [x+39,x+86,x+133,x+180])block(c,pane,roof+45,22,36,2,'#b8c9b8');
    }
    for(let i=-1;i<8;i++){
      const x=i*322-(this.camera*.22)%322,roof=273+(i%2)*10;
      block(c,x,roof,286,115,4,'#789b98');
      line(c,[[x-8,roof+1],[x+143,roof-30],[x+294,roof+1]],'#6b8e8e',6);
      for(const pane of [x+51,x+116,x+181,x+246])block(c,pane,roof+36,27,43,2,'#a9bdb0');
      line(c,[[x+8,roof+95],[x+278,roof+95]],'#8daba2',2);
    }
    c.fillStyle='#5f8888';c.fillRect(0,388,w,172);
    c.fillStyle='#729996';c.fillRect(0,390,w,25);
    for(let i=-1;i<20;i++){
      const x=i*91-(this.camera*.35)%91,y=423+(i%4)*34;
      line(c,[[x,y],[x+21+(i%3)*7,y]],'#9fb9ab',1.6);
    }
  }
  twoStoreyHallSky(c,w){
    // Enclosed sorting hall: broad clerestory light and distant storage bays
    // sit behind the actual platforms, whose warm top edges remain the route.
    const wall=c.createLinearGradient(0,0,0,560);
    wall.addColorStop(0,'#819c9e');wall.addColorStop(.56,'#c3cebb');wall.addColorStop(1,'#77958d');
    c.fillStyle=wall;c.fillRect(0,0,w,560);
    c.fillStyle='#4c6c70';c.fillRect(0,0,w,53);
    for(let i=-1;i<9;i++){
      const x=i*262-(this.camera*.13)%262;
      line(c,[[x-12,53],[x+130,82],[x+274,53]],'#5e7d7c',9);
      block(c,x+21,105,208,126,3,'#dce0c7','#8da79d');
      c.fillStyle='#bad0bf';c.fillRect(x+28,112,194,112);
      line(c,[[x+125,111],[x+125,224]],'#8ca9a3',4);
      line(c,[[x+28,170],[x+222,170]],'#8ca9a3',4);
      // Light falls into the hall, never forming a playable-looking edge.
      c.fillStyle='#eee5c12b';c.beginPath();c.moveTo(x+34,229);c.lineTo(x+110,229);c.lineTo(x+160,377);c.lineTo(x+91,377);c.closePath();c.fill();
      block(c,x+244,81,12,310,2,'#688985');
    }
    c.fillStyle='#8ea99c';c.fillRect(0,387,w,173);
    c.fillStyle='#668a86';c.fillRect(0,391,w,21);
    for(let i=-1;i<11;i++){
      const x=i*178-(this.camera*.32)%178;
      block(c,x+12,424,105,93,3,'#78968c');
      line(c,[[x+22,444],[x+105,444]],'#9db9a6',2);
      line(c,[[x+18,480],[x+108,480]],'#67847d',3);
    }
  }
  returnHarborSky(c,w){
    // Return harbor at dusk: soft shore silhouettes and light on water stay behind
    // the actual cargo steps, patrols and dock edges.
    const sky=c.createLinearGradient(0,0,0,560);
    sky.addColorStop(0,'#3b566b');sky.addColorStop(.56,'#789897');sky.addColorStop(1,'#426e78');
    c.fillStyle=sky;c.fillRect(0,0,w,560);
    const moonX=w*.79-this.camera*.025,moonY=97;
    oval(c,moonX,moonY,88,69,'#f2dea91c');
    oval(c,moonX,moonY,49,44,'#f2dea930');
    oval(c,moonX,moonY,28,28,'#efd9a5');
    for(let i=-1;i<8;i++){
      const x=i*260-(this.camera*.11)%260,roof=244+(i%3)*12;
      block(c,x,roof,230,139,3,'#65878b');
      line(c,[[x-8,roof+2],[x+115,roof-36],[x+238,roof+2]],'#587b82',6);
      for(const pane of [x+39,x+94,x+149,x+204])block(c,pane,roof+42,22,31,2,'#a3b5a0');
    }
    for(let i=-1;i<7;i++){
      const x=i*338-(this.camera*.21)%338,roof=283+(i%2)*10;
      block(c,x,roof,309,101,3,'#4b727a');
      line(c,[[x-8,roof+1],[x+154,roof-24],[x+317,roof+1]],'#426770',6);
      for(const pane of [x+45,x+116,x+187,x+258])block(c,pane,roof+35,25,35,2,'#c3ab78');
      line(c,[[x+16,roof+88],[x+293,roof+88]],'#6f9290',2);
    }
    c.fillStyle='#365f6d';c.fillRect(0,387,w,173);
    c.fillStyle='#537c83';c.fillRect(0,388,w,18);
    for(let i=-1;i<22;i++){
      const x=i*78-(this.camera*.36)%78,y=418+(i%4)*34;
      line(c,[[x,y],[x+21+(i%3)*7,y]],i%3===0?'#b4a982':'#749aa0',1.8);
    }
  }
  dawnRelaySky(c,w){
    // Static, original dawn-depot study. All detail stays behind the real floor and actors.
    const sky=c.createLinearGradient(0,0,0,390);
    sky.addColorStop(0,'#a8bfb9');sky.addColorStop(.52,'#d4d5b8');sky.addColorStop(1,'#c5d3bb');
    c.fillStyle=sky;c.fillRect(0,0,w,560);
    const sunX=w*.8-this.camera*.035,sunY=113;
    const halo=c.createRadialGradient(sunX,sunY,10,sunX,sunY,105);
    halo.addColorStop(0,'#f7e0aeaa');halo.addColorStop(1,'#f7e0ae00');
    c.fillStyle=halo;c.fillRect(sunX-105,sunY-105,210,210);
    oval(c,sunX,sunY,35,35,'#f7e4b7');
    c.save();c.beginPath();c.rect(0,150,w,228);c.clip();
    for(let i=-1;i<8;i++){
      const x=i*320-(this.camera*.28)%320;
      block(c,x,226,292,152,4,'#88a39a');
      line(c,[[x-8,228],[x+146,173],[x+300,228]],'#6d938c',7);
      block(c,x+20,245,252,123,4,'#d9dbbf','#79948c');
      c.fillStyle='#9fb0a2';c.globalAlpha=.55;
      for(const [bx,by,bw,bh]of [[x+45,320,52,48],[x+98,337,59,31],[x+174,309,64,59]])block(c,bx,by,bw,bh,3,'#839e94');
      c.globalAlpha=1;
      for(const pane of [x+84,x+146,x+208])line(c,[[pane,245],[pane,368]],'#809d94',3);
      line(c,[[x+20,304],[x+272,304]],'#9eafa0',3);
      line(c,[[x+20,368],[x+272,368]],'#76948b',4);
    }
    // One broad light direction, not a moving effect or a false route marker.
    const rayX=sunX-16;c.fillStyle='#fff0c230';c.beginPath();c.moveTo(rayX,174);c.lineTo(rayX+48,174);c.lineTo(rayX+190,378);c.lineTo(rayX+70,378);c.closePath();c.fill();
    c.restore();
    c.fillStyle='#789a90';c.fillRect(0,378,w,182);
    c.fillStyle='#6d928b';c.fillRect(0,378,w,23);
    for(let i=-1;i<18;i++){
      const x=i*105-(this.camera*.4)%105;
      line(c,[[x,417+(i%3)*48],[x+31,417+(i%3)*48]],'#a9c4ab',2);
      line(c,[[x+21,456+(i%2)*56],[x+43,456+(i%2)*56]],'#91b4a4',1.5);
    }
  }
  docks(c,level){for(const s of level.solids){
    if(s.material==='wood'){
      block(c,s.x,s.y,s.w,36,2,C.wood);c.fillStyle='#cf9f6a';c.fillRect(s.x,s.y,s.w,7);c.fillStyle=C.darkwood;c.fillRect(s.x,s.y+32,s.w,9);
      for(let x=s.x+4;x<s.x+s.w;x+=42){line(c,[[x,s.y+8],[x,s.y+30]],'#88603f',1);oval(c,x+10,s.y+15,1.6,1.6,'#594c3c');}
      for(let x=s.x+30;x<s.x+s.w;x+=140){block(c,x,s.y+40,19,120,2,'#735c45');block(c,x+2,s.y+55,15,15,1,'#405f59');}
      line(c,[[s.x+5,s.y+2],[s.x+5,s.y+31]],'#ecd0a0',2);line(c,[[s.x+s.w-5,s.y+2],[s.x+s.w-5,s.y+31]],'#ecd0a0',2);
    }else if(s.material==='shelf'){
      const brace=Math.min(100,s.w-12);block(c,s.x,s.y,s.w,20,2,'#b58356');line(c,[[s.x+12,s.y+20],[s.x+12,438],[s.x+brace,s.y+25]],C.deep,8);line(c,[[s.x+s.w-12,s.y+20],[s.x+s.w-12,438],[s.x+s.w-brace,s.y+25]],C.deep,8);c.fillStyle='#e1bb7d';c.fillRect(s.x,s.y,s.w,5);
      for(let x=s.x+22;x<s.x+s.w-12;x+=55)line(c,[[x,s.y+7],[x+18,s.y+7]],'#6d5945',2);
    }else{block(c,s.x,s.y,s.w,s.h,3,'#668d7b',C.deep);line(c,[[s.x+10,s.y+3],[s.x+10,s.y+s.h-3],[s.x+s.w-10,s.y+s.h-3],[s.x+s.w-10,s.y+3]],'#bdd0a7',3);}}
  }
  setting(c,level){if(level.theme!=='harbor'){this.otherSetting(c,level);return;}
    // All non-solid furnishings are behind the walk surface, never a fake ledge.
    for(const x of [36,785,1610]){block(c,x,313,9,127,2,C.deep);block(c,x-16,301,42,37,5,C.paper,C.deep);label(c,'→',x+5,327,C.deep,27,'center');line(c,[[x+5,338],[x+5,348]],'#b27b51',2);}
    block(c,13,374,60,66,4,'#8b9f7d',C.deep);label(c,'出发',43,400,C.paper,13,'center');line(c,[[21,412],[63,412]],'#b7c7a3',2);
    for(const [x,y]of [[300,358],[915,360],[1360,358],[1870,356]]){line(c,[[x,y],[x,436]],'#556f62',4);line(c,[[x-18,y+12],[x+18,y+12]],'#556f62',3);oval(c,x,y-3,12,6,'#b4b99a');}
    // Warehouse door is a destination, not a locked box/key gate.
    block(c,2165,224,240,216,7,'#608982',C.deep);c.fillStyle='#3c6966';c.beginPath();c.moveTo(2144,228);c.lineTo(2285,162);c.lineTo(2420,228);c.closePath();c.fill();
    block(c,2238,295,93,145,8,'#244d55');block(c,2252,307,65,133,7,'#c6ad77');block(c,2261,316,47,70,6,'#f1d799');line(c,[[2284,318],[2284,381]],'#a58d5e',3);oval(c,2307,401,3,3,C.deep);
    block(c,2200,246,168,32,5,C.paper);label(c,'雨湾收货站',2284,268,C.deep,18,'center');block(c,2255,433,61,7,2,C.gold);
    line(c,[[2345,275],[2345,318]],C.deep,4);block(c,2332,314,26,31,6,'#f3d18c',C.deep);line(c,[[2340,321],[2340,336]],'#fff0bd',3);
    for(const x of [2095,2370]){block(c,x,409,22,31,3,'#a4694c');line(c,[[x+12,411],[x+6,384],[x+18,397],[x+23,379]],'#4e7c65',5);}
    for(const [x,y]of [[565,260],[1190,212],[1840,255]]){line(c,[[x-110,y],[x,y+18],[x+110,y-4]],'#647e68',2);for(let i=-2;i<3;i++){c.fillStyle=i%2?C.paper:C.gold;c.beginPath();c.moveTo(x+i*35,y+10);c.lineTo(x+i*35+12,y+11);c.lineTo(x+i*35+6,y+27);c.closePath();c.fill();}}
  }
  otherSky(c,w,t,level){if(level.theme==='north-open'){
      const sky=c.createLinearGradient(0,0,0,560);sky.addColorStop(0,'#8fb7bc');sky.addColorStop(.65,'#d1d9c1');sky.addColorStop(1,'#7da79f');c.fillStyle=sky;c.fillRect(0,0,w,560);
      oval(c,w*.77-this.camera*.025,102,43,43,'#f7deb0');
      for(let i=-1;i<5;i++){const x=i*355-(this.camera*.14)%355;block(c,x,235,285,110,5,'#87aaa4');line(c,[[x-12,238],[x+142,179],[x+298,238]],'#648c89',8);for(const d of [38,97,156,215])block(c,x+d,256,24,38,3,'#bed0b1');}
      c.fillStyle='#77a29d';c.fillRect(0,379,w,181);for(let i=0;i<14;i++){const x=(i*121-this.camera*.36)%(w+100);line(c,[[x,408+(i%4)*36],[x+27,408+(i%4)*36]],'#b1cabb',2);}return;
    }
    const night=level.theme==='evening',gradient=c.createLinearGradient(0,0,0,560);gradient.addColorStop(0,night?'#526c82':'#aebda3');gradient.addColorStop(1,night?'#7c9c9b':'#ddd5b5');c.fillStyle=gradient;c.fillRect(0,0,w,560);
    if(night){oval(c,w*.78-this.camera*.025,91,33,33,'#f0d9a3');for(let i=0;i<8;i++)oval(c,(i*143+50-this.camera*.04)%(w+100),65+(i%3)*41,1.1,1.1,C.paper);for(let i=-1;i<4;i++){const x=i*380-(this.camera*.16)%380;block(c,x,262,210,104,3,'#496975');line(c,[[x-8,262],[x+105,217],[x+218,262]],'#3a5c6a',6);for(const dx of [32,138])block(c,x+dx,285,25,29,3,'#d5bb80');}}
    else{for(let i=-1;i<5;i++){const x=i*330-(this.camera*.2)%330;block(c,x,80,14,310,2,'#778c78');line(c,[[x-15,78],[x+165,40],[x+345,78]],'#647f70',9);block(c,x+30,112,240,168,4,'#cbd6bc');for(let row=0;row<3;row++)line(c,[[x+30,154+row*42],[x+270,154+row*42]],'#a3b7a1',4);for(let col=0;col<4;col++)line(c,[[x+78+col*48,112],[x+78+col*48,280]],'#a3b7a1',3);line(c,[[x+65,295],[x+248,295]],'#889d85',3);}}
    c.fillStyle=night?'#5c8288':'#7f9e8c';c.fillRect(0,379,w,181);for(let i=0;i<16;i++){const x=(i*123-this.camera*.39)%(w+90);line(c,[[x,404+(i%4)*37],[x+38,404+(i%4)*37]],night?'#a5b8ac':'#b5c5a6',2);}
  }
  otherSetting(c,level){
    const night=level.theme==='evening';for(const x of (night?[38,1280,1900]:[38,1460])){line(c,[[x,340],[x,438]],C.deep,5);block(c,x-18,322,40,28,5,C.paper,C.deep);label(c,'→',x+2,344,C.deep,23,'center');}
    const x=level.goal,y=level.goalY,h=level.theme==='warehouse'?142:196;
    if(level===LEVELS[5]){const glow=c.createRadialGradient(x,y-94,10,x,y-94,180);glow.addColorStop(0,'#f3dda066');glow.addColorStop(1,'#f3dda000');c.fillStyle=glow;c.fillRect(x-180,y-240,360,200);}
    block(c,x-95,y-h,190,h,5,night?'#426b74':'#718d77',C.deep);c.fillStyle=night?'#294f5b':'#416f64';c.beginPath();c.moveTo(x-108,y-h);c.lineTo(x,y-h-42);c.lineTo(x+107,y-h);c.closePath();c.fill();
    block(c,x-38,y-116,76,116,6,'#34535a');block(c,x-27,y-105,54,105,5,'#d9bb7a');block(c,x-19,y-98,38,53,4,'#f3d99e');line(c,[[x,y-97],[x,y-47]],'#aa915f',2);oval(c,x+18,y-27,2.6,2.6,C.deep);
    block(c,x-84,y-h+12,168,26,4,C.paper);label(c,level.destination,x,y-h+31,C.deep,15,'center');block(c,x-32,y-5,64,5,1,C.gold);
    for(const side of [-1,1]){line(c,[[x+side*70,y-h+44],[x+side*70,y-h+74]],C.deep,3);block(c,x+side*70-10,y-h+72,20,25,5,'#f3d18c',C.deep);}
    if(night){line(c,[[x+60,y-h],[x+60,y-h-54]],C.deep,5);block(c,x+48,y-h-61,24,19,5,C.gold,C.deep);}
  }
  northRoutes(c){
    // Paint only on real support surfaces; the marks cannot be mistaken for ledges.
    c.fillStyle='#f2d390';c.fillRect(350,433,52,6);
    for(const x of [358,376,392])line(c,[[x,434],[x+7,438]],'#8c633b',2);
    label(c,'提前轻放',376,421,C.ink,14,'center');
    c.fillStyle='#98c6b0';for(const [x,w,y]of [[660,600,270],[1350,300,270]])c.fillRect(x+8,y+4,w-16,5);
    label(c,'上层绕行',790,253,C.deep,14,'center');
    c.fillStyle='#e7b971';for(const [x,w]of [[760,470],[1400,250]])c.fillRect(x,433,w,5);
    label(c,'下层清路',850,421,C.deep,14,'center');
  }
  twoStoreyMarks(c){
    // Paint the ascent cue on the two real cargo steps; it adds no support.
    for(const x of [350,1980]){
      label(c,'上层 ↑',x+37,390,C.deep,13,'center');
      line(c,[[x+15,402],[x+59,402]],C.gold,3);
    }
  }
  fourthGoalCues(c,level){const shelf=level.solids.find(s=>s.id==='arrival-shelf');
    // The stripe marks the actual crate landing zone, safely on the right bank
    // and wholly outside the shelf. It has no collision surface of its own.
    const left=shelf.x-75;block(c,left,434,58,5,1,C.gold,C.deep);
    label(c,'外沿放箱',left+29,421,C.deep,13,'center');
    block(c,level.goal-58,level.goalY-46,116,27,5,C.paper,C.deep);
    label(c,'↑ 上层到站',level.goal,level.goalY-27,C.deep,13,'center');
  }
  supplies(c,g){for(const source of g.sources){block(c,source.x-26,source.y,52,6,2,'#3c716d');line(c,[[source.x-23,source.y+5],[source.x+23,source.y+5]],'#aad0b4',2);if(source.cooldown>0){oval(c,source.x,source.y-24,11,11,'#f5e8cc99');label(c,'↺',source.x,source.y-19,C.deep,18,'center');}}}
  crate(c,b){c.save();c.translate(b.x,b.y-15);c.rotate(b.angle);block(c,-15,-15,30,30,3,'#debd7e',C.darkwood);block(c,-10,-11,20,22,1,'#bd945b');line(c,[[-11,-11],[11,11]],'#edd6a0',5);line(c,[[10,-11],[-10,11]],'#edd6a0',4);for(const x of [-11,11])for(const y of [-11,11])oval(c,x,y,1.2,1.2,C.darkwood);c.restore();}
  enemy(c,e,tick){
    if(!e.alive){const age=(tick-e.hitAt)/120;if(age>.7)return;c.save();c.globalAlpha=1-age/.7;c.translate(e.x,e.y-14-age*18);c.rotate(age*3*e.dir);block(c,-18,-15,36,24,7,'#63766e',C.deep);line(c,[[-10,-7],[10,7]],C.paper,3);line(c,[[10,-7],[-10,7]],C.paper,3);c.restore();return;}
    const stride=Math.sin(tick/10)*3;for(const side of [-1,1])line(c,[[e.x+side*10,e.y-11],[e.x+side*22,e.y-7+stride*side],[e.x+side*24,e.y-2]],C.deep,4);
    block(c,e.x-19,e.y-29,38,24,8,'#687d70',C.deep);block(c,e.x-13,e.y-24,26,8,3,C.red);oval(c,e.x+e.dir*9,e.y-20,3,3,C.paper);line(c,[[e.x-7,e.y-31],[e.x-7,e.y-36],[e.x+6,e.y-36],[e.x+6,e.y-31]],C.deep,2);line(c,[[e.x-12,e.y-8],[e.x+12,e.y-8]],'#b4bca0',2);
  }
  person(c,p,tick,phase){const walking=p.grounded&&Math.abs(p.vx)>0,swing=walking?Math.sin(tick/8)*7:0;const lift=!!p.holding;
    c.save();c.translate(p.x,p.y);if(p.invulnerable>0&&Math.floor(tick/8)%2)c.globalAlpha=.55;
    if(p.grounded)oval(c,0,2,18,4,'#203b423d');
    // Feet meet the exact support; the face/hat stays upright during jumps.
    line(c,[[-6,-13],[-7+swing,0],[-13+swing,0]],C.deep,7);line(c,[[6,-13],[7-swing,0],[13-swing,0]],C.deep,7);
    block(c,-13,-33,26,25,7,C.teal,C.deep);line(c,[[-5,-27],[6,-27]],'#8fc3ac',3);block(c,-10,-22,7,7,2,'#9bbe9e');
    const hands=lift?[[-15,-48],[15,-48]]:p.pose>0?[[p.face*23,-40],[p.face*28,-33]]:[[-16,-20+swing*.4],[16,-20-swing*.4]];
    for(let i=0;i<2;i++){line(c,[[i?11:-11,-28],hands[i]],C.teal,7);oval(c,hands[i][0],hands[i][1],4,4,'#ebba8b');}
    oval(c,0,-41,12,12,'#ebc196');block(c,-14,-52,28,10,5,C.deep);block(c,p.face>0?-3:-20,-46,23,4,2,C.deep);oval(c,p.face*5,-40,1.7,2.2,C.ink);line(c,[[p.face*5,-34],[p.face*8,-35]],'#95654d',1.3);
    line(c,[[-10,-30],[10,-30]],C.gold,5);const tail=walking?Math.sin(tick/8)*3:0;line(c,[[p.face*-10,-30],[p.face*-21,-24+tail]],C.gold,5);
    if(phase==='won'){line(c,[[-14,-25],[-22,-37],[-22,-47]],C.teal,6);oval(c,-22,-47,4,4,'#ebc196');}
    c.restore();
  }
  expressiveCourier(c,g){
    // The silhouette stays close to the 28×46 actor box; the carried box is already drawn separately.
    const p=g.player,tick=g.tick,phase=g.phase;
    if(this.courierFrame&&tick<this.courierFrame.tick)this.landingTick=-100;
    if(this.courierFrame&&tick>this.courierFrame.tick&&tick-this.courierFrame.tick<=3&&
      !this.courierFrame.grounded&&p.grounded)this.landingTick=tick;
    this.courierFrame={tick,grounded:p.grounded};
    let action;
    for(let i=g.events.length-1;i>=0;i--)if(['placed','throw'].includes(g.events[i].type)){action=g.events[i];break;}
    const walking=p.grounded&&Math.abs(p.vx)>0,holding=!!p.holding,actionAge=action?tick-action.tick:Infinity;
    const placing=!holding&&p.pose>0&&action?.type==='placed'&&actionAge>=0&&actionAge<24;
    const throwing=!holding&&p.pose>0&&action?.type==='throw'&&actionAge>=0&&actionAge<28;
    const reduced=typeof matchMedia==='function'&&matchMedia('(prefers-reduced-motion: reduce)').matches;
    const swing=walking&&!reduced?Math.sin(tick/7)*5:0;
    const landing=p.grounded&&tick-(this.landingTick??-100)<12,shift=landing?4:placing?2:0;
    c.save();c.translate(p.x,p.y);if(p.invulnerable>0&&Math.floor(tick/8)%2)c.globalAlpha=.55;
    if(p.grounded)oval(c,0,2,18,4,'#203b423d');
    if(!p.grounded){
      const rise=p.vy<0;
      line(c,[[-6,-13],[-11,rise?-5:-2],[-14,rise?-7:0]],C.deep,7);
      line(c,[[6,-13],[10,rise?-6:-2],[13,rise?-9:0]],C.deep,7);
    }else if(landing){
      line(c,[[-6,-9],[-11,-5],[-15,0]],C.deep,7);
      line(c,[[6,-9],[11,-5],[15,0]],C.deep,7);
    }else{
      line(c,[[-6,-13+shift],[-8+swing,0],[-12+swing,0]],C.deep,7);
      line(c,[[6,-13+shift],[8-swing,0],[12-swing,0]],C.deep,7);
    }
    // The same jacket, cap and satchel silhouette continues through all seven stations.
    block(c,-13,-33+shift,26,25,7,C.teal,C.deep);
    line(c,[[-5,-27+shift],[6,-27+shift]],'#8fc3ac',3);
    block(c,-10,-22+shift,7,7,2,'#9bbe9e');
    line(c,[[-10,-30+shift],[10,-30+shift]],C.gold,5);
    line(c,[[p.face*-10,-30+shift],[p.face*-21,-24+shift]],C.gold,5);
    let hands;
    if(holding)hands=[[-12,-51+shift],[12,-51+shift]];
    else if(placing)hands=p.face>0?[[-14,-19+shift],[18,-11+shift]]:[[-18,-11+shift],[14,-19+shift]];
    else if(throwing)hands=p.face>0?[[-14,-19+shift],[18,-36+shift]]:[[-18,-36+shift],[14,-19+shift]];
    else if(!p.grounded)hands=p.face>0?[[-16,-23+shift],[15,-29+shift]]:[[-15,-29+shift],[16,-23+shift]];
    else hands=[[-14,-19+shift+swing*.3],[14,-19+shift-swing*.3]];
    for(let i=0;i<2;i++){
      line(c,[[i?11:-11,-28+shift],hands[i]],C.teal,7);
      oval(c,hands[i][0],hands[i][1],4,4,'#ebba8b');
    }
    oval(c,0,-41+shift,12,12,'#ebc196');
    block(c,-14,-52+shift,28,10,5,C.deep);
    block(c,p.face>0?-3:-20,-46+shift,23,4,2,C.deep);
    oval(c,p.face*5,-40+shift,1.7,2.2,C.ink);
    line(c,[[p.face*5,-34+shift],[p.face*8,-35+shift]],'#95654d',1.3);
    if(g.stageIndex===0||g.stageIndex===1||g.stageIndex===2){
      const hurt=[...g.events].reverse().find(e=>e.type==='hurt'),age=hurt?tick-hurt.tick:Infinity;
      if(age>=0&&age<50){
        // A short, stationary health cue complements the existing knockback and blink.
        c.globalAlpha=1;const x=p.face>0?17:-48;
        block(c,x,-78,31,22,5,'#9d503e',C.paper);
        label(c,'−1',x+15.5,-62,C.paper,15,'center');
      }
    }
    if(phase==='won'){
      line(c,[[p.face*-9,-29+shift],[p.face*-16,-40+shift]],C.teal,6);
      oval(c,p.face*-16,-40+shift,4,4,'#ebc196');
    }
    c.restore();
  }
}
