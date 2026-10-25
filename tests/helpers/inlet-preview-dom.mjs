// Current inline-bundle DOM/canvas fixture. No historical script SHA is pinned.
// This executes events and storage but does not measure browser pixels.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const html=readFileSync(new URL('../../experiments/inlet-deadline-preview/index.html',import.meta.url),'utf8');
const scripts=[...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)].map(m=>m[1]);
assert.equal(scripts.length,1);
export const KEY='classic-atlas.preview.inlet-v3-deadline.970a268.v1';
const attrs=text=>Object.fromEntries([...text.matchAll(/([^\s=\/]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g)].map(m=>[m[1],m[2]??m[3]??m[4]??null]));
const ids=new Map();
for(const [,tag,text]of html.replace(/<script\b[\s\S]*?<\/script>/g,'').matchAll(/<([a-z][\w:-]*)\b([^>]*)>/gi)){
 const a=attrs(text);if(a.id)ids.set(a.id,{tag:tag.toLowerCase(),attributes:a});
}
export function fixture(storage=new Map([['classic-atlas.preview.inlet-v3-threat.v1','formal sentinel'],['classic-atlas.inlet.v1','legacy sentinel']])){
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
 vm.runInContext(scripts[0],context,{filename:'current-inlet-preview.js'});
 const click=id=>{const f=nodes.get('#'+id).onclick;assert.equal(typeof f,'function');f();};
 const step=()=>{now+=20;const f=nextFrame;f(now);};
 return{nodes,events,windowEvents,reads,writes,storage,click,step,diagnostics:()=>JSON.parse(JSON.stringify(context.InletPreview.diagnostics())),get focus(){return focused;},summary:()=>element('summary')};
}
