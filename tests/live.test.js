import test from 'node:test';
import assert from 'node:assert/strict';
import {FIELD} from '../dist/club-field.js';
import {PACKS} from '../dist/legends.js';
import {LiveWorld} from '../dist/live-world.js';
import {fixtureDefinition,fixtureState,playDefinition,applyCommand,fixtureResult} from '../dist/fixture-engine.js';
import {createCompetition,advance,upcomingFixtures,standings} from '../dist/competition.js';
const home={id:'user',name:'Draft XI',formation:'4-3-3',roster:PACKS[0].players.concat(PACKS[1].players)};
const definition=seed=>fixtureDefinition(home,FIELD[1],seed);
test('all 36 verified squads fill a real XI and have dated UEFA provenance',()=>{
 assert.equal(FIELD.length,36);for(const team of FIELD){assert.ok(team.roster.length>=18);assert.match(team.source,/https:\/\/www.uefa.com\//);assert.equal(team.checked,'2026-10-19');assert.equal(fixtureDefinition(home,team,1).rosters[1].length,11);}
});
test('render frame rates do not change the authoritative game or goals',()=>{
 const def=definition(92),reference=playDefinition(def);
 for(const fps of [30,60,120]){const s=fixtureState(def),w=new LiveWorld(s);while(w.ticks<14400)w.update(1/fps);w.writeState(s);assert.deepEqual(s.world,reference.world);assert.deepEqual(s.events,reference.events);}
 for(let team=0;team<2;team++)assert.equal(reference.score[team],reference.events.filter(e=>e.type==='goal'&&e.team===team).length);
 assert.ok(reference.events.filter(e=>e.type==='goal').every(e=>e.y>28.35&&e.y<35.65&&e.height<2.44));
});
test('saving/reloading and command replay reproduce watched results including substitutions',()=>{
 const def=definition(18),s=fixtureState(def);let w=new LiveWorld(s);
 while(w.ticks<4000)w.fixed();w.writeState(s);
 applyCommand(s,{type:'preset',team:0,value:'press'});
 const out=s.rosters[0].find(p=>p.role==='MID'),reserve=s.reserves[0].find(p=>p.role==='MID');applyCommand(s,{type:'sub',team:0,out:out.id,in:reserve.id});
 w=new LiveWorld(JSON.parse(JSON.stringify(s)));while(w.ticks<7000)w.fixed();w.writeState(s);applyCommand(s,{type:'build',team:0,value:'short'});applyCommand(s,{type:'role',team:0,slot:1,value:'hold'});
 w=new LiveWorld(s);while(w.ticks<14400)w.fixed();w.writeState(s);
 const replay=playDefinition(def,s.actions);assert.deepEqual(replay.world,s.world);assert.deepEqual(replay.events,s.events);assert.deepEqual(replay.rosters,s.rosters);assert.equal(s.substitutions[0],1);
});
test('ordinary interceptions and tackles keep athletes and the ball continuous',()=>{
 const w=new LiveWorld(fixtureState(definition(45)));let turnovers=0;
 for(let t=0;t<14400;t++){const p=w.pose(),restart=w.restart;w.fixed();const q=w.pose();if(!restart&&!w.restart){for(let i=0;i<22;i++)assert.ok(Math.hypot(q.positions[i][0]-p.positions[i][0],q.positions[i][1]-p.positions[i][1])<.2);assert.ok(Math.hypot(q.ball[0]-p.ball[0],q.ball[1]-p.ball[1])<.7);}if(q.switches>p.switches)turnovers++;}
 assert.ok(turnovers>10);
});
test('pressing changes actual pressure distances and energy, not a goal multiplier',()=>{
 let pressed=0,balanced=0,pressDistance=0,balanceDistance=0;
 for(let seed=0;seed<6;seed++){const def=definition(seed),base=playDefinition(def),press=playDefinition({...def,preset:'press'});pressed+=press.world.energy.slice(1,11).reduce((a,b)=>a+b);balanced+=base.world.energy.slice(1,11).reduce((a,b)=>a+b);pressDistance+=press.world.pressureSum[0]/press.world.pressureSamples[0];balanceDistance+=base.world.pressureSum[0]/base.world.pressureSamples[0];}
 assert.ok(pressed<balanced);assert.ok(pressDistance<balanceDistance);
});
test('new cups play first and second legs separately and a managed result commits once',()=>{
 const teams=[home,...FIELD.slice(0,7)],c=createCompetition(teams,{format:'clubcup'}),next=upcomingFixtures(c)[0],def=fixtureDefinition(c.teams.find(t=>t.id===next.home),c.teams.find(t=>t.id===next.away),next.seed),result=fixtureResult(def,playDefinition(def),true);
 const fresh=advance(c,{[next.home+'|'+next.away+'|'+next.seed]:result});assert.equal(fresh.length,4);assert.deepEqual(c.results[0].score,result.score);assert.equal(c.results.filter(m=>m.seed===next.seed).length,1);
 const european=createCompetition([home,...FIELD.slice(0,35)],{seed:43});european.stage='Semi-finals';european.ties=[['user','club1'],['club2','club3']];european.schedule=[];
 assert.equal(advance(european).length,2);assert.equal(european.knockoutLeg,2);assert.equal(european.stage,'Semi-finals');assert.equal(advance(european).length,2);assert.equal(european.stage,'Final');assert.equal(european.results.filter(m=>m.leg===2).length,2);
});
