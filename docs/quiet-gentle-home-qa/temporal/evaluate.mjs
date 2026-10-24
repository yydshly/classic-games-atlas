import * as T from '../../../experiments/kinetic/vendor/three.module.min.js';
import {buildWorkshop} from '../../../experiments/quiet-workbench-preview/scene.mjs';
import {QuietPresentation} from '../../../experiments/quiet-workbench-preview/presentation.mjs';
import {ROOM} from '../../../experiments/quiet-workbench-preview/physics.mjs';
import {fallMarker} from '../../../experiments/quiet-workbench-preview/feedback.mjs';
import {batchStatic} from '../../../experiments/quiet-workbench-preview/batch.mjs';
import {baselineSource} from '../baseline-source.mjs';
import {DT} from './sequences.mjs';
export const BASE='8d1b634b43ac65332ab2b6a24bc86eb5af477709';
const old=p=>baselineSource(BASE,p);
export const BaselinePresentation=new Function(old('presentation.mjs').replace(/^export /gm,'')+'\nreturn QuietPresentation;')();
export const BaselineBuild=new Function('T','fallMarker','batchStatic',old('scene.mjs').replace(/^import .*\n/gm,'').replace('export function buildWorkshop','function buildWorkshop')+'\nreturn buildWorkshop;')(T,fallMarker,batchStatic);
export function evaluate(runs,baseline=false){
 const traces={};for(const [name,frames]of Object.entries(runs)){
  const presentation=new (baseline?BaselinePresentation:QuietPresentation)(),workshop=(baseline?BaselineBuild:buildWorkshop)(ROOM);
  traces[name]=frames.map(f=>{const pose=presentation.update(f.snapshot,DT,{brake:!!f.input.brake});workshop.pose(f.snapshot,pose);return{index:f.index,phase:f.phase,time:f.snapshot.time,state:f.snapshot.state,resets:f.snapshot.resets,noise:f.snapshot.noise,speed:pose.speed,input:f.input,position:f.snapshot.player.position,quaternion:f.snapshot.player.quaternion,angularVelocity:f.angularVelocity,impactKey:f.snapshot.lastImpact?`${f.snapshot.lastImpact.time}:${f.snapshot.lastImpact.tool}`:'',impactTool:pose.impactTool,impact:pose.impact,headY:workshop.rig.head.position.y,handX:workshop.rig.forearm.rotation.x,facePitch:workshop.rig.face.rotation.x,brake:pose.brake,connected:pose.connected,charge:pose.charge,faceRoll:workshop.rig.face.rotation.z,contacts:workshop.rig.connectedContacts.every(o=>o.visible),fastMark:workshop.rig.fastMark.visible,shell:workshop.rig.shell.quaternion.toArray(),pose};});
 }return traces;
}
export function metrics(traces){const report={};for(const [name,frames]of Object.entries(traces)){
 let recovery={headStep:0},brake={pitchStep:0},release={pitchStep:0};
 for(let i=1;i<frames.length;i++){
  const a=frames[i-1],b=frames[i];if(a.resets!==b.resets||a.impactKey!==b.impactKey)continue;
  if(b.phase==='quiet-recovery'&&Math.abs(b.headY-a.headY)>recovery.headStep)recovery={headStep:Math.abs(b.headY-a.headY),frame:i,beforeNoise:a.noise,afterNoise:b.noise,beforeHead:a.headY,afterHead:b.headY};
  if(b.phase==='brake-held'&&Math.abs(b.facePitch-a.facePitch)>brake.pitchStep)brake={pitchStep:Math.abs(b.facePitch-a.facePitch),frame:i};
  if(b.phase==='brake-released'&&Math.abs(b.facePitch-a.facePitch)>release.pitchStep)release={pitchStep:Math.abs(b.facePitch-a.facePitch),frame:i};
 }
 const c=frames.findIndex(f=>f.state==='charged');report[name]={frames:frames.length,recovery,brake,release,chargedFrame:c};
 if(c>0)report[name].connection={pitchStep:Math.abs(frames[c].facePitch-frames[c-1].facePitch),before:frames[c-1].facePitch,after:frames[c].facePitch};
 }return report;}
