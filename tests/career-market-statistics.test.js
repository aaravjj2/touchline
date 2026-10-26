import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createSuperCareerPreview} from '../dist/super-career.js';
import {SUPER_PACKS} from '../dist/super-catalog.js';
import {settleSuperDate,prepareSuperFixture,commitSuperFixture,simulateSuperFixture,advanceSuperCareer,nextSuperCareerSeason,resolveSuperOffer} from '../dist/super-season.js';
import {managerCommand,managerAfterFixture} from '../dist/manager-career.js';
import {recruitmentNeeds,transferCoolingDown} from '../dist/career-market.js';
import {careerStatistics,careerMatchStatistics,simulateCareerFast,validateCareerStatistics} from '../dist/career-statistics.js';
import {simulateFast} from '../dist/competition.js';
import {sandboxProfile,legalClub,worldPlayer} from '../dist/sandbox-world.js';
import {canPlayPosition} from '../dist/player-positions.js';
import {daysBetween} from '../dist/manager-calendar.js';
import {managerPriorities,setManagerView,latestCareerReplay} from '../dist/manager-experience.js';
import {renderManagerCareer} from '../dist/manager-ui.js';
import {openingCandidate} from '../dist/super-opening-data.js';
import {auditSuperDataset} from '../dist/super-dataset.js';
import {indexedDB} from 'fake-indexeddb';
import {backupBeforeUpgrade,exportArchive} from '../dist/save-vault.js';
import {getRecord} from '../dist/replay-store.js';
import {BUILD_VERSION} from '../dist/build-version.js';
const make=(club='Barcelona',seed=20261022)=>createSuperCareerPreview({clubId:SUPER_PACKS.find(p=>p.club===club).id,seed,marketVersion:2});

test('market recruits exact slots, stops same-day cycles and retains legal squads and wage reserves',()=>{
 const c=make(),initial=structuredClone(c);for(const date of ['2026-08-08','2026-09-01','2027-01-02'])settleSuperDate(c,date);
 const deals=c.world.agreements.filter(a=>a.recruitment);assert.ok(deals.length>0);
 for(const a of deals){assert.ok(canPlayPosition(sandboxProfile(c.world.players.find(p=>p.id===a.terms.player).profileId),a.recruitment.position));assert.equal(a.recruitment.role,'starter');}
 for(const person of c.world.players){const moves=deals.filter(a=>a.terms.player===person.id);for(let i=1;i<moves.length;i++)assert.ok(daysBetween(moves[i-1].registered,moves[i].registered)>=180);}
 for(const team of c.competition.teams){assert.ok(legalClub(c,team.id),team.name);const club=c.world.clubs.find(t=>t.id===team.id);assert.ok(club.funds>=0);}
 assert.deepEqual(c.world.players.filter(p=>p.owner==='user').map(p=>p.id),initial.world.players.filter(p=>p.owner==='user').map(p=>p.id));
 const frozen=structuredClone(c);assert.equal(settleSuperDate(c,'2027-01-02'),false);assert.deepEqual(c,frozen);
});
test('delegation is explicit, capped per window, preserves founding players and never auto-sells',()=>{
 const c=createSuperCareerPreview({clubId:SUPER_PACKS[0].id,seed:3501,custom:true,name:'Harbour Athletic'}),initial=structuredClone(c);
 assert.equal(c.management.market.delegation.enabled,false);assert.throws(()=>managerCommand(c,{type:'recruitment-policy',enabled:true,feeBudget:-1,weeklyBudget:2}),/whole-pound/);assert.deepEqual(c,initial);
 managerCommand(c,{type:'recruitment-policy',enabled:true,feeBudget:50000000,weeklyBudget:150000});
 settleSuperDate(c,'2026-08-08');settleSuperDate(c,'2026-09-01');
 const incoming=c.world.agreements.filter(a=>a.terms.to==='user');assert.ok(incoming.length>0);assert.ok(incoming.length<=2);assert.ok(incoming.reduce((n,a)=>n+a.terms.fee,0)<=50000000);assert.ok(incoming.reduce((n,a)=>n+a.recruitment.weeklyWageGbp,0)<=150000);
 assert.ok(initial.world.players.filter(p=>p.owner==='user').every(p=>worldPlayer(c,p.profileId).owner==='user'));
 assert.ok(incoming.every(a=>c.bench.includes(c.world.players.find(p=>p.id===a.terms.player).profileId)));assert.equal(c.world.agreements.some(a=>a.terms.from==='user'),false);
 for(const id of c.bench)assert.equal(c.condition[id].focus,'balanced');
 const spent=incoming.reduce((n,a)=>n+a.terms.fee,0),cash=c.world.clubs.find(t=>t.id==='user').funds;assert.equal(c.credits*500000,cash);assert.ok(spent>0);
 const recruited=c.world.players.find(p=>p.id===incoming[0].terms.player);assert.equal(transferCoolingDown(c,recruited.id),true);assert.throws(()=>managerCommand(c,{type:'enquire',kind:'sell',id:recruited.profileId}),/180 days/);
 const before=structuredClone(c);managerCommand(c,{type:'recruitment-policy',enabled:false,feeBudget:1,weeklyBudget:1});assert.equal(c.world.agreements.length,before.world.agreements.length);
});
test('recruitment plans identify intended positions without mutating the save',()=>{const c=make(),before=structuredClone(c),needs=recruitmentNeeds(c,'user');assert.equal(needs.length,11);for(const n of needs)assert.ok(canPlayPosition(sandboxProfile(n.starter),n.position));assert.deepEqual(c,before);});
test('loan wage responsibilities change on the actual return date during a longer settlement',()=>{
 const c=make(),p=worldPlayer(c,c.bench.at(-1)),parent=c.world.members.find(id=>id!=='user');p.owner=parent;p.wageGbp=70000;p.loan={end:'2026-08-07',source:'QA dated terms',parentWageGbp:140000,fullWageGbp:140000};
 const user=c.world.clubs.find(t=>t.id==='user'),owner=c.world.clubs.find(t=>t.id===parent),oldUser=user.funds,oldOwner=owner.funds,wages=id=>c.world.players.filter(p=>p.registeredClub===id).reduce((n,p)=>n+p.wageGbp,0)+c.world.players.filter(p=>p.owner===id&&p.loan).reduce((n,p)=>n+p.loan.fullWageGbp-p.wageGbp,0),u=wages('user'),o=wages(parent),charge=(before,after)=>Math.floor(before*6/7)+Math.floor(after*7/7)-Math.floor(after*6/7);
 settleSuperDate(c,'2026-08-08',{market:false});assert.equal(c.world.clubs.find(t=>t.id==='user').funds,oldUser+Math.floor(user.annualReceiptsGbp*7/365)-charge(u,u-70000));assert.equal(c.world.clubs.find(t=>t.id===parent).funds,oldOwner+Math.floor(owner.annualReceiptsGbp*7/365)-charge(o,o+70000));assert.equal(worldPlayer(c,p.profileId).wageGbp,140000);const before=structuredClone(c);assert.equal(settleSuperDate(c,'2026-08-08'),false);assert.deepEqual(c,before);
});
test('expired contracts pay only through their final day and release exactly once',()=>{
 const c=make(),p=worldPlayer(c,c.bench.at(-1));p.wageGbp=70000;p.contractEnd='2026-08-04';const user=c.world.clubs.find(t=>t.id==='user'),cash=user.funds,weekly=c.world.players.filter(p=>p.registeredClub==='user').reduce((n,p)=>n+p.wageGbp,0);
 settleSuperDate(c,'2026-08-08',{market:false});assert.equal(c.credits*500000,cash+Math.floor(user.annualReceiptsGbp*7/365)-weekly+30000);assert.equal(worldPlayer(c,p.profileId).owner,'free-agents');assert.equal(c.condition[p.profileId],undefined);assert.equal(c.world.expirations.filter(e=>e.player===p.id).length,1);assert.equal(c.world.expirations[0].date,'2026-08-05');settleSuperDate(c,'2026-08-15',{market:false});assert.equal(c.world.expirations.filter(e=>e.player===p.id).length,1);
});
test('release backups preserve the prior save once per build and exports identify the current build',async()=>{
 globalThis.indexedDB=indexedDB;const values=new Map([['touchline.qa.v2',JSON.stringify({page:'match',lineup:['preserve']})],['touchline.qa.release','2.7.0']]),storage={getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,String(v)),removeItem:k=>values.delete(k)};
 await backupBeforeUpgrade(storage,true);const id='qa:backup:before-'+BUILD_VERSION,backup=await getRecord(id);assert.equal(backup.backup.saves[0].lineup[0],'preserve');storage.setItem('touchline.qa.v2',JSON.stringify({page:'match',lineup:['later']}));await backupBeforeUpgrade(storage,true);assert.deepEqual(await getRecord(id),backup);assert.equal((await exportArchive(storage,true)).build,BUILD_VERSION);
});
test('statistical player goals, assists and minutes reconcile without changing the old score model',()=>{
 const c=make(),[home,away]=c.competition.teams;for(let seed=1;seed<=30;seed++){const old=simulateFast(home,away,seed,true),r=simulateCareerFast(home,away,seed,true);assert.deepEqual(r.score,old.score);assert.deepEqual(r.pens,old.pens);assert.equal(r.winner,old.winner);assert.deepEqual(r,simulateCareerFast(home,away,seed,true));validateCareerStatistics(r,[home,away]);for(let t=0;t<2;t++){assert.equal(r.playerStats[t].reduce((n,p)=>n+p.goals,0),r.score[t]);assert.equal(r.playerStats[t].reduce((n,p)=>n+p.minutes,0),990);assert.equal(r.playerStats[t].filter(p=>p.position==='GK').reduce((n,p)=>n+p.goals,0),0);}}
 assert.equal(careerMatchStatistics(simulateFast(home,away,1)),null);
});
test('invalid statistics roll back the entire fixture commit, valid retries cannot double-count',()=>{
 const c=make(),f=c.connected.calendar.fixtures.find(f=>f.status==='scheduled');prepareSuperFixture(c,f);const r=simulateSuperFixture(c,f),before=structuredClone(c),bad=structuredClone(r);bad.playerStats[0][0].goals++;assert.throws(()=>commitSuperFixture(c,f.id,bad),/reconcile/);assert.deepEqual(c,before);
 const badId=structuredClone(r);badId.playerStats[0][0].personId='other-person';assert.throws(()=>commitSuperFixture(c,f.id,badId),/identities/);assert.deepEqual(c,before);
 commitSuperFixture(c,f.id,r);const stats=careerStatistics(c);assert.equal(stats.modeled,1);assert.equal(stats.missing,0);assert.equal(stats.players.reduce((n,p)=>n+p.goals,0),r.score[0]+r.score[1]);assert.equal(commitSuperFixture(c,f.id,r),false);assert.deepEqual(careerStatistics(c),stats);assert.equal(careerStatistics(c,{competition:'cup'}).fixtures,0);
});
test('physical statistics preserve unknown assists and unassigned goals instead of inventing them',()=>{
 const r={definition:{},score:[2,0],playerStats:[[{id:'a',name:'A',personId:'one',minutes:70,goals:1,saves:0}],[]]},s=careerMatchStatistics(r);assert.equal(s.source,'recorded');assert.equal(s.teams[0][0].assists,null);assert.deepEqual(s.unattributedGoals,[1,0]);
});
test('last-match replay reads the full calendar record and never reconstructs statistical fixtures',()=>{
 const c=make(),record={home:'user',away:'opponent',seed:123,engineVersion:'2.0.0',definition:{fixtureId:'original'},commands:[{tick:100,type:'preset',value:'press'}]};
 c.connected.calendar.fixtures=[{home:'user',away:'opponent',status:'complete',result:record},{home:'user',away:'other',status:'complete',result:{engineVersion:'fast-career-2',score:[1,0]}}];c.competition.results=[{home:'user',away:'opponent',engineVersion:'2.0.0',score:[0,0]}];assert.equal(latestCareerReplay(c),record);
 c.connected.calendar.fixtures.shift();assert.equal(latestCareerReplay(c),null);delete c.connected;c.competition.results=[{home:'user',away:'other',engineVersion:'fast-career-2',score:[1,0]}];assert.equal(latestCareerReplay(c),null);
});
test('rotation promises have explicit, idempotent six-fixture consequences',()=>{
 const c=make(),id=c.bench[0],s=c.condition[id];s.eligible=10;s.appearances=0;
 managerAfterFixture(c,{home:'user',away:'test',seed:101,score:[1,0],played:[c.xi,[]]});const item=c.management.inbox.find(m=>m.id==='rotation-1-'+id);assert.ok(item);assert.equal(item.mandatory,false);
 managerCommand(c,{type:'resolve',id:item.id,value:'reassure'});const due=s.promiseReview.due;
 for(let i=0;i<6;i++)managerAfterFixture(c,{home:'user',away:'test',seed:200+i,score:[1,0],played:[i<2?[...c.xi,id]:c.xi,[]]});
 assert.equal(s.eligible,due);assert.equal(s.promiseReview,undefined);assert.equal(c.management.promiseOutcomes.find(p=>p.player===id).kept,true);
 const before=structuredClone(c);managerAfterFixture(c,{home:'user',away:'test',seed:205,score:[1,0],played:[c.xi,[]]});assert.deepEqual(c,before);
});
test('contract planning appears six months out, and legacy pages never show new rules',()=>{
 const c=make();c.condition[c.xi[0]].contract=20;assert.ok(managerPriorities(c).some(p=>p.action==='contracts'));setManagerView(c,{page:'transfers'});assert.match(renderManagerCareer(c),/Recruitment director/);setManagerView(c,{page:'season',seasonTab:'statistics'});assert.match(renderManagerCareer(c),/League scoring leaders/);
 delete c.management.market;delete c.statisticsVersion;setManagerView(c,{page:'transfers'});assert.doesNotMatch(renderManagerCareer(c),/Recruitment director/);
});
test('opening audit rejects impossible identities, owners, loan dates and unlabelled financial terms',()=>{
 const d=openingCandidate(),p=d.clubs[0].players[0];p.birthDate='2027-01-01';p.positions=['WIZARD'];p.owner='missing-club';p.loan={end:'2026-07-01'};p.gameTerms={contract:{basis:'authored',note:'QA',value:'2026-07-01'},wage:{basis:'authored',note:'QA',value:-1}};d.clubs[0].players[1].id=p.id;const errors=auditSuperDataset(d).errors.map(e=>e.kind);for(const kind of ['profile-identity','birth-date','natural-positions','owner-registry','loan-return','contract-terms','wage-terms'])assert.ok(errors.includes(kind),kind);
});
test('an existing 3.8 round-19 save retains its exact full-season continuation',async()=>{
 const root='reports/three-club-careers/2026-10-22/barcelona/',c=JSON.parse(await readFile(root+'midseason-career.json','utf8')),expected=JSON.parse(await readFile(root+'final-career.json','utf8'));
 assert.equal(c.management.market,undefined);assert.equal(c.statisticsVersion,undefined);
 while(!c.connected.completed){for(const m of c.management.inbox.filter(m=>!m.resolved))managerCommand(c,{type:'resolve',id:m.id,value:'reassure'});for(const o of c.connected.offers.filter(o=>o.status==='open'&&o.expires>=c.world.date))resolveSuperOffer(c,o.id,false);const f=c.connected.calendar.fixtures.find(f=>f.status==='scheduled');settleSuperDate(c,f.date);for(const o of c.connected.offers.filter(o=>o.status==='open'&&o.expires>=c.world.date))resolveSuperOffer(c,o.id,false);if(f.home==='user'||f.away==='user')managerCommand(c,{type:'auto',value:'rotation',formation:c.formation});prepareSuperFixture(c,f);commitSuperFixture(c,f.id,simulateSuperFixture(c,f));}
 for(const o of c.connected.offers.filter(o=>o.status==='open'&&o.expires>=c.world.date))resolveSuperOffer(c,o.id,false);assert.deepEqual(c,expected);
});
