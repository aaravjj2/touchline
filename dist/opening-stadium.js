import * as THREE from './vendor/three.module.js';
import {mergeGeometries} from './vendor/BufferGeometryUtils.js';

// Original presentation environment. Shared geometry, painted texture and
// instanced seating keep the one-actor stage inexpensive and self-contained.
export function addOpeningStadium(scene,{low=false}={}){
 const canvas=document.createElement('canvas');canvas.width=canvas.height=512;
 const ctx=canvas.getContext('2d');ctx.fillStyle='#17332a';ctx.fillRect(0,0,512,512);
 for(let row=0;row<16;row++){ctx.fillStyle=row%2?'#193b30':'#163327';ctx.fillRect(0,row*32,512,32);}
 let seed=41727;for(let i=0;i<11000;i++){seed=(Math.imul(seed,1664525)+1013904223)>>>0;const x=seed%512;seed=(Math.imul(seed,1664525)+1013904223)>>>0;ctx.fillStyle=i%2?'#c6d7af12':'#06160e25';ctx.fillRect(x,seed%512,1,2);}
 ctx.strokeStyle='#e3e8d199';ctx.lineWidth=1.6;ctx.strokeRect(78,24,356,464);ctx.beginPath();ctx.moveTo(78,256);ctx.lineTo(434,256);ctx.stroke();ctx.beginPath();ctx.arc(256,256,55,0,Math.PI*2);ctx.stroke();
 const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
 const turf=new THREE.Mesh(new THREE.PlaneGeometry(18,18),new THREE.MeshStandardMaterial({map:texture,roughness:1}));turf.rotation.x=-Math.PI/2;turf.position.set(0,-.012,-2);scene.add(turf);
 const seat=new THREE.BoxGeometry(.4,.065,.34),back=new THREE.BoxGeometry(.4,.28,.055);back.rotateX(-.12);back.translate(0,.15,-.145);
 const seatGeometry=mergeGeometries([seat,back]);seat.dispose();back.dispose();
 const rows=low?5:8,sections=low?16:24,seatMaterial=new THREE.MeshStandardMaterial({roughness:.95});
 const seats=new THREE.InstancedMesh(seatGeometry,seatMaterial,rows*sections),matrix=new THREE.Matrix4(),color=new THREE.Color();
 for(let row=0;row<rows;row++)for(let section=0;section<sections;section++){
  matrix.makeTranslation((section-(sections-1)/2)*.48,.28+row*.24,-4.6-row*.4);seats.setMatrixAt(row*sections+section,matrix);
  color.set((section+row)%7===0?'#688250':row%2?'#1c3448':'#263d50');seats.setColorAt(row*sections+section,color);
 }
 scene.add(seats);
 const terrace=new THREE.Mesh(new THREE.BoxGeometry(13,.28,3.8),new THREE.MeshStandardMaterial({color:'#15212c',roughness:1}));terrace.position.set(0,-.11,-6);scene.add(terrace);
 const poles=new THREE.InstancedMesh(new THREE.CylinderGeometry(.035,.05,4.3,6),new THREE.MeshStandardMaterial({color:'#374650',roughness:.75}),2);
 const lamps=new THREE.InstancedMesh(new THREE.BoxGeometry(.14,.09,.06),new THREE.MeshBasicMaterial({color:'#d8e9ea'}),20);
 for(let side=0;side<2;side++){const x=side?4.5:-4.5;matrix.makeTranslation(x,2.1,-5.5);poles.setMatrixAt(side,matrix);for(let n=0;n<10;n++){matrix.makeTranslation(x+(n%5-2)*.18,4.1+Math.floor(n/5)*.14,-5.4);lamps.setMatrixAt(side*10+n,matrix);}}
 scene.add(poles,lamps);
 for(const object of [turf,seats,terrace,poles,lamps])object.material.userData.openingStatic=true;
 scene.fog=new THREE.FogExp2('#0b151d',.09);
}
