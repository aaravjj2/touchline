// Only the storage envelope changes. Portable archives still contain ordinary saves.
const DB='touchline.large-saves.v1',FORMAT='touchline-mode-pointer';
export const LARGE_SAVE_THRESHOLD=2000000;
const stores=new WeakMap(),issues=new Map();
function stateFor(storage,key){let map=stores.get(storage);if(!map)stores.set(storage,map=new Map());if(!map.has(key))map.set(key,{raw:storage.getItem(key),tail:Promise.resolve(),error:null,blocked:false,pending:0});return map.get(key);}
function status(key,message){if(message)issues.set(key,message);else issues.delete(key);if(typeof window!=='undefined')window.dispatchEvent(new CustomEvent('touchline-storage-status'));}
export function largeSaveNotice(){return [...issues.values()].join(' ');}
export function largeSaveReadError(){return [...issues.values()].find(s=>s.startsWith('Career could not be loaded.'))||'';}
export function largeSavePending(){return [...issues.values()].some(s=>s.startsWith('Saving career'));}
export function largeSaveUnsaved(){return [...issues.values()].some(s=>s.startsWith('Saving career')||s.startsWith('Career save failed.'));}
export function isLargeSave(value){return value?.format===FORMAT;}
function open(){return new Promise((resolve,reject)=>{let blocked=false;const request=indexedDB.open(DB,1);request.onupgradeneeded=()=>{request.result.createObjectStore('snapshots',{keyPath:'id'}).createIndex('mode','key');};request.onsuccess=()=>{if(blocked)request.result.close();else resolve(request.result);};request.onerror=()=>reject(request.error);request.onblocked=()=>{blocked=true;reject(Error('Career storage is blocked by another window.'));};});}
async function transaction(mode,action){const db=await open();try{return await new Promise((resolve,reject)=>{const tx=db.transaction('snapshots',mode);let value;tx.oncomplete=()=>resolve(value);tx.onerror=()=>reject(tx.error||Error('Career storage failed.'));tx.onabort=()=>reject(tx.error||Error('Career storage was interrupted.'));try{action(tx.objectStore('snapshots'),v=>value=v);}catch(error){tx.abort();reject(error);}});}finally{db.close();}}
async function hash(json){const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(json));return [...new Uint8Array(bytes)].map(n=>n.toString(16).padStart(2,'0')).join('');}
function validatePointer(pointer,key){if(pointer.version!==1||pointer.key!==key||typeof pointer.id!=='string'||!pointer.id||!/^[a-f0-9]{64}$/.test(pointer.sha256||''))throw Error('Unsupported or invalid career storage reference.');}
async function resolve(pointer,key){validatePointer(pointer,key);const row=await transaction('readonly',(store,done)=>{const r=store.get(pointer.id);r.onsuccess=()=>done(r.result);});if(!row||row.key!==key||row.sha256!==pointer.sha256||await hash(row.json)!==pointer.sha256)throw Error('Career snapshot is missing or damaged.');return JSON.parse(row.json);}
export async function readMode(key,storage=localStorage){
 const state=stateFor(storage,key),raw=storage.getItem(key);
 try{const value=raw===null?null:JSON.parse(raw);const result=isLargeSave(value)?await resolve(value,key):value;if(state.blocked){state.blocked=false;state.error=null;status(key,'');}return result;}
 catch(error){state.blocked=true;state.error=error;status(key,'Career could not be loaded. Its saved copy is protected. Open Settings & saves to import a recovery archive, or reload when device storage is available.');throw error;}
}
async function remove(id){await transaction('readwrite',store=>store.delete(id));}
async function prune(key,keep){await transaction('readwrite',store=>{const request=store.index('mode').openKeyCursor(IDBKeyRange.only(key));request.onsuccess=()=>{const cursor=request.result;if(!cursor)return;if(!keep.includes(cursor.primaryKey))store.delete(cursor.primaryKey);cursor.continue();};});}
export function writeModeJSON(key,json,storage=localStorage,{current=()=>true,retain=false}={}){
 const state=stateFor(storage,key);if(state.blocked)throw Error('The saved career is unreadable; recover it before writing.');
 const check=()=>{if(storage.getItem(key)!==state.raw)throw Error('This career changed in another window. Reload before continuing; that saved copy is preserved.');};
 if(!state.pending&&!isLargeSave(JSON.parse(state.raw||'null'))&&json.length<LARGE_SAVE_THRESHOLD){try{check();storage.setItem(key,json);state.raw=json;state.error=null;state.tail=Promise.resolve(true);status(key,'');return true;}catch(error){if(error.name!=='QuotaExceededError')throw error;}}
 state.pending++;status(key,'Saving career to device storage… Keep this window open until saving finishes.');
 const work=state.tail.catch(()=>{}).then(()=>withModeLock(key,async()=>{
  if(!current())return false;check();const before=state.raw,previous=JSON.parse(before||'null'),id=crypto.randomUUID(),sha256=await hash(json),legacyPrevious=before!==null&&!isLargeSave(previous)?{id:crypto.randomUUID(),key,json:before,sha256:await hash(before),createdAt:new Date().toISOString()}:null,pointer={format:FORMAT,version:1,key,id,sha256,...(isLargeSave(previous)?{previous:{format:FORMAT,version:1,key,id:previous.id,sha256:previous.sha256}}:legacyPrevious?{previous:{format:FORMAT,version:1,key,id:legacyPrevious.id,sha256:legacyPrevious.sha256}}:{})};let stored=false;
  try{await transaction('readwrite',store=>{store.put({id,key,sha256,json,createdAt:new Date().toISOString()});if(legacyPrevious)store.put(legacyPrevious);});stored=true;if(!current()){await remove(id);if(legacyPrevious)await remove(legacyPrevious.id);return false;}check();storage.setItem(key,JSON.stringify(pointer));state.raw=storage.getItem(key);state.error=null;if(!retain)try{await prune(key,[id,pointer.previous?.id]);}catch{}return true;}
  catch(error){if(stored)try{await remove(id);if(legacyPrevious)await remove(legacyPrevious.id);}catch{}throw error;}
 })).catch(error=>{state.error=error;throw error;}).finally(()=>{state.pending--;status(key,state.pending?'Saving career to device storage… Keep this window open until saving finishes.':state.error?'Career save failed. Keep this window open and export your progress or free device storage. '+state.error.message:'');});
 state.tail=work;work.catch(()=>{});return work;
}
export async function flushLargeSaves(storage=localStorage){const states=[...(stores.get(storage)?.values()||[])];await Promise.all(states.map(s=>s.tail));for(const state of states)if(state.error)throw state.error;}
// Recovery is explicit. Never silently show an empty/new career after a read failure.
export async function recoverPreviousMode(key,storage=localStorage){const pointer=JSON.parse(storage.getItem(key)||'null');if(!isLargeSave(pointer)||!pointer.previous)throw Error('No previous large-career snapshot is available.');const value=await resolve(pointer.previous,key);return value;}
export function resetModeState(key,storage=localStorage){const state=stateFor(storage,key);state.raw=storage.getItem(key);state.blocked=false;state.error=null;if(!state.pending)state.tail=Promise.resolve(true);status(key,'');}
export async function pruneModeSnapshots(key,storage=localStorage){const pointer=JSON.parse(storage.getItem(key)||'null');await prune(key,isLargeSave(pointer)?[pointer.id,pointer.previous?.id]:[]);}
export async function rawModeRecovery(keys,storage=localStorage){
 return Promise.all(keys.map(async key=>{const raw=storage.getItem(key),snapshots=[];let value=null;try{value=JSON.parse(raw||'null');}catch{}if(isLargeSave(value))for(const pointer of [value,value.previous].filter(Boolean)){const row=await transaction('readonly',(store,done)=>{const r=store.get(pointer.id);r.onsuccess=()=>done(r.result);});if(row)snapshots.push(row);}return {key,raw,snapshots};}));
}

function withModeLock(key,action){return globalThis.navigator?.locks?.request?navigator.locks.request('touchline-career:'+key,action):action();}
