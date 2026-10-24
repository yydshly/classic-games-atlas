import * as T from '../kinetic/vendor/three.module.min.js';
import {buildWorkshop} from './scene.mjs';
import {QuietPresentation} from './presentation.mjs';

export function createView(canvas,room){
  const context=canvas.getContext('webgl2',{alpha:false,antialias:false});
  if(!context)throw Error('WebGL2 unavailable');
  const renderer=new T.WebGLRenderer({canvas,context,antialias:false});
  renderer.setPixelRatio(Math.min(globalThis.devicePixelRatio||1,1.25));
  renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.15;
  renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;
  const workshop=buildWorkshop(room),motion=new QuietPresentation();let width=0,height=0;
  function draw(snapshot,{dt=0,paused=false,brake=false}={}){
    const rect=canvas.getBoundingClientRect(),w=Math.max(1,Math.round(rect.width)),h=Math.max(1,Math.round(rect.height));
    if(w!==width||h!==height){width=w;height=h;renderer.setSize(w,h,false);workshop.fit(w,h);}
    const pose=motion.update(snapshot,dt,{paused,brake,goal:room.goal,goalRadius:room.goalRadius});
    workshop.pose(snapshot,pose);renderer.render(workshop.scene,workshop.camera);
  }
  return{draw};
}
