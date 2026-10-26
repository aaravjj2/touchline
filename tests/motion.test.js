import test from 'node:test';
import assert from 'node:assert/strict';
import {createMatch,step,copy,run,branch,FORMATIONS} from '../dist/engine.js';
import {snapshot,buildSequence,sample,shotEvent} from '../dist/match-scene.js';
const distance=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1]);

test('both teams face the correct goal and retain 22 distinct starting positions',()=>{
 for(const formation of Object.keys(FORMATIONS)){
  const pose=snapshot(createMatch({formation}).state);
  assert.equal(pose.positions.length,22);assert.ok(pose.positions[0][0]<15);assert.ok(pose.positions[11][0]>85);
  assert.equal(new Set(pose.positions.map(p=>p.join(','))).size,22);
 }
});

test('500 complete animated matches have bounded, continuous ball paths and finite athletes',()=>{
 let goals=0,shots=0,turnovers=0;
 for(let seed=0;seed<500;seed++){
  const m=createMatch({seed,formation:Object.keys(FORMATIONS)[seed%3]});
  for(let minute=0;minute<90;minute++){
   const prev=copy(m.state);step(m);const seq=buildSequence(prev,m.state),end=snapshot(m.state);
   if(seq.shot==='goal')goals++;if(seq.shot)shots++;if(seq.team!==snapshot(prev).team)turnovers++;
   assert.deepEqual(sample(seq,1).ball,end.ball);
   assert.deepEqual(sample(seq,1).positions,end.positions);
   if(!seq.restart)assert.deepEqual(sample(seq,0).ball,snapshot(prev).ball);
   let last=sample(seq,0);
   for(let f=1;f<=20;f++){
    const pose=sample(seq,f/20);
    assert.ok(pose.ball.every(Number.isFinite));assert.ok(pose.ball[0]>=-1&&pose.ball[0]<=101&&pose.ball[1]>=0&&pose.ball[1]<=64);
    assert.equal(pose.positions.length,22);
    assert.ok(pose.positions.every(p=>p.every(Number.isFinite)&&p[0]>=2&&p[0]<=98&&p[1]>=3&&p[1]<=61));
    assert.ok(distance(last.ball,pose.ball)<20,'no instantaneous ball teleport within a clip');last=pose;
   }
   for(let j=1;j<=3;j++)assert.ok(distance(seq.frames[j-1].ball,seq.frames[j].ball)<60,'passes remain within a plausible field distance');
  }
 }
 assert.ok(goals>100&&shots>1000&&turnovers>1000,'exercise actual goals, shots and possession changes');
});

test('passes arrive at the receiving player’s feet and shots leave the shooter’s feet',()=>{
 const m=createMatch({seed:53});
 while(!m.state.finished){const prev=copy(m.state);step(m);const seq=buildSequence(prev,m.state);
  for(const f of seq.frames.filter(f=>f.owner!==null&&f.owner!==undefined)){
   assert.ok(distance(f.ball,[f.positions[f.owner][0]+.6,f.positions[f.owner][1]+.9])<.001);
  }
 }
});

test('dribbling keeps the ball at the carrier’s feet throughout the run',()=>{
 const m=createMatch({seed:5}),before=copy(m.state);step(m);const seq=buildSequence(before,m.state);
 for(let t=.17;t<.34;t+=.005){const p=sample(seq,t),id=seq.frames[1].owner;assert.ok(distance(p.ball,[p.positions[id][0]+.6,p.positions[id][1]+.9])<.000001);}
});

test('goals travel into the attacking goal; only a scored goal starts a restart transition',()=>{
 const m=run(createMatch({seed:1000}));let count=0;
 for(let i=1;i<m.frames.length;i++){
  const a=m.frames[i-1],b=m.frames[i],seq=buildSequence(a,b),shot=shotEvent(b);
  if(shot?.type==='goal'){assert.ok(shot.team===0?seq.frames.at(-1).ball[0]>100:seq.frames.at(-1).ball[0]<0);assert.ok(Math.abs(seq.frames.at(-1).ball[1]-32)<=3);count++;}
  assert.equal(seq.restart,shotEvent(a)?.type==='goal'||a.minute===0);
 }
 assert.ok(count>0);
});

test('visual playback and branch reconstruction are deterministic and leave engine state intact',()=>{
 const original=run(createMatch({seed:23})),before=copy(original),alt=branch(original,60,{type:'preset',value:'protect'});
 run(alt);
 for(let i=1;i<=60;i++)assert.deepEqual(buildSequence(original.frames[i-1],original.frames[i]),buildSequence(alt.frames[i-1],alt.frames[i]));
 const seq=buildSequence(original.frames[21],original.frames[22]);assert.deepEqual(sample(seq,.42),sample(seq,.42));
 assert.deepEqual(original,before);
});

test('zero and full progress are stable and out-of-range sampling clamps safely',()=>{
 const m=createMatch();const prev=copy(m.state);step(m);const seq=buildSequence(prev,m.state);
 assert.deepEqual(sample(seq,-2),sample(seq,0));assert.deepEqual(sample(seq,4),sample(seq,1));
 for(let i=0;i<100;i++)assert.deepEqual(sample(seq,.375),sample(seq,.375));
});

test('a tactical interruption resumes from the actual on-screen pose without a ball jump',()=>{
 const m=createMatch({seed:82});step(m);const before=copy(m.state);step(m);
 const first=buildSequence(before,m.state),interrupted=sample(first,.62);
 const next=copy(m.state);next.preset='protect';
 const resumed=buildSequence(before,next,interrupted);
 assert.deepEqual(sample(resumed,0).ball,interrupted.ball);
 assert.deepEqual(sample(resumed,0).positions,interrupted.positions);
 assert.equal(resumed.restart,false);
});

test('late-game scenarios begin with played-minute fatigue while reserves remain fresh',()=>{
 const s=createMatch({minute:70,score:[1,0]}).state;
 assert.ok(s.lineup.every(id=>s.fitness[id]<90&&s.fitness[id]>50));
 assert.ok(s.bench.every(id=>s.fitness[id]===100));
});
