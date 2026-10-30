import {writeModeJSON,flushLargeSaves} from './large-save.js';
const writers=new Map();
// Large manager saves publish a small reference only after their immutable
// IndexedDB snapshot commits. Small legacy saves remain synchronous.
export function modeStorage(key,onError=()=>{}){
 let worker=null,timer=null,generation=0,pending=null,latest=null,lastSave=0,inWorker=false,lastPromise=Promise.resolve(true),failure=null;
 const structured=/^touchline\.europe(?:\.qa)?\.v1$/.test(key);
 const fail=error=>{failure=error;onError(error);return false;};
 const commit=(json,id)=>{
  if(id!==generation)return false;
  try{const result=structured?writeModeJSON(key,json,localStorage,{current:()=>id===generation}):(localStorage.setItem(key,json),true);
   if(result?.then){lastPromise=result.then(value=>{if(value)failure=null;return value;}).catch(fail);return lastPromise;}failure=null;return result;
  }catch(error){return fail(error);}
 };
 function save(value,{background=false}={}){
  latest=value;pending=value;generation++;
  if(!background){clearTimeout(timer);timer=null;pending=null;inWorker=false;try{return commit(JSON.stringify(value),generation);}catch(error){return fail(error);}}
  if(timer)return true;
  timer=setTimeout(()=>{timer=null;try{
   if(!worker){worker=new Worker(new URL('./save-serializer.js',import.meta.url),{type:'module'});worker.onmessage=({data})=>{if(data.id!==generation)return;inWorker=false;if(data.error){fail(Error(data.error));return;}const saved=commit(data.json,data.id);if(saved?.then)saved.then(ok=>{if(ok)document.body.dataset.fixtureAutosave='worker';});else if(saved)document.body.dataset.fixtureAutosave='worker';};worker.onerror=fail;}
   lastSave=performance.now();const value=pending;pending=null;inWorker=true;worker.postMessage({id:generation,value});
  }catch(error){fail(error);}},Math.max(0,5000-(performance.now()-lastSave)));
  return true;
 }
 writers.set(key,{discard(){generation++;clearTimeout(timer);timer=null;pending=null;inWorker=false;latest=null;failure=null;lastPromise=Promise.resolve(true);},async flush(){if(pending!==null||inWorker){clearTimeout(timer);timer=null;pending=null;inWorker=false;generation++;const ok=await commit(JSON.stringify(latest),generation);if(!ok)throw failure||Error('Career save did not finish.');}await lastPromise;if(failure)throw failure;},unsaved:()=>failure?latest:null});
 return save;
}
export async function flushModeStorage(storage=globalThis.localStorage){for(const writer of writers.values())await writer.flush();if(storage)await flushLargeSaves(storage);}
export const unsavedModeValue=key=>writers.get(key)?.unsaved()||null;
export const discardModeWrites=key=>writers.get(key)?.discard();
