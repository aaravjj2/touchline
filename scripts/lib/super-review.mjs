import {createHash} from 'node:crypto';
import {auditSuperDataset} from '../../dist/super-dataset.js';
import {dayNumber} from '../../dist/manager-calendar.js';

export const canonical=value=>{
 if(value===null||typeof value!=='object')return JSON.stringify(value);
 if(Array.isArray(value))return '['+value.map(canonical).join(',')+']';
 return '{'+Object.keys(value).filter(k=>value[k]!==undefined).sort().map(k=>JSON.stringify(k)+':'+canonical(value[k])).join(',')+'}';
};
export const digest=value=>createHash('sha256').update(canonical(value)).digest('hex');
const preferred=['super-barcelona','super-real-madrid','english-eng-1'];
const priority=id=>{const i=preferred.indexOf(id);return i<0?preferred.length:i;};
export function reviewFacts(data){
 const facts=[],add=(club,player,field,value,evidence)=>{
  const claim={subject:player?{id:player.id,personId:player.personId,name:player.name}:{id:club.id,name:club.name,country:club.country},value:value??null,evidence:evidence??null};
  facts.push({key:[club.id,player?.id||'club',field].join('/'),club:club.id,clubName:club.name,player:player?.id||null,name:player?.name||club.name,field,...claim,claimHash:digest(claim)});
 };
 for(const club of [...data.clubs].sort((a,b)=>priority(a.id)-priority(b.id)||a.id.localeCompare(b.id))){
  add(club,null,'membership',{id:club.id,country:club.country},club.membership);
  add(club,null,'coverage',(club.players||[]).map(p=>p.personId).sort(),club.coverage);
  for(const p of [...club.players].sort((a,b)=>a.id.localeCompare(b.id))){
   const values={identity:{id:p.id,personId:p.personId,name:p.name},birthDate:p.birthDate,registration:p.registeredClub,ownership:p.owner,positions:p.positions};
   for(const [field,value] of Object.entries(values))add(club,p,field,value,p.evidence?.[field]);
   if(p.owner&&p.owner!==p.registeredClub)add(club,p,'loan',{owner:p.owner,registeredClub:p.registeredClub,...p.loan,evidence:undefined},p.loan?.evidence);
   for(const field of ['contract','wage'])add(club,p,'gameTerms.'+field,p.gameTerms?.[field],p.gameTerms?.[field]?.evidence);
  }
 }
 for(const parent of data.supportingClubs||[])add(parent,null,'supporting-club',parent,parent.evidence);
 return facts;
}
export function reviewQueue(data,reviews={version:1,entries:[]}){
 const audit=auditSuperDataset(data),facts=reviewFacts(data),entries=new Map(),errors=[];
 for(const e of reviews.entries||[]){if(entries.has(e.key))errors.push({kind:'duplicate-review',key:e.key});entries.set(e.key,e);}
 if(reviews.version!==1)errors.push({kind:'review-version'});
 const queue=facts.map(f=>{
  const e=entries.get(f.key);let state='unreviewed';
  if(e){
   try{dayNumber(e.checked);if(e.claimHash!==f.claimHash)state='stale';else if(e.decision!=='accepted')state='rejected';else if(!e.reviewer?.trim()||!e.note?.trim()||e.checked<(f.evidence?.checked||data.cutoff))state='invalid';else state='accepted';}catch{state='invalid';}
  }
  return {...f,state,review:e||null};
 });
 const keys=new Set(facts.map(f=>f.key));for(const key of entries.keys())if(!keys.has(key))errors.push({kind:'orphan-review',key});
 const clubs=[...data.clubs].sort((a,b)=>priority(a.id)-priority(b.id)||a.id.localeCompare(b.id)).map(c=>{
  const rows=queue.filter(f=>f.club===c.id);return {id:c.id,name:c.name,players:c.players.length,accepted:rows.filter(f=>f.state==='accepted').length,total:rows.length,issues:audit.errors.filter(e=>e.club===c.id).length};
 });
 return {version:1,datasetId:data.id,sourceHash:digest(data),ready:audit.ready&&errors.length===0&&queue.every(f=>f.state==='accepted'),audit,errors,clubs,queue};
}
export function reviewDiff(before,after){
 const a=new Map(reviewFacts(before).map(f=>[f.key,f])),b=new Map(reviewFacts(after).map(f=>[f.key,f]));
 const changes=[];for(const key of [...new Set([...a.keys(),...b.keys()])].sort()){
  if(a.get(key)?.claimHash===b.get(key)?.claimHash)continue;
  changes.push({key,kind:!a.has(key)?'added':!b.has(key)?'removed':'changed',before:a.get(key)?.value??null,after:b.get(key)?.value??null,subjectBefore:a.get(key)?.subject??null,subjectAfter:b.get(key)?.subject??null,evidenceBefore:a.get(key)?.evidence??null,evidenceAfter:b.get(key)?.evidence??null});
 }
 return {beforeHash:digest(before),afterHash:digest(after),changes,auditBefore:auditSuperDataset(before),auditAfter:auditSuperDataset(after)};
}
export function frozenCandidate(data,reviews){
 const gate=reviewQueue(data,reviews);if(!gate.ready)throw Error(`Candidate is blocked: ${gate.audit.errors.length} dataset issues; ${gate.queue.filter(f=>f.state!=='accepted').length} unaccepted facts; ${gate.errors.length} review-ledger issues.`);
 const snapshot=structuredClone(data),ledger=structuredClone(reviews),id=data.id+'-sha256-'+gate.sourceHash;
 return {format:'touchline-reviewed-candidate',version:1,id,datasetId:data.id,sourceHash:gate.sourceHash,reviewHash:digest(ledger),candidate:snapshot,reviews:ledger,scope:'Reviewed source candidate only; not a career save, not automatic publication, never a migration.'};
}
export function validateFrozenCandidate(pack){
 if(pack?.format!=='touchline-reviewed-candidate'||pack.version!==1||pack.datasetId!==pack.candidate?.id||pack.sourceHash!==digest(pack.candidate)||pack.reviewHash!==digest(pack.reviews)||pack.id!==pack.datasetId+'-sha256-'+pack.sourceHash)throw Error('Candidate package identity or integrity mismatch.');
 const gate=reviewQueue(pack.candidate,pack.reviews);if(!gate.ready)throw Error('Candidate no longer passes source and review gates.');return gate;
}
