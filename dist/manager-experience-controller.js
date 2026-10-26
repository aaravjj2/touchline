import {positionCareer,positionProfile} from './manager-positions.js';
import {POSITION_SLOTS,canPlayPosition} from './player-positions.js';
import {managerView,setManagerView,rotationProposal,managerSnapshot,managerAftermath,managerPrimary,managerDealImpact} from './manager-experience.js';
import {money} from './manager-money.js';
import {managerCommand} from './manager-career.js';
import {legend} from './legends.js';
let installed=false;
export function afterManagerUICommand(c,command){
 if(command.type==='enquire')setManagerView(c,{page:'transfers',deal:c.management.deals.at(-1).id,aftermath:false,preparing:false});
 if(command.type==='founder-sign')setManagerView(c,{page:'transfers',transferTab:'founder',deal:null});
 if(command.type==='resolve')setManagerView(c,{page:'office',message:null});
}
export function installManagerExperience({career,pending,render,save,toast,navigate}){
 if(installed)return;installed=true;
 const refresh=(focus=true)=>{render();if(focus){const target=document.querySelector('.mgr-comparison h3,.mgr-proposed-team')||document.querySelector('[data-view-focus]');if(target){target.setAttribute('tabindex','-1');target.focus({preventScroll:true});}window.scrollTo({top:0,behavior:'instant'});}};
 document.addEventListener('click',e=>{
  const el=e.target.closest('[data-action^="eu-view-"]');if(!el||el.disabled||!career()?.management)return;e.preventDefault();e.stopImmediatePropagation();const c=career(),s=managerView(c),a=el.dataset.action.slice(8),id=el.dataset.value;
  try{
   if(['swap','apply-proposal'].includes(a)&&pending())throw Error('Finish your saved live fixture before changing the team.');
   if(a==='page')setManagerView(c,{page:id,preparing:false,aftermath:false,message:null,deal:null,...(id==='transfers'?{transferTab:'discover'}:{})});
   else if(a==='prepare')setManagerView(c,{page:'squad',preparing:true,aftermath:false,squadTab:'lineup',proposal:null,player:null});
   else if(a==='continue')setManagerView(c,{page:'office',aftermath:false,preparing:false,message:null});
   else if(a==='club')setManagerView(c,{page:'club',clubTab:'overview',aftermath:false,preparing:false});
   else if(a==='review'||a==='table')setManagerView(c,{page:'season',seasonTab:a==='review'?'review':'standings',aftermath:false,preparing:false});
   else if(a==='contracts'||a==='finances')setManagerView(c,{page:'club',clubTab:a==='contracts'?'contracts':'finances',player:id,aftermath:false,preparing:false});
   else if(a==='squad-tab')setManagerView(c,{page:'squad',squadTab:id,proposal:null,aftermath:false});
   else if(a==='recruit-position')setManagerView(c,{page:'transfers',transferTab:'discover',transferPosition:id,transferPage:0,browseAll:true,deal:null,aftermath:false,preparing:false});
   else if(a==='club-tab')setManagerView(c,{clubTab:id});
   else if(a==='season-tab')setManagerView(c,{seasonTab:id});
   else if(a==='browse-players')setManagerView(c,{browseAll:true,transferPage:0});
   else if(a==='transfer-page')setManagerView(c,{transferPage:Math.max(0,Number(id)||0),transferSearch:JSON.stringify([c.management.filters,s.transferPosition,s.browseAll])});
   else if(a==='founder')setManagerView(c,{page:'transfers',transferTab:'founder',deal:null,aftermath:false,preparing:false});
   else if(a==='offers')setManagerView(c,{page:'transfers',transferTab:'offers',deal:null,aftermath:false,preparing:false});
   else if(a==='transfer-tab')setManagerView(c,{transferTab:id,deal:null});
   else if(a==='slot')setManagerView(c,{slot:Number(id),player:c.xi[Number(id)],cover:null});
   else if(a==='cover')setManagerView(c,{cover:id});
   else if(a==='player')setManagerView(c,{page:'squad',squadTab:'player',player:id,aftermath:false,preparing:false});
   else if(a==='swap'){
    const index=c.xi.indexOf(s.player);if(index<0||!c.bench.includes(id)||(positionCareer(c)?!canPlayPosition(positionProfile(legend(id)),POSITION_SLOTS[c.formation][index]):legend(id).role!==legend(s.player).role))throw Error('Choose eligible cover for a starting player.');const xi=[...c.xi];xi[index]=id;managerCommand(c,{type:'lineup',xi,formation:c.formation});save();setManagerView(c,{player:id,cover:null});toast('Starting XI updated.');
   }else if(a==='rotation')setManagerView(c,{page:'squad',squadTab:'lineup',aftermath:false,proposal:{xi:rotationProposal(c),formation:c.formation,mode:'rotation'}});
   else if(a==='apply-proposal'){if(!s.proposal)throw Error('Preview a team first.');managerCommand(c,{type:'lineup',xi:s.proposal.xi,formation:s.proposal.formation});save();setManagerView(c,{proposal:null,player:null,cover:null,squadTab:'lineup'});toast('Proposed XI applied.');}
   else if(a==='cancel-proposal')setManagerView(c,{proposal:null});
   else if(a==='compare'){if(!s.compare.includes(id)&&s.compare.length>=3)throw Error('Compare up to three players. Remove one before adding another.');setManagerView(c,{compare:s.compare.includes(id)?s.compare.filter(q=>q!==id):s.compare.concat(id)});}
   else if(a==='deal')setManagerView(c,{page:'transfers',deal:id,aftermath:false,preparing:false});
   else if(a==='close-deal')setManagerView(c,{deal:null,transferTab:'conversations'});
   else if(a==='message'||a==='event')setManagerView(c,{page:'office',message:a==='event'?'event':id,aftermath:false});
   else if(a==='all-priorities')setManagerView(c,{allPriorities:!s.allPriorities});
   else if(a==='priorities')setManagerView(c,{page:'office',message:c.event?'event':null,aftermath:false});
   else if(a==='pending'){navigate('europe');return;}
   else if(a==='last-report'){
    let report=s.report;if(!report||report.matches!==c.history.length||report.season!==c.season){const before=managerSnapshot(c);before.matches--;report=managerAftermath(c,before);if(report){report.facts=report.facts.filter(f=>f.title!=='Board confidence');report.previousRank=report.rank;}}
    if(report)setManagerView(c,{report,aftermath:true});
   }
   refresh(!['compare','all-priorities'].includes(a));
   if(a==='cover')document.querySelector('.mgr-comparison')?.scrollIntoView({block:'nearest'});
   if(a==='contracts'&&id)document.getElementById('contract-'+id)?.scrollIntoView({block:'center'});
  }catch(error){toast(error.message);}
 },true);
 document.addEventListener('submit',e=>{if(!e.target.matches('[data-manager-view-form="proposal"]')||!career())return;e.preventDefault();e.stopImmediatePropagation();try{const data=Object.fromEntries(new FormData(e.target)),c=career();setManagerView(c,{proposal:{xi:rotationProposal(c,data.formation,data.mode),formation:data.formation,mode:data.mode}});refresh();}catch(error){toast(error.message);}},true);
 document.addEventListener('change',e=>{if(e.target.dataset.managerViewSelect==='position'&&career()){setManagerView(career(),{transferPosition:e.target.value,transferPage:0});refresh();return;}if(e.target.dataset.managerViewSelect==='player'&&career()){setManagerView(career(),{player:e.target.value});refresh();}});
 document.addEventListener('keydown',e=>{if(e.target.getAttribute('role')!=='tab'||!e.target.matches('[data-action="eu-view-season-tab"]')||!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;e.preventDefault();e.stopImmediatePropagation();const buttons=[...e.target.closest('[role=tablist]').querySelectorAll('[role=tab]')],index=buttons.indexOf(e.target),next=e.key==='Home'?0:e.key==='End'?buttons.length-1:(index+(e.key==='ArrowRight'?1:-1)+buttons.length)%buttons.length;buttons[next].click();document.querySelector('.mgr-subnav [role=tab][aria-selected=true]')?.focus();},true);
 document.addEventListener('input',e=>{const form=e.target.closest('[data-manager-form="deal"]'),c=career();if(!form||!c)return;const d=c.management.deals.find(d=>d.id===form.dataset.id);if(!d)return;const data=Object.fromEntries(new FormData(form)),unit=Number(form.dataset.moneyUnit)||1,terms={fee:Number(data.fee)/unit,wage:Number(data.wage)/unit,share:Number(data.share??d.share)},impact=managerDealImpact(c,d,terms);for(const [key,value]of Object.entries(impact)){const node=document.querySelector('[data-impact="'+key+'"]');if(node)node.textContent=Number.isFinite(value)?money(c,value):'—';}});
}
