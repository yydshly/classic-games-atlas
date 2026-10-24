import * as T from '../../../experiments/kinetic/vendor/three.module.min.js';
import {buildWorkshop} from '../../../experiments/quiet-workbench-preview/scene.mjs';
import {QuietWorld,ROOM} from '../../../experiments/quiet-workbench-preview/physics.mjs';
import {fallMarker} from '../../../experiments/quiet-workbench-preview/feedback.mjs';
import {batchStatic} from '../../../experiments/quiet-workbench-preview/batch.mjs';
import {baselineSource} from '../baseline-source.mjs';
import {project} from '../composition/project.mjs';
import {sequences,DT} from '../temporal/sequences.mjs';
import {writeFileSync,mkdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
const BASE='b576b8e9b6c7a0765a3147ca17b8aaef3e919ef6';
const oldBuild=new Function('T','fallMarker','batchStatic',baselineSource(BASE,'scene.mjs').replace(/^import .*\n/gm,'').replace('export function buildWorkshop','function buildWorkshop')+'\nreturn buildWorkshop;')(T,fallMarker,batchStatic);
const OldPresentation=new Function(baselineSource(BASE,'presentation.mjs').replace(/^export /gm,'')+'\nreturn QuietPresentation;')();
const fresh=new QuietWorld().snapshot(),motion=new OldPresentation(),cases={ready:{snapshot:fresh,pose:new OldPresentation().update(fresh,0),source:'fresh real world before any step, corresponding to controller ready'}};
const frames=sequences().dock;let firstCharge=-1;
for(const f of frames){const pose=motion.update(f.snapshot,DT,{brake:!!f.input.brake});if(!cases['near-too-fast']&&pose.dock==='too-fast')cases['near-too-fast']={snapshot:f.snapshot,pose,source:'real binary-control approach before brake can connect',frame:f.index};if(firstCharge<0&&f.snapshot.state==='charged')firstCharge=f.index;if(firstCharge>=0&&f.index===firstCharge+42){cases.charged={snapshot:f.snapshot,pose,source:'real charged snapshot after existing 0.7s presentation settling',frame:f.index};break;}}
if(!cases.charged||!cases['near-too-fast'])throw Error('missing real states');
// A second real approach checks icon occlusion from the opposite side.
const opposite=new QuietWorld(),om=new OldPresentation();let op,index=0;
function advance(input){opposite.step(input,DT);op=om.update(opposite.snapshot(),DT,{brake:!!input.brake});index++;}
function go(x,z){for(let i=0;i<2400&&opposite.state==='playing';i++){const p=opposite.player.position,v=opposite.player.velocity,dx=x-p.x,dz=z-p.z;if(Math.hypot(dx,dz)<.055&&Math.hypot(v.x,v.z)<.13)break;advance({x:Math.abs(dx)>.025?Math.sign(dx):0,z:Math.abs(dz)>.025?Math.sign(dz):0,brake:true});}}
for(let i=0;i<15;i++)advance({});for(const p of [[1.95,2.5],[3.2,2.5],[3.2,-2.1],[.3,-2.1],[.3,-2.55]])go(...p);
for(let i=0;i<240&&opposite.state==='playing'&&op?.dock!=='too-fast';i++)advance({z:-1});
if(opposite.state!=='playing'||op?.dock!=='too-fast')throw Error('opposite approach did not reach actual fast state');
cases['opposite-too-fast']={snapshot:opposite.snapshot(),pose:op,source:'real binary-control route around the right side of the existing tools',frame:index};

const output=new URL('../../../.local/quiet-readability-static/',import.meta.url);mkdirSync(output,{recursive:true});
const report={base:BASE,method:'actual fixed game camera, real physics snapshots, CPU colour/depth projection; not browser pixels',width:1280,height:800,cases:{}};
function boxPixels(object,camera){const points=[];object.traverseVisible(o=>{if(!o.isMesh)return;const a=o.geometry.attributes.position;for(let i=0;i<a.count;i++)points.push(new T.Vector3().fromBufferAttribute(a,i).applyMatrix4(o.matrixWorld).project(camera));});return{width:(Math.max(...points.map(p=>p.x))-Math.min(...points.map(p=>p.x)))*640,height:(Math.max(...points.map(p=>p.y))-Math.min(...points.map(p=>p.y)))*400,scope:'projected visible-mesh vertex envelope, includes hidden surfaces; not visible pixel area'};}
for(const [name,c]of Object.entries(cases)){
 const variants=process.argv.includes('--before-only')?{before:oldBuild(ROOM)}:{before:oldBuild(ROOM),after:buildWorkshop(ROOM)};let matrix;
 report.cases[name]={...c,snapshotSha256:createHash('sha256').update(JSON.stringify(c.snapshot)).digest('hex'),variants:{}};
 for(const [variant,w]of Object.entries(variants)){
  w.fit(1280,800);w.pose(c.snapshot,c.pose);w.scene.updateMatrixWorld(true);w.camera.updateMatrixWorld(true);
  const m=[...w.camera.projectionMatrix.toArray(),...w.camera.matrixWorld.toArray()];if(matrix&&JSON.stringify(matrix)!==JSON.stringify(m))throw Error('camera changed');matrix=m;
  const data=project(w.scene,w.camera);writeFileSync(new URL(name+'-'+variant+'.geometry.json',output),JSON.stringify(data));
  let meshes=0,groups=0,triangles=0;w.scene.traverseVisible(o=>{if(o.isMesh){meshes++;groups+=Array.isArray(o.material)?o.geometry.groups.length:1;triangles+=(o.geometry.index?o.geometry.index.count:o.geometry.attributes.position.count)/3;}});
  report.cases[name].variants[variant]={robotBox:boxPixels(w.rig.robot,w.camera),repairPatchBox:boxPixels(w.rig.shell.getObjectByName('repair-patch'),w.camera),dockBox:boxPixels(w.rig.dock,w.camera),meshes,groups,triangles,camera:m};
 }
}
writeFileSync(new URL('./comparison.json',import.meta.url),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(Object.fromEntries(Object.entries(report.cases).map(([k,v])=>[k,v.variants]))));
