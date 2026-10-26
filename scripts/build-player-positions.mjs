import fs from 'node:fs';
import {parse} from 'csv-parse/sync';
import {LEGENDS} from '../dist/legends.js';
import {ENGLISH_PLAYERS} from '../dist/english-catalog.js';
import {SUPER_PLAYERS} from '../dist/super-catalog.js';
import {FOUNDING_PLAYERS} from '../dist/founding-squad.js';
import {FIELD} from '../dist/club-field.js';
import {PACKS} from '../dist/legends.js';
import {HISTORICAL_POSITIONS} from './historical-positions.mjs';
import {WORLD_PACKS} from '../dist/super-catalog.js';
import {intelligenceFor} from '../dist/player-intelligence.js';
const rows=parse(fs.readFileSync('work/contracts/players.csv'),{columns:true,skip_empty_lines:true});
const norm=s=>String(s).normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/ł/g,'l').replace(/ø/g,'o').toLowerCase().replace(/[^a-z]/g,'');
const byId=new Map(rows.map(p=>[p.player_id,p])),names=new Map();
for(const row of rows){for(const name of [row.name,[row.first_name,row.last_name].join(' ')]){const key=norm(name);if(!names.has(key))names.set(key,[]);if(!names.get(key).includes(row))names.get(key).push(row);}}
const positions={'Goalkeeper':'GK','Centre-Back':'CB','Left-Back':'LB','Right-Back':'RB','Defensive Midfield':'DM','Central Midfield':'CM','Attacking Midfield':'AM','Left Midfield':'LM','Right Midfield':'RM','Left Winger':'LW','Right Winger':'RW','Centre-Forward':'ST','Second Striker':'SS'};
const world=WORLD_PACKS.flatMap(p=>p.players),all=[...ENGLISH_PLAYERS,...SUPER_PLAYERS,...world,...LEGENDS,...FIELD.flatMap(t=>t.roster),...FOUNDING_PLAYERS],result={},unresolved=[];
// Name matching is accepted only when unique. Ambiguous and absent records remain unverified.
for(const p of all){
 const reference=intelligenceFor(p);if(positions[reference?.position]){result[p.id]={positions:[positions[reference.position]],source:reference.source};continue;}
 let row=byId.get(String(p.providerId||p.personId?.replace(/^tm-/,'')));
 if(!row&&p.name.trim().includes(' ')){const exact=names.get(norm(p.name));if(exact?.length===1)row=exact[0];}
 if(!row){const key=norm(p.name),club=norm(p.club||FIELD.find(t=>t.roster.includes(p))?.name||''),candidates=world.filter(q=>norm(q.club)===club&&(norm(q.name)===key||norm(q.name).endsWith(key)));if(candidates.length===1){const ref=intelligenceFor(candidates[0]);if(positions[ref?.position]){result[p.id]={positions:[positions[ref.position]],source:ref.source};continue;}row=byId.get(String(candidates[0].providerId||candidates[0].personId?.replace(/^tm-/,'')));}}
 // Abbreviated UEFA labels: require a unique recent player in a compatible department.
 // Reject ambiguous surnames; goalkeeper and defender identities cannot match attackers.
 if(!row&&(p.id.startsWith('club')||p.id.startsWith('current-'))){const key=norm(p.name.replace(/^[A-Z][a-z]?\.\s*/,'')),initial=p.name.match(/^([A-Z])[a-z]?\./)?.[1]?.toLowerCase(),candidates=rows.filter(r=>Number(r.last_season)>=2023&&(norm(r.last_name)===key||norm(r.name)===key||norm(r.name).endsWith(key))&&(!initial||norm(r.first_name).startsWith(initial))&&(p.role==='GK'?r.position==='Goalkeeper':p.role==='DEF'?r.position==='Defender':['Midfield','Attack'].includes(r.position)));if(candidates.length===1)row=candidates[0];}
 const position=positions[row?.sub_position];
 if(position)result[p.id]={positions:[position],source:row.url};else unresolved.push({id:p.id,name:p.name,role:p.role});
}
// Original founder roles are authored game positions, not real-world claims.
const founderRoles={GK:['GK'],DEF:['CB'],MID:['CM'],FWD:['ST']};
let defenders=0,midfielders=0,forwards=0;
for(const p of FOUNDING_PLAYERS){let value=founderRoles[p.role];if(p.role==='DEF')value=[['LB','CB','CB','RB'][defenders++%4]];if(p.role==='MID')value=[['DM','CM','AM'][midfielders++%3]];if(p.role==='FWD')value=[['LW','ST','RW'][forwards++%3]];result[p.id]={positions:value,source:'Original Touchline role'};}
for(const [id,labels] of Object.entries(HISTORICAL_POSITIONS)){const pack=PACKS.find(p=>p.id===id);labels.split(' ').forEach((label,i)=>{if(pack.players[i])result[pack.players[i].id]={positions:label.split('/'),source:pack.source,kind:'Touchline era-specific tactical interpretation'};});}
fs.writeFileSync('dist/player-positions-data.js','// Generated from dated references and authored historical tactical interpretations.\nexport const PLAYER_POSITIONS='+JSON.stringify(result)+';\n');
fs.mkdirSync('work/identity32',{recursive:true});fs.writeFileSync('work/identity32/unresolved-positions.json',JSON.stringify(unresolved,null,2));
console.log(JSON.stringify({verified:Object.keys(result).length,unresolved:unresolved.length}));
