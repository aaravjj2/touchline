import {dismissOpeningIntro} from './helpers/opening.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdir} from 'node:fs/promises';
import {chromium} from '@playwright/test';

const base='http://127.0.0.1:4211';
let server,browser;
test.before(async()=>{
 server=spawn(process.execPath,['tests/legacy-server.mjs'],{env:{...process.env,PORT:'4211',COACH_ENABLED:'false'},stdio:'pipe'});
 await new Promise((resolve,reject)=>{server.stdout.once('data',resolve);server.once('error',reject);server.once('exit',code=>reject(Error('Test server exited '+code)));});
 browser=await chromium.launch({headless:true});await mkdir('work/draft36',{recursive:true});
});
test.after(async()=>{await browser?.close();server?.kill();});
async function open(t,mobile=false){
 const context=await browser.newContext({viewport:mobile?{width:390,height:844}:{width:1600,height:1100}}),page=await context.newPage(),errors=[];
 page.setDefaultTimeout(12000);page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400&&r.url().startsWith(base))errors.push(r.status()+' '+r.url());});
 t.after(async()=>{try{assert.deepEqual(errors,[]);}finally{await context.close();}});
 await page.goto(base+'/?qa=1');await dismissOpeningIntro(page);await page.getByRole('button',{name:'Draft & Europe',exact:true}).click();return page;
}
const saved=page=>page.evaluate(()=>localStorage.getItem('touchline.europe.qa.v1'));
async function noOverflow(page){assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);}
async function historic(page){await page.getByRole('button',{name:'Use this historic squad',exact:true}).click();await page.locator('[data-action=eu-manager]').first().click();}

test('Draft studio keeps reveal, search, natural-position choices and pitch together without losing the run',{timeout:60000},async t=>{
 const page=await open(t);await noOverflow(page);await page.screenshot({path:'work/draft36/home-desktop.png',fullPage:true});
 await page.getByRole('button',{name:'Start Champions League draft',exact:true}).click();assert.equal(await page.locator('.draft-pitch-slot').count(),11);assert.ok(await page.locator('.draft-squad').isVisible());
 await page.getByRole('button',{name:'Reveal a club & era',exact:true}).click();await page.locator('.legend-card').first().waitFor();
 assert.equal(await page.locator('.draft-row-art').first().evaluate(e=>getComputedStyle(e,'::before').display),'none');
 const before=await saved(page),names=await page.locator('.draft-row-identity strong').allTextContents();
 await page.getByRole('searchbox',{name:'Search this squad'}).fill('no-such-player-zz');assert.equal(await page.locator('.legend-card').count(),0);assert.equal(await saved(page),before);assert.equal(await page.locator('#draft-search').evaluate(e=>e===document.activeElement),true);
 await page.getByRole('button',{name:'Clear search & filters',exact:true}).click();assert.deepEqual(await page.locator('.draft-row-identity strong').allTextContents(),names);
 await page.locator('.draft-pitch-slot').filter({hasText:'GK'}).first().click();assert.equal(await page.locator('#draft-role').inputValue(),'GK');assert.ok(await page.locator('.legend-card').count());
 await page.locator('.legend-card').first().click();assert.equal(await page.locator('.draft-pitch-slot.filled').count(),1);
 await page.getByRole('button',{name:'Reveal a club & era',exact:true}).click();await page.locator('.legend-card').first().waitFor();assert.equal(await page.locator('#draft-role option[value=GK]').count(),0);
 await page.screenshot({path:'work/draft36/draft-desktop.png',fullPage:true});await noOverflow(page);
 const reveal=await page.locator('.spin-panel h2').innerText(),picks=JSON.parse(await saved(page)).picks;await page.reload();assert.equal(await page.locator('.spin-panel h2').innerText(),reveal);assert.deepEqual(JSON.parse(await saved(page)).picks,picks);
});

test('390px Draft studio exposes the XI and keyboard controls, hides IQ ratings and loads artwork',{timeout:60000},async t=>{
 const page=await open(t,true);await page.screenshot({path:'work/draft36/home-mobile.png',fullPage:true});await page.getByRole('button',{name:'Champions League IQ · ratings hidden',exact:true}).click();
 await page.getByRole('button',{name:'Reveal a club & era',exact:true}).click();assert.ok(await page.locator('.legend-card').count());assert.deepEqual([...new Set(await page.locator('.draft-row-rating b,.legend-attributes b').allTextContents())],['?']);
 assert.equal(await page.locator('#draft-min').count(),0);assert.equal(await page.locator('#draft-sort option[value=high]').count(),0);await page.locator('.legend-card img').first().evaluate(img=>img.decode());
 await noOverflow(page);await page.screenshot({path:'work/draft36/draft-mobile.png',fullPage:true});
 const before=await saved(page);await page.getByRole('tab',{name:'Player choices',exact:true}).press('ArrowRight');assert.ok(await page.locator('.draft-squad').isVisible());assert.equal(await saved(page),before);assert.equal(await page.locator('.draft-pitch-slot:visible').count(),11);await noOverflow(page);
 const boxes=await page.locator('.draft-pitch-slot').evaluateAll(es=>es.map(e=>{const r=e.getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height};}));for(let i=0;i<boxes.length;i++)for(let j=i+1;j<boxes.length;j++){const a=boxes[i],b=boxes[j];assert.ok(a.x+a.w<=b.x||b.x+b.w<=a.x||a.y+a.h<=b.y||b.y+b.h<=a.y,'pitch slots overlap');}
 await page.screenshot({path:'work/draft36/pitch-mobile.png',fullPage:true});await page.locator('.draft-pitch-slot').filter({hasText:'ST'}).first().click();assert.ok(await page.locator('.draft-picks').isVisible());assert.equal(await page.locator('#draft-role').inputValue(),'ST');
 await page.getByRole('button',{name:'Settings & saves',exact:true}).click();await page.getByRole('button',{name:'Export all saves',exact:true}).waitFor();await noOverflow(page);
});

test('Europe campaign navigation is read-only, keyboard accessible and keeps completed results exact',{timeout:90000},async t=>{
 const page=await open(t);await historic(page);await page.screenshot({path:'work/draft36/campaign-desktop.png',fullPage:true});
 const initial=await saved(page);for(const label of ['League table','Fixtures & replays','Knockout bracket','Your XI','Overview']){await page.getByRole('tab',{name:label,exact:true}).click();assert.equal(await saved(page),initial);await noOverflow(page);}
 await page.getByRole('tab',{name:'Overview',exact:true}).press('ArrowRight');assert.equal(await page.getByRole('tab',{name:'League table',exact:true}).getAttribute('aria-selected'),'true');assert.equal(await page.locator('.league-table tbody tr').count(),36);
 await page.reload();assert.equal(await page.getByRole('tab',{name:'League table',exact:true}).getAttribute('aria-selected'),'true');assert.equal(await saved(page),initial);
 await page.locator('[data-action=eu-season-fast]').click();await page.locator('[data-action=eu-home]').first().waitFor({timeout:60000});
 const complete=await saved(page),c=JSON.parse(complete).competition;assert.equal(c.results.length,189);assert.ok(c.champion);
 await page.getByRole('tab',{name:'Knockout bracket',exact:true}).click();assert.equal(await page.locator('.campaign-bracket-round').count(),5);assert.equal(await page.locator('.campaign-tie').count(),23);assert.equal(await saved(page),complete);
 for(const r of c.results.filter(r=>r.aggregate)){const first=c.results.find(x=>x.stage===r.stage&&x.home===r.aggregateHome&&x.away===r.home);assert.ok(first);const tie=page.locator('.campaign-bracket-round').filter({has:page.getByRole('heading',{name:r.stage,exact:true})}).locator('.campaign-tie').filter({hasText:c.teams.find(t=>t.id===first.home).name});assert.equal(await tie.count(),1);const values=await tie.locator('div>b').allTextContents();assert.deepEqual(values,r.aggregate.map(String));}
 await page.screenshot({path:'work/draft36/bracket-desktop.png',fullPage:true});await page.setViewportSize({width:390,height:844});await noOverflow(page);await page.screenshot({path:'work/draft36/bracket-mobile.png',fullPage:true});
 await page.getByRole('tab',{name:'Overview',exact:true}).click();await page.screenshot({path:'work/draft36/campaign-mobile.png',fullPage:true});await noOverflow(page);assert.equal(await saved(page),complete);
});

test('every completed draft formation fits at desktop and 390px without overlapping player cards',{timeout:60000},async t=>{
 const page=await open(t,true);
 const formations=await page.evaluate(async()=>Object.keys((await import('/engine.js')).FORMATIONS));
 for(const width of [390,1440])for(const formation of formations){
  await page.setViewportSize({width,height:1000});
  await page.evaluate(async formation=>{const {draftPitch}=await import('/draft-studio.js'),{FORMATIONS}=await import('/engine.js'),{LEGENDS}=await import('/legends.js'),{eligibility}=await import('/draft.js');const picks=[];for(const slot of FORMATIONS[formation])picks.push(LEGENDS.find(p=>p.role===slot.role&&!eligibility(p,picks,formation)).id);document.querySelector('main').innerHTML='<div class="draft-studio"><div class="draft-coach-layout"><section></section><aside class="card draft-squad">'+draftPitch({seed:1,phase:'manager',formation,picks,positionRulesVersion:1})+'</aside></div></div>';},formation);
  const boxes=await page.locator('.draft-pitch-slot').evaluateAll(es=>es.map(e=>{const r=e.getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height};}));
  assert.equal(boxes.length,11);for(let i=0;i<11;i++)for(let j=i+1;j<11;j++){const a=boxes[i],b=boxes[j];assert.ok(a.x+a.w<=b.x+.5||b.x+b.w<=a.x+.5||a.y+a.h<=b.y+.5||b.y+b.h<=a.y+.5,`${width}px ${formation}: slots ${i}/${j} overlap`);}
  await noOverflow(page);
 }
});

test('custom draft setup reaches the coach stage and preserves its formation in the current European field',{timeout:60000},async t=>{
 const page=await open(t);await page.locator('#eu-name').fill('North Quay XI');await page.locator('#eu-formation').selectOption('5-3-2');await page.locator('#eu-field').selectOption('current');await page.getByRole('button',{name:'Start Champions League draft',exact:true}).click();
 for(let i=0;i<11;i++){await page.getByRole('button',{name:'Reveal a club & era',exact:true}).click();await page.locator('.legend-card').first().click();}
 assert.equal(await page.locator('.draft-pitch-slot.filled').count(),11);assert.equal(await page.locator('[data-action=eu-manager]').count(),3);await page.locator('.manager-portrait img').first().evaluate(img=>img.decode());await page.screenshot({path:'work/draft36/coach-desktop.png',fullPage:true});
 await page.setViewportSize({width:390,height:844});await noOverflow(page);await page.screenshot({path:'work/draft36/coach-mobile.png',fullPage:true});await page.locator('[data-action=eu-manager]').first().click();const s=JSON.parse(await saved(page));assert.equal(s.name,'North Quay XI');assert.equal(s.field,'current');assert.equal(s.competition.teams.find(t=>t.id==='user').formation,'5-3-2');assert.equal(s.competition.teams.length,36);await noOverflow(page);
});

test('daily and weekly entry points keep their seeded challenge rules and a revealed draw survives reload',{timeout:60000},async t=>{
 const page=await open(t,true);for(const [label,flag]of [['Play daily draft','daily'],['This week’s draft','weekly']]){await page.getByRole('button',{name:label,exact:true}).click();await page.getByRole('button',{name:'Reveal a club & era',exact:true}).click();const s=JSON.parse(await saved(page));assert.equal(s[flag],true);assert.equal(s.hidden,false);assert.equal(s.rerolls,2);assert.ok(s.roll);await page.reload();assert.deepEqual(JSON.parse(await saved(page)),s);await page.getByRole('button',{name:'Leave draft',exact:true}).click();await noOverflow(page);}
});

test('campaign direct entry resumes recorded inputs and returns an exact read-only match recap and replay',{timeout:90000},async t=>{
 const page=await open(t);await mkdir('work/match37',{recursive:true});await historic(page);await page.getByRole('button',{name:'Play yourself',exact:true}).click();await page.getByRole('button',{name:'Return to management',exact:true}).waitFor();
 await page.keyboard.down('KeyD');await page.waitForTimeout(250);await page.keyboard.up('KeyD');await page.locator('[data-live=close]').first().click();const pending=JSON.parse(await saved(page));assert.equal(pending.competition.round,0);assert.ok(pending.pending.state.actions.some(c=>c.type==='control'&&c.enabled));assert.deepEqual(pending.pending.state.directControl.move,[0,0]);
 await page.getByRole('button',{name:'Simulate matchday',exact:true}).click();assert.deepEqual(JSON.parse(await saved(page)).pending,pending.pending);
 await page.reload();await page.getByRole('button',{name:'Resume playing',exact:true}).click();await page.getByRole('button',{name:'Return to management',exact:true}).waitFor();await page.getByRole('button',{name:'Simulate to full-time',exact:true}).click();await page.locator('#fixture-result [data-live=close]').click();await page.locator('.campaign-recap').waitFor();
 const exact=await saved(page),c=JSON.parse(exact).competition,m=c.results.find(r=>r.home===c.user||r.away===c.user),side=m.home===c.user?0:1;assert.equal(c.round,1);assert.ok(m.commands.some(c=>c.type==='control'));assert.deepEqual(await page.locator('.recap-metrics b').allTextContents(),[m.shots,m.stats.completed,m.stats.recoveries].map(v=>v[side]+' — '+v[1-side]));
 await page.screenshot({path:'work/match37/overview-desktop.png'});await page.getByText(/^Recorded player contributions ·/).click();const players=m.playerStats[side].filter(p=>p.minutes>0);assert.equal(await page.locator('.campaign-recap tbody tr').count(),players.length);for(let i=0;i<players.length;i++)assert.deepEqual(await page.locator('.campaign-recap tbody tr').nth(i).locator('td').allTextContents(),['minutes','goals','shots','saves','recoveries'].map(k=>String(players[i][k])));
 assert.equal(await saved(page),exact);await page.screenshot({path:'work/match37/recap-desktop.png',fullPage:true});await page.setViewportSize({width:390,height:844});await noOverflow(page);await page.screenshot({path:'work/match37/recap-mobile.png',fullPage:true});
 await page.getByRole('button',{name:'Replay this match',exact:true}).click();await page.locator('.live-fixture').waitFor();await page.locator('[data-live=close]').first().click();assert.equal(await saved(page),exact);await page.reload();assert.equal(await saved(page),exact);await page.locator('.campaign-recap').waitFor();
});

test('campaign legacy pending fixtures keep their saved controls and never offer direct-play migration',{timeout:60000},async t=>{
 const page=await open(t,true);await historic(page);await page.getByRole('button',{name:'Manage live',exact:true}).click();await page.locator('[data-live=close]').first().click();
 await page.evaluate(async()=>{const key='touchline.europe.qa.v1',e=JSON.parse(localStorage.getItem(key)),{fixtureState}=await import('/fixture-engine.js');delete e.pending.definition.controlVersion;e.pending.state=fixtureState(e.pending.definition);localStorage.setItem(key,JSON.stringify(e));});await page.reload();
 assert.equal(await page.locator('#eu-direct').count(),0);await page.getByRole('button',{name:'Resume live fixture',exact:true}).click();await page.getByText('This saved fixture retains its original controls. New fixtures offer Play yourself.',{exact:true}).waitFor();assert.equal(await page.locator('[data-direct=toggle]').count(),0);await page.locator('[data-live=close]').first().click();const e=JSON.parse(await saved(page));assert.equal(e.pending.definition.controlVersion,undefined);assert.equal(e.pending.state.controlVersion,undefined);assert.equal(e.pending.state.actions.length,0);assert.equal(e.competition.round,0);await noOverflow(page);
});
