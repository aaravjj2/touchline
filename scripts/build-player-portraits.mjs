import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {spawn} from 'node:child_process';
import {chromium} from '@playwright/test';
import {LEGENDS} from '../dist/legends.js';
import {ENGLISH_PLAYERS} from '../dist/english-catalog.js';
import {SUPER_PLAYERS} from '../dist/super-catalog.js';
import {FOUNDING_PLAYERS} from '../dist/founding-squad.js';
import {PLAYERS} from '../dist/engine.js';

const normalize=s=>String(s||'').normalize('NFD').replace(/\p{Diacritic}/gu,'').toLowerCase().replace(/[^a-z0-9]/g,'');
const players=[...LEGENDS,...ENGLISH_PLAYERS,...SUPER_PLAYERS,...FOUNDING_PLAYERS,...PLAYERS],people=new Map(),index={},names=new Map(),files=[];
for(const player of players){const key=String(player.personId||player.profileId||player.id||normalize(player.name));if(!people.has(key))people.set(key,player);}
await mkdir('dist/assets/player-portraits',{recursive:true});
const server=spawn(process.execPath,['scripts/local-demo-server.mjs'],{env:{...process.env,PORT:'4311'},windowsHide:true,stdio:'pipe'});
await new Promise((resolve,reject)=>{server.stdout.once('data',resolve);server.once('error',reject);});let browser;
try{
 browser=await chromium.launch();const page=await browser.newPage();
 await page.route('**/portrait-build.html',route=>route.fulfill({contentType:'text/html',body:'<!doctype html><title>Original portrait studio</title><canvas id="portrait"></canvas>'}));
 await page.goto('http://127.0.0.1:4311/portrait-build.html');
 await page.evaluate(async()=>{const {createPortraitStudio}=await import('./portrait-renderer.js');window.studio=await createPortraitStudio(document.querySelector('canvas'));});
 let done=0;
 for(const [key,player] of people){
  const file=createHash('sha256').update(key).digest('hex').slice(0,20)+'.webp',data=await page.evaluate(p=>window.studio.render(p),player),bytes=Buffer.from(data.split(',')[1],'base64');
  await writeFile('dist/assets/player-portraits/'+file,bytes);files.push({key,file,bytes:bytes.length});
  index['person:'+key]=file;if(++done%200===0)console.log('Rendered '+done+' / '+people.size+' people');
 }
 for(const player of players){const key=String(player.personId||player.profileId||player.id||normalize(player.name)),file=index['person:'+key];for(const field of ['id','personId','profileId'])if(player[field])index[field+':'+player[field]]=file;const name=normalize(player.name);if(name&&!names.has(name))names.set(name,file);}
 for(const [name,file] of names)index['name:'+name]=file;
 // Authored new careers and future generated players always get a complete image.
 const variants=[];for(let i=0;i<48;i++){const player={id:'original-portrait-variant-'+i,name:'Original athlete'},file='original-'+i+'.webp',data=await page.evaluate(p=>window.studio.render(p),player);await writeFile('dist/assets/player-portraits/'+file,Buffer.from(data.split(',')[1],'base64'));variants.push(file);}
 await page.evaluate(()=>window.studio.dispose());
 await writeFile('dist/player-portrait-data.js','// Original 3D renders. Rebuild: node scripts/build-player-portraits.mjs\nexport const PLAYER_PORTRAITS='+JSON.stringify(index)+';\nexport const PORTRAIT_VARIANTS='+JSON.stringify(variants)+';\n');
 const report={style:'Original human-proportioned 3D studio figures; not real-player likenesses',renderer:'Touchline original mesh / Kenney CC0 skeleton',width:192,height:240,entries:players.length,people:people.size,lookupKeys:Object.keys(index).length,variants:variants.length,files,missing:players.filter(p=>!index['id:'+p.id]).map(p=>p.id)};
 await writeFile('dist/assets/player-portraits/coverage.json',JSON.stringify(report,null,2));await writeFile('dist/assets/player-portraits/README.md','# Original 3D player portraits\n\nRendered from the original Touchline human anatomy mesh, on the credited Kenney CC0 skeleton. These are fictional visual identities, not photographs, scans or accurate likenesses of named people. Neutral studio kits avoid stale club colours after transfers. Known identities use explicit person/profile/card aliases; created players use deterministic original variants. No live WebGL renderer is needed to display cards.\n\nRebuild with `node scripts/build-player-portraits.mjs`; coverage.json records every generated file.\n');
 if(report.missing.length)throw Error('Missing card coverage');console.log(JSON.stringify({entries:report.entries,people:report.people,variants:report.variants,missing:report.missing.length,bytes:files.reduce((n,f)=>n+f.bytes,0)}));
}finally{await browser?.close();server.kill();}
