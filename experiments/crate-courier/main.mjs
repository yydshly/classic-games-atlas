import {createGame,createPracticeGame,command,STEP,LEVELS} from './engine.mjs?v=crate-courier-seven-practice-1';
import {Renderer} from './view.mjs?v=crate-courier-seven-stage7-poses-1';
import {attachController} from './controller.mjs?v=crate-courier-seven-practice-1';
import {openStore,SAVE_KEY} from './storage.mjs?v=crate-courier-seven-fourth-cue-1';
const root=document.querySelector('#game'),canvas=root.querySelector('#canvas'),backing={getItem:key=>window.localStorage.getItem(key),setItem:(key,value)=>window.localStorage.setItem(key,value)};
const PRACTICE_KEY='classic-games-atlas:crate-courier:practice:session:v1',SOURCE_KEY=PRACTICE_KEY+':source';
const practiceBacking={getItem:()=>window.sessionStorage.getItem(PRACTICE_KEY),setItem:(_key,value)=>window.sessionStorage.setItem(PRACTICE_KEY,value)};
const store=openStore(backing),practiceStore=openStore(practiceBacking);let originalGame=store.read()||createGame();
let sourceRaw=null;try{sourceRaw=backing.getItem(SAVE_KEY);}catch{}
const practiceSaved=practiceStore.read();let practice=false;
try{practice=!!(sourceRaw&&window.sessionStorage.getItem(SOURCE_KEY)===sourceRaw&&practiceSaved&&originalGame.phase==='won'&&originalGame.stageIndex===LEVELS.length-1&&originalGame.journey.completed.length===LEVELS.length&&practiceSaved.stageIndex<originalGame.journey.completed.length);}catch{}
const g=practice?practiceSaved:originalGame,renderer=new Renderer(canvas);
let last=0,accumulator=0,resize=true,clockReset=true,nextSaveTick=g.tick+120,pristineRestored=false;
function saveStatus(){const current=practice?practiceStore:store,still=g.phase==='ready'?'等待开始':g.phase==='won'?'到站回顾已保留':'刷新后先暂停',labels={empty:'独立自动存档 · 未完成体验验收',loaded:g.phase==='paused'?'已恢复现场 · 先继续再行动':'已恢复 · '+still,saved:'已保存 · '+still,invalid:'原档已保留 · 当前临时游玩','read-error':'无法读取原档 · 当前临时游玩',protected:'原档已保留 · 当前临时游玩','write-error':'保存未成功 · 当前仍可游玩'};const status=practice?(current.status==='saved'||current.status==='loaded'?'练习仅存于本标签 · 刷新可继续':'练习未保存 · 当前仍可游玩'):labels[current.status]||labels['write-error'];root.querySelector('#save-status').textContent=(g.stageIndex===5&&g.levelVersion!==2?'旧第六关地图 · ':g.stageIndex===6&&g.levelVersion!==2?'旧第七关地图 · ':'')+status;const button=root.querySelector('#save-retry');button.hidden=['empty','loaded','saved'].includes(current.status);button.textContent=practice?'重试保存练习':current.protected?'建立新存档':'重试保存';const available=['loaded','saved'].includes(store.status);root.querySelector('#practice-start').disabled=!available;if(!available)root.querySelector('#practice-note').textContent='先保存完整旅程，才能在本标签练习已通关关卡。';}
function persist(){if(practice)practiceStore.save(g,{replace:true});else if(!pristineRestored&&store.save(g)){originalGame=structuredClone(g);try{sourceRaw=backing.getItem(SAVE_KEY);}catch{sourceRaw=null;}}nextSaveTick=g.tick+120;saveStatus();}
function replaceGame(next){for(const key of Object.keys(g))delete g[key];Object.assign(g,next);controller.clear();controller.render();renderer.predictionTick=-10;renderer.needsCameraFit=true;clockReset=true;resize=true;nextSaveTick=g.tick+120;saveStatus();}
const controller=attachController(root,g,{isPractice:()=>practice,onChange(){pristineRestored=false;clockReset=true;renderer.predictionTick=-10;resize=true;persist();}});
const stageSelect=root.querySelector('#practice-stage');for(const level of LEVELS){const option=document.createElement('option');option.value=String(LEVELS.indexOf(level));option.textContent=`第${Number(option.value)+1}关 · ${level.title}`;stageSelect.append(option);}
root.querySelector('#practice-start').addEventListener('click',()=>{if(practice||g.phase!=='won'||g.stageIndex!==LEVELS.length-1||!['loaded','saved'].includes(store.status))return;
  try{const raw=backing.getItem(SAVE_KEY);if(!raw||raw!==sourceRaw)throw Error('原旅程已改变，请刷新后再选择练习。');
    const next=createPracticeGame(originalGame,Number(stageSelect.value));window.sessionStorage.setItem(SOURCE_KEY,raw);
    if(!practiceStore.save(next,{replace:true}))throw Error('本标签无法保存练习，请检查浏览器存储设置。');
    practice=true;replaceGame(next);root.querySelector('#start').focus({preventScroll:true});
  }catch(error){const storageMessage='本标签无法保存练习，请检查浏览器存储设置。';root.querySelector('#practice-note').textContent=error.message==='原旅程已改变，请刷新后再选择练习。'?error.message:storageMessage;}
});
root.querySelector('#practice-exit').addEventListener('click',()=>{if(!practice)return;try{window.sessionStorage.removeItem(PRACTICE_KEY);window.sessionStorage.removeItem(SOURCE_KEY);}catch{root.querySelector('#save-status').textContent='无法清除练习，请刷新后重试返回。';return;}const fresh=store.read();if(fresh)originalGame=fresh;try{sourceRaw=backing.getItem(SAVE_KEY);}catch{sourceRaw=null;}practice=false;pristineRestored=true;replaceGame(originalGame);(g.phase==='won'?stageSelect:root.querySelector('#stage')).focus({preventScroll:true});});
root.querySelector('#save-retry').addEventListener('click',()=>{if(practice){practiceStore.save(g,{replace:true});}else if(store.protected){controller.clear();if(g.phase==='playing')command(g,'pause');controller.render();if(window.confirm('将以当前旅程替换本游戏原档，其他作品存档不受影响。是否继续？'))store.save(g,{replace:true});}else store.save(g);nextSaveTick=g.tick+120;saveStatus();});
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
