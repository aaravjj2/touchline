import test from 'node:test';
import assert from 'node:assert/strict';
import {openingCandidate} from '../dist/super-opening-data.js';
import {digest,reviewFacts} from '../scripts/lib/super-review.mjs';
import {applyReviewedFacts} from '../scripts/lib/apply-reviewed-facts.mjs';
function fixture(){
 const data=openingCandidate(),reviews={version:1,entries:[]},club=data.clubs[0],player=club.players[0],fact=reviewFacts(data).find(f=>f.player===player.id&&f.field==='ownership');
 const batch={version:1,baseHash:digest(data),reviewHash:digest(reviews),reviewer:'Synthetic test only',checked:'2026-10-24',claims:[{key:fact.key,oldClaimHash:fact.claimHash,personId:player.personId,value:club.id,evidence:{status:'verified',source:'https://example.org/synthetic-test-only',effective:'2026-07-01',checked:'2026-10-24',note:'Synthetic fixture, not real source evidence.'}}]};
 return {data,reviews,batch};
}
test('review batch binds exact prior claims, preserves source inputs and adds only the explicitly reviewed fact',()=>{
 const {data,reviews,batch}=fixture(),before=structuredClone(data),result=applyReviewedFacts(data,reviews,batch);
 assert.deepEqual(data,before);assert.equal(reviews.entries.length,0);assert.equal(result.reviews.entries.length,1);assert.equal(result.diff.changes.length,1);assert.equal(result.queue.ready,false);assert.equal(result.queue.queue.find(f=>f.key===batch.claims[0].key).state,'accepted');
});
test('stale bases, changed people, duplicate reviews and unsafe fields cannot be batch accepted',()=>{
 const {data,reviews,batch}=fixture();const stale=structuredClone(data);stale.clubs[0].players[0].name='Different person';assert.throws(()=>applyReviewedFacts(stale,reviews,batch),/base/);
 const wrong=structuredClone(batch);wrong.claims[0].personId='other-person';assert.throws(()=>applyReviewedFacts(data,reviews,wrong),/identity/);
 const duplicate=structuredClone(batch);duplicate.claims.push(duplicate.claims[0]);assert.throws(()=>applyReviewedFacts(data,reviews,duplicate),/Duplicate/);
 const result=applyReviewedFacts(data,reviews,batch),again=structuredClone(batch);again.baseHash=digest(result.candidate);again.reviewHash=digest(result.reviews);again.claims[0].oldClaimHash=result.reviews.entries[0].claimHash;assert.throws(()=>applyReviewedFacts(result.candidate,result.reviews,again),/already-reviewed/);
 const unsafe=structuredClone(batch),identity=reviewFacts(data).find(f=>f.player===data.clubs[0].players[0].id&&f.field==='identity');unsafe.claims[0].key=identity.key;unsafe.claims[0].oldClaimHash=identity.claimHash;assert.throws(()=>applyReviewedFacts(data,reviews,unsafe),/Unsupported/);
});
test('post-cutoff evidence, invalid positions and impossible contract dates fail before outputs can be written',()=>{
 const {data,reviews,batch}=fixture();const future=structuredClone(batch);future.claims[0].evidence.effective='2026-08-08';assert.throws(()=>applyReviewedFacts(data,reviews,future),/dataset checks/);
 for(const [field,value] of [['positions',['ALL']],['gameTerms.contract',{value:'2025-06-30',basis:'published',note:'Synthetic invalid expired contract'}]]){
  const bad=structuredClone(batch),old=reviewFacts(data).find(f=>f.player===data.clubs[0].players[0].id&&f.field===field);Object.assign(bad.claims[0],{key:old.key,oldClaimHash:old.claimHash,value});assert.throws(()=>applyReviewedFacts(data,reviews,bad),/dataset checks/);
 }
});
