import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { LEGENDS, MANAGERS } from '../dist/legends.js';
import { ENGLISH_PLAYERS } from '../dist/english-catalog.js';
import { SUPER_PLAYERS } from '../dist/super-catalog.js';
import { FOUNDING_PLAYERS } from '../dist/founding-squad.js';
import { playerAppearance } from '../dist/presentation.js';

const root = dirname(fileURLToPath(import.meta.url));
const out = (...parts) => join(root, ...parts);
const xml = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }[c]));
const color = c => /^#[0-9a-f]{3,8}$/i.test(c || '') ? c : '#8ea0b0';
const fileId = s => String(s).replace(/[^a-zA-Z0-9._-]+/g, '_').slice(0, 140);
const inkOn = hex => {
  const h = hex.replace('#', '');
  const n = h.length === 3 ? h.split('').map(ch => ch + ch).join('') : h.slice(0, 6);
  const r = parseInt(n.slice(0, 2), 16), g = parseInt(n.slice(2, 4), 16), b = parseInt(n.slice(4, 6), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 > 165 ? '#172028' : '#f6f3ec';
};
const band = rating => rating >= 90 ? { name: 'Elite', frame: '#d6c27a' } : rating >= 80 ? { name: 'Established', frame: '#c5d0dc' } : rating >= 70 ? { name: 'Squad', frame: '#b7c4b0' } : { name: 'Prospect', frame: '#8d97a3' };
const setOf = id => id.startsWith('founder-') ? 'founding' : id.startsWith('world-') ? 'super' : id.startsWith('sandbox-eng-') ? 'english' : 'legends';

function hair(style, tone, lean) {
  const x = 100 + lean;
  if (style === 0) return `<path d="M${x - 26} 100 Q${x} 68 ${x + 26} 100 Q${x} 86 ${x - 26} 100" fill="${tone}"/>`;
  if (style === 1) return `<path d="M${x - 28} 108 Q${x - 20} 62 ${x + 8} 74 Q${x + 30} 84 ${x + 24} 112" fill="${tone}"/>`;
  if (style === 2) return `<path d="M${x - 22} 96 Q${x} 70 ${x + 22} 96 L${x + 18} 132 Q${x} 120 ${x - 18} 132 Z" fill="${tone}"/>`;
  if (style === 3) return `<path d="M${x - 30} 112 h60 v12 h-60z" fill="${tone}"/><path d="M${x - 24} 112 Q${x} 78 ${x + 24} 112" fill="${tone}"/>`;
  if (style === 4) return `<path d="M${x - 28} 82 h56 v8 h-56z" fill="#1c2833"/><path d="M${x - 18} 90 Q${x} 66 ${x + 18} 90" fill="${tone}"/>`;
  return '';
}

function figure(p, a, o) {
  const shirt = color(o.shirt);
  const role = p.role || 'MID';
  const stance = role === 'GK' ? 20 : role === 'DEF' ? 16 : role === 'MID' ? 11 : 7;
  const lean = role === 'FWD' ? 8 : 0;
  const boot = ['#1b1b1b', '#f4f1ea', '#c4552a', '#24507a'][a.hash % 4];
  const sock = o.sock || '#f6f3ec';
  const mark = inkOn(shirt);
  return `<g transform="translate(${o.x || 0} ${o.y || 0})">
    <ellipse cx="100" cy="252" rx="48" ry="8" fill="#000" opacity=".28"/>
    <path d="M${76 - stance} 186 L${66 - stance} 236" stroke="${sock}" stroke-width="13" stroke-linecap="round"/>
    <path d="M${124 + stance} 186 L${134 + stance} 236" stroke="${sock}" stroke-width="13" stroke-linecap="round"/>
    <rect x="${58 - stance}" y="232" width="18" height="8" rx="3" fill="${boot}"/>
    <rect x="${124 + stance}" y="232" width="18" height="8" rx="3" fill="${boot}"/>
    <path d="M68 146 h64 l10 46 H58 Z" fill="${shirt}"/>
    <path d="M86 146 h28 l-6 18 H92 Z" fill="#000" opacity=".2"/>
    <path d="M70 154 L48 196" stroke="${shirt}" stroke-width="12" stroke-linecap="round"/>
    <path d="M130 154 L152 196" stroke="${shirt}" stroke-width="12" stroke-linecap="round"/>
    ${role === 'GK' ? `<circle cx="46" cy="198" r="8" fill="#f6f3ec"/><circle cx="154" cy="198" r="8" fill="#f6f3ec"/>` : `<circle cx="46" cy="198" r="5" fill="${a.skin}"/><circle cx="154" cy="198" r="5" fill="${a.skin}"/>`}
    ${o.number ? `<text x="100" y="182" text-anchor="middle" font-family="Impact,sans-serif" font-size="20" fill="${mark}">${xml(o.number)}</text>` : ''}
    <rect x="92" y="128" width="16" height="20" rx="6" fill="${a.skin}"/>
    <circle cx="${100 + lean}" cy="104" r="28" fill="${a.skin}"/>
    ${hair(a.hash % 6, a.hair, lean)}
    <circle cx="${92 + lean}" cy="106" r="1.7" fill="#2a211c" opacity=".55"/>
    <circle cx="${108 + lean}" cy="106" r="1.7" fill="#2a211c" opacity=".55"/>
  </g>`;
}

const motionKeys = '0;0.111;0.222;0.333;0.444;0.556;0.667;0.778;0.889;1';
const motionLabels = ['Idle', 'Jog', 'Sprint', 'Dribble', 'Pass', 'Shoot', 'Receive', 'Tackle', 'Celebrate', 'Idle'];
function pack(values) { return values.join(';'); }
function celebratePose(p, a) {
  if (p.role === 'GK') return { name: 'Gloves up', bob: -12, lean: 0, legL: -6, legR: 6, armL: -78, armR: -78 };
  if (p.role === 'DEF') return { name: 'Point', bob: -4, lean: 6, legL: 4, legR: -8, armL: 14, armR: -96 };
  if (p.role === 'MID') return { name: 'Arms wide', bob: -8, lean: 0, legL: -8, legR: 8, armL: -58, armR: 58 };
  return a.hash % 2
    ? { name: 'Slide', bob: 12, lean: 38, legL: 8, legR: -16, armL: -64, armR: 18 }
    : { name: 'Jump', bob: -18, lean: -6, legL: -10, legR: 10, armL: -74, armR: -74 };
}
function actionTracks(p, a) {
  const cel = celebratePose(p, a);
  const gk = p.role === 'GK';
  const bob = [0, -3, -6, -2, 2, -4, 1, gk ? 16 : 10, cel.bob, 0];
  const lean = [0, 8, 16, 6, 4, 14, -6, gk ? 52 : 34, cel.lean, 0];
  const legL = [8, -26, -42, -8, 6, 12, 20, gk ? 18 : -8, cel.legL, 8];
  const legR = [-6, 24, 38, 18, -38, -54, 6, gk ? -8 : -22, cel.legR, -6];
  const armL = [-10, 24, 36, -18, 10, -24, -30, gk ? -70 : 12, cel.armL, -10];
  const armR = [12, -20, -32, 14, -26, 18, -22, gk ? -8 : -6, cel.armR, 12];
  const labels = motionLabels.slice();
  labels[7] = gk ? 'Keeper save' : 'Tackle';
  labels[8] = cel.name;
  return { bob, lean, legL, legR, armL, armR, labels, dur: '9s', keys: motionKeys };
}
function celebrationTracks(p, a) {
  const cel = celebratePose(p, a);
  return {
    bob: [cel.bob, -18, 12, -4, cel.bob],
    lean: [cel.lean, -6, 38, 6, cel.lean],
    legL: [cel.legL, -10, 8, 4, cel.legL],
    legR: [cel.legR, 10, -16, -8, cel.legR],
    armL: [cel.armL, -74, -64, 14, cel.armL],
    armR: [cel.armR, -74, 18, -96, cel.armR],
    labels: [cel.name, 'Jump', 'Slide', 'Point', cel.name],
    dur: '4s',
    keys: '0;0.25;0.5;0.75;1',
  };
}
function actorSvg(p, a, tracks, title) {
  const shirt = color(p.color);
  const boot = ['#1b1b1b', '#f4f1ea', '#c4552a', '#24507a'][a.hash % 4];
  const skin = a.skin;
  const glove = p.role === 'GK' ? `<circle cx="0" cy="28" r="5" fill="#f6f3ec"/>` : `<circle cx="0" cy="28" r="3.2" fill="${skin}"/>`;
  const spin = (values) => `<animateTransform attributeName="transform" type="rotate" values="${pack(values)}" keyTimes="${tracks.keys}" dur="${tracks.dur}" repeatCount="indefinite"/>`;
  const labels = tracks.labels.map((label, i) => {
    const opacity = tracks.labels.map((_, j) => (j === i || (i === 0 && j === tracks.labels.length - 1) ? 1 : 0));
    if (i === tracks.labels.length - 1) return '';
    return `<text x="16" y="214" fill="#c6e86a" font-family="Arial,sans-serif" font-size="13" opacity="0">${xml(label)}<animate attributeName="opacity" calcMode="discrete" values="${pack(opacity)}" keyTimes="${tracks.keys}" dur="${tracks.dur}" repeatCount="indefinite"/></text>`;
  }).join('');
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 280 230" role="img">
  <style>@media (prefers-reduced-motion: reduce){animate,animateTransform{display:none}}</style>
  <rect width="280" height="230" fill="#141c24"/>
  <rect y="168" width="280" height="62" fill="#1c3a2e"/>
  <text x="16" y="24" fill="#8ea0b0" font-family="Arial,sans-serif" font-size="11" letter-spacing="1.2">${xml(title)}</text>
  <text x="16" y="55" fill="#f6f3ec" font-family="Impact,sans-serif" font-size="22"${String(p.name).length > 16 ? ' textLength="150" lengthAdjust="spacingAndGlyphs"' : ''}>${xml(p.name)}</text>
  ${tracks.labels.length > 5 ? `<circle r="7" fill="#f6f3ec" stroke="#172028" stroke-width="2">
    <animate attributeName="cx" values="150;156;164;142;190;250;118;150;150;150" keyTimes="${tracks.keys}" dur="${tracks.dur}" repeatCount="indefinite"/>
    <animate attributeName="cy" values="160;158;154;156;148;96;160;160;160;160" keyTimes="${tracks.keys}" dur="${tracks.dur}" repeatCount="indefinite"/>
    <animate attributeName="opacity" calcMode="discrete" values="0;0;0;1;1;1;1;0;0;0" keyTimes="${tracks.keys}" dur="${tracks.dur}" repeatCount="indefinite"/>
  </circle>` : ''}
  <g transform="translate(132 40)">
    <g>
      <animateTransform attributeName="transform" type="rotate" values="${tracks.lean.map(n => n + ' 48 90').join(';')}" keyTimes="${tracks.keys}" dur="${tracks.dur}" repeatCount="indefinite"/>
      <g>
        <animateTransform attributeName="transform" type="translate" values="${tracks.bob.map(n => '0,' + n).join(';')}" keyTimes="${tracks.keys}" dur="${tracks.dur}" repeatCount="indefinite"/>
        <g transform="translate(34 78)"><g>${spin(tracks.legL)}<path d="M0 0 V38" stroke="#f4f1ea" stroke-width="9" stroke-linecap="round"/><rect x="-7" y="36" width="14" height="6" rx="2" fill="${boot}"/></g></g>
        <g transform="translate(62 78)"><g>${spin(tracks.legR)}<path d="M0 0 V38" stroke="#f4f1ea" stroke-width="9" stroke-linecap="round"/><rect x="-7" y="36" width="14" height="6" rx="2" fill="${boot}"/></g></g>
        <path d="M28 52 h40 l6 30 H22 Z" fill="${shirt}"/>
        <path d="M40 52 h16 l-3 10 H43 Z" fill="#000" opacity=".2"/>
        <g transform="translate(30 56)"><g>${spin(tracks.armL)}<path d="M0 0 V28" stroke="${shirt}" stroke-width="8" stroke-linecap="round"/>${glove}</g></g>
        <g transform="translate(66 56)"><g>${spin(tracks.armR)}<path d="M0 0 V28" stroke="${shirt}" stroke-width="8" stroke-linecap="round"/>${glove}</g></g>
        <rect x="44" y="40" width="8" height="14" rx="3" fill="${skin}"/>
        <circle cx="48" cy="28" r="16" fill="${skin}"/>
        ${a.hash % 6 === 5 ? '' : `<path d="M34 24 Q48 8 62 24 Q48 18 34 24" fill="${a.hair}"/>`}
        <circle cx="42" cy="30" r="1.5" fill="#2a211c"/><circle cx="54" cy="30" r="1.5" fill="#2a211c"/>
      </g>
    </g>
  </g>
  ${labels}
</svg>`;
}

function modelSvg(p, a) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 320" role="img">
  <rect width="240" height="320" fill="#141c24"/>
  <rect y="250" width="240" height="70" fill="#1c3a2e"/>
  <text x="16" y="28" fill="#8ea0b0" font-family="Arial,sans-serif" font-size="11" letter-spacing="1.5">STYLIZED SQUAD FIGURE</text>
  <text x="16" y="48" fill="#f6f3ec" font-family="Impact,sans-serif" font-size="22">${xml(p.name)}</text>
  ${figure(p, a, { x: 20, y: 8, shirt: '#243140', sock: '#d5dde4' })}
  <text x="16" y="304" fill="#8ea0b0" font-family="Arial,sans-serif" font-size="11">${xml(p.role)} · not a photograph or a personal likeness</text>
</svg>`;
}

function nameLines(name) {
  const words = String(name).split(/\s+/);
  if (words.length < 2 || name.length <= 24) return [name];
  let first = words[0];
  let i = 1;
  while (i < words.length - 1 && (first + ' ' + words[i]).length <= 24) { first += ' ' + words[i]; i++; }
  const second = words.slice(i).join(' ');
  return second ? [first, second] : [name];
}
function fitted(text, x, y, size, width, anchor = 'start') {
  const squeeze = String(text).length > 22 ? ` textLength="${width}" lengthAdjust="spacingAndGlyphs"` : '';
  return `<text x="${x}" y="${y}" text-anchor="${anchor}" fill="#172028" font-family="Impact,sans-serif" font-size="${size}"${squeeze}>${xml(text)}</text>`;
}
function cardSvg(p, a) {
  const club = color(p.color);
  const metal = band(Math.round(p.rating || 0));
  const stats = [['ATT', p.attack], ['DEF', p.defense], ['CTL', p.control], ['STA', p.stamina]];
  const lines = nameLines(p.name);
  const name = lines.length === 1
    ? fitted(lines[0], 28, 338, 24, 264)
    : fitted(lines[0], 28, 326, 16, 264) + fitted(lines[1], 28, 346, 16, 264);
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 480" role="img">
  <rect width="320" height="480" rx="18" fill="#f6f3ec"/>
  <rect x="8" y="8" width="304" height="464" rx="14" fill="none" stroke="${metal.frame}" stroke-width="3"/>
  <rect x="8" y="8" width="10" height="464" fill="${club}"/>
  <text x="32" y="52" fill="#172028" font-family="Impact,sans-serif" font-size="40">${Math.round(p.rating || 0)}</text>
  <text x="292" y="40" text-anchor="end" fill="#5d6b78" font-family="Arial,sans-serif" font-size="12" letter-spacing="1.4">${xml(p.role)}</text>
  <text x="292" y="58" text-anchor="end" fill="#5d6b78" font-family="Arial,sans-serif" font-size="11">${xml(metal.name)}</text>
  <clipPath id="stage"><rect x="28" y="78" width="264" height="230"/></clipPath>
  <g clip-path="url(#stage)">
    <rect x="28" y="78" width="264" height="184" fill="#141c24"/>
    <rect x="28" y="262" width="264" height="46" fill="#1c3a2e"/>
    <g transform="translate(82 96) scale(.78)">${figure(p, a, { shirt: club, sock: '#f6f3ec', number: p.number || '' })}</g>
  </g>
  ${name}
  <text x="28" y="370" fill="#5d6b78" font-family="Arial,sans-serif" font-size="13"${String(p.club || '').length > 22 ? ' textLength="168" lengthAdjust="spacingAndGlyphs"' : ''}>${xml(p.club || '')}</text>
  <text x="292" y="370" text-anchor="end" fill="#5d6b78" font-family="Arial,sans-serif" font-size="13">${xml(p.era || '')}</text>
  ${stats.map(([label, value], i) => {
    const n = Math.max(0, Math.min(100, Math.round(value || 0)));
    const x = 28 + i * 72;
    return `<text x="${x}" y="396" fill="#5d6b78" font-family="Arial,sans-serif" font-size="10">${label}</text><text x="${x}" y="418" fill="#172028" font-family="Impact,sans-serif" font-size="20">${n}</text><rect x="${x}" y="428" width="56" height="4" fill="#e1ddd4"/><rect x="${x}" y="428" width="${Math.round(56 * n / 100)}" height="4" fill="${club}"/>`;
  }).join('')}
  <text x="28" y="458" fill="#8b97a3" font-family="Arial,sans-serif" font-size="10">Touchline card · authored ratings · stylized figure</text>
</svg>`;
}

const tagged = [
  ...LEGENDS.map(p => ({ ...p, set: 'legends' })),
  ...ENGLISH_PLAYERS.map(p => ({ ...p, set: 'english' })),
  ...SUPER_PLAYERS.map(p => ({ ...p, set: 'super' })),
  ...FOUNDING_PLAYERS.map(p => ({ ...p, set: 'founding' })),
];
const cards = [];
const seenCard = new Set();
for (const p of tagged) {
  const id = fileId(p.id);
  if (seenCard.has(id)) throw new Error('Card filename collision: ' + id);
  seenCard.add(id);
  cards.push({ ...p, file: id, set: p.set || setOf(p.id) });
}
const people = new Map();
for (const p of cards) {
  const person = fileId(p.personId || p.id);
  if (!people.has(person)) people.set(person, p);
}

mkdirSync(out('players'), { recursive: true });
mkdirSync(out('cards'), { recursive: true });
mkdirSync(out('animations'), { recursive: true });
mkdirSync(out('celebrations'), { recursive: true });
mkdirSync(out('moments'), { recursive: true });
mkdirSync(out('ui'), { recursive: true });
mkdirSync(out('screens'), { recursive: true });
mkdirSync(out('coaches'), { recursive: true });

for (const p of people.values()) {
  const a = playerAppearance(p);
  const id = fileId(p.personId || p.id);
  writeFileSync(out('players', id + '.svg'), modelSvg(p, a));
  writeFileSync(out('animations', id + '.svg'), actorSvg(p, a, actionTracks(p, a), 'MATCH MOTION · NOT A LIKENESS'));
  writeFileSync(out('celebrations', id + '.svg'), actorSvg(p, a, celebrationTracks(p, a), 'CELEBRATION · NOT A LIKENESS'));
}
for (const p of cards) {
  writeFileSync(out('cards', p.file + '.svg'), cardSvg(p, playerAppearance(p)));
}

const ui = {
  'button-primary.svg': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 220 48"><rect width="220" height="48" rx="8" fill="#c6e86a"/><text x="110" y="30" text-anchor="middle" font-family="Arial,sans-serif" font-size="14" font-weight="700" fill="#172028">Primary action</text></svg>`,
  'button-secondary.svg': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 220 48"><rect width="220" height="48" rx="8" fill="#243140"/><text x="110" y="30" text-anchor="middle" font-family="Arial,sans-serif" font-size="14" fill="#f6f3ec">Secondary action</text></svg>`,
  'button-quiet.svg': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 220 48"><rect width="220" height="48" rx="8" fill="none" stroke="#314252"/><text x="110" y="30" text-anchor="middle" font-family="Arial,sans-serif" font-size="14" fill="#c5d0dc">Quiet action</text></svg>`,
  'nav.svg': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 760 72"><rect width="760" height="72" rx="12" fill="#121920"/>${['Office', 'Squad', 'Transfers', 'Season', 'Club'].map((label, i) => `<rect x="${12 + i * 148}" y="10" width="140" height="52" rx="8" fill="${i === 1 ? '#c6e86a' : 'none'}"/><text x="${82 + i * 148}" y="41" text-anchor="middle" font-family="Arial,sans-serif" font-size="14" fill="${i === 1 ? '#172028' : '#c5d0dc'}">${label}</text>`).join('')}</svg>`,
  'pitch.svg': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 400"><rect width="640" height="400" fill="#1d4a3c"/><rect x="24" y="24" width="592" height="352" fill="none" stroke="#d7e7df" stroke-width="2"/><line x1="24" y1="200" x2="616" y2="200" stroke="#d7e7df"/><circle cx="320" cy="200" r="48" fill="none" stroke="#d7e7df"/><rect x="24" y="120" width="72" height="160" fill="none" stroke="#d7e7df"/><rect x="544" y="120" width="72" height="160" fill="none" stroke="#d7e7df"/></svg>`,
  'crest.svg': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 96"><path d="M8 8 h64 v48 l-32 32 L8 56 Z" fill="#172028"/><path d="M14 14 h52 v40 L40 78 14 54 Z" fill="#c6e86a"/></svg>`,
  'match-bar.svg': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 72"><rect width="720" height="72" fill="#121920"/><text x="24" y="42" fill="#f6f3ec" font-family="Arial,sans-serif" font-size="16">Home</text><text x="360" y="44" text-anchor="middle" fill="#c6e86a" font-family="Impact,sans-serif" font-size="32">0 : 0</text><text x="696" y="42" text-anchor="end" fill="#f6f3ec" font-family="Arial,sans-serif" font-size="16">Away</text><text x="360" y="64" text-anchor="middle" fill="#8ea0b0" font-family="Arial,sans-serif" font-size="11">23′ · FIRST HALF</text></svg>`,
  'input.svg': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 64"><text x="0" y="14" fill="#8ea0b0" font-family="Arial,sans-serif" font-size="12">Label</text><rect y="22" width="320" height="42" rx="8" fill="#10161c" stroke="#314252"/><text x="14" y="48" fill="#f6f3ec" font-family="Arial,sans-serif" font-size="14">Value</text></svg>`,
  'priority.svg': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 88"><rect width="640" height="88" fill="#18222c"/><rect width="4" height="88" fill="#e2a15a"/><text x="24" y="36" fill="#e2a15a" font-family="Arial,sans-serif" font-size="11" letter-spacing="1.2">NEEDS A DECISION</text><text x="24" y="62" fill="#f6f3ec" font-family="Impact,sans-serif" font-size="24">One clear next action</text></svg>`,
  'table.svg': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 180"><rect width="640" height="180" fill="#121920"/>${[0, 1, 2, 3].map(i => `<rect y="${i * 44}" width="640" height="44" fill="${i % 2 ? '#18222c' : 'none'}"/><text x="16" y="${28 + i * 44}" fill="#f6f3ec" font-family="Arial,sans-serif" font-size="14">${i + 1} Club</text><text x="620" y="${28 + i * 44}" text-anchor="end" fill="#c6e86a" font-family="Impact,sans-serif" font-size="18">${30 - i * 3}</text>`).join('')}</svg>`,
  'panel.svg': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 480 280"><rect width="480" height="280" rx="14" fill="#18222c"/><text x="24" y="40" fill="#8ea0b0" font-family="Arial,sans-serif" font-size="11" letter-spacing="1.4">SECTION</text><text x="24" y="78" fill="#f6f3ec" font-family="Impact,sans-serif" font-size="32">Panel title</text><text x="24" y="116" fill="#c5d0dc" font-family="Arial,sans-serif" font-size="14">Supporting line. One idea, then the action.</text></svg>`,
};
for (const role of ['GK', 'DEF', 'MID', 'FWD']) {
  ui[`role-${role.toLowerCase()}.svg`] = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="8" fill="#121920"/><text x="32" y="38" text-anchor="middle" fill="#c6e86a" font-family="Impact,sans-serif" font-size="18">${role}</text></svg>`;
}
for (const [name, body] of Object.entries(ui)) writeFileSync(out('ui', name), `<?xml version="1.0" encoding="UTF-8"?>\n${body}`);

const sample = cards.filter(p => p.set === 'founding').slice(0, 4);
const sampleCards = sample.map((p, i) => `<image href="../cards/${p.file}.svg" x="${24 + i * 150}" y="150" width="132" height="198"/>`).join('');
writeFileSync(out('screens', 'office.svg'), `<?xml version="1.0" encoding="UTF-8"?><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 960 600"><rect width="960" height="600" fill="#10161c"/><text x="32" y="48" fill="#8ea0b0" font-family="Arial,sans-serif" font-size="12">DESIGN BOARD · NOT USED BY THE GAME</text><text x="32" y="92" fill="#f6f3ec" font-family="Impact,sans-serif" font-size="42">Office</text><text x="32" y="124" fill="#c5d0dc" font-family="Arial,sans-serif" font-size="16">One fixture. At most three decisions. Then the match.</text>${sampleCards}</svg>`);
writeFileSync(out('screens', 'squad.svg'), `<?xml version="1.0" encoding="UTF-8"?><svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 960 600"><rect width="960" height="600" fill="#10161c"/><image href="../ui/pitch.svg" x="32" y="120" width="560" height="350"/><text x="32" y="48" fill="#8ea0b0" font-family="Arial,sans-serif" font-size="12">DESIGN BOARD · NOT USED BY THE GAME</text><text x="32" y="92" fill="#f6f3ec" font-family="Impact,sans-serif" font-size="42">Squad pitch</text><image href="../ui/panel.svg" x="620" y="120" width="308" height="180"/></svg>`);
writeFileSync(out('screens', 'transfers.svg'), `<?xml version="1.0" encoding="UTF-8"?><svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 960 600"><rect width="960" height="600" fill="#10161c"/><text x="32" y="48" fill="#8ea0b0" font-family="Arial,sans-serif" font-size="12">DESIGN BOARD · NOT USED BY THE GAME</text><text x="32" y="92" fill="#f6f3ec" font-family="Impact,sans-serif" font-size="42">One deal at a time</text>${sample.slice(0, 1).map(p => `<image href="../cards/${p.file}.svg" x="32" y="140" width="200" height="300"/>`).join('')}<image href="../ui/panel.svg" x="260" y="140" width="420" height="246"/></svg>`);
writeFileSync(out('screens', 'match.svg'), `<?xml version="1.0" encoding="UTF-8"?><svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 960 600"><rect width="960" height="600" fill="#10161c"/><image href="../ui/match-bar.svg" x="24" y="24" width="912" height="72"/><image href="../ui/pitch.svg" x="24" y="116" width="912" height="400"/><text x="40" y="560" fill="#8ea0b0" font-family="Arial,sans-serif" font-size="13">Score, clock, and pitch stay clear. Lineups and quality open on demand.</text></svg>`);

for (const m of MANAGERS) {
  const svg = `<?xml version="1.0" encoding="UTF-8"?><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 200"><rect width="320" height="200" rx="14" fill="#18222c"/><text x="24" y="42" fill="#c6e86a" font-family="Arial,sans-serif" font-size="12" letter-spacing="1.3">COACH</text><text x="24" y="84" fill="#f6f3ec" font-family="Impact,sans-serif" font-size="32">${xml(m.name)}</text><text x="24" y="114" fill="#c5d0dc" font-family="Arial,sans-serif" font-size="14">${xml(m.style)}</text><text x="24" y="150" fill="#8ea0b0" font-family="Arial,sans-serif" font-size="13">${xml(m.description)}</text></svg>`;
  writeFileSync(out('coaches', m.id + '.svg'), svg);
}

const moments = {
  'goal.svg': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 180"><style>@media (prefers-reduced-motion: reduce){animate,animateTransform{display:none}}</style><rect width="640" height="180" fill="#10161c"/><g><animateTransform attributeName="transform" type="translate" values="320,110;320,90;320,96" keyTimes="0;0.45;1" dur="0.7s" fill="freeze"/><text x="0" y="0" text-anchor="middle" fill="#c6e86a" font-family="Impact,sans-serif" font-size="84">GOAL<animate attributeName="font-size" values="28;84;72" keyTimes="0;0.45;1" dur="0.7s" fill="freeze"/></text></g><text x="320" y="150" text-anchor="middle" fill="#f6f3ec" font-family="Arial,sans-serif" font-size="16">The score changes. The pitch stays clear.</text></svg>`,
  'half-time.svg': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 180"><rect width="640" height="180" fill="#10161c"/><text x="40" y="78" fill="#8ea0b0" font-family="Arial,sans-serif" font-size="14" letter-spacing="1.6">HALF-TIME</text><text x="40" y="124" fill="#f6f3ec" font-family="Impact,sans-serif" font-size="42">A moment to regroup.</text></svg>`,
  'full-time.svg': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 180"><rect width="640" height="180" fill="#10161c"/><text x="40" y="78" fill="#c6e86a" font-family="Arial,sans-serif" font-size="14" letter-spacing="1.6">FULL-TIME</text><text x="40" y="124" fill="#f6f3ec" font-family="Impact,sans-serif" font-size="42">The result is in the record.</text></svg>`,
  'substitution.svg': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 160"><rect width="640" height="160" fill="#18222c"/><rect width="8" height="160" fill="#c6e86a"/><text x="32" y="58" fill="#8ea0b0" font-family="Arial,sans-serif" font-size="13" letter-spacing="1.4">SUBSTITUTION</text><text x="32" y="104" fill="#f6f3ec" font-family="Impact,sans-serif" font-size="36">One player off. One player on.</text></svg>`,
  'kickoff.svg': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 180"><style>@media (prefers-reduced-motion: reduce){animate{display:none}}</style><rect width="640" height="180" fill="#10161c"/><circle cx="96" cy="90" r="18" fill="none" stroke="#c6e86a" stroke-width="3"><animate attributeName="r" values="8;28;8" dur="1.6s" repeatCount="indefinite"/><animate attributeName="opacity" values="1;0;1" dur="1.6s" repeatCount="indefinite"/></circle><text x="140" y="100" fill="#f6f3ec" font-family="Impact,sans-serif" font-size="42">Kick off</text></svg>`,
};
for (const [name, body] of Object.entries(moments)) writeFileSync(out('moments', name), `<?xml version="1.0" encoding="UTF-8"?>\n${body}`);

const manifest = {
  generated: '2026-10-22',
  note: 'Source art library. Static portrait and coach derivatives are used from dist/assets/library; motion studies and the direct-control prototype remain separate.',
  motions: ['idle', 'jog', 'sprint', 'dribble', 'pass', 'shoot', 'receive', 'tackle or keeper-save', 'celebrate'],
  celebrations: ['signature', 'jump', 'slide', 'point'],
  counts: { cards: cards.length, players: people.size, animations: people.size, celebrations: people.size, coaches: MANAGERS.length, moments: Object.keys(moments).length },
  sets: {
    legends: cards.filter(p => p.set === 'legends').length,
    english: cards.filter(p => p.set === 'english').length,
    super: cards.filter(p => p.set === 'super').length,
    founding: cards.filter(p => p.set === 'founding').length,
  },
  cards: cards.map(p => ({
    id: p.id, personId: p.personId || p.id, name: p.name, club: p.club, era: p.era, role: p.role,
    rating: Math.round(p.rating || 0), set: p.set, card: `cards/${p.file}.svg`, model: `players/${fileId(p.personId || p.id)}.svg`,
    animation: `animations/${fileId(p.personId || p.id)}.svg`, celebration: `celebrations/${fileId(p.personId || p.id)}.svg`,
  })),
};
writeFileSync(out('manifest.json'), JSON.stringify(manifest));

const gallery = `<!doctype html>
<meta charset="utf-8">
<title>Touchline asset library</title>
<style>
  body{margin:0;background:#10161c;color:#f6f3ec;font:14px Arial,sans-serif}
  header,main{padding:20px 24px}
  h1{font:32px Impact,sans-serif;margin:0 0 8px}
  p{color:#8ea0b0;max-width:720px}
  .row{display:flex;gap:8px;flex-wrap:wrap;margin:16px 0}
  button{background:#18222c;color:#f6f3ec;border:1px solid #314252;border-radius:8px;padding:8px 12px;cursor:pointer}
  button.on{background:#c6e86a;color:#172028;border-color:#c6e86a}
  .grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:12px}
  img{width:100%;background:#f6f3ec;border-radius:10px}
  small{display:block;margin-top:4px;color:#8ea0b0}
</style>
<header>
  <h1>Asset library</h1>
  <p>Original figures and cards for every player already in the game. This page only browses the folder. Nothing here is loaded by Touchline.</p>
  <div class="row" id="filters"></div>
  <div class="row"><button id="prev" type="button">Previous</button><span id="page"></span><button id="next" type="button">Next</button></div>
</header>
<main><div class="grid" id="grid"></div></main>
<script type="application/json" id="data">${JSON.stringify(manifest.cards)}</script>
<script>
const cards = JSON.parse(document.getElementById('data').textContent);
const filters = ['All', 'legends', 'english', 'super', 'founding'];
let set = 'All', page = 0, size = 24;
const box = document.getElementById('filters');
function draw(){
  const list = cards.filter(c => set === 'All' || c.set === set);
  const pages = Math.max(1, Math.ceil(list.length / size));
  page = Math.min(page, pages - 1);
  const slice = list.slice(page * size, page * size + size);
  document.getElementById('grid').innerHTML = slice.map(c => '<figure><img alt="'+c.name.replace(/"/g,'')+'" src="'+c.card+'"><small>'+c.name+' · '+c.rating+' '+c.role+'</small></figure>').join('');
  document.getElementById('page').textContent = (page + 1) + ' / ' + pages + ' · ' + list.length + ' cards';
}
filters.forEach(name => {
  const b = document.createElement('button');
  b.textContent = name; b.className = name === set ? 'on' : '';
  b.onclick = () => { set = name; page = 0; [...box.children].forEach(x => x.classList.toggle('on', x.textContent === name)); draw(); };
  box.append(b);
});
document.getElementById('prev').onclick = () => { page = Math.max(0, page - 1); draw(); };
document.getElementById('next').onclick = () => { page += 1; draw(); };
draw();
</script>`;
writeFileSync(out('gallery.html'), gallery);

const motionEntries = [...people.values()].map(p => {
  const id = fileId(p.personId || p.id);
  return { name: p.name, role: p.role, set: p.set, animation: `animations/${id}.svg`, celebration: `celebrations/${id}.svg` };
});
const motionGallery = `<!doctype html>
<meta charset="utf-8">
<title>Touchline motion library</title>
<style>
  body{margin:0;background:#10161c;color:#f6f3ec;font:14px Arial,sans-serif}
  header,main{padding:20px 24px}
  h1{font:32px Impact,sans-serif;margin:0 0 8px}
  p{color:#8ea0b0;max-width:760px}
  .row{display:flex;gap:8px;flex-wrap:wrap;margin:16px 0;align-items:center}
  button{background:#18222c;color:#f6f3ec;border:1px solid #314252;border-radius:8px;padding:8px 12px;cursor:pointer}
  button.on{background:#c6e86a;color:#172028;border-color:#c6e86a}
  .grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:16px}
  object{width:100%;height:230px;background:#141c24;border-radius:10px}
  small{display:block;margin-top:6px;color:#8ea0b0}
</style>
<header>
  <h1>Motion library</h1>
  <p>Each person has a nine-second match cycle and a four-second celebration. Keepers dive. Outfield players tackle. Celebrations follow the role: gloves up, point, arms wide, slide, or jump. These files are not loaded by the game.</p>
  <div class="row" id="filters"></div>
  <div class="row"><button id="prev" type="button">Previous</button><span id="page"></span><button id="next" type="button">Next</button></div>
</header>
<main><div class="grid" id="grid"></div></main>
<script type="application/json" id="data">${JSON.stringify(motionEntries)}</script>
<script>
const people = JSON.parse(document.getElementById('data').textContent);
const filters = ['All','legends','english','super','founding'];
let set = 'All', page = 0, size = 6;
const box = document.getElementById('filters');
function draw(){
  const list = people.filter(p => set === 'All' || p.set === set);
  const pages = Math.max(1, Math.ceil(list.length / size));
  page = Math.min(page, pages - 1);
  const slice = list.slice(page * size, page * size + size);
  document.getElementById('grid').innerHTML = slice.map(p => '<figure><object type="image/svg+xml" data="'+p.animation+'"></object><object type="image/svg+xml" data="'+p.celebration+'"></object><small>'+p.name+' · '+p.role+'</small></figure>').join('');
  document.getElementById('page').textContent = (page + 1)+' / '+pages+' · '+list.length+' players';
}
filters.forEach(name => {
  const b = document.createElement('button');
  b.textContent = name; b.className = name === set ? 'on' : '';
  b.onclick = () => { set = name; page = 0; [...box.children].forEach(x => x.classList.toggle('on', x.textContent === name)); draw(); };
  box.append(b);
});
document.getElementById('prev').onclick = () => { page = Math.max(0, page - 1); draw(); };
document.getElementById('next').onclick = () => { page += 1; draw(); };
draw();
</script>`;
writeFileSync(out('animation-gallery.html'), motionGallery);

writeFileSync(out('README.md'), `# Touchline asset library

Source artwork. Static portrait and coach derivatives are used from dist/assets/library. Run node scripts/promote-artwork.mjs after rebuilding. Motion studies and the direct-control prototype remain separate.

Generated 22 October 2026 from the player lists already in the game.

| Folder | Contents |
| --- | --- |
| \`players/\` | One stylized squad figure per person. ${people.size} files. |
| \`cards/\` | One card per roster entry. ${cards.length} files. |
| \`animations/\` | A nine-second match cycle per person: idle, jog, sprint, dribble, pass, shoot, receive, tackle or keeper save, then a celebration. |
| \`celebrations/\` | A four-second celebration per person: signature, jump, slide, and point. |
| \`moments/\` | Goal, half-time, full-time, substitution, and kickoff boards. |
| \`coaches/\` | The three coach identities. |
| \`ui/\` | Shared controls: navigation, buttons, pitch, match bar, table, panel. |
| \`screens/\` | Office, squad, transfer and match boards showing the new layout. |
| \`manifest.json\` | Index of every card, figure, animation, and celebration. |
| \`gallery.html\` | Local browser for the cards. Open the file directly. |
| \`animation-gallery.html\` | Local browser for the moving figures. Open the file directly. |
| \`on-pitch/\` | A separate 3D match you play yourself, against bots. Hand-authored, so this script leaves it alone. |

Counts: legends ${manifest.sets.legends}, English ${manifest.sets.english}, Super League world ${manifest.sets.super}, founding ${manifest.sets.founding}.

Figures are original geometric kit pieces. Skin, hair and build come from the existing player id hash. They are not photographs and not personal likenesses. Ratings, clubs and roles are the game's own authored values.

Card frames change with rating: 90+ Elite, 80–89 Established, 70–79 Squad, below 70 Prospect.

Motion names follow the game's visual sampler: idle, jog, sprint, dribble, pass, shoot, receive, tackle, keeper-save, and celebrate. Keepers dive instead of tackling. The celebration signature depends on role: goalkeepers raise their gloves, defenders point, midfielders open their arms, and forwards slide or jump. None of these files change a match.

Run \`node assets/build-library.mjs\` from the project root to regenerate the cards, figures and motion files. The \`on-pitch\` folder is a playable match and is not part of that regeneration.
`);

console.log(JSON.stringify({ cards: cards.length, players: people.size, animations: people.size, celebrations: people.size, moments: Object.keys(moments).length, coaches: MANAGERS.length, sets: manifest.sets }));

await import('./fix-library.mjs');
