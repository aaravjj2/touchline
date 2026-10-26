import {EXERCISES,trainingScenario} from './training-scenarios.js';
import {playFixture} from './fixture-player.js';
import {escapeHtml as esc} from './ui-kit.js';
let active=false;
export function installTrainingGround(){
 document.addEventListener('click',async e=>{
  if(e.target.closest('[data-action]')?.dataset.action!=='training-ground'||active)return;
  active=true;const dialog=document.createElement('dialog');dialog.className='training-ground';dialog.setAttribute('aria-label','Training ground');
  dialog.innerHTML=`<header><div><span class="eyebrow">PLAYING PRACTICE</span><h2>One skill. One situation.</h2><p>Repeat the same 30-second scenario. Career and exhibition progress stay separate.</p></div><button class="btn ghost" data-training-close>Close training</button></header><div class="training-grid">${EXERCISES.map(e=>`<section class="card"><span class="eyebrow">30 SECONDS · REPEATABLE</span><h3>${esc(e.title)}</h3><p>${esc(e.copy)}</p><small>${esc(e.hint)}</small><button class="btn primary" data-exercise="${e.id}">Practice ${esc(e.title.toLowerCase())}</button></section>`).join('')}</div><p class="training-note" role="status">Practice uses original Touchline players and the same match simulation.</p>`;
  document.body.append(dialog);dialog.showModal();const close=()=>{dialog.close();dialog.remove();active=false;};dialog.querySelector('[data-training-close]').onclick=close;dialog.addEventListener('cancel',e=>{e.preventDefault();close();});
  dialog.addEventListener('click',async e=>{const button=e.target.closest('[data-exercise]');if(!button)return;const buttons=[...dialog.querySelectorAll('button')];buttons.forEach(b=>b.disabled=true);try{
   const scenario=trainingScenario(button.dataset.exercise);dialog.close();await playFixture({...scenario,team:0,startControl:true,stakes:'Training · '+scenario.exercise.title});
   dialog.showModal();dialog.querySelector('.training-note').textContent='Ready to retry. Each attempt restarts from the same recorded situation.';
  }catch(error){if(!dialog.open)dialog.showModal();dialog.querySelector('.training-note').textContent=error.message;}finally{buttons.forEach(b=>b.disabled=false);button.focus();}});
 });
}
