import {positionCareer,selectPositionTeam,positionRoster} from './manager-positions.js';
import {incidentCareer,careerAvailability,availabilityFixture,availableSheet} from './career-availability.js';
import {WORLD_PACKS,SUPER_PACKS} from './super-catalog.js';
import {FOUNDING_PLAYERS} from './founding-squad.js';
import {selectSquad} from './europe-clubs.js';
import {createCompetition} from './competition.js';
import {addDays,dayNumber,createCalendar,scheduleFixture} from './manager-calendar.js';
import {registerWorldDeal,processWorldRegistrations,validateCareerWorld,registrationWindowOpen} from './manager-world.js';
import {gameFinancialProfile,intelligenceFor,contractApplies} from './player-intelligence.js';
import {gbpToUnits,unitsToGbp} from './manager-money.js';
export const SANDBOX_SQUAD_LIMIT=45;
const profiles=new Map(WORLD_PACKS.flatMap(c=>c.players).concat(FOUNDING_PLAYERS).map(p=>[p.id,p]));
export const sandboxProfile=id=>profiles.get(id);
export const hasSandboxWorld=c=>c?.world?.kind==='fictional-sandbox'&&c.world.version===1;
export const isSuperLeague=c=>c?.setup?.kind==='super-league';
export const sandboxLabel=c=>isSuperLeague(c)?'Super League':'Premier League sandbox';
export function sandboxRoundDate(season,round=0){
 const breaks=[7,12,22,28].filter(n=>round>=n).length;
 return addDays(`${2025+season}-08-08`,round*7+breaks*7);
}
export const sandboxDate=c=>positionCareer(c)&&c.connected?c.connected.calendar.date:sandboxRoundDate(c.season,Math.min(37,c.competition?.round||0));
export function sandboxCalendar(c){
 if(positionCareer(c)&&c.connected)return c.connected.calendar;
 const cal=createCalendar({id:c.world.id+':'+c.season,start:`${2025+c.season}-08-01`});
 c.competition.schedule.forEach((pairs,round)=>pairs.forEach(([home,away],i)=>{const f=scheduleFixture(cal,{id:`${cal.id}:${round}:${i}`,date:sandboxRoundDate(c.season,round),competition:sandboxLabel(c),home,away,round:round+1}),r=c.competition.results.find(r=>r.round===round+1&&r.home===home&&r.away===away);if(r){f.status='complete';f.result={score:[...r.score],kind:r.definition?'physical':'statistical'};}}));cal.date=sandboxDate(c);return cal;
}
export const sandboxWindow=c=>registrationWindowOpen(c.world,sandboxDate(c));
const owned=(c,club)=>c.world.players.filter(p=>p.registeredClub===club);
export const worldPlayer=(c,id)=>c.world?.players.find(p=>p.profileId===id);
export function sandboxMarket(c){return c.world.players.filter(p=>p.registeredClub!=='user').map(p=>({...sandboxProfile(p.profileId),club:c.world.clubs.find(t=>t.id===p.registeredClub)?.name,worldOwner:p.owner,worldRegistration:p.registeredClub,onLoan:!!p.loan}));}
export function legalClub(c,club,excluding=null){
 if(club==='free-agents')return true;const removed=excluding instanceof Set?excluding:new Set([excluding]),roster=owned(c,club).filter(p=>!removed.has(p.id)).map(p=>sandboxProfile(p.profileId));
 if(roster.length<14||roster.filter(p=>p.role==='GK').length<2)return false;
 try{positionCareer(c)?selectPositionTeam(roster):selectSquad({players:roster});if(excluding!==null&&incidentCareer(c))selectPositionTeam(roster.filter(p=>!careerAvailability(c,p.id,availabilityFixture(c,club))));return true;}catch{return false;}
}
function clubPlayers(c,club){return owned(c,club).map(p=>sandboxProfile(p.profileId));}
export function sandboxTeams(c,ids=c.world.members){
 if(incidentCareer(c))return ids.map(id=>{
  const club=c.world.clubs.find(t=>t.id===id),fixture=availabilityFixture(c,id),all=id==='user'?c.xi.concat(c.bench).map(sandboxProfile):clubPlayers(c,id),roster=all.filter(p=>!careerAvailability(c,p.id,fixture)).map(p=>({...p,energy:id==='user'?c.condition[p.id]?.energy??100:c.world.fitness.energy[p.id]??100})),available=new Set(roster.map(p=>p.id)),chosen=id==='user'&&c.xi.every(p=>available.has(p))?{formation:c.formation,xi:[...c.xi],slots:[...c.xi],missing:[],emergencyKeeper:null}:availableSheet(roster,id==='user'?c.formation:club.formation,p=>p.rating+(id==='user'&&c.xi.includes(p.id)?1000:0)+(p.energy??100)*.6),xi=chosen.xi.map(id=>roster.find(p=>p.id===id)),avg=k=>xi.reduce((n,p)=>n+p[k],0)/Math.max(1,xi.length);
  return {id,name:club.name,color:club.color,country:club.country,mark:club.name.split(' ').slice(0,2).map(n=>n[0]).join(''),formation:chosen.formation,xi:chosen.xi,lineupSlots:chosen.slots,missingPositions:chosen.missing,emergencyKeeper:chosen.emergencyKeeper,roster:positionRoster(roster,chosen.slots,chosen.formation),rating:avg('rating'),attack:avg('attack'),defense:avg('defense'),managerTactics:{build:'mixed',roles:{}},preset:'balanced',presentation:{color:club.color,pattern:club.pattern,stadium:club.stadium,lighting:club.lighting}};
 });
 return ids.map(id=>{const club=c.world.clubs.find(t=>t.id===id),base=id==='user'?c.xi.concat(c.bench).map(sandboxProfile):clubPlayers(c,id),fitness=c.world.fitness?.version===1,roster=fitness?base.map(p=>({...p,energy:id==='user'?c.condition[p.id]?.energy??100:c.world.fitness.energy[p.id]??100})):base,squad=id==='user'?{formation:c.formation,xi:[...c.xi]}:(positionCareer(c)?selectPositionTeam(roster,club.formation,fitness?p=>p.rating+(p.energy??100)*.6:undefined):selectSquad({players:roster},club.formation)),xi=squad.xi.map(id=>roster.find(p=>p.id===id)),avg=k=>xi.reduce((n,p)=>n+p[k],0)/11;
  return {id,name:club.name,color:club.color,country:club.country,mark:club.name.split(' ').slice(0,2).map(n=>n[0]).join(''),...squad,roster:positionCareer(c)?positionRoster(roster,squad.xi,squad.formation):structuredClone(roster),rating:avg('rating'),attack:avg('attack'),defense:avg('defense'),...(fitness?{managerTactics:{build:'mixed',roles:{}},preset:'balanced'}:{}),presentation:{color:club.color,pattern:club.pattern,stadium:club.stadium,lighting:club.lighting}};
 });
}
export function syncSandboxTeams(c,ids=c.world?.members){
 if(!hasSandboxWorld(c)||!c.competition)return;for(const team of sandboxTeams(c,ids))Object.assign(c.competition.teams.find(t=>t.id===team.id),team);
}
export function sandboxCompetition(c){const comp=createCompetition(sandboxTeams(c),{seed:c.seed+c.season*1000,format:'league'});comp.fieldLabel=sandboxLabel(c)+' · fixed field · 2026–27 snapshot';return comp;}
function termEnd(p){const data=intelligenceFor(p);return contractApplies(p,data)?(data.contract.end.length===4?data.contract.end+'-06-30':data.contract.end):'2029-06-30';}
export function sandboxContractRounds(c,end,startRound=c.competition?.round||0){
 let count=0;const year=Number(end?.slice(0,4));if(!Number.isFinite(year))return 0;
 for(let season=c.season;season<=Math.min(c.season+20,year-2025);season++)for(let round=season===c.season?startRound:0;round<38;round++)if(sandboxRoundDate(season,round)<=end)count++;
 return count;
}
export function initializeSandboxWorld(c){
 if(c.world)throw Error('A world already exists.');const selected=WORLD_PACKS.find(p=>p.id===c.setup.clubId);if(!selected)throw Error('Unknown world club.');
 const field=isSuperLeague(c)?SUPER_PACKS:WORLD_PACKS.filter(p=>p.country==='ENG');
 const windows=Array.from({length:30},(_,i)=>2026+i).flatMap(y=>[{start:y+'-08-01',end:y+'-09-01'},{start:(y+1)+'-01-01',end:(y+1)+'-01-31'}]);
 const clubs=WORLD_PACKS.map(p=>({id:!c.setup.custom&&p.id===selected.id?'user':p.id,name:!c.setup.custom&&p.id===selected.id?c.name:p.club,color:p.color,country:p.country,funds:unitsToGbp(p.budget??80),formation:'4-3-3',pattern:['Arsenal','Bayern Munich','Atlético Madrid','Stuttgart'].includes(p.club)?'band':'solid',stadium:['Bournemouth','Lens','Como'].includes(p.club)?'compact':'large',lighting:p.country==='ESP'?'day':'night'}));
 if(c.setup.custom)clubs.push({id:'user',name:c.name,color:c.setup.color,country:'ENG',funds:unitsToGbp(c.credits),formation:'4-3-3',pattern:'solid',stadium:'compact',lighting:'night'});
 clubs.push({id:'free-agents',name:'Unattached players',color:'#9ca9bc',country:'',funds:0});
 const players=WORLD_PACKS.flatMap(pack=>pack.players.map(p=>{const club=!c.setup.custom&&pack.id===selected.id?'user':pack.id,profile=gameFinancialProfile(p);return {id:p.personId,profileId:p.id,birthDate:p.birthDate||intelligenceFor(p)?.birthDate||null,owner:club,registeredClub:club,wageGbp:profile.wageGbp,contractEnd:termEnd(p),ownershipBasis:'Authored sandbox starting ownership; source list establishes squad membership only'};}));
 if(c.setup.custom)for(const p of FOUNDING_PLAYERS)players.push({id:p.personId,profileId:p.id,birthDate:null,owner:'user',registeredClub:'user',wageGbp:gameFinancialProfile(p).wageGbp,contractEnd:'2029-06-30',ownershipBasis:'Original Touchline player'});
 c.world={version:1,kind:'fictional-sandbox',id:'sandbox-'+c.seed,date:sandboxRoundDate(c.season),clubs,players,windows,agreements:[],ledger:[],members:['user',...field.filter(p=>p.id!==selected.id).map(p=>p.id)],processedRounds:[]};
 const squad=clubPlayers(c,'user'),sheet=selectSquad({players:squad});c.formation=sheet.formation;c.xi=sheet.xi;c.bench=squad.filter(p=>!c.xi.includes(p.id)).map(p=>p.id);c.condition={};
 for(const p of squad){const entry=worldPlayer(c,p.id),profile=gameFinancialProfile(p);c.condition[p.id]={energy:100,morale:65,growth:0,contract:sandboxContractRounds(c,entry.contractEnd),wage:gbpToUnits(entry.wageGbp),wageBasis:profile.wageSource,promise:'rotation',focus:'balanced',appearances:0,eligible:0,form:0};}
 for(const club of clubs){const annual=owned(c,club.id).reduce((n,p)=>n+p.wageGbp*52,0);club.annualReceiptsGbp=club.id==='free-agents'?0:annual+Math.round((club.id==='user'?unitsToGbp(selected.budget??80):club.funds)*.25);}
 clubs.find(t=>t.id==='user').funds=unitsToGbp(c.credits);
 const valid=validateCareerWorld(c.world,{allowUnknownBirthDates:true});if(!valid.ready)throw Error(valid.errors.join(' '));
}
export function sandboxTransferParties(c,d){
 const p=worldPlayer(c,d.player);if(!p)throw Error('This player is not in this save’s world.');
 if(d.kind==='renew'){if(p.owner!=='user'||p.registeredClub!=='user'||p.loan)throw Error('Only your permanent players can renew.');return {p};}
 if(d.kind==='sell'){
  if(p.owner!=='user'||p.registeredClub!=='user'||p.loan)throw Error('Your club does not own this player.');if(positionCareer(c)&&!legalClub(c,'user',p.id))throw Error('Retain a legal XI and goalkeeper reserve cover before selling.');
  const buyer=c.world.clubs.find(t=>t.id===d.counterparty&&t.id!=='user'&&t.id!=='free-agents')||c.world.clubs.filter(t=>!['user','free-agents'].includes(t.id)&&t.funds>=unitsToGbp(d.fee)&&owned(c,t.id).length<SANDBOX_SQUAD_LIMIT).sort((a,b)=>b.funds-a.funds||a.id.localeCompare(b.id))[0];
  if(!buyer)throw Error('No club can fund this sale.');return {p,from:'user',to:buyer.id};
 }
 if(p.registeredClub==='user'||p.owner==='user')throw Error('This person is already at your club.');if(p.loan)throw Error('This player is already on loan.');
 const departing=new Set(c.management.deals.filter(q=>q.stage==='pending'&&['buy','loan'].includes(q.kind)&&q.player!==p.profileId).map(q=>worldPlayer(c,q.player)).filter(q=>q?.registeredClub===p.registeredClub).map(q=>q.id));departing.add(p.id);
 if(!legalClub(c,p.registeredClub,departing))throw Error('The selling club needs a replacement to retain a legal squad after its agreed departures.');
 return {p,from:p.owner,to:'user'};
}
export function registerSandboxDeal(c,d){
 const {p,from,to}=sandboxTransferParties(c,d),user=c.world.clubs.find(t=>t.id==='user');user.funds=unitsToGbp(c.credits);
 if(d.kind==='renew'){p.contractEnd=`${2025+c.season+d.years}-06-30`;p.wageGbp=unitsToGbp(d.wage);return;}
 if(d.kind==='sell')d.counterparty=to;
 const end=`${2025+c.season+d.years}-06-30`,parentWage=p.wageGbp,terms={id:d.id,kind:d.kind==='loan'?'loan':'transfer',player:p.id,from,to,fee:unitsToGbp(d.fee),...(d.kind==='loan'?{end}:{} )};
 if(d.kind==='loan'&&end>p.contractEnd)throw Error('The parent contract ends before this loan. Choose a shorter loan.');
 const status=registerWorldDeal(c.world,terms,sandboxDate(c));if(status!=='complete')throw Error('Registration is outside the transfer window.');
 if(d.kind!=='sell'){if(p.loan){p.loan.parentWageGbp=parentWage;p.loan.fullWageGbp=unitsToGbp(d.wage);}p.wageGbp=unitsToGbp(d.kind==='loan'?d.wage*d.share/100:d.wage);if(d.kind!=='loan')p.contractEnd=end;}
 syncSandboxTeams(c);
}
export function validateSandboxAffordability(c,d){
 if(['buy','loan','renew'].includes(d.kind)){
  const weekly=unitsToGbp(d.wage)*(d.kind==='loan'?d.share/100:1),existing=c.condition[d.player]?unitsToGbp(c.condition[d.player].wage):0;
  const other=c.management.deals.filter(q=>q.stage==='pending'&&q.id!==d.id),reserved=other.reduce((n,q)=>n+unitsToGbp(q.fee),0),committed=other.reduce((n,q)=>n+unitsToGbp(q.wage)*(q.kind==='loan'?q.share/100:1),0);
  if(unitsToGbp(c.credits-d.fee)-reserved<(Math.max(0,weekly-existing)+committed)*13)throw Error('Keep thirteen weeks of the added wage commitments available.');
  const interest=Math.max(20,Math.min(95,75+(c.xi.reduce((n,id)=>n+sandboxProfile(id).rating,0)/11-sandboxProfile(d.player).rating)*3)),minimum=gameFinancialProfile(sandboxProfile(d.player)).wageGbp*(interest<40?1.25:interest<60?1.1:1);
  if(d.kind!=='renew'&&unitsToGbp(d.wage)<minimum*.9)throw Error('This player needs a stronger wage offer for your club’s current standing.');
 }
}
export function sandboxFinance(c){
 const club=c.world.clubs.find(t=>t.id==='user'),weekly=c.xi.concat(c.bench).reduce((n,id)=>n+unitsToGbp(c.condition[id].wage),0),pending=c.management.deals.filter(d=>d.stage==='pending'),reserved=pending.reduce((n,d)=>n+unitsToGbp(d.fee),0),committed=pending.reduce((n,d)=>n+unitsToGbp(d.wage)*(d.kind==='loan'?d.share/100:1),0),annualWages=(weekly+committed)*(positionCareer(c)?365/7:52);
 return {cash:unitsToGbp(c.credits),reserved,annualWages,annualReceipts:club.annualReceiptsGbp,forecast:unitsToGbp(c.credits)-reserved+club.annualReceiptsGbp-annualWages,weekly,pendingWeekly:committed};
}
export function sandboxRoundReceipt(c,round){const annual=c.world.clubs.find(t=>t.id==='user').annualReceiptsGbp;return Math.floor(annual*(round+1)/38)-Math.floor(annual*round/38);}
export function settleSandboxRound(c,round){
 const id=c.season+':'+round;if(c.world.processedRounds.includes(id))return;c.world.processedRounds.push(id);c.world.date=sandboxDate(c);
 const weeks=Math.floor((round+1)*52/38)-Math.floor(round*52/38);
 for(const club of c.world.clubs){if(club.id==='user'){club.funds=unitsToGbp(c.credits);continue;}if(club.id==='free-agents')continue;const wages=owned(c,club.id).reduce((n,p)=>n+p.wageGbp,0)+c.world.players.filter(p=>p.owner===club.id&&p.loan).reduce((n,p)=>n+Math.max(0,(p.loan.fullWageGbp||0)-p.wageGbp),0),income=Math.floor(club.annualReceiptsGbp*(round+1)/38)-Math.floor(club.annualReceiptsGbp*round/38);club.funds+=income-wages*weeks;}
 for(const id of c.xi.concat(c.bench)){const p=worldPlayer(c,id);c.condition[id].contract=sandboxContractRounds(c,p.loan?.end||p.contractEnd);}
}
export function sandboxBeforeFixture(c){
 if(positionCareer(c)){syncSandboxTeams(c);return;}
 c.world.date=sandboxDate(c);const round=c.competition.round,forecast=unitsToGbp(c.credits)+sandboxRoundReceipt(c,round)-sandboxFinance(c).weekly*(Math.floor((round+1)*52/38)-Math.floor(round*52/38));
 if(forecast<0)throw Error('Raise funds or reduce the wage bill before the next matchday.');syncSandboxTeams(c);
}
export function sandboxNextSeason(c){
 const date=sandboxRoundDate(c.season,0),returns=c.world.players.filter(p=>p.registeredClub==='user'&&p.loan&&p.loan.end<=date);c.world.date=date;
 for(const p of returns){const id=p.profileId;if(c.xi.includes(id)){const substitute=c.bench.find(q=>!worldPlayer(c,q).loan&&sandboxProfile(q).role===sandboxProfile(id).role&&worldPlayer(c,q).contractEnd>=date);if(!substitute)throw Error('Arrange a permanent replacement before the loan return for '+sandboxProfile(id).name);c.xi[c.xi.indexOf(id)]=substitute;c.bench=c.bench.filter(q=>q!==substitute);}c.bench=c.bench.filter(q=>q!==id);delete c.condition[id];}
 const parentWages=new Map(c.world.players.filter(p=>p.loan&&p.loan.end<=date).map(p=>[p.id,p.loan.parentWageGbp]));processWorldRegistrations(c.world,date);for(const p of c.world.players)if(parentWages.has(p.id))p.wageGbp=parentWages.get(p.id)||p.wageGbp;
 for(const p of c.world.players.filter(p=>p.registeredClub==='user'&&p.contractEnd<date)){
  const id=p.profileId;if(c.xi.includes(id)){const substitute=c.bench.find(q=>worldPlayer(c,q).contractEnd>=date&&sandboxProfile(q).role===sandboxProfile(id).role);if(!substitute)throw Error('Renew or replace '+sandboxProfile(id).name+' before starting the next season.');c.xi[c.xi.indexOf(id)]=substitute;c.bench=c.bench.filter(q=>q!==substitute);}
  c.bench=c.bench.filter(q=>q!==id);delete c.condition[id];p.owner=p.registeredClub='free-agents';c.world.expirations||=[];c.world.expirations.push({player:p.id,date});
 }
 // Opposition renews its own game contracts; published reference records stay untouched.
 for(const p of c.world.players)if(!['user','free-agents'].includes(p.registeredClub)&&p.contractEnd<date){const club=c.world.clubs.find(t=>t.id===p.owner),fee=p.wageGbp*4;if(club.funds>=fee){club.funds-=fee;p.contractEnd=`${2025+c.season+2}-06-30`;c.world.renewals||=[];c.world.renewals.push({player:p.id,date,fee,club:club.id});}}
 for(const id of c.xi.concat(c.bench))c.condition[id].contract=sandboxContractRounds(c,worldPlayer(c,id).loan?.end||worldPlayer(c,id).contractEnd,0);syncSandboxTeams(c);
}
