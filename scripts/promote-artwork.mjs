import fs from 'node:fs';
import path from 'node:path';
const root='assets',target='dist/assets/library';
fs.mkdirSync(target,{recursive:true});
const manifest=JSON.parse(fs.readFileSync(path.join(root,'manifest.json'),'utf8'));
const index={};
for(const p of manifest.cards){index[p.id]=p.model.replace(/^players\//,'');}
for(const folder of ['players','coaches','ui','moments']){
 fs.mkdirSync(path.join(target,folder),{recursive:true});
 for(const file of fs.readdirSync(path.join(root,folder))){if(!file.endsWith('.svg'))continue;
  // Runtime art is static: SMIL is removed instead of relying on CSS to stop it.
  let svg=fs.readFileSync(path.join(root,folder,file),'utf8').replace(/<style\b[^>]*>[\s\S]*?<\/style>/g,'').replace(/<animate(?:Transform)?\b[^>]*\/>/g,'').replace(/<animate(?:Transform)?\b[^>]*>[\s\S]*?<\/animate(?:Transform)?>/g,'');
  // Cards provide their own accessible name and statistics. Crop clean head-and-torso art.
  if(folder==='players')svg=svg.replace(/<text\b[^>]*>[\s\S]*?<\/text>/g,'').replace('viewBox="0 0 240 320"','viewBox="65 65 110 140"');
  fs.writeFileSync(path.join(target,folder,file),svg);
 }
}
fs.writeFileSync('dist/artwork-data.js','// Original Touchline artwork, generated from assets/manifest.json.\nexport const PLAYER_ARTWORK='+JSON.stringify(index)+';\n');
fs.copyFileSync('LICENSE',path.join(target,'LICENSE'));
fs.writeFileSync(path.join(target,'README.md'),'Original stylized Touchline artwork from assets/. These are illustrations, not player photographs. Runtime assets contain no animation. Regenerate with node scripts/promote-artwork.mjs.\n');
console.log('Promoted artwork for '+Object.keys(index).length+' cards.');
