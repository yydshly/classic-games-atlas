import {createGame,command,STEP} from './engine.mjs?v=crate-courier-seven-fourth-cue-1';
import {Renderer} from './view.mjs?v=crate-courier-seven-stage2-hall-1';
import {attachController} from './controller.mjs?v=crate-courier-seven-fourth-cue-1';
import {openStore} from './storage.mjs?v=crate-courier-seven-fourth-cue-1';
const root=document.querySelector('#game'),canvas=root.querySelector('#canvas'),backing={getItem:key=>window.localStorage.getItem(key),setItem:(key,value)=>window.localStorage.setItem(key,value)};
const store=openStore(backing),g=store.read()||createGame(),renderer=new Renderer(canvas);
let last=0,accumulator=0,resize=true,clockReset=true,nextSaveTick=g.tick+120;
function saveStatus(){const still=g.phase==='ready'?'等待开始':g.phase==='won'?'到站回顾已保留':'刷新后先暂停',labels={empty:'独立自动存档 · 未完成体验验收',loaded:g.phase==='paused'?'已恢复现场 · 先继续再行动':'已恢复 · '+still,saved:'已保存 · '+still,invalid:'原档已保留 · 当前临时游玩','read-error':'无法读取原档 · 当前临时游玩',protected:'原档已保留 · 当前临时游玩','write-error':'保存未成功 · 当前仍可游玩'};const status=labels[store.status]||labels['write-error'];root.querySelector('#save-status').textContent=(g.stageIndex===5&&g.levelVersion!==2?'旧第六关地图 · ':g.stageIndex===6&&g.levelVersion!==2?'旧第七关地图 · ':'')+status;const button=root.querySelector('#save-retry');button.hidden=['empty','loaded','saved'].includes(store.status);button.textContent=store.protected?'建立新存档':'重试保存';}
function persist(){store.save(g);nextSaveTick=g.tick+120;saveStatus();}
const controller=attachController(root,g,{onChange(){clockReset=true;renderer.predictionTick=-10;resize=true;persist();}});
root.querySelector('#save-retry').addEventListener('click',()=>{if(store.protected){controller.clear();if(g.phase==='playing')command(g,'pause');controller.render();if(window.confirm('将以当前旅程替换本游戏原档，其他作品存档不受影响。是否继续？'))store.save(g,{replace:true});}else store.save(g);nextSaveTick=g.tick+120;saveStatus();});
new ResizeObserver(()=>{resize=true;}).observe(root.querySelector('#stage'));
window.addEventListener('pagehide',()=>{controller.clear();if(g.phase==='playing')command(g,'pause');controller.render();persist();});
saveStatus();
function frame(now){try{
  if(clockReset){last=0;accumulator=0;clockReset=false;}
  if(resize){const r=canvas.getBoundingClientRect();renderer.resize(Math.max(1,r.width),Math.max(1,r.height),devicePixelRatio||1);resize=false;}
  if(last&&g.phase==='playing'){accumulator+=Math.min((now-last)/1000,STEP*8);const n=Math.floor(accumulator/STEP);if(n){controller.advance(n);accumulator-=n*STEP;}}
  else accumulator=0;
  if(g.phase==='playing'&&g.tick>=nextSaveTick)persist();
  last=now;renderer.draw(g);requestAnimationFrame(frame);
}catch(error){controller.clear();const message=root.querySelector('#fatal');message.hidden=false;message.textContent='游戏运行中断：'+error.message+'。请刷新重试，或返回图鉴。';root.querySelector('#pause').disabled=true;root.querySelector('#retry').disabled=true;}
}
requestAnimationFrame(frame);
