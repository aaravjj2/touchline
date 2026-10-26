import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {DOMParser,XMLSerializer} from '@xmldom/xmldom';
const root=path.dirname(fileURLToPath(import.meta.url)),parser=new DOMParser(),serializer=new XMLSerializer();
let serial=0;
const transform=(type,value)=>{const v=value.trim().split(/[,\s]+/);return type==='rotate'?`rotate(${v[0]}deg)`:type==='translate'?`translate(${v.map(n=>n+'px').join(',')})`:`${type}(${v.join(',')})`;};
// CSS animations obey reduced motion in SVG image contexts, where hiding SMIL nodes does not.
for(const folder of ['animations','celebrations','moments'])for(const file of fs.readdirSync(path.join(root,folder))){
 if(!file.endsWith('.svg'))continue;const filename=path.join(root,folder,file),doc=parser.parseFromString(fs.readFileSync(filename,'utf8'),'image/svg+xml'),animations=[...Array.from(doc.getElementsByTagName('animate')),...Array.from(doc.getElementsByTagName('animateTransform'))];if(!animations.length)continue;
 const rules=[],declarations=new Map();
 for(const node of animations){const parent=node.parentNode,id=parent.getAttribute('id')||'motion-'+serial++;parent.setAttribute('id',id);const values=(node.getAttribute('values')||'').split(';'),keys=(node.getAttribute('keyTimes')||values.map((_,i)=>i/(values.length-1)).join(';')).split(';'),attribute=node.getAttribute('attributeName'),type=node.getAttribute('type'),property=attribute==='font-size'?'font-size':attribute;const cssValue=value=>attribute==='transform'?transform(type,value):['cx','cy','r','font-size'].includes(attribute)?value+'px':value;
  const name='track-'+serial++;rules.push(`@keyframes ${name}{${values.map((v,i)=>`${Number(keys[i])*100}%{${property}:${cssValue(v)}}`).join('')}}`);
  const base=node.getAttribute('repeatCount')==='indefinite'?values[0]:values.at(-1);parent.setAttribute(attribute,attribute==='transform'?`${type}(${base.replaceAll(',',' ')})`:base);
  const list=declarations.get(id)||[];list.push(`${name} ${node.getAttribute('dur')||'1s'} ${node.getAttribute('calcMode')==='discrete'?'steps(1,end)':'linear'} ${node.getAttribute('repeatCount')==='indefinite'?'infinite':'1'} both`);declarations.set(id,list);parent.removeChild(node);
 }
 const style=doc.createElementNS('http://www.w3.org/2000/svg','style');style.appendChild(doc.createTextNode(rules.join('')+'@media(prefers-reduced-motion:no-preference){'+[...declarations].map(([id,list])=>`#${id}{animation:${list.join(',')}}`).join('')+'}'));doc.documentElement.appendChild(style);fs.writeFileSync(filename,serializer.serializeToString(doc));
}
// Flatten local generated SVG references so boards also work inside an HTML img.
for(const file of fs.readdirSync(path.join(root,'screens'))){if(!file.endsWith('.svg'))continue;const filename=path.join(root,'screens',file);let svg=fs.readFileSync(filename,'utf8');svg=svg.replace(/<image\b([^>]*?)\/>/g,(tag,attrs)=>{const get=name=>attrs.match(new RegExp('\\b'+name+'="([^"]*)"'))?.[1],href=get('href');if(!href?.endsWith('.svg'))return tag;const source=path.resolve(path.dirname(filename),href);if(!source.startsWith(root+path.sep))throw Error('External board reference');const body=fs.readFileSync(source,'utf8').replace(/<\?xml[^>]*>/,'').trim(),prefix='board-'+serial+++'-';return body.replace(/\bid="([^"]+)"/g,(_,id)=>`id="${prefix+id}"`).replace(/url\(#([^)]+)\)/g,(_,id)=>`url(#${prefix+id})`).replace(/<svg\b/,`<svg x="${get('x')||0}" y="${get('y')||0}" width="${get('width')}" height="${get('height')}"`);});fs.writeFileSync(filename,svg);}
console.log('Fixed SVG motion preferences and embedded design boards.');
