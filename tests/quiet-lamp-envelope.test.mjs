import assert from 'node:assert/strict';
import {baselineSource} from '../docs/quiet-gentle-home-qa/baseline-source.mjs';
import * as T from '../experiments/kinetic/vendor/three.module.min.js';
import {QuietWorld,ROOM} from '../experiments/quiet-workbench-preview/physics.mjs';
import {buildWorkshop} from '../experiments/quiet-workbench-preview/scene.mjs';
import {QuietPresentation} from '../experiments/quiet-workbench-preview/presentation.mjs';
import {fallMarker} from '../experiments/quiet-workbench-preview/feedback.mjs';
import {batchStatic} from '../experiments/quiet-workbench-preview/batch.mjs';
const raw=baselineSource('71e8c6757c73c1cfbe42730781588f877d8458e6','scene.mjs').replace(/^import .*\n/gm,'').replace('export function buildWorkshop','function buildWorkshop');
const old=new Function('T','fallMarker',raw+'\nreturn buildWorkshop;')(T,fallMarker)(ROOM);
const oldLamp=old.scene.children.filter(o=>o.isMesh&&['CylinderGeometry','ConeGeometry','SphereGeometry'].includes(o.geometry.type)&&o.position.x>2&&o.position.z>3&&o.position.y>-.9&&(o.position.y<-.1||o.position.y>.5));
assert.equal(oldLamp.length,5);
function go(w,x,z,dt){for(let i=0;i<30/dt&&w.state==='playing';i++){const p=w.player.position,v=w.player.velocity,dx=x-p.x,dz=z-p.z,n=Math.hypot(dx,dz);if(n<.025&&Math.hypot(v.x,v.z)<.1)return;const speed=Math.min(.9,n*2);w.step({x:((n?dx/n*speed:0)-v.x)*1.2,z:((n?dz/n*speed:0)-v.z)*1.2,brake:n<.12},dt);}}
function separation(meshes,point){let distance=Infinity;const triangle=new T.Triangle(),nearest=new T.Vector3();for(const mesh of meshes){mesh.updateWorldMatrix(true,false);const geometry=mesh.geometry,p=geometry.attributes.position,index=geometry.index,count=index?index.count:p.count;for(let i=0;i<count;i+=3){const points=[0,1,2].map(j=>new T.Vector3().fromBufferAttribute(p,index?index.getX(i+j):i+j).applyMatrix4(mesh.matrixWorld));triangle.set(...points);triangle.closestPointToPoint(point,nearest);distance=Math.min(distance,nearest.distanceTo(point));}}return distance-ROOM.radius;}
const current=buildWorkshop(ROOM),lamp=[];current.rig.deskLamp.traverse(o=>{if(o.isMesh)lamp.push(o);});
const runs=[];
for(const dt of [1/120,1/30,.1]){
 const world=new QuietWorld();for(const p of [[0,2.5],[3.64,2.5],[3.64,3.94]])go(world,...p,dt);
 const s=world.snapshot();assert.equal(s.state,'playing');assert(s.grounded);assert.equal(s.noise,0);assert(Math.hypot(s.player.position[0]-3.64,s.player.position[2]-3.94)<.03);
 const center=new T.Vector3(...s.player.position),oldSeparation=separation(oldLamp,center),newSeparation=separation(lamp,center);
 assert(oldSeparation<-.15,'reproduce real old visual penetration');assert(newSeparation>1,'fixed lamp fully separated, without changing route or physics');
 runs.push({dt,position:s.player.position,grounded:s.grounded,state:s.state,noise:s.noise,oldPenetration:-oldSeparation,newClearance:newSeparation});
}
const envelope=new T.Box3().setFromObject(current.rig.deskLamp);assert(envelope.min.x>3.8+2*ROOM.radius);
const pose=new QuietPresentation(),snapshot=new QuietWorld().snapshot();
for(const state of ['playing','woke']){const sample={...snapshot,state};let p=pose.update(sample,0);for(let i=0;i<7;i++)p=pose.update(sample,.1);current.pose(sample,p);const hand=new T.Box3().setFromObject(current.rig.forearm);assert(hand.min.x>3.8+2*ROOM.radius,'connected hand also stays outside conservative player envelope');}
let casters=0;current.scene.traverse(o=>{if(o.isMesh&&o.castShadow)casters++;});assert(casters<=12);assert.equal(current.scene.children.find(o=>o.isDirectionalLight&&o.castShadow).shadow.mapSize.x,512);
// Merging preserves transformed geometry and shadow/material behaviour.
const root=new T.Group(),material=new T.MeshStandardMaterial(),parts=[];
for(const x of [-1,1]){const m=new T.Mesh(new T.BoxGeometry(1,.5,.8),material);m.position.set(x,.2,0);m.rotation.y=x*.3;m.scale.set(1,2,.7);m.castShadow=true;root.add(m);parts.push(m);}
root.position.set(3,1,-2);root.rotation.z=.2;root.updateMatrixWorld(true);
const oldBounds=new T.Box3().setFromObject(root);batchStatic(root,parts);const newBounds=new T.Box3().setFromObject(root),merged=root.children.find(o=>o.isMesh);
assert.equal(root.children.filter(o=>o.isMesh).length,1);assert.equal(merged.geometry.attributes.position.count/3,24);assert.equal(merged.material,material);assert.equal(merged.castShadow,true);
assert(oldBounds.min.distanceTo(newBounds.min)<1e-6&&oldBounds.max.distanceTo(newBounds.max)<1e-6);
console.log(JSON.stringify({passed:true,scope:'legal Cannon controls and exact triangle distance, not browser collision pixels or performance',runs,entireLampMinX:envelope.min.x,conservativeEnvelopeMaxX:3.8+2*ROOM.radius,casters},null,2));
