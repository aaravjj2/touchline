import {squadPlan} from './squad-planner.js';
import {sandboxMarket,worldPlayer,legalClub,sandboxFinance} from './sandbox-world.js';
import {managerReport,managerAvailable} from './manager-career.js';
import {positionProfile} from './manager-positions.js';
import {canPlayPosition} from './player-positions.js';
import {legend} from './legends.js';

// Suggestions start a normal negotiation; browsing never makes a transaction.
export function preseasonTargets(c){
 if(c.management?.market?.version!==3||!c.setup.custom||c.competition.round!==0)return [];
 const plan=squadPlan(c),cash=managerAvailable(c),finance=sandboxFinance(c),average=c.xi.reduce((n,id)=>n+legend(id).rating,0)/11;
 return plan.positions.filter(p=>p.kind==='depth').slice(0,3).map(need=>{
  const starter=Math.min(...need.starters.map(id=>legend(id).rating)),targets=[];
  const pool=sandboxMarket(c).filter(p=>!p.onLoan&&p.worldOwner===p.worldRegistration&&canPlayPosition(positionProfile(p),need.position)&&p.rating>=Math.max(40,starter-8))
   .map(p=>({player:p,report:managerReport(c,p.id),entry:worldPlayer(c,p.id)}))
   .filter(({player:p,report:r,entry})=>entry.contractEnd>plan.date&&r.fee<=cash&&(cash-r.fee)*500000>=(finance.weekly+r.wage*500000)*26&&(cash-r.fee)*500000+finance.annualReceipts>=(finance.weekly+r.wage*500000)*52&&!(c.competition.teams.find(t=>t.id===entry.registeredClub)?.xi.includes(p.id)&&average+3<p.rating))
   .sort((a,b)=>a.report.fee-b.report.fee||b.player.rating-a.player.rating||a.player.id.localeCompare(b.player.id));
  for(const target of pool){if(!legalClub(c,target.entry.registeredClub,target.entry.id))continue;targets.push({player:target.player,report:target.report});if(targets.length===2)break;}
  return {position:need.position,targets};
 });
}
