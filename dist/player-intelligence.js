import {PLAYER_INTELLIGENCE,INTELLIGENCE_META} from './player-intelligence-data.js';
import {SUPER_INTELLIGENCE} from './super-intelligence-data.js';
export {INTELLIGENCE_META};
export const intelligenceFor=p=>PLAYER_INTELLIGENCE[typeof p==='string'?p:p?.id]||SUPER_INTELLIGENCE[typeof p==='string'?p:p?.id]||null;
const norm=s=>String(s||'').toLowerCase().replace(/[^a-z]/g,'');
export function contractApplies(p,record=intelligenceFor(p)){
 if(!record?.contract?.end)return false;
 const end=record.contract.end;if(end.length===4?end<=INTELLIGENCE_META.checked.slice(0,4):end<=INTELLIGENCE_META.checked)return false;
 if(record.contract.status==='club-confirmed')return true;
 return !!p.club&&norm(record.sourceClub).includes(norm(p.club));
}
export function ageAt(birthDate,date=INTELLIGENCE_META.checked){
 if(!/^\d{4}-\d{2}-\d{2}$/.test(birthDate||''))return null;
 const b=new Date(birthDate+'T00:00:00Z');if(!Number.isFinite(+b)||b.toISOString().slice(0,10)!==birthDate)return null;
 const n=Number(date.slice(0,4))-b.getUTCFullYear()-(date.slice(5)<birthDate.slice(5)?1:0);return n>=14&&n<=60?n:null;
}
export function potentialRange(p,c=null){
 const age=ageAt(p.birthDate||intelligenceFor(p)?.birthDate,c?.world?.date||INTELLIGENCE_META.checked);if(age===null)return null;
 const room=age<=18?[7,15]:age<=21?[4,11]:age<=24?[2,7]:age<=27?[0,3]:[0,1],base=Math.min(99,Math.round(p.rating));
 if(c?.world){const current=Math.min(99,base+(c.condition[p.id]?.growth||0)),ceiling=Math.min(99,base+3);return {low:Math.max(current,Math.min(ceiling,base+Math.min(3,room[0]))),high:Math.max(current,Math.min(ceiling,base+Math.min(3,room[1]))),age,status:'Touchline scouting estimate',method:'Touchline estimate. This career caps overall growth at +3 from starting ability. Progress depends on playing time and training; the range is not guaranteed.'};}
 return {low:Math.min(99,base+room[0]),high:Math.min(99,base+room[1]),age,status:'Touchline scouting estimate',method:'Age band and authored current ability; not an EA/FM rating or a promised outcome.'};
}
export function gameFinancialProfile(p){
 const data=intelligenceFor(p),market=data?.marketValue,hasRecentValue=market?.gbp>0&&market.date>='2025-01-01';
 const feeGbp=hasRecentValue?market.gbp:Math.max(250000,Math.round((p.rating-55)**2*12000/50000)*50000);
 const wageGbp=data?.wage?.gbpWeekly||Math.round(Math.max(1000,Math.min(400000,hasRecentValue?market.gbp*.04/52:(p.rating-50)**2*20))/500)*500;
 return {feeGbp,wageGbp,feeSource:hasRecentValue?'Published market estimate':'Touchline valuation estimate',wageSource:data?.wage?'Reported wage estimate':'Touchline wage estimate'};
}
