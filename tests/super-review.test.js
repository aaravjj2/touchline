import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
import {openingCandidate} from '../dist/super-opening-data.js';
import {auditSuperDataset} from '../dist/super-dataset.js';
import {canonical,digest,reviewFacts,reviewQueue,reviewDiff,frozenCandidate,validateFrozenCandidate} from '../scripts/lib/super-review.mjs';
const proof={status:'verified',source:'https://example.org/synthetic-test-only',effective:'2026-05-24',checked:'2026-10-23'};
function fixture(){
 const d=openingCandidate();d.clubs=d.clubs.map(c=>({...c,membership:proof,coverage:proof,players:['GK','LB','CB','CB','RB','CM','CM','CM','LW','ST','RW','GK','CB','ST'].map((pos,i)=>({id:c.id+'-'+i,personId:c.id+'-person-'+i,name:'Synthetic '+i,birthDate:'2000-01-01',positions:[pos],role:pos==='GK'?'GK':['LB','CB','RB'].includes(pos)?'DEF':pos==='CM'?'MID':'FWD',rating:80,owner:c.id,registeredClub:c.id,evidence:Object.fromEntries(['identity','birthDate','registration','ownership','positions'].map(k=>[k,proof])),gameTerms:{contract:{value:'2029-06-30',basis:'authored',note:'Synthetic game contract'},wage:{value:20000,basis:'authored',note:'Synthetic game wage'}}}))}));return d;
}
const accepted=d=>({version:1,entries:reviewFacts(d).map(f=>({key:f.key,claimHash:f.claimHash,decision:'accepted',reviewer:'Synthetic test reviewer',checked:'2026-10-23',note:'Synthetic fixture, not real source verification.'}))});
test('review queue prioritizes requested clubs without mutating candidate or approving unchecked data',()=>{
 const d=openingCandidate(),before=structuredClone(d),q=reviewQueue(d);assert.deepEqual(d,before);assert.deepEqual(q.clubs.slice(0,3).map(c=>c.name),['Barcelona','Real Madrid','Arsenal']);assert.equal(q.ready,false);assert.ok(q.queue.every(f=>f.state==='unreviewed'));assert.equal(q.queue.filter(f=>f.field==='membership'&&f.evidence?.status==='verified').length,20);assert.throws(()=>frozenCandidate(d,accepted(d)),/blocked/);
});
test('complete synthetic data requires per-claim review and produces a content-addressed candidate',()=>{
 const d=fixture();assert.equal(auditSuperDataset(d).ready,true);assert.equal(reviewQueue(d).ready,false);const reviews=accepted(d),pack=frozenCandidate(d,reviews);assert.equal(validateFrozenCandidate(pack).ready,true);assert.equal(pack.sourceHash,digest(d));assert.equal(digest({a:1,b:2}),digest({b:2,a:1}));assert.equal(canonical({b:undefined,a:1}),''+canonical({a:1}));pack.candidate.clubs[0].players[0].name='Changed';assert.throws(()=>validateFrozenCandidate(pack),/integrity/);assert.notEqual(d.clubs[0].players[0].name,'Changed');
});
test('fact and evidence edits invalidate only their corresponding reviews and create readable diffs',()=>{
 const a=fixture(),b=structuredClone(a),reviews=accepted(a);b.clubs[0].players[0].gameTerms.wage.value=25000;b.clubs[0].players[1].evidence.positions={...proof,source:'https://example.org/different-test-source'};
 const q=reviewQueue(b,reviews);assert.equal(q.queue.filter(f=>f.state==='stale').length,2);assert.equal(q.ready,false);const diff=reviewDiff(a,b);assert.equal(diff.changes.length,2);assert.ok(diff.changes.every(c=>c.kind==='changed'));assert.notEqual(diff.beforeHash,diff.afterHash);assert.throws(()=>frozenCandidate(b,reviews),/blocked/);
});
test('reviews bind the named person and club, not merely an unchanged value and URL',()=>{
 const a=fixture(),b=structuredClone(a),ledger=accepted(a);b.clubs[0].players[0].name='A different person';assert.equal(reviewQueue(b,ledger).queue.filter(f=>f.state==='stale').length,7);const changed=structuredClone(a);changed.clubs[0].name='A different club';assert.ok(reviewQueue(changed,ledger).queue.some(f=>f.field==='membership'&&f.state==='stale'));
});
test('duplicate, orphan, rejected and invalid-date reviews cannot satisfy publication gate',()=>{
 const d=fixture(),r=accepted(d);r.entries.push({...r.entries[0]},{...r.entries[1],key:'unrelated/claim'});r.entries[2].decision='rejected';r.entries[3].checked='2026-02-30';r.entries[4].reviewer='';const q=reviewQueue(d,r);assert.equal(q.ready,false);assert.ok(q.errors.some(e=>e.kind==='duplicate-review'));assert.ok(q.errors.some(e=>e.kind==='orphan-review'));assert.ok(q.queue.some(f=>f.state==='rejected'));assert.ok(q.queue.some(f=>f.state==='invalid'));
});
test('removed people invalidate coverage review and expose removed person facts in diff',()=>{
 const a=fixture(),b=structuredClone(a);b.clubs[0].players.pop();const diff=reviewDiff(a,b);assert.equal(diff.changes.filter(c=>c.kind==='removed').length,7);assert.ok(diff.changes.some(c=>c.key.endsWith('/coverage')&&c.kind==='changed'));assert.equal(reviewQueue(b,accepted(a)).ready,false);
});
test('external loan parents, return dates and game wage splits require consistent reviewed terms',()=>{
 const d=fixture(),p=d.clubs[0].players[0];d.supportingClubs=[{id:'external-parent',name:'Synthetic Parent',evidence:proof}];p.owner='external-parent';p.loan={start:'2026-07-01',end:'2027-06-30',returnClub:p.owner,evidence:proof,gameTerms:{basis:'authored',note:'Synthetic loan split',fullWeeklyWageGbp:40000,borrowerSharePercent:50}};
 assert.equal(auditSuperDataset(d).ready,true);const ledger=accepted(d);assert.equal(reviewQueue(d,ledger).ready,true);assert.ok(reviewFacts(d).some(f=>f.field==='supporting-club'));assert.ok(reviewFacts(d).some(f=>f.field==='loan'));
 const wrong=structuredClone(d);wrong.clubs[0].players[0].loan.gameTerms.borrowerSharePercent=25;assert.ok(auditSuperDataset(wrong).errors.some(e=>e.kind==='loan-terms'));assert.equal(reviewQueue(wrong,ledger).ready,false);
 const duplicate=structuredClone(d);duplicate.supportingClubs.push({...duplicate.clubs[0],players:undefined});assert.ok(auditSuperDataset(duplicate).errors.some(e=>e.kind==='club-registry'));p.loan.returnClub='unknown';assert.ok(auditSuperDataset(d).errors.some(e=>e.kind==='loan-return'));
});
test('review CLI exports to a new file and refuses replacing source or an existing artifact',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'touchline-review-')),out=join(dir,'candidate.json'),script='scripts/review-super-opening.mjs';const run=args=>spawnSync(process.execPath,[script,...args],{encoding:'utf8'});
 assert.equal(run(['--mode','export','--output',out]).status,0);const before=await readFile(out,'utf8');assert.notEqual(run(['--mode','export','--output',out]).status,0);assert.equal(await readFile(out,'utf8'),before);assert.notEqual(run(['--input',out,'--output',out]).status,0);
 const blocked=join(dir,'blocked.json');assert.notEqual(run(['--mode','freeze','--input',out,'--output',blocked]).status,0);
 const d=fixture(),r=accepted(d);await writeFile(join(dir,'source.json'),JSON.stringify(d));await writeFile(join(dir,'reviews.json'),JSON.stringify(r));assert.equal(run(['--mode','freeze','--input',join(dir,'source.json'),'--reviews',join(dir,'reviews.json'),'--output',join(dir,'frozen.json')]).status,0);assert.equal(validateFrozenCandidate(JSON.parse(await readFile(join(dir,'frozen.json'),'utf8'))).ready,true);
});
