import * as THREE from '../../dist/vendor/three.module.js';
import { createStadium } from './pitch.js';
import { createAthlete, poseAthlete } from './athlete.js';
import { createMatch, kickoff, updateMatch, chooseStarter, seatFriend, HALF_L, HALF_W } from './match.js';
import { session } from './session.js';

const canvas = document.querySelector('#view');
const scoreEl = document.querySelector('#score');
const clockEl = document.querySelector('#clock');
const whoEl = document.querySelector('#who');
const whoAway = document.querySelector('#who-away');
const callEl = document.querySelector('#call');
const sheet = document.querySelector('#sheet');
const sheetRows = document.querySelector('#sheet-rows');
const keysEl = document.querySelector('#keys');
const banner = document.querySelector('#banner');
const gate = document.querySelector('#gate');
const start = document.querySelector('#start');
const again = document.querySelector('#again');
const friend = document.querySelector('#friend');
const meter = document.querySelector('#meter');
const meterFill = document.querySelector('#meter-fill');
const staminaFill = document.querySelector('#stamina-fill');
const radar = document.querySelector('#radar');
const radarInk = radar.getContext('2d');

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.shadowMap.enabled = true;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;

const { scene, camera } = createStadium();
const match = createMatch();
const views = match.players.map(player => {
  const view = createAthlete(player);
  scene.add(view.root);
  return view;
});
const labels = match.players.map(player => {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 64;
  const ink = canvas.getContext('2d');
  ink.font = '600 36px Arial';
  ink.fillStyle = '#ffffff';
  ink.textAlign = 'center';
  ink.fillText(player.name.split(' ').slice(-1)[0], 128, 44);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false }));
  sprite.scale.set(1.7, 0.42, 1);
  scene.add(sprite);
  return sprite;
});
const ball = new THREE.Mesh(new THREE.SphereGeometry(0.18, 18, 14), new THREE.MeshStandardMaterial({ color: '#f6f3ec', roughness: 0.45 }));
ball.castShadow = true;
const blob = new THREE.Mesh(new THREE.CircleGeometry(0.22, 16), new THREE.MeshBasicMaterial({ color: '#0c1a14', transparent: true, opacity: 0.35 }));
blob.rotation.x = -Math.PI / 2;
const aimRing = new THREE.Mesh(new THREE.RingGeometry(0.5, 0.72, 20), new THREE.MeshBasicMaterial({ color: '#c6e86a', side: THREE.DoubleSide, transparent: true, opacity: 0.9 }));
aimRing.rotation.x = -Math.PI / 2;
aimRing.visible = false;
const aimSpot = new THREE.Mesh(new THREE.CircleGeometry(1.25, 22), new THREE.MeshBasicMaterial({ color: '#c6e86a', transparent: true, opacity: 0.95, side: THREE.DoubleSide }));
aimSpot.rotation.x = -Math.PI / 2;
aimSpot.visible = false;
scene.add(ball, blob, aimRing, aimSpot);

const keys = new Set();
const pressed = new Set();
const released = new Set();
const look = new THREE.Vector3();
const camGoal = new THREE.Vector3();
let clock = new THREE.Clock();
let running = false;
let paused = false, soundEnabled = false;
let seat = session();
let audio;
let phaseSeen = 'ready';

const soloHelp = 'W A S D move · Shift sprint · J pass and run · K through ball · hold L to shoot · C slide · Tab joins the pass';
const bothHelp = 'You: W A S D, J pass and run, K through, L shoot, C slide, Tab joins the pass. Friend: arrows, right Shift, N pass, M through, ; shoot, . slide, Enter joins the pass.';

function whistle() {
  if (!soundEnabled) return;
  try {
    audio ||= new AudioContext();
    const now = audio.currentTime;
    const note = (freq, at, dur) => {
      const osc = audio.createOscillator();
      const gain = audio.createGain();
      osc.type = 'square';
      osc.frequency.value = freq;
      gain.gain.value = 0.03;
      osc.connect(gain);
      gain.connect(audio.destination);
      osc.start(now + at);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + at + dur);
      osc.stop(now + at + dur);
    };
    note(880, 0, 0.12);
    note(1040, 0.14, 0.18);
  } catch { /* sound stays off if the browser blocks it */ }
}

function drawRadar() {
  const w = radar.width;
  const h = radar.height;
  radarInk.clearRect(0, 0, w, h);
  radarInk.fillStyle = '#143626';
  radarInk.fillRect(0, 0, w, h);
  radarInk.strokeStyle = '#e7f3ea';
  radarInk.strokeRect(8, 8, w - 16, h - 16);
  radarInk.beginPath();
  const x = (metres) => 8 + ((metres + HALF_L) / (HALF_L * 2)) * (w - 16);
  const y = (metres) => 8 + ((metres + HALF_W) / (HALF_W * 2)) * (h - 16);
  radarInk.moveTo(x(0), 8);
  radarInk.lineTo(x(0), h - 8);
  radarInk.stroke();
  for (const p of match.players) {
    radarInk.fillStyle = p.team === 0 ? '#c6e86a' : '#d7dee6';
    radarInk.beginPath();
    radarInk.arc(x(p.x), y(p.z), p.human ? 4.5 : 3, 0, Math.PI * 2);
    radarInk.fill();
  }
  radarInk.fillStyle = '#f6f3ec';
  radarInk.beginPath();
  radarInk.arc(x(match.ball.x), y(match.ball.z), 2.4, 0, Math.PI * 2);
  radarInk.fill();
}

function fillSheet() {
  const total = match.stats[0].possession + match.stats[1].possession || 1;
  const home = Math.round(match.stats[0].possession / total * 100);
  const lines = [
    ['Shots', match.stats[0].shots, match.stats[1].shots],
    ['On target', match.stats[0].onTarget, match.stats[1].onTarget],
    ['Saves', match.stats[0].saves, match.stats[1].saves],
    ['Passes', match.stats[0].passes, match.stats[1].passes],
    ['Possession', home + '%', (100 - home) + '%'],
  ];
  sheetRows.innerHTML = lines.map(row => '<tr><th>' + row[0] + '</th><td>' + row[1] + '</td><td>' + row[2] + '</td></tr>').join('');
  sheet.hidden = false;
}

function size() {
  const width = canvas.clientWidth || window.innerWidth;
  const height = canvas.clientHeight || window.innerHeight;
  renderer.setSize(width, height, false);
  camera.aspect = width / Math.max(1, height);
  camera.updateProjectionMatrix();
}

function clockLabel(seconds) {
  const left = Math.max(0, 240 - seconds);
  const m = Math.floor(left / 60);
  const s = Math.floor(left % 60);
  return m + ':' + String(s).padStart(2, '0');
}

function frame() {
  const dt = clock.getDelta();
  if (running) {
    updateMatch(match, dt, { down: keys, pressed, released });
    pressed.clear();
    released.clear();
  }
  const controlled = match.players[match.control];
  for (let i = 0; i < match.players.length; i++) {
    poseAthlete(views[i], match.players[i], match.time);
    const person = match.players[i];
    labels[i].position.set(person.x, 2.2, person.z);
    const mine = person.human || person === match.ball.owner;
    labels[i].material.opacity = mine ? 1 : 0.55;
    labels[i].material.color.set(person.human ? '#c6e86a' : person.team === 0 ? '#f4f7f2' : '#d7dee6');
  }
  ball.position.set(match.ball.x, match.ball.y, match.ball.z);
  blob.position.set(match.ball.x, 0.03, match.ball.z);
  aimRing.visible = !!match.aim;
  if (match.aim) aimRing.position.set(match.aim.x, 0.05, match.aim.z);
  aimSpot.visible = !!match.aimSpot;
  if (match.aimSpot) aimSpot.position.set(match.aimSpot.x, 0.08, match.aimSpot.z);
  ball.rotation.x += ((match.ball.vz || 0) + (match.ball.owner ? match.ball.owner.speed * Math.cos(match.ball.owner.yaw) : 0)) * dt * 2.4;
  ball.rotation.z -= ((match.ball.vx || 0) + (match.ball.owner ? match.ball.owner.speed * Math.sin(match.ball.owner.yaw) : 0)) * dt * 2.4;
  look.set(controlled.x + 10, 0.6, controlled.z * 0.45 + match.ball.z * 0.25);
  camGoal.set(controlled.x - 26, 20, controlled.z * 0.35);
  camera.position.lerp(camGoal, 1 - Math.exp(-dt * 3.2));
  camera.lookAt(look);
  scoreEl.textContent = match.score[0] + ' – ' + match.score[1];
  clockEl.textContent = clockLabel(match.time);
  whoEl.textContent = controlled.name + ' · ' + controlled.role;
  staminaFill.style.width = Math.round((controlled.stamina ?? 1) * 100) + '%';
  meter.hidden = match.charge < 0.05;
  meterFill.style.width = Math.round(match.charge * 100) + '%';
  const away = match.controlAway >= 0 ? match.players[match.controlAway] : null;
  whoAway.hidden = !away;
  if (away) whoAway.textContent = away.name + ' · ' + away.role;
  if (match.phase !== phaseSeen) {
    if (match.phase === 'goal' || match.phase === 'half' || match.phase === 'full') whistle();
    phaseSeen = match.phase;
  }
  const show = match.phase === 'goal' || match.phase === 'full' || match.phase === 'half';
  banner.hidden = !show;
  if (match.phase === 'goal') banner.textContent = 'Goal' + (match.scorer ? ' · ' + match.scorer : '');
  if (match.phase === 'half') {
    banner.textContent = 'Half time · ' + match.score[0] + ' – ' + match.score[1];
    again.hidden = false;
    again.textContent = 'Second half';
    running = false;
  }
  if (match.phase === 'full') {
    banner.textContent = 'Full time · ' + match.score[0] + ' – ' + match.score[1];
    again.hidden = false;
    again.textContent = 'Play again';
    running = false;
    fillSheet();
  }
  callEl.hidden = show || match.time > match.callUntil || !match.call;
  callEl.textContent = match.call || '';
  drawRadar();
  radar.hidden = !gate.hidden;
  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}

addEventListener('resize', size);
addEventListener('keydown', event => {
  if (!gate.hidden || ['INPUT','SELECT','TEXTAREA','BUTTON'].includes(event.target.tagName)) return;
  if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Tab', 'Enter'].includes(event.code)) event.preventDefault();
  if (!keys.has(event.code)) pressed.add(event.code);
  keys.add(event.code);
});
addEventListener('keyup', event => {
  keys.delete(event.code);
  released.add(event.code);
});

document.querySelector('#cards').addEventListener('click', event => {
  const button = event.target.closest('[data-player]');
  if (!button) return;
  chooseStarter(match, button.dataset.player);
  for (const card of document.querySelectorAll('#cards button')) card.classList.toggle('you', card === button);
});

friend.addEventListener('click', () => {
  const on = friend.getAttribute('aria-pressed') !== 'true';
  friend.setAttribute('aria-pressed', String(on));
  seatFriend(match, on);
  seat = session(on ? 'human' : 'bot');
  keysEl.textContent = on ? bothHelp : soloHelp;
});

start.addEventListener('click', () => {
  gate.hidden = true;
  again.hidden = true;
  sheet.hidden = true;
  kickoff(match);
  running = true;
  phaseSeen = 'play';
  clock.getDelta();
  whistle();
});
again.addEventListener('click', () => {
  if (paused) { paused = false; running = true; again.hidden = true; clock.getDelta(); return; }
  if (match.phase === 'half') {
    match.phase = 'play';
    phaseSeen = 'play';
    again.hidden = true;
    banner.hidden = true;
    running = true;
    whistle();
    return;
  }
  again.hidden = true;
  banner.hidden = true;
  sheet.hidden = true;
  kickoff(match);
  running = true;
  phaseSeen = 'play';
  whistle();
});

size();
for (let i = 0; i < match.players.length; i++) poseAthlete(views[i], match.players[i], 0);
ball.position.set(0, 0.18, 0);
camera.position.set(-18, 12, 14);
camera.lookAt(0, 0, 0);
renderer.render(scene, camera);
requestAnimationFrame(frame);
window.touchlinePlay = { match, get seat() { return seat; }, kickoff: () => start.click() };

// Prototype controls are separate from the manager match engine.
const resetInput=()=>{keys.clear();pressed.clear();released.clear();};
const pauseOnLeave=()=>{resetInput();if(running){running=false;paused=true;again.textContent='Resume';again.hidden=false;}};
addEventListener('blur',pauseOnLeave);document.addEventListener('visibilitychange',()=>{if(document.hidden)pauseOnLeave();});
const soundToggle=document.createElement('button');soundToggle.textContent='Sound off';soundToggle.setAttribute('aria-pressed','false');friend.parentNode.appendChild(soundToggle);soundToggle.onclick=()=>{soundEnabled=!soundEnabled;soundToggle.textContent=soundEnabled?'Sound on':'Sound off';soundToggle.setAttribute('aria-pressed',String(soundEnabled));};
const touch=document.createElement('nav');touch.className='touch-controls';touch.setAttribute('aria-label','Touch match controls');
for(const [label,code] of [['↑','KeyW'],['←','KeyA'],['↓','KeyS'],['→','KeyD'],['Pass','KeyJ'],['Through','KeyK'],['Shoot','KeyL'],['Sprint','ShiftLeft'],['Slide','KeyC']]){const button=document.createElement('button');button.textContent=label;button.setAttribute('aria-label',label+' control');touch.appendChild(button);button.addEventListener('pointerdown',e=>{if(!gate.hidden)return;e.preventDefault();button.setPointerCapture(e.pointerId);keys.add(code);pressed.add(code);});for(const type of ['pointerup','pointercancel','lostpointercapture'])button.addEventListener(type,()=>{keys.delete(code);released.add(code);});}
document.body.appendChild(touch);const touchStyle=document.createElement('style');touchStyle.textContent='.touch-controls{display:none}@media(pointer:coarse){.touch-controls{display:flex;position:fixed;bottom:12px;left:8px;right:8px;gap:4px;flex-wrap:wrap;justify-content:center;z-index:5}.touch-controls button{min-height:42px;min-width:42px;touch-action:none}}';document.head.appendChild(touchStyle);
