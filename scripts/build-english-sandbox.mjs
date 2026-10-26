import {readFile,writeFile} from 'node:fs/promises';
const data=JSON.parse(await readFile('data/manager/england-2026-candidate.json','utf8'));
const identities=[
 ['Arsenal','#db1735',180],['Aston Villa','#861b47',100],['Bournemouth','#df2439',70],['Brentford','#e33143',70],['Brighton & Hove Albion','#2684d9',100],['Chelsea','#2858df',160],['Coventry City','#74bce2',50],['Crystal Palace','#356ce6',80],['Everton','#2852d9',90],['Fulham','#e4e8ed',70],['Hull City','#edab32',50],['Ipswich Town','#3977da',60],['Leeds United','#efcf52',70],['Liverpool','#e12f45',180],['Manchester City','#80c7e7',200],['Manchester United','#e52c39',150],['Newcastle United','#c7ced6',140],['Nottingham Forest','#e73842',90],['Tottenham Hotspur','#e6edf8',140],['Sunderland','#e33b4d',60]
];
if(data.clubs.length!==20||data.season!=='2026–27')throw Error('Unexpected source membership/season.');
const sourceNames=['Arsenal','Aston Villa','Bournemouth','Brentford','Brighton','Chelsea','Coventry City','Crystal Palace','Everton','Fulham','Hull City','Ipswich Town','Leeds','Liverpool','Man City','Man Utd','Newcastle',"Nott'm Forest",'Spurs','Sunderland'];
const packs=data.clubs.map((club,i)=>{
 if(club.name!==sourceNames[i])throw Error('Source club order changed: '+club.name+'. Review identities before rebuilding.');
 const [name,color,budget]=identities[i];
 const players=club.players.filter(p=>p.registrationStatus!=='loan-out'&&(!p.registeredClub||p.registeredClub===club.id)).map((p,n)=>({...p,id:'sandbox-eng-'+p.id,personId:'eng-person-'+p.id,club:name,era:data.season,color,cost:Math.max(12,Math.round((p.rating-65)*.85)),number:n+1}));
 return {id:'english-'+club.id.replace(':','-'),sourceId:club.id,club:name,era:data.season,year:2026,color,budget,source:data.source,checked:data.checked,players,current:true};
});
await writeFile('dist/english-catalog.js','// Generated from the dated FPL candidate by scripts/build-english-sandbox.mjs.\n// Sandbox snapshot: registration/age audit is incomplete; not a verified real-career dataset.\nexport const ENGLISH_PACKS='+JSON.stringify(packs)+';\nexport const ENGLISH_PLAYERS=ENGLISH_PACKS.flatMap(p=>p.players);\n');
console.log('Built '+packs.length+' English sandbox clubs / '+packs.reduce((n,p)=>n+p.players.length,0)+' snapshot players.');
