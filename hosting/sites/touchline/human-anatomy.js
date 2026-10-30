import * as THREE from './vendor/three.module.js';

// Original human anatomy, fitted to the existing CC0 skeleton. All coordinates
// are bind-pose model units. These meshes never affect collisions or outcomes.
export function humanHead({add,oval,point,hero,closeup}){
 const head=point('Head'),segments=closeup?32:hero?20:12;
 const rings=[[-24,.5,.5,0],[-22,7.5,6,1],[-19,11.8,8.8,2],[-14,14.8,10.8,2],[-8,16.2,12.5,1],[-2,16.8,13.4,0],[5,17,13.8,-.5],[12,16,13,-1],[18,12.5,10.7,-1],[22,6.5,6,-1],[23,.5,.5,-1]];
 const vertices=[],uv=[],indices=[];
 for(let row=0;row<rings.length;row++){
  const [y,rx,rz,z]=rings[row];
  for(let k=0;k<=segments;k++){
   const angle=k/segments*Math.PI*2,front=Math.max(0,Math.sin(angle));
   // Flatten the face slightly; the jaw and cheek transitions remain continuous.
   vertices.push(head.x+Math.cos(angle)*rx,head.y+y,head.z+z+Math.sin(angle)*rz-front*front*(y<10?1.2:0));uv.push(k/segments,row/(rings.length-1));
   if(row<rings.length-1&&k<segments){const a=row*(segments+1)+k,b=a+1,c=a+segments+1,d=c+1;indices.push(a,c,b,b,c,d);}
  }
 }
 const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geometry.setIndex(indices);geometry.computeVertexNormals();add(geometry,'Head','skin');
 const face=(offset,size,group)=>oval([head.x+offset[0],head.y+offset[1],head.z+offset[2]],size,'Head',group);
 for(const sign of [-1,1]){
  face([sign*17,-3,0],[2.6,5.3,3.4],'skin');
  if(hero)face([sign*18,-3,2],[.8,2.9,1],'skinShadow');
  // Small, inset eyes and visible upper lids replace the toy-like eyeballs.
  face([sign*6.5,2.7,11.8],[3.3,1.6,1.1],'skinShadow');
  face([sign*6.5,2.5,12.6],[2.8,1.05,.7],'eye');
  face([sign*6.5,2.5,13.2],[.9,.95,.35],'iris');
  face([sign*6.5,4.0,12.4],[3.2,.65,.7],'skin');
  face([sign*6.5,6.5,12.2],[3.5,.72,.6],'hair');
  if(closeup)face([sign*6.25,2.85,13.55],[.22,.22,.12],'eye');
  face([sign*2,-4.2,13.2],[1.5,1.3,1.7],'skin');
 }
 face([0,-.5,13],[1.65,4.7,1.6],'skin');
 face([0,-3.5,15],[2,1.8,2.1],'skin');
 face([0,-11.0,11.5],[4.3,.65,.75],'lip');
 face([0,-12.1,11.6],[3.8,.85,.7],'lip');
 face([0,-11.65,12.15],[3.8,.19,.2],'mouth');
}

export function humanHand({side,point,oval,limb}){
 const hand=point(side+'Hand'),knuckle=hand.clone().lerp(point(side+'HandIndex1'),.7),tip=hand.clone().lerp(point(side+'HandIndex3'),.7),axis=knuckle.clone().sub(hand).normalize();
 const across=new THREE.Vector3(0,0,1).projectOnPlane(axis).normalize(),palm=hand.clone().lerp(knuckle,.47);
 oval(palm.toArray(),[7.3,3.5,6.1],side+'Hand','glove');
 // Four separated fingers follow the rig's index bend; the thumb has its own bones.
 for(let f=0;f<4;f++){
  const offset=(f-1.5)*3.5,start=knuckle.clone().addScaledVector(across,offset),end=tip.clone().addScaledVector(across,offset).addScaledVector(axis,-Math.abs(f-1.3)*2.1);
  limb(start,end,1.65,1.25,side+'Hand','glove');oval(end.toArray(),[1.5,1.5,1.5],side+'Hand','glove');
 }
 limb(hand.clone().lerp(point(side+'HandThumb1'),.7),hand.clone().lerp(point(side+'HandThumb2'),.7),2.5,1.8,side+'Hand','glove');
}

export function humanHairGeometry(detailed=false){
 const geometry=new THREE.SphereGeometry(.143,detailed?28:10,detailed?12:6,0,Math.PI*2,0,Math.PI*.48),p=geometry.attributes.position;
 for(let i=0;i<p.count;i++){
  const x=p.getX(i),y=p.getY(i),z=p.getZ(i);
  // A close hairline above the brow, with a natural temple recession.
  p.setXYZ(i,x*.94,y*.83+Math.max(0,z)*.1,z*.86);
 }
 geometry.computeVertexNormals();return geometry;
}
