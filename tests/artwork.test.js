import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {LEGENDS} from '../dist/legends.js';
import {ENGLISH_PLAYERS} from '../dist/english-catalog.js';
import {SUPER_PLAYERS} from '../dist/super-catalog.js';
import {FOUNDING_PLAYERS} from '../dist/founding-squad.js';
import {PLAYER_ARTWORK} from '../dist/artwork-data.js';
import {portraitArtwork} from '../dist/ui-kit.js';
test('every catalog card has a local static illustration and generated players have a fallback',()=>{
 for(const p of [...LEGENDS,...ENGLISH_PLAYERS,...SUPER_PLAYERS,...FOUNDING_PLAYERS]){const file=PLAYER_ARTWORK[p.id];assert.ok(file,p.id);const svg=fs.readFileSync(new URL('../dist/assets/library/players/'+file,import.meta.url),'utf8');assert.ok(svg.includes('<svg'));assert.ok(!/<animate|<script|\banimation:/.test(svg));assert.ok(portraitArtwork(p).includes('player-artwork'));}
 const created=portraitArtwork({id:'new-player',name:'Your player'});assert.ok(created.includes('<img'));assert.ok(created.includes('data-portrait-source="original-variant"'));assert.ok(created.includes('assets/player-portraits/original-'));
});
test('asset boards embed their illustrations and source motion uses the real reduced-motion media preference',()=>{
 for(const file of fs.readdirSync('assets/screens')){const svg=fs.readFileSync('assets/screens/'+file,'utf8');assert.ok(!/<image[^>]+href="\.\./.test(svg),file);}
 const manifest=JSON.parse(fs.readFileSync('assets/manifest.json','utf8')),file=manifest.cards[0].animation,svg=fs.readFileSync('assets/'+file,'utf8');assert.ok(!/<animate/.test(svg));assert.ok(svg.includes('@media(prefers-reduced-motion:no-preference)'));
});
