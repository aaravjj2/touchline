import {escapeHtml as esc} from './ui-kit.js';
export function parkCareer(eu){
 if(eu.pending)throw Error('Finish your saved live fixture before switching careers.');if(!eu.career)return;
 eu.careerLibrary||=[];eu.careerLibrary.push({id:'career-'+(eu.nextCareerId=(eu.nextCareerId||0)+1),career:structuredClone(eu.career)});
}
export function switchCareer(eu,id){
 if(eu.pending)throw Error('Finish your saved live fixture before switching careers.');const index=eu.careerLibrary?.findIndex(c=>c.id===id);if(index===undefined||index<0)throw Error('Choose a saved career.');
 const selected=eu.careerLibrary.splice(index,1)[0];parkCareer(eu);eu.career=selected.career;eu.browsingCareers=false;
}
export function renderCareerLibrary(eu){
 return `<section class="card mode-card"><span class="eyebrow">CAREER LIBRARY</span><h2>Your clubs. Separate worlds.</h2><p>Each career keeps its own funding, registrations, results and membership. Save exports include this library.</p>${eu.career?`<p>Current: <strong>${esc(eu.career.name)}</strong> · season ${eu.career.season}</p><button class="btn primary" data-action="eu-library-close">Continue current career</button>`:''}${(eu.careerLibrary||[]).map(row=>`<article class="manager-message"><h3>${esc(row.career.name)}</h3><p>${row.career.setup?.kind==='super-league'?'Super League':row.career.setup?.kind==='english-sandbox'?'English sandbox':'Historic & fantasy'} · season ${row.career.season}</p><button class="btn secondary" data-action="eu-library-switch" data-value="${esc(row.id)}">Resume ${esc(row.career.name)}</button></article>`).join('')}<h3>Start another career</h3><p>Your current career moves into the library when a new one starts.</p></section>`;
}
