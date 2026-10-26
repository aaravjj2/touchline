import {dayNumber} from './manager-calendar.js';
// Unique people and separate ownership/registration are required for real worlds.
export function validateCareerWorld(world,{allowUnknownBirthDates=false}={}){
 const errors=[],clubs=new Set(),people=new Set();
 if(world?.version!==1||!world.id||!Array.isArray(world.clubs)||!Array.isArray(world.players))return {ready:false,errors:['Invalid world contract.']};
 for(const c of world.clubs){if(!c.id||clubs.has(c.id))errors.push('Duplicate club identity.');if(!Number.isSafeInteger(c.funds)||c.funds<0)errors.push('Invalid club balance.');clubs.add(c.id);}
 if(!Array.isArray(world.windows))errors.push('Missing registration windows.');
 for(const window of world.windows||[])try{dayNumber(window.start);dayNumber(window.end);if(window.end<window.start)errors.push('Invalid registration window.');}catch{errors.push('Invalid registration window.');}
 for(const p of world.players){
  if(!p.id||people.has(p.id))errors.push('Duplicate person identity: '+p.id);people.add(p.id);
  if(!clubs.has(p.owner)||!clubs.has(p.registeredClub))errors.push('Unknown player club: '+p.id);
  if(p.owner!==p.registeredClub&&(!p.loan||!p.loan.source||!p.loan.end))errors.push('Unverified loan registration: '+p.id);
  try{if(!allowUnknownBirthDates||p.birthDate!==null)dayNumber(p.birthDate);if(p.loan)dayNumber(p.loan.end);}catch{errors.push('Invalid player dates: '+p.id);}
 }
 return {ready:!errors.length,errors};
}
export function registrationWindowOpen(world,date){dayNumber(date);return world.windows.some(w=>w.start<=date&&date<=w.end);}
export function registerWorldDeal(world,deal,date){
 const snapshot=structuredClone(world);
 try{
  if(!validateCareerWorld(world,{allowUnknownBirthDates:world.kind==='fictional-sandbox'}).ready)throw Error('World integrity checks failed.');
  if(!deal?.id)throw Error('Missing agreement identity.');
  const old=world.agreements?.find(d=>d.id===deal.id);
  if(old){if(JSON.stringify(old.terms)!==JSON.stringify(deal))throw Error('Agreement identity already used.');return old.status;}
  dayNumber(date);
  const player=world.players.find(p=>p.id===deal.player),seller=world.clubs.find(c=>c.id===deal.from),buyer=world.clubs.find(c=>c.id===deal.to);
  if(!player||!seller||!buyer||seller===buyer||player.owner!==seller.id||player.owner!==player.registeredClub||!['transfer','loan'].includes(deal.kind)||!Number.isSafeInteger(deal.fee)||deal.fee<0)throw Error('Invalid ownership or transfer terms.');
  if(world.agreements?.some(d=>d.status==='pending'&&d.terms.player===player.id))throw Error('Player already has a pending agreement.');
  if(deal.kind==='loan'){dayNumber(deal.end);if(deal.end<=date)throw Error('Loan must end after registration.');}
  const reserved=(world.agreements||[]).filter(d=>d.status==='pending'&&d.terms.to===buyer.id).reduce((n,d)=>n+d.terms.fee,0);
  if(!Number.isSafeInteger(buyer.funds)||buyer.funds-reserved<deal.fee)throw Error('Insufficient available funds.');
  world.agreements||=[];const agreement={terms:structuredClone(deal),id:deal.id,status:'pending',agreed:date};world.agreements.push(agreement);
  if(registrationWindowOpen(world,date))complete(world,agreement,date);
  return agreement.status;
 }catch(error){Object.keys(world).forEach(k=>delete world[k]);Object.assign(world,snapshot);throw error;}
}
function complete(world,agreement,date){
 const d=agreement.terms,p=world.players.find(p=>p.id===d.player),from=world.clubs.find(c=>c.id===d.from),to=world.clubs.find(c=>c.id===d.to);
 if(p.owner!==d.from||p.registeredClub!==d.from||to.funds<d.fee)throw Error('Pending registration no longer valid.');
 to.funds-=d.fee;from.funds+=d.fee;p.registeredClub=d.to;
 if(d.kind==='transfer'){p.owner=d.to;delete p.loan;}else p.loan={end:d.end,source:'Touchline negotiated agreement '+d.id};
 agreement.status='complete';agreement.registered=date;
 world.ledger||=[];world.ledger.push({id:d.id,date,from:d.to,to:d.from,amount:d.fee});
}
export function processWorldRegistrations(world,date){
 dayNumber(date);const next=structuredClone(world);
 if(!validateCareerWorld(next,{allowUnknownBirthDates:next.kind==='fictional-sandbox'}).ready)throw Error('World integrity checks failed.');
 for(const p of next.players)if(p.loan&&p.loan.end<=date){p.registeredClub=p.owner;delete p.loan;}
 if(registrationWindowOpen(next,date))for(const a of next.agreements||[])if(a.status==='pending'){
  if(a.terms.kind==='loan'&&a.terms.end<=date){a.status='expired';continue;}complete(next,a,date);
 }
 Object.assign(world,next);
}
