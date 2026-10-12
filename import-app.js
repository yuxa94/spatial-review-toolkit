import {createRenderer} from './webgl-support.js';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { loadDxf } from './importers/dxf.js';
import { loadIfc } from './importers/ifc.js';
const $=id=>document.getElementById(id),host=$('canvas'),scene=new THREE.Scene();
scene.background=new THREE.Color('#edf2f5');
const renderer=createRenderer(THREE,{antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,2));host.append(renderer.domElement);
const camera=new THREE.PerspectiveCamera(45,1,.01,10000),controls=new OrbitControls(camera,renderer.domElement);
controls.enableDamping=true;scene.add(new THREE.HemisphereLight(0xffffff,0x9aa6a9,2));const light=new THREE.DirectionalLight(0xffffff,2);light.position.set(20,50,30);scene.add(light);
let result=null,currentFile=null,selected=null,highlighted=[],referenceURL=null,busy=false,ifcApi=null,pdfDocument=null,pdfTask=null,pdfPage=1,pdfRendering=false;
const rows=new Map(),raycaster=new THREE.Raycaster(),pointer=new THREE.Vector2();let down;
new ResizeObserver(()=>{const w=host.clientWidth,h=host.clientHeight;if(!w||!h)return;renderer.setSize(w,h);camera.aspect=w/h;camera.updateProjectionMatrix();}).observe(host);
renderer.setAnimationLoop(()=>{controls.update();renderer.render(scene,camera);});
function fit(top=false){if(!result)return;const bounds=new THREE.Box3().setFromObject(result.root);if(bounds.isEmpty())return;const center=bounds.getCenter(new THREE.Vector3()),size=bounds.getSize(new THREE.Vector3()),span=Math.max(size.length(),1);controls.target.copy(center);camera.near=Math.max(span/10000,.001);camera.far=span*100;camera.position.copy(center).addScaledVector(top?new THREE.Vector3(0,1,.0001):new THREE.Vector3(.4,.85,1).normalize(),span/(2*Math.tan(Math.PI/8))*Math.max(1,1/camera.aspect)*1.15);camera.updateProjectionMatrix();controls.update();raycaster.params.Line.threshold=Math.max(span*.002,.005);}
function clearHighlight(){for(const [o,m] of highlighted){o.material.dispose();o.material=m;}highlighted=[];}
async function clear(){clearHighlight();if(pdfTask){await pdfTask.destroy();pdfTask=null;pdfDocument=null;}if(result){scene.remove(result.root);result.root.traverse(o=>{o.geometry?.dispose();o.material?.dispose();});}result=null;selected=null;rows.clear();$('list').replaceChildren();$('reference').replaceChildren();$('reference').hidden=true;$('canvas').hidden=false;$('empty').hidden=false;$('export').disabled=true;if(referenceURL)URL.revokeObjectURL(referenceURL);referenceURL=null;}
function filter(){const q=$('filter').value.toLowerCase();for(const e of result?.entries||[])rows.get(e.id).hidden=![e.name,e.kind,e.storey||''].join(' ').toLowerCase().includes(q);}
function select(id,object=null){clearHighlight();selected=id;const e=result?.entries.find(e=>e.id===id);for(const [key,row] of rows){row.classList.toggle('selected',key===id);row.querySelector('button').setAttribute('aria-pressed',String(key===id));}if(!e){$('details').textContent='모델을 클릭하면 해당 항목이 선택됩니다.';return;}const row=rows.get(id);if(row.hidden){$('filter').value='';filter();}const rr=row.getBoundingClientRect(),lr=$('list').getBoundingClientRect();if(rr.top<lr.top)$('list').scrollTop+=rr.top-lr.top-6;else if(rr.bottom>lr.bottom)$('list').scrollTop+=rr.bottom-lr.bottom+6;e.group.traverse(o=>{if(o.material){const m=o.material;o.material=m.clone();if(o.material.emissive)o.material.emissive.set('#227dab');else o.material.color.set('#ee7c23');highlighted.push([o,m]);}});$('details').textContent=[e.name,e.kind,e.storey?'층: '+e.storey:'',e.globalId?'GlobalId: '+e.globalId:'',e.expressID?'ExpressID: '+e.expressID:'',object?'선택 객체: '+object.userData.objectId:'',e.objects.length+'개 형상'].filter(Boolean).join('\n');}
function populate(){for(const e of result.entries){const row=document.createElement('div');row.className='row';row.dataset.entryId=e.id;const button=document.createElement('button');button.textContent=e.name;button.setAttribute('aria-pressed','false');const small=document.createElement('small');small.textContent=[e.kind,e.storey].filter(Boolean).join(' · ');button.append(small);button.onclick=()=>select(e.id);const check=document.createElement('input');check.type='checkbox';check.checked=true;check.setAttribute('aria-label',e.name+' 표시');check.onchange=()=>e.group.visible=check.checked;row.append(button,check);$('list').append(row);rows.set(e.id,row);}}
async function showPdfPage(n){
  if(!pdfDocument||pdfRendering||n<1||n>pdfDocument.numPages)return;
  pdfRendering=true;$('file').disabled=true;$('sample-dxf').disabled=true;$('sample-ifc').disabled=true;$('pdf-prev').disabled=$('pdf-next').disabled=true;
  try{const page=await pdfDocument.getPage(n),base=page.getViewport({scale:1});
    const scale=Math.min(2,Math.sqrt(4000000/(base.width*base.height))),viewport=page.getViewport({scale}),canvas=$('pdf-canvas');
    canvas.width=Math.ceil(viewport.width);canvas.height=Math.ceil(viewport.height);
    await page.render({canvas,canvasContext:canvas.getContext('2d'),viewport}).promise;
    pdfPage=n;$('pdf-page').textContent=n+' / '+pdfDocument.numPages+' 페이지';
  }finally{pdfRendering=false;if(!busy){$('file').disabled=false;$('sample-dxf').disabled=false;$('sample-ifc').disabled=false;}if(pdfDocument){$('pdf-prev').disabled=pdfPage<=1;$('pdf-next').disabled=pdfPage>=pdfDocument.numPages;}}
}
async function open(file){if(busy)return;busy=true;const controls=Array.from(document.querySelectorAll('.bar button,.bar input,.bar select'));controls.forEach(el=>el.disabled=true);$('status').textContent='읽는 중: '+file.name;try{
  const ext=file.name.split('.').pop().toLowerCase();
  if(file.size>50*1024*1024)throw new Error('이 검토 뷰어는 50MB 이하 파일만 엽니다. 층/동별로 나눠 주세요.');
  if(ext==='dwg')throw new Error('DWG 직접 읽기는 지원하지 않습니다. CAD 프로그램에서 단위·레이어·블록을 유지한 ASCII DXF로 저장한 뒤 다시 선택하세요.');
  if(!['dxf','ifc','png','jpg','jpeg','pdf'].includes(ext))throw new Error('지원 형식: DXF, IFC, PNG, JPEG, PDF');
  // Parse first so a failed replacement does not discard the currently opened model.
  let incoming=null;
  if(ext==='dxf')incoming=loadDxf(await file.text(),$('unit').value);
  if(ext==='ifc'){
    if(!ifcApi){const {IfcAPI}=await import('./vendor/web-ifc-api.js');ifcApi=new IfcAPI();ifcApi.SetWasmPath(new URL('./vendor/',location.href).href,true);await ifcApi.Init();}
    incoming=loadIfc(new Uint8Array(await file.arrayBuffer()),ifcApi);
  }
  await clear();currentFile=file;$('filter').value='';$('empty').hidden=true;
  if(incoming){result=incoming;scene.add(result.root);populate();fit(ext==='dxf');$('export').disabled=false;$('status').textContent=file.name+' · '+result.entries.length+'개 '+(ext==='dxf'?'레이어':'객체')+' · '+result.metadata.unit+'\n'+result.warnings.join('\n');$('details').textContent='모델 또는 목록을 클릭해 선택하세요. 체크박스로 표시를 전환합니다.';}
  else {referenceURL=URL.createObjectURL(file);$('canvas').hidden=true;$('reference').hidden=false;if(ext==='pdf'){
      const pdfjs=await import('./vendor/pdfjs/pdf.mjs');pdfjs.GlobalWorkerOptions.workerSrc=new URL('./vendor/pdfjs/pdf.worker.mjs',location.href).href;
      pdfTask=pdfjs.getDocument({data:new Uint8Array(await file.arrayBuffer()),cMapUrl:new URL('./vendor/pdfjs/cmaps/',location.href).href,cMapPacked:true,standardFontDataUrl:new URL('./vendor/pdfjs/standard_fonts/',location.href).href,wasmUrl:new URL('./vendor/pdfjs/wasm/',location.href).href,iccUrl:new URL('./vendor/pdfjs/iccs/',location.href).href,isEvalSupported:false});pdfDocument=await pdfTask.promise;
      const toolbar=document.createElement('div');toolbar.className='pdf-toolbar';
      for(const [id,title,delta] of [['pdf-prev','이전 페이지',-1],['pdf-next','다음 페이지',1]]){const button=document.createElement('button');button.id=id;button.textContent=title;button.onclick=()=>showPdfPage(pdfPage+delta).catch(e=>$('status').textContent='PDF 표시 실패: '+e.message);toolbar.append(button);}
      const label=document.createElement('span');label.id='pdf-page';toolbar.append(label);
      const link=document.createElement('a');link.href=referenceURL;link.download=file.name;link.textContent='원본 PDF 저장';toolbar.append(link);
      const canvas=document.createElement('canvas');canvas.id='pdf-canvas';canvas.setAttribute('aria-label','PDF 페이지 미리보기');$('reference').append(toolbar,canvas);await showPdfPage(1);
    }else{const img=document.createElement('img');img.src=referenceURL;img.alt=file.name;$('reference').append(img);}$('status').textContent=file.name+' · 원본 참조 미리보기. 자동 3D 변환은 수행하지 않았습니다.';$('details').textContent='기준 치수와 층고, 변경할 수 없는 구획을 확인한 후 이미지 추적 스킬로 모델을 구성하세요.';}
} catch(e){$('status').textContent='가져오기 실패: '+e.message;}finally{busy=false;controls.forEach(el=>el.disabled=false);$('export').disabled=!result;}}
$('file').onchange=e=>{if(e.target.files[0])open(e.target.files[0]);e.target.value='';};$('unit').onchange=()=>{if(currentFile?.name.toLowerCase().endsWith('.dxf'))open(currentFile);};
for(const ext of ['dxf','ifc'])$('sample-'+ext).onclick=async()=>{const response=await fetch('./examples/sample.'+ext);if(!response.ok){$('status').textContent='예제 파일을 찾지 못했습니다.';return;}open(new File([await response.arrayBuffer()],'sample.'+ext));};
$('filter').oninput=filter;$('fit').onclick=()=>fit();$('top').onclick=()=>fit(true);
renderer.domElement.addEventListener('pointerdown',e=>down={x:e.clientX,y:e.clientY,button:e.button});renderer.domElement.addEventListener('pointerup',e=>{if(!result||!down||down.button!==0||Math.hypot(e.clientX-down.x,e.clientY-down.y)>5){down=null;return;}down=null;const r=renderer.domElement.getBoundingClientRect();pointer.set((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1);raycaster.setFromCamera(pointer,camera);const hit=raycaster.intersectObject(result.root,true).find(h=>h.object.parent.visible);select(hit?.object.userData.entryId||null,hit?.object);});
$('export').onclick=()=>{if(!result)return;const manifest={schema:'spatial-input/0.1',source:{name:currentFile.name,size:currentFile.size},metadata:result.metadata,warnings:result.warnings,entries:result.entries.map(({group,...entry})=>entry)};const a=document.createElement('a'),url=URL.createObjectURL(new Blob([JSON.stringify(manifest,null,2)],{type:'application/json'}));a.href=url;a.download='spatial-input-manifest.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),30000);};
