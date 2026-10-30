import {dayNumber} from './manager-calendar.js';
import {selectPositionTeam} from './manager-positions.js';
import {POSITION_SLOTS} from './player-positions.js';
export const SUPER_CUTOFF='2026-08-07';
export const SUPER_DATASET_ID='super-2026-opening-v1';
// Evidence must establish the stated fact at the cutoff, not merely a later webpage.
const proven=(fact,cutoff)=>{try{dayNumber(fact.effective);dayNumber(fact.checked);const url=new URL(fact.source);return fact.status==='verified'&&url.protocol==='https:'&&!!url.hostname&&!url.username&&!url.password&&fact.effective<=cutoff&&fact.checked>=fact.effective;}catch{return false;}};
export function auditSuperDataset(data){
 const errors=[],seen=new Set(),profiles=new Set(),clubs=new Set(),quotas={ENG:6,ESP:4,GER:4,ITA:4,FRA:2},counts={},registry=new Set([...(data?.clubs||[]),...(data?.supportingClubs||[])].map(c=>c.id)),positions=new Set(Object.values(POSITION_SLOTS).flat().concat('SS'));let players=0;
 if(data?.id!==SUPER_DATASET_ID||data?.cutoff!==SUPER_CUTOFF)errors.push({kind:'cutoff',message:'Opening-day dataset identifier and cutoff required.'});
 if(data?.clubs?.length!==20)errors.push({kind:'membership',message:'Exactly twenty clubs required.'});
 const registryIds=new Set();for(const club of [...(data?.clubs||[]),...(data?.supportingClubs||[])]){if(typeof club.id!=='string'||!club.id.trim()||registryIds.has(club.id)||typeof club.name!=='string'||!club.name.trim())errors.push({kind:'club-registry',club:club.id,message:'Club registry needs unique IDs and names, including external parents.'});registryIds.add(club.id);}
 for(const club of data?.supportingClubs||[])if(!proven(club.evidence,SUPER_CUTOFF))errors.push({kind:'supporting-club-evidence',club:club.id});
 for(const club of data?.clubs||[]){clubs.add(club.id);counts[club.country]=(counts[club.country]||0)+1;
  if(!proven(club.membership,SUPER_CUTOFF)||!proven(club.coverage,SUPER_CUTOFF))errors.push({kind:'club-evidence',club:club.id,message:'Final-table membership and complete cutoff squad coverage require evidence.'});
  for(const p of club.players||[]){players++;const issue=kind=>errors.push({kind,club:club.id,player:p.id});
   if(!p.id||profiles.has(p.id))issue('profile-identity');profiles.add(p.id);
   if(!p.personId||seen.has(p.personId))issue('identity');seen.add(p.personId);
   try{dayNumber(p.birthDate);if(p.birthDate>=SUPER_CUTOFF)issue('birth-date');}catch{issue('birth-date');}
   if(!Array.isArray(p.positions)||!p.positions.length||p.positions.some(pos=>!positions.has(pos)))issue('natural-positions');
   for(const fact of ['identity','birthDate','registration','ownership','positions'])if(!proven(p.evidence?.[fact],SUPER_CUTOFF))issue(fact+'-evidence');
   if(!p.owner||p.registeredClub!==club.id)issue('registration');
   if(p.owner&&!registry.has(p.owner))issue('owner-registry');
   if(p.owner&&p.owner!==p.registeredClub){try{dayNumber(p.loan?.end);dayNumber(p.loan?.start);if(p.loan.end<=SUPER_CUTOFF||p.loan.start>SUPER_CUTOFF||p.loan.start>=p.loan.end||p.loan.returnClub!==p.owner)issue('loan-return');}catch{issue('loan-return');}if(!proven(p.loan?.evidence,SUPER_CUTOFF))issue('loan-evidence');const terms=p.loan?.gameTerms;if(!terms||!['authored','published','reported'].includes(terms.basis)||!terms.note||!Number.isSafeInteger(terms.fullWeeklyWageGbp)||terms.fullWeeklyWageGbp<0||!Number.isInteger(terms.borrowerSharePercent)||terms.borrowerSharePercent<0||terms.borrowerSharePercent>100||p.gameTerms?.wage?.value!==Math.round(terms.fullWeeklyWageGbp*terms.borrowerSharePercent/100)||terms.basis!=='authored'&&!proven(terms.evidence,SUPER_CUTOFF))issue('loan-terms');}
   else if(p.loan)issue('loan-registration');
   for(const key of ['contract','wage']){const term=p.gameTerms?.[key];if(!term||!['published','reported','authored'].includes(term.basis)||!term.note)issue(key+'-terms');else{if(term.basis!=='authored'&&!proven(term.evidence,SUPER_CUTOFF))issue(key+'-evidence');if(key==='contract'){try{dayNumber(term.value);if(term.value<=SUPER_CUTOFF||p.loan?.end>term.value)issue('contract-terms');}catch{issue('contract-terms');}}else if(!Number.isSafeInteger(term.value)||term.value<0)issue('wage-terms');}}
  }
  try{selectPositionTeam(club.players||[]);}catch{errors.push({kind:'position-cover',club:club.id});}
  if((club.players||[]).filter(p=>p.role==='GK').length<2||(club.players||[]).length<14)errors.push({kind:'bench-cover',club:club.id});
 }
 for(const [country,n]of Object.entries(quotas))if(counts[country]!==n)errors.push({kind:'quota',country});
 if(clubs.size!==20)errors.push({kind:'club-identity'});
 return {id:SUPER_DATASET_ID,cutoff:SUPER_CUTOFF,ready:errors.length===0,clubs:clubs.size,players,errors};
}
