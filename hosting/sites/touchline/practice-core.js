import {CLUBS,PLAYERS,FORMATIONS,defaultLineup} from './engine.js';
import {createCompetition} from './competition.js';
export function createPractice(club=0,lineup=defaultLineup(),formation='4-3-3',seed=123){
 const clubs=[club,...CLUBS.map((_,i)=>i).filter(i=>i!==club).slice(0,3)];
 const teams=clubs.map((id,index)=>{
  const c=CLUBS[id],used=new Set(),xi=index?FORMATIONS['4-3-3'].map(s=>{const candidates=PLAYERS.filter(p=>p.role===s.role&&!used.has(p.id));const p=candidates[(id+used.size)%candidates.length];used.add(p.id);return p.id;}):lineup;
  return {id:'practice'+id,name:c.name,color:c.color,mark:c.mark,formation:index?'4-3-3':formation,xi:xi.map(p=>index?'practice'+id+':'+p:p),roster:PLAYERS.map(p=>({...p,id:index?'practice'+id+':'+p.id:p.id})),rating:80,attack:78,defense:78};
 });
 return {version:1,club,credits:0,pending:null,competition:createCompetition(teams,{format:'league',user:teams[0].id,seed})};
}
