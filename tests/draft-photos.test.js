import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,statSync,readdirSync} from 'node:fs';
import {PHOTOS} from '../dist/photo-data.js';
import {draftPhoto,draftPhotoFor} from '../dist/draft-photos.js';
import {portraitArtwork} from '../dist/ui-kit.js';
const awaitFiles=()=>readdirSync('dist/assets/portraits').filter(f=>/\.(jpg|png|webp|gif)$/.test(f));
import {PACKS} from '../dist/legends.js';
test('draft photo assets have a source, author and reusable license; filenames are safe',()=>{
 const credits=JSON.parse(readFileSync('dist/assets/portraits/credits.json','utf8'));assert.ok(credits.length>300);assert.equal(PHOTOS.length,credits.length);
 const files=new Set(credits.map(p=>p.file));for(const name of (awaitFiles()))assert.ok(files.has(name),name+' lacks a license record');
 for(const p of credits){assert.match(p.file,/^[a-f0-9]{20}\.(jpg|png|webp)$/);assert.match(p.source,/^https:\/\/commons.wikimedia.org\/wiki\/File:/);assert.ok(p.author,p.name);assert.match(p.license,/^CC BY(?:-SA)? |^CC0|^Public domain/);assert.match(p.licenseUrl,/^https?:\/\//);assert.ok(statSync('dist/assets/portraits/'+p.file).size>500);}
});
test('draft picks and pitch share real photos, while managerial artwork stays original',()=>{
 const p=PACKS.flatMap(x=>x.players).find(x=>x.name==='Lionel Messi');assert.ok(draftPhotoFor(p));const rice=PACKS.flatMap(x=>x.players).find(x=>x.name==='Rice');assert.equal(draftPhotoFor(rice)?.name,'Declan Rice');assert.equal(draftPhotoFor({name:'Rice'}),undefined);assert.match(draftPhoto(p),/class="player-artwork player-photo"/);assert.match(portraitArtwork(p),/player-portrait-3d/);assert.match(draftPhoto({name:'Unverified generated prospect'}),/Photo unavailable/);assert.doesNotMatch(draftPhoto({name:'Unverified generated prospect'}),/<img|player-portraits/);
 const src=readFileSync('dist/draft-studio.js','utf8');assert.equal((src.match(/\$\{draftPhoto\(p\)\}/g)||[]).length,2);assert.doesNotMatch(src,/portraitArtwork\(/);
});
