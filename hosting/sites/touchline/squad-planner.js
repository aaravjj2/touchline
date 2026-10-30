import {POSITION_SLOTS,canPlayPosition} from './player-positions.js';
import {positionProfile,positionCareer} from './manager-positions.js';
import {legend} from './legends.js';
import {careerAvailability,availabilityFixture} from './career-availability.js';

// Maximum matching prevents a versatile reserve from filling two places at once.
export function matchPositionSlots(players,labels){
 const slots=labels.map(()=>null),pool=players.map(positionProfile).sort((a,b)=>b.rating-a.rating||a.id.localeCompare(b.id)),seenPeople=new Set();
 const visit=(p,seen)=>{for(let i=0;i<labels.length;i++){if(seen.has(i)||!canPlayPosition(p,labels[i]))continue;seen.add(i);if(!slots[i]||visit(slots[i],seen)){slots[i]=p;return true;}}return false;};
 for(const p of pool){if(seenPeople.has(p.personId||p.id))continue;seenPeople.add(p.personId||p.id);visit(p,new Set());}
 return {xi:slots.map(p=>p?.id||null),missing:labels.filter((_,i)=>!slots[i])};
}
export function squadPlan(c,{club='user',exclude=null}={}){
 if(!positionCareer(c))return null;
 const team=c.competition.teams.find(t=>t.id===club),formation=club==='user'?c.formation:team?.formation,labels=POSITION_SLOTS[formation];if(!labels)return null;
 const selected=club==='user'?c.xi:team.lineupSlots||team.xi,fixture=availabilityFixture(c,club),date=fixture.date||c.world.date;
 const ids=club==='user'?c.xi.concat(c.bench):c.world.players.filter(p=>p.registeredClub===club).map(p=>p.profileId);
 const players=[...new Set(ids)].filter(id=>id!==exclude).sort().map(id=>{const entry=c.world.players.find(p=>p.profileId===id),condition=c.condition[id],contracted=entry?entry.registeredClub===club&&(entry.loan?.end||entry.contractEnd)>=date:condition?.contract>0;return {...positionProfile(legend(id)),contracted,absence:careerAvailability(c,id,fixture),energy:club==='user'?condition?.energy??100:c.world.fitness?.energy[id]??100};});
 const contracted=players.filter(p=>p.contracted),available=contracted.filter(p=>!p.absence),match=matchPositionSlots(available,labels);
 const positions=[...new Set(labels)].map(position=>{
  const slots=labels.flatMap((p,i)=>p===position?[i]:[]),eligible=players.filter(p=>canPlayPosition(p,position)),active=eligible.filter(p=>p.contracted&&!p.absence),reserves=active.filter(p=>!selected.includes(p.id));
  const permanentReserve=matchPositionSlots(contracted,[...labels,position]).missing.length===0,availableReserve=matchPositionSlots(available,[...labels,position]).missing.length===0;
  return {position,demand:slots.length,slots,starters:slots.map(i=>selected[i]).filter(id=>id&&id!==exclude),players:eligible,available:active,reserves,permanentReserve,availableReserve,status:match.missing.includes(position)||active.length<slots.length?'missing':!availableReserve?'thin':'covered',kind:permanentReserve?'upgrade':'depth'};
 });
 return {formation,date,players,contracted:contracted.length,available:available.length,size:players.length,positions,missing:match.missing,canFieldXI:match.missing.length===0};
}
export function saleSquadImpact(c,id){
 const before=squadPlan(c),after=squadPlan(c,{exclude:id});if(!before)return null;
 const affected=after.positions.filter(row=>row.status!=='covered'&&(before.positions.find(p=>p.position===row.position)?.status!==row.status||before.positions.find(p=>p.position===row.position)?.available.length!==row.available.length));
 return {before,after,affected,starter:c.xi.includes(id),warnings:[...(after.canFieldXI?[]:['The remaining available squad cannot fill this formation.']),...(after.size<18?[`Only ${after.size} registered squad players would remain.`]:[]),...affected.map(p=>`${p.position}: ${p.available.length} available for ${p.demand} starting place${p.demand===1?'':'s'}; ${p.status==='missing'?'missing cover':'no independently assignable reserve'}.`)]};
}
