import {FORMATIONS} from './engine.js';
import {POSITION_SLOTS,matchPositions,canPlayPosition} from './player-positions.js';
import {legend} from './legends.js';

// Slot order is formation order, independent of the order in which cards were picked.
export function assignSlots(ids,formation,version=1){
 if(version===2)return (matchPositions((ids||[]).map(legend),formation)||POSITION_SLOTS[formation].map(()=>null)).map(p=>p?.id||null);
 const slots=FORMATIONS[formation].map(()=>null);
 for(const id of ids||[]){const p=legend(id);if(!p)continue;const index=FORMATIONS[formation].findIndex((s,i)=>!slots[i]&&s.role===p.role);if(index>=0)slots[index]=id;}
 return slots;
}
export function eligibility(p,ids,formation,version=1){
 if(version===2){if(ids.some(id=>(legend(id)?.personId||id)===(p.personId||p.id)))return "Already in your XI";return matchPositions([...ids.map(legend),p],formation)?"":"No eligible position available";}
 if((ids||[]).some(id=>legend(id)?.personId===p.personId))return 'Already in your XI';
 const slots=assignSlots(ids,formation);
 return FORMATIONS[formation].some((s,i)=>!slots[i]&&s.role===p.role)?'':`${p.role} positions filled`;
}
export function orderedXI(ids,formation,version=1){return assignSlots(ids,formation,version).filter(Boolean);}
export function openRoles(ids,formation,version=1){const slots=assignSlots(ids,formation,version);if(version===2)return [...new Set(POSITION_SLOTS[formation].filter((s,i)=>!slots[i]))];return [...new Set(FORMATIONS[formation].filter((s,i)=>!slots[i]).map(s=>s.role))];}
export function yearEligibility(packs,year,formation,version=1){
 if(version===2){const pool=packs.filter(p=>!year||p.year===year).flatMap(p=>p.players);let ids=[];for(const p of pool)if(!eligibility(p,ids,formation,2))ids.push(p.id);return ids.length===11?[]:openRoles(ids,formation,2).map(p=>p+": no verified cover");}
 const available=packs.filter(p=>!year||p.year===year).flatMap(p=>p.players);
 const missing=[];for(const role of ['GK','DEF','MID','FWD']){const need=FORMATIONS[formation].filter(s=>s.role===role).length,have=new Set(available.filter(p=>p.role===role).map(p=>p.personId)).size;if(have<need)missing.push(`${role}: ${have} available / ${need} needed`);}
 return missing;
}
export function filterCards(cards,ids,formation,{role='ALL',minimum=0,sort='source',hidden=false,version=1}={}){
 const result=cards.filter(p=>!eligibility(p,ids,formation,version)&&(role==='ALL'||(version===2?canPlayPosition(p,role):p.role===role))&&(hidden||p.rating>=minimum));
 if(sort==='name')result.sort((a,b)=>a.name.localeCompare(b.name));
 if(!hidden&&sort==='high')result.sort((a,b)=>b.rating-a.rating||a.name.localeCompare(b.name));
 if(!hidden&&sort==='low')result.sort((a,b)=>a.rating-b.rating||a.name.localeCompare(b.name));
 return result;
}

// A seeded shuffle, not adjacent LCG samples: every reveal consumes a different pack.
export function drawPack(packs,ids,formation,seen,seed,roll,version=1){
 const eligible=packs.filter(p=>p.players.some(q=>!eligibility(q,ids,formation,version)));
 let pool=eligible.filter(p=>!seen.includes(p.id));
 if(!pool.length)pool=eligible.filter(p=>p.id!==seen.at(-1));
 if(!pool.length)pool=eligible;
 if(!pool.length)throw Error('No eligible squad remains for this formation.');
 const previous=packs.find(p=>p.id===seen.at(-1));
 if(previous&&pool.some(p=>p.club!==previous.club))pool=pool.filter(p=>p.club!==previous.club);
 let x=(seed^Math.imul(roll,0x9e3779b9))>>>0;
 const random=()=>{x^=x<<13;x^=x>>>17;x^=x<<5;return (x>>>0)/4294967296;};
 for(let i=pool.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[pool[i],pool[j]]=[pool[j],pool[i]];}
 return pool[0].id;
}
