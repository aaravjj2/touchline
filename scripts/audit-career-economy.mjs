import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {createSuperCareerPreview} from '../dist/super-career.js';
import {SUPER_PACKS} from '../dist/super-catalog.js';
import {FOUNDING_BUDGETS} from '../dist/club-funding.js';
import {prepareSuperFixture,simulateSuperFixture,commitSuperFixture,settleSuperDate,nextSuperCareerSeason,resolveSuperOffer} from '../dist/super-season.js';
import {managerCommand,managerReport,validateManagerXI} from '../dist/manager-career.js';
import {sandboxProfile,worldPlayer,legalClub} from '../dist/sandbox-world.js';
import {selectPositionTeam} from '../dist/manager-positions.js';
import {careerAvailability} from '../dist/career-availability.js';
import {recruitmentAllowance,transferCoolingDown} from '../dist/career-market.js';
import {validateCareerWorld} from '../dist/manager-world.js';
import {unitsToGbp} from '../dist/manager-money.js';
import {standings} from '../dist/competition.js';
import {fingerprint} from '../dist/fixture-engine.js';

const policies=[
 {id:'tight',feeBudget:20000000,weeklyBudget:60000},
 {id:'ambitious',feeBudget:150000000,weeklyBudget:500000}
];
export function economyCases(){
 const cases=[];
 for(const club of ['Barcelona','Real Madrid','Arsenal'])for(const seed of [20261024,7319])for(const policy of policies)cases.push({id:`${club.toLowerCase().replaceAll(' ','-')}-${seed}-${policy.id}`,club,seed,policy});
 for(const budget of FOUNDING_BUDGETS)cases.push({id:`founder-${budget.units}`,club:'Arsenal',seed:20261024,custom:true,budget:budget.units,policy:policies[1]});
 return cases;
}
const weekly=c=>c.world.players.filter(p=>p.registeredClub==='user').reduce((n,p)=>n+p.wageGbp,0)+c.world.players.filter(p=>p.owner==='user'&&p.loan).reduce((n,p)=>n+Math.max(0,(p.loan.fullWageGbp||0)-p.wageGbp),0);
function decisions(c,log){
 for(const item of c.management.inbox.filter(i=>!i.resolved))managerCommand(c,{type:'resolve',id:item.id,value:'budget'});
 for(const offer of c.connected.offers.filter(o=>o.status==='open'&&o.expires>=c.world.date)){
  const p=worldPlayer(c,offer.player);let accept=false,reason='Retain positional cover or existing promise';
  if(p&&!p.loan&&!c.condition[offer.player]?.promiseReview&&!transferCoolingDown(c,p.id)&&legalClub(c,'user',p.id)){
   const before=structuredClone(c);
   try{
    if(c.xi.includes(offer.player)){
     const pool=c.xi.concat(c.bench).filter(id=>id!==offer.player&&c.condition[id].contract>0&&!careerAvailability(c,id)).map(sandboxProfile);
     const sheet=selectPositionTeam(pool,c.formation);
     managerCommand(c,{type:'lineup',...sheet});
    }
    resolveSuperOffer(c,offer.id,true);accept=true;reason='Offer accepted after selecting eligible replacement and retaining squad cover';
   }catch(error){Object.keys(c).forEach(k=>delete c[k]);Object.assign(c,before);reason=error.message;}
  }
  if(!accept)resolveSuperOffer(c,offer.id,false);
  log.push({date:c.world.date,id:offer.id,player:offer.player,feeGbp:offer.fee,accepted:accept,reason});
 }
 for(const id of c.xi.concat(c.bench).filter(id=>c.condition[id].contract<8&&!worldPlayer(c,id).loan)){
  if(c.management.deals.some(d=>d.player===id&&!['complete','expired','withdrawn','declined'].includes(d.stage)))continue;
  const report=managerReport(c,id),wage=weekly(c)-worldPlayer(c,id).wageGbp+unitsToGbp(report.wage),fee=unitsToGbp(Math.max(.05,report.wage*4)),cash=unitsToGbp(c.credits)-fee,user=c.world.clubs.find(t=>t.id==='user');
  if(cash<wage*26||cash+user.annualReceiptsGbp<wage*52)continue;
  managerCommand(c,{type:'enquire',id,kind:'renew'});const deal=c.management.deals.at(-1),terms={type:'deal-offer',id:deal.id,fee:deal.fee,wage:deal.referenceWage,years:2,role:'rotation'};
  managerCommand(c,terms);managerCommand(c,terms);managerCommand(c,{type:'deal-confirm',id:deal.id});assert.equal(deal.stage,'complete');
 }
}
function finish(c,{checkpoint=false}={}){
 const opening=unitsToGbp(c.credits),ledgerStart=c.management.ledger.length,offers=[],windows=[];let midpoint=null,lowestCash=opening,idempotentDates=0,idempotentFixtures=0;
 while(!c.connected.completed){
  decisions(c,offers);const fixture=c.connected.calendar.fixtures.find(f=>f.status==='scheduled');assert.ok(fixture);
  if(c.connected.financeDate!==fixture.date){
   settleSuperDate(c,fixture.date);const settled=structuredClone(c);settleSuperDate(c,fixture.date);assert.deepEqual(c,settled,'Repeated date must not charge wages or recover twice');idempotentDates++;
   const a=recruitmentAllowance(c);if(a.open){assert.ok(a.spent<=a.feeLimit);assert.ok(a.weekly<=a.weeklyLimit);windows.push({date:c.world.date,...a});}
   lowestCash=Math.min(lowestCash,unitsToGbp(c.credits));assert.ok(c.world.clubs.every(t=>t.funds>=0),'World cash must stay nonnegative');
   decisions(c,offers);
  }
  if(fixture.home==='user'||fixture.away==='user'){
   try{managerCommand(c,{type:'auto',value:'rotation',formation:c.formation});}catch(error){if(!error.message.includes('complete XI'))throw error;}
  }
  prepareSuperFixture(c,fixture);const result=simulateSuperFixture(c,fixture);commitSuperFixture(c,fixture.id,result);
  if(c.competition.round===19&&!midpoint){const committed=structuredClone(c);assert.equal(commitSuperFixture(c,fixture.id,result),false);assert.deepEqual(c,committed,'Repeated fixture must not pay or change anything');idempotentFixtures++;if(checkpoint)midpoint=structuredClone(c);else midpoint=true;}
 }
 decisions(c,offers);
 const ledger=c.management.ledger.slice(ledgerStart),delta=ledger.reduce((sum,row)=>sum+unitsToGbp(row.amount),0);
 assert.ok(Math.abs(unitsToGbp(c.credits)-opening-delta)<.01,'All user cash changes must reconcile to the management ledger');
 assert.equal(c.world.clubs.find(t=>t.id==='user').funds,unitsToGbp(c.credits));
 assert.equal(c.connected.calendar.fixtures.filter(f=>f.competition==='league'&&f.status==='complete').length,380);
 assert.equal(c.connected.calendar.fixtures.filter(f=>f.competition==='cup'&&f.status==='complete').length,19);
 assert.ok(validateCareerWorld(c.world,{allowUnknownBirthDates:true}).ready);validateManagerXI(c,c.xi,c.formation,{ignoreAvailability:true});
 for(const team of c.competition.teams)assert.ok(legalClub(c,team.id),team.name+' retains a legal XI and cover');
 const table=standings(c.competition);assert.ok(table.every(t=>t.p===38));
 return {midpoint,report:{season:c.season,rank:table.findIndex(t=>t.id==='user')+1,openingCashGbp:opening,closingCashGbp:unitsToGbp(c.credits),lowestCashGbp:lowestCash,weeklyWagesGbp:weekly(c),annualReceiptsGbp:c.world.clubs.find(t=>t.id==='user').annualReceiptsGbp,wageToReceiptsRatio:weekly(c)*52/c.world.clubs.find(t=>t.id==='user').annualReceiptsGbp,squad:c.xi.length+c.bench.length,leagueFixtures:380,cupFixtures:19,idempotentDates,idempotentFixtures,offers,windows,ledger,finalFingerprint:fingerprint(c)}};
}
export async function auditEconomy(root,cases=economyCases()){
 root=resolve(root);await mkdir(root);const reports=[];let current=null;
 try{
  for(const config of cases){
   const pack=SUPER_PACKS.find(p=>p.club===config.club);current=createSuperCareerPreview({clubId:pack.id,seed:config.seed,custom:config.custom,budget:config.budget,name:config.custom?'Economy Athletic':undefined});
   managerCommand(current,{type:'recruitment-policy',enabled:true,feeBudget:config.policy.feeBudget,weeklyBudget:config.policy.weeklyBudget});
   const seasons=[];
   for(let season=0;season<2;season++){
    const {midpoint,report}=finish(current,{checkpoint:true});assert.ok(midpoint);const restored=JSON.parse(JSON.stringify(midpoint));finish(restored);assert.deepEqual(restored,current,'Full final state must survive a midseason JSON reload');report.exactReload=true;seasons.push(report);
    console.log(JSON.stringify({case:config.id,season:report.season,rank:report.rank,cash:report.closingCashGbp,sales:report.offers.filter(o=>o.accepted).length}));
    if(season===0)current=nextSuperCareerSeason(current);
   }
   const transfers=current.world.agreements.filter(a=>a.status==='complete').map(a=>({...a,playerName:sandboxProfile(current.world.players.find(p=>p.id===a.terms.player)?.profileId)?.name}));
   reports.push({config,seasons,transfers});await writeFile(join(root,config.id+'.json'),JSON.stringify(reports.at(-1),null,2)+'\n');
  }
  const seasons=reports.flatMap(r=>r.seasons),summary={status:'pass',worlds:reports.length,seasons:seasons.length,fixtures:seasons.length*399,leagueFixtures:seasons.length*380,cupFixtures:seasons.length*19,exactMidpointReloads:seasons.length,acceptedSales:seasons.reduce((n,s)=>n+s.offers.filter(o=>o.accepted).length,0),cashRangeGbp:[Math.min(...seasons.map(s=>s.closingCashGbp)),Math.max(...seasons.map(s=>s.closingCashGbp))],lowestObservedUserCashGbp:Math.min(...seasons.map(s=>s.lowestCashGbp)),wageToReceiptsRange:[Math.min(...seasons.map(s=>s.wageToReceiptsRatio)),Math.max(...seasons.map(s=>s.wageToReceiptsRatio))],idempotentDateRetries:seasons.reduce((n,s)=>n+s.idempotentDates,0),idempotentFixtureRetries:seasons.reduce((n,s)=>n+s.idempotentFixtures,0),rulesVersion:4,statisticsVersion:3,scope:'Independent October sandbox worlds. Two seasons each, auto rotation, affordable renewal, accept incoming offers only after legal replacement and retained cover. No injected scores, cash, registrations or source claims. All fixtures use fast-career-4; this is integrity/calibration evidence, not human game-feel or physical-renderer proof.'};
  await writeFile(join(root,'summary.json'),JSON.stringify(summary,null,2)+'\n');return summary;
 }catch(error){if(current)await writeFile(join(root,'failure-career.json'),JSON.stringify(current));await writeFile(join(root,'failure.txt'),error.stack+'\n');throw error;}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
 const root=process.argv[2];if(!root)throw Error('Usage: node scripts/audit-career-economy.mjs NEW_DIRECTORY [--case CASE_ID]');const id=process.argv.indexOf('--case'),cases=id<0?economyCases():economyCases().filter(c=>c.id===process.argv[id+1]);assert.ok(cases.length,'Unknown case');console.log(JSON.stringify(await auditEconomy(root,cases),null,2));
}
