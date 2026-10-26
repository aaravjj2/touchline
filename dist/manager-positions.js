import {FORMATIONS} from './engine.js';
import {POSITION_SLOTS,canPlayPosition,positionsFor} from './player-positions.js';

export const positionCareer=c=>c?.careerRulesVersion===2;
// Club coach confirms both flanks before the opening-day cutoff. New rules only.
export const positionProfile=p=>p?.id==='super-roma-250212323'?{...p,positions:['RB','RWB','LWB'],positionSource:'https://www.asroma.com/en/news/75279/gasperinis-comments-ahead-of-roma-v-fiorentina',positionEffective:'2026-05-03'}:{...p,positions:[...positionsFor(p)]};
export function selectPositionTeam(players,preferred='4-3-3',score=p=>p.rating){
 const pool=players.map(positionProfile).sort((a,b)=>score(b)-score(a)||a.id.localeCompare(b.id));
 for(const formation of [...new Set([preferred,...Object.keys(POSITION_SLOTS)])]){
  const labels=POSITION_SLOTS[formation];if(!labels)continue;const slots=labels.map(()=>null);
  const visit=(p,seen)=>{for(let i=0;i<labels.length;i++){if(seen.has(i)||!canPlayPosition(p,labels[i]))continue;seen.add(i);if(!slots[i]||visit(slots[i],seen)){slots[i]=p;return true;}}return false;};
  const people=new Set();for(const p of pool){if(people.has(p.personId||p.id))continue;people.add(p.personId||p.id);visit(p,new Set());if(slots.every(Boolean))return {formation,xi:slots.map(p=>p.id)};}
 }
 throw Error('No complete XI in verified natural positions. Recruit positional cover or choose another formation.');
}
export function validPositionXI(players,xi,formation){const labels=POSITION_SLOTS[formation];return !!labels&&xi.length===11&&new Set(xi).size===11&&xi.every((id,i)=>{const p=players.find(p=>p.id===id);return p&&canPlayPosition(positionProfile(p),labels[i]);});}
// Adapt only new-career match rosters to the physical engine's broad roles.
export function positionRoster(roster,xi,formation){return roster.map(p=>{const i=xi.indexOf(p.id);return {...positionProfile(p),...(i<0?{}:{role:FORMATIONS[formation][i].role,assignedPosition:POSITION_SLOTS[formation][i]})};});}
