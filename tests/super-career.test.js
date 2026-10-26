import test from 'node:test';
import assert from 'node:assert/strict';
import {SUPER_PACKS,WORLD_PACKS,SUPER_AUDIT,SUPER_MEMBERSHIP} from '../dist/super-catalog.js';
import {createSandboxCareer} from '../dist/sandbox-career.js';
import {sandboxMarket,sandboxTeams,sandboxProfile,worldPlayer,legalClub,sandboxDate,sandboxWindow,sandboxFinance,sandboxContractRounds} from '../dist/sandbox-world.js';
import {managerCommand,managerReport,managerAvailable,validateManagerXI,managerBeforeFixture} from '../dist/manager-career.js';
import {prepareSandboxMatchday,applySandboxMatchday,nextSandboxSeason} from '../dist/sandbox-season.js';
import {advance,standings} from '../dist/competition.js';
import {fixtureDefinition,playDefinition,fixtureResult} from '../dist/fixture-engine.js';
import {validateCareerWorld} from '../dist/manager-world.js';
import {unitsToGbp} from '../dist/manager-money.js';
import {potentialRange} from '../dist/player-intelligence.js';
import {parkCareer,switchCareer} from '../dist/career-library.js';
const founder=()=>createSandboxCareer({kind:'super-league',clubId:SUPER_PACKS[0].id,custom:true,name:'Borough Athletic',seed:1926});
const total=c=>c.world.clubs.reduce((n,t)=>n+t.funds,0);
function agree(c,id,kind='buy',years=2){managerCommand(c,{type:'enquire',id,kind});const d=c.management.deals.at(-1),terms={type:'deal-offer',id:d.id,fee:d.fee,wage:d.wage,years,role:'rotation',share:50};managerCommand(c,terms);if(d.stage==='contract')managerCommand(c,terms);managerCommand(c,{type:'deal-confirm',id:d.id});return d;}
function decisions(c){for(const item of c.management.inbox.filter(x=>x.mandatory&&!x.resolved))managerCommand(c,{type:'resolve',id:item.id,value:'reassure'});}
function play(c){decisions(c);prepareSandboxMatchday(c);const results=advance(c.competition,{}, {fast:true});applySandboxMatchday(c,results);return results;}

test('Super League freezes the previous completed standings and exact 6/4/4/4/2 field',()=>{
 assert.equal(SUPER_PACKS.length,20);assert.equal(SUPER_MEMBERSHIP.qualificationSeason,'2025–26');assert.deepEqual(Object.fromEntries(Object.keys(SUPER_MEMBERSHIP.quotas).map(country=>[country,SUPER_PACKS.filter(p=>p.country===country).length])),{ENG:6,ESP:4,GER:4,ITA:4,FRA:2});
 assert.equal(SUPER_PACKS.find(p=>p.country==='ENG'&&p.domesticRank===6).club,'Bournemouth');assert.ok(SUPER_PACKS.some(p=>p.club==='Como'));assert.ok(SUPER_PACKS.some(p=>p.club==='Lens'));assert.ok(!SUPER_PACKS.some(p=>['Chelsea','Tottenham Hotspur','Juventus'].includes(p.club)));
 const people=WORLD_PACKS.flatMap(c=>c.players);assert.equal(new Set(people.map(p=>p.personId)).size,people.length);assert.equal(people.filter(p=>p.providerId==='357565').length,1);assert.ok(SUPER_AUDIT.foreignReferenceMatches>300);assert.ok(SUPER_AUDIT.unknownBirthDates>0);
});

test('every takeover starts with a legal squad and all 380 unique home/away fixtures',()=>{
 for(const club of SUPER_PACKS){const c=createSandboxCareer({kind:'super-league',clubId:club.id});validateManagerXI(c);assert.equal(c.competition.teams.length,20);assert.equal(c.world.members.length,20);assert.ok(c.xi.length+c.bench.length<=45);assert.equal(c.credits,club.budget);
  for(const t of c.competition.teams)assert.doesNotThrow(()=>fixtureDefinition(t,c.competition.teams.find(q=>q.id!==t.id),82));
  const pairs=c.competition.schedule.flat();assert.equal(pairs.length,380);assert.equal(new Set(pairs.map(p=>p.join('|'))).size,380);for(const t of c.competition.teams){assert.equal(pairs.filter(([h])=>h===t.id).length,19);assert.equal(pairs.filter(([,a])=>a===t.id).length,19);}
  assert.equal(validateCareerWorld(c.world).ready,false);assert.equal(validateCareerWorld(c.world,{allowUnknownBirthDates:true}).ready,true);
 }
});

test('created Super League clubs replace one English place, keep their funding and own only original starters',()=>{
 const before=JSON.stringify(SUPER_PACKS),c=founder();assert.equal(c.credits,1500);assert.equal(c.xi.length+c.bench.length,18);assert.ok(c.xi.concat(c.bench).every(id=>id.startsWith('founder-')));assert.equal(c.competition.teams.filter(t=>t.country==='ENG').length,6);assert.ok(!c.competition.teams.some(t=>t.name==='Arsenal'));assert.equal(c.setup.membership.clubs.length,20);assert.equal(JSON.stringify(SUPER_PACKS),before);
 assert.throws(()=>createSandboxCareer({kind:'super-league',clubId:SUPER_PACKS.find(p=>p.country==='ESP').id,custom:true,name:'Borough Athletic'}));
});

test('a purchase moves one identity, removes it from the seller and balances both club ledgers once',()=>{
 const c=founder(),p=sandboxMarket(c).find(p=>p.name==='Erling Haaland'),seller=worldPlayer(c,p.id).owner,before=total(c),cash=c.credits,sellerFunds=c.world.clubs.find(t=>t.id===seller).funds,d=agree(c,p.id);
 assert.equal(d.stage,'complete');assert.equal(worldPlayer(c,p.id).owner,'user');assert.equal(worldPlayer(c,p.id).registeredClub,'user');assert.equal(total(c),before);assert.equal(unitsToGbp(cash-c.credits),unitsToGbp(d.fee));assert.equal(c.world.clubs.find(t=>t.id===seller).funds-sellerFunds,unitsToGbp(d.fee));assert.equal(c.competition.teams.flatMap(t=>t.roster).filter(q=>q.id===p.id).length,1);assert.ok(!c.competition.teams.find(t=>t.id===seller).roster.some(q=>q.id===p.id));
 const snapshot=structuredClone(c);managerCommand(c,{type:'deal-confirm',id:d.id});assert.deepEqual(c,snapshot);assert.equal(c.world.ledger.length,1);assert.ok(legalClub(c,seller));assert.equal(validateCareerWorld(c.world,{allowUnknownBirthDates:true}).ready,true);
});

test('sales pay from an actual buyer and rejected squad-breaking purchases roll back completely',()=>{
 const c=founder(),id=c.bench.find(id=>sandboxProfile(id).role==='MID'),sum=total(c),d=agree(c,id,'sell');assert.equal(d.stage,'complete');assert.notEqual(worldPlayer(c,id).owner,'user');assert.equal(total(c),sum);assert.equal(c.condition[id],undefined);
 const keeper=sandboxMarket(c).find(p=>p.role==='GK'&&!legalClub(c,p.worldRegistration,worldPlayer(c,p.id).id));assert.ok(keeper);const before=structuredClone(c);assert.throws(()=>managerCommand(c,{type:'enquire',id:keeper.id,kind:'buy'}),/replacement/);assert.deepEqual(c,before);
});

test('pending transfers reserve cash, can be withdrawn, and arrive exactly once in the dated January window',()=>{
 let c=founder();c.competition.round=8;assert.equal(sandboxWindow(c),false);const target=sandboxMarket(c).find(p=>p.role==='MID'&&p.rating<85&&legalClub(c,p.worldRegistration,worldPlayer(c,p.id).id)),oldOwner=worldPlayer(c,target.id).owner,d=agree(c,target.id);assert.equal(d.stage,'pending');assert.equal(worldPlayer(c,target.id).owner,oldOwner);assert.equal(managerAvailable(c),c.credits-d.fee);
 c=JSON.parse(JSON.stringify(c));const pending=c.management.deals.at(-1);for(let round=9;round<30;round++){c.competition.round=round;if(sandboxWindow(c))break;}assert.match(sandboxDate(c),/-01-/);managerBeforeFixture(c);assert.equal(c.management.deals.at(-1).stage,'complete');assert.equal(worldPlayer(c,target.id).owner,'user');const before=structuredClone(c);managerBeforeFixture(c);assert.deepEqual(c,before);
 const other=founder();other.competition.round=8;const withdraw=agree(other,target.id);const balance=other.credits;managerCommand(other,{type:'deal-withdraw',id:withdraw.id});assert.equal(managerAvailable(other),balance);assert.equal(other.world.ledger.length,0);
});

test('wages, interest and reserved fees constrain new-world deals without changing older career rules',()=>{
 const c=founder(),p=sandboxMarket(c).find(p=>p.name==='Erling Haaland'),report=managerReport(c,p.id);assert.equal(unitsToGbp(report.wage),625000);assert.ok(report.interest<40);c.credits=1;managerCommand(c,{type:'enquire',id:p.id,kind:'buy'});const d=c.management.deals.at(-1);for(let i=0;i<2;i++)managerCommand(c,{type:'deal-offer',id:d.id,fee:d.fee,wage:d.wage,years:2,role:'rotation'});const before=structuredClone(c);assert.throws(()=>managerCommand(c,{type:'deal-confirm',id:d.id}),/funds/);assert.deepEqual(c,before);
 const young={id:'no-record',rating:80,birthDate:'2008-01-01'},range=potentialRange(young,founder());assert.equal(range.high,83);assert.match(range.method,/\+3/);
});

test('a reserved fee is not counted twice when its January registration becomes affordable',()=>{
 const c=founder();c.competition.round=8;const p=sandboxMarket(c).find(p=>p.role==='MID'&&p.rating<85&&legalClub(c,p.worldRegistration,worldPlayer(c,p.id).id)),d=agree(c,p.id);assert.equal(d.stage,'pending');const forecast=sandboxFinance(c);assert.equal(forecast.pendingWeekly,unitsToGbp(d.wage));assert.ok(forecast.annualWages>forecast.weekly*52);
 c.credits=d.fee+d.wage*13;c.world.clubs.find(t=>t.id==='user').funds=unitsToGbp(c.credits);c.management.lastBalance=c.credits;for(let round=9;round<30;round++){c.competition.round=round;if(sandboxWindow(c))break;}managerBeforeFixture(c);assert.equal(d.stage,'complete');assert.equal(unitsToGbp(c.credits),unitsToGbp(d.wage*13));assert.equal(sandboxFinance(c).pendingWeekly,0);
});

test('agreed departures reserve positional cover at the selling club before either registration',()=>{
 const c=founder();c.competition.round=8;const club=c.world.clubs.find(t=>t.id!=='user'&&c.world.players.filter(p=>p.registeredClub===t.id&&sandboxProfile(p.profileId).role==='GK').length===3),keepers=c.world.players.filter(p=>p.registeredClub===club.id&&sandboxProfile(p.profileId).role==='GK');agree(c,keepers[0].profileId);const before=structuredClone(c);assert.throws(()=>managerCommand(c,{type:'enquire',id:keepers[1].profileId,kind:'buy'}),/agreed departures/);assert.deepEqual(c,before);assert.equal(c.world.players.filter(p=>p.registeredClub===club.id&&sandboxProfile(p.profileId).role==='GK').length,3);
});

test('agreed arrivals reserve squad places as well as fees',()=>{
 const c=founder();c.competition.round=8;const seen=new Set(),targets=sandboxMarket(c).filter(p=>p.role==='MID'&&p.rating<85&&legalClub(c,p.worldRegistration,worldPlayer(c,p.id).id)).sort((a,b)=>managerReport(c,a.id).fee-managerReport(c,b.id).fee).filter(p=>{if(seen.has(p.worldOwner))return false;seen.add(p.worldOwner);return true;});assert.ok(targets.length>=28);
 for(const p of targets.slice(0,27))assert.equal(agree(c,p.id).stage,'pending');assert.equal(c.management.deals.filter(d=>d.stage==='pending').length+c.xi.length+c.bench.length,45);
 managerCommand(c,{type:'enquire',id:targets[27].id,kind:'buy'});const d=c.management.deals.at(-1);for(let i=0;i<2;i++)managerCommand(c,{type:'deal-offer',id:d.id,fee:d.fee,wage:d.wage,years:2,role:'rotation'});const before=structuredClone(c);assert.throws(()=>managerCommand(c,{type:'deal-confirm',id:d.id}),/45 places/);assert.deepEqual(c,before);
});

test('loan wage shares round consistently and an unrenewed starter cannot silently disappear at rollover',()=>{
 let c=founder();const p=sandboxMarket(c).find(p=>p.role==='MID'&&p.rating<85&&unitsToGbp(managerReport(c,p.id).wage)<=33333&&worldPlayer(c,p.id).contractEnd>='2027-06-30'&&legalClub(c,p.worldRegistration,worldPlayer(c,p.id).id));managerCommand(c,{type:'enquire',id:p.id,kind:'loan'});const d=c.management.deals.at(-1);for(let i=0;i<2;i++)managerCommand(c,{type:'deal-offer',id:d.id,fee:d.fee,wage:33333/500000,share:35,years:1,role:'rotation'});assert.equal(d.stage,'ready');managerCommand(c,{type:'deal-confirm',id:d.id});assert.equal(unitsToGbp(c.condition[p.id].wage),11667);assert.equal(worldPlayer(c,p.id).wageGbp,11667);
 c=founder();for(const id of c.xi.concat(c.bench).filter(id=>sandboxProfile(id).role==='MID'))worldPlayer(c,id).contractEnd='2027-06-30';while(!c.competition.champion)play(c);const before=structuredClone(c);assert.throws(()=>nextSandboxSeason(c),/Renew or replace/);assert.deepEqual(c,before);
});

test('founding recruitment atomically signs and replaces a same-position original before kickoff',()=>{
 const c=founder(),out=c.xi.find(id=>sandboxProfile(id).role==='FWD'),incoming=sandboxMarket(c).find(p=>p.role==='FWD'&&p.rating<86&&legalClub(c,p.worldRegistration,worldPlayer(c,p.id).id)),balance=c.credits;managerCommand(c,{type:'founder-sign',outgoing:out,incoming:incoming.id});validateManagerXI(c);assert.ok(c.xi.includes(incoming.id));assert.ok(!c.xi.concat(c.bench).includes(out));assert.equal(worldPlayer(c,out).owner,'free-agents');assert.equal(c.xi.length+c.bench.length,18);assert.ok(c.credits<balance);assert.equal(c.management.deals.at(-1).stage,'complete');assert.equal(c.management.ledger.at(-1).kind,'release-settlement');
 const snap=structuredClone(c);assert.throws(()=>managerCommand(c,{type:'founder-sign',outgoing:c.xi.find(id=>sandboxProfile(id).role==='GK'),incoming:incoming.id}));assert.deepEqual(c,snap);
});

test('two seasons preserve transfers, loan return, expiry, renewals, exact reload outcomes and physical archives',()=>{
 let c=founder();const loanTarget=sandboxMarket(c).find(p=>p.role==='MID'&&p.rating<85&&worldPlayer(c,p.id).contractEnd>='2027-06-30'&&legalClub(c,p.worldRegistration,worldPlayer(c,p.id).id)),parent=worldPlayer(c,loanTarget.id).owner,parentWage=worldPlayer(c,loanTarget.id).wageGbp;agree(c,loanTarget.id,'loan',1);assert.equal(worldPlayer(c,loanTarget.id).owner,parent);assert.equal(worldPlayer(c,loanTarget.id).registeredClub,'user');
 const renew=c.xi[0];agree(c,renew,'renew',3);assert.equal(worldPlayer(c,renew).contractEnd,'2029-06-30');const expires=c.bench.find(id=>id!==loanTarget.id&&!c.xi.includes(id));worldPlayer(c,expires).contractEnd='2027-06-30';
 prepareSandboxMatchday(c);const user=c.competition.teams[0],away=c.competition.teams[1],def=fixtureDefinition(user,away,271),state=playDefinition(def),record=fixtureResult(def,state);assert.deepEqual(record,fixtureResult(JSON.parse(JSON.stringify(def)),playDefinition(JSON.parse(JSON.stringify(def)))));
 // Use the scheduled physical result so it is archived through the actual commit path.
 const pair=c.competition.schedule[0].find(p=>p.includes('user')),homeTeam=c.competition.teams.find(t=>t.id===pair[0]),awayTeam=c.competition.teams.find(t=>t.id===pair[1]),seed=c.competition.seed+c.competition.schedule[0].findIndex(p=>p===pair)*7919+17,definition=fixtureDefinition(homeTeam,awayTeam,seed),physical=fixtureResult(definition,playDefinition(definition));
 let results=advance(c.competition,{[pair.join('|')+'|'+seed]:physical},{fast:true});applySandboxMatchday(c,results);const after=structuredClone(c);assert.equal(applySandboxMatchday(c,results),false);assert.deepEqual(c,after);
 for(let i=1;i<12;i++)play(c);const fork=JSON.parse(JSON.stringify(c));for(const save of [c,fork])while(!save.competition.champion)play(save);assert.deepEqual(c.competition.results,fork.competition.results);assert.equal(c.competition.results.length,380);assert.equal(c.history.length,38);assert.equal(c.management.archive[0].physicalResults.length,1);
 c=nextSandboxSeason(JSON.parse(JSON.stringify(c)));assert.equal(worldPlayer(c,loanTarget.id).owner,parent);assert.equal(worldPlayer(c,loanTarget.id).registeredClub,parent);assert.equal(worldPlayer(c,loanTarget.id).wageGbp,parentWage);assert.equal(c.condition[loanTarget.id],undefined);assert.equal(worldPlayer(c,expires).owner,'free-agents');assert.ok(!c.xi.concat(c.bench).includes(expires));assert.ok(c.condition[renew].contract>=38);assert.equal(c.world.members.length,20);
 while(!c.competition.champion)play(c);assert.equal(c.competition.results.length,380);assert.equal(c.management.archive.length,2);assert.equal(standings(c.competition).every(t=>t.p===38),true);assert.ok(sandboxFinance(c).forecast>0);assert.equal(validateCareerWorld(c.world,{allowUnknownBirthDates:true}).ready,true);assert.equal(c.management.archive[0].physicalResults[0].definition.seed,seed);
});

test('career library switches separate worlds and refuses to disturb a saved live fixture',()=>{
 const english=createSandboxCareer({clubId:SUPER_PACKS[0].id}),superCareer=founder(),eu={career:english,history:[]};parkCareer(eu);eu.career=superCareer;const first=eu.careerLibrary[0].id;switchCareer(eu,first);assert.deepEqual(eu.career,english);assert.deepEqual(eu.careerLibrary[0].career,superCareer);const saved=JSON.parse(JSON.stringify(eu));saved.pending={context:'career',state:{ticks:73}};const before=structuredClone(saved);assert.throws(()=>switchCareer(saved,saved.careerLibrary[0].id),/live fixture/);assert.deepEqual(saved,before);
});
