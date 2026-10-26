import * as THREE from './vendor/three.module.js';
import {AthleteTeam} from './athletes.js';
import {openingChoreography} from './opening-choreography.js';
import {addOpeningStadium} from './opening-stadium.js';

// Composite the live WebGL frame onto a display canvas. This avoids WebKit
// dropping a transparent WebGL surface in the animated native-dialog layer.
// No encoded images or frame-by-frame textures are created.
export class OpeningScene{
 constructor(canvas,{reduced=false,quality='auto',onUnavailable=()=>{}}={}){
  this.canvas=canvas;this.renderCanvas=document.createElement('canvas');this.reduced=reduced;this.quality=quality;this.onUnavailable=onUnavailable;this.elapsed=0;this.frames=0;this.paused=false;this.requested=false;this.disposed=false;
  this.scene=new THREE.Scene();this.camera=new THREE.PerspectiveCamera(34,1,.1,40);this.foot=new THREE.Vector3();this.launch=new THREE.Vector3(-.16,.16,.42);
  try{this.surface=canvas.getContext('2d');if(!this.surface)throw Error('No presentation surface.');this.renderer=new THREE.WebGLRenderer({canvas:this.renderCanvas,alpha:true,preserveDrawingBuffer:true,antialias:quality!=='low',powerPreference:'low-power'});}catch{this.ready=Promise.resolve(false);this.disposed=true;canvas.dataset.model='fallback';return;}
  this.renderer.outputColorSpace=THREE.SRGBColorSpace;this.renderer.toneMapping=THREE.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1.05;this.renderer.setClearColor(0,0);
  this.scene.add(new THREE.HemisphereLight('#c5dce8','#14281e',1.45));
  const key=new THREE.DirectionalLight('#fff0dc',2.4);key.position.set(-3,5,6);const rim=new THREE.DirectionalLight('#b8f868',1.8);rim.position.set(3,3,-4);const fill=new THREE.DirectionalLight('#6ca5df',.8);fill.position.set(4,2,3);this.scene.add(key,rim,fill);
  addOpeningStadium(this.scene,{low:quality==='low'});
  const ink=document.createElement('canvas');ink.width=128;ink.height=128;const ctx=ink.getContext('2d'),gradient=ctx.createRadialGradient(64,64,4,64,64,62);gradient.addColorStop(0,'rgba(0,0,0,.75)');gradient.addColorStop(.6,'rgba(0,0,0,.3)');gradient.addColorStop(1,'rgba(0,0,0,0)');ctx.fillStyle=gradient;ctx.fillRect(0,0,128,128);
  const shadowGeometry=new THREE.PlaneGeometry(2.2,1.8);shadowGeometry.rotateX(-Math.PI/2);this.shadow=new THREE.Mesh(shadowGeometry,new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(ink),transparent:true,depthWrite:false}));this.shadow.position.y=.015;this.scene.add(this.shadow);
  this.ball=new THREE.Mesh(new THREE.IcosahedronGeometry(.13,2),new THREE.MeshStandardMaterial({color:'#f7f5e7',roughness:.6}));
  const seams=new THREE.LineSegments(new THREE.EdgesGeometry(this.ball.geometry,18),new THREE.LineBasicMaterial({color:'#304c36',transparent:true,opacity:.65}));this.ball.add(seams);
  const patchGeometry=new THREE.CircleGeometry(.037,5),patchMaterial=new THREE.MeshStandardMaterial({color:'#20352e',roughness:.8});
  for(const direction of [[0,0,1],[0,0,-1],[1,0,0],[-1,0,0],[0,1,0],[0,-1,0]]){const patch=new THREE.Mesh(patchGeometry,patchMaterial);patch.position.set(...direction).multiplyScalar(.129);patch.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,1),new THREE.Vector3(...direction));this.ball.add(patch);}this.scene.add(this.ball);
  this.team=new AthleteTeam(this.scene,{count:1,detail:'hero'});
  this.state={homeClub:{id:'touchline-opening',color:'#b6f36a'},awayClub:{color:'#73a5d9'},rosters:[[{id:'touchline-original-10',name:'Touchline athlete',personId:'touchline-original-10',number:10}],[]]};
  this.onLost=e=>{e.preventDefault();if(!this.disposed){this.dispose();canvas.dataset.model='fallback';this.onUnavailable();}};this.renderCanvas.addEventListener('webglcontextlost',this.onLost);
  this.onVisibility=()=>{this.last=0;if(document.hidden)this.cancel();else this.schedule();};document.addEventListener('visibilitychange',this.onVisibility);
  this.pointer=new THREE.Vector2();this.pointerTarget=new THREE.Vector2();this.pointerSurface=canvas.closest('dialog')||canvas;
  this.onPointer=e=>{if(e.pointerType!=='mouse'||this.reduced||this.paused)return;const rect=this.pointerSurface.getBoundingClientRect();this.pointerTarget.set(THREE.MathUtils.clamp((e.clientX-rect.left)/rect.width*2-1,-1,1),THREE.MathUtils.clamp((e.clientY-rect.top)/rect.height*2-1,-1,1));};
  this.onPointerLeave=()=>this.pointerTarget.set(0,0);this.pointerSurface.addEventListener('pointermove',this.onPointer,{passive:true});this.pointerSurface.addEventListener('pointerleave',this.onPointerLeave);
  this.resize=new ResizeObserver(()=>{if(!this.disposed&&this.team.ready)this.render(0);});this.resize.observe(canvas);
  this.ready=this.team.init().then(()=>{if(this.disposed)return false;this.actor=this.team.people[0];this.actor.mesh.material.roughness=.76;this.materials=new Set();this.scene.traverse(o=>{for(const m of o.material?(Array.isArray(o.material)?o.material:[o.material]):[]){if(this.materials.has(m))continue;this.materials.add(m);m.userData.openingOpacity=m.opacity;m.transparent=true;m.needsUpdate=true;}});canvas.dataset.model='skinned-3d';canvas.dataset.vertices=String(this.actor.mesh.geometry.attributes.position.count);this.render(0);this.schedule();return true;}).catch(()=>{if(!this.disposed){this.dispose();canvas.dataset.model='fallback';this.onUnavailable();}return false;});
 }
 start(){if(!this.requested)this.elapsed=.65;this.requested=true;if(this.team?.ready&&!this.disposed)this.render(0);this.schedule();}
 setPaused(value){this.paused=value;this.canvas.dataset.paused=String(value);this.last=0;if(value)this.cancel();else this.schedule();}
 setReduced(value){this.reduced=value;this.last=0;this.pointer?.set(0,0);this.pointerTarget?.set(0,0);this.cancel();if(this.team?.ready&&!this.disposed)this.render(0);this.schedule();}
 cancel(){if(this.frame)cancelAnimationFrame(this.frame);this.frame=0;}
 schedule(){if(this.disposed||!this.team?.ready||!this.requested||this.paused||this.reduced||document.hidden||this.frame)return;this.frame=requestAnimationFrame(now=>this.tick(now));}
 tick(now){this.frame=0;if(this.disposed||document.hidden||this.paused||this.reduced)return;const delta=this.last?Math.min(.1,(now-this.last)/1000):0;if(!this.last||delta>=1/(this.quality==='low'?24:60)-.001){this.last=now;this.elapsed+=delta;this.render(delta);}this.schedule();}
 render(dt){
  if(this.disposed||!this.team?.ready)return;const w=Math.max(1,this.canvas.clientWidth),h=Math.max(1,this.canvas.clientHeight),ratio=this.quality==='low'?.75:Math.min(devicePixelRatio||1,1.25);
  if(this.width!==w||this.height!==h||this.ratio!==ratio){this.width=w;this.height=h;this.ratio=ratio;this.renderer.setPixelRatio(ratio);this.renderer.setSize(w,h,false);this.canvas.width=this.renderCanvas.width;this.canvas.height=this.renderCanvas.height;this.camera.aspect=w/h;this.camera.updateProjectionMatrix();}
  const shot=openingChoreography(this.elapsed,{still:this.reduced}),[x,z]=shot.position;
  const pose={positions:[[50+x/1.05,32+z/1.0625]],velocities:[shot.velocity],keepers:[],carrier:0,phase:'PLAY',clock:this.elapsed};
  this.team.draw(pose,this.state,dt,!this.reduced,this.reduced,{motion:[shot.motion],pattern:0});this.scene.updateMatrixWorld(true);
  if(shot.phase==='celebrate'||shot.phase==='settle'){const weight=shot.phase==='settle'?Math.max(0,1-(shot.time-7.2)/.8):Math.min(1,(shot.time-4.6)/.45);for(const [side,sign] of [['Left',1],['Right',-1]]){this.raiseLimb(side+'Arm',side+'ForeArm',new THREE.Vector3(sign*.2,1,-.05),weight);this.raiseLimb(side+'ForeArm',side+'Hand',new THREE.Vector3(sign*.05,1,0),weight);}}
  this.actor.model.getObjectByName('RightFoot').getWorldPosition(this.foot);this.foot.y=Math.max(.13,this.foot.y+.07);this.foot.z+=.27;
  if(shot.ball.kind==='foot')this.launch.copy(this.foot);
  else if(shot.phase==='wind-up')this.launch.copy(this.foot);
  this.ball.visible=shot.ball.kind!=='hidden';
  if(shot.ball.kind==='flight'){const age=shot.ball.age;this.ball.position.copy(this.launch).add(new THREE.Vector3(0,age*2.6-age*age*1.2,age*10));}
  else if(shot.ball.kind==='foot')this.ball.position.copy(this.foot);
  else if(shot.ball.position)this.ball.position.set(...shot.ball.position);
  this.ball.rotation.set(this.elapsed*3,this.elapsed*1.2,0);this.shadow.position.z=z;
  if(!this.reduced&&dt>0)this.pointer.lerp(this.pointerTarget,1-Math.exp(-4*dt));
  const orbit=this.reduced?0:Math.sin(shot.time*.24)*.12;this.camera.position.set((w/h<.9?1.8:2.3)+orbit+this.pointer.x*.13,1.28-this.pointer.y*.06,(w/h<.9?4:4.8)+z*.15);this.camera.lookAt(0,1.02,z*.35);
  for(const m of this.materials)m.opacity=m.userData.openingOpacity*(m.userData.openingStatic?1:shot.opacity);this.renderer.render(this.scene,this.camera);this.surface.clearRect(0,0,this.canvas.width,this.canvas.height);this.surface.drawImage(this.renderCanvas,0,0);Object.assign(this.canvas.dataset,{phase:shot.phase,frames:String(++this.frames),paused:String(this.paused),reduced:String(this.reduced),drawCalls:String(this.renderer.info.render.calls),cameraX:this.camera.position.x.toFixed(4)});
  if(this.lastPhase!==shot.phase){this.lastPhase=shot.phase;this.canvas.dispatchEvent(new CustomEvent('openingphase',{detail:shot.phase}));}
 }
 raiseLimb(name,childName,direction,weight){const bone=this.actor.model.getObjectByName(name),child=this.actor.model.getObjectByName(childName),from=bone.getWorldPosition(new THREE.Vector3()),to=child.getWorldPosition(new THREE.Vector3()),world=bone.getWorldQuaternion(new THREE.Quaternion()),rotation=new THREE.Quaternion().setFromUnitVectors(to.sub(from).normalize(),direction.normalize());world.premultiply(rotation);const local=bone.parent.getWorldQuaternion(new THREE.Quaternion()).invert().multiply(world);bone.quaternion.slerp(local,weight);bone.updateWorldMatrix(false,true);}
 dispose(){
  if(this.disposed)return;this.disposed=true;this.cancel();this.resize?.disconnect();document.removeEventListener('visibilitychange',this.onVisibility);this.pointerSurface?.removeEventListener('pointermove',this.onPointer);this.pointerSurface?.removeEventListener('pointerleave',this.onPointerLeave);this.renderCanvas.removeEventListener('webglcontextlost',this.onLost);this.team?.dispose();const geometries=new Set(),materials=new Set(),textures=new Set();this.scene.traverse(o=>{if(o.geometry)geometries.add(o.geometry);for(const m of o.material?(Array.isArray(o.material)?o.material:[o.material]):[]){materials.add(m);if(m.map)textures.add(m.map);}});textures.forEach(t=>t.dispose());geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());this.renderer?.dispose();this.renderer?.forceContextLoss();this.canvas.width=1;this.canvas.height=1;this.renderCanvas.width=1;this.renderCanvas.height=1;this.canvas.dataset.model='disposed';
 }
}
