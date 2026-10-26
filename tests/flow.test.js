import test from 'node:test';
import assert from 'node:assert/strict';
import {FlowWorld} from '../dist/flow-world.js';
import {createMatch,step} from '../dist/engine.js';
test('continuous match world resolves planned minutes without resetting players at ordinary turnovers',()=>{
 let turnovers=0;
 for(let seed=0;seed<20;seed++){
  const m=createMatch({seed}),w=new FlowWorld(m.state);
  for(let minute=0;minute<90;minute++){
   step(m);w.plan(m.state);let t=0;
   while(!w.ready(4)&&t<40){const prev=w.pose();w.update(.025);const p=w.pose();t+=.025;
    assert.ok(p.positions.flat().every(Number.isFinite));assert.ok(p.ball.every(Number.isFinite));if(!p.restartFade&&prev.phase!=='GOAL')assert.ok(Math.hypot(p.ball[0]-prev.ball[0],p.ball[1]-prev.ball[1])<1.2,'ball transport jumped during a planned minute');
    if(p.switches>prev.switches){turnovers++;if(!prev.restartFade&&!p.restartFade&&prev.phase!=='GOAL')for(let i=0;i<22;i++)assert.ok(Math.hypot(p.positions[i][0]-prev.positions[i][0],p.positions[i][1]-prev.positions[i][1])<.30,'turnover must not teleport athletes');}
   }
   assert.ok(w.ready(4),'shot plan stalled at seed '+seed+' minute '+minute);
  }
 }
 assert.ok(turnovers>100);
});
test('ordinary ball transport has bounded speed through passes, recoveries and turnovers',()=>{
 const m=createMatch({seed:89}),w=new FlowWorld(m.state);w.plan(m.state);let worst=0;
 for(let i=0;i<4000;i++){const before=w.pose();w.update(.025);const p=w.pose();if(before.phase!=='GOAL'&&!p.restartFade){const move=Math.hypot(p.ball[0]-before.ball[0],p.ball[1]-before.ball[1]);worst=Math.max(worst,move);assert.ok(move<1.2,'ball jumped '+move);}}
 assert.ok(w.switches>5);assert.ok(worst>0);
});
