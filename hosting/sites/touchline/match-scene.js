import {FORMATIONS, player} from './engine.js';

// World coordinates: home attacks towards x=100, both goals centred on y=32.
export const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const mix=(a,b,t)=>a+(b-a)*t;
const lerp=(a,b,t)=>t===0?[...a]:t===1?[...b]:[mix(a[0],b[0],t),mix(a[1],b[1],t)];
const foot=p=>[p[0]+.6,p[1]+.9];
const distance=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1]);
export function possession(s){return s.possessionTeam??s.events.findLast(e=>e.minute===s.minute&&['goal','shot','pass','recovery'].includes(e.type))?.team??(s.minute%2);}
export function shotEvent(s){return s.events.findLast(e=>e.minute===s.minute&&['goal','shot'].includes(e.type));}
function actor(s,team){
 const shot=shotEvent(s);
 if(team===0&&shot){const index=s.lineup.findIndex(id=>player(id).name.split(' ').at(-1)===shot.scorer);if(index>=0)return index;}
 return team*11+(s.minute===0?6:5+(s.minute*7+s.seed)%6);
}
export function snapshot(s){
 const team=possession(s),direction=team===0?1:-1,carrier=actor(s,team),shot=shotEvent(s);
 const advance=shot?18:((s.minute*13+s.seed)%19)-7;
 const ballX=team===0?48+advance:52-advance;
 const positions=[];
 for(let t=0;t<2;t++)for(let i=0;i<11;i++){
  const slot=FORMATIONS[t===0?s.formation:'4-3-3'][i];
  let x=8+(100-slot.y)*.55,y=6+slot.x*.52;
  if(t===1){x=100-x;y=64-y;}
  if(i!==0){x+=(ballX-50)*.33+(t===0?(s.preset==='press'?3:s.preset==='protect'?-3:0):0);y+=Math.sin((s.minute+i*2)*.4)*1.8;}
  positions.push([clamp(x,5,95),clamp(y,5,59)]);
 }
 const lane=12+((s.minute*11+s.seed)%39);
 positions[carrier]=[shot?(team===0?79:21):ballX,shot?28+(s.minute%9):lane];
 let ball=foot(positions[carrier]);
 if(shot)ball=shot.type==='goal'?[team===0?100.8:-.8,30+(s.minute%5)]:shot.xg>.20?foot(positions[(1-team)*11]):[team===0?99:1,s.minute%2?23:42];
 return {positions,ball,carrier,team,phase:shot?(shot.type==='goal'?'GOAL':shot.xg>.20?'SAVED':'WIDE'):'IN POSSESSION',height:0};
}
export function buildSequence(previous,next,startOverride=null){
 const start=startOverride||snapshot(previous),end=snapshot(next),team=end.team,base=team*11;
 const restart=!startOverride&&(shotEvent(previous)?.type==='goal'||previous.minute===0);
 const startBall=restart?[50,32]:start.ball;
 // A receiving player comes to the existing ball, rather than moving the ball
 // arbitrarily to a player. New possession is shown as a contested recovery.
 const candidates=Array.from({length:10},(_,i)=>base+i+1).filter(i=>i!==end.carrier);
 const receiver=candidates.sort((a,b)=>distance(start.positions[a],startBall)-distance(start.positions[b],startBall))[0];
 const intermediate=candidates.filter(i=>i!==receiver).sort((a,b)=>distance(end.positions[a],end.positions[end.carrier])-distance(end.positions[b],end.positions[end.carrier]))[0];
 const startPos=start.positions.map(p=>[...p]);
 const receivePos=startPos.map(p=>[...p]);receivePos[receiver]=[clamp(startBall[0]-.6,2,98),clamp(startBall[1]-.9,3,61)];
 const carryPos=receivePos.map(p=>[...p]);
 const from=receivePos[receiver],towards=end.positions[end.carrier],length=Math.max(1,distance(from,towards));
 carryPos[receiver]=lerp(from,towards,Math.min(.25,7/length));
 const support=end.positions.map((p,i)=>lerp(carryPos[i],p,.55));
 support[intermediate]=lerp(carryPos[receiver],end.positions[end.carrier],.5);
 const mid=foot(support[intermediate]),finalFoot=foot(end.positions[end.carrier]);
 const shot=shotEvent(next);
 const frames=[
  {t:0,positions:startPos,ball:startBall,owner:null,phase:restart?'KICK-OFF':team!==start.team?'CONTESTED BALL':'BUILD-UP'},
  {t:.16,positions:receivePos,ball:foot(receivePos[receiver]),owner:receiver,phase:team!==start.team?'POSSESSION WON':'RECEIVE'},
  {t:.34,positions:carryPos,ball:foot(carryPos[receiver]),owner:receiver,phase:'DRIBBLE'},
  {t:.58,positions:support,ball:mid,owner:intermediate,phase:'PASS'},
  {t:shot?.82:.88,positions:end.positions,ball:finalFoot,owner:end.carrier,phase:'PASS'},
  {t:1,positions:end.positions,ball:end.ball,owner:shot?null:end.carrier,phase:end.phase}
 ];
 return {frames,team,restart,shot:shot?.type||null,minute:next.minute,scorer:shot?.scorer||null};
}
export function sample(sequence,progress){
 const t=clamp(progress,0,1),frames=sequence.frames;
 let index=frames.findIndex((f,i)=>i>0&&t<=f.t);if(index<1)index=frames.length-1;
 const a=frames[index-1],b=frames[index],u=clamp((t-a.t)/(b.t-a.t),0,1);
 const eased=u*u*(3-2*u),positions=a.positions.map((p,i)=>lerp(p,b.positions[i],eased));
 const carrying=a.owner!==null&&a.owner===b.owner;
 const ball=carrying?foot(positions[a.owner]):lerp(a.ball,b.ball,u);
 const passing=b.phase==='PASS',shooting=index===frames.length-1&&sequence.shot;
 const height=(passing?.65:shooting?1.4:0)*Math.sin(u*Math.PI);
 return {positions,ball,height,carrier:passing||shooting?(u>.96?b.owner:null):a.owner,team:sequence.team,phase:shooting?'SHOT':b.phase,progress:t,restartFade:sequence.restart&&t<.12?1-t/.12:0};
}
