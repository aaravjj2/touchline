import {founderSetup} from './founder-setup-ui.js';
import {pounds,GBP_PER_UNIT} from './manager-money.js';
import {FOUNDING_BUDGETS,FUNDING_BENCHMARK} from './club-funding.js';
import {WORLD_PACKS,SUPER_PACKS} from './super-catalog.js';
import {superSetup} from './super-setup-ui.js';
const ENGLISH_PACKS=WORLD_PACKS.filter(p=>p.country==='ENG');
export const customClubOptions=custom=>custom.league==='super-league'?SUPER_PACKS.filter(p=>p.country==='ENG'):ENGLISH_PACKS;
import {renderClubPicker} from './club-picker.js';
import {escapeHtml as esc,clubBadge} from './ui-kit.js';

export function syncCustomClubPreview(custom){
 const preview=document.querySelector('.create-club-layout .club-preview');if(!preview)return;
 const club=customClubOptions(custom).find(p=>p.id===custom.replace)||customClubOptions(custom)[0];
 preview.style.setProperty('--club',custom.color);preview.querySelector('h2').textContent=custom.name||'Your new club';
 const badge=preview.querySelector('.studio-badge');badge.style.setProperty('--club',custom.color);badge.textContent=(custom.name||'Your club').split(' ').slice(0,2).map(w=>w[0]).join('');
 preview.querySelector('.studio-metric strong').textContent=pounds(Number(custom.budget)*GBP_PER_UNIT);
 const paragraphs=preview.querySelectorAll('p');paragraphs[0].textContent='Replacing '+club.club+' · 20 clubs · 38 matchdays';paragraphs[1].textContent='18 original starter players · build your first team before kickoff.';
}

export function renderCareerSetup({kind,selected,query,historic,connected,custom,superSelected,superQuery}){
 const tabs=[['english','Current English clubs'],['super','Super League'],['custom','Create a club'],['historic','Historic & fantasy']];
 const nav=`<nav class="mode-tabs" aria-label="Career setup">${tabs.map(([id,label])=>`<button class="btn ${kind===id?'primary':'secondary'}" data-action="eu-setup-kind" data-value="${id}" aria-pressed="${kind===id}">${label}</button>`).join('')}</nav>`;
 const note=kind==='custom'&&custom.league==='super-league'?'<p class="sandbox-notice"><strong>Super League · 20 clubs · 38 matchdays.</strong> Your new English club replaces one of six English entrants. The other places are Spain 4, Germany 4, Italy 4 and France 2. Fictional league; fixed membership.</p>':'<p class="sandbox-notice"><strong>Premier League sandbox · 2026–27.</strong> Real clubs and imported players, with game ratings and budgets. League only; full real-world careers are still in development.</p>';
 if(kind==='super')return nav+superSetup(superSelected,superQuery);
 if(kind==='historic')return nav+renderClubPicker(historic.packs,historic.selected,historic.query)+`<div class="career-start-actions"><label><input type="checkbox" id="career-connected" ${connected?'checked':''}> Connected fantasy career · league, Touchline Cup & European Invitational</label><p class="stat-foot">Original game calendar and invitations. Verified real domestic careers remain locked.</p><button class="btn primary" data-action="eu-career-pack">Start club career</button></div>`;
 if(kind==='english')return nav+note+renderClubPicker(ENGLISH_PACKS,selected,query,{modern:true})+'<div class="career-start-actions"><button class="btn primary" data-action="eu-career-english">Start club career</button><p class="stat-foot">Budgets are authored game funds in pounds, not a club’s disclosed transfer budget. Historical careers remain available in Historic & fantasy.</p></div>';
 return nav+note+founderSetup(custom,customClubOptions(custom));
}

