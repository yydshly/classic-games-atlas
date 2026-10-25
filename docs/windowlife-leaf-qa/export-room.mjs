// Offline room-only recording of the real Renderer, not page layout/browser QA.
import {mkdirSync,writeFileSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {Renderer} from '../../experiments/windowlife-request-preview/source/view.mjs';
import {createScene,command,update,activePaper,snapshot} from '../../experiments/windowlife-request-preview/source/scene.mjs';
const escape=s=>String(s).replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
function canvas() {
  let state={fillStyle:'#000',strokeStyle:'#000',lineWidth:1,globalAlpha:1,m:[1,0,0,1,0,0],font:'12px sans-serif',textAlign:'left',clip:null},stack=[],d='',parts=[],gradients=[],clips=[];
  const color=(value,kind)=>{if(value?.gradient)return `${kind}="url(#${value.gradient})" ${kind}-opacity="${state.globalAlpha}"`;let color=value||'none',alpha=1;const m=/^#([\da-f]{6})([\da-f]{2})$/i.exec(color),short=/^#([\da-f]{3})([\da-f])$/i.exec(color);if(m){color='#'+m[1];alpha=parseInt(m[2],16)/255;}else if(short){color='#'+short[1];alpha=parseInt(short[2]+short[2],16)/255;}return `${kind}="${escape(color)}" ${kind}-opacity="${state.globalAlpha*alpha}"`;};
  const transform=()=>`transform="matrix(${state.m.join(' ')})"`;
  const append=part=>parts.push(state.clip?`<g clip-path="url(#${state.clip})">${part}</g>`:part);
  const emit=kind=>append(`<path d="${d}" ${transform()} ${color(kind==='fill'?state.fillStyle:'none','fill')} ${color(kind==='stroke'?state.strokeStyle:'none','stroke')} stroke-width="${state.lineWidth}" stroke-linecap="round" stroke-linejoin="round"/>`);
  const methods={save(){stack.push({...state,m:[...state.m]});},restore(){state=stack.pop();},translate(x,y){const [a,b,c,e,f,g]=state.m;state.m=[a,b,c,e,f+a*x+c*y,g+b*x+e*y];},scale(x,y){const [a,b,c,d,e,f]=state.m;state.m=[a*x,b*x,c*y,d*y,e,f];},rotate(t){const[a,b,c,d,e,f]=state.m,C=Math.cos(t),S=Math.sin(t);state.m=[a*C+c*S,b*C+d*S,-a*S+c*C,-b*S+d*C,e,f];},
    clearRect(){parts=[];gradients=[];clips=[];},beginPath(){d='';},moveTo(x,y){d+=`M${x},${y} `;},lineTo(x,y){d+=`L${x},${y} `;},quadraticCurveTo(a,b,c,e){d+=`Q${a},${b} ${c},${e} `;},closePath(){d+='Z ';},
    rect(x,y,w,h){d+=`M${x},${y} h${w} v${h} h${-w} Z `;},clip(){const id='clip'+clips.length;clips.push(`<clipPath id="${id}"><path d="${d}" ${transform()}/></clipPath>`);state.clip=id;},
    roundRect(x,y,w,h,r){d+=`M${x+r},${y} H${x+w-r} Q${x+w},${y} ${x+w},${y+r} V${y+h-r} Q${x+w},${y+h} ${x+w-r},${y+h} H${x+r} Q${x},${y+h} ${x},${y+h-r} V${y+r} Q${x},${y} ${x+r},${y} Z `;},
    ellipse(x,y,rx,ry){d+=`M${x-rx},${y} A${rx},${ry} 0 1 0 ${x+rx},${y} A${rx},${ry} 0 1 0 ${x-rx},${y} Z `;},
    fill:()=>emit('fill'),stroke:()=>emit('stroke'),fillRect(x,y,w,h){parts.push(`<rect x="${x}" y="${y}" width="${w}" height="${h}" ${transform()} ${color(state.fillStyle,'fill')}/>`);},
    fillText(text,x,y){const size=/([\d.]+)px/.exec(state.font)?.[1]||12;parts.push(`<text x="${x}" y="${y}" ${transform()} font-size="${size}" font-family="sans-serif" text-anchor="${state.textAlign==='center'?'middle':state.textAlign==='right'?'end':'start'}" dominant-baseline="middle" ${color(state.fillStyle,'fill')}>${escape(text)}</text>`);},
    createLinearGradient(x1,y1,x2,y2){const item={gradient:'gradient'+gradients.length,x1,y1,x2,y2,stops:[],addColorStop(offset,color){this.stops.push({offset,color});}};gradients.push(item);return item;}};
  const ctx=new Proxy(methods,{get:(o,k)=>{if(k in o)return o[k];if(k in state)return state[k];throw Error('Unrecorded Canvas operation '+String(k));},set:(o,k,v)=>(state[k]=v,true)});
  const stop=s=>{const m=/^#([\da-f]{6})([\da-f]{2})$/i.exec(s.color);return `<stop offset="${s.offset}" stop-color="${escape(m?'#'+m[1]:s.color)}" stop-opacity="${m?parseInt(m[2],16)/255:1}"/>`;};
  const defs=()=>clips.join('')+gradients.map(g=>`<linearGradient id="${g.gradient}" gradientUnits="userSpaceOnUse" x1="${g.x1}" y1="${g.y1}" x2="${g.x2}" y2="${g.y2}">${g.stops.map(stop).join('')}</linearGradient>`).join('');
  return {getContext:()=>ctx,svg:()=>`<svg xmlns="http://www.w3.org/2000/svg" width="900" height="650" viewBox="0 0 900 650"><defs>${defs()}</defs>${parts.join('')}</svg>`};
}
export function renderRoomSVG(g,options={},RendererImpl=Renderer){const c=canvas();new RendererImpl(c).draw(g,g.time,options);return c.svg();}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
const directory=process.argv[2];if(!directory)throw Error('usage: node export-room.mjs OUTPUT_DIR');mkdirSync(directory,{recursive:true});
const evidence=[];
for(const [name,choice,target]of [['joint-working','now','working'],['later-sharing','later','sharing'],['quiet-settled','alone','settled']]) {
  const g=createScene();command(g,'start');command(g,choice);while(!activePaper(g))update(g,.1);command(g,'mark',{x1:300,y1:700,x2:470,y2:350});
  if(target==='working')update(g,.4);else {command(g,'finish-paper');for(let i=0;i<500&&g.phase!==target;i++)update(g,.1);}
  const c=canvas();new Renderer(c).draw(g,g.time);writeFileSync(path.join(directory,name+'.svg'),c.svg());evidence.push({name,input:'start, '+choice+', mark; '+(target==='working'?'advance .4s':'finish, advance to '+target),snapshot:snapshot(g)});
}
writeFileSync(path.join(directory,'room-states.json'),JSON.stringify({scope:'model-driven room Canvas2D recording; no DOM, native browser, scroll or font equivalence',evidence},null,2)+'\n');
console.log(JSON.stringify({outputDirectory:directory,files:evidence.map(e=>e.name+'.svg')}));
}
