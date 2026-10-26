import {readFile,writeFile} from 'node:fs/promises';
import {parse} from 'csv-parse/sync';
import {ENGLISH_PACKS} from '../dist/english-catalog.js';
import {authoredProfile} from '../dist/authored-profiles.js';
import {FIELD} from '../dist/club-field.js';
// Reproducible from the checked-in source snapshot; never mutates old catalogs.
const snapshot=JSON.parse(await readFile('data/manager/super-roster-snapshot.json','utf8'));
const reference=JSON.parse(await readFile('data/manager/player-intelligence.json','utf8'));
const csv=parse(await readFile('work/contracts/players.csv','utf8'),{columns:true,skip_empty_lines:true}).filter(p=>Number(p.last_season)>=2025);
const values=parse(await readFile('work/contracts/player_valuations.csv','utf8'),{columns:true,skip_empty_lines:true}),latest=new Map();for(const v of values)if(v.date<='2026-10-21'&&(!latest.has(v.player_id)||latest.get(v.player_id).date<v.date))latest.set(v.player_id,v);
const norm=s=>String(s||'').normalize('NFD').replace(/\p{Diacritic}/gu,'').replace(/[øØ]/g,'o').toLowerCase().replace(/[^a-z0-9]/g,'');
const words=s=>String(s||'').normalize('NFD').replace(/\p{Diacritic}/gu,'').toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
const records={},unmatched=[],foreign=[];
for(const club of snapshot.clubs){
 const players=club.players.map((p,i)=>{
  let candidates=csv.filter(q=>norm(q.name)===norm(p.name)&&(!p.birthDate||q.date_of_birth?.slice(0,10)===p.birthDate));let method='exact-name';
  if(candidates.length!==1){const tokens=words(p.name);candidates=csv.filter(q=>tokens.every(t=>words(q.name).includes(t)));method='complete-source-label';}
  if(candidates.length!==1&&p.birthDate){candidates=csv.filter(q=>q.date_of_birth?.slice(0,10)===p.birthDate&&words(p.name).some(w=>words(q.name).includes(w)));method='primary-birth-date-and-name';}
  // Short labels require club evidence or a corroborating primary birth date.
  if(candidates.length!==1||(words(p.name).length===1&&!p.birthDate)){const scoped=candidates.filter(q=>club.providerNames.some(n=>norm(q.current_club_name).includes(norm(n))));if(scoped.length===1)candidates=scoped;else if(words(p.name).length===1)candidates=[];}
  const q=candidates.length===1?candidates[0]:null,id='super-'+club.slug+'-'+(p.uefaId||norm(p.name)),personId=q?'tm-'+q.player_id:p.uefaId?'uefa-'+p.uefaId:'uefa-'+club.slug+'-'+norm(p.name);
  if(!q)unmatched.push({club:club.club,name:p.name,candidates:candidates.length});
  if(q){const v=latest.get(q.player_id),eur=Number(v?.market_value_in_eur||q.market_value_in_eur),end=q.contract_expiration_date?.slice(0,10)||null;records[id]={playerId:id,providerId:q.player_id,name:q.name,matchMethod:method,birthDate:q.date_of_birth?.slice(0,10)||null,position:q.sub_position,foot:q.foot,heightCm:Number(q.height_in_cm)||null,nationality:q.country_of_citizenship,sourceClub:q.current_club_name,source:q.url,checked:'2026-10-21',snapshot:'2026-07-06',marketValue:eur>0?{eur,gbp:Math.round(eur*reference.meta.fx.rate),date:v?.date,status:'published-estimate',source:q.url}:null,contract:end?{end,precision:'day',status:'snapshot-reported',source:q.url,asOf:'2026-07-06'}:null,wage:null};}
  if(!q&&p.birthDate)records[id]={playerId:id,name:p.name,birthDate:p.birthDate,source:p.identitySource,checked:snapshot.checked,snapshot:snapshot.checked,marketValue:null,contract:null,wage:null};
  const full=authoredProfile(p,club.rating),short=authoredProfile({...p,name:p.profileName||p.name},club.rating),profile=full.ratingSource==='Touchline individual profile'?full:short;return {...profile,id,personId,providerId:q?.player_id||null,name:words(p.name).length===1&&q?q.name:p.name,birthDate:p.birthDate||q?.date_of_birth?.slice(0,10)||null,club:club.club,era:'2026–27',color:club.color,source:club.source,checked:snapshot.checked,cost:Math.max(12,Math.round((profile.rating-65)*.85)),number:i+1};
 });foreign.push({...club,id:'super-'+club.slug,budget:club.budgetGbp/500000,year:2026,era:'2026–27',current:true,checked:snapshot.checked,players});
}
// A current UEFA registration takes precedence over a fantasy-feed association.
const claimed=new Map();for(const p of foreign.flatMap(c=>c.players)){if(claimed.has(p.personId))throw Error('Duplicate foreign identity '+p.name);claimed.set(p.personId,p.club);}
const foreignReferenceMatches=Object.values(records).filter(p=>p.providerId).length;
const aliases={'Manchester City':'Man City','Manchester United':'Man United'},conflicts=[],english=ENGLISH_PACKS.map(c=>({...c,country:'ENG',players:c.players.filter(p=>{const id=reference.players[p.id]?.providerId;const conflict=id&&claimed.get('tm-'+id);if(conflict){conflicts.push({id:p.id,name:p.name,feedClub:c.club,registeredSnapshotClub:conflict});return false;}return true;}).map(p=>{
 const source=FIELD.find(t=>t.name===(aliases[c.club]||c.club)),short=source?.roster.filter(q=>words(q.name).every(w=>words(p.name).includes(w))).sort((a,b)=>b.name.length-a.name.length)[0]?.name;
 const natural=reference.players[p.id]?.position||'',role=/winger|striker|forward/i.test(natural)?'FWD':/back|defender/i.test(natural)?'DEF':/goalkeeper/i.test(natural)?'GK':/midfield/i.test(natural)?'MID':p.role;
 const profile=authoredProfile({...p,role,name:short||p.name},source?.rating||Math.round(80+c.budget/40)),id='world-'+p.id;
 if(reference.players[p.id])records[id]={...reference.players[p.id],playerId:id};
 return {...p,...profile,id,name:p.name,sourcePlayerId:p.id,sourceRole:p.role,roleSource:natural?'Touchline broad role from dated published natural position':'Source broad role',personId:reference.players[p.id]?.providerId?'tm-'+reference.players[p.id].providerId:p.personId,providerId:reference.players[p.id]?.providerId||null};
})}));
const manifest=JSON.parse(await readFile('data/manager/super-membership.json','utf8'));
const world=english.concat(foreign),packs=manifest.clubs.map(m=>{const p=world.find(p=>p.club===m.club);if(!p)throw Error('Missing club '+m.club);return {...p,...m,budget:m.budgetGbp/500000,qualificationSource:manifest.sources[m.country],qualificationSeason:manifest.qualificationSeason};});
const seen=new Set();for(const c of world)for(const p of c.players){if(seen.has(p.personId))throw Error('Duplicate world identity '+p.name);seen.add(p.personId);}
const audit={checked:snapshot.checked,clubs:packs.length,players:packs.flatMap(p=>p.players).length,foreignPlayers:foreign.flatMap(p=>p.players).length,foreignReferenceMatches,worldPlayers:world.flatMap(c=>c.players).length,unknownBirthDates:world.flatMap(c=>c.players).filter(p=>!p.birthDate).length,unmatched,conflicts,ownership:'Initial ownership is authored for this fictional sandbox, not a verified domestic registration/loan dataset.'};
await writeFile('data/manager/super-audit.json',JSON.stringify(audit,null,2)+'\n');
await writeFile('dist/super-catalog.js','// Generated dated sandbox profiles; see data/manager/super-audit.json.\nexport const WORLD_PACKS='+JSON.stringify(world)+';\nexport const SUPER_PACKS='+JSON.stringify(packs)+';\nexport const SUPER_PLAYERS=WORLD_PACKS.flatMap(c=>c.players);\nexport const SUPER_AUDIT='+JSON.stringify(audit)+';\nexport const SUPER_MEMBERSHIP='+JSON.stringify(manifest)+';\n');
await writeFile('dist/super-intelligence-data.js','// Dated references, not current registration or guaranteed transfer prices.\nexport const SUPER_INTELLIGENCE='+JSON.stringify(records)+';\n');
console.log(JSON.stringify({...audit,unmatched:unmatched.length,conflicts:conflicts.length}));
