import {footballerGeometry} from './footballer-model.js';
import {playerAppearance,identityHash,clubPresentation} from './presentation.js';
import {footballMotion} from './athlete-presentation.js';
import * as THREE from './vendor/three.module.js';
import {FBXLoader} from './vendor/FBXLoader.js';
import {clone} from './vendor/SkeletonUtils.js';
let assets;
const SKIN=['#bd8157','#e2af85','#78503a','#a86c4c','#d5a17b','#694432'];
const states=['idle','jog','sprint','turn','receive','dribble','pass','shoot','tackle','keeper-set','keeper-save','celebrate'];
const load=()=>assets||=(async()=>{const manager=new THREE.LoadingManager(),loader=new FBXLoader(manager);let timer;try{const [base,run,idle]=await Promise.race([Promise.all(['characterMedium','run','idle'].map(n=>loader.loadAsync('./assets/athlete/'+n+'.fbx'))),new Promise((_,reject)=>{timer=setTimeout(()=>{manager.abort();reject(Error('Player model loading timed out.'));},8000);})]);return {base,run:run.animations.find(c=>/Run$/.test(c.name)),idle:idle.animations.find(c=>/Idle$/.test(c.name))};}finally{clearTimeout(timer);}})().catch(error=>{assets=null;throw error;});
function footballClip(name,base,duration,poses){
 const times=poses.map(p=>p[0]),names=[...new Set(poses.flatMap(p=>Object.keys(p[1])))],tracks=[];
 base.traverse(b=>{if(!b.isBone)return;if(!names.includes(b.name))tracks.push(new THREE.QuaternionKeyframeTrack(b.name+'.quaternion',[0,duration],[...b.quaternion.toArray(),...b.quaternion.toArray()]));tracks.push(new THREE.VectorKeyframeTrack(b.name+'.position',[0,duration],[...b.position.toArray(),...b.position.toArray()]));});
 for(const bone of names){const q=base.getObjectByName(bone)?.quaternion||new THREE.Quaternion();const values=[];for(const [,pose] of poses){const a=pose[bone]||[0,0,0],r=new THREE.Quaternion().setFromEuler(new THREE.Euler(...a));values.push(...q.clone().multiply(r).toArray());}tracks.push(new THREE.QuaternionKeyframeTrack(bone+'.quaternion',times,values));}
 return new THREE.AnimationClip(name,duration,tracks);
}
export class AthleteTeam{
 constructor(scene,{count=22,detail='match'}={}){this.scene=scene;this.count=Math.max(1,Math.min(22,Math.floor(count)||22));this.detail=detail;this.people=[];this.disposed=false;this.ready=false;}
 async init(){const asset=await load();if(this.disposed)return;
  for(let i=0;i<this.count;i++){
   const root=new THREE.Group(),model=clone(asset.base),mixer=new THREE.AnimationMixer(model);root.add(model);const scale=.0063;model.scale.setScalar(scale);root.scale.set(.96,1.04,.96);
   const idle=mixer.clipAction(asset.idle);idle.play();mixer.update(.01);
   let mesh;model.traverse(o=>{if(o.isSkinnedMesh)mesh=o;});
   if(!this.geometryTemplate){const built=footballerGeometry(mesh,{detail:this.detail});this.geometryTemplate=built.geometry;this.vertexGroups=built.groups;}
   const geometry=this.geometryTemplate.clone(),colors=new Float32Array(geometry.attributes.position.count*3),indices=geometry.attributes.skinIndex,weights=geometry.attributes.skinWeight,groups=[];
   for(let v=0;v<geometry.attributes.position.count;v++){let best=0,weight=-1;for(let k=0;k<4;k++){const w=weights.array[v*4+k];if(w>weight){weight=w;best=indices.array[v*4+k];}}groups.push(this.vertexGroups[v]);}
   const headBone=mesh.skeleton.bones.find(b=>b.name==='Head');if(headBone){model.updateMatrixWorld(true);const center=mesh.worldToLocal(headBone.getWorldPosition(new THREE.Vector3())),positions=geometry.attributes.position;for(let v=0;v<positions.count;v++)if(groups[v]==='skin'){let best=0,weight=-1;for(let k=0;k<4;k++)if(weights.array[v*4+k]>weight){weight=weights.array[v*4+k];best=indices.array[v*4+k];}if(mesh.skeleton.bones[best]?.name==='Head'){positions.setX(v,center.x+(positions.getX(v)-center.x)*.88);positions.setZ(v,center.z+(positions.getZ(v)-center.z)*.9);}}positions.needsUpdate=true;geometry.computeVertexNormals();}geometry.setAttribute('color',new THREE.BufferAttribute(colors,3));mesh.geometry=geometry;mesh.material=new THREE.MeshStandardMaterial({vertexColors:true,roughness:.86,metalness:0});mesh.frustumCulled=false;
   let clips=this.clips;if(!clips){const base=clone(model);clips={idle:asset.idle,jog:asset.run,sprint:asset.run,dribble:asset.run,'keeper-set':asset.idle};
   clips.turn=footballClip('turn',base,.4,[[0,{Spine:[0,-.2,0]}],[.2,{Spine:[0,.25,0]}],[.4,{Spine:[0,0,0]}]]);
   clips.receive=footballClip('receive',base,.35,[[0,{RightUpLeg:[-.2,0,0],RightLeg:[.2,0,0]}],[.16,{RightUpLeg:[-.4,0,.1],RightLeg:[.45,0,0]}],[.35,{RightUpLeg:[0,0,0],RightLeg:[0,0,0]}]]);
   for(const [n,amount,d] of [['pass',.65,.36],['shoot',1.15,.5]])clips[n]=footballClip(n,base,d,[[0,{RightUpLeg:[amount*.55,0,0],RightLeg:[-.55,0,0],LeftUpLeg:[-.08,0,0],LeftArm:[-.15,0,.25],Spine:[.1,-.12,0]}],[d*.42,{RightUpLeg:[-amount,0,0],RightLeg:[.15,0,0],LeftUpLeg:[.08,0,0],LeftArm:[.15,0,.4],Spine:[-.08,.12,0]}],[d,{RightUpLeg:[0,0,0],RightLeg:[0,0,0],LeftUpLeg:[0,0,0],LeftArm:[0,0,0],Spine:[0,0,0]}]]);
   clips.tackle=footballClip('tackle',base,.45,[[0,{RightUpLeg:[0,0,0]}],[.2,{RightUpLeg:[-.9,0,-.2],Spine:[.25,0,0]}],[.45,{RightUpLeg:[0,0,0],Spine:[0,0,0]}]]);
   clips['keeper-save']=footballClip('keeper-save',base,.7,[[0,{LeftArm:[0,0,0],RightArm:[0,0,0]}],[.24,{LeftArm:[0,0,-1.2],RightArm:[0,0,1.2],Spine:[.15,0,.6],LeftUpLeg:[-.25,0,-.2],RightUpLeg:[.1,0,.15]}],[.7,{LeftArm:[0,0,0],RightArm:[0,0,0],Spine:[0,0,0],LeftUpLeg:[0,0,0],RightUpLeg:[0,0,0]}]]);
   clips.celebrate=footballClip('celebrate',base,1.2,[[0,{LeftArm:[0,0,0],RightArm:[0,0,0]}],[.35,{LeftArm:[0,0,-2],RightArm:[0,0,2]}],[1.2,{LeftArm:[0,0,-2],RightArm:[0,0,2]}]]);
   this.clips=clips;}
   const actions=Object.fromEntries(states.map(n=>[n,mixer.clipAction(clips[n])]));actions.sprint=actions.jog;actions.dribble=actions.jog;actions['keeper-set']=actions.idle;
   const canvas=document.createElement('canvas');canvas.width=64;canvas.height=64;const ctx=canvas.getContext('2d');ctx.fillStyle='#fff';ctx.font='bold 50px Arial';ctx.textAlign='center';ctx.fillText(String(i%11+1),32,52);const number=new THREE.Mesh(new THREE.PlaneGeometry(.38,.4),new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(canvas),transparent:true,side:THREE.DoubleSide,depthWrite:false}));number.position.set(0,1.34,-.16);root.add(number);
   const hair=new THREE.Mesh(new THREE.SphereGeometry(i%3===0?.27:.25,8,5,0,Math.PI*2,0,Math.PI*.58),new THREE.MeshStandardMaterial({color:['#25201b','#493324','#7e5838','#161a1c','#a77c4b','#30201d'][i%6],roughness:1}));hair.scale.y=i%3===0?.55:i%3===1?1:.8;root.add(hair);
   this.scene.add(root);this.people.push({root,model,mesh,mixer,actions,active:'idle',groups,colors,palette:'',angle:0,number,ctx,canvas,shirtNumber:i%11+1,hair,headVector:new THREE.Vector3(),head:model.getObjectByName('Head')});
  }
  // One number atlas and one hair batch replace forty-four individual draws.
  const atlas=document.createElement('canvas');atlas.width=640;atlas.height=320;const ink=atlas.getContext('2d');ink.fillStyle='#ffffff';ink.font='bold 48px Arial';ink.textAlign='center';
  for(let n=1;n<=50;n++)ink.fillText(String(n),(n-1)%10*64+32,Math.floor((n-1)/10)*64+51);
  const texture=new THREE.CanvasTexture(atlas);texture.colorSpace=THREE.SRGBColorSpace;
  const numberGeometry=new THREE.PlaneGeometry(.38,.4);this.numberOffsets=new Float32Array(this.count*2);numberGeometry.setAttribute('shirtOffset',new THREE.InstancedBufferAttribute(this.numberOffsets,2));
  const numberMaterial=new THREE.MeshBasicMaterial({map:texture,side:THREE.DoubleSide,alphaTest:.15,depthWrite:false});
  numberMaterial.onBeforeCompile=shader=>{shader.vertexShader='attribute vec2 shirtOffset; varying vec2 vShirtOffset;\n'+shader.vertexShader.replace('void main() {','void main() { vShirtOffset = shirtOffset;');shader.fragmentShader='varying vec2 vShirtOffset;\n'+shader.fragmentShader.replace('#include <map_fragment>','vec4 shirt = texture2D(map, vMapUv * vec2(0.1, 0.2) + vShirtOffset); diffuseColor *= shirt;');};
  this.numberBatch=new THREE.InstancedMesh(numberGeometry,numberMaterial,this.count);this.numberBatch.frustumCulled=false;
  this.hairBatch=new THREE.InstancedMesh(new THREE.SphereGeometry(.15,8,5,0,Math.PI*2,0,Math.PI*.58),new THREE.MeshStandardMaterial({roughness:1}),this.count);this.hairBatch.frustumCulled=false;
  for(let i=0;i<this.count;i++){const p=this.people[i];p.number.visible=false;p.hair.visible=false;this.hairBatch.setColorAt(i,p.hair.material.color);}
  this.scene.add(this.numberBatch,this.hairBatch);this.ready=true;
 }
 draw(pose,state,dt,moving,reduced,options={}){if(!this.ready)return;
  const homeColor=clubPresentation(state.homeClub||{}).color,awayColor=clubPresentation(state.awayClub||{color:'#86b7e7'}).color;if(this.kitKey!==homeColor+awayColor){const a=new THREE.Color(homeColor),b=new THREE.Color(awayColor);this.alternate=Math.hypot(a.r-b.r,a.g-b.g,a.b-b.b)<.55?'#64b5f2':awayColor;this.kitKey=homeColor+awayColor;}const alternate=this.alternate;
  for(let i=0;i<this.count;i++){const p=this.people[i];p.root.visible=pose.active?.[i]!==false;if(!p.root.visible){const hidden=new THREE.Matrix4().makeScale(0,0,0);this.numberBatch.setMatrixAt(i,hidden);this.hairBatch.setMatrixAt(i,hidden);continue;}const profile=state.rosters?.[i<11?0:1]?.[i%11]||{id:'legacy:'+i},appearance=playerAppearance(profile),xy=pose.positions[i],v=pose.velocities?.[i]||[0,0],speed=Math.hypot(...v),team=i<11?0:1,keeper=pose.keepers?pose.keepers.includes(i):i%11===0,color=keeper?'#f3a54e':team?alternate:homeColor;
   if(p.identity!==appearance.hash){p.identity=appearance.hash;p.root.scale.set(appearance.build*.95,appearance.height*1.04,appearance.build*.95);p.palette='';p.hair.scale.set(1,appearance.hash%3===0?.65:.9,1);this.hairBatch.setColorAt(i,new THREE.Color(appearance.hair));this.hairBatch.instanceColor.needsUpdate=true;}p.root.position.set((xy[0]-50)*1.05,0,(xy[1]-32)*1.0625);
   const aim=pose.kicker===i&&pose.kickAge<.4?pose.kickDirection:v;if(aim&&Math.hypot(...aim)>.2){const wanted=Math.atan2(aim[0],aim[1]),diff=Math.atan2(Math.sin(wanted-p.angle),Math.cos(wanted-p.angle));p.angle+=diff*(1-Math.exp(-dt*(speed>5?9:14)));p.root.rotation.z=Math.max(-.075,Math.min(.075,diff*.035))*Math.min(1,speed/4);}p.root.rotation.y=p.angle;
   const motion=options.motion?.[i]||footballMotion(pose,i,speed);let mode=motion.mode;
   if(motion.time===undefined&&speed>.3&&Math.abs(Math.atan2(Math.sin(Math.atan2(v[0],v[1])-p.angle),Math.cos(Math.atan2(v[0],v[1])-p.angle)))>1.2)mode='turn';
   if(mode!==p.active){const before=p.actions[p.active],next=p.actions[mode];if(before!==next){next.reset().fadeIn(.09).play();if(mode==='pass'||mode==='shoot')next.time=next.getClip().duration*.42;before.fadeOut(.12);}p.active=mode;}
   const shirtNumber=profile.number||i%11+1;if(p.shirtNumber!==shirtNumber){p.ctx.clearRect(0,0,64,64);p.ctx.fillText(String(shirtNumber),32,52);p.number.material.map.needsUpdate=true;p.shirtNumber=shirtNumber;}
   p.actions.jog.timeScale=Math.max(.18,Math.min(1.85,speed/5.6));if(motion.time!==undefined)p.actions[mode].time=Math.max(0,motion.time-(moving&&!reduced?dt:0));if(moving&&!reduced)p.mixer.update(dt);const head=p.head.getWorldPosition(p.headVector);p.root.worldToLocal(head);p.hair.position.copy(head);p.hair.position.y+=.09;
   p.number.updateMatrixWorld(true);p.hair.updateMatrixWorld(true);this.numberBatch.setMatrixAt(i,p.number.matrixWorld);this.hairBatch.setMatrixAt(i,p.hair.matrixWorld);const n=Math.max(1,Math.min(50,shirtNumber))-1;this.numberOffsets[i*2]=(n%10)/10;this.numberOffsets[i*2+1]=1-(Math.floor(n/10)+1)/5;
   const pattern=options.pattern??identityHash(team?(state.awayClub?.id||awayColor):(state.homeClub?.id||homeColor))%3,paletteKey=color+':'+appearance.hash+':'+pattern;if(p.palette!==paletteKey){const palette={shirt:new THREE.Color(color),short:new THREE.Color(team?'#142838':'#17221f'),sock:new THREE.Color(color),boot:new THREE.Color(i%2?'#e7efe1':'#de9b4b'),skin:new THREE.Color(appearance.skin),glove:new THREE.Color(keeper?'#eaf5df':appearance.skin),eye:new THREE.Color('#f5f3e9'),iris:new THREE.Color('#1a2529'),hair:new THREE.Color(appearance.hair),mouth:new THREE.Color('#694b41'),trim:new THREE.Color('#e8edf0'),sole:new THREE.Color('#161e26')};const positions=p.mesh.geometry.attributes.position,kit=p.mesh.geometry.attributes.kitCoord,trim=new THREE.Color(color).lerp(new THREE.Color('#f0f4ef'),.72);for(let v=0;v<p.groups.length;v++){let swatch=palette[p.groups[v]];if(p.groups[v]==='shirt'&&!keeper&&pattern&&Math.abs(Math.floor(pattern===1?kit.getX(v):kit.getY(v)))%2===0)swatch=trim;swatch.toArray(p.colors,v*3);}p.mesh.geometry.attributes.color.needsUpdate=true;p.palette=paletteKey;}
  }
  this.numberBatch.instanceMatrix.needsUpdate=true;this.hairBatch.instanceMatrix.needsUpdate=true;this.numberBatch.geometry.attributes.shirtOffset.needsUpdate=true;
 }
 dispose(){this.geometryTemplate?.dispose();this.disposed=true;for(const batch of [this.numberBatch,this.hairBatch])if(batch){this.scene.remove(batch);batch.geometry.dispose();batch.material.map?.dispose();batch.material.dispose();}for(const p of this.people){this.scene.remove(p.root);p.mixer.stopAllAction();p.mixer.uncacheRoot(p.model);p.mesh.geometry.dispose();p.mesh.material.dispose();p.number.material.map.dispose();p.number.geometry.dispose();p.number.material.dispose();p.hair.geometry.dispose();p.hair.material.dispose();}this.people=[];}
}
