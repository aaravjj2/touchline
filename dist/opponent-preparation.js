import {opponentBrief} from './manager-experience.js';
import {careerAvailability} from './career-availability.js';
import {escapeHtml as esc} from './ui-kit.js';
import {viewButton} from './manager-ui-kit.js';
export function preparationReport(c,fixture){
 const brief=opponentBrief(c,fixture);if(!brief)return null;
 const opp=fixture.opponent,ids=new Set((opp.xi||[]).map(p=>typeof p==='string'?p:p.id));
 // No XI means no claim about an opponent's selected players.
 const selected=(opp.roster||[]).filter(p=>ids.has(p.id)&&Number.isFinite(p.attack));
 const threat=[...selected].sort((a,b)=>b.attack-a.attack||String(a.id).localeCompare(String(b.id)))[0];
 const tired=c.xi.filter(id=>Number.isFinite(c.condition[id]?.energy)&&c.condition[id].energy<75).length;
 const bench=(c.management.matchBench||c.bench.slice(0,9)).filter(id=>c.bench.includes(id)&&c.condition[id]?.contract>0&&!careerAvailability(c,id));
 return {brief,threat:threat?{name:threat.name,attack:Math.round(threat.attack)}:null,tired,bench:bench.length,preset:c.management.preset};
}
export function renderPreparationReport(c,fixture){
 const report=preparationReport(c,fixture);if(!report)return '';
 const {brief:b,threat,tired,bench,preset}=report;
 return `<section class="mgr-prep-brief" aria-label="Opponent preparation"><header><span class="eyebrow">OPPONENT SNAPSHOT</span><h3>${esc(b.name)}</h3><p>${b.formation?esc(b.formation)+' · ':''}${b.attack===null?'Attack unknown':'Attack '+b.attack} · ${b.defense===null?'defence unknown':'defence '+b.defense}</p></header><div class="mgr-prep-decisions"><article><strong>Your approach</strong><p>${threat?esc(threat.name)+' has the highest attack attribute in their saved XI ('+threat.attack+').':'No selected-player attacking comparison is available.'} Your current approach is ${esc(preset)}.</p>${viewButton('Review match approach','squad-tab','tactics')}</article><article><strong>Fresh legs</strong><p>${tired?tired+' selected starters are below 75% energy. Compare eligible cover before making changes.':'All selected starters are at or above 75% energy.'}</p>${viewButton('Compare fresh options','rotation')}</article><article><strong>Matchday cover</strong><p>${bench} selected reserves have a valid contract and no recorded absence.</p>${viewButton('Review matchday bench','squad-tab','bench')}</article></div><small>Saved game attributes and current selections, not a prediction of the opponent’s lineup or tactical outcome.</small></section>`;
}
