import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import * as T from '../experiments/kinetic/vendor/three.module.min.js';
import {buildWorkshop} from '../experiments/quiet-workbench-preview/scene.mjs';
import {QuietPresentation} from '../experiments/quiet-workbench-preview/presentation.mjs';
import {QuietWorld,ROOM} from '../experiments/quiet-workbench-preview/physics.mjs';
import {feedback} from '../experiments/quiet-workbench-preview/feedback.mjs';
const read=name=>readFileSync(new URL('../experiments/quiet-workbench-preview/'+name,import.meta.url),'utf8');
const viewSource=read('view.mjs').replace(/^import .*\n/gm,'').replace(/^export /gm,'');
const gameSource=read('game.mjs').replace(/^import .*\n/gm,'').replace(/^export /gm,'');
const css=read('style.css'),query='(max-width:700px) and (orientation:portrait)';
assert(css.includes('@media'+query+'{'),'live view and CSS use the identical media condition');
function fixture(viewport,rectForMode){
 const nodes=new Map(),events={},frames=[],sizes=[],queries=[];let focus='',now=1000;
 const media={get matches(){return viewport.width<=700&&viewport.height>=viewport.width;}};
 function el(sel){if(!nodes.has(sel))nodes.set(sel,{hidden:sel==='#result'||sel==='#touch-controls',disabled:false,textContent:'',dataset:{},handlers:{},
  focus(){focus=sel;},getContext(){return{};},getBoundingClientRect(){return rectForMode(document.body.dataset.mode,el('#result').hidden);},
  addEventListener(t,f){this.handlers[t]=f;},showModal(){this.open=true;},close(){this.open=false;this.handlers.close?.();}});return nodes.get(sel);}
 class Renderer{
  shadowMap={};setPixelRatio(){}setSize(w,h){sizes.push([w,h]);}
  render(scene,camera){scene.updateMatrixWorld(true);camera.updateMatrixWorld(true);frames.push({camera:camera.position.toArray(),quaternion:camera.quaternion.toArray(),station:scene.getObjectByName('repairer-station').position.toArray(),mode:document.body.dataset.mode});}
 }
 const createView=new Function('T','buildWorkshop','QuietPresentation','matchMedia',viewSource+'\nreturn createView;')({...T,WebGLRenderer:Renderer},buildWorkshop,QuietPresentation,q=>{queries.push(q);assert.equal(q,query);return media;});
 const document={body:{dataset:{}},hidden:false,querySelector:s=>s==='dialog[open]'?(el('#help-dialog').open?el('#help-dialog'):null):el(s),querySelectorAll:()=>[],addEventListener:(t,f)=>events[t]=f};
 const context=vm.createContext({document,window:{addEventListener(){},quietBootReady(){}},performance:{now:()=>now},requestAnimationFrame(){},location:{reload(){}},QuietWorld,ROOM,feedback,createView});
 vm.runInContext(gameSource+'\nglobalThis.check={frame,diagnostics};',context);
 const step=()=>{now+=1000/60;context.check.frame(now);};
 return{viewport,nodes,el,events,frames,sizes,queries,context,step,get focus(){return focus;}};
}
// These are actual r2 browser rectangles supplied by the parent, not estimates.
const terminal=fixture({width:699,height:650},(_mode,hidden)=>({width:699.33,height:hidden?544.41:480.64}));
terminal.el('#start').onclick();
terminal.events.keydown({code:'ArrowUp',target:{closest:()=>null},preventDefault(){},repeat:false});
for(let i=0;i<900&&terminal.context.check.diagnostics().state==='playing';i++)terminal.step();
assert.equal(terminal.context.check.diagnostics().state,'woke','normal real Cannon input reaches the reported terminal');
terminal.step();terminal.step();
assert(terminal.sizes.some(x=>x[0]===699&&x[1]===544)&&terminal.sizes.some(x=>x[0]===699&&x[1]===481));
assert(terminal.frames.every(x=>x.station.every(v=>v===0)&&x.camera[0]===5.5),'fixed landscape viewport never moves station on result height change');
let prevented=false;
terminal.events.keydown({code:'Enter',target:{closest:()=>terminal.el('#result-retry')},preventDefault(){prevented=true;},repeat:false});
assert.equal(prevented,false,'native Enter activation is retained');terminal.el('#result-retry').onclick();terminal.step();
assert.equal(terminal.context.check.diagnostics().state,'playing');assert.equal(terminal.context.check.diagnostics().noise,0);
assert(terminal.frames.every(x=>x.camera[0]===5.5),'retry retains the same viewport layout');
// Actual 699x900 active/pause sizes; opening/closing the manual retains pause.
const pause=fixture({width:699,height:900},mode=>({width:699.33,height:mode==='paused'?528.74:641.15}));
pause.el('#start').onclick();pause.step();pause.el('#pause').onclick();pause.step();
assert.equal(pause.context.check.diagnostics().mode,'paused');
pause.el('#help').onclick();pause.step();assert.equal(pause.focus,'#close-help');assert(pause.el('#help-dialog').open);
pause.el('#close-help').onclick();pause.step();assert.equal(pause.focus,'#help');assert.equal(pause.context.check.diagnostics().mode,'paused');
pause.el('#pause').onclick();pause.step();assert.equal(pause.context.check.diagnostics().mode,'playing');
assert(pause.sizes.some(x=>x[1]===641)&&pause.sizes.some(x=>x[1]===529));
assert(pause.frames.every(x=>x.camera[0]===-.875&&x.station[0]===-4.5));
// Fractional canvas sizes straddling the old threshold cannot select layout.
let shortHeight=280.49;
const narrow=fixture({width:390,height:844},()=>({width:390.33,height:shortHeight}));
for(const h of [280.49,280.51,281.01,585.33]){shortHeight=h;narrow.step();}
assert(narrow.frames.every(x=>x.camera[0]===-.875&&x.station[0]===-4.5));
const edge=fixture({width:700,height:900},()=>({width:699.49,height:544.41}));
assert.equal(edge.frames.at(-1).camera[0],-.875,'700px inclusion matches CSS, independent of canvas rounding');
edge.viewport.width=701;edge.step();assert.equal(edge.frames.at(-1).camera[0],5.5,'real viewport media changes still refit even with identical canvas size');
edge.viewport.width=390;edge.viewport.height=300;edge.step();assert.equal(edge.frames.at(-1).camera[0],5.5);
edge.viewport.height=844;edge.step();assert.equal(edge.frames.at(-1).camera[0],-.875,'real rotation restores portrait');
const desktop=fixture({width:1280,height:720},()=>({width:1280.25,height:614.41}));
assert.deepEqual(desktop.frames.at(-1).camera,[5.5,13,17]);
// The ID selector overrides inherited dark dialog text. Native focus rule remains.
const colors=css.match(/#start,#result-retry,#close-help\{([^}]+)\}/)[1];
const fg=colors.match(/(?:^|;)color:(#[0-9a-f]{6})/)[1],bg=colors.match(/(?:^|;)background:(#[0-9a-f]{6})/)[1];
function luminance(hex){const rgb=[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);return rgb[0]*.2126+rgb[1]*.7152+rgb[2]*.0722;}
const contrast=(Math.max(luminance(fg),luminance(bg))+.05)/(Math.min(luminance(fg),luminance(bg))+.05);
assert(contrast>=4.5);assert(css.includes('button:focus-visible')&&css.includes('outline:3px solid #ecc583'));
console.log(JSON.stringify({passed:true,scope:'real controller/Cannon with recording renderer, matchMedia and reported rectangle fixtures; not fresh browser UI acceptance',terminal:{viewport:[699,650],sizes:terminal.sizes,layoutSwitches:0,state:'real woke then native-button retry'},pause:{viewport:[699,900],sizes:pause.sizes,layoutSwitches:0,manualFocusAndPauseRetained:true},mediaBoundaryAndRotation:true,desktopCameraRetained:true,manualButton:{foreground:fg,background:bg,contrast},physicalStateInjected:false},null,2));
