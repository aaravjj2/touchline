import {readMode,largeSaveNotice} from './large-save.js';
import {draftHome,draftWorkspace,draftCoach,draftCampaign,draftPlayer,installDraftStudio,resetStudioView,updateStudioView} from './draft-studio.js';
import {createSuperCareerPreview,createVerifiedSuperCareer} from './super-career.js';
import {resolveSuperOffer} from './super-season.js';
import {createSandboxCareer} from './sandbox-career.js';
import {SUPER_PACKS} from './super-catalog.js';
import {hasSandboxWorld,sandboxCompetition} from './sandbox-world.js';
import {applySandboxMatchday,nextSandboxSeason,prepareSandboxMatchday} from './sandbox-season.js';
import {parkCareer,switchCareer,renderCareerLibrary} from './career-library.js';
import {seedEnglishFinances} from './english-finances.js';
import {wageCharge} from './manager-money.js';
import {POSITION_SLOTS,positionLabel,positionsFor} from './player-positions.js';
import {nextManagerFixture,latestCareerReplay} from './manager-experience.js';
import {portraitArtwork} from './ui-kit.js';
import {filterClubPicker} from './club-picker.js';
import {renderCareerSetup,syncCustomClubPreview,customClubOptions} from './career-setup-ui.js';
import {ENGLISH_PACKS} from './english-catalog.js';
import {englishCareerStart,englishOppositionField,isEnglishSandbox} from './english-career.js';
import {enableConnectedSeason,connectedNext,connectedTeam,commitConnectedFixture} from './manager-season.js';
import {advanceManagerSeason} from './manager-season-client.js';
import {upgradeManager,managerCommand,managerBeforeFixture,managerAfterFixture,managerNextSeason,managerProfile,managerAvailable,managerShouldStop} from './manager-career.js';
import {renderManagerCareer,managerFormCommand} from './manager-ui.js';
import {managerView,setManagerView,resetManagerView,managerSnapshot,managerAftermath} from './manager-experience.js';
import {installManagerExperience,afterManagerUICommand} from './manager-experience-controller.js';
import {ICONS,oppositionField,positionTeam,selectSquad,balancedBench,clubIdentity,withFamiliarity} from './europe-clubs.js';
import {modeStorage} from './mode-storage.js';

import {portraitFor} from './portraits.js';

import {playFixture} from './fixture-player.js';

import {fixtureDefinition} from './fixture-engine.js';

import {advanceInWorker} from './season-client.js';

import {assignSlots,eligibility,orderedXI,openRoles,drawPack,filterCards,yearEligibility} from './draft.js';

import {showFixtureReplay} from './fixture-replay.js';

import {PACKS,LEGENDS,legend,MANAGERS,CATALOG_COVERAGE} from './legends.js';

import {FIELD} from './club-field.js';

import {FORMATIONS} from './engine.js';

import {rng,shuffle,createCompetition,advance,standings,upcomingFixtures} from './competition.js';

const key=new URLSearchParams(location.search).has('qa')?'touchline.europe.qa.v1':'touchline.europe.v1';

const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

let eu={phase:'home',history:[],career:null};try{const saved=await readMode(key);if(saved?.version===1)eu={...eu,...saved};}catch{}

let selectedCareerPack=PACKS[0].id,connectedCareerChoice=true,careerCatalogQuery='';
let selectedSuperClub=SUPER_PACKS[0].id,superQuery='';
let careerSetupKind='english',selectedEnglishClub=ENGLISH_PACKS[0].id,englishQuery='',customClub={league:'english-sandbox',name:'',color:'#b6f36a',replace:ENGLISH_PACKS[0].id,budget:1500};
let host={},busy=false,seasonController=null;const writeMode=modeStorage(key,error=>host.toast?.('Career save failed. Keep this window open; your previous save is preserved. '+(error?.message||'')));const save=(options={})=>writeMode({...eu,version:1},options);

const button=(label,action,extra='',type='primary')=>`<button class="btn ${type}" data-action="eu-${action}" ${extra}>${label}</button>`;

const badge=(team)=>`<span class="eu-badge" style="--club:${team.color||'#b6f36a'}">${esc(team.mark||team.name.slice(0,2))}</span>`;

const title=(eyebrow,heading,copy,actions='')=>`<section class="hero"><div><div class="season-label"><span></span>${eyebrow}</div><h1>${heading}</h1><p>${copy}</p></div><div class="hero-actions">${actions}</div></section>`;

function begin({format='europe',hidden=false,daily=false,weekly=false,type='players',seed=Date.now()%1000000,year=null,formation=null}={}){if(eu.pending)throw Error('Resume your saved live fixture before starting another run.');const chosenYear=daily||weekly?null:Number(year||document.querySelector('#eu-year')?.value)||null,chosenFormation=FORMATIONS[formation]?formation:document.querySelector('#eu-formation')?.value||'4-3-3';if(type==='players'){const missing=yearEligibility(PACKS,chosenYear,chosenFormation,2);if(missing.length)throw Error('This year cannot fill '+chosenFormation+'. '+missing.join(' · ')+'. Choose another formation or all available years.');}const history=eu.history,career=eu.career,careerLibrary=eu.careerLibrary,nextCareerId=eu.nextCareerId;const day=new Intl.DateTimeFormat('en-CA',{timeZone:'America/New_York'}).format(new Date());if(daily)seed=Number(day.replaceAll('-',''));if(weekly){const date=new Date(day+'T12:00:00Z');date.setUTCDate(date.getUTCDate()-((date.getUTCDay()+6)%7));seed=Number(date.toISOString().slice(0,10).replaceAll('-',''));}eu={version:1,positionRulesVersion:2,history,career,careerLibrary,nextCareerId,phase:'draft',format,hidden,daily,weekly,type,seed,day,formation:chosenFormation,name:document.querySelector('#eu-name')?.value.trim().slice(0,28)||'Your XI',picks:[],clubs:[],roll:null,catalogYear:daily||weekly?null:Number(year||document.querySelector('#eu-year')?.value)||null,roleFilter:'ALL',cardSort:'source',minRating:0,rollCount:0,seenPacks:[],rerolls:hidden?0:2,manager:null,competition:null,hostClub:document.querySelector('#eu-host')?.value||'Real Madrid',field:document.querySelector('#eu-field')?.value||'icons'};resetStudioView(eu);save();}

const clubById=id=>{const team=ICONS.find(t=>t.id===id)||FIELD.find(t=>t.id===id);return eu.positionRulesVersion===2&&team?positionTeam(team):team;};
const picks=()=>(eu.picks||[]).map(legend).filter(Boolean);

const benchFor=balancedBench;

function ratingTeam(ids,manager='architect',condition=null){const ps=ids.map(legend),avg=k=>ps.reduce((n,p)=>n+p[k]+(condition?.[p.id]?.growth||0),0)/ps.length;const chemistry=Math.min(100,Math.round(ps.reduce((n,p,i)=>n+ps.slice(i+1).filter(q=>q.club===p.club).length,0)*7));const coach=MANAGERS.find(m=>m.id===manager)||MANAGERS[0];const health=condition?ps.reduce((n,p)=>n+(.82+condition[p.id].energy*.0015+(condition[p.id].morale-65)*.0007),0)/ps.length:1;return {rating:Math.round(avg('rating')),chemistry,attack:(avg('attack')+chemistry*.025)*coach.attack*health,defense:(avg('defense')+chemistry*.025)*coach.defense*health};}

function profileCard(id,condition=null){const p=legend(id),c=condition?.[id],growth=c?.growth||0;const profile={...p,rating:p.rating+growth,attack:p.attack+growth,defense:p.defense+growth,control:p.control+growth+((c?.morale??65)-65)*.04,energy:c?.energy??100};if(eu.career?.management&&condition===eu.career.condition){profile.control-=((c?.morale??65)-65)*.04;return managerProfile(eu.career,profile);}return profile;}

function rosterTeam(ids,formation,manager='architect',condition=null,reserves=null,positionVersion=1){const xi=orderedXI(ids,formation,positionVersion),bench=reserves===null?benchFor(xi):reserves;return {formation,xi,preset:manager==='hunter'?'press':manager==='guardian'?'protect':'balanced',roster:withFamiliarity(xi.concat(bench).map(id=>{const p=profileCard(id,condition),slot=xi.indexOf(id);return positionVersion===2?{...p,positions:positionsFor(p),...(slot>=0?{role:FORMATIONS[formation][slot].role,assignedPosition:POSITION_SLOTS[formation][slot]}:{})}:p;}),xi)};}

function finishDraft(){eu.picks=orderedXI(eu.picks,eu.formation,eu.positionRulesVersion);const strength=ratingTeam(eu.picks,eu.manager);const user={id:'user',name:eu.name,color:'#b6f36a',mark:'XI',...strength,...rosterTeam(eu.picks,eu.formation,eu.manager,null,eu.sourcePack?selectSquad(PACKS.find(p=>p.id===eu.sourcePack),eu.formation).bench:null,eu.positionRulesVersion)};const teams=oppositionField(user,{format:eu.format,seed:eu.seed,hostClub:eu.hostClub,field:eu.field,positionVersion:eu.positionRulesVersion});eu.competition=createCompetition(teams,{seed:eu.seed,format:eu.format});eu.competition.fieldLabel=(eu.field==='current'?'2026–27 current squads':'European Icons')+(eu.positionRulesVersion===2?' · position-ready fantasy field':'');eu.phase='competition';eu.lastRound=[];updateStudioView(eu,{tab:'overview',slot:null});save();}

function playerCard(p,options={}){return draftPlayer(p,{hidden:eu.hidden,...options});}

export function renderEurope(){if(busy)return `${title('MATCHDAY IN PROGRESS','THE NIGHT <em>UNFOLDS.</em>','The other fixtures are playing in the background. Your competition will update when all results are ready.')}<section class="card matchday-busy"><span class="loading-orbit"></span><h2>Across Europe, the story continues.</h2><p id="season-progress" role="status">Keep this tab open. Your last completed matchday remains saved.</p>${seasonController?button('Stop after this round','cancel-season','','secondary'):''}</section>`;if(eu.phase==='draft')return '<div class="draft-studio">'+draftPage()+'</div>';if(eu.phase==='manager')return '<div class="draft-studio">'+managerPage()+'</div>';if(eu.phase==='competition')return '<div class="draft-studio">'+competitionPage()+'</div>';return '<div class="draft-studio">'+homePage()+'</div>';}

function homePage(){return draftHome(eu);}

function draftPage(){return draftWorkspace(eu,{clubById});}



function managerPage(){return draftCoach(eu,{ratingTeam});}

function table(c){return `<div class="eu-table-wrap"><table class="league-table"><thead><tr><th>#</th><th>CLUB</th><th>P</th><th>GD</th><th>PTS</th></tr></thead><tbody>${standings(c).map((t,i)=>`<tr class="${t.id===c.user?'mine':''}"><td>${i+1}</td><td>${esc(t.name)}${c.format==='europe'&&i===7?' · TOP 8':''}</td><td>${t.p}</td><td>${t.gf-t.ga}</td><td><b>${t.pts}</b></td></tr>`).join('')}</tbody></table></div>`;}

function resultRows(c,list){const name=id=>c.teams.find(t=>t.id===id)?.name||id;return list.map(m=>`<div class="eu-result ${m.home===c.user||m.away===c.user?'mine':''}"><span>${esc(name(m.home))}</span><b>${m.score.join(' : ')}</b><span>${esc(name(m.away))}</span>${m.pens?`<small>Penalties · ${esc(name(m.penaltyWinner||m.winner))} through</small>`:m.aggregate?`<small>Aggregate ${(m.aggregateHome===m.home?m.aggregate:[...m.aggregate].reverse()).join('–')} · ${esc(name(m.tieWinner))} through</small>`:''}</div>`).join('');}

function competitionPage(){return draftCampaign(eu,{table,resultRows});}

// Persistent fantasy career: real historical cards, original game economy.

function startCareer(ids,formation,name,reserves=null,options={}){const ordered=orderedXI(ids,formation);if(ordered.length!==11)throw Error('This XI uses specific positions that the existing manager save cannot represent in this formation. Your draft and current career are preserved.');if(eu.career)parkCareer(eu);eu.browsingCareers=false;ids=ordered;const bench=reserves?.length?reserves:benchFor(ids),squad=[...ids,...bench];eu.career={version:1,season:1,seed:eu.seed||20261018,name,...(options.setup?{setup:options.setup}:{}),hostClub:clubIdentity(legend(ids[0]).club),formation,xi:[...ids],bench,manager:eu.manager||'architect',credits:options.credits??180,trust:65,training:'balanced',condition:Object.fromEntries(squad.map(id=>[id,{energy:100,morale:65,growth:0,contract:76}])),history:[],scouted:[],event:null,tab:'squad'};upgradeManager(eu.career);resetManagerView(eu.career);seedEnglishFinances(eu.career);newCareerSeason();if(!options.setup&&document.querySelector('#career-connected')?.checked)enableConnectedSeason(eu.career);save();}

function startEnglishCareer(options){const next=createSandboxCareer({...options,kind:options.kind||'english-sandbox',seed:eu.seed||20261018});if(eu.career)parkCareer(eu);eu.career=next;resetManagerView(next,options.custom?{page:'transfers',transferTab:'founder'}:{});eu.browsingCareers=false;save();}

function newCareerSeason(){const c=eu.career;if(hasSandboxWorld(c)){c.competition=sandboxCompetition(c);return;}const strength=ratingTeam(c.xi,c.manager,c.condition),user={id:'user',name:c.name,color:c.setup?.color||'#b6f36a',...(c.setup?{presentation:{color:c.setup.color}}:{}),...strength,...rosterTeam(c.xi,c.formation,c.manager,c.condition,c.bench),roster:withFamiliarity(c.xi.concat(c.bench).map(id=>profileCard(id,c.condition)),c.xi)};c.competition=createCompetition(isEnglishSandbox(c)?englishOppositionField(user,c.setup):oppositionField(user,{format:'league',seed:c.seed+c.season,hostClub:c.hostClub||clubIdentity(legend(c.xi[0]).club)}),{seed:c.seed+c.season*1000,format:'league'});if(isEnglishSandbox(c))c.competition.fieldLabel='Premier League sandbox · '+c.setup.season;}

async function playConnectedCareer(manage=false,mode='next',startControl=false){
 if(eu.pending&&eu.pending.context!=='manager-connected')throw Error('Complete your saved live fixture first.');
 if(eu.pending&&!manage)throw Error('Resume your saved live fixture before simulation.');
 if(!eu.pending){
  busy=true;seasonController=new AbortController();host.render();const started=performance.now();
  try{const response=await advanceManagerSeason(eu.career,manage?'manage':mode,{signal:seasonController.signal,onCheckpoint:async career=>{eu.career=career;if(!await save())throw Error('Storage unavailable; export or free space before advancing.');},onProgress:p=>{const node=document.querySelector('#season-progress');if(node)node.textContent=p.date+' · '+p.userMatches+' club fixtures · completed checkpoints saved.';}});eu.career=response.career;eu.career.management.lastSimulationMs=Math.round(performance.now()-started);save();if(response.reason==='decision')host.toast('Review Office and Recruitment before advancing.');if(response.reason==='cancelled')host.toast('Stopped between fixtures. Completed results are saved.');if(!manage||response.reason!=='kickoff')return;}
  finally{busy=false;seasonController=null;host.render();}
 }
 const c=eu.career,f=eu.pending?.fixture||connectedNext(c);if(!f)return;
 const definition=eu.pending?.definition||fixtureDefinition(connectedTeam(c,f.home),connectedTeam(c,f.away),f.seed),pending=eu.pending;
 eu.pending={context:'manager-connected',fixture:f,definition,state:pending?.state||null};save();
 const result=await playFixture({definition,team:f.home==='user'?0:1,decisive:f.decisive,resume:pending?.state||null,startControl,stakes:(c.careerRulesVersion===2?(f.competition==='cup'?'Super Cup':'Super League'):(f.competition==='europe'?'European Invitational':f.competition==='cup'?'Touchline Cup':'Fantasy league'))+' · '+(f.stage||'Matchday '+f.round),onCheckpoint:state=>{eu.pending={context:'manager-connected',fixture:f,definition,state};return save({background:state.background===true});}});
 if(!result){save();host.render();return;}
 commitConnectedFixture(c,f.id,result);eu.pending=null;save();host.render();
}

function careerAdvice(c){const tired=c.xi.filter(id=>c.condition[id].energy<72);const expiring=c.xi.concat(c.bench).filter(id=>c.condition[id].contract<12);return tired.length?{title:`${tired.length} starters need fresh legs.`,text:'Use your bench and prioritize recovery. Fatigue reduces the effective strength of your XI.',action:'rotate',label:'Rotate tired players'}:expiring.length?{title:'A contract decision is approaching.',text:'Renew before the contract expires to keep your squad together.',action:'contracts',label:'Review contracts'}:{title:'Make your next signing solve a problem.',text:'Compare positional cover and total wages before spending. A stronger bench makes rotation easier.',action:'market',label:'Open the scouting room'};}

export function renderDynasty(){if(busy)return renderEurope();if(eu.resetRequested)return title('KEEP YOUR HISTORY','A NEW <em>CHAPTER.</em>','Your current manager career will be backed up before starting a new one.')+'<section class="card mode-card"><h2>Start a new manager career?</h2>'+button('Back up & start new career','confirm-reset')+button('Keep current career','cancel-reset','','secondary')+'</section>';const c=eu.career;if(eu.browsingCareers||!c)return ((eu.browsingCareers||eu.careerLibrary?.length)?renderCareerLibrary(eu):'')+title('MANAGER CAREER','YOUR CLUB. <em>YOUR CALL.</em>','Take an English club into a new season, create your own, or revisit a historic squad.')+`<section class="card mode-card">${renderCareerSetup({kind:careerSetupKind,selected:selectedEnglishClub,query:englishQuery,historic:{packs:PACKS,selected:selectedCareerPack,query:careerCatalogQuery},connected:connectedCareerChoice,custom:customClub,superSelected:selectedSuperClub,superQuery})}${eu.picks?.length===11?button('Use my drafted XI','career-draft','','secondary'):''}<details class="locked-leagues"><summary>Full real-world careers · in development</summary><p>Verified registration and ownership, FA Cup coverage, Champions League qualification, relegation and the job market remain separate release gates. The English sandbox uses an imported snapshot and authored game rules.</p></details></section>`;
 if(c.management)return renderManagerCareer(c,eu.pending);
 const comp=c.competition,tableRows=standings(comp),rank=tableRows.findIndex(t=>t.id==='user')+1,advice=careerAdvice(c),totalWages=c.xi.concat(c.bench).reduce((n,id)=>n+legend(id).rating*.004,0),over=!!comp.champion;return `${title('MANAGER CAREER · SEASON '+c.season,`${esc(c.name.toUpperCase())}<br><em>YOUR NEXT CHAPTER.</em>`,'Manage the squad, protect your future and make the board believe.',button('Upgrade club management','mg-adopt','','secondary')+button('New career','reset-career','','ghost'))}<div class="career-overview"><div><span>POSITION</span><b>${comp.round?rank:'—'}<small>/ 20</small></b></div><div><span>PLAYED</span><b>${comp.round}<small>/ 38</small></b></div><div><span>TRANSFER CREDITS</span><b>${c.credits}</b></div><div><span>BOARD TRUST</span><b>${c.trust}%</b></div></div>

 <div class="mode-tabs">${[['squad','Squad & rotation'],['market','Scouting & transfers'],['contracts','Contracts'],['table','League table']].map(([id,label])=>button(label,'tab',`data-value="${id}"`,c.tab===id?'primary':'secondary')).join('')}</div>

 <div class="dynasty-layout"><section>${c.tab==='table'?`<div class="card">${table(comp)}</div>`:c.tab==='market'?marketPage(c):c.tab==='contracts'?contractPage(c):squadCareer(c)}</section><aside><section class="card next-fixture"><span class="eyebrow highlight">${over?'SEASON COMPLETE':c.trust<=0?'THE BOARD HAS DECIDED':'THE NEXT MATCHDAY'}</span><h3>${over?'The next chapter awaits.':c.trust<=0?'You have been sacked.':'Matchday '+(comp.round+1)}</h3><p>Board objective: finish in the top eight. Estimated weekly wages: ${Math.ceil(totalWages)} credits.</p>${over?button('Start season '+(c.season+1),'next-season'):c.trust<=0?button('Start a new career','reset-career'):`${comp.engineVersion==='2.0.0'?button('Manage next fixture','career-manage','id="career-manage"'):''}${button('Simulate next matchday','career-quick','','secondary')}${button('Simulate remaining season','career-season','id="career-play"','secondary')}`}${comp.results.some(m=>(m.home===comp.user||m.away===comp.user)&&m.engineVersion!=='fast-season-1')?button('Watch last match · 3D','watch-career','','secondary'):''}<label class="eu-select-label">Weekly preparation<select id="career-training">${[['balanced','Balanced'],['recovery','Recovery first'],['development','Player development']].map(([id,t])=>`<option value="${id}" ${c.training===id?'selected':''}>${t}</option>`).join('')}</select></label><p class="stat-foot">${comp.engineVersion==='2.0.0'?'Live fixtures use the continuous physical engine. Fast season results use a separate statistical model.':'This saved season retains its original match model.'} Fast season simulation advances all fixtures until the season ends or a contract, board or dressing-room decision needs you. Statistical fixtures have no 3D replay. This is a fantasy league.</p></section><section class="card coach-review"><span class="eyebrow highlight">YOUR ASSISTANT</span><h3>${advice.title}</h3><p>${advice.text}</p>${button(advice.label,advice.action,'','secondary')}</section>${c.event?`<section class="card coach-review"><span class="eyebrow">DRESSING ROOM</span><h3>A demand for more support.</h3><p>Your squad asks for a recovery bonus. Invest 18 credits for morale and energy, or protect the budget and accept a small morale cost.</p>${button('Back the squad · 18 cr','event',`data-value="support" ${c.credits<18?'disabled':''}`,'secondary')}${button('Protect the budget','event','data-value="save"','ghost')}</section>`:''}${c.history.length?`<section class="card mode-card"><h3>Recent results</h3>${c.history.slice(-5).reverse().map(r=>`<div class="fixture"><span>MD ${r.round}</span><strong>${r.home?'vs':'at'} ${esc(r.opponent)}</strong><b>${r.score.join(' : ')}</b></div>`).join('')}</section>`:''}</aside></div>`;}

function squadCareer(c){return `<section class="card mode-card"><div class="stats-title"><h2>Your starting XI</h2>${button('Auto-rotate tired starters','rotate','','secondary')}</div><div class="career-roster">${c.xi.map(id=>{const p=legend(id),s=c.condition[id];return `<div class="career-player"><span class="player-rating">${Math.round(p.rating+s.growth)}</span><span><strong>${p.name}</strong><small>${p.role} · ${p.club}</small></span><span class="condition-pill ${s.energy<65?'low':''}">${Math.round(s.energy)}% energy</span><span>${Math.round(s.morale)} morale</span></div>`;}).join('')}</div><h3 style="margin-top:24px">The bench</h3><div class="career-roster">${c.bench.map(id=>{const p=legend(id),s=c.condition[id];return `<div class="career-player"><span class="player-rating">${p.rating}</span><span><strong>${p.name}</strong><small>${p.role} · ${Math.round(s.energy)}% energy</small></span>${button('Start','start-player',`data-value="${id}"`,'secondary')}${button('Sell · '+Math.round(p.cost*1.4)+' cr','sell',`data-value="${id}"`,'ghost')}</div>`;}).join('')}</div></section>`;}

function marketPage(c){const owned=new Set(c.xi.concat(c.bench).map(id=>legend(id).personId)),options=shuffle(LEGENDS.filter(p=>!owned.has(p.personId)),c.seed+c.season).slice(0,18);return `<section class="card mode-card"><h2>The scouting room</h2><p class="stat-foot">Fees and wages are game credits, not real transfer valuations. New signings join your bench.</p><div class="market-grid">${options.map(p=>`<div class="market-card"><span>${p.role} · ${p.club} ${p.era}</span><h3>${p.name}</h3><b>${p.rating} OVR</b><p>${c.scouted.includes(p.id)?`ATT ${p.attack} · DEF ${p.defense} · STA ${p.stamina}`:'Scout for a role and attributes report.'}</p>${c.scouted.includes(p.id)?button('Sign · '+Math.round(p.cost*1.6)+' cr','buy',`data-value="${p.id}" ${c.credits<Math.round(p.cost*1.6)?'disabled':''}`,'secondary'):button('Scout · 2 cr','scout',`data-value="${p.id}" ${c.credits<2?'disabled':''}`,'secondary')}</div>`).join('')}</div></section>`;}

function contractPage(c){return `<section class="card mode-card"><h2>Keep the squad together</h2><p class="stat-foot">Contracts count down each matchweek. An expired deal must be renewed before the next match.</p>${c.xi.concat(c.bench).map(id=>{const p=legend(id),s=c.condition[id];return `<div class="career-player"><span><strong>${p.name}</strong><small>${p.role} · ${Math.ceil(p.rating*.004)} cr weekly wage</small></span><span>${s.contract} weeks</span>${button('Renew +76 weeks · 12 cr','renew',`data-value="${id}" ${c.credits<12?'disabled':''}`,'secondary')}</div>`;}).join('')}</section>`;}

function rotate(c){let count=0;for(let i=0;i<c.xi.length;i++){const id=c.xi[i],p=legend(id),s=c.condition[id];const reserve=c.bench.filter(b=>legend(b).role===p.role&&c.condition[b].contract>0).sort((a,b)=>c.condition[b].energy-c.condition[a].energy)[0];if(reserve&&s.energy<80&&c.condition[reserve].energy>s.energy+8){c.xi[i]=reserve;c.bench[c.bench.indexOf(reserve)]=id;count++;}}return count;}

async function playCareer(manage=false,fast=false){const c=eu.career;if(c.connected)return playConnectedCareer(manage,'next');if(hasSandboxWorld(c)){if(eu.pending?.context==='career'&&fast)throw Error('Resume the saved live fixture first.');if(c.trust<=0||c.competition.champion)return;prepareSandboxMatchday(c);save();}else{if(c.event)throw Error('Resolve the dressing-room decision before continuing.');managerBeforeFixture(c);if(eu.pending?.context==='career'&&fast)throw Error('Resume the saved live fixture first.');if(c.trust<=0||c.competition.champion)return;if(c.xi.some(id=>c.condition[id].contract<=0))throw Error('Renew expired starter contracts before the next match.');const all=c.xi.concat(c.bench);if(c.preparedRound!==c.competition.round){for(const id of all){const s=c.condition[id];s.energy=Math.min(100,s.energy+(c.training==='recovery'?24:c.training==='development'?10:17));}c.preparedRound=c.competition.round;save();}const strength=ratingTeam(c.xi,c.manager,c.condition);Object.assign(c.competition.teams.find(t=>t.id==='user'),strength,c.competition.engineVersion==='2.0.0'?{...rosterTeam(c.xi,c.formation,c.manager,c.condition,c.bench),roster:withFamiliarity(c.xi.concat(c.bench).map(id=>profileCard(id,c.condition)),c.xi)}:{});if(c.management)Object.assign(c.competition.teams.find(t=>t.id==='user'),{preset:c.management.preset,matchBench:c.management.matchBench,managerTactics:{build:c.management.build,roles:c.management.roles}});}let results;if(fast){const response=await advanceInWorker(c.competition,{},'fast-matchday');Object.assign(c.competition,response.competition);results=response.results;}else results=await progressCompetition(c.competition,manage,'career');if(!results)return;if(hasSandboxWorld(c)){applySandboxMatchday(c,results);return;}const m=results.find(m=>m.home==='user'||m.away==='user'),home=m.home==='user',score=home?m.score:[...m.score].reverse(),win=score[0]>score[1],draw=score[0]===score[1];c.trust=Math.max(0,Math.min(100,c.trust+(win?4:draw?0:-5)));c.credits+=home?14:8;c.credits+=win?10:draw?4:0;c.credits-=wageCharge(c,all.reduce((n,id)=>n+(c.condition[id].wage??legend(id).rating*.004),0),c.competition.round-1);for(const id of all){const s=c.condition[id],starting=m.played?.[home?0:1]?.includes(id)??c.xi.includes(id);s.contract=Math.max(0,s.contract-1);s.energy=m.engineVersion==='2.0.0'&&m.condition?.[id]!==undefined?m.condition[id]:Math.max(25,s.energy-(starting?(20+(100-legend(id).stamina)*.25)*(c.management?.preset==='press'?1.25:c.management?.preset==='protect'?.85:1):0));s.morale=Math.max(20,Math.min(95,s.morale+(starting?(win?3:draw?0:-3):-1)));if(starting)s.growth=Math.min(3,s.growth+(c.training==='development'?.12:.045));}c.history.push({round:c.competition.round,opponent:c.competition.teams.find(t=>t.id===(home?m.away:m.home)).name,home,score});if(c.competition.round%6===0&&!c.event&&!c.management)c.event=true;managerAfterFixture(c,m);}

async function progressCompetition(c,manage,context,startControl=false){

 if(busy)return null;if(eu.pending&&eu.pending.context!==context)throw Error('Finish your other saved live fixture first.');

 const next=upcomingFixtures(c).find(m=>m.home===c.user||m.away===c.user),overrides={};

 if(manage&&next&&c.engineVersion==='2.0.0'){

  const existing=eu.pending?.context===context&&eu.pending.fixture.seed===next.seed?eu.pending:null;

  const definition=existing?.definition||fixtureDefinition(c.teams.find(t=>t.id===next.home),c.teams.find(t=>t.id===next.away),next.seed);

  const pair=c.ties.find(t=>t.includes(c.user)),first=pair?c.firstLegResults?.[pair.join('|')]:null,aggregateBase=first?(next.home===first.home?[...first.score]:[...first.score].reverse()):null;

  const result=await playFixture({definition,aggregateBase,startControl,team:next.home===c.user?0:1,decisive:next.decisive,resume:existing,stakes:(c.stage==='league'?'Matchday '+(c.round+1):c.stage+' · leg '+next.leg)+' · '+(next.home===c.user?'Home':'Away'),onCheckpoint:p=>{eu.pending={...p,context,fixture:next};return save({background:p.background});}});

  if(!result){save();return null;}overrides[next.home+'|'+next.away+'|'+next.seed]=result;

 }

 if(!manage&&eu.pending?.context===context&&eu.pending.fixture.seed===next?.seed){

  host.toast('Resume your saved live fixture to keep the decisions already made.');return null;

 }

 busy=true;host.render();

 try{const response=await advanceInWorker(c,overrides);Object.keys(c).forEach(k=>delete c[k]);Object.assign(c,response.competition);eu.pending=null;if(context!=='career')save();return response.results;}

 finally{busy=false;host.render();}

}

export function installEurope(callbacks){host=callbacks;installDraftStudio({state:()=>eu,render:()=>host.render(),save});installManagerExperience({career:()=>eu.career,pending:()=>eu.pending,render:()=>host.render(),save,toast:message=>host.toast(message),navigate:page=>host.navigate(page)});document.addEventListener('input',e=>{if(e.target.id==='club-catalog-search'){if(careerSetupKind==='english')englishQuery=e.target.value;else if(careerSetupKind==='super')superQuery=e.target.value;else careerCatalogQuery=e.target.value;filterClubPicker(e.target);}if(e.target.closest('#create-club-form')){const data=Object.fromEntries(new FormData(e.target.form));customClub={...customClub,league:data.league||'english-sandbox',name:data.name,color:data.color,replace:data.replace,budget:Number(data.budget),superPreview:data.superPreview==='on'};if(!customClubOptions(customClub).some(p=>p.id===customClub.replace))customClub.replace=customClubOptions(customClub)[0].id;if(e.target.id==='new-club-competition')host.render();else syncCustomClubPreview(customClub);}});document.addEventListener('submit',e=>{if(e.target.id==='create-club-form'){e.preventDefault();try{if(busy||eu.pending||(eu.career&&!eu.browsingCareers))throw Error('Start a new career safely before replacing your current club.');if((customClub.step||0)!==3){host.toast('Review each setup step before creating your club.');return;}const data=Object.fromEntries(new FormData(e.target));if(data.superPreview==='on'){if(data.league!=='super-league'||!new URLSearchParams(location.search).has('qa'))throw Error('The preview requires a Super League career in QA.');const next=createSuperCareerPreview({clubId:data.replace,custom:true,name:data.name,color:data.color,budget:Number(data.budget),seed:eu.seed||20261018});if(eu.career)parkCareer(eu);eu.career=next;eu.browsingCareers=false;resetManagerView(next,{page:'transfers',transferTab:'founder'});save();}else startEnglishCareer({kind:data.league||'english-sandbox',clubId:data.replace,custom:true,name:data.name,color:data.color,budget:Number(data.budget)});host.render();window.scrollTo({top:0,behavior:'instant'});}catch(error){host.toast(error.message);}return;}const form=e.target.closest('[data-manager-form]');if(!form)return;e.preventDefault();if(busy||eu.pending){host.toast('Finish your saved live fixture first.');return;}try{const command=managerFormCommand(form);if(command.type==='filters'){for(const [id,value]of Object.entries(command.filters))managerCommand(eu.career,{type:'filter',id,value});}else managerCommand(eu.career,command);afterManagerUICommand(eu.career,command);save();host.render();}catch(error){host.toast(error.message);}});document.addEventListener('change',e=>{if(e.target.closest('#create-club-form')){const data=Object.fromEntries(new FormData(e.target.form));customClub={...customClub,league:data.league||'english-sandbox',name:data.name,color:data.color,replace:data.replace,budget:Number(data.budget)};if(!customClubOptions(customClub).some(p=>p.id===customClub.replace))customClub.replace=customClubOptions(customClub)[0].id;if(e.target.id==='new-club-competition')host.render();else syncCustomClubPreview(customClub);}else if(e.target.hasAttribute('data-founder-outgoing')&&eu.career){eu.career.management.foundingOutgoing=e.target.value;save();host.render();}else if(e.target.hasAttribute('data-founder-target')&&eu.career){eu.career.management.foundingTarget=e.target.value;save();host.render();}else if(e.target.id==='career-connected')connectedCareerChoice=e.target.checked;else if(e.target.id==='draft-role'){eu.roleFilter=e.target.value;save();host.render();}else if(e.target.id==='draft-sort'){eu.cardSort=eu.hidden&&['high','low'].includes(e.target.value)?'source':e.target.value;save();host.render();}else if(e.target.id==='draft-min'&&!eu.hidden){eu.minRating=Math.max(0,Math.min(99,Number(e.target.value)||0));save();host.render();}else if(e.target.id==='career-training'&&eu.career){eu.career.training=e.target.value;save();}});document.addEventListener('click',async e=>{const el=e.target.closest('[data-action^="eu-"]');if(!el||el.disabled)return;if(el.dataset.action==='eu-cancel-season'){seasonController?.abort();return;}if(busy)return;const a=el.dataset.action.slice(3),v=el.dataset.value,matchBefore=eu.career?.management&&['career-quick','career-manage','career-play','career-season','career-direct'].includes(a)?managerSnapshot(eu.career):null;try{if(eu.pending&&['career-pack','career-english','career-super','career-draft','reset-career','next-season','library-switch'].includes(a))throw Error('Finish your saved live fixture before changing careers.');
 if(eu.career?.management&&['buy','sell','renew','scout'].includes(a))throw Error('Use the recruitment and contract conversations for this career.');if(a==='manager-archive'){const season=eu.career?.management?.archive.find(s=>s.season===Number(el.dataset.season)),record=season?.physicalResults?.[Number(v)];if(!record?.definition)throw Error('This recorded match is unavailable.');await playFixture({replay:record,team:record.home==='user'?0:1,stakes:'Manager archive · season '+season.season});return;}if(a.startsWith('mg-')){if(eu.pending)throw Error('Finish your saved live fixture first.');if(a==='mg-adopt'){if(eu.career.competition.round!==0&&!eu.career.competition.champion)throw Error('Adopt at a season boundary. Your current season stays playable.');localStorage.setItem(key+'.before-manager',JSON.stringify(eu));upgradeManager(eu.career);}else {const command={type:a.slice(3),id:v,value:el.dataset.choice,kind:el.dataset.choice};managerCommand(eu.career,command);afterManagerUICommand(eu.career,command);}save();host.render();return;}


 if(a==='setup-next'||a==='setup-back'){const form=document.querySelector('#create-club-form');if(a==='setup-next'){for(const field of form.querySelectorAll('fieldset:not([hidden]) input,fieldset:not([hidden]) select'))if(!field.reportValidity())return;}customClub.step=Math.max(0,Math.min(3,(customClub.step||0)+(a==='setup-next'?1:-1)));}
 else if(a==='home'){eu.phase='home';}

 else if(a==='all-years'){eu.catalogYear=null;host.toast('This draft now explicitly includes all available years.');}

 else if(a==='resume-draft')eu.phase='draft';

 else if(a==='resume-manager')eu.phase='manager';

 else if(a==='resume'&&eu.competition)eu.phase='competition';

 else if(['start','iq','classic','daily','weekly','clubs'].includes(a))begin({format:a==='classic'?'league':'europe',hidden:a==='iq',daily:a==='daily',weekly:a==='weekly',type:a==='clubs'?'clubs':'players'});

 else if(a==='spin'){updateStudioView(eu,{query:'',panel:'picks',slot:null});if(eu.roll||eu.clubOptions){if(eu.rerolls<=0)return;eu.rerolls--;}const random=rng(eu.seed+(++eu.rollCount)*101);if(eu.type==='clubs')eu.clubOptions=shuffle(ICONS.filter(t=>t.packId&&!eu.clubs.includes(t.id)),eu.seed+eu.rollCount).slice(0,4);else{eu.seenPacks||=[...new Set((eu.picks||[]).map(id=>PACKS.find(p=>p.players.some(q=>q.id===id))?.id).filter(Boolean).concat(eu.roll||[]))];let pool=PACKS.filter(p=>!eu.catalogYear||p.year===eu.catalogYear);if(!pool.some(p=>p.players.some(q=>!eligibility(q,eu.picks,eu.formation,eu.positionRulesVersion))))throw Error('No eligible player remains in this year. Choose ‘Open all years’ to explicitly expand this draft.');eu.roll=drawPack(pool,eu.picks,eu.formation,eu.seenPacks,eu.seed,eu.rollCount,eu.positionRulesVersion);eu.seenPacks.push(eu.roll);}}

 else if(a==='pick'){const p=legend(v),pack=PACKS.find(p=>p.id===eu.roll);if(!p||!pack?.players.includes(p)||eligibility(p,eu.picks,eu.formation,eu.positionRulesVersion))throw Error('Choose an eligible player from the revealed squad.');eu.picks.push(v);eu.roll=null;updateStudioView(eu,{query:'',panel:'picks',slot:null});if(eu.picks.length===11)eu.phase='manager';}

 else if(a==='pickclub'){if(!eu.clubOptions.some(t=>t.id===v)||eu.clubs.includes(v))return;eu.clubs.push(v);eu.clubOptions=null;if(eu.clubs.length===8){const teams=eu.clubs.map(clubById).map(t=>({...t,attack:t.rating-7,defense:t.rating-8}));eu.competition=createCompetition(teams,{seed:eu.seed,format:'clubcup',user:teams[0].id});eu.competition.fieldLabel='Your drafted eight clubs';eu.phase='competition';eu.name=teams[0].name;eu.lastRound=[];}}

 else if(a==='club-era'){const pack=PACKS.find(p=>p.id===document.querySelector('#ucl-pack')?.value);if(!pack)throw Error('Choose a club-era squad.');begin();const squad=selectSquad(pack,eu.formation,eu.positionRulesVersion);eu.picks=squad.xi;eu.formation=squad.formation;eu.hostClub=pack.club;eu.name=pack.club+' '+pack.era;eu.sourcePack=pack.id;eu.phase='manager';}
 else if(a==='manager'){eu.manager=v;finishDraft();}

 else if(a==='season-fast'){if(eu.pending){host.toast('Finish your pending live fixture before skipping the rest of the league.');return;}busy=true;seasonController=new AbortController();host.render();try{const response=await advanceInWorker(eu.competition,{},'season',{signal:seasonController.signal,onProgress:p=>{const el=document.querySelector('#season-progress');if(el)el.textContent=`${p.stage||'Matchday'} ${p.round} / ${p.total} · ${p.fixtures} fixtures recorded`;}});eu.competition=response.competition;eu.lastRound=response.results.slice(-10);if(eu.competition.champion&&!eu.recorded){eu.history.push({name:eu.name,format:eu.competition.format,result:eu.competition.champion===eu.competition.user?'CHAMPION':'Season complete'});eu.history=eu.history.slice(-25);eu.recorded=true;}save();host.toast(response.cancelled?'Stopped between matchdays. Completed results are saved.':'The remaining competition is complete.');}finally{busy=false;seasonController=null;}}

 else if(a==='advance'||a==='manage'||a==='direct'){if(a==='direct'&&eu.pending?.context==='draft'&&eu.pending.definition?.controlVersion!==1)throw Error('Resume this saved fixture with its original controls.');const fresh=await progressCompetition(eu.competition,a!=='advance','draft',a==='direct');if(!fresh)return;eu.lastRound=fresh;if(eu.competition.champion&&!eu.recorded){const c=eu.competition;eu.history.push({name:eu.name,format:c.format,result:c.champion===c.user?'CHAMPION':c.eliminated?'Eliminated':'Season complete'});eu.history=eu.history.slice(-25);eu.recorded=true;}}

 else if(a==='watch-fixture'){const c=eu.competition,m=c.results[Number(v)];if(!m?.definition||m.engineVersion!=='2.0.0')throw Error('This fixture has no physical replay.');await playFixture({replay:m,team:m.home===c.user?0:1,stakes:'Recorded European night · '+m.stage});return;}
 else if(a==='watch'||a==='watch-career'){const career=a==='watch-career',c=career?eu.career.competition:eu.competition,m=career?latestCareerReplay(eu.career):c.results.findLast(m=>(m.home===c.user||m.away===c.user)&&!['fast-season-1','fast-career-2','fast-career-3','fast-career-4'].includes(m.engineVersion));if(!m)return;if(m.definition&&['2.0.0','2.1.0'].includes(m.engineVersion)){await playFixture({replay:m,team:m.home===c.user?0:1,stakes:'Recorded match · '+m.stage});return;}showFixtureReplay({match:m,home:c.teams.find(t=>t.id===m.home),away:c.teams.find(t=>t.id===m.away),formation:career?eu.career.formation:eu.formation,names:(career?eu.career.xi:eu.picks||[]).map(id=>legend(id).name)});return;}

 else if(a==='share'){const url=new URL(location.href);url.search='';url.searchParams.set('challenge',eu.seed);url.searchParams.set('format',eu.format);url.searchParams.set('formation',eu.formation);url.searchParams.set('field',eu.field||'icons');url.searchParams.set('host',eu.hostClub||'Real Madrid');if(eu.sourcePack)url.searchParams.set('pack',eu.sourcePack);if(eu.catalogYear)url.searchParams.set('year',eu.catalogYear);if(eu.hidden)url.searchParams.set('iq','1');if(eu.type==='clubs')url.searchParams.set('clubs','1');await navigator.clipboard.writeText(url.href);host.toast('Challenge link copied.');}

 else if(a==='career-draft'){if(eu.career&&!confirm('Replace your manager career with this drafted XI?'))return;if(eu.picks?.length!==11)throw Error('Finish an XI draft first.');startCareer(eu.picks,eu.formation,eu.name);host.navigate('dynasty');}

 else if(a==='open-custom'||a==='open-super'){customClub.step=0;careerSetupKind=a==='open-super'?'super':'custom';eu.browsingCareers=!!eu.career;host.navigate('dynasty');}
 else if(a==='setup-kind'){if(!['english','super','custom','historic'].includes(v))throw Error('Choose a supported setup.');careerSetupKind=v;if(v==='custom')customClub.step=0;}
 else if(a==='select-english'){if(!ENGLISH_PACKS.some(p=>p.id===v))throw Error('Choose an English club.');selectedEnglishClub=v;}
 else if(a==='career-english'){if(eu.career&&!eu.browsingCareers)throw Error('Back up and start a new career first.');startEnglishCareer({clubId:selectedEnglishClub});}
 else if(a==='select-super'){if(!SUPER_PACKS.some(p=>p.id===v))throw Error('Choose a Super League entrant.');selectedSuperClub=v;}
 else if(a==='super-offer-accept'||a==='super-offer-reject'){if(eu.pending)throw Error('Finish your saved match before changing registrations.');resolveSuperOffer(eu.career,v,a==='super-offer-accept');}
 else if(a==='career-direct'){if(eu.career?.careerRulesVersion!==2)throw Error('Use Play yourself at kickoff for this save.');await playConnectedCareer(true,'next',true);}
 else if(a==='career-super-verified'){createVerifiedSuperCareer();}
 else if(a==='career-super-preview'){if(!new URLSearchParams(location.search).has('qa'))throw Error('Preview is restricted to local QA.');if(eu.pending)throw Error('Finish your saved fixture first.');const next=createSuperCareerPreview({clubId:selectedSuperClub,seed:eu.seed||20261018});if(eu.career)parkCareer(eu);eu.career=next;eu.browsingCareers=false;resetManagerView(next);}
 else if(a==='career-super'){if(eu.pending)throw Error('Finish your saved fixture first.');startEnglishCareer({kind:'super-league',clubId:selectedSuperClub});}
 else if(a==='library-open'){eu.browsingCareers=true;}
 else if(a==='library-close'){eu.browsingCareers=false;}
 else if(a==='library-switch'){switchCareer(eu,v);}
 else if(a==='select-pack'){if(!PACKS.some(p=>p.id===v))throw Error('Choose an available squad.');selectedCareerPack=v;}
 else if(a==='career-pack'){const p=PACKS.find(p=>p.id===document.querySelector('#career-pack').value),squad=selectSquad(p);startCareer(squad.xi,squad.formation,p.club+' '+p.era,squad.bench);}

 else if(a==='tab'||a==='market'||a==='contracts')eu.career.tab=a==='tab'?v:a;

 else if(a==='rotate')host.toast(rotate(eu.career)+' tired starters rotated.');

 else if(a==='career-season'&&eu.career.connected){await playConnectedCareer(false,'season');}
 else if(a==='career-season'){if(eu.pending)throw Error('Complete your pending live fixture first.');if(eu.career.event)throw Error('Resolve the dressing-room decision before continuing.');busy=true;seasonController=new AbortController();host.render();const started=performance.now();try{let guard=0;while(!seasonController.signal.aborted&&!eu.career.competition.champion&&eu.career.trust>0&&!eu.career.event&&!managerShouldStop(eu.career)&&guard++<38){await playCareer(false,true);save();const progress=document.querySelector('#season-progress');if(progress)progress.textContent='Matchday '+eu.career.competition.round+' / 38 · each result and its finances are saved.';}if(eu.career.management)eu.career.management.lastSimulationMs=Math.round(performance.now()-started);save();host.toast((eu.career.event||managerShouldStop(eu.career))?'Paused for an inbox decision or expiring negotiation. Review Office and Recruitment.':'Season simulation stopped or completed.');}finally{busy=false;seasonController=null;}}

 else if(a==='career-quick'){busy=true;host.render();try{await playCareer(false,true);}finally{busy=false;}}
 else if(a==='career-play'||a==='career-manage')await playCareer(a==='career-manage');

 else if(a==='start-player'){const c=eu.career,p=legend(v),matches=c.xi.map((id,i)=>({id,i})).filter(({id})=>legend(id).role===p.role).sort((a,b)=>c.condition[a.id].energy-c.condition[b.id].energy);if(!c.bench.includes(v)||!matches.length)throw Error('No eligible starting position.');const out=matches[0];c.xi[out.i]=v;c.bench[c.bench.indexOf(v)]=out.id;}

 else if(a==='sell'){const c=eu.career;if(!c.bench.includes(v))return;if(c.bench.length<=3)throw Error('Keep at least three reserves.');c.credits+=Math.round(legend(v).cost*1.4);c.bench=c.bench.filter(id=>id!==v);delete c.condition[v];}

 else if(a==='scout'){const c=eu.career;if(c.credits<2||c.scouted.includes(v))return;c.credits-=2;c.scouted.push(v);}

 else if(a==='buy'){const c=eu.career,p=legend(v),cost=Math.round(p.cost*1.6);if(c.credits<cost||!c.scouted.includes(v)||c.xi.concat(c.bench).some(id=>legend(id).personId===p.personId))throw Error('This signing is unavailable.');if(c.bench.length>=12)throw Error('Sell a reserve before adding to this squad.');c.credits-=cost;c.bench.push(v);c.condition[v]={energy:100,morale:70,growth:0,contract:76};}

 else if(a==='renew'){const c=eu.career;if(c.credits<12||!c.condition[v])return;c.credits-=12;c.condition[v].contract+=76;}

 else if(a==='event'){const c=eu.career;if(!c.event)return;if(v==='support'&&c.credits<18)return;if(v==='support')c.credits-=18;for(const s of Object.values(c.condition)){s.morale=Math.max(20,Math.min(95,s.morale+(v==='support'?8:-3)));if(v==='support')s.energy=Math.min(100,s.energy+8);}c.event=null;}

 else if(a==='connected-replay'){const f=eu.career.connected?.calendar.fixtures.find(f=>f.id===v);if(!f?.result?.definition)throw Error('No physical record for that fixture.');await playFixture({replay:f.result,team:f.home==='user'?0:1,stakes:'Recorded connected career fixture'});return;}
 else if(a==='connected-adopt'){const c=eu.career;if(isEnglishSandbox(c)||hasSandboxWorld(c))throw Error('Real cups and qualification are not available in the English sandbox.');if(c.connected)throw Error('This career is already connected.');if(c.competition.round!==0&&!c.competition.champion)throw Error('Adopt at a season boundary.');localStorage.setItem(key+'.before-connected',JSON.stringify(eu));if(c.competition.champion){c.season++;c.credits+=100;c.trust=Math.max(55,c.trust);c.history=[];managerNextSeason(c);newCareerSeason();}enableConnectedSeason(c);c.management.page='competitions';}
 else if(a==='next-season'){const c=eu.career;if(c.connected?!c.connected.completed:!c.competition.champion)return;if(hasSandboxWorld(c)){eu.career=nextSandboxSeason(c);}else{const wasConnected=!!c.connected;const next=structuredClone(c);next.season++;next.credits+=100;next.trust=Math.max(55,next.trust);next.history=[];managerNextSeason(next);eu.career=next;newCareerSeason();if(wasConnected)enableConnectedSeason(eu.career);}resetManagerView(eu.career);}

 else if(a==='reset-career'){eu.resetRequested=true;}
 else if(a==='cancel-reset'){eu.resetRequested=false;}
 else if(a==='confirm-reset'){if(eu.pending)throw Error('Finish your saved live fixture first.');localStorage.setItem(key+'.before-reset',JSON.stringify(eu));eu.career=null;eu.resetRequested=false;}

 if(matchBefore&&eu.career?.management){const report=managerAftermath(eu.career,matchBefore);if(report)setManagerView(eu.career,{page:'office',preparing:false,aftermath:true,report});}
 save();host.render();if(matchBefore||['career-pack','career-english','career-super','library-switch','library-close','setup-kind','setup-next','setup-back'].includes(a))window.scrollTo({top:0,behavior:'instant'});

 }catch(error){host.render();host.toast(error.message||'Could not complete that action.');}});

 const params=new URLSearchParams(location.search);if(params.has('challenge')){const seed=Number(params.get('challenge'));if(Number.isSafeInteger(seed)&&seed>=0&&eu.challengeKey!==params.toString()){begin({seed,formation:params.get('formation'),year:Number(params.get('year'))||null,format:params.get('format')==='league'?'league':'europe',hidden:params.get('iq')==='1',type:params.get('clubs')==='1'?'clubs':'players'});if(FORMATIONS[params.get('formation')])eu.formation=params.get('formation');eu.field=params.get('field')==='current'?'current':'icons';if(ICONS.some(t=>t.name===params.get('host')))eu.hostClub=params.get('host');const source=PACKS.find(p=>p.id===params.get('pack'));if(source){const squad=selectSquad(source,eu.formation,eu.positionRulesVersion);eu.sourcePack=source.id;eu.picks=squad.xi;eu.formation=squad.formation;eu.hostClub=source.club;eu.name=source.club+' '+source.era;eu.phase='manager';}eu.challengeKey=params.toString();save();host.navigate('europe');}}

}


export function managerResumeSummary(){const c=eu.career;if(!c)return null;const club=PACKS.find(p=>c.name===p.club+' '+p.era)||legend(c.xi[0]);return {name:c.name,season:c.season,pending:!!eu.pending,completed:c.connected?c.connected.completed:!!c.competition.champion,color:c.setup?.color||club?.color||'#b6f36a',mark:(c.name||'FC').split(' ').filter(n=>!/^\d/.test(n)).slice(0,2).map(n=>n[0]).join('')};}



export function matchCentreCareer(){return {career:eu.career,fixture:eu.career?nextManagerFixture(eu.career):null,pending:eu.pending};}
export function openManagerDestination(page){
 if(!['office','squad','transfers','season','club'].includes(page))return;
 if(eu.career){eu.browsingCareers=false;setManagerView(eu.career,{page,preparing:false,aftermath:false,deal:null,proposal:null,message:null,squadTab:'lineup',transferTab:'discover',seasonTab:'calendar',clubTab:'overview'});}
 host.navigate('dynasty');
}

export const canUpdateEurope=()=>!busy&&!eu.pending&&!largeSaveNotice();
