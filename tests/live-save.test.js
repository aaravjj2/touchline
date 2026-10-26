import test from 'node:test';
import assert from 'node:assert/strict';
import {createMatch,step,run,cleanImport,copy,applyAction,branch} from '../dist/live-engine.js';
test('Quick Match live saves, replay branches and compact snapshots keep physical state',()=>{
 const match=createMatch({seed:123});for(let i=0;i<20;i++)step(match);applyAction(match,{type:'preset',value:'press'});for(let i=0;i<20;i++)step(match);
 const compact=copy(match);compact.compact=true;compact.frames=compact.frames.map(({events,rosters,visualPose,...rest})=>rest);
 const restored=cleanImport(compact);assert.deepEqual(run(restored).state.world,run(copy(match)).state.world);
 const originalScore=[...restored.state.score],alternative=branch(restored,20,{type:'preset',value:'protect'});run(alternative);assert.equal(alternative.state.minute,90);assert.deepEqual(restored.state.score,originalScore);
 assert.ok(restored.state.fitness[restored.state.lineup[5]]<95,'away profiles must not overwrite home fatigue');
});
