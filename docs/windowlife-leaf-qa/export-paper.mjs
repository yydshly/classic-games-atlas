// Offline recording of the real PaperRenderer's Canvas2D instructions.
// This is not a browser screenshot, DOM layout measurement or player test.
import {mkdirSync,writeFileSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {PaperRenderer} from '../../experiments/windowlife-request-preview/source/view.mjs';
import {createScene,command,update,activePaper,snapshot} from '../../experiments/windowlife-request-preview/source/scene.mjs';
const escape=s=>String(s).replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
function canvas() {
  let state={fillStyle:'#000',strokeStyle:'#000',lineWidth:1,globalAlpha:1,tx:0,ty:0,font:'12px sans-serif',textAlign:'left'},stack=[],d='',parts=[];
  const ink=(color,kind)=>{const hex=/^#([\da-f]{6})([\da-f]{2})$/i.exec(color||'');return `${kind}="${escape(hex?'#'+hex[1]:color||'none')}" ${kind}-opacity="${state.globalAlpha*(hex?parseInt(hex[2],16)/255:1)}"`;};
  const transform=()=>`transform="translate(${state.tx} ${state.ty})"`;
  const emit=kind=>parts.push(`<path d="${d}" ${transform()} ${ink(kind==='fill'?state.fillStyle:'none','fill')} ${ink(kind==='stroke'?state.strokeStyle:'none','stroke')} stroke-width="${state.lineWidth}" stroke-linecap="round" stroke-linejoin="round"/>`);
  const methods={save(){stack.push({...state});},restore(){state=stack.pop();},translate(x,y){state.tx+=x;state.ty+=y;},clearRect(){parts=[];},beginPath(){d='';},
    moveTo(x,y){d+=`M${x},${y} `;},lineTo(x,y){d+=`L${x},${y} `;},quadraticCurveTo(a,b,c,e){d+=`Q${a},${b} ${c},${e} `;},closePath(){d+='Z ';},
    roundRect(x,y,w,h,r){d+=`M${x+r},${y} H${x+w-r} Q${x+w},${y} ${x+w},${y+r} V${y+h-r} Q${x+w},${y+h} ${x+w-r},${y+h} H${x+r} Q${x},${y+h} ${x},${y+h-r} V${y+r} Q${x},${y} ${x+r},${y} Z `;},
    ellipse(x,y,rx,ry){d+=`M${x-rx},${y} A${rx},${ry} 0 1 0 ${x+rx},${y} A${rx},${ry} 0 1 0 ${x-rx},${y} Z `;},
    fill:()=>emit('fill'),stroke:()=>emit('stroke'),fillRect(x,y,w,h){parts.push(`<rect x="${x}" y="${y}" width="${w}" height="${h}" ${transform()} ${ink(state.fillStyle,'fill')}/>`);},
    fillText(text,x,y){const size=/([\d.]+)px/.exec(state.font)?.[1]||12;parts.push(`<text x="${x}" y="${y}" ${transform()} font-size="${size}" font-family="sans-serif" text-anchor="${state.textAlign==='center'?'middle':state.textAlign==='right'?'end':'start'}" dominant-baseline="middle" ${ink(state.fillStyle,'fill')}>${escape(text)}</text>`);}};
  const ctx=new Proxy(methods,{get:(o,k)=>k in o?o[k]:state[k],set:(o,k,v)=>(state[k]=v,true)});
  return {getContext:()=>ctx,svg:()=>`<svg xmlns="http://www.w3.org/2000/svg" width="600" height="480" viewBox="0 0 600 480"><rect width="600" height="480" fill="#eee8d9"/>${parts.join('')}</svg>`};
}
export function renderPaperSVG(g,target,draft=null,RendererImpl=PaperRenderer){const c=canvas();new RendererImpl(c).draw(g,target,draft);return c.svg();}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
const LEFT={x1:250,y1:730,x2:410,y2:350},RIGHT={x1:730,y1:650,x2:580,y2:260};
const scenarios=[['joint-left','now',[LEFT],false],['joint-right','now',[RIGHT],false],['joint-finished','now',[LEFT,RIGHT],true],['quiet-finished','alone',[RIGHT],true]];
const directory=process.argv[2];if(!directory)throw Error('usage: node export-paper.mjs /tmp/windowlife-paper-review');mkdirSync(directory,{recursive:true});
const evidence=[];
for(const [id,choice,marks,finish]of scenarios) {
  const g=createScene();command(g,'start');command(g,choice);while(!activePaper(g))update(g,.1);
  for(const mark of marks){command(g,'mark',mark);for(let i=0;i<8;i++)update(g,.1);}if(finish){command(g,'finish-paper');for(let i=0;i<500&&g.state==='playing';i++)update(g,.1);}
  const target=choice==='now'?'sketch':'note',c=canvas();new PaperRenderer(c).draw(g,target);writeFileSync(path.join(directory,id+'.svg'),c.svg());evidence.push({id,choice,input:marks,finish,snapshot:snapshot(g)});
}
writeFileSync(path.join(directory,'states.json'),JSON.stringify({scope:'legal model commands and offline Canvas2D-to-SVG recording; not browser pixels',evidence},null,2)+'\n');
console.log(JSON.stringify({outputDirectory:directory,files:scenarios.map(x=>x[0]+'.svg')}));
}
