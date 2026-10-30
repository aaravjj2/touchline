import {WORLD_PACKS,SUPER_PACKS,SUPER_MEMBERSHIP,SUPER_AUDIT} from './super-catalog.js';
import {DEFAULT_FOUNDING_BUDGET,FOUNDING_BUDGETS} from './club-funding.js';
import {initializeSandboxWorld,sandboxCompetition,isSuperLeague,sandboxProfile} from './sandbox-world.js';
import {upgradeManager} from './manager-career.js';
import {INTELLIGENCE_META,gameFinancialProfile} from './player-intelligence.js';
export function createSandboxCareer({kind='english-sandbox',clubId,custom=false,name='',color='#b6f36a',budget=DEFAULT_FOUNDING_BUDGET,seed=20261018}={}){
 if(!['english-sandbox','super-league'].includes(kind))throw Error('Choose a supported career world.');
 const field=kind==='super-league'?SUPER_PACKS:WORLD_PACKS.filter(c=>c.country==='ENG'),club=field.find(c=>c.id===clubId);if(!club)throw Error('Choose an eligible club.');
 name=String(name).trim().replace(/\s+/g,' ');
 if(custom&&(name.length<3||name.length>32||/[<>\u0000-\u001f]/.test(name)||WORLD_PACKS.some(p=>p.club.toLowerCase()===name.toLowerCase())))throw Error('Use a distinct club name between 3 and 32 characters, without markup.');
 if(custom&&(club.country!=='ENG'||!/^#[0-9a-f]{6}$/i.test(color)||!FOUNDING_BUDGETS.some(p=>p.units===Number(budget))))throw Error('Choose an English league place, valid colour and supported funding.');
 const c={version:1,season:1,seed,name:custom?name:club.club,hostClub:club.club,manager:'architect',credits:custom?Number(budget):club.budget,trust:65,training:'balanced',condition:{},history:[],scouted:[],event:null,tab:'squad',setup:{kind,clubId,custom,replacedClub:club.club,color:custom?color:club.color,startingBudget:custom?Number(budget):club.budget,season:'2026–27',...(custom?{squadOrigin:'original-founding',fundingPolicy:1}:{}),...(kind==='super-league'?{membership:structuredClone(SUPER_MEMBERSHIP),dataAudit:structuredClone(SUPER_AUDIT)}:{}),source:club.source,checked:club.checked},economy:{version:3,currency:'GBP',unitGbp:500000,sourceSnapshot:INTELLIGENCE_META.snapshot,fx:structuredClone(INTELLIGENCE_META.fx)}};
 initializeSandboxWorld(c);upgradeManager(c);
 // Management initialization supplies legacy defaults; restore authored new-world wages.
 for(const p of c.world.players.filter(p=>p.registeredClub==='user')){const s=c.condition[p.profileId];s.wage=p.wageGbp/500000;s.wageBasis=gameFinancialProfile(sandboxProfile(p.profileId)).wageSource;}
 const weakest=['GK','DEF','MID','FWD'].map(role=>({role,value:c.xi.map(sandboxProfile).filter(p=>p.role===role).reduce((n,p)=>n+p.rating,0)/c.xi.map(sandboxProfile).filter(p=>p.role===role).length})).sort((a,b)=>a.value-b.value)[0].role;
 c.management.objective={name:custom?'Build a stable club':isSuperLeague(c)?club.objectiveRank<=6?'Challenge for the top six':'Establish a top-half side':c.management.objective.name,rank:custom?16:isSuperLeague(c)?club.objectiveRank:c.management.objective.rank};
 c.management.recruitmentPriority=custom?'Build a first team around your weakest '+weakest+' unit':club.priority||'Strengthen '+weakest+' cover and protect the wage bill';c.management.page='office';
 c.competition=sandboxCompetition(c);return c;
}
