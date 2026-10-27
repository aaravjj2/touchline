import {EXERCISES,trainingScenario} from './training-scenarios.js';
import {playFixture} from './fixture-player.js';
import {escapeHtml as esc} from './ui-kit.js';
import {trainingProgressKey,readPractice,savePractice,recordPractice,nextPractice} from './training-progress.js';
let active=false;
export function installTrainingGround(){
 document.addEventListener('click',async e=>{
  if(e.target.closest('[data-action]')?.dataset.action!=='training-ground'||active)return;
  active=true;let storage;try{storage=globalThis.localStorage;}catch{}
  const key=trainingProgressKey(new URLSearchParams(location.search).get('qa')==='1');let progress=readPractice(storage,key),saved=true;
  const dialog=document.createElement('dialog');dialog.className='training-ground';dialog.setAttribute('aria-label','Training ground');
  const render=()=>{
   const next=nextPractice(progress),completed=EXERCISES.filter(e=>progress.skills[e.id].completed).length;
   dialog.innerHTML=`<header><div><span class="eyebrow">PLAYING PRACTICE</span><h2>One skill. One situation.</h2><p>Pass, shoot and defend in repeatable 30-second situations. Career and exhibition progress stay separate.</p></div><button class="btn ghost" data-training-close>Close training</button></header><div class="training-progress"><strong>${completed} / 3 skills completed</strong><progress aria-label="Practice skills completed" value="${completed}" max="3"></progress><span>${next?'Next up: '+esc(EXERCISES.find(e=>e.id===next).title):'All three skills complete. Repeat any exercise to build confidence.'}</span></div><div class="training-grid">${EXERCISES.map((e,i)=>{const skill=progress.skills[e.id];return `<section class="card" data-skill-state="${skill.completed?'complete':e.id===next?'next':'ready'}"><span class="eyebrow">${skill.completed?'COMPLETED':e.id===next?'RECOMMENDED NEXT':'SKILL '+(i+1)}</span><h3>${esc(e.title)}</h3><p>${esc(e.copy)}</p><small>${esc(e.hint)}</small><span class="training-record">${skill.completed?skill.completed+' successful · ':''}${skill.attempts} finished attempts</span><button class="btn ${e.id===next?'primary':'secondary'}" data-exercise="${e.id}">Practice ${esc(e.title.toLowerCase())}</button></section>`;}).join('')}</div><p class="training-note" role="status">${saved?'Practice progress is stored on this device, separately from game saves.':'Practice progress could not be saved on this device. You can keep practising in this session.'}</p>`;
  };
  render();document.body.append(dialog);dialog.showModal();const close=()=>{dialog.close();dialog.remove();active=false;};dialog.addEventListener('cancel',e=>{e.preventDefault();close();});
  dialog.addEventListener('click',async e=>{
   if(e.target.closest('[data-training-close]')){close();return;}
   const button=e.target.closest('[data-exercise]');if(!button)return;
   dialog.querySelectorAll('button').forEach(b=>b.disabled=true);let id=button.dataset.exercise;
   try{
    dialog.close();
    while(id){
     const current=id,scenario=trainingScenario(current),next=EXERCISES[EXERCISES.findIndex(e=>e.id===current)+1];let requested=null;
     await playFixture({...scenario,team:0,startControl:true,stakes:'Training · '+scenario.exercise.title,exerciseNext:next?.title,
      onExerciseComplete:({won})=>{progress=recordPractice(progress,current,won);saved=savePractice(storage,key,progress);},
      onExerciseAction:action=>{requested=action==='retry'?current:next?.id;}
     });
     id=requested;
    }
    render();dialog.showModal();const summary=dialog.querySelector('.training-progress');summary.tabIndex=-1;summary.focus({preventScroll:true});dialog.scrollTop=0;
   }catch(error){render();if(!dialog.open)dialog.showModal();dialog.querySelector('.training-note').textContent=error.message;dialog.querySelector('[data-training-close]').focus();}
  });
 });
}
