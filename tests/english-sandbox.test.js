import test from 'node:test';
import assert from 'node:assert/strict';
import {ENGLISH_PACKS,ENGLISH_PLAYERS} from '../dist/english-catalog.js';
import {englishCareerStart,englishOppositionField} from '../dist/english-career.js';
import {legend} from '../dist/legends.js';
import {fixtureDefinition,playDefinition} from '../dist/fixture-engine.js';
import {createCompetition,standings,simulateRemainingLeague} from '../dist/competition.js';
import {FOUNDING_PLAYERS} from '../dist/founding-squad.js';
import {DEFAULT_FOUNDING_BUDGET,FOUNDING_BUDGETS,FUNDING_BENCHMARK} from '../dist/club-funding.js';
import {upgradeManager,validateManagerXI} from '../dist/manager-career.js';
import {seedEnglishFinances} from '../dist/english-finances.js';
import {unitsToGbp} from '../dist/manager-money.js';

test('all twenty English snapshot clubs have eligible starting XIs and distinct registered player identities',()=>{
 assert.equal(ENGLISH_PACKS.length,20);assert.equal(new Set(ENGLISH_PLAYERS.map(p=>p.id)).size,ENGLISH_PLAYERS.length);
 for(const pack of ENGLISH_PACKS){const start=englishCareerStart({clubId:pack.id});assert.equal(start.name,pack.club);assert.equal(start.xi.length,11);assert.ok(start.xi.every(id=>legend(id)));const teams=englishOppositionField({id:'user',name:start.name,formation:start.formation,xi:start.xi,roster:pack.players},start.setup);assert.equal(teams.length,20);assert.equal(new Set(teams.map(t=>t.name)).size,20);assert.doesNotThrow(()=>fixtureDefinition(teams[0],teams[1],418));assert.equal(teams.flatMap(t=>t.roster).filter(p=>p.registrationStatus==='loan-out').length,0);}
});
test('created club replaces exactly one league place and preserves its budget and colour across serialization',()=>{
 const before=JSON.stringify(ENGLISH_PACKS),start=englishCareerStart({clubId:ENGLISH_PACKS[8].id,custom:true,name:'Borough Athletic',color:'#8844bb'}),copy=JSON.parse(JSON.stringify(start)),pack=ENGLISH_PACKS[8];
 assert.equal(copy.credits,1500);assert.equal(copy.setup.startingBudget,1500);assert.equal(copy.setup.squadOrigin,'original-founding');assert.equal(copy.xi.length+copy.bench.length,18);assert.ok(copy.xi.concat(copy.bench).every(id=>id.startsWith('founder-')));
 const user={id:'user',name:copy.name,formation:copy.formation,xi:copy.xi,roster:copy.xi.concat(copy.bench).map(legend)},teams=englishOppositionField(user,copy.setup);assert.equal(teams[0].color,'#8844bb');assert.ok(!teams.some(t=>t.name===pack.club));assert.ok(!teams.flatMap(t=>t.roster).some(p=>pack.players.some(q=>q.personId===p.personId)));assert.equal(new Set(teams.flatMap(t=>t.roster).map(p=>p.personId)).size,ENGLISH_PLAYERS.length-pack.players.length+18);const league=createCompetition(teams,{format:'league',seed:72});simulateRemainingLeague(league);assert.equal(league.results.length,380);assert.equal(standings(league).find(t=>t.id==='user').p,38);assert.equal(JSON.stringify(ENGLISH_PACKS),before);
});
test('custom setup rejects invalid clubs, names, colour injection and unsupported budgets',()=>{
 const valid={clubId:ENGLISH_PACKS[0].id,custom:true,name:'Borough Athletic',color:'#123456',budget:1500};for(const bad of [{clubId:'missing'},{name:'<script>'},{name:'Arsenal'},{name:'x'},{color:'red;bad'},{budget:-1},{budget:600}])assert.throws(()=>englishCareerStart({...valid,...bad}));
});

test('new-save funding separates existing squads from founding cash and supports every preset',()=>{
 assert.equal(unitsToGbp(DEFAULT_FOUNDING_BUDGET),750000000);assert.equal(FUNDING_BENCHMARK.clubs,20);assert.ok(Math.abs(FUNDING_BENCHMARK.meanEurMillion*FUNDING_BENCHMARK.gbpPerEur-563.1472532)<.0001);
 for(const p of ENGLISH_PACKS){const c=englishCareerStart({clubId:p.id});assert.ok(unitsToGbp(c.credits)>=25000000&&unitsToGbp(c.credits)<=100000000);assert.ok(c.xi.every(id=>p.players.some(p=>p.id===id)));}
 for(const preset of FOUNDING_BUDGETS)assert.equal(englishCareerStart({clubId:ENGLISH_PACKS[0].id,custom:true,name:'Borough Athletic',budget:preset.units}).credits,preset.units);
});

test('founding starter squad is eligible, affordable to maintain and survives physical fixture replay',()=>{
 const start=englishCareerStart({clubId:ENGLISH_PACKS[0].id,custom:true,name:'Borough Athletic'}),ids=start.xi.concat(start.bench),c={...start,seed:812,season:1,manager:'architect',history:[],condition:Object.fromEntries(ids.map(id=>[id,{energy:100,morale:65,growth:0,contract:76}]))};upgradeManager(c);seedEnglishFinances(c);validateManagerXI(c);
 const weekly=ids.reduce((n,id)=>n+c.condition[id].wage,0);assert.ok(unitsToGbp(weekly*52)<12000000);assert.ok(ids.every(id=>c.condition[id].wageBasis==='Touchline wage estimate'));assert.equal(FOUNDING_PLAYERS.length,18);
 const teams=englishOppositionField({id:'user',name:c.name,formation:c.formation,xi:c.xi,roster:ids.map(legend)},c.setup),definition=fixtureDefinition(teams[0],teams[1],812),first=playDefinition(definition),second=playDefinition(JSON.parse(JSON.stringify(definition)));assert.deepEqual(first,second);assert.equal(definition.home.roster.length,18);
 const saved=JSON.parse(JSON.stringify(c));seedEnglishFinances(saved);assert.deepEqual(saved,c);
});
