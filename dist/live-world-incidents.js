import {directPlayer,directTarget,directMultiplier,applyDirectAction} from './direct-play.js';
import {physicalContact,recordIncident} from './physical-incidents.js';
import {FORMATIONS,PRESETS,player,defaultLineup,copy} from './engine.js';

export const LIVE_VERSION='2.1.0';
export const HZ=60, MATCH_SECONDS=240, TICKS_PER_MINUTE=160;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const dist=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1]);
const teamOf=i=>i<11?0:1;
const segment=(p,a,b)=>{const dx=b[0]-a[0],dy=b[1]-a[1],l=dx*dx+dy*dy,t=clamp(((p[0]-a[0])*dx+(p[1]-a[1])*dy)/(l||1),0,1);return {d:Math.hypot(p[0]-a[0]-t*dx,p[1]-a[1]-t*dy),t};};
const position=(slot,team)=>{const x=slot.role==='GK'?4:8+(100-slot.y)*.82,y=4+slot.x*.56;return team?[100-x,64-y]:[x,y];};

// The same fixed-step world drives watched, skipped and replayed games.
// Randomness affects decisions and execution error; goals require a goal-line crossing.
export class IncidentWorld{
 constructor(state){
  this.state=state;this.rosters=state.rosters||[state.lineup.map(player),defaultLineup().map(player)];
  this.events=copy(state.events||[]);this.accumulator=0;this.planStart=0;this.previous=null;
  if(state.world){Object.assign(this,copy(state.world));this.accumulator=0;}
  else{
   this.seed=state.seed>>>0;this.ticks=(state.minute||0)*TICKS_PER_MINUTE;this.clock=this.ticks/HZ;
   this.positions=[0,1].flatMap(t=>FORMATIONS[t?state.awayFormation||'4-3-3':state.formation].map(s=>position(s,t)));
   this.velocity=this.positions.map(()=>[0,0]);this.ball=[50,32];this.ballV=[0,0];this.height=0;this.vz=0;
   this.owner=6;this.team=0;this.positions[6]=[49.4,32];this.phase='KICK-OFF';this.held=0;this.lastTouch=6;
   this.score=[...(state.score||[0,0])];this.shots=[...(state.shots||[0,0])];this.xg=[...(state.xg||[0,0])];
   this.possession=[0,0];this.recoveries=[0,0];this.energy=this.positions.map(()=>100);this.switches=0;
   this.passes=[0,0];this.completed=[0,0];this.restart=null;this.flight=null;this.lastSwitch=-10;this.kickAt=-10;this.saveAt=-10;this.eventId=0;
   this.distanceRun=[0,0];this.pressureSum=[0,0];this.pressureSamples=[0,0];
  }
  this.planStart=this.ticks;
  this.injuryCounts||=[0,0];this.lastIncidentContact??=-10;
  if(!this.isActive(this.owner)&&this.owner!==null){this.owner=this.state.activeSlots.findIndex((a,i)=>a&&!this.isKeeper(i));this.team=teamOf(this.owner);this.lastTouch=this.owner;this.positions[this.owner]=[49.4,32];}
  const control=this.state.directControl;if(control?.enabled&&(!this.isActive(control.team*11+control.slot)||this.isKeeper(control.team*11+control.slot))){const next=this.state.activeSlots.findIndex((a,i)=>a&&teamOf(i)===control.team&&!this.isKeeper(i));if(next>=0)control.slot=next%11;}
 }
 isActive(i){return Number.isInteger(i)&&i>=0&&i<22&&this.state.activeSlots[i];}
 isKeeper(i){return this.state.keeperSlots[Math.floor(i/11)]===i;}
 contact(defender,victim,manual=false){return physicalContact(this,defender,victim,manual);}
 random(){this.seed=(Math.imul(this.seed,1664525)+1013904223)>>>0;return this.seed/4294967296;}
 profile(i){const p=this.rosters[teamOf(i)][i%11];return this.isKeeper(i)&&p.role!=='GK'?{...p,defense:Math.min(40,p.defense*.4)}:p;}
 preset(team){return team===0?this.state.preset:this.state.awayPreset||'balanced';}
 emit(type,team,text,extra={}){const e={id:'live-'+(++this.eventId),tick:this.ticks,minute:Math.min(90,Math.max(1,Math.ceil(this.ticks/TICKS_PER_MINUTE))),team,type,text,...extra};if(Number.isInteger(extra.player))e.playerId=this.profile(extra.player).id;if(type==='goal'){const index=this.flight?.scorerIndex??this.lastTouch,p=this.profile(index),ownGoal=teamOf(index)!==team;Object.assign(e,{scorer:p.name,scorerId:p.id,ownGoal});e.text=ownGoal?p.name+' puts the ball into their own net.':p.name+' finds the net!';recordIncident(this,ownGoal?'own-goal':'goal',ownGoal?1-team:team,{player:p.id});}this.events.push(e);return e;}
 plan(state){this.state=state;this.planStart=this.ticks;this.rosters=state.rosters||[state.lineup.map(player),this.rosters[1]];}
 serialize(){const keys=['seed','ticks','clock','positions','velocity','ball','ballV','height','vz','owner','team','phase','held','lastTouch','score','shots','xg','possession','recoveries','energy','switches','passes','completed','restart','flight','lastSwitch','kickAt','kicker','kickDirection','saveAt','eventId','distanceRun','pressureSum','pressureSamples','tackler','tackleAt'];keys.push('lastIncidentContact','injuryCounts');if(this.state.controlVersion===1)keys.push('directSequence');return Object.fromEntries(keys.map(k=>[k,copy(this[k]??null)]));}
 take(i,kind='RECEIVE'){
  if(!this.isActive(i))return;const old=this.team,from=this.owner;this.owner=i;this.team=teamOf(i);this.lastTouch=i;this.held=0;this.ballV=[0,0];this.vz=0;this.height=0;
  if(this.flight?.kind==='PASS'&&this.flight.team===this.team){this.completed[this.team]++;}
  this.flight=null;this.phase=kind;if(this.state.directControl?.enabled&&teamOf(i)===this.state.directControl.team&&!this.isKeeper(i))this.state.directControl.slot=i%11;
  if(old!==this.team){this.switches++;this.lastSwitch=this.clock;this.recoveries[this.team]++;const high=this.team===0?this.ball[0]>60:this.ball[0]<40;
   this.emit('recovery',this.team,`${this.profile(i).name} wins possession${high?' high up the pitch':''}.`,{x:this.ball[0],y:this.ball[1],high,player:i,previous:from});}
 }
 kick(target,kind='PASS',receiver=null){
  const i=this.owner;if(!this.isActive(i))return;const p=this.profile(i),dx=target[0]-this.ball[0],dy=target[1]-this.ball[1],d=Math.hypot(dx,dy)||1;
  this.kicker=i;this.kickAt=this.clock;this.kickDirection=[dx,dy];this.lastTouch=i;this.owner=null;this.phase=kind;
  const speed=kind==='SHOT'?27+(p.attack||p.rating)*.035:clamp(13+d*.32,16,25);
  this.ballV=[dx/d*speed,dy/d*speed];this.vz=kind==='SHOT'?1.1+this.random()*2.6:.2;this.height=.05;
  const backLine=this.positions.slice((1-this.team)*11,(2-this.team)*11).filter((q,j)=>this.isActive((1-this.team)*11+j)).map(q=>q[0]).sort((a,b)=>this.team?a-b:b-a)[1],dir=this.team?-1:1;
  const receiving=receiver===null?null:this.positions[receiver];
  this.flight={kind,team:this.team,receiver,age:0,scorer:p.name,scorerId:p.id,scorerIndex:i,start:[...this.ball],offside:!!receiving&&(receiving[0]-50)*dir>0&&(receiving[0]-this.ball[0])*dir>0&&(receiving[0]-backLine)*dir>.1};
  if(kind==='PASS'){this.passes[this.team]++;}
  else{const xg=clamp(.5-dist(this.ball,[this.team?0:100,32])*.012-Math.abs(this.ball[1]-32)*.008,.03,.5);this.shots[this.team]++;this.xg[this.team]+=xg;this.emit('shot',this.team,`${p.name} shoots.`,{scorer:p.name,xg,x:this.ball[0],y:this.ball[1]});}
 }
 restartAt(type,team,point){
  this.owner=null;this.flight=null;this.ballV=[0,0];this.height=0;this.vz=0;
  this.restart={type,team,point,time:type==='KICK-OFF'?2.2:.85,placed:false};this.phase=type==='KICK-OFF'?'GOAL':type;
 }
 decision(){
  if(this.owner!==null&&directPlayer(this)===this.owner)return;
  if(this.owner===null||this.restart)return;
  const i=this.owner,team=teamOf(i),dir=team?-1:1,p=this.positions[i],profile=this.profile(i),preset=this.preset(team),goal=[team?0:100,32];
  let nearest=100;for(let j=(1-team)*11;j<(2-team)*11;j++)if(this.isActive(j)&&!this.isKeeper(j))nearest=Math.min(nearest,dist(p,this.positions[j]));
  const goalDist=dist(p,goal),shotZone=(team?100-p[0]:p[0])>72&&Math.abs(p[1]-32)<20;
  if(!this.isKeeper(i)&&this.held>.45&&shotZone&&goalDist<28&&(nearest<4||this.held>1.8||goalDist<15)){
   const error=(100-(profile.attack||profile.rating))*.055+goalDist*.045;
   const aim=32+(this.random()-.5)*error*3.3;this.kick([team?-1:101,aim],'SHOT');return;
  }
  const build=this.state.buildUps?.[team]||'mixed';
  const patience=build==='direct'?.55:preset==='protect'?1.1:preset==='press'?.65:.95;
  if(this.held<patience&&nearest>3.7)return;
  let best=null;const opponents=this.positions.slice((1-team)*11,(2-team)*11).filter((p,j)=>this.isActive((1-team)*11+j));
  const ordered=opponents.map(q=>q[0]).sort((a,b)=>team?a-b:b-a),offside=ordered[1];
  for(let j=team*11+1;j<(team+1)*11;j++){
   if(j===i||!this.isActive(j))continue;const q=this.positions[j],d=dist(p,q);if(d<5||d>(build==='short'?23:build==='direct'?46:36))continue;
   if((q[0]-50)*dir>0&&(q[0]-p[0])*dir>0&&(q[0]-offside)*dir>.3)continue;
   const v=this.velocity[j],lead=[clamp(q[0]+v[0]*d/25,2,98),clamp(q[1]+v[1]*d/25,2,62)];
   let clear=20,lane=20;for(const op of opponents){clear=Math.min(clear,dist(op,lead));const line=segment(op,this.ball,lead);if(line.t>.12&&line.t<.95)lane=Math.min(lane,line.d);}
   const progress=(lead[0]-p[0])*dir,score=progress*(build==='direct'?1.15:build==='short'?.5:preset==='protect'?.45:.8)+Math.min(clear,9)*.6+Math.min(lane,6)*(build==='short'?1.5:.9)-d*.07+(this.random()-.5)*2;
   if(!best||score>best.score)best={j,lead,score,lane};
  }
  if(best&&(nearest<3||this.held>2.6||this.isKeeper(i)||best.score>13)){
   const error=(100-(profile.control||profile.rating))*.009;
   this.kick([best.lead[0]+(this.random()-.5)*error,best.lead[1]+(this.random()-.5)*error],'PASS',best.j);
  }
 }
 fixed(){
  if(this.ticks>=90*TICKS_PER_MINUTE)return;
  const dt=1/HZ;this.previous={positions:this.positions.map(p=>[...p]),ball:[...this.ball],height:this.height};
  this.ticks++;this.clock=this.ticks/HZ;this.held+=dt;
  if(this.restart){if(this.state.controlVersion===1)this.directSequence=this.state.directControl?.sequence??0;const r=this.restart;r.time-=dt;
   if(r.type==='KICK-OFF'&&r.time>.8){this.phase='GOAL';return;}
   this.phase=r.type;
   if(!r.placed){this.ball=[...r.point];r.placed=true;
    if(r.type==='KICK-OFF'){const reset=[0,1].flatMap(t=>FORMATIONS[t?this.state.awayFormation||'4-3-3':this.state.formation].map(s=>position(s,t)));this.positions=reset.map((p,i)=>this.isActive(i)?p:this.positions[i]);this.velocity=this.positions.map(()=>[0,0]);}
   }
   const candidates=Array.from({length:11},(_,j)=>r.team*11+j).filter(j=>this.isActive(j)&&(r.type!=='GOAL KICK'||this.isKeeper(j))).sort((a,b)=>dist(this.positions[a],r.point)-dist(this.positions[b],r.point));
   const taker=candidates[0];this.positions[taker]=[clamp(r.point[0]+(r.team?.6:-.6),1,99),clamp(r.point[1],1,63)];this.velocity[taker]=[0,0];
   if(r.time<=0){this.team=r.team;this.take(taker);this.held=.7;this.restart=null;}
   return;
  }
  if(this.state.controlVersion===1)applyDirectAction(this);
  if(this.owner!==null&&this.isActive(this.owner)&&this.ticks%30===0){const victim=this.owner,team=teamOf(victim);const challengers=Array.from({length:11},(_,j)=>(1-team)*11+j).filter(i=>this.isActive(i)&&!this.isKeeper(i)).sort((a,b)=>dist(this.positions[a],this.positions[victim])-dist(this.positions[b],this.positions[victim]));const defender=challengers[0];if(defender!==undefined&&dist(this.positions[defender],this.positions[victim])<1.35&&physicalContact(this,defender,victim))return;}
  this.possession[this.team]++;
  const nearest=[[],[]];for(let t=0;t<2;t++)nearest[t]=Array.from({length:11},(_,j)=>t*11+j).filter(i=>this.isActive(i)&&!this.isKeeper(i)).sort((a,b)=>dist(this.positions[a],this.ball)-dist(this.positions[b],this.ball));
  const target=this.positions.map((p,i)=>{
   if(!this.isActive(i))return p;const team=teamOf(i),dir=team?-1:1,attacking=team===this.team,shape=FORMATIONS[team?this.state.awayFormation||'4-3-3':this.state.formation],slot=shape[i%11],preset=this.preset(team),base=position(slot,team);
   let x=base[0]+(this.ball[0]-50)*.33+dir*(attacking?6:preset==='press'?7:preset==='protect'?-7:0),y=base[1]+(this.ball[1]-32)*.22;
   if(i===this.owner){x=p[0]+dir*9;y=p[1]+clamp((32-p[1])*.17,-3,3);}
   else if(this.isKeeper(i)){x=team?96:4;y=clamp(32+(this.ball[1]-32)*.36,28.5,35.5);
    if(this.flight?.kind==='SHOT'&&this.flight.team!==team&&this.flight.age>.18){const bv=this.ballV;if(Math.abs(bv[0])>1){const eta=(x-this.ball[0])/bv[0];if(eta>0&&eta<1.4)y=clamp(this.ball[1]+bv[1]*eta,27.2,36.8);}}
   }
   else if(!attacking&&i===nearest[team][0]){const lead=preset==='press'?.28:.12;x=this.ball[0]+this.ballV[0]*lead;y=this.ball[1]+this.ballV[1]*lead;}
   else if(!attacking&&preset==='press'&&i===nearest[team][1]){x=this.ball[0]-dir*4;y=this.ball[1]+(p[1]>this.ball[1]?5:-5);}
   else if(this.owner===null&&i===nearest[team][0]){x=this.ball[0]+this.ballV[0]*.2;y=this.ball[1]+this.ballV[1]*.2;}
   else if(attacking&&this.flight?.receiver===i){x=this.ball[0]+this.ballV[0]*.3;y=this.ball[1]+this.ballV[1]*.3;}
   else if(attacking&&slot.role==='FWD'){x+=dir*4;y+=Math.sin(this.clock*.8+i)*2;const backLine=this.positions.slice((1-team)*11,(2-team)*11).filter((p,j)=>this.isActive((1-team)*11+j)).map(q=>q[0]).sort((a,b)=>team?a-b:b-a)[1];if((x-this.ball[0])*dir>0)x=team?Math.max(x,backLine+1):Math.min(x,backLine-1);}
   // Short-range separation keeps support runners from occupying the same lane.
   for(let j=team*11;j<(team+1)*11;j++){if(j===i||!this.isActive(j))continue;const q=this.positions[j],d=dist(p,q);if(d>0&&d<3){x+=(p[0]-q[0])*(3-d)*.5;y+=(p[1]-q[1])*(3-d)*.5;}}
   const responsibility=this.state.roles?.[team]?.[i%11];
   if(attacking&&i!==this.owner&&!this.isKeeper(i)){if(responsibility==='hold')x-=dir*8;if(responsibility==='attack')x+=dir*6;}
   return directTarget(this,i,[clamp(x,1.8,98.2),clamp(y,2,62)]);
  });
  for(let i=0;i<22;i++){
   if(!this.isActive(i)){this.velocity[i]=[0,0];continue;}const p=this.positions[i],v=this.velocity[i],t=teamOf(i),preset=this.preset(t),d=dist(p,target[i]),prof=this.profile(i),isPressing=!((i<11?0:1)===this.team)&&nearest[t].slice(0,preset==='press'?2:1).includes(i);
   const pace=['attributes-2.3','incidents-1'].includes(this.state.rulesVersion)&&Number.isFinite(prof.pace)?Math.max(35,Math.min(99,prof.pace)):null;
   const movement=pace===null?(this.isKeeper(i)?5.4:i===this.owner?5.6:6.4+(prof.stamina||80)*.012):(this.isKeeper(i)?3.9+pace*.021:i===this.owner?3.7+pace*.027:4.6+pace*.032);
   const max=movement*(0.75+this.energy[i]*.0025)*(isPressing&&preset==='press'?1.08:1)*directMultiplier(this,i);
   const desired=d>.12?[(target[i][0]-p[0])/d*Math.min(max,d*2.5),(target[i][1]-p[1])/d*Math.min(max,d*2.5)]:[0,0];
   const change=[desired[0]-v[0],desired[1]-v[1]],length=Math.hypot(...change),scale=length?Math.min(1,13*dt/length):0;
   v[0]+=change[0]*scale;v[1]+=change[1]*scale;p[0]=clamp(p[0]+v[0]*dt,.6,99.4);p[1]=clamp(p[1]+v[1]*dt,.6,63.4);
   const speed=Math.hypot(...v),conditioning=['attributes-2.3','incidents-1'].includes(this.state.rulesVersion)?1+(80-(prof.stamina||80))*.008:1;this.distanceRun[t]+=speed*dt;this.energy[i]=Math.max(25,this.energy[i]-dt*(.025+speed*.016)*(preset==='press'?1.5:preset==='protect'?.78:1)*conditioning);
  }
  if(this.owner!==null){
   const i=this.owner,p=this.positions[i],v=this.velocity[i],speed=Math.hypot(...v),dir=this.team?-1:1;
   const reach=.45+.13*(1+Math.sin(this.clock*13));const foot=[p[0]+(speed>.2?v[0]/speed:dir)*reach,p[1]+(speed>.2?v[1]/speed:0)*reach];
   const delta=[foot[0]-this.ball[0],foot[1]-this.ball[1]],length=Math.hypot(...delta),scale=length?Math.min(1,12*dt/length):0;this.ball[0]+=delta[0]*scale;this.ball[1]+=delta[1]*scale;this.height=.02;this.ballV=[...v];
   const def=nearest[1-this.team][0],d=dist(this.positions[def],this.ball);this.pressureSum[1-this.team]+=dist(this.positions[def],p);this.pressureSamples[1-this.team]++;
   const tackleReach=.69+Math.max(0,(this.profile(def).defense||75)-60)*.007;
   if(d<tackleReach&&this.held>.28&&this.clock-this.lastSwitch>.28){if(physicalContact(this,def,i))return;
    this.owner=null;this.tackler=def;this.tackleAt=this.clock;const dv=this.velocity[def];this.ballV=[dv[0]*.7+dir*1.5,dv[1]*.7];this.flight={kind:'LOOSE BALL',team:1-this.team,age:0};this.phase='TACKLE';this.lastTouch=def;
   }
  }else{
   if(this.flight)this.flight.age+=dt;
   const before=[...this.ball];this.ball[0]+=this.ballV[0]*dt;this.ball[1]+=this.ballV[1]*dt;this.height+=this.vz*dt;this.vz-=9.81*dt;
   if(this.height<=.02){this.height=.02;this.vz=Math.abs(this.vz)>.8?-this.vz*.24:0;this.ballV=this.ballV.map(v=>v*Math.exp(-.28*dt));}
   const hits=[];for(let i=0;i<22;i++){if(!this.isActive(i))continue;
    if(i===this.kicker&&this.clock-this.kickAt<.24)continue;const keeper=this.isKeeper(i),hit=segment(this.positions[i],before,this.ball),skill=this.profile(i).defense||75,reach=keeper?1.25+Math.max(0,skill-60)*.017:.57+Math.max(0,skill-60)*.006;
    if(hit.d<reach&&this.height<(keeper?2.25:.65))hits.push({i,t:hit.t});
   }
   hits.sort((a,b)=>a.t-b.t||a.i-b.i);
   if(hits.length){const i=hits[0].i,keeper=this.isKeeper(i),saving=keeper&&this.flight?.kind==='SHOT'&&teamOf(i)!==this.flight.team;
    if(saving){this.saveAt=this.clock;this.emit('save',teamOf(i),`${this.profile(i).name} makes the save.`,{player:i});}
    if(this.flight?.offside&&this.flight.receiver===i&&teamOf(i)===this.flight.team){const defending=1-teamOf(i);this.emit('offside',defending,'Offside. Free kick to the defence.',{player:i});this.restartAt('FREE KICK',defending,[...this.positions[i]]);}
    else this.take(i,saving?'SAVE':'FIRST TOUCH');
   }
   if(this.owner===null&&(this.ball[0]<0||this.ball[0]>100)){
    const right=this.ball[0]>100,lineX=right?100:0,t=(lineX-before[0])/(this.ball[0]-before[0]||1),crossY=before[1]+(this.ball[1]-before[1])*t;
    if(crossY>28.35&&crossY<35.65&&this.height<2.44){const team=right?0:1;this.score[team]++;this.team=team;
     this.emit('goal',team,`${this.flight?.scorer||this.profile(this.lastTouch).name} finds the net!`,{scorer:this.flight?.scorer||this.profile(this.lastTouch).name,x:lineX,y:crossY,height:this.height});this.restartAt('KICK-OFF',1-team,[50,32]);
    }else{const defending=right?1:0,corner=teamOf(this.lastTouch)===defending;this.emit(corner?'corner':'wide',1-defending,corner?'Deflected behind. Corner.':'The ball goes behind. Goal kick.');this.restartAt(corner?'CORNER':'GOAL KICK',corner?1-defending:defending,corner?[right?99:1,crossY<32?1:63]:[right?94:6,32]);}
   }else if(this.owner===null&&(this.ball[1]<0||this.ball[1]>64)){const team=1-teamOf(this.lastTouch);this.emit('throw',team,'Out for a throw-in.');this.restartAt('THROW-IN',team,[clamp(this.ball[0],2,98),this.ball[1]<0?1:63]);}
  }
  if(this.ticks%6===0)this.decision();
 }
 update(seconds){this.accumulator+=Math.max(0,seconds);let count=0;while(this.accumulator+1e-9>=1/HZ&&this.ticks<90*TICKS_PER_MINUTE){this.fixed();this.accumulator-=1/HZ;if(++count>60000)throw Error('Unbounded match update');}}
 ready(){return this.ticks-this.planStart>=TICKS_PER_MINUTE||this.ticks>=90*TICKS_PER_MINUTE;}
 pose(){const a=clamp(this.accumulator*HZ,0,1),prev=this.previous,blend=(p,q)=>p.map((v,k)=>v+(q[k]-v)*a);return {positions:prev?prev.positions.map((p,i)=>blend(p,this.positions[i])):this.positions.map(p=>[...p]),velocities:this.velocity.map(v=>[...v]),ball:prev&&!this.restart?blend(prev.ball,this.ball):[...this.ball],height:this.height,carrier:this.owner,team:this.team,phase:this.phase,clock:this.clock,kicker:this.kicker,kickAge:this.clock-this.kickAt,kickDirection:this.kickDirection,saveAge:this.clock-this.saveAt,switchAge:this.clock-this.lastSwitch,receiveAge:this.held,tackler:this.tackler,tackleAge:this.clock-(this.tackleAt??-10),progress:clamp((this.ticks-this.planStart)/TICKS_PER_MINUTE,0,1),active:[...this.state.activeSlots],keepers:[...this.state.keeperSlots],restartFade:this.restart?1:0,switches:this.switches,...(directPlayer(this)!==null?{controlled:directPlayer(this)}:{})};}
 writeState(state=this.state){
  state.world=this.serialize();state.engineVersion=LIVE_VERSION;state.minute=Math.min(90,Math.floor(this.ticks/TICKS_PER_MINUTE));state.finished=state.minute===90;state.score=[...this.score];state.shots=[...this.shots];state.xg=[...this.xg];state.events=copy(this.events);state.recoveries=[...this.recoveries];state.possession=[...this.possession];state.territory=Math.round(this.possession[0]/(this.possession[0]+this.possession[1]||1)*100)||50;state.ball=[...this.ball];state.possessionTeam=this.team;state.visualPose=this.pose();state.passes=[...this.passes];state.completed=[...this.completed];
  this.rosters.flat().forEach((p,i)=>{state.fitness[p.id]=this.energy[i];});
  return state;
 }
}
