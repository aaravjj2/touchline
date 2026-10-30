import {FIELD} from './club-field.js';
import {overall} from './player-career-core.js';
import {worldClub,createCircuit,hash,clamp} from './career-world.js';
const key=s=>String(s).trim().toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu,'');
const countries={spain:'ESP',england:'ENG',france:'FRA',germany:'GER',italy:'ITA',portugal:'POR',netherlands:'NED',turkey:'TUR',norway:'NOR',greece:'GRE',belgium:'BEL',austria:'AUT',ukraine:'UKR',nepal:'NEP',india:'IND',brazil:'BRA',argentina:'ARG',japan:'JPN',usa:'USA','united states':'USA'};
export const countryCode=s=>countries[key(s)]||String(s).trim().toUpperCase();
export function recruitmentAssessment(c,clubId,{initial=false}={}){
 const club=worldClub(clubId),home=countryCode(c.nation),current=worldClub(c.club),domestic=countryCode(club.country)===home,established=!initial&&countryCode(club.country)===countryCode(current.country),ability=overall(c),minutes=c.seasons.slice(-2).reduce((n,s)=>n+s.minutes,0),reputation=c.reputation,upside=c.age<=21&&c.potential>=90,international=c.access==='international';
 let reason='A role within reach of your current ability.',eligible=true;
 if(clubId.startsWith('academy:'))return {eligible:true,score:35,route:'Local development',reason:'A local development pathway, with lower club strength and a clearer route to minutes. Fictional development club.'};
 if(ability<club.rating-21){eligible=false;reason='The squad needs more established ability.';}
 if(!domestic&&!established&&c.age<18){eligible=false;reason='Touchline opens cross-border recruitment from age 18; this simplifies youth registration rules.';}
 if(initial){
  if(!domestic&&!international){eligible=false;reason='Build a domestic record or an international scouting pathway first.';}
  if(!domestic&&club.rating>Math.min(85,ability+8)){eligible=false;reason='International exposure can open development offers, not an automatic elite contract.';}
  if(club.rating>=87&&!(domestic&&upside&&c.path==='prospect'&&c.depth?.origin==='scouted'&&ability>=70)){eligible=false;reason='Elite academies require a highly scouted domestic prospect in this starting model.';}
 }else{
  if(club.rating>=87&&!(ability>=80&&reputation>=30)&&!(upside&&ability>=74&&reputation>=38)){eligible=false;reason='Elite clubs need a stronger senior record or an exceptional, established youth profile.';}
  if(!domestic&&!established&&!international&&(minutes<1800||reputation<25||ability<70)){eligible=false;reason='An overseas scout needs a sustained senior record before recommending a move.';}
  if(!domestic&&!established&&club.rating>current.rating+16&&(minutes<3600||reputation<40)){eligible=false;reason='A smaller step between leagues is more plausible at this stage.';}
 }
 const fit=clamp(100-Math.abs(club.rating-ability-8)*4,0,100),route=domestic?'Domestic scouting':established?'Established league network':'International scouting';
 if(eligible)reason=(domestic?'Your domestic scouting network opens this conversation. ':established?'You already have a record in this league. ':'Your scouting access and senior record support an overseas conversation. ')+(club.rating>ability+12?'This is a development opportunity; first-team minutes will be difficult.':'The club strength is a plausible next step for your current ability.')+(club.fictional?' Fictional development club.':'')+(initial?'':' Recent minutes: '+minutes+'; reputation '+Math.round(reputation)+'.');
 return {eligible,route,reason,score:fit+(domestic?18:established?12:0)+reputation*.2+(upside&&club.rating>=80?8:0)};
}
export function startingClubOffers(c){
 const local='academy:'+encodeURIComponent(c.nation),circuit=createCircuit(worldClub(local),c.seed,c.season),ids=[local,...FIELD.map(t=>t.id),...circuit.tiers.flat()];
 const list=[...new Set(ids)].map(id=>({id,...recruitmentAssessment(c,id,{initial:true})})).filter(x=>x.eligible).sort((a,b)=>b.score-a.score||hash(a.id)-hash(b.id));
 const featured=list.filter(x=>FIELD.some(t=>t.id===x.id)).slice(0,3),other=list.filter(x=>x.id!==local&&!featured.includes(x));return [list.find(x=>x.id===local),...featured,...other.slice(0,5-featured.length)].filter(Boolean);
}
