import test from 'node:test';
import assert from 'node:assert/strict';
import {europeanSchedule,leagueSchedule,createCompetition,advance,standings} from '../dist/competition.js';
import {LEGENDS,PACKS} from '../dist/legends.js';
const teams=n=>Array.from({length:n},(_,i)=>({id:i?'t'+i:'user',name:'Team '+i,attack:80+i%10,defense:78+i%7}));
test('European schedule has eight unique opponents and four home/four away for all 36 clubs',()=>{
 const ids=teams(36).map(t=>t.id),rounds=europeanSchedule(ids);assert.equal(rounds.length,8);
 for(const round of rounds){assert.equal(round.length,18);assert.equal(new Set(round.flat()).size,36);}
 for(const id of ids){const games=rounds.flat().filter(m=>m.includes(id));assert.equal(games.length,8);assert.equal(games.filter(m=>m[0]===id).length,4);assert.equal(new Set(games.map(m=>m.find(t=>t!==id))).size,8);}
});
test('European cup completes deterministically through 144 league fixtures and two-legged knockout ties',()=>{
 const run=seed=>{const c=createCompetition(teams(36),{seed});let n=0;while(!c.champion&&n++<20)advance(c);assert.ok(c.champion);assert.equal(c.results.filter(m=>m.stage==='league').length,144);assert.equal(c.results.filter(m=>m.stage==='Final').length,1);assert.equal(c.results.length,189);assert.ok(standings(c).every(t=>t.p===8));return c;};
 assert.deepEqual(run(1234),run(1234));for(let i=0;i<50;i++)run(i);
});
test('perfect season contains 380 fixtures and 38 games per club',()=>{const c=createCompetition(teams(20),{format:'league'});assert.equal(leagueSchedule(c.teams.map(t=>t.id)).length,38);for(let i=0;i<38;i++)advance(c);assert.ok(c.champion);assert.equal(c.results.length,380);assert.ok(standings(c).every(t=>t.p===38));assert.deepEqual(advance(c),[]);});
test('eight-club custom cup resolves every tie and crowns a champion in three rounds',()=>{for(let seed=0;seed<100;seed++){const c=createCompetition(teams(8),{format:'clubcup',seed});for(let i=0;i<3;i++)advance(c);assert.equal(c.results.length,7);assert.ok(c.champion);assert.ok(c.results.every(m=>m.winner));}});
test('expanded catalog preserves legacy IDs and adds sourced full squads',()=>{assert.equal(PACKS.length,39);assert.equal(LEGENDS.length,628);assert.equal(new Set(LEGENDS.map(p=>p.id)).size,628);for(const pack of PACKS){assert.ok(pack.players.length>=11);assert.ok(pack.players.some(p=>p.role==='GK'));assert.ok(pack.players.every(p=>/^https:\/\/(www|editorial)\.uefa\.com\//.test(p.source)));}assert.equal(LEGENDS.find(p=>p.id==='legend-0-9').name,'Lionel Messi');});
