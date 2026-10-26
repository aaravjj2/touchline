import test from 'node:test';
import assert from 'node:assert/strict';
import {createSuperCareerPreview} from '../dist/super-career.js';
import {SUPER_PACKS} from '../dist/super-catalog.js';
import {recruitmentComparison} from '../dist/recruitment-comparison.js';
import {legend} from '../dist/legends.js';
import {POSITION_SLOTS} from '../dist/player-positions.js';
test('unknown positions produce no invented upgrade or starter recommendation',()=>{
 const c=createSuperCareerPreview({clubId:SUPER_PACKS[0].id,seed:311}),before=structuredClone(c),r=recruitmentComparison(c,{id:'synthetic-unknown',rating:99,positions:[]});assert.equal(r.comparable,false);assert.equal(r.difference,null);assert.equal(r.role,null);assert.match(r.message,/unverified/);assert.deepEqual(c,before);
});
test('intended natural position selects its actual starter and never treats a winger as a striker',()=>{
 const c=createSuperCareerPreview({clubId:SUPER_PACKS[0].id,seed:311}),p={id:'synthetic-wide',rating:85,positions:['LW']};assert.equal(recruitmentComparison(c,p,'ST').comparable,false);assert.equal(recruitmentComparison(c,p,'RW').comparable,false);const i=POSITION_SLOTS[c.formation].indexOf('LW'),r=recruitmentComparison(c,p,'LW');assert.equal(r.starter,legend(c.xi[i]).name);assert.equal(r.difference,85-legend(c.xi[i]).rating);assert.equal(r.position,'LW');
 const both=recruitmentComparison(c,{...p,positions:['LW','ST']},'ST'),striker=POSITION_SLOTS[c.formation].indexOf('ST');assert.equal(both.starter,legend(c.xi[striker]).name);assert.equal(both.position,'ST');
});
