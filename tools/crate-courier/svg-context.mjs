// Offline Canvas2D command recorder; deliberately fails on unhandled methods.
// No browser launch, emulated input, DOM layout or performance evidence.
const esc=s=>String(s).replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
export function recordingCanvas(width,height){
  let state={fillStyle:'#000',strokeStyle:'#000',lineWidth:1,globalAlpha:1,m:[1,0,0,1,0,0],font:'12px sans-serif',textAlign:'left'},stack=[],d='',parts=[],gradients=[];
  function ink(value,kind){if(value?.id)return `${kind}="url(#${value.id})" ${kind}-opacity="${state.globalAlpha}"`;const m=/^#([\da-f]{6})([\da-f]{2})$/i.exec(value||'');return `${kind}="${esc(m?'#'+m[1]:value||'none')}" ${kind}-opacity="${state.globalAlpha*(m?parseInt(m[2],16)/255:1)}"`;}
  const transform=()=>`transform="matrix(${state.m.join(' ')})"`;
  const emit=kind=>parts.push(`<path d="${d}" ${transform()} ${ink(kind==='fill'?state.fillStyle:'none','fill')} ${ink(kind==='stroke'?state.strokeStyle:'none','stroke')} stroke-width="${state.lineWidth}" stroke-linecap="round" stroke-linejoin="round"/>`);
  const methods={
    save(){stack.push({...state,m:[...state.m]});},restore(){if(!stack.length)throw Error('unbalanced restore');state=stack.pop();},setTransform(a,b,c,d,e,f){state.m=[a,b,c,d,e,f];},
    translate(x,y){const[a,b,c,d,e,f]=state.m;state.m=[a,b,c,d,e+a*x+c*y,f+b*x+d*y];},scale(x,y){const[a,b,c,d,e,f]=state.m;state.m=[a*x,b*x,c*y,d*y,e,f];},rotate(t){const[a,b,c,d,e,f]=state.m,C=Math.cos(t),S=Math.sin(t);state.m=[a*C+c*S,b*C+d*S,-a*S+c*C,-b*S+d*C,e,f];},
    clearRect(){parts=[];gradients=[];},beginPath(){d='';},moveTo(x,y){d+=`M${x},${y} `;},lineTo(x,y){d+=`L${x},${y} `;},quadraticCurveTo(a,b,c,e){d+=`Q${a},${b} ${c},${e} `;},closePath(){d+='Z ';},
    roundRect(x,y,w,h,r){d+=`M${x+r},${y} H${x+w-r} Q${x+w},${y} ${x+w},${y+r} V${y+h-r} Q${x+w},${y+h} ${x+w-r},${y+h} H${x+r} Q${x},${y+h} ${x},${y+h-r} V${y+r} Q${x},${y} ${x+r},${y} Z `;},
    ellipse(x,y,rx,ry,rotation){if(rotation)throw Error('rotated ellipse unsupported');d+=`M${x-rx},${y} A${rx},${ry} 0 1 0 ${x+rx},${y} A${rx},${ry} 0 1 0 ${x-rx},${y} Z `;},
    fill:()=>emit('fill'),stroke:()=>emit('stroke'),fillRect(x,y,w,h){parts.push(`<rect x="${x}" y="${y}" width="${w}" height="${h}" ${transform()} ${ink(state.fillStyle,'fill')}/>`);},
    fillText(text,x,y){const size=/([\d.]+)px/.exec(state.font)?.[1]||12;parts.push(`<text x="${x}" y="${y}" ${transform()} font-size="${size}" font-family="sans-serif" text-anchor="${state.textAlign==='center'?'middle':state.textAlign==='right'?'end':'start'}" ${ink(state.fillStyle,'fill')}>${esc(text)}</text>`);},
    createLinearGradient(x1,y1,x2,y2){const g={id:'gradient'+gradients.length,x1,y1,x2,y2,stops:[],addColorStop(offset,color){this.stops.push({offset,color});}};gradients.push(g);return g;}
  };
  const ctx=new Proxy(methods,{get(o,k){if(k in o)return o[k];if(k in state)return state[k];throw Error('unrecorded Canvas operation '+String(k));},set(o,k,v){state[k]=v;return true;}});
  return {width,height,getContext:()=>ctx,svg(){if(stack.length)throw Error('unbalanced save');return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><defs>${gradients.map(g=>`<linearGradient id="${g.id}" gradientUnits="userSpaceOnUse" x1="${g.x1}" y1="${g.y1}" x2="${g.x2}" y2="${g.y2}">${g.stops.map(s=>`<stop offset="${s.offset}" stop-color="${s.color}"/>`).join('')}</linearGradient>`).join('')}</defs>${parts.join('')}</svg>`;}};
}
