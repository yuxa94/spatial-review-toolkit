export async function getProject(){const r=await fetch('/api/project');if(!r.ok)throw Error('저장 서버를 확인하세요. 새 버전의 server.mjs로 실행해야 합니다.');return r.json();}
export async function action(data){return post('/api/action',data);}
export async function asset(name,dataURL){return post('/api/assets',{name,dataURL});}
async function post(url,data){const r=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});const body=await r.json();if(!r.ok)throw Error(body.error||'저장하지 못했습니다.');return body;}
export const fileData=file=>new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=()=>reject(Error('파일을 읽지 못했습니다.'));r.readAsDataURL(file);});
