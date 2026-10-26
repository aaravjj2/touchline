import {writeFile} from 'node:fs/promises';
import {PACKS,LEGENDS,CATALOG_COVERAGE} from '../dist/legends.js';
await writeFile('dist/catalog-manifest.json',JSON.stringify({version:1,catalogVersion:'2026-10-19',featuredClubs:CATALOG_COVERAGE.length,snapshots:PACKS.length,cards:LEGENDS.length,ratings:'Touchline authored game values; no imported EA ratings',movement:'New physical fixtures derive authored pace from role and game attributes unless explicitly supplied. Older replay rules are preserved.',squads:PACKS.map(p=>({id:p.id,club:p.club,season:p.era,year:p.year,players:p.players.length,membershipSource:p.source,checked:p.checked||null,ratingSource:'Touchline authored'}))},null,2)+'\n');
console.log('Catalog manifest generated from actual shipped data.');
