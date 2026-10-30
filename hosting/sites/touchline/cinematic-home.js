import {showOpeningIntro} from './opening-intro.js';
import {escapeHtml as esc} from './ui-kit.js';
import {BUILD_VERSION} from './build-version.js';

// Presentation only: previews never change a mode's save or start a career.
export const HOME_MODES=Object.freeze([
 {id:'managerial',name:'Managerial mode',title:['CLUB','MANAGER'],eyebrow:'THE LONG GAME',description:'Choose your club. Build the squad. Make the calls that carry through a season.',cta:'Choose your club',action:'nav',value:'dynasty'},
 {id:'europe',name:'Draft & Europe',title:['DRAFT.','CONQUER.'],eyebrow:'ELEVEN PLACES. YOUR PICKS.',description:'Reveal a club and era, draft players in their natural positions, then take your XI into Europe.',cta:'Enter Draft & Europe',action:'nav',value:'europe'},
 {id:'player-career',name:'Player career',title:['PLAYER','CAREER.'],eyebrow:'ONE PLAYER. EVERY CHAPTER.',description:'Choose your first club and shape a footballer’s development, contracts and opportunities.',cta:'Enter Player career',action:'nav',value:'player-career'},
 {id:'match',name:'Match centre',title:['FIRST','WHISTLE.'],eyebrow:'STRAIGHT TO THE PITCH',description:'Pick real club sides for an exhibition, or prepare your next career fixture. Play or manage live.',cta:'Open Match centre',action:'nav',value:'match'},
 {id:'training',name:'Learn to play',title:['FIND','YOUR TOUCH.'],eyebrow:'A SKILL. A SITUATION. REPEAT.',description:'Practise passing, shooting and defending in repeatable situations. Your career stays separate.',cta:'Open Training ground',action:'training-ground',value:''},
 {id:'explorer',name:'Decision Lab',title:['REPLAY.','RETHINK.'],eyebrow:'REPLAY. RECONSIDER.',description:'Explore a saved practice match and try another decision. Your original result stays intact.',cta:'Open Match explorer',action:'nav',value:'explorer'}
]);
const icons={sound:'M4 9h4l5-4v14l-5-4H4z M17 8a6 6 0 0 1 0 8',expand:'M4 9V4h5 M15 4h5v5 M20 15v5h-5 M9 20H4v-5',settings:'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8 M12 3v2 M12 19v2 M3 12h2 M19 12h2 M6 6l1 1 M17 17l1 1 M6 18l1-1 M17 7l1-1',replay:'M4 10a8 8 0 1 1 1 8 M4 4v6h6'};
const icon=name=>`<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${icons[name]}"/></svg>`;
let selected='managerial',sound=false,audio=null,noise=null,gain=null,host={toast:()=>{}};
const selectedMode=()=>HOME_MODES.find(m=>m.id===selected)||HOME_MODES[0];
function contextMode(mode,resume){return mode.id==='managerial'&&resume?{...mode,title:['YOUR CLUB.','YOUR CALL.'],eyebrow:`SEASON ${resume.season} · ${resume.pending?'SAVED FIXTURE':'BACK IN THE DUGOUT'}`,description:`${resume.name}. ${resume.pending?'Your unfinished fixture is ready to resume.':'Your squad, calendar and decisions are waiting.'}`,cta:'Continue club career',action:'manager-destination',value:'office'}:mode;}
function feature(mode,resume){const m=contextMode(mode,resume);return `<p class="cinema-kicker">${esc(m.eyebrow)}</p><h1 id="launcher-title">${m.title.map(line=>`<span>${esc(line)}</span>`).join('')}</h1><p class="cinema-description">${esc(m.description)}</p><button class="cinema-enter" data-action="${m.action}" data-value="${m.value}"><span class="cinema-enter-arrow" aria-hidden="true">↗</span><span>${esc(m.cta)}</span></button>${mode.id==='managerial'?`<div class="cinema-shortcuts"><button data-action="eu-open-custom">Create a club</button><button data-action="eu-open-super">Explore Super League</button></div>`:''}`;}
export function renderCinematicHome(resume=null){
 const mode=selectedMode();
 return `<section class="cinema-home" aria-label="Touchline game launcher" data-cinema-resume="${esc(JSON.stringify(resume))}">
  <div class="cinema-art" aria-hidden="true"></div><div class="cinema-grain" aria-hidden="true"></div><div class="cinema-touchline" aria-hidden="true"></div>
  <header class="cinema-header"><a class="cinema-brand" href="#main" aria-label="Touchline home"><span class="cinema-monogram" aria-hidden="true">t<span>/</span>l</span><span>TOUCHLINE<small>FOOTBALL, ON YOUR TERMS.</small></span></a>
   <div class="cinema-tools"><button data-launcher="audio" aria-label="${sound?'Mute ambience':'Turn on ambience'}" aria-pressed="${sound}">${icon('sound')}<span>${sound?'Audio on':'Audio off'}</span></button><button data-launcher="fullscreen" aria-label="Toggle fullscreen" aria-pressed="false">${icon('expand')}<span>Fullscreen</span></button><button data-action="about" aria-label="Settings & saves">${icon('settings')}<span>Settings</span></button></div>
  </header>
  <div class="cinema-content"><nav class="cinema-modes" aria-label="Main navigation">${HOME_MODES.map((m,i)=>`<button class="cinema-mode${m.id===mode.id?' is-selected':''}" data-launcher-mode="${m.id}" ${m.id==='managerial'?'data-launcher="select"':`data-action="${m.action}" data-value="${m.value}"`} ${m.id===mode.id?'aria-current="true"':''}><span class="cinema-mode-number" aria-hidden="true">${String(i+1).padStart(2,'0')}</span><span>${esc(m.name)}</span><span class="cinema-mode-arrow" aria-hidden="true">↗</span></button>`).join('')}<a class="cinema-mode cinema-multiplayer" href="/duel"><span class="cinema-mode-number" aria-hidden="true">07</span><span>Multiplayer</span><span class="cinema-mode-arrow" aria-hidden="true">↗</span></a><a class="cinema-mode cinema-analytics" href="./analytics.html"><span class="cinema-mode-number" aria-hidden="true">08</span><span>Analytics</span><span class="cinema-mode-arrow" aria-hidden="true">↗</span></a></nav>
   <div class="cinema-feature" id="launcher-feature">${feature(mode,resume)}</div>
  </div>
  <div class="cinema-caption" aria-hidden="true"><span>THE MATCH IS ONLY<br>THE BEGINNING.</span><span class="cinema-year">20<span>26</span></span></div>
  <footer class="cinema-footer"><div><span class="cinema-wordmark">YOUR CLUB. YOUR CALL.</span><p>Independent football sandbox · Local saves</p></div><div class="cinema-footer-actions"><button data-launcher="replay">${icon('replay')} Replay intro</button><a href="/duel">Multiplayer · Draft Duel</a><a href="./analytics.html">Analytics · Real match data</a><a href="#career-desk">Career desk <span aria-hidden="true">↓</span></a><span class="cinema-build">v${esc(BUILD_VERSION)}</span></div></footer>
 </section>`;
}
function preview(root,id){
 const mode=HOME_MODES.find(m=>m.id===id);if(!mode||selected===id)return;selected=id;
 let resume=null;try{resume=JSON.parse(root.dataset.cinemaResume);}catch{}
 for(const b of root.querySelectorAll('[data-launcher-mode]')){const active=b.dataset.launcherMode===id;b.classList.toggle('is-selected',active);if(active)b.setAttribute('aria-current','true');else b.removeAttribute('aria-current');}
 root.querySelector('#launcher-feature').innerHTML=feature(mode,resume);
}
function stopAudio(){sound=false;if(audio){void audio.close().catch(()=>{});audio=null;noise=null;gain=null;}}
async function toggleAudio(root){
 const button=root.querySelector('[data-launcher=audio]');button.disabled=true;
 if(sound){stopAudio();}else{
  try{
   const Context=window.AudioContext||window.webkitAudioContext;if(!Context)throw Error('Audio is unavailable in this browser.');
   audio=new Context();const length=audio.sampleRate*2,buffer=audio.createBuffer(1,length,audio.sampleRate),samples=buffer.getChannelData(0);let n=6175,last=0;
   for(let i=0;i<length;i++){n=(Math.imul(1664525,n)+1013904223)>>>0;last=(last+.03*(n/4294967296*2-1))/1.03;samples[i]=last*4;}
   noise=audio.createBufferSource();noise.buffer=buffer;noise.loop=true;const filter=audio.createBiquadFilter();filter.type='lowpass';filter.frequency.value=350;gain=audio.createGain();gain.gain.value=.06;noise.connect(filter).connect(gain).connect(audio.destination);noise.start();const context=audio;await context.resume();if(audio!==context||!root.isConnected||document.hidden){await context.close().catch(()=>{});button.disabled=false;return;}sound=true;
  }catch(error){stopAudio();host.toast(error.message||'Audio is unavailable.');}
 }
 const b=root.querySelector('[data-launcher=audio]');b.disabled=false;b?.setAttribute('aria-pressed',String(sound));b?.setAttribute('aria-label',sound?'Mute ambience':'Turn on ambience');if(b)b.querySelector('span').textContent=sound?'Audio on':'Audio off';
}
export function syncCinematicHome(){
 const root=document.querySelector('.cinema-home');if(!root){stopAudio();selected='managerial';return;}
 root.querySelector('[data-launcher=fullscreen]')?.setAttribute('aria-pressed',String(!!document.fullscreenElement));
}
export function installCinematicHome(callbacks={}){
 host={...host,...callbacks};
 document.addEventListener('pointerover',e=>{const b=e.target.closest('[data-launcher-mode]');if(b&&matchMedia('(hover: hover)').matches&&e.pointerType!=='touch')preview(b.closest('.cinema-home'),b.dataset.launcherMode);});
 document.addEventListener('focusin',e=>{const b=e.target.closest('[data-launcher-mode]');if(b)preview(b.closest('.cinema-home'),b.dataset.launcherMode);});
 document.addEventListener('click',async e=>{
  if(e.target.closest('[data-action="training-ground"]')){stopAudio();const home=document.querySelector('.cinema-home');if(home){const control=home.querySelector('[data-launcher=audio]');control.setAttribute('aria-pressed','false');control.setAttribute('aria-label','Turn on ambience');control.querySelector('span').textContent='Audio off';}}
  const b=e.target.closest('[data-launcher]');if(!b)return;const root=b.closest('.cinema-home');if(!root)return;
  if(b.dataset.launcher==='audio')await toggleAudio(root);
  if(b.dataset.launcher==='select')preview(root,b.dataset.launcherMode);
  if(b.dataset.launcher==='fullscreen')try{if(document.fullscreenElement)await document.exitFullscreen();else if(document.documentElement.requestFullscreen)await document.documentElement.requestFullscreen();else throw Error('Fullscreen is unavailable in this browser.');}catch{host.toast('Fullscreen is unavailable here. Your current game is unchanged.');}
  if(b.dataset.launcher==='replay'){
   stopAudio();const control=root.querySelector('[data-launcher=audio]');control.setAttribute('aria-pressed','false');control.setAttribute('aria-label','Turn on ambience');control.querySelector('span').textContent='Audio off';showOpeningIntro({returnFocus:root.querySelector('[data-launcher=replay]')});
  }
 });
 document.addEventListener('keydown',e=>{
  const b=e.target.closest('[data-launcher-mode]');if(!b||!['ArrowDown','ArrowUp','Home','End'].includes(e.key))return;e.preventDefault();const buttons=[...b.closest('nav').querySelectorAll('[data-launcher-mode]')],i=buttons.indexOf(b),next=e.key==='Home'?0:e.key==='End'?buttons.length-1:(i+(e.key==='ArrowDown'?1:-1)+buttons.length)%buttons.length;buttons[next].focus();
 });
 document.addEventListener('fullscreenchange',syncCinematicHome);
 document.addEventListener('visibilitychange',()=>{if(document.hidden){stopAudio();const root=document.querySelector('.cinema-home');if(root){const b=root.querySelector('[data-launcher=audio]');b.setAttribute('aria-pressed','false');b.setAttribute('aria-label','Turn on ambience');b.querySelector('span').textContent='Audio off';}}});
 window.addEventListener('pagehide',stopAudio);
}
