import {dismissOpeningIntro} from './helpers/opening.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdtemp,mkdir,readFile,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {chromium} from '@playwright/test';
import {packageLocalDemo,verifyLocalDemo} from '../scripts/package-local-demo.mjs';

test('extracted dependency-free demo supports phone career progression, reload and portable export with no external requests',{timeout:90000},async()=>{
 const parent=await mkdtemp(join(tmpdir(),'touchline-portable-browser-')),demo=join(parent,'demo');await packageLocalDemo(demo);assert.equal((await verifyLocalDemo(demo)).valid,true);
 const port=4285,base='http://127.0.0.1:'+port,server=spawn(process.execPath,['server.mjs'],{cwd:demo,env:{...process.env,PORT:String(port)},windowsHide:true,stdio:'pipe'});let browser,context;
 try{
  await new Promise((resolve,reject)=>{server.stdout.once('data',resolve);server.once('error',reject);server.once('exit',code=>reject(Error('Demo server exited '+code)));});
  browser=await chromium.launch({headless:true});context=await browser.newContext({viewport:{width:390,height:844},acceptDownloads:true});const page=await context.newPage(),errors=[],external=[];
  page.setDefaultTimeout(20000);page.on('pageerror',error=>errors.push(error.message));page.on('request',req=>{if(/^https?:/.test(req.url())&&!req.url().startsWith(base+'/'))external.push(req.url());});
  await page.goto(base+'/?qa=1');await dismissOpeningIntro(page);await page.getByRole('button',{name:'Explore Super League',exact:true}).click();assert.equal(await page.getByRole('button',{name:'Verified opening-day career · locked',exact:true}).isDisabled(),true);
  await page.getByRole('button',{name:'Test league + cup preview',exact:true}).click();await page.getByRole('button',{name:'Prepare next match',exact:true}).click();await page.getByRole('button',{name:'Simulate next matchday',exact:true}).click();await page.getByRole('button',{name:'Continue to office',exact:true}).click();
  const current=async()=>page.evaluate(async()=>{await(await import('/mode-storage.js')).flushModeStorage();return(await import('/large-save.js')).readMode('touchline.europe.qa.v1');});
  const before=await current();await page.reload();await page.getByRole('button',{name:'Prepare next match',exact:true}).waitFor();assert.deepEqual(await current(),before);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  await page.getByRole('button',{name:'Settings & saves',exact:true}).click();const downloadPromise=page.waitForEvent('download');await page.getByRole('button',{name:'Export all saves',exact:true}).click();const download=await downloadPromise;
  const archive=JSON.parse(await readFile(await download.path(),'utf8'));assert.deepEqual(archive.saves[1],before);assert.equal(await page.evaluate(()=>localStorage.getItem('touchline.europe.v1')),null);
  const response=await page.request.post(base+'/api/coach',{data:{}});assert.equal(response.status(),503);assert.match((await response.json()).reason,/Rules-based coaching/);
  assert.deepEqual(errors,[]);assert.deepEqual(external,[]);
  await page.getByRole('button',{name:'Close dialog',exact:true}).click();await page.evaluate(()=>window.scrollTo(0,0));
  await mkdir('work/one-shot-2026-10-24',{recursive:true});await page.screenshot({path:'work/one-shot-2026-10-24/portable-demo-phone.png',fullPage:true});
  await writeFile('work/one-shot-2026-10-24/portable-browser.json',JSON.stringify({passed:true,browser:browser.version(),width:390,externalRequests:external,errors,reloadExact:true,exportBytes:JSON.stringify(archive).length,verifiedCareerLocked:true,sourceFiles:(await verifyLocalDemo(demo)).files},null,2)+'\n');
 }finally{await context?.close();await browser?.close();server.kill();}
});
