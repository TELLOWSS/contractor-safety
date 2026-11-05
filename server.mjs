import http from 'node:http';
import {readFile} from 'node:fs/promises';
const files={'/':'index.html','/index.html':'index.html','/workspace.html':'workspace.html','/cloud.js':'cloud.js','/app.js':'app.js','/style.css':'style.css'};
http.createServer(async(req,res)=>{const file=files[new URL(req.url,'http://localhost').pathname];if(!file){res.writeHead(404).end();return;}try{const data=await readFile(new URL(`./dist/${file}`,import.meta.url));res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript; charset=utf-8':file.endsWith('.css')?'text/css; charset=utf-8':'text/html; charset=utf-8');res.end(data);}catch{res.writeHead(500).end('Run npm run build first');}}).listen(4173,'127.0.0.1',()=>console.log('http://127.0.0.1:4173'));
