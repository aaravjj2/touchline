import {canPlayPosition} from './player-positions.js';
import {coachPerspective} from './fixture-engine.js';
export const COACH_INTENTS=['create','counters','protect'];
export function stateKey(s,team=0){return [s.seed,team,s.actions.length,s.score.join('-'),s.rosters[team].map(p=>p.id).join(','),s[team?'awayPreset':'preset'],s.buildUps[team]].join(':')+(s.incidentVersion===1?':'+s.activeSlots.join(''):'');}
export function coachContext(s,team=0,intent='create'){
 const p=coachPerspective(s,team),energy=Math.round(p.lineup.reduce((n,id)=>n+(p.fitness[id]??100),0)/11);
 const facts=[{id:'score',text:`Score ${p.score.join(' : ')} at ${p.minute} minutes`},{id:'shots',text:`Shots ${p.shots.join(' : ')}`},{id:'energy',text:`Average team energy ${energy}%`}];
 for(const e of p.events.filter(e=>e.minute>=p.minute-10&&['recovery','shot','save','goal','offside'].includes(e.type)).slice(-10))facts.push({id:e.id,text:`${e.minute} minutes: ${e.team===0?'Your team':'Opponent'} ${e.type}${e.high?' high on the pitch':''}`});
 const actions=[...['balanced','press','protect'].filter(v=>v!==p.preset).map(value=>({id:'preset:'+value,command:{type:'preset',value},label:{balanced:'Choose balance',press:'Raise the press',protect:'Protect the lead'}[value]})),...['short','mixed','direct'].filter(v=>v!==p.buildUps[0]).map(value=>({id:'build:'+value,command:{type:'build',value},label:'Use '+value+' build-up'}))];
 if(p.subs<5)for(const id of p.lineup.filter(id=>s.incidentVersion!==1||s.activeSlots[team*11+p.rosters[0].findIndex(q=>q.id===id)])){const out=p.rosters[0].find(q=>q.id===id),reserve=p.reserves[0].find(q=>q.role===out.role&&(s.incidentVersion!==1||canPlayPosition(q,out.assignedPosition)));if(reserve&&(p.fitness[id]??100)<75)actions.push({id:'sub:'+id+':'+reserve.id,command:{type:'sub',out:id,in:reserve.id},label:'Bring on '+reserve.name});}
 return {version:1,stateKey:stateKey(s,team),fixtureId:String(s.seed),minute:s.minute,team,intent:COACH_INTENTS.includes(intent)?intent:'create',formation:p.formation,preset:p.preset,energy,facts,actions};
}
export function validateCoachContext(input){
 if(!input||input.version!==1||typeof input.stateKey!=='string'||input.stateKey.length>3000||typeof input.fixtureId!=='string'||input.fixtureId.length>40||!COACH_INTENTS.includes(input.intent)||!Number.isInteger(input.minute)||input.minute<0||input.minute>=90)throw Error('Invalid match context.');
 if(!Array.isArray(input.facts)||input.facts.length<3||input.facts.length>13||!Array.isArray(input.actions)||input.actions.length<1||input.actions.length>20)throw Error('Invalid match evidence.');
 const facts=input.facts.map(f=>{if(typeof f.id!=='string'||!/^[a-zA-Z0-9-]{1,64}$/.test(f.id)||typeof f.text!=='string'||f.text.length>180)throw Error('Invalid evidence.');return {id:f.id,text:f.text};});
 const actions=input.actions.map(a=>{const c=a.command;if(!c||!['preset','build','sub'].includes(c.type)||typeof a.id!=='string'||a.id.length>250)throw Error('Invalid action.');if(c.type==='preset'&&!['balanced','press','protect'].includes(c.value)||c.type==='build'&&!['short','mixed','direct'].includes(c.value)||c.type==='sub'&&(!/^[\w:-]{1,80}$/.test(c.out)||!/^[\w:-]{1,80}$/.test(c.in)))throw Error('Invalid action.');return {id:a.id,command:c,label:String(a.label||'Apply advice').slice(0,100)};});
 if(new Set(facts.map(f=>f.id)).size!==facts.length||new Set(actions.map(a=>a.id)).size!==actions.length)throw Error('Duplicate evidence or actions.');
 return {version:1,stateKey:input.stateKey,fixtureId:input.fixtureId,minute:input.minute,intent:input.intent,facts,actions};
}
export function validateCoachAnswer(answer,context){
 const action=context.actions.find(a=>a.id===answer?.actionId);
 if(!action||!Array.isArray(answer.evidenceIds)||!answer.evidenceIds.length||answer.evidenceIds.length>3||answer.evidenceIds.some(id=>!context.facts.some(f=>f.id===id)))throw Error('Advice could not be grounded in this match.');
 for(const field of ['reason','tradeoff'])if(typeof answer[field]!=='string'||answer[field].length<8||answer[field].length>240||/[\d<>]/.test(answer[field]))throw Error('Advice contains unverified details.');
 return {actionId:action.id,evidenceIds:answer.evidenceIds,reason:answer.reason,tradeoff:answer.tradeoff,stateKey:context.stateKey};
}
export async function requestCoach(context,{signal,fetcher=fetch}={}){
 const response=await fetcher('/api/coach',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(context),signal});
 const body=await response.json();if(!response.ok)throw Error(body.reason||'AI coach unavailable.');
 return {...validateCoachAnswer(body,context),model:body.model,source:'ai'};
}
