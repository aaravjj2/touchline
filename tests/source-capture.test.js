import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,writeFile,access} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';

test('source capture records HTTP failures, stops a rate-limited host and hashes successful bytes without approving facts',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'touchline-source-capture-')),manifest=join(dir,'sources.json'),output=join(dir,'captured'),preload=join(dir,'mock-fetch.mjs');
 await writeFile(manifest,JSON.stringify({sources:[{url:'https://limited.test/first'},{url:'https://limited.test/second'},{url:'https://official.test/page'},{url:'https://official.test/page'}]}));
 await writeFile(preload,`globalThis.fetch=async url=>{
  if(url==='https://limited.test/second')throw Error('Must not request a rate-limited host again');
  return url.includes('limited.test')?new Response('Slow down',{status:429,headers:{'retry-after':'120'}}):new Response('Official source bytes',{headers:{'content-type':'text/html'}});
 };`);
 const run=spawnSync(process.execPath,['--import',pathToFileURL(preload).href,resolve('scripts/capture-football-sources.mjs'),manifest,output],{encoding:'utf8'});
 assert.equal(run.status,1);const index=JSON.parse(await readFile(join(output,'index.json'),'utf8'));
 assert.equal(index.sources.length,3);assert.equal(index.sources[0].status,429);assert.equal(index.sources[0].retryAfter,'120');
 assert.match(index.sources[1].error,/Skipped/);assert.equal(index.sources[1].file,undefined);
 const good=index.sources[2];assert.equal(good.status,200);assert.equal(good.sha256,createHash('sha256').update('Official source bytes').digest('hex'));
 assert.equal(await readFile(join(output,good.file),'utf8'),'Official source bytes');assert.equal(good.verified,undefined);assert.match(index.scope,/do not verify/);
 const original=await readFile(join(output,'index.json'),'utf8');
 assert.notEqual(spawnSync(process.execPath,['--import',pathToFileURL(preload).href,resolve('scripts/capture-football-sources.mjs'),manifest,output],{encoding:'utf8'}).status,0);
 assert.equal(await readFile(join(output,'index.json'),'utf8'),original);
});

test('source capture rejects credential-bearing or non-HTTPS manifests before creating an output directory',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'touchline-source-input-'));
 for(const [i,url] of ['http://example.test/page','https://username:password@example.test/page'].entries()){
  const manifest=join(dir,`source-${i}.json`),output=join(dir,`capture-${i}`);await writeFile(manifest,JSON.stringify({sources:[{url}]}));
  assert.notEqual(spawnSync(process.execPath,[resolve('scripts/capture-football-sources.mjs'),manifest,output],{encoding:'utf8'}).status,0);
  await assert.rejects(access(output));
 }
});
