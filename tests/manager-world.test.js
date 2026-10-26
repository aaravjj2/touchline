import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createCalendar,scheduleFixture,addCalendarDecision,resolveCalendarDecision,advanceCalendar,commitCalendarResult,dayNumber,addDays,fixtureRestDays,fantasyManagerCalendar} from '../dist/manager-calendar.js';
import {validateCareerWorld,registerWorldDeal,processWorldRegistrations} from '../dist/manager-world.js';
import {applyManagerCuration} from '../scripts/manager-import.mjs';
import {validateManagerDataset} from '../dist/manager-datasets.js';
const fixture=(id,date,home='a',away='b')=>({id,date,home,away,competition:'QA league'});
const result=f=>({home:f.home,away:f.away,score:[1,0],kind:'statistical'});
const calendar=()=>createCalendar({id:'qa',start:'2026-08-01'});
const world=()=>({version:1,id:'qa',clubs:[{id:'a',funds:100},{id:'b',funds:80},{id:'c',funds:50}],windows:[{start:'2026-08-01',end:'2026-08-31'},{start:'2027-01-01',end:'2027-01-31'}],players:[{id:'p',birthDate:'2001-05-01',owner:'a',registeredClub:'a'}]});
const deal=()=>({id:'one',kind:'transfer',player:'p',from:'a',to:'b',fee:20});
test('civil dates reject rollover and remain stable across leap years and DST',()=>{
 assert.throws(()=>dayNumber('2026-02-30'));assert.throws(()=>dayNumber('2026-1-02'));assert.equal(addDays('2028-02-28',1),'2028-02-29');assert.equal(addDays('2026-03-07',2),'2026-03-09');
});
test('shared calendar prevents domestic/European club clashes and derives actual spacing',()=>{
 const c=calendar();scheduleFixture(c,fixture('league','2026-08-08'));assert.throws(()=>scheduleFixture(c,{...fixture('cup','2026-08-09','c','a'),competition:'Cup'}),/rest/);
 const f=scheduleFixture(c,fixture('europe','2026-08-11','a','c'));assert.equal(fixtureRestDays(c,f,'a'),3);assert.equal(fixtureRestDays(c,f,'c'),null);assert.throws(()=>scheduleFixture(c,fixture('league','2026-08-20')),/duplicate/);
});
test('mandatory decision interrupts on its date and survives reload before fixture commit',async()=>{
 let c=calendar();scheduleFixture(c,fixture('one','2026-08-08'));scheduleFixture(c,fixture('two','2026-08-15'));addCalendarDecision(c,{id:'contract',date:'2026-08-15',title:'Contract decision'});
 let checkpoints=[];let response=await advanceCalendar(c,{until:'2026-08-30',simulate:result,checkpoint:s=>checkpoints.push(s)});assert.equal(response.reason,'decision');assert.equal(response.completed,1);
 c=JSON.parse(JSON.stringify(checkpoints.at(-1)));resolveCalendarDecision(c,'contract');response=await advanceCalendar(c,{until:'2026-08-30',simulate:result});assert.equal(response.completed,1);assert.equal(c.fixtures.filter(f=>f.status==='complete').length,2);
});
test('cancellation and failed checkpoint recover without duplicating fixture results',async()=>{
 let c=calendar(),saved;for(let i=0;i<3;i++)scheduleFixture(c,fixture('f'+i,addDays('2026-08-08',i*7)));
 let cancelled=false;const stop=await advanceCalendar(c,{until:'2026-09-01',simulate:result,checkpoint:s=>{saved=s;cancelled=true;},cancelled:()=>cancelled});assert.equal(stop.reason,'cancelled');assert.equal(stop.completed,1);
 c=structuredClone(saved);await assert.rejects(advanceCalendar(c,{until:'2026-09-01',simulate:result,checkpoint:()=>{throw Error('Storage unavailable');}}));assert.equal(c.fixtures[1].status,'complete');
 const resumed=await advanceCalendar(c,{until:'2026-09-01',simulate:result});assert.equal(resumed.completed,1);assert.equal(c.fixtures.length,3);
});
test('live fixture boundary stops before controlled club and commits exact results only once',async()=>{
 const c=calendar();scheduleFixture(c,fixture('other','2026-08-07','c','d'));scheduleFixture(c,fixture('mine','2026-08-08'));
 const response=await advanceCalendar(c,{until:'2026-08-30',simulate:result,controlledClub:'a',stopBeforeControlled:true});assert.equal(response.reason,'fixture');assert.equal(response.completed,1);
 const f=c.fixtures.find(f=>f.id==='mine');assert.throws(()=>commitCalendarResult(c,f.id,{...result(f),replay:{}}),/replays/);assert.equal(commitCalendarResult(c,f.id,result(f)),true);assert.equal(commitCalendarResult(c,f.id,result(f)),false);assert.throws(()=>commitCalendarResult(c,f.id,{...result(f),score:[2,0]}),/different/);
});
test('registration moves one person, balances both clubs and rejects conflicting retries',()=>{
 const w=world();assert.equal(registerWorldDeal(w,deal(),'2026-08-10'),'complete');assert.equal(w.players[0].owner,'b');assert.equal(w.players[0].registeredClub,'b');assert.equal(w.clubs[0].funds,120);assert.equal(w.clubs[1].funds,60);const snapshot=structuredClone(w);registerWorldDeal(w,deal(),'2026-08-10');assert.deepEqual(w,snapshot);assert.throws(()=>registerWorldDeal(w,{...deal(),fee:1},'2026-08-10'));assert.deepEqual(w,snapshot);
});
test('outside-window deals reserve funds and register once at the next window',()=>{
 let w=world();assert.equal(registerWorldDeal(w,deal(),'2026-10-21'),'pending');assert.equal(w.players[0].owner,'a');assert.equal(w.clubs[1].funds,80);w=JSON.parse(JSON.stringify(w));processWorldRegistrations(w,'2026-12-31');assert.equal(w.players[0].owner,'a');processWorldRegistrations(w,'2027-01-01');assert.equal(w.players[0].owner,'b');const snap=structuredClone(w);processWorldRegistrations(w,'2027-01-01');assert.deepEqual(w,snap);
});
test('a loan changes eligibility rather than ownership and returns on its civil date',()=>{
 const w=world();registerWorldDeal(w,{...deal(),kind:'loan',end:'2027-06-30'},'2026-08-10');assert.equal(w.players[0].owner,'a');assert.equal(w.players[0].registeredClub,'b');assert.equal(validateCareerWorld(w).ready,true);assert.throws(()=>registerWorldDeal(w,{...deal(),id:'sale'},'2026-08-11'));processWorldRegistrations(w,'2027-06-30');assert.equal(w.players[0].registeredClub,'a');assert.equal(w.players[0].loan,undefined);
});
test('bad ownership, duplicate people and unaffordable deals cannot corrupt the world',()=>{
 const w=world(),before=structuredClone(w);assert.throws(()=>registerWorldDeal(w,{...deal(),fee:90},'2026-08-10'));assert.deepEqual(w,before);w.players.push({...w.players[0]});assert.equal(validateCareerWorld(w).ready,false);w.players.pop();w.players[0].registeredClub='c';assert.equal(validateCareerWorld(w).ready,false);
});
test('fantasy calendar projection preserves source save and orients existing results',()=>{
 const c={season:1,competition:{round:1,user:'a',schedule:[[['a','b']],[['b','a']]],results:[{home:'a',away:'b',round:1,score:[2,1]}]}},snapshot=structuredClone(c),cal=fantasyManagerCalendar(c);assert.deepEqual(c,snapshot);assert.equal(cal.fixtures[0].result.kind,'statistical');assert.equal(cal.fixtures[1].status,'scheduled');assert.equal(fixtureRestDays(cal,cal.fixtures[1],'a'),7);assert.equal(fantasyManagerCalendar({...c,season:2}).fixtures[0].date,'2027-08-08');
});
test('curation records official loan evidence, leaves unknown dates unknown and cannot silently lose people',async()=>{
 const data=JSON.parse(await readFile(new URL('../data/manager/england-2026-candidate.json',import.meta.url),'utf8')),overrides=JSON.parse(await readFile(new URL('../data/manager/england-2026-overrides.json',import.meta.url),'utf8'));
 const curated=applyManagerCuration(data,overrides),p=curated.clubs.flatMap(c=>c.players).find(p=>p.id==='p567119');assert.equal(p.owner,'eng:6');assert.equal(p.registeredClub,'sco:celtic');assert.equal(p.birthDate,'2007-10-20');assert.equal(p.loanEnd,undefined);const report=validateManagerDataset(curated);assert.equal(report.ready,false);assert.equal(report.loanedOut,1);assert.ok(report.unverifiedRegistrations>0);assert.throws(()=>applyManagerCuration(data,{...overrides,players:{missing:{}}}),/disappeared/);
});
