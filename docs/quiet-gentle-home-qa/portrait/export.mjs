// CPU-only scene projections. No browser, WebGL, DOM or viewport screenshot.
import * as T from '../../../experiments/kinetic/vendor/three.module.min.js';
import {buildWorkshop} from '../../../experiments/quiet-workbench-preview/scene.mjs';
import {QuietWorld,ROOM} from '../../../experiments/quiet-workbench-preview/physics.mjs';
import {QuietPresentation} from '../../../experiments/quiet-workbench-preview/presentation.mjs';
import {fallMarker} from '../../../experiments/quiet-workbench-preview/feedback.mjs';
import {batchStatic} from '../../../experiments/quiet-workbench-preview/batch.mjs';
import {project} from '../composition/project.mjs';
import {sequences,DT} from '../temporal/sequences.mjs';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
const source=readFileSync(new URL('before-scene.mjs.txt',import.meta.url),'utf8');
export const beforeBuild=new Function('T','fallMarker','batchStatic',source.replace(/^import .*\n/gm,'').replace('export function buildWorkshop','function buildWorkshop')+'\nreturn buildWorkshop;')(T,fallMarker,batchStatic);
export const BeforePresentation=new Function(readFileSync(new URL('before-presentation.mjs.txt',import.meta.url),'utf8').replace(/^export /gm,'')+'\nreturn QuietPresentation;')();
export function boundsPixels(object,camera,width,height){
 const points=[];object.updateWorldMatrix(true,true);camera.updateMatrixWorld(true);
 object.traverseVisible(o=>{if(!o.isMesh)return;const a=o.geometry.attributes.position;for(let i=0;i<a.count;i++)points.push(new T.Vector3().fromBufferAttribute(a,i).applyMatrix4(o.matrixWorld).project(camera));});
 return{width:(Math.max(...points.map(v=>v.x))-Math.min(...points.map(v=>v.x)))*width/2,height:(Math.max(...points.map(v=>v.y))-Math.min(...points.map(v=>v.y)))*height/2};
}
export function cases(){
 const runs=sequences(),ready=new QuietWorld().snapshot(),cases={ready:{snapshot:ready,poses:{before:new BeforePresentation().update(ready,0),after:new QuietPresentation().update(ready,0)}}};
 const motions={before:new BeforePresentation(),after:new QuietPresentation()};
 let firstImpact=-1;
 for(const frame of runs['light-recovery']){
  const poses=Object.fromEntries(Object.entries(motions).map(([k,m])=>[k,m.update(frame.snapshot,DT,{brake:!!frame.input.brake})]));
  if(firstImpact<0&&frame.snapshot.lastImpact)firstImpact=frame.index;
  if(firstImpact>=0&&frame.index===firstImpact+4){cases.tap={snapshot:frame.snapshot,poses,frame:frame.index,source:'real binary-control gentle tool impact plus four frames'};break;}
 }
 const fast=runs.dock.find(f=>f.snapshot.state==='playing'&&Math.hypot(f.snapshot.player.position[0],f.snapshot.player.position[2]+3.65)<.65&&Math.hypot(f.snapshot.player.velocity[0],f.snapshot.player.velocity[2])>=.55);
 cases.fast={snapshot:fast.snapshot,poses:{before:new BeforePresentation().update(fast.snapshot,0),after:new QuietPresentation().update(fast.snapshot,0)},source:'real binary-control too-fast approach'};
 const soft=new QuietWorld();let closest=Infinity,turn;
 for(const [x,z]of [[-4.9,3.7],[-4.9,-3.6],[0,-3.65]])for(let i=0;i<2400&&soft.state==='playing';i++){
  const p=soft.player.position,v=soft.player.velocity,dx=x-p.x,dz=z-p.z;if(Math.hypot(dx,dz)<.055&&Math.hypot(v.x,v.z)<.13)break;
  soft.step({x:Math.abs(dx)>.025?Math.sign(dx):0,z:Math.abs(dz)>.025?Math.sign(dz):0,brake:true},DT);
  const distance=Math.hypot(soft.player.position.x+2,soft.player.position.z+3.6);if(distance<closest){closest=distance;turn=soft.snapshot();}
 }
 if(soft.state!=='charged'||!turn)throw Error('real soft route did not complete');
 cases['soft-return']={snapshot:turn,poses:{before:new BeforePresentation().update(turn,0),after:new QuietPresentation().update(turn,0)},source:'real binary-control soft route at the far screwdriver-tray return; route ends charged with unchanged physics'};
 return cases;
}
if(process.argv.includes('--export')){
 const output=new URL('../../../.local/quiet-portrait-static/',import.meta.url);mkdirSync(output,{recursive:true});
 const samples=cases(),report={base:'d9246fd7fc42657adf6619e7cb9cef7f52a929e1',method:'actual Three geometry and real Cannon snapshots, CPU projection only; not browser or CSS layout evidence',canvasWidth:390,canvasHeight:560,viewportRecheck:'390x844 browser viewport; actual canvas rectangle must be measured there',cases:{},states:samples};
 for(const [state,width,height,variants]of [['ready',390,560,['before','after']],['fast',390,560,['after']],['soft-return',390,560,['before','after']],['tap',1280,800,['before','after']]]){
  report.cases[state]={};
  for(const variant of variants){
   const w=(variant==='before'?beforeBuild:buildWorkshop)(ROOM);w.fit(width,height);w.pose(samples[state].snapshot,samples[state].poses[variant]);w.scene.updateMatrixWorld(true);
   const data=project(w.scene,w.camera);for(const t of data.triangles)t.p=t.p.map((n,i)=>n*(i%2?height/800:width/1280));data.width=width;data.height=height;
   writeFileSync(new URL(state+'-'+variant+'.geometry.json',output),JSON.stringify(data));
   report.cases[state][variant]={robot:boundsPixels(w.rig.shell,w.camera,width,height),dock:boundsPixels(w.rig.dock,w.camera,width,height),camera:[...w.camera.projectionMatrix.toArray(),...w.camera.matrixWorld.toArray()]};
  }
 }
 writeFileSync(new URL('comparison.json',import.meta.url),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report.cases));
}
