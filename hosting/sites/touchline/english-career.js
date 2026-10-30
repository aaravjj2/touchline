import {ENGLISH_PACKS} from './english-catalog.js';
import {selectSquad} from './europe-clubs.js';
import {FOUNDING_PACK} from './founding-squad.js';
import {FOUNDING_BUDGETS,DEFAULT_FOUNDING_BUDGET} from './club-funding.js';

export const englishClub=id=>ENGLISH_PACKS.find(p=>p.id===id);
export const isEnglishSandbox=c=>c?.setup?.kind==='english-sandbox';
export function englishCareerStart({clubId,custom=false,name='',color='#b6f36a',budget=DEFAULT_FOUNDING_BUDGET}={}){
 const club=englishClub(clubId);if(!club)throw Error('Choose an available English club.');
 name=String(name).trim().replace(/\s+/g,' ');
 if(custom&&(name.length<3||name.length>32||/[<>\u0000-\u001f]/.test(name)))throw Error('Use a club name between 3 and 32 characters, without markup.');
 if(custom&&ENGLISH_PACKS.some(p=>p.club.toLowerCase()===name.toLowerCase()))throw Error('Give your new club a distinct name.');
 if(custom&&!/^#[0-9a-f]{6}$/i.test(color))throw Error('Choose a valid club colour.');
 if(custom&&!FOUNDING_BUDGETS.some(p=>p.units===Number(budget)))throw Error('Choose a supported starting budget.');
 const squad=selectSquad(custom?FOUNDING_PACK:club);
 return {...squad,name:custom?name:club.club,credits:custom?Number(budget):club.budget,setup:{kind:'english-sandbox',clubId:club.id,custom:!!custom,replacedClub:club.club,color:custom?color:club.color,startingBudget:custom?Number(budget):club.budget,...(custom?{squadOrigin:'original-founding',fundingPolicy:1}:{}),season:club.era,source:club.source,checked:club.checked}};
}
export function englishOppositionField(user,setup){
 if(!englishClub(setup.clubId))throw Error('Unknown club replacement.');
 return [{...user,color:setup.color,clubIdentity:setup.custom?user.name:englishClub(setup.clubId).club},...ENGLISH_PACKS.filter(p=>p.id!==setup.clubId).map(pack=>{
  const squad=selectSquad(pack),xi=squad.xi.map(id=>pack.players.find(p=>p.id===id)),avg=k=>xi.reduce((n,p)=>n+p[k],0)/xi.length;
  return {id:pack.id,name:pack.club,color:pack.color,mark:pack.club.split(' ').slice(0,2).map(w=>w[0]).join(''),formation:squad.formation,xi:squad.xi,roster:structuredClone(pack.players),rating:avg('rating'),attack:avg('attack'),defense:avg('defense'),source:pack.source};
 })];
}
