import {simulatePhysical} from './fixture-engine.js';
export const clone=o=>JSON.parse(JSON.stringify(o));
export function rng(seed){let x=seed>>>0;return ()=>{x=(Math.imul(x,1664525)+1013904223)>>>0;return x/4294967296;};}
export function shuffle(items,seed){const a=[...items],r=rng(seed);for(let i=a.length-1;i>0;i--){const j=Math.floor(r()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
export function europeanSchedule(ids){if(ids.length!==36||new Set(ids).size!==36)throw Error('European league requires 36 unique teams');const rounds=Array.from({length:8},()=>[]);[1,2,3,5].forEach((offset,k)=>{const seen=new Set();for(let start=0;start<36;start++){if(seen.has(start))continue;let v=start,j=0;do{seen.add(v);const next=(v+offset)%36;rounds[k*2+j%2].push([ids[v],ids[next]]);v=next;j++;}while(v!==start);}});return rounds;}
export function leagueSchedule(ids){if(ids.length%2||new Set(ids).size!==ids.length)throw Error('Even number of unique clubs required');let ring=[...ids],rounds=[];for(let r=0;r<ids.length-1;r++){let matches=[];for(let i=0;i<ids.length/2;i++){const pair=[ring[i],ring[ids.length-1-i]];matches.push((r+i)%2?pair.reverse():pair);}rounds.push(matches);ring=[ring[0],ring.at(-1),...ring.slice(1,-1)];}return rounds.concat(rounds.map(round=>round.map(([a,b])=>[b,a])));}
const poisson=(lambda,r)=>{let n=0,p=1,l=Math.exp(-lambda);do{n++;p*=r();}while(p>l&&n<15);return n-1;};
export function simulateFixture(home,away,seed,decisive=false){const r=rng(seed),h=Math.max(.22,Math.min(3.7,1.35*Math.exp((home.attack-away.defense+3)/24))),a=Math.max(.20,Math.min(3.4,1.22*Math.exp((away.attack-home.defense)/24)));const score=[poisson(h,r),poisson(a,r)],events=[];score.forEach((goals,team)=>{for(let g=0;g<goals;g++)events.push({minute:1+Math.floor(r()*90),team,type:'goal'});});events.sort((a,b)=>a.minute-b.minute);let pens=null,winner=score[0]>score[1]?home.id:score[0]<score[1]?away.id:null;if(decisive&&!winner){pens=[3+Math.floor(r()*3),2+Math.floor(r()*3)];if(pens[0]===pens[1])pens[r()>.5?0:1]++;winner=pens[0]>pens[1]?home.id:away.id;}return {home:home.id,away:away.id,score,events,pens,winner,seed};}
export function standings(c){const table=c.teams.map(t=>({id:t.id,name:t.name,p:0,w:0,d:0,l:0,gf:0,ga:0,pts:0}));for(const m of c.results.filter(r=>r.stage==='league')){const h=table.find(t=>t.id===m.home),a=table.find(t=>t.id===m.away);h.p++;a.p++;h.gf+=m.score[0];h.ga+=m.score[1];a.gf+=m.score[1];a.ga+=m.score[0];if(m.score[0]>m.score[1]){h.w++;h.pts+=3;a.l++;}else if(m.score[0]<m.score[1]){a.w++;a.pts+=3;h.l++;}else{h.d++;a.d++;h.pts++;a.pts++;}}return table.sort((a,b)=>b.pts-a.pts||(b.gf-b.ga)-(a.gf-a.ga)||b.gf-a.gf||a.id.localeCompare(b.id));}
export function createCompetition(teams,{seed=123,format='europe',user='user'}={}){if(new Set(teams.map(t=>t.id)).size!==teams.length)throw Error('Duplicate club');const c={version:1,engineVersion:teams.every(t=>t.roster)?'2.0.0':'legacy',teams:clone(teams),seed,format,user,round:0,results:[],stage:format==='clubcup'?'Quarter-finals':'league',ties:[],eliminated:false,champion:null};c.schedule=format==='europe'?europeanSchedule(shuffle(teams.map(t=>t.id),seed)):format==='league'?leagueSchedule(teams.map(t=>t.id)):[];if(format==='clubcup')c.ties=teams.reduce((a,t,i)=>{if(i%2===0)a.push([t.id,teams[i+1].id]);return a;},[]);return c;}
export function advance(c,overrides={},options={}){if(c.champion)return [];const team=id=>c.teams.find(t=>t.id===id),fresh=[];const play=(a,b,decisive=false,leg=1)=>{const seed=c.seed+c.results.length*7919+17;const supplied=overrides[a+'|'+b+'|'+seed];if(supplied&&(supplied.home!==a||supplied.away!==b||supplied.seed!==seed))throw Error('Fixture result does not match this schedule.');const fast=options.fast||(options.fastBackground&&a!==c.user&&b!==c.user);const result=supplied||(fast?simulateFast:c.engineVersion==='2.0.0'?simulatePhysical:simulateFixture)(team(a),team(b),seed,decisive);if(a!==c.user&&b!==c.user){delete result.definition;delete result.condition;delete result.played;delete result.playerStats;result.events=result.events.filter(e=>e.type==='goal');result.commands=[];}const m={...result,stage:c.stage,round:c.round+1,leg};c.results.push(m);fresh.push(m);return m;};
 if(c.stage==='league'){for(const [a,b] of c.schedule[c.round])play(a,b);c.round++;if(c.round===c.schedule.length){const table=standings(c);if(c.format==='league'){c.champion=table[0].id;c.stage='complete';return fresh;}c.direct=table.slice(0,8).map(t=>t.id);const middle=table.slice(8,24).map(t=>t.id);c.ties=Array.from({length:8},(_,i)=>[middle[i],middle[15-i]]);c.stage='Play-offs';c.round=0;if(!table.slice(0,24).some(t=>t.id===c.user))c.eliminated=true;}}
 else{const winners=[];
 if(c.engineVersion==='2.0.0'&&c.format!=='clubcup'&&c.stage!=='Final'&&(c.knockoutLeg||1)===1){
  c.firstLegResults={};for(const [a,b] of c.ties)c.firstLegResults[a+'|'+b]=play(a,b,false,1);c.knockoutLeg=2;return fresh;
 }
 for(const [a,b] of c.ties){if(c.format==='clubcup'||c.stage==='Final'){winners.push(play(a,b,true).winner);}else{const first=c.engineVersion==='2.0.0'?c.firstLegResults[a+'|'+b]:play(a,b,false,1),second=play(b,a,false,2),agg=[first.score[0]+second.score[1],first.score[1]+second.score[0]];let winner=agg[0]>agg[1]?a:agg[0]<agg[1]?b:null;if(!winner){const r=rng(c.seed+c.results.length);const pens=[3+Math.floor(r()*3),3+Math.floor(r()*3)];if(pens[0]===pens[1])pens[0]++;second.pens=pens;winner=pens[0]>pens[1]?a:b;second.penaltyWinner=winner;second.penaltyHome=a;}second.aggregate=agg;second.aggregateHome=a;second.tieWinner=winner;winners.push(winner);}}
  c.knockoutLeg=1;c.firstLegResults=null;
  if(c.ties.some(t=>t.includes(c.user))&&!winners.includes(c.user))c.eliminated=true;
  if(c.stage==='Play-offs'){const seeded=c.direct;c.ties=seeded.map((id,i)=>[id,winners[7-i]]);c.stage='Round of 16';}
  else if(winners.length===1){c.champion=winners[0];c.stage='complete';c.ties=[];}
  else{c.ties=winners.reduce((a,id,i)=>{if(i%2===0)a.push([id,winners[i+1]]);return a;},[]);c.stage=winners.length===8?'Quarter-finals':winners.length===4?'Semi-finals':'Final';}
 }
 return fresh;
}

export function simulateFast(home,away,seed,decisive=false){
 const strength=t=>{if(!t.roster)return t;const xi=t.xi?t.xi.map(id=>t.roster.find(p=>p.id===id)).filter(Boolean):[...t.roster].sort((a,b)=>b.rating-a.rating).slice(0,11);const avg=k=>xi.reduce((n,p)=>n+(p[k]??p.rating),0)/xi.length;const ready=t.managerTactics?xi.reduce((n,p)=>n+(.8+.2*(p.energy??100)/100),0)/xi.length:1,press=t.managerTactics&&t.preset==='press',protect=t.managerTactics&&t.preset==='protect',direct=t.managerTactics?.build==='direct';return {...t,attack:avg('attack')*ready*(press?1.06:protect?.94:1)*(direct?1.02:1),defense:avg('defense')*ready*(press?.98:protect?1.05:1)};};
 return {...simulateFixture(strength(home),strength(away),seed,decisive),engineVersion:'fast-season-1',simulation:'Fast statistical simulation · no physical replay'};
}
export function simulateRemainingLeague(c){
 if(c.format!=='league')throw Error('Full league simulation requires a league season.');
 const results=[];let guard=0;while(!c.champion&&guard++<c.schedule.length)results.push(...advance(c,{}, {fast:true}));return results;
}

export function upcomingFixtures(c){
 if(c.champion)return [];
 const pairs=c.stage==='league'?c.schedule[c.round]:c.ties.map(([a,b])=>(c.knockoutLeg||1)===2?[b,a]:[a,b]);
 return pairs.map(([home,away],i)=>({home,away,seed:c.seed+(c.results.length+i)*7919+17,decisive:c.stage!=='league'&&(c.format==='clubcup'||c.stage==='Final'),stage:c.stage,leg:c.stage==='league'?1:c.knockoutLeg||1}));
}
