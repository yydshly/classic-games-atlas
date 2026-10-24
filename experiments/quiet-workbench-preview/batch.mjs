import * as T from '../kinetic/vendor/three.module.min.js';

// Merge only explicitly selected, static mesh parts. Moving rig roots, real
// collider silhouettes and visibility-driven indicators are never selected.
export function batchStatic(parent,candidates){
  parent.updateWorldMatrix(true,true);
  const inverse=parent.matrixWorld.clone().invert(),groups=new Map();
  for(const mesh of candidates){
    if(!mesh.isMesh||Array.isArray(mesh.material)||mesh.material.transparent)continue;
    const key=mesh.material.uuid+':'+mesh.castShadow+':'+mesh.receiveShadow;
    if(!groups.has(key))groups.set(key,[]);groups.get(key).push(mesh);
  }
  for(const list of groups.values()){
    if(list.length<2)continue;
    const positions=[],normals=[],uvs=[];
    for(const mesh of list){
      const geometry=mesh.geometry.index?mesh.geometry.toNonIndexed():mesh.geometry.clone();
      geometry.applyMatrix4(inverse.clone().multiply(mesh.matrixWorld));
      positions.push(...geometry.attributes.position.array);normals.push(...geometry.attributes.normal.array);uvs.push(...geometry.attributes.uv.array);
      geometry.dispose();mesh.removeFromParent();
    }
    const geometry=new T.BufferGeometry();
    geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));
    geometry.setAttribute('normal',new T.Float32BufferAttribute(normals,3));
    geometry.setAttribute('uv',new T.Float32BufferAttribute(uvs,2));
    geometry.computeBoundingBox();geometry.computeBoundingSphere();
    const merged=new T.Mesh(geometry,list[0].material);merged.name='static-batch';
    merged.castShadow=list[0].castShadow;merged.receiveShadow=list[0].receiveShadow;
    merged.userData.sourceMeshCount=list.length;parent.add(merged);
  }
}
