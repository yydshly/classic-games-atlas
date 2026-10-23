import * as THREE from './vendor/three.module.min.js';
import {ferryDeparture} from './feedback.mjs';

// Integration: move to the runtime directory and change the import to its local
// vendor path. distance=8 means the fitted whole-dock view; yaw/pitch still orbit.
// Geometry and all moving poses come from COURSE/snapshots, never a view clock.
export function createView(canvas,course){
 if(!canvas?.getContext||!Array.isArray(course?.surfaces))throw new Error('码头视图缺少有效画布或场地。');
 const context=canvas.getContext('webgl2',{alpha:false,antialias:false,powerPreference:'high-performance'});
 if(!context)throw new Error('无法创建 WebGL2，暂不能显示实时三维码头。');
 const renderer=new THREE.WebGLRenderer({canvas,context,alpha:false,antialias:false});
 const dpr=Math.min(Number(globalThis.devicePixelRatio)||1,1.25);renderer.setPixelRatio(dpr);
 renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.08;
 // Diffuse light and small real-position contact projections avoid a full-scene
 // shadow pass/MSAA buffer. No imported textures, custom shader or postprocess.
 renderer.shadowMap.enabled=false;
 const scene=new THREE.Scene();scene.background=new THREE.Color('#d6e3d9');scene.fog=new THREE.Fog('#d6e3d9',48,125);
 const camera=new THREE.PerspectiveCamera(58,1,.1,180),geometries=new Set(),materials=new Set(),floors=[],opaque=[];
 const geo=g=>(geometries.add(g),g),mat=m=>(materials.add(m),m);
 const diffuse=(color,extra={})=>mat(new THREE.MeshLambertMaterial({color,...extra}));
 const flat=(color,extra={})=>mat(new THREE.MeshBasicMaterial({color,...extra}));
 const lineMat=color=>mat(new THREE.LineBasicMaterial({color,transparent:true,opacity:.55}));
 const v=p=>new THREE.Vector3(...(Array.isArray(p)?p:[p?.x||0,p?.y||0,p?.z||0]));
 const position=(o,p)=>o.position.copy(v(p));
 function pose(o,p){p=p?.pose||p;if(!p)return;if(p.position)position(o,p.position);if(p.quaternion){const q=p.quaternion;o.quaternion.set(...(Array.isArray(q)?q:[q.x,q.y,q.z,q.w])).normalize();}}
 const unitBox=geo(new THREE.BoxGeometry(1,1,1)),unitSphere=geo(new THREE.SphereGeometry(1,16,10)),unitCylinder=geo(new THREE.CylinderGeometry(1,1,1,10));
 const cream=diffuse('#dedbca'),quaySide=diffuse('#91aca4'),copper=diffuse('#b8885d'),dark=diffuse('#3d6467'),plank=diffuse('#c5c9ad'),teal=diffuse('#679c96'),moss=diffuse('#a8bd9b');
 const paint=flat('#ded7ae'),glass=flat('#a9d3c2',{transparent:true,opacity:.025,depthWrite:false});
 const wire=lineMat('#57817c'),seam=lineMat('#7d9486'),waterLine=lineMat('#bad8ca');
 wire.opacity=.32;
 scene.add(new THREE.HemisphereLight('#eaf1df','#739a91',2.15));const sun=new THREE.DirectionalLight('#ffe7bd',1.75);sun.position.set(12,22,16);scene.add(sun);
 function mesh(parent,g,m,p,scale){const o=new THREE.Mesh(g,m);if(p)position(o,p);if(scale)o.scale.set(...scale);parent.add(o);return o;}
 const box=(parent,size,m,p=[0,0,0])=>mesh(parent,unitBox,m,p,size);
 function lines(parent,points,material){const g=geo(new THREE.BufferGeometry().setFromPoints(points.map(p=>v(p))));const o=new THREE.LineSegments(g,material);parent.add(o);return o;}
 const maxBounds=new THREE.Box3(),gateFrames=[];
 const gateFrameMat=diffuse('#b8885d',{transparent:true,opacity:1});
 function barrier(def,parent=scene,material=wire,frameMaterial=copper){
  const group=new THREE.Group();position(group,def.position);if(def.rotation)group.rotation.set(...def.rotation);parent.add(group);
  const [w,h,d]=def.size;box(group,def.size,glass);
  // A single sparse net describes the real barrier without masking the ferry.
  const points=[];for(let x=-w/2+.68;x<w/2-.001;x+=.68)points.push([x,-h/2,0],[x,h/2,0]);
  for(let y=-h/2+.68;y<h/2-.001;y+=.68)points.push([-w/2,y,0],[w/2,y,0]);
  lines(group,points,material);
  for(const x of [-w/2,w/2]){const o=box(group,[.065,h+.06,d+.045],frameMaterial,[x,0,0]);if(frameMaterial===gateFrameMat)gateFrames.push(o);}
  for(const y of [-h/2,h/2]){const o=box(group,[w,.07,d+.045],frameMaterial,[0,y,0]);if(frameMaterial===gateFrameMat)gateFrames.push(o);}
  return group;
 }
 const dockDefs=course.surfaces.filter(s=>s.kind!=='barrier');
 for(const def of course.surfaces){
  if(def.kind==='barrier'){barrier(def);continue;}
  const group=new THREE.Group();position(group,def.position);if(def.rotation)group.rotation.set(...def.rotation);scene.add(group);
  const [w,h,d]=def.size,body=box(group,def.size,quaySide);floors.push(body);opaque.push(body);
  box(group,[w-.08,.018,d-.08],cream,[0,h/2+.01,0]);
  for(const sign of [-1,1])box(group,[w-.08,.025,.12],copper,[0,h/2+.025,sign*(d/2-.1)]);
  const points=[];for(let z=-d/2+.8;z<d/2;z+=1.4)points.push([-w/2+.25,h/2+.025,z],[w/2-.25,h/2+.025,z]);lines(group,points,seam);
  // Piles stay underneath the physical quay, never suggest an extra landing.
  for(const x of [-1,1])for(const z of [-1,1])mesh(group,unitCylinder,dark,[x*(w/2-.65),-h/2-1.1,z*(d/2-.6)],[.22,2.2,.22]);
  for(const x of [-1,1])box(group,[.55,.015,Math.min(2.4,d*.3)],moss,[x*(w/2-.55),h/2+.025,0]);
  const p=v(def.position),s=v(def.size).multiplyScalar(.5);maxBounds.expandByPoint(p.clone().sub(s));maxBounds.expandByPoint(p.clone().add(s));
 }
 const waterY=Number.isFinite(course.waterY)?course.waterY:-.72;
 const sea=mesh(scene,geo(new THREE.PlaneGeometry(150,170)),diffuse('#7eaaa3'),[0,waterY,-12]);sea.rotation.x=-Math.PI/2;
 const ripples=[];for(let i=0;i<80;i++){const x=-40+(i*13.37%80),z=15-(i*9.71%76),l=.7+(i%4)*.33;ripples.push([x,waterY+.008,z],[x+l,waterY+.008,z]);}lines(scene,ripples,waterLine);
 const distantMat=diffuse('#abc5b6');for(let i=0;i<7;i++){const hill=mesh(scene,geo(new THREE.ConeGeometry(1,1,6)),distantMat,[(i%2?-1:1)*(28+i*3),-.8,-44-i*5],[7+i%3,4+i%2,5+i%4]);hill.rotation.y=i*.72;}
 const crate=new THREE.Group();position(crate,course.crate?.position);scene.add(crate);const crateSize=course.crate?.size||[1.2,1.2,1.2];
 const cargo=diffuse('#bc9b72');box(crate,crateSize,cargo);
 for(const axis of [0,1,2])for(const a of [-1,1])for(const b of [-1,1]){const s=[.055,.055,.055],p=[0,0,0],other=[0,1,2].filter(n=>n!==axis);s[axis]=crateSize[axis]+.02;p[other[0]]=a*(crateSize[other[0]]/2-.015);p[other[1]]=b*(crateSize[other[1]]/2-.015);box(crate,s,copper,p);}
 const cargoSymbol=box(crate,[.27,.27,.025],paint,[0,0,crateSize[2]/2+.014]);cargoSymbol.rotation.z=Math.PI/4;
 const plateDef=course.plate,plate=new THREE.Group();position(plate,plateDef.position);scene.add(plate);const plateSignal=diffuse('#bb9668',{emissive:'#76b392',emissiveIntensity:0});
 box(plate,plateDef.size,dark);box(plate,[plateDef.size[0]-.12,.018,plateDef.size[2]-.12],plateSignal,[0,plateDef.size[1]/2+.009,0]);
 const pressureLampMat=flat('#d69a52',{toneMapped:false});
 const symbol=box(plate,[.50,.012,.50],pressureLampMat,[.72,plateDef.size[1]/2+.022,.72]);symbol.rotation.y=Math.PI/4;
 const gateDef=course.gate,gateSignal=lineMat('#759a87'),gate=barrier(gateDef,scene,gateSignal,gateFrameMat);
 // The same diamond lamp on the plate and actual gate reports pressure only,
 // including when the gate is held open for safety after pressure is removed.
 const gatePressureLamp=box(gate,[.56,.56,.028],pressureLampMat,[gateDef.size[0]/2-.38,gateDef.size[1]/2-.36,gateDef.size[2]/2+.02]);gatePressureLamp.rotation.z=Math.PI/4;
 const gateTop=gateDef.position[1]+(Number(gateDef.lift)||0),gantryTop=gateTop+gateDef.size[1]/2+.32;
 for(const sign of [-1,1])gateFrames.push(box(scene,[.16,gantryTop,.2],gateFrameMat,[gateDef.position[0]+sign*(gateDef.size[0]/2+.27),gantryTop/2,gateDef.position[2]]));
 gateFrames.push(box(scene,[gateDef.size[0]+.7,.16,.2],gateFrameMat,[gateDef.position[0],gantryTop,gateDef.position[2]]));
 maxBounds.expandByPoint(new THREE.Vector3(-8,gantryTop,gateDef.position[2]));maxBounds.expandByPoint(new THREE.Vector3(8,0,gateDef.position[2]));
 // A floor-level copper conduit links the actual plate and boarding gate.
 const px=plateDef.position[0],pz=plateDef.position[2],gz=gateDef.position[2]+.5,conduitMat=copper;
 box(scene,[.045,.012,Math.abs(pz-gz)],conduitMat,[px,.018,(pz+gz)/2]);box(scene,[Math.abs(px),.012,.045],conduitMat,[px/2,.018,gz]);
 const ferryDef=course.ferry||course.platform,ferry=new THREE.Group();position(ferry,ferryDef.position||ferryDef.near);scene.add(ferry);const fs=ferryDef.size||[4,.5,4];
 const deck=box(ferry,fs,teal);floors.push(deck);opaque.push(deck);box(ferry,[fs[0]-.08,.018,fs[2]-.08],plank,[0,fs[1]/2+.01,0]);
 // A pointed freight hull sits below the true deck, with no invented cabin or
 // walkable ledge. Its darker waterline remains visible around the square deck.
 const hullOutline=new THREE.Shape();
 const hullPoints=[[-.5,-.54],[0,-.69],[.5,-.54],[.59,-.32],[.59,.48],[.45,.58],[-.45,.58],[-.59,.48],[-.59,-.32]];
 hullOutline.moveTo(hullPoints[0][0]*fs[0],hullPoints[0][1]*fs[2]);
 for(const p of hullPoints.slice(1))hullOutline.lineTo(p[0]*fs[0],p[1]*fs[2]);hullOutline.closePath();
 const hullGeometry=geo(new THREE.ExtrudeGeometry(hullOutline,{depth:.68,bevelEnabled:false,steps:1}));hullGeometry.rotateX(Math.PI/2);
 mesh(ferry,hullGeometry,dark);
 // Low external fenders are entirely below deck level and cannot imply rails.
 for(const side of [-1,1])for(const z of [-.95,.95]){const o=mesh(ferry,unitCylinder,copper,[side*fs[0]*.59,-.19,z],[.23,.17,.23]);o.rotation.z=Math.PI/2;}
 for(const z of [-1,1])box(ferry,[fs[0]-.07,.12,.05],copper,[0,-.08,z*(fs[2]/2+.015)]);
 const deckLines=[];for(let z=-fs[2]/2+.45;z<fs[2]/2-.2;z+=.5)deckLines.push([-fs[0]/2+.2,fs[1]/2+.026,z],[fs[0]/2-.2,fs[1]/2+.026,z]);lines(ferry,deckLines,seam);
 for(const x of [-1,1])for(const z of [-1,1])mesh(ferry,unitCylinder,copper,[x*(fs[0]/2-.15),-.18,z*(fs[2]/2-.3)],[.11,.18,.11]);
 const boatLight=flat('#a4c7b1');for(const x of [-1,1])box(ferry,[.14,.045,.52],boatLight,[x*(fs[0]/2-.2),fs[1]/2+.03,0]);
 // Flush freight markings strengthen the vessel silhouette, not its collider.
 for(const x of [-1,1])box(ferry,[.14,.012,fs[2]-.12],teal,[x*(fs[0]/2-.11),fs[1]/2+.026,0]);
 const deckSymbol=box(ferry,[.8,.012,.8],paint,[0,fs[1]/2+.03,0]);deckSymbol.rotation.y=Math.PI/4;
 const boatBounds=[ferryDef.near||ferryDef.position,ferryDef.far||ferryDef.position];for(const p of boatBounds)if(p){const b=v(p),s=v(fs).multiplyScalar(.5);maxBounds.expandByPoint(b.clone().sub(s));maxBounds.expandByPoint(b.clone().add(s));}
 const player=new THREE.Group();scene.add(player);const radius=Number(course.player?.radius)||.45;
 const shell=diffuse('#17434d',{emissive:'#173e44',emissiveIntensity:.08});mesh(player,geo(new THREE.SphereGeometry(radius,24,14)),shell);
 const band=geo(new THREE.TorusGeometry(radius*1.013,.034,6,40));for(const r of [[0,0,0],[Math.PI/2,0,.45]]){const o=mesh(player,band,copper);o.rotation.set(...r);}
 const face=mesh(player,geo(new THREE.CircleGeometry(.205,20)),flat('#31575a'),[0,0,radius*.94]);
 const eyeMat=flat('#f2e7b6');for(const x of [-.078,.078])mesh(player,unitSphere,eyeMat,[x,.045,radius*.997],[.037,.046,.025]);
 box(player,[.032,.1,.018],paint,[0,-.09,radius*.991]);box(player,[.065,.02,.018],paint,[0,-.145,radius*.97]);
 const farDock=dockDefs.reduce((a,b)=>!a||b.position[2]<a.position[2]?b:a,null),nearDock=dockDefs.reduce((a,b)=>!a||b.position[2]>a.position[2]?b:a,null);
 const nearSignals=new THREE.Group(),farSignals=new THREE.Group(),receive=new THREE.Group();scene.add(nearSignals,farSignals,receive);
 const nearMat=flat('#809e8e'),farMat=flat('#809e8e'),receiveMat=flat('#326965',{transparent:true,opacity:.92,depthWrite:false,toneMapped:false});
 function dockSignals(parent,def,material,toward){const [x,y,z]=def.position,[w,h,d]=def.size;for(const s of [-1,1]){box(parent,[.9,.12,.025],material,[x+s*(w/2-1.0),y+h/2-.1,z+toward*d/2]);box(parent,[.65,.014,.15],material,[x+s*1.45,y+h/2+.025,z+toward*(d/2-.16)]);}}
 dockSignals(nearSignals,nearDock,nearMat,-1);dockSignals(farSignals,farDock,farMat,1);
 const receivePosition=course.goal?.position||[farDock.position[0],.55,farDock.position[2]];const rp=v(receivePosition),receiveY=farDock.position[1]+farDock.size[1]/2+.025;
 for(const sign of [-1,1]){const o=box(receive,[1.5,.012,.07],receiveMat,[rp.x+sign*.6,receiveY,rp.z]);o.rotation.y=sign*.55;}
 // A projected receiving halo is light, not an uncollidable physical doorway.
 // Reuses the old goal ring; a single high-contrast marker replaces tiny lamps.
 const receiveRing=mesh(receive,geo(new THREE.TorusGeometry(1.25,.075,5,40,Math.PI*1.75)),receiveMat,[rp.x,receiveY+1.3,rp.z]);
 receiveRing.rotation.z=Math.PI*.125;
 const ray=new THREE.Raycaster(),down=new THREE.Vector3(0,-1,0);
 function floorAt(x,z){ray.set(new THREE.Vector3(x,25,z),down);ray.far=50;return ray.intersectObjects(floors,false)[0]?.point.y??null;}
 function contactShadow(size){const m=flat('#345e59',{transparent:true,opacity:.2,depthWrite:false});const o=mesh(scene,geo(new THREE.CircleGeometry(size,20)),m);o.rotation.x=-Math.PI/2;return o;}
 const robotShadow=contactShadow(radius*1.05),crateShadow=contactShadow(.8),boatShadow=contactShadow(1);boatShadow.scale.set(fs[0]*.62,fs[2]*.62,1);
 // Static repeated shapes share one draw object. Dynamic/lighting feedback roots
 // are excluded, and the exact floor/opaque objects remain raycast targets.
 const excluded=new Set([crate,plate,gate,ferry,player,nearSignals,farSignals,receive,robotShadow,crateShadow,boatShadow]),floorSet=new Set([...floors,...opaque]);
 const batches=[];scene.updateMatrixWorld(true);const groups=new Map();let originalMeshes=0;
 scene.traverse(o=>{if(!o.isMesh)return;originalMeshes++;for(let p=o;p;p=p.parent)if(excluded.has(p))return;if(floorSet.has(o)||Array.isArray(o.material))return;const k=o.geometry.uuid+'|'+o.material.uuid;if(!groups.has(k))groups.set(k,[]);groups.get(k).push(o);});
 for(const objects of groups.values())if(objects.length>1){const first=objects[0],inst=new THREE.InstancedMesh(first.geometry,first.material,objects.length);for(let i=0;i<objects.length;i++)inst.setMatrixAt(i,objects[i].matrixWorld);inst.instanceMatrix.setUsage(THREE.StaticDrawUsage);inst.instanceMatrix.needsUpdate=true;inst.computeBoundingSphere();scene.add(inst);for(const o of objects)o.removeFromParent();batches.push(inst);}
 let meshObjects=0;scene.traverse(o=>{if(o.isMesh)meshObjects++;});
 let width=0,height=0,frames=0,disposed=false,initialized=false,gateFrameOccluded=false;const target=new THREE.Vector3(),desiredTarget=new THREE.Vector3(),desired=new THREE.Vector3(),back=new THREE.Vector3(),right=new THREE.Vector3(),up=new THREE.Vector3(),temp=new THREE.Vector3();
 // Fit actual walk surfaces and functional objects, not the giant empty corners
 // of a whole-scene AABB combining the distant quay with the gantry's height.
 const corners=[],functionalBounds=new THREE.Box3();
 function fitPoint(p){const q=v(p);corners.push(q);functionalBounds.expandByPoint(q);}
 for(const def of dockDefs)for(const x of [-1,1])for(const z of [-1,1])fitPoint([def.position[0]+x*def.size[0]/2,def.position[1]+def.size[1]/2+.04,def.position[2]+z*def.size[2]/2]);
 for(const p of boatBounds)for(const x of [-1,1])for(const z of [-1,1])fitPoint([p[0]+x*fs[0]/2,p[1]+fs[1]/2,p[2]+z*fs[2]/2]);
 for(const def of [gateDef,course.crate])for(const x of [-1,1])for(const y of [-1,1])for(const z of [-1,1])fitPoint([def.position[0]+x*def.size[0]/2,def.position[1]+y*def.size[1]/2,def.position[2]+z*def.size[2]/2]);
 const anchor=functionalBounds.getCenter(new THREE.Vector3());anchor.y=1.1;
 function resize(){if(disposed)return;const rect=canvas.getBoundingClientRect?.(),w=Math.max(1,Math.round(rect?.width||canvas.clientWidth||900)),h=Math.max(1,Math.round(rect?.height||canvas.clientHeight||600));if(w!==width||h!==height){width=w;height=h;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();}return {width,height,dpr};}
 function shadowAt(shadow,p,size){const y=floorAt(p.x,p.z);shadow.visible=y!==null&&p.y-y<4;if(shadow.visible){const elevation=Math.max(0,p.y-radius-y);shadow.position.set(p.x,y+.028,p.z);shadow.scale.setScalar(size*(1+elevation*.12));shadow.material.opacity=Math.max(.04,.21-elevation*.045);}}
 function draw(snapshot,{yaw=0,pitch=.48,distance=8,dt=1/60,active=true}={}){
  if(disposed||!snapshot?.player)return;resize();dt=Math.min(.1,Math.max(0,Number(dt)||0));
  pose(player,snapshot.player);pose(crate,snapshot.crate);pose(ferry,snapshot.ferry||snapshot.platform);pose(gate,snapshot.gate);
  const f=snapshot.ferry||{},phase=f.phase||snapshot.ferryPhase,arrival=snapshot.dockStage==='arrival'||snapshot.completed;
  plateSignal.color.set(snapshot.platePressed?'#a6c8a6':'#bb9668');plateSignal.emissiveIntensity=snapshot.platePressed ? .35 : 0;
  pressureLampMat.color.set(snapshot.platePressed?'#77d6a5':'#d69a52');
  const held=!!(snapshot.gate?.heldClosing||snapshot.heldForSafety);gateSignal.color.set(held?'#d5ae68':snapshot.gateOpen||snapshot.gate?.openAmount>.9?'#a4cfac':'#759a87');
  const leavingSoon=ferryDeparture(f).leavingSoon;
  nearMat.color.set(phase==='dwellNear'?(leavingSoon?'#edac55':'#c4dfad'):'#789a92');farMat.color.set(arrival?'#ead99e':phase==='dwellFar'?(leavingSoon?'#edac55':'#c4dfad'):'#789a92');
  boatLight.color.set(phase==='dwellNear'||phase==='dwellFar'?(leavingSoon?'#edac55':'#d6dfb5'):phase==='inbound'?'#a3c8c3':'#d5bd8d');
  receiveMat.color.set(arrival?'#158a75':'#326965');receiveMat.opacity=arrival ? 1 : .92;receiveRing.scale.setScalar(arrival?1.12:1);
  scene.updateMatrixWorld(true);shadowAt(robotShadow,player.position,1);shadowAt(crateShadow,crate.position,1.1);boatShadow.position.set(ferry.position.x,waterY+.012,ferry.position.z);
  temp.copy(player.position);temp.y+=.6;desiredTarget.copy(anchor).lerp(temp,.4);
  if(!initialized)target.copy(desiredTarget);else target.lerp(desiredTarget,1-Math.exp(-dt*5));
  yaw=Number.isFinite(yaw)?yaw:0;pitch=THREE.MathUtils.clamp((Number.isFinite(pitch)?pitch:.48)+.48,.75,1.2);
  back.set(Math.sin(yaw)*Math.cos(pitch),Math.sin(pitch),Math.cos(yaw)*Math.cos(pitch));right.set(Math.cos(yaw),0,-Math.sin(yaw));up.crossVectors(back,right).normalize();
  const tanV=Math.tan(THREE.MathUtils.degToRad(camera.fov*.5)),tanH=tanV*camera.aspect;let fit=8;
  for(const c of corners){temp.copy(c).sub(target);fit=Math.max(fit,temp.dot(back)+Math.abs(temp.dot(right))/(tanH*.94),temp.dot(back)+Math.abs(temp.dot(up))/(tanV*.9));}
  fit*=THREE.MathUtils.clamp((Number.isFinite(distance)?distance:8)/8,.65,1.7);desired.copy(target).addScaledVector(back,fit+.7);
  // Only opaque physical surfaces can hide the camera. The real barrier/gate
  // volumes are visibly transparent mesh, so they never force a causal-view jump.
  temp.copy(desired).sub(target);const len=temp.length();ray.set(target,temp.normalize());ray.near=.2;ray.far=len;const hit=ray.intersectObjects(opaque,false)[0];if(hit)desired.copy(target).addScaledVector(temp,Math.max(1,hit.distance-.35));
  const fy=floorAt(desired.x,desired.z);desired.y=Math.max(desired.y,fy===null?waterY+1.0:fy+.6);
  if(!initialized){camera.position.copy(desired);initialized=true;}else camera.position.lerp(desired,1-Math.exp(-dt*7));
  const cy=floorAt(camera.position.x,camera.position.z);camera.position.y=Math.max(camera.position.y,cy===null?waterY+1:cy+.5);camera.lookAt(target);
  // Only foreground gate frames intersecting the true camera-to-player sight
  // line soften. The actual gate pose and its net remain continuously visible.
  temp.copy(player.position).sub(camera.position);const sightLength=temp.length();
  ray.set(camera.position,temp.normalize());ray.near=.1;ray.far=Math.max(.1,sightLength-radius*.3);
  gateFrameOccluded=ray.intersectObjects(gateFrames,false).length>0;
  gateFrameMat.opacity=gateFrameOccluded ? .22 : THREE.MathUtils.lerp(gateFrameMat.opacity,1,1-Math.exp(-dt*10));
  gateFrameMat.depthWrite=!gateFrameOccluded;
  renderer.render(scene,camera);frames++;
 }
 function metrics(){return {webgl2:true,disposed,width,height,dpr,frames,drawCalls:renderer.info.render.calls,triangles:renderer.info.render.triangles,geometries:renderer.info.memory.geometries,textures:renderer.info.memory.textures,shadowMaps:0,antialias:false,materialCount:materials.size,originalMeshes,meshObjects,staticBatches:batches.length,gateFrameOccluded,gateFrameOpacity:gateFrameMat.opacity,camera:camera.position.toArray(),framing:'whole-dock soft follow; distance8 fitted'};}
 function dispose(){if(disposed)return;disposed=true;for(const b of batches)b.dispose();for(const g of geometries)g.dispose();for(const m of materials)m.dispose();renderer.dispose();scene.clear();}
 resize();return {draw,resize,dispose,metrics};
}
