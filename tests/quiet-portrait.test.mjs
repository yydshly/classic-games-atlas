import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as T from '../experiments/kinetic/vendor/three.module.min.js';
import {buildWorkshop} from '../experiments/quiet-workbench-preview/scene.mjs';
import {QuietWorld,ROOM} from '../experiments/quiet-workbench-preview/physics.mjs';
import {QuietPresentation} from '../experiments/quiet-workbench-preview/presentation.mjs';
import {baselineSource} from '../docs/quiet-gentle-home-qa/baseline-source.mjs';
import {beforeBuild,BeforePresentation,boundsPixels,cases} from '../docs/quiet-gentle-home-qa/portrait/export.mjs';
import {sequences,DT} from '../docs/quiet-gentle-home-qa/temporal/sequences.mjs';
assert.equal(readFileSync(new URL('../experiments/quiet-workbench-preview/physics.mjs',import.meta.url),'utf8'),baselineSource('7e58eb5778e13534147f712f3da593130224625a','physics.mjs'));
const w=buildWorkshop(ROOM),old=beforeBuild(ROOM),fresh=new QuietWorld().snapshot(),motion=new QuietPresentation();
const projection=()=>[...w.camera.projectionMatrix.toArray(),...w.camera.matrixWorld.toArray()];
w.fit(1280,800);old.fit(1280,800);
assert.deepEqual(projection(),[...old.camera.projectionMatrix.toArray(),...old.camera.matrixWorld.toArray()]);
const desktop=projection(),metrics={};
w.fit(1280,720);old.fit(1280,720);assert.deepEqual(projection(),[...old.camera.projectionMatrix.toArray(),...old.camera.matrixWorld.toArray()]);
function allCorners(box){const points=[];for(const x of [box.min.x,box.max.x])for(const y of [box.min.y,box.max.y])for(const z of [box.min.z,box.max.z])points.push(new T.Vector3(x,y,z));return points;}
for(const [width,height]of [[390,560],[390,400],[320,340]]){
 w.fit(width,height);old.fit(width,height);w.pose(fresh,motion.update(fresh,0));old.pose(fresh,new BeforePresentation().update(fresh,0));w.scene.updateMatrixWorld(true);old.scene.updateMatrixWorld(true);
 for(const s of ROOM.surfaces)for(const x of [-1,1])for(const z of [-1,1])for(const y of [0,ROOM.radius*2]){
  const v=new T.Vector3(s.position[0]+x*(s.size[0]/2+ROOM.radius),y,s.position[2]+z*(s.size[2]/2+ROOM.radius)).project(w.camera);
  assert(Math.abs(v.x)<1&&Math.abs(v.y)<1,'whole real support plus robot-radius envelope remains visible');
 }
 const station=new T.Box3().setFromObject(w.rig.station);
 const backEdge=Math.min(...ROOM.surfaces.map(s=>s.position[2]-s.size[2]/2));
 assert(station.max.z<backEdge-ROOM.radius*2,'entire decorative station stays beyond twice-radius reach, no new hidden obstacle');
 for(const v of allCorners(station)){v.project(w.camera);assert(Math.abs(v.x)<1&&Math.abs(v.y)<1,'whole station is visible, not cropped');}
 const origin=new T.Vector3(0,0,0).project(w.camera),right=new T.Vector3(1,0,0).project(w.camera),forward=new T.Vector3(0,0,-1).project(w.camera);
 assert(right.x>origin.x&&forward.y>origin.y,'existing right and forward inputs keep their visible directions');
 const now=boundsPixels(w.rig.shell,w.camera,width,height),before=boundsPixels(old.rig.shell,old.camera,width,height);
 assert(now.width>before.width*1.15);if(height===560)assert(now.width>before.width*1.4);
 let meshes=0,groups=0,casters=0;w.scene.traverseVisible(o=>{if(o.isMesh){meshes++;groups+=Array.isArray(o.material)?o.geometry.groups.length:1;casters+=Number(o.castShadow);}});
 assert(meshes<=97&&groups<=97&&casters<=12);
 metrics[width+'x'+height]={before,after:now,scale:now.width/before.width,meshes,groups,casters,stationToPlayableClearance:backEdge-station.max.z};
}
w.fit(1280,800);assert.deepEqual(projection(),desktop,'resize back restores exact desktop camera');assert.deepEqual(w.rig.station.position.toArray(),[0,0,0]);
const turn=cases()['soft-return'];
function belongs(object,root){for(;object;object=object.parent)if(object===root)return true;return false;}
function visible(object){for(;object;object=object.parent)if(!object.visible)return false;return true;}
const visibility={};
for(const [name,scene]of [['before',old],['after',w]]){
 scene.fit(390,560);scene.pose(turn.snapshot,turn.poses[name]);scene.scene.updateMatrixWorld(true);scene.camera.updateMatrixWorld(true);
 visibility[name]=[.09,.16,.24,.34].map(y=>{
  const point=new T.Vector3(turn.snapshot.player.position[0],y,turn.snapshot.player.position[2]+.15).project(scene.camera),ray=new T.Raycaster();ray.setFromCamera(new T.Vector2(point.x,point.y),scene.camera);
  const first=ray.intersectObjects(scene.scene.children,true).find(h=>visible(h.object));return !!first&&belongs(first.object,scene.rig.robot);
 });
}
assert(visibility.after.filter(Boolean).length>visibility.before.filter(Boolean).length,'far-return lower body is less hidden by the unchanged long tool');
const runs=sequences(),after=new QuietPresentation(),before=new BeforePresentation();let maximumHandIncrease=0,maximumBrowLift=0,firstHit;
for(const f of runs['light-recovery']){
 const next=after.update(f.snapshot,DT,{brake:!!f.input.brake}),previous=before.update(f.snapshot,DT,{brake:!!f.input.brake});
 assert.equal(f.snapshot.state,'playing','gentle route remains an actual non-terminal contact');
 if(!f.snapshot.lastImpact)assert.equal(next.startle,0,'no event means no new reflex');
 else if(!firstHit)firstHit={frame:f.index,gain:f.snapshot.lastImpact.gain};
 maximumHandIncrease=Math.max(maximumHandIncrease,next.handLift-previous.handLift);maximumBrowLift=Math.max(maximumBrowLift,next.browLift);
 assert(next.startle>=0&&next.startle<=.72&&next.browLift<=.033,'reflex remains bounded and local');
}
assert(firstHit&&maximumHandIncrease>.06&&maximumBrowLift>.01,'real gentle tap produces a larger but bounded hand/brow reflex');
const last=after.lastPose;assert(last.startle<1e-8&&last.browLift<1e-8,'reflex naturally returns to rest');
const pause=JSON.stringify(after.update(runs['light-recovery'].at(-1).snapshot,.1,{paused:true}));assert.equal(JSON.stringify(after.update(runs['light-recovery'].at(-1).snapshot,.1,{paused:true})),pause);
const retry=runs.dock.find(f=>f.phase==='retry');const reset=after.update(retry.snapshot,DT);assert.equal(reset.startle,0);assert.equal(reset.browLift,0);
const awakeFrame=runs.wake.find(f=>f.snapshot.state==='woke'),am=new QuietPresentation();let awake=am.update(awakeFrame.snapshot,0);for(let i=0;i<10;i++)awake=am.update(awakeFrame.snapshot,.1);
w.fit(390,560);const stableCamera=projection();w.pose(awakeFrame.snapshot,awake);w.scene.updateMatrixWorld(true);
assert.deepEqual(projection(),stableCamera,'impact/wake never shakes or changes the camera');
for(const v of allCorners(new T.Box3().setFromObject(w.rig.head))){v.project(w.camera);assert(Math.abs(v.x)<1&&Math.abs(v.y)<1,'wake head still fits portrait envelope');}
console.log(JSON.stringify({passed:true,scope:'real Cannon events and Three projection/rig checks; not CSS/browser/touch or player acceptance',metrics,farReturnVisibility:visibility,firstHit,maximumHandIncrease,maximumBrowLift,checks:['full supports and station visible','station outside reachable envelope','existing input directions retained','1280x720/800 desktop camera restored exactly','far tool lower-body occlusion reduced on a real soft-route state','mesh budget retained','gentle reflex only on real impact; decay, pause and retry clear','no camera shake or physical changes']},null,2));

