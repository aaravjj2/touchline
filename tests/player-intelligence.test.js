import test from 'node:test';
import assert from 'node:assert/strict';
import {ENGLISH_PACKS,ENGLISH_PLAYERS} from '../dist/english-catalog.js';
import {englishCareerStart,englishOppositionField} from '../dist/english-career.js';
import {seedEnglishFinances} from '../dist/english-finances.js';
import {gameFinancialProfile,intelligenceFor,potentialRange,contractApplies,INTELLIGENCE_META} from '../dist/player-intelligence.js';
import {pounds,money,moneyInput,moneyMessage,gbpToUnits,unitsToGbp,wageCharge} from '../dist/manager-money.js';
import {upgradeManager,managerReport,managerCommand} from '../dist/manager-career.js';
import {createCompetition} from '../dist/competition.js';
const named=name=>ENGLISH_PLAYERS.find(p=>p.name===name);
function career(){const start=englishCareerStart({clubId:ENGLISH_PACKS[0].id,}),ids=start.xi.concat(start.bench),c={...start,credits:600,season:1,seed:18,trust:65,manager:'architect',history:[],condition:Object.fromEntries(ids.map(id=>[id,{energy:100,morale:65,growth:0,contract:76}]))};c.competition=createCompetition(englishOppositionField({id:'user',name:c.name,roster:ids.map(id=>named(ENGLISH_PLAYERS.find(p=>p.id===id).name)),xi:c.xi,formation:c.formation},c.setup),{format:'league'});upgradeManager(c);return c;}
test('GBP conversion preserves balances and round-trips whole-pound fees and wages',()=>{
 const c=career(),before=JSON.stringify(c);assert.equal(money(c,600),'£300m');assert.equal(pounds(500000),'£500k');for(const amount of [1,12345,300000,300000000])assert.equal(unitsToGbp(gbpToUnits(amount)),amount);assert.equal(JSON.stringify(c),before);assert.equal(money({},180),'£90m');assert.equal(moneyInput({},46),23000000);const old={message:'The club counters at 46 credits.',credits:180};assert.equal(moneyMessage({},old.message),'The club counters at £23m.');assert.deepEqual(old,{message:'The club counters at 46 credits.',credits:180});assert.equal(wageCharge({},.4,0),1);
});
test('source coverage is explicit and newer club contract records override the old snapshot',()=>{
 assert.ok(INTELLIGENCE_META.coverage.marketValues>=500);assert.equal(INTELLIGENCE_META.snapshot,'2026-07-06');assert.ok(INTELLIGENCE_META.fx.date.startsWith('2026-'));assert.equal(intelligenceFor(named('Erling Haaland')).contract.end,'2034');assert.equal(intelligenceFor(named('Cole Palmer')).contract.end,'2034');assert.equal(intelligenceFor(named('Bukayo Saka')).contract.end,null);assert.equal(intelligenceFor('unknown'),null);
});
test('unknown potential stays unknown and projections never masquerade as published ratings',()=>{
 assert.equal(potentialRange({rating:80,id:'missing'}),null);const young=potentialRange({birthDate:'2008-01-01',rating:80});assert.ok(young.high<=99&&young.low>=80);assert.match(young.status,/Touchline/);assert.equal(potentialRange({birthDate:'2000-99-01',rating:80}),null);assert.equal(contractApplies({club:'Arsenal'},{sourceClub:'Liverpool',contract:{end:'2030-06-30',status:'snapshot-reported'}}),false);
});
test('sourced English finances seed once and leave existing save terms and historical careers intact',()=>{
 const c=career();seedEnglishFinances(c);assert.equal(c.credits,600);assert.equal(c.economy.currency,'GBP');const before=structuredClone(c);seedEnglishFinances(c);assert.deepEqual(c,before);const old=career(),saved=structuredClone(old);money(old,old.credits);assert.deepEqual(old,saved);const historical={...career(),setup:null};seedEnglishFinances(historical);assert.equal(historical.economy,undefined);
});
test('52 weekly wage payments are billed across 38 rounds without rounding to half-million chunks',()=>{
 const c=career();seedEnglishFinances(c);const weekly=gbpToUnits(123456),total=Array.from({length:38},(_,round)=>wageCharge(c,weekly,round)).reduce((a,b)=>a+b,0);assert.equal(unitsToGbp(total),123456*52);assert.equal(wageCharge({},.87,0),1);
});
test('published value and wage seed a buy negotiation and confirmation deducts the fee exactly once',()=>{
 const c=career();seedEnglishFinances(c);const released=c.bench.pop();delete c.condition[released];const player=named('Erling Haaland'),profile=gameFinancialProfile(player),report=managerReport(c,player.id);assert.equal(unitsToGbp(report.fee),profile.feeGbp);assert.equal(unitsToGbp(report.wage),500000);managerCommand(c,{type:'enquire',id:player.id,kind:'buy'});const d=c.management.deals.at(-1);assert.equal(d.referenceFee,report.fee);for(let i=0;i<2;i++)managerCommand(c,{type:'deal-offer',id:d.id,fee:report.fee,wage:report.wage,years:2,role:'starter'});const balance=c.credits;managerCommand(c,{type:'deal-confirm',id:d.id});assert.equal(unitsToGbp(balance-c.credits),profile.feeGbp);const after=structuredClone(c);managerCommand(c,{type:'deal-confirm',id:d.id});assert.deepEqual(c,after);assert.equal(c.condition[player.id].wageBasis,'Negotiated in your save');
});
