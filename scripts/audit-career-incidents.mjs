import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {createSuperCareerPreview} from '../dist/super-career.js';
import {SUPER_PACKS} from '../dist/super-catalog.js';
import {prepareSuperFixture,simulateSuperFixture,commitSuperFixture,nextSuperCareerSeason,resolveSuperOffer,settleSuperDate} from '../dist/super-season.js';
import {managerCommand,validateManagerXI} from '../dist/manager-career.js';
import {sandboxMarket,worldPlayer,legalClub} from '../dist/sandbox-world.js';
import {fixtureDefinition,playDefinition,fixtureResult} from '../dist/fixture-engine.js';
import {incidentTimeline} from '../dist/match-incidents.js';
import {careerStatistics} from '../dist/career-statistics.js';
import {unitsToGbp} from '../dist/manager-money.js';
import {daysBetween} from '../dist/manager-calendar.js';
const root='work/release312',reports=[],cases=[['Barcelona',20261022,false],['Real Madrid',20261023,false],['Arsenal',20261024,false],['Arsenal',3501,true]];await mkdir(root,{recursive:true});
function decisions(c){for(const m of c.management.inbox.filter(m=>!m.resolved))managerCommand(c,{type:'resolve',id:m.id,value:'budget'});for(const o of c.connected.offers.filter(o=>o.status==='open'&&o.expires>=c.world.date))resolveSuperOffer(c,o.id,false);}
function renew(c){for(const id of c.xi.concat(c.bench).filter(id=>c.condition[id].contract<8&&!worldPlayer(c,id).loan)){if(c.management.deals.some(d=>d.player===id&&!['complete','expired','withdrawn','declined'].includes(d.stage)))continue;agree(c,id,'renew');}}
function agree(c,id,kind){managerCommand(c,{type:'enquire',id,kind});const d=c.management.deals.at(-1),offer={type:'deal-offer',id:d.id,fee:d.fee,wage:d.referenceWage,share:50,years:kind==='loan'?1:2,role:'rotation'};managerCommand(c,offer);managerCommand(c,offer);managerCommand(c,{type:'deal-confirm',id:d.id});assert.equal(d.stage,'complete');return d;}
function finish(c,{physical=false,checkpoint=false}={}){
 let midpoint=null;
 while(!c.connected.completed){decisions(c);const f=c.connected.calendar.fixtures.find(f=>f.status==='scheduled');assert.ok(f);settleSuperDate(c,f.date);decisions(c);renew(c);const mine=f.home==='user'||f.away==='user';if(mine)try{managerCommand(c,{type:'auto',value:'rotation',formation:c.formation});}catch(error){if(!error.message.includes('complete XI'))throw error;}
  prepareSuperFixture(c,f);let result;if(physical&&mine&&!c.history.length){const teams=[f.home,f.away].map(id=>c.competition.teams.find(t=>t.id===id)),def=fixtureDefinition(...teams,f.seed);result=fixtureResult(def,playDefinition(def),f.decisive);}else result=simulateSuperFixture(c,f);commitSuperFixture(c,f.id,result);
  if(checkpoint&&!midpoint&&c.competition.round>=19)midpoint=structuredClone(c);
 }
 decisions(c);return midpoint;
}
for(const delegated of [false,true])for(const [club,seed,custom]of cases){
 let c=createSuperCareerPreview({clubId:SUPER_PACKS.find(p=>p.club===club).id,seed,custom,name:custom?'Incident Athletic':undefined});assert.equal(c.matchRulesVersion,4);if(delegated)managerCommand(c,{type:'recruitment-policy',enabled:true,feeBudget:50000000,weeklyBudget:150000});
 const target=sandboxMarket(c).find(p=>p.role==='MID'&&p.rating<85&&!p.onLoan&&worldPlayer(c,p.id).contractEnd>='2027-06-30'&&legalClub(c,p.worldRegistration,worldPlayer(c,p.id).id));assert.ok(target);const parent=worldPlayer(c,target.id).owner;agree(c,target.id,'loan');const seasons=[];
 for(let season=0;season<2;season++){
  const midpoint=finish(c,{physical:season===0,checkpoint:true});assert.ok(midpoint);const restored=JSON.parse(JSON.stringify(midpoint));finish(restored);assert.deepEqual(restored,c,'Exact incident-aware midpoint reload');
  const fixtures=c.connected.calendar.fixtures;assert.equal(fixtures.filter(f=>f.competition==='league').length,380);assert.equal(fixtures.filter(f=>f.competition==='cup').length,19);assert.ok(fixtures.every(f=>f.status==='complete'));validateManagerXI(c,c.xi,c.formation,{ignoreAvailability:true});
  for(const comp of ['league','cup']){const selected=fixtures.filter(f=>f.competition===comp),stats=careerStatistics(c,{competition:comp}),minutes=selected.reduce((sum,f)=>{const strength=incidentTimeline(f.result.incidentMatch).strength;return sum+strength.reduce((n,s,i)=>n+((strength[i+1]?.minute??90)-s.minute)*(s.players[0]+s.players[1]),0);},0);assert.ok(Math.abs(stats.players.reduce((n,p)=>n+p.minutes,0)-minutes)<1e-6);assert.equal(stats.missing,0);const ownGoals=selected.reduce((n,f)=>n+f.result.incidentMatch.incidents.filter(e=>e.type==='own-goal').length,0);assert.equal(stats.players.reduce((n,p)=>n+p.goals,0)+ownGoals,selected.reduce((n,f)=>n+f.result.score[0]+f.result.score[1],0));}
  for(const p of c.world.players){const moves=c.world.agreements.filter(a=>a.status==='complete'&&a.terms.kind==='transfer'&&a.terms.player===p.id);for(let i=1;i<moves.length;i++)assert.ok(daysBetween(moves[i-1].registered,moves[i].registered)>=180);}
  assert.ok(c.world.clubs.every(t=>t.funds>=0));for(const t of c.competition.teams)assert.ok(legalClub(c,t.id));
  const incidents=fixtures.flatMap(f=>f.result.incidentMatch.incidents),table=c.competition.teams.map(t=>({id:t.id,p:c.competition.results.filter(r=>r.home===t.id||r.away===t.id).length}));assert.ok(table.every(t=>t.p===38));const mine=fixtures.filter(f=>f.home==='user'||f.away==='user'),user=c.world.clubs.find(t=>t.id==='user'),wages=c.world.players.filter(p=>p.registeredClub==='user').reduce((n,p)=>n+p.wageGbp,0),transactions=c.world.agreements.filter(a=>a.status==='complete'&&a.registered>=`${2025+c.season}-08-01`),row={season:c.season,fixtures:399,closingCashGbp:unitsToGbp(c.credits),lowestWorldCashGbp:Math.min(...c.world.clubs.filter(t=>t.id!=='free-agents').map(t=>t.funds)),weeklyWagesGbp:wages,authoredAnnualReceiptsGbp:user.annualReceiptsGbp,wageToReceiptsRatio:wages*52/user.annualReceiptsGbp,userPurchases:transactions.filter(a=>a.terms.to==='user'&&a.terms.kind==='transfer').length,feesPaidGbp:transactions.filter(a=>a.terms.to==='user').reduce((n,a)=>n+a.terms.fee,0),yellowCards:incidents.filter(e=>['yellow','second-yellow'].includes(e.type)).length,redCards:incidents.filter(e=>['red','second-yellow'].includes(e.type)).length,injuries:incidents.filter(e=>e.type==='injury').length,shortStartingSides:fixtures.reduce((n,f)=>n+f.result.incidentMatch.teams.filter(t=>t.players.length<11).length,0),physicalFixtures:fixtures.filter(f=>f.result.definition).length,userFixtures:mine.length,exactReload:true};seasons.push(row);console.log(JSON.stringify({club:c.name,delegated,...row}));
  if(season===0){renew(c);c=nextSuperCareerSeason(c);assert.equal(worldPlayer(c,target.id).loan,undefined);assert.equal(worldPlayer(c,target.id).owner,parent);assert.ok(!c.xi.concat(c.bench).includes(target.id));}
 }
 reports.push({club:c.name,seed,delegated,loanPlayer:target.id,seasons});await writeFile(root+'/integrated-policy-matrix.json',JSON.stringify({rules:4,statistics:3,policies:['manual purchases','delegate £50m / £150k per window'],scope:'Two seasons per world; one loan and return; affordable contract renewals; reject sales; prospect-role responses; natural-position rotation; first user fixture physical; exact midpoint reload each season. No injected cash, scores or registrations.',reports},null,2)+'\n');
}
