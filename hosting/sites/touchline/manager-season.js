import {isSuperCareer,superTeam,prepareSuperFixture,commitSuperFixture,advanceSuperCareer} from './super-season.js';
import {createCalendar,scheduleFixture,addDays,daysBetween,commitCalendarResult} from './manager-calendar.js';
import {createCompetition,upcomingFixtures,advance,simulateFast,shuffle,standings} from './competition.js';
import {oppositionField} from './europe-clubs.js';
import {legend} from './legends.js';
import {managerBeforeFixture,managerAfterFixture,managerOwned,managerProfile,managerShouldStop} from './manager-career.js';
const copy=structuredClone,clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const europeanDates=['09-15','09-29','10-20','11-03','11-24','12-08','01-12','01-26','02-16','02-23','03-09','03-16','04-06','04-13','04-27','05-04','05-29'];
const cupDates=['09-05','11-07','01-09','03-06','05-22'];
const dated=(year,md)=>`${Number(md.slice(0,2))<8?year+1:year}-${md}`;
function fit(calendar,fixture){
 let date=fixture.date<calendar.date?addDays(calendar.date,2):fixture.date;
 // Original calendar anchors are game scheduling choices, not official fixture dates.
 for(let i=0;i<400;i++,date=addDays(date,1))try{return scheduleFixture(calendar,{...fixture,date});}catch(e){if(!e.message.includes('rest'))throw e;}
 throw Error('No safe date available for this fixture.');
}
export function enableConnectedSeason(c){
 if(c.competition.round!==0||c.competition.results.length)throw Error('Start connected competitions at a new season boundary.');
 const year=2025+c.season,calendar=createCalendar({id:'manager:'+c.seed+':'+c.season,start:year+'-08-01'}),user=c.competition.teams.find(t=>t.id==='user');
 const europe=createCompetition(oppositionField(user,{format:'europe',seed:c.seed+c.season,hostClub:c.hostClub||legend(c.xi[0]).club}),{seed:c.seed+c.season*1000+50000,format:'europe'});
 const teams=[...c.competition.teams,...europe.teams.filter(t=>!c.competition.teams.some(q=>q.id===t.id))];
 c.connected={version:1,kind:'fantasy',year,calendar,teams,europe,cup:{round:0,remaining:shuffle(c.competition.teams.map(t=>t.id),c.seed+c.season+73),results:[],champion:null},europeRound:0,completed:false,lastRecovery:calendar.date,wageWeeks:[],review:null};
 c.competition.schedule.forEach((pairs,round)=>pairs.forEach(([home,away],i)=>fit(calendar,{id:`league:${round}:${i}`,competition:'league',date:addDays(year+'-08-08',round*7),home,away,round:round+1,seed:c.competition.seed+(round*10+i)*7919+17,decisive:false})));
 enqueueCup(c);enqueueEurope(c);return c;
}
function enqueueCup(c){
 const x=c.connected,cup=x.cup;if(cup.remaining.length===1){cup.champion=cup.remaining[0];return;}
 const n=cup.remaining.length,play=n===20?cup.remaining.slice(0,8):cup.remaining;cup.byes=n===20?cup.remaining.slice(8):[];cup.pending=[];
 const label=n===20?'Preliminary round':n===16?'Round of 16':n===8?'Quarter-finals':n===4?'Semi-finals':'Final';
 for(let i=0;i<play.length;i+=2){const id=`cup:${cup.round}:${i/2}`;cup.pending.push(id);fit(x.calendar,{id,competition:'cup',stage:label,date:dated(x.year,cupDates[cup.round]),home:play[i],away:play[i+1],round:cup.round+1,seed:c.seed+c.season*1000+100000+cup.round*1237+i,decisive:true});}
}
function enqueueEurope(c){
 const x=c.connected;if(x.europe.champion)return;
 for(const [i,f]of upcomingFixtures(x.europe).entries())fit(x.calendar,{...f,id:`europe:${x.europeRound}:${i}`,competition:'europe',date:dated(x.year,europeanDates[x.europeRound]),round:x.europeRound+1});
}
export const connectedNext=c=>c.connected.calendar.fixtures.find(f=>f.status==='scheduled'&&(f.home==='user'||f.away==='user'))||null;
export const connectedRemaining=c=>c.connected.calendar.fixtures.filter(f=>f.status==='scheduled').length;
export function connectedUserTeam(c){
 const t=c.connected.teams.find(t=>t.id==='user');
 return {...t,formation:c.formation,xi:[...c.xi],matchBench:c.management.matchBench,preset:c.management.preset,managerTactics:{build:c.management.build,roles:copy(c.management.roles)},roster:managerOwned(c).map(id=>{const p=legend(id),s=c.condition[id],growth=s.growth||0;return managerProfile(c,{...p,rating:p.rating+growth,attack:p.attack+growth,defense:p.defense+growth,control:p.control+growth,energy:s.energy});})};
}
export function connectedTeam(c,id){if(isSuperCareer(c))return superTeam(c,id);return id==='user'?connectedUserTeam(c):c.connected.teams.find(t=>t.id===id);}
export function prepareConnectedFixture(c,f){
 if(isSuperCareer(c))return prepareSuperFixture(c,f);
 if(f.home!=='user'&&f.away!=='user')return;
 c.connected.calendar.date=f.date;managerBeforeFixture(c);
 if(c.connected.prepared===f.id)return;
 const days=daysBetween(c.connected.lastRecovery,f.date),recovery=c.training==='recovery'?3.5:c.training==='development'?1.5:2.5;
 for(const id of managerOwned(c))c.condition[id].energy=Math.min(100,c.condition[id].energy+Math.max(0,days)*recovery);
 c.connected.lastRecovery=f.date;c.connected.prepared=f.id;
}
function applyUserResult(c,f,r){
 const x=c.connected,home=f.home==='user',score=home?r.score:[...r.score].reverse(),form=score[0]>score[1]?1:score[0]<score[1]?-1:0;
 const week=Math.floor(daysBetween(x.year+'-08-01',f.date)/7),wage=Math.ceil(managerOwned(c).reduce((n,id)=>n+c.condition[id].wage,0));
 const due=Array.from({length:week+1},(_,i)=>i).filter(i=>!x.wageWeeks.includes(i));c.credits-=wage*due.length;x.wageWeeks.push(...due);
 c.credits+=(home?14:8)+(form>0?10:form===0?4:0);
 for(const id of managerOwned(c)){
  const s=c.condition[id],played=r.played?.[home?0:1]?.includes(id)??c.xi.includes(id);
  if(f.competition==='league')s.contract=Math.max(0,s.contract-1);
  s.energy=r.condition?.[id]??Math.max(25,s.energy-(played?(20+(100-legend(id).stamina)*.25)*(c.management.preset==='press'?1.25:c.management.preset==='protect'?.85:1):0));
  s.morale=clamp(s.morale+(played?form*3:-1),20,95);if(played)s.growth=Math.min(3,s.growth+(c.training==='development'?.08:.03));
 }
 c.history.push({date:f.date,competition:f.competition,round:f.round,opponent:connectedTeam(c,home?f.away:f.home).name,home,score});
 managerAfterFixture(c,{...r,stage:f.competition,round:f.round});
}
export function commitConnectedFixture(c,id,r){
 if(isSuperCareer(c))return commitSuperFixture(c,id,r);
 const x=c.connected,f=x.calendar.fixtures.find(f=>f.id===id);if(!f)throw Error('Unknown career fixture.');
 if(f.status==='complete'){if(JSON.stringify(f.result.score)!==JSON.stringify(r.score)||r.seed!==f.seed)throw Error('Conflicting fixture retry.');return false;}
 if(r.home!==f.home||r.away!==f.away||r.seed!==f.seed)throw Error('Fixture identity mismatch.');
 const first=x.calendar.fixtures.find(f=>f.status==='scheduled');if(first?.id!==id)throw Error('Advance earlier scheduled fixtures first.');
 const result={...copy(r),kind:r.definition?'physical':'statistical',recordId:r.definition?x.calendar.id+':'+f.id:undefined};
 x.calendar.date=f.date;commitCalendarResult(x.calendar,id,result);
 if(f.competition==='league'){
  c.competition.results.push({...copy(r),stage:'league',round:f.round,leg:1});
  while(c.competition.round<38&&x.calendar.fixtures.filter(q=>q.competition==='league'&&q.round===c.competition.round+1).every(q=>q.status==='complete'))c.competition.round++;
  if(c.competition.round===38){c.competition.champion=standings(c.competition)[0].id;c.competition.stage='complete';}
 }
 if(f.home==='user'||f.away==='user')applyUserResult(c,f,r);
 if(f.competition==='cup'&&x.cup.pending.every(id=>x.calendar.fixtures.find(f=>f.id===id).status==='complete')){
  const winners=x.cup.pending.map(id=>{const f=x.calendar.fixtures.find(f=>f.id===id);x.cup.results.push({...copy(f.result),stage:f.stage,date:f.date});return f.result.winner;});
  if(winners.some(id=>!id))throw Error('Cup fixture needs a winner.');x.cup.remaining=[...x.cup.byes,...winners];x.cup.round++;enqueueCup(c);
 }
 if(f.competition==='europe'){
  const round=x.calendar.fixtures.filter(q=>q.competition==='europe'&&q.round===f.round);
  if(round.every(q=>q.status==='complete')){
   const overrides=Object.fromEntries(round.map(q=>[q.home+'|'+q.away+'|'+q.seed,q.result]));advance(x.europe,overrides,{fast:true});x.europeRound++;enqueueEurope(c);
  }
 }
 if(c.competition.champion&&x.cup.champion&&x.europe.champion){
  x.completed=true;const rank=standings(c.competition).findIndex(t=>t.id==='user')+1;
  x.review={season:c.season,rank,cupWinner:connectedTeam(c,x.cup.champion).name,europeWinner:connectedTeam(c,x.europe.champion).name,fixtures:c.history.length,closingBalance:c.credits};
  for(const [winner,name]of [[x.cup.champion,'Touchline Cup'],[x.europe.champion,'European Invitational']])if(winner==='user')c.management.honours.push({season:c.season,name});
  const archive=c.management.archive.find(s=>s.season===c.season);if(archive)Object.assign(archive,{connectedReview:copy(x.review),physicalResults:x.calendar.fixtures.filter(f=>f.result?.definition&&(f.home==='user'||f.away==='user')).map(f=>copy(f.result))});
  else c.management.archive.push({season:c.season,rank,objective:c.management.objective.name,achieved:rank<=c.management.objective.rank,credits:c.credits,connectedReview:copy(x.review),physicalResults:x.calendar.fixtures.filter(f=>f.result?.definition&&(f.home==='user'||f.away==='user')).map(f=>copy(f.result))});
 }
 return true;
}
// Worker advances complete fixture checkpoints; stop before live kickoff or after a user fixture.
export async function advanceConnected(c,{mode='next',cancelled=()=>false,onCheckpoint=()=>{},onProgress=()=>{}}={}){
 if(isSuperCareer(c))return advanceSuperCareer(c,{mode,cancelled,onCheckpoint,onProgress});
 let userMatches=0,count=0;
 while(!c.connected.completed&&!cancelled()){
  if(managerShouldStop(c))return {career:c,reason:'decision',count};
  const f=c.connected.calendar.fixtures.find(f=>f.status==='scheduled');if(!f)throw Error('Career calendar has no next fixture.');
  const mine=f.home==='user'||f.away==='user';
  if(mine){prepareConnectedFixture(c,f);if(mode==='manage')return {career:c,reason:'kickoff',fixture:copy(f),count};}
  const r=simulateFast(connectedTeam(c,f.home),connectedTeam(c,f.away),f.seed,f.decisive);commitConnectedFixture(c,f.id,r);count++;if(mine)userMatches++;
  if(mine||count%24===0){await onCheckpoint(c);onProgress({date:f.date,count,userMatches});await new Promise(resolve=>setTimeout(resolve,0));}
  if(mode==='next'&&userMatches)return {career:c,reason:'match',count};
 }
 return {career:c,reason:cancelled()?'cancelled':'complete',count};
}
