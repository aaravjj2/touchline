import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {createSuperCareerPreview} from '../dist/super-career.js';
import {SUPER_PACKS} from '../dist/super-catalog.js';
import {prepareSuperFixture} from '../dist/super-season.js';
import {fixtureDefinition,playDefinition,fixtureResult} from '../dist/fixture-engine.js';
import {validateCareerMatchV4} from '../dist/career-match-v4.js';
const rows=[],examples={};await mkdir('work/release312',{recursive:true});
for(let seed=1;seed<=100;seed++){
 const c=createSuperCareerPreview({clubId:SUPER_PACKS[0].id,seed}),f=c.connected.calendar.fixtures[0];prepareSuperFixture(c,f);const teams=[f.home,f.away].map(id=>c.competition.teams.find(t=>t.id===id)),def=fixtureDefinition(...teams,f.seed),state=playDefinition(def),result=fixtureResult(def,state);validateCareerMatchV4(result,teams);assert.equal(result.incidentMatch.origin,'recorded');
 const events=result.incidentMatch.incidents.filter(e=>['yellow','red','second-yellow','injury'].includes(e.type));rows.push({seed,fixtureSeed:f.seed,score:result.score,cards:events.filter(e=>e.type!=='injury').length,injuries:events.filter(e=>e.type==='injury').length});
 for(const e of events)if(!examples[e.type])examples[e.type]={seed,fixtureSeed:f.seed,event:e,score:result.score};
}
const report={model:'physical-2.1.0',fixtures:rows.length,examples,rows};await writeFile('work/release312/physical-samples.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({fixtures:rows.length,examples},null,2));
