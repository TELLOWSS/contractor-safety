import http from 'node:http';
import {readFile,mkdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {openLocalStore,actors} from './src/local-store.mjs';
await import('./scripts/progress.mjs');
const port=4174,origin=`http://127.0.0.1:${port}`;
await mkdir(new URL('./.local-data/',import.meta.url),{recursive:true});
const store=await openLocalStore(fileURLToPath(new URL('./.local-data/postgres',import.meta.url)));
const files={'/':'local.html','/progress.html':'progress.html','/resources-ui.js':'resources-ui.js','/obligations-ui.js':'obligations-ui.js','/local.js':'local.js','/actions-ui.js':'actions-ui.js','/action-view.js':'action-view.js','/style.css':'style.css'};
const server=http.createServer(async(req,res)=>{
 res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Cache-Control','no-store');
 res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self'; frame-ancestors 'none'; base-uri 'none'; object-src 'none'");
 const json=(code,value)=>{res.writeHead(code,{'Content-Type':'application/json; charset=utf-8'});res.end(JSON.stringify(value));};
 if(req.headers.host!==`127.0.0.1:${port}`){json(403,{error:'HOST_DENIED'});return;}
 if(req.url==='/backup'){
  if(req.method!=='POST'||req.headers.origin!==origin||!req.headers['content-type']?.startsWith('application/json')){json(403,{error:'ORIGIN_DENIED'});return;}
  try{let raw='';for await(const chunk of req){raw+=chunk;if(raw.length>256){json(413,{error:'INPUT_TOO_LARGE'});return;}}const blob=await store.backup(JSON.parse(raw).actor);res.writeHead(200,{'Content-Type':'application/gzip','Content-Disposition':'attachment; filename="contractor-safety-full-backup.tar.gz"'});res.end(Buffer.from(await blob.arrayBuffer()));}catch{json(403,{error:'BACKUP_FAILED'});}return;
 }
 if(req.url==='/api'){
  if(req.method!=='POST'||req.headers.origin!==origin||!req.headers['content-type']?.startsWith('application/json')){json(403,{error:'ORIGIN_DENIED'});return;}
  try{let raw='';for await(const chunk of req){raw+=chunk;if(Buffer.byteLength(raw)>16384){json(413,{error:'INPUT_TOO_LARGE'});return;}}
   const body=JSON.parse(raw);const result=await store.request(body.actor,body.action,body.input);json(200,{...result,actors});
  }catch(e){const code=['ACTIVE_SITE_LIMIT','REVISION_CONFLICT','INDEPENDENT_REVIEW_REQUIRED','EVIDENCE_REQUIRED','NOTE_REQUIRED','INVALID_TRANSITION','EDIT_LOCKED','NO_CHANGES','REASON_REQUIRED','OBLIGATION_ACCESS_DENIED'].find(code=>e.message.includes(code))??'ACCESS_OR_INPUT_DENIED';json(400,{error:code});}return;
 }
 if(req.method!=='GET'||!files[req.url]){res.writeHead(404).end();return;}
 try{res.setHeader('Content-Type',req.url.endsWith('.js')?'text/javascript; charset=utf-8':req.url.endsWith('.css')?'text/css; charset=utf-8':'text/html; charset=utf-8');res.end(await readFile(new URL(`./web/${files[req.url]}`,import.meta.url)));}catch{res.writeHead(500).end('Unable to load page');}
});
server.listen(port,'127.0.0.1',()=>console.log(`FREE LOCAL DEVELOPMENT: ${origin}\nDB: .local-data/postgres (persistent)\nSimulated roles only. No cloud connection. Ctrl+C to stop.`));
process.on('SIGINT',()=>{server.close(async()=>{await store.close();process.exit(0);});});
