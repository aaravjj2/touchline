import {mkdir,readFile,writeFile,lstat,realpath,readdir} from 'node:fs/promises';
import {resolve,relative,isAbsolute,dirname} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';

const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const inside=(root,path)=>{const rel=relative(root,path);return rel!==''&&!rel.startsWith('..')&&!isAbsolute(rel);};
function safePath(root,name){
 if(typeof name!=='string'||!name||name.includes('\\')||name.includes(':')||name.includes('\0')||name.split('/').some(p=>!p||p==='.'||p==='..'))throw Error('Unsafe bundle path');
 const path=resolve(root,name);if(!inside(root,path))throw Error('Bundle path escapes root');return path;
}
export async function packageLocalDemo(output,{root=fileURLToPath(new URL('../',import.meta.url))}={}){
 root=await realpath(root);output=resolve(output);const sourceDist=await realpath(resolve(root,'dist'));
 if(output===root||output===sourceDist||inside(sourceDist,output))throw Error('Bundle output must be separate from the application');
 const offline=JSON.parse(await readFile(resolve(sourceDist,'offline-manifest.json'),'utf8')),release=JSON.parse(await readFile(resolve(sourceDist,'release.json'),'utf8'));
 if(offline.version!==release.version)throw Error('Offline/release versions disagree');
 const paths=new Map();
 for(const file of offline.files){
  if(!file.url.startsWith('/'))throw Error('Invalid offline URL');
  const name='dist/'+file.url.slice(1);safePath(output,name);if(paths.has(name))throw Error('Duplicate offline asset');paths.set(name,file);
 }
 for(const name of ['dist/service-worker.js','dist/offline-manifest.json','dist/assets/library/LICENSE','dist/assets/ASSETS.md','LICENSE'])if(!paths.has(name))paths.set(name,null);
 // Validate all source bytes before creating any output. No env files, saves,
 // node_modules, research downloads or API credentials enter this allowlist.
 const sources=[];
 for(const [name,expected] of paths){
  const path=safePath(root,name),actual=await realpath(path);if(!inside(root,actual)||(name.startsWith('dist/')&&!inside(sourceDist,actual))||(await lstat(path)).isSymbolicLink())throw Error('Source symlink or escaped root');
  const bytes=await readFile(actual);if(expected&&(bytes.length!==expected.bytes||sha(bytes)!==expected.sha256))throw Error('Offline asset is stale: '+name);
  sources.push({name,bytes});
 }
 await mkdir(output,{recursive:false});const files=[];
 const emit=async(name,bytes)=>{const path=safePath(output,name);await mkdir(dirname(path),{recursive:true});await writeFile(path,bytes,{flag:'wx'});files.push({path:name,bytes:Buffer.byteLength(bytes),sha256:sha(bytes)});};
 for(const source of sources)await emit(source.name,source.bytes);
 await emit('server.mjs',await readFile(new URL('./local-demo-server.mjs',import.meta.url)));
 await emit('package.json',JSON.stringify({name:'touchline-local-demo',version:release.version,private:true,type:'module',engines:{node:'>=24'},scripts:{start:'node server.mjs'}},null,2)+'\n');
 await emit('Start-Touchline.cmd','@echo off\r\ncd /d "%~dp0"\r\nnode server.mjs\r\npause\r\n');
 await emit('README.md',`# Touchline local demo\n\nBuild ${release.version}; offline build ${offline.id}.\n\nInstall Node.js 24 or later, extract the complete folder and run \`node server.mjs\` from this folder (Windows: double-click Start-Touchline.cmd). Open http://127.0.0.1:4280/?qa=1. Set PORT to choose a different local port. No npm install or network service is required. This server binds only to 127.0.0.1.\n\nThe isolated port and QA namespace keep this demo separate from other local careers. Saves remain in this browser; export a portable archive in Settings before moving ports or devices. QA save exports stay separate from normal-mode exports. Do not open index.html as a file.\n\nTry Manager → Explore Super League → Test league + cup preview, choose a club or create your own, prepare the next match, then Play yourself, Manage live or Simulate. Draft & Europe, Player career, Training ground, Decision Lab and save/recovery controls are included.\n\nThe playable squads are an explicitly unverified October sandbox. Verified 7 August careers remain locked. Ratings, budgets, potential and undisclosed financial terms are authored estimates; references and game terms differ. Live AI is disabled; coaching is rules-based. No account, cloud, multiplayer or external AI service is included. This is a local review package, not a published site or hackathon submission.\n\nOriginal source license: LICENSE. Existing model/artwork/vendor credits are retained under dist/assets/ and dist/vendor/.\n`);
 const manifest={format:'touchline-local-demo',version:1,appVersion:release.version,offlineId:offline.id,scope:'Local playable sandbox only; no user saves, credentials, online AI or deployment.',files:files.sort((a,b)=>a.path.localeCompare(b.path))};
 await writeFile(resolve(output,'bundle-manifest.json'),JSON.stringify(manifest,null,2)+'\n',{flag:'wx'});
 return {output,appVersion:release.version,files:files.length,bytes:files.reduce((n,f)=>n+f.bytes,0),manifestSha256:sha(JSON.stringify(manifest))};
}
export async function verifyLocalDemo(root){
 root=await realpath(root);const manifest=JSON.parse(await readFile(resolve(root,'bundle-manifest.json'),'utf8'));
 if(manifest.format!=='touchline-local-demo'||manifest.version!==1||!Array.isArray(manifest.files))throw Error('Invalid demo manifest');
 const names=new Set(['bundle-manifest.json']);
 for(const file of manifest.files){
  const path=safePath(root,file.path);if(names.has(file.path))throw Error('Duplicate manifest file');names.add(file.path);
  if((await lstat(path)).isSymbolicLink()||!inside(root,await realpath(path)))throw Error('Bundle symlink or escaped root');
  const bytes=await readFile(path);if(bytes.length!==file.bytes||sha(bytes)!==file.sha256)throw Error('Bundle integrity mismatch: '+file.path);
 }
 async function walk(dir=''){for(const entry of await readdir(resolve(root,dir),{withFileTypes:true})){const name=dir+entry.name;if(entry.isSymbolicLink())throw Error('Unexpected symlink');if(entry.isDirectory())await walk(name+'/');else if(!names.has(name))throw Error('Unexpected bundle file: '+name);}}
 await walk();return {valid:true,appVersion:manifest.appVersion,files:manifest.files.length,offlineId:manifest.offlineId};
}
if(process.argv[1]&&pathToFileURL(resolve(process.argv[1])).href===import.meta.url){
 const [mode,path]=process.argv.slice(2);if(!path||!['build','verify'].includes(mode))throw Error('Usage: node scripts/package-local-demo.mjs build NEW_DIRECTORY | verify DIRECTORY');
 console.log(JSON.stringify(await(mode==='build'?packageLocalDemo(path):verifyLocalDemo(path)),null,2));
}
