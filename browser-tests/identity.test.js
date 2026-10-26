import {dismissOpeningIntro} from './helpers/opening.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {chromium} from '@playwright/test';
import {createSandboxCareer} from '../dist/sandbox-career.js';
import {nextManagerFixture} from '../dist/manager-experience.js';
import {canPlayPosition} from '../dist/player-positions.js';
import {exportArchive,validateArchive} from '../dist/save-vault.js';
let server,browser;
const base='http://127.0.0.1:4187';
test.before(async()=>{server=spawn(process.execPath,['server.mjs'],{env:{...process.env,PORT:'4187',COACH_ENABLED:'false'},stdio:'pipe'});await new Promise((resolve,reject)=>{server.stdout.once('data',resolve);server.once('error',reject);});browser=await chromium.launch({headless:true});});
test.after(async()=>{await browser?.close();server?.kill();});
async function open(t,career=null){const context=await browser.newContext({viewport:{width:390,height:844}}),page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400&&r.url().includes('/assets/'))errors.push(r.url());});if(career)await context.addInitScript(c=>{if(!localStorage.getItem('touchline.europe.qa.v1'))localStorage.setItem('touchline.europe.qa.v1',JSON.stringify({version:1,history:[],career:c}));},career);t.after(async()=>{assert.deepEqual(errors,[]);await context.close();});await page.goto(base+'/?qa=1');await dismissOpeningIntro(page);return page;}
test('Match Centre uses the active career club, opponent and pending fixture after reload',{timeout:60000},async t=>{
 const c=createSandboxCareer({clubId:'english-eng-1',custom:true,name:'Harbour Athletic',seed:123}),f=nextManagerFixture(c),page=await open(t,c);
 await page.getByRole('button',{name:'Take the touchline',exact:true}).click();await page.getByRole('heading',{name:c.name,exact:true}).waitFor();assert.ok((await page.locator('main').innerText()).includes(f.opponent.name));assert.equal(await page.getByText('Northstar FC',{exact:true}).count(),0);
 await page.getByRole('button',{name:'Manage career fixture',exact:true}).click();await page.locator('.live-top h2').waitFor();const text=await page.locator('.live-top h2').innerText();assert.ok(text.includes(c.name));assert.ok(text.includes(f.opponent.name));await page.locator('[data-live=close]').first().click();await page.reload();await page.getByRole('button',{name:'Resume career fixture',exact:true}).waitFor();
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
});
test('real exhibition preserves its selected clubs, pending state and result without advancing a career',{timeout:60000},async t=>{
 const c=createSandboxCareer({clubId:'english-eng-1',seed:124}),page=await open(t,c);await page.getByRole('button',{name:'Take the touchline',exact:true}).click();await page.locator('[data-centre=away]').selectOption('english-eng-16');await page.getByRole('button',{name:'Play exhibition',exact:true}).click();await page.locator('[data-live=close]').first().click();
 const before=await page.evaluate(()=>JSON.parse(localStorage.getItem('touchline.qa.v2')).exhibition.pending);assert.equal(before.definition.away.name,'Manchester United');assert.ok(before.resume.state.world);
 await page.reload();await page.getByRole('button',{name:'Resume exhibition',exact:true}).click();await page.getByRole('button',{name:'Simulate to full-time',exact:true}).click();await page.locator('#fixture-result [data-live=close]').waitFor();await page.locator('#fixture-result [data-live=close]').click();
 const result=await page.evaluate(()=>({app:JSON.parse(localStorage.getItem('touchline.qa.v2')),eu:JSON.parse(localStorage.getItem('touchline.europe.qa.v1'))}));assert.equal(result.app.exhibition.pending,null);assert.equal(result.app.exhibition.last.away,'Manchester United');assert.deepEqual(result.eu.career.history,[]);assert.equal(result.eu.career.competition.round,0);
 const records=new Map([['touchline.qa.v2',JSON.stringify(result.app)]]),archive=await exportArchive({getItem:k=>records.get(k)??null},true);assert.equal(validateArchive(archive).saves[0].exhibition.last.away,'Manchester United');
});
test('new draft positions survive reload, artwork loads, and every European lineup has eligible starters',{timeout:90000},async t=>{
 const page=await open(t);await page.getByRole('button',{name:'Draft & Europe',exact:true}).click();await page.getByRole('button',{name:'Start Champions League draft',exact:true}).click();
 for(let i=0;i<11;i++){await page.getByRole('button',{name:'Reveal a club & era',exact:true}).click();const cards=page.locator('.legend-card');await cards.first().waitFor();if(i===0){await page.reload();await cards.first().waitFor();assert.ok(await page.locator('.legend-card img.player-artwork').count());await page.locator('.legend-card img.player-artwork').first().evaluate(img=>img.decode());}await cards.first().click();}
 await page.locator('[data-action=eu-manager]').first().click();const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('touchline.europe.qa.v1')));assert.equal(saved.positionRulesVersion,2);assert.equal(saved.competition.teams.length,36);
 for(const team of saved.competition.teams){assert.equal(team.xi.length,11);for(const id of team.xi){const p=team.roster.find(p=>p.id===id);assert.ok(p.assignedPosition,team.name+' '+p.name);assert.ok(canPlayPosition(p,p.assignedPosition),team.name+' '+p.name);}}
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
});


test('Managerial hub keeps career identity across current tools and isolates practice without changing the save',{timeout:60000},async t=>{
 const c=createSandboxCareer({clubId:'english-eng-1',custom:true,name:'Harbour Athletic',seed:341}),page=await open(t,c);
 const saved=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('touchline.europe.qa.v1')).career),before=await saved();
 for(const [destination,expected]of [['squad','YOUR STARTING XI'],['transfers','RECRUITMENT'],['season','Your calendar'],['club','CLUB OVERVIEW']]){
  await page.getByRole('button',{name:'Managerial mode',exact:true}).click();await page.locator('.cinema-description').filter({hasText:/^Harbour Athletic\./}).waitFor();
  await page.locator('main [data-action=manager-destination][data-value='+destination+']').click();
  assert.equal(await page.locator('.sidebar .club-name').innerText(),'Harbour Athletic');
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 }
 assert.deepEqual(await saved(),before);
 await page.getByRole('button',{name:'Managerial mode',exact:true}).click();await page.getByText('Original practice & saved matches',{exact:true}).click();await page.getByRole('button',{name:'Practice league',exact:true}).click();
 await page.getByText('ORIGINAL PRACTICE AREA',{exact:true}).waitFor();assert.equal(await page.locator('.sidebar .club-name').innerText(),'Harbour Athletic');assert.deepEqual(await saved(),before);
 await page.getByRole('button',{name:'Return to club career',exact:true}).click();await page.getByRole('button',{name:'Transfers',exact:true}).click();
 await page.getByRole('button',{name:'Find players',exact:true}).click();await page.getByRole('button',{name:'Browse all players',exact:true}).click();const first=await page.locator('.mgr-candidate h3').first().innerText();await page.getByRole('button',{name:'Next players',exact:true}).click();assert.notEqual(await page.locator('.mgr-candidate h3').first().innerText(),first);
 await page.getByRole('combobox',{name:'Natural position',exact:true}).selectOption('ST');const names=await page.locator('.mgr-candidate h3').allTextContents();assert.ok(names.length);const pool=await page.evaluate(async()=>{const {sandboxMarket}=await import('/sandbox-world.js');return sandboxMarket(JSON.parse(localStorage.getItem('touchline.europe.qa.v1')).career);});for(const name of names)assert.ok(canPlayPosition(pool.find(p=>p.name===name),'ST'),name);
 assert.deepEqual(await saved(),before);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 await page.setViewportSize({width:1440,height:1000});await page.getByRole('button',{name:'Managerial mode',exact:true}).click();assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);await page.screenshot({path:'work/manager34/hub-desktop.png',fullPage:true});await page.setViewportSize({width:390,height:844});await page.screenshot({path:'work/manager34/hub-mobile.png',fullPage:true});
});
