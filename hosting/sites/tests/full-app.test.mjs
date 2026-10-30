import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
test('the complete hosted asset manifest matches the copied game and includes the home multiplayer entry',async()=>{
 const manifest=JSON.parse(await readFile('public/offline-manifest.json','utf8'));assert.ok(manifest.files.length>5300);
 for(let i=0;i<manifest.files.length;i+=64)await Promise.all(manifest.files.slice(i,i+64).map(async f=>{const bytes=await readFile('public'+f.url);assert.equal(bytes.length,f.bytes,f.url);assert.equal(createHash('sha256').update(bytes).digest('hex'),f.sha256,f.url);if(f.sourceUrl){assert.equal(f.sourceUrl,'/offline-html'+f.url+'.bin');assert.deepEqual(await readFile('public'+f.sourceUrl),bytes);}}));
 assert.match(await readFile('public/cinematic-home.js','utf8'),/cinema-multiplayer.*href="\/duel"/);
 assert.match(await readFile('public/sites-entry.js','utf8'),/location.replace\('\/duel\?room=/);
 assert.match(await readFile('public/sites-multiplayer-entry.js','utf8'),/location.replace\('\/duel'\+location.search\)/);
});
