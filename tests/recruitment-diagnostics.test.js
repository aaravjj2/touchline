import test from 'node:test';
import assert from 'node:assert/strict';
import {createSuperCareerPreview} from '../dist/super-career.js';
import {SUPER_PACKS} from '../dist/super-catalog.js';
import {configureRecruitment,runCareerMarket,recruitmentAllowance} from '../dist/career-market.js';
import {recruitmentPanel} from '../dist/super-career-ui.js';
import {sandboxFinancePanel} from '../dist/sandbox-ui.js';
const make=()=>createSuperCareerPreview({clubId:SUPER_PACKS[0].id,seed:20261023});
test('recorded recruitment diagnostics explain failed limits without changing any transfer outcome',()=>{
 const c=make();configureRecruitment(c,{enabled:true,feeBudget:1,weeklyBudget:1});const old=structuredClone(c);delete old.management.market.diagnosticsVersion;
 for(const save of [c,old])runCareerMarket(save,'2026-08-08');const report=c.connected.weeklyReports.at(-1),me=report.needs.find(n=>n.club==='user');assert.ok(me.assessments.length>0);assert.ok(me.assessments.some(a=>Object.values(a.rejected).some(n=>n>0)));assert.ok(!report.transfers.some(t=>t.buyer==='user'));
 const clean=structuredClone(c);delete clean.management.market.diagnosticsVersion;for(const r of clean.connected.weeklyReports)for(const n of r.needs||[])delete n.assessments;assert.deepEqual(clean,old);
 const before=structuredClone(c);assert.match(recruitmentPanel(c),/Last recruitment review/);assert.match(sandboxFinancePanel(c),/Allowances limit purchases/);assert.deepEqual(c,before);
});
test('window allowances include completed manual purchases and remain separate from available club cash',()=>{
 const c=make();configureRecruitment(c,{enabled:true,feeBudget:50000000,weeklyBudget:150000});const person=c.world.players[0];c.world.agreements.push({id:'synthetic-complete-purchase',status:'complete',registered:'2026-08-01',terms:{kind:'transfer',to:'user',fee:10000000,player:person.id},recruitment:{weeklyWageGbp:30000}});
 const before=structuredClone(c),a=recruitmentAllowance(c);assert.equal(a.feesRemaining,40000000);assert.equal(a.weeklyRemaining,120000);assert.equal(a.open,true);assert.deepEqual(c,before);
 c.world.date='2027-02-01';const winter=recruitmentAllowance(c);assert.equal(winter.window,'2027-winter');assert.equal(winter.open,false);assert.equal(winter.spent,0);
});
