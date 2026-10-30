export const OFFLINE_CACHE_PREFIX='touchline-static-';
export function workerCacheName(scriptURL){
 try{const url=new URL(scriptURL),version=url.searchParams.get('build'),id=url.searchParams.get('id');return /^[-a-zA-Z0-9.]+$/.test(version||'')&&/^[a-f0-9]{20}$/.test(id||'')?OFFLINE_CACHE_PREFIX+version+'-'+id:null;}catch{return null;}
}
// Caller must establish that no other window uses an older worker before deleting.
export function offlineRetention(builds,current,{protectedNames=[],previous=null,windows=1}={}){
 const owned=builds.filter(b=>b.name.startsWith(OFFLINE_CACHE_PREFIX));
 if(windows!==1)return {keep:owned.map(b=>b.name),remove:[],blocked:true};
 const keep=new Set([current,...protectedNames].filter(Boolean));
 const rollback=owned.find(b=>b.name===previous&&b.complete&&!keep.has(b.name))||owned.filter(b=>b.complete&&!keep.has(b.name)).sort((a,b)=>(b.preparedAt||0)-(a.preparedAt||0)||b.name.localeCompare(a.name))[0];
 if(rollback)keep.add(rollback.name);
 return {keep:owned.filter(b=>keep.has(b.name)).map(b=>b.name),remove:owned.filter(b=>!keep.has(b.name)).map(b=>b.name),blocked:false};
}
