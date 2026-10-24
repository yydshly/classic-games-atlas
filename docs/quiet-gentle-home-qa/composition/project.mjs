import * as T from '../../../experiments/kinetic/vendor/three.module.min.js';
const width=1280,height=800;
export function project(scene,camera){
 scene.updateMatrixWorld(true);camera.updateMatrixWorld(true);const triangles=[],viewDirection=camera.getWorldDirection(new T.Vector3()).negate(),light=new T.Vector3(-.4,.85,.35).normalize();let meshes=0;
 scene.traverseVisible(o=>{if(!o.isMesh)return;meshes++;const g=o.geometry,position=g.attributes.position,index=g.index,materials=Array.isArray(o.material)?o.material:[o.material];
 const groups=Array.isArray(o.material)&&g.groups.length?g.groups:[{start:0,count:index?index.count:position.count,materialIndex:0}];
 for(const group of groups){const material=materials[group.materialIndex||0];if(!material||material.visible===false)continue;
 for(let i=group.start;i<group.start+group.count;i+=3){
  const verts=[0,1,2].map(j=>new T.Vector3().fromBufferAttribute(position,index?index.getX(i+j):i+j).applyMatrix4(o.matrixWorld));
  const normal=verts[1].clone().sub(verts[0]).cross(verts[2].clone().sub(verts[0])).normalize();
  if(normal.dot(camera.isOrthographicCamera?viewDirection:camera.position.clone().sub(verts[0]))<=0&&material.side!==T.DoubleSide)continue;
  const projected=verts.map(v=>v.clone().project(camera));if(['x','y','z'].some(axis=>projected.every(v=>v[axis]< -1)||projected.every(v=>v[axis]>1)))continue;
  const c=material.color.clone(),rgb={};c.getRGB(rgb,T.SRGBColorSpace);
  const shade=material.isMeshBasicMaterial?1:.60+.40*Math.max(0,normal.dot(light));
  const color='#'+[rgb.r,rgb.g,rgb.b].map(n=>Math.round(Math.min(1,n*shade)*255).toString(16).padStart(2,'0')).join('');
  const depth=verts.reduce((n,v)=>n+v.clone().applyMatrix4(camera.matrixWorldInverse).z,0)/3;
  triangles.push({p:projected.flatMap(v=>[(v.x+1)*width/2,(1-v.y)*height/2]),d:projected.map(v=>v.z),z:depth,c:color});
 }}});
 triangles.sort((a,b)=>a.z-b.z);return{width,height,meshes,background:'#'+scene.background.getHexString(),triangles};
}
