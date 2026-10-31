// Real app/HTML under synthetic DOM + Canvas/RAF fixtures. Not a native browser.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {build} from '../../tools/preview-bundles/node_modules/esbuild/lib/main.js';
import {JSDOM} from '../../tools/preview-bundles/node_modules/jsdom/lib/api.js';
import {recordingCanvas} from '../../tools/crate-courier/svg-context.mjs';
import {createGame,createPracticeGame,command,step} from './engine.mjs';
import {combatRoute,campaignUpper,chapterSixLower,chapterSevenBarrier} from './routes.mjs';
import {SAVE_KEY,encodeSave} from './storage.mjs';
const bundle=(await build({entryPoints:[new URL('./main.mjs',import.meta.url).pathname],bundle:true,write:false,format:'iife',platform:'browser'})).outputFiles[0].text;
function boot(data=new Map(),options={}){const dom=new JSDOM(readFileSync(new URL('./index.html',import.meta.url),'utf8'),{pretendToBeVisual:true,runScripts:'outside-only',url:'https://example.test/experiments/crate-courier/'}),w=dom.window,d=w.document,frames=[],calls=[],sessionData=options.sessionData||new Map(),flags={denyWrite:false,denyRead:false,confirm:false,...options};let now=1;
  const ctx=recordingCanvas(960,560).getContext('2d');w.HTMLCanvasElement.prototype.getContext=()=>ctx;w.HTMLCanvasElement.prototype.getBoundingClientRect=()=>({width:960,height:560});w.structuredClone=structuredClone;w.ResizeObserver=class{observe(){}disconnect(){}};w.requestAnimationFrame=f=>(frames.push(f),frames.length);w.confirm=()=>flags.confirm;
  Object.defineProperty(w,'localStorage',{get(){if(flags.denyRead)throw Error('SecurityError');return {getItem(k){calls.push(['get',k]);return data.get(k)??null;},setItem(k,v){calls.push(['set',k]);if(flags.denyWrite)throw Error('QuotaExceededError');data.set(k,v);}};}});
  Object.defineProperty(w,'sessionStorage',{get(){if(flags.denySession)throw Error('denied');return {getItem:k=>sessionData.get(k)??null,setItem:(k,v)=>sessionData.set(k,v),removeItem:k=>sessionData.delete(k)};}});
  w.eval(bundle);const $=s=>d.querySelector(s),pump=(n=1)=>{for(let i=0;i<n;i++){const f=frames.shift();assert(f,'animation loop should remain recoverable');now+=1000/60;f(now);}};pump();
  return {dom,w,d,$,pump,flags,calls,data,sessionData,key(code,type='keydown'){d.dispatchEvent(new w.KeyboardEvent(type,{code,bubbles:true,cancelable:true}));},close(){dom.window.close();}};
}
test('completed single-stage practice survives reload while original journey bytes never change',()=>{
  const raw=encodeSave(chapterSevenBarrier().game),data=new Map([[SAVE_KEY,raw]]),sessionData=new Map();
  const a=boot(data,{sessionData});assert(!a.$('#practice-panel').hidden);assert.equal(a.$('#practice-stage').options.length,7);
  a.$('#practice-stage').value='4';a.$('#practice-start').click();a.$('#practice-start').click();
  assert(!a.$('#practice-badge').hidden);assert(a.$('#intro-chapter').textContent.includes('第5关'));
  assert.equal(data.get(SAVE_KEY),raw);a.$('#start').click();a.pump(20);a.$('#pause').click();
  assert.equal(data.get(SAVE_KEY),raw);a.close();
  const b=boot(data,{sessionData});assert.equal(b.$('#pause').textContent,'继续');assert(!b.$('#practice-badge').hidden);
  b.$('#retry').click();assert.equal(JSON.parse(sessionData.get('classic-games-atlas:crate-courier:practice:session:v1')).game.journey.retries[4],1);
  b.$('#practice-exit').click();assert(b.$('#practice-badge').hidden);assert(!b.$('#practice-panel').hidden);
  assert.equal(b.$('#recap').children.length,7);assert.equal(data.get(SAVE_KEY),raw);assert.equal(sessionData.size,0);
  b.w.dispatchEvent(new b.w.Event('pagehide'));assert.equal(data.get(SAVE_KEY),raw);b.close();
});
test('unfinished legacy journey cannot start practice or overwrite its saved bytes',()=>{
  const old=chapterSixLower().game;old.journey.retries.length=6;const raw=JSON.stringify({version:1,game:old});
  const data=new Map([[SAVE_KEY,raw]]),f=boot(data);assert(f.$('#practice-panel').hidden);
  f.$('#practice-start').click();assert.equal(data.get(SAVE_KEY),raw);assert(f.$('#practice-badge').hidden);f.close();
});
test('a legally failed practice snapshot retries only practice and preserves the final journey',()=>{
  const final=chapterSevenBarrier().game,raw=encodeSave(final),g=createPracticeGame(final,0);command(g,'start');
  let reached=false;outer:for(const s of combatRoute().runs){if(s.command)continue;for(let i=0;i<s.frames;i++){
    step(g,JSON.parse(s.keys));if(g.player.grounded&&g.player.x>=629&&g.player.x<=632){reached=true;break outer;}
  }}assert(reached);for(let i=0;i<300&&g.phase==='playing';i++)step(g,{right:true});assert.equal(g.phase,'failed');
  const practiceKey='classic-games-atlas:crate-courier:practice:session:v1',sessionData=new Map([[practiceKey,encodeSave(g)],[practiceKey+':source',raw]]),data=new Map([[SAVE_KEY,raw]]),f=boot(data,{sessionData});
  assert(!f.$('#practice-badge').hidden);assert.equal(f.$('#result-title').textContent,'这次没能到站');
  f.$('#result-retry').click();const retry=JSON.parse(sessionData.get(practiceKey)).game;
  assert.equal(retry.stageIndex,0);assert.equal(retry.phase,'playing');assert.equal(retry.player.x,110);
  assert.equal(retry.journey.retries[0],final.journey.retries[0]+1);assert.equal(data.get(SAVE_KEY),raw);
  f.$('#practice-exit').click();assert.equal(data.get(SAVE_KEY),raw);f.close();
});
test('stale or corrupt practice data never overrides the original finished journey',()=>{
  const raw=encodeSave(chapterSevenBarrier().game),data=new Map([[SAVE_KEY,raw]]),key='classic-games-atlas:crate-courier:practice:session:v1';
  for(const sessionData of [new Map([[key,'{bad'],[key+':source',raw]]),new Map([[key,encodeSave(createGame())],[key+':source','different journey']])]){
    const f=boot(data,{sessionData});assert(f.$('#practice-badge').hidden);assert(!f.$('#practice-panel').hidden);
    assert.equal(data.get(SAVE_KEY),raw);f.close();
  }
});
test('seventh-stage practice result never offers journey advance or restart',()=>{
  const raw=encodeSave(chapterSevenBarrier().game),key='classic-games-atlas:crate-courier:practice:session:v1';
  const f=boot(new Map([[SAVE_KEY,raw]]),{sessionData:new Map([[key,raw],[key+':source',raw]])});
  assert(!f.$('#practice-badge').hidden);assert(f.$('#next').hidden&&f.$('#restart').hidden&&f.$('#recap').hidden);
  assert(f.$('#result-title').textContent.includes('练习到站'));assert.equal(f.data.get(SAVE_KEY),raw);f.close();
});
test('returning from practice honors a newer original save made by another tab',()=>{
  const old=encodeSave(chapterSevenBarrier().game),newer=encodeSave(createGame()),data=new Map([[SAVE_KEY,old]]),f=boot(data);
  f.$('#practice-start').click();assert(!f.$('#practice-badge').hidden);data.set(SAVE_KEY,newer);
  f.$('#practice-exit').click();assert(f.$('#practice-badge').hidden);assert(!f.$('#intro').hidden);
  f.w.dispatchEvent(new f.w.Event('pagehide'));assert.equal(data.get(SAVE_KEY),newer);f.close();
});
test('blocked session storage leaves original bytes intact and explains practice cannot be saved',()=>{
  const raw=encodeSave(chapterSevenBarrier().game),data=new Map([[SAVE_KEY,raw]]),f=boot(data,{denySession:true});
  f.$('#practice-start').click();assert(f.$('#practice-badge').hidden);
  assert.equal(f.$('#practice-note').textContent,'本标签无法保存练习，请检查浏览器存储设置。');
  assert.equal(data.get(SAVE_KEY),raw);assert(f.$('#fatal').hidden);f.close();
});
test('actual app boots from the old no-save case and explains separate jump presses',()=>{const f=boot();assert(!f.$('#intro').hidden);assert(f.$('#intro').textContent.includes('每跳一次松开再按'));assert(f.$('#intro').textContent.includes('单人七关'));assert(!f.data.has(SAVE_KEY));f.$('#start').click();f.pump(5);assert(f.$('#intro').hidden);assert(f.data.has(SAVE_KEY));assert(f.$('#fatal').hidden);assert(f.calls.every(([,k])=>k===SAVE_KEY));f.close();});
test('a real-app mid-jump pause persists, reloads paused and does not move until continued',()=>{const data=new Map(),a=boot(data);a.$('#start').click();a.key('ArrowRight');a.pump(25);a.key('ArrowRight','keyup');a.key('KeyJ');a.pump(2);a.key('KeyJ','keyup');a.key('Space');a.pump(8);a.key('Space','keyup');a.$('#pause').click();const saved=JSON.parse(data.get(SAVE_KEY)).game;assert.equal(saved.phase,'paused');assert(saved.player.y<440);assert(saved.player.holding);a.close();const b=boot(data);assert.equal(b.$('#pause').textContent,'继续');const raw=data.get(SAVE_KEY);b.pump(20);assert.equal(data.get(SAVE_KEY),raw);assert(b.$('#hint').textContent.includes('已暂停'));b.$('#pause').click();b.pump(65);b.$('#pause').click();const later=JSON.parse(data.get(SAVE_KEY)).game;assert(later.tick>saved.tick);assert(b.$('#fatal').hidden);b.close();});
test('actual next/start/retry controls preserve chapter one and show the new target',()=>{const data=new Map([[SAVE_KEY,encodeSave(combatRoute().game)]]),f=boot(data);assert(!f.$('#next').hidden);f.$('#next').click();let saved=JSON.parse(data.get(SAVE_KEY)).game;assert.equal(saved.stageIndex,1);assert.equal(saved.phase,'ready');assert.equal(saved.journey.completed.length,1);assert(f.$('#intro-goal').textContent.includes('上层'));assert(f.$('#intro-chapter').textContent.includes('双层货栈'));f.$('#start').click();f.key('ArrowRight');f.pump(10);f.$('#retry').click();saved=JSON.parse(data.get(SAVE_KEY)).game;assert.equal(saved.stageIndex,1);assert.equal(saved.player.x,110);assert.equal(saved.journey.completed.length,1);assert.equal(saved.journey.retries[1],1);f.close();});
test('the final recap has seven real records and restarting requires confirmation',()=>{const data=new Map([[SAVE_KEY,encodeSave(chapterSevenBarrier().game)]]),f=boot(data);assert(f.$('#next').hidden);assert(!f.$('#restart').hidden);assert.equal(f.$('#recap').children.length,7);assert(f.$('#recap').textContent.includes('轻放1次'));const raw=data.get(SAVE_KEY);f.$('#restart').click();assert.equal(data.get(SAVE_KEY),raw);f.flags.confirm=true;f.$('#restart').click();const saved=JSON.parse(data.get(SAVE_KEY)).game;assert.equal(saved.stageIndex,0);assert.equal(saved.phase,'ready');assert.equal(saved.journey.completed.length,0);f.close();});
test('a six-chapter completed save offers seven, then refresh and retry keep earlier records',()=>{
  const old=chapterSixLower().game;old.journey.retries.length=6;
  const raw=JSON.stringify({version:1,game:old}),data=new Map([[SAVE_KEY,raw]]),first=boot(data);
  assert(!first.$('#next').hidden);assert.equal(data.get(SAVE_KEY),raw);
  first.$('#next').click();let saved=JSON.parse(data.get(SAVE_KEY)).game;
  assert.equal(saved.stageIndex,6);assert.equal(saved.phase,'ready');
  assert.deepEqual(saved.journey.completed,old.journey.completed);
  first.$('#start').click();first.$('#pause').click();first.close();
  const resumed=boot(data);assert.equal(resumed.$('#pause').textContent,'继续');
  assert.equal(JSON.parse(data.get(SAVE_KEY)).game.stageIndex,6);
  resumed.$('#retry').click();saved=JSON.parse(data.get(SAVE_KEY)).game;
  assert.equal(saved.stageIndex,6);assert.equal(saved.journey.retries[6],1);
  assert.deepEqual(saved.journey.completed,old.journey.completed);resumed.close();
});
test('quota failure is visible, preserves prior bytes and retries without advancing a paused game',()=>{const original=encodeSave(createGame()),data=new Map([[SAVE_KEY,original],['other-game','keep']]),f=boot(data,{denyWrite:true});f.$('#start').click();f.pump(10);f.$('#pause').click();assert.equal(data.get(SAVE_KEY),original);assert(f.$('#save-status').textContent.includes('未成功'));assert(!f.$('#save-retry').hidden);f.flags.denyWrite=false;f.$('#save-retry').click();const saved=JSON.parse(data.get(SAVE_KEY)).game,raw=data.get(SAVE_KEY);assert.equal(saved.phase,'paused');assert(saved.tick>0);f.pump(10);assert.equal(data.get(SAVE_KEY),raw);assert.equal(data.get('other-game'),'keep');assert(f.$('#save-status').textContent.includes('已保存'));f.close();});
test('a corrupt existing save is protected during temporary play and replace cancellation',()=>{const data=new Map([[SAVE_KEY,'{bad'],['other-game','keep']]),f=boot(data);assert(!f.$('#save-retry').hidden);f.$('#start').click();f.pump(10);assert.equal(data.get(SAVE_KEY),'{bad');f.$('#save-retry').click();assert.equal(data.get(SAVE_KEY),'{bad');assert.equal(f.$('#pause').textContent,'继续');f.flags.confirm=true;f.$('#save-retry').click();assert.equal(JSON.parse(data.get(SAVE_KEY)).version,1);assert.equal(data.get('other-game'),'keep');f.close();});
test('read access can recover through explicit establishment and pagehide pauses before storing',()=>{const f=boot(new Map(),{denyRead:true});f.$('#start').click();f.pump(10);assert(f.$('#save-status').textContent.includes('无法读取'));assert(!f.data.has(SAVE_KEY));f.flags.denyRead=false;f.flags.confirm=true;f.$('#save-retry').click();assert(f.data.has(SAVE_KEY));f.$('#pause').click();f.key('ArrowRight');f.pump(5);f.w.dispatchEvent(new f.w.Event('pagehide'));assert.equal(JSON.parse(f.data.get(SAVE_KEY)).game.phase,'paused');assert.equal(f.$('#pause').textContent,'继续');assert(f.$('#fatal').hidden);f.close();});
