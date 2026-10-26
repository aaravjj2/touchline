import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';

// Archive explicitly selected public source pages. Capture is not fact verification.
const [manifestPath,outputPath]=process.argv.slice(2);
if(!manifestPath||!outputPath)throw Error('Usage: node scripts/capture-football-sources.mjs manifest.json NEW_DIRECTORY');
const manifest=JSON.parse(await readFile(manifestPath,'utf8'));
const urls=[...new Set(manifest.sources.map(s=>s.url))];
for(const url of urls){const parsed=new URL(url);if(parsed.protocol!=='https:'||parsed.username||parsed.password)throw Error('Public HTTPS sources required.');}
const output=resolve(outputPath);await mkdir(output,{recursive:false});const results=[],limitedHosts=new Set();
for(const [index,url] of urls.entries()){
 const record={url};
 if(limitedHosts.has(new URL(url).hostname)){results.push({...record,error:'Skipped: source host previously returned HTTP 429.'});continue;}
 try{
  const response=await fetch(url,{signal:AbortSignal.timeout(20000),headers:{'User-Agent':'Touchline-local-source-review/1.0'}});
  Object.assign(record,{status:response.status,finalUrl:response.url,contentType:response.headers.get('content-type')});
  if(response.status===429){limitedHosts.add(new URL(url).hostname);record.retryAfter=response.headers.get('retry-after');}
  const bytes=Buffer.from(await response.arrayBuffer());if(bytes.length>12000000)throw Error('Source exceeds 12 MB capture limit.');
  record.bytes=bytes.length;record.sha256=createHash('sha256').update(bytes).digest('hex');
  record.file=String(index+1).padStart(3,'0')+'.'+(record.contentType?.includes('pdf')?'pdf':'html');
  await writeFile(resolve(output,record.file),bytes,{flag:'wx'});
 }catch(error){record.error=error.message;}
 results.push(record);console.log(JSON.stringify(record));
}
await writeFile(resolve(output,'index.json'),JSON.stringify({capturedAt:new Date().toISOString(),scope:'Public-page capture only; HTTP success and hashes do not verify football facts.',sources:results},null,2)+'\n',{flag:'wx'});
if(results.some(r=>r.error||r.status!==200))process.exitCode=1;
