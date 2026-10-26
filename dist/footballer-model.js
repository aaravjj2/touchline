import * as THREE from './vendor/three.module.js';
import {mergeGeometries} from './vendor/BufferGeometryUtils.js';
// Original athletic mesh, fitted to the existing CC0 animation skeleton in its bind pose.
export function footballerGeometry(mesh,{detail='match'}={}){
 const hero=detail!=='match',closeup=detail==='hero';
 const pieces=[],groups=[],inverse=mesh.bindMatrix.clone().invert(),bones=mesh.skeleton.bones;
 const index=name=>bones.findIndex(b=>b.name===name),point=name=>new THREE.Vector3().setFromMatrixPosition(mesh.skeleton.boneInverses[index(name)].clone().invert());
 const add=(geometry,bone,group)=>{const i=index(bone),count=geometry.attributes.position.count,coords=new Float32Array(count*2);for(let n=0;n<count;n++){coords[n*2]=geometry.attributes.position.getX(n)/13;coords[n*2+1]=geometry.attributes.position.getY(n)/13;}geometry.setAttribute('kitCoord',new THREE.BufferAttribute(coords,2));geometry.applyMatrix4(inverse);if(!geometry.getAttribute('skinIndex')){geometry.setAttribute('skinIndex',new THREE.Uint16BufferAttribute(Array.from({length:count},()=>[i,0,0,0]).flat(),4));geometry.setAttribute('skinWeight',new THREE.Float32BufferAttribute(Array.from({length:count},()=>[1,0,0,0]).flat(),4));}pieces.push(geometry);for(let n=0;n<count;n++)groups.push(typeof group==='function'?group(n):group);};
 const oval=(center,size,bone,group)=>{const head=bone==='Head'&&size[0]>15,detail=['eye','iris','mouth','hair'].includes(group)?(hero?(closeup?10:6):4):(hero?(closeup?12:8):6);const g=new THREE.SphereGeometry(1,head?(hero?(closeup?24:16):10):detail,head?(hero?(closeup?16:10):6):(hero?(closeup?8:5):4));g.scale(...size);g.translate(...center);add(g,bone,group);};
 const limb=(a,b,r1,r2,bone,group)=>{const delta=b.clone().sub(a),g=new THREE.CylinderGeometry(r2,r1,delta.length(),hero?(closeup?16:10):8,1);g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),delta.normalize()));g.translate(...a.clone().add(b).multiplyScalar(.5).toArray());add(g,bone,group);};
 const continuousLimb=(a,b,c,upper,lower,leg)=>{
  const levels=leg?[[0,17],[.35,18],[.549,15.2],[.55,15.2],[.7,13],[.9,10.5],[1,10],[1.15,10.5],[1.151,10.5],[1.199,10.5],[1.2,10.5],[1.45,11],[1.7,8],[2,6]]:[[0,11],[.35,10.5],[.499,10],[.5,10],[.7,9],[.9,7],[1,6.5],[1.2,7],[1.5,6.5],[2,4.8]],segments=closeup?16:10,vertices=[],uv=[],skin=[],weights=[],indices=[],palette=[];
  const axis=c.clone().sub(a).normalize(),normal=new THREE.Vector3(0,0,1).projectOnPlane(axis).normalize(),binormal=new THREE.Vector3().crossVectors(axis,normal).normalize();
  for(let row=0;row<levels.length;row++){const [t,r]=levels[row],center=t<=1?a.clone().lerp(b,t):b.clone().lerp(c,t-1),blend=Math.max(0,Math.min(1,(t-.8)/.4));for(let k=0;k<segments;k++){const angle=k/segments*Math.PI*2,v=center.clone().addScaledVector(normal,Math.cos(angle)*r).addScaledVector(binormal,Math.sin(angle)*r);vertices.push(...v.toArray());uv.push(k/segments,t/2);skin.push(index(upper),index(lower),0,0);weights.push(1-blend,blend,0,0);palette.push(leg?t<.55?'short':t>1.15?(t<1.2?'trim':'sock'):'skin':t<.5?'shirt':'skin');if(row<levels.length-1){const i=row*segments+k,j=row*segments+(k+1)%segments;indices.push(i,j,i+segments,j,j+segments,i+segments);}}}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setAttribute('skinIndex',new THREE.Uint16BufferAttribute(skin,4));g.setAttribute('skinWeight',new THREE.Float32BufferAttribute(weights,4));g.setIndex(indices);g.computeVertexNormals();add(g,upper,n=>palette[n]);
 };
 // A continuous weighted shirt joins hips, spine and chest without floating body segments.
 const rings=[[132,29,18],[155,30,19],[185,35,21],[218,40,22],[232,37,18],[242,12,11]],vertices=[],uv=[],skin=[],weights=[],triangles=[],joints=['Hips','Spine','Chest','UpperChest','Neck'],levels=[124,156,185,215,242],segments=hero&&closeup?24:16;
 for(let row=0;row<rings.length;row++){const [y,rx,rz]=rings[row];let lower=0;while(lower<levels.length-2&&y>levels[lower+1])lower++;const blend=Math.max(0,Math.min(1,(y-levels[lower])/(levels[lower+1]-levels[lower])));for(let k=0;k<segments;k++){const angle=k/segments*Math.PI*2;vertices.push(Math.cos(angle)*rx,y,Math.sin(angle)*rz);uv.push(k/segments,row/(rings.length-1));skin.push(index(joints[lower]),index(joints[lower+1]),0,0);weights.push(1-blend,blend,0,0);if(row<rings.length-1){const a=row*segments+k,b=row*segments+(k+1)%segments,c=a+segments,d=b+segments;triangles.push(a,c,b,b,c,d);}}}
 const torso=new THREE.BufferGeometry();torso.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));torso.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));torso.setAttribute('skinIndex',new THREE.Uint16BufferAttribute(skin,4));torso.setAttribute('skinWeight',new THREE.Float32BufferAttribute(weights,4));torso.setIndex(triangles);torso.computeVertexNormals();add(torso,'Spine','shirt');oval([0,129,3],[32,23,22],'Hips','short');
 limb(point('Neck'),point('Head'),7,8,'Neck','skin');
 const head=point('Head');oval([head.x,head.y+7,head.z],[20,23,19],'Head','skin');
 for(const sign of [-1,1]){oval([head.x+sign*20,head.y+6,head.z],[3.5,6,4],'Head','skin');oval([head.x+sign*7.5,head.y+11,head.z+17],[3.8,2.3,2.2],'Head','eye');oval([head.x+sign*7.5,head.y+11,head.z+19],[1.5,1.6,1],'Head','iris');oval([head.x+sign*7.5,head.y+16,head.z+17],[4.4,1.1,1.5],'Head','hair');}
 oval([head.x,head.y+5,head.z+19],[3,4,4],'Head','skin');oval([head.x,head.y-3,head.z+17.5],[5,.8,1.2],'Head','mouth');
 const collar=new THREE.TorusGeometry(10,2,5,16);collar.rotateX(Math.PI/2);collar.translate(0,241,-3);add(collar,'Neck','trim');
 if(closeup){
  // An original club badge and chest band, weighted with the close-up shirt.
  const badge=new THREE.BoxGeometry(8,11,1);badge.translate(-19,217,21.5);add(badge,'UpperChest','short');
  const inset=new THREE.BoxGeometry(3,7,1.2);inset.translate(-19,217,22);add(inset,'UpperChest','trim');
  for(const sign of [-1,1]){const stripe=new THREE.BoxGeometry(25,2,1);stripe.rotateZ(sign*.15);stripe.translate(sign*16,224,22);add(stripe,'UpperChest','trim');}
 }
 for(const side of ['Left','Right']){
  const arm=point(side+'Arm'),elbow=point(side+'ForeArm'),hand=point(side+'Hand'),hip=point(side+'UpLeg'),knee=point(side+'Leg'),foot=point(side+'Foot');
  if(hero){continuousLimb(arm,elbow,hand,side+'Arm',side+'ForeArm',false);oval(arm.toArray(),closeup?[10,9,10]:[11,12,11],side+'Arm','shirt');continuousLimb(hip,knee,foot,side+'UpLeg',side+'Leg',true);oval(hand.toArray(),[8,5,6],side+'Hand','glove');}else{
   limb(arm,elbow,11,8,side+'Arm','skin');oval(arm.toArray(),[14,14,14],side+'Arm','shirt');limb(arm,arm.clone().lerp(elbow,.43),14,12,side+'Arm','shirt');oval(elbow.toArray(),[8,8,8],side+'ForeArm','skin');limb(elbow,hand,8,5.5,side+'ForeArm','skin');oval(hand.toArray(),[8,5,6],side+'Hand','glove');
   limb(hip,knee,16,11,side+'UpLeg','skin');limb(hip,hip.clone().lerp(knee,.48),19,16,side+'UpLeg','short');oval(knee.toArray(),[11,11,11],side+'Leg','skin');limb(knee,foot,10,6,side+'Leg','sock');
  }
  const boot=foot.clone().add(new THREE.Vector3(0,-9,7));oval(boot.toArray(),[9,7,20],side+'Foot','boot');oval(boot.clone().add(new THREE.Vector3(0,-5,0)).toArray(),[9,2,20],side+'Foot','sole');if(hero)for(let lace=0;lace<3;lace++){const g=new THREE.BoxGeometry(11,1,1.5);g.translate(boot.x,boot.y+6,boot.z-4+lace*5);add(g,side+'Foot','trim');}
 }
 const geometry=mergeGeometries(pieces,false);pieces.forEach(g=>g.dispose());geometry.computeVertexNormals();return {geometry,groups};
}
