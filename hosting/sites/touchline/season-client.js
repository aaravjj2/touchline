export function advanceInWorker(competition,overrides={},mode='matchday',{onProgress=()=>{},signal}={}){
 return new Promise((resolve,reject)=>{
  if(signal?.aborted){resolve({competition,results:[],cancelled:true});return;}
  const worker=new Worker(new URL('./season-worker.js',import.meta.url),{type:'module'});
  const cancel=()=>worker.postMessage({type:'cancel'});signal?.addEventListener('abort',cancel,{once:true});
  const done=()=>{clearTimeout(timer);signal?.removeEventListener('abort',cancel);worker.terminate();};
  const timer=setTimeout(()=>{done();reject(Error('Matchday took too long. Your saved competition is unchanged; retry.'));},90000);
  worker.onmessage=({data})=>{if(data.progress){onProgress(data.progress);return;}done();data.error?reject(Error(data.error)):resolve(data);};
  worker.onerror=e=>{done();reject(Error(e.message||'Matchday could not finish. Retry from your saved fixture.'));};worker.postMessage({competition,overrides,mode});
 });
}
