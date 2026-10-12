import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { spawn } from 'node:child_process';
import {ProjectStore} from './project-store.mjs';
const root = path.dirname(fileURLToPath(import.meta.url));
const store=new ProjectStore(process.env.SPATIAL_PROJECT_DIR || path.join(root,'project'));
let port = Number(process.env.PORT || 4187);
const initialPort = port;
const types = { '.jpg':'image/jpeg', '.webp':'image/webp', '.wasm':'application/wasm', '.pdf':'application/pdf', '.html':'text/html; charset=utf-8', '.js':'text/javascript; charset=utf-8', '.mjs':'text/javascript; charset=utf-8', '.css':'text/css; charset=utf-8', '.png':'image/png', '.json':'application/json; charset=utf-8', '.svg':'image/svg+xml' };
const server = http.createServer(async (req,res) => {
  try {
    let name = decodeURIComponent(new URL(req.url,'http://localhost').pathname);
    if(name.startsWith('/api/')){
      const origin=req.headers.origin;
      if(origin&&origin!==`http://127.0.0.1:${port}`&&origin!==`http://localhost:${port}`){res.writeHead(403);res.end('Forbidden origin');return;}
      const json=(status,data)=>{res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(data));};
      try{
        if(req.method==='GET'&&name==='/api/project'){json(200,{...await store.read(),workspace:root});return;}
        if(req.method!=='POST'||req.headers['content-type']!=='application/json'){json(405,{error:'JSON POST only'});return;}
        const chunks=[];let size=0;for await(const chunk of req){size+=chunk.length;if(size>18*1024*1024){json(413,{error:'파일 크기 제한 초과'});return;}chunks.push(chunk);}
        const data=JSON.parse(Buffer.concat(chunks).toString('utf8'));
        if(name==='/api/capture')json(200,await store.exportCapture(data.viewId));
        else if(name==='/api/action')json(200,await store.action(data));
        else if(name==='/api/assets')json(200,await store.asset(data));
        else json(404,{error:'Unknown endpoint'});
      }catch(e){json(400,{error:e.message});}return;
    }
    if(req.method!=='GET'&&req.method!=='HEAD'){res.writeHead(405);res.end();return;}
    if (name === '/') name = '/index.html';
    if (name === '/docs/') name = '/docs/index.html';
    const file = path.resolve(root, '.' + name);
    if (!file.startsWith(root + path.sep) || name.includes('/node_modules/') || name.includes('/.')) {
      res.writeHead(403); res.end('Forbidden'); return;
    }
    if (!(await stat(file)).isFile()) throw new Error('Not a file');
    res.writeHead(200, {'Content-Type':types[path.extname(file)] || 'application/octet-stream','Cache-Control':'no-cache'});
    res.end(await readFile(file));
  } catch { res.writeHead(404); res.end('Not found'); }
});
server.on('error',error=>{
  if(error.code==='EADDRINUSE' && port < initialPort+20){port++;server.listen(port,'127.0.0.1');}
  else {console.error('로컬 서버를 실행할 수 없습니다:',error.message);process.exit(1);}
});
server.on('listening',()=>{
  const url=`http://127.0.0.1:${port}`;
  console.log(`공간 검토 뷰어: ${url}\n종료: Ctrl+C`);
  if(process.argv.includes('--open')){
    const command=process.platform==='darwin'?'open':process.platform==='win32'?'cmd':'xdg-open';
    const args=process.platform==='win32'?['/c','start','',url]:[url];
    const child=spawn(command,args,{detached:true,stdio:'ignore'});child.on('error',()=>console.log('브라우저에서 위 주소를 열어 주세요.'));child.unref();
  }
});
server.listen(port,'127.0.0.1');
