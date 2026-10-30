import {FORMATIONS,player} from './engine.js';
import {snapshot,shotEvent,possession} from './match-scene.js';
const limit=(v,a,b)=>Math.max(a,Math.min(b,v));
const distance=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1]);
export class FlowWorld{
 constructor(state){const pose=snapshot(state);this.positions=pose.positions.map(p=>[...p]);this.velocity=this.positions.map(()=>[0,0]);this.ball=[...pose.ball];this.owner=pose.carrier??6;this.team=this.owner<11?0:1;this.phase='BUILD-UP';this.flight=null;this.clock=0;this.held=0;this.planTime=0;this.pending=null;this.resolved=false;this.state=state;this.seed=state.seed>>>0;this.touches=0;this.switches=0;this.lastSwitch=null;this.goalTimer=0;this.restart=false;this.height=0;this.shotInFlight=false;}
 random(){this.seed=(Math.imul(this.seed,1664525)+1013904223)>>>0;return this.seed/4294967296;}
 plan(state){this.state=state;this.pending=shotEvent(state);this.desired=possession(state);this.planTime=0;this.resolved=false;}
 take(index){const old=this.team;this.owner=index;this.team=index<11?0:1;this.held=0;this.touches++;this.phase=old!==this.team?'INTERCEPTION':'IN POSSESSION';if(old!==this.team){this.switches++;this.lastSwitch=this.clock;}this.flight=null;}
 launch(target,index=null,kind='PASS',outcome=null){this.kicker=this.owner;this.kickAt=this.clock;this.kickDirection=[target[0]-this.ball[0],target[1]-this.ball[1]];const start=[...this.ball],length=distance(start,target);this.flight={start,target:[...target],index,kind,outcome,time:0,duration:Math.max(.22,length/(kind==='SHOT'?32:24))};this.owner=null;this.phase=kind;this.height=0;}
 pass(){const base=this.team*11,dir=this.team===0?1:-1,origin=this.positions[this.owner];let options=[];for(let i=base+1;i<base+11;i++){if(i===this.owner)continue;const p=this.positions[i],length=distance(origin,p);if(length<7||length>34)continue;const forward=(p[0]-origin[0])*dir;const pressure=Math.min(...this.positions.slice((1-this.team)*11,(2-this.team)*11).map(q=>distance(q,p)));options.push({i,p,score:forward*.3+pressure*.8+this.random()*10});}options.sort((a,b)=>b.score-a.score);if(options[0])this.launch(options[0].p,options[0].i);else this.held=.5;}
 update(dt){
  dt=limit(dt,0,.06);this.clock+=dt;this.planTime+=dt;this.held+=dt;
  if(this.goalTimer>0){this.goalTimer-=dt;this.phase='GOAL';if(this.goalTimer<=0){this.restart=true;this.phase='KICK-OFF';this.owner=this.team===0?17:6;this.team=1-this.team;this.positions[this.owner]=[50,32];this.ball=[50,32];this.flight=null;this.held=0;}return;}
  this.restart=false;
  const owner=this.owner,ball=this.ball,activeTeam=this.team,defBase=(1-activeTeam)*11;
  let nearestDef=-1,nearest=Infinity;for(let i=defBase+1;i<defBase+11;i++){const d=distance(this.positions[i],ball);if(d<nearest){nearest=d;nearestDef=i;}}
  const target=this.positions.map((p,i)=>{
   const team=i<11?0:1,slot=FORMATIONS[team===0?this.state.formation:'4-3-3'][i%11];
   let x=7+(100-slot.y)*.63,y=5+slot.x*.54;if(team===1){x=100-x;y=64-y;}
   if(i%11!==0){x+=(ball[0]-50)*.42+(team===activeTeam?(team===0?4:-4):0);y+=(ball[1]-32)*.18;}
   if(i===owner){const dir=team===0?1:-1;x=p[0]+dir*(this.pending&&!this.resolved?13:6);y=p[1]+Math.sin(this.clock*.7+i)*3;}
   if(i===nearestDef&&owner!==null){x=ball[0];y=ball[1];}
   if(this.flight?.index===i){x=this.flight.target[0];y=this.flight.target[1];}
   if(i%11===0){x=team===0?4.5:95.5;y=limit(ball[1],26,38);}
   return [limit(x,3,97),limit(y,4,60)];
  });
  for(let i=0;i<22;i++){const p=this.positions[i],v=this.velocity[i],goal=target[i],d=distance(p,goal),max=i%11===0?4.2:i===nearestDef?(this.pending&&!this.resolved?8.4:7.4):i===owner?5.6:5.8;const desired=d>.3?[(goal[0]-p[0])/d*Math.min(max,d*2),(goal[1]-p[1])/d*Math.min(max,d*2)]:[0,0];const accel=9*dt;for(let k=0;k<2;k++){v[k]+=limit(desired[k]-v[k],-accel,accel);p[k]+=v[k]*dt;}p[0]=limit(p[0],2,98);p[1]=limit(p[1],2,62);}
  if(this.flight){const f=this.flight;f.time+=dt;const t=Math.min(1,f.time/f.duration);this.ball=[f.start[0]+(f.target[0]-f.start[0])*t,f.start[1]+(f.target[1]-f.start[1])*t];this.height=Math.sin(t*Math.PI)*(f.kind==='SHOT'?1.4:.6);
   if(f.kind==='PASS'&&t>.15&&t<.9){for(let i=defBase+1;i<defBase+11;i++){if(distance(this.positions[i],this.ball)<1.1){this.take(i);break;}}}
   if(this.flight&&t>=1){if(f.kind==='SHOT'){this.resolved=true;this.shotInFlight=false;if(f.outcome==='goal'){this.goalTimer=.7;this.phase='GOAL';this.flight=null;}else{const keeper=(1-this.team)*11;this.take(keeper);this.phase=f.outcome==='saved'?'SAVE':'GOAL KICK';if(f.outcome==='saved')this.saveAt=this.clock;}}else this.take(f.index);}
  }else if(this.owner!==null){
   const p=this.positions[this.owner],v=this.velocity[this.owner],speed=Math.hypot(...v),foot=[p[0]+(speed>.1?v[0]/speed:.8)*.7,p[1]+(speed>.1?v[1]/speed:0)*.7];const follow=1-Math.exp(-dt*22);const dx=(foot[0]-this.ball[0])*follow,dy=(foot[1]-this.ball[1])*follow,travel=Math.hypot(dx,dy),scale=travel?Math.min(1,24*dt/travel):0;this.ball[0]+=dx*scale;this.ball[1]+=dy*scale;this.height=0;
   if(this.pending&&!this.resolved&&this.planTime>1.2){
    const needed=this.pending.team;
    if(this.team!==needed){if(nearest<1.35&&this.held>.5&&this.clock-(this.lastSwitch??-10)>1.2)this.take(nearestDef);else if(this.held>1.8&&this.planTime<5)this.pass();}
    else if(this.owner%11===0){if(this.held>.6)this.pass();}
    else if(this.team===0?p[0]>65:p[0]<35){const goal=this.pending.type==='goal',saved=!goal&&this.pending.xg>.20;this.launch(goal?[this.team===0?101:-1,30+this.random()*4]:saved?[this.team===0?96:4,32]:[this.team===0?101:-1,this.random()>.5?22:42],null,'SHOT',goal?'goal':saved?'saved':'wide');this.shotInFlight=true;}
   }else if(nearest<1.35&&this.held>.75&&this.clock-(this.lastSwitch??-10)>1.2&&this.owner%11!==0){this.take(nearestDef);}
   else if(this.held>1.4+(this.owner%3)*.25){this.pass();}
  }
 }
 ready(duration){return this.planTime>=duration&&(!this.pending||this.resolved);}
 pose(){return {positions:this.positions.map(p=>[...p]),velocities:this.velocity.map(v=>[...v]),ball:[...this.ball],height:this.height,carrier:this.owner,team:this.team,phase:this.phase,clock:this.clock,kicker:this.kicker,kickAge:this.clock-(this.kickAt??-10),kickDirection:this.kickDirection,saveAge:this.clock-(this.saveAt??-10),switchAge:this.clock-(this.lastSwitch??-10),progress:Math.min(1,this.planTime/4),restartFade:this.restart?1:0,switches:this.switches};}
}
