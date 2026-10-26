import test from 'node:test';
import assert from 'node:assert/strict';
import {incidentTimeline,createAvailability,commitAvailability,availabilityReason} from '../dist/match-incidents.js';
const positions=['GK','LB','CB','CB','RB','CM','CM','CM','LW','ST','RW'];
const make=()=>({version:1,origin:'modeled',fixtureId:'test:1',date:'2026-08-08',competition:'league',teams:['a','b'].map(id=>({id,players:positions.map((position,i)=>({id:id+i,position})),bench:[{id:id+'keeper',positions:['GK']},{id:id+'striker',positions:['ST']},{id:id+'defender',positions:['CB']}]})),incidents:[]});
const e=(type,player,minute,sequence=0,more={})=>({id:'event:'+sequence,sequence,type,player,minute,team:0,...more});
const registrations=m=>Object.fromEntries(m.teams.map(t=>[t.id,t.players.concat(t.bench).map(p=>p.id)]));
test('shared incident contract retains 990 minutes without incidents and labels modeled versus recorded',()=>{
 for(const origin of ['modeled','recorded']){const m={...make(),origin},r=incidentTimeline(m);assert.deepEqual(r.rows.map(t=>t.reduce((n,p)=>n+p.minutes,0)),[990,990]);}assert.throws(()=>incidentTimeline({...make(),origin:'invented'}),/contract/);
});
test('second yellow removes a player and prevents a later goal, assist or substitution involving them',()=>{
 const m=make();m.incidents=[e('yellow','a9',20),e('second-yellow','a9',60,1)];const r=incidentTimeline(m);assert.equal(r.rows[0].reduce((n,p)=>n+p.minutes,0),960);
 for(const event of [e('goal','a9',70,2),e('goal','a8',70,2,{assist:'a9'}),e('substitution',null,70,2,{out:'a9',in:'astriker',position:'ST'})])assert.throws(()=>incidentTimeline({...m,incidents:m.incidents.concat(event)}));
 assert.throws(()=>incidentTimeline({...m,incidents:[e('second-yellow','a9',20)]}),/first booking/);
});
test('goalkeeper dismissal requires a recorded bench change or explicit emergency keeper',()=>{
 const m=make();m.incidents=[e('red','a0',30)];assert.throws(()=>incidentTimeline(m),/goalkeeper/i);
 m.incidents.push(e('substitution',null,30,1,{out:'a9',in:'akeeper',position:'GK'}));let r=incidentTimeline(m);assert.equal(r.rows[0].reduce((n,p)=>n+p.minutes,0),930);assert.equal(r.substitutions[0],1);
 m.incidents=[e('red','a0',30),e('emergency-keeper','a3',30,1)];r=incidentTimeline(m);assert.equal(r.rows[0].find(p=>p.id==='a3').position,'GK');
 assert.throws(()=>incidentTimeline({...m,incidents:[e('red','a0',30),e('goal','a9',30,1),e('emergency-keeper','a3',30,2)]}),/restarting/);
});
test('injury replacements retain team minutes, enforce positions, and do not allow an injured return',()=>{
 const m=make();m.incidents=[e('injury','a9',30,0,{recoveryDays:14}),e('substitution',null,30,1,{out:'a9',in:'astriker',position:'ST'})];assert.equal(incidentTimeline(m).rows[0].reduce((n,p)=>n+p.minutes,0),990);
 assert.throws(()=>incidentTimeline({...m,incidents:[m.incidents[0],{...m.incidents[1],in:'adefender'}]}),/substitution/);
 assert.throws(()=>incidentTimeline({...m,incidents:m.incidents.concat(e('goal','a9',40,2))}),/pitch/);
 assert.throws(()=>incidentTimeline({...m,incidents:[e('injury','a9',30,0,{recoveryDays:0})]}),/recovery/);
});
test('availability serves existing bans only at the owning club fixture, separates competitions, and is idempotent',()=>{
 const state=createAvailability(),m=make(),regs=registrations(m);state.yellows.league.a9=4;state.bans.league.absent=2;state.bans.cup.a9=2;state.bans.league.other=1;regs.a.push('absent');m.incidents=[e('yellow','a9',30)];assert.equal(commitAvailability(state,m,regs),true);assert.equal(state.bans.league.a9,1);assert.equal(state.bans.league.absent,1);assert.equal(state.bans.league.other,1);assert.equal(state.bans.cup.a9,2);
 const before=structuredClone(state);assert.equal(commitAvailability(state,m,regs),false);assert.deepEqual(state,before);assert.throws(()=>commitAvailability(state,{...m,origin:'recorded'},regs),/Conflicting/);assert.deepEqual(state,before);
 assert.deepEqual(availabilityReason(state,'a9',m.date,'league'),{kind:'suspended',matches:1,competition:'league'});
});
test('red bans and injury dates apply once; unavailable selections reject atomically',()=>{
 const state=createAvailability(),m=make(),regs=registrations(m);m.incidents=[e('red','a9',30),e('injury','a8',50,1,{recoveryDays:14})];commitAvailability(state,m,regs);assert.equal(state.bans.league.a9,3);assert.equal(availabilityReason(state,'a8','2026-08-21','cup').until,'2026-08-22');assert.equal(availabilityReason(state,'a8','2026-08-22','cup'),null);
 const before=structuredClone(state);assert.throws(()=>commitAvailability(state,{...make(),fixtureId:'test:2',date:'2026-08-15'},regs),/Unavailable/);assert.deepEqual(state,before);
});
test('abandonment, duplicate incident IDs, impossible positions and ambiguous ordering are rejected',()=>{
 const m=make();assert.throws(()=>incidentTimeline({...m,incidents:[e('yellow','a9',20),e('yellow','a8',30)]}),/Unique/);
 m.teams[0].players[1].position='anything';assert.throws(()=>incidentTimeline(m),/positions/);
 const clean=make();clean.incidents=[1,2,3,4,5].map((n,i)=>e('red','a'+n,20+i,i));assert.throws(()=>incidentTimeline(clean),/Abandonment/);
});
