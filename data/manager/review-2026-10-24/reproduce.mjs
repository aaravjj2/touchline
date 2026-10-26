import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve} from 'node:path';
import assert from 'node:assert/strict';
import {digest,reviewFacts} from '../../../scripts/lib/super-review.mjs';
import {applyReviewedFacts} from '../../../scripts/lib/apply-reviewed-facts.mjs';
const here=new URL('./',import.meta.url),read=async p=>JSON.parse(await readFile(new URL(p,here),'utf8'));
if(!process.argv[2])throw Error('Provide a fresh output directory.');
const candidate=await read('../review-2026-10-23/transfer-batch/position-result/candidate.json'),ledger=await read('../review-2026-10-23/transfer-batch/position-result/reviews.json'),facts=await read('contracts.json');
assert.equal(digest(candidate),'bd38edb9873eb38c9c079bf5bba47809bd127543b23e0c458c8a1263cc6801d8');
const claims=reviewFacts(candidate),batch={version:1,baseHash:digest(candidate),reviewHash:digest(ledger),reviewer:'Codex official contract review',checked:facts.checked,claims:[]};
for(const row of facts.players){
 const player=candidate.clubs.flatMap(c=>c.players).find(p=>p.id===row.id);assert(player);assert.equal(player.owner,null);assert.equal(player.gameTerms?.contract,undefined);
 for(const field of ['ownership','gameTerms.contract',...(row.positions?['positions']:[])]){
  const old=claims.find(f=>f.player===row.id&&f.field===field);assert(old);
  const ownership=field==='ownership',source=ownership?(row.ownershipSource||row.source):row.source,date=ownership?(row.ownershipDate||row.date):row.date;
  const note=field==='positions'?'Official pre-cutoff biography explicitly names these positions; no unrelated positions inferred.':ownership?'Official pre-cutoff signing or renewal supports club contract affiliation. Formal league registration remains unresolved.':'Exact expiry as published in the pre-cutoff agreement. Salary, fee and later renewals remain separate facts.';
  batch.claims.push({key:old.key,oldClaimHash:old.claimHash,personId:player.personId,value:ownership?'super-barcelona':field==='positions'?row.positions:{value:row.end,basis:'published',note},evidence:{status:'verified',source,effective:date,checked:facts.checked,note}});
 }
}
const result=applyReviewedFacts(candidate,ledger,batch);assert.equal(result.reviews.entries.length,281);assert.equal(result.queue.ready,false);assert.equal(result.queue.errors.length,0);
const output=resolve(process.argv[2]);await mkdir(output,{recursive:false});
for(const [name,value] of Object.entries({...result,batch}))await writeFile(resolve(output,name+'.json'),JSON.stringify(value,null,2)+'\n',{flag:'wx'});
const summary={checked:facts.checked,sourceHash:digest(result.candidate),accepted:281,newAccepted:24,publishedContracts:10,ownershipClaims:10,positionClaims:4,issues:result.queue.audit.errors.length,unaccepted:result.queue.queue.filter(f=>f.state!=='accepted').length,reviewErrors:0,verifiedCareerReady:false};
await writeFile(resolve(output,'summary.json'),JSON.stringify(summary,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify(summary,null,2));
