import {PHOTOS,PHOTO_ALIASES} from './photo-data.js';
import {escapeHtml as esc} from './ui-kit.js';
const key=s=>String(s||'').normalize('NFD').replace(/\p{Diacritic}/gu,'').toLowerCase().replace(/[^a-z0-9]/g,'');
const photos=new Map(PHOTOS.map(p=>[key(p.name),p]));
export const draftPhotoFor=player=>photos.get(key(player?.name))||photos.get(key(PHOTO_ALIASES[player?.id]||PHOTO_ALIASES[player?.profileId]));
export function draftPhoto(player={}){
 const photo=draftPhotoFor(player);
 if(!photo)return `<span class="draft-photo-unavailable" role="img" aria-label="Photo unavailable for ${esc(player.name||'player')}"><span aria-hidden="true">${esc((player.name||'?').split(/\s+/).map(s=>s[0]).slice(0,2).join(''))}</span><small>Photo unavailable</small></span>`;
 return `<img class="player-artwork player-photo" src="./assets/portraits/${esc(photo.file)}" alt="Photo of ${esc(player.name)}" width="192" height="240" loading="lazy" decoding="async" title="${esc(photo.author)} · ${esc(photo.license)} · Photo credits below" data-photo-name="${esc(player.name)}">`;
}
if(typeof document!=='undefined')document.addEventListener('error',event=>{const img=event.target;if(img?.tagName!=='IMG'||!img.classList.contains('player-photo'))return;const label=document.createElement('span');label.className='draft-photo-unavailable';label.setAttribute('role','img');label.setAttribute('aria-label','Photo unavailable for '+img.dataset.photoName);label.textContent='Photo unavailable';img.replaceWith(label);},true);
