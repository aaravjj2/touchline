import test from 'node:test';
import assert from 'node:assert/strict';
import {createPlayerCareer,advancePlayerWeek,acceptPlayerOffer,nextPlayerSeason,overall} from '../dist/player-career-core.js';
import {createPractice} from '../dist/practice-core.js';
import {advance,standings,upcomingFixtures} from '../dist/competition.js';
import {fixtureDefinition,fixtureState,applyCommand,playDefinition} from '../dist/fixture-engine.js';
import {playerPerformance} from '../dist/player-performance.js';
import {FIELD} from '../dist/club-field.js';
import {LiveWorld} from '../dist/live-world.js';
test('practice completes six home/away rounds with physical results and survives serialization',()=>{
 let p=createPractice(6,undefined,undefined,44),c=p.competition;assert.equal(c.schedule.length,6);
 const games=c.schedule.flat().filter(m=>m.includes(c.user));assert.equal(games.filter(m=>m[0]===c.user).length,3);
 for(let i=0;i<6;i++){assert.ok(upcomingFixtures(c).some(m=>m.home===c.user||m.away===c.user));advance(c);c=JSON.parse(JSON.stringify(c));}
 assert.equal(c.results.length,12);assert.ok(c.champion);assert.ok(standings(c).every(t=>t.p===6));assert.ok(c.results.every(m=>m.engineVersion==='2.0.0'));assert.deepEqual(advance(c),[]);
});
test('created careers are deterministic after recovery, isolate identities and validate creation',()=>{
 assert.throws(()=>createPlayerCareer({name:'',role:'FWD'}));assert.throws(()=>createPlayerCareer({name:'A',age:40}));
 const a=createPlayerCareer({name:'Aarav Test',seed:73,club:'club0',path:'prospect'});advancePlayerWeek(a);const b=JSON.parse(JSON.stringify(a));
 assert.deepEqual(advancePlayerWeek(a),advancePlayerWeek(b));assert.deepEqual(a,b);assert.equal(a.age,18);assert.ok(a.energy>=25&&a.energy<=100);assert.ok(a.history.every(h=>h.goals<=h.score[0]));
 const other=createPlayerCareer({name:'Other',seed:74});assert.equal(other.history.length,0);assert.notEqual(other.id,a.id);
 a.injury=2;const n=a.totals.appearances;advancePlayerWeek(a);assert.equal(a.injury,1);assert.equal(a.totals.appearances,n);assert.equal(a.history.at(-1).selection,'Injured');
});
test('player season records actual contributions, offers, transfers and age progression',()=>{
 const c=createPlayerCareer({name:'Season QA',role:'GK',seed:92,club:'club0',path:'prospect'});let moved=false;
 for(let i=0;i<38;i++){advancePlayerWeek(c);if(!moved&&c.offers.length){const o=c.offers[0];acceptPlayerOffer(c,o.club);assert.equal(c.club,o.club);assert.equal(c.contract,76);moved=true;}}
 assert.equal(c.seasons.length,1);assert.equal(c.history.length,38);assert.ok(c.totals.appearances>0);assert.equal(c.totals.minutes,c.history.reduce((n,h)=>n+h.minutes,0));assert.ok(c.transfers.length);assert.ok(overall(c)>=70);assert.throws(()=>advancePlayerWeek(c));
 const total=c.totals.appearances;nextPlayerSeason(c);assert.equal(c.age,19);assert.equal(c.week,0);assert.equal(c.season,2);assert.equal(c.totals.appearances,total);
});
test('player contributions follow substitutions and sum to recorded team events',()=>{
 const def=fixtureDefinition(FIELD[1],FIELD[4],88),out=def.rosters[0].find(p=>p.role==='GK'),reserve=def.reserves[0].find(p=>p.role==='GK');assert.ok(reserve);
 const s=playDefinition(def,[{type:'sub',team:0,out:out.id,in:reserve.id,tick:30*160}]);
 const rows=playerPerformance(def,s);assert.equal(rows[0].find(p=>p.id===out.id).minutes,30);assert.equal(rows[0].find(p=>p.id===reserve.id).minutes,60);
 for(let t=0;t<2;t++){assert.equal(rows[t].reduce((n,p)=>n+p.goals,0),s.score[t]);assert.equal(rows[t].reduce((n,p)=>n+p.shots,0),s.shots[t]);assert.equal(rows[t].reduce((n,p)=>n+p.saves,0),s.events.filter(e=>e.type==='save'&&e.team===t).length);}
});
test('individual finishing attributes change physical shot execution',()=>{
 const def=fixtureDefinition(FIELD[1],FIELD[4],88),high=fixtureState(def),low=fixtureState(def);
 high.rosters[0][9].attack=99;low.rosters[0][9].attack=50;
 const prepare=s=>{const w=new LiveWorld(s);w.owner=9;w.team=0;w.ball=[89,32];w.positions[9]=[89,32];w.held=3;w.decision();return w;};
 const a=prepare(high),b=prepare(low);assert.equal(a.flight.kind,'SHOT');assert.equal(b.flight.kind,'SHOT');assert.ok(Math.abs(a.ballV[1]/a.ballV[0])<Math.abs(b.ballV[1]/b.ballV[0]));
});
