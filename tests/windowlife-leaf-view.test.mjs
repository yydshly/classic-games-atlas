import test from 'node:test';
import assert from 'node:assert/strict';
import {PaperRenderer} from '../experiments/windowlife-request-preview/source/view.mjs';
import {createScene,command,update,activePaper,snapshot} from '../experiments/windowlife-request-preview/source/scene.mjs';
import {penTips} from './helpers/windowlife-room-pen.mjs';
function drawing(g,target='sketch') {
  const paths=[];const ctx=new Proxy({},{get:(o,k)=>k in o?o[k]:(...args)=>paths.push([k,...args]),set:(o,k,v)=>{o[k]=v;paths.push([k,v]);return true;}});
  const canvas={getContext:()=>ctx};new PaperRenderer(canvas).draw(g,target);return paths;
}
const choose=()=>{const g=createScene();command(g,'start');command(g,'now');while(!activePaper(g))update(g,.1);return g;};
test('no input creates no leaf contours; actual placement changes the rendered paper paths',()=>{
  const a=choose(),b=choose();const idle=drawing(a);assert(!idle.some(x=>x.includes('#ad5f36')));
  command(a,'mark',{x1:250,y1:730,x2:410,y2:350});command(b,'mark',{x1:730,y1:650,x2:580,y2:260});update(a,.4);update(b,.4);
  const left=drawing(a),right=drawing(b);assert(left.some(x=>x.includes('#ad5f36')));assert.notDeepEqual(left,right);
  for(const line of [...left,...right])for(const item of line)if(typeof item==='number')assert(Number.isFinite(item));
});
test('repeated rendering cannot add ink, advance a response or mutate either artwork',()=>{
  const g=choose();command(g,'mark',{x1:250,y1:730,x2:410,y2:350});update(g,.3);const before=snapshot(g),first=drawing(g);
  for(let i=0;i<10;i++)assert.deepEqual(drawing(g),first);assert.deepEqual(g,before);
});
test('both drawing pen tips contact the actual room sheet throughout their gesture',()=>{
  const g=choose();command(g,'mark',{x1:250,y1:730,x2:410,y2:350});let sawBoth=false;
  for(let i=0;i<10;i++) {
    const {tips,paper}=penTips(g);if(tips.length===2)sawBoth=true;
    for(const {actor,point:[x,y]}of tips)assert(x>=paper.left&&x<=paper.right&&y>=paper.top&&y<=paper.bottom,JSON.stringify({actor,x,y,paper}));
    update(g,.1);
  }
  assert(sawBoth);
});
