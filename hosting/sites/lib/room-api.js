import {createRoom,joinRoom,authenticate,command,publicRoom,RoomError,tokenHash} from './game.js';
const json=(value,status=200)=>new Response(JSON.stringify(value),{status,headers:{'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
const fail=(message,status=400)=>{throw new RoomError(message,status);};
async function read(db,code){const row=await db.prepare('SELECT state,revision FROM duel_rooms WHERE code = ? AND expires_at > ?').bind(code,Date.now()).first();if(!row)fail('Room not found or expired.',404);const room=JSON.parse(row.state);if(room.revision!==row.revision)throw Error('Room revision mismatch');return room;}
async function heartbeat(db,code,seat){const now=Date.now();await db.prepare('INSERT INTO duel_presence(code,seat,seen) VALUES(?,?,?) ON CONFLICT(code,seat) DO UPDATE SET seen=excluded.seen WHERE seen < ?').bind(code,seat,now,now-10000).run();}
async function view(db,room,seat){const rows=await db.prepare('SELECT seat,seen FROM duel_presence WHERE code = ?').bind(room.code).all();const seen=[0,0];for(const p of rows.results)seen[p.seat]=p.seen;return publicRoom(room,seat,seen);}
async function rateLimit(db,request){const key=tokenHash(request.headers.get('Authorization')||request.headers.get('CF-Connecting-IP')||'anonymous');const window=Math.floor(Date.now()/60000);const row=await db.prepare('INSERT INTO duel_rates(key,window,hits) VALUES(?,?,1) ON CONFLICT(key) DO UPDATE SET hits=CASE WHEN window=excluded.window THEN hits+1 ELSE 1 END,window=excluded.window RETURNING hits').bind(key,window).first();if(row.hits>150)fail('Too many requests. Try again in a minute.',429);}
async function persist(db,room,revision){const saved=await db.prepare('UPDATE duel_rooms SET state=?,revision=?,expires_at=? WHERE code=? AND revision=?').bind(JSON.stringify(room),room.revision,room.expiresAt,room.code,revision).run();if(saved.meta.changes!==1)fail('The room changed. Review the latest state and try again.',409);}
function events(db,code,seat){let cancelled=false;const encoder=new TextEncoder();const stream=new ReadableStream({
 async start(controller){let previous='',ticks=0;try{
  while(!cancelled&&ticks++<18){const room=await read(db,code);if(ticks%10===1)await heartbeat(db,code,seat);const data=JSON.stringify({room:await view(db,room,seat)});if(cancelled)break;if(data!==previous){controller.enqueue(encoder.encode('data: '+data+'\n\n'));previous=data;}else controller.enqueue(encoder.encode(': heartbeat\n\n'));await new Promise(resolve=>setTimeout(resolve,900));}
  if(!cancelled)controller.close();
 }catch(e){if(!cancelled){controller.enqueue(encoder.encode('event: room-error\ndata: '+JSON.stringify({error:e instanceof RoomError?e.message:'Connection interrupted.',status:e.status||503})+'\n\n'));controller.close();}}},
 cancel(){cancelled=true;},
 });return new Response(stream,{headers:{'Content-Type':'text/event-stream','Cache-Control':'no-store, no-transform','X-Accel-Buffering':'no'}});
}
export async function handleRoomRequest(request,db){try{
 if(!db)return json({error:'Room database is not connected yet.'},503);
 const url=new URL(request.url),parts=url.pathname.split('/').filter(Boolean),method=request.method;
 if(parts[0]!=='api'||parts[1]!=='multiplayer'||parts.length>4)fail('Route not found.',404);
 if(request.headers.get('Origin')&&request.headers.get('Origin')!==url.origin)fail('Use the same host as the game.',403);
 if(method==='GET'&&parts[2]==='health'){await db.prepare('SELECT code FROM duel_rooms LIMIT 1').first();return json({ready:true,storage:'D1',sync:'events'});}
 if(!['GET','POST'].includes(method))fail('Method not allowed.',405);
 await rateLimit(db,request);
 let body={};if(method==='POST'){if(!request.headers.get('Content-Type')?.startsWith('application/json'))fail('Send JSON.',415);if(Number(request.headers.get('Content-Length'))>4096)fail('Request too large.',413);const reader=request.body?.getReader();if(!reader)fail('Invalid request.');const chunks=[];let size=0;while(true){const {value,done}=await reader.read();if(done)break;size+=value.length;if(size>4096){await reader.cancel();fail('Request too large.',413);}chunks.push(value);}const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}try{body=JSON.parse(new TextDecoder().decode(bytes));}catch{fail('Invalid JSON.');}if(!body||Array.isArray(body)||typeof body!=='object')fail('Invalid request.');}
 if(method==='POST'&&parts.length===2){
  await db.prepare('DELETE FROM duel_presence WHERE code IN (SELECT code FROM duel_rooms WHERE expires_at <= ?)').bind(Date.now()).run();await db.prepare('DELETE FROM duel_rooms WHERE expires_at <= ?').bind(Date.now()).run();await db.prepare('DELETE FROM duel_rates WHERE window < ?').bind(Math.floor(Date.now()/60000)-2).run();
  const count=await db.prepare('SELECT COUNT(*) AS count FROM duel_rooms').first();if(count.count>=500)fail('Rooms are full. Try later.',503);
  const {room,token}=createRoom(body.name);await db.prepare('INSERT INTO duel_rooms(code,state,revision,expires_at) VALUES(?,?,?,?)').bind(room.code,JSON.stringify(room),room.revision,room.expiresAt).run();await heartbeat(db,room.code,0);return json({token,room:await view(db,room,0)});
 }
 const code=(parts[2]||'').toUpperCase();if(!/^[A-F0-9]{10}$/.test(code))fail('Check your 10-character room code.',404);const room=await read(db,code),revision=room.revision;let token,seat;
 if(method==='POST'&&parts[3]==='join'){token=joinRoom(room,body.name);seat=1;await persist(db,room,revision);}
 else {seat=authenticate(room,request.headers.get('Authorization')?.replace(/^Bearer /,''));if(method==='POST'&&parts[3]==='command'){command(room,seat,body);await persist(db,room,revision);}else if(method==='GET'&&parts[3]==='events'){await heartbeat(db,code,seat);return events(db,code,seat);}else if(method!=='GET'||parts.length!==3)fail('Room route not found.',404);}
 await heartbeat(db,code,seat);return json({...token?{token}:{},room:await view(db,room,seat)});
 }catch(e){if(!(e instanceof RoomError))console.error('Room service:',e.message);return json({error:e instanceof RoomError?e.message:'Room storage is unavailable. Reconnect to restore your last saved state.'},e instanceof RoomError?e.status:503);}}
