import {ENGLISH_PLAYERS} from './english-catalog.js';
import {FOUNDING_PLAYERS} from './founding-squad.js';
import {intelligenceFor,gameFinancialProfile,contractApplies,INTELLIGENCE_META} from './player-intelligence.js';
import {gbpToUnits} from './manager-money.js';
export function seedEnglishFinances(c){
 if(c.setup?.kind!=='english-sandbox'||c.economy)return;
 c.economy={version:2,currency:'GBP',unitGbp:500000,sourceSnapshot:INTELLIGENCE_META.snapshot,fx:structuredClone(INTELLIGENCE_META.fx)};
 for(const id of c.xi.concat(c.bench)){
  const player=ENGLISH_PLAYERS.find(p=>p.id===id)||FOUNDING_PLAYERS.find(p=>p.id===id);if(!player)continue;const profile=gameFinancialProfile(player),data=intelligenceFor(player),s=c.condition[id];
  s.wage=gbpToUnits(profile.wageGbp);s.wageBasis=profile.wageSource;
  if(contractApplies(player,data)){
   const end=data.contract.end,year=Number(end.slice(0,4));
   if(year>2026){s.contract=Math.max(1,(year-2026)*38);s.contractBasis=data.contract.status;s.publishedContractEnd=end;}
  }
 }
}
