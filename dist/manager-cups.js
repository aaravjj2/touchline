import {shuffle,simulateFixture,rng} from './competition.js';
export const FA_CUP_ROUNDS=['extra-preliminary','preliminary','first-qualifying','second-qualifying','third-qualifying','fourth-qualifying','first-proper','second-proper','third-proper','fourth-proper','fifth-proper','quarter-final','semi-final','final'];
export const FA_2026_RULES={id:'fa-2026',season:'2026–27',source:'https://www.thefa.com/-/media/thefacom-new/files/competitions/2026-27/rules/rules-of-the-fa-challenge-cup-2026-27.ashx',qualifyingReplay:true,extraTimeMinutes:30,penalties:true,verifiedRules:[86,87]};
export function createFACup(data,{seed=123}={}){
 if(data.version!==1||data.season!==FA_2026_RULES.season||data.clubs?.length!==743||new Set(data.clubs.map(c=>c.id)).size!==743||data.clubs.some(c=>!c.name||!FA_CUP_ROUNDS.includes(c.entryRound)))throw Error('Complete verified 2026–27 FA Cup entrants required.');
 const cup={version:1,id:'fa-2026:'+seed,rules:FA_2026_RULES.id,seed,clubs:structuredClone(data.clubs),round:0,results:[],ties:[],survivors:[],champion:null};draw(cup);return cup;
}
function draw(cup){
 const entering=cup.clubs.filter(c=>c.entryRound===FA_CUP_ROUNDS[cup.round]).map(c=>c.id),pool=shuffle([...cup.survivors,...entering],cup.seed+cup.round*7919);
 if(!pool.length||pool.length%2||new Set(pool).size!==pool.length)throw Error('Invalid cup access list.');
 cup.ties=[];for(let i=0;i<pool.length;i+=2)cup.ties.push({id:cup.id+':'+cup.round+':'+i/2,home:pool[i],away:pool[i+1],seed:cup.seed+cup.round*100003+i,replay:null,winner:null,result:null});
}
export function pendingCupFixtures(cup){return cup.champion?[]:cup.ties.filter(t=>!t.winner).map(t=>t.replay&&!t.replay.result?{...t.replay,round:FA_CUP_ROUNDS[cup.round],isReplay:true}:{id:t.id,home:t.home,away:t.away,seed:t.seed,round:FA_CUP_ROUNDS[cup.round],isReplay:false});}
const poisson=(mean,random)=>{let p=1,n=0,l=Math.exp(-mean);do{p*=random();n++;}while(p>l&&n<15);return n-1;};
export function simulateCupGame(home,away,fixture){
 const result=simulateFixture(home,away,fixture.seed,false);result.kind='statistical';result.simulation='Statistical cup simulation; no physical replay';
 if(result.winner||(!fixture.isReplay&&FA_CUP_ROUNDS.indexOf(fixture.round)<6))return result;
 const random=rng(fixture.seed^0x41ca);result.regulationScore=[...result.score];result.extraTimeMinutes=30;
 result.extraTimeScore=[poisson(.45*Math.exp((home.attack-away.defense)/30),random),poisson(.4*Math.exp((away.attack-home.defense)/30),random)];result.score=result.score.map((n,i)=>n+result.extraTimeScore[i]);
 result.winner=result.score[0]>result.score[1]?home.id:result.score[0]<result.score[1]?away.id:null;
 if(!result.winner){const pens=[0,0];for(let i=0;i<5;i++){pens[0]+=random()<.76?1:0;pens[1]+=random()<.76?1:0;}let tries=0;while(pens[0]===pens[1]&&tries++<30){pens[0]+=random()<.76?1:0;pens[1]+=random()<.76?1:0;}if(pens[0]===pens[1])pens[0]++;result.pens=pens;result.winner=pens[0]>pens[1]?home.id:away.id;}
 return result;
}
export function commitCupGame(cup,fixtureId,result){
 const t=cup.ties.find(t=>t.id===fixtureId||t.replay?.id===fixtureId);
 const previous=cup.results.find(r=>r.fixtureId===fixtureId);
 if(previous){if(JSON.stringify(previous.result)!==JSON.stringify(result))throw Error('Conflicting cup result retry.');return false;}
 if(!t||t.winner)throw Error('Unknown or completed cup fixture.');const f=t.replay?.id===fixtureId?t.replay:t;
 if(f!==t&&!t.result)throw Error('First match has not been played.');
 if(result.home!==f.home||result.away!==f.away||result.seed!==f.seed||!Array.isArray(result.score)||result.score.length!==2||result.score.some(n=>!Number.isInteger(n)||n<0))throw Error('Cup fixture identity mismatch.');
 const isDraw=result.score[0]===result.score[1],replay=isDraw&&f===t&&cup.round<6;
 if(!replay){
  if(![f.home,f.away].includes(result.winner))throw Error('Decisive cup fixture needs a winner.');
  if(isDraw&&(!result.pens||result.pens[0]===result.pens[1]||result.extraTimeMinutes!==30))throw Error('Level decisive fixture needs extra time and penalties.');
  if(!isDraw&&result.winner!==(result.score[0]>result.score[1]?f.home:f.away))throw Error('Cup winner does not match the score.');
 }
 cup.results.push({fixtureId,round:FA_CUP_ROUNDS[cup.round],isReplay:f!==t,result:structuredClone(result)});f.result=structuredClone(result);
 if(replay)t.replay={id:t.id+':replay',home:t.away,away:t.home,seed:t.seed+1,result:null};else t.winner=result.winner;
 if(cup.ties.every(t=>t.winner)){cup.survivors=cup.ties.map(t=>t.winner);if(cup.survivors.length===1&&cup.round===FA_CUP_ROUNDS.length-1)cup.champion=cup.survivors[0];else{cup.round++;draw(cup);}}
 return true;
}
