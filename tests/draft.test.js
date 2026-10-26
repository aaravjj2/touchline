import test from 'node:test';
import assert from 'node:assert/strict';
import {FORMATIONS} from '../dist/engine.js';
import {LEGENDS,PACKS} from '../dist/legends.js';
import {eligibility,assignSlots,orderedXI,drawPack} from '../dist/draft.js';
test('draft accepts a forward first and mixed pick order for every formation',()=>{
 for(const formation of Object.keys(FORMATIONS)){
  const ids=[];const roles=FORMATIONS[formation].map(s=>s.role).reverse();
  for(const role of roles){const p=LEGENDS.find(p=>p.role===role&&!eligibility(p,ids,formation));assert.ok(p);ids.push(p.id);}
  assert.equal(ids.length,11);assert.equal(assignSlots(ids,formation).filter(Boolean).length,11);
  assert.deepEqual(orderedXI(ids,formation).map(id=>LEGENDS.find(p=>p.id===id).role),FORMATIONS[formation].map(s=>s.role));
  assert.ok(LEGENDS.every(p=>eligibility(p,ids,formation)));
 }
});
test('seeded reveals do not repeat a club-era until the eligible pool is exhausted',()=>{
 for(const seed of [1,44,20261019,999999]){
  const seen=[],ids=[];
  for(let turn=1;turn<=11;turn++){
   const id=drawPack(PACKS,ids,'4-3-3',seen,seed,turn);assert.ok(!seen.includes(id));
   const previous=PACKS.find(p=>p.id===seen.at(-1)),unseen=PACKS.filter(p=>!seen.includes(p.id)&&p.players.some(q=>!eligibility(q,ids,'4-3-3')));
   if(previous&&unseen.some(p=>p.club!==previous.club))assert.notEqual(PACKS.find(p=>p.id===id).club,previous.club);
   seen.push(id);
   const pack=PACKS.find(p=>p.id===id),p=pack.players.find(p=>(turn!==1||p.role==='GK')&&!eligibility(p,ids,'4-3-3'));assert.ok(p);ids.push(p.id);
   if(turn===1)assert.ok(PACKS.flatMap(p=>p.players).filter(p=>p.role==='GK').every(p=>eligibility(p,ids,'4-3-3')));
  }
  assert.equal(assignSlots(ids,'4-3-3').filter(Boolean).length,11);
 }
});
test('full role and the same person from another era are blocked',()=>{
 const keeper=PACKS[0].players.find(p=>p.role==='GK');assert.equal(eligibility(keeper,[],'4-3-3'),'');
 assert.equal(eligibility(PACKS[1].players.find(p=>p.role==='GK'),[keeper.id],'4-3-3'),'GK positions filled');
 const same=LEGENDS.find(p=>p.personId===keeper.personId&&p.id!==keeper.id);
 if(same)assert.equal(eligibility(same,[keeper.id],'4-3-3'),'Already in your XI');
});
