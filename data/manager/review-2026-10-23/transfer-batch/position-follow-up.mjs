import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve} from 'node:path';
import assert from 'node:assert/strict';
import {digest,reviewFacts,reviewQueue,reviewDiff,frozenCandidate} from '../../../../scripts/lib/super-review.mjs';
const here=new URL('./',import.meta.url),read=async p=>JSON.parse(await readFile(new URL(p,here),'utf8'));
if(!process.argv[2])throw Error('Provide a fresh output directory');
const output=resolve(process.argv[2]);await mkdir(output,{recursive:false});
const before=await read('result/candidate.json'),ledger=await read('result/reviews.json'),data=structuredClone(before);
assert.equal(digest(before),'cb2b9b131c4cb48bc9a7cf2fabb2563f4771585c9dc7d53f081a9bcbaac26973');
const facts=[
 {id:'super-barcelona-250194007',field:'positions',value:['LW'],effective:'2025-06-03',source:'https://www.uefa.com/under17/news/029a-1dedaf7617c0-1ad2367240dd-1000--2025-u17-euro-team-of-the-tournament/',note:'UEFA technical observers explicitly select Bisiwu at left winger. No striker or right-wing eligibility inferred.'},
 {id:'super-lens-250091018',field:'positions',value:['CM','AM','RW'],effective:'2026-06-26',source:'https://www.rclens.fr/fr/rclens-michael-cuisance-arrivee-mercato-20262027',note:'Official signing biography describes relayeur (central midfield), right wing and playmaker roles before arrival. Double-pivot participation alone is not used to add DM.'},
 {id:'super-lens-250091018',field:'birthDate',value:'1999-08-16',effective:'1999-08-16',source:'https://www.rclens.fr/fr/michael-cuisance',note:'Official personal details give 16 August 1999. Stable birth date only; UEFA identity mapping remains a separate claim.'},
 {id:'super-lens-250091018',field:'ownership',value:'super-lens',effective:'2026-06-26',source:'https://www.rclens.fr/fr/rclens-michael-cuisance-arrivee-mercato-20262027',note:'Official 26 June signing from Hertha; published expiry is year 2030 only. No exact day, wage or registration completion inferred.'},
 {id:'super-villarreal-250224969',field:'birthDate',value:'2004-11-30',effective:'2004-11-30',source:'https://villarrealcf.es/es/el-villarreal-cf-renueva-a-nizar-el-jmili/',note:'Official 12 May renewal biography names Nizar El Jmili Ben Hamou and gives 30 November 2004. No provider ID claim inferred.'},
 {id:'super-villarreal-250224969',field:'ownership',value:'super-villarreal',effective:'2026-05-12',source:'https://villarrealcf.es/es/el-villarreal-cf-renueva-a-nizar-el-jmili/',note:'Pre-cutoff renewal states June 2027. Do not backdate the separate October 2030 extension or assume a winger side.'},
 {id:'super-inter-mattiamarello',field:'ownership',value:'super-inter',effective:'2026-06-16',source:'https://www.inter.it/en/news/inter-complete-the-permanent-signing-of-mattia-marello',note:'Inter explicitly exercised the option to make the Udinese transfer permanent on 16 June. Broad defender label does not establish a precise natural position.'}
];
for(const fact of facts){
 const p=data.clubs.flatMap(c=>c.players).find(p=>p.id===fact.id);assert(p);
 const key=fact.field==='ownership'?'owner':fact.field;
 if(fact.field==='birthDate')assert.equal(p[key],fact.value);
 p[key]=fact.value;p.evidence[fact.field]={status:'verified',source:fact.source,effective:fact.effective,checked:'2026-10-23',note:fact.note};
 if(fact.id==='super-lens-250091018'&&fact.field==='ownership')p.contractPublication={value:'2030',precision:'year',evidence:p.evidence.ownership};
 if(fact.id==='super-villarreal-250224969'&&fact.field==='ownership')p.contractPublication={value:'2027-06',precision:'month',evidence:p.evidence.ownership};
}
const claims=reviewFacts(data);
for(const old of ledger.entries)assert.equal(old.claimHash,claims.find(f=>f.key===old.key)?.claimHash);
for(const fact of facts){
 const claim=claims.find(f=>f.player===fact.id&&f.field===fact.field);assert(claim);assert(!ledger.entries.some(e=>e.key===claim.key));
 ledger.entries.push({key:claim.key,claimHash:claim.claimHash,decision:'accepted',reviewer:'Codex primary-source review',checked:'2026-10-23',note:fact.note});
}
const queue=reviewQueue(data,ledger);assert.equal(ledger.entries.length,257);assert.equal(queue.errors.length,0);assert.equal(queue.ready,false);
assert.equal(queue.audit.errors.filter(e=>e.kind==='natural-positions').length,3);
let freezeFailure;try{frozenCandidate(data,ledger);}catch(error){freezeFailure=error.message;}assert.match(freezeFailure,/blocked/);
const write=(name,value)=>writeFile(resolve(output,name),JSON.stringify(value,null,2)+'\n',{flag:'wx'});
await write('candidate.json',data);await write('reviews.json',ledger);await write('queue.json',queue);await write('diff.json',reviewDiff(before,data));await write('facts.json',facts);
const summary={beforeHash:digest(before),afterHash:digest(data),newAccepted:7,accepted:257,issues:queue.audit.errors.length,unaccepted:queue.queue.filter(f=>f.state!=='accepted').length,reviewErrors:queue.errors.length,missingPositions:3,ready:false,freezeFailure};
await write('summary.json',summary);console.log(JSON.stringify(summary,null,2));
