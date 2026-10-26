import {rng,simulateFast} from './competition.js';
import {canPlayPosition} from './player-positions.js';
import {positionProfile} from './manager-positions.js';
import {incidentSquad,incidentMatch} from './career-availability.js';
import {incidentTimeline,incidentTime} from './match-incidents.js';
export function simulateCareerMatchV4(home,away,seed,decisive=false){
 const sides=[home,away],context=home.incidentContext;if(!context||JSON.stringify(context)!==JSON.stringify(away.incidentContext))throw Error('Dated fixture incident context required.');
 const match=incidentMatch(home,away,context,'modeled'),random=rng(seed^0x4b23ef),active=sides.map(t=>new Map(incidentSquad(t).filter(p=>!p.absent).map(p=>[p.id,{...p,position:p.assignedPosition}]))),bench=sides.map((t,i)=>match.teams[i].bench.map(p=>t.roster.find(q=>q.id===p.id))),used=active.map(side=>new Set(side.keys())),booked=[new Set(),new Set()],subs=[0,0],windows=[new Set(),new Set()],injuries=[0,0],events=[];
 const add=(type,team,minute,extra={})=>{const e={id:'stat-'+match.incidents.length,sequence:match.incidents.length,type,team,minute,...extra};match.incidents.push(e);return e;};
 const sub=(team,out,p,position,minute)=>{if(minute>=90||subs[team]>=5||windows[team].size>=3&&!windows[team].has(minute))return false;active[team].delete(out);active[team].set(p.id,{...p,position,entered:minute});used[team].add(p.id);subs[team]++;windows[team].add(minute);add('substitution',team,minute,{out,in:p.id,position});return true;};
 const keeper=(team,minute)=>{if([...active[team].values()].some(p=>p.position==='GK'))return;const replacement=bench[team].find(p=>!used[team].has(p.id)&&canPlayPosition(positionProfile(p),'GK')),out=[...active[team].values()].sort((a,b)=>a.defense-b.defense||a.id.localeCompare(b.id))[0];if(replacement&&out&&sub(team,out.id,replacement,'GK',minute))return;const emergency=[...active[team].values()].sort((a,b)=>b.defense-a.defense||a.id.localeCompare(b.id))[0];emergency.position='GK';emergency.emergencyKeeper=true;add('emergency-keeper',team,minute,{player:emergency.id});};
 const base=simulateFast(...sides.map((t,i)=>({...t,attack:t.attack*active[i].size/11,defense:t.defense*active[i].size/11})),seed,decisive),pick=pool=>pool[Math.floor(random()*pool.length)],weighted=(pool,weight)=>{let n=random()*pool.reduce((n,p)=>n+weight(p),0);return pool.find(p=>(n-=weight(p))<0)||pool.at(-1);},scoring={ST:12,SS:10,LW:7,RW:7,AM:6,LM:4,RM:4,CM:3,DM:1,CB:.8,LB:.8,RB:.8,LWB:1.5,RWB:1.5};
 for(let minute=1;minute<=90;minute++){
  for(let team=0;team<2;team++){
   let pool=[...active[team].values()];
   if(random()<(sides[team].preset==='press'?.032:.023)){
    const p=pick(pool);if(!booked[team].has(p.id)){booked[team].add(p.id);add('yellow',team,minute,{player:p.id});}else if(pool.length>7&&random()<.25){active[team].delete(p.id);add('second-yellow',team,minute,{player:p.id});keeper(team,minute);}
   }
   pool=[...active[team].values()];if(pool.length>7&&random()<.00065){const p=pick(pool);active[team].delete(p.id);add('red',team,minute,{player:p.id});keeper(team,minute);}
   pool=[...active[team].values()];if(pool.length>7&&injuries[team]<2&&random()<.0011){const p=pick(pool),position=p.position;injuries[team]++;active[team].delete(p.id);add('injury',team,minute,{player:p.id,recoveryDays:[7,14,21][Math.floor(random()*3)]});const replacement=bench[team].filter(q=>!used[team].has(q.id)&&canPlayPosition(positionProfile(q),position)).sort((a,b)=>b.rating-a.rating||a.id.localeCompare(b.id))[0];if(replacement&&minute<90)sub(team,p.id,replacement,position,minute);keeper(team,minute);}
   if([60,70,80].includes(minute)){
    const limit=minute===80?1:2;for(let n=0;n<limit;n++){
     const choices=[];for(const p of active[team].values())if(p.position!=='GK')for(const q of bench[team])if(!used[team].has(q.id)&&canPlayPosition(positionProfile(q),p.position)){const gain=(q.energy??100)-((p.energy??100)-20*(minute-(p.entered||0))/90)+(q.rating-p.rating)*.5;if(gain>=5)choices.push({p,q,gain});}
     choices.sort((a,b)=>b.gain-a.gain||a.p.id.localeCompare(b.p.id)||a.q.id.localeCompare(b.q.id));const best=choices[0];if(!best||!sub(team,best.p.id,best.q,best.p.position,minute))break;
    }
   }
  }
  for(const e of base.events.filter(e=>e.type==='goal'&&e.minute===minute)){
   const pool=[...active[e.team].values()].filter(p=>p.position!=='GK'),scorer=weighted(pool,p=>(scoring[p.position]||1)*Math.max(1,p.attack));if(active[e.team].size<active[1-e.team].size&&random()>active[e.team].size/active[1-e.team].size)continue;
   const assist=random()<.78?weighted(pool.filter(p=>p.id!==scorer.id),p=>(['CM','AM','LW','RW','LM','RM'].includes(p.position)?3:1)*Math.max(1,p.control)):null;const event={...e,scorer:scorer.name,scorerId:scorer.id,...(assist?{assistId:assist.id}:{})};events.push(event);add('goal',e.team,minute,{player:scorer.id,...(assist?{assist:assist.id}:{})});
  }
 }
 const timeline=incidentTimeline(match),score=[0,1].map(t=>events.filter(e=>e.team===t).length),winner=score[0]===score[1]?decisive?(base.pens?base.winner:random()<.5?home.id:away.id):null:score[0]>score[1]?home.id:away.id,pens=decisive&&score[0]===score[1]?(base.pens|| (winner===home.id?[5,4]:[4,5])):null;
 const playerStats=timeline.rows.map((rows,t)=>rows.map(p=>{const source=sides[t].roster.find(q=>q.id===p.id);return {id:p.id,personId:source.personId||p.id,name:source.name,minutes:p.minutes,started:p.started,goals:events.filter(e=>e.team===t&&e.scorerId===p.id).length,assists:events.filter(e=>e.team===t&&e.assistId===p.id).length};}));
 const condition=Object.fromEntries(playerStats.flatMap((rows,t)=>rows.map(p=>{const source=sides[t].roster.find(q=>q.id===p.id);return [p.id,Math.max(25,(source.energy??100)-(sides[t].preset==='press'?26:sides[t].preset==='protect'?17:20)*p.minutes/90)];})));
 return {...base,engineVersion:'fast-career-4',statisticsVersion:3,simulation:'Modeled football · substitutions, cards, dismissals and dated injuries',score,winner,pens,events:events.concat(match.incidents.filter(e=>!['goal','substitution','emergency-keeper'].includes(e.type)).map(e=>({...e,text:sides[e.team].roster.find(p=>p.id===e.player).name+' · '+e.type}))).sort((a,b)=>a.minute-b.minute),incidentMatch:match,substitutions:match.incidents.filter(e=>e.type==='substitution'),playerStats,played:playerStats.map(rows=>rows.filter(p=>p.minutes>0).map(p=>p.id)),condition};
}
export function validateCareerMatchV4(result,teams=null){
 if(result.statisticsVersion!==3||!['fast-career-4','2.1.0'].includes(result.engineVersion)||result.incidentMatch?.origin!==(result.definition?'recorded':'modeled'))throw Error('Invalid incident-aware result.');
 const timeline=incidentTimeline(result.incidentMatch),match=result.incidentMatch;
 if(match.teams[0].id!==result.home||match.teams[1].id!==result.away)throw Error('Incident clubs do not match the result.');
 for(let t=0;t<2;t++){
  const rows=result.playerStats?.[t],expected=timeline.rows[t];if(!rows||rows.length!==expected.length||new Set(rows.map(p=>p.id)).size!==rows.length)throw Error('Incident appearances must match the timeline.');
  if(teams){const expected=incidentMatch(teams[0],teams[1],teams[0].incidentContext,result.definition?'recorded':'modeled');if(JSON.stringify(expected.teams[t])!==JSON.stringify(match.teams[t]))throw Error('Incident participants must match prepared squads.');}
  for(const p of rows){const span=expected.find(q=>q.id===p.id);if(!span||Math.abs(span.minutes-p.minutes)>1e-8||!Number.isInteger(p.goals)||p.goals<0||teams&&teams[t].roster.find(q=>q.id===p.id)?.personId!==p.personId)throw Error('Incident player identities and minutes must reconcile.');const goals=match.incidents.filter(e=>e.type==='goal'&&e.team===t);if(goals.filter(e=>e.player===p.id).length!==p.goals||!result.definition&&goals.filter(e=>e.assist===p.id).length!==p.assists)throw Error('Incident goal/assist totals must reconcile.');}
  const own=match.incidents.filter(e=>e.type==='own-goal'&&e.team===1-t).length;if(rows.reduce((n,p)=>n+p.goals,0)+own!==result.score[t]||match.incidents.filter(e=>e.type==='goal'&&e.team===t).length+own!==result.score[t]||result.events.filter(e=>e.type==='goal'&&e.team===t).length!==result.score[t])throw Error('Incident goals must reconcile to the score.');
 }
 return timeline;
}
