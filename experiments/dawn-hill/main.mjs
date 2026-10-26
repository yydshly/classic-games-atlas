import {step,STEP,hint} from './engine.mjs?v=dawn-slice-1';
import {Renderer} from './view.mjs?v=dawn-slice-1';
import {attachInput} from './input.mjs?v=dawn-slice-1';
import {openStore} from './storage.mjs?v=dawn-slice-1';
const $=s=>document.querySelector(s),store=openStore(()=>window.localStorage),game=store.load(),renderer=new Renderer($('#world'));let accumulator=0,last=0,controller;
function save(){store.save(game);status();}
function status(){$('#save-status').textContent=store.message;$('#save-retry').hidden=!store.problem;$('#save-retry').textContent=store.protected?'建立新存档':'重试保存';}
function render(){renderer.draw(game);$('#intro').hidden=game.phase!=='ready';$('#paused').hidden=game.phase!=='paused';$('#pause').disabled=!['playing','paused'].includes(game.phase);$('#retry').disabled=game.phase==='ready';$('#pause').textContent=game.phase==='paused'?'继续 P':'暂停 P';$('#form').textContent=game.player.big?'大体型 · 可承受一次侧碰':game.player.pending?'晨露果已接住':'小体型 · 避开侧碰';$('#seed-count').textContent=`晨光籽 ${game.seeds.length} / 3`;$('#progress').textContent=`到亭 ${Math.min(100,Math.floor(game.player.x/2290*100))}%`;$('#hint').textContent=hint(game);$('#result').hidden=!['failed','won'].includes(game.phase);$('#result-title').textContent=game.phase==='won'?'晨钟响了，路走通了':'这一趟停在这里';$('#result-text').textContent=hint(game);$('#result-retry').textContent=game.phase==='won'?'再走一次，换条路':'重试晨露坡';status();}
function change(){accumulator=0;last=0;save();}
controller=attachInput({document,window,game,render,onChange:change});
function fit(){const r=$('#world').getBoundingClientRect();renderer.fit(r.width||960,r.height||500,window.devicePixelRatio||1);render();}if(window.ResizeObserver)new ResizeObserver(fit).observe($('#world'));window.addEventListener('resize',fit);
$('#save-retry').addEventListener('click',()=>{if(game.phase==='playing')controller.pause();if(store.protected&&!window.confirm('无法读取的本作原档仍被保护。确定用当前现场建立新档并替换它吗？'))return;if(store.protected)store.establish(game);else store.save(game);render();});
function frame(now){const elapsed=last?Math.max(0,Math.min(.06,(now-last)/1000)):0;last=now;if(game.phase==='playing'){accumulator+=elapsed;while(accumulator>=STEP&&game.phase==='playing'){step(game,controller.input());accumulator-=STEP;if(game.tick%120===0)save();}if(game.phase!=='playing'){controller.clear();accumulator=0;save();}}else accumulator=0;render();window.requestAnimationFrame(frame);}fit();window.requestAnimationFrame(frame);
