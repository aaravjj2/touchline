import {squadPlan} from './squad-planner.js';
import {careerAvailability,availabilityText} from './career-availability.js';
import {positionCareer,selectPositionTeam} from './manager-positions.js';
import {legend} from './legends.js';
import {FORMATIONS} from './engine.js';
import {standings,upcomingFixtures} from './competition.js';
import {connectedNext,connectedTeam} from './manager-season.js';
import {hasSandboxWorld,sandboxCalendar,sandboxFinance} from './sandbox-world.js';
import {fantasyManagerCalendar} from './manager-calendar.js';
import {managerAvailable} from './manager-career.js';
import {gbpToUnits} from './manager-money.js';

const views=new Map(),pages=['office','squad','transfers','season','club'];
const identity=c=>[c.seed,c.name,c.setup?.kind||'historic'].join('|');
const storageKey=c=>'touchline.manager-view.'+(new URLSearchParams(globalThis.location?.search||'').has('qa')?'qa.':'')+'v1.'+encodeURIComponent(identity(c));
export function managerView(c){
 const key=identity(c);if(views.has(key)){const view=views.get(key);if(view.seasonTab==='statistics'&&!(c.statisticsVersion>=1))view.seasonTab='calendar';return view;}
 let stored={};try{stored=JSON.parse(globalThis.localStorage?.getItem(storageKey(c))||'{}')||{};}catch{}
 const old=c.management.page,page=({tactics:'squad',recruitment:'transfers',competitions:'season'}[old]||old);
 const view={page:pages.includes(stored.page)?stored.page:pages.includes(page)?page:'office',squadTab:old==='tactics'?'tactics':'lineup',clubTab:'overview',seasonTab:'calendar',transferTab:'discover',compare:[],...stored};
 if(!pages.includes(view.page))view.page='office';view.compare=Array.isArray(view.compare)?view.compare.filter(id=>typeof id==='string').slice(0,3):[];
 if(view.seasonTab==='statistics'&&!(c.statisticsVersion>=1))view.seasonTab='calendar';
 for(const [key,choices]of Object.entries({squadTab:['lineup','tactics','teams','bench','player','planning'],clubTab:['overview','finances','contracts','ledger'],seasonTab:['calendar','standings','statistics','review'],transferTab:['discover','shortlist','conversations','founder','offers']}))if(!choices.includes(view[key]))view[key]=choices[0];
 if(view.report?.season!==c.season||view.report?.matches!==c.history.length||!Array.isArray(view.report?.facts)||!Array.isArray(view.report?.score)||view.report.score.length!==2){view.report=null;view.aftermath=false;}
 views.set(key,view);return view;
}
export function setManagerView(c,patch){const view=Object.assign(managerView(c),patch);try{globalThis.localStorage?.setItem(storageKey(c),JSON.stringify(view));}catch{}return view;}
export function resetManagerView(c,patch={}){views.delete(identity(c));try{globalThis.localStorage?.removeItem(storageKey(c));}catch{}return setManagerView(c,{page:'office',preparing:false,aftermath:false,...patch});}
export function opponentBrief(c,fixture){
 if(!fixture?.opponent)return null;const opp=fixture.opponent,meetings=(c.history||[]).filter(h=>h.opponent===opp.name),last=meetings.at(-1)||null;
 const ids=new Set((opp.xi||[]).map(p=>typeof p==='string'?p:p.id)),players=(opp.roster||[]).filter(p=>!ids.size||ids.has(p.id)),cover={};
 for(const p of (ids.size?players:(opp.roster||[]).slice(0,11)))if(p.role)cover[p.role]=(cover[p.role]||0)+1;
 return {name:opp.name,home:!!fixture.homeGame,rating:Number.isFinite(opp.rating)?Math.round(opp.rating):null,attack:Number.isFinite(opp.attack)?Math.round(opp.attack):null,defense:Number.isFinite(opp.defense)?Math.round(opp.defense):null,formation:opp.formation||null,meetings:meetings.length,last:last?{score:[...last.score],home:!!last.home}:null,cover};
}
export function nextManagerFixture(c){
 const f=c.connected?connectedNext(c):upcomingFixtures(c.competition).find(f=>f.home==='user'||f.away==='user');if(!f)return null;
 const home=f.home==='user',opponent=c.connected?connectedTeam(c,home?f.away:f.home):c.competition.teams.find(t=>t.id===(home?f.away:f.home)),calendar=c.connected?.calendar||(hasSandboxWorld(c)?sandboxCalendar(c):fantasyManagerCalendar(c));
 const date=f.date||calendar.fixtures.find(q=>q.status==='scheduled'&&(q.home==='user'||q.away==='user'))?.date;
 return {...f,homeGame:home,opponent,date,competitionName:c.careerRulesVersion===2?(f.competition==='cup'?'Super Cup':'Super League'):c.connected?({league:'Fantasy league',cup:'Touchline Cup',europe:'European Invitational'}[f.competition]):c.competition.fieldLabel||'League'};
}
export const seasonComplete=c=>c.connected?c.connected.completed:!!c.competition.champion;
export function latestCareerReplay(c){
 if(c.connected)return c.connected.calendar.fixtures.findLast(f=>f.status==='complete'&&(f.home==='user'||f.away==='user')&&f.result?.definition)?.result||null;
 return c.competition.results.findLast(r=>(r.home===c.competition.user||r.away===c.competition.user)&&!['fast-season-1','fast-career-2','fast-career-3','fast-career-4'].includes(r.engineVersion))||null;
}
export function managerPrimary(c,pending){
 if(pending)return ['career','manager-connected'].includes(pending.context)?{label:'Resume match',action:'eu-career-manage'}:{label:'Finish saved fixture',action:'eu-view-pending'};
 if(c.trust<=0)return {label:'Review appointment',action:'eu-view-club'};
 if(seasonComplete(c))return {label:'Review season',action:'eu-view-review'};
 const expired=c.xi.find(id=>c.condition[id].contract<=0);if(expired)return {label:'Resolve expired contracts',action:'eu-view-contracts',id:expired};
 if(c.event)return {label:'Resolve squad decision',action:'eu-view-priorities'};
 return {label:'Prepare next match',action:'eu-view-prepare'};
}
export function managerPriorities(c){
 const items=[],all=c.xi.concat(c.bench),expired=c.xi.filter(id=>c.condition[id].contract<=0),tired=c.xi.filter(id=>c.condition[id].energy<75);
 const unavailable=all.filter(id=>careerAvailability(c,id));if(unavailable.length)items.push({kind:'urgent',title:unavailable.length+' players unavailable',text:unavailable.slice(0,3).map(id=>legend(id).name+' · '+availabilityText(careerAvailability(c,id))).join('; '),action:'page',id:'squad',label:'Review availability'});
 if(expired.length)items.push({kind:'urgent',title:'Renew before kickoff',text:expired.map(id=>legend(id).name).join(', '),action:'contracts',id:expired[0],label:'Review contracts'});
 if(c.event)items.push({kind:'urgent',title:'The dressing room needs you',text:'Choose whether to fund the recovery bonus or protect the budget.',action:'event',label:'Review squad decision'});
 for(const message of c.management.inbox.filter(x=>!x.resolved))items.push({kind:message.mandatory?'urgent':'decision',title:message.title,text:message.text,action:'message',id:message.id,label:'Open decision'});
 if(c.careerRulesVersion===2){const offers=c.connected.offers.filter(o=>o.status==='open'&&o.expires>=c.world.date);if(offers.length)items.push({kind:'decision',title:offers.length+' incoming transfer offers',text:'Review the fee and your positional cover before selling.',action:'offers',label:'Review offers'});}
 const expiring=all.filter(id=>c.condition[id].contract>0&&c.condition[id].contract<(c.management.market?.version>=2?26:8));
 if(expiring.length)items.push({kind:'decision',title:expiring.length+' contracts nearing expiry',text:'Renew or arrange cover before these terms end.',action:'contracts',id:expiring[0],label:'Review terms'});
 for(const d of c.management.deals.filter(d=>['club','contract','ready','pending'].includes(d.stage)))items.push({kind:'decision',title:legend(d.player).name+' · '+(d.stage==='pending'?'arrival agreed':'negotiation'),text:d.stage==='pending'?'Fee and wages reserved. Registration awaits the window.':d.message,action:'deal',id:d.id,label:'Open conversation'});
 if(tired.length)items.push({kind:'advice',title:tired.length+' starters need fresh legs',text:tired.map(id=>legend(id).name).join(', '),action:'rotation',label:'Compare rotation'});
 if(hasSandboxWorld(c)&&sandboxFinance(c).forecast<0)items.push({kind:'urgent',title:'Wages need attention',text:'Your twelve-month forecast is below zero. Review commitments before recruiting.',action:'finances',label:'Review finances'});
 const plan=squadPlan(c);if(plan){const thin=plan.positions.filter(p=>p.status!=='covered');if(thin.length)items.push({kind:plan.canFieldXI?'advice':'urgent',title:plan.canFieldXI?'Plan positional cover':'A natural-position gap needs attention',text:thin.slice(0,3).map(p=>p.position+': '+p.available.length+' available / '+p.demand+' starting places').join(' · '),action:'squad-tab',id:'planning',label:'Open squad planner'});}
 return items.sort((a,b)=>({urgent:0,decision:1,advice:2}[a.kind]-{urgent:0,decision:1,advice:2}[b.kind]));
}
export function rotationProposal(c,formation=c.formation,mode='rotation'){
 if(!FORMATIONS[formation])throw Error('Choose a supported formation.');if(positionCareer(c)){const result=selectPositionTeam(c.xi.concat(c.bench).filter(id=>c.condition[id].contract>0&&!careerAvailability(c,id)).map(legend),formation,p=>p.rating+(mode==='rotation'?c.condition[p.id].energy*.6:0));if(result.formation!==formation)throw Error('Your squad cannot fill '+formation+' in natural positions. Choose another shape or recruit cover.');return result.xi;}const all=c.xi.concat(c.bench),used=new Set();
 return FORMATIONS[formation].map(slot=>{const id=all.filter(id=>!used.has(id)&&legend(id).role===slot.role&&c.condition[id].contract>0).sort((a,b)=>(legend(b).rating+(mode==='rotation'?c.condition[b].energy*.6:0))-(legend(a).rating+(mode==='rotation'?c.condition[a].energy*.6:0)))[0];if(!id)throw Error('This squad cannot fill '+formation+'.');used.add(id);return id;});
}
export const managerSnapshot=c=>({matches:c.history.length,season:c.season,trust:c.trust,cash:c.credits,rank:standings(c.competition).findIndex(t=>t.id==='user')+1});
export function managerAftermath(c,before){
 if(c.history.length<=before.matches)return null;
 const last=c.history.at(-1),home=last.home,result=c.connected?c.connected.calendar.fixtures.filter(f=>f.status==='complete'&&(f.home==='user'||f.away==='user')).at(-1)?.result:c.competition.results.findLast(r=>r.home==='user'||r.away==='user'),physical=!!result?.definition,stats=(physical||result?.statisticsVersion>=1)?result.playerStats?.[home?0:1]||[]:[],star=stats.filter(p=>p.goals>0||p.saves>0).sort((a,b)=>b.goals-a.goals||b.saves-a.saves)[0];
 const facts=[];const incidents=result?.incidentMatch?.incidents.filter(e=>['red','second-yellow','injury'].includes(e.type))||[];if(incidents.length)facts.push({title:'Discipline & availability',text:incidents.map(e=>legend(e.player)?.name+' · '+(e.type==='injury'?'injured, estimated '+e.recoveryDays+' days':e.type==='red'?'straight red':'second yellow')).join('; ')});if(star)facts.push({title:star.name,text:star.goals?star.goals+(physical?' recorded goal':' modeled goal')+(star.goals===1?'':'s'):star.saves+' recorded saves'});
 const tired=c.xi.filter(id=>c.condition[id].energy<75);if(tired.length)facts.push({title:'Recovery matters',text:tired.length+' starters below 75% energy.',action:'rotation'});
 const delta=c.trust-before.trust;facts.push({title:'Board confidence',text:c.trust+'%'+(delta?' · '+(delta>0?'+':'')+delta+' since your last action':' · unchanged')});
 return {competition:last.competition||'league',competitionName:last.competition==='cup'?(c.careerRulesVersion===2?'Super Cup':'Touchline Cup'):last.competition==='europe'?'European Invitational':c.careerRulesVersion===2?'Super League':'League',progress:c.careerRulesVersion===2?(last.competition==='cup'?(c.connected.cup.champion?'Super Cup complete':c.connected.cup.remaining.includes('user')?'Super Cup · still in contention':'Super Cup · eliminated'):'Super League · '+c.competition.round+' / 38 rounds complete'):null,season:c.season,matches:c.history.length,opponent:last.opponent,score:last.score,home,date:last.date||null,physical,rank:standings(c.competition).findIndex(t=>t.id==='user')+1,previousRank:before.rank,cashDelta:c.credits-before.cash,facts:facts.slice(0,3),advanced:c.history.length-before.matches};
}
export function managerDealImpact(c,d,terms={}){
 const fee=Number(terms.fee??d.fee),wage=Number(terms.wage??d.wage)*(d.kind==='loan'?Number(terms.share??d.share)/100:1),proposed=['club','contract','ready'].includes(d.stage),old=['sell','renew'].includes(d.kind)?c.condition[d.player]?.wage||0:0,added=d.kind==='sell'?-old:wage-old,delta=proposed?(d.kind==='sell'?fee:-fee):0;
 return {fee,wage,cash:managerAvailable(c)+delta,forecast:hasSandboxWorld(c)?gbpToUnits(sandboxFinance(c).forecast)+delta-(proposed?added*52:0):null};
}
