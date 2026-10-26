import test from 'node:test';
import assert from 'node:assert/strict';
import {createSuperCareerPreview} from '../dist/super-career.js';
import {SUPER_PACKS} from '../dist/super-catalog.js';
import {squadPlan,saleSquadImpact,matchPositionSlots} from '../dist/squad-planner.js';
import {renderSquadPlan,renderSaleImpact} from '../dist/squad-planner-ui.js';
import {configureRecruitment,runCareerMarket,recruitmentNeeds} from '../dist/career-market.js';
import {settleSuperDate,resolveSuperOffer} from '../dist/super-season.js';
import {sandboxProfile,worldPlayer,legalClub} from '../dist/sandbox-world.js';
import {preseasonTargets} from '../dist/preseason-planning.js';
import {canPlayPosition} from '../dist/player-positions.js';
import {createSandboxCareer} from '../dist/sandbox-career.js';
import {setManagerView} from '../dist/manager-experience.js';
import {renderSquad} from '../dist/manager-squad-ui.js';
const make=(options={})=>createSuperCareerPreview({clubId:SUPER_PACKS.find(p=>p.club==='Arsenal').id,seed:3501,name:options.custom?'Harbour Athletic':undefined,...options});

test('shared natural-position cover cannot fill two places or duplicate a person',()=>{
 const versatile={id:'v',personId:'one',rating:80,positions:['LB','RB']};
 assert.equal(matchPositionSlots([versatile],['LB','RB']).missing.length,1);
 assert.equal(matchPositionSlots([versatile,{...versatile,id:'duplicate'}],['LB','RB']).missing.length,1);
 assert.equal(matchPositionSlots([versatile,{id:'l',rating:70,positions:['LB']}],['LB','RB']).missing.length,0);
 assert.deepEqual(matchPositionSlots([{id:'wing',rating:90,positions:['LW']}],['ST']).missing,['ST']);
});
test('simultaneous absences and contract expiry produce real gaps without mutating careers',()=>{
 const c=make(),initial=squadPlan(c),keepers=initial.players.filter(p=>p.positions.includes('GK'));
 for(const p of keepers)c.world.availability.injuries[p.id]={until:'2026-09-01'};
 c.condition[c.bench[0]].contract=0;worldPlayer(c,c.bench[0]).contractEnd='2026-07-31';
 const before=structuredClone(c),p=squadPlan(c);assert.equal(p.canFieldXI,false);assert.ok(p.missing.includes('GK'));assert.equal(p.positions.find(p=>p.position==='GK').available.length,0);assert.match(renderSquadPlan(c),/Cover needed before kickoff/);assert.deepEqual(c,before);
});
test('sale previews reconcile to the remaining registered squad and warn of thin cover',()=>{
 const c=make(),id=c.bench.find(id=>legalClub(c,'user',worldPlayer(c,id).id)),before=structuredClone(c),impact=saleSquadImpact(c,id);assert.equal(impact.after.size,c.xi.length+c.bench.length-1);assert.match(renderSaleImpact(c,id),/Squad after this sale/);assert.deepEqual(c,before);
 const p=worldPlayer(c,id);c.connected.offers.push({id:'qa-sale',player:id,buyer:c.world.members.find(id=>id!=='user'),fee:1000000,wage:p.wageGbp,date:c.world.date,expires:'2026-08-20',status:'open'});resolveSuperOffer(c,'qa-sale',true);assert.deepEqual(squadPlan(c),impact.after);assert.equal(c.connected.offers.at(-1).status,'accepted');
 const thin=make({custom:true});for(const id of thin.bench.slice(4)){thin.bench=thin.bench.filter(p=>p!==id);worldPlayer(thin,id).registeredClub=worldPlayer(thin,id).owner='free-agents';delete thin.condition[id];}assert.ok(saleSquadImpact(thin,thin.bench[0]).warnings.some(w=>w.includes('registered squad')));
});
test('new market separates depth from upgrades and signs affordable reserves without releasing founders',()=>{
 const c=make({custom:true}),original=c.xi.concat(c.bench);assert.equal(c.management.market.version,3);assert.ok(recruitmentNeeds(c,'user').some(n=>n.kind==='depth'));
 configureRecruitment(c,{enabled:true,feeBudget:150000000,weeklyBudget:500000});settleSuperDate(c,'2026-08-08');settleSuperDate(c,'2026-08-15');const deals=c.world.agreements.filter(a=>a.terms.to==='user');assert.ok(deals.some(d=>d.recruitment.role==='rotation'));assert.ok(deals.length<=2);assert.ok(original.every(id=>worldPlayer(c,id).registeredClub==='user'));for(const d of deals)assert.equal(d.recruitment.rulesVersion,3);
});
test('weekly reviews are deterministic and idempotent; v2 retains its monthly cadence',()=>{
 for(const version of [2,3]){const c=make({marketVersion:version}),other=structuredClone(c);for(const date of ['2026-08-08','2026-08-09','2026-08-15']){runCareerMarket(c,date);runCareerMarket(other,date);}assert.deepEqual(c,other);assert.equal(c.connected.marketDates.length,version===3?2:1);const before=structuredClone(c);runCareerMarket(c,'2026-08-15');assert.deepEqual(c,before);assert.equal(c.management.market.version,version);}
});
test('market 3 rolls back date markers, offers and transfers when a transaction fails',()=>{
 const c=make(),before=structuredClone(c);Object.defineProperty(c.world,'agreements',{get(){throw Error('Injected transaction read failure');},enumerable:false});const clean=structuredClone(c);assert.throws(()=>runCareerMarket(c,'2026-08-08'),/Injected/);assert.deepEqual(c,clean);assert.equal(c.connected.marketDates.length,0);assert.equal(before.management.market.version,3);
});
test('founder shortlists are read-only, affordable natural-position conversations and never a forced replacement',()=>{
 const c=make({custom:true}),before=structuredClone(c),needs=preseasonTargets(c);assert.ok(needs.length>0&&needs.length<=3);assert.ok(needs.some(n=>n.targets.length));for(const n of needs)for(const t of n.targets){assert.ok(canPlayPosition(t.player,n.position));assert.ok(t.report.fee<=c.credits);assert.ok(t.report.wage>0);}assert.deepEqual(c,before);assert.deepEqual(preseasonTargets(make({marketVersion:2,custom:true})),[]);
});
test('a broad-role legacy career still shows its lineup with a stale planner preference',()=>{
 const c=createSandboxCareer({clubId:SUPER_PACKS.find(p=>p.club==='Arsenal').id,seed:20261025}),before=structuredClone(c);setManagerView(c,{page:'squad',squadTab:'planning'});const html=renderSquad(c);assert.match(html,/YOUR STARTING XI/);assert.doesNotMatch(html,/aria-label="Squad planner"/);assert.deepEqual(c,before);
});
