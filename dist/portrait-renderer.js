import * as THREE from './vendor/three.module.js';
import {AthleteTeam} from './athletes.js';

// Build-time studio: original 3D portraits, not photos or real-player likenesses.
// The application displays the baked images without opening a WebGL context.
export async function createPortraitStudio(canvas){
 const scene=new THREE.Scene();scene.background=new THREE.Color('#152536');
 const renderer=new THREE.WebGLRenderer({canvas,antialias:true,preserveDrawingBuffer:true});
 renderer.setSize(192,240,false);renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.12;
 const camera=new THREE.PerspectiveCamera(27,192/240,.05,10);
 scene.add(new THREE.HemisphereLight('#e3edf7','#19202b',2.1));
 for(const [color,intensity,position] of [['#fff1de',3.1,[-2,3,4]],['#8badcf',1.2,[3,1,2]],['#bfdc9f',2.1,[1,3,-2]]]){const light=new THREE.DirectionalLight(color,intensity);light.position.set(...position);scene.add(light);}
 const team=new AthleteTeam(scene,{count:1,detail:'hero'});await team.init();
 const pose={positions:[[50,32]],velocities:[[0,0]],keepers:[],carrier:null,phase:'PLAY'};
 return {
  render(player={}){
   const actor=team.people[0];actor.angle=-.12;actor.root.rotation.y=-.12;
   team.draw(pose,{homeClub:{id:'portrait-studio',color:'#23394c'},awayClub:{color:'#23394c'},rosters:[[player],[]]},0,false,true,{pattern:0,motion:[{mode:'idle'}]});
   scene.updateMatrixWorld(true);const head=actor.head.getWorldPosition(new THREE.Vector3());
   camera.position.set(.19,head.y-.055,1.34);camera.lookAt(0,head.y-.135,0);renderer.render(scene,camera);
   return canvas.toDataURL('image/webp',.86);
  },
  dispose(){team.dispose();renderer.dispose();renderer.forceContextLoss();}
 };
}
