import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createSuperCareerPreview} from '../dist/super-career.js';
import {SUPER_PACKS} from '../dist/super-catalog.js';
import {prepareSuperFixture,simulateSuperFixture,commitSuperFixture,settleSuperDate} from '../dist/super-season.js';
import {simulateCareerMatchV4,validateCareerMatchV4} from '../dist/career-match-v4.js';
import {incidentTimeline,availabilityReason} from '../dist/match-incidents.js';
import {fixtureDefinition,fixtureState,playDefinition,fixtureResult,fixtureFingerprint} from '../dist/fixture-engine.js';
import {LiveWorld} from '../dist/live-world.js';
import {removePhysicalPlayer} from '../dist/physical-incidents.js';
import {stateAt,branchRecord} from '../dist/match-record.js';
import {canPlayPosition} from '../dist/player-positions.js';
import {positionProfile} from '../dist/manager-positions.js';
import {managerCommand,validateManagerXI} from '../dist/manager-career.js';
import {careerAvailability,availableSheet} from '../dist/career-availability.js';
import {sandboxProfile} from '../dist/sandbox-world.js';
import {careerMatchStatistics} from '../dist/career-statistics.js';
const make=(seed=311)=>createSuperCareerPreview({marketVersion:2,clubId:SUPER_PACKS[0].id,seed});
function setup(){const c=make(),f=c.connected.calendar.fixtures[0];prepareSuperFixture(c,f);return {c,f,h:c.competition.teams.find(t=>t.id===f.home),a:c.competition.teams.find(t=>t.id===f.away)};}
test('new careers activate dated incidents while the explicit legacy fixture remains on rules 3',()=>{
 const c=make();assert.equal(c.matchRulesVersion,4);assert.equal(c.statisticsVersion,3);assert.equal(c.world.availability.version,1);const old=createSuperCareerPreview({marketVersion:2,clubId:SUPER_PACKS[0].id,seed:311,incidents:false});assert.equal(old.matchRulesVersion,3);assert.equal(old.world.availability,undefined);
});
test('100 deterministic modeled fixtures reconcile dismissals, injuries, goals and reduced player minutes',()=>{
 const {h,a}=setup();let cards=0,injuries=0,reduced=0;
 for(let seed=1;seed<=100;seed++){const r=simulateCareerMatchV4(h,a,seed,true),timeline=validateCareerMatchV4(r,[h,a]);assert.deepEqual(r,simulateCareerMatchV4(h,a,seed,true));for(let t=0;t<2;t++){const expected=timeline.strength.reduce((n,s,i)=>n+((timeline.strength[i+1]?.minute??90)-s.minute)*s.players[t],0);assert.ok(Math.abs(r.playerStats[t].reduce((n,p)=>n+p.minutes,0)-expected)<1e-8);if(expected<990)reduced++;}cards+=r.incidentMatch.incidents.filter(e=>['yellow','red','second-yellow'].includes(e.type)).length;injuries+=r.incidentMatch.incidents.filter(e=>e.type==='injury').length;}
 assert.ok(cards>0);assert.ok(injuries>0);assert.ok(reduced>0);
});

test('background incident records derive exact statistics from the retained timeline and frozen identities',()=>{
 const c=make();for(let i=0;i<2;i++){const f=c.connected.calendar.fixtures.find(f=>f.status==='scheduled');prepareSuperFixture(c,f);const result=simulateSuperFixture(c,f);commitSuperFixture(c,f.id,result);if(i===1){assert.ok(f.home!=='user'&&f.away!=='user');assert.equal(f.result.compactStatistics,1);assert.equal(f.result.playerStats,undefined);assert.deepEqual(careerMatchStatistics(f.result,c.world.matchPeople),careerMatchStatistics(result));assert.ok(JSON.stringify(f.result).length<JSON.stringify(result).length*.65);assert.equal(commitSuperFixture(c,f.id,result),false);const restored=JSON.parse(JSON.stringify(c));assert.deepEqual(careerMatchStatistics(restored.connected.calendar.fixtures[1].result,restored.world.matchPeople),careerMatchStatistics(result));const id=result.incidentMatch.teams[0].players[0].id;delete restored.world.matchPeople[id];assert.throws(()=>careerMatchStatistics(restored.connected.calendar.fixtures[1].result,restored.world.matchPeople),/Missing frozen match identity/);}}
});
test('physical cards are recorded, exact replay/reload works, and Decision Lab retains its version',async()=>{
 const {h,a}=setup(),def=fixtureDefinition(h,a,1),state=playDefinition(def),r=fixtureResult(def,state);assert.equal(def.version,'2.1.0');assert.equal(def.rulesVersion,'incidents-1');assert.ok(r.incidentMatch.incidents.some(e=>e.type==='yellow'));validateCareerMatchV4(r,[h,a]);assert.deepEqual(fixtureResult(def,playDefinition(JSON.parse(JSON.stringify(def)))),r);
 const record={definition:def,commands:[],result:r},mid=JSON.parse(JSON.stringify(stateAt(record,7200))),world=new LiveWorld(mid);while(world.ticks<14400)world.fixed();world.writeState(mid);assert.deepEqual(mid,state);
 const branch=await branchRecord(record,{tick:8000,command:{type:'preset',value:'protect'}}),expected=fixtureResult(def,playDefinition(def,[{type:'preset',value:'protect',team:0,tick:8000}]));assert.deepEqual(branch.result,expected);assert.equal(branch.engineVersion,'2.1.0');
});
test('a goalkeeper dismissal removes the slot from physics and explicitly replaces keeper cover',()=>{
 const {h,a}=setup(),def=fixtureDefinition(h,a,3),s=fixtureState(def),w=new LiveWorld(s);while(w.ticks<4800)w.fixed();const before=w.profile(0).id;assert.equal(removePhysicalPlayer(w,0,'red'),true);assert.equal(w.isActive(0),false);assert.notEqual(w.state.keeperSlots[0],0);const frozen=[...w.positions[0]];while(w.ticks<14400)w.fixed();w.writeState(s);assert.deepEqual(w.positions[0],frozen);assert.equal(w.pose().active[0],false);const r=fixtureResult(def,s);validateCareerMatchV4(r,[h,a]);assert.equal(r.playerStats[0].find(p=>p.id===before).minutes,30);assert.ok(r.playerStats[0].reduce((n,p)=>n+p.minutes,0)<990);
});
test('calendar commit serves bans once, excludes unavailable players and recovers on the estimated date',()=>{
 const c=make(),id=c.xi[9],f=c.connected.calendar.fixtures[0];c.world.availability.bans.league[id]=2;c.world.availability.injuries[c.xi[8]]={until:'2026-08-15',fixtureId:'prior',estimatedDays:7};assert.throws(()=>validateManagerXI(c),/Unavailable/);prepareSuperFixture(c,f);const team=c.competition.teams.find(t=>t.id==='user');assert.ok(!team.xi.includes(id));assert.ok(!team.roster.some(p=>p.id===c.xi[8]));const r=simulateSuperFixture(c,f);commitSuperFixture(c,f.id,r);assert.equal(c.world.availability.bans.league[id],1);const snapshot=structuredClone(c);assert.equal(commitSuperFixture(c,f.id,r),false);assert.deepEqual(c,snapshot);settleSuperDate(c,'2026-08-15',{market:false});assert.equal(availabilityReason(c.world.availability,c.xi[8],'2026-08-15','league'),null);
});
test('shortage selection leaves missing striker slots empty and uses an explicit emergency keeper',()=>{
 const c=make(),players=c.xi.concat(c.bench).map(sandboxProfile),noStrikers=players.filter(p=>!canPlayPosition(positionProfile(p),'ST')),sheet=availableSheet(noStrikers);assert.ok(sheet.missing.includes('ST'));assert.ok(sheet.xi.length>=7&&sheet.xi.length<11);const noKeepers=availableSheet(players.filter(p=>p.role!=='GK'));assert.ok(noKeepers.emergencyKeeper);assert.equal(noKeepers.slots[0],noKeepers.emergencyKeeper);
});
test('actual 3.10 director checkpoints keep their archived next result without incident migration',async()=>{
 const root='reports/three-club-careers/2026-10-22-career-v3-director/barcelona/',c=JSON.parse(await readFile(root+'midseason-career.json','utf8')),final=JSON.parse(await readFile(root+'final-career.json','utf8')),f=c.connected.calendar.fixtures.find(f=>f.status==='scheduled');assert.equal(c.matchRulesVersion,3);settleSuperDate(c,f.date);if(f.home==='user'||f.away==='user')managerCommand(c,{type:'auto',value:'rotation',formation:c.formation});prepareSuperFixture(c,f);const r=simulateSuperFixture(c,f),stored={...structuredClone(r),kind:'statistical'};delete stored.condition;delete stored.played;assert.deepEqual(stored,final.connected.calendar.fixtures.find(q=>q.id===f.id).result);assert.equal(c.world.availability,undefined);
});
