import {createAnnualCareer,advancePlayerYear,resolveAnnualDecision} from '../dist/annual-career.js';
import {IDENTITIES,renewChapter} from '../dist/career-chapters.js';import {overall} from '../dist/player-career-core.js';
const deep=process.argv.includes('--depth'),best=[];
for(const [identity,item] of Object.entries(IDENTITIES))for(const policy of ['balanced','specialist'])for(let seed=1;seed<=3;seed++){
 const c=createAnnualCareer({name:'Build probe',id:'probe-'+seed,role:item.role,identity,age:16,path:'prospect',seed,nation:'Spain',depth:deep,startClub:'club26'});c.intensity='intense';let peak=overall(c),age=c.age;
 while(!c.retired){if(c.contract<38)renewChapter(c);c.focus=policy==='balanced'?'balanced':item.role==='FWD'?'attack':item.role==='MID'?'control':'defense';advancePlayerYear(c);if(c.pendingDecision){const choices=c.pendingDecision.choices;const chosen=choices.find(x=>x.id==='specialize')||choices.find(x=>['mentor','prove','stay'].includes(x.id))||choices.at(-1);resolveAnnualDecision(c,chosen.id);advancePlayerYear(c);}if(overall(c)>peak){peak=overall(c);age=c.age;}}
 best.push({identity,policy,seed,peak,age});
}
best.sort((a,b)=>b.peak-a.peak);console.log(JSON.stringify({model:deep?'career-world-4':'career-world-3',builds:best.length,best:best.slice(0,8)},null,2));
