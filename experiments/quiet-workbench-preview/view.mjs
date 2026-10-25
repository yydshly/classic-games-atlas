import * as T from '../kinetic/vendor/three.module.min.js';
import {buildWorkshop} from './scene.mjs?v=gentle-home-d9246fd-r3';
import {QuietPresentation} from './presentation.mjs?v=gentle-home-d9246fd-r3';

export function createView(canvas,room){
  const context=canvas.getContext('webgl2',{alpha:false,antialias:false});
  if(!context)throw Error('WebGL2 unavailable');
  const renderer=new T.WebGLRenderer({canvas,context,antialias:false});
  renderer.setPixelRatio(Math.min(globalThis.devicePixelRatio||1,1.25));
  renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.15;
  renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;
  const workshop=buildWorkshop(room),motion=new QuietPresentation();
  const layout=matchMedia('(max-width:700px) and (orientation:portrait)');
  let width=0,height=0,portrait;
  function draw(snapshot,{dt=0,paused=false,brake=false}={}){
    const rect=canvas.getBoundingClientRect(),w=Math.max(1,Math.round(rect.width)),h=Math.max(1,Math.round(rect.height));
    const nextPortrait=layout.matches;
    if(w!==width||h!==height||nextPortrait!==portrait){width=w;height=h;portrait=nextPortrait;renderer.setSize(w,h,false);workshop.fit(w,h,{portrait});}
    const pose=motion.update(snapshot,dt,{paused,brake,goal:room.goal,goalRadius:room.goalRadius});
    workshop.pose(snapshot,pose);renderer.render(workshop.scene,workshop.camera);
  }
  return{draw};
}
