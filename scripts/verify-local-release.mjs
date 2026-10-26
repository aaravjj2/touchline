import {mkdir,readFile,readdir,writeFile} from 'node:fs/promises';
import {resolve,relative,isAbsolute} from 'node:path';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {digest,reviewQueue,frozenCandidate} from './lib/super-review.mjs';
import {packageLocalDemo,verifyLocalDemo} from './package-local-demo.mjs';

const root=fileURLToPath(new URL('../',import.meta.url)),outputArg=process.argv[2];
if(!outputArg||outputArg.startsWith('--'))throw Error('Usage: node scripts/verify-local-release.mjs NEW_DIRECTORY [--skip-browser]');
const output=resolve(outputArg),skipBrowser=process.argv.includes('--skip-browser');await mkdir(output,{recursive:false});
const report={started:new Date().toISOString(),steps:[],scope:'Local software verification only. No data publication, deployment, human/device certification or hackathon submission.'};
const save=()=>writeFile(resolve(output,'verification.json'),JSON.stringify(report,null,2)+'\n');
async function run(name,args){
 console.log('Starting '+name);const start=Date.now();let log='';
 const outcome=await new Promise(resolve=>{
  const child=spawn(process.execPath,args,{cwd:root,env:{...process.env,COACH_ENABLED:'false'},windowsHide:true,stdio:['ignore','pipe','pipe']});
  child.stdout.on('data',chunk=>{log+=chunk;});child.stderr.on('data',chunk=>{log+=chunk;});
  child.once('error',error=>resolve({passed:false,error:error.message}));child.once('exit',(code,signal)=>resolve({passed:code===0,code,signal}));
 });
 await writeFile(resolve(output,name+'.log'),log,{flag:'wx'});report.steps.push({name,...outcome,milliseconds:Date.now()-start,log:name+'.log'});await save();console.log(name+': '+(outcome.passed?'passed':'FAILED'));return outcome.passed;
}
await run('syntax-assets',['scripts/check.mjs']);
const units=(await readdir(resolve(root,'tests'))).filter(n=>n.endsWith('.test.js')).sort().map(n=>'tests/'+n);
await run('unit-tests',['--test',...units]);
if(skipBrowser)report.steps.push({name:'browser-tests',passed:false,skipped:true,reason:'Explicit --skip-browser; complete software gate cannot pass.'});
else{const browsers=(await readdir(resolve(root,'browser-tests'))).filter(n=>n.endsWith('.test.js')).sort().map(n=>'browser-tests/'+n);await run('browser-tests',['--test','--test-concurrency=1',...browsers]);}
await run('three-club-reports',['scripts/verify-career-reports.mjs',resolve(output,'career-reports.json')]);
try{
 const managerRoot=resolve(root,'data/manager'),index=JSON.parse(await readFile(resolve(managerRoot,'review-current.json'),'utf8'));
 const read=async name=>{const path=resolve(managerRoot,name),rel=relative(managerRoot,path);if(rel.startsWith('..')||isAbsolute(rel))throw Error('Review pointer escapes data directory');return JSON.parse(await readFile(path,'utf8'));};
 const candidate=await read(index.candidate),reviews=await read(index.reviews);
 if(digest(candidate)!==index.sourceHash||digest(reviews)!==index.reviewHash)throw Error('Current review hashes differ');
 const queue=reviewQueue(candidate,reviews);let blocked=false;
 try{frozenCandidate(candidate,reviews);}catch{blocked=true;}
 if(!queue.ready&&!blocked)throw Error('Incomplete data unexpectedly froze');
 const reviewErrors=queue.errors.length+queue.queue.filter(f=>!['accepted','unreviewed'].includes(f.state)).length;
 report.sourceReview={sourceHash:index.sourceHash,accepted:queue.queue.filter(f=>f.state==='accepted').length,issues:queue.audit.errors.length,unaccepted:queue.queue.filter(f=>f.state!=='accepted').length,reviewErrors,verifiedCareerReady:queue.ready,runtimePublished:false};
 report.steps.push({name:'source-review-integrity',passed:reviewErrors===0});
 await writeFile(resolve(output,'source-audit.json'),JSON.stringify(queue.audit,null,2)+'\n',{flag:'wx'});
}catch(error){report.steps.push({name:'source-review-integrity',passed:false,error:error.message});}
try{report.demo=await packageLocalDemo(resolve(output,'demo'),{root});report.demoVerification=await verifyLocalDemo(resolve(output,'demo'));report.steps.push({name:'portable-demo-integrity',passed:true});}
catch(error){report.steps.push({name:'portable-demo-integrity',passed:false,error:error.message});}
report.completed=new Date().toISOString();report.softwareVerified=report.steps.every(s=>s.passed);report.physicalDevicesVerified=false;report.humanPlayTestingComplete=false;
await save();console.log(JSON.stringify({output,softwareVerified:report.softwareVerified,sourceReview:report.sourceReview,demo:report.demo?.output},null,2));
if(!report.softwareVerified)process.exitCode=1;
