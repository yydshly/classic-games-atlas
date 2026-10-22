// Offline controller fixtures; these are not browser play or injected public state.
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs';
import * as engine from '../../versions/v2/games/coaster/engine.mjs';
import * as progress from '../../versions/v2/games/coaster/progress.mjs';
const source=fs.readFileSync(new URL('../../versions/v2/games/coaster/game.mjs',import.meta.url),'utf8');
function fixture(modules=[]){const g=engine.createGame(0);for(const [segment,module]of modules)assert.equal(engine.command(g,{type:'module',segment,module}).ok,true);assert.equal(engine.command(g,'test').ok,true);for(let n=0;n<18000&&g.state==='testing';n++)engine.step(g,engine.FIXED_DT);assert.equal(g.state,'design');assert.ok(g.report);return g;}
class Element{
 constructor(tag,doc){this.tagName=tag.toUpperCase();this.doc=doc;this._id='';this.children=[];this.dataset={};this.style={};this.hidden=false;this.open=false;this.disabled=false;this.handlers={};this.attributes={};this.textContent='';this.classList={toggle(){}};}
 set id(value){this._id=value;if(value)this.doc.nodes.set(value,this);}get id(){return this._id;}
 append(...nodes){this.children.push(...nodes);}
 addEventListener(type,fn){(this.handlers[type]??=[]).push(fn);}
 setAttribute(k,v){this.attributes[k]=String(v);}
 getContext(){return{};}
 focus(options){this.doc.activeElement=this;this.doc.focuses.push({id:this.id,options});}
 scrollIntoView(options){this.doc.scrolls.push({id:this.id,options});}
 click(){for(const fn of this.handlers.click||[])fn({target:this,currentTarget:this});}
 key(code){const event={code,target:this,preventDefault(){this.defaultPrevented=true;}};for(const fn of this.handlers.keydown||[])fn(event);}
 showModal(){this.open=true;}close(){this.open=false;}
}
async function harness(initial){
 const document={nodes:new Map(),activeElement:null,focuses:[],scrolls:[],body:{dataset:{}},handlers:{},getElementById(id){if(!this.nodes.has(id)){const e=new Element(id==='park'?'canvas':id==='track-workshop'?'section':'div',this);e.id=id;}return this.nodes.get(id);},createElement(tag){return new Element(tag,this);},createTextNode(text){const e=new Element('text',this);e.textContent=text;return e;},addEventListener(t,fn){(this.handlers[t]??=[]).push(fn);}};const $=id=>document.getElementById(id),data=new Map(),commands=[];let writes=0,removes=0,clock=0,queue=[];
 const memory={getItem:k=>data.get(k)??null,setItem(k,v){writes++;data.set(k,v);},removeItem(k){removes++;data.delete(k);}},values={...engine,createGame:()=>initial,command(g,input){commands.push(JSON.parse(JSON.stringify(input)));return engine.command(g,input);}};
 const context=vm.createContext({document,window:{localStorage:memory,matchMedia:()=>({matches:false}),addEventListener(){}},performance:{now:()=>clock},requestAnimationFrame:fn=>queue.push(fn),console});const module=new vm.SourceTextModule(source,{context});await module.link(async spec=>{const obj=spec.includes('progress')?progress:spec.includes('renderer')?{render(){},hitSegment:()=>null}:values;return new vm.SyntheticModule(Object.keys(obj),function(){for(const[k,v]of Object.entries(obj))this.setExport(k,v);},{context});});await module.evaluate();
 return{$,snap:()=>JSON.parse(JSON.stringify(module.namespace.diagnostics())),counts:()=>({writes,removes,commands:JSON.parse(JSON.stringify(commands))}),bytes:()=>JSON.stringify([...data]),focus:()=>document.focuses.at(-1),scrolls:()=>document.scrolls,tick(n){for(let i=0;i<n;i++){clock+=80;queue.shift()(clock);}}};
}
let groups=0;async function test(name,fn){await fn();console.log(`PASS ${++groups}: ${name}`);}
await test('same-segment diagnosis brings workshop context with no model/save changes',async()=>{const h=await harness(fixture()),before=h.snap(),counts=h.counts(),bytes=h.bytes();h.$('diagnosis-0').click();assert.deepEqual(h.snap(),before);assert.deepEqual(h.counts(),counts);assert.equal(h.bytes(),bytes);assert.equal(h.focus().id,'track-workshop');assert.equal(h.focus().options.preventScroll,true);assert.equal(h.scrolls().length,1);assert.equal(h.scrolls()[0].options.block,'start');});
await test('different segment only performs original selection and retains certification/economics',async()=>{const h=await harness(fixture([[0,'lift']])),before=h.snap(),counts=h.counts();assert.equal(h.$('diagnosis-0').dataset.segment,'11');h.$('diagnosis-0').click();const s=h.snap();assert.equal(s.selectedSegment,11);for(const key of['report','modules','heightOffsets','cash','cost','runs','revenue','reputation','best','unlocked'])assert.deepEqual(s[key],before[key]);const calls=h.counts().commands.slice(counts.commands.length);assert.deepEqual(calls,[{type:'select',segment:11}]);assert.equal(h.counts().writes,counts.writes+1);assert.equal(h.focus().id,'track-workshop');});
await test('twenty repeated requests and idle HUD refreshes cannot repair, retest or pay',async()=>{const h=await harness(fixture([[0,'lift']]));h.$('diagnosis-0').click();const s=h.snap(),counts=h.counts(),bytes=h.bytes();for(let i=0;i<20;i++)h.$('diagnosis-0').click();h.tick(30);assert.deepEqual(h.snap(),s);assert.deepEqual(h.counts(),counts);assert.equal(h.bytes(),bytes);assert.equal(h.focus().id,'track-workshop');assert.equal(h.scrolls().length,21);});
await test('out-of-range and malformed dataset cannot move focus or touch model',async()=>{for(const segment of['99','-1','bad','1.5']){const h=await harness(fixture()),s=h.snap(),counts=h.counts();h.$('diagnosis-0').dataset.segment=segment;h.$('diagnosis-0').click();assert.deepEqual(h.snap(),s);assert.deepEqual(h.counts(),counts);assert.equal(h.focus(),undefined);assert.equal(h.scrolls().length,0);}});
await test('open modal blocks diagnostic navigation',async()=>{const h=await harness(fixture()),s=h.snap(),counts=h.counts();h.$('help-dialog').open=true;h.$('diagnosis-0').click();assert.deepEqual(h.snap(),s);assert.deepEqual(h.counts(),counts);assert.equal(h.scrolls().length,0);});
await test('ordinary index arrow navigation retains its existing grid focus behavior',async()=>{const h=await harness(fixture());h.$('segment-0').key('ArrowRight');assert.equal(h.snap().selectedSegment,1);assert.equal(h.focus().id,'segment-1');assert.equal(h.scrolls().length,0);});
await test('certified report has no invented segment action and no auto-opening income',async()=>{const h=await harness(fixture([[0,'lift'],[11,'brake']])),s=h.snap(),counts=h.counts();assert.equal(s.report.approved,true);for(let i=0;i<48;i++)assert.equal(h.$(`diagnosis-${i}`).hidden,true);h.$('diagnosis-0').click();assert.deepEqual(h.snap(),s);assert.deepEqual(h.counts(),counts);assert.equal(s.runs,0);assert.equal(s.revenue,0);assert.equal(s.state,'design');});
console.log(`${groups} controller fixture groups passed; geometry and real play checked separately.`);
