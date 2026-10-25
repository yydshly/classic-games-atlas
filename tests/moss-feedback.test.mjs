import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import vm from 'node:vm';
import * as E from '../preview/moss/engine.mjs';
import {latestIncident,incidentCopy} from '../preview/moss/feedback.mjs';
import {JourneyStore,fresh,finish} from '../preview/moss/journey.mjs';
import {Renderer} from '../preview/moss/renderer.mjs';
const root=new URL('../preview/moss/',import.meta.url),baseline=JSON.parse(readFileSync(new URL('../docs/moss-feedback-qa/before-routes.json',import.meta.url),'utf8'));
const {JSDOM}=createRequire(new URL('../tools/preview-bundles/package.json',import.meta.url))('jsdom');
const core=g=>{const s=E.snapshot(g);for(const a of s.actors){delete a.fallOrigin;delete a.lossEvent;}return s;};
function replay(row,until=()=>false){const g=E.createGame(row.level-1);E.start(g);let at=0;const h=createHash('sha256'),hash=()=>h.update(JSON.stringify(core(g))+'\n');hash();for(let n=0;n<4000&&g.state==='playing'&&!until(g);n++){while(at<row.orders.length&&row.orders[at].tick===g.ticks){const a=row.orders[at++];E.pause(g);assert(E.assign(g,a.actorId,a.tool).ok);E.start(g);hash();}E.update(g,E.STEP);hash();}return {g,digest:h.digest('hex')};}
const bridge=()=>replay(baseline.scenarios.find(r=>r.name==='bridge-only-minimum-quota'),g=>g.lost>0).g;

test('all sixteen legal-input routes retain the exact complete pre-fix simulation trace apart from feedback facts',()=>{
  for(const row of baseline.scenarios){const {g,digest}=replay(row);assert.equal(digest,row.traceSHA256,row.level+': '+row.name);assert.deepEqual({state:g.state,time:g.time,rescued:g.rescued,lost:g.lost,stats:g.stats},row.result);}
});
test('water feedback records the real fall origin and unfinished bridge, even when the bridge is now finished',()=>{
  const g=bridge(),info=latestIncident(g);assert.equal(info.actorId,2);assert.equal(info.cause,'落入水隙');assert.equal(info.time,6.25);assert.equal(g.actors[0].job,null);assert(info.unfinishedBridge);assert.equal(g.actors[1].fallOrigin.time,5.6);assert.equal(g.actors[1].fallOrigin.bridgeActorId,1);assert.match(incidentCopy(g).context,/开始下落时.*尚未完工/);
  const before=E.snapshot(g);latestIncident(g);incidentCopy(g);assert.deepEqual(E.snapshot(g),before);E.pause(g);const paused=E.snapshot(g);E.update(g,1);assert.deepEqual(E.snapshot(g),paused);assert.deepEqual(latestIncident(E.restore(E.checkpoint(g))),info);
});
test('deep-fall cause uses the actual height; legacy checkpoints omit unrecorded construction context; malformed facts reject',()=>{
  const row=baseline.scenarios.find(r=>r.level===2&&r.name==='no-input'),g=replay(row,s=>s.lost>0).g;assert.match(incidentCopy(g).message,/下降3格.*2.2格/);assert.equal(latestIncident(g).unfinishedBridge,false);
  const old=core(bridge()),loaded=E.restore(old);assert(loaded);assert.equal(latestIncident(loaded).cause,'落入水隙');assert.equal(latestIncident(loaded).unfinishedBridge,false);assert.doesNotMatch(incidentCopy(loaded).context,/尚未完工/);
  const bad=E.checkpoint(bridge());bad.actors[1].fallOrigin.bridgeActorId=7;assert.equal(E.restore(bad),null);bad.actors[1].fallOrigin.bridgeActorId=1;bad.actors[1].lossEvent.cause='猜测放行过早';assert.equal(E.restore(bad),null);
});

function ui(){
  const dom=new JSDOM(readFileSync(new URL('index.html',root),'utf8'),{url:'https://example.invalid/moss/'}),data=new Map();let frame,stamp=0,lastDraw;
  const style=dom.window.document.createElement('style');style.textContent=readFileSync(new URL('style.css',root),'utf8');dom.window.document.head.append(style);
  for(const dialog of dom.window.document.querySelectorAll('dialog')){dialog.showModal=()=>dialog.setAttribute('open','');dialog.close=()=>dialog.removeAttribute('open');}
  const source=readFileSync(new URL('game.mjs',root),'utf8').replace(/^import .*$/gm,'').replace('export function diagnostics','function diagnostics');
  const context=vm.createContext({...E,latestIncident,incidentCopy,document:dom.window.document,window:dom.window,localStorage:{getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v)},JourneyStore,fresh,finish,Renderer:class{draw(g,id,options){lastDraw=options;}},requestAnimationFrame:cb=>frame=cb});
  vm.runInContext(source+'\nglobalThis.testUI={diagnostics};',context);
  const $=s=>dom.window.document.querySelector(s),read=()=>JSON.parse(JSON.stringify(context.testUI.diagnostics()));
  return {dom,$,read,draw:()=>lastDraw,step(){stamp+=50;frame(stamp);},order(id,tool){$('#pause').click();$(`[data-crew="${id}"]`).click();$(`#tool-${tool}`).click();assert.equal($('#apply-tool').disabled,false);$('#apply-tool').click();$('#pause').click();}};
}
function untilUI(f,p){for(let n=0;n<4000&&!p(f.read());n++)f.step();assert(p(f.read()));f.step();f.step();f.step();}
test('actual DOM feedback stays readable through pause, and retry clears both text and marker before a genuine repeated loss',t=>{
  const f=ui();t.after(()=>f.dom.window.close());f.$('#start').click();untilUI(f,g=>g.lost>0);const note=f.$('#incident-feedback'),message=f.$('#incident-message').textContent;
  assert.equal(note.hidden,false);assert.match(message,/1号.*落入水隙/);assert.equal(f.$('.board-frame').contains(note),false);assert.equal(f.$('#incident-message').getAttribute('aria-live'),'polite');
  f.$('#pause').click();const time=f.read().time;for(let i=0;i<20;i++)f.step();assert.equal(f.read().time,time);assert.equal(f.$('#incident-message').textContent,message);
  f.$('#retry').click();f.$('#retry-yes').click();assert.equal(note.hidden,true);assert.equal(f.$('#incident-message').textContent,'');assert.equal(f.$('#incident-context').textContent,'');assert.equal(f.draw().incident,null);
  f.$('#start').click();untilUI(f,g=>g.lost>0);assert.equal(note.hidden,false);assert.equal(f.$('#incident-message').textContent,message);
});
test('normal completion then next-stage/new-journey transitions never carry an old loss notice forward; failure results keep the map visible',t=>{
  const f=ui();t.after(()=>f.dom.window.close());f.$('#start').click();untilUI(f,g=>E.inspect(g,1,'bridge').ok);f.order(1,'bridge');untilUI(f,g=>g.state==='won');assert.equal(f.read().rescued,4);assert.equal(f.$('#incident-feedback').hidden,false);
  f.$('#result-next').click();assert.equal(f.read().level,2);assert.equal(f.$('#incident-feedback').hidden,true);assert.equal(f.draw().incident,null);
  f.$('#new-journey').click();f.$('#confirm-new-yes').click();assert.equal(f.read().level,1);assert.equal(f.$('#incident-message').textContent,'');f.$('#start').click();untilUI(f,g=>g.state==='lost');assert.equal(f.dom.window.getComputedStyle(f.$('#result-card')).position,'static');
});
test('the real renderer draws a small location marker beneath living actors without mutating the world',()=>{
  const g=bridge(),before=E.snapshot(g),calls=[];const ctx=new Proxy({fillText:(...args)=>calls.push(args),createRadialGradient:()=>({addColorStop(){}})},{get:(o,k)=>k in o?o[k]:()=>{}});
  const r=Object.create(Renderer.prototype);r.ctx=ctx;r.backdrop={};r.draw(g,3,{incident:latestIncident(g)});assert(calls.findIndex(x=>x[0]==='×')>=0);assert(calls.findIndex(x=>x[0]==='×')<calls.findIndex(x=>x[0]==='3'));assert.deepEqual(E.snapshot(g),before);
});
