import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {mkdtemp,readFile,writeFile,mkdir,rmdir} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {multiplayerService} from '../api/multiplayer.js';
import {createRoom,joinRoom,command,publicRoom} from '../api/multiplayer-core.js';
import {legend} from '../dist/legends.js';
import {FORMATIONS} from '../dist/engine.js';

async function service(t,file){const server=createServer(multiplayerService(file));await new Promise(r=>server.listen(0,'127.0.0.1',r));t.after(()=>new Promise(r=>server.close(r)));const base='http://127.0.0.1:'+server.address().port;return async(route='',body,token,headers={})=>{const response=await fetch(base+'/api/multiplayer'+route,{method:body?'POST':'GET',headers:{...(body?{'Content-Type':'application/json'}:{}),...(token?{Authorization:'Bearer '+token}:{}),...headers},...(body?{body:JSON.stringify(body)}:{})});return {status:response.status,...await response.json()};};}
const store=async()=>join(await mkdtemp(join(tmpdir(),'touchline-multiplayer-')),'rooms.json');
test('two authenticated players complete a unique positional draft, private tactics, a durable result and a mutual rematch',async t=>{
 const file=await store(),api=await service(t,file),host=await api('',{name:'Home'}),code=host.room.code,guest=await api('/'+code+'/join',{name:'Away'}),tokens=[host.token,guest.token];let room=guest.room;
 const send=async(i,type,extra={})=>{const r=await api('/'+code+'/command',{type,revision:room.revision,...extra},tokens[i]);assert.equal(r.status,200,JSON.stringify(r));room=r.room;return r;};
 await send(0,'configure',{formation:'5-3-2'});await send(1,'configure',{formation:'4-2-3-1'});
 await send(0,'ready',{ready:true});await send(1,'ready',{ready:true});assert.equal(room.phase,'draft');
 for(let n=0;n<22;n++)await send(room.turn,'pick',{player:room.offers[0]});
 assert.equal(room.phase,'tactics');assert.equal(new Set(room.players.flatMap(p=>p.picks).map(id=>legend(id).personId)).size,22);
 await send(0,'ready',{ready:true,preset:'press'});const hidden=await api('/'+code,undefined,tokens[1]);assert.equal(hidden.room.players[0].preset,null);
 await send(1,'ready',{ready:true,preset:'protect'});assert.equal(room.phase,'finished');assert.equal(room.result.score.length,2);assert.ok([0,1].includes(room.result.winner));
 assert.ok(!JSON.stringify(room).includes('tokenHash'));assert.ok(!JSON.stringify(room).includes(tokens[0]));
 const restarted=await service(t,file),restored=await restarted('/'+code,undefined,tokens[0]);assert.deepEqual(restored.room.result,room.result);
 await send(0,'rematch');assert.equal(room.phase,'finished');await send(1,'rematch');assert.equal(room.phase,'draft');assert.equal(room.turn,1);assert.equal(room.players[0].picks.length,0);
});
test('concurrent joins and commands cannot steal a seat, duplicate a pick, or bypass turns and revisions',async t=>{
 const api=await service(t,await store()),h=await api('',{name:'A'}),code=h.room.code;
 const joins=await Promise.all([api('/'+code+'/join',{name:'B'}),api('/'+code+'/join',{name:'C'})]);assert.deepEqual(joins.map(x=>x.status).sort(),[200,409]);const g=joins.find(x=>x.status===200);
 assert.equal((await api('/'+code,undefined,'wrong')).status,401);
 assert.equal((await api('/'+code,undefined,h.token,{Origin:'https://attacker.example'})).status,403);
 let room=g.room;for(const token of [h.token,g.token]){const r=await api('/'+code+'/command',{type:'ready',ready:true,revision:room.revision},token);room=r.room;}
 const invalid=await api('/'+code+'/command',{type:'pick',player:room.offers[0],revision:room.revision},g.token);assert.equal(invalid.status,409);
 const bad=await api('/'+code+'/command',{type:'pick',player:'forged',revision:room.revision},h.token);assert.equal(bad.status,400);
 const pick={type:'pick',player:room.offers[0],revision:room.revision};const results=await Promise.all([api('/'+code+'/command',pick,h.token),api('/'+code+'/command',pick,h.token)]);assert.deepEqual(results.map(x=>x.status).sort(),[200,409]);
 assert.equal((await api('/'+code,undefined,h.token)).room.players[0].picks.length,1);
});
test('forfeits are authoritative and expired or corrupt stores cannot silently create new worlds',async t=>{
 const {room}=createRoom('A');joinRoom(room,'B');command(room,0,{type:'forfeit',revision:room.revision});assert.equal(publicRoom(room,1).result.winner,1);
 const file=await store();room.expiresAt=0;await writeFile(file,JSON.stringify({[room.code]:room}));const api=await service(t,file);assert.equal((await api('/'+room.code,undefined,'x')).status,404);
 const broken=await store();await writeFile(broken,'broken');const unavailable=await service(t,broken);assert.equal((await unavailable('',{name:'A'})).status,503);assert.equal(await readFile(broken,'utf8'),'broken');
});
test('a failed durable write leaves the original seat and revision intact',async t=>{
 const file=await store(),api=await service(t,file),h=await api('',{name:'A'}),before=await readFile(file,'utf8');
 await mkdir(file+'.tmp');const failed=await api('/'+h.room.code+'/join',{name:'B'});assert.equal(failed.status,503);assert.equal(await readFile(file,'utf8'),before);
 const state=await api('/'+h.room.code,undefined,h.token);assert.equal(state.room.players.length,1);assert.equal(state.room.revision,0);assert.equal('seed' in state.room,false);
 await rmdir(file+'.tmp');assert.equal((await api('/'+h.room.code+'/join',{name:'B'})).status,200);
});
test('all supported formations can complete competing unique drafts',()=>{
 const formations=Object.keys(FORMATIONS);
 for(let i=0;i<formations.length;i++){
  const {room}=createRoom('A');joinRoom(room,'B');room.players[0].formation=formations[i];room.players[1].formation=formations[(i+1)%formations.length];
  const act=(index,type,extra={})=>command(room,index,{type,revision:room.revision,...extra});
  act(0,'ready',{ready:true});act(1,'ready',{ready:true});
  for(let n=0;n<22;n++)act(room.turn,'pick',{player:room.offers.at(-1)});
  assert.equal(room.phase,'tactics');assert.ok(room.players.every(p=>p.picks.length===11));
  room.round=2;act(0,'ready',{ready:true,preset:'press'});act(1,'ready',{ready:true,preset:'balanced'});assert.equal(room.result.home,1);assert.ok([0,1].includes(room.result.winner));
 }
});
