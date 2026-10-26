import test from 'node:test';
import assert from 'node:assert/strict';
import {campaignSummary,draftCampaign,draftPlayer,studioView,updateStudioView} from '../dist/draft-studio.js';
import {createCompetition,advance} from '../dist/competition.js';
import {PACKS} from '../dist/legends.js';

const teams=Array.from({length:8},(_,i)=>({id:i?'club'+i:'user',name:'Club '+i,attack:80,defense:80,color:'#123456'}));
test('cup summary counts actual decisive wins, including penalties, without fabricating league points',()=>{
 const c=createCompetition(teams,{format:'clubcup',seed:41});while(!c.champion)advance(c,{}, {fast:true});const before=JSON.stringify(c),s=campaignSummary(c),mine=c.results.filter(r=>r.home==='user'||r.away==='user');
 assert.equal(s.me.p,mine.length);assert.equal(s.me.w,mine.filter(r=>r.winner==='user').length);assert.equal(s.me.l,mine.filter(r=>r.winner!=='user').length);assert.equal(s.me.pts,0);assert.equal(s.rank,null);assert.equal(JSON.stringify(c),before);
 const pen=createCompetition(teams,{format:'clubcup'});pen.results=[{home:'user',away:'club1',score:[1,1],pens:[5,4],winner:'user',stage:'Quarter-finals'}];assert.equal(campaignSummary(pen).me.w,1);
});
test('campaign bracket distinguishes confirmed draws and undrawn stages; replay index zero remains actionable',()=>{
 const c=createCompetition(teams,{format:'clubcup'}),e={phase:'competition',seed:931,name:'Your XI',format:'europe',type:'clubs',formation:'4-3-3',competition:c};updateStudioView(e,{tab:'bracket'});
 let html=draftCampaign(e,{table:()=>'',resultRows:()=>''});assert.equal((html.match(/Draw confirmed · next tie/g)||[]).length,4);assert.equal((html.match(/Draw not made yet/g)||[]).length,2);assert.ok(html.includes('CUP MATCHES'));
 c.results.push({home:'user',away:'club1',score:[2,1],winner:'user',stage:'Quarter-finals',round:1,definition:{},engineVersion:'2.0.0'});updateStudioView(e,{tab:'fixtures'});html=draftCampaign(e,{table:()=>'',resultRows:()=>''});assert.match(html,/data-action="eu-watch-fixture" data-value="0"/);
});
test('IQ player choices conceal overall and every attribute while retaining identity and position',()=>{
 const p=PACKS[0].players[0],html=draftPlayer(p,{hidden:true});assert.ok(html.includes(p.name));assert.match(html,/draft-row-rating"><b>\?<\/b>/);assert.equal((html.match(/<b>\?<\/b>/g)||[]).length,5);assert.ok(!html.includes(`<b>${p.rating}</b>`));
});
test('draft presentation preferences use separate storage and do not write gameplay records',()=>{
 const records=new Map();globalThis.localStorage={getItem:k=>records.get(k)||null,setItem:(k,v)=>records.set(k,v)};globalThis.location={search:'?qa=1'};
 try{const e={seed:99314,format:'league',type:'players',picks:['unchanged'],competition:{results:[]}},before=JSON.stringify(e);updateStudioView(e,{tab:'fixtures',query:'Messi',panel:'xi'});assert.equal(JSON.stringify(e),before);assert.equal(studioView(e).query,'Messi');assert.equal(records.size,1);const [key,value]=[...records][0];assert.match(key,/^touchline\.draft-view\.qa\.v1:/);assert.deepEqual(JSON.parse(value),{tab:'fixtures'});updateStudioView(e,{tab:'invalid',panel:'invalid'});assert.equal(studioView(e).tab,'overview');assert.equal(studioView(e).panel,'picks');}
 finally{delete globalThis.localStorage;delete globalThis.location;}
});
