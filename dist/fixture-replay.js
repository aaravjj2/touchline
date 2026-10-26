import {MatchView} from './match-3d.js';
import {FlowWorld} from './flow-world.js';
import {createMatch} from './engine.js';
let active=null;
const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function showFixtureReplay({match,home,away,formation='4-3-3',names=[]}){
 closeReplay();let dialog=document.querySelector('#fixture-replay');if(!dialog){dialog=document.createElement('dialog');dialog.id='fixture-replay';document.body.append(dialog);dialog.addEventListener('cancel',closeReplay);}
 dialog.innerHTML=`<div class="replay-top"><span class="eyebrow">LEGACY RESULT ILLUSTRATION</span><button class="btn ghost" data-replay="close" aria-label="Close highlights">Close ×</button></div><h2>${escape(home.name)} <span>vs</span> ${escape(away.name)}</h2><p>Legacy statistical result · illustrative animation, not a recorded physical match.</p><div class="recorded-score"><b id="recorded-score">0 : 0</b><span id="recorded-clock">KICK-OFF</span></div><div class="match-stage"><canvas id="recorded-canvas" role="img" aria-label="3D recorded match highlights"></canvas></div><div class="replay-bottom"><button class="btn secondary" data-replay="pause">Pause highlights</button><span id="recorded-status">Opening play</span></div>${names.length?`<details><summary>Your selected XI</summary><p>${names.map(escape).join(' · ')}</p></details>`:''}`;
 dialog.showModal();const canvas=dialog.querySelector('canvas'),view=new MatchView(canvas),state=createMatch({formation,seed:match.seed}).state;state.homeClub=home;state.awayClub=away;const world=new FlowWorld(state),goals=match.events.filter(e=>e.type==='goal'),plans=[{minute:Math.max(1,(goals[0]?.minute||10)-5),event:null},...goals.map(e=>({minute:e.minute,event:{...e,xg:.4,scorer:'Draft XI'}})),{minute:90,event:null}];
 if(view.renderer){view.renderer.setPixelRatio(1);view.width=0;}
 active={view,world,state,plans,index:0,score:[0,0],elapsed:0,paused:false,last:null,raf:null,match};plan();
 dialog.onclick=e=>{const a=e.target.closest('[data-replay]')?.dataset.replay;if(a==='close')closeReplay();if(a==='pause'&&active){active.paused=!active.paused;e.target.textContent=active.paused?'Resume highlights':'Pause highlights';active.last=null;}};
 function plan(){if(!active)return;const p=plans[active.index];state.minute=p.minute;state.events=p.event?[p.event]:[];world.plan(state);active.elapsed=0;}
 function frame(time){const a=active;if(!a)return;const dt=a.last===null?0:Math.min(.06,(time-a.last)/1000);a.last=time;if(!a.paused){world.update(dt);a.elapsed+=dt;if(world.ready(4)){const p=plans[a.index];if(p.event)a.score[p.event.team]++;dialog.querySelector('#recorded-score').textContent=a.score.join(' : ');a.index++;if(a.index>=plans.length){a.paused=true;dialog.querySelector('[data-replay="pause"]').disabled=true;dialog.querySelector('#recorded-clock').textContent='FULL-TIME';dialog.querySelector('#recorded-status').textContent=`Final result ${match.score.join(' : ')}${match.pens?' · decided on penalties':''}`;}else plan();}}
  if(!a.paused||!view.last||a.lastPaused!==a.paused)view.draw(world.pose(),state,{moving:!a.paused,reduced:matchMedia('(prefers-reduced-motion: reduce)').matches});a.lastPaused=a.paused;if(a.index<plans.length){const clock=dialog.querySelector('#recorded-clock'),status=dialog.querySelector('#recorded-status');if(clock.textContent!==state.minute+'′')clock.textContent=state.minute+'′';if(status.textContent!==world.phase)status.textContent=world.phase;}a.raf=requestAnimationFrame(frame);
 }
 active.raf=requestAnimationFrame(frame);
}
function closeReplay(){if(active){cancelAnimationFrame(active.raf);active.view.dispose();active=null;}document.querySelector('#fixture-replay')?.close();}
