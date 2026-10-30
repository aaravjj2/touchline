import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdtemp,readFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {chromium,webkit} from '@playwright/test';
test('two browsers draft a duel, reconnect, retain separate careers and finish the same result on phone and desktop',{timeout:120000},async t=>{
 const dir=await mkdtemp(join(tmpdir(),'touchline-duel-ui-'));const server=spawn(process.execPath,['server.mjs'],{env:{...process.env,PORT:'4239',MULTIPLAYER_STORE:join(dir,'rooms.json')},windowsHide:true,stdio:'pipe'});t.after(()=>server.kill());await new Promise((r,j)=>{server.stdout.once('data',r);server.once('error',j);});
 const browser=await (process.env.TOUCHLINE_MULTIPLAYER_BROWSER==='webkit'?webkit:chromium).launch();t.after(()=>browser.close());const a=await browser.newContext({viewport:{width:1440,height:900}}),b=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});const pages=[await a.newPage(),await b.newPage()],errors=[];
 for(const page of pages){page.setDefaultTimeout(12000);page.on('pageerror',e=>errors.push(e.message));await page.addInitScript(()=>localStorage.setItem('touchline.europe.qa.v1','career-sentinel'));}
 await pages[0].goto('http://127.0.0.1:4239/multiplayer.html');await pages[0].getByRole('button',{name:'Create room',exact:true}).click();await pages[0].getByText('Waiting for your friend',{exact:false}).waitFor();const invite=await pages[0].getByRole('textbox',{name:'Invite link',exact:true}).inputValue();
 await pages[1].goto(invite);await pages[1].getByRole('button',{name:'Join room',exact:true}).click();
 for(const page of pages){await page.getByRole('button',{name:'Ready to draft',exact:true}).click();}
 for(let n=0;n<22;n++){const page=pages[n%2];await page.getByText('Your pick · choose one player',{exact:true}).waitFor();await page.locator('.offer:not([disabled])').first().click();}
 await pages[0].getByRole('button',{name:'Ready for kick-off',exact:true}).waitFor();await pages[0].reload();await pages[0].getByRole('button',{name:'Ready for kick-off',exact:true}).waitFor();
 await b.setOffline(true);await pages[1].getByText('Disconnected · retrying automatically',{exact:true}).waitFor();await b.setOffline(false);await pages[1].getByText('Connected · room updates automatically',{exact:true}).waitFor();
 await pages[0].getByLabel('Your approach').selectOption('press');await pages[0].getByRole('button',{name:'Ready for kick-off',exact:true}).click();await pages[1].getByLabel('Your approach').selectOption('protect');await pages[1].getByRole('button',{name:'Ready for kick-off',exact:true}).click();
 for(const page of pages){await page.locator('.score').waitFor();assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);assert.equal(await page.evaluate(()=>localStorage.getItem('touchline.europe.qa.v1')),'career-sentinel');}
 assert.equal(await pages[0].locator('.score').innerText(),await pages[1].locator('.score').innerText());assert.deepEqual(errors,[]);
 const saved=await pages[0].evaluate(()=>JSON.parse(localStorage.getItem('touchline.multiplayer.seat.v1')));const recovery=await browser.newContext(),recovered=await recovery.newPage();
 await recovered.goto('http://127.0.0.1:4239/multiplayer.html');await recovered.locator('#resume [name=code]').fill(saved.code);await recovered.locator('#resume [name=token]').fill(saved.token);await recovered.getByRole('button',{name:'Recover seat',exact:true}).click();await recovered.locator('.score').waitFor();assert.equal(await recovered.locator('.score').innerText(),await pages[0].locator('.score').innerText());await recovery.close();
 await pages[1].screenshot({path:'work/multiplayer-phone.png',fullPage:true});
 for(const page of pages)await page.getByRole('button',{name:'Request rematch',exact:true}).click();await pages[1].getByText('Your pick · choose one player',{exact:true}).waitFor();
});
test('Vercel multiplayer entry preserves the invite while opening the shared public room service',async t=>{
 const browser=await chromium.launch();t.after(()=>browser.close());const page=await browser.newPage();const base='https://touchline-preview.vercel.app';
 await page.route(base+'/**',async route=>{const path=new URL(route.request().url()).pathname;if(path==='/multiplayer-entry.js')return route.fulfill({contentType:'text/javascript',body:await readFile('dist/multiplayer-entry.js','utf8')});if(path==='/multiplayer.html')return route.fulfill({contentType:'text/html',body:await readFile('dist/multiplayer.html','utf8')});return route.fulfill({contentType:'text/css',body:''});});
 await page.route('https://touchline-draft-duel.aaravj117958.chatgpt.site/**',route=>route.fulfill({contentType:'text/html',body:'<h1>Shared Draft Duel</h1>'}));
 await page.goto(base+'/multiplayer.html?room=ABCDEF0123');await page.waitForURL('https://touchline-draft-duel.aaravj117958.chatgpt.site/duel?room=ABCDEF0123');await page.getByRole('heading',{name:'Shared Draft Duel'}).waitFor();
});
