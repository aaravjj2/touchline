import {cp,mkdir,readFile,writeFile,realpath} from 'node:fs/promises';
import {dirname,resolve,relative,isAbsolute} from 'node:path';
import {createHash} from 'node:crypto';
import {firefox} from '@playwright/test';
if(process.platform!=='win32')throw Error('This private assembly-manifest workaround is Windows-only.');
if(!process.argv[2])throw Error('Usage: node scripts/prepare-firefox-local.mjs NEW_DIRECTORY');
const source=await realpath(dirname(firefox.executablePath())),output=resolve(process.argv[2]),rel=relative(source,output);
if(rel===''||(!rel.startsWith('..')&&!isAbsolute(rel)))throw Error('Choose an output outside the installed Firefox runtime.');
const dll=await readFile(resolve(source,'mozglue.dll')),manifest=dll.toString('latin1').match(/<assembly xmlns="urn:schemas-microsoft-com:asm.v1"[\s\S]*?<\/assembly>/)?.[0];
if(!manifest?.includes('name="mozglue"')||!manifest.includes('<file name="mozglue.dll"/>'))throw Error('Expected embedded mozglue assembly declaration not found; do not invent a replacement.');
await mkdir(output,{recursive:false});await cp(source,resolve(output,'firefox'),{recursive:true,errorOnExist:true,force:false});
await writeFile(resolve(output,'firefox/mozglue.manifest'),manifest,{flag:'wx'});
const hash=bytes=>createHash('sha256').update(bytes).digest('hex'),binaries={};
for(const name of ['firefox.exe','mozglue.dll']){
 const original=hash(await readFile(resolve(source,name))),copy=hash(await readFile(resolve(output,'firefox',name)));if(original!==copy)throw Error('Runtime binary copy differs');binaries[name]=original;
}
const report={scope:'Private Windows Firefox runtime copy only. Installed runtime and browser binaries unchanged; original embedded assembly declaration extracted verbatim.',executable:resolve(output,'firefox/firefox.exe'),binaries,manifestSha256:hash(manifest)};
await writeFile(resolve(output,'runtime-integrity.json'),JSON.stringify(report,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify(report,null,2));
