import test from 'node:test';
import assert from 'node:assert/strict';
import {fixtureDefinition,fixtureState,applyCommand,playDefinition,fixtureResult,fixtureFingerprint} from '../dist/fixture-engine.js';
import {LiveWorld} from '../dist/live-world.js';
import {PACKS} from '../dist/legends.js';
import {packClub} from '../dist/europe-clubs.js';
const definition=()=>fixtureDefinition(packClub(PACKS[14]),packClub(PACKS[15]),381);
const input=(overrides={})=>({type:'control',slot:6,enabled:true,sprint:false,move:[1,0],action:'none',team:0,...overrides});
test('direct control moves the chosen footballer and suppresses his automatic decisions',()=>{
 const s=fixtureState(definition());applyCommand(s,input({sprint:true}));const w=new LiveWorld(s),start=[...w.positions[6]];for(let i=0;i<90;i++)w.fixed();assert.ok(w.positions[6][0]>start[0]+5);assert.equal(w.owner,6);assert.equal(w.shots[0],0);assert.equal(w.pose().controlled,6);
});
test('shooting and passing use physical ball actions rather than manufactured results',()=>{
 for(const action of ['shoot','pass','through']){const s=fixtureState(definition());applyCommand(s,input({action}));const w=new LiveWorld(s);w.fixed();assert.equal(w.owner,null);assert.ok(Math.hypot(...w.ballV)>10);if(action==='shoot')assert.equal(w.shots[0],1);else{assert.equal(w.passes[0],1);assert.notEqual(s.directControl.slot,6);}}
});
test('invalid input and direct control in legacy fixtures are rejected before being recorded',()=>{
 const def=definition(),legacy={...def};delete legacy.controlVersion;const s=fixtureState(legacy);assert.throws(()=>applyCommand(s,input()),/not enabled/);assert.equal(s.actions.length,0);assert.notEqual(fixtureFingerprint(def),fixtureFingerprint(legacy));
 for(const bad of [{slot:0},{move:[NaN,0]},{move:[2,0]},{action:'goal'},{sprint:'yes'}]){const fresh=fixtureState(def);assert.throws(()=>applyCommand(fresh,input(bad)),/Invalid/);assert.equal(fresh.actions.length,0);}
});
test('recorded direct inputs replay identically and checkpoint reload preserves their outcome',()=>{
 const def=definition(),commands=[{...input({sprint:true}),tick:0},{...input({action:'pass'}),tick:100},{...input({action:'switch',move:[0,-1]}),tick:180},{...input({enabled:false,move:[0,0]}),tick:240}],expected=playDefinition(def,commands),s=fixtureState(def);let w=new LiveWorld(s),next=0;
 while(w.ticks<14400){while(commands[next]?.tick===w.ticks){w.writeState(s);applyCommand(s,commands[next++]);w=new LiveWorld(s);}w.fixed();if(w.ticks===7200){w.writeState(s);w=new LiveWorld(JSON.parse(JSON.stringify(s)));}}
 w.writeState(w.state);assert.deepEqual(w.state.world,expected.world);assert.deepEqual(fixtureResult(def,w.state).score,fixtureResult(def,expected).score);assert.deepEqual(w.state.actions,expected.actions);
});
test('player switching stays on the selected team and goalkeepers remain automatic',()=>{
 const s=fixtureState(definition());applyCommand(s,input({team:1,slot:4,action:'switch'}));const w=new LiveWorld(s);w.fixed();assert.ok(w.pose().controlled>11&&w.pose().controlled<22);
});
