import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {parse} from 'csv-parse/sync';
import {gunzipSync} from 'node:zlib';
import {ENGLISH_PLAYERS} from '../dist/english-catalog.js';
const checked='2026-10-21',cutoff='2026-07-06',repo='https://github.com/dcaribou/transfermarkt-datasets';
const root='https://pub-e682421888d945d684bcae8890b0ec20.r2.dev/data/';
await mkdir('work/contracts',{recursive:true});
async function csv(name){let raw;try{raw=await readFile('work/contracts/'+name+'.csv','utf8');}catch{const r=await fetch(root+name+'.csv.gz');if(!r.ok)throw Error('Dataset HTTP '+r.status);raw=gunzipSync(Buffer.from(await r.arrayBuffer())).toString();await writeFile('work/contracts/'+name+'.csv',raw);}return parse(raw,{columns:true,skip_empty_lines:true});}
const players=await csv('players'),valuations=await csv('player_valuations'),latest=new Map();
for(const row of valuations)if(row.date<=checked&&(!latest.has(row.player_id)||latest.get(row.player_id).date<row.date))latest.set(row.player_id,row);
let fx;try{fx=JSON.parse(await readFile('work/contracts/fx.json','utf8'));}catch{fx=await(await fetch('https://api.frankfurter.dev/v1/2026-10-20?base=EUR&symbols=GBP')).json();}
if(fx.base!=='EUR'||fx.date!=='2026-10-20'||!Number.isFinite(fx.rates?.GBP)||fx.rates.GBP<.5||fx.rates.GBP>1.5)throw Error('Invalid EUR/GBP reference rate/date.');
export const normalize=name=>String(name||'').normalize('NFD').replace(/\p{Diacritic}/gu,'').replace(/[øØ]/g,'o').replace(/[^a-z0-9]/gi,'').toLowerCase();
const tokens=name=>String(name||'').normalize('NFD').replace(/\p{Diacritic}/gu,'').toLowerCase().split(/[^a-z0-9ø]+/).filter(w=>w.length>2);
const overlap=(a,b)=>tokens(a).filter(w=>tokens(b).includes(w)).length;
const active=players.filter(p=>Number(p.last_season)>=2025),records={},unmatched=[],ambiguous=[];
for(const p of ENGLISH_PLAYERS){
 let candidates=active.filter(q=>normalize(q.name)===normalize(p.name)&&(!p.birthDate||q.date_of_birth?.slice(0,10)===p.birthDate));let method='exact-name';
 if(candidates.length!==1&&p.birthDate){candidates=active.filter(q=>q.date_of_birth?.slice(0,10)===p.birthDate&&overlap(p.name,q.name)>0);method='birth-date-and-name';}
 if(candidates.length!==1){candidates=active.filter(q=>tokens(q.name).length>=2&&tokens(q.name).every(t=>tokens(p.name).includes(t))&&(!p.birthDate||q.date_of_birth?.slice(0,10)===p.birthDate));method='complete-short-name';}
 if(candidates.length!==1){(candidates.length?ambiguous:unmatched).push({id:p.id,name:p.name,club:p.club,candidates:candidates.map(q=>({id:q.player_id,name:q.name,birthDate:q.date_of_birth,club:q.current_club_name}))});continue;}
 const row=candidates[0],valuation=latest.get(row.player_id),eur=Number(valuation?.market_value_in_eur||row.market_value_in_eur),end=row.contract_expiration_date?.slice(0,10)||null;
 records[p.id]={playerId:p.id,providerId:row.player_id,name:row.name,matchMethod:method,birthDate:row.date_of_birth?.slice(0,10)||null,position:row.sub_position||null,foot:row.foot||null,heightCm:Number(row.height_in_cm)||null,nationality:row.country_of_citizenship||null,sourceClub:row.current_club_name,source:row.url,checked,snapshot:cutoff,marketValue:eur>0?{eur,gbp:Math.round(eur*fx.rates.GBP),date:valuation?.date||null,status:'published-estimate',source:row.url}:null,contract:end?{end,precision:'day',status:'snapshot-reported',source:row.url,asOf:cutoff}:null,wage:null};
}
const overrides=JSON.parse(await readFile('data/manager/player-intelligence-overrides.json','utf8'));
for(const override of overrides.players){const target=ENGLISH_PLAYERS.filter(p=>p.name===override.name);if(target.length!==1)throw Error('Override needs an exact unique snapshot name: '+override.name);const id=target[0].id;records[id]={...(records[id]||{playerId:id,name:target[0].name,checked}),...override.fields};}
const meta={version:1,checked,snapshot:cutoff,source:repo,license:'CC0-1.0',fx:{base:'EUR',quote:'GBP',rate:fx.rates.GBP,date:fx.date,source:'https://api.frankfurter.dev/v1/'+fx.date+'?base=EUR&symbols=GBP',provider:'ECB reference via Frankfurter'},coverage:{total:ENGLISH_PLAYERS.length,matched:Object.keys(records).length,marketValues:Object.values(records).filter(p=>p.marketValue).length,contracts:Object.values(records).filter(p=>p.contract).length,reportedWages:Object.values(records).filter(p=>p.wage).length,unmatched:unmatched.length,ambiguous:ambiguous.length}};
await writeFile('data/manager/player-intelligence.json',JSON.stringify({meta,players:records},null,2)+'\n');
await writeFile('data/manager/player-intelligence-audit.json',JSON.stringify({meta,unmatched,ambiguous},null,2)+'\n');
await writeFile('dist/player-intelligence-data.js','// Dated published football estimates; see data/manager/player-intelligence-audit.json.\nexport const INTELLIGENCE_META='+JSON.stringify(meta)+';\nexport const PLAYER_INTELLIGENCE='+JSON.stringify(records)+';\n');
console.log(JSON.stringify(meta.coverage,null,2));
