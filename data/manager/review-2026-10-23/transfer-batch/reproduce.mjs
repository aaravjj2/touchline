import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve} from 'node:path';
import assert from 'node:assert/strict';
import {digest,reviewFacts,reviewQueue,reviewDiff,frozenCandidate} from '../../../../scripts/lib/super-review.mjs';

// Apply manually reviewed facts only. Source downloads and name matches alone
// never establish registrations, natural positions, loans or financial terms.
const here=new URL('./',import.meta.url),load=async url=>JSON.parse(await readFile(url,'utf8'));
if(!process.argv[2])throw Error('Provide a new output directory.');
const output=resolve(process.argv[2]);await mkdir(output,{recursive:false});
const before=await load(new URL('../three-club-batch/result/candidate.json',here));
assert.equal(digest(before),'73442316a7e3f186b8cce697753ee63a472c17ede7420ec693e22a1fa2591260');
const ledger=await load(new URL('../three-club-batch/result/reviews.json',here));
const decisions=await load(new URL('decisions.json',here)),fifa=await load(new URL('fifa-biographies.json',here)),profiles=await load(new URL('profile-biographies.json',here));
const data=structuredClone(before),touched=[],excluded=[];
const find=id=>{
 const found=data.clubs.flatMap(c=>c.players.filter(p=>p.id===id).map(p=>({c,p})));
 assert.equal(found.length,1,`Unique person record required: ${id}`);return found[0];
};
const evidence=(source,effective,note)=>({status:'verified',source,effective,checked:decisions.checked,note});
for(const fact of [...fifa.facts.map(f=>({...f,source:fifa.source+'#page='+f.page,note:`FIFA squad-list page ${f.page}, shirt ${f.shirtNumber}: reviewed name and birth date only. July club labels are not cutoff registration evidence. External provider identity remains unverified.`})),...profiles.facts]){
 const {p}=find(fact.id);assert.equal(p.birthDate,fact.birthDate,`DOB correction needs explicit review: ${p.name}`);
 assert.notEqual(p.evidence.birthDate?.status,'verified','Preserve prior reviewed facts');
 p.evidence.birthDate=evidence(fact.source,fact.birthDate,fact.note||'Official profile personal-details birth date; no assertion of August registration or foreign provider mapping.');
 touched.push({id:p.id,field:'birthDate'});
}
for(const move of decisions.moves){
 assert(move.date>data.cutoff);const {c,p}=find(move.id);assert.equal(c.id,move.from);
 const to=data.clubs.find(c=>c.id===move.to);assert(to);
 c.players=c.players.filter(row=>row.id!==p.id);to.players.push(p);
 assert.equal(p.owner,null);p.registeredClub=to.id;p.club=to.name;
 p.color=to.players.find(row=>row.id!==p.id)?.color||p.color;
 p.registrationStatus='unverified-cutoff';p.registrationSource=null;
 p.cutoffReview={status:'provisional-former-club',source:move.source,announcementDate:move.date,note:move.note};
}
for(const removal of decisions.exclusions){
 assert(removal.date>data.cutoff);const {c,p}=find(removal.id);
 excluded.push({...removal,formerCandidateClub:c.id,record:structuredClone(p)});
 c.players=c.players.filter(row=>row.id!==p.id);
}
for(const fact of decisions.ownership){
 const {c,p}=find(fact.id);assert.equal(p.owner,null);assert(fact.date<=data.cutoff);
 const note='Official pre-cutoff signing agreement establishes club ownership/contract affiliation; formal league registration, fee and wage remain separate unverified facts.';
 p.owner=c.id;p.evidence.ownership=evidence(fact.source,fact.date,note);touched.push({id:p.id,field:'ownership'});
 if(fact.contract){
  assert.equal(p.gameTerms?.contract,undefined);
  p.gameTerms={...p.gameTerms,contract:{value:fact.contract,basis:'published',note:'Exact expiry date stated in the official signing announcement. No wage or fee inferred.',evidence:evidence(fact.source,fact.date,'Published exact contract expiry, as announced before cutoff.')}};
  touched.push({id:p.id,field:'gameTerms.contract'});
 }
 if(fact.expiryPublication){
  p.contractPublication={...fact.expiryPublication,evidence:evidence(fact.source,fact.date,'Published expiry precision only; not an exact playable contract date.')};
  assert.equal(p.gameTerms?.contract,undefined,'Do not invent June 30 from a year/month-only report');
 }
}
for(const fact of decisions.positions){
 const {p}=find(fact.id);p.positions=fact.value;p.evidence.positions=evidence(fact.source,fact.date,fact.note);touched.push({id:p.id,field:'positions'});
}
const claims=new Map(reviewFacts(data).map(f=>[f.key,f]));
for(const entry of ledger.entries)assert.equal(entry.claimHash,claims.get(entry.key)?.claimHash,'Existing accepted claim changed');
const excludedIds=new Set(excluded.map(row=>row.id));
for(const change of touched){
 if(excludedIds.has(change.id))continue;
 const {c,p}=find(change.id),key=`${c.id}/${p.id}/${change.field}`,claim=claims.get(key);
 assert(claim);assert(!ledger.entries.some(row=>row.key===key),'Duplicate new claim');
 ledger.entries.push({key,claimHash:claim.claimHash,decision:'accepted',reviewer:'Codex primary-source row review',checked:decisions.checked,note:claim.evidence.note});
}
const queue=reviewQueue(data,ledger),diff=reviewDiff(before,data);
assert.equal(queue.errors.length,0);assert.equal(queue.ready,false);
assert.equal(queue.queue.filter(f=>f.state==='accepted').length,250);
assert.equal(queue.audit.players,514);assert.equal(new Set(data.clubs.flatMap(c=>c.players.map(p=>p.personId))).size,514);
for(const move of decisions.moves)assert.equal(find(move.id).p.evidence.registration,undefined,'Provisional move must not claim verified registration');
for(const row of data.clubs.flatMap(c=>c.players))assert.equal(row.gameTerms?.wage,undefined,'No invented wage in this research batch');
let freezeFailure='';try{frozenCandidate(data,ledger);}catch(error){freezeFailure=error.message;}assert.match(freezeFailure,/Candidate is blocked/);
const counts={};for(const error of queue.audit.errors)counts[error.kind]=(counts[error.kind]||0)+1;
const write=async(name,value)=>writeFile(resolve(output,name),JSON.stringify(value,null,2)+'\n',{flag:'wx'});
await write('candidate.json',data);await write('reviews.json',ledger);await write('queue.json',queue);await write('diff.json',diff);
await write('excluded-registrations.json',{scope:'Research records outside playable opening-day clubs; not lost identities, player sales or career migrations.',records:excluded});
await write('follow-ups.json',{unresolved:decisions.unresolved,coverageChecks:[
 {club:'super-real-madrid',names:['Ferland Mendy','Thiago Pitarch'],source:'https://www.realmadrid.com/en-US/football/first-team/players',note:'Current roster entries absent from candidate. Establish cutoff eligibility and exact positions before adding.'},
 {club:'super-barcelona',names:['Brian Fariñas','Roony Bardghji'],source:'https://www.fcbarcelona.com/en/football/first-team/players',note:'Current roster entries absent from candidate. Senior promotion dates do not settle earlier youth eligibility.'}
],rejectedNameMatches:fifa.rejected,rateLimitedProfiles:(await load(new URL('capture-profiles.json',here))).sources.filter(row=>row.status!==200||row.error)});
const summary={beforeHash:digest(before),afterHash:digest(data),manifestHash:digest({decisions,fifa,profiles}),reviewedBirthDates:195,candidateBirthDatesAdded:193,excludedBiographiesRetained:2,provisionalClubCorrections:3,excludedRegistrations:2,newOwnershipClaims:9,newExactPublishedContracts:6,newPositionClaims:1,acceptedBefore:41,accepted:ledger.entries.length,newAccepted:ledger.entries.length-41,players:queue.audit.players,issuesBefore:reviewQueue(before).audit.errors.length,issuesAfter:queue.audit.errors.length,counts,unaccepted:queue.queue.filter(row=>row.state!=='accepted').length,reviewErrors:queue.errors.length,ready:queue.ready,freezeFailure,changes:diff.changes.length};
await write('summary.json',summary);console.log(JSON.stringify(summary,null,2));
