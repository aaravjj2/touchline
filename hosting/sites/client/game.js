import {legend} from './catalog.js';
import {FORMATIONS} from '../lib/football/engine.js';
import {escapeHtml as esc} from './escape.js';
const $=s=>document.querySelector(s),key='touchline.multiplayer.seat.v1',roomNode=$('#room');
let seat=null,room=null,busy=false,closed=false,polling=false,reconnecting=false,lastSignature='',timer;
let streamController=null,streamKey='',streamConnected=false,streamRetry;
function stopStream(){clearTimeout(streamRetry);streamController?.abort();streamController=null;streamKey='';streamConnected=false;}
function ensureStream(){
 if(!seat||closed)return;const id=seat.code+':'+seat.token;if(streamKey===id)return;stopStream();streamKey=id;const controller=new AbortController();streamController=controller;
 void (async()=>{let reader;try{
  const response=await fetch('/api/multiplayer/'+seat.code+'/events',{headers:{Authorization:'Bearer '+seat.token},signal:controller.signal,cache:'no-store'});
  if(!response.ok||!response.body)throw Error('Live connection interrupted.');reader=response.body.getReader();streamConnected=true;let pending='',decoder=new TextDecoder();
  while(!controller.signal.aborted){const {done,value}=await reader.read();if(done)break;pending+=decoder.decode(value,{stream:true});let end;
   while((end=pending.indexOf('\n\n'))>=0){const event=pending.slice(0,end);pending=pending.slice(end+2);if(event.startsWith('event: room-error'))continue;const line=event.split('\n').find(line=>line.startsWith('data: '));if(line&&!closed){const data=JSON.parse(line.slice(6));if(data.room)adopt(data);}}
  }
 }catch{if(!controller.signal.aborted)$('#connection').textContent='Reconnecting · your picks are saved';}
 finally{try{await reader?.cancel();}catch{}if(streamController===controller){streamConnected=false;streamController=null;streamKey='';if(!closed&&seat)streamRetry=setTimeout(ensureStream,1200);}}
 })();
}
try{seat=JSON.parse(localStorage.getItem(key)||'null');if(!seat?.code||!seat?.token)seat=null;}catch{}
const invite=new URLSearchParams(location.search).get('room');if(invite)$('#join [name=code]').value=invite.toUpperCase();
if(invite&&seat&&seat.code!==invite.toUpperCase())closed=true;
function remember(value){seat=value;try{if(value)localStorage.setItem(key,JSON.stringify(value));else localStorage.removeItem(key);}catch{$('#error').textContent='Device storage is unavailable. Copy your seat key below before closing this page.';}}
async function request(route,body){const response=await fetch('/api/multiplayer'+route,{method:body?'POST':'GET',headers:{...(body?{'Content-Type':'application/json'}:{}),...(seat?{Authorization:'Bearer '+seat.token}:{})},...(body?{body:JSON.stringify(body)}:{}),cache:'no-store',signal:AbortSignal.timeout(10000)});let value;try{value=await response.json();}catch{throw Error('The matchday connection is unavailable. Please try again in a moment.');}if(!response.ok){const e=Error(value.error||'Room request failed.');e.status=response.status;throw e;}return value;}
function adopt(data){if(room?.code===data.room.code&&room.revision>data.room.revision)return;if(closed){closed=false;timer=setTimeout(poll,10000);}room=data.room;if(data.token)remember({code:room.code,token:data.token});$('#connection').textContent=streamConnected?'Live · both screens stay in sync':'Connected · opening live updates';$('#setup').hidden=true;roomNode.hidden=false;render();ensureStream();}
const btn=(text,action,value='',disabled=false)=>`<button data-command="${action}" data-value="${esc(value)}" ${disabled?'disabled':''}>${esc(text)}</button>`;
function render(){if(!room)return;const signature=JSON.stringify(room);if(signature===lastSignature)return;lastSignature=signature;
 const focused=document.activeElement,focusKey=roomNode.contains(focused)?focused.dataset.focus:null,chosenPreset=$('#preset')?.value,squadsOpen=roomNode.querySelector('.squad-preview')?.open??innerWidth>760;
 const me=room.players[room.you],other=room.players[1-room.you],mine=room.turn===room.you;
 let content=`<div class="room-head"><div><small>PRIVATE ROOM · ROUND ${room.round}</small><h2>Room <code>${esc(room.code)}</code></h2></div><button class="secondary" data-command="disconnect">Close room view</button></div><label class="share">Invite link<input readonly aria-label="Invite link" value="${esc(location.origin+location.pathname+'?room='+room.code)}"></label><button class="secondary" data-command="copy">Copy invite link</button><details><summary>Reconnect from another browser</summary><p>Your seat key controls your place. Share the invite link with your opponent; keep this key private.</p><label>Private seat key<input readonly value="${esc(seat.token)}"></label><form id="recover"><label>Seat key<input name="token" required maxlength="128"></label><button>Recover seat in this room</button></form></details>`;
 const status=room.phase==='lobby'?(other?'Both players joined · choose your formation and ready up.':'Waiting for your friend to join using the invite link.') :room.phase==='draft'?(mine?'Your pick · choose one player':`${other.name} is picking · your turn is next`):room.phase==='tactics'?'Your XI is complete · choose your approach':room.result?.forfeit?'Room ended by a forfeit.':'Full-time · your Draft Duel result';
 content+=`<p class="status" tabindex="-1" role="status" aria-live="polite">${esc(status)}</p>`;
 const teams=`<div class="teams">${room.players.map((p,i)=>`<section class="team ${room.phase==='draft'&&room.turn===i?'active':''}"><h3>${esc(p.name)} ${i===room.you?'· You':''}</h3><p>${esc(p.formation)} · ${p.picks.length}/11 · ${p.online?'Connected':'Reconnecting'}${p.ready?' · Ready':''}</p><ol>${p.picks.map(id=>{const p=legend(id);return `<li>${esc(p?.name||id)} · ${esc(p?.role)} · ${p?.rating}</li>`;}).join('')}</ol></section>`).join('')}${other?'':'<section class="team"><h3>Opponent’s place</h3><p>Invite one friend. The draft starts when you both ready up.</p></section>'}</div>`;
 if(room.phase==='lobby')content+=`<div class="panel"><label>Your formation<select data-focus="formation" id="formation" ${me.ready?'disabled':''}>${Object.keys(FORMATIONS).map(f=>`<option ${f===me.formation?'selected':''}>${f}</option>`).join('')}</select></label>${btn(me.ready?'Cancel ready':'Ready to draft','ready',String(!me.ready))}</div>`;
 if(room.phase==='draft')content+=`<div class="offers" aria-label="Current draft offers">${room.offers.map(id=>{const p=legend(id);return `<button class="offer" data-focus="${esc(id)}" data-command="pick" data-value="${esc(id)}" ${!mine?'disabled':''}><strong>${esc(p.name)}</strong><span>${esc(p.role)} · ${p.rating} OVR</span><span>${esc(p.club)} · ${esc(p.era)}</span><span>${mine?'Draft player':'Opponent’s offer'}</span></button>`;}).join('')}</div><p>Alternate picks from six offers. Each person can appear only once across both XIs. Offers fit your remaining positions.</p>`;
 if(room.phase==='tactics')content+=`<div class="panel"><label>Your approach<select data-focus="preset" id="preset" ${me.ready?'disabled':''}>${[['balanced','Balanced'],['press','Press · stronger attack'],['protect','Protect · stronger defence']].map(([v,t])=>`<option value="${v}" ${me.preset===v?'selected':''}>${t}</option>`).join('')}</select></label><p>Your opponent’s approach stays hidden until both players are ready.</p>${btn(me.ready?'Cancel ready':'Ready for kick-off','ready',String(!me.ready))}</div>`;
 if(room.phase==='finished'){const r=room.result;content+=`<section class="panel"><h2>${r.winner===null?'Room closed':esc(room.players[r.winner]?.name)+' wins'}</h2>${r.score?`<p class="score">${r.score.join(' – ')}</p>${r.pens?`<p>Penalties ${r.pens.join(' – ')}</p>`:''}<p>${room.players.map(p=>esc(p.name)+': '+esc(p.preset)).join(' · ')}</p><p>Server-resolved statistical match using Touchline’s simulation. No direct play or physical replay.</p>`:'<p>Forfeit · no match was simulated.</p>'}${other?btn(room.rematch.includes(room.you)?'Rematch requested · waiting':'Request rematch','rematch','',room.rematch.includes(room.you)):''}</section>`;}
 content+=`<details class="squad-preview" ${squadsOpen?'open':''}><summary>View both squads · ${room.players.map(p=>p.picks.length+'/11').join(' vs ')}</summary>${teams}</details>`;
 if(room.phase!=='finished')content+=`<div class="actions">${btn('Forfeit duel','forfeit')}</div>`;
 roomNode.innerHTML=content;document.body.classList.add('in-room');
 if(chosenPreset&&$('#preset')&&!me.ready)$('#preset').value=chosenPreset;
 if(focusKey){const target=[...roomNode.querySelectorAll('[data-focus]')].find(el=>el.dataset.focus===focusKey);target?.focus();}
 if(busy)roomNode.querySelectorAll('button,select').forEach(el=>el.disabled=true);
}
async function action(type,extra={}){
 if(busy)return;const phase=room.phase;busy=true;$('#error').textContent='';
 try{
  adopt(await request('/'+seat.code));
  if(room.phase!==phase)throw Error('The game moved on. Review the current turn.');
  adopt(await request('/'+seat.code+'/command',{type,revision:room.revision,...extra}));
 }catch(e){
  $('#error').textContent=e.message;
  if(e.status===409)try{
   adopt(await request('/'+seat.code));
   const samePhase=room.phase===phase,me=room.players[room.you];
   const safeReady=type==='ready'&&samePhase;
   const safeRematch=type==='rematch'&&samePhase&&!room.rematch.includes(room.you);
   if(safeReady&&me.ready===extra.ready){$('#error').textContent='';}
   else if(safeReady||safeRematch){adopt(await request('/'+seat.code+'/command',{type,revision:room.revision,...extra}));$('#error').textContent='';}
  }catch(retry){$('#error').textContent=retry.message;}
 }finally{busy=false;lastSignature='';render();if(type!=='configure')$('.status')?.focus({preventScroll:false});}
}
for(const id of ['create','join'])$('#'+id).addEventListener('submit',async e=>{e.preventDefault();if(busy)return;busy=true;$('#error').textContent='';const form=new FormData(e.target);try{adopt(await request(id==='create'?'':'/'+String(form.get('code')).trim().toUpperCase()+'/join',{name:form.get('name')}));}catch(e){$('#error').textContent=e.message;}finally{busy=false;lastSignature='';render();}});
roomNode.addEventListener('change',e=>{if(e.target.id==='formation')void action('configure',{formation:e.target.value});});
roomNode.addEventListener('click',async e=>{const b=e.target.closest('[data-command]');if(!b||busy)return;const type=b.dataset.command;
 if(type==='copy'){try{await navigator.clipboard.writeText(location.origin+location.pathname+'?room='+room.code);$('#connection').textContent='Invite copied · send it to your friend';}catch{$('.share input').focus();$('.share input').select();$('#connection').textContent='Copy the selected invite link to share it.';}return;}
 if(type==='disconnect'){document.body.classList.remove('in-room');closed=true;stopStream();clearTimeout(timer);roomNode.hidden=true;$('#setup').hidden=false;$('#connection').textContent='Room view closed. Reload to reconnect to your saved seat.';return;}
 if(type==='forfeit'&&!confirm('Forfeit this duel? Your opponent will win.'))return;
 await action(type,type==='pick'?{player:b.dataset.value}:type==='ready'?{ready:b.dataset.value==='true',preset:$('#preset')?.value||'balanced'}:{});
});
roomNode.addEventListener('submit',async e=>{if(e.target.id!=='recover')return;e.preventDefault();const token=new FormData(e.target).get('token'),old=seat;seat={...seat,token};try{const data=await request('/'+seat.code);remember(seat);adopt(data);}catch(e){seat=old;$('#error').textContent=e.message;}});
$('#resume').addEventListener('submit',async e=>{e.preventDefault();if(busy)return;const f=new FormData(e.target),old=seat;busy=true;seat={code:String(f.get('code')).trim().toUpperCase(),token:String(f.get('token')).trim()};try{const data=await request('/'+seat.code);remember(seat);adopt(data);}catch(e){seat=old;$('#error').textContent=e.message;}finally{busy=false;lastSignature='';render();}});
async function poll(){if(closed)return;if(seat&&!busy&&!polling){polling=true;try{const data=await request('/'+seat.code);if(!closed){adopt(data);if(reconnecting){$('#error').textContent='';reconnecting=false;}}}catch(e){reconnecting=true;$('#connection').textContent='Disconnected · retrying automatically';$('#error').textContent=e.message;if([401,404].includes(e.status)){stopStream();roomNode.hidden=true;$('#setup').hidden=false;remember(null);room=null;}}finally{polling=false;}}timer=setTimeout(poll,streamConnected?10000:1500);}
window.addEventListener('pagehide',stopStream);
$('#setup').hidden=!!seat&&!closed;$('#connection').textContent=seat&&!closed?'Reconnecting to your saved seat…':'Create a room or join with your friend’s code.';void poll();
