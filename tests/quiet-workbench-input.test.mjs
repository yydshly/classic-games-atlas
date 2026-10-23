import assert from 'node:assert/strict';import vm from 'node:vm';import {readFileSync} from 'node:fs';import {QuietWorld,ROOM} from '../experiments/quiet-workbench/physics.mjs';import {feedback} from '../experiments/quiet-workbench/feedback.mjs';
function fixture(){
 const nodes=new Map(),events={},windowEvents={};let now=1000;
 const make=(key=null)=>({textContent:'',hidden:false,dataset:key?{key}:{},handlers:{},focus(){},setPointerCapture(){},addEventListener(t,f){(this.handlers[t]??=[]).push(f)}});
 const node=s=>{if(!nodes.has(s))nodes.set(s,make());return nodes.get(s)},buttons=['KeyA','KeyW','KeyS','KeyD','ShiftLeft'].map(make);
 const document={hidden:false,querySelector:node,querySelectorAll:()=>buttons,addEventListener:(t,f)=>events[t]=f};
 const context=vm.createContext({document,window:{addEventListener:(t,f)=>windowEvents[t]=f},performance:{now:()=>now},requestAnimationFrame(){},location:{reload(){}},QuietWorld,ROOM,feedback,createView:()=>({draw(){}})});
 const source=readFileSync(new URL('../experiments/quiet-workbench/game.mjs',import.meta.url),'utf8').replace(/^import .*\n/gm,'').replace(/^export /gm,'');
 vm.runInContext(source+'\nglobalThis.audit={frame,diagnostics,input:()=>JSON.stringify({keys:[...keys],touch:[...touch]})};',context);
 const key=(code,extra={})=>{const e={code,repeat:false,target:{closest:()=>null},prevented:false,preventDefault(){this.prevented=true},...extra};events.keydown(e);return e};
 const pointer=(key,type,id)=>{const b=buttons.find(b=>b.dataset.key===key),e={pointerId:id,preventDefault(){}};if(type==='pointerdown')b.onpointerdown(e);else for(const fn of b.handlers[type]||[])fn(e)};
 return{node,key,pointer,document,events,windowEvents,diag:()=>context.audit.diagnostics(),input:()=>JSON.parse(context.audit.input()),frame:()=>{now+=1000/60;context.audit.frame(now)}};
}
const f=fixture();f.node('#start').onclick();
for(const modifier of ['ctrlKey','metaKey','altKey'])for(const code of ['KeyP','KeyW','KeyA','KeyD']){const e=f.key(code,{[modifier]:true});assert.equal(e.prevented,false,`${modifier}+${code} must stay native`);assert.equal(f.diag().mode,'playing');assert.deepEqual(f.input().keys,[]);}
// Shift is intentionally gameplay input, and native button activation remains native.
f.key('ShiftLeft',{shiftKey:true});assert(f.input().keys.includes('ShiftLeft'));f.events.keyup({code:'ShiftLeft'});
const enter=f.key('Enter',{target:{closest:()=>({})}});assert.equal(enter.prevented,false);
f.key('KeyW');f.events.keyup({code:'KeyW',ctrlKey:true});assert.deepEqual(f.input().keys,[]);
// Each pointer owns only its own hold; cancel/lost capture cannot release another.
f.pointer('KeyD','pointerdown',1);f.pointer('ShiftLeft','pointerdown',2);assert.equal(f.input().touch.length,2);f.frame();f.pointer('KeyD','pointerup',1);assert.deepEqual(f.input().touch,[[2,'ShiftLeft']]);
f.pointer('KeyA','pointerdown',3);f.pointer('ShiftLeft','pointercancel',2);assert.deepEqual(f.input().touch,[[3,'KeyA']]);f.pointer('KeyA','lostpointercapture',3);assert.deepEqual(f.input().touch,[]);
f.pointer('KeyD','pointerdown',4);f.pointer('KeyD','pointerdown',5);f.pointer('KeyD','pointerup',4);assert.deepEqual(f.input().touch,[[5,'KeyD']]);
f.key('KeyW');f.key('KeyP');assert.equal(f.diag().mode,'paused');assert.deepEqual(f.input(),{keys:[],touch:[]});const frozen=JSON.stringify(f.diag());f.frame();assert.equal(JSON.stringify(f.diag()),frozen);
f.pointer('KeyA','pointerdown',6);assert.deepEqual(f.input().touch,[]);f.key('KeyP',{repeat:true});assert.equal(f.diag().mode,'paused');f.key('KeyP');assert.equal(f.diag().mode,'playing');
f.key('KeyW');f.pointer('KeyD','pointerdown',7);f.windowEvents.blur();assert.equal(f.diag().mode,'paused');assert.deepEqual(f.input(),{keys:[],touch:[]});f.node('#start').onclick();f.key('KeyD');f.document.hidden=true;f.events.visibilitychange();assert.equal(f.diag().mode,'paused');assert.deepEqual(f.input(),{keys:[],touch:[]});f.document.hidden=false;f.events.visibilitychange();assert.equal(f.diag().mode,'paused');
// Drive a real tool collision to terminal, then repeat/retry through the actual UI handlers.
f.node('#retry').onclick();f.key('KeyW');for(let i=0;i<180&&f.diag().state==='playing';i++)f.frame();assert.equal(f.diag().state,'woke');assert.deepEqual(f.input(),{keys:[],touch:[]});assert.equal(f.node('#pause').disabled,true);
f.key('KeyW',{repeat:true});f.pointer('KeyD','pointerdown',8);f.node('#start').onclick();assert.equal(f.diag().state,'playing');assert.deepEqual(f.input(),{keys:[],touch:[]});assert.deepEqual(Array.from(f.diag().player.position),ROOM.spawn);f.frame();assert.equal(f.diag().player.velocity[0],0);assert.equal(f.diag().player.velocity[2],0);
console.log(JSON.stringify({passed:true,kind:'actual keyboard/pointer/controller handlers with DOM/render fixtures; no browser',checks:['Ctrl/Meta/Alt native shortcuts','Shift brake','native Enter','modified keyup','independent multi-touch','pointer cancel/lost capture','pause-repeat and frozen time','blur and visibility','real collision terminal','retry clears buffered input']}));
