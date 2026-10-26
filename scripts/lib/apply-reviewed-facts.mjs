import {digest,reviewFacts,reviewQueue,reviewDiff} from './super-review.mjs';

// Applies a manually reviewed batch. URL syntax and hashes do not prove truth.
// Explicit claim hashes prevent a batch from silently rebinding to edited people.
export function applyReviewedFacts(candidate,ledger,batch){
 if(batch.version!==1||batch.baseHash!==digest(candidate)||batch.reviewHash!==digest(ledger))throw Error('Reviewed batch base or ledger changed');
 if(!Array.isArray(batch.claims)||!batch.claims.length)throw Error('Reviewed claims required');
 const data=structuredClone(candidate),reviews=structuredClone(ledger),before=new Map(reviewFacts(candidate).map(f=>[f.key,f])),changed=new Set();
 for(const item of batch.claims){
  const claim=before.get(item.key);if(!claim||claim.claimHash!==item.oldClaimHash)throw Error('Claim changed: '+item.key);
  if(changed.has(item.key)||reviews.entries.some(e=>e.key===item.key))throw Error('Duplicate or already-reviewed claim: '+item.key);
  const club=data.clubs.find(c=>c.id===claim.club),player=club?.players.find(p=>p.id===claim.player);
  if(!player||item.personId!==player.personId)throw Error('Player identity mismatch');
  const field=claim.field;if(!['ownership','positions','gameTerms.contract'].includes(field))throw Error('Unsupported batch field: '+field);
  const proof=item.evidence;if(!proof||proof.status!=='verified'||!proof.note?.trim())throw Error('Manual reviewed evidence with rationale required');
  if(field==='ownership')player.owner=item.value;
  if(field==='positions')player.positions=structuredClone(item.value);
  if(field==='gameTerms.contract'){
   if(item.value?.basis!=='published'||item.value?.evidence)throw Error('Exact published contract with separate evidence required');
   player.gameTerms={...player.gameTerms,contract:{...structuredClone(item.value),evidence:structuredClone(proof)}};
  }else player.evidence={...player.evidence,[field]:structuredClone(proof)};
  changed.add(item.key);
 }
 const after=new Map(reviewFacts(data).map(f=>[f.key,f]));
 for(const entry of ledger.entries)if(after.get(entry.key)?.claimHash!==entry.claimHash)throw Error('Prior accepted claim would change');
 for(const item of batch.claims){
  const claim=after.get(item.key);
  reviews.entries.push({key:claim.key,claimHash:claim.claimHash,decision:'accepted',reviewer:batch.reviewer,checked:batch.checked,note:item.evidence.note});
 }
 const queue=reviewQueue(data,reviews);
 if(queue.errors.length||queue.queue.some(f=>changed.has(f.key)&&f.state!=='accepted'))throw Error('Review evidence or date is invalid');
 // Each newly asserted source claim must also pass its corresponding schema gate.
 for(const item of batch.claims){const fact=after.get(item.key),kinds=fact.field==='gameTerms.contract'?['contract-terms','contract-evidence']:[fact.field+'-evidence',...(fact.field==='positions'?['natural-positions']:['registration','owner-registry'])];
  if(queue.audit.errors.some(e=>e.club===fact.club&&e.player===fact.player&&kinds.includes(e.kind)))throw Error('New claim fails dataset checks: '+fact.key);
 }
 return {candidate:data,reviews,queue,diff:reviewDiff(candidate,data)};
}
