import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {playerPortrait} from '../dist/player-portraits.js';
import {portraitArtwork} from '../dist/ui-kit.js';
import {LEGENDS} from '../dist/legends.js';
import {ENGLISH_PLAYERS} from '../dist/english-catalog.js';
import {SUPER_PLAYERS} from '../dist/super-catalog.js';
import {FOUNDING_PLAYERS} from '../dist/founding-squad.js';
import {PLAYERS} from '../dist/engine.js';
import {FBXLoader} from '../dist/vendor/FBXLoader.js';
import {footballerGeometry} from '../dist/footballer-model.js';

test('all historical, current, founding and practice cards resolve to actual bundled 3D images',async()=>{
 const players=[...LEGENDS,...ENGLISH_PLAYERS,...SUPER_PLAYERS,...FOUNDING_PLAYERS,...PLAYERS],files=new Set();
 for(const player of players){const p=playerPortrait(player);assert.equal(p.known,true,player.id);assert.match(p.file,/^[a-f0-9]{20}\.webp$/);files.add(p.file);}
 for(const file of files){const bytes=await readFile(new URL('../dist/assets/player-portraits/'+file,import.meta.url));assert.equal(bytes.toString('ascii',0,4),'RIFF');assert.equal(bytes.toString('ascii',8,12),'WEBP');}
 const report=JSON.parse(await readFile(new URL('../dist/assets/player-portraits/coverage.json',import.meta.url)));assert.equal(report.entries,players.length);assert.deepEqual(report.missing,[]);assert.equal(report.people,files.size);
});
test('portrait identity survives transferred card IDs, alternate profiles and missing metadata without save writes',()=>{
 const player=SUPER_PLAYERS[0],original=structuredClone(player),file=playerPortrait(player).file;
 assert.equal(playerPortrait({...player,id:'transferred-card',club:'Another club'}).file,file);
 assert.equal(playerPortrait({profileId:player.id,name:player.name}).file,file);
 const unknown={id:'new-created-player',name:'<script>New player</script>',color:'red" onload="alert(1)'};
 assert.equal(playerPortrait(unknown).known,false);assert.deepEqual(playerPortrait(unknown),playerPortrait(structuredClone(unknown)));
 const html=portraitArtwork(unknown);assert.ok(!html.includes('<script>'));assert.ok(!html.includes('onload='));assert.ok(html.includes('#6d94b8'));assert.ok(html.includes('Original 3D portrait'));assert.deepEqual(player,original);
});
test('human meshes retain valid normalized skinning at wrists and ankles for every quality',async()=>{
 const bytes=await readFile(new URL('../dist/assets/athlete/characterMedium.fbx',import.meta.url)),model=new FBXLoader().parse(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');let mesh;model.traverse(o=>{if(o.isSkinnedMesh)mesh=o;});
 for(const detail of ['match','detailed','hero']){const {geometry,groups}=footballerGeometry(mesh,{detail}),weights=geometry.attributes.skinWeight,indices=geometry.attributes.skinIndex;
  assert.equal(groups.length,geometry.attributes.position.count);assert.ok(groups.includes('skinShadow'));assert.ok(groups.includes('lip'));
  for(let i=0;i<weights.count;i++){let sum=0;for(let k=0;k<4;k++){sum+=weights.array[i*4+k];assert.ok(indices.array[i*4+k]>=0&&indices.array[i*4+k]<mesh.skeleton.bones.length);}assert.ok(Math.abs(sum-1)<1e-6);}
  for(const attribute of ['position','normal'])assert.ok([...geometry.attributes[attribute].array].every(Number.isFinite));geometry.dispose();
 }
});
