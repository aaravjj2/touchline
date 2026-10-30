import {PLAYER_PORTRAITS,PORTRAIT_VARIANTS} from './player-portrait-data.js';
import {identityHash} from './presentation.js';
export const portraitNameKey=value=>String(value||'').normalize('NFD').replace(/\p{Diacritic}/gu,'').toLowerCase().replace(/[^a-z0-9]/g,'');
export function playerPortrait(player={}){
 for(const field of ['personId','profileId','id'])if(player[field]){const file=PLAYER_PORTRAITS[field+':'+player[field]]||(field==='profileId'?PLAYER_PORTRAITS['id:'+player[field]]:null);if(file)return {file,known:true};}
 const named=PLAYER_PORTRAITS['name:'+portraitNameKey(player.name)];if(named)return {file:named,known:true};
 const identity=player.personId||player.profileId||player.id||player.name||'original-athlete';
 return {file:PORTRAIT_VARIANTS[identityHash(identity)%PORTRAIT_VARIANTS.length],known:false};
}
export function portraitFallback(player={}){return PORTRAIT_VARIANTS[identityHash(player.personId||player.profileId||player.id||player.name||'original-athlete')%PORTRAIT_VARIANTS.length];}
// One shared handler, no per-card renderers or inline script. A damaged image
// falls back once to a bundled original portrait, without a retry loop.
if(typeof document!=='undefined')document.addEventListener('error',event=>{
 const img=event.target;if(img?.tagName!=='IMG'||!img.dataset.portraitFallback||img.dataset.portraitRecovered)return;
 img.dataset.portraitRecovered='true';img.src='./assets/player-portraits/'+img.dataset.portraitFallback;
},true);
