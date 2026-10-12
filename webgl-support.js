let graphicsFailurePanel=null;
// Keep an actionable screen even when the browser cannot create a GPU context.
export function createRenderer(THREE,options={}){
 const canvas=document.createElement('canvas');let reason='';
 canvas.addEventListener('webglcontextcreationerror',event=>{reason=event.statusMessage||'';});
 try{
  const renderer=new THREE.WebGLRenderer({...options,canvas});renderer.graphicsLost=false;
  canvas.addEventListener('webglcontextlost',event=>{event.preventDefault();renderer.graphicsLost=true;showGraphicsFailure(event.statusMessage||'WebGL context lost',{contextLost:true});});
  canvas.addEventListener('webglcontextrestored',()=>{renderer.graphicsLost=false;graphicsFailurePanel?.remove();graphicsFailurePanel=null;});
  return renderer;
 }
 catch(error){showGraphicsFailure(reason||error.message);throw error;}
}
export function showGraphicsFailure(reason,{contextLost=false}={}){
 graphicsFailurePanel?.remove();
 const panel=document.createElement('section');panel.setAttribute('role','alert');panel.className='graphics-failure';
 const style=document.createElement('style');style.textContent=`
 .graphics-failure{position:fixed;inset:0;z-index:1000;display:grid;place-items:center;background:#edf2f5;color:#244657;padding:24px;overflow:auto;font:14px/1.65 system-ui,sans-serif;box-sizing:border-box}
 .graphics-failure article{box-sizing:border-box;background:white;border:1px solid #d4e1e7;border-radius:12px;padding:28px;max-width:640px;width:100%;box-shadow:0 10px 40px #24465710}
 .graphics-failure h1{font-size:22px;margin:0 0 12px}.graphics-failure p{margin:10px 0}.graphics-failure label{display:block;margin-top:20px;font-weight:600}
 .graphics-failure input{box-sizing:border-box;width:100%;padding:12px;border:1px solid #bbcdd8;border-radius:5px;font:13px monospace;background:#f5f9fa;color:#244657}
 .graphics-failure nav{display:flex;flex-wrap:wrap;gap:10px;margin:14px 0}.graphics-failure button,.graphics-failure a{border:1px solid #bdd0db;border-radius:5px;padding:9px 12px;background:white;color:#244657;font:inherit;cursor:pointer;text-decoration:none}
 .graphics-failure button:first-child{background:#244f67;color:white}.graphics-failure details{margin-top:20px;font-size:12px}.graphics-failure pre{white-space:pre-wrap;overflow-wrap:anywhere;font:11px/1.6 monospace;background:#f2f6f8;padding:12px}.graphics-failure .message{font-size:12px;min-height:20px}`;
 const article=document.createElement('article'),h=document.createElement('h1'),p=document.createElement('p'),help=document.createElement('p');
 h.textContent=contextLost?'3D 그래픽 연결이 중단되었습니다.':'현재 브라우저에서 3D 그래픽을 시작하지 못했습니다.';
 p.textContent=(contextLost?'그래픽 연결이 복구되면 현재 화면으로 돌아갑니다. ':'이 화면은 WebGL 2가 필요합니다. ')+ ' 인앱 브라우저에서 발생했다면 아래 주소를 복사해 별도 Chrome 또는 Edge의 주소창에 붙여넣어 주세요.';
 help.textContent='다른 브라우저에서도 같은 오류가 발생할 때 그래픽 가속 설정을 확인하세요. 저장된 도면과 코멘트는 그대로 유지됩니다.';
 const label=document.createElement('label'),input=document.createElement('input');label.textContent='현재 작업 주소';input.value=location.href;input.readOnly=true;input.setAttribute('aria-label','다른 브라우저에서 열 작업 주소');label.append(input);
 const nav=document.createElement('nav'),copy=document.createElement('button'),retry=document.createElement('button'),plan=document.createElement('a'),message=document.createElement('p');message.className='message';message.setAttribute('role','status');
 copy.textContent='주소 복사';copy.onclick=async()=>{try{await navigator.clipboard.writeText(location.href);message.textContent='Chrome 또는 Edge 주소창에 붙여넣어 주세요.';}catch{input.focus();input.select();message.textContent='주소를 선택했습니다. 복사해서 다른 브라우저에서 열어 주세요.';}};
 retry.textContent='다시 시도';retry.onclick=()=>location.reload();plan.textContent='도면 입력 검토';plan.href='./import.html';nav.append(copy,retry,plan);
 const details=document.createElement('details'),summary=document.createElement('summary'),pre=document.createElement('pre');summary.textContent='그래픽 오류 상세';pre.textContent=reason;details.append(summary,pre);
 article.append(h,p,help,label,nav,message,details);panel.append(style,article);document.body.append(panel);graphicsFailurePanel=panel;
}
