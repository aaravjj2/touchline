import {validateDirectCommand} from './direct-play.js';
import {playerPerformance} from './player-performance.js';
import {canPlayPosition} from './player-positions.js';
import {FORMATIONS,copy} from './engine.js';
import {LiveWorld,LIVE_VERSION} from './live-world.js';
import {incidentSquad} from './career-availability.js';
import {physicalSubstitution} from './physical-incidents.js';
import {physicalIncidentMatch,incidentPerformance} from './incident-performance.js';
export const INCIDENT_LIVE_VERSION='2.1.0';
export const RULES_VERSION='attributes-2.3';
export function fingerprint(value){let a=2166136261,b=2246822519;for(const c of JSON.stringify(value)){const n=c.codePointAt(0);a=Math.imul(a^n,16777619);b=Math.imul(b^n,3266489917);}return (a>>>0).toString(16).padStart(8,'0')+(b>>>0).toString(16).padStart(8,'0');}
export function fixtureFingerprint(def){return fingerprint({seed:def.seed,home:def.home.id,away:def.away.id,rules:def.rulesVersion||'legacy-2.0',formation:def.formation,awayFormation:def.awayFormation,preset:def.preset,awayPreset:def.awayPreset,rosters:def.rosters,reserves:def.reserves,initialTactics:def.initialTactics,...(def.controlVersion===1?{controlVersion:1}:{}),...(def.incidentVersion===1?{incidentVersion:1,incidentContext:def.incidentContext}:{})});}
// An explicitly authored movement value, not an imported EA rating.
export function movementPace(p){return p.pace??Math.round(Math.max(45,Math.min(96,(p.role==='GK'?40:48)+(p.role==='FWD'?p.attack:p.role==='MID'?p.control:p.rating)*.42)));}

export function selectSquad(team){
 if(team.incidentContext?.version===1){const xi=incidentSquad(team),bench=(team.matchBench||[]).map(id=>team.roster.find(p=>p.id===id));if(xi.filter(p=>!p.absent).length<7||bench.some(p=>!p)||new Set(xi.filter(p=>!p.absent).concat(bench).map(p=>p.id)).size!==xi.filter(p=>!p.absent).length+bench.length)throw Error('Invalid available match squad.');return {formation:team.formation,xi:copy(xi).map((p,i)=>({...p,pace:movementPace(p),number:i+1})),bench:copy(bench).map((p,i)=>({...p,pace:movementPace(p),number:i+12}))};}
 const formation=team.formation||'4-3-3',pool=[...(team.roster||[])].sort((a,b)=>b.rating-a.rating),used=new Set();
 const xi=team.xi?team.xi.map(id=>pool.find(p=>p.id===id)):FORMATIONS[formation].map(slot=>{const p=pool.find(p=>p.role===slot.role&&!used.has(p.id));if(p)used.add(p.id);return p;});
 if(xi.length!==11||xi.some((p,i)=>!p||p.role!==FORMATIONS[formation][i].role)||new Set(xi.map(p=>p.id)).size!==11)throw Error('Incomplete match squad for '+team.name);
 const remaining=pool.filter(p=>!xi.some(q=>q.id===p.id)),reserves=[];if(Array.isArray(team.matchBench)){if(team.matchBench.length>9||new Set(team.matchBench).size!==team.matchBench.length||team.matchBench.some(id=>!remaining.some(p=>p.id===id)))throw Error('Invalid match bench.');return {formation,xi:copy(xi).map((p,i)=>({...p,pace:movementPace(p),number:i+1})),bench:team.matchBench.map((id,i)=>({...copy(remaining.find(p=>p.id===id)),pace:movementPace(remaining.find(p=>p.id===id)),number:i+12}))};}
 for(const role of ['GK','DEF','DEF','MID','MID','FWD','FWD']){const p=remaining.find(p=>p.role===role&&!reserves.includes(p));if(p)reserves.push(p);}
 for(const p of remaining)if(reserves.length<9&&!reserves.includes(p))reserves.push(p);
 return {formation,xi:copy(xi).map((p,i)=>({...p,pace:movementPace(p),number:i+1})),bench:copy(reserves).map((p,i)=>({...p,pace:movementPace(p),number:i+12}))};
}
export function fixtureDefinition(home,away,seed){
 const h=selectSquad(home),a=selectSquad(away),incidents=home.incidentContext?.version===1;if(incidents&&JSON.stringify(home.incidentContext)!==JSON.stringify(away.incidentContext))throw Error('Incident fixture context must match both teams.');
 return {...(incidents?{incidentVersion:1,incidentContext:copy(home.incidentContext)}:{}),controlVersion:1,version:incidents?INCIDENT_LIVE_VERSION:LIVE_VERSION,rulesVersion:incidents?'incidents-1':RULES_VERSION,catalogVersion:'2026-10-19',fixtureId:incidents?home.incidentContext.fixtureId:[home.id,away.id,seed,RULES_VERSION].join(':'),seed,home:copy(home),away:copy(away),formation:h.formation,awayFormation:a.formation,rosters:[h.xi,a.xi],reserves:[h.bench,a.bench],preset:home.preset||'balanced',awayPreset:away.preset||'balanced',...((home.managerTactics||away.managerTactics)?{initialTactics:[home.managerTactics||{},away.managerTactics||{}]}:{})};
}
export function fixtureState(def){
 const s={version:def.version,engineVersion:def.version,seed:def.seed,minute:0,score:[0,0],shots:[0,0],xg:[0,0],recoveries:[0,0],possession:[0,0],territory:50,formation:def.formation,awayFormation:def.awayFormation,preset:def.preset,awayPreset:def.awayPreset,rosters:copy(def.rosters),reserves:copy(def.reserves),lineup:def.rosters[0].map(p=>p.id),bench:def.reserves[0].map(p=>p.id),fitness:Object.fromEntries(def.rosters.flat().concat(def.reserves.flat()).map(p=>[p.id,p.energy??100])),subs:0,substitutions:[0,0],used:[],usedPlayers:[[],[]],events:[],actions:[],finished:false,club:0,opponent:1,homeClub:def.home,awayClub:def.away,roles:def.initialTactics?def.initialTactics.map(t=>copy(t.roles||{})):[{},{}],buildUps:def.initialTactics?def.initialTactics.map(t=>t.build||'mixed'):['mixed','mixed']};
 if(def.controlVersion===1)s.controlVersion=1;
 if(def.incidentVersion===1)Object.assign(s,{incidentVersion:1,incidentContext:copy(def.incidentContext),incidentLog:[],activeSlots:def.rosters.flat().map(p=>!p.absent),keeperSlots:[0,11],bookings:{},removed:Object.fromEntries(def.rosters.flat().filter(p=>p.absent).map(p=>[p.id,'absent'])),subWindows:[[],[]]});
 s.rulesVersion=def.rulesVersion||'legacy-2.0';s.fixtureId=def.fixtureId;s.catalogVersion=def.catalogVersion;
 const w=new LiveWorld(s);w.energy=def.rosters.flat().map(p=>p.energy??100);w.writeState(s);return s;
}
export function applyCommand(s,command){
 if(s.finished)throw Error('This match is finished.');
 const team=command.team??0;if(team!==0&&team!==1)throw Error('Invalid team.');
 if(command.type==='control'){
  validateDirectCommand(s,command,team);const c={...command,team,tick:s.world.ticks,minute:s.minute};s.actions.push(c);return c;
 }else if(command.type==='preset'){
  if(!['balanced','press','protect'].includes(command.value))throw Error('Unknown approach.');s[team?'awayPreset':'preset']=command.value;
 }else if(command.type==='build'){
  if(!['mixed','short','direct'].includes(command.value))throw Error('Unknown build-up.');(s.buildUps||=(['mixed','mixed']))[team]=command.value;
 }else if(command.type==='role'){
  if(!Number.isInteger(command.slot)||command.slot<1||command.slot>10||!['hold','support','attack'].includes(command.value))throw Error('Choose a valid outfield role.');(s.roles||=[{},{}])[team][command.slot]=command.value;
 }else if(command.type==='sub'&&s.incidentVersion===1){physicalSubstitution(s,team,command.out,command.in);
 }else if(command.type==='sub'){
  const slot=s.rosters[team].findIndex(p=>p.id===command.out),reserve=s.reserves[team].find(p=>p.id===command.in);
  if(slot<0||!reserve||s.substitutions[team]>=5||s.usedPlayers[team].includes(reserve.id))throw Error('Choose an available reserve in the same position.');
  const outgoing=s.rosters[team][slot];
  if(outgoing.assignedPosition){if(!canPlayPosition(reserve,outgoing.assignedPosition))throw Error('This reserve cannot play '+outgoing.assignedPosition+'.');}
  else if(reserve.role!==outgoing.role)throw Error('Choose an available reserve in the same position.');
  s.usedPlayers[team].push(command.out);s.reserves[team]=s.reserves[team].filter(p=>p.id!==command.in);s.rosters[team][slot]=outgoing.assignedPosition?{...reserve,role:outgoing.role,assignedPosition:outgoing.assignedPosition}:reserve;s.substitutions[team]++;s.world.energy[team*11+slot]=s.fitness[reserve.id]??100;
  if(team===0){s.lineup=s.rosters[0].map(p=>p.id);s.bench=s.reserves[0].map(p=>p.id);s.subs=s.substitutions[0];}
 }else throw Error('Unknown manager command.');
 const c={...command,team,tick:s.world.ticks,minute:s.minute};s.actions.push(c);
 s.events.push({id:'command-'+s.actions.length,tick:c.tick,minute:s.minute,team,type:'tactic',text:command.type==='sub'?`${s.rosters[team].find(p=>p.id===command.in).name} comes on.`:command.type==='role'?`Position ${command.slot}: ${command.value}.`:`${command.type==='build'?'Build-up':'Approach'}: ${command.value}.`});
 return c;
}
export function playDefinition(def,commands=[]){
 const s=fixtureState(def);let w=new LiveWorld(s),next=0;
 while(w.ticks<14400){
  while(next<commands.length&&commands[next].tick===w.ticks){w.writeState(s);applyCommand(s,commands[next++]);w=new LiveWorld(s);}
  w.fixed();
 }
 w.writeState(s);return s;
}
export function fixtureResult(def,state,decisive=false){
 const score=[...state.score];let winner=score[0]>score[1]?def.home.id:score[1]>score[0]?def.away.id:null,pens=null;
 if(decisive&&!winner){let x=(def.seed^0x19ab)>>>0;const random=()=>{x=(Math.imul(x,1664525)+1013904223)>>>0;return x/4294967296;};pens=[0,0];for(let i=0;i<5;i++){pens[0]+=random()<.76?1:0;pens[1]+=random()<.76?1:0;}let n=0;while(pens[0]===pens[1]&&n++<30){pens[0]+=random()<.76?1:0;pens[1]+=random()<.76?1:0;}if(pens[0]===pens[1])pens[0]++;winner=pens[0]>pens[1]?def.home.id:def.away.id;}
 return {home:def.home.id,away:def.away.id,seed:def.seed,engineVersion:def.incidentVersion===1?INCIDENT_LIVE_VERSION:LIVE_VERSION,...(def.incidentVersion===1?{statisticsVersion:3,incidentMatch:physicalIncidentMatch(def,state)}:{}),score,shots:[...state.shots],xg:[...state.xg],events:state.events.filter(e=>(def.incidentVersion===1?['goal','shot','save','offside','tactic','foul','yellow','second-yellow','red','injury','emergency-keeper','substitution']:['goal','shot','save','offside','tactic']).includes(e.type)),commands:copy(state.actions),pens,winner,definition:{...copy(def),home:{id:def.home.id,name:def.home.name,color:def.home.color},away:{id:def.away.id,name:def.away.name,color:def.away.color}},playerStats:def.incidentVersion===1?incidentPerformance(def,state):playerPerformance(def,state),condition:copy(state.fitness),played:def.incidentVersion===1?incidentPerformance(def,state).map(rows=>rows.filter(p=>p.minutes>0).map(p=>p.id)):state.rosters.map((r,t)=>[...new Set(r.map(p=>p.id).concat(state.usedPlayers[t]))]),stats:{passes:state.passes,completed:state.completed,territory:state.territory,recoveries:state.recoveries}};
}
export function simulatePhysical(home,away,seed,decisive=false){const def=fixtureDefinition(home,away,seed),s=playDefinition(def);return fixtureResult(def,s,decisive);}
export function coachPerspective(s,team){
 if(!team)return s;
 return {...s,...(s.incidentVersion===1?{activeSlots:[...s.activeSlots.slice(11),...s.activeSlots.slice(0,11)],keeperSlots:[s.keeperSlots[1]-11,s.keeperSlots[0]+11]}:{}),rosters:[s.rosters[1],s.rosters[0]],lineup:s.rosters[1].map(p=>p.id),bench:s.reserves[1].map(p=>p.id),reserves:[s.reserves[1],s.reserves[0]],subs:s.substitutions[1],preset:s.awayPreset,score:[...s.score].reverse(),shots:[...s.shots].reverse(),events:s.events.map(e=>({...e,team:1-e.team,x:e.x===undefined?undefined:100-e.x})),buildUps:[s.buildUps[1],s.buildUps[0]],actions:s.actions.filter(c=>c.team===1)};
}
