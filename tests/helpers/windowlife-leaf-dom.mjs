// Synthetic DOM and pointer fixture; no browser layout or native touch claim.
import assert from 'node:assert/strict';
import {mount} from '../../experiments/windowlife-request-preview/source/controller.mjs';
import {KEY} from '../../experiments/windowlife-request-preview/source/storage.mjs';
export function fixture(data=new Map(),mountImpl=mount) {
  const nodes=new Map(),docEvents={},winEvents={},reads=[],writes=[],pictures=[],roomPictures=[];let frame,stamp=0,deny=false,confirmation=true;
  const document={hidden:false,activeElement:null,getElementById(id){if(!nodes.has(id))nodes.set(id,node(id));return nodes.get(id);},createElement:tag=>node(tag),addEventListener:(t,f)=>docEvents[t]=f};
  function node(id){return {id,hidden:false,disabled:false,style:{},dataset:{},listeners:{},attributes:{},children:[],classList:{toggle(){}},
    addEventListener(t,f){this.listeners[t]=f;},setAttribute(k,v){this.attributes[k]=v;},replaceChildren(...a){this.children=a;},
    focus(){document.activeElement=this;},closest(){return ['paper-handle-start','paper-handle-end'].includes(id)?this:null;},
    getBoundingClientRect:()=>({left:0,top:0,width:320,height:250,right:320,bottom:250}),setPointerCapture(id){this.capture=id;},scrollIntoView(){this.scrolls=(this.scrolls||0)+1;}};}
  const storage={getItem(k){reads.push(k);return data.get(k)??null;},setItem(k,v){writes.push(k);if(deny)throw Error('quota');data.set(k,v);}};
  const window={addEventListener:(t,f)=>winEvents[t]=f,confirm:()=>confirmation};
  class Renderer{draw(g,clock,options){roomPictures.push({state:g.state,phase:g.phase,time:g.time,drawing:!!options?.drawing});}}
  class PaperRenderer{draw(g,target,draft){pictures.push(structuredClone({art:g.art,target,draft}));}}
  const api=mountImpl({document,window,storage,requestFrame:f=>frame=f,Renderer,PaperRenderer});
  const get=id=>document.getElementById(id),click=id=>get(id).listeners.click({target:get(id)});
  const step=(ms=100)=>{stamp+=ms;frame(stamp);};
  const key=(key,target='paper-input',extra={})=>get('paper-input').listeners.keydown({key,target:get(target),preventDefault(){},...extra});
  const pointer=(type,x,y,extra={})=>get('paper-input').listeners[type]({clientX:x,clientY:y,pointerId:1,pointerType:'mouse',target:get('paper-input'),preventDefault(){},...extra});
  const choose=type=>{click('toggle');click('choose-'+type);for(let i=0;i<50&&get('paper-input').attributes['aria-disabled']!=='false';i++)step();assert.equal(get('paper-input').attributes['aria-disabled'],'false');};
  return {api,data,get,click,step,key,pointer,choose,document,docEvents,winEvents,reads,writes,pictures,roomPictures,deny(v){deny=v;},confirm(v){confirmation=v;}};
}
