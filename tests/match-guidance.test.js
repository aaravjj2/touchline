import test from 'node:test';
import assert from 'node:assert/strict';
import {possessionGuidance} from '../dist/play-guidance.js';
import {preparationReport,renderPreparationReport} from '../dist/opponent-preparation.js';
const world=(owner=1)=>({state:{directControl:{enabled:true,slot:1}},owner,positions:Array.from({length:22},()=>[20,20]),ball:[50,32],flight:null,restart:null});
test('possession guidance distinguishes carrier, teammate, keeper, opponent and loose ball without editing the world',()=>{
 for(const team of [0,1]){
  const w=world(team*11+1),before=structuredClone(w);assert.equal(possessionGuidance(w,team).kind,'on-ball');assert.deepEqual(w,before);
  w.owner=team*11+2;assert.equal(possessionGuidance(w,team).kind,'teammate');
  w.owner=team*11;assert.equal(possessionGuidance(w,team).kind,'keeper');
  w.owner=(1-team)*11+1;assert.match(possessionGuidance(w,team).text,/close down/);
  w.ball=[20,20];assert.match(possessionGuidance(w,team).text,/attempts a challenge/);
  w.owner=null;w.flight={kind:'PASS'};assert.match(possessionGuidance(w,team).text,/release movement/);
  w.flight.team=1-team;assert.match(possessionGuidance(w,team).text,/Opposition pass/);
  w.restart={};assert.equal(possessionGuidance(w,team).kind,'restart');
 }
});
test('readiness, pause, completion and unavailable players override playing guidance',()=>{
 const w=world();assert.equal(possessionGuidance(w,0,{ready:true}).kind,'ready');assert.equal(possessionGuidance(w,0,{running:false}).kind,'paused');assert.equal(possessionGuidance(w,0,{complete:true}).kind,'complete');
 w.state.incidentVersion=1;w.isActive=()=>false;w.isKeeper=()=>false;assert.equal(possessionGuidance(w,0).kind,'unavailable');
 w.state.directControl.enabled=false;assert.equal(possessionGuidance(w,0).kind,'automatic');
});
const career=()=>({history:[],xi:['starter'],bench:['reserve','expired'],condition:{starter:{energy:70,contract:2},reserve:{energy:90,contract:2},expired:{contract:0}},management:{preset:'balanced',matchBench:['reserve','expired','not-owned']}});
const fixture=()=>({homeGame:true,opponent:{name:'Example FC',formation:'4-3-3',rating:85,attack:88,defense:80,xi:['a','b'],roster:[{id:'a',name:'Selected forward',attack:90},{id:'b',name:'Selected midfielder',attack:80},{id:'reserve',name:'Unselected star',attack:99}]}});
test('preparation compares only the saved XI and counts only selected eligible reserves',()=>{
 const c=career(),f=fixture(),before=structuredClone({c,f}),report=preparationReport(c,f);
 assert.deepEqual(report.threat,{name:'Selected forward',attack:90});assert.equal(report.tired,1);assert.equal(report.bench,1);
 const html=renderPreparationReport(c,f);assert.match(html,/Selected forward/);assert.doesNotMatch(html,/Unselected star/);assert.match(html,/not a prediction/);assert.deepEqual({c,f},before);
 f.opponent.xi=[];assert.equal(preparationReport(c,f).threat,null);f.opponent.attack=undefined;assert.match(renderPreparationReport(c,f),/Attack unknown/);assert.equal(preparationReport(c,null),null);
});
