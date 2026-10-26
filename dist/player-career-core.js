import {FIELD} from './club-field.js';
import {fixtureDefinition,playDefinition,fixtureResult} from './fixture-engine.js';
import {playerPerformance} from './player-performance.js';
import {rng} from './competition.js';
export const POSITIONS={GK:'Goalkeeper',DEF:'Defender',MID:'Midfielder',FWD:'Forward'};
export const FOCUSES={balanced:'All-round development',attack:'Finishing & movement',control:'Passing & first touch',defense:'Defending / goalkeeping',stamina:'Conditioning',recovery:'Rest & recovery'};
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export function overall(c){const a=c.attributes;return Math.round(c.role==='GK'?a.defense*.75+a.control*.2+a.stamina*.05:c.role==='DEF'?a.defense*.6+a.control*.2+a.stamina*.2:c.role==='MID'?a.control*.5+a.attack*.2+a.defense*.15+a.stamina*.15:a.attack*.65+a.control*.25+a.stamina*.1);}
export function createPlayerCareer({name,role='FWD',age=18,nation='India',foot='Right',path='academy',club='club23',seed=123,id='player-'+seed}={}){
 name=String(name||'').trim().slice(0,28);if(!name)throw Error('Give your player a name.');
 if(!POSITIONS[role]||!['Right','Left','Both'].includes(foot)||!['academy','late','prospect'].includes(path))throw Error('Choose valid player details.');
 age=Number(age);if(!Number.isInteger(age)||age<16||age>24)throw Error('Starting age must be 16–24.');
 if(!FIELD.some(t=>t.id===club))throw Error('Choose a starting club.');
 const start={academy:64,late:60,prospect:72}[path],a={attack:start-12,defense:start-12,control:start-5,stamina:72};
 if(role==='FWD')a.attack=start+4;if(role==='MID')a.control=start+6;if(role==='DEF'||role==='GK')a.defense=start+5;
 return {version:1,id,seed:seed>>>0,name,role,startAge:age,age,nation:String(nation).trim().slice(0,32)||'Unspecified',foot,path,club,season:1,week:0,attributes:a,potential:path==='prospect'?94:path==='academy'?91:87,energy:100,morale:70,trust:path==='prospect'?62:48,reputation:15,focus:'balanced',intensity:'normal',injury:0,contract:76,wage:path==='prospect'?3500:1200,earnings:0,offers:[],history:[],seasons:[],transfers:[],lastMatch:null,retired:false,totals:{appearances:0,minutes:0,goals:0,shots:0,saves:0,recoveries:0}};
}
export function playerProfile(c){return {id:c.id,name:c.name,role:c.role,rating:overall(c),...c.attributes,energy:c.energy,number:9,ratingSource:'Created player development'};}
export function careerAdvice(c){
 if(c.injury)return `Rehabilitation: ${c.injury} week${c.injury===1?'':'s'} remaining. Rest improves readiness without rushing selection.`;
 if(c.energy<65)return 'Fatigue is limiting selection and match energy. Choose recovery or a lighter training week.';
 if(c.contract<=8)return 'Your contract is nearly over. Renew at your club or consider an available offer.';
 const club=FIELD.find(t=>t.id===c.club);if(overall(c)<club.rating-12)return 'This squad is competitive for your ability. A development club can offer more minutes than a bigger badge.';
 return c.trust<55?'Build trust through preparation and useful performances. Starting places are earned.':'Your preparation is healthy. Specialize training around the role you want to play.';
}
function recordSeason(c){const rows=c.history.filter(h=>h.season===c.season),played=rows.filter(h=>h.minutes>0);return {season:c.season,age:c.age,club:c.club,appearances:played.length,goals:rows.reduce((n,h)=>n+h.goals,0),saves:rows.reduce((n,h)=>n+h.saves,0),minutes:rows.reduce((n,h)=>n+h.minutes,0),overall:overall(c),average:played.length?played.reduce((n,h)=>n+h.rating,0)/played.length:0};}
export function advancePlayerWeek(c){
 if(c.retired||c.week>=38)throw Error('Finish the season review before continuing.');
 if(!FOCUSES[c.focus]||!['light','normal','intense'].includes(c.intensity))throw Error('Choose valid preparation.');
 const random=rng((c.seed^Math.imul(c.season*100+c.week+1,0x9e3779b9))>>>0),wasInjured=c.injury>0;
 c.energy=clamp(c.energy+(c.focus==='recovery'?32:c.intensity==='light'?24:c.intensity==='intense'?10:18),25,100);
 const growth=(c.age<23?.11:c.age<28?.065:c.age<32?.025:0)*(c.intensity==='intense'?1.5:c.intensity==='light'?.65:1)*(c.energy/100);
 if(!wasInjured&&c.focus!=='recovery')for(const k of Object.keys(c.attributes))if(c.focus==='balanced'||k===c.focus)c.attributes[k]=Math.min(c.potential,c.attributes[k]+growth*(c.focus==='balanced'?.5:1.8));
 c.week++;if(wasInjured)c.injury--;
 const club=FIELD.find(t=>t.id===c.club),opp=FIELD.filter(t=>t.id!==c.club)[(c.week-1+(c.season-1)*7)%35];
 const selection=clamp(.42+(overall(c)-(club.rating-12))*.025+(c.trust-50)*.008+(c.energy-80)*.004,.08,.96);
 const starts=!wasInjured&&c.contract>0&&random()<selection;
 const substitute=!starts&&!wasInjured&&c.contract>0&&random()<.65;
 const team=structuredClone(club),profile=playerProfile(c);team.formation='4-3-3';
 const side=c.week%2===1?0:1,def=fixtureDefinition(side?opp:team,side?team:opp,(c.seed+c.season*10000+c.week*113)>>>0),slot=def.rosters[side].findIndex(p=>p.role===c.role),commands=[];
 let minutes=0;
 if(starts){def.rosters[side][slot]=profile;minutes=90;}
 else if(substitute){def.reserves[side].unshift(profile);def.reserves[side]=def.reserves[side].slice(0,9);commands.push({type:'sub',team:side,out:def.rosters[side][slot].id,in:c.id,tick:60*160});minutes=30;}
 const state=playDefinition(def,commands),result=fixtureResult(def,state),stats=playerPerformance(def,state)[side].find(p=>p.id===c.id),score=side?[...state.score].reverse():state.score,win=score[0]>score[1],draw=score[0]===score[1];
 const rating=minutes?clamp(6+(stats?.goals||0)*.9+(stats?.shots||0)*.12+(stats?.saves||0)*.18+(stats?.recoveries||0)*.06+(win?.35:draw?0:-.25)-(c.role==='GK'?score[1]*.2:0),4,10):0;
 c.trust=clamp(c.trust+(minutes?(rating>=7?3:rating>=6?1:-2):wasInjured?0:1),5,95);
 c.morale=clamp(c.morale+(minutes?(win?3:draw?0:-2):-2),20,95);
 if(minutes)c.energy=clamp(state.fitness[c.id]??c.energy,25,100);
 let injuryNote='';if(minutes&&!wasInjured&&random()<.015+(c.intensity==='intense'?.025:0)+(c.energy<55?.025:0)){c.injury=1+Math.floor(random()*3);injuryNote=`Workload strain · ${c.injury} weeks recovery`;}
 const hadContract=c.contract>0;c.contract=Math.max(0,c.contract-1);if(hadContract)c.earnings+=c.wage;
 c.reputation=clamp(c.reputation+(minutes?Math.max(-.2,(rating-5.8)*.5):0),0,100);
 const row={season:c.season,week:c.week,club:c.club,opponent:opp.id,home:side===0,score,minutes,rating,selection:wasInjured?'Injured':!hadContract?'Out of contract':starts?'Starter':substitute?'Substitute':'Not selected',goals:stats?.goals||0,shots:stats?.shots||0,saves:stats?.saves||0,recoveries:stats?.recoveries||0,injury:injuryNote,overall:overall(c)};
 c.history.push(row);c.totals.appearances+=minutes?1:0;for(const k of ['minutes','goals','shots','saves','recoveries'])c.totals[k]+=row[k];
 c.lastMatch=minutes?{...result,playerId:c.id}:null;
 if([4,20,24,38].includes(c.week)){
  const candidates=FIELD.filter(t=>t.id!==c.club&&t.rating<overall(c)+19).sort((a,b)=>Math.abs(a.rating-overall(c)-8)-Math.abs(b.rating-overall(c)-8));
  c.offers=candidates.slice(0,3).map(t=>({club:t.id,wage:Math.round((overall(c)-45)*95*(t.rating/80)),weeks:76,expires:c.week===38?39:c.week+3,role:overall(c)>=t.rating-12?'First-team opportunity':'Rotation prospect'}));
 }
 c.offers=c.offers.filter(o=>o.expires>=c.week);
 if(c.week===38)c.seasons.push(recordSeason(c));
 return row;
}
export function acceptPlayerOffer(c,club){
 const offer=c.offers.find(o=>o.club===club&&o.expires>=c.week);if(!offer||c.retired)throw Error('This offer is no longer available.');
 c.transfers.push({season:c.season,week:c.week,from:c.club,to:club,wage:offer.wage});c.club=club;c.wage=offer.wage;c.contract=offer.weeks;c.trust=offer.role==='First-team opportunity'?62:48;c.offers=[];c.lastMatch=null;
}
export function renewPlayerContract(c){if(c.retired)throw Error('This player is retired.');if(c.contract>38)throw Error('Renewal opens in the final 38 weeks.');c.contract=76;c.wage=Math.max(c.wage,Math.round((overall(c)-45)*90));}
export function nextPlayerSeason(c){
 if(c.week!==38||c.retired)throw Error('Complete the season first.');
 c.season++;c.age++;c.week=0;c.energy=100;c.injury=0;c.morale=Math.max(65,c.morale);c.offers=[];c.lastMatch=null;
 if(c.age>=31)for(const k of ['attack','defense','control','stamina'])c.attributes[k]=Math.max(35,c.attributes[k]-(k==='stamina'?1.4:.55));
 if(c.age>=40)c.retired=true;
}
