import {WORLD_PACKS} from './super-catalog.js';
import {POSITION_SLOTS,canPlayPosition,positionsFor} from './player-positions.js';
import {PACKS,legend} from './legends.js';
import {FIELD} from './club-field.js';
import {FORMATIONS} from './engine.js';
import {shuffle} from './competition.js';
const aliases={'Bayern München':'Bayern Munich','Man City':'Manchester City','Man United':'Manchester United','Paris':'Paris Saint-Germain','Tottenham Hotspur':'Tottenham','RB Leipzig':'Leipzig','Atlético de Madrid':'Atlético Madrid'};
export const clubIdentity=name=>aliases[name]||name;
export function selectSquad(pack,preferred='4-3-3',version=1){
 if(version===2){for(const formation of [...new Set([preferred,...Object.keys(FORMATIONS)])]){const slots=POSITION_SLOTS[formation].map(()=>null),byPerson=new Map();const pool=[...pack.players].sort((a,b)=>b.rating-a.rating);const place=(index,seen)=>{for(const p of pool){const person=p.personId||p.id;if(seen.has(person)||!canPlayPosition(p,POSITION_SLOTS[formation][index]))continue;seen.add(person);const previous=byPerson.get(person);if(previous===undefined||place(previous,seen)){slots[index]=p;byPerson.set(person,index);return true;}}return false;};if(POSITION_SLOTS[formation].every((_,i)=>place(i,new Set()))){const xi=slots.map(p=>p.id);return {formation,xi,bench:pool.filter(p=>!xi.includes(p.id)).slice(0,12).map(p=>p.id)};}}throw Error('This squad has no complete XI with verified specific positions. Choose another club or draft individual players.');}

 const fits=f=>Object.entries(FORMATIONS[f].reduce((o,s)=>(o[s.role]=(o[s.role]||0)+1,o),{})).every(([role,n])=>new Set(pack.players.filter(p=>p.role===role).map(p=>p.personId)).size>=n),formation=[preferred,...Object.keys(FORMATIONS)].find(f=>FORMATIONS[f]&&fits(f));
 if(!formation)throw Error('This snapshot has no complete supported XI.');const used=new Set(),xi=[];
 for(const slot of FORMATIONS[formation]){const p=pack.players.filter(p=>p.role===slot.role&&!used.has(p.personId)).sort((a,b)=>b.rating-a.rating)[0];xi.push(p.id);used.add(p.personId);}
 const bench=pack.players.filter(p=>!used.has(p.personId)).slice(0,12).map(p=>p.id);return {formation,xi,bench};
}
export function packClub(pack,preferred){const {formation,xi}=selectSquad(pack,preferred),rating=Math.round(xi.reduce((s,id)=>s+legend(id).rating,0)/11);return {id:'era-club:'+clubIdentity(pack.club),name:pack.club,era:pack.era,packId:pack.id,color:pack.color,mark:pack.club.split(' ').map(s=>s[0]).slice(0,2).join(''),rating,attack:rating-6,defense:rating-7,formation,xi,roster:pack.players.map(p=>({...p})),source:pack.source};}
export function europeanIcons(){
 const names=[...new Set(PACKS.map(p=>p.club))],historical=names.map(name=>packClub(PACKS.filter(p=>p.club===name).sort((a,b)=>b.players.reduce((n,p)=>n+p.rating,0)/b.players.length-a.players.reduce((n,p)=>n+p.rating,0)/a.players.length)[0]));
 const additions=['Napoli','Aston Villa','Leipzig','Roma','Sporting CP','Villarreal','Galatasaray','Feyenoord','Fenerbahçe','PSV','Club Brugge','Real Betis','Stuttgart','Bodø/Glimt','Shakhtar','AEK Athens'];const others=FIELD.filter(t=>additions.includes(t.name)&&!names.includes(clubIdentity(t.name))).map(t=>({...t,name:clubIdentity(t.name),era:'2026–27'}));
 return historical.concat(others);
}
export const ICONS=europeanIcons();
export function oppositionField(user,{format='europe',seed=123,hostClub='Real Madrid',field='icons',positionVersion=1}={}){
 if(positionVersion===2){const candidates=field==='current'?FIELD:format==='league'?ICONS.filter(t=>t.packId):ICONS;const selected=[],names=new Set();for(const team of [...candidates,...WORLD_PACKS.map(p=>({id:'position-club:'+p.id,name:p.club,era:p.era,color:p.color,mark:p.club.slice(0,2),roster:p.players,rating:Math.round(p.players.reduce((n,p)=>n+p.rating,0)/p.players.length),attack:80,defense:80}))]){const name=clubIdentity(team.name);if(names.has(name))continue;try{const ready=positionTeam(team);selected.push(ready);names.add(name);}catch{}}const count=format==='league'?20:36;if(selected.length<count)throw Error('Not enough clubs with complete position-ready squads.');const host=selected.find(t=>clubIdentity(t.name)===clubIdentity(hostClub)),selectedField=selected.slice(0,count);if(host&&!selectedField.includes(host))selectedField[selectedField.length-1]=host;return [{...user,clubIdentity:hostClub},...shuffle(selectedField.filter(t=>t.id!==host?.id),seed).slice(0,count-1)];}

 const pool=field==='current'?FIELD.map(t=>({...t,name:clubIdentity(t.name),era:'2026–27'})):format==='league'?ICONS.filter(t=>t.packId):ICONS,host=pool.find(t=>clubIdentity(t.name)===clubIdentity(hostClub));
 if(format==='europe'&&pool.length!==36)throw Error('Champions League needs 36 club places.');
 const chosen=shuffle(pool.filter(t=>t.id!==host?.id),seed).slice(0,format==='league'?19:35);
 if(chosen.length!==(format==='league'?19:35))throw Error('Incomplete opposition field.');
 return [{...user,clubIdentity:hostClub},...chosen];
}
export function balancedBench(ids){const people=new Set(ids.map(id=>legend(id).personId)),target=ids.reduce((s,id)=>s+legend(id).rating,0)/11-5,result=[];for(const role of ['GK','DEF','DEF','MID','MID','FWD','FWD']){const p=PACKS.flatMap(p=>p.players).filter(p=>p.role===role&&!people.has(p.personId)).sort((a,b)=>Math.abs(a.rating-target)-Math.abs(b.rating-target)||a.id.localeCompare(b.id))[0];if(p){result.push(p.id);people.add(p.personId);}}return result;}
export function withFamiliarity(roster,xi){const starters=xi.map(id=>roster.find(p=>p.id===id)).filter(Boolean),pairs=starters.reduce((n,p,i)=>n+starters.slice(i+1).filter(q=>q.club===p.club).length,0),bonus=Math.min(2,pairs*.14);return roster.map(p=>({...p,control:Math.min(99,p.control+bonus)}));}

export function positionTeam(team){const squad=selectSquad({players:team.roster},team.formation,2);return {...team,...squad,roster:team.roster.map(p=>{const index=squad.xi.indexOf(p.id);return {...p,positions:positionsFor(p),...(index>=0?{role:FORMATIONS[squad.formation][index].role,assignedPosition:POSITION_SLOTS[squad.formation][index]}:{})};})};}
