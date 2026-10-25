import {createGame,STEP} from './engine.mjs?v=crate-slice-1';
import {Renderer} from './view.mjs?v=crate-slice-1';
import {attachController} from './controller.mjs?v=crate-slice-1';
const root=document.querySelector('#game'),canvas=root.querySelector('#canvas'),g=createGame(),renderer=new Renderer(canvas);
let last=0,accumulator=0,resize=true;
const controller=attachController(root,g,{onChange(){last=0;accumulator=0;renderer.predictionTick=-10;resize=true;}});
const ro=new ResizeObserver(()=>{resize=true;});ro.observe(root.querySelector('#stage'));
function frame(now){try{
  if(resize){const r=canvas.getBoundingClientRect();renderer.resize(Math.max(1,r.width),Math.max(1,r.height),devicePixelRatio||1);resize=false;}
  if(last&&g.phase==='playing'){accumulator+=Math.min((now-last)/1000,STEP*8);const n=Math.floor(accumulator/STEP);if(n){controller.advance(n);accumulator-=n*STEP;}}
  else accumulator=0;
  last=now;renderer.draw(g);requestAnimationFrame(frame);
}catch(error){controller.clear();const message=root.querySelector('#fatal');message.hidden=false;message.textContent='游戏运行中断：'+error.message+'。请刷新重试，或返回图鉴。';root.querySelector('#pause').disabled=true;root.querySelector('#retry').disabled=true;}
}
requestAnimationFrame(frame);
