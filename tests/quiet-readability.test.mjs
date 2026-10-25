import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as T from '../experiments/kinetic/vendor/three.module.min.js';
import {buildWorkshop} from '../experiments/quiet-workbench-preview/scene.mjs';
import {QuietWorld,ROOM} from '../experiments/quiet-workbench-preview/physics.mjs';
import {QuietPresentation} from '../experiments/quiet-workbench-preview/presentation.mjs';
import {baselineSource} from '../docs/quiet-gentle-home-qa/baseline-source.mjs';
import {sequences,DT} from '../docs/quiet-gentle-home-qa/temporal/sequences.mjs';
const BASE='b576b8e9b6c7a0765a3147ca17b8aaef3e919ef6';
assert.equal(readFileSync(new URL('../experiments/quiet-workbench-preview/physics.mjs',import.meta.url),'utf8'),baselineSource(BASE,'physics.mjs'));
const presentationSource=readFileSync(new URL('../experiments/quiet-workbench-preview/presentation.mjs',import.meta.url),'utf8');
assert.equal(presentationSource.match(/export function dockState[\s\S]*?\n}/)[0],baselineSource(BASE,'presentation.mjs').match(/export function dockState[\s\S]*?\n}/)[0]);
const world=new QuietWorld(),m=new QuietPresentation(),samples=[{name:'ready',snapshot:world.snapshot(),pose:new QuietPresentation().update(world.snapshot(),0)}];
let fast=false,charge=false,brakedFast=false;
for(const f of sequences().dock){const p=m.update(f.snapshot,DT,{brake:!!f.input.brake});if(!fast&&p.dock==='too-fast'){samples.push({name:'too-fast',snapshot:f.snapshot,pose:p});fast=true;}if(!brakedFast&&p.dock==='too-fast'&&f.input.brake){samples.push({name:'too-fast-braking',snapshot:f.snapshot,pose:p});brakedFast=true;}if(!charge&&p.connected){samples.push({name:'charged',snapshot:f.snapshot,pose:p});charge=true;break;}}
assert(fast&&charge&&brakedFast);
const opposite=JSON.parse(readFileSync(new URL('../docs/quiet-gentle-home-qa/readability/comparison.json',import.meta.url),'utf8')).cases['opposite-too-fast'];
assert(opposite.snapshot.state==='playing'&&opposite.pose.dock==='too-fast'&&opposite.snapshot.player.position[0]>0);
samples.push({name:'opposite-too-fast',snapshot:opposite.snapshot,pose:opposite.pose});
const w=buildWorkshop(ROOM),counts={};let camera;
function vertices(root,localTo){root.updateWorldMatrix(true,true);const inverse=localTo.matrixWorld.clone().invert(),all=[];root.traverse(o=>{if(!o.isMesh)return;const a=o.geometry.attributes.position,mat=inverse.clone().multiply(o.matrixWorld);for(let i=0;i<a.count;i++)all.push(new T.Vector3().fromBufferAttribute(a,i).applyMatrix4(mat));});return all;}
function hits(root,x,z){return new T.Raycaster(new T.Vector3(x,1,z).applyMatrix4(w.rig.dock.matrixWorld),new T.Vector3(0,-1,0)).intersectObject(root,true).length;}
function belongs(o,root){for(;o;o=o.parent)if(o===root)return true;return false;}
function visible(o){for(;o;o=o.parent)if(!o.visible)return false;return true;}
function visibleStopBars(){let count=0;for(const x of [-.43,-.27,.27,.43]){const point=new T.Vector3(x,.039,.13).applyMatrix4(w.rig.dock.matrixWorld).project(w.camera),ray=new T.Raycaster();ray.setFromCamera(new T.Vector2(point.x,point.y),w.camera);const hit=ray.intersectObjects(w.scene.children,true).find(h=>visible(h.object));if(hit&&belongs(hit.object,w.rig.fastMark))count++;}return count;}
for(const s of samples){
 w.fit(1280,800);w.pose(s.snapshot,s.pose);w.scene.updateMatrixWorld(true);w.camera.updateMatrixWorld(true);
 const matrix=JSON.stringify([...w.camera.projectionMatrix.toArray(),...w.camera.matrixWorld.toArray()]);if(camera)assert.equal(matrix,camera);camera=matrix;
 assert.equal(w.rig.fastMark.visible,s.pose.dock==='too-fast');assert.equal(w.rig.connectedContacts.every(o=>o.visible),s.snapshot.state==='charged');
 const repair=w.rig.shell.getObjectByName('repair-patch'),staples=w.rig.shell.getObjectByName('repair-contacts');assert(repair&&staples);
 for(const root of [repair,staples])assert(vertices(root,w.rig.shell).every(v=>v.length()<=ROOM.radius+.010),'repair stays inside the existing seam silhouette');
 const open=w.rig.dock.getObjectByName('dock-open-contacts'),closed=w.rig.connectedContacts[0];assert(open&&closed);
 for(const root of [open,closed,w.rig.fastMark])assert(vertices(root,w.rig.dock).every(v=>Math.hypot(v.x,v.z)<ROOM.goalRadius&&v.y>=0&&v.y<=.045),'all contact graphics are flush and inside original goal');
 for(const x of [-.20,0,.20]){assert.equal(hits(open,x,0),0,'unconnected geometry has real gaps');if(s.pose.connected)assert(hits(closed,x,0)>0,'charged geometry fills both gaps and bridges the rails');}
 const stopBars=s.pose.dock==='too-fast'?visibleStopBars():null;if(stopBars!==null)assert(stopBars>=1,'actual camera retains an unoccluded stop cue from either real approach');
 let meshes=0,groups=0,casters=0;w.scene.traverseVisible(o=>{if(o.isMesh){meshes++;groups+=Array.isArray(o.material)?o.geometry.groups.length:1;casters+=Number(o.castShadow);}});assert(meshes<=97&&groups<=97&&casters<=12);counts[s.name]={meshes,groups,casters,unoccludedBarCenters:stopBars};
}
console.log(JSON.stringify({passed:true,scope:'same camera and actual-state geometry checks; not user comprehension, WebGL pixels or frame rate',checks:['physics and dock-state thresholds unchanged','same desktop camera across actual ready/fast/charged samples','repair fits prior shell silhouette','shared paired-contact motif','open gaps versus physically present charged bridge, beyond colour','flat indicators stay inside original goal','only too-fast shows dual bars; only charged closes contacts','visible-mesh/draw-group budget <=97 including active brake'],counts},null,2));
