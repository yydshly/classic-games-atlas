import * as T from '../kinetic/vendor/three.module.min.js';
import {fallMarker} from './feedback.mjs';
export function createView(canvas,room){
 const context=canvas.getContext('webgl2',{alpha:false,antialias:false});if(!context)throw Error('WebGL2 unavailable');
 const renderer=new T.WebGLRenderer({canvas,context,antialias:false});renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.25));renderer.outputColorSpace=T.SRGBColorSpace;
 const scene=new T.Scene();scene.background=new T.Color('#52616a');const camera=new T.PerspectiveCamera(45,1,.1,100);
 scene.add(new T.HemisphereLight('#fff4da','#62737a',2.2));const light=new T.DirectionalLight('#fff5d8',2);light.position.set(-5,12,5);scene.add(light);
 const materials={metal:new T.MeshLambertMaterial({color:'#a2aeb2'}),soft:new T.MeshLambertMaterial({color:'#467f77'}),wood:new T.MeshLambertMaterial({color:'#a47a53'}),tool:new T.MeshLambertMaterial({color:'#64737b'}),robot:new T.MeshLambertMaterial({color:'#173f57'}),skin:new T.MeshLambertMaterial({color:'#d5aa86'}),cloth:new T.MeshLambertMaterial({color:'#ab704d'}),dark:new T.MeshBasicMaterial({color:'#223b41'}),glow:new T.MeshBasicMaterial({color:'#f6d780'}),foam:new T.MeshLambertMaterial({color:'#b4b17c'})};
 const cube=new T.BoxGeometry(1,1,1),sphere=new T.SphereGeometry(1,18,12);
 function mesh(g,m,p,scale,parent=scene){const o=new T.Mesh(g,m);o.position.set(...p);o.scale.set(...scale);parent.add(o);return o;}
 const box=(p,size,m,parent=scene)=>mesh(cube,m,p,size,parent);
 // Distant workshop floor lies well below the -3 failure plane, never a nearby deck.
 box([0,-7,0],[80,.2,80],new T.MeshLambertMaterial({color:'#485961'}));
 const sides={metal:new T.MeshLambertMaterial({color:'#40535b'}),soft:new T.MeshLambertMaterial({color:'#244d48'})};
 for(const s of room.surfaces){box(s.position,s.size,[sides[s.material],sides[s.material],materials[s.material],sides[s.material],sides[s.material],sides[s.material]]);const [x,y,z]=s.position,[w,h,d]=s.size;if(s.material==='soft'){
  // Stitches belong only to real narrow supporting strips; no fake guardrail.
  const horizontal=w>d;for(let t=-(horizontal?w:d)/2+.3;t<(horizontal?w:d)/2-.15;t+=.45)box([x+(horizontal?t:0),y+h/2+.012,z+(horizontal?0:t)],horizontal?[.13,.012,.04]:[.04,.012,.13],materials.foam);
 }else{for(const xx of [-1.8,2.8])for(const zz of [-3.5,3.6])box([xx,-1.2,zz],[.24,1.8,.24],materials.wood);}}
 const toolMeshes=new Map();for(const t of room.tools){const m=(t.material==='soft'?materials.foam:materials.tool).clone();toolMeshes.set(t.id,box(t.position,t.size,m));if(t.material==='metal')for(let i=-1;i<=1;i++)box([t.position[0]+i*t.size[0]*.24,t.position[1]+t.size[1]/2+.02,t.position[2]],[Math.min(.28,t.size[0]*.2),.035,t.size[2]*.7],materials.metal);}
 // The open tray marks the safe starting area, not another wall or puzzle.
 for(const x of [-.65,.65])box([x,.012,3.7],[.04,.02,1],materials.glow);
 box([0,.015,4.2],[1.3,.02,.04],materials.glow);
 const robot=new T.Group();scene.add(robot);mesh(sphere,materials.robot,[0,0,0],[room.radius,room.radius,room.radius],robot);
 for(const x of [-.09,.09])mesh(sphere,materials.glow,[x,.07,.31],[.035,.045,.025],robot);
 const ring=new T.Mesh(new T.TorusGeometry(.62,.07,6,32),materials.glow);ring.rotation.x=-Math.PI/2;ring.position.set(room.goal[0],.035,room.goal[2]);scene.add(ring);
 box([room.goal[0],.16,room.goal[2]-.55],[.8,.32,.14],materials.dark);
 // Repairer sits below and beside the tabletop: never a suggested walk surface.
 box([5.4,-1.35,-.8],[1.3,.15,1.25],materials.wood);const sleeper=new T.Group();sleeper.position.set(5.25,-.65,-.8);scene.add(sleeper);
 const torso=mesh(sphere,materials.cloth,[0,.45,0],[.68,.85,.55],sleeper);torso.rotation.z=-.2;
 const head=mesh(sphere,materials.skin,[-.26,1.38,.02],[.48,.52,.45],sleeper);head.rotation.z=-.25;
 const eyes=[];for(const x of [-.4,-.12])eyes.push(mesh(sphere,materials.dark,[x,1.4,.43],[.075,.025,.025],sleeper));
 box([4.3,.05,-.8],[.9,.18,.25],materials.cloth);
 // Open cross, distinct from the circular charging dock; no collider or occluding panel.
 const fallCross=new T.Group();scene.add(fallCross);const mark=new T.MeshBasicMaterial({color:'#ffb579'});
 for(const angle of [-Math.PI/4,Math.PI/4]){const stroke=box([0,0,0],[.55,.025,.065],mark,fallCross);stroke.rotation.y=angle;}
 fallCross.visible=false;
 let w=0,h=0;
 function draw(s){const rect=canvas.getBoundingClientRect();if(w!==Math.round(rect.width)||h!==Math.round(rect.height)){w=Math.max(1,Math.round(rect.width));h=Math.max(1,Math.round(rect.height));renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();const distance=Math.max(16,15/camera.aspect);camera.position.set(.5,distance*.85,distance*.72);camera.lookAt(.5,0,0);}
  const marker=fallMarker(s);fallCross.visible=!!marker;if(marker)fallCross.position.set(...marker);
  robot.position.set(...s.player.position);const awake=s.state==='woke';torso.scale.y=.85+(awake?0:Math.sin(s.time*1.6)*.018);head.position.y=awake?1.57:1.38+s.noise*.09;torso.rotation.z=-.2+Math.min(1,s.noise)*.08;for(const eye of eyes)eye.scale.y=awake?.08:.025-Math.min(1,s.noise)*.009;
  for(const t of room.tools){const m=toolMeshes.get(t.id).material;const hit=s.lastImpact?.tool===t.id&&s.time-s.lastImpact.time<.5;m.color.set(hit?(t.material==='soft'?'#ded69a':'#e99755'):(t.material==='soft'?'#b4b17c':'#64737b'));}
  materials.glow.color.set(s.state==='charged'?'#8bd6ae':'#f6d780');renderer.render(scene,camera);
 }
 return{draw};
}
