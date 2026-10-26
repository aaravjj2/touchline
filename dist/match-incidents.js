import {addDays,dayNumber} from './manager-calendar.js';
import {canPlayPosition,POSITION_SLOTS} from './player-positions.js';

// Shared contract for the next rules version. No existing engine/save opts in implicitly.
// Original Super League rules: separate competition bans; 5 yellows = 1 match,
// second yellow = 1 match, straight red = 3. Injury days are explicit game estimates.
export const INCIDENT_RULES=Object.freeze({version:1,yellowThreshold:5,bookingBan:1,secondYellowBan:1,redBan:3,maxSubs:5,maxWindows:3});
export const incidentTime=e=>e.tick===undefined?e.minute:e.tick/160;
export function incidentTimeline(match){
 if(match?.version!==1||!['modeled','recorded'].includes(match.origin)||!match.fixtureId||!['league','cup'].includes(match.competition)||match.teams?.length!==2||match.teams[0].id===match.teams[1].id||!Array.isArray(match.incidents))throw Error('Invalid incident contract.');
 dayNumber(match.date);const rows=[[],[]],active=[new Map(),new Map()],used=[new Set(),new Set()],bookings=[new Set(),new Set()],injured=[new Set(),new Set()],counts=[0,0],windows=[new Set(),new Set()],ids=new Set();
 const playerIds=new Set();for(const [t,team]of match.teams.entries()){
  if(!team.id||!Array.isArray(team.players)||team.players.length<7||team.players.length>11||!Array.isArray(team.bench)||team.bench.length>9)throw Error('Incident contract requires an XI and selected bench.');
  for(const p of [...team.players,...team.bench]){if(!p.id||playerIds.has(p.id))throw Error('Incident participants must be unique.');playerIds.add(p.id);}
  for(const p of team.players){const r={id:p.id,position:p.position,entered:0,left:90,started:true};rows[t].push(r);active[t].set(p.id,r);used[t].add(p.id);}
  const positions=new Set(Object.values(POSITION_SLOTS).flat().concat('SS'));
  if(team.players.filter(p=>p.position==='GK').length!==1||team.players.some(p=>!positions.has(p.position)))throw Error('Starting positions and one goalkeeper required.');
 }
 const leave=(t,id,minute)=>{const p=active[t].get(id);if(!p)throw Error('Incident player must be on the pitch.');p.left=minute;active[t].delete(id);return p;};
 const ordered=[...match.incidents].sort((a,b)=>incidentTime(a)-incidentTime(b)||a.sequence-b.sequence),sequences=new Set();
 const strength=[{minute:0,players:match.teams.map(t=>t.players.length)}];
 for(let i=0;i<ordered.length;i++){
  const original=ordered[i],e={...original,minute:incidentTime(original)},t=e.team;if(!e.id||ids.has(e.id)||![0,1].includes(t)||!Number.isFinite(e.minute)||e.minute<0||e.minute>90||original.tick!==undefined&&(!Number.isInteger(original.tick)||original.tick<0||original.tick>14400)||original.tick===undefined&&!Number.isInteger(e.minute)||e.minute===0&&!['substitution','emergency-keeper'].includes(e.type)||!Number.isSafeInteger(e.sequence)||e.sequence<0||sequences.has(e.sequence))throw Error('Unique incident identity, order, team and minute required.');ids.add(e.id);sequences.add(e.sequence);
  if(e.type==='substitution'){
   const out=active[t].get(e.out),removed=rows[t].find(p=>p.id===e.out&&p.left<=e.minute&&injured[t].has(e.out)),source=match.teams[t].bench.find(p=>p.id===e.in);
   if(e.minute===90||!source||used[t].has(e.in)||!out&&!removed||!canPlayPosition(source,e.position)||counts[t]>=INCIDENT_RULES.maxSubs)throw Error('Illegal incident substitution.');
   if(out)leave(t,e.out,e.minute);else injured[t].delete(e.out);
   if(out&&out.position!==e.position&&!(e.position==='GK'&&![...active[t].values()].some(p=>p.position==='GK')))throw Error('Substitute must cover the vacated position or replace a missing goalkeeper.');
   if(removed&&removed.position!==e.position)throw Error('Injury substitute must cover the vacated position.');
   const r={id:e.in,position:e.position,entered:e.minute,left:90,started:false};rows[t].push(r);active[t].set(e.in,r);used[t].add(e.in);counts[t]++;windows[t].add(e.minute);if(windows[t].size>INCIDENT_RULES.maxWindows)throw Error('Too many substitution windows.');
  }else if(e.type==='emergency-keeper'){
   const p=active[t].get(e.player);if(!p||[...active[t].values()].some(p=>p.position==='GK'))throw Error('Emergency keeper requires an active player and a missing goalkeeper.');p.position='GK';
  }else{
   if(!active[t].has(e.player))throw Error('Incident player must be on the pitch.');
   if(e.type==='yellow'){if(bookings[t].has(e.player))throw Error('Second booking must dismiss the player.');bookings[t].add(e.player);}
   else if(e.type==='second-yellow'){if(!bookings[t].has(e.player))throw Error('Second yellow requires a first booking.');leave(t,e.player,e.minute);}
   else if(e.type==='red')leave(t,e.player,e.minute);
   else if(e.type==='injury'){if(!Number.isInteger(e.recoveryDays)||e.recoveryDays<1||e.recoveryDays>365)throw Error('Injury needs explicit estimated recovery days.');leave(t,e.player,e.minute);injured[t].add(e.player);}
   else if(e.type==='own-goal'){} 
   else if(e.type==='goal'){if(active.some(side=>![...side.values()].some(p=>p.position==='GK')))throw Error('Resolve goalkeeper cover before restarting play.');if(e.assist&&(e.assist===e.player||!active[t].has(e.assist)))throw Error('Assist must come from another on-pitch player.');}
   else throw Error('Unknown match incident.');
  }
  // Same-minute actions are atomic for goalkeeper cover; goals still use explicit sequence.
  if(!ordered[i+1]||incidentTime(ordered[i+1])!==e.minute){for(const side of active){if(side.size<7||side.size>11)throw Error('Abandonment needs a separate supported rule; retain at least seven players.');if([...side.values()].filter(p=>p.position==='GK').length!==1)throw Error('Resolve goalkeeper dismissal/injury with a replacement or emergency keeper.');}strength.push({minute:e.minute,players:active.map(side=>side.size)});}
 }
 return {rows:rows.map(side=>side.map(p=>({...p,minutes:p.left-p.entered}))),strength,substitutions:counts,incidents:ordered};
}
export function createAvailability(){return {version:1,yellows:{league:{},cup:{}},bans:{league:{},cup:{}},injuries:{},commits:{}};}
export function incidentSignature(match){let a=2166136261,b=2246822519;for(const c of JSON.stringify(match)){const n=c.codePointAt(0);a=Math.imul(a^n,16777619);b=Math.imul(b^n,3266489917);}return (a>>>0).toString(16).padStart(8,'0')+(b>>>0).toString(16).padStart(8,'0');}
export function availabilityReason(state,player,date,competition){
 if(!state)return null;if(state.version!==1)throw Error('Unsupported availability version.');dayNumber(date);if(!['league','cup'].includes(competition))throw Error('Unknown availability competition.');
 const injury=state.injuries[player],ban=state.bans[competition][player]||0;
 return injury&&date<injury.until?{kind:'injured',until:injury.until,note:'Estimated recovery date'}:ban?{kind:'suspended',matches:ban,competition}:null;
}
export function commitAvailability(state,match,registrations){
 if(state.version!==1)throw Error('Unsupported availability version.');const timeline=incidentTimeline(match),signature=incidentSignature(match);
 if(state.commits[match.fixtureId]){if(state.commits[match.fixtureId]!==signature)throw Error('Conflicting availability retry.');return false;}
 if(state.lastDate&&match.date<state.lastDate)throw Error('Availability cannot move backwards.');
 const next=structuredClone(state),competition=match.competition;
 for(const team of match.teams){const registered=registrations[team.id];if(!Array.isArray(registered)||new Set(registered).size!==registered.length)throw Error('Current club registrations required to serve bans.');for(const p of [...team.players,...team.bench])if(!registered.includes(p.id)||availabilityReason(state,p.id,match.date,competition))throw Error('Unavailable or unregistered match participant.');for(const id of registered)if(next.bans[competition][id]>0)next.bans[competition][id]--;}
 const second=new Set(timeline.incidents.filter(e=>e.type==='second-yellow').map(e=>e.player));
 for(const e of timeline.incidents){
  if(e.type==='yellow'&&!second.has(e.player)){const n=(next.yellows[competition][e.player]||0)+1;next.yellows[competition][e.player]=n%INCIDENT_RULES.yellowThreshold;if(n>=INCIDENT_RULES.yellowThreshold)next.bans[competition][e.player]=(next.bans[competition][e.player]||0)+INCIDENT_RULES.bookingBan;}
  if(e.type==='second-yellow'||e.type==='red')next.bans[competition][e.player]=(next.bans[competition][e.player]||0)+(e.type==='red'?INCIDENT_RULES.redBan:INCIDENT_RULES.secondYellowBan);
  if(e.type==='injury')next.injuries[e.player]={until:addDays(match.date,e.recoveryDays),fixtureId:match.fixtureId,estimatedDays:e.recoveryDays};
 }
 next.lastDate=match.date;next.commits[match.fixtureId]=signature;Object.assign(state,next);return true;
}
