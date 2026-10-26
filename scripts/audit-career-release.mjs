import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {createSuperCareerPreview} from '../dist/super-career.js';
import {SUPER_PACKS} from '../dist/super-catalog.js';
import {settleSuperDate,prepareSuperFixture,simulateSuperFixture,commitSuperFixture,nextSuperCareerSeason,resolveSuperOffer} from '../dist/super-season.js';
import {managerCommand,validateManagerXI} from '../dist/manager-career.js';
import {legalClub,worldPlayer} from '../dist/sandbox-world.js';
import {careerStatistics} from '../dist/career-statistics.js';
import {daysBetween} from '../dist/manager-calendar.js';
const output='work/career310/season-matrix.json',cases=[['Barcelona',20261022,false],['Real Madrid',20261023,false],['Arsenal',20261024,false],['Arsenal',3501,true]],reports=[];
await mkdir('work/career310',{recursive:true});
function decisions(c){for(const item of c.management.inbox.filter(i=>!i.resolved))managerCommand(c,{type:'resolve',id:item.id,value:'budget'});for(const o of c.connected.offers.filter(o=>o.status==='open'&&o.expires>=c.world.date))resolveSuperOffer(c,o.id,false);}
function renew(c){
 for(const id of c.xi.concat(c.bench).filter(id=>c.condition[id].contract<8&&!worldPlayer(c,id).loan)){
  if(c.management.deals.some(d=>d.player===id&&!['complete','expired','withdrawn','declined'].includes(d.stage)))continue;
  managerCommand(c,{type:'enquire',id,kind:'renew'});const d=c.management.deals.at(-1),command={type:'deal-offer',id:d.id,fee:d.fee,wage:d.referenceWage,years:2,role:'rotation'};managerCommand(c,command);managerCommand(c,command);managerCommand(c,{type:'deal-confirm',id:d.id});
 }
}
for(const [club,seed,custom]of cases){
 let c=createSuperCareerPreview({clubId:SUPER_PACKS.find(p=>p.club===club).id,seed,custom,name:custom?'Matrix Athletic':undefined});managerCommand(c,{type:'recruitment-policy',enabled:true,feeBudget:50000000,weeklyBudget:150000});
 const seasons=[];
 for(let n=0;n<3;n++){
  while(!c.connected.completed){decisions(c);const f=c.connected.calendar.fixtures.find(f=>f.status==='scheduled');settleSuperDate(c,f.date);decisions(c);renew(c);if(f.home==='user'||f.away==='user')managerCommand(c,{type:'auto',value:'rotation',formation:c.formation});prepareSuperFixture(c,f);commitSuperFixture(c,f.id,simulateSuperFixture(c,f));}
  assert.equal(c.competition.results.length,380);assert.equal(c.connected.cup.results.length,19);validateManagerXI(c);
  for(const team of c.competition.teams)assert.ok(legalClub(c,team.id),team.name);
  for(const competition of ['league','cup']){const stats=careerStatistics(c,{competition});assert.equal(stats.missing,0);const fixtures=c.connected.calendar.fixtures.filter(f=>f.competition===competition);assert.equal(stats.players.reduce((n,p)=>n+p.goals,0),fixtures.reduce((n,f)=>n+f.result.score[0]+f.result.score[1],0));assert.equal(stats.players.reduce((n,p)=>n+p.minutes,0),fixtures.length*1980);}
  for(const person of c.world.players){const moves=c.world.agreements.filter(a=>a.status==='complete'&&a.terms.kind==='transfer'&&a.terms.player===person.id);for(let i=1;i<moves.length;i++)assert.ok(daysBetween(moves[i-1].registered,moves[i].registered)>=180);}
  const row={season:c.season,league:380,cup:19,cashGbp:Math.round(c.credits*500000),lowestWorldCashGbp:Math.min(...c.world.clubs.filter(t=>t.id!=='free-agents').map(t=>t.funds)),dealsToDate:c.world.agreements.length,renewalsToDate:c.management.deals.filter(d=>d.kind==='renew'&&d.stage==='complete').length};seasons.push(row);console.log(JSON.stringify({club:c.name,seed,...row}));
  if(n<2){decisions(c);renew(c);c=nextSuperCareerSeason(c);assert.equal(c.connected.weeklyReports.length,0);assert.equal(c.management.market.delegation.enabled,true);}
 }
 reports.push({club:c.name,seed,seasons});await writeFile(output,JSON.stringify({policy:'Balanced training/tactics; fitness rotation; manual prospect-role responses; reject sales; delegate £50m / £150k per window; negotiate expiring contracts through ordinary commands',reports},null,2)+'\n');
}
