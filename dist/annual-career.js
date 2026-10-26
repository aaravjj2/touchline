import {FIELD} from './club-field.js';
import {createPlayerCareer,overall,FOCUSES} from './player-career-core.js';
import {rng} from './competition.js';
import {upgradeChapters,advanceChapter,resolveChapter,IDENTITIES,syncCareerSkills} from './career-chapters.js';
import {enableCareerDepth,ORIGINS,depthYearStart} from './career-depth.js';
import {startingClubOffers} from './career-recruitment.js';
import {worldClub,createCircuit} from './career-world.js';
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const countryKey=s=>String(s).trim().toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu,'');
const domestic={spain:'ESP',england:'ENG',france:'FRA',germany:'GER',italy:'ITA',portugal:'POR',netherlands:'NED',turkey:'TUR',norway:'NOR',greece:'GRE',belgium:'BEL'};
export function careerClub(id){return worldClub(id);}
export function startingClub({nation,path,access='local',seed}){
 const random=rng((seed^0x58c9ab1)>>>0),code=domestic[countryKey(nation)],local=FIELD.filter(t=>t.country===code);
 let pool;
 if(access==='international')pool=FIELD.filter(t=>path==='prospect'?t.rating>=83:t.rating<=85);
 else if(local.length)pool=path==='prospect'?local.filter(t=>t.rating>=Math.max(...local.map(t=>t.rating))-5):local.filter(t=>t.rating<=Math.min(...local.map(t=>t.rating))+8);
 else if(random()<(path==='prospect'?.08:.025))pool=FIELD.filter(t=>t.rating<=83);
 else return {id:'academy:'+encodeURIComponent(String(nation).trim()||'Local'),reason:'A fictional local development side represents your starting pathway. Limited scouting exposure makes a direct elite-club move uncommon; strong seasons can open the international market.'};
 return {id:pool[Math.floor(random()*pool.length)].id,reason:access==='international'?'International academy exposure opens a wider scouting pool. Your ability and competition for places still decide playing time.':'A club drawn from your domestic scouting pathway and starting profile. A top prospect may join a major academy without a guaranteed first-team place.'};
}
export function createAnnualCareer(options){
 if(!['local','international'].includes(options.access||'local'))throw Error('Choose a scouting pathway.');
 if(options.identity&&IDENTITIES[options.identity]?.role!==(options.role||'FWD'))throw Error('Choose a playing identity that fits your position.');
 const deep=options.depth===true||options.depth==='on',origin=options.origin||'academy',age=Number(options.age??18),bounds=origin==='comeback'?[25,34]:origin==='late'?[20,28]:[16,24];
 if(deep&&(!ORIGINS[origin]||!Number.isInteger(age)||age<bounds[0]||age>bounds[1]))throw Error('Choose a valid origin and starting age ('+bounds.join('–')+').');
 const c=createPlayerCareer({...options,age:deep?Math.min(age,24):age,club:'club23'});if(deep)c.age=c.startAge=age;let draw=startingClub({...options,nation:c.nation,path:c.path,access:options.access||'local'});
 if(!options.recruitment&&options.startClub&&options.startClub!=='random'){const id=options.startClub==='local'?'academy:'+encodeURIComponent(c.nation):options.startClub;if(!worldClub(id)||(!FIELD.some(t=>t.id===id)&&options.startClub!=='local'))throw Error('Choose an available first club.');draw={id,reason:'You chose your first club. Squad competition and role fit determine your playing time.'};}
 const career={...c,version:2,mode:'annual',club:draw.id,access:options.access||'local',arrival:draw.reason,decisions:[],yearJob:null,pendingDecision:null,totals:{...c.totals,assists:0},competitionOptions:{europe:options.europe===true||options.europe==='on',world:options.world===true||options.world==='on'}};upgradeChapters(career,options.identity);if(deep){enableCareerDepth(career,{origin,initial:true});syncCareerSkills(career);}if(options.recruitment===true||options.recruitment==='on'){const offers=startingClubOffers(career),id=options.startClub==='local'?'academy:'+encodeURIComponent(career.nation):options.startClub==='random'?offers[Math.floor(rng(career.seed)()*offers.length)].id:options.startClub,offer=offers.find(o=>o.id===id);if(!offer)throw Error('Choose one of the clubs offering a realistic starting pathway.');career.club=id;career.worlds={};const circuit=createCircuit(worldClub(id),career.seed,career.season);career.worlds[circuit.country]=circuit;career.recruitment={version:1,entryOffers:offers};depthYearStart(career);career.arrival=offer.reason;}return career;
}
export function migrateAnnual(c){c.version=2;c.mode='annual';c.decisions||=[];c.totals.assists||=0;c.access||='local';return c;}
const poisson=(mean,random)=>{const limit=Math.exp(-Math.max(.02,mean));let p=1,n=0;do{p*=random();n++;}while(p>limit&&n<18);return n-1;};
function annualFixture(c){
 const random=rng((c.seed^Math.imul(c.season*100+c.week+1,0x9e3779b9))>>>0),club=careerClub(c.club),ability=overall(c),hurt=c.injury>0,hadContract=c.contract>0;
 c.energy=clamp(c.energy+(c.focus==='recovery'?35:c.intensity==='light'?27:c.intensity==='intense'?13:21)+(c.attributes.stamina-70)*.12,25,100);
 const growth=(c.age<23?.15:c.age<28?.08:c.age<32?.025:0)*(c.intensity==='intense'?1.45:c.intensity==='light'?.7:1)*(c.yearJob?.growth??1);
 if(!hurt&&c.focus!=='recovery')for(const k of Object.keys(c.attributes))if(c.focus==='balanced'||k===c.focus)c.attributes[k]=Math.min(c.potential,c.attributes[k]+growth*(c.focus==='balanced'?.55:1.65));
 const chance=clamp(.45+(ability-(club.rating-12))*.025+(c.trust-50)*.007+(c.energy-80)*.004,.08,.96),starts=!hurt&&hadContract&&random()<chance,minutes=starts?65+Math.floor(random()*26):!hurt&&hadContract&&random()<.5?15+Math.floor(random()*25):0;
 const contribution=minutes/90*(ability-(club.rating-12))/100,advantage=(club.rating-(club.rating-6+random()*12))/22+contribution,shots=minutes&&c.role!=='GK'?poisson((c.role==='FWD'?2.6:c.role==='MID'?1.1:.4)*minutes/90,random):0;
 let goals=0;for(let i=0;i<shots;i++)if(random()<clamp(.08+(c.attributes.attack-50)*.003+advantage*.02,.04,.35))goals++;
 const otherGoals=poisson(Math.exp(advantage)*1.15,random);let assists=0;for(let i=0;i<otherGoals&&minutes;i++)if(random()<clamp((c.attributes.control-35)*.004*(c.role==='MID'?1.3:c.role==='GK'?.1:.8)*minutes/90,0,.45))assists++;
 const onTarget=poisson(4.2*Math.exp(-advantage),random);let saves=0,conceded=0;
 if(c.role==='GK'&&minutes){for(let i=0;i<onTarget;i++)random()<clamp(.4+c.attributes.defense*.0045,.4,.87)?saves++:conceded++;}else conceded=poisson(1.2*Math.exp(-advantage),random);
 const score=[otherGoals+goals,conceded],win=score[0]>score[1],rating=minutes?clamp(6+goals*.8+assists*.45+saves*.12+(win?.35:score[0]===score[1]?0:-.25)-(c.role==='GK'?conceded*.18:0),4,10):0;
 c.week++;if(hurt)c.injury--;c.energy=clamp(c.energy-minutes/90*(c.intensity==='intense'?25:19)*(1+(70-c.attributes.stamina)/100),25,100);
 if(minutes&&!hurt&&random()<(c.intensity==='intense'?.035:.017)){c.injury=2+Math.floor(random()*5);}
 c.trust=clamp(c.trust+(minutes?(rating>=7?2:rating>=6?.5:-1):hurt?0:.2),5,95);c.morale=clamp(c.morale+(minutes?(win?2:score[0]===score[1]?0:-1):-1),20,95);
 c.reputation=clamp(c.reputation+(minutes?Math.max(-.08,(rating-5.8)*.22)+goals*.1:0),0,100);if(hadContract)c.earnings+=c.wage;c.contract=Math.max(0,c.contract-1);
 const row={season:c.season,week:c.week,club:c.club,opponent:null,opponentName:club.fictional?'Regional league opposition':'League opposition',score,minutes,rating,selection:hurt?'Injured':!hadContract?'Out of contract':starts?'Starter':minutes?'Substitute':'Not selected',goals,assists,shots,saves,recoveries:0,overall:overall(c),model:'annual-statistical-v1'};
 c.history.push(row);c.totals.appearances+=minutes?1:0;for(const k of ['minutes','goals','assists','shots','saves'])c.totals[k]=(c.totals[k]||0)+row[k];
}
function finishYear(c){
 const rows=c.history.filter(r=>r.season===c.season),played=rows.filter(r=>r.minutes>0);
 c.seasons=c.seasons.filter(s=>s.season!==c.season);c.seasons.push({season:c.season,age:c.age,club:c.club,appearances:played.length,minutes:rows.reduce((n,r)=>n+r.minutes,0),goals:rows.reduce((n,r)=>n+r.goals,0),assists:rows.reduce((n,r)=>n+(r.assists||0),0),saves:rows.reduce((n,r)=>n+r.saves,0),overall:overall(c),average:played.length?played.reduce((n,r)=>n+r.rating,0)/played.length:0,model:'annual-statistical-v1',development:{overall:overall(c)-(c.yearJob?.startOverall??overall(c)),reputation:Math.round((c.reputation-(c.yearJob?.startReputation??c.reputation))*10)/10,minutesShare:Math.round(rows.reduce((n,r)=>n+r.minutes,0)/(38*90)*100)}});
 c.season++;c.age++;c.week=0;c.yearJob=null;c.pendingDecision=null;c.lastMatch=null;c.energy=100;c.injury=0;c.morale=Math.max(60,c.morale);
 if(c.age>=31)for(const k of Object.keys(c.attributes))c.attributes[k]=Math.max(35,c.attributes[k]-(k==='stamina'?1.4:.55));
 c.retired=c.age>=40;
 c.offers=c.retired?[]:FIELD.filter(t=>t.id!==c.club&&t.rating<=overall(c)+18&&(t.rating<88||c.reputation>25)).sort((a,b)=>Math.abs(a.rating-overall(c)-7)-Math.abs(b.rating-overall(c)-7)).slice(0,3).map(t=>({club:t.id,wage:Math.round((overall(c)-40)*100*t.rating/80),weeks:76,expires:38,role:overall(c)>=t.rating-12?'First-team opportunity':'Rotation prospect'}));
}
export function advancePlayerYear(c){
 migrateAnnual(c);if(c.retired)throw Error('This player is retired.');if(c.pendingDecision)return c;
 if(c.chapterVersion===3)return advanceChapter(c);
 if(!FOCUSES[c.focus]||!['light','normal','intense'].includes(c.intensity))throw Error('Choose valid preparation.');
 if(c.week===38){c.age++;c.season++;c.week=0;c.energy=100;if(c.age>=40){c.retired=true;return c;}}
 if(!c.yearJob){const random=rng((c.seed^Math.imul(c.season,0x45d9f3b))>>>0);c.yearJob={season:c.season,decisionWeek:random()<.65?Math.max(c.week+1,12+Math.floor(random()*12)):null,resolved:false,growth:1,startOverall:overall(c),startReputation:c.reputation};}
 while(c.week<38){annualFixture(c);if(!c.yearJob.resolved&&c.week===c.yearJob.decisionWeek){const development=c.trust<60;c.pendingDecision={id:c.season+':'+c.week,kind:development?'opportunity':'workload',title:development?'A route to more minutes.':'A specialist training invitation.',text:development?'Your agent can arrange a development placement, or you can compete for your place at your current club.':'A focused block could accelerate your strongest skill, with less time for general preparation.',choices:development?[{id:'placement',label:'Take development placement',trade:'Move to a development club; more trust, lower wage.'},{id:'stay',label:'Fight for my place',trade:'Keep your club and wage; a demanding training block costs energy.'}]:[{id:'specialize',label:'Take specialist block',trade:'Faster growth this year; more fatigue during the block.'},{id:'balanced',label:'Keep a balanced year',trade:'Maintain recovery and a steadier development pace.'}]};return c;}}
 finishYear(c);return c;
}
export function resolveAnnualDecision(c,value){
 if(c.chapterVersion===3)return resolveChapter(c,value);
 const decision=c.pendingDecision;if(!decision||!decision.choices.some(x=>x.id===value))throw Error('Choose an available decision.');
 if(value==='placement'){const from=c.club;c.club=FIELD.filter(t=>t.rating<=overall(c)+6).sort((a,b)=>a.rating-b.rating)[0]?.id||c.club;c.transfers.push({season:c.season,week:c.week,from,to:c.club,wage:Math.round(c.wage*.8),type:'development move'});c.wage=Math.round(c.wage*.8);c.trust=70;c.contract=Math.max(c.contract,38);}
 if(value==='stay'){c.trust=Math.min(95,c.trust+5);c.energy=Math.max(25,c.energy-8);}
 if(value==='specialize'){c.yearJob.growth=1.4;c.energy=Math.max(25,c.energy-12);}
 if(value==='balanced'){c.energy=Math.min(100,c.energy+10);c.morale=Math.min(95,c.morale+3);}
 c.decisions.push({...decision,choice:value});c.pendingDecision=null;c.yearJob.resolved=true;return c;
}
