export function advanceManagerSeason(career,mode,{signal,onCheckpoint=()=>{},onProgress=()=>{}}={}){
 return new Promise((resolve,reject)=>{
  if(signal?.aborted){resolve({career,reason:'cancelled'});return;}
  const worker=new Worker(new URL('./manager-season-worker.js',import.meta.url),{type:'module'}),cancel=()=>worker.postMessage({type:'cancel'});
  signal?.addEventListener('abort',cancel,{once:true});
  let settled=false;const done=()=>{settled=true;clearTimeout(timer);signal?.removeEventListener('abort',cancel);worker.terminate();};
  const timer=setTimeout(()=>{done();reject(Error('Career simulation timed out. Completed checkpoints remain saved.'));},90000);
  worker.onmessage=({data})=>{if(settled)return;try{
   if(data.checkpoint){Promise.resolve().then(()=>onCheckpoint(data.checkpoint)).then(()=>{if(!settled)worker.postMessage({type:'checkpoint-ack',id:data.checkpointId});},error=>{if(!settled){done();reject(error);}});return;}if(data.progress){onProgress(data.progress);return;}
   done();if(data.error)reject(Error(data.error));else resolve(data.done);
  }catch(error){done();reject(error);}};
  worker.onerror=e=>{done();reject(Error(e.message||'Career worker failed; completed checkpoints are retained.'));};
  worker.postMessage({career,mode});
 });
}
