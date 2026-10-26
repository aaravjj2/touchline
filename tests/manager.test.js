import test from 'node:test';
import assert from 'node:assert/strict';
import {PACKS,LEGENDS,legend} from '../dist/legends.js';
import {selectSquad,balancedBench,oppositionField} from '../dist/europe-clubs.js';
import {FORMATIONS} from '../dist/engine.js';
import {createCompetition,advance} from '../dist/competition.js';
import {fixtureDefinition,fixtureState,fixtureFingerprint} from '../dist/fixture-engine.js';
import {upgradeManager,managerOwned,managerCommand,validateManagerXI,managerAvailable,managerBeforeFixture,managerAfterFixture,managerNextSeason,managerProfile} from '../dist/manager-career.js';
import {renderManagerCareer} from '../dist/manager-ui.js';
import {validateManagerDataset} from '../dist/manager-datasets.js';
import {readFile} from 'node:fs/promises';
function career(){const s=selectSquad(PACKS[0]),bench=balancedBench(s.xi),ids=s.xi.concat(bench),user={id:'user',name:'Manager QA',rating:92,attack:88,defense:86,formation:s.formation,xi:s.xi,roster:ids.map(legend)};return upgradeManager({version:1,season:1,name:'Manager QA',seed:42,credits:180,trust:65,training:'balanced',manager:'architect',formation:s.formation,xi:s.xi,bench,condition:Object.fromEntries(ids.map(id=>[id,{energy:100,morale:65,growth:0,contract:76}])),history:[],competition:createCompetition(oppositionField(user,{format:'league'}),{seed:42,format:'league'})});}
const target=c=>LEGENDS.find(p=>!managerOwned(c).some(id=>legend(id).personId===p.personId));
function agree(c,p,kind='buy'){managerCommand(c,{type:'enquire',id:p.id,kind});let d=c.management.deals.at(-1);const offer={type:'deal-offer',id:d.id,fee:d.fee,wage:d.wage,years:kind==='loan'?1:2,role:'rotation'};managerCommand(c,offer);if(c.management.deals.at(-1).stage==='contract')managerCommand(c,offer);return c.management.deals.at(-1).id;}
test('manager upgrade and seven formations preserve identity, validate slots and recover sheets',()=>{
 const c=career(),baseline=structuredClone(LEGENDS);for(const formation of Object.keys(FORMATIONS)){managerCommand(c,{type:'auto',formation,value:'strongest'});assert.equal(c.formation,formation);assert.equal(validateManagerXI(c),true);}managerCommand(c,{type:'sheet-save',id:'2'});const saved=[...c.xi];managerCommand(c,{type:'auto',formation:'4-3-3',value:'rotation'});managerCommand(c,{type:'sheet-load',id:'2'});assert.deepEqual(c.xi,saved);const before=structuredClone(c);assert.throws(()=>managerCommand(c,{type:'lineup',formation:c.formation,xi:Array(11).fill(c.xi[0])}));assert.deepEqual(c,before);assert.deepEqual(LEGENDS,baseline);
});
test('club counters survive recovery; contract negotiation cannot rewrite an agreed fee; commit is once-only',()=>{
 let c=career(),p=target(c);managerCommand(c,{type:'enquire',id:p.id,kind:'buy'});let d=c.management.deals.at(-1);managerCommand(c,{type:'deal-offer',id:d.id,fee:1,wage:d.wage,years:2,role:'starter'});assert.equal(c.management.deals[0].attempts,1);c=JSON.parse(JSON.stringify(c));d=c.management.deals[0];managerCommand(c,{type:'deal-offer',id:d.id,fee:d.fee,wage:d.wage,years:2,role:'starter'});const agreed=d.fee;managerCommand(c,{type:'deal-offer',id:d.id,fee:0,wage:d.wage,years:2,role:'starter'});assert.equal(d.fee,agreed);managerCommand(c,{type:'deal-confirm',id:d.id});assert.ok(c.bench.includes(p.id));assert.equal(c.credits,180-agreed);const committed=structuredClone(c);managerCommand(c,{type:'deal-confirm',id:d.id});assert.deepEqual(c,committed);
});
test('pending arrivals reserve funds, can be withdrawn, and register only at a window',()=>{
 const c=career();c.competition.round=8;const p=target(c),id=agree(c,p);managerCommand(c,{type:'deal-confirm',id});assert.equal(c.management.deals[0].stage,'pending');assert.equal(c.credits,180);assert.ok(managerAvailable(c)<180);assert.ok(!c.bench.includes(p.id));c.competition.round=19;managerBeforeFixture(c);assert.equal(c.management.deals[0].stage,'complete');assert.ok(c.bench.includes(p.id));c.competition.round=24;const next=target(c),other=agree(c,next);managerCommand(c,{type:'deal-confirm',id:other});managerCommand(c,{type:'deal-withdraw',id:other});assert.equal(managerAvailable(c),c.credits);
});
test('insufficient funds, withdrawn talks, active-player sales and stale sheets are rejected atomically',()=>{
 const c=career(),id=agree(c,target(c));c.credits=0;const before=structuredClone(c);assert.throws(()=>managerCommand(c,{type:'deal-confirm',id}),/funds/);assert.deepEqual(c,before);managerCommand(c,{type:'deal-withdraw',id});assert.throws(()=>managerCommand(c,{type:'deal-confirm',id}));assert.throws(()=>managerCommand(c,{type:'enquire',id:c.xi[0],kind:'sell'}),/bench/);assert.throws(()=>managerCommand(c,{type:'sheet-load',id:0}),/Save/);
});
test('negotiated sale and renewal update contracts, wages and the financial ledger once',()=>{
 const c=career(),player=c.bench.at(-1),sale=agree(c,legend(player),'sell');managerCommand(c,{type:'deal-confirm',id:sale});assert.ok(!managerOwned(c).includes(player));assert.ok(c.credits>180);const id=agree(c,legend(c.xi[0]),'renew');managerCommand(c,{type:'deal-confirm',id});assert.equal(c.condition[c.xi[0]].contract,76);assert.equal(c.management.ledger.length,2);assert.ok(Math.abs(c.management.openingBalance+c.management.ledger.reduce((n,e)=>n+e.amount,0)-c.credits)<.001);
});
test('loan wages use the agreed share and the loan returns at the next season',()=>{
 const c=career(),p=target(c),id=agree(c,p,'loan');managerCommand(c,{type:'deal-confirm',id});assert.equal(c.condition[p.id].wage,c.management.deals[0].wage*.5);assert.equal(c.condition[p.id].loan.returnSeason,2);c.season=2;managerNextSeason(c);assert.ok(!managerOwned(c).includes(p.id));assert.equal(c.condition[p.id],undefined);
});
test('readiness remains bounded, individual development affects execution, and a fixture processes once',()=>{
 const c=career(),id=c.xi[0];c.condition[id].morale=100;c.condition[id].form=20;const base=legend(id),profile=managerProfile(c,base);assert.ok(profile.attack<=base.attack+3);c.condition[id].focus='defense';const fresh=advance(c.competition,{}, {fast:true}),m=fresh.find(x=>x.home==='user'||x.away==='user');managerAfterFixture(c,m);assert.ok(c.condition[id].specialGrowth.defense>0);const after=structuredClone(c);managerAfterFixture(c,m);assert.deepEqual(c,after);
});
test('saved build-up and responsibilities initialize the physical world and change replay identity',()=>{
 const c=career();managerCommand(c,{type:'tactics',preset:'press',build:'short',roles:{1:'hold',10:'attack'}});const home={...c.competition.teams[0],preset:'press',managerTactics:{build:c.management.build,roles:c.management.roles}},away=c.competition.teams[1],def=fixtureDefinition(home,away,77),s=fixtureState(def);assert.equal(s.preset,'press');assert.equal(s.buildUps[0],'short');assert.equal(s.roles[0][1],'hold');assert.notEqual(fixtureFingerprint(def),fixtureFingerprint({...def,initialTactics:[{build:'direct',roles:{}},{}]}));assert.ok(renderManagerCareer(c).includes('Club management'));
});
test('two full seasons keep archived reviews and honours with separate result identities',()=>{
 const c=career();for(let season=1;season<=2;season++){while(!c.competition.champion){const results=advance(c.competition,{}, {fast:true});managerAfterFixture(c,results.find(x=>x.home==='user'||x.away==='user'));}assert.equal(c.management.archive.length,season);if(season===1){c.season++;managerNextSeason(c);c.competition=createCompetition(c.competition.teams,{seed:999,format:'league'});}}assert.ok(c.management.archive.every(s=>Number.isInteger(s.rank)));assert.equal(c.competition.results.length,380);
});
test('official England candidate remains locked for missing birth dates and positional coverage',async()=>{
 const data=JSON.parse(await readFile(new URL('../data/manager/england-2026-candidate.json',import.meta.url),'utf8')),report=validateManagerDataset(data);assert.equal(report.clubs,20);assert.equal(report.ready,false);assert.ok(report.errors.some(e=>e.includes('birth date')));assert.ok(report.errors.some(e=>e.includes('squad cover')));assert.equal(validateManagerDataset({...data,clubs:data.clubs.slice(0,19)}).ready,false);
});
test('manual match bench is validated and passed to physical fixture snapshots',()=>{
 const c=career(),ids=c.bench.slice(0,3);managerCommand(c,{type:'bench',ids});const before=structuredClone(c);assert.throws(()=>managerCommand(c,{type:'bench',ids:[c.xi[0]]}));assert.deepEqual(c,before);const home={...c.competition.teams[0],matchBench:c.management.matchBench};const definition=fixtureDefinition(home,c.competition.teams[1],39);assert.deepEqual(definition.reserves[0].map(p=>p.id),ids);assert.ok(definition.reserves[0].every(p=>Number.isFinite(p.pace)));
});

test('expired starter has a named recovery route and cannot advance or change the saved calendar',()=>{
 const c=career();c.condition[c.xi[1]].contract=0;const before=structuredClone(c);
 assert.throws(()=>managerBeforeFixture(c),/Renew expired starter contracts in Club/);assert.deepEqual(c,before);
 assert.ok(renderManagerCareer(c).includes('Resolve expired contracts'));
});
