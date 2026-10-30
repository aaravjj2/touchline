import {advanceConnected} from './manager-season.js';
let cancelled=false,sequence=0;const acknowledgements=new Map();
self.onmessage=async({data})=>{
 if(data.type==='checkpoint-ack'){acknowledgements.get(data.id)?.();acknowledgements.delete(data.id);return;}
 if(data.type==='cancel'){cancelled=true;return;}cancelled=false;
 try{
  const result=await advanceConnected(data.career,{mode:data.mode,cancelled:()=>cancelled,onProgress:progress=>self.postMessage({progress}),onCheckpoint:career=>new Promise(resolve=>{const id=++sequence;acknowledgements.set(id,resolve);self.postMessage({checkpoint:career,checkpointId:id});})});
  self.postMessage({done:result});
 }catch(error){self.postMessage({error:error.message});}
};
