import {PLAYER_POSITIONS} from './player-positions-data.js';
export const POSITION_SLOTS={
 '4-1-2-1-2':['GK','LB','CB','CB','RB','DM','CM','CM','AM','ST','ST'],
 '3-1-2-1-3':['GK','CB','CB','CB','DM','CM','CM','AM','LW','ST','RW'],
 '4-3-3':['GK','LB','CB','CB','RB','CM','DM','CM','LW','ST','RW'],
 '4-2-3-1':['GK','LB','CB','CB','RB','DM','DM','LW','AM','RW','ST'],
 '3-5-2':['GK','CB','CB','CB','LWB','CM','DM','CM','RWB','ST','ST'],
 '4-4-2':['GK','LB','CB','CB','RB','LM','CM','CM','RM','ST','ST'],
 '5-3-2':['GK','LWB','CB','CB','CB','RWB','CM','DM','CM','ST','ST'],
 '3-4-3':['GK','CB','CB','CB','LWB','CM','CM','RWB','LW','ST','RW'],
 '4-1-4-1':['GK','LB','CB','CB','RB','DM','LM','CM','CM','RM','ST']
};
export const positionsFor=p=>p?.positions||PLAYER_POSITIONS[p?.id]?.positions||[];
// Closely related responsibilities only. Wide attackers never automatically become strikers.
const cover={CM:['CM','DM','AM'],DM:['DM','CM'],AM:['AM','SS','CM'],LM:['LM','LW'],RM:['RM','RW'],LW:['LW','LM'],RW:['RW','RM'],LWB:['LWB','LB','LM'],RWB:['RWB','RB','RM'],LB:['LB','LWB'],RB:['RB','RWB'],CB:['CB'],ST:['ST','SS'],GK:['GK']};
export const canPlayPosition=(p,position)=>positionsFor(p).some(value=>(cover[position]||[position]).includes(value));
export const positionLabel=p=>positionsFor(p).join(' / ')||'Position unverified';
export function matchPositions(players,formation){
 const labels=POSITION_SLOTS[formation],slots=labels.map(()=>null),used=new Set();
 const visit=(p,seen)=>{for(let i=0;i<labels.length;i++){if(seen.has(i)||!canPlayPosition(p,labels[i]))continue;seen.add(i);if(!slots[i]||visit(slots[i],seen)){slots[i]=p;return true;}}return false;};
 for(const p of players){if(!p||used.has(p.personId||p.id))return null;used.add(p.personId||p.id);if(!visit(p,new Set()))return null;}
 return slots;
}
