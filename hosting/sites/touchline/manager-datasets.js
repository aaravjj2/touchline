import {dayNumber} from './manager-calendar.js';
// A dataset is never unlocked by its name or by a manually edited ready flag.
export function validateManagerDataset(data){
 const errors=[];
 if(!data||data.version!==1||!data.season||!data.checked||!data.source)errors.push('Missing version, season, date or source.');
 if(!Array.isArray(data?.clubs)||data.clubs.length!==(data.expectedClubCount||20))errors.push('Incomplete league membership.');
 const clubs=new Set(),people=new Set();let unverifiedRegistrations=0,loanedOut=0;
 for(const club of data?.clubs||[]){
  if(!club.id||clubs.has(club.id)||!club.name||!club.source)errors.push('Invalid or duplicate club '+club.id);clubs.add(club.id);
  const roleCount={GK:0,DEF:0,MID:0,FWD:0};
  for(const p of club.players||[]){
   if(!p.id||people.has(p.id))errors.push('Duplicate player identity '+p.id);people.add(p.id);
   if(!p.name||!p.source||!['GK','DEF','MID','FWD'].includes(p.role))errors.push('Incomplete player '+p.id);
   else if(p.registrationStatus!=='loan-out')roleCount[p.role]++;
   if(!p.registeredClub||!p.registrationSource||p.registrationStatus==='unverified')unverifiedRegistrations++;
   if(p.registrationStatus==='loan-out'){loanedOut++;if(!p.registrationSource||!p.loanEnd)errors.push('Unverified loan return date: '+p.name);}
   try{dayNumber(p.birthDate);}catch{errors.push('Unverified birth date: '+p.name);}
   if(!p.ratingSource||['rating','attack','defense','control','stamina'].some(k=>!Number.isFinite(p[k])||p[k]<1||p[k]>99))errors.push('Missing authored profile: '+p.name);
  }
  if(roleCount.GK<2||roleCount.DEF<6||roleCount.MID<5||roleCount.FWD<3)errors.push('Insufficient squad cover: '+club.name);
 }
 if(unverifiedRegistrations)errors.push('Active club registration requires audit: '+unverifiedRegistrations+' players.');
 return {ready:errors.length===0,clubs:clubs.size,players:people.size,unverifiedRegistrations,loanedOut,errors};
}
export const MANAGER_DATASETS=[{id:'eng-2026',name:'England · 2026–27',status:'verification',reason:'Player-pool candidate imported. Active registrations, missing birth dates, complete cup opponents and competition integration still require verification.'},...['Spain','Germany','Italy','France'].map(name=>({id:name.toLowerCase()+'-2026',name:name+' · 2026–27',status:'locked',reason:'Complete league squads and competition rules are not yet verified.'})),{id:'historical-2010',name:'Big five · 2010–11',status:'locked',reason:'Complete historical league membership, squads, birth dates and era-specific cups are not yet verified.'}];
