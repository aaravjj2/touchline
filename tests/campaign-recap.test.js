import test from 'node:test';
import assert from 'node:assert/strict';
import {latestClubMatch,campaignRecap} from '../dist/campaign-recap.js';
import {draftCampaign} from '../dist/draft-studio.js';
import {createCompetition} from '../dist/competition.js';
const clubs=[{id:'user',name:'Harbour',attack:80,defense:80},{id:'away',name:'Valley',attack:80,defense:80}];
test('recap selects the latest user fixture, orients away metrics and leaves the recorded competition unchanged',()=>{
 const c={teams:clubs,user:'user',results:[{home:'away',away:'user',score:[1,3],stage:'Final',engineVersion:'2.0.0',definition:{},shots:[4,8],stats:{completed:[50,72],recoveries:[1,3]},playerStats:[[],[{name:'<Baker>',minutes:90,goals:2,shots:3,saves:0,recoveries:1}]]},{home:'away',away:'other',score:[2,0]}]},before=JSON.stringify(c),r=latestClubMatch(c),html=campaignRecap(c);
 assert.equal(r.index,0);assert.deepEqual(r.score,[3,1]);assert.match(html,/3 – 1/);assert.match(html,/8 <small>— 4/);assert.match(html,/72 <small>— 50/);assert.match(html,/&lt;Baker&gt;/);assert.ok(!html.includes('<Baker>'));assert.equal(JSON.stringify(c),before);
});
test('statistical recaps never invent contributions or replays; old physical records explain missing information',()=>{
 const c={teams:clubs,user:'user',results:[]};assert.equal(campaignRecap(c),'');c.results=[{home:'user',away:'away',score:[0,0],engineVersion:'fast-season-1'}];let html=campaignRecap(c);assert.match(html,/Statistical result/);assert.ok(!html.includes('Replay this match'));assert.ok(!html.includes('Recorded player contributions'));c.results[0]={...c.results[0],engineVersion:'2.0.0',definition:{}};html=campaignRecap(c);assert.match(html,/unavailable in this older record/);assert.ok(!html.includes('Completed passes'));
});
test('recap distinguishes a drawn second leg from the aggregate and orients seeded shootout scores',()=>{
 const c={teams:clubs,user:'user',results:[{home:'away',away:'user',score:[1,1],stage:'Final',pens:[5,4],penaltyHome:'user',penaltyWinner:'user',tieWinner:'user',engineVersion:'fast-season-1'}]},html=campaignRecap(c);assert.match(html,/Draw · Away/);assert.match(html,/penalties 5–4/);assert.match(html,/Tie winner: Harbour/);
});
test('campaign exposes direct play for new matches and preserves the original controls of legacy pending fixtures',()=>{
 const c=createCompetition(clubs,{format:'league'});c.engineVersion='2.0.0';const e={seed:2149,phase:'competition',format:'league',type:'players',formation:'4-3-3',competition:c},render=()=>draftCampaign(e,{table:()=>'',resultRows:()=>''});assert.match(render(),/id="eu-direct"/);e.pending={context:'draft',definition:{}};assert.ok(!render().includes('id="eu-direct"'));e.pending.definition.controlVersion=1;assert.match(render(),/Resume playing/);
});
