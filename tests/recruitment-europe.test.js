import test from 'node:test';
import assert from 'node:assert/strict';
import {createAnnualCareer} from '../dist/annual-career.js';
import {startingClubOffers,recruitmentAssessment,countryCode} from '../dist/career-recruitment.js';
import {PACKS,legend} from '../dist/legends.js';
import {ICONS,oppositionField,selectSquad,packClub,balancedBench,clubIdentity,withFamiliarity} from '../dist/europe-clubs.js';
import {createCompetition,advance,standings} from '../dist/competition.js';
import {FORMATIONS} from '../dist/engine.js';

const prospect=nation=>createAnnualCareer({name:'Scouting QA',nation,seed:43,depth:true,origin:'scouted',path:'prospect',startClub:'local'});
test('first offers reflect domestic scouting without country changing player talent',()=>{
 const spain=prospect('Spain'),nepal=prospect('Nepal');assert.deepEqual(spain.skills,nepal.skills);assert.equal(spain.potential,nepal.potential);const a=startingClubOffers(spain),b=startingClubOffers(nepal);assert.ok(a.some(o=>o.id==='club4'));assert.ok(b.every(o=>o.id.startsWith('academy:')||o.id.startsWith('career:Nepal:')));assert.equal(countryCode('Spain'),'ESP');assert.equal(countryCode('ESP'),'ESP');assert.ok(a.every(o=>o.reason&&o.route));
 assert.throws(()=>createAnnualCareer({name:'No automatic elite',nation:'Nepal',seed:43,depth:true,recruitment:true,startClub:'club26',path:'prospect',origin:'scouted'}),/offering a realistic/);
 const chosen=createAnnualCareer({name:'Choose my route',nation:'Spain',seed:43,depth:true,recruitment:true,startClub:'club4',path:'prospect',origin:'scouted'});assert.equal(chosen.club,'club4');assert.equal(chosen.recruitment.version,1);assert.ok(chosen.arrival.includes('domestic'));assert.equal(chosen.worlds.ESP.year,1);
});
test('a senior record opens overseas pathways and youth starts use a stated game restriction',()=>{
 const c=prospect('Nepal');assert.equal(recruitmentAssessment(c,'club26').eligible,false);c.reputation=65;for(const key of Object.keys(c.attributes))c.attributes[key]=85;c.seasons=[{minutes:3300},{minutes:3200}];assert.equal(recruitmentAssessment(c,'club26').eligible,true);
 const youth=prospect('Nepal');youth.age=16;youth.access='international';assert.ok(startingClubOffers(youth).every(o=>!o.id.startsWith('club')));assert.match(recruitmentAssessment(youth,'club25',{initial:true}).reason,/18|exposure/);
 const start=startingClubOffers(c).find(o=>o.id.startsWith('career:'));assert.ok(start);const career=createAnnualCareer({name:'Regional start',nation:'Nepal',seed:43,depth:true,recruitment:true,startClub:start.id,path:'prospect',origin:'scouted'});assert.equal(career.club,start.id);assert.equal(JSON.parse(JSON.stringify(career)).club,start.id);
});
test('curated Champions League restores historical giants and Classic uses exactly twenty featured clubs',()=>{
 assert.equal(ICONS.length,36);assert.equal(new Set(ICONS.map(t=>clubIdentity(t.name))).size,36);for(const name of ['AC Milan','Juventus','Chelsea','Ajax','Benfica','Marseille','Tottenham','Monaco'])assert.ok(ICONS.some(t=>t.name===name));for(const name of ['Sabah','Viking','LASK','Slovan Bratislava','Slavia Praha','Como'])assert.ok(ICONS.every(t=>t.name!==name));
 const user={...packClub(PACKS[0]),id:'user',name:'My XI'};for(const format of ['league','europe']){const teams=oppositionField(user,{format,hostClub:'Barcelona'});assert.equal(teams.length,format==='league'?20:36);assert.equal(teams.filter(t=>clubIdentity(t.name)==='Barcelona').length,0);assert.equal(new Set(teams.map(t=>t.id)).size,teams.length);if(format==='league')assert.ok(teams.slice(1).every(t=>t.packId));}
});
test('every historic/current snapshot creates a valid complete XI with role cover and no duplicate people',()=>{
 for(const pack of PACKS){const s=selectSquad(pack);assert.equal(s.xi.length,11);assert.deepEqual(s.xi.map(id=>legend(id).role),FORMATIONS[s.formation].map(p=>p.role));assert.equal(new Set([...s.xi,...s.bench].map(id=>legend(id).personId)).size,s.xi.length+s.bench.length);}
 const xi=selectSquad(PACKS[0]).xi,bench=balancedBench(xi);assert.equal(bench.length,7);assert.equal(new Set(xi.concat(bench).map(id=>legend(id).personId)).size,18);assert.ok(bench.reduce((s,id)=>s+legend(id).rating,0)/7>75);
});
test('curated UCL completes all league rounds, distinct knockout legs and final with once-only fixture results',()=>{
 const user={...packClub(PACKS.find(p=>p.club==='AC Milan')),id:'user'},c=createCompetition(oppositionField(user,{hostClub:'AC Milan'}),{seed:34});assert.equal(c.engineVersion,'2.0.0');for(let i=0;i<8;i++)advance(c,{}, {fast:true});assert.equal(c.results.length,144);assert.ok(standings(c).every(t=>t.p===8));assert.equal(c.stage,'Play-offs');const checkpoint=JSON.parse(JSON.stringify(c));advance(c,{}, {fast:true});assert.equal(c.knockoutLeg,2);assert.equal(c.results.length,152);advance(checkpoint,{}, {fast:true});assert.deepEqual(c,checkpoint);
 while(!c.champion)advance(c,{}, {fast:true});assert.equal(c.results.length,189);assert.equal(c.results.filter(m=>m.stage==='Final').length,1);assert.equal(c.results.filter(m=>m.leg===2).length,22);assert.ok(c.results.every(m=>m.engineVersion==='fast-season-1'&&!m.definition));const old=structuredClone(c);assert.deepEqual(advance(c),[]);assert.deepEqual(c,old);
});

test('shared-club familiarity reaches actual match profiles without changing saved cards',()=>{
 const squad=selectSquad(PACKS[0]),roster=squad.xi.map(id=>legend(id)),before=structuredClone(roster),changed=withFamiliarity(roster,squad.xi);assert.deepEqual(roster,before);assert.ok(changed.every((p,i)=>p.control>roster[i].control&&p.control<=99));
});
