import {squadPlan} from './squad-planner.js';
import {POSITION_SLOTS,canPlayPosition} from './player-positions.js';
import {positionProfile} from './manager-positions.js';
import {sandboxProfile,legalClub,syncSandboxTeams} from './sandbox-world.js';
import {gameFinancialProfile} from './player-intelligence.js';
import {registerWorldDeal,registrationWindowOpen} from './manager-world.js';
import {addDays,daysBetween} from './manager-calendar.js';
import {unitsToGbp,gbpToUnits} from './manager-money.js';
import {shuffle} from './competition.js';
import {careerAvailability,availabilityFixture} from './career-availability.js';

export const modernMarket=c=>[2,3].includes(c.management?.market?.version);
const windowId=date=>date.slice(0,4)+(date.slice(5,7)==='01'?'-winter':'-summer');
const completed=c=>c.world.agreements.filter(a=>a.status==='complete'&&a.terms.kind==='transfer');
export function recruitmentAllowance(c){
 const policy=c.management?.market?.delegation;if(!policy)return null;
 const date=c.world.date,window=date.slice(0,4)+(Number(date.slice(5,7))<=7?'-winter':'-summer'),purchases=completed(c).filter(a=>a.terms.to==='user'&&windowId(a.registered)===window);
 const spent=purchases.reduce((n,a)=>n+a.terms.fee,0),weekly=purchases.reduce((n,a)=>n+(a.recruitment?.weeklyWageGbp??c.world.players.find(p=>p.id===a.terms.player)?.wageGbp??0),0);
 return {window,open:registrationWindowOpen(c.world,date),enabled:policy.enabled,feeLimit:policy.feeBudget,weeklyLimit:policy.weeklyBudget,spent,weekly,feesRemaining:Math.max(0,policy.feeBudget-spent),weeklyRemaining:Math.max(0,policy.weeklyBudget-weekly)};
}
export function transferCoolingDown(c,person,date=c.world.date){
 return completed(c).some(a=>a.terms.player===person&&daysBetween(a.registered,date)<180);
}
export function configureRecruitment(c,command){
 if(!modernMarket(c))throw Error('Recruitment delegation requires career market rules 2 or 3.');
 const feeBudget=Number(command.feeBudget),weeklyBudget=Number(command.weeklyBudget),enabled=command.enabled===true||command.enabled==='on';
 if(!Number.isSafeInteger(feeBudget)||feeBudget<0||feeBudget>1e10||!Number.isSafeInteger(weeklyBudget)||weeklyBudget<0||weeklyBudget>1e8)throw Error('Enter whole-pound recruitment and weekly wage limits.');
 if(enabled&&(!feeBudget||!weeklyBudget))throw Error('Delegation needs both a transfer and weekly wage allowance.');
 c.management.market.delegation={enabled,feeBudget,weeklyBudget};
}
export function recruitmentNeeds(c,club){
 if(c.management?.market?.version===3){const plan=squadPlan(c,{club});return (plan?.positions||[]).map(p=>{const starters=p.starters.map(sandboxProfile).filter(Boolean).sort((a,b)=>a.rating-b.rating||a.id.localeCompare(b.id));return {slot:p.slots[0],position:p.position,starter:starters[0]?.id||null,rating:starters[0]?.rating||0,cover:p.reserves.length,kind:p.kind,status:p.status,available:p.available.length,demand:p.demand};}).sort((a,b)=>Number(b.status==='missing')-Number(a.status==='missing')||Number(b.kind==='depth')-Number(a.kind==='depth')||a.cover-b.cover||a.rating-b.rating||a.slot-b.slot);}

 const team=c.competition.teams.find(t=>t.id===club);if(!team)return [];
 const labels=POSITION_SLOTS[team.formation];
 return (team.lineupSlots||team.xi).map((id,i)=>({slot:i,position:labels[i],starter:id,rating:id?sandboxProfile(id).rating:0,
  cover:team.roster.filter(p=>!team.xi.includes(p.id)&&canPlayPosition(positionProfile(p),labels[i])).length
 })).sort((a,b)=>a.cover-b.cover||a.rating-b.rating||a.slot-b.slot);
}
function affordable(c,buyer,fee,wage){
 const squad=c.world.players.filter(p=>p.registeredClub===buyer.id),weekly=squad.reduce((n,p)=>n+p.wageGbp,0)+c.world.players.filter(p=>p.owner===buyer.id&&p.loan).reduce((n,p)=>n+Math.max(0,(p.loan.fullWageGbp||0)-p.wageGbp),0);
 const reserved=c.world.agreements.filter(a=>a.status==='pending'&&a.terms.to===buyer.id).reduce((n,a)=>n+a.terms.fee,0)+(buyer.id==='user'?c.management.deals.filter(d=>d.stage==='pending').reduce((n,d)=>n+unitsToGbp(d.fee),0):0);
 return squad.length<45&&buyer.funds-reserved-fee>=(weekly+wage)*26&&buyer.funds-reserved-fee+buyer.annualReceiptsGbp>=(weekly+wage)*52;
}
// New saves opt in. Old careers retain their original market and recorded outcomes.
export function runCareerMarket(c,date){
 if(c.management?.market?.version!==3)return runMarket(c,date);
 const before=structuredClone(c);try{return runMarket(c,date);}catch(error){Object.keys(c).forEach(k=>delete c[k]);Object.assign(c,before);throw error;}
}
function runMarket(c,date){
 const depthRules=c.management?.market?.version===3,reviewKey=depthRules?windowId(date)+':week'+Math.floor(daysBetween(date.slice(0,4)+(date.slice(5,7)==='01'?'-01-01':'-08-01'),date)/7):date.slice(0,7);
 const x=c.connected;for(const offer of x.offers)if(offer.status==='open'&&offer.expires<date)offer.status='expired';
 if(!registrationWindowOpen(c.world,date)||x.marketDates.includes(reviewKey))return;
 x.marketDates.push(reviewKey);syncSandboxTeams(c);
 const report={date,transfers:[],needs:[],rulesVersion:depthRules?3:2},reserved=new Set(c.management.deals.filter(d=>!['complete','declined','expired','withdrawn'].includes(d.stage)).map(d=>d.player)),window=windowId(date);
 const clubs=shuffle(c.world.members,c.seed+c.season*7919+Number(date.replaceAll('-','')));
 for(const id of clubs){
  const delegation=c.management.market.delegation;if(id==='user'&&!delegation.enabled)continue;
  const buyer=c.world.clubs.find(t=>t.id===id),team=c.competition.teams.find(t=>t.id===id),purchases=completed(c).filter(a=>a.terms.to===id&&windowId(a.registered)===window);
  if(!team||purchases.length>=2)continue;
  const needs=recruitmentNeeds(c,id),assessments=[];let signed=false,offered=false;
  for(const need of needs){
   const candidates=c.world.players.filter(p=>!reserved.has(p.profileId)&&p.owner===p.registeredClub&&p.owner!==id&&p.owner!=='free-agents'&&!p.loan&&p.contractEnd>date&&!transferCoolingDown(c,p.id,date)&&!careerAvailability(c,p.profileId,availabilityFixture(c,id)))
    .map(entry=>({entry,profile:positionProfile(sandboxProfile(entry.profileId))})).filter(({profile})=>profile.rating>=(depthRules&&need.kind==='depth'?Math.max(40,need.rating-8):need.rating+2)&&canPlayPosition(profile,need.position))
    .sort((a,b)=>(depthRules&&need.kind==='depth'?gameFinancialProfile(a.profile).feeGbp-gameFinancialProfile(b.profile).feeGbp:0)||b.profile.rating-a.profile.rating||a.entry.id.localeCompare(b.entry.id));
   const assessment={position:need.position,cover:need.cover,starterRating:need.rating,eligibleUpgrades:candidates.length,...(depthRules?{purpose:need.kind,minimumRating:need.kind==='depth'?Math.max(40,need.rating-8):need.rating+2}:{}),rejected:{willingness:0,cover:0,affordability:0,feeLimit:0,wageLimit:0},decision:'retained'};assessments.push(assessment);
   for(const {entry:p,profile} of candidates){
    const seller=c.competition.teams.find(t=>t.id===p.owner),starter=seller?.xi.includes(p.profileId),avg=team.xi.reduce((n,id)=>n+sandboxProfile(id).rating,0)/11;
    // Authored acceptance: an established starter will not step down into a much weaker XI.
    if(starter&&avg+3<profile.rating){assessment.rejected.willingness++;continue;}if(!legalClub(c,p.owner,p.id)){assessment.rejected.cover++;continue;}
    const financial=gameFinancialProfile(profile),fee=Math.round(financial.feeGbp*(starter?1.15:1)),wage=Math.max(financial.wageGbp,Math.ceil(p.wageGbp*1.05));
    if(!affordable(c,buyer,fee,wage)){assessment.rejected.affordability++;continue;}
    if(id==='user'){
     const spent=purchases.reduce((n,a)=>n+a.terms.fee,0),committed=purchases.reduce((n,a)=>n+(a.recruitment?.weeklyWageGbp??c.world.players.find(p=>p.id===a.terms.player)?.wageGbp??0),0);
     if(spent+fee>delegation.feeBudget){assessment.rejected.feeLimit++;continue;}if(committed+wage>delegation.weeklyBudget){assessment.rejected.wageLimit++;continue;}
    }
    if(p.owner==='user'){
     if(!x.offers.some(o=>o.player===p.profileId&&o.status==='open'))x.offers.push({id:`offer:${date}:${id}:${p.id}`,player:p.profileId,buyer:id,fee,wage,date,expires:addDays(date,7),status:'open',position:need.position});
     assessment.decision='offer awaiting approval';offered=true;break;
    }
    const from=p.owner,dealId=`ai:${date}:${id}:${p.id}`;
    registerWorldDeal(c.world,{id:dealId,kind:'transfer',player:p.id,from,to:id,fee},date);
    p.wageGbp=wage;p.contractEnd=`${2028+c.season}-06-30`;
    const agreement=c.world.agreements.find(a=>a.id===dealId);agreement.recruitment={position:need.position,role:depthRules&&need.kind==='depth'?'rotation':'starter',weeklyWageGbp:wage,contractEnd:p.contractEnd,rulesVersion:depthRules?3:2};
    report.transfers.push({player:p.profileId,buyer:id,seller:from,fee,wage,position:need.position,delegated:id==='user',...(depthRules?{purpose:need.kind}:{} )});
    if(id==='user'){c.credits=gbpToUnits(buyer.funds);c.management.ledger.push({id:'delegated-'+dealId,season:c.season,round:c.competition.round,kind:'delegated-buy',amount:-gbpToUnits(fee),note:profile.name+' · '+need.position});c.management.lastBalance=c.credits;}
    // Rebuild immediately: subsequent clubs recruit from actual current squads.
    syncSandboxTeams(c);assessment.decision='signed';signed=true;break;
   }
   if(signed||offered)break;
  }
  report.needs.push({club:id,position:needs[0]?.position,status:signed?'signed':offered?'offer awaiting approval':depthRules?'No sustainable, willing target; retain squad':'No sustainable, willing upgrade; retain squad',...(c.management.market.diagnosticsVersion===1?{assessments}:{} )});
 }
 x.weeklyReports.push(report);syncSandboxTeams(c);
}
