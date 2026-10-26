import {readdir,readFile} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
for(const dir of ['dist','api'])for(const name of await readdir(dir)){
 if(!name.endsWith('.js'))continue;
 const result=spawnSync(process.execPath,['--check',dir+'/'+name],{encoding:'utf8'});
 if(result.status!==0){console.error(result.stderr);process.exit(1);}
 const text=await readFile(dir+'/'+name,'utf8');
 for(const match of text.matchAll(/(?:from\s*|import\s*)['"](\.\.?\/[^'"]+)['"]/g))await readFile(new URL(match[1],new URL('../'+dir+'/'+name,import.meta.url)));
}
const pkg=JSON.parse(await readFile('package.json','utf8')),release=JSON.parse(await readFile('dist/release.json','utf8'));
const {BUILD_VERSION}=await import('../dist/build-version.js');
if(pkg.version!==release.version||pkg.version!==BUILD_VERSION)throw Error('Release version mismatch.');
const offline=JSON.parse(await readFile('dist/offline-manifest.json','utf8'));if(offline.version!==BUILD_VERSION)throw Error('Rebuild the offline manifest for this release.');
for(let i=0;i<offline.files.length;i+=32){const results=await Promise.allSettled(offline.files.slice(i,i+32).map(async f=>{if(!f.url.startsWith('/')||f.url.includes('..'))throw Error('Invalid offline asset path.');const bytes=await readFile('dist'+f.url);if(bytes.length!==f.bytes||createHash('sha256').update(bytes).digest('hex')!==f.sha256)throw Error('Offline build is stale: '+f.url+'. Run node scripts/build-offline.mjs.');}));for(const result of results)if(result.status==='rejected')throw result.reason;}
console.log('JavaScript syntax, imports, release version and offline asset hashes verified.');
