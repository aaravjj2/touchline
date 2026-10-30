import {readFile,mkdir,writeFile,rename} from 'node:fs/promises';
import path from 'node:path';
import {createRoom,joinRoom,authenticate,command,publicRoom,roomExpired,RoomError} from './multiplayer-core.js';

// One owning Node process and a persistent disk. All reads/mutations share the queue.
export function multiplayerService(file){
 let queue=Promise.resolve(),loaded=false,rooms={},presence=new Map();const limits=new Map();
 const serial=fn=>{const next=queue.then(fn);queue=next.catch(()=>{});return next;};
 async function load(){if(loaded)return;try{rooms=JSON.parse(await readFile(file,'utf8'));if(!rooms||Array.isArray(rooms))throw Error('Invalid room store');}catch(e){if(e.code!=='ENOENT')throw e;}loaded=true;}
 async function persist(next){await mkdir(path.dirname(file),{recursive:true});await writeFile(file+'.tmp',JSON.stringify(next),{mode:0o600});await rename(file+'.tmp',file);rooms=next;}
 return async(req,res)=>{
  const send=(status,value)=>{res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(value));};
  try {
   const url=new URL(req.url,'http://localhost');const parts=url.pathname.split('/').filter(Boolean);
   if(req.headers.origin&&new URL(req.headers.origin).host!==req.headers.host)throw new RoomError('Use the same host as the game.',403);
   if(!['POST','GET'].includes(req.method))throw new RoomError('Method not allowed.',405);
   if(parts.length>4)throw new RoomError('Room route not found.',404);
   const ip=req.socket.remoteAddress||'local',now=Date.now();let rate=limits.get(ip);if(!rate||now-rate.at>60000){rate={at:now,count:0};limits.set(ip,rate);}if(++rate.count>240)throw new RoomError('Too many requests. Try again shortly.',429);
   if(limits.size>10000)for(const [key,value] of limits)if(now-value.at>60000)limits.delete(key);
   let body={};if(req.method==='POST'){if(!req.headers['content-type']?.startsWith('application/json'))throw new RoomError('Send JSON.',415);let raw='';for await(const chunk of req){raw+=chunk;if(Buffer.byteLength(raw)>4096)throw new RoomError('Request too large.',413);}try{body=JSON.parse(raw);}catch{throw new RoomError('Invalid JSON.');}if(!body||typeof body!=='object'||Array.isArray(body))throw new RoomError('Invalid request.');}
   const answer=await serial(async()=>{
    await load();const next=structuredClone(rooms);for(const [code,r] of Object.entries(next))if(roomExpired(r)){delete next[code];presence.delete(code);}
    if(req.method==='POST'&&parts.length===2){if(Object.keys(next).length>=500)throw new RoomError('Rooms are full. Try later.',503);const {room,token}=createRoom(body.name);next[room.code]=room;await persist(next);presence.set(room.code,[now,0]);return {token,room:publicRoom(room,0,presence.get(room.code))};}
    const code=(parts[2]||'').toUpperCase();if(!/^[A-F0-9]{10}$/.test(code)||!next[code])throw new RoomError('Room not found or expired.',404);
    const room=next[code];let token,index;
    if(req.method==='POST'&&parts[3]==='join'){token=joinRoom(room,body.name);index=1;}
    else {index=authenticate(room,req.headers.authorization?.replace(/^Bearer /,''));if(req.method==='POST'&&parts[3]==='command')command(room,index,body);else if(req.method!=='GET'||parts.length!==3)throw new RoomError('Room route not found.',404);}
    const seen=presence.get(code)||[0,0];seen[index]=now;presence.set(code,seen);
    if(req.method==='POST')await persist(next);
    return {...(token?{token}:{}),room:publicRoom(room,index,seen)};
   });send(200,answer);
  }catch(e){if(!(e instanceof RoomError))console.error('Multiplayer storage error:',e.message);send(e instanceof RoomError?e.status:503,{error:e instanceof RoomError?e.message:'Room storage is unavailable. Your last saved state is retained.'});}
 };
}
