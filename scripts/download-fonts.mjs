import {mkdir,writeFile} from 'node:fs/promises';
await mkdir('dist/assets/fonts',{recursive:true});let output='';
for(const [id,family]of [['dmsans','DM+Sans:wght@400;500;600;700'],['barlowcondensed','Barlow+Condensed:wght@500;600;700;800']]){
 const response=await fetch('https://fonts.googleapis.com/css2?family='+family+'&display=swap',{headers:{'User-Agent':'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'}});if(!response.ok)throw Error('Font CSS unavailable.');const css=await response.text(),files=new Map();let index=0;
 for(const block of css.matchAll(/\/\* (latin(?:-ext)?) \*\/\s*(@font-face\s*\{[^}]+\})/g)){const rule=block[2],url=rule.match(/url\(([^)]+)\)/)?.[1];if(!url)continue;let file=files.get(url);if(!file){file=id+'-'+index+++'.woff2';const r=await fetch(url);if(!r.ok)throw Error('Font download unavailable.');await writeFile('dist/assets/fonts/'+file,new Uint8Array(await r.arrayBuffer()));files.set(url,file);}output+=rule.replace(url,'./assets/fonts/'+file)+'\n';}
 if(!files.size)throw Error('No Latin font subsets downloaded.');const license=await fetch('https://raw.githubusercontent.com/google/fonts/main/ofl/'+id+'/OFL.txt');if(!license.ok)throw Error('Font license unavailable.');await writeFile('dist/assets/fonts/'+id+'-OFL.txt',await license.text());console.log(id,files.size);
}
await writeFile('dist/fonts.css',output);
