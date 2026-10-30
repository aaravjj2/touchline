import {createSandboxCareer} from './sandbox-career.js';
import {sandboxProfile,sandboxCompetition} from './sandbox-world.js';
import {selectPositionTeam} from './manager-positions.js';
import {enableSuperSeason} from './super-season.js';
import {SUPER_OPENING_AUDIT} from './super-opening-data.js';
import {SUPER_SOURCE_FACTS} from './super-source-facts.js';
import {createAvailability} from './match-incidents.js';
import {syncSandboxTeams} from './sandbox-world.js';

// Internal preview uses the dated sandbox data. It cannot claim verified status.
export function createSuperCareerPreview(options={}){
 if(options.marketVersion!==undefined&&![2,3].includes(options.marketVersion))throw Error('Unsupported career market version.');
 const c=createSandboxCareer({...options,kind:'super-league'});
 c.careerRulesVersion=2;c.economy.version=4;c.datasetId='super-october-2026-unverified-preview-v1';
 c.management.market={version:options.marketVersion??3,diagnosticsVersion:1,delegation:{enabled:false,feeBudget:0,weeklyBudget:0}};
 c.statisticsVersion=2;c.matchRulesVersion=3;
 c.world.fitness={version:1,date:`${2025+c.season}-08-01`,energy:Object.fromEntries(c.world.players.map(p=>[p.profileId,100]))};
 c.setup.dataStatus='unverified-preview';c.setup.rosterCutoff='2026-10-21';c.setup.verifiedOpeningDay=false;
 for(const p of c.world.players){const fact=SUPER_SOURCE_FACTS[p.profileId];if(fact){p.birthDate=fact.birthDate;p.birthDateEvidence=structuredClone(fact.evidence);}}
 const sheet=selectPositionTeam(c.xi.concat(c.bench).map(sandboxProfile),c.formation);c.formation=sheet.formation;const all=c.xi.concat(c.bench);c.xi=sheet.xi;c.bench=all.filter(id=>!c.xi.includes(id));
 c.competition=sandboxCompetition(c);c.competition.fieldLabel='Super League + Super Cup · unverified October preview';enableSuperSeason(c);if(options.incidents!==false)enableIncidentCareer(c);return c;
}
export function enableIncidentCareer(c){
 if(c.connected.calendar.fixtures.some(f=>f.status==='complete')||c.world.availability)throw Error('Incident rules require a new, unplayed career.');c.matchRulesVersion=4;c.statisticsVersion=3;c.world.availability=createAvailability();c.world.matchPeople=Object.fromEntries(c.world.players.map(p=>[p.profileId,{personId:p.id,name:sandboxProfile(p.profileId).name}]));syncSandboxTeams(c);return c;
}
export function createVerifiedSuperCareer(){
 // No unchecked ready flag may unlock the candidate or silently reuse October data.
 throw Error(`Verified opening-day career is locked: ${SUPER_OPENING_AUDIT.errors.length} data checks remain. Existing sandbox careers remain available.`);
}
