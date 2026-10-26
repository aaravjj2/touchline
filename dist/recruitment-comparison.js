import {POSITION_SLOTS,positionsFor,canPlayPosition} from './player-positions.js';
import {positionProfile} from './manager-positions.js';
import {legend} from './legends.js';

// Read-only presentation. Do not change negotiation promises or older career rules.
export function recruitmentComparison(c,player,intended='ALL'){
 const profile=positionProfile(player),labels=POSITION_SLOTS[c.formation]||[];
 if(!positionsFor(profile).length)return {comparable:false,difference:null,position:null,starter:null,role:null,message:'Natural position unverified; no positional comparison available.'};
 const slots=labels.map((position,i)=>({position,starter:legend(c.xi[i])})).filter(s=>s.starter&&(intended==='ALL'||!intended||s.position===intended)&&canPlayPosition(profile,s.position)).sort((a,b)=>a.starter.rating-b.starter.rating||a.position.localeCompare(b.position));
 const slot=slots[0];if(!slot)return {comparable:false,difference:null,position:intended==='ALL'?null:intended,starter:null,role:null,message:'No eligible slot in this formation for the intended position.'};
 const difference=player.rating-slot.starter.rating;
 return {comparable:true,difference,position:slot.position,starter:slot.starter.name,role:difference>0?'starter':'rotation',message:null};
}
