import {createCalendar,scheduleFixture,commitCalendarResult,addDays,daysBetween} from './manager-calendar.js';
import {shuffle,simulateFast,standings} from './competition.js';
import {sandboxRoundDate,sandboxCompetition,worldPlayer,sandboxProfile,legalClub,syncSandboxTeams} from './sandbox-world.js';
import {registerWorldDeal,registrationWindowOpen,processWorldRegistrations} from './manager-world.js';
import {managerBeforeFixture,managerAfterFixture,managerShouldStop,managerProfile} from './manager-career.js';
import {selectPositionTeam,positionProfile,positionRoster} from './manager-positions.js';
import {gameFinancialProfile} from './player-intelligence.js';
import {gbpToUnits,unitsToGbp} from './manager-money.js';
import {modernMarket,runCareerMarket,transferCoolingDown} from './career-market.js';
import {simulateCareerFast,validateCareerStatistics,careerStatistics} from './career-statistics.js';
import {simulateCareerMatchV3,positionBench} from './career-match-v3.js';
import {simulateCareerMatchV4} from './career-match-v4.js';
import {incidentCareer,careerAvailability} from './career-availability.js';
import {commitAvailability} from './match-incidents.js';

export const isSuperCareer=c=>c?.careerRulesVersion===2&&c.connected?.kind==='super';
const mine=f=>f.home==='user'||f.away==='user';
function storedResult(c,r,id){const result={...structuredClone(r),kind:r.definition?'physical':'statistical',...(r.definition?{recordId:`${c.connected.calendar.id}:${id}`}:{})};if(c.statisticsVersion>=1&&!r.definition){delete result.condition;delete result.played;}if(c.matchRulesVersion===4&&result.engineVersion==='fast-career-4'&&r.home!=='user'&&r.away!=='user'){delete result.compactStatistics;result.compactStatistics=1;delete result.playerStats;result.events=result.events.filter(e=>e.type==='goal');delete result.substitutions;}return result;}
export const superTeam=(c,id)=>c.competition.teams.find(t=>t.id===id);
const cupDate=(c,round)=>round<4?addDays(sandboxRoundDate(c.season,[7,12,22,28][round]),-7):addDays(sandboxRoundDate(c.season,37),7);
export function enableSuperSeason(c){
 if(c.setup?.kind!=='super-league'||c.competition.round!==0)throw Error('Start a new Super League season.');
 const calendar=createCalendar({id:`super:${c.seed}:${c.season}`,start:`${2025+c.season}-08-01`,minimumRestDays:3});
 c.connected={version:2,kind:'super',calendar,cup:{round:0,remaining:c.world.members.slice(),results:[],champion:null},completed:false,prepared:null,lastRecovery:calendar.date,financeDate:calendar.date,weeklyReports:[],marketDates:[],offers:[],review:null};
 c.world.date=calendar.date;
 c.competition.schedule.forEach((pairs,round)=>pairs.forEach(([home,away],i)=>scheduleFixture(calendar,{id:`league:${round}:${i}`,competition:'league',date:sandboxRoundDate(c.season,round),home,away,round:round+1,seed:c.competition.seed+(round*10+i)*7919+17,decisive:false})));
 enqueueSuperCup(c);return c;
}
function enqueueSuperCup(c){
 const cup=c.connected.cup;if(cup.remaining.length===1){cup.champion=cup.remaining[0];return;}
 const draw=shuffle(cup.remaining,c.seed+c.season*10007+cup.round*7919),play=draw.length===20?draw.slice(0,8):draw;cup.byes=draw.length===20?draw.slice(8):[];cup.pending=[];
 for(let i=0;i<play.length;i+=2){const id=`supercup:${cup.round}:${i/2}`;cup.pending.push(id);scheduleFixture(c.connected.calendar,{id,competition:'cup',stage:['Preliminary round','Round of 16','Quarter-finals','Semi-finals','Final'][cup.round],date:cupDate(c,cup.round),home:play[i],away:play[i+1],round:cup.round+1,seed:c.seed+c.season*100003+cup.round*1237+i,decisive:true});}
}
function syncUser(c){
 const own=c.world.players.filter(p=>p.registeredClub==='user');const owned=new Set(own.map(p=>p.profileId));
 for(const id of Object.keys(c.condition))if(!owned.has(id))delete c.condition[id];
 for(const p of own)if(!c.condition[p.profileId])c.condition[p.profileId]={energy:c.world.fitness?.energy[p.profileId]??100,morale:65,growth:0,contract:100,wage:gbpToUnits(p.wageGbp),promise:'rotation',focus:'balanced',eligible:0,appearances:0,form:0};
 const active=own.filter(p=>p.contractEnd>=c.world.date).map(p=>sandboxProfile(p.profileId));
 if(c.xi.some(id=>!active.some(p=>p.id===id))){const sheet=selectPositionTeam(active,c.formation);c.formation=sheet.formation;c.xi=sheet.xi;}
 c.bench=own.map(p=>p.profileId).filter(id=>!c.xi.includes(id));if(c.management.matchBench?.some(id=>!c.bench.includes(id)))c.management.matchBench=null;
 for(const p of own){const end=p.loan?.end||p.contractEnd;c.condition[p.profileId].contract=end>=c.world.date?Math.max(1,Math.ceil(daysBetween(c.world.date,end)/7)):0;c.condition[p.profileId].wage=gbpToUnits(p.wageGbp);}
}
export function settleSuperDate(c,date,{market=true}={}){
 const x=c.connected,days=daysBetween(x.financeDate,date);if(days<0)throw Error('Cannot reverse career dates.');if(!days)return false;
 if(modernMarket(c)){
  const boundaries=[...new Set(c.world.players.filter(p=>p.loan&&p.loan.end>x.financeDate&&p.loan.end<date).map(p=>p.loan.end))].sort();
  if(boundaries.length){const before=structuredClone(c);try{for(const boundary of boundaries)settleSuperDate(c,boundary,{market:false});return settleSuperDate(c,date,{market});}catch(error){Object.keys(c).forEach(k=>delete c[k]);Object.assign(c,before);throw error;}}
 }
 const snapshot=structuredClone(c);try{
  const start=x.financeDate;c.world.clubs.find(t=>t.id==='user').funds=unitsToGbp(c.credits);
  for(const club of c.world.clubs){if(club.id==='free-agents')continue;
   const wages=c.world.players.filter(p=>p.registeredClub===club.id).reduce((n,p)=>n+p.wageGbp,0)+c.world.players.filter(p=>p.owner===club.id&&p.loan).reduce((n,p)=>n+Math.max(0,(p.loan.fullWageGbp||0)-p.wageGbp),0);
   const yearStart=`${2025+c.season}-08-01`,a=daysBetween(yearStart,start),b=daysBetween(yearStart,date),income=Math.floor(club.annualReceiptsGbp*b/365)-Math.floor(club.annualReceiptsGbp*a/365);let bill=Math.floor(wages*b/7)-Math.floor(wages*a/7);
   if(modernMarket(c))for(const p of c.world.players.filter(p=>p.owner==='user'&&p.contractEnd<date&&(p.registeredClub===club.id||p.owner===club.id&&p.loan))){const end=Math.max(a,daysBetween(yearStart,addDays(p.contractEnd,1))),wage=p.registeredClub===club.id?p.wageGbp:Math.max(0,(p.loan.fullWageGbp||0)-p.wageGbp);if(end<b)bill-=Math.floor(wage*b/7)-Math.floor(wage*end/7);}
   club.funds+=income-bill;if(club.id==='user')c.credits=gbpToUnits(club.funds);
   if(club.id==='user'&&c.matchRulesVersion>=3){for(const [kind,amount,note]of [['operating-income',income,'Authored dated club receipts'],['wages',-bill,'Dated squad wage charge']])if(amount)c.management.ledger.push({id:`date:${start}:${date}:${kind}`,season:c.season,round:c.competition.round,date,kind,amount:gbpToUnits(amount),note});c.management.lastBalance=c.credits;}
  }
  const returning=new Map(c.world.players.filter(p=>p.loan&&p.loan.end<=date).map(p=>[p.id,p.loan.parentWageGbp]));
  c.world.date=date;processWorldRegistrations(c.world,date);for(const p of c.world.players)if(returning.get(p.id)||modernMarket(c)&&returning.has(p.id)&&returning.get(p.id)===0)p.wageGbp=returning.get(p.id);
  if(modernMarket(c))for(const p of c.world.players.filter(p=>p.contractEnd<date&&!p.loan&&p.registeredClub!=='free-agents')){
   const effective=addDays(p.contractEnd,1);if(p.owner==='user'){p.owner=p.registeredClub='free-agents';c.world.expirations||=[];c.world.expirations.push({player:p.id,date:effective,club:'user'});}
   else{const club=c.world.clubs.find(t=>t.id===p.owner),fee=p.wageGbp*4;if(club.funds<fee)throw Error('Opposition contract funding requires attention.');club.funds-=fee;p.contractEnd=`${Number(effective.slice(0,4))+2}-06-30`;c.world.renewals||=[];c.world.renewals.push({player:p.id,date:effective,fee,club:club.id});}
  }
  syncUser(c);x.financeDate=date;x.calendar.date=date;
  for(const id of c.xi.concat(c.bench))c.condition[id].energy=Math.min(100,c.condition[id].energy+days*(c.training==='recovery'?3.5:c.training==='development'?1.5:2.5));
  if(c.world.fitness?.version===1){for(const p of c.world.players)c.world.fitness.energy[p.profileId]=p.registeredClub==='user'?c.condition[p.profileId]?.energy??100:Math.min(100,(c.world.fitness.energy[p.profileId]??100)+days*2.5);c.world.fitness.date=date;}
  x.lastRecovery=date;if(market)runOppositionMarket(c,date);syncUser(c);syncSandboxTeams(c);return true;
 }catch(error){Object.keys(c).forEach(k=>delete c[k]);Object.assign(c,snapshot);throw error;}
}
export function runOppositionMarket(c,date){
 if(modernMarket(c))return runCareerMarket(c,date);
 const x=c.connected;for(const o of x.offers)if(o.status==='open'&&o.expires<date)o.status='expired';if(!registrationWindowOpen(c.world,date)||x.marketDates.includes(date.slice(0,7)))return;
 x.marketDates.push(date.slice(0,7));const changes=[];
 for(const buyer of c.world.clubs.filter(t=>c.world.members.includes(t.id)&&t.id!=='user').sort((a,b)=>a.id.localeCompare(b.id))){
  const team=superTeam(c,buyer.id);if(!team)continue;
  const target=team.roster.filter(p=>team.xi.includes(p.id)).sort((a,b)=>a.rating-b.rating||a.id.localeCompare(b.id))[0];
  const reserved=new Set(c.management.deals.filter(d=>d.stage==='pending').map(d=>d.player));
  const candidates=c.world.players.filter(p=>!reserved.has(p.profileId)&&p.owner===p.registeredClub&&p.registeredClub!==buyer.id&&!p.loan&&p.contractEnd>date&&p.registeredClub!=='free-agents').map(p=>({entry:p,profile:positionProfile(sandboxProfile(p.profileId))})).filter(({profile})=>profile.rating>target.rating&&profile.positions.some(p=>positionProfile(target).positions.includes(p))).sort((a,b)=>b.profile.rating-a.profile.rating||a.entry.id.localeCompare(b.entry.id));
  for(const {entry:p,profile}of candidates){const fee=gameFinancialProfile(profile).feeGbp,wage=gameFinancialProfile(profile).wageGbp;if(buyer.funds<fee+wage*13||c.world.players.filter(p=>p.registeredClub===buyer.id).length>=45||!legalClub(c,p.registeredClub,p.id))continue;
   if(p.registeredClub==='user'){if(!x.offers.some(o=>o.player===p.profileId&&o.status==='open'))x.offers.push({id:`offer:${date}:${buyer.id}:${p.id}`,player:p.profileId,buyer:buyer.id,fee,wage,date,expires:addDays(date,7),status:'open'});break;}
   registerWorldDeal(c.world,{id:`ai:${date}:${buyer.id}:${p.id}`,kind:'transfer',player:p.id,from:p.owner,to:buyer.id,fee},date);p.wageGbp=wage;p.contractEnd=`${2028+c.season}-06-30`;changes.push({player:p.profileId,buyer:buyer.id,fee});break;
  }
 }
 x.weeklyReports.push({date,transfers:changes});for(const o of x.offers)if(o.status==='open'&&o.expires<date)o.status='expired';syncSandboxTeams(c);
}
export function resolveSuperOffer(c,id,accept){
 const snapshot=structuredClone(c);try{const o=c.connected.offers.find(o=>o.id===id);if(!o||o.status!=='open')throw Error('Offer unavailable.');
  if(!accept){o.status='rejected';return;}if(o.expires<c.world.date||!registrationWindowOpen(c.world,c.world.date))throw Error('Offer expired or window closed.');
  if(c.xi.includes(o.player))throw Error('Move the player to the bench and retain a legal XI before selling.');const p=worldPlayer(c,o.player);if(!p||p.owner!=='user'||p.registeredClub!=='user'||p.loan||!legalClub(c,'user',p.id))throw Error('Retain positional cover before accepting this sale.');
  if(modernMarket(c)&&transferCoolingDown(c,p.id))throw Error('This player is settling in after a transfer. Sales reopen after 180 days.');
  const buyer=c.world.clubs.find(t=>t.id===o.buyer);if(c.world.players.filter(p=>p.registeredClub===o.buyer).length>=45||buyer.funds<o.fee+o.wage*13)throw Error('Buyer cannot sustain this agreement.');
  registerWorldDeal(c.world,{id:o.id,kind:'transfer',player:p.id,from:'user',to:o.buyer,fee:o.fee},c.world.date);p.wageGbp=o.wage;p.contractEnd=`${2028+c.season}-06-30`;c.credits=gbpToUnits(c.world.clubs.find(t=>t.id==='user').funds);o.status='accepted';syncUser(c);syncSandboxTeams(c);
  if(c.matchRulesVersion>=3){c.management.ledger.push({id:'sale:'+o.id,season:c.season,round:c.competition.round,date:c.world.date,kind:'sale',amount:gbpToUnits(o.fee),note:sandboxProfile(o.player).name+' → '+buyer.name});c.management.lastBalance=c.credits;}
 }catch(error){Object.keys(c).forEach(k=>delete c[k]);Object.assign(c,snapshot);throw error;}
}
export function prepareSuperFixture(c,f){
 if(incidentCareer(c)){
  settleSuperDate(c,f.date);if(mine(f))managerBeforeFixture(c);syncSandboxTeams(c,[f.home,f.away]);
  const context={version:1,fixtureId:c.connected.calendar.id+':'+f.id,date:f.date,competition:f.competition};
  for(const id of [f.home,f.away]){const team=superTeam(c,id);team.matchBench=positionBench({...team,matchBench:id==='user'&&c.management.matchBench?c.management.matchBench.filter(p=>team.roster.some(q=>q.id===p)):null});team.incidentContext=structuredClone(context);if(id==='user'){team.roster=team.roster.map(p=>{const s=c.condition[p.id],growth=s.growth||0;return managerProfile(c,{...p,rating:p.rating+growth,attack:p.attack+growth,defense:p.defense+growth,control:p.control+growth});});const xi=team.roster.filter(p=>team.xi.includes(p.id)),avg=k=>xi.reduce((n,p)=>n+p[k],0)/xi.length,health=xi.reduce((n,p)=>n+(.82+c.condition[p.id].energy*.0015+(c.condition[p.id].morale-65)*.0007),0)/xi.length;Object.assign(team,{rating:avg('rating'),attack:avg('attack')*health,defense:avg('defense')*health});team.preset=c.management.preset;team.managerTactics={build:c.management.build,roles:structuredClone(c.management.roles)};}}
  c.connected.prepared=f.id;return;
 }
 settleSuperDate(c,f.date);if(!mine(f)){if(c.matchRulesVersion>=3)for(const id of [f.home,f.away]){const team=superTeam(c,id);team.matchBench=positionBench({...team,matchBench:null});}return;}managerBeforeFixture(c);
 const roster=positionRoster(c.xi.concat(c.bench).map(id=>{const p=sandboxProfile(id),s=c.condition[id],growth=s.growth||0;return managerProfile(c,{...p,energy:s.energy,rating:p.rating+growth,attack:p.attack+growth,defense:p.defense+growth,control:p.control+growth});}),c.xi,c.formation),xi=roster.filter(p=>c.xi.includes(p.id)),avg=k=>xi.reduce((n,p)=>n+p[k],0)/11,health=xi.reduce((n,p)=>n+(.82+c.condition[p.id].energy*.0015+(c.condition[p.id].morale-65)*.0007),0)/11;
 const user=superTeam(c,'user');Object.assign(user,{formation:c.formation,xi:[...c.xi],rating:avg('rating'),attack:avg('attack')*health,defense:avg('defense')*health,matchBench:c.management.matchBench,preset:c.management.preset,managerTactics:{build:c.management.build,roles:structuredClone(c.management.roles)},roster});c.connected.prepared=f.id;
 if(c.matchRulesVersion>=3)for(const id of [f.home,f.away]){const team=superTeam(c,id);team.matchBench=positionBench({...team,matchBench:id==='user'?c.management.matchBench:null});}
}
export function commitSuperFixture(c,id,r){
 const snapshot=structuredClone(c);try{const x=c.connected,f=x.calendar.fixtures.find(f=>f.id===id);if(!f)throw Error('Unknown fixture.');
  if(f.status==='complete'){if(JSON.stringify(f.result)!==JSON.stringify(storedResult(c,r,id)))throw Error('Conflicting fixture retry.');return false;}
  if(x.calendar.fixtures.find(f=>f.status==='scheduled')?.id!==id||r.home!==f.home||r.away!==f.away||r.seed!==f.seed||f.decisive&&(![f.home,f.away].includes(r.winner)||r.score[0]===r.score[1]&&(!r.pens||r.pens[0]===r.pens[1])))throw Error('Fixture result does not match the scheduled tie.');
  if(f.decisive){const tied=r.score[0]===r.score[1],pens=r.pens;if(tied&&(!Array.isArray(pens)||pens.length!==2||pens.some(n=>!Number.isInteger(n)||n<0)))throw Error('Cup penalties need a valid score.');const expected=tied?(pens[0]>pens[1]?f.home:f.away):r.score[0]>r.score[1]?f.home:f.away;if(r.winner!==expected)throw Error('Cup winner conflicts with the score.');}
  if(c.statisticsVersion>=1)validateCareerStatistics(r,[superTeam(c,f.home),superTeam(c,f.away)]);
  settleSuperDate(c,f.date);const eligibleIds=incidentCareer(c)?c.xi.concat(c.bench).filter(p=>!careerAvailability(c,p,f)):null;if(incidentCareer(c)){if(r.incidentMatch?.fixtureId!==c.connected.calendar.id+':'+f.id||r.incidentMatch.date!==f.date||r.incidentMatch.competition!==f.competition)throw Error('Incident result date or fixture identity conflicts.');commitAvailability(c.world.availability,r.incidentMatch,Object.fromEntries([f.home,f.away].map(id=>[id,c.world.players.filter(p=>p.registeredClub===id).map(p=>p.profileId)])));}commitCalendarResult(x.calendar,id,storedResult(c,r,id));
  if(f.competition==='league'){const leagueResult=c.statisticsVersion>=1?{home:r.home,away:r.away,seed:r.seed,engineVersion:r.engineVersion,score:[...r.score],pens:r.pens,winner:r.winner}:structuredClone(r);c.competition.results.push({...leagueResult,stage:'league',round:f.round,leg:1});while(c.competition.round<38&&x.calendar.fixtures.filter(q=>q.competition==='league'&&q.round===c.competition.round+1).every(q=>q.status==='complete'))c.competition.round++;if(c.competition.round===38){c.competition.champion=standings(c.competition)[0].id;c.competition.stage='complete';}}
  if(mine(f)){const home=f.home==='user',score=home?r.score:[...r.score].reverse(),form=Math.sign(score[0]-score[1]);for(const id of c.xi.concat(c.bench)){const s=c.condition[id],played=r.played?.[home?0:1]?.includes(id)??c.xi.includes(id);s.energy=r.condition?.[id]??Math.max(25,s.energy-(played?20:0));s.morale=Math.max(20,Math.min(95,s.morale+(played?form*3:eligibleIds&&!eligibleIds.includes(id)?0:-1)));if(played)s.growth=Math.min(3,s.growth+(c.training==='development'?.08:.03));}c.history.push({date:f.date,competition:f.competition,round:f.round,opponent:superTeam(c,home?f.away:f.home).name,home,score});managerAfterFixture(c,{...r,stage:f.competition,round:f.round,...(eligibleIds?{eligibleIds}:{})});}
  if(c.world.fitness?.version===1){for(const [side,id]of [f.home,f.away].entries()){const team=superTeam(c,id),played=r.played?.[side]??team.xi;for(const player of played)c.world.fitness.energy[player]=r.condition?.[player]??Math.max(25,(c.world.fitness.energy[player]??100)-20);}syncSandboxTeams(c,[f.home,f.away]);}
  if(f.competition==='cup'&&x.cup.pending.every(id=>x.calendar.fixtures.find(f=>f.id===id).status==='complete')){const wins=x.cup.pending.map(id=>{const f=x.calendar.fixtures.find(f=>f.id===id);x.cup.results.push({...structuredClone(f.result),date:f.date,stage:f.stage});return f.result.winner;});x.cup.remaining=[...x.cup.byes,...wins];x.cup.round++;enqueueSuperCup(c);}
  if(c.competition.champion&&x.cup.champion){x.completed=true;const rank=standings(c.competition).findIndex(t=>t.id==='user')+1;x.review={season:c.season,rank,cupWinner:superTeam(c,x.cup.champion).name,fixtures:c.history.length,closingBalance:c.credits};if(x.cup.champion==='user')c.management.honours.push({season:c.season,name:'Super Cup'});let archive=c.management.archive.find(a=>a.season===c.season);if(!archive){archive={season:c.season,rank,objective:c.management.objective.name,achieved:rank<=c.management.objective.rank,credits:c.credits,results:structuredClone(c.history)};c.management.archive.push(archive);if(c.competition.champion==='user')c.management.honours.push({season:c.season,name:'Super League champion'});}Object.assign(archive,{connectedReview:structuredClone(x.review),physicalResults:x.calendar.fixtures.filter(f=>mine(f)&&f.result?.definition).map(f=>structuredClone(f.result))});}
  if(x.completed&&c.statisticsVersion>=1){const archive=c.management.archive.find(a=>a.season===c.season);archive.statistics={league:careerStatistics(c),cup:careerStatistics(c,{competition:'cup'})};}
  return true;
 }catch(error){Object.keys(c).forEach(k=>delete c[k]);Object.assign(c,snapshot);throw error;}
}
export async function advanceSuperCareer(c,{mode='next',cancelled=()=>false,onCheckpoint=()=>{},onProgress=()=>{}}={}){
 let count=0,userMatches=0;while(!c.connected.completed&&!cancelled()){
  if(managerShouldStop(c))return {career:c,reason:'decision',count};const f=c.connected.calendar.fixtures.find(f=>f.status==='scheduled');if(!f)throw Error('No scheduled career fixture.');
  prepareSuperFixture(c,f);if(mine(f)&&mode==='manage'){await onCheckpoint(c);return {career:c,reason:'kickoff',fixture:structuredClone(f),count};}
  const result=simulateSuperFixture(c,f);commitSuperFixture(c,f.id,result);count++;if(mine(f))userMatches++;
  if(mine(f)||count%24===0){await onCheckpoint(c);onProgress({date:f.date,count,userMatches});await new Promise(resolve=>setTimeout(resolve,0));}if(mode==='next'&&userMatches)return {career:c,reason:'match',count};
 }return {career:c,reason:cancelled()?'cancelled':'complete',count};
}
export function simulateSuperFixture(c,f){return (c.statisticsVersion===3?simulateCareerMatchV4:c.statisticsVersion===2?simulateCareerMatchV3:c.statisticsVersion===1?simulateCareerFast:simulateFast)(superTeam(c,f.home),superTeam(c,f.away),f.seed,f.decisive);}
export function nextSuperCareerSeason(c){
 if(!c.connected.completed)throw Error('Complete both league and Super Cup before starting the next season.');
 const next=structuredClone(c),date=`${2026+c.season}-08-01`;
 if(!modernMarket(next))for(const p of next.world.players)if(p.contractEnd<date&&!p.loan&&p.registeredClub!=='free-agents'){
  if(p.registeredClub==='user'){p.owner=p.registeredClub='free-agents';}
  else {const club=next.world.clubs.find(t=>t.id===p.owner);const fee=p.wageGbp*4;if(club.funds<fee)throw Error('Opposition contract funding requires attention.');club.funds-=fee;p.contractEnd=`${2028+c.season}-06-30`;next.world.renewals||=[];next.world.renewals.push({player:p.id,date,fee,club:club.id});}
 }
 settleSuperDate(next,date,{market:!modernMarket(next)});next.season++;next.history=[];next.management.processed=[];next.management.matchBench=null;next.management.inbox=next.management.inbox.filter(x=>!x.resolved);next.trust=Math.max(55,next.trust);
 for(const s of Object.values(next.condition)){if(s.promiseReview){s.promiseReview.due-=s.eligible;s.promiseReview.from-=s.eligible;s.promiseReview.appearances-=s.appearances;}s.eligible=0;s.appearances=0;s.form=0;}
 if(incidentCareer(next))next.world.availability.yellows={league:{},cup:{}};
 next.competition=sandboxCompetition(next);enableSuperSeason(next);return next;
}
