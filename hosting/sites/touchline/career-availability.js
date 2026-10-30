import {availabilityReason} from './match-incidents.js';
import {POSITION_SLOTS,canPlayPosition} from './player-positions.js';
import {selectPositionTeam,positionProfile} from './manager-positions.js';
export const incidentCareer=c=>c?.matchRulesVersion===4&&c.world?.availability?.version===1;
export function availabilityFixture(c,club='user'){
 return c.connected?.calendar.fixtures.find(f=>f.status==='scheduled'&&(f.home===club||f.away===club))||{date:c.world?.date,competition:'league'};
}
export function careerAvailability(c,id,fixture=availabilityFixture(c)){
 return incidentCareer(c)?availabilityReason(c.world.availability,id,fixture.date,fixture.competition):null;
}
export function availabilityText(reason){return !reason?'Available':reason.kind==='injured'?`Injured · estimated return ${reason.until}`:`Suspended · ${reason.matches} ${reason.competition==='cup'?'cup':'league'} match${reason.matches===1?'':'es'}`;}
export function availableSheet(players,preferred='4-3-3',score=p=>p.rating){
 try{const full=selectPositionTeam(players,preferred,score);return {...full,slots:full.xi,missing:[],emergencyKeeper:null};}catch{}
 let best=null;const pool=players.map(positionProfile).sort((a,b)=>score(b)-score(a)||a.id.localeCompare(b.id));
 for(const formation of [...new Set([preferred,...Object.keys(POSITION_SLOTS)])]){
  const labels=POSITION_SLOTS[formation],slots=labels.map(()=>null),people=new Set();
  const visit=(p,seen)=>{for(let i=0;i<labels.length;i++){if(seen.has(i)||!canPlayPosition(p,labels[i]))continue;seen.add(i);if(!slots[i]||visit(slots[i],seen)){slots[i]=p;return true;}}return false;};
  for(const p of pool){if(people.has(p.personId||p.id))continue;people.add(p.personId||p.id);visit(p,new Set());}
  let emergencyKeeper=null;
  if(!slots[0]){const used=new Set(slots.filter(Boolean).map(p=>p.id)),reserve=pool.find(p=>!used.has(p.id));if(reserve){slots[0]=reserve;emergencyKeeper=reserve.id;}else{const i=slots.findLastIndex((p,i)=>i>0&&p);if(i>0){slots[0]=slots[i];slots[i]=null;emergencyKeeper=slots[0].id;}}}
  const count=slots.filter(Boolean).length;if(!best||count>best.xi.length)best={formation,slots:slots.map(p=>p?.id||null),xi:slots.filter(Boolean).map(p=>p.id),missing:labels.filter((_,i)=>!slots[i]),emergencyKeeper};
 }
 if(!best||best.xi.length<7)throw Error('Fewer than seven available players can cover a legal team. Recruit cover before advancing.');return best;
}
export function incidentSquad(team){
 const labels=POSITION_SLOTS[team.formation],slots=team.lineupSlots||team.xi;
 return slots.map((id,i)=>{const p=team.roster.find(p=>p.id===id);return p?{...positionProfile(p),role:i===0?'GK':['CB','LB','RB','LWB','RWB'].includes(labels[i])?'DEF':['ST','SS','LW','RW'].includes(labels[i])?'FWD':'MID',assignedPosition:labels[i],...(id===team.emergencyKeeper?{emergencyKeeper:true,defense:Math.min(40,p.defense*.4)}:{})}:{id:`absent:${team.id}:${i}`,name:'Unfilled '+labels[i],role:i===0?'GK':'DEF',assignedPosition:labels[i],absent:true,rating:0,attack:0,defense:0,control:0,stamina:0};});
}
export function incidentMatch(home,away,context,origin){
 return {version:1,origin,fixtureId:context.fixtureId,date:context.date,competition:context.competition,teams:[home,away].map(team=>({id:team.id,players:incidentSquad(team).filter(p=>!p.absent).map(p=>({id:p.id,position:p.assignedPosition})),bench:(team.matchBench||[]).map(id=>{const p=team.roster.find(p=>p.id===id);return {id,positions:positionProfile(p).positions};})})),incidents:[]};
}
