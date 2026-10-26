import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import {openingCandidate} from '../dist/super-opening-data.js';
import {reviewQueue,reviewDiff,frozenCandidate,validateFrozenCandidate} from './lib/super-review.mjs';
const arg=name=>process.argv.includes(name)?process.argv[process.argv.indexOf(name)+1]:null;
const load=async path=>JSON.parse(await readFile(path,'utf8'));
const mode=arg('--mode')||'queue',input=arg('--input'),reviews=arg('--reviews'),output=arg('--output');
if(!output)throw Error('Choose a new --output path; review commands never overwrite files.');
const destination=resolve(output);for(const path of [input,reviews,arg('--before')].filter(Boolean))if(resolve(path)===destination)throw Error('Output must not replace source facts or reviews.');
const data=input?await load(input):openingCandidate(),ledger=reviews?await load(reviews):{version:1,entries:[]};let result;
if(mode==='queue')result=reviewQueue(data,ledger);
else if(mode==='export')result=data;
else if(mode==='diff'){if(!arg('--before'))throw Error('Diff requires --before.');result=reviewDiff(await load(arg('--before')),data);}
else if(mode==='freeze')result=frozenCandidate(data,ledger);
else if(mode==='validate'){if(!input)throw Error('Validate requires --input package.');result=validateFrozenCandidate(data);}
else throw Error('Use queue, export, diff, freeze or validate.');
await mkdir(dirname(destination),{recursive:true});await writeFile(destination,JSON.stringify(result,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({mode,output:destination,ready:result.ready??null,sourceHash:result.sourceHash??null,clubs:result.clubs?.length,changes:result.changes?.length}));
if(mode==='queue'){
 const md=destination+'.md',rows=result.clubs.map(c=>`| ${c.name} | ${c.players} | ${c.accepted} / ${c.total} | ${c.issues} |`).join('\n');
 await writeFile(md,`# Opening-day data review queue\n\nCandidate SHA-256: ${result.sourceHash}\n\nStart with Barcelona, Real Madrid and Arsenal, then follow the remaining clubs. Each JSON queue item contains its current value, evidence, claim hash and review state. Reviews are assertions by named reviewers, not automatic source verification.\n\n| Club | Players | Accepted facts | Audit issues |\n| --- | --- | --- | --- |\n${rows}\n\nReady: ${result.ready}. Required dataset checks: ${result.audit.errors.length}. Review-ledger issues: ${result.errors.length}.\n`,{flag:'wx'});
}
