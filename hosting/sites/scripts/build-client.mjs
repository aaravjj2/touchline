import {build} from 'esbuild';
await build({entryPoints:['client/game.js'],outfile:'public/game.js',bundle:true,format:'iife',platform:'browser',target:'es2022',minify:true});
