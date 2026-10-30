import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFile} from 'node:fs/promises';
import {handleRoomRequest} from '../lib/room-api.js';
async function setup(t){const sql=new DatabaseSync(':memory:');sql.exec(await readFile(new URL('../drizzle/0000_skinny_maximus.sql',import.meta.url),'utf8'));t.after(()=>sql.close());const db={prepare(query){return {bind(...args){return {async first(){return sql.prepare(query).get(...args)||null;},async all(){return {results:sql.prepare(query).all(...args)};},async run(){return {meta:{changes:Number(sql.prepare(query).run(...args).changes)}};}};},async first(){return sql.prepare(query).get()||null;}};}};const api=async(route='',body,token,headers={})=>{const r=await handleRoomRequest(new Request('https://duel.test/api/multiplayer'+route,{method:body?'POST':'GET',headers:{...(body?{'Content-Type':'application/json'}:{}),...(token?{Authorization:'Bearer '+token}:{}),...headers},...body?{body:JSON.stringify(body)}:{}}),db);return {status:r.status,...await r.json()};};return {api,db,sql};}
test('D1 flow resolves one shared duel, keeps tactics private, and supports a rematch',async t=>{
 const {api}=await setup(t),a=await api('',{name:'A'}),code=a.room.code,b=await api('/'+code+'/join',{name:'B'}),tokens=[a.token,b.token];let room=b.room;
 const act=async(i,type,extra={})=>{const r=await api('/'+code+'/command',{type,revision:room.revision,...extra},tokens[i]);assert.equal(r.status,200,JSON.stringify(r));room=r.room;};
 await act(0,'ready',{ready:true});await act(1,'ready',{ready:true});for(let i=0;i<22;i++)await act(room.turn,'pick',{player:room.offers[0]});
 await act(0,'ready',{ready:true,preset:'press'});assert.equal((await api('/'+code,undefined,b.token)).room.players[0].preset,null);await act(1,'ready',{ready:true,preset:'protect'});assert.equal(room.phase,'finished');assert.deepEqual((await api('/'+code,undefined,a.token)).room.result,room.result);assert.ok(!JSON.stringify(room).includes('tokenHash'));
 await act(0,'rematch');await act(1,'rematch');assert.equal(room.turn,1);assert.equal(room.phase,'draft');
});
test('database compare-and-swap rejects simultaneous joins and picks across independent requests',async t=>{
 const {api}=await setup(t),a=await api('',{name:'A'}),code=a.room.code;const joins=await Promise.all([api('/'+code+'/join',{name:'B'}),api('/'+code+'/join',{name:'C'})]);assert.deepEqual(joins.map(r=>r.status).sort(),[200,409]);const b=joins.find(r=>r.status===200);let room=b.room;
 for(const token of [a.token,b.token])room=(await api('/'+code+'/command',{type:'ready',ready:true,revision:room.revision},token)).room;
 const cmd={type:'pick',revision:room.revision,player:room.offers[0]};const picks=await Promise.all([api('/'+code+'/command',cmd,a.token),api('/'+code+'/command',cmd,a.token)]);assert.deepEqual(picks.map(r=>r.status).sort(),[200,409]);assert.equal((await api('/'+code,undefined,a.token)).room.players[0].picks.length,1);
 assert.equal((await api('/'+code,undefined,'wrong')).status,401);assert.equal((await api('/'+code,undefined,a.token,{Origin:'https://wrong.test'})).status,403);
});
test('event streams authenticate the seat, publish current state, and cancel cleanly',async t=>{
 const {api,db}=await setup(t),a=await api('',{name:'A'});const request=new Request('https://duel.test/api/multiplayer/'+a.room.code+'/events',{headers:{Authorization:'Bearer '+a.token}});const r=await handleRoomRequest(request,db);assert.equal(r.headers.get('content-type'),'text/event-stream');const reader=r.body.getReader();const first=new TextDecoder().decode((await reader.read()).value);assert.ok(first.startsWith('data: '));assert.equal(JSON.parse(first.slice(6).trim()).room.you,0);await reader.cancel();await new Promise(r=>setTimeout(r,1000));
});
test('missing storage, expired rooms and oversized bodies fail without corrupting a room',async t=>{
 const {api,sql}=await setup(t);assert.equal((await handleRoomRequest(new Request('https://duel.test/api/multiplayer/health'),null)).status,503);const a=await api('',{name:'A'});sql.prepare('UPDATE duel_rooms SET expires_at=0').run();assert.equal((await api('/'+a.room.code,undefined,a.token)).status,404);assert.equal((await api('',{name:'x'.repeat(5000)})).status,413);
});
