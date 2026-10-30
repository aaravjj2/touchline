import {randomBytes,createHash} from 'node:crypto';
import {LEGENDS,legend} from '../dist/legends.js';
import {FORMATIONS} from '../dist/engine.js';
import {eligibility,orderedXI} from '../dist/draft.js';
import {shuffle,simulateFast} from '../dist/competition.js';

export class RoomError extends Error {constructor(message,status=400){super(message);this.status=status;}}
const fail=(message,status)=>{throw new RoomError(message,status);};
export const tokenHash=token=>createHash('sha256').update(token).digest('hex');
const secret=()=>randomBytes(32).toString('hex');
export const roomExpired=(room,now=Date.now())=>now>=room.expiresAt;
function name(value){if(typeof value!=='string'||!value.trim()||value.trim().length>28||/[\u0000-\u001f\u007f]/.test(value))fail('Use a name between 1 and 28 characters.');return value.trim();}
function seat(label){const token=secret();return {token,player:{name:name(label),tokenHash:tokenHash(token),formation:'4-3-3',picks:[],preset:'balanced',ready:false}};}
export function createRoom(label,now=Date.now()) {const s=seat(label);return {token:s.token,room:{version:1,code:randomBytes(5).toString('hex').toUpperCase(),revision:0,createdAt:now,expiresAt:now+24*60*60*1000,seed:randomBytes(4).readUInt32LE(),round:1,phase:'lobby',players:[s.player],turn:0,offers:[],result:null,rematch:[]}};}
export function joinRoom(room,label){if(room.phase!=='lobby'||room.players.length!==1)fail('This room already has two players.',409);const s=seat(label);room.players.push(s.player);room.revision++;return s.token;}
export function authenticate(room,token){if(typeof token!=='string'||!token||token.length>128)fail('Rejoin from the browser that owns this seat.',401);const i=room.players.findIndex(p=>p.tokenHash===tokenHash(token));if(i<0)fail('This seat key is invalid.',401);return i;}
function offers(room){const player=room.players[room.turn],used=new Set(room.players.flatMap(p=>p.picks).map(id=>legend(id).personId));const pool=LEGENDS.filter(p=>!used.has(p.personId)&&!eligibility(p,player.picks,player.formation,2));const unique=[...new Map(pool.map(p=>[p.personId,p])).values()];room.offers=shuffle(unique,room.seed+room.players.reduce((n,p)=>n+p.picks.length,0)*7919).slice(0,6).map(p=>p.id);if(!room.offers.length)fail('No eligible players remain. Create a new room.',409);}
export function command(room,index,cmd){
 if(!cmd||typeof cmd!=='object'||Array.isArray(cmd))fail('Invalid command.');
 if(cmd.revision!==room.revision)fail('The room changed. Review the latest state and try again.',409);
 const p=room.players[index];
 if(cmd.type==='forfeit') {if(room.phase==='finished')fail('The match is already finished.',409);room.phase='finished';room.result={forfeit:true,winner:room.players.length===2?1-index:null,score:null};}
 else if(cmd.type==='configure') {if(room.phase!=='lobby'||p.ready)fail('Unlock your place before changing formation.',409);if(!Object.hasOwn(FORMATIONS,cmd.formation))fail('Choose a supported formation.');p.formation=cmd.formation;}
 else if(cmd.type==='ready') {
  if(!['lobby','tactics'].includes(room.phase))fail('Ready is unavailable now.',409);
  if(room.phase==='tactics'){if(!['balanced','press','protect'].includes(cmd.preset))fail('Choose a supported approach.');p.preset=cmd.preset;}
  p.ready=cmd.ready===true;
  if(room.players.length===2&&room.players.every(p=>p.ready)) {
   if(room.phase==='lobby'){room.phase='draft';room.players.forEach(p=>p.ready=false);offers(room);}
   else {const teams=room.players.map((p,i)=>({id:String(i),name:p.name,formation:p.formation,preset:p.preset,managerTactics:{},xi:orderedXI(p.picks,p.formation,2),roster:p.picks.map(id=>({...legend(id)}))}));const home=(room.round-1)%2,result=simulateFast(teams[home],teams[1-home],room.seed,true);room.result={score:home?[...result.score].reverse():result.score,pens:result.pens?(home?[...result.pens].reverse():result.pens):null,winner:Number(result.winner),home,simulation:result.simulation,forfeit:false};room.phase='finished';}
  }
 }
 else if(cmd.type==='pick') {
  if(room.phase!=='draft'||room.turn!==index)fail('Wait for your turn.',409);
  if(!room.offers.includes(cmd.player))fail('Choose a player from the current offers.');
  p.picks.push(cmd.player);room.offers=[];
  if(room.players.every(p=>p.picks.length===11)){room.phase='tactics';room.players.forEach(p=>p.ready=false);}
  else {room.turn=1-index;offers(room);}
 }
 else if(cmd.type==='rematch') {
  if(room.phase!=='finished'||room.players.length!==2)fail('A rematch needs both players and a completed match.',409);
  if(!room.rematch.includes(index))room.rematch.push(index);
  if(room.rematch.length===2){room.round++;room.seed=randomBytes(4).readUInt32LE();room.turn=(room.round-1)%2;room.phase='draft';room.result=null;room.rematch=[];room.players.forEach(p=>{p.picks=[];p.ready=false;});offers(room);}
 }
 else fail('Unknown room command.');
 room.revision++;
}
export function publicRoom(room,index,presence=[]){return {version:room.version,code:room.code,revision:room.revision,createdAt:room.createdAt,expiresAt:room.expiresAt,round:room.round,phase:room.phase,turn:room.turn,offers:room.offers,result:room.result,rematch:room.rematch,players:room.players.map((p,i)=>({name:p.name,formation:p.formation,picks:p.picks,ready:p.ready,preset:room.phase==='finished'||i===index?p.preset:null,online:Date.now()-(presence[i]||0)<15000})),you:index};}
