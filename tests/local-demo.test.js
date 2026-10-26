import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,readFile,access} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {packageLocalDemo,verifyLocalDemo} from '../scripts/package-local-demo.mjs';
import {createLocalDemoServer} from '../scripts/local-demo-server.mjs';

async function fixture(){
 const root=await mkdtemp(join(tmpdir(),'touchline-demo-'));await mkdir(join(root,'dist/assets/library'),{recursive:true});
 const release=JSON.stringify({version:'test-local-demo'}),html='<h1>Local demo fixture</h1>';
 const entry=(url,bytes)=>({url,bytes:Buffer.byteLength(bytes),sha256:createHash('sha256').update(bytes).digest('hex')});
 const manifest={version:'test-local-demo',id:'fixture-build',files:[entry('/index.html',html),entry('/release.json',release)]};
 for(const [name,bytes] of Object.entries({'dist/index.html':html,'dist/release.json':release,'dist/offline-manifest.json':JSON.stringify(manifest),'dist/service-worker.js':'// fixture','dist/assets/library/LICENSE':'Fixture asset license','dist/assets/ASSETS.md':'Fixture credits',LICENSE:'Fixture license','.env':'SECRET_NOT_FOR_BUNDLE','private-save.json':'PRIVATE_PROGRESS'}))await writeFile(join(root,name),bytes);
 return root;
}
test('local demo contains exactly verified runtime assets and credits, excludes secrets/saves, and rejects changed or unexpected files',async()=>{
 const root=await fixture(),out=join(root,'demo');await packageLocalDemo(out,{root});assert.equal((await verifyLocalDemo(out)).valid,true);
 await assert.rejects(access(join(out,'.env')));await assert.rejects(access(join(out,'private-save.json')));
 assert.equal(await readFile(join(out,'dist/assets/ASSETS.md'),'utf8'),'Fixture credits');
 await assert.rejects(packageLocalDemo(out,{root}),/exist/i);
 await writeFile(join(out,'unexpected-save.json'),'progress');await assert.rejects(verifyLocalDemo(out),/Unexpected bundle file/);
 const out2=join(root,'second');await packageLocalDemo(out2,{root});await writeFile(join(out2,'dist/index.html'),'changed');await assert.rejects(verifyLocalDemo(out2),/integrity mismatch/);
});
test('stale assets and traversal entries are rejected before a demo directory is created',async()=>{
 const root=await fixture(),out=join(root,'demo');await writeFile(join(root,'dist/index.html'),'stale');await assert.rejects(packageLocalDemo(out,{root}),/stale/);await assert.rejects(access(out));
 const file=join(root,'dist/offline-manifest.json'),manifest=JSON.parse(await readFile(file,'utf8'));manifest.files[0].url='/../.env';await writeFile(file,JSON.stringify(manifest));await assert.rejects(packageLocalDemo(out,{root}),/Unsafe bundle path/);await assert.rejects(access(out));
});
test('standalone local server serves assets, blocks escaped paths and disables AI without installed packages',async t=>{
 const root=await fixture(),server=createLocalDemoServer(join(root,'dist'));await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));t.after(()=>new Promise(resolve=>server.close(resolve)));
 const base='http://127.0.0.1:'+server.address().port;
 assert.match(await(await fetch(base+'/?qa=1')).text(),/Local demo fixture/);
 const head=await fetch(base+'/',{method:'HEAD'});assert.equal(head.status,200);assert.equal(await head.text(),'');
 const blocked=await fetch(base+'/%2e%2e%2f.env');assert.equal(blocked.status,403);assert.ok(!(await blocked.text()).includes('SECRET_NOT_FOR_BUNDLE'));
 const coach=await fetch(base+'/api/coach',{method:'POST',body:'{}'});assert.equal(coach.status,503);assert.match((await coach.json()).reason,/Rules-based coaching/);
 assert.equal((await fetch(base+'/',{method:'POST'})).status,405);
});
