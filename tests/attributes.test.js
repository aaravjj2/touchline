import test from 'node:test';import assert from 'node:assert/strict';
import {FIELD} from '../dist/club-field.js';
import {fixtureDefinition,fixtureState} from '../dist/fixture-engine.js';
import {LiveWorld} from '../dist/live-world.js';
const def=fixtureDefinition(FIELD[0],FIELD[1],418);
function carrier(pace,stamina=80,legacy=false){const s=fixtureState(def);if(legacy)s.rulesVersion='legacy-2.0';s.rosters[0][9].pace=pace;s.rosters[0][9].stamina=stamina;const w=new LiveWorld(s);w.owner=9;w.team=0;w.positions[9]=[40,32];w.ball=[40.6,32];w.decision=()=>{};return w;}
test('authored pace changes real movement while older match rules preserve their exact path',()=>{
 const fast=carrier(99),slow=carrier(40);for(let i=0;i<100;i++){fast.fixed();slow.fixed();}assert.ok(fast.positions[9][0]>slow.positions[9][0]+1);
 const oldFast=carrier(99,80,true),oldSlow=carrier(40,80,true);for(let i=0;i<100;i++){oldFast.fixed();oldSlow.fixed();}assert.deepEqual(oldFast.serialize(),oldSlow.serialize());
});
test('conditioning affects sustained effort rather than only a displayed rating',()=>{
 const high=carrier(80,99),low=carrier(80,40);for(let i=0;i<600;i++){high.fixed();low.fixed();}assert.ok(high.energy[9]>low.energy[9]);
});
test('passing control tightens execution across paired random states',()=>{
 let highError=0,lowError=0;
 for(let seed=1;seed<=40;seed++)for(const control of [45,99]){const s=fixtureState({...def,seed});s.rosters[0][9].control=control;const w=new LiveWorld(s);w.owner=9;w.team=0;w.positions[9]=[45,30];w.ball=[45,30];w.held=3;w.decision();assert.equal(w.flight.kind,'PASS');const target=w.positions[w.flight.receiver],dx=target[0]-45,dy=target[1]-30,error=Math.abs(w.ballV[0]*dy-w.ballV[1]*dx)/Math.hypot(dx,dy);if(control===99)highError+=error;else lowError+=error;}
 assert.ok(highError<lowError*.2);
});
test('goalkeeping attributes improve actual reachable saves across the same shot locations',()=>{
 let high=0,low=0;
 for(let i=0;i<20;i++)for(const defense of [45,99]){const s=fixtureState(def);s.rosters[1][0].defense=defense;const w=new LiveWorld(s);w.positions=w.positions.map((_,j)=>[30,2+j*2]);w.positions[11]=[96,32];w.owner=null;w.team=0;w.ball=[95,33.25+i*.035];w.ballV=[30,0];w.height=1;w.vz=0;w.flight={kind:'SHOT',team:0,age:0,scorer:s.rosters[0][9].name};w.kicker=9;w.lastTouch=9;w.fixed();const saved=w.events.some(e=>e.type==='save');if(defense===99)high+=saved;else low+=saved;}
 assert.ok(high>low,{high,low});
});
