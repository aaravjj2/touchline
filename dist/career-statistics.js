import {incidentTimeline} from './match-incidents.js';
import {validateCareerMatchV4} from './career-match-v4.js';
import {rng,simulateFast} from './competition.js';
import {POSITION_SLOTS} from './player-positions.js';
import {validateCareerMatchV3} from './career-match-v3.js';

// A separate, explicit statistical version: never alters an old replay or fast-season-1 result.
export function simulateCareerFast(home,away,seed,decisive=false){
 const result=simulateFast(home,away,seed,decisive),random=rng(seed^0x71ac39);
 const sides=[home,away];
 const rows=sides.map((team,t)=>team.xi.map((id,i)=>{
  const p=team.roster.find(p=>p.id===id);if(!p)throw Error('Statistical match requires a complete selected XI.');
  return {id:p.id,personId:p.personId||p.id,name:p.name,team:t,position:POSITION_SLOTS[team.formation][i],minutes:90,goals:0,assists:0,shots:null,saves:null,recoveries:null};
 }));
 const choose=(pool,weight)=>{const total=pool.reduce((n,p)=>n+weight(p),0);let n=random()*total;return pool.find(p=>(n-=weight(p))<0)||pool.at(-1);};
 const scoring={ST:12,SS:10,LW:7,RW:7,AM:6,LM:4,RM:4,CM:3,DM:1,CB:.8,LB:.8,RB:.8,LWB:1.5,RWB:1.5,GK:0};
 for(const event of result.events){
  const team=sides[event.team],pool=rows[event.team].filter(p=>p.position!=='GK'),scorer=choose(pool,p=>(scoring[p.position]||1)*Math.max(1,team.roster.find(q=>q.id===p.id).attack));
  scorer.goals++;event.scorerId=scorer.id;event.scorer=scorer.name;
  if(random()<.78){const assist=choose(pool.filter(p=>p.id!==scorer.id),p=>(['CM','AM','LW','RW','LM','RM'].includes(p.position)?3:1)*Math.max(1,team.roster.find(q=>q.id===p.id).control));assist.assists++;event.assistId=assist.id;}
 }
 return {...result,engineVersion:'fast-career-2',statisticsVersion:1,simulation:'Modeled statistical match · 90-minute starting XIs · no substitutions or physical replay',playerStats:rows.map(team=>team.map(({id,personId,name,minutes,goals,assists})=>({id,personId,name,minutes,goals,assists}))),played:rows.map(team=>team.map(p=>p.id)),condition:Object.fromEntries(sides.flatMap((team,t)=>rows[t].map(p=>[p.id,Math.max(25,(team.roster.find(q=>q.id===p.id).energy??100)-(team.preset==='press'?26:team.preset==='protect'?17:20))])))};
}
export function careerMatchStatistics(result,identities={}){
 const modeled=result.statisticsVersion===3&&result.engineVersion==='fast-career-4'||result.statisticsVersion===1&&result.engineVersion==='fast-career-2'||result.statisticsVersion===2&&result.engineVersion==='fast-career-3',recorded=!!result.definition;
 if(!modeled&&!recorded)return null;
 const sourceRows=result.compactStatistics===1?incidentTimeline(result.incidentMatch).rows.map((rows,t)=>rows.map(p=>{const identity=identities[p.id];if(!identity?.personId||!identity.name)throw Error('Missing frozen match identity: '+p.id);const goals=result.incidentMatch.incidents.filter(e=>e.type==='goal'&&e.team===t);return {...p,...identity,goals:goals.filter(e=>e.player===p.id).length,assists:goals.filter(e=>e.assist===p.id).length};})):(result.playerStats||[[],[]]);
 const teams=sourceRows.map((rows,t)=>rows.map(p=>({id:p.id,personId:p.personId||p.id,name:p.name,team:t,minutes:p.minutes??null,goals:p.goals??null,assists:modeled?p.assists:null,shots:p.shots??null,saves:p.saves??null,recoveries:p.recoveries??null,...(result.statisticsVersion===3?{ownGoals:result.incidentMatch.incidents.filter(e=>e.type==='own-goal'&&e.player===p.id).length,yellowCards:result.incidentMatch.incidents.filter(e=>e.player===p.id&&['yellow','second-yellow'].includes(e.type)).length,redCards:result.incidentMatch.incidents.filter(e=>e.player===p.id&&['red','second-yellow'].includes(e.type)).length,injuries:result.incidentMatch.incidents.filter(e=>e.player===p.id&&e.type==='injury').length}:{} )})));
 return {version:1,source:modeled?'modeled':'recorded',teams,unattributedGoals:teams.map((rows,t)=>result.score[t]-rows.reduce((n,p)=>n+(p.goals||0),0)-teams[1-t].reduce((n,p)=>n+(p.ownGoals||0),0))};
}
export function validateCareerStatistics(result,teams=null){
 if(result.statisticsVersion===3)return validateCareerMatchV4(result,teams);
 if(result.statisticsVersion===2)return validateCareerMatchV3(result,teams);
 if(result.statisticsVersion!==1)return;
 const stats=careerMatchStatistics(result);
 if(!stats||stats.teams.length!==2||stats.unattributedGoals.some(n=>n!==0))throw Error('Player goals must reconcile with the match score.');
 for(const [t,rows]of stats.teams.entries()){
  if(rows.length!==11||new Set(rows.map(p=>p.id)).size!==11||rows.some(p=>p.team!==t||p.minutes!==90||!Number.isInteger(p.goals)||p.goals<0||!Number.isInteger(p.assists)||p.assists<0)||rows.reduce((n,p)=>n+p.assists,0)>result.score[t])throw Error('Invalid modeled appearances, minutes or assists.');
  if(teams&&rows.some(p=>!teams[t].xi.includes(p.id)||teams[t].roster.find(q=>q.id===p.id)?.personId!==p.personId))throw Error('Player statistics must match the selected team identities.');
 }
 const goals=result.events.filter(e=>e.type==='goal');
 for(let t=0;t<2;t++)if(goals.filter(e=>e.team===t).length!==result.score[t]||stats.teams[t].some(p=>goals.filter(e=>e.team===t&&e.scorerId===p.id).length!==p.goals||goals.filter(e=>e.team===t&&e.assistId===p.id).length!==p.assists))throw Error('Goal and assist events must reconcile with player statistics.');
}
// Derived from committed fixtures: browsing and repeated reads cannot double-count statistics.
export function careerStatistics(c,{competition='league',club=null}={}){
 const fixtures=c.connected.calendar.fixtures.filter(f=>f.status==='complete'&&(competition==='all'||f.competition===competition)&&(club===null||f.home===club||f.away===club)),people=new Map();
 let modeled=0,recorded=0,missing=0;const unattributedGoals=[0,0];
 for(const fixture of fixtures){const stats=careerMatchStatistics(fixture.result,c.world?.matchPeople);if(!stats){missing++;continue;}if(stats.source==='modeled')modeled++;else recorded++;
  stats.teams.forEach((rows,t)=>{const team=t===0?fixture.home:fixture.away;if(club!==null&&team!==club)return;unattributedGoals[t]+=stats.unattributedGoals[t];
   for(const p of rows){if(!(p.minutes>0))continue;const key=team+'|'+p.personId;let row=people.get(key);if(!row){row={id:p.id,personId:p.personId,name:p.name,club:team,appearances:0,minutes:0,goals:0,assists:0,assistsKnown:true,modeled:0,recorded:0,...(c.statisticsVersion===3?{yellowCards:0,redCards:0,injuries:0}:{})};people.set(key,row);}
    row.appearances++;row.minutes+=p.minutes;row.goals+=p.goals||0;row.assists+=p.assists||0;if(p.assists===null)row.assistsKnown=false;row[stats.source]++;if(c.statisticsVersion===3)for(const key of ['yellowCards','redCards','injuries'])row[key]+=p[key]||0;
   }
  });
 }
 return {version:1,competition,fixtures:fixtures.length,modeled,recorded,missing,unattributedGoals,players:[...people.values()].sort((a,b)=>b.goals-a.goals||b.assists-a.assists||a.name.localeCompare(b.name)||a.club.localeCompare(b.club))};
}
