import {positionCareer,validPositionXI,positionRoster,positionProfile,selectPositionTeam} from './manager-positions.js';
import {incidentCareer,careerAvailability,availabilityText} from './career-availability.js';
import {configureRecruitment,modernMarket,transferCoolingDown} from './career-market.js';
import {canPlayPosition,POSITION_SLOTS} from './player-positions.js';
import {hasSandboxWorld,worldPlayer,sandboxProfile,sandboxWindow,sandboxTransferParties,registerSandboxDeal,validateSandboxAffordability,sandboxBeforeFixture,sandboxNextSeason,sandboxContractRounds,SANDBOX_SQUAD_LIMIT,sandboxFinance,isSuperLeague} from './sandbox-world.js';
import {unitsToGbp} from './manager-money.js';
import {syncSandboxTeams} from './sandbox-world.js';
import {money,gbpToUnits,usesSourcedFinances,usesPounds} from './manager-money.js';
import {gameFinancialProfile} from './player-intelligence.js';
import {addDays} from './manager-calendar.js';
import {LEGENDS,legend} from './legends.js';
import {FORMATIONS} from './engine.js';
import {standings,upcomingFixtures} from './competition.js';
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
export const managerOwned=c=>c.xi.concat(c.bench);
export const managerWindow=c=>hasSandboxWorld(c)?sandboxWindow(c):c.connected?['08','01'].includes(c.connected.calendar.date.slice(5,7)):c.competition.round<4||(c.competition.round>=19&&c.competition.round<23);
const dealExpired=(c,d)=>d.deadline&&c.connected?c.connected.calendar.date>d.deadline:d.season!==c.season||c.competition.round>d.expires;
export function managerAvailable(c){return c.credits-(c.management?.deals||[]).filter(d=>d.stage==='pending').reduce((n,d)=>n+d.fee,0);}
export function upgradeManager(c){
 if(c.management)return c;
 const rating=c.xi.reduce((n,id)=>n+legend(id).rating,0)/11;
 c.management={version:1,page:'office',preset:c.manager==='hunter'?'press':c.manager==='guardian'?'protect':'balanced',build:'mixed',roles:{},sheetSlot:0,sheets:[null,null,null],shortlist:[],reports:[],deals:[],ledger:[],openingBalance:c.credits,lastBalance:c.credits,processed:[],inbox:[],honours:[],archive:[],filters:{query:'',role:'ALL',club:'ALL',affordable:false},objective:rating>=93?{name:'Challenge for the title',rank:3}:rating>=89?{name:'Qualify for Europe',rank:6}:{name:'Build a stable club',rank:12}};
 for(const id of managerOwned(c))Object.assign(c.condition[id],{wage:legend(id).rating*.004,promise:'rotation',focus:'balanced',appearances:0,eligible:0,form:0});
 c.event=null;return c;
}
function requireManager(c){if(!c?.management)throw Error('Adopt the club-management upgrade first.');}
export function validateManagerXI(c,xi=c.xi,formation=c.formation,{ignoreAvailability=false}={}){
 if(!ignoreAvailability&&incidentCareer(c)){const unavailable=xi.filter(id=>careerAvailability(c,id));if(unavailable.length)throw Error('Unavailable for the next fixture: '+unavailable.map(id=>legend(id).name+' · '+availabilityText(careerAvailability(c,id))).join(', '));}
 const expired=xi.filter(id=>c.condition[id]?.contract<=0);if(expired.length)throw Error('Renew expired starter contracts in Club before the next match: '+expired.map(id=>legend(id)?.name||id).join(', '));
 if(!FORMATIONS[formation]||xi.length!==11||new Set(xi.map(id=>legend(id)?.personId)).size!==11||xi.some((id,i)=>!managerOwned(c).includes(id)||(!positionCareer(c)&&legend(id)?.role!==FORMATIONS[formation][i].role)||!c.condition[id]||c.condition[id].contract<=0))throw Error('Select eleven different, contracted players in eligible positions.');
 if(positionCareer(c)&&!validPositionXI(managerOwned(c).map(legend),xi,formation))throw Error('Choose contracted players in their natural positions.');
 return true;
}
export function managerReadiness(c,id){const p=legend(id),s=c.condition[id];return {base:p.rating+s.growth,energy:s.energy,morale:s.morale,form:s.form||0,modifier:clamp(((s.morale-65)/30)+(s.form||0),-3,3),label:careerAvailability(c,id)?availabilityText(careerAvailability(c,id)):s.energy<50?'Needs recovery':s.energy<75?'Rotation advised':'Ready'};}
export function managerProfile(c,p){if(!c.management)return p;if(positionCareer(c))p=positionRoster([p],c.xi,c.formation)[0];const state=managerReadiness(c,p.id),bonus=state.modifier,extra=c.condition[p.id].specialGrowth||{};return {...p,rating:clamp(p.rating+bonus,1,99),attack:clamp(p.attack+bonus+(extra.attack||0),1,99),defense:clamp(p.defense+bonus+(extra.defense||0),1,99),control:clamp(p.control+bonus+(extra.control||0),1,99)};}
export function managerReport(c,id){const p=legend(id),same=c.xi.map(legend).filter(q=>positionCareer(c)?POSITION_SLOTS[c.formation].some((pos,i)=>c.xi[i]===q.id&&canPlayPosition(positionProfile(p),pos)):q.role===p.role).sort((a,b)=>a.rating-b.rating),starter=same[0],interest=clamp(75+(c.xi.reduce((n,x)=>n+legend(x).rating,0)/11-p.rating)*3,20,95),profile=gameFinancialProfile(p),extra=hasSandboxWorld(c)&&!managerOwned(c).includes(id)?interest<40?1.25:interest<60?1.1:1:1,fee=hasSandboxWorld(c)&&worldPlayer(c,id)?.registeredClub==='free-agents'?0:usesSourcedFinances(c)?gbpToUnits(profile.feeGbp):Math.round(p.cost*1.6),wage=usesSourcedFinances(c)?gbpToUnits(Math.round(profile.wageGbp*extra)):p.rating*.004;return {fee,wage,starter:starter?.name||'No cover',difference:p.rating-(starter?.rating||0),role:p.rating>(starter?.rating||0)?'starter':'rotation',interest,cost:usesSourcedFinances(c)?fee+wage*104:Math.round((fee+wage*76)*10)/10};}
function log(c,kind,amount,note){const m=c.management;m.ledger.push({id:'ledger-'+m.ledger.length,season:c.season,round:c.competition.round,kind,amount:Math.round(amount*(usesPounds(c)?500000:100))/(usesPounds(c)?500000:100),note});m.lastBalance=c.credits;}
function availablePlayer(c,id){if(hasSandboxWorld(c)&&(!worldPlayer(c,id)||worldPlayer(c,id).registeredClub==='user'||worldPlayer(c,id).owner==='user'))throw Error('This player is unavailable in this save’s world.');if(!legend(id))throw Error('Unknown player.');if(managerOwned(c).some(x=>legend(x).personId===legend(id).personId))throw Error('This person is already at your club.');}
function assertSafeRemoval(c,id){if(c.xi.includes(id))throw Error('Move this player to the bench and save a valid XI first.');if(!c.bench.includes(id)||c.bench.length<=3)throw Error('Retain at least three reserves.');}
function dealAsking(c,kind,report){
 if(!usesSourcedFinances(c))return kind==='renew'?8:kind==='loan'?Math.max(3,Math.round(report.fee*.15)):kind==='sell'?Math.round(report.fee*.75):report.fee;
 const asking=kind==='renew'?Math.max(.05,report.wage*4):kind==='loan'?Math.max(.05,report.fee*.15):kind==='sell'?report.fee*.75:report.fee;
 return gbpToUnits(Math.round(asking*500000));
}
function executeDeal(c,d){
 if(d.stage==='complete')return;
 if(hasSandboxWorld(c)){validateSandboxAffordability(c,d);registerSandboxDeal(c,d);}
 const m=c.management;if(d.kind!=='sell'&&c.credits<d.fee)throw Error('Insufficient funds for this agreement.');if(d.kind==='sell'){assertSafeRemoval(c,d.player);c.bench=c.bench.filter(id=>id!==d.player);delete c.condition[d.player];c.credits+=d.fee;log(c,'sale',d.fee,legend(d.player).name);}
 else if(d.kind==='renew'){if(!c.condition[d.player])throw Error('This player has left.');c.condition[d.player].contract=d.years*38;c.condition[d.player].wage=d.wage;c.condition[d.player].wageBasis='Negotiated in your save';c.condition[d.player].promise=d.role;c.credits-=d.fee;log(c,'renewal',-d.fee,legend(d.player).name);}
 else{if(!hasSandboxWorld(c))availablePlayer(c,d.player);if(c.bench.length>=(hasSandboxWorld(c)?SANDBOX_SQUAD_LIMIT-11:12))throw Error('Make room on the bench before registering this player.');c.credits-=d.fee;c.bench.push(d.player);c.condition[d.player]={energy:100,morale:70,growth:0,contract:d.years*38,wage:d.kind==='loan'?d.wage*d.share/100:d.wage,wageBasis:'Negotiated in your save',promise:d.role,focus:'balanced',appearances:0,eligible:0,form:0,...(d.kind==='loan'?{loan:{returnSeason:c.season+d.years,parent:legend(d.player).club,wageShare:d.share}}:{})};log(c,d.kind,-d.fee,legend(d.player).name);}
 if(hasSandboxWorld(c)){c.world.clubs.find(t=>t.id==='user').funds=unitsToGbp(c.credits);if(c.condition[d.player]){const p=worldPlayer(c,d.player);c.condition[d.player].wage=gbpToUnits(p.wageGbp);c.condition[d.player].contract=sandboxContractRounds(c,p.loan?.end||p.contractEnd);if(p.loan)c.condition[d.player].loan={...c.condition[d.player].loan,parent:c.world.clubs.find(t=>t.id===p.owner).name,end:p.loan.end};}}
 if(hasSandboxWorld(c))syncSandboxTeams(c);
 d.stage='complete';d.message='Agreement registered. Your squad and financial ledger are updated.';d.completed={season:c.season,round:c.competition.round};m.lastSigning=d.player;m.lastDeal={kind:d.kind,player:d.player};
}
export function managerCommand(c,command){const snapshot=structuredClone(c);try{return runManagerCommand(c,command);}catch(error){Object.keys(c).forEach(k=>delete c[k]);Object.assign(c,snapshot);throw error;}}
function runManagerCommand(c,command){
 requireManager(c);const m=c.management,{type,id,value}=command;
 if(type==='recruitment-policy'){configureRecruitment(c,command);return;}
 if(type==='dismiss-signing'){m.lastDeal=null;return;}
 if(type==='founding-role'){if(!hasSandboxWorld(c)||!['GK','DEF','MID','FWD'].includes(value))throw Error('Choose a founding recruitment position.');m.foundingRole=value;m.foundingTarget=null;m.foundingOutgoing=null;return;}
 if(type==='founder-sign'){
  if(!hasSandboxWorld(c)||!c.setup.custom||c.competition.round!==0||!command.outgoing?.startsWith('founder-')||!managerOwned(c).includes(command.outgoing))throw Error('Replace original players before your first kickoff.');
  const out=command.outgoing,incoming=command.incoming;if(sandboxProfile(out).role!==sandboxProfile(incoming)?.role)throw Error('Choose the same position for this replacement.');
  const report=managerReport(c,incoming),settlement=c.condition[out].wage*4,index=c.xi.indexOf(out);if(managerAvailable(c)<report.fee+settlement)throw Error('Insufficient funds for the fee and release settlement.');
  managerCommand(c,{type:'enquire',id:incoming,kind:'buy'});const deal=m.deals.at(-1);const offer={type:'deal-offer',id:deal.id,fee:report.fee,wage:report.wage,years:2,role:index>=0?'starter':'rotation'};managerCommand(c,offer);managerCommand(c,offer);managerCommand(c,{type:'deal-confirm',id:deal.id});
  if(index>=0){c.xi[index]=incoming;c.bench=c.bench.filter(id=>id!==incoming);}c.bench=c.bench.filter(id=>id!==out);delete c.condition[out];const old=worldPlayer(c,out);old.owner=old.registeredClub='free-agents';c.credits-=settlement;c.world.clubs.find(t=>t.id==='user').funds=unitsToGbp(c.credits);log(c,'release-settlement',-settlement,sandboxProfile(out).name);if(positionCareer(c))validateManagerXI(c);syncSandboxTeams(c);m.page='office';m.foundingTarget=null;return;
 }
 if(type==='page'){if(!['office','squad','tactics','recruitment','club','competitions'].includes(value))throw Error('Unknown manager page.');m.page=value;return;}
 if(type==='shape'){if(!['attacking','defending'].includes(value))throw Error('Choose a shape view.');m.shape=value;return;}
 if(type==='filter'){if(!['query','role','club','affordable'].includes(id))throw Error('Unknown filter.');m.filters[id]=value;return;}
 if(type==='shortlist'){availablePlayer(c,id);m.shortlist=m.shortlist.includes(id)?m.shortlist.filter(x=>x!==id):m.shortlist.concat(id);return;}
 if(type==='report'){availablePlayer(c,id);if(!m.reports.includes(id))m.reports.push(id);return;}
 if(type==='tactics'){if(!['balanced','press','protect'].includes(command.preset)||!['mixed','short','direct'].includes(command.build))throw Error('Choose supported tactics.');const roles={};for(const [slot,role]of Object.entries(command.roles||{})){if(!Number.isInteger(Number(slot))||Number(slot)<1||Number(slot)>10||!['hold','support','attack'].includes(role))throw Error('Invalid responsibility.');roles[slot]=role;}m.preset=command.preset;m.build=command.build;m.roles=roles;return;}
 if(type==='bench'){const ids=command.ids;if(!Array.isArray(ids)||ids.length>9||new Set(ids).size!==ids.length||ids.some(id=>!c.bench.includes(id)||c.condition[id].contract<=0||careerAvailability(c,id)))throw Error('Choose up to nine contracted reserves from your bench.');m.matchBench=[...ids];return;}
 if(type==='lineup'){validateManagerXI(c,command.xi,command.formation);const all=managerOwned(c);c.formation=command.formation;c.xi=[...command.xi];c.bench=all.filter(x=>!c.xi.includes(x));m.matchBench=null;return;}
 if(type==='auto'&&positionCareer(c)){const sheet=selectPositionTeam(managerOwned(c).filter(id=>c.condition[id].contract>0&&!careerAvailability(c,id)).map(legend),command.formation||c.formation,p=>p.rating+(value==='rotation'?c.condition[p.id].energy*.6:0));return managerCommand(c,{type:'lineup',xi:sheet.xi,formation:sheet.formation});}
 if(type==='auto'){const all=managerOwned(c),used=new Set(),xi=FORMATIONS[command.formation||c.formation].map(slot=>{const p=all.filter(id=>legend(id).role===slot.role&&!used.has(id)&&c.condition[id].contract>0).sort((a,b)=>(legend(b).rating+(value==='rotation'?c.condition[b].energy*.6:0))-(legend(a).rating+(value==='rotation'?c.condition[a].energy*.6:0)))[0];used.add(p);return p;});return managerCommand(c,{type:'lineup',xi,formation:command.formation||c.formation});}
 if(type==='sheet-save'||type==='sheet-load'){const slot=Number(id);if(!Number.isInteger(slot)||slot<0||slot>2)throw Error('Choose a team sheet.');if(type==='sheet-save'){validateManagerXI(c);m.sheets[slot]={formation:c.formation,xi:[...c.xi],preset:m.preset,build:m.build,roles:{...m.roles},matchBench:m.matchBench?[...m.matchBench]:null};}else{const s=m.sheets[slot];if(!s)throw Error('Save this team sheet first.');managerCommand(c,{type:'lineup',...s});managerCommand(c,{type:'tactics',...s});if(s.matchBench)managerCommand(c,{type:'bench',ids:s.matchBench});}return;}
 if(type==='focus'){if(!c.condition[id]||!['balanced','attack','control','defense','recovery'].includes(value))throw Error('Choose an individual focus.');c.condition[id].focus=value;return;}
 if(type==='enquire'){
  const kind=command.kind;if(!['buy','sell','loan','renew'].includes(kind))throw Error('Unknown deal type.');if(kind==='sell'){if(c.condition[id]?.loan)throw Error('Borrowed players cannot be sold.');assertSafeRemoval(c,id);}else if(kind==='renew'){if(!c.condition[id])throw Error('Player is not at your club.');if(c.condition[id].loan)throw Error('Loan contracts belong to the parent club.');}else availablePlayer(c,id);
  if(kind!=='renew'&&modernMarket(c)&&transferCoolingDown(c,worldPlayer(c,id)?.id))throw Error('This player is settling in after a transfer. Talks reopen after 180 days.');
  if(m.deals.some(d=>d.player===id&&!['complete','declined','expired','withdrawn'].includes(d.stage)))throw Error('There is already an active conversation for this player.');
  const previous=m.deals.findLast(d=>d.player===id&&d.kind===kind);if(previous&&previous.season===c.season&&previous.round===c.competition.round)throw Error('Wait until the next matchday before reopening talks.');
  const report=managerReport(c,id),fee=dealAsking(c,kind,report);if(hasSandboxWorld(c)&&kind!=='renew')sandboxTransferParties(c,{kind,player:id,fee});
  m.deals.push({id:'deal-'+c.season+'-'+m.deals.length,kind,player:id,stage:'club',season:c.season,round:c.competition.round,expires:c.competition.round+3,...(c.connected?{agreedDate:c.connected.calendar.date,deadline:addDays(c.connected.calendar.date,14)}:{}),fee,referenceFee:fee,referenceWage:report.wage,wage:report.wage,years:kind==='loan'?1:2,role:report.role,share:50,attempts:0,message:'Enquiry received. Review the terms and make an offer.'});m.page='recruitment';return;
 }
 const d=m.deals.find(x=>x.id===id);
 if(type==='deal-withdraw'){if(!d||d.stage==='complete')throw Error('This conversation is closed.');d.stage='withdrawn';return;}
 if(type==='deal-offer'){
  if(!d||!['club','contract'].includes(d.stage))throw Error('This offer is no longer active.');if(dealExpired(c,d))throw Error('This conversation has expired.');
  const fee=d.stage==='contract'?d.fee:Number(command.fee),wage=Number(command.wage),years=Number(command.years),share=Number(command.share??50);if(!Number.isFinite(fee)||fee<0||!Number.isFinite(wage)||wage<0||![1,2,3].includes(years)||!['starter','rotation','prospect'].includes(command.role)||!Number.isFinite(share)||share<0||share>100)throw Error('Enter valid fee, wage, years and role.');
  if(d.kind==='loan'&&years>2)throw Error('Choose this season or through next season for a loan.');const asking=d.referenceFee??(d.kind==='renew'?8:d.kind==='loan'?Math.max(3,Math.round(managerReport(c,d.player).fee*.15)):d.kind==='sell'?Math.round(managerReport(c,d.player).fee*.75):managerReport(c,d.player).fee);
  if(d.kind==='loan'&&share<25){d.attempts++;d.share=50;d.message='The parent club requests a 50% wage contribution.';if(d.attempts>=3)d.stage='declined';return;}
  const acceptable=d.kind==='sell'?fee<=asking:fee>=asking*.9;
  if(d.stage==='club'&&!acceptable){d.attempts++;d.message='The club counters at '+money(c,asking)+'.';d.fee=asking;if(d.attempts>=3){d.stage='declined';d.message='The club has ended negotiations.';}return;}
  if(d.stage==='contract'&&wage<(d.referenceWage??managerReport(c,d.player).wage)*.9){d.attempts++;d.wage=d.referenceWage??managerReport(c,d.player).wage;d.message='The player requests the displayed weekly wage.';if(d.attempts>=3)d.stage='declined';return;}
  Object.assign(d,{fee,wage,years,role:command.role,share});d.stage=d.stage==='club'&&d.kind!=='sell'?'contract':'ready';d.message=d.stage==='contract'?'Club agreement reached. Agree the player’s contract.':'Terms agreed. Review the budget before confirming.';return;
 }
 if(type==='deal-confirm'){
  if(d?.stage==='complete'||d?.stage==='pending')return;if(!d||d.stage!=='ready')throw Error('Agree terms before confirming.');if(dealExpired(c,d))throw Error('This agreement has expired.');if(d.kind!=='sell'&&managerAvailable(c)<d.fee)throw Error('Insufficient available funds.');
  if(['buy','loan'].includes(d.kind)){availablePlayer(c,d.player);if(c.bench.length>=(hasSandboxWorld(c)?SANDBOX_SQUAD_LIMIT-11:12))throw Error('Make room in the squad first.');}
  if(hasSandboxWorld(c)&&['buy','loan'].includes(d.kind)&&managerOwned(c).length+m.deals.filter(q=>q.stage==='pending'&&['buy','loan'].includes(q.kind)&&q.id!==d.id).length>=SANDBOX_SQUAD_LIMIT)throw Error('Your squad and agreed arrivals fill all 45 places.');
  if(hasSandboxWorld(c)){validateSandboxAffordability(c,d);sandboxTransferParties(c,d);}
  if(d.kind!=='renew'&&modernMarket(c)&&transferCoolingDown(c,worldPlayer(c,d.player)?.id))throw Error('This player is settling in after a transfer. Talks reopen after 180 days.');
  if(d.kind!=='renew'&&!managerWindow(c)){if(d.kind==='sell')throw Error('Sales can be registered during a transfer window.');d.stage='pending';d.message='Agreement saved. Fee reserved; arrival at the next window.';}else executeDeal(c,d);return;
 }
 if(type==='resolve'){const item=m.inbox.find(x=>x.id===id);if(!item||item.resolved)return;if(!['reassure','budget'].includes(value))throw Error('Choose a response.');item.resolved=true;item.choice=value;if(item.player&&c.condition[item.player]){const s=c.condition[item.player];s.morale=clamp(s.morale+(value==='reassure'?4:-2),20,95);if(value==='reassure'){s.promise='rotation';if(modernMarket(c))s.promiseReview={from:s.eligible,appearances:s.appearances,due:s.eligible+6,required:2};}else if(modernMarket(c))s.promise='prospect';}return;}
 throw Error('Unknown management command.');
}
export function managerBeforeFixture(c){
 if(!c.management)return;const snapshot=structuredClone(c);try{runBeforeFixture(c);}catch(error){Object.keys(c).forEach(k=>delete c[k]);Object.assign(c,snapshot);throw error;}
}
function runBeforeFixture(c){
 if(hasSandboxWorld(c))sandboxBeforeFixture(c);
 validateManagerXI(c,c.xi,c.formation,{ignoreAvailability:incidentCareer(c)});const m=c.management;if(m.matchBench?.some(id=>!c.bench.includes(id)||c.condition[id].contract<=0))throw Error('Update your match bench before advancing.');
 for(const d of m.deals){if(['club','contract','ready'].includes(d.stage)&&(dealExpired(c,d)))d.stage='expired';if(d.stage==='pending'&&managerWindow(c))executeDeal(c,d);}
 const mandatory=m.inbox.find(x=>!x.resolved&&x.mandatory);if(mandatory)throw Error('Resolve the inbox decision before advancing.');
}
export function managerAfterFixture(c,match){
 if(!c.management)return;const m=c.management,identity=match.home+'|'+match.away+'|'+match.seed;if(m.processed.includes(identity))return;m.processed.push(identity);c.event=null;
 const home=match.home===c.competition.user,score=home?match.score:[...match.score].reverse(),form=score[0]>score[1]?1:score[0]<score[1]?-1:0;
 for(const id of managerOwned(c)){const s=c.condition[id];if(match.eligibleIds&&!match.eligibleIds.includes(id))continue;const played=match.played?.[home?0:1]?.includes(id)??c.xi.includes(id);s.eligible++;if(played)s.appearances++;s.form=clamp((s.form||0)*.7+(played?form*.3:0),-1.5,1.5);
  if(s.focus==='recovery')s.energy=Math.min(100,s.energy+4);else if(played&&s.focus!=='balanced'){s.specialGrowth||={};s.specialGrowth[s.focus]=Math.min(3,(s.specialGrowth[s.focus]||0)+.06);}
  if(s.eligible>=6&&s.promise==='starter'&&s.appearances/s.eligible<.5&&!m.inbox.some(x=>x.player===id&&!x.resolved))m.inbox.push({id:'minutes-'+id+'-'+c.season+'-'+s.eligible,player:id,title:legend(id).name+' wants a clearer role',text:s.appearances+' appearances in '+s.eligible+' available fixtures. Reassure them with a rotation role or explain the competition.',mandatory:true,resolved:false});
  if(modernMarket(c)){
   if(s.promiseReview&&s.eligible>=s.promiseReview.due){const review=s.promiseReview,appearances=s.appearances-review.appearances,kept=appearances>=review.required;s.morale=clamp(s.morale+(kept?5:-6),20,95);m.promiseOutcomes||=[];m.promiseOutcomes.push({player:id,date:c.world.date,appearances,fixtures:6,required:review.required,kept});delete s.promiseReview;}
   const complaint='rotation-'+c.season+'-'+id;
   if(s.eligible>=10&&s.promise==='rotation'&&s.appearances/s.eligible<.2&&!s.promiseReview&&!m.inbox.some(x=>x.id===complaint||x.player===id&&!x.resolved))m.inbox.push({id:complaint,player:id,title:legend(id).name+' needs a squad plan',text:s.appearances+' appearances in '+s.eligible+' available fixtures. Offer two appearances over the next six fixtures, or explain a prospect role with an immediate morale cost.',mandatory:false,resolved:false});
  }
 }
 if(!(c.matchRulesVersion>=3)||c.credits!==m.lastBalance)log(c,'matchday',c.credits-m.lastBalance,'Matchday income, wages and performance reward');
 const rank=standings(c.competition).findIndex(t=>t.id===c.competition.user)+1;m.board={sporting:clamp(70+(m.objective.rank-rank)*3,10,100),financial:hasSandboxWorld(c)?clamp(65+sandboxFinance(c).forecast/1000000,10,100):clamp(c.credits/3,10,100),squad:Math.round(managerOwned(c).reduce((n,id)=>n+c.condition[id].morale,0)/managerOwned(c).length)};
 c.trust=Math.round(c.trust*.6+(m.board.sporting*.6+m.board.financial*.2+m.board.squad*.2)*.4);
 if(c.trust<25&&!m.inbox.some(x=>x.id==='board-warning-'+c.season))m.inbox.push({id:'board-warning-'+c.season,title:'The board needs an improvement',text:'Recent results have reduced trust to '+c.trust+'%. Improve performances before confidence reaches zero.',mandatory:false,resolved:false});
 if(c.competition.champion&&!m.archive.some(s=>s.season===c.season)){m.archive.push({season:c.season,rank,objective:m.objective.name,achieved:rank<=m.objective.rank,credits:c.credits,results:structuredClone(c.history),physicalResults:structuredClone(c.competition.results.filter(r=>r.definition))});if(c.competition.champion===c.competition.user)m.honours.push({season:c.season,name:isSuperLeague(c)?'Super League champion':'Fantasy league champion'});}
}
export function managerNextSeason(c){
 if(!c.management)return;const m=c.management;const previous=m.archive.find(s=>s.season===c.season-1);if(previous&&!previous.physicalResults)previous.physicalResults=structuredClone(c.competition.results.filter(r=>r.definition));m.processed=[];m.inbox=m.inbox.filter(x=>!x.resolved);hasSandboxWorld(c)?log(c,'season-rollover',0,'Balance carried forward; no automatic grant'):log(c,'season-funding',c.credits-m.lastBalance,'Funding for the next season');
 if(hasSandboxWorld(c))sandboxNextSeason(c);
 for(const id of [...managerOwned(c)]){const s=c.condition[id];s.eligible=0;s.appearances=0;s.form=0;if(s.loan&&s.loan.returnSeason<=c.season){if(c.xi.includes(id)){const replacement=c.bench.find(x=>!c.condition[x].loan&&legend(x).role===legend(id).role&&c.condition[x].contract>0);if(!replacement)throw Error('Arrange a replacement before the loan return for '+legend(id).name);c.xi[c.xi.indexOf(id)]=replacement;c.bench=c.bench.filter(x=>x!==replacement);}c.bench=c.bench.filter(x=>x!==id);delete c.condition[id];}}
 for(const d of m.deals)if(d.stage==='pending')executeDeal(c,d);
}
export function managerNextOpponent(c){const f=upcomingFixtures(c.competition).find(m=>m.home===c.competition.user||m.away===c.competition.user);return f?c.competition.teams.find(t=>t.id===(f.home===c.competition.user?f.away:f.home)):null;}

export function managerShouldStop(c){return !!c.management&&(c.management.inbox.some(x=>!x.resolved&&x.mandatory)||c.management.deals.some(d=>['club','contract','ready'].includes(d.stage)&&(d.deadline&&c.connected?d.deadline<=addDays(c.connected.calendar.date,3):d.expires-c.competition.round<=1)));}
