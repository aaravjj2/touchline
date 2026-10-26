import test from 'node:test';
import assert from 'node:assert/strict';
import {createAnnualCareer,advancePlayerYear,resolveAnnualDecision,startingClub,migrateAnnual} from '../dist/annual-career.js';
import {createPlayerCareer} from '../dist/player-career-core.js';
import {createCompetition,simulateRemainingLeague,standings} from '../dist/competition.js';
import {filterCards} from '../dist/draft.js';
import {LEGENDS} from '../dist/legends.js';
test('annual years resume seeded decisions once and record 38 games without duplicate aging',()=>{
 for(let seed=1;seed<=30;seed++){
 let c=createAnnualCareer({name:'QA',seed,path:'prospect',nation:'Spain'});advancePlayerYear(c);
 if(c.pendingDecision){const week=c.week;advancePlayerYear(c);assert.equal(c.week,week);c=JSON.parse(JSON.stringify(c));resolveAnnualDecision(c,c.pendingDecision.choices[0].id);advancePlayerYear(c);}
 assert.equal(c.age,19);assert.equal(c.season,2);assert.equal(c.history.length,38);assert.equal(c.seasons.length,1);assert.equal(c.week,0);assert.ok(c.history.every(h=>h.goals<=h.shots&&h.assists<=h.score[0]-h.goals));
 }
});
test('scouting affects opportunities without nationality changing ability',()=>{
 const a=createAnnualCareer({name:'QA',seed:9,nation:'Spain',path:'prospect'}),b=createAnnualCareer({name:'QA',seed:9,nation:'Nepal',path:'prospect'});assert.deepEqual(a.attributes,b.attributes);assert.equal(a.potential,b.potential);assert.notEqual(a.club,b.club);
 let local=0;for(let seed=0;seed<100;seed++)if(startingClub({nation:'Nepal',path:'prospect',seed}).id.startsWith('academy:'))local++;assert.ok(local>75);
 assert.deepEqual(startingClub({nation:'Spain',path:'prospect',access:'international',seed:3}),startingClub({nation:'Nepal',path:'prospect',access:'international',seed:3}));
 const old=createPlayerCareer({name:'Old',club:'club23'}),copy=structuredClone(old);migrateAnnual(old);assert.equal(old.club,copy.club);assert.deepEqual(old.history,copy.history);
});
test('whole league is deterministic, completes all 380 fixtures and is idempotent',()=>{
 const teams=Array.from({length:20},(_,i)=>({id:i?'t'+i:'user',name:'T'+i,attack:70+i,defense:70+i}));
 const a=createCompetition(teams,{format:'league',seed:42}),b=structuredClone(a),start=performance.now();simulateRemainingLeague(a);console.log('Full league ms:',(performance.now()-start).toFixed(1));simulateRemainingLeague(b);assert.deepEqual(a,b);assert.equal(a.results.length,380);assert.ok(standings(a).every(t=>t.p===38));assert.ok(a.results.every(r=>r.engineVersion==='fast-season-1'));assert.deepEqual(simulateRemainingLeague(a),[]);
});
test('draft role and rating filters respect Football IQ concealment',()=>{
 for(const p of LEGENDS)for(const k of ['rating','attack','defense','control','stamina','cost'])assert.ok(Number.isFinite(p[k]),p.name+' '+k);
 const normal=filterCards(LEGENDS,[],'4-3-3',{role:'FWD',minimum:90,sort:'high'});assert.ok(normal.length);assert.ok(normal.every(p=>p.role==='FWD'&&p.rating>=90));assert.ok(normal.every((p,i)=>!i||p.rating<=normal[i-1].rating));assert.deepEqual(filterCards(LEGENDS,[],'4-3-3',{hidden:true,minimum:99,sort:'high'}),filterCards(LEGENDS,[],'4-3-3'));
});
