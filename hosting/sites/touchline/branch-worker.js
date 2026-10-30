import {branchRecord} from './match-record.js';
let cancelled=false;
self.onmessage=async({data})=>{
 if(data.type==='cancel'){cancelled=true;return;}
 cancelled=false;
 try{const record=await branchRecord(data.record,data.options,progress=>self.postMessage({progress}),()=>cancelled);self.postMessage({record});}
 catch(error){self.postMessage({error:error.message});}
};
