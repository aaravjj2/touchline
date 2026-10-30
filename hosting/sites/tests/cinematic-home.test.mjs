import {dismissOpeningIntro} from './helpers/opening.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdir,writeFile} from 'node:fs/promises';
import {chromium} from '@playwright/test';
import {createSuperCareerPreview} from '../touchline/super-career.js';
import {SUPER_PACKS} from '../touchline/super-catalog.js';

const root='work/cinematic-2026-10-25',base='http://127.0.0.1:4291';let browser,server;
test.before(async()=>{
 await mkdir(root,{recursive:true});server=spawn(process.execPath,['tests/legacy-server.mjs'],{env:{...process.env,PORT:'4291',COACH_ENABLED:'false'},windowsHide:true,stdio:'pipe'});
 await new Promise((resolve,reject)=>{server.stdout.once('data',resolve);server.once('error',reject);server.once('exit',code=>reject(Error('Server exited '+code)));});browser=await chromium.launch({headless:true});
});
test.after(async()=>{await browser?.close();server?.kill();});
async function open(t,width=1440,height=900,options={}){
 const context=await browser.newContext({viewport:{width,height},...options}),page=await context.newPage(),errors=[],failed=[];page.setDefaultTimeout(20000);page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)failed.push(r.status()+' '+r.url());});
 t.after(async()=>{await context.close();assert.deepEqual(errors,[]);assert.deepEqual(failed,[]);});return {page,context};
}
const storage=page=>page.evaluate(()=>Object.fromEntries(Object.keys(localStorage).filter(k=>k.startsWith('touchline.')).sort().map(k=>[k,localStorage.getItem(k)])));
async function ready(page){await page.goto(base+'/?qa=1');await dismissOpeningIntro(page);await page.locator('.cinema-home').waitFor();await page.evaluate(()=>document.fonts.ready);}

test('cinematic previews fit desktop, tablet and phones without writing gameplay saves',{timeout:60000},async t=>{
 for(const [width,height]of [[1440,900],[768,1024],[390,844],[320,740]]){
  const {page}=await open(t,width,height);await ready(page);const before=await storage(page);
  for(const button of await page.locator('[data-launcher-mode]').all()){
   await button.focus();assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
   assert.equal(await page.locator('#launcher-title').evaluate(e=>e.scrollWidth>e.clientWidth+2),false,'Headline must fit '+width);
   assert.deepEqual(await storage(page),before,'Preview must not mutate any game save');
  }
  await page.locator('[data-launcher-mode=managerial]').focus();await page.evaluate(()=>window.scrollTo(0,0));await page.waitForTimeout(850);await page.screenshot({path:`${root}/final-home-${width}.png`});
  assert.equal(await page.getByRole('button',{name:'Settings & saves',exact:true}).count(),1);assert.equal(await page.evaluate(()=>localStorage.getItem('touchline.v1')),null);
 }
});

test('keyboard launcher navigation opens a working draft, reveals players and resumes it exactly',{timeout:60000},async t=>{
 const {page}=await open(t);await ready(page);await page.locator('[data-launcher-mode=managerial]').focus();await page.keyboard.press('ArrowDown');assert.equal(await page.locator('[data-launcher-mode=europe]').evaluate(e=>e===document.activeElement),true);
 await page.keyboard.press('Enter');await page.getByRole('button',{name:'Start Champions League draft',exact:true}).click();await page.getByRole('button',{name:'Reveal a club & era',exact:true}).click();await page.locator('.legend-card').first().waitFor();
 const before=await page.evaluate(async()=>{await(await import('/mode-storage.js')).flushModeStorage();return(await import('/large-save.js')).readMode('touchline.europe.qa.v1');});
 await page.reload();await page.locator('.legend-card').first().waitFor();assert.deepEqual(await page.evaluate(async()=>(await import('/large-save.js')).readMode('touchline.europe.qa.v1')),before);
 await page.screenshot({path:root+'/draft-from-launcher.png',fullPage:true});
});

test('saved club identity resumes the real office while menu previews and settings preserve its career',{timeout:60000},async t=>{
 const career=createSuperCareerPreview({clubId:SUPER_PACKS.find(p=>p.club==='Barcelona').id,seed:20261025}),{page,context}=await open(t,390,844);
 await context.addInitScript(c=>{if(!localStorage.getItem('touchline.europe.qa.v1')){localStorage.setItem('touchline.qa.v2',JSON.stringify({page:'managerial'}));localStorage.setItem('touchline.europe.qa.v1',JSON.stringify({version:1,phase:'home',history:[],career:c}));}},career);await ready(page);
 assert.match(await page.locator('.cinema-description').innerText(),/Barcelona/);await page.getByRole('button',{name:'Continue club career',exact:true}).waitFor();
 const read=()=>page.evaluate(async()=>(await import('/large-save.js')).readMode('touchline.europe.qa.v1'));const before=(await read()).career;
 await page.locator('[data-launcher-mode=player-career]').focus();await page.locator('[data-launcher-mode=managerial]').focus();await page.getByRole('button',{name:'Settings & saves',exact:true}).click();await page.getByRole('button',{name:'Export all saves',exact:true}).waitFor();await page.getByRole('button',{name:'Close dialog',exact:true}).click();assert.deepEqual((await read()).career,before);
 await page.getByRole('button',{name:'Continue club career',exact:true}).click();await page.getByRole('button',{name:'Prepare next match',exact:true}).waitFor();assert.equal((await read()).career.name,'Barcelona');assert.deepEqual((await read()).career,before);await page.reload();await page.getByRole('button',{name:'Prepare next match',exact:true}).waitFor();assert.equal(await page.locator('.cinema-home').count(),0,'Returning players retain their saved destination');
});

test('ambience requires an explicit click and closes when leaving; reduced motion and fullscreen failure remain usable',{timeout:60000},async t=>{
 const {page,context}=await open(t,390,844,{reducedMotion:'reduce'});
 await context.addInitScript(()=>{const Native=window.AudioContext;window.__launcherContexts=[];window.AudioContext=class extends Native{constructor(...args){super(...args);window.__launcherContexts.push(this);}};});
 await ready(page);assert.equal(await page.evaluate(()=>window.__launcherContexts.length),0);const before=await storage(page);await page.getByRole('button',{name:'Replay intro',exact:true}).click();await dismissOpeningIntro(page);assert.equal(await page.locator('.cinema-art').evaluate(e=>getComputedStyle(e).animationName),'none');
 await page.getByRole('button',{name:'Turn on ambience',exact:true}).click();await page.getByRole('button',{name:'Mute ambience',exact:true}).waitFor();assert.equal(await page.evaluate(()=>window.__launcherContexts[0].state),'running');
 await page.evaluate(()=>{document.documentElement.requestFullscreen=()=>Promise.reject(Error('Injected unavailable fullscreen'));});await page.getByRole('button',{name:'Toggle fullscreen',exact:true}).click();await page.getByRole('status').filter({hasText:'Fullscreen is unavailable here'}).waitFor();assert.deepEqual(await storage(page),before);
 await page.locator('[data-launcher-mode=player-career]').click();await page.getByRole('button',{name:'Begin my career',exact:true}).waitFor();await page.waitForFunction(()=>window.__launcherContexts[0].state==='closed');
});

test('match, practice and recorded-match destinations open real existing tools',{timeout:60000},async t=>{
 for(const [mode,expected]of [['match','match'],['training','managerial'],['explorer','explorer']]){
  const {page}=await open(t);await ready(page);await page.locator(`[data-launcher-mode=${mode}]`).click();assert.equal(await page.locator('body').getAttribute('data-page'),expected);
  if(mode==='match')await page.getByRole('button',{name:'Play exhibition',exact:true}).waitFor();
  if(mode==='training'){await page.getByRole('dialog',{name:'Training ground',exact:true}).waitFor();await page.getByRole('button',{name:'Practice receive & pass',exact:true}).waitFor();await page.getByRole('button',{name:'Close training',exact:true}).click();}
  if(mode==='explorer')await page.getByRole('heading',{name:'Your first story is waiting.',exact:true}).waitFor();
 }
 await writeFile(root+'/launcher-story.json',JSON.stringify({passed:true,scope:'Real local modes, draft reveal/reload, saved club/office, keyboard, opt-in Web Audio cleanup, reduced motion, fullscreen error, four responsive widths. No server/account/EA integration or physical-device certification.'},null,2)+'\n');
});

test('normal-motion intro replay finishes once and stays visible without touching saved games',{timeout:30000},async t=>{
 const {page}=await open(t);await ready(page);await page.waitForTimeout(1100);const before=await storage(page),samples=[];
 for(let attempt=0;attempt<2;attempt++){
  await page.getByRole('button',{name:'Replay intro',exact:true}).click();await dismissOpeningIntro(page);await page.waitForTimeout(1400);
  for(let i=0;i<4;i++){const opacity=Number(await page.locator('.cinema-feature').evaluate(e=>getComputedStyle(e).opacity));assert.equal(opacity,1,'Completed intro must never restart the initial fade');samples.push({attempt,sample:i,opacity});await page.waitForTimeout(200);}
 }
 assert.deepEqual(await storage(page),before);await writeFile(root+'/motion-after.json',JSON.stringify({passed:true,samples},null,2)+'\n');
});
