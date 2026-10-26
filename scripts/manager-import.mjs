// Pure transformation keeps source refresh and curation reproducible/testable.
export function applyManagerCuration(data,curation,audit=null){
 if(curation.version!==1)throw Error('Unsupported curation version.');
 const next=structuredClone(data),seen=new Set();next.backgroundClubs=structuredClone(curation.backgroundClubs||[]);
 for(const club of next.clubs)for(const player of club.players){
  player.owner=club.id;player.registeredClub=null;player.registrationStatus='unverified';
  const row=audit?.players.find(row=>row.player===player.id);
  if(row?.status==='matched-active'&&row.matchedClub===club.id){player.registeredClub=club.id;player.registrationStatus='active';player.registrationSource=audit.source;}
  if(row?.status==='listed-loan-out'){player.registrationStatus='loan-out';player.registrationSource=audit.source;player.registrationNote='Listed as loaned out in the official submitted squad list. Borrowing club and return date require verification.';}
  const override=curation.players[player.id];if(!override)continue;
  seen.add(player.id);
  // Curation cannot silently replace identity, ratings or parent ownership.
  for(const key of ['birthDate','birthDateSource','registeredClub','registrationSource','registrationNote','registrationStatus','loanEnd'])if(override[key]!==undefined)player[key]=override[key];
 }
 for(const id of Object.keys(curation.players))if(!seen.has(id))throw Error('Curated player disappeared from source: '+id);
 next.coverage=next.coverage.split(' Parent ownership is a source association')[0]+' Parent ownership is a source association pending individual audit; active registration must be independently verified. Loaned-out players are not eligible at their parent club.';
 return next;
}
