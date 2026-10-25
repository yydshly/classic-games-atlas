// Records only real pen strokes after Canvas transforms; no room pixel claim.
import {Renderer,layout} from '../../experiments/windowlife-request-preview/source/view.mjs';
export function penTips(g) {
  let s={m:[1,0,0,1,0,0],strokeStyle:''},stack=[],points=[],tips=[];
  const transform=(x,y)=>[s.m[0]*x+s.m[2]*y+s.m[4],s.m[1]*x+s.m[3]*y+s.m[5]];
  const ctx=new Proxy({save(){stack.push({...s,m:[...s.m]});},restore(){s=stack.pop();},
    translate(x,y){s.m[4]+=s.m[0]*x+s.m[2]*y;s.m[5]+=s.m[1]*x+s.m[3]*y;},scale(x,y){s.m[0]*=x;s.m[1]*=x;s.m[2]*=y;s.m[3]*=y;},
    rotate(t){const[a,b,c,d,e,f]=s.m,C=Math.cos(t),S=Math.sin(t);s.m=[a*C+c*S,b*C+d*S,-a*S+c*C,-b*S+d*C,e,f];},
    beginPath(){points=[];},moveTo(x,y){points.push(transform(x,y));},lineTo(x,y){points.push(transform(x,y));},
    stroke(){if(['#c2764d','#52786f'].includes(s.strokeStyle))tips.push({actor:s.strokeStyle==='#c2764d'?'a':'b',point:points.at(-1)});},
    createLinearGradient:()=>({addColorStop(){}})}, {get:(o,k)=>k in o?o[k]:k in s?s[k]:(()=>{}),set:(o,k,v)=>(s[k]=v,true)});
  new Renderer({getContext:()=>ctx}).draw(g,g.time,{drawing:true});
  const l=layout(g),bench=g.objects.find(o=>o.id==='bench'),p=l.point(bench.x,bench.y),scale=l.tile/64;
  return {tips,paper:{left:p.x-21*scale,right:p.x+21*scale,top:p.y-8*scale,bottom:p.y+22*scale}};
}
