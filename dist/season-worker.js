import {advance} from './competition.js';
let cancelled=false;
self.onmessage=async({data})=>{
 if(data.type==='cancel'){cancelled=true;return;}cancelled=false;
 try{const c=data.competition;let results=[];
  if(data.mode==='season'){
   if(!['league','europe','clubcup'].includes(c.format))throw Error('Unsupported competition.');
   let guard=0;while(!c.champion&&!cancelled&&guard++<80){results.push(...advance(c,{}, {fast:true}));self.postMessage({progress:{round:c.round,total:c.stage==='league'?c.schedule.length:2,stage:c.stage,fixtures:c.results.length}});await new Promise(resolve=>setTimeout(resolve,0));}
  }else results=advance(c,data.overrides||{},data.mode==='fast-matchday'?{fast:true}:{fastBackground:true});
  self.postMessage({competition:c,results,cancelled});
 }catch(error){self.postMessage({error:error.message});}
};
