import {rng,simulateFast} from './competition.js';
import {POSITION_SLOTS,canPlayPosition} from './player-positions.js';
import {positionProfile} from './manager-positions.js';

export function positionBench(team){
 const available=team.roster.filter(p=>!team.xi.includes(p.id));
 if(Array.isArray(team.matchBench))return [...team.matchBench];
 const chosen=[],labels=POSITION_SLOTS[team.formation],remaining=()=>available.filter(p=>!chosen.includes(p.id));
 const keeper=remaining().filter(p=>canPlayPosition(positionProfile(p),'GK')).sort((a,b)=>b.rating-a.rating||a.id.localeCompare(b.id))[0];if(keeper)chosen.push(keeper.id);
 while(chosen.length<9&&remaining().length){const best=remaining().map(p=>({p,score:new Set(labels.filter(label=>canPlayPosition(positionProfile(p),label)&&!chosen.some(id=>canPlayPosition(positionProfile(available.find(q=>q.id===id)),label)))).size*1000+p.rating+(p.energy??100)*.2})).sort((a,b)=>b.score-a.score||a.p.id.localeCompare(b.p.id))[0];chosen.push(best.p.id);}
 return chosen;
}
const weights={ST:12,SS:10,LW:7,RW:7,AM:6,LM:4,RM:4,CM:3,DM:1,CB:.8,LB:.8,RB:.8,LWB:1.5,RWB:1.5,GK:0};
export function simulateCareerMatchV3(home,away,seed,decisive=false){
 const sides=[home,away],base=simulateFast(home,away,seed,decisive),random=rng(seed^0x3b75ef),rows=[],active=[],substitutions=[];
 for(const [t,team]of sides.entries()){
  const labels=POSITION_SLOTS[team.formation],lineup=team.xi.map(id=>team.roster.find(p=>p.id===id));if(lineup.length!==11||lineup.some(p=>!p))throw Error('Complete starting XI required.');
  const records=lineup.map((p,i)=>({id:p.id,personId:p.personId||p.id,name:p.name,minutes:90,goals:0,assists:0,position:labels[i],entered:0,left:90})),used=new Set(team.xi),bench=positionBench(team).map(id=>team.roster.find(p=>p.id===id)).filter(Boolean);
  for(const [minute,limit]of [[60,2],[70,2],[80,1]]){
   const candidates=[];
   for(let slot=1;slot<11;slot++){const outgoing=records[slot];if(outgoing.left!==90)continue;const p=lineup[slot],energy=(p.energy??100)-20*minute/90;
    for(const q of bench.filter(q=>!used.has(q.id)&&canPlayPosition(positionProfile(q),labels[slot]))){const score=(q.energy??100)-energy+(q.rating-p.rating)*.5;if(score>=5)candidates.push({slot,q,score});}
   }
   candidates.sort((a,b)=>b.score-a.score||a.slot-b.slot||a.q.id.localeCompare(b.q.id));let count=0;
   for(const {slot,q}of candidates){if(count>=limit)break;if(used.has(q.id)||records[slot].left!==90)continue;used.add(q.id);records[slot].left=minute;records[slot].minutes=minute;records.push({id:q.id,personId:q.personId||q.id,name:q.name,minutes:90-minute,goals:0,assists:0,position:labels[slot],entered:minute,left:90,started:false});substitutions.push({team:t,minute,out:lineup[slot].id,in:q.id,position:labels[slot]});count++;}
  }
  rows.push(records);active.push(minute=>records.filter(p=>p.entered<=minute&&(p.left===90||p.left>minute)));
 }
 const pick=(pool,weight)=>{let n=random()*pool.reduce((s,p)=>s+weight(p),0);return pool.find(p=>(n-=weight(p))<0)||pool.at(-1);};
 const events=base.events.map(event=>{const pool=active[event.team](event.minute).filter(p=>p.position!=='GK'),team=sides[event.team],profile=p=>team.roster.find(q=>q.id===p.id),scorer=pick(pool,p=>(weights[p.position]||1)*Math.max(1,profile(p).attack));scorer.goals++;const e={...event,scorerId:scorer.id,scorer:scorer.name};if(random()<.78){const assist=pick(pool.filter(p=>p!==scorer),p=>(['CM','AM','LW','RW','LM','RM'].includes(p.position)?3:1)*Math.max(1,profile(p).control));assist.assists++;e.assistId=assist.id;}return e;});
 const condition=Object.fromEntries(rows.flatMap((team,t)=>team.map(p=>{const source=sides[t].roster.find(q=>q.id===p.id),cost=(sides[t].preset==='press'?26:sides[t].preset==='protect'?17:20)*p.minutes/90*(1+(80-(source.stamina??80))/200);return [p.id,Math.round(Math.max(25,(source.energy??100)-cost)*100)/100];})));
 return {...base,engineVersion:'fast-career-3',statisticsVersion:2,simulation:'Modeled statistical match · position-eligible changes, minutes and fatigue · no physical replay',events,substitutions:substitutions.sort((a,b)=>a.minute-b.minute||a.team-b.team),playerStats:rows.map(team=>team.map(({id,personId,name,minutes,goals,assists,started})=>({id,personId,name,minutes,goals,assists,...(started===false?{started:false}:{})}))),played:rows.map(team=>team.map(p=>p.id)),condition};
}
export function validateCareerMatchV3(result,teams=null){
 if(result.engineVersion!=='fast-career-3'||!Array.isArray(result.playerStats)||result.playerStats.length!==2||!Array.isArray(result.substitutions)||!Array.isArray(result.events))throw Error('Invalid modeled match record.');
 for(let t=0;t<2;t++){
  const rows=result.playerStats[t],subs=result.substitutions.filter(s=>s.team===t);if(rows.length<11||rows.length>16||subs.length>5||new Set(subs.map(s=>s.minute)).size>3||new Set(rows.map(p=>p.id)).size!==rows.length||rows.some(p=>!Number.isInteger(p.minutes)||p.minutes<1||p.minutes>90||!Number.isInteger(p.goals)||p.goals<0||!Number.isInteger(p.assists)||p.assists<0)||rows.reduce((n,p)=>n+p.minutes,0)!==990||rows.reduce((n,p)=>n+p.goals,0)!==result.score[t])throw Error('Modeled appearances, minutes and goals must reconcile.');
  const starters=rows.slice(0,11),active=starters.map(p=>p.id),intervals=new Map(starters.map(p=>[p.id,[0,90]])),team=teams?.[t];
  if(starters.some(p=>p.started===false)||rows.slice(11).some(p=>p.started!==false)||team&&starters.some((p,i)=>p.id!==team.xi[i]))throw Error('Statistics must match the starting XI.');
  const used=new Set(active);for(const sub of subs){const slot=active.indexOf(sub.out);if(slot<0||!starters.some(p=>p.id===sub.out)||used.has(sub.in)||!Number.isInteger(sub.minute)||sub.minute<1||sub.minute>=90||!rows.find(p=>p.id===sub.in))throw Error('Invalid modeled substitution.');if(team){const p=team.roster.find(p=>p.id===sub.in);if(!positionBench(team).includes(sub.in)||!p||!canPlayPosition(positionProfile(p),POSITION_SLOTS[team.formation][slot])||sub.position!==POSITION_SLOTS[team.formation][slot])throw Error('Substitute must cover the intended position from the selected bench.');}intervals.get(sub.out)[1]=sub.minute;intervals.set(sub.in,[sub.minute,90]);active[slot]=sub.in;used.add(sub.in);}
  if(rows.length!==11+subs.length||rows.some(p=>!intervals.has(p.id)||p.minutes!==intervals.get(p.id)[1]-intervals.get(p.id)[0]||team&&team.roster.find(q=>q.id===p.id)?.personId!==p.personId))throw Error('Player identities and substitution minutes conflict.');
  const goals=result.events.filter(e=>e.type==='goal'&&e.team===t);if(goals.length!==result.score[t]||rows.some(p=>goals.filter(e=>e.scorerId===p.id).length!==p.goals||goals.filter(e=>e.assistId===p.id).length!==p.assists))throw Error('Goal and assist events must reconcile.');
  for(const goal of goals){const onPitch=id=>{const span=intervals.get(id);return span&&goal.minute>=span[0]&&(span[1]===90||goal.minute<span[1]);};if(!Number.isInteger(goal.minute)||goal.minute<1||goal.minute>90||!onPitch(goal.scorerId)||goal.assistId&&(!onPitch(goal.assistId)||goal.assistId===goal.scorerId))throw Error('Scorer and assist must be on the pitch.');}
 }
 if(result.substitutions.some(s=>![0,1].includes(s.team)))throw Error('Invalid substitution team.');
}
