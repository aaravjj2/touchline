import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createFACup,pendingCupFixtures,simulateCupGame,commitCupGame} from '../dist/manager-cups.js';
const data=JSON.parse(await readFile(new URL('../data/manager/fa-cup-2026-entrants.json',import.meta.url),'utf8'));
test('all 743 official entrants use their access rounds and every tie resolves',()=>{
 const c=createFACup(data,{seed:51}),entered=new Map(),rounds=[];let lastRound=-1;
 while(!c.champion){const fixtures=pendingCupFixtures(c);if(c.round!==lastRound){rounds.push({round:c.round,ties:fixtures.length});lastRound=c.round;for(const f of fixtures)for(const id of [f.home,f.away])if(!entered.has(id))entered.set(id,c.round);}
  for(const f of fixtures){const team=id=>({id,attack:70,defense:70});commitCupGame(c,f.id,simulateCupGame(team(f.home),team(f.away),f));}
 }
 assert.equal(entered.size,743);assert.deepEqual(rounds.map(r=>r.ties),[219,136,112,80,40,32,40,20,32,16,8,4,2,1]);assert.equal(c.results.filter(r=>!r.isReplay).length,742);assert.ok(c.results.some(r=>r.isReplay));
 for(const p of data.clubs.filter(c=>c.entryRound==='third-proper'))assert.equal(entered.get(p.id),8);
 assert.equal(createFACup(data,{seed:51}).ties[0].id,c.id+':0:0');
});
test('qualifying draw creates one reversed replay; identical retries do not advance or duplicate it',()=>{
 const c=createFACup(data),f=pendingCupFixtures(c)[0],r={home:f.home,away:f.away,seed:f.seed,score:[1,1],winner:null,kind:'statistical'};
 commitCupGame(c,f.id,r);const replay=pendingCupFixtures(c).find(q=>q.id===f.id+':replay');assert.equal(replay.home,f.away);assert.equal(replay.away,f.home);const before=structuredClone(c);assert.equal(commitCupGame(c,f.id,r),false);assert.deepEqual(c,before);assert.throws(()=>commitCupGame(c,replay.id,{home:replay.home,away:replay.away,seed:replay.seed,score:[1,1],winner:null}));assert.deepEqual(c,before);
});
