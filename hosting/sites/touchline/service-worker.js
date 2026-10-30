import {BUILD_VERSION} from './build-version.js';
import {OFFLINE_ID} from './offline-version.js';
import {workerCacheName,offlineRetention,OFFLINE_CACHE_PREFIX} from './offline-storage.js';
const CACHE=`touchline-static-${BUILD_VERSION}-${OFFLINE_ID}`,META='/__touchline_static_manifest__';
const announce=async(message,error=false)=>{for(const client of await self.clients.matchAll({type:'window',includeUncontrolled:true}))client.postMessage({type:'TOUCHLINE_OFFLINE',message,error});};
const hash=async bytes=>[...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(n=>n.toString(16).padStart(2,'0')).join('');
self.addEventListener('install',event=>event.waitUntil((async()=>{
 const cache=await caches.open(CACHE),complete=await cache.match(META);if(complete)return;
 try{
  const response=await fetch('./offline-manifest.json',{cache:'no-store'});if(!response.ok)throw Error('Offline manifest unavailable.');const manifest=await response.json();if(manifest.version!==BUILD_VERSION||manifest.id!==OFFLINE_ID||!Array.isArray(manifest.files))throw Error('Build changed during preparation. Try again while online.');
  for(const file of manifest.files)if(typeof file.url!=='string'||!file.url.startsWith('/')||file.url.startsWith('//')||file.url.includes('..')||file.url.startsWith('/api/')||new URL(file.url,self.location.origin).origin!==self.location.origin||!Number.isSafeInteger(file.bytes)||file.bytes<0||!/^[a-f0-9]{64}$/.test(file.sha256))throw Error('Offline manifest contains an invalid static asset.');
  for(const file of manifest.files)if(file.sourceUrl&&(!file.url.endsWith('.html')||file.sourceUrl!=='/offline-html'+file.url+'.bin'))throw Error('Invalid offline HTML snapshot.');
  let cursor=0,finished=0,failure=null;await Promise.all(Array.from({length:8},async()=>{while(cursor<manifest.files.length&&!failure){try{const file=manifest.files[cursor++],r=await fetch(file.sourceUrl||file.url,{cache:'no-store'});if(!r.ok)throw Error('Failed offline asset: '+file.url);const bytes=await r.arrayBuffer();if(bytes.byteLength!==file.bytes||await hash(bytes)!==file.sha256)throw Error('Offline asset verification failed: '+file.url);const headers=new Headers(r.headers);headers.delete('Content-Encoding');headers.delete('Content-Length');if(file.sourceUrl)headers.set('Content-Type','text/html; charset=utf-8');await cache.put(file.url,new Response(bytes,{headers,status:200}));finished++;if(finished%50===0&&!failure)await announce(`Preparing offline play · ${finished} / ${manifest.files.length} files verified`);}catch(error){failure=error;}}}));if(failure)throw failure;
  await cache.put(META,Response.json({...manifest,preparedAt:Date.now(),previous:workerCacheName(self.registration.active?.scriptURL)}));await announce('Offline build verified. Use prepared build when ready.');
 }catch(error){await caches.delete(CACHE);await announce((error.name==='QuotaExceededError'?'Not enough browser storage to prepare this build. Clean up old builds or free space, then try again.':error.message)+' Previous builds and saves are retained.',true);throw error;}
})()));
// No skipWaiting or clients.claim on install: an update cannot replace a running game automatically.
self.addEventListener('message',event=>{if(event.data?.type!=='TOUCHLINE_ACTIVATE')return;event.waitUntil((async()=>{const clients=await self.clients.matchAll({type:'window',includeUncontrolled:true});if(clients.length>1){await announce('Close other Touchline tabs before applying the update. Saves remain unchanged.',true);return;}await self.skipWaiting();})());});
// Storage operations stay in the controlling worker, which knows its own pinned cache.
self.addEventListener('message',event=>{
 if(!['TOUCHLINE_STORAGE','TOUCHLINE_CLEANUP','TOUCHLINE_REMOVE'].includes(event.data?.type))return;
 event.waitUntil((async()=>{const port=event.ports?.[0];try{
  const clients=await self.clients.matchAll({type:'window',includeUncontrolled:true}),names=(await caches.keys()).filter(n=>n.startsWith(OFFLINE_CACHE_PREFIX)),builds=[];
  for(const name of names){const cache=await caches.open(name),response=await cache.match(META);let meta=null;try{meta=response?await response.json():null;}catch{}builds.push({name,complete:!!meta,preparedAt:meta?.preparedAt||0,bytes:meta?.files?.reduce((n,f)=>n+f.bytes,0)||0,previous:meta?.previous||null});}
  const action=event.data.type;if(action!=='TOUCHLINE_STORAGE'&&clients.length!==1)throw Error('Close other Touchline tabs before cleaning or removing offline builds.');
  let removed=[];
  if(action==='TOUCHLINE_CLEANUP'){
   const plan=offlineRetention(builds,CACHE,{windows:clients.length,previous:builds.find(b=>b.name===CACHE)?.previous,protectedNames:[self.registration.active,self.registration.waiting,self.registration.installing].map(w=>workerCacheName(w?.scriptURL))});
   for(const name of plan.remove){await caches.delete(name);removed.push(name);}
  }else if(action==='TOUCHLINE_REMOVE'){for(const name of names){await caches.delete(name);removed.push(name);}await self.registration.unregister();}
  const remaining=builds.filter(b=>!removed.includes(b.name));port?.postMessage({ok:true,windows:clients.length,builds:remaining.length,bytes:remaining.reduce((n,b)=>n+b.bytes,0),removed:removed.length});
 }catch(error){port?.postMessage({ok:false,error:error.message});}})());
});
self.addEventListener('fetch',event=>{
 const request=event.request,url=new URL(request.url);if(request.method!=='GET'||url.origin!==self.location.origin||url.pathname.startsWith('/api/')||['/service-worker.js','/offline-manifest.json'].includes(url.pathname))return;
 event.respondWith((async()=>{const cache=await caches.open(CACHE),key=url.pathname==='/'?'/index.html':url.pathname,cached=await cache.match(key);if(cached)return cached;return fetch(request);})());
});
