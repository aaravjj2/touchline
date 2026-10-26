import test from 'node:test';
import assert from 'node:assert/strict';
import {PACKS,legend} from '../dist/legends.js';
import {selectSquad,oppositionField} from '../dist/europe-clubs.js';
import {createCompetition} from '../dist/competition.js';
import {upgradeManager,managerCommand,managerWindow} from '../dist/manager-career.js';
import {enableConnectedSeason,advanceConnected,connectedNext,commitConnectedFixture} from '../dist/manager-season.js';
function career(season=1){const p=PACKS[0],s=selectSquad(p),ids=s.xi.concat(s.bench),user={id:'user',name:p.club,rating:92,attack:88,defense:88,formation:s.formation,xi:s.xi,roster:ids.map(legend)};return enableConnectedSeason(upgradeManager({version:1,season,seed:42,name:p.club,hostClub:p.club,credits:180,trust:65,training:'balanced',manager:'architect',formation:s.formation,xi:s.xi,bench:s.bench,condition:Object.fromEntries(ids.map(id=>[id,{energy:100,morale:65,growth:0,contract:114}])),history:[],competition:createCompetition(oppositionField(user,{format:'league',seed:42,hostClub:p.club}),{seed:42,format:'league'})}));}
test('connected career schedules three competitions with no club double bookings',()=>{
 const c=career(),cal=c.connected.calendar;assert.equal(cal.fixtures.filter(f=>f.competition==='league').length,380);assert.equal(cal.fixtures.filter(f=>f.competition==='europe').length,18);assert.equal(cal.fixtures.filter(f=>f.competition==='cup').length,4);
 for(const a of cal.fixtures)for(const b of cal.fixtures)if(a.id!==b.id&&[a.home,a.away].some(id=>id===b.home||id===b.away))assert.ok(Math.abs(Date.parse(a.date)-Date.parse(b.date))>=2*86400000);
 assert.equal(connectedNext(c).competition,'league');
});
test('a complete connected season resolves every cup round, both European legs and all league games',async()=>{
 const c=career();const result=await advanceConnected(c,{mode:'season'});assert.equal(result.reason,'complete');assert.equal(c.competition.results.length,380);assert.equal(c.connected.cup.results.length,19);assert.equal(c.connected.europe.results.length,189);assert.equal(c.connected.completed,true);assert.ok(c.connected.review);assert.ok(c.management.archive[0].connectedReview);assert.equal(c.connected.calendar.fixtures.filter(f=>f.status==='scheduled').length,0);assert.ok(c.history.length>=46);assert.equal(new Set(c.connected.wageWeeks).size,c.connected.wageWeeks.length);
});
test('checkpoint reload and cancellation preserve the exact remaining outcomes',async()=>{
 const original=career(),c=career();await advanceConnected(original,{mode:'season'});let checkpoint,cancelled=false;await advanceConnected(c,{mode:'season',onCheckpoint:s=>{checkpoint=structuredClone(s);cancelled=true;},cancelled:()=>cancelled});assert.ok(checkpoint);const resumed=JSON.parse(JSON.stringify(checkpoint));await advanceConnected(resumed,{mode:'season'});assert.deepEqual(resumed.connected.review,original.connected.review);assert.deepEqual(resumed.competition.results,original.competition.results);assert.deepEqual(resumed.connected.europe.results,original.connected.europe.results);
});
test('managed kickoff stops before playing and result retry cannot duplicate finances',async()=>{
 const c=career(),response=await advanceConnected(c,{mode:'manage'}),f=response.fixture;assert.equal(response.reason,'kickoff');assert.equal(c.history.length,0);const r={home:f.home,away:f.away,seed:f.seed,score:[1,0],engineVersion:'fast-season-1',events:[],winner:f.home};commitConnectedFixture(c,f.id,r);const snapshot=structuredClone(c);assert.equal(commitConnectedFixture(c,f.id,r),false);assert.deepEqual(c,snapshot);assert.throws(()=>commitConnectedFixture(c,f.id,{...r,score:[2,0]}));
});
test('shared date windows and mandatory decisions stop progression before charging wages',async()=>{
 const c=career();c.connected.calendar.date='2026-10-20';assert.equal(managerWindow(c),false);c.connected.calendar.date='2027-01-10';assert.equal(managerWindow(c),true);c.connected.calendar.date='2026-08-01';c.management.inbox.push({id:'mandatory',mandatory:true,resolved:false});const before=structuredClone(c);const result=await advanceConnected(c,{mode:'season'});assert.equal(result.reason,'decision');assert.deepEqual(c,before);managerCommand(c,{type:'resolve',id:'mandatory',value:'budget'});const next=await advanceConnected(c,{mode:'next'});assert.equal(next.reason,'match');assert.equal(c.history.length,1);
});
