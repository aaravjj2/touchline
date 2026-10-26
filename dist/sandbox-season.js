import {isSuperCareer,nextSuperCareerSeason} from './super-season.js';
import {sandboxRoundReceipt,hasSandboxWorld,settleSandboxRound,sandboxProfile,sandboxCompetition,sandboxFinance} from './sandbox-world.js';
import {gbpToUnits,wageCharge} from './manager-money.js';
import {managerAfterFixture,managerNextSeason,managerBeforeFixture,managerProfile} from './manager-career.js';
import {MANAGERS} from './legends.js';
import {withFamiliarity} from './europe-clubs.js';
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
export function prepareSandboxMatchday(c){
 managerBeforeFixture(c);const all=c.xi.concat(c.bench),ps=c.xi.map(sandboxProfile),m=c.management;
 if(c.preparedRound!==c.competition.round){for(const id of all)c.condition[id].energy=Math.min(100,c.condition[id].energy+(c.training==='recovery'?24:c.training==='development'?10:17));c.preparedRound=c.competition.round;}
 const avg=k=>ps.reduce((n,p)=>n+p[k]+c.condition[p.id].growth,0)/11,chemistry=Math.min(100,Math.round(ps.reduce((n,p,i)=>n+ps.slice(i+1).filter(q=>q.club===p.club).length,0)*7)),coach=MANAGERS.find(m=>m.id===c.manager)||MANAGERS[0],health=ps.reduce((n,p)=>n+(.82+c.condition[p.id].energy*.0015+(c.condition[p.id].morale-65)*.0007),0)/11;
 const roster=withFamiliarity(all.map(id=>{const p=sandboxProfile(id),s=c.condition[id];return managerProfile(c,{...p,rating:p.rating+s.growth,attack:p.attack+s.growth,defense:p.defense+s.growth,control:p.control+s.growth,energy:s.energy});}),c.xi);
 Object.assign(c.competition.teams.find(t=>t.id==='user'),{formation:c.formation,xi:[...c.xi],roster,rating:Math.round(avg('rating')),chemistry,attack:(avg('attack')+chemistry*.025)*coach.attack*health,defense:(avg('defense')+chemistry*.025)*coach.defense*health,preset:m.preset,matchBench:m.matchBench,managerTactics:{build:m.build,roles:m.roles}});
}
export function applySandboxMatchday(c,results){
 if(!hasSandboxWorld(c))throw Error('This career has no shared world.');
 const round=c.competition.round-1,id=c.season+':'+round,m=results.find(r=>r.home==='user'||r.away==='user'),record=c.competition.results.find(r=>r.round===round+1&&(r.home==='user'||r.away==='user'));
 if(!m||!record||m.seed!==record.seed||m.score.join(':')!==record.score.join(':'))throw Error('Conflicting matchday result.');if(c.world.processedRounds.includes(id))return false;
 const all=c.xi.concat(c.bench),home=m.home==='user',score=home?m.score:[...m.score].reverse(),win=score[0]>score[1],draw=score[0]===score[1];
 c.credits+=gbpToUnits(sandboxRoundReceipt(c,round));c.credits-=wageCharge(c,all.reduce((n,id)=>n+c.condition[id].wage,0),round);
 for(const id of all){const p=sandboxProfile(id),s=c.condition[id],played=m.played?.[home?0:1]?.includes(id)??c.xi.includes(id);s.energy=m.engineVersion==='2.0.0'&&m.condition?.[id]!==undefined?m.condition[id]:clamp(s.energy-(played?(20+(100-p.stamina)*.25)*(c.management.preset==='press'?1.25:c.management.preset==='protect'?.85:1):0),25,100);s.morale=clamp(s.morale+(played?(win?3:draw?0:-3):-1),20,95);if(played)s.growth=Math.min(3,s.growth+(c.training==='development'?.12:.045));}
 c.history.push({round:round+1,opponent:c.competition.teams.find(t=>t.id===(home?m.away:m.home)).name,home,score});settleSandboxRound(c,round);managerAfterFixture(c,m);return true;
}
export function nextSandboxSeason(c){
 if(isSuperCareer(c))return nextSuperCareerSeason(c);
 if(!c.competition.champion)throw Error('Complete the current season first.');const next=structuredClone(c);next.season++;next.trust=Math.max(55,next.trust);next.history=[];delete next.preparedRound;managerNextSeason(next);next.competition=sandboxCompetition(next);return next;
}
