// Real Cannon samples, replayed into the actual before/after scene rigs.
// This exports geometry only; it never starts a browser or WebGL renderer.
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {buildWorkshop} from '../../../experiments/quiet-workbench-preview/scene.mjs';
import {ROOM} from '../../../experiments/quiet-workbench-preview/physics.mjs';
import {BaselineBuild} from './evaluate.mjs';
import {project} from '../composition/project.mjs';
const runs=JSON.parse(readFileSync(new URL('../../../.local/quiet-temporal/streams.json',import.meta.url)));
const traces=JSON.parse(gunzipSync(readFileSync(new URL('./trace.json.gz',import.meta.url))));
const report=JSON.parse(readFileSync(new URL('./report.json',import.meta.url)));
const root=new URL('../../../.local/quiet-temporal-frames/',import.meta.url);mkdirSync(root,{recursive:true});
const charged=report.before.dock.chargedFrame,recovery=report.before['light-recovery'].recovery.frame;
const selections={brake:{run:'rolling-brake',indices:Array.from({length:16},(_,i)=>15+i*3),crop:[390,430,660,620]},dock:{run:'dock',indices:[charged-10,charged-7,charged-4,charged-1,charged,charged+4,charged+10,charged+20,charged+42],crop:[565,170,785,365]},recovery:{run:'light-recovery',indices:[recovery-1,recovery],crop:[930,320,1090,545]}};
const rigs={before:BaselineBuild(ROOM),after:buildWorkshop(ROOM)};for(const r of Object.values(rigs))r.fit(1280,800);
const plan={method:'CPU real-geometry detail crops at identical camera and sample times; NOT a browser video. Playback durations follow selected simulated times, not rendering speed.',base:report.base,physicalStreamSha256:report.physicalStreamSha256,selections,frames:[]};
for(const [set,spec]of Object.entries(selections))for(let n=0;n<spec.indices.length;n++){
 const index=spec.indices[n],f=runs[spec.run][index];
 for(const variant of ['before','after']){
  const rig=rigs[variant],pose=traces[variant][spec.run][index].pose;rig.pose(f.snapshot,pose);
  const name=`${set}-${String(n).padStart(2,'0')}-${variant}`;writeFileSync(new URL(name+'.geometry.json',root),JSON.stringify(project(rig.scene,rig.camera)));
  plan.frames.push({name,set,variant,index,run:spec.run,phase:f.phase,time:f.snapshot.time,presentationAge:pose.endAge,input:f.input,snapshot:f.snapshot,crop:spec.crop,snapshotSha256:createHash('sha256').update(JSON.stringify(f.snapshot)).digest('hex')});
 }
}
writeFileSync(new URL('./render-plan.json',import.meta.url),JSON.stringify(plan,null,2)+'\n');console.log(JSON.stringify({geometryFrames:plan.frames.length,sets:Object.keys(selections),browserUsed:false}));
