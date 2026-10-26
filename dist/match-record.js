import {fixtureState,applyCommand,fixtureResult,RULES_VERSION,fixtureFingerprint,fingerprint} from './fixture-engine.js';
import {LiveWorld,LIVE_VERSION} from './live-world.js';
const copy=value=>structuredClone(value);
export const RECORD_VERSION=1;
export function recordIdentity(def,commands,namespace='normal'){return [namespace,def.home.id,def.away.id,def.seed,fixtureFingerprint(def),fingerprint(commands)].join(':');}
export function recordMatches(record,def,commands){return !!record?.definition&&fixtureFingerprint(record.definition)===fixtureFingerprint(def)&&fingerprint(record.commands)===fingerprint(commands);}
export function assertPhysicalRecord(record){
 if(!record?.definition||![LIVE_VERSION,'2.1.0'].includes(record.definition.version))throw Error('This record needs its original engine; alternative playback is unavailable.');
 if(record.definition.rulesVersion&&record.definition.rulesVersion!==(record.definition.version==='2.1.0'?'incidents-1':RULES_VERSION))throw Error('This replay requires its recorded football rules.');
 if(record.definition.version==='2.1.0'&&(record.definition.incidentVersion!==1||!record.definition.incidentContext))throw Error('Recorded incident context required.');
 if(record.result?.engineVersion==='fast-season-1')throw Error('Statistical fixtures have no physical replay.');
}
export function stateAt(record,tick){
 assertPhysicalRecord(record);tick=Math.max(0,Math.min(14400,Math.floor(tick)));
 const point=[...(record.checkpoints||[])].filter(c=>c.tick<=tick&&c.state?.world?.ticks===c.tick).sort((a,b)=>b.tick-a.tick)[0];
 const state=point?copy(point.state):fixtureState(record.definition);let world=new LiveWorld(state),index=state.actions.length;
 while(world.ticks<tick){while(record.commands?.[index]?.tick===world.ticks){world.writeState(state);applyCommand(state,record.commands[index++]);world=new LiveWorld(state);}world.fixed();}
 world.writeState(state);return state;
}
export function decisionSnapshot(definition,state){
 return {version:RECORD_VERSION,engineVersion:definition.version,tick:state.world.ticks,definition:copy(definition),state:copy(state)};
}
export async function branchRecord(parent,{tick,team=0,command},onProgress=()=>{},cancelled=()=>false){
 assertPhysicalRecord(parent);
 if(!Number.isInteger(tick)||tick<0||tick>=14400)throw Error('Choose a decision before full-time.');
 const state=stateAt(parent,tick),prefix=copy(state.actions),future=(parent.commands||[]).slice(prefix.length);let world=new LiveWorld(state),index=0;
 // Commands already scheduled at this tick occur before the alternative intervention.
 while(future[index]?.tick===tick){world.writeState(state);applyCommand(state,future[index++]);world=new LiveWorld(state);}
 world.writeState(state);const intervention=applyCommand(state,{...command,team});world=new LiveWorld(state);
 const checkpoints=[{tick,state:copy(state)}];
 while(world.ticks<14400){
  if(cancelled())throw Error('Alternative cancelled. Your original match is unchanged.');
  const end=Math.min(14400,world.ticks+600);
  while(world.ticks<end){while(future[index]?.tick===world.ticks){world.writeState(state);applyCommand(state,future[index++]);world=new LiveWorld(state);}world.fixed();}
  world.writeState(state);checkpoints.push({tick:world.ticks,state:copy(state)});onProgress(world.ticks/14400);
  await new Promise(resolve=>setTimeout(resolve,0));
 }
 return {version:RECORD_VERSION,kind:'physical',engineVersion:parent.definition.version,parentId:parent.id||null,branchTick:tick,intervention,definition:copy(parent.definition),commands:copy(state.actions),checkpoints,result:fixtureResult(parent.definition,state),prefix};
}
