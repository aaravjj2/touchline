import {allRecords,putRecords,saveRecord} from './replay-store.js';
import {BUILD_VERSION} from './build-version.js';
import {readMode,writeModeJSON,resetModeState,rawModeRecovery,recoverPreviousMode,pruneModeSnapshots} from './large-save.js';
import {flushModeStorage,unsavedModeValue,discardModeWrites} from './mode-storage.js';
export const SAVE_VERSION=1;
const normal=['touchline.v1','touchline.europe.v1','touchline.practice.v2','touchline.players.v1'];
const isolated=['touchline.qa.v2','touchline.europe.qa.v1','touchline.practice.qa.v2','touchline.players.qa.v1'];
export const saveKeys=qa=>qa?isolated:normal;
export async function backupBeforeUpgrade(storage=localStorage,qa=false){
 const marker=qa?'touchline.qa.release':'touchline.release',saves=await captureSaves(storage,qa);
 if(storage.getItem(marker)!=='2.7.0'){if(saves.some(Boolean))await saveRecord((qa?'qa':'normal')+':backup:before-2.7.0',{backup:{format:'touchline-save',version:SAVE_VERSION,createdAt:new Date().toISOString(),saves,replays:[]}});storage.setItem(marker,'2.7.0');}
 const buildMarker=marker+'.build-backup';if(storage.getItem(buildMarker)===BUILD_VERSION)return;
 if(saves.some(Boolean))await saveRecord((qa?'qa':'normal')+':backup:before-'+BUILD_VERSION,{backup:{format:'touchline-save',version:SAVE_VERSION,build:storage.getItem(buildMarker)||'previous-build-unknown',createdAt:new Date().toISOString(),saves,replays:[]}});
 storage.setItem(buildMarker,BUILD_VERSION);
}
export async function captureSaves(storage,qa=false){return Promise.all(saveKeys(qa).map(key=>readMode(key,storage)));}
export function validateArchive(value){
 if(value?.format!=='touchline-save'||value.version!==SAVE_VERSION||!Array.isArray(value.saves)||value.saves.length!==4||!Array.isArray(value.replays)||value.replays.length>1000)throw Error('Choose a supported Touchline save archive.');
 const [app,europe,practice,players]=value.saves;
 if(app!==null&&(!app||!Array.isArray(app.lineup)||typeof app.page!=='string'))throw Error('Invalid match save.');
 if(europe!==null&&(!europe||europe.version!==1||!Array.isArray(europe.history)))throw Error('Invalid Europe save.');
 if(europe?.format==='touchline-mode-pointer')throw Error('Portable archives must contain complete career data, not a device storage reference.');
 if(practice!==null&&!practice?.competition?.teams)throw Error('Invalid practice save.');
 if(players!==null&&(players?.version!==1||!Array.isArray(players.profiles)||players.profiles.length>8))throw Error('Invalid player career save.');
 for(const replay of value.replays)if(typeof replay.id!=='string'||!['normal','qa'].includes(replay.id.split(':')[0])||!replay.definition||!Array.isArray(replay.commands)||!Array.isArray(replay.checkpoints)||!replay.result)throw Error('Invalid replay record.');
 return value;
}
export async function exportArchive(storage=localStorage,qa=false,overrides={}){
 let replays=[],warning=null;try{await flushModeStorage(storage);}catch{warning='The latest device save failed. This export includes current in-memory progress where available.';}
 const saves=await Promise.all(saveKeys(qa).map(key=>Object.hasOwn(overrides,key)?overrides[key]:unsavedModeValue(key)||readMode(key,storage)));
 try{replays=await allRecords(qa?'qa':'normal');}catch{warning=[warning,'Replay storage was unavailable. Embedded match definitions are included.'].filter(Boolean).join(' ');}
 return {format:'touchline-save',version:SAVE_VERSION,build:BUILD_VERSION,createdAt:new Date().toISOString(),saves,replays,warning};
}
export async function importArchive(archive,storage=localStorage,qa=false){
 validateArchive(archive);try{await flushModeStorage(storage);}catch{}const keys=saveKeys(qa),previous=keys.map(k=>storage.getItem(k)),recovery=await rawModeRecovery(keys,storage);let backup=null;try{backup=await exportArchive(storage,qa);}catch{}
 await saveRecord((qa?'qa':'normal')+':backup:'+Date.now(),{...(backup?{backup}:{}),storageRecovery:recovery});
 keys.forEach(discardModeWrites);
 const prefix=qa?'qa':'normal',sourcePrefix=archive.replays[0]?.id.split(':')[0];
 const replays=archive.replays.map(row=>({...row,id:prefix+':'+row.id.split(':').slice(1).join(':')}));
 const saves=structuredClone(archive.saves);
 if(sourcePrefix&&sourcePrefix!==prefix){const rewrite=value=>{if(!value||typeof value!=='object')return;for(const [k,v] of Object.entries(value)){if(k==='replayId'&&typeof v==='string')value[k]=prefix+':'+v.split(':').slice(1).join(':');else if(typeof v==='object')rewrite(v);}};saves.forEach(rewrite);}
 try{for(let i=0;i<keys.length;i++){resetModeState(keys[i],storage);if(saves[i]===null)storage.removeItem(keys[i]);else if(i===1)await writeModeJSON(keys[i],JSON.stringify(saves[i]),storage,{retain:true});else storage.setItem(keys[i],JSON.stringify(saves[i]));}await putRecords(replays);for(const key of keys)resetModeState(key,storage);}
 catch{for(const key of keys)try{storage.removeItem(key);}catch{}for(let i=0;i<keys.length;i++){try{previous[i]===null?storage.removeItem(keys[i]):storage.setItem(keys[i],previous[i]);resetModeState(keys[i],storage);}catch{}}try{await pruneModeSnapshots(keys[1],storage);}catch{}throw Error('Import did not finish. Previous saves were retained; a recovery archive is also stored on this device.');}
 try{await pruneModeSnapshots(keys[1],storage);}catch{}return true;
}
export async function exportPreviousCareer(storage=localStorage,qa=false){const key=saveKeys(qa)[1],previous=await recoverPreviousMode(key,storage);const archive=await exportArchive(storage,qa,{[key]:previous});archive.warning='This archive contains the previous completed career snapshot. Importing it restores that earlier progress.';return archive;}
