import test from 'node:test';
import assert from 'node:assert/strict';
import {createSuperCareerPreview,createVerifiedSuperCareer} from '../dist/super-career.js';
import {createSandboxCareer} from '../dist/sandbox-career.js';
import {SUPER_PACKS} from '../dist/super-catalog.js';
import {openingCandidate,SUPER_OPENING_AUDIT} from '../dist/super-opening-data.js';
import {auditSuperDataset} from '../dist/super-dataset.js';
import {simulateSuperFixture,advanceSuperCareer,commitSuperFixture,settleSuperDate,nextSuperCareerSeason,resolveSuperOffer,superTeam,prepareSuperFixture} from '../dist/super-season.js';
import {validateManagerXI,managerCommand} from '../dist/manager-career.js';
import {positionRoster,validPositionXI} from '../dist/manager-positions.js';
import {POSITION_SLOTS,canPlayPosition} from '../dist/player-positions.js';
import {sandboxProfile,worldPlayer,legalClub,sandboxTransferParties} from '../dist/sandbox-world.js';
import {fixtureDefinition,playDefinition,fixtureResult,fingerprint} from '../dist/fixture-engine.js';
import {simulateFast} from '../dist/competition.js';
import {rotationProposal,nextManagerFixture} from '../dist/manager-experience.js';
import {renderManagerCareer} from '../dist/manager-ui.js';
const make=(options={})=>createSuperCareerPreview({clubId:SUPER_PACKS[0].id,seed:3501,...options});
const resolve=c=>{for(const i of c.management.inbox)i.resolved=true;};
async function season(c){for(let i=0;i<100&&!c.connected.completed;i++){resolve(c);await advanceSuperCareer(c,{mode:'season'});}assert.ok(c.connected.completed);}

test('opening-day audit blocks October candidates and ready flags cannot unlock them',()=>{
 const d=openingCandidate();d.ready=true;assert.equal(auditSuperDataset(d).ready,false);assert.equal(SUPER_OPENING_AUDIT.players,517);assert.throws(()=>createVerifiedSuperCareer(),/locked/);assert.ok(SUPER_OPENING_AUDIT.errors.some(e=>e.kind==='registration-evidence'));
 const proof={status:'verified',source:'https://example.com/source',effective:'2026-10-21',checked:'2026-10-22'};d.clubs[0].membership=proof;assert.ok(auditSuperDataset(d).errors.some(e=>e.kind==='club-evidence'&&e.club===d.clubs[0].id));
});
test('new rules select complete position-eligible teams while legacy worlds remain unchanged',()=>{
 const legacy=createSandboxCareer({kind:'super-league',clubId:SUPER_PACKS[0].id,seed:3501}),before=structuredClone(legacy),c=make();assert.equal(legacy.careerRulesVersion,undefined);assert.deepEqual(legacy,before);assert.equal(c.datasetId,'super-october-2026-unverified-preview-v1');assert.equal(c.setup.verifiedOpeningDay,false);
 for(const t of c.competition.teams){assert.ok(validPositionXI(t.roster,t.xi,t.formation),t.name);const ps=positionRoster(t.roster,t.xi,t.formation);for(const p of ps.filter(p=>t.xi.includes(p.id)))assert.ok(canPlayPosition(p,p.assignedPosition));}
 assert.ok(validateManagerXI(c));assert.equal(c.connected.calendar.fixtures.length,384);assert.equal(c.connected.cup.byes.length,12);const gks=c.bench.filter(id=>sandboxProfile(id).role==='GK');if(gks.length>1){for(const id of gks.slice(1)){const p=worldPlayer(c,id);p.owner=p.registeredClub='free-agents';c.bench=c.bench.filter(x=>x!==id);delete c.condition[id];}}assert.throws(()=>sandboxTransferParties(c,{kind:'sell',player:gks[0],fee:1}),/goalkeeper reserve/);
});
test('manager rejects winger/striker swaps and proposals preserve natural positions',()=>{
 const c=make(),xi=[...c.xi],[a,b]=[8,9];[xi[a],xi[b]]=[xi[b],xi[a]];assert.throws(()=>managerCommand(c,{type:'lineup',formation:c.formation,xi}),/natural positions/);
 const before=structuredClone(c),proposal=rotationProposal(c);assert.ok(validPositionXI(c.xi.concat(c.bench).map(sandboxProfile),proposal,c.formation));assert.deepEqual(c,before);
});
test('cup draw is deterministic, has twelve distinct byes and occupies only league break dates',()=>{
 const a=make(),b=make();assert.deepEqual(a.connected.cup,b.connected.cup);const cup=a.connected.calendar.fixtures.filter(f=>f.competition==='cup');assert.equal(cup.length,4);assert.equal(new Set([...a.connected.cup.byes,...cup.flatMap(f=>[f.home,f.away])]).size,20);for(const f of cup)assert.equal(a.connected.calendar.fixtures.some(q=>q.competition==='league'&&q.date===f.date),false);
});
test('elapsed-day finances and recovery commit once, with atomic rollback on invalid dates',()=>{
 const c=make();settleSuperDate(c,'2026-08-08');const before=structuredClone(c);assert.equal(settleSuperDate(c,'2026-08-08'),false);assert.deepEqual(c,before);assert.throws(()=>settleSuperDate(c,'2026-08-07'),/reverse/);assert.deepEqual(c,before);assert.ok(c.connected.weeklyReports[0].transfers.length>0);
 const expected=c.world.clubs.find(t=>t.id==='user').funds;assert.equal(Math.round(c.credits*500000),expected);
});
test('opposition offers never move user players until an explicit valid acceptance',()=>{
 const c=make();settleSuperDate(c,'2026-08-08');const p=c.bench.map(id=>worldPlayer(c,id)).find(p=>legalClub(c,'user',p.id)),buyer=c.world.clubs.find(t=>c.world.members.includes(t.id)&&t.id!=='user');assert.ok(p);const offer={id:'test-offer',player:p.profileId,buyer:buyer.id,fee:1000000,wage:1000,date:c.world.date,expires:'2026-08-15',status:'open'};c.connected.offers.push(offer);const oldOwner=p.owner,before=c.credits;assert.equal(oldOwner,'user');resolveSuperOffer(c,offer.id,true);assert.equal(worldPlayer(c,p.profileId).owner,buyer.id);assert.equal(c.credits,before+2);const committed=structuredClone(c);assert.throws(()=>resolveSuperOffer(c,offer.id,true),/unavailable/);assert.deepEqual(c,committed);
});
test('loan return on a dated rest day restores parent wage and reconciles the user roster',()=>{
 const c=make(),p=worldPlayer(c,c.bench.at(-1)),parent=c.world.members.find(id=>id!=='user');p.owner=parent;p.loan={end:'2026-08-07',source:'Test negotiated loan',parentWageGbp:12345,fullWageGbp:20000};settleSuperDate(c,'2026-08-08');const returned=worldPlayer(c,p.profileId);assert.equal(returned.registeredClub,parent);assert.equal(returned.loan,undefined);assert.equal(returned.wageGbp,12345);assert.ok(!c.bench.includes(p.profileId));assert.equal(c.condition[p.profileId],undefined);
});
test('two integrated seasons finish 380 league and 19 cup ties, with exact reload continuation',async()=>{
 let c=make();await advanceSuperCareer(c,{mode:'next'});const copy=JSON.parse(JSON.stringify(c));await season(c);await season(copy);assert.equal(fingerprint(c),fingerprint(copy));assert.equal(c.competition.results.length,380);assert.equal(c.connected.cup.results.length,19);assert.ok(c.connected.cup.champion);assert.equal(c.connected.calendar.fixtures.filter(f=>f.status==='scheduled').length,0);assert.equal(c.management.archive[0].connectedReview.cupWinner,c.connected.review.cupWinner);
 const f=c.connected.calendar.fixtures.at(-1),before=structuredClone(c),{kind,recordId,...r}=f.result;assert.equal(commitSuperFixture(c,f.id,r),false);assert.deepEqual(c,before);assert.throws(()=>commitSuperFixture(c,f.id,{...r,score:[99,0]}),/Conflicting/);assert.deepEqual(c,before);
 c=nextSuperCareerSeason(c);assert.equal(c.season,2);assert.equal(c.connected.cup.results.length,0);await season(c);assert.equal(c.competition.results.length,380);assert.equal(c.connected.cup.results.length,19);assert.equal(c.management.archive.length,2);
});
test('physical super fixture records exact positions and replay',async()=>{
 const c=make();await advanceSuperCareer(c,{mode:'manage'});const f=c.connected.calendar.fixtures.find(f=>f.status==='scheduled');assert.ok(f.home==='user'||f.away==='user');prepareSuperFixture(c,f);const def=fixtureDefinition(superTeam(c,f.home),superTeam(c,f.away),f.seed);const state=playDefinition(def,[],true),r=fixtureResult(def,state,f.decisive);commitSuperFixture(c,f.id,r);const after=structuredClone(c);assert.equal(commitSuperFixture(c,f.id,r),false);assert.deepEqual(c,after);assert.deepEqual(playDefinition(def,[],true).score,r.score);assert.ok(c.connected.calendar.fixtures.find(q=>q.id===f.id).result.definition);
});
test('invalid decisive cup winners roll back the entire transaction',()=>{
 const c=make();while(c.connected.calendar.fixtures.find(f=>f.status==='scheduled').competition!=='cup'){resolve(c);const f=c.connected.calendar.fixtures.find(f=>f.status==='scheduled');prepareSuperFixture(c,f);commitSuperFixture(c,f.id,simulateSuperFixture(c,f));}
 const f=c.connected.calendar.fixtures.find(f=>f.status==='scheduled'),before=structuredClone(c);assert.throws(()=>commitSuperFixture(c,f.id,{home:f.home,away:f.away,seed:f.seed,score:[2,0],winner:f.away,events:[]}),/winner conflicts/);assert.deepEqual(c,before);assert.throws(()=>commitSuperFixture(c,f.id,{home:f.home,away:f.away,seed:f.seed,score:[0,0],pens:[3,-1],winner:f.home,events:[]}),/valid score/);assert.deepEqual(c,before);
});
test('founder keeps funding and original squad, and browsing the integrated UI is read-only',()=>{
 const c=make({custom:true,name:'Borough Athletic'}),before=structuredClone(c);assert.equal(c.credits,1500);assert.ok(c.xi.every(id=>id.startsWith('founder-')));assert.match(renderManagerCareer(c),/unverified preview/);assert.equal(nextManagerFixture(c).competitionName,'Super League');assert.deepEqual(c,before);
});
