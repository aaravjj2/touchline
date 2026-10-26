import {PACKS} from './legends.js';
// Presentation preferences never enter a fixture definition or gameplay archive.
export const PRESENTATION_VERSION=1;
const defaults={camera:'broadcast',quality:'auto',lighting:'auto',stadium:'auto',players:'standard'};
let cached=null;
const key=()=>new URLSearchParams(globalThis.location?.search||'').get('qa')==='1'?'touchline.presentation.qa.v1':'touchline.presentation.v1';
export function presentationPreferences(){
 if(cached)return cached;
 let stored={};try{stored=JSON.parse(globalThis.localStorage?.getItem(key())||'{}');}catch{}
 cached={...defaults};for(const k of Object.keys(defaults))if(valid(k,stored[k]))cached[k]=stored[k];return cached;
}
const valid=(k,v)=>({camera:['broadcast','tactical','player'],quality:['auto','low'],lighting:['auto','day','night'],stadium:['auto','compact','large'],players:['standard','detailed']}[k]||[]).includes(v);
export function setPresentationPreference(k,v){
 if(!valid(k,v))return false;cached={...presentationPreferences(),[k]:v};
 try{globalThis.localStorage?.setItem(key(),JSON.stringify(cached));}catch{}
 if(typeof document!=='undefined')document.dispatchEvent(new CustomEvent('touchline:presentation',{detail:cached}));return true;
}
export function identityHash(value='touchline'){let n=2166136261;for(const c of String(value))n=Math.imul(n^c.charCodeAt(0),16777619);return n>>>0;}
export function playerAppearance(player={}){
 const hash=identityHash(player.personId||player.id||player.name||'player');
 return {hash,skin:['#c68b65','#e2b38d','#77503b','#ad7453','#d6a17c','#654431'][hash%6],hair:['#211b19','#51382a','#9d7148','#15171c'][hash%4],height:.97+(hash%7)*.01,build:.94+(hash%5)*.025};
}
export function clubPresentation(team={}){
 const pack=team.id==='user'?PACKS.find(p=>team.name===p.club||team.name?.startsWith(p.club+' ')):null,hash=identityHash(team.id==='user'?team.name:team.id||team.name),prefs=presentationPreferences(),meta=team.presentation||{},color=meta.color||pack?.color||team.color;
 return {color:/^#[0-9a-f]{3,8}$/i.test(color||'')?color:'#b6f36a',hash,pattern:['solid','stripe','band'].includes(meta.pattern)?meta.pattern:['solid','stripe','band'][hash%3],stadium:prefs.stadium==='auto'?(['compact','large'].includes(meta.stadium)?meta.stadium:hash%2?'large':'compact'):prefs.stadium,lighting:prefs.lighting==='auto'?(['day','night'].includes(meta.lighting)?meta.lighting:hash%3?'night':'day'):prefs.lighting};
}
export function presentationControls(){const p=presentationPreferences();return `<div class="presentation-controls"><label>Camera<select data-presentation="camera"><option value="broadcast" ${p.camera==='broadcast'?'selected':''}>Broadcast</option><option value="tactical" ${p.camera==='tactical'?'selected':''}>Tactical</option><option value="player" ${p.camera==='player'?'selected':''}>Player</option></select></label><label>Detail<select data-presentation="quality"><option value="auto" ${p.quality==='auto'?'selected':''}>Auto</option><option value="low" ${p.quality==='low'?'selected':''}>Low</option></select></label><label>Player models<select data-presentation="players"><option value="standard" ${p.players==='standard'?'selected':''}>Standard</option><option value="detailed" ${p.players==='detailed'?'selected':''}>Detailed</option></select></label></div>`;}
export function syncPresentationControls(root=document){const p=presentationPreferences();for(const select of root.querySelectorAll('[data-presentation]'))select.value=p[select.dataset.presentation];for(const button of root.querySelectorAll('[data-live="quality"]'))button.textContent='Quality: '+p.quality;}
export function installPresentation(){
 document.addEventListener('change',e=>{const k=e.target.dataset.presentation;if(k)setPresentationPreference(k,e.target.value);});
 document.addEventListener('click',e=>{const b=e.target.closest('[data-panel-target]');if(!b)return;const group=b.closest('[data-panel-group]');if(!group)return;for(const tab of group.querySelectorAll('[data-panel-target]')){tab.setAttribute('aria-selected',String(tab===b));tab.tabIndex=tab===b?0:-1;}for(const panel of group.querySelectorAll('[data-panel]'))panel.hidden=panel.dataset.panel!==b.dataset.panelTarget;});
 document.addEventListener('keydown',e=>{if(!e.target.matches('[data-panel-target]')||!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;e.preventDefault();const tabs=[...e.target.closest('[role="tablist"]').querySelectorAll('[data-panel-target]')],i=tabs.indexOf(e.target),next=e.key==='Home'?0:e.key==='End'?tabs.length-1:(i+(e.key==='ArrowRight'?1:-1)+tabs.length)%tabs.length;tabs[next].focus();tabs[next].click();});
 document.addEventListener('touchline:presentation',()=>syncPresentationControls());
}
