import {dismissOpeningIntro} from './helpers/opening.mjs';
import {createSandboxCareer} from '../dist/sandbox-career.js';
import {fixtureDefinition,fixtureState} from '../dist/fixture-engine.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdir,writeFile} from 'node:fs/promises';
import {chromium} from '@playwright/test';
const base='http://127.0.0.1:4213';let server,browser;
test.before(async()=>{server=spawn(process.execPath,['server.mjs'],{env:{...process.env,PORT:'4213',COACH_ENABLED:'false'},stdio:'pipe'});await new Promise((resolve,reject)=>{server.stdout.once('data',resolve);server.once('error',reject);server.once('exit',code=>reject(Error('Test server exited '+code)));});browser=await chromium.launch({headless:true});await mkdir('work/play38',{recursive:true});});
test.after(async()=>{await browser?.close();server?.kill();});
async function open(t,mobile=false,short=false,seeded=false){const context=await browser.newContext({viewport:mobile?{width:390,height:short?568:844}:{width:1440,height:1000},hasTouch:mobile,isMobile:mobile}),page=await context.newPage(),errors=[];page.setDefaultTimeout(12000);page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400&&r.url().startsWith(base))errors.push(r.url());});t.after(async()=>{try{if(await page.locator('.live-fixture').count()){await page.screenshot({path:'work/play38/last-'+(mobile?'phone':'desktop')+'.png'});await writeFile('work/play38/last-'+(mobile?'phone':'desktop')+'.txt',await page.locator('.live-fixture').innerText());}assert.deepEqual(errors,[]);}finally{await context.close();}});if(seeded){const career=createSandboxCareer({clubId:'english-eng-1',seed:3801}),definition=fixtureDefinition(career.competition.teams[0],career.competition.teams[1],3801);await context.addInitScript(({career,definition,state})=>{localStorage.setItem('touchline.europe.qa.v1',JSON.stringify({version:1,phase:'home',history:[],career}));localStorage.setItem('touchline.qa.v2',JSON.stringify({page:'managerial',exhibition:{pending:{definition,resume:{state}}}}));localStorage.setItem('touchline.players.qa.v1',JSON.stringify({version:1,profiles:[]}));},{career,definition,state:fixtureState(definition)});}await page.goto(base+'/?qa=1');await dismissOpeningIntro(page);await page.getByRole('button',{name:'Training ground',exact:true}).waitFor();return page;}
const records=page=>page.evaluate(()=>Object.fromEntries(['touchline.qa.v2','touchline.europe.qa.v1','touchline.players.qa.v1'].map(k=>[k,localStorage.getItem(k)])));
test('guided practice retries, advances through three skills and remembers progress after reload',{timeout:90000},async t=>{
 const page=await open(t,true,true,true),before=await records(page);
 await page.getByRole('button',{name:'Training ground',exact:true}).click();
 await page.locator('[data-exercise=passing]').click();
 await page.getByRole('button',{name:'Return to management',exact:true}).waitFor();
 await page.getByRole('button',{name:'Pass',exact:true}).tap();
 await page.getByRole('button',{name:'Retry same exercise',exact:true}).waitFor();
 await page.getByRole('button',{name:'Retry same exercise',exact:true}).tap();
 await page.locator('[data-exercise=passing][data-exercise-ready=true]').waitFor();
 await page.getByRole('button',{name:'Pass',exact:true}).tap();
 await page.getByRole('button',{name:'Next: Create a shot',exact:true}).tap();
 await page.locator('[data-exercise=shooting][data-exercise-ready=true]').waitFor();
 await page.getByRole('button',{name:'Shoot',exact:true}).tap();
 await page.getByRole('button',{name:'Next: Stop the counter',exact:true}).tap();
 await page.locator('[data-exercise=defending][data-exercise-ready=true]').waitFor();
 await page.getByRole('button',{name:'Tackle',exact:true}).tap();
 await page.getByRole('button',{name:'Retry same exercise',exact:true}).waitFor();
 assert.equal(await page.getByRole('button',{name:/^Next:/}).count(),0);
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 await page.getByRole('button',{name:'Back to exercises',exact:true}).tap();
 await page.getByText('3 / 3 skills completed',{exact:true}).waitFor();
 await page.screenshot({path:'work/play38/guided-complete-phone.png'});
 assert.deepEqual(await records(page),before);
 await page.getByRole('button',{name:'Close training',exact:true}).click();await page.reload();await dismissOpeningIntro(page);
 await page.getByRole('button',{name:'Training ground',exact:true}).click();
 await page.getByText('3 / 3 skills completed',{exact:true}).waitFor();
 const progress=await page.evaluate(()=>JSON.parse(localStorage.getItem('touchline.practice.qa.v1')));
 assert.deepEqual(progress.skills.passing,{attempts:2,completed:2});
 assert.equal(await page.evaluate(()=>localStorage.getItem('touchline.practice.v1')),null);
 assert.deepEqual(await records(page),before);
});
test('leaving practice earns no completion and a failed progress write remains usable',{timeout:60000},async t=>{
 const page=await open(t),before=await records(page);
 await page.getByRole('button',{name:'Training ground',exact:true}).click();
 await train(page,'passing');await page.getByRole('button',{name:'Back to exercises',exact:true}).click();
 await page.getByText('0 / 3 skills completed',{exact:true}).waitFor();
 assert.equal(await page.evaluate(()=>localStorage.getItem('touchline.practice.qa.v1')),null);
 await page.evaluate(()=>{const original=Storage.prototype.setItem;Storage.prototype.setItem=function(key,value){if(key.startsWith('touchline.practice'))throw new DOMException('Full device','QuotaExceededError');return original.call(this,key,value);};});
 await train(page,'passing');await page.keyboard.press('KeyJ');await page.getByRole('button',{name:'Retry same exercise',exact:true}).waitFor();
 await page.getByRole('button',{name:'Back to exercises',exact:true}).click();
 await page.getByText('1 / 3 skills completed',{exact:true}).waitFor();
 assert.match(await page.locator('.training-note').innerText(),/could not be saved/);
 assert.deepEqual(await records(page),before);
});
async function train(page,id){await page.locator('[data-exercise='+id+']').click();await page.getByRole('button',{name:'Return to management',exact:true}).waitFor();}

test('keyboard can complete all three repeatable exercises without changing career/exhibition saves',{timeout:60000},async t=>{
 const page=await open(t,false,false,true),before=await records(page);await page.getByRole('button',{name:'Training ground',exact:true}).click();await page.screenshot({path:'work/play38/training-desktop.png'});
 for(const [id,key]of [['passing','KeyJ'],['shooting','KeyL'],['defending','KeyC']]){await train(page,id);await page.keyboard.press(key);await page.getByText('Exercise complete · retry from the same situation',{exact:true}).waitFor();assert.equal(await page.locator('[data-direct-pause]').isDisabled(),true);await page.getByRole('button',{name:'Back to exercises',exact:true}).click();assert.deepEqual(await records(page),before);}
 await page.getByRole('button',{name:'Close training',exact:true}).click();assert.deepEqual(await records(page),before);assert.equal(await page.evaluate(async()=>{const {allRecords}=await import('/replay-store.js');return (await allRecords('qa')).length;}),0);
});

test('touch can complete each exercise with pitch, selected player and action buttons visible at 390x568',{timeout:60000},async t=>{
 const page=await open(t,true,true),before=await records(page);await page.getByRole('button',{name:'Training ground',exact:true}).tap();
 for(const [id,label]of [['passing','Pass'],['shooting','Shoot'],['defending','Tackle']]){await train(page,id);const visible=await page.locator('.match-stage,.direct-touch button,[data-direct-status],.training-hud [data-live=close]').evaluateAll(es=>es.every(e=>{const r=e.getBoundingClientRect();return r.top>=0&&r.bottom<=innerHeight&&r.width>0;}));assert.equal(visible,true,id+' pitch/controls not in the same viewport');await page.getByRole('button',{name:label,exact:true}).tap();await page.getByText('Exercise complete · retry from the same situation',{exact:true}).waitFor();assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);await page.screenshot({path:'work/play38/'+id+'-phone.png'});await page.getByRole('button',{name:'Back to exercises',exact:true}).tap();}
 assert.deepEqual(await records(page),before);
});

test('keyboard and pointer holds do not cancel each other, pause clears both, and feedback distinguishes actual actions',{timeout:60000},async t=>{
 const page=await open(t,true);await page.getByRole('button',{name:'Take the touchline',exact:true}).click();await page.getByRole('button',{name:'Play exhibition',exact:true}).click();await page.getByRole('button',{name:'Play yourself',exact:true}).click();await page.getByRole('button',{name:'Return to management',exact:true}).waitFor();
 // Direction release in the same browser task must not erase a queued football action.
 await page.evaluate(()=>{for(const [type,code]of [['keydown','KeyA'],['keydown','KeyJ'],['keyup','KeyA']])window.dispatchEvent(new KeyboardEvent(type,{code,bubbles:true,cancelable:true}));});await page.locator('.direct-feedback').filter({hasText:'Pass played'}).waitFor();
 const button=page.getByRole('button',{name:'Move right',exact:true}),box=await button.boundingBox();await page.keyboard.down('KeyD');await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.down();await page.keyboard.up('KeyD');const input=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('touchline.qa.v2')).exhibition.pending.resume.state.directControl);assert.deepEqual((await input()).move,[1,0]);await page.mouse.up();assert.deepEqual((await input()).move,[0,0]);
 await page.keyboard.down('KeyA');await page.getByRole('button',{name:'Pause play',exact:true}).click();assert.deepEqual((await input()).move,[0,0]);await page.keyboard.up('KeyA');await page.keyboard.press('KeyL');assert.match(await page.locator('.direct-feedback').innerText(),/Paused/);await page.getByRole('button',{name:'Resume play',exact:true}).click();await page.keyboard.press('KeyQ');await page.locator('.direct-feedback').filter({hasText:/Switched to/}).waitFor();assert.match(await page.locator('[data-direct-status]').innerText(),/Controlling/);
 await page.screenshot({path:'work/play38/controls-phone.png'});await page.locator('[data-live=close]').first().click();assert.deepEqual((await input()).move,[0,0]);
});
