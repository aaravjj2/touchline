import {recruitmentAssessment} from './career-recruitment.js';
import {FIELD} from './club-field.js';
import {overall,FOCUSES} from './player-career-core.js';
import {rng} from './competition.js';
import {startCareerTournaments,advanceCareerTournaments,finishCareerTournaments} from './career-tournaments.js';
import {depthYearStart,positionalFit,depthGrowth,finishCareerDepth,depthDecision,applyDepthDecision} from './career-depth.js';
import {worldClub,createCircuit,nextCircuit,table,simulateWorldFixture,squadCandidates,clamp,hash,poisson} from './career-world.js';
export const IDENTITIES={finisher:{name:'Penalty-box finisher',role:'FWD',boost:['finishing','movement']},winger:{name:'Wide creator',role:'FWD',boost:['pace','dribbling']},creator:{name:'Creative playmaker',role:'MID',boost:['vision','passing']},engine:{name:'Midfield engine',role:'MID',boost:['stamina','tackling']},organizer:{name:'Defensive organizer',role:'DEF',boost:['positioning','aerial']},progressive:{name:'Progressive defender',role:'DEF',boost:['passing','control']},stopper:{name:'Shot-stopper',role:'GK',boost:['reflexes','handling']},sweeper:{name:'Distributing keeper',role:'GK',boost:['distribution','positioning']}};
export const PRIORITIES={minutes:'Earn playing time',development:'Develop my game',honours:'Chase honours',loyalty:'Build a club legacy',money:'Financial security'};
export const SKILLS={pace:'Pace',acceleration:'Acceleration',stamina:'Conditioning',strength:'Strength',agility:'Agility',control:'First touch',dribbling:'Dribbling',passing:'Passing',vision:'Vision',finishing:'Finishing',movement:'Off-ball movement',tackling:'Tackling',positioning:'Positioning',aerial:'Aerial ability',reflexes:'Reflexes',handling:'Handling',distribution:'Distribution',reach:'Reach'};
const mean=(s,keys)=>keys.reduce((n,k)=>n+s[k],0)/keys.length;
function sync(c){const s=c.skills;c.attributes={attack:mean(s,['finishing','movement']),control:mean(s,c.role==='GK'?['distribution','control']:['passing','control','vision','dribbling']),defense:mean(s,c.role==='GK'?['reflexes','handling','positioning','reach']:['tackling','positioning','aerial']),stamina:s.stamina};}
export {sync as syncCareerSkills};
export function upgradeChapters(c,identity){
 if(c.chapterVersion===3)return c;
 c.chapterVersion=3;c.identity=IDENTITIES[identity]?.role===c.role?identity:Object.keys(IDENTITIES).find(k=>IDENTITIES[k].role===c.role);c.priority='development';c.program='balanced';
 const a=c.attributes;c.skills=Object.fromEntries(Object.keys(SKILLS).map(k=>[k,k==='stamina'?a.stamina:['finishing','movement'].includes(k)?a.attack:['control','passing','vision','dribbling','distribution'].includes(k)?a.control:a.defense]));
 c.skills.pace=clamp(a.stamina-3,40,90);c.skills.acceleration=c.skills.pace;c.skills.agility=a.control;c.skills.strength=a.stamina-4;
 if(!c.history.length){for(const k of IDENTITIES[c.identity].boost)c.skills[k]+=5;sync(c);}
 c.outlook={ceiling:c.potential,profile:['steady','early','late','enduring'][hash(c.id)%4]};c.people={coach:60,agent:65,mentor:55,support:70};c.eventHistory=[];c.cupHistory=[];c.honours=[];c.loan=null;c.contractReview=null;c.worlds={};c.health={missed:0,latest:null};c.portrait=hash(c.id)%4;c.ambitionClub=null;
 const circuit=createCircuit(worldClub(c.club),c.seed,c.season);c.worlds[circuit.country]=circuit;c.careerModel='career-world-3';return c;
}
export function currentCircuit(c){return c.worlds[worldClub(c.club).country];}
export function selectionReport(c,clubId=c.club){
 const position=positionalFit(c,clubId),competitors=squadCandidates(clubId,c.role,c.season),best=Math.max(...competitors.map(p=>p.rating)),ability=overall(c),fit=position?position.familiarity>=60:hash(clubId+c.identity)%3===0?1:0,edge=ability-best+fit*2+((c.familiarity||40)-40)*.03+(position?.bonus||0),share=clamp(.5+edge*.035+((clubId===c.club?c.trust:50)-50)*.003,.12,.92);
 return {competitors,best,position,fit:fit?'Strong':'Developing',role:edge>=3?'First-team opportunity':edge>=-5?'Rotation prospect':'Development prospect',minutes:[Math.round(Math.max(.05,share-.16)*3420),Math.round(Math.min(.98,share+.16)*3420)],share,explanation:edge>=0?'Your role ability compares well with the strongest simulated competitor.':'A stronger simulated competitor is ahead of you; role fit and development can close the gap.'};
}
function ensureCircuit(c,clubId){const country=worldClub(clubId).country;if(!c.worlds[country]||c.worlds[country].year!==c.season)c.worlds[country]=createCircuit(worldClub(clubId),c.seed,c.season);return c.worlds[country];}
export function chapterOffers(c){
 if(c.movedSeason===c.season)return [];
 const circuit=currentCircuit(c),candidates=[...circuit.tiers.flat(),...FIELD.map(t=>t.id)].filter((id,i,a)=>id!==c.club&&a.indexOf(id)===i),ability=overall(c),random=rng(c.seed^c.season^0xad85),offers=[];
 for(const id of candidates){const assessment=recruitmentAssessment(c,id);if(!assessment.eligible)continue;const club=worldClub(id),report=selectionReport(c,id),need=hash(id+c.season+c.role)%5,coaching=clamp(club.rating+hash(id)%9-6,45,96);if(need===0||club.rating>ability+20||club.rating>87&&c.reputation<25||c.marketLedger?.[c.season+':'+id]?.withdrawn)continue;
  const wage=Math.max(450,Math.round((ability-35)*club.rating*(.8+random()*.3))),interest=clamp(75-Math.abs(ability-report.best)*3+need*3+(c.depth?.negotiationLeverage||0)+(c.depth?(c.people.agent-65)*.08:0),15,95),score= c.priority==='minutes'?report.share*100:c.priority==='money'?wage/60:c.priority==='honours'?club.rating:c.priority==='loyalty'?(club.country===worldClub(c.club).country?40:0)+report.share*30:coaching*.5+report.share*45;
  offers.push({id:'offer:'+c.season+':'+id,club:id,wage,weeks:76,expires:38,season:c.season,role:report.role,minutes:report.minutes,fit:report.fit,coaching,interest,score,negotiated:false,route:assessment.route,reason:assessment.reason+` A simulated ${c.role} vacancy and ${report.fit.toLowerCase()} role fit. Forecasts can change with form, fitness and squad competition.`});
 }
 for(const offer of offers){const counter=c.marketLedger?.[c.season+':'+offer.club];if(counter){offer.negotiated=true;if(counter.wage)offer.wage=counter.wage;}}return offers.sort((a,b)=>b.score-a.score||a.club.localeCompare(b.club)).slice(0,4);
}
export function acceptChapterOffer(c,id){
 if(c.yearJob||c.loan||c.retired)throw Error('Finish the year and any loan review before a permanent move.');const o=c.offers.find(o=>o.club===id&&(!o.season||o.season===c.season));if(!o)throw Error('This offer is no longer available.');
 const from=c.club;c.club=id;ensureCircuit(c,id);c.wage=o.wage;c.contract=o.weeks;c.trust=o.role==='First-team opportunity'?65:48;c.transfers.push({season:c.season,week:0,from,to:id,wage:o.wage,type:'permanent'});c.movedSeason=c.season;c.offers=[];c.contractReview=null;c.arrival='Your agent completed the move. A new squad and role await.';
}
export function negotiateChapter(c,id){
 const offer=c.offers.find(o=>o.club===id);if(!offer||c.yearJob||offer.negotiated)throw Error('This offer cannot be countered now.');offer.negotiated=true;
 c.marketLedger||={};if(offer.interest>=60){offer.wage=Math.round(offer.wage*1.08);offer.reason+=' Your agent secured an eight percent wage increase.';c.marketLedger[c.season+':'+id]={wage:offer.wage};c.people.agent=clamp(c.people.agent+3,0,100);}else{c.marketLedger[c.season+':'+id]={withdrawn:true};c.offers=c.offers.filter(o=>o!==offer);c.eventHistory.push({season:c.season,title:'Negotiations ended',text:worldClub(id).name+' declined the higher wage. Other opportunities remain.'});}
}
export function renewChapter(c){if(c.yearJob||c.loan||c.retired||c.contract>38)throw Error('Renewal opens between seasons in the final contract year.');c.contract=76;c.wage=Math.max(500,c.wage,Math.round((overall(c)-40)*95));c.contractReview=null;}
export function loanDestinations(c){const circuit=currentCircuit(c);return circuit.tiers.flat().filter(id=>id!==c.club).map(id=>({id,...selectionReport(c,id)})).filter(r=>r.share>selectionReport(c).share+.08).sort((a,b)=>b.share-a.share).slice(0,3);}
export function startChapterLoan(c,id){
 if(c.loan||c.retired||c.contract<(c.yearJob?38-c.week:38))throw Error('Renew your parent contract before arranging a loan.');if(!loanDestinations(c).some(o=>o.id===id))throw Error('Choose an available development destination.');
 c.loan={parent:c.club,destination:id,parentWage:c.wage,parentContract:c.contract,startedSeason:c.season,startedWeek:c.week,reviewSeason:c.season+1};c.transfers.push({season:c.season,week:c.week,from:c.club,to:id,type:'loan'});c.club=id;c.trust=68;
}
function generateDecision(c){
 const report=selectionReport(c),year=c.season,base={id:year+':'+c.week,kind:'chapter',choices:[]},loan=loanDestinations(c)[0];
 if(c.depth&&c.injury>3)return depthDecision(c,6,{...base,family:6});
 if(!c.loan&&loan&&report.share<.62&&(!c.depth||c.decisions.at(-1)?.family!=='loan'))return {...base,family:'loan',title:'A route onto the pitch',text:'Your agent found a loan with a clearer route to minutes. Your parent contract remains yours.',choices:[{id:'loan:'+loan.id,label:'Take the development loan',trade:'More projected minutes; adapt to a new dressing room.'},{id:'stay',label:'Compete for my place',trade:'Keep continuity; playing time remains uncertain.'}]};
 let kind=hash(c.id+year)%(c.depth?11:6);if(c.depth){const recent=c.decisions.slice(-2).map(d=>d.family);for(let i=0;i<11&&recent.includes(kind);i++)kind=(kind+1)%11;base.family=kind;const extra=depthDecision(c,kind,base);if(extra)return extra;}
 if(kind===0)return {...base,title:'A mentor offers their time',text:'A senior teammate offers focused sessions after training.',choices:[{id:'mentor',label:'Work with my mentor',trade:'Build role knowledge and a relationship; less recovery time.'},{id:'recovery',label:'Protect my recovery',trade:'Stay fresher; miss this mentoring opportunity.'}]};
 if(kind===1)return {...base,title:'A broader role',text:'The coach wants you to broaden your responsibilities.',choices:[{id:'versatile',label:'Learn the new role',trade:'Build familiarity and coach trust; less specialization.'},{id:'specialize',label:'Defend my strengths',trade:'Keep developing my identity; coach trust may fall.'}]};
 if(kind===2)return {...base,title:'An offer away from football',text:'A local sponsor invites you to appearances during a busy stretch.',choices:[{id:'sponsor',label:'Accept the appearances',trade:'Earn fictional credits and exposure; lose recovery time.'},{id:'recovery',label:'Focus on football',trade:'Protect availability; pass up the extra income.'}]};
 if(kind===3){const recent=c.history.filter(r=>r.season===year&&r.minutes).slice(-5),struggling=!recent.length||recent.reduce((n,r)=>n+r.rating,0)/recent.length<6.5;return {...base,title:struggling?'Criticism after a difficult spell':'Growing expectations',text:struggling?'Recent ratings or limited appearances have drawn questions. Your response will reach the dressing room.':'Your recent contributions have raised expectations. Your response will reach the dressing room.',choices:[{id:'team',label:'Back my teammates',trade:'Strengthen relationships; share the spotlight.'},{id:'prove',label:'Promise a response',trade:'Gain exposure and pressure; take a harder training block.'}]};}
 if(kind===4)return {...base,title:'A specialist training invitation',text:'A specialist offers a targeted block for your playing identity.',choices:[{id:'specialize',label:'Take the specialist block',trade:'Improve defining skills; build workload.'},{id:'balanced',label:'Keep a balanced year',trade:'Preserve recovery and wider development.'}]};
 return {...base,title:'Your support circle needs you',text:'Time away with your support circle could restore your confidence.',choices:[{id:'support',label:'Make time for home',trade:'Improve wellbeing; reduce training exposure briefly.'},{id:'mentor',label:'Stay with the squad',trade:'Build football relationships; less personal recovery.'}]};
}
export function resolveChapter(c,value){
 const d=c.pendingDecision;if(!d||!d.choices.some(o=>o.id===value))throw Error('Choose an available decision.');
 applyDepthDecision(c,value);
 if(value.startsWith('loan:'))startChapterLoan(c,value.slice(5));
 if(value==='stay'){c.trust=clamp(c.trust+4,0,95);c.energy=clamp(c.energy-5,25,100);}
 if(value==='specialize'){c.yearJob.growth=1.18;c.energy=clamp(c.energy-10,25,100);c.people.coach=clamp(c.people.coach-3,0,100);}
 if(value==='balanced'||value==='recovery'){c.energy=clamp(c.energy+12,25,100);c.morale=clamp(c.morale+3,0,100);}
 if(value==='mentor'){c.people.mentor=clamp(c.people.mentor+10,0,100);c.yearJob.growth=1.1;c.energy=clamp(c.energy-6,25,100);}
 if(value==='versatile'){c.familiarity=clamp((c.familiarity||40)+12,0,100);c.trust=clamp(c.trust+7,0,95);c.yearJob.growth=.9;}
 if(value==='sponsor'){c.earnings+=c.wage*3;c.reputation=clamp(c.reputation+2,0,100);c.energy=clamp(c.energy-8,25,100);}
 if(value==='team'){c.people.mentor=clamp(c.people.mentor+6,0,100);c.morale=clamp(c.morale+5,0,100);}
 if(value==='prove'){c.reputation=clamp(c.reputation+1,0,100);c.yearJob.growth=1.12;c.energy=clamp(c.energy-8,25,100);}
 if(value==='support'){c.people.support=clamp(c.people.support+10,0,100);c.morale=clamp(c.morale+8,0,100);c.yearJob.growth=.95;}
 c.decisions.push({...d,choice:value});c.eventHistory.push({season:c.season,title:d.title,text:d.choices.find(o=>o.id===value).label});c.pendingDecision=null;c.yearJob.resolved=true;
}
function contributions(c,result,side,cup=false){
 const random=rng(hash(result.id+c.id)^c.seed),s=c.skills,report=c.internationalContext?{share:clamp(.5+(overall(c)-(c.internationalContext.attack-10))*.035,.1,.95)}:selectionReport(c),hurt=c.injury>0,starts=!hurt&&random()<clamp(report.share+(c.energy-80)*.005,.06,.96),minutes=hurt?0:starts?65+Math.floor(random()*26):random()<.55?15+Math.floor(random()*25):0,score=side?[...result.score].reverse():[...result.score],fraction=minutes/90;
 const shots=minutes&&c.role!=='GK'?poisson((c.role==='FWD'?2.5:c.role==='MID'?1.1:.35)*fraction*(.5+(s.movement+s.pace+s.dribbling)/420),random):0;
 let goals=0;for(let n=0;n<Math.min(shots,score[0]);n++)if(random()<clamp(.12+s.finishing/300,.1,.5))goals++;
 let assists=0;for(let n=0;n<score[0]-goals;n++)if(minutes&&random()<fraction*(s.vision+s.passing)/550*(c.role==='GK'?.15:1))assists++;
 const recoveries=minutes?poisson(fraction*(c.role==='DEF'?5:c.role==='MID'?4:1)*(s.tackling+s.positioning+s.strength)/210,random):0,chances=minutes?poisson(fraction*(s.vision+s.passing)/90*(c.role==='MID'||c.identity==='winger'?1.6:.6),random):0,saves=c.role==='GK'&&minutes?poisson(fraction*(s.reflexes+s.positioning)/40,random):0;
 const rating=minutes?clamp(6+goals*.7+assists*.45+(c.role==='DEF'?recoveries*.12:c.role==='MID'?recoveries*.05+chances*.12:c.role==='GK'?saves*.16-score[1]*.18:chances*.06)+(score[0]>score[1]?.3:score[0]<score[1]?-.25:0)+(random()-.5)*.6,4,10):0;
 if(!cup){if(hurt){c.injury--;c.health.missed++;}c.energy=clamp(c.energy+(c.intensity==='light'?24:c.intensity==='intense'?13:20)+(c.depth?(c.people.support-50)*.04:0)-fraction*(c.intensity==='intense'?25:18)*(1+(70-s.stamina)/100),25,100);}
 if(minutes&&!hurt&&random()<(c.intensity==='intense'?.026:.012)+(c.energy<60?.012:0)+(c.health.earlyReturn?.02:0)){c.injury=2+Math.floor(random()*8);c.health.latest={season:c.season,week:c.week+1,description:'Workload strain',weeks:c.injury};}
 c.trust=clamp(c.trust+(minutes?(rating>=7?1.1:rating<5.8?-.7:.15):hurt?0:-.08),10,95);c.morale=clamp(c.morale+(minutes?(score[0]>score[1]?1:-.3):hurt?0:-.6),20,95);c.reputation=clamp(c.reputation+(minutes?(rating-6.2)*.18:0),0,100);
 if(!cup){const ageFactor=c.age<23?.09:c.age<29?.045:c.age<33?.012:0,profile=c.outlook.profile==='late'&&c.age>23?1.25:c.outlook.profile==='early'&&c.age>25?.7:1,coaching=clamp((worldClub(c.club).rating-35)/50,.4,1.2),learning=.35+fraction*.65,work=c.intensity==='intense'?1.12:c.intensity==='light'?.8:1;
  for(const k of Object.keys(s)){const focus=c.focus==='balanced'||c.program==='versatile'?.65:c.focus==='attack'&&['finishing','movement'].includes(k)||c.focus==='control'&&['passing','control','vision','dribbling'].includes(k)||c.focus==='defense'&&['tackling','positioning','aerial','reflexes','handling','reach'].includes(k)||c.focus==='stamina'&&['stamina','pace','strength'].includes(k)?1.5:.15,identity=IDENTITIES[c.identity].boost.includes(k)?1.2:1;const loss=c.age>=31?(['pace','acceleration','stamina'].includes(k)?.035:.008)*(c.outlook.profile==='enduring'?.65:1):0;s[k]=clamp(s[k]+(!hurt&&c.focus!=='recovery'?ageFactor*profile*coaching*learning*work*focus*identity*(c.yearJob.growth||1)*depthGrowth(c):0)-loss,30,c.outlook.ceiling);}sync(c);
 }
 const row={fixtureId:result.id,season:c.season,week:c.week+1,club:c.club,opponent:side?result.home:result.away,opponentName:worldClub(side?result.home:result.away).name,home:!side,score,minutes,rating,selection:hurt?'Injured':starts?'Starter':minutes?'Substitute':'Not selected',goals,assists,shots,saves,recoveries,chances,overall:overall(c),model:c.depth?'career-world-4':'career-world-3',competition:cup?'Circuit cup':'League'};
 (cup?c.cupHistory:c.history).push(row);c.totals.appearances+=minutes?1:0;for(const k of ['minutes','goals','assists','shots','saves','recoveries','chances'])c.totals[k]=(c.totals[k]||0)+row[k];return row;
}
function round(c){
 const circuit=currentCircuit(c),number=c.week+1,report=selectionReport(c),impact=clamp((overall(c)-report.best)/100,-.15,.2)*(c.injury?0:report.share);
 for(const f of circuit.schedule.filter(f=>f.round===number)){if(circuit.results.some(r=>r.id===f.id))continue;const own=f.home===c.club||f.away===c.club,side=f.away===c.club?1:0,result=simulateWorldFixture(f,c.seed,own?impact:0,side);circuit.results.push(result);if(own)contributions(c,result,side);}
 if([5,11,18,25,32,38].includes(number)&&!circuit.cup.winner){const entrants=circuit.cup.entrants,next=[];for(let i=0;i<entrants.length;i+=2){if(!entrants[i+1]){next.push(entrants[i]);continue;}const f={id:circuit.country+':'+c.season+':cup:'+number+':'+i,home:entrants[i],away:entrants[i+1],round:number},side=f.away===c.club?1:0,own=f.home===c.club||f.away===c.club,result=simulateWorldFixture(f,c.seed,own?impact:0,side);if(result.score[0]===result.score[1])result.winner=hash(f.id+c.seed)%2?f.home:f.away;else result.winner=result.score[0]>result.score[1]?f.home:f.away;result.penalties=result.score[0]===result.score[1];circuit.cup.results.push(result);next.push(result.winner);if(own)contributions(c,result,side,true);}circuit.cup.entrants=next;circuit.cup.round++;if(next.length===1)circuit.cup.winner=next[0];}
 advanceCareerTournaments(c,number,(result,side)=>{const row=contributions(c,result,side,true);c.cupHistory.pop();c.extraHistory.push(row);c.energy=clamp(c.energy-row.minutes/90*4,25,100);return row;});
 c.week++;c.earnings+=c.wage;c.contract=Math.max(0,c.contract-1);
}
function finish(c){
 finishCareerTournaments(c,(result,side,tournament)=>{c.internationalContext=tournament.teams.find(t=>t.id===tournament.user);const row=contributions(c,result,side,true);delete c.internationalContext;c.cupHistory.pop();row.club=tournament.user;c.extraHistory.push(row);return row;});
 const circuit=currentCircuit(c),rows=[...c.history,...c.cupHistory,...(c.extraHistory||[])].filter(r=>r.season===c.season),played=rows.filter(r=>r.minutes),league=circuit.tiers.findIndex(t=>t.includes(c.club)),standing=table(circuit,league),rank=standing.findIndex(r=>r.id===c.club)+1,stints=[...new Set(rows.map(r=>r.club))].map(id=>({club:id,appearances:rows.filter(r=>r.club===id&&r.minutes).length,minutes:rows.filter(r=>r.club===id).reduce((n,r)=>n+r.minutes,0),goals:rows.filter(r=>r.club===id).reduce((n,r)=>n+r.goals,0)})),total=k=>rows.reduce((n,r)=>n+(r[k]||0),0),delta=overall(c)-c.yearJob.startOverall;
 const summary={season:c.season,age:c.age,club:c.club,stints,appearances:played.length,minutes:total('minutes'),goals:total('goals'),assists:total('assists'),saves:total('saves'),recoveries:total('recoveries'),chances:total('chances'),overall:overall(c),average:played.length?played.reduce((n,r)=>n+r.rating,0)/played.length:0,model:'career-world-3',competition:{country:circuit.country,tier:league+1,rank,points:standing.find(r=>r.id===c.club).pts,cupWinner:circuit.cup.winner,promoted:league===1&&rank<=3,relegated:league===0&&rank>=18},development:{overall:delta,reputation:Math.round((c.reputation-c.yearJob.startReputation)*10)/10,minutesShare:Math.round(total('minutes')/(rows.length*90)*100)},story:delta>0?'Match experience and your training environment supported development.':c.injury?'Availability and recovery shaped a demanding year.':'Your role, age and training exposure kept development gradual.',missed:rows.filter(r=>r.selection==='Injured').length};
 finishCareerDepth(c,summary,rows,circuit);summary.model=c.careerModel;c.seasons.push(summary);if(rank===1)c.honours.push({season:c.season,title:league===0?'Circuit league champion':'Development league champion',club:c.club});if(circuit.cup.winner===c.club)c.honours.push({season:c.season,title:'Circuit cup winner',club:c.club});
 c.europePlaces||={};c.europePlaces[circuit.country]=table(circuit,0).slice(0,4).map(r=>r.id);
 circuit.completed=true;c.lastCircuit=structuredClone(circuit);c.worlds[circuit.country]=nextCircuit(circuit,c.seed);c.season++;c.age++;c.week=0;c.yearJob=null;c.pendingDecision=null;c.lastMatch=null;c.energy=Math.max(c.energy,80);c.morale=Math.max(50,c.morale);c.retired=c.age>=(c.depth?.retirementAge||40);if(c.retired&&c.depth)c.depth.retirement={age:c.age,season:c.season,reason:'Career retirement',summary:c.name+' closed the career after '+c.seasons.length+' completed years.'};
 if(c.loan){const loan=c.loan,from=c.club;c.club=loan.parent;c.transfers.push({season:c.season,week:0,from,to:c.club,type:'loan return'});c.trust=clamp(50+delta*2,35,75);c.eventHistory.push({season:c.season,title:'Loan review',text:`Returned to ${worldClub(c.club).name}. Your parent contract and wage are preserved; squad competition is reassessed.`});c.loan=null;c.arrival='Your loan is complete. Review your parent-club role and the next offers.';}
 c.offers=c.retired?[]:chapterOffers(c);c.contractReview=c.contract<38&&!c.retired?'Resolve your contract before committing another year. Renew or sign a new offer.':null;
}
export function advanceChapter(c){
 if(c.retired)throw Error('This career is retired.');if(c.pendingDecision)return c;
 if(!FOCUSES[c.focus]||!['light','normal','intense'].includes(c.intensity)||!IDENTITIES[c.identity]||Object.values(c.skills).some(v=>!Number.isFinite(v)))throw Error('Choose valid development and workload settings.');
 if(!c.yearJob){if(c.contract<38)throw Error('Your contract will not cover the next year. Renew or accept an offer at the agent desk.');const circuit=currentCircuit(c);if(circuit.results.length)throw Error('This destination has already played part of the year. Choose a club before kickoff.');depthYearStart(c);if(c.depth)c.depth.negotiationLeverage=0;const random=rng(c.seed^Math.imul(c.season,0x45d9f3b));c.yearJob={season:c.season,decisionWeek:c.depth?.origin==='comeback'&&c.season===1&&c.injury>7?4:random()<.8?14+Math.floor(random()*10):null,resolved:false,growth:1,startOverall:overall(c),startReputation:c.reputation};startCareerTournaments(c,overall(c));}
 while(c.week<38){round(c);if(!c.yearJob.resolved&&c.week===c.yearJob.decisionWeek){c.pendingDecision=generateDecision(c);return c;}}
 finish(c);return c;
}
