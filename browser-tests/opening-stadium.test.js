import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {chromium} from '@playwright/test';
const base='http://127.0.0.1:4299';let server,browser;
test.before(async()=>{server=spawn(process.execPath,['server.mjs'],{env:{...process.env,PORT:'4299',COACH_ENABLED:'false'},windowsHide:true,stdio:'pipe'});await new Promise((r,j)=>{server.stdout.once('data',r);server.once('error',j);});browser=await chromium.launch();});
test.after(async()=>{await browser?.close();server?.kill();});
test('opening entry reserves its layout across actual asset readiness',async t=>{
 const context=await browser.newContext({viewport:{width:1440,height:900}});t.after(()=>context.close());
 await context.addInitScript(()=>{window.__openingShifts=[];new PerformanceObserver(list=>window.__openingShifts.push(...list.getEntries().filter(e=>!e.hadRecentInput).map(e=>({value:e.value,time:e.startTime,sources:e.sources?.map(s=>({node:s.node?.className,previous:s.previousRect.toJSON(),current:s.currentRect.toJSON()}))})))).observe({type:'layout-shift',buffered:true});});
 const page=await context.newPage();await page.goto(base+'/?qa=1');await page.locator('.opening-intro[data-stage=title][data-model=ready]').waitFor();await page.waitForTimeout(700);
 const shifts=await page.evaluate(()=>window.__openingShifts);assert.ok(shifts.reduce((a,b)=>a+b.value,0)<=.1,'Readiness must not rearrange the entry screen: '+JSON.stringify(shifts));
 await page.getByRole('button',{name:'Enter Touchline',exact:true}).click();await page.getByRole('button',{name:'Choose your club',exact:true}).waitFor();
});
test('pointer motion cannot move a paused frame; replay restores its explicit trigger',async t=>{
 const context=await browser.newContext({viewport:{width:390,height:844}});t.after(()=>context.close());const page=await context.newPage();await page.goto(base+'/?qa=1');await page.locator('.opening-intro[data-stage=title][data-model=ready]').waitFor();await page.waitForTimeout(800);
 const before=await page.evaluate(()=>JSON.stringify(localStorage));await page.getByRole('button',{name:'Pause animation',exact:true}).click();
 const image=await page.locator('.opening-stage canvas').evaluate(e=>e.toDataURL());await page.mouse.move(10,130);await page.waitForTimeout(200);assert.equal(await page.locator('.opening-stage canvas').evaluate(e=>e.toDataURL()),image);
 await page.keyboard.press('Escape');await page.getByRole('button',{name:'Replay intro',exact:true}).click();await page.locator('.opening-intro[data-model=ready]').waitFor();await page.keyboard.press('Escape');assert.equal(await page.getByRole('button',{name:'Replay intro',exact:true}).evaluate(e=>e===document.activeElement),true);assert.equal(await page.evaluate(()=>JSON.stringify(localStorage)),before);
});
test('high-contrast entry retains system colors, keyboard controls and a visible launcher selection',async t=>{
 const context=await browser.newContext({viewport:{width:390,height:844},forcedColors:'active',reducedMotion:'reduce'});t.after(()=>context.close());
 const page=await context.newPage();await page.goto(base+'/?qa=1');await page.locator('.opening-intro[data-stage=title]').waitFor();
 const contrast=await page.locator('.opening-intro').evaluate(dialog=>{const probe=document.createElement('span');probe.style.color='CanvasText';dialog.append(probe);const ink=getComputedStyle(probe).color;probe.remove();return [...dialog.querySelectorAll('h1,h1 span,.opening-motto,.opening-status')].every(e=>getComputedStyle(e).color===ink);});assert.equal(contrast,true,'Essential entry text must use the system text color');
 await page.keyboard.press('Enter');await page.locator('.cinema-home').waitFor();const selection=page.locator('.cinema-mode.is-selected');assert.equal(await selection.evaluate(e=>getComputedStyle(e).outlineStyle),'solid');
 await page.getByRole('button',{name:'Replay intro',exact:true}).click();await page.locator('.opening-intro[data-stage=title]').waitFor();await page.keyboard.press('Escape');assert.equal(await page.getByRole('button',{name:'Replay intro',exact:true}).evaluate(e=>e===document.activeElement),true);
});
