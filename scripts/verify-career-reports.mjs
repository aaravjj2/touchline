import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {join} from 'node:path';
import {parse} from 'csv-parse/sync';
import {fingerprint} from '../dist/fixture-engine.js';
import {standings} from '../dist/competition.js';
import {legalClub} from '../dist/sandbox-world.js';
import {unitsToGbp} from '../dist/manager-money.js';
const root='reports/three-club-careers/2026-10-22-career-v3-director';
const output=process.argv[2]||'work/verification-2026-10-23/reports.json';
const json=async path=>JSON.parse(await readFile(path,'utf8'));
const checks=[];
for(const slug of ['barcelona','real-madrid','arsenal']){
 const dir=join(root,slug),r=await json(join(dir,'report.json')),c=await json(join(dir,'final-career.json')),start=await json(join(dir,'start-career.json'));
 assert.equal(fingerprint(c),r.finalFingerprint,'Final snapshot fingerprint');
 const fixtures=c.connected.calendar.fixtures;
 assert.equal(fixtures.length,399);assert.equal(new Set(fixtures.map(f=>f.id)).size,399);
 assert.ok(fixtures.every(f=>f.status==='complete'));
 assert.equal(fixtures.filter(f=>f.competition==='league').length,380);
 assert.equal(fixtures.filter(f=>f.competition==='cup').length,19);
 const table=standings(c.competition);assert.ok(table.every(t=>t.p===38));
 const me=table.find(t=>t.id==='user');for(const k of ['w','d','l','gf','ga','pts'])assert.equal(me[k],r.summary[k]);
 for(const f of fixtures){
  const exported=r.fixtures.find(row=>row.id===f.id);assert.ok(exported);
  assert.deepEqual([exported.homeGoals,exported.awayGoals],f.result.score);
  for(let team=0;team<2;team++){
   const rows=f.result.playerStats[team];
   assert.equal(rows.reduce((n,p)=>n+p.minutes,0),990);
   assert.equal(rows.reduce((n,p)=>n+p.goals,0),f.result.score[team]);
   assert.equal(rows.reduce((n,p)=>n+p.assists,0),f.result.events.filter(e=>e.team===team&&e.type==='goal'&&e.assistId).length);
  }
 }
 const balances=new Map(start.world.clubs.map(t=>[t.id,t.funds]));
 for(const row of r.worldFinance){
  assert.equal(row.openingGbp,balances.get(row.clubId),'Cash continuity');
  assert.equal(row.closingGbp,row.openingGbp+row.receiptsGbp-row.wagesGbp+row.netTransferGbp-(row.contractFeesGbp||0),'Cash equation');
  balances.set(row.clubId,row.closingGbp);
 }
 for(const club of c.world.clubs){assert.equal(balances.get(club.id),club.funds,'Final cash');if(c.world.members.includes(club.id))assert.ok(legalClub(c,club.id),'Legal closing squad');}
 assert.equal(unitsToGbp(c.credits),r.summary.closingGbp);
 const groups=new Set();for(const a of c.world.agreements){const key=a.registered+':'+a.terms.player;assert.ok(!groups.has(key),'Same-day repeat transfer');groups.add(key);}
 const datasets={transfers:r.transfers,offers:r.offers,fixtures:r.fixtures,squad:r.squad,contracts:r.contracts,substitutions:r.substitutions,finance:r.finance,'world-finance':r.worldFinance,...Object.fromEntries(Object.entries(r.statistics).map(([k,v])=>[k+'-players',v.players]))};
 let cells=0;for(const [name,rows] of Object.entries(datasets)){
  const csv=parse(await readFile(join(dir,name+'.csv'),'utf8'),{columns:true,skip_empty_lines:true});assert.equal(csv.length,rows.length,name);
  for(let i=0;i<rows.length;i++)for(const [key,value] of Object.entries(csv[i])){assert.equal(value,String(rows[i][key]??''),name+' row '+i+' '+key);cells++;}
 }
 checks.push({club:r.summary.club,fixtures:fixtures.length,csvFiles:Object.keys(datasets).length,cells,rawFingerprint:true,financialContinuity:true,goalsAssistsMinutes:true,legalClosingSquads:true,sameDayRepeatTransfers:0});
}
await mkdir(join(output,'..'),{recursive:true});await writeFile(output,JSON.stringify({passed:true,checks,scope:'Independent raw snapshot, report, table, fixture, cash-flow and every CSV cell check. Midseason replay continuation is exercised by the simulation harness; this audit does not rerun its policy.'},null,2)+'\n');console.log(JSON.stringify(checks,null,2));
