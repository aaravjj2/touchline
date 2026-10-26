import test from 'node:test';
import assert from 'node:assert/strict';
import {EXERCISES,trainingScenario} from '../dist/training-scenarios.js';
import {fixtureState,applyCommand} from '../dist/fixture-engine.js';
import {LiveWorld} from '../dist/live-world.js';
import {actionRequest,observeAction} from '../dist/control-feedback.js';
test('each exercise starts at an exact reproducible normal-world snapshot and retries are isolated',()=>{
 for(const exercise of EXERCISES){const a=trainingScenario(exercise.id),state=fixtureState(a.definition),w=new LiveWorld(state);while(w.ticks<a.exercise.startTick)w.fixed();w.writeState(state);assert.deepEqual(a.resume.state,state);assert.equal(a.exercise.endTick-a.exercise.startTick,1800);a.resume.state.world.ball[0]=-999;assert.notEqual(trainingScenario(exercise.id).resume.state.world.ball[0],-999);}
 assert.throws(()=>trainingScenario('unknown'));
});
test('the passing, shooting and defending exercises can succeed using the same direct-control commands as a match',()=>{
 for(const [id,action,expected]of [['passing','pass','pass'],['shooting','shoot','shot'],['defending','tackle','recovery']]){const {resume}=trainingScenario(id),s=resume.state;let w=new LiveWorld(s);const near=w.positions.slice(1,11).map((p,k)=>({i:k+1,d:Math.hypot(p[0]-w.ball[0],p[1]-w.ball[1])})).sort((a,b)=>a.d-b.d)[0].i;applyCommand(s,{type:'control',enabled:true,slot:w.owner>0&&w.owner<11?w.owner:near,move:[0,0],sprint:false,action,team:0});w=new LiveWorld(s);const request=actionRequest(action,w),completed=w.completed[0];assert.equal(observeAction(request,w),null);w.fixed();assert.equal(observeAction(request,w).kind,expected,id);if(id==='passing'){while(w.flight&&w.ticks<resume.state.world.ticks+600)w.fixed();assert.equal(w.completed[0],completed+1);}}
});
test('action feedback does not confuse an off-ball request with a pass or shot',()=>{
 const {resume}=trainingScenario('passing'),s=resume.state;applyCommand(s,{type:'control',enabled:true,slot:1,move:[0,0],sprint:false,action:'shoot',team:0});const w=new LiveWorld(s),r=actionRequest('shoot',w);w.fixed();assert.equal(observeAction(r,w).kind,'unavailable');assert.match(observeAction(r,w).text,/control the ball first/);
});
test('switch feedback follows the actual selected player rather than predicting the next slot',()=>{
 const {resume}=trainingScenario('defending'),s=resume.state;applyCommand(s,{type:'control',enabled:true,slot:1,move:[0,0],sprint:false,action:'switch',team:0});const w=new LiveWorld(s),r=actionRequest('switch',w);w.fixed();const result=observeAction(r,w);assert.equal(result.kind,'switch');assert.equal(result.text,'Switched to '+w.profile(s.directControl.slot).name);
});
