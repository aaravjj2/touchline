import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdir} from 'node:fs/promises';
import {chromium} from '@playwright/test';
import {createSuperCareerPreview} from '../dist/super-career.js';
import {SUPER_PACKS} from '../dist/super-catalog.js';
import {dismissOpeningIntro} from './helpers/opening.mjs';
const base='http://127.0.0.1:4312',out='work/human-portraits';let server,browser;
test.before(async()=>{await mkdir(out,{recursive:true});server=spawn(process.execPath,['server.mjs'],{env:{...process.env,PORT:'4312'},windowsHide:true,stdio:'pipe'});await new Promise(r=>server.stdout.once('data',r));browser=await chromium.launch();});
test.after(async()=>{await browser?.close();server?.kill();});
test('manager shows original 3D cards and draft shows licensed photos at desktop and 390px without changing player records',{timeout:60000},async()=>{
 for(const width of [1440,390]){const context=await browser.newContext({viewport:{width,height:900},reducedMotion:'reduce'}),page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  const career=createSuperCareerPreview({clubId:SUPER_PACKS[0].id,seed:3518,custom:true,name:'Portrait Athletic'});
  await context.addInitScript(c=>{localStorage.setItem('touchline.qa.v2',JSON.stringify({page:'managerial'}));localStorage.setItem('touchline.europe.qa.v1',JSON.stringify({version:1,phase:'home',history:[],career:c}));},career);
  await page.goto(base+'/?qa=1');await dismissOpeningIntro(page);await page.getByRole('button',{name:'Continue club career',exact:true}).click();await page.getByRole('button',{name:'Squad',exact:true}).click();
  const before=await page.evaluate(()=>localStorage.getItem('touchline.europe.qa.v1'));
  const faces=page.locator('.mgr-face img.player-portrait-3d');assert.ok(await faces.count()>=11);
  await faces.first().scrollIntoViewIfNeeded();await faces.first().evaluate(img=>img.decode());assert.ok(await faces.first().evaluate(img=>img.naturalWidth===192&&img.naturalHeight===240));
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);await page.screenshot({path:out+'/manager-'+width+'.png',fullPage:true});assert.equal(await page.evaluate(()=>localStorage.getItem('touchline.europe.qa.v1')),before);
  await page.getByRole('button',{name:'Draft & Europe',exact:true}).click();await page.getByRole('button',{name:'Start Champions League draft',exact:true}).click();await page.getByRole('button',{name:'Reveal a club & era',exact:true}).click();const card=page.locator('.draft-player-row img.player-photo').first();await card.scrollIntoViewIfNeeded();await card.evaluate(img=>img.decode());assert.ok(await card.evaluate(img=>img.naturalWidth>0));assert.equal(await page.locator('.draft-player-row img.player-portrait-3d').count(),0);const pick=card.locator('xpath=ancestor::button');if(await pick.isEnabled()){const photoSrc=await card.getAttribute('src');await pick.click();assert.ok(await page.locator('.draft-pitch-art img.player-photo').count()>0);assert.ok(await page.locator('.draft-pitch-art img.player-photo').evaluateAll((imgs,src)=>imgs.some(img=>img.getAttribute('src')===src),photoSrc));}assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);await page.screenshot({path:out+'/draft-'+width+'.png',fullPage:true});assert.deepEqual(errors,[]);await context.close();
 }
});
test('missing individual portrait falls back to a bundled image and cards create no WebGL contexts',async()=>{
 const page=await browser.newPage();await page.route('**/portrait-check.html',r=>r.fulfill({contentType:'text/html',body:'<main></main>'}));await page.goto(base+'/portrait-check.html');
 await page.evaluate(async()=>{window.contextCount=0;const get=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(t,...args){if(t.startsWith('webgl'))window.contextCount++;return get.call(this,t,...args);};const {portraitArtwork}=await import('./ui-kit.js');document.querySelector('main').innerHTML=portraitArtwork({id:'test-created-portrait',name:'Original player'});});
 const img=page.locator('img');await img.evaluate(e=>e.decode());const first=await img.getAttribute('src');await img.evaluate(e=>e.src='./assets/player-portraits/missing-file.webp');await img.locator('xpath=.').waitFor();await page.waitForFunction(()=>document.querySelector('img').dataset.portraitRecovered==='true');await img.evaluate(e=>e.decode());assert.equal(await img.getAttribute('src'),first);assert.equal(await page.evaluate(()=>window.contextCount),0);await page.close();
});

test('failed real photo becomes a labelled placeholder without a generated replacement',async()=>{
 const page=await browser.newPage();await page.route('**/photo-check.html',r=>r.fulfill({contentType:'text/html',body:'<main></main>'}));await page.route('**/assets/portraits/*.jpg',r=>r.fulfill({status:404,body:'missing'}));await page.goto(base+'/photo-check.html');
 await page.evaluate(async()=>{const {draftPhoto}=await import('./draft-photos.js');document.querySelector('main').innerHTML=draftPhoto({name:'Lionel Messi'});});const fallback=page.locator('.draft-photo-unavailable');await fallback.waitFor();assert.equal(await fallback.getAttribute('aria-label'),'Photo unavailable for Lionel Messi');assert.equal(await page.locator('img').count(),0);await page.close();
});
