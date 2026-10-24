// Offline geometry projection only. No browser, WebGL context, or GPU is used.
import * as T from '../../experiments/kinetic/vendor/three.module.min.js';
import {buildWorkshop} from '../../experiments/quiet-workbench-preview/scene.mjs';
import {QuietPresentation} from '../../experiments/quiet-workbench-preview/presentation.mjs';
import {QuietWorld,ROOM} from '../../experiments/quiet-workbench-preview/physics.mjs';
import {fallMarker} from '../../experiments/quiet-workbench-preview/feedback.mjs';
import {baselineSource} from './baseline-source.mjs';
import {writeFileSync,mkdirSync} from 'node:fs';
const width=1280,height=800;
const geometryRoot=new URL('../../.local/quiet-gentle-home-static/',import.meta.url);mkdirSync(geometryRoot,{recursive:true});
function go(w,x,z,speed=1.6){for(let i=0;i<30*120&&w.state==='playing';i++){const p=w.player.position,v=w.player.velocity,dx=x-p.x,dz=z-p.z,n=Math.hypot(dx,dz);if(n<.08&&Math.hypot(v.x,v.z)<.2)return;const f=Math.min(speed,n*2);w.step({x:((n?dx/n*f:0)-v.x)*1.2,z:((n?dz/n*f:0)-v.z)*1.2,brake:n<.12},1/120);}}
const ready=new QuietWorld();for(let i=0;i<30;i++)ready.step({},1/120);
const gentle=new QuietWorld();for(let i=0;i<2400&&!gentle.lastImpact&&gentle.state==='playing';i++)gentle.step({z:-1,brake:true},1/120);
const woke=new QuietWorld();for(let i=0;i<2400&&woke.state==='playing';i++)woke.step({z:-1},1/120);
const fast=new QuietWorld();for(const p of [[-1.95,2.5],[-1.95,.55],[-.3,.55]])go(fast,...p);
for(let i=0;i<2400&&fast.state==='playing';i++){fast.step({z:-1},1/120);if(Math.hypot(fast.player.position.x,fast.player.position.z+3.65)<.65)break;}
const charged=new QuietWorld();for(const p of [[-1.95,2.5],[-1.95,.55],[-.3,.55],[-.3,-3.65],[0,-3.65]])go(charged,...p);
const fell=new QuietWorld();for(let i=0;i<2400&&fell.state==='playing';i++)fell.step({x:1,z:-.5},1/120);
const states={ready:ready.snapshot(),impact:gentle.snapshot(),woke:woke.snapshot(),'dock-too-fast':fast.snapshot(),charged:charged.snapshot(),fell:fell.snapshot()};
function project(scene,camera){
 scene.updateMatrixWorld(true);camera.updateMatrixWorld(true);const triangles=[],normalMatrix=new T.Matrix3(),light=new T.Vector3(-.4,.85,.35).normalize();let meshes=0;
 scene.traverseVisible(o=>{if(!o.isMesh)return;meshes++;const g=o.geometry,position=g.attributes.position,index=g.index,materials=Array.isArray(o.material)?o.material:[o.material];normalMatrix.getNormalMatrix(o.matrixWorld);
 const groups=Array.isArray(o.material)&&g.groups.length?g.groups:[{start:0,count:index?index.count:position.count,materialIndex:0}];
 for(const group of groups){const material=materials[group.materialIndex||0];if(!material||material.visible===false)continue;
 for(let i=group.start;i<group.start+group.count;i+=3){
  const verts=[0,1,2].map(j=>new T.Vector3().fromBufferAttribute(position,index?index.getX(i+j):i+j).applyMatrix4(o.matrixWorld));
  const normal=verts[1].clone().sub(verts[0]).cross(verts[2].clone().sub(verts[0])).normalize();
  if(normal.dot(camera.position.clone().sub(verts[0]))<=0&&material.side!==T.DoubleSide)continue;
  const projected=verts.map(v=>v.clone().project(camera));if(projected.every(v=>v.x< -1||v.x>1||v.y< -1||v.y>1||v.z< -1||v.z>1))continue;
  const c=material.color.clone(),rgb={};c.getRGB(rgb,T.SRGBColorSpace);
  const shade=material.isMeshBasicMaterial?1:.60+.40*Math.max(0,normal.dot(light));
  const color='#'+[rgb.r,rgb.g,rgb.b].map(n=>Math.round(Math.min(1,n*shade)*255).toString(16).padStart(2,'0')).join('');
  const depth=verts.reduce((n,v)=>n+v.clone().applyMatrix4(camera.matrixWorldInverse).z,0)/3;
  triangles.push({p:projected.flatMap(v=>[(v.x+1)*width/2,(1-v.y)*height/2]),d:projected.map(v=>v.z),z:depth,c:color});
 }}});
 triangles.sort((a,b)=>a.z-b.z);return{width,height,meshes,background:'#'+scene.background.getHexString(),triangles};
}
const manifest={method:'CPU projection of real Three geometry; CPU depth-buffer raster approximation, no WebGL/shadows/tonemapping/DOM; NOT a game screenshot or UI acceptance',states:{}};
for(const [name,s]of Object.entries(states)){
 const workshop=buildWorkshop(ROOM),motion=new QuietPresentation();let pose=motion.update(s,0,{brake:name==='impact'});
 for(let i=0;i<(name==='impact'?1:7);i++)pose=motion.update(s,.1,{brake:name==='impact'});
 workshop.pose(s,pose);workshop.fit(width,height);
 const data=project(workshop.scene,workshop.camera);writeFileSync(new URL(`${name}.geometry.json`,geometryRoot),JSON.stringify(data));
 manifest.states[name]={source:'legal control of unchanged Cannon world; presentation clock advanced on frozen copy',snapshot:s,presentation:pose,meshes:data.meshes,triangles:data.triangles.length};
}
// The exact published old view, captured by a no-op renderer, for equal-size reference.
let capture;
const oldSource=baselineSource('7e58eb5778e13534147f712f3da593130224625a','view.mjs').replace(/^import .*\n/gm,'').replace('export function createView','function createView');
const FakeRenderer=class{setPixelRatio(){}setSize(){}render(scene,camera){capture={scene,camera};}};
const oldCreate=new Function('T','fallMarker','devicePixelRatio',oldSource+'\nreturn createView;')({...T,WebGLRenderer:FakeRenderer},fallMarker,1);
oldCreate({getContext:()=>({}),getBoundingClientRect:()=>({width,height})},ROOM).draw(states.ready);
writeFileSync(new URL('before.geometry.json',geometryRoot),JSON.stringify(project(capture.scene,capture.camera)));
writeFileSync(new URL('./states.json',import.meta.url),JSON.stringify(manifest,null,2)+'\n');
console.log(JSON.stringify(Object.fromEntries(Object.entries(manifest.states).map(([k,v])=>[k,{state:v.snapshot.state,dock:v.presentation.dock,meshes:v.meshes,triangles:v.triangles}]))));
