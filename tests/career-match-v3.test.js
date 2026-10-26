import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createSuperCareerPreview} from '../dist/super-career.js';
import {SUPER_PACKS} from '../dist/super-catalog.js';
import {positionBench,simulateCareerMatchV3,validateCareerMatchV3} from '../dist/career-match-v3.js';
import {prepareSuperFixture,simulateSuperFixture,commitSuperFixture,settleSuperDate,resolveSuperOffer} from '../dist/super-season.js';
import {careerStatistics} from '../dist/career-statistics.js';
import {managerCommand} from '../dist/manager-career.js';
import {sandboxProfile,worldPlayer,legalClub} from '../dist/sandbox-world.js';
import {openingCandidate} from '../dist/super-opening-data.js';
import {auditSuperDataset} from '../dist/super-dataset.js';
const make=()=>createSuperCareerPreview({clubId:SUPER_PACKS[0].id,seed:20261022,incidents:false});
test('new fast matches make legal changes in three windows and reconcile all 990 team minutes',()=>{
 const c=make(),[h,a]=c.competition.teams;let changes=0;
 for(let seed=1;seed<=40;seed++){const r=simulateCareerMatchV3(h,a,seed,true);validateCareerMatchV3(r,[h,a]);assert.deepEqual(r,simulateCareerMatchV3(h,a,seed,true));for(let t=0;t<2;t++){assert.equal(r.playerStats[t].reduce((n,p)=>n+p.minutes,0),990);assert.ok(r.substitutions.filter(s=>s.team===t).length<=5);assert.ok(new Set(r.substitutions.filter(s=>s.team===t).map(s=>s.minute)).size<=3);}changes+=r.substitutions.length;}
 assert.ok(changes>0);assert.ok(positionBench(h).length<=9);
});
test('empty user bench is honored and tired substitutions lose less energy than a full match',()=>{
 const c=make(),[h,a]=c.competition.teams,r=simulateCareerMatchV3({...h,matchBench:[]},a,81);assert.equal(r.substitutions.filter(s=>s.team===0).length,0);const sub=r.substitutions.find(s=>s.team===1);assert.ok(sub);const p=r.playerStats[1].find(p=>p.id===sub.in);assert.equal(p.minutes,90-sub.minute);assert.ok(r.condition[p.id]>r.condition[a.xi[0]]);
});
test('invalid position changes, time intervals and off-pitch scorers are rejected',()=>{
 const c=make(),[h,a]=c.competition.teams,r=simulateCareerMatchV3(h,a,81),sub=r.substitutions[0];assert.ok(sub);
 const bad=structuredClone(r);bad.substitutions[0].position='GK';assert.throws(()=>validateCareerMatchV3(bad,[h,a]),/position/);
 const wrong=structuredClone(r);wrong.playerStats[0][0].minutes--;assert.throws(()=>validateCareerMatchV3(wrong,[h,a]),/minutes/);
 const goal=r.events.find(e=>e.type==='goal');assert.ok(goal);const invalid=structuredClone(r),e=invalid.events.find(e=>e.type==='goal'),replacement=invalid.substitutions.find(s=>s.team===e.team);assert.ok(replacement);e.minute=1;e.scorerId=replacement.in;for(const row of invalid.playerStats[e.team])row.goals=invalid.events.filter(g=>g.team===e.team&&g.scorerId===row.id).length;assert.throws(()=>validateCareerMatchV3(invalid,[h,a]),/pitch/);
});
test('all clubs carry physical or modeled fatigue and recover once per date',()=>{
 const c=make(),f=c.connected.calendar.fixtures.find(f=>f.status==='scheduled');prepareSuperFixture(c,f);const r=simulateSuperFixture(c,f);commitSuperFixture(c,f.id,r);const starter=r.playerStats[0][0].id,energy=c.world.fitness.energy[starter];assert.ok(energy<100);assert.equal(c.world.fitness.date,f.date);const before=structuredClone(c);settleSuperDate(c,f.date);assert.deepEqual(c,before);settleSuperDate(c,'2026-08-09',{market:false});assert.equal(c.world.fitness.energy[starter],Math.min(100,energy+2.5));assert.equal(careerStatistics(c).players.reduce((n,p)=>n+p.minutes,0),1980);
});
test('full 3.9 saves keep exact old fitness, lineup and scoring continuation',async()=>{
 const root='reports/three-club-careers/2026-10-22-market-v2/barcelona/',c=JSON.parse(await readFile(root+'midseason-career.json','utf8')),expected=JSON.parse(await readFile(root+'final-career.json','utf8'));assert.equal(c.statisticsVersion,1);assert.equal(c.world.fitness,undefined);
 const decisions=()=>{for(const m of c.management.inbox.filter(m=>!m.resolved))managerCommand(c,{type:'resolve',id:m.id,value:'reassure'});for(const o of c.connected.offers.filter(o=>o.status==='open'&&o.expires>=c.world.date))resolveSuperOffer(c,o.id,false);};
 while(!c.connected.completed){decisions();const f=c.connected.calendar.fixtures.find(f=>f.status==='scheduled');settleSuperDate(c,f.date);decisions();if(f.home==='user'||f.away==='user')managerCommand(c,{type:'auto',value:'rotation',formation:c.formation});prepareSuperFixture(c,f);commitSuperFixture(c,f.id,simulateSuperFixture(c,f));}decisions();assert.deepEqual(c,expected);
});
test('reviewed position facts reduce unknown coverage without rewriting the source catalog or opening registrations',()=>{
 const before=JSON.stringify(SUPER_PACKS),d=openingCandidate(),audit=auditSuperDataset(d);assert.equal(audit.ready,false);assert.equal(audit.errors.filter(e=>e.kind==='natural-positions').length,6);assert.equal(d.clubs.flatMap(c=>c.players).find(p=>p.id==='super-villarreal-250175645').positions[0],'GK');assert.equal(JSON.stringify(SUPER_PACKS),before);assert.ok(audit.errors.some(e=>e.kind==='registration-evidence'));
});
test('dated receipts and wages are separate ledger entries and a date retry cannot duplicate them',()=>{const c=make();settleSuperDate(c,'2026-08-08',{market:false});assert.ok(c.management.ledger.some(r=>r.kind==='wages'));assert.ok(c.management.ledger.some(r=>r.kind==='operating-income'));const before=structuredClone(c);settleSuperDate(c,'2026-08-08',{market:false});assert.deepEqual(c,before);assert.equal(c.management.lastBalance,c.credits);});
test('accepted user sales appear exactly once in the club ledger',()=>{const c=make();settleSuperDate(c,'2026-08-08',{market:false});const p=c.bench.map(id=>worldPlayer(c,id)).find(p=>legalClub(c,'user',p.id)),buyer=c.world.clubs.find(t=>c.world.members.includes(t.id)&&t.id!=='user');c.connected.offers.push({id:'ledger-sale',player:p.profileId,buyer:buyer.id,fee:1000000,wage:1000,date:c.world.date,expires:'2026-08-15',status:'open'});resolveSuperOffer(c,'ledger-sale',true);assert.equal(c.management.ledger.filter(r=>r.kind==='sale'&&r.id==='sale:ledger-sale').length,1);assert.equal(c.management.lastBalance,c.credits);const before=structuredClone(c);assert.throws(()=>resolveSuperOffer(c,'ledger-sale',true));assert.deepEqual(c,before);});
