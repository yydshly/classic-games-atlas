// Same camera, same 1280x800 raster, same saved ready snapshot and presentation.
// Neither scene is started in a browser or WebGL renderer.
import * as T from '../../../experiments/kinetic/vendor/three.module.min.js';
import {buildWorkshop} from '../../../experiments/quiet-workbench-preview/scene.mjs';
import {ROOM} from '../../../experiments/quiet-workbench-preview/physics.mjs';
import {fallMarker} from '../../../experiments/quiet-workbench-preview/feedback.mjs';
import {project} from './project.mjs';
import {baselineSource} from '../baseline-source.mjs';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
const base='71e8c6757c73c1cfbe42730781588f877d8458e6';
const oldSource=baselineSource(base,'scene.mjs').replace(/^import .*\n/gm,'').replace('export function buildWorkshop','function buildWorkshop');
const oldBuild=new Function('T','fallMarker',oldSource+'\nreturn buildWorkshop;')(T,fallMarker);
const recorded=JSON.parse(readFileSync(new URL('../states.json',import.meta.url),'utf8'));
const before=oldBuild(ROOM),after=buildWorkshop(ROOM),ready=recorded.states.ready;
function cost(scene){const geometries=new Set();const r={uniqueGeometryBytes:0,meshes:0,drawGroups:0,triangles:0,shadowCasters:0,shadowReceivers:0,mergedSourceMeshes:0,unsupportedMaterials:[]};scene.traverseVisible(o=>{if(!o.isMesh)return;if(!geometries.has(o.geometry)){geometries.add(o.geometry);r.uniqueGeometryBytes+=Object.values(o.geometry.attributes).reduce((n,a)=>n+a.array.byteLength,0)+(o.geometry.index?.array.byteLength||0);}r.meshes++;r.drawGroups+=Array.isArray(o.material)?o.geometry.groups.length:1;r.triangles+=(o.geometry.index?o.geometry.index.count:o.geometry.attributes.position.count)/3;r.shadowCasters+=Number(o.castShadow);r.shadowReceivers+=Number(o.receiveShadow);r.mergedSourceMeshes+=o.userData.sourceMeshCount||0;for(const m of Array.isArray(o.material)?o.material:[o.material])if(!m.isMeshStandardMaterial&&!m.isMeshBasicMaterial&&!m.isMeshLambertMaterial)r.unsupportedMaterials.push(m.type);});return r;}
let legacyScene;const legacySource=baselineSource('7e58eb5778e13534147f712f3da593130224625a','view.mjs').replace(/^import .*\n/gm,'').replace('export function createView','function createView');
const Recorder=class{setPixelRatio(){}setSize(){}render(scene){legacyScene=scene;}};
new Function('T','fallMarker','devicePixelRatio',legacySource+'\nreturn createView;')({...T,WebGLRenderer:Recorder},fallMarker,1)({getContext:()=>({}),getBoundingClientRect:()=>({width:1280,height:800})},ROOM).draw(ready.snapshot);
after.fit(1280,800);before.camera.copy(after.camera);
before.pose(ready.snapshot,ready.presentation);after.pose(ready.snapshot,ready.presentation);
const dir=new URL('../../../.local/quiet-composition-static/',import.meta.url);mkdirSync(dir,{recursive:true});
for(const [name,workshop]of [['composition-before',before],['composition-after',after]])writeFileSync(new URL(name+'.geometry.json',dir),JSON.stringify(project(workshop.scene,workshop.camera)));
const renderCost={legacy:cost(legacyScene),before:cost(before.scene),after:cost(after.scene),dprCap:{legacy:1.25,before:1.5,after:1.25},shadowMap:{legacy:'disabled',before:1024,after:512},scope:'Conservative scene counts before GPU/frustum/shadow-pass culling, not measured frame rate or exact draw calls'};
const awake=recorded.states.woke;after.pose(awake.snapshot,awake.presentation);
writeFileSync(new URL('composition-woke.geometry.json',dir),JSON.stringify(project(after.scene,after.camera)));
const camera=after.camera;
const parameters={position:camera.position.toArray(),quaternion:camera.quaternion.toArray(),left:camera.left,right:camera.right,top:camera.top,bottom:camera.bottom,near:camera.near,far:camera.far};
const evidence={base,renderCost,width:1280,height:800,identicalReadySnapshot:true,readySnapshot:ready.snapshot,identicalPresentation:true,presentation:ready.presentation,camera:parameters,beforeCameraIdentical:JSON.stringify(before.camera.toJSON())===JSON.stringify(camera.toJSON()),beforeProjectionMatrix:before.camera.projectionMatrix.toArray(),afterProjectionMatrix:camera.projectionMatrix.toArray(),snapshotSha256:createHash('sha256').update(JSON.stringify(ready.snapshot)).digest('hex'),method:'Real scene meshes and materials read in Node; CPU depth buffer; no browser or WebGL',limits:['Flat per-triangle directional shading, not the Three shader model.','Metalness, roughness, lights, shadows, tone mapping and browser antialiasing are not reproduced.','No DOM, runtime motion or input feel is shown.','Opaque triangle depth and conservative frustum exclusion only; no general near-plane polygon clipping or transparent material sorting.','Old original before.png/ready.png remain unchanged; this pair uses the final candidate camera for both versions.']};
// Scene node UUIDs differ by construction. Compare camera parameters/matrices,
// rather than object identities, when proving the controlled comparison.
evidence.beforeCameraIdentical=JSON.stringify(before.camera.projectionMatrix.toArray())===JSON.stringify(camera.projectionMatrix.toArray())&&JSON.stringify(before.camera.matrixWorld.toArray())===JSON.stringify(camera.matrixWorld.toArray());
if(!evidence.beforeCameraIdentical)throw Error('camera mismatch');
writeFileSync(new URL('./comparison.json',import.meta.url),JSON.stringify(evidence,null,2)+'\n');
console.log(JSON.stringify({identicalCamera:true,identicalSnapshot:true,identicalPresentation:true,width:1280,height:800,snapshotSha256:evidence.snapshotSha256}));
