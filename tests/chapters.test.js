import test from 'node:test';
import assert from 'node:assert/strict';
import {createAnnualCareer,advancePlayerYear,resolveAnnualDecision} from '../dist/annual-career.js';
import {createPlayerCareer,overall} from '../dist/player-career-core.js';
import {upgradeChapters,renewChapter,chapterOffers,acceptChapterOffer,negotiateChapter,loanDestinations,startChapterLoan,selectionReport} from '../dist/career-chapters.js';
import {createCircuit,worldClub,table} from '../dist/career-world.js';
function year(c){advancePlayerYear(c);if(c.pendingDecision){const pending=structuredClone(c);advancePlayerYear(c);assert.deepEqual(c,pending);resolveAnnualDecision(c,c.pendingDecision.choices.at(-1).id);advancePlayerYear(c);}return c;}
test('chapter world has coherent schedules, two full tables, a cup and exact player score attribution',()=>{
 const c=year(createAnnualCareer({name:'League QA',nation:'Spain',seed:43,role:'DEF'})),world=c.lastCircuit;
 assert.equal(world.results.length,760);assert.equal(new Set(world.results.map(r=>r.id)).size,760);
 for(let t=0;t<2;t++){const rows=table(world,t);assert.equal(rows.length,20);assert.ok(rows.every(r=>r.p===38));assert.equal(rows.reduce((s,r)=>s+r.gf,0),rows.reduce((s,r)=>s+r.ga,0));}
 assert.equal(world.cup.results.length,39);assert.ok(world.cup.winner);assert.equal(c.history.length,38);
 for(const row of [...c.history,...c.cupHistory]){const result=[...world.results,...world.cup.results].find(r=>r.id===row.fixtureId);assert.ok(result);assert.deepEqual(row.score,row.home?result.score:[...result.score].reverse());assert.ok(row.goals<=row.shots);assert.ok(row.goals+row.assists<=row.score[0]);assert.ok(row.opponent&&row.opponentName);}
 assert.ok(c.history.some(r=>r.recoveries>0));assert.equal(c.seasons[0].stints.reduce((n,s)=>n+s.minutes,0),c.seasons[0].minutes);
 const oldTop=table(world,0).map(r=>r.id),oldLower=table(world,1).map(r=>r.id),next=c.worlds[world.country];assert.ok(oldLower.slice(0,3).every(id=>next.tiers[0].includes(id)));assert.ok(oldTop.slice(17).every(id=>next.tiers[1].includes(id)));assert.equal(new Set(next.tiers.flat()).size,40);
});
test('seeded career recovery reproduces the exact year and never double-applies decisions',()=>{
 let a=createAnnualCareer({name:'Resume QA',nation:'Nepal',seed:23}),b=structuredClone(a);advancePlayerYear(a);advancePlayerYear(b);assert.deepEqual(a,b);
 if(a.pendingDecision){const id=a.pendingDecision.choices.at(-1).id;a=JSON.parse(JSON.stringify(a));resolveAnnualDecision(a,id);resolveAnnualDecision(b,id);assert.throws(()=>resolveAnnualDecision(a,id));advancePlayerYear(a);advancePlayerYear(b);}
 assert.deepEqual(a,b);assert.equal(a.age,19);assert.equal(a.decisions.length<=1,true);
});
test('contracts require explicit resolution and offers negotiate once with a safe alternative',()=>{
 const c=createAnnualCareer({name:'Agent QA',nation:'Spain',seed:99});c.contract=0;const before=structuredClone(c);assert.throws(()=>advancePlayerYear(c),/contract/);assert.deepEqual(c,before);assert.throws(()=>startChapterLoan(c,loanDestinations(c)[0]?.id),/contract/);renewChapter(c);assert.equal(c.contract,76);
 c.offers=chapterOffers(c);assert.ok(c.offers.length);const o=c.offers[0],wage=o.wage;o.interest=90;negotiateChapter(c,o.club);assert.equal(o.wage,Math.round(wage*1.08));assert.throws(()=>negotiateChapter(c,o.club));acceptChapterOffer(c,o.club);assert.equal(c.club,o.club);assert.equal(c.contract,76);assert.ok(c.worlds[worldClub(c.club).country]);assert.throws(()=>acceptChapterOffer(c,o.club));
});
test('changing agent priorities cannot restore withdrawn bids or repeat a signed move',()=>{
 const c=createAnnualCareer({name:'Market QA',nation:'Spain',seed:88});c.offers=chapterOffers(c);const rejected=c.offers[0];rejected.interest=20;negotiateChapter(c,rejected.club);c.priority='money';c.offers=chapterOffers(c);assert.ok(c.offers.every(o=>o.club!==rejected.club));const signed=c.offers[0];assert.ok(signed);acceptChapterOffer(c,signed.club);assert.deepEqual(chapterOffers(c),[]);
});
test('loan retains parent contract, returns after a year and records separate club stints',()=>{
 const c=createAnnualCareer({name:'Loan QA',nation:'Spain',path:'prospect',seed:11}),parent=c.club,wage=c.wage,option=loanDestinations(c)[0];assert.ok(option);startChapterLoan(c,option.id);assert.equal(c.loan.parent,parent);year(c);assert.equal(c.club,parent);assert.equal(c.wage,wage);assert.equal(c.contract,38);assert.equal(c.loan,null);assert.equal(c.transfers.at(-1).type,'loan return');assert.ok(c.seasons[0].stints.some(s=>s.club===option.id));
});
test('injury recovery survives season rollover and new history does not fabricate legacy records',()=>{
 const c=createAnnualCareer({name:'Health QA',seed:81});c.injury=45;year(c);assert.equal(c.injury,7);assert.ok(c.history.every(r=>r.minutes===0));assert.equal(c.seasons[0].missed>=38,true);
 const old=createPlayerCareer({name:'Legacy',seed:8}),row={season:0,club:old.club,goals:2,model:'old'};old.history.push(row);const attrs=structuredClone(old.attributes);upgradeChapters(old);assert.deepEqual(old.history,[row]);assert.deepEqual(old.attributes,attrs);assert.equal(old.chapterVersion,3);
});
test('identities affect actual performance and development remains finite through five years',()=>{
 let creation=0,engineCreation=0,recoveries=0,engineRecoveries=0;for(let seed=1;seed<=20;seed++){const a=createAnnualCareer({name:'Build',nation:'Spain',role:'MID',identity:'creator',seed}),b=createAnnualCareer({name:'Build',nation:'Spain',role:'MID',identity:'engine',seed});assert.ok(a.skills.vision>b.skills.vision);assert.ok(b.skills.tackling>a.skills.tackling);year(a);year(b);creation+=a.totals.chances;engineCreation+=b.totals.chances;recoveries+=a.totals.recoveries;engineRecoveries+=b.totals.recoveries;}assert.ok(creation>engineCreation);assert.ok(engineRecoveries>recoveries);
 const c=createAnnualCareer({name:'Five years',nation:'Nepal',role:'GK',seed:17});for(let i=0;i<5;i++){if(c.contract<38)renewChapter(c);year(c);assert.equal(c.seasons.length,i+1);assert.ok(Object.values(c.skills).every(Number.isFinite));assert.ok(Number.isFinite(overall(c)));}assert.equal(c.age,23);assert.equal(c.history.length,190);
});
