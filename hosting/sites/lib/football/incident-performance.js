import {incidentTimeline} from './match-incidents.js';
export function physicalIncidentMatch(def,state){
 return {version:1,origin:'recorded',fixtureId:def.incidentContext.fixtureId,date:def.incidentContext.date,competition:def.incidentContext.competition,teams:def.rosters.map((team,t)=>({id:t?def.away.id:def.home.id,players:team.filter(p=>!p.absent).map(p=>({id:p.id,position:p.assignedPosition})),bench:def.reserves[t].map(p=>({id:p.id,positions:p.positions}))})),incidents:structuredClone(state.incidentLog)};
}
export function incidentPerformance(def,state,match=physicalIncidentMatch(def,state)){
 const timeline=incidentTimeline(match);
 return timeline.rows.map((rows,t)=>rows.map(row=>{
  const p=def.rosters[t].concat(def.reserves[t]).find(p=>p.id===row.id),events=state.events.filter(e=>e.team===t&&(e.playerId===p.id||e.scorerId===p.id));
  return {...p,personId:p.personId||p.id,team:t,minutes:row.minutes,started:row.started,goals:events.filter(e=>e.type==='goal'&&!e.ownGoal).length,ownGoals:state.incidentLog.filter(e=>e.type==='own-goal'&&e.player===p.id).length,assists:null,shots:events.filter(e=>e.type==='shot').length,saves:events.filter(e=>e.type==='save').length,recoveries:events.filter(e=>e.type==='recovery').length};
 }));
}
