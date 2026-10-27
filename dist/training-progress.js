// Device practice preferences, kept separate from careers and replay archives.
export const SKILL_IDS=['passing','shooting','defending'];
export const trainingProgressKey=qa=>`touchline.practice${qa?'.qa':''}.v1`;
const count=value=>Number.isSafeInteger(value)&&value>=0?Math.min(value,1000000):0;
export function normalizeProgress(value){
 const skills={};
 for(const id of SKILL_IDS){const item=value?.version===1?value.skills?.[id]:null,attempts=count(item?.attempts);skills[id]={attempts,completed:Math.min(attempts,count(item?.completed))};}
 return {version:1,skills};
}
export function recordPractice(progress,id,won){
 if(!SKILL_IDS.includes(id)||typeof won!=='boolean')throw Error('Invalid practice result.');
 const next=normalizeProgress(progress),skill=next.skills[id];
 skill.attempts=Math.min(1000000,skill.attempts+1);
 if(won)skill.completed=Math.min(skill.attempts,skill.completed+1);
 return next;
}
export const nextPractice=progress=>SKILL_IDS.find(id=>!normalizeProgress(progress).skills[id].completed)||null;
export function readPractice(storage,key){try{return normalizeProgress(JSON.parse(storage.getItem(key)));}catch{return normalizeProgress(null);}}
export function savePractice(storage,key,progress){try{storage.setItem(key,JSON.stringify(normalizeProgress(progress)));return true;}catch{return false;}}
