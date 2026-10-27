import {canPlayPosition} from '../dist/player-positions.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdir} from 'node:fs/promises';
import {chromium} from '@playwright/test';
import {createSuperCareerPreview} from '../dist/super-career.js';
import {SUPER_PACKS} from '../dist/super-catalog.js';
import {saleSquadImpact} from '../dist/squad-planner.js';
import {worldPlayer,legalClub,sandboxProfile} from '../dist/sandbox-world.js';
import {dismissOpeningIntro} from './helpers/opening.mjs';
const base='http://127.0.0.1:4295',root='work/squad-planning-2026-10-25';let server,browser;
test.before(async()=>{await mkdir(root,{recursive:true});server=spawn(process.execPath,['server.mjs'],{env:{...process.env,PORT:'4295',COACH_ENABLED:'false'},windowsHide:true,stdio:'pipe'});await new Promise((resolve,reject)=>{server.stdout.once('data',resolve);server.once('error',reject);});browser=await chromium.launch();});
test.after(async()=>{await browser?.close();server?.kill();});
const make=options=>createSuperCareerPreview({clubId:SUPER_PACKS.find(p=>p.club==='Arsenal').id,seed:3501,...options});
async function open(t,c,width=390){const context=await browser.newContext({viewport:{width,height:900}}),page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));await context.addInitScript(c=>{if(!localStorage.getItem('touchline.europe.qa.v1')){localStorage.setItem('touchline.qa.v2',JSON.stringify({page:'dynasty'}));localStorage.setItem('touchline.europe.qa.v1',JSON.stringify({version:1,phase:'home',history:[],career:c}));}},c);t.after(async()=>{await context.close();assert.deepEqual(errors,[]);});await page.goto(base+'/?qa=1');await dismissOpeningIntro(page);return page;}
const read=page=>page.evaluate(async()=>{await(await import('/mode-storage.js')).flushModeStorage();return(await import('/large-save.js')).readMode('touchline.europe.qa.v1');});
test('opponent preparation opens real approach, rotation and bench decisions without changing the career',async t=>{
 for(const width of [1440,390]){
  const page=await open(t,make(),width),before=(await read(page)).career;
  await page.getByRole('button',{name:'Prepare next match',exact:true}).click();
  const panel=page.getByRole('region',{name:'Opponent preparation',exact:true});await panel.waitFor();
  await panel.screenshot({path:root+'/opponent-brief-'+width+'.png'});
  assert.match(await panel.innerText(),/not a prediction/);
  for(const name of ['Play yourself','Manage live','Simulate next matchday'])assert.equal(await page.getByRole('button',{name,exact:true}).isVisible(),true);
  await panel.getByRole('button',{name:'Review match approach',exact:true}).focus();await page.keyboard.press('Enter');
  await page.getByRole('heading',{name:'Give the team a plan',exact:true}).waitFor();
  assert.equal(await page.evaluate(()=>document.activeElement.textContent),'Give the team a plan');
  await panel.getByRole('button',{name:'Compare fresh options',exact:true}).click();
  await page.getByRole('heading',{name:'Review the changes',exact:true}).waitFor();
  assert.deepEqual((await read(page)).career,before);
  await page.getByRole('button',{name:'Keep current team',exact:true}).click();
  await panel.getByRole('button',{name:'Review matchday bench',exact:true}).click();
  await page.getByRole('heading',{name:'Your cover for matchday',exact:true}).waitFor();
  assert.equal(await page.evaluate(()=>document.activeElement.textContent),'Your cover for matchday');
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  assert.deepEqual((await read(page)).career,before);
  await page.screenshot({path:root+'/opponent-preparation-'+width+'.png',fullPage:true});
 }
});

test('position planner fits desktop and phone, explains absences and opens the intended recruitment search without editing the career',async t=>{
 for(const width of [1440,390]){const c=make(),keepers=c.xi.concat(c.bench).filter(id=>worldPlayer(c,id)&&(id===c.xi[0]||canPlayPosition(sandboxProfile(id),'RB')));for(const id of keepers)c.world.availability.injuries[id]={until:'2026-09-01'};const page=await open(t,c,width),before=(await read(page)).career;await page.getByRole('button',{name:'Squad',exact:true}).click();await page.getByRole('button',{name:'Squad planner',exact:true}).focus();await page.keyboard.press('Enter');await page.getByRole('region',{name:'Squad planner',exact:true}).waitFor();await page.locator('[data-plan-position=GK] summary').click();assert.match(await page.locator('[data-plan-position=GK]').innerText(),/estimated return/);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);await page.screenshot({path:`${root}/planner-${width}.png`,fullPage:true});assert.deepEqual((await read(page)).career,before);
 const button=page.locator('.mgr-squad-plan [data-action="eu-view-recruit-position"]').first();assert.ok(await button.count()>0);{const intended=await button.getAttribute('data-value');await button.click();assert.equal(await page.getByRole('combobox',{name:'Natural position',exact:true}).inputValue(),intended);assert.deepEqual((await read(page)).career,before);}}
});
test('incoming sale preview reconciles with a confirmed transaction and persists exactly on reload',async t=>{
 const c=make(),id=c.bench.find(id=>legalClub(c,'user',worldPlayer(c,id).id)),impact=saleSquadImpact(c,id),buyer=c.world.members.find(id=>id!=='user');c.connected.offers.push({id:'qa-sale',player:id,buyer,fee:1000000,wage:worldPlayer(c,id).wageGbp,date:c.world.date,expires:'2026-08-20',status:'open'});const page=await open(t,c);await page.getByRole('button',{name:'Transfers',exact:true}).click();await page.getByRole('button',{name:'Incoming offers',exact:true}).click();assert.match(await page.getByRole('region',{name:'Sale squad impact'}).innerText(),new RegExp(impact.after.size+' registered'));const before=(await read(page)).career;await page.screenshot({path:root+'/sale-phone.png',fullPage:true});assert.deepEqual((await read(page)).career,before);await page.getByRole('button',{name:'Accept offer',exact:true}).click();const after=(await read(page)).career;assert.equal(after.xi.length+after.bench.length,impact.after.size);assert.equal(after.connected.offers[0].status,'accepted');await page.reload();assert.deepEqual((await read(page)).career,after);
});
test('founder pre-season offers a no-release route and preparation exposes all three match choices',async t=>{
 const c=make({custom:true,name:'Harbour Athletic'}),page=await open(t,c),before=(await read(page)).career;await page.getByRole('button',{name:'Plan pre-season',exact:true}).click();await page.getByRole('heading',{name:'Build your club at your pace',exact:true}).waitFor();await page.screenshot({path:root+'/founder-phone.png',fullPage:true});await page.getByRole('button',{name:'Find players without releasing anyone',exact:true}).click();await page.getByRole('button',{name:'Founding squad',exact:true}).click();await page.getByRole('button',{name:'Use this squad & prepare',exact:true}).click();for(const name of ['Play yourself','Manage live','Simulate next matchday'])assert.equal(await page.getByRole('button',{name,exact:true}).isVisible(),true);await page.getByRole('button',{name:'Practise controls',exact:true}).click();await page.getByRole('dialog',{name:'Training ground',exact:true}).waitFor();await page.getByRole('button',{name:'Close training',exact:true}).click();assert.deepEqual((await read(page)).career,before);await page.getByRole('button',{name:'Simulate next matchday',exact:true}).click();await page.getByRole('button',{name:'Continue to office',exact:true}).waitFor();assert.match(await page.locator('.mgr-aftermath').innerText(),/Net club cash/);assert.match(await page.locator('.mgr-aftermath').innerText(),/Super League/);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
});
test('existing market 2 stays monthly while new market 3 stays weekly through browsing and reload',async t=>{
 for(const version of [2,3]){const page=await open(t,make({marketVersion:version}));await page.getByRole('button',{name:'Transfers',exact:true}).click();await page.getByText('Recruitment director · manual control',{exact:true}).click();assert.match(await page.locator('.mgr-content').innerText(),version===2?/first settled date of each window month/:/seven-day window block/);await page.reload();assert.equal((await read(page)).career.management.market.version,version);}
});
test('a suggested founder target starts the real negotiation without signing or releasing anyone',async t=>{
 const c=make({custom:true,name:'Harbour Athletic'}),page=await open(t,c);await page.getByRole('button',{name:'Plan pre-season',exact:true}).click();const suggestion=page.getByRole('region',{name:'Pre-season shortlist',exact:true}).locator('[data-action="eu-mg-enquire"]').first(),id=await suggestion.getAttribute('data-value');await suggestion.click();await page.getByRole('heading',{name:sandboxProfile(id).name,exact:true}).waitFor();const after=(await read(page)).career;assert.equal(after.management.deals.at(-1).player,id);assert.equal(after.management.deals.at(-1).kind,'buy');assert.equal(after.management.deals.at(-1).stage,'club');assert.deepEqual(after.xi,c.xi);assert.deepEqual(after.bench,c.bench);assert.deepEqual(after.world.players,c.world.players);assert.equal(await page.getByRole('button',{name:'Submit terms',exact:true}).isVisible(),true);
});
