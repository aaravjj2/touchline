import * as THREE from './vendor/three.module.js';
import {mergeGeometries} from './vendor/BufferGeometryUtils.js';
export function batchStadium(scene){
 scene.updateMatrixWorld(true);const originals=[],parts=[];
 scene.traverse(mesh=>{if(!mesh.isMesh||mesh.isInstancedMesh||mesh.isSkinnedMesh||Array.isArray(mesh.material)||!mesh.material.isMeshStandardMaterial||mesh.material.emissive?.getHex()>0)return;
  const g=mesh.geometry.clone().applyMatrix4(mesh.matrixWorld),colors=new Float32Array(g.attributes.position.count*3);for(let i=0;i<g.attributes.position.count;i++)mesh.material.color.toArray(colors,i*3);g.setAttribute('color',new THREE.BufferAttribute(colors,3));parts.push(g);originals.push(mesh);});
 if(!parts.length)return;const geometry=mergeGeometries(parts,false);if(!geometry){parts.forEach(g=>g.dispose());return;}
 for(const mesh of originals){mesh.removeFromParent();mesh.geometry.dispose();mesh.material.dispose();}parts.forEach(g=>g.dispose());const batch=new THREE.Mesh(geometry,new THREE.MeshStandardMaterial({vertexColors:true,roughness:.85}));batch.receiveShadow=true;scene.add(batch);
}
