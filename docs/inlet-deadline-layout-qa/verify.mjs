// Executes the unchanged shipped bundle with DOM/canvas/storage fixtures.
// This does not compute browser pixels or certify responsive layout.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import vm from 'node:vm';
const html=readFileSync(new URL('../../experiments/inlet-deadline-preview/index.html',import.meta.url),'utf8');
const baseline=JSON.parse(readFileSync(new URL('before-contract.json',import.meta.url),'utf8'));
const scripts=[...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)].map(m=>m[1]);
const hash=s=>createHash('sha256').update(s).digest('hex');
assert.deepEqual(scripts.map(hash),baseline.script_sha256,'whole executable bundle unchanged');
const tags=[...html.replace(/<script\b[\s\S]*?<\/script>/g,'').matchAll(/<([a-z][\w:-]*)\b([^>]*)>/gi)];
const ids=new Map(),attrs=text=>Object.fromEntries([...text.matchAll(/([^\s=\/]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g)].map(m=>[m[1],m[2]??m[3]??m[4]??null]));
const interactive=[];
for(const [,tag,text]of tags){const a=attrs(text);if(!a.id)continue;assert(!ids.has(a.id));ids.set(a.id,{tag:tag.toLowerCase(),attributes:a});if(['a','button','canvas','input','select','textarea'].includes(tag)||'tabindex'in a)interactive.push(a.id);}
assert.equal(ids.size,Object.keys(baseline.ids).length);
for(const [id,node]of Object.entries(baseline.ids)){assert.deepEqual(ids.get(id).attributes,node.attributes);if(id!=='preview-note')assert.equal(ids.get(id).tag,node.tag);}
assert.equal(ids.get('preview-note').tag,'details');assert.deepEqual(interactive,baseline.interactive_order);
assert(/<summary><strong>[^<]*未完成真实 UI 验收/.test(html));
const css=[...html.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/g)].map(m=>m[1]).join('\n');
const patch=css.slice(css.indexOf('/* Keep the chart, live status'));
assert(patch.includes('.control-deck .phase-label{flex:0 0 100%'));
assert(patch.includes('flex:1 0 5rem;min-width:5rem;white-space:nowrap;word-break:keep-all'));
assert(patch.includes('.control-deck .draw-console{display:contents}'));
assert(patch.includes('.play-console .preview-directions{grid-template-columns:repeat(2,minmax(0,1fr))}'));
assert(patch.includes('.play-console .telemetry{order:1;position:sticky;top:0;'));
assert(patch.includes('.play-console .threat-preview{order:6}'));
assert(/#battlefield\{[^}]*aspect-ratio:11\/8/.test(css));
const sizing=[320,390].map(width=>{
 const controlInner=width-24-24-2,minButtons=3*80+2*7;
 assert(minButtons<=controlInner,'three complete 5rem buttons fit the full control row at default root size');
 assert(3*44+2*2<=140,'direction pad fits its allocated column');
 return{viewport:width,controlInner,minButtons,scope:'CSS constraint arithmetic, not measured DOM'};
});
const KEY=baseline.storage_key;
function fixture(storage=new Map([['classic-atlas.preview.inlet-v3-threat.v1','formal sentinel'],['classic-atlas.inlet.v1','legacy sentinel']])){
 const nodes=new Map(),events={},windowEvents={},reads=[],writes=[];let now=1000,nextFrame,focused='';
 const context2d=new Proxy({measureText:t=>({width:String(t).length*8}),createLinearGradient:()=>({addColorStop(){}}),createRadialGradient:()=>({addColorStop(){}})},{get:(o,k)=>k in o?o[k]:(()=>{}),set:(o,k,v)=>(o[k]=v,true)});
 function element(tag='div',a={}){
  const classes=new Set((a.class||'').split(/\s+/)),children=[];
  return{tagName:tag.toUpperCase(),attributes:{...a},dataset:Object.fromEntries(Object.entries(a).filter(([k])=>k.startsWith('data-')).map(([k,v])=>[k.slice(5).replace(/-([a-z])/g,(_,c)=>c.toUpperCase()),v])),hidden:'hidden'in a,open:false,disabled:'disabled'in a,textContent:'',innerHTML:'',handlers:{},children,style:{},
   classList:{add:x=>classes.add(x),remove:x=>classes.delete(x),toggle(x,on){if(on)classes.add(x);else classes.delete(x);},contains:x=>classes.has(x)},
   setAttribute(k,v){this.attributes[k]=String(v);},getAttribute(k){return this.attributes[k];},
   addEventListener(k,f){this.handlers[k]=f;},focus(){focused=a.id||tag;},showModal(){this.open=true;},close(){this.open=false;},scrollIntoView(){},setPointerCapture(){},
   getContext:()=>context2d,getBoundingClientRect:()=>({left:0,top:0,right:44,bottom:44,width:44,height:44}),
   replaceChildren(...items){children.splice(0,children.length,...items);},appendChild(x){children.push(x);},append(...items){children.push(...items);},
   querySelector(sel){if(!this.parts)this.parts=new Map();if(!this.parts.has(sel))this.parts.set(sel,element());return this.parts.get(sel);},
   closest(selector){return selector.split(',').some(t=>t.trim()===tag)?this:null;}
  };
 }
 for(const [id,x]of ids)nodes.set('#'+id,element(x.tag,x.attributes));
 const dir=[...nodes.values()].filter(n=>'dir'in n.dataset),preview=[...nodes.values()].filter(n=>'previewDir'in n.dataset);
 const document={hidden:false,querySelector:s=>s==='dialog[open]'?[...nodes.values()].find(n=>n.open)||null:nodes.get(s),querySelectorAll:s=>s==='[data-dir]'?dir:s==='[data-preview-dir]'?preview:[],addEventListener:(t,f)=>events[t]=f,createElement:tag=>element(tag)};
 const localStorage={getItem(k){reads.push(k);return storage.get(k)??null;},setItem(k,v){writes.push(k);storage.set(k,v);},removeItem(k){writes.push(k);storage.delete(k);}};
 const context=vm.createContext({document,window:{addEventListener:(t,f)=>windowEvents[t]=f},localStorage,performance:{now:()=>now},requestAnimationFrame:f=>nextFrame=f,devicePixelRatio:1,console});
 vm.runInContext(scripts[0],context,{filename:'unchanged-inlet-preview.js'});
 const click=id=>{const f=nodes.get('#'+id).onclick;assert.equal(typeof f,'function');f();};
 const step=()=>{now+=20;const f=nextFrame;f(now);};
 return{nodes,events,windowEvents,reads,writes,storage,click,step,diagnostics:()=>JSON.parse(JSON.stringify(context.InletPreview.diagnostics())),get focus(){return focused;},summary:()=>element('summary')};
}
const f=fixture();assert.equal(f.diagnostics().state,'ready');f.click('start');assert.equal(f.diagnostics().state,'playing');
let prevented=false;f.events.keydown({code:'Space',target:f.summary(),preventDefault(){prevented=true;}});assert.equal(prevented,false,'native boundary disclosure keeps its key');
f.events.keydown({code:'ArrowRight',target:f.nodes.get('#battlefield'),preventDefault(){}});for(let i=0;i<12;i++)f.step();f.events.keyup({code:'ArrowRight'});
f.click('pause');assert.equal(f.diagnostics().state,'paused');assert.equal(f.diagnostics().input.keys.length,0);
const paused=f.diagnostics(),raw=f.storage.get(KEY);assert(raw);
f.click('help');assert(f.nodes.get('#help-dialog').open);f.click('close-help');assert(!f.nodes.get('#help-dialog').open);assert.equal(f.diagnostics().state,'paused');
f.click('retry');assert(f.nodes.get('#retry-dialog').open);f.click('retry-no');assert.equal(f.diagnostics().time,paused.time);
const reloaded=fixture(new Map(f.storage));assert.equal(reloaded.diagnostics().state,'paused');assert.deepEqual(reloaded.diagnostics().player,paused.player);assert.equal(reloaded.diagnostics().time,paused.time);
assert([...f.reads,...f.writes,...reloaded.reads,...reloaded.writes].every(k=>k===KEY));
assert.equal(f.storage.get('classic-atlas.preview.inlet-v3-threat.v1'),'formal sentinel');assert.equal(f.storage.get('classic-atlas.inlet.v1'),'legacy sentinel');
const report={passed:true,scope:'unchanged executable HTML bundle with synthetic DOM/canvas/storage, static constraints only; not browser layout or human play acceptance',htmlSha256:hash(html),scriptSha256:scripts.map(hash),idsPreserved:ids.size,interactiveOrderPreserved:true,storageKey:KEY,onlyOwnKeyReadWritten:true,pauseRefreshCheckpointPreserved:true,manualAndRetryCancelWired:true,nativeSummaryNotHijacked:true,sizing,qaPending:['desktop whole chart plus timer/lives/primary controls simultaneously','390x844 actual button labels, wrap, sticky state and chart dimensions','preview-card effect, scroll/focus/zoom and touch in real browser']};
writeFileSync(new URL('report.json',import.meta.url),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));

