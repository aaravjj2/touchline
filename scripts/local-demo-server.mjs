import http from 'node:http';
import {readFile,realpath} from 'node:fs/promises';
import {resolve,relative,isAbsolute,extname} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';

const types={'.webp':'image/webp','.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.svg':'image/svg+xml','.webmanifest':'application/manifest+json','.woff2':'font/woff2','.png':'image/png','.jpg':'image/jpeg','.fbx':'application/octet-stream','.txt':'text/plain; charset=utf-8'};
const inside=(root,path)=>{const rel=relative(root,path);return rel!==''&&!rel.startsWith('..')&&!isAbsolute(rel);};
export function createLocalDemoServer(root){
 return http.createServer(async(req,res)=>{
  try{
   const url=new URL(req.url,'http://127.0.0.1');
   if(url.pathname==='/api/coach'){
    res.writeHead(req.method==='POST'?503:405,{'Content-Type':'application/json','Cache-Control':'no-store'});
    res.end(JSON.stringify({reason:'Free-credit AI is not enabled. Rules-based coaching remains available.'}));return;
   }
   if(!['GET','HEAD'].includes(req.method)){res.writeHead(405,{'Allow':'GET, HEAD'}).end();return;}
   const pathname=decodeURIComponent(url.pathname==='/'?'/index.html':url.pathname);
   const file=resolve(root,'.'+pathname);if(!inside(root,file)){res.writeHead(403).end('Forbidden');return;}
   const actual=await realpath(file);if(!inside(await realpath(root),actual)){res.writeHead(403).end('Forbidden');return;}
   const body=await readFile(actual);res.writeHead(200,{'Content-Type':types[extname(actual)]||'application/octet-stream','Cache-Control':'no-cache','X-Content-Type-Options':'nosniff'});
   res.end(req.method==='HEAD'?undefined:body);
  }catch(error){res.writeHead(error instanceof URIError?400:404).end('Not found');}
 });
}
if(process.argv[1]&&pathToFileURL(resolve(process.argv[1])).href===import.meta.url){
 const port=Number(process.env.PORT||4280);if(!Number.isInteger(port)||port<1||port>65535)throw Error('PORT must be 1–65535.');
 const root=fileURLToPath(new URL(import.meta.url.endsWith('/scripts/local-demo-server.mjs')?'../dist/':'./dist/',import.meta.url));
 createLocalDemoServer(root).listen(port,'127.0.0.1',()=>console.log(`Touchline local demo: http://127.0.0.1:${port}/?qa=1`));
}
