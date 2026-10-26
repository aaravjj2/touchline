import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import assert from 'node:assert/strict';
import {digest,reviewFacts,reviewQueue,reviewDiff,frozenCandidate} from '../../../../scripts/lib/super-review.mjs';

// This applies a manually reviewed manifest, not automatic verification of URLs.
// Run with a fresh output directory; never replace sources or previous evidence.
const here=new URL('./',import.meta.url),load=async url=>JSON.parse(await readFile(url,'utf8'));
const output=process.argv[2];if(!output)throw Error('Provide a fresh output directory.');
const destination=resolve(output);await mkdir(destination,{recursive:false});
const facts=await load(new URL('facts.json',here));
const before=await load(new URL('../candidate-biographies.json',here));
assert.equal(digest(before),'9c3392d6ca71e6c1f7dbf3272ef0e6917ebf32770bdbe253b70bc308d700d0a9','Base candidate changed; review manifest applicability first');
const ledger=await load(new URL('../reviews-biographies-bound.json',here));
const data=structuredClone(before),touched=new Set();
const find=id=>{
 const found=data.clubs.flatMap(c=>c.players.filter(p=>p.id===id).map(p=>({c,p})));
 assert.equal(found.length,1,`Unique candidate required: ${id}`);return found[0];
};
const evidence=(source,effective,note)=>({status:'verified',source,effective,checked:facts.checked,note});
for(const fact of facts.birthDates){
 const {c,p}=find(fact.id);assert.equal(p.birthDate,fact.value,'DOB discrepancy requires explicit correction review');
 p.evidence.birthDate=evidence(fact.source,fact.value,'Stable birth date only; no assertion of August club registration or external provider identity.');
 touched.add(`${c.id}/${p.id}/birthDate`);
}
const {c,p}=find(facts.transfer.id),transfer=facts.transfer;
assert.equal(p.owner,null);assert.equal(p.gameTerms?.contract,undefined);
p.owner=transfer.owner;p.evidence.ownership=evidence(transfer.source,transfer.effective,transfer.note);
p.gameTerms={...p.gameTerms,contract:{value:transfer.contract,basis:'published',note:transfer.note,evidence:evidence(transfer.source,transfer.effective,transfer.note)}};
touched.add(`${c.id}/${p.id}/ownership`);touched.add(`${c.id}/${p.id}/gameTerms.contract`);
const excluded=find(facts.exclude.id);
assert(facts.exclude.effective>data.cutoff,'Exclusion must be a post-cutoff transfer');
excluded.c.players=excluded.c.players.filter(player=>player.id!==excluded.p.id);
const claims=new Map(reviewFacts(data).map(f=>[f.key,f]));
for(const entry of ledger.entries)assert.equal(entry.claimHash,claims.get(entry.key)?.claimHash,'Prior accepted review changed; resolve explicitly');
for(const key of touched){
 const fact=claims.get(key);assert(fact?.evidence?.status==='verified');
 assert(!ledger.entries.some(e=>e.key===key));
 ledger.entries.push({key,claimHash:fact.claimHash,decision:'accepted',reviewer:'Codex primary-source review',checked:facts.checked,note:fact.evidence.note});
}
const queue=reviewQueue(data,ledger),diff=reviewDiff(before,data);
assert.equal(touched.size,17);assert.equal(queue.errors.length,0);assert.equal(queue.ready,false);
assert.equal(queue.queue.filter(f=>f.state==='accepted').length,41);
assert.equal(data.clubs.flatMap(c=>c.players).some(p=>p.id===facts.exclude.id),false);
assert.deepEqual(p.positions,[],'Broad winger description must not manufacture natural positions');
assert.equal(p.evidence.registration,undefined);assert.equal(p.gameTerms.wage,undefined);
let blocked='';try{frozenCandidate(data,ledger);}catch(error){blocked=error.message;}assert.match(blocked,/Candidate is blocked/);
const write=async(name,value)=>writeFile(resolve(destination,name),JSON.stringify(value,null,2)+'\n',{flag:'wx'});
await write('candidate.json',data);await write('reviews.json',ledger);await write('queue.json',queue);await write('diff.json',diff);
await write('excluded-registration.json',{...facts.exclude,record:excluded.p,birthDateReview:{value:'2007-05-15',source:'https://www.realmadrid.com/en-US/football/academy/castilla/sergio-martinez-montero',checked:facts.checked},scope:'Retained research record outside the opening-day playable candidate; not a replacement Racing registration.'});
const summary={source:fileURLToPath(new URL('../candidate-biographies.json',here)),beforeHash:digest(before),afterHash:digest(data),manifestHash:digest(facts),newAccepted:touched.size,accepted:ledger.entries.length,players:queue.audit.players,issuesBefore:reviewQueue(before).audit.errors.length,issuesAfter:queue.audit.errors.length,unaccepted:queue.queue.filter(f=>f.state!=='accepted').length,reviewErrors:queue.errors.length,ready:queue.ready,freezeFailure:blocked,changes:diff.changes.length};
await write('summary.json',summary);console.log(JSON.stringify(summary,null,2));
