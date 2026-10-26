import test from 'node:test';
import assert from 'node:assert/strict';
import {createAnnualCareer,advancePlayerYear,resolveAnnualDecision} from '../dist/annual-career.js';
import {enableCareerDepth,setSecondaryTraining,retireCareer,roleIndex,positionalFit,finishCareerDepth} from '../dist/career-depth.js';
import {renewChapter,chapterOffers,currentCircuit,selectionReport} from '../dist/career-chapters.js';
import {renderChapterPage} from '../dist/career-chapter-ui.js';
import {overall} from '../dist/player-career-core.js';
const create=(options={})=>createAnnualCareer({name:'Depth QA',seed:43,nation:'Spain',startClub:'local',depth:true,...options});
function year(c){advancePlayerYear(c);if(c.pendingDecision){resolveAnnualDecision(c,c.pendingDecision.choices.at(-1).id);advancePlayerYear(c);}return c;}

test('origins enforce appropriate ages without country penalties or hidden attribute changes on adoption',()=>{
 const a=create({origin:'scouted'}),b=create({origin:'scouted',nation:'Nepal'});assert.deepEqual(a.skills,b.skills);assert.equal(a.potential,b.potential);assert.equal(a.reputation,22);
 assert.throws(()=>create({age:18,origin:'comeback'}),/starting age/);assert.throws(()=>create({age:29,origin:'late'}),/starting age/);assert.throws(()=>create({origin:'invented'}),/origin/);
 const comeback=create({age:30,origin:'comeback'});assert.equal(comeback.age,30);assert.equal(comeback.startAge,30);assert.ok(comeback.injury>=8);assert.ok(comeback.skills.finishing>a.skills.finishing);assert.ok(comeback.skills.pace<a.skills.pace);
 const old=year(createAnnualCareer({name:'Preserved',seed:8})),history=structuredClone(old.history),skills=structuredClone(old.skills);enableCareerDepth(old);assert.deepEqual(old.history,history);assert.deepEqual(old.skills,skills);assert.equal(old.careerModel,'career-world-4');old.yearJob={};const copy=createAnnualCareer({name:'Active',seed:9});copy.week=2;assert.throws(()=>enableCareerDepth(copy),/Finish the year/);
});

test('comeback recovery provides one meaningful decision and reload reproduces the full year',()=>{
 let a=create({origin:'comeback',age:30}),b=structuredClone(a);advancePlayerYear(a);advancePlayerYear(b);assert.deepEqual(a,b);assert.equal(a.week,4);assert.equal(a.pendingDecision.kind,'rehabilitation');assert.ok(a.injury>3);assert.throws(()=>setSecondaryTraining(a,'LW'),/between/);
 a=JSON.parse(JSON.stringify(a));const injury=a.injury;resolveAnnualDecision(a,'early');resolveAnnualDecision(b,'early');assert.equal(a.injury,injury-2);assert.equal(a.health.earlyReturn,true);assert.throws(()=>resolveAnnualDecision(a,'early'));advancePlayerYear(a);advancePlayerYear(b);assert.deepEqual(a,b);assert.equal(a.age,31);assert.equal(a.decisions.length,1);assert.equal(a.seasons.length,1);assert.equal(a.depth.rival.history.length,1);
});

test('position training broadens measurable role fit and preserves its progress across reload',()=>{
 let c=create({role:'FWD',identity:'finisher'});const circuit=currentCircuit(c),target=circuit.tiers.flat().filter(id=>positionalFit(c,id).need!=='ST').sort((a,b)=>selectionReport(c,a).share-selectionReport(c,b).share)[0],position=positionalFit(c,target).need;setSecondaryTraining(c,position);assert.throws(()=>setSecondaryTraining(c,'GK'));year(c);assert.ok(c.depth.secondary[position]>=12);assert.equal(c.seasons[0].secondary.from,0);c=JSON.parse(JSON.stringify(c));assert.equal(c.depth.training,position);const original=c.depth.secondary[position],before=selectionReport(c,target).share;c.depth.secondary[position]=100;assert.ok(selectionReport(c,target).share>before);assert.ok(positionalFit(c,target).bonus>0);c.depth.secondary[position]=original;
 const gk=create({role:'GK',identity:'stopper'});assert.throws(()=>setSecondaryTraining(gk,'ST'));assert.throws(()=>setSecondaryTraining(gk,'GK'));setSecondaryTraining(gk,'none');
});

test('rivalry, recognition and awards use repeatable role contributions and once-only annual records',()=>{
 const a=year(create({role:'DEF',identity:'organizer'})),b=year(create({role:'DEF',identity:'organizer'}));assert.deepEqual(a,b);assert.notEqual(a.depth.rival.club,a.club);assert.equal(a.depth.recognition.length,1);assert.equal(a.depth.recognition[0].shortlist.length,5);assert.equal(a.depth.recognition[0].role,'DEF');assert.ok(Number.isFinite(a.seasons[0].rival.ownScore));
 const defender={minutes:2700,goals:1,assists:2,chances:8,recoveries:180,saves:0};assert.ok(roleIndex('DEF',defender)>roleIndex('DEF',{...defender,recoveries:20,goals:15}));
 const keeper={...defender,goals:0,saves:160,cleanSheets:15};assert.ok(roleIndex('GK',keeper)>roleIndex('GK',{...keeper,saves:30}));
 renewChapter(a);year(a);assert.equal(a.depth.rival.history.length,2);assert.equal(new Set(a.depth.recognition.map(r=>r.season)).size,2);assert.equal(a.seasons.length,2);
});

test('potential evolves within bounds from recorded exposure without inflating current skills',()=>{
 const c=create(),skills=structuredClone(c.skills),circuit=currentCircuit(c);c.outlook.ceiling=98.9;const row={competition:'League',minutes:90,goals:1,assists:1,recoveries:4,chances:3,saves:0,rating:8,score:[2,0]},summary={};finishCareerDepth(c,summary,Array.from({length:30},()=>({...row})),circuit);assert.equal(c.outlook.ceiling,99);assert.equal(c.potential,99);assert.deepEqual(c.skills,skills);assert.ok(summary.outlook.change>0);
 const low=create();const before=low.outlook.ceiling;finishCareerDepth(low,{},[],currentCircuit(low));assert.equal(low.outlook.ceiling,before-.25);assert.ok(overall(low)<low.potential);const developed=create();developed.skills.finishing=developed.outlook.ceiling;const rating=developed.skills.finishing;finishCareerDepth(developed,{},[],currentCircuit(developed));assert.equal(developed.outlook.ceiling,rating);assert.equal(developed.skills.finishing,rating);
});

test('agent leverage persists for one transfer window and retirement is explicit and guarded',()=>{
 const c=create();c.depth.negotiationLeverage=5;const boosted=chapterOffers(c);c.depth.negotiationLeverage=0;const base=chapterOffers(c);for(const offer of boosted){const other=base.find(o=>o.club===offer.club);if(other)assert.ok(offer.interest>=other.interest);}assert.ok(boosted.some(o=>o.interest>base.find(b=>b.club===o.club)?.interest));assert.throws(()=>retireCareer(c),/age 30/);
 const older=create({origin:'comeback',age:30});older.yearJob={};assert.throws(()=>retireCareer(older),/between years/);older.yearJob=null;const rows=structuredClone(older.history);retireCareer(older);assert.equal(older.retired,true);assert.deepEqual(older.history,rows);assert.throws(()=>advancePlayerYear(older),/retired/);assert.equal(older.depth.retirement.age,30);
 const last=create({age:30,origin:'comeback'});last.depth.retirementAge=31;year(last);assert.equal(last.retired,true);assert.equal(last.age,31);
 const legacy=createAnnualCareer({name:'Legacy',age:24,seed:8});assert.equal(legacy.depth,undefined);assert.equal(legacy.careerModel,'career-world-3');
});

test('deeper career screens expose current progress, a readable story and retirement review',()=>{
 const c=year(create({age:30,origin:'comeback'})),state={profiles:[c],tab:'story'},opts={busy:false,creating:false,creation:()=>''};let html=renderChapterPage(c,state,opts);assert.match(html,/Touchline role recognition/);state.tab='club';html=renderChapterPage(c,state,opts);assert.ok(html.includes(c.depth.rival.name));assert.ok(html.includes(c.depth.relationships.agent));state.tab='legacy';html=renderChapterPage(c,state,{...opts,retirementConfirm:true});assert.match(html,/Confirm retirement/);assert.match(html,/cannot advance another year/);
});
