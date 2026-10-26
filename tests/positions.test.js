import test from 'node:test';
import assert from 'node:assert/strict';
import {canPlayPosition,matchPositions,POSITION_SLOTS} from '../dist/player-positions.js';
import {PACKS} from '../dist/legends.js';
import {eligibility,drawPack,orderedXI} from '../dist/draft.js';
import {fixtureDefinition,fixtureState,applyCommand} from '../dist/fixture-engine.js';
import {packClub,oppositionField} from '../dist/europe-clubs.js';
const p=(id,positions)=>({id,personId:id,positions});
test('specific positions distinguish strikers, wide attackers, sides and central defenders',()=>{
 for(const [from,to] of [['ST','LW'],['ST','RW'],['LW','ST'],['RW','ST'],['RB','LB'],['CB','RB'],['AM','RW']])assert.equal(canPlayPosition(p(from,[from]),to),false,from+' cannot fill '+to);
 assert.equal(canPlayPosition(p('multi',['ST','LW']),'LW'),true);
 assert.equal(canPlayPosition(p('unknown',[]),'ST'),false);
});
test('matching moves a flexible player to keep the specialist eligible',()=>{
 const players=[p('flex',['LW','RW']),p('left',['LW']),p('striker',['ST'])],slots=matchPositions(players,'4-3-3');
 assert.equal(slots[8].id,'left');assert.equal(slots[9].id,'striker');assert.equal(slots[10].id,'flex');
 assert.equal(matchPositions([p('left',['LW']),p('second',['LW'])],'4-3-3'),null);
});
test('new drafts complete specific positions for every formation across seeded reveals',()=>{
 for(const formation of Object.keys(POSITION_SLOTS))for(const seed of [1,44,20261019]){
  const ids=[],seen=[];
  for(let turn=0;turn<11;turn++){const pack=PACKS.find(p=>p.id===drawPack(PACKS,ids,formation,seen,seed,turn,2));seen.push(pack.id);const card=pack.players.find(p=>!eligibility(p,ids,formation,2));assert.ok(card);ids.push(card.id);}
  assert.equal(orderedXI(ids,formation,2).length,11);
 }
});
test('new fixture substitutions reject a striker in a winger slot and preserve the assigned position',()=>{
 const def=fixtureDefinition(packClub(PACKS[14]),packClub(PACKS[15]),937),out=def.rosters[0].find(p=>p.role==='FWD'),reserve=def.reserves[0].find(p=>p.role==='FWD');out.assignedPosition='LW';reserve.positions=['ST'];const s=fixtureState(def);
 assert.throws(()=>applyCommand(s,{type:'sub',out:out.id,in:reserve.id}),/cannot play LW/);assert.equal(s.substitutions[0],0);assert.equal(s.actions.length,0);
 s.reserves[0].find(p=>p.id===reserve.id).positions=['ST','LW'];applyCommand(s,{type:'sub',out:out.id,in:reserve.id});assert.equal(s.rosters[0].find(p=>p.id===reserve.id).assignedPosition,'LW');assert.equal(s.substitutions[0],1);
});
test('new European fields contain distinct clubs and no forced position assignments',()=>{
 const teams=oppositionField({id:'user',name:'Your XI'},{positionVersion:2});assert.equal(teams.length,36);assert.equal(new Set(teams.map(p=>p.name)).size,36);
 for(const t of teams.slice(1))for(const id of t.xi){const p=t.roster.find(p=>p.id===id);assert.ok(canPlayPosition(p,p.assignedPosition),t.name+' '+p.name);}
});
