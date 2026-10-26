import test from 'node:test';
import assert from 'node:assert/strict';
import {createSandboxCareer} from '../dist/sandbox-career.js';
import {SUPER_PACKS} from '../dist/super-catalog.js';
import {managerView,setManagerView,resetManagerView,managerPrimary,managerPriorities,rotationProposal,managerSnapshot,managerAftermath,managerDealImpact,nextManagerFixture,opponentBrief} from '../dist/manager-experience.js';
import {renderManagerCareer} from '../dist/manager-ui.js';
import {managerCommand} from '../dist/manager-career.js';
import {prepareSandboxMatchday,applySandboxMatchday} from '../dist/sandbox-season.js';
import {advance} from '../dist/competition.js';
import {footballMotion} from '../dist/athlete-presentation.js';
const career=()=>createSandboxCareer({kind:'super-league',clubId:SUPER_PACKS[0].id,seed:381});

test('manager presentation uses a separate QA namespace and never edits gameplay state',()=>{
 const c=career(),before=structuredClone(c),storage=new Map(),oldStorage=globalThis.localStorage,oldLocation=globalThis.location;
 globalThis.localStorage={getItem:k=>storage.get(k),setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)};globalThis.location={search:'?qa=1'};
 try{resetManagerView(c);setManagerView(c,{page:'squad',squadTab:'tactics'});renderManagerCareer(c);assert.deepEqual(c,before);assert.ok([...storage.keys()].every(k=>k.startsWith('touchline.manager-view.qa.v1.')));assert.equal(storage.size,1);}finally{if(oldStorage===undefined)delete globalThis.localStorage;else globalThis.localStorage=oldStorage;if(oldLocation===undefined)delete globalThis.location;else globalThis.location=oldLocation;resetManagerView(c);}
});
test('contextual action prioritizes saved fixtures, expired starters and completed seasons',()=>{
 const c=career();assert.equal(managerPrimary(c).action,'eu-view-prepare');c.condition[c.xi[0]].contract=0;assert.equal(managerPrimary(c).action,'eu-view-contracts');assert.equal(managerPrimary(c,{context:'career'}).action,'eu-career-manage');assert.equal(managerPrimary(c,{context:'draft'}).action,'eu-view-pending');c.competition.champion='user';assert.equal(managerPrimary(c).action,'eu-view-review');
});
test('office priorities come from actual state and healthy teams are not told to shop',()=>{
 const c=career();assert.deepEqual(managerPriorities(c),[]);c.condition[c.xi[0]].contract=0;c.condition[c.xi[1]].energy=40;c.management.inbox.push({id:'needs-time',title:'Playing time',text:'Review a real promise',mandatory:true});const p=managerPriorities(c);assert.equal(p[0].action,'contracts');assert.equal(p[1].id,'needs-time');assert.ok(p.some(p=>p.action==='rotation'));const before=structuredClone(c);resetManagerView(c);const html=renderManagerCareer(c);assert.equal((html.match(/class="mgr-priority /g)||[]).length,3);assert.ok(!html.includes('class="founding-builder"'));assert.ok(!html.includes('class="card mode-card sandbox-finance"'));assert.deepEqual(c,before);
});
test('rotation is a pure eligible proposal and only the existing lineup command applies it',()=>{
 const c=career();c.condition[c.xi[1]].energy=30;const before=structuredClone(c),xi=rotationProposal(c);assert.deepEqual(c,before);assert.equal(xi.length,11);assert.equal(new Set(xi).size,11);assert.notEqual(xi[1],c.xi[1]);managerCommand(c,{type:'lineup',xi,formation:c.formation});assert.deepEqual(c.xi,xi);assert.equal(c.credits,before.credits);
});
test('aftermath appears only after a committed fixture and reports actual changes',()=>{
 const c=career(),before=managerSnapshot(c);assert.equal(managerAftermath(c,before),null);prepareSandboxMatchday(c);const results=advance(c.competition,{}, {fast:true});applySandboxMatchday(c,results);const after=structuredClone(c),report=managerAftermath(c,before);assert.deepEqual(report.score,c.history[0].score);assert.equal(report.opponent,c.history[0].opponent);assert.equal(report.physical,false);assert.equal(report.matches,1);assert.ok(report.facts.length<=3);assert.equal(report.cashDelta,c.credits-before.cash);assert.deepEqual(c,after);assert.ok(nextManagerFixture(c).opponent.name);
});
test('deal previews include wages and fees once, with completed and pending amounts already committed',()=>{
 const c=career(),d={kind:'buy',player:'example',stage:'ready',fee:20,wage:.1,share:50},before=structuredClone(c),a=managerDealImpact(c,d),b=managerDealImpact(c,d,{fee:30,wage:.2});assert.equal(b.cash,a.cash-10);assert.ok(Math.abs((a.forecast-b.forecast)-15.2)<1e-8);assert.equal(managerDealImpact(c,{...d,stage:'complete'}).cash,c.credits);assert.equal(managerDealImpact(c,{...d,stage:'pending'}).cash,c.credits);assert.deepEqual(c,before);
});
test('all five destinations render without altering a world or hiding its source limitations',()=>{
 const c=career(),before=structuredClone(c);for(const page of ['office','squad','transfers','season','club']){setManagerView(c,{page,aftermath:false});const html=renderManagerCareer(c);assert.ok(html.includes('data-manager-page="'+page+'"'));assert.ok(html.includes('Real registration and loan ownership are not fully verified'));}assert.deepEqual(c,before);
});
test('preparation quotes recorded meetings and selected squad strengths',()=>{
 const c=career(),before=structuredClone(c),f=nextManagerFixture(c),first=opponentBrief(c,f);assert.equal(first.name,f.opponent.name);assert.equal(first.last,null);assert.ok(first.rating>0);assert.ok(first.cover.GK>=1);c.history.push({opponent:f.opponent.name,home:true,score:[2,1]});const again=opponentBrief(c,f);assert.deepEqual(again.last,{score:[2,1],home:true});resetManagerView(c);setManagerView(c,{page:'squad',preparing:true,squadTab:'lineup',aftermath:false});const html=renderManagerCareer(c);assert.match(html,/Opposition briefing/);assert.match(html,/Last recorded meeting: Home 2–1/);assert.match(html,/tactical effects remain game estimates/);assert.doesNotMatch(html,/rumour|certain to|will struggle/);c.history.pop();assert.deepEqual(c,before);
});
test('football animation samples follow contact, receiving and saving ages deterministically',()=>{
 const pose={phase:'SHOT',team:0,kicker:9,kickAge:.1,carrier:9,receiveAge:2,saveAge:2},before=structuredClone(pose);assert.deepEqual(footballMotion(pose,9,8),{mode:'shoot',time:.31});assert.equal(footballMotion({...pose,kicker:null},9,8).mode,'sprint');assert.equal(footballMotion({...pose,kicker:null,receiveAge:.1},9,0).mode,'receive');assert.equal(footballMotion({...pose,kicker:null,carrier:0,saveAge:.2},0,0).mode,'keeper-save');assert.equal(footballMotion({...pose,phase:'GOAL'},9,0).mode,'celebrate');assert.deepEqual(pose,before);
});
