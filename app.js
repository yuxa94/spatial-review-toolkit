import {createRenderer} from './webgl-support.js';
import * as THREE from 'three';
import {mountCommentPins} from './comment-pins.js';
import {mountComments} from './comments.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { buildModel } from './scene-builder.js';
import { MODEL, META, SOURCE, SCALE, regions, categoryLabels, world, polygonArea, footprint, voids, columns } from './plan-data.js';

const $=id=>document.getElementById(id);
const host=$('canvas-container'), workspace=$('workspace');
if(MODEL){document.title=META.title+' · 공간 검토';document.querySelector('.brand h1').textContent=META.title;document.querySelector('.brand p').textContent='도면별 공간 검토 프로젝트';$('focus-lounge').hidden=true;document.querySelector('#plan-dialog .dialog-header p').textContent=META.title;document.querySelector('.source-card p').textContent=META.scaleBasis;for(const img of document.querySelectorAll('.source-card img,.plan-image img')){img.src=SOURCE.file;img.alt='현재 프로젝트 원본 도면';}document.querySelector('.source-card').hidden=!SOURCE.file;$('wall-height').max=META.ceilingHeight;}

const renderer=createRenderer(THREE,{antialias:true,alpha:false,preserveDrawingBuffer:false});
renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));
renderer.outputColorSpace=THREE.SRGBColorSpace;
renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.0;
renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFShadowMap;
host.appendChild(renderer.domElement);
const scene=new THREE.Scene();scene.background=new THREE.Color('#edf2f5');
const camera=new THREE.OrthographicCamera(-80,80,60,-60,.1,600);
const controls=new OrbitControls(camera,renderer.domElement);
controls.enableDamping=true;controls.dampingFactor=.09;controls.maxPolarAngle=Math.PI/2-.04;
controls.minZoom=.3;controls.maxZoom=18;controls.screenSpacePanning=true;
controls.mouseButtons={LEFT:THREE.MOUSE.ROTATE,MIDDLE:THREE.MOUSE.DOLLY,RIGHT:THREE.MOUSE.PAN};
scene.add(new THREE.HemisphereLight('#f9fcff','#bdc5cc',1.65));
const sun=new THREE.DirectionalLight('#fff7e7',2.4);sun.position.set(-45,95,30);sun.castShadow=true;
sun.shadow.mapSize.set(2048,2048);sun.shadow.camera.left=-100;sun.shadow.camera.right=100;sun.shadow.camera.top=100;sun.shadow.camera.bottom=-100;sun.shadow.camera.near=1;sun.shadow.camera.far=220;sun.shadow.normalBias=.12;sun.shadow.bias=-.0002;
scene.add(sun);scene.add(new THREE.AmbientLight('#ddeaf3',.25));
const model=buildModel();scene.add(model.root);model.setWallHeight(2.4);
const ground=new THREE.Mesh(new THREE.PlaneGeometry(500,500),new THREE.ShadowMaterial({opacity:.11}));ground.rotation.x=-Math.PI/2;ground.position.y=-.32;ground.receiveShadow=true;scene.add(ground);
const grid=new THREE.GridHelper(220,44,'#d5e0e7','#e0e8ed');grid.position.y=-.34;grid.material.transparent=true;grid.material.opacity=.6;scene.add(grid);
const recordById=new Map(regions.map(r=>[r.id,r]));
let commentUI=null,commentPins=null;
let selectedId=null,selectedObject=null,mode='iso',overlay=null,showLabels=true,down=null,highlighted=[],toastTimer;
let frameRequested=false;
const raycaster=new THREE.Raycaster(),pointer=new THREE.Vector2();

function toast(message){$('toast').textContent=message;$('toast').hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').hidden=true,2800);}
function requestRender(){if(!frameRequested){frameRequested=true;requestAnimationFrame(render);}}
function render(){frameRequested=false;if(document.hidden||renderer.graphicsLost)return;controls.update();renderer.render(scene,camera);updateLabels();commentPins?.update(true);$('orientation-arrow').style.transform=`rotate(${-controls.getAzimuthalAngle()*180/Math.PI}deg)`;}
controls.addEventListener('change',requestRender);
document.addEventListener('visibilitychange',requestRender);
renderer.domElement.addEventListener('webglcontextrestored',requestRender);

function fit(bounds=model.bounds,newMode=mode){
  mode=newMode;
  const c=bounds.getCenter(new THREE.Vector3());c.y=0;
  const dir=newMode==='top'?new THREE.Vector3(0,1,.00001):newMode==='reverse'?new THREE.Vector3(-.25,1,-.86).normalize():new THREE.Vector3(.16,1,.82).normalize();
  camera.position.copy(c).addScaledVector(dir,180);camera.up.set(0,1,0);camera.lookAt(c);camera.zoom=1;camera.updateMatrixWorld(true);
  controls.target.copy(c);controls.enableRotate=newMode!=='top';
  const projected=new THREE.Box3();
  for(const x of [bounds.min.x,bounds.max.x])for(const y of [bounds.min.y,bounds.max.y])for(const z of [bounds.min.z,bounds.max.z])projected.expandByPoint(new THREE.Vector3(x,y,z).applyMatrix4(camera.matrixWorldInverse));
  const size=projected.getSize(new THREE.Vector3()),aspect=host.clientWidth/host.clientHeight;
  const h=Math.max(size.y*1.30,size.x/aspect*1.16,12);
  camera.left=-h*aspect/2;camera.right=h*aspect/2;camera.top=h/2;camera.bottom=-h/2;camera.updateProjectionMatrix();
  for(const id of ['iso','top','reverse']){$('view-'+id).classList.toggle('active',id===mode);$('view-'+id).setAttribute('aria-pressed',String(id===mode));}
  requestRender();
}
const resizeObserver=new ResizeObserver(()=>{renderer.setSize(host.clientWidth,host.clientHeight);const h=camera.top-camera.bottom,aspect=host.clientWidth/host.clientHeight;camera.left=-h*aspect/2;camera.right=h*aspect/2;camera.updateProjectionMatrix();requestRender();});resizeObserver.observe(host);

const eye='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 12s3.6-6 10-6 10 6 10 6-3.6 6-10 6S2 12 2 12Z"/><circle cx="12" cy="12" r="2.5"/></svg>';
const eyeOff='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m3 3 18 18M9.5 6.3C16 4.4 22 12 22 12s-1.2 2-3.6 3.8M6.2 7.5C3.5 9.3 2 12 2 12s3.6 6 10 6c1.4 0 2.7-.3 3.8-.7"/></svg>';
const rows=new Map();
function makeList(){
  $('region-count').textContent=regions.length;
  for(const [category,name] of Object.entries(categoryLabels)) {
    const entries=regions.filter(r=>r.category===category);if(!entries.length)continue;
    const section=document.createElement('section');section.className='region-section';section.dataset.category=category;
    const heading=document.createElement('button');heading.className='category-heading';heading.setAttribute('aria-expanded','true');
    heading.innerHTML=`<span class="chevron">▾</span>${name}<span class="count">${entries.length}</span>`;
    heading.onclick=()=>{const closed=section.classList.toggle('collapsed');heading.setAttribute('aria-expanded',String(!closed));heading.querySelector('.chevron').textContent=closed?'▸':'▾';};
    const items=document.createElement('div');items.className='region-items';
    for(const r of entries) {
      const row=document.createElement('div');row.className='region-row';row.dataset.regionId=r.id;
      const select=document.createElement('button');select.className='region-select';select.title=r.en;select.setAttribute('aria-pressed','false');
      const swatch=document.createElement('span');swatch.className='region-swatch';swatch.style.background=r.color;
      const title=document.createElement('span');title.className='region-name';title.textContent=r.name;select.append(swatch,title);select.onclick=()=>selectRegion(r.id);
      const visibility=document.createElement('button');visibility.className='visibility-button';visibility.innerHTML=eye;visibility.title=r.name+' 숨기기';visibility.setAttribute('aria-label',r.name+' 숨기기');visibility.setAttribute('aria-pressed','true');
      visibility.onclick=()=>{model.setRegionVisible(r.id,!model.groups.get(r.id).visible);syncVisibility();requestRender();};
      row.append(select,visibility);items.append(row);rows.set(r.id,row);
    }
    section.append(heading,items);$('region-list').append(section);
  }
}
function syncVisibility(){
  for(const [id,row] of rows) {
    const show=model.groups.get(id).visible,r=recordById.get(id),button=row.querySelector('.visibility-button');
    row.classList.toggle('is-hidden',!show);button.innerHTML=show?eye:eyeOff;
    const name=r.name+(show?' 숨기기':' 표시하기');button.title=name;button.setAttribute('aria-label',name);button.setAttribute('aria-pressed',String(show));
  }
  if(selectedId)updateDetails();
}
function clearHighlight(){for(const [mesh,material] of highlighted){mesh.material.dispose();mesh.material=material;}highlighted=[];}
function selectRegion(id,object=null){
  clearHighlight();selectedId=id;selectedObject=object;
  for(const [key,row] of rows){row.classList.toggle('selected',key===id);row.querySelector('.region-select').removeAttribute('aria-current');row.querySelector('.region-select').setAttribute('aria-pressed',String(key===id));}
  if(id) {
    const row=rows.get(id),section=row.closest('.region-section');
    // A viewport selection must also be discoverable in a filtered/collapsed list.
    if(row.hidden||section.hidden){$('search').value='';$('search').dispatchEvent(new Event('input'));}
    section.classList.remove('collapsed');
    section.querySelector('.category-heading').setAttribute('aria-expanded','true');
    section.querySelector('.chevron').textContent='▾';
    row.querySelector('.region-select').setAttribute('aria-current','true');
    const list=$('region-list'),rr=row.getBoundingClientRect(),lr=list.getBoundingClientRect();
    if(rr.top<lr.top)list.scrollTop+=rr.top-lr.top-8;
    else if(rr.bottom>lr.bottom)list.scrollTop+=rr.bottom-lr.bottom+8;
    model.groups.get(id).traverse(mesh=>{
      if(mesh.isMesh && mesh.material.emissive) {const original=mesh.material;mesh.material=original.clone();mesh.material.emissive.set('#2474a2');mesh.material.emissiveIntensity=.2;highlighted.push([mesh,original]);}
    });
    updateDetails();$('detail-panel').hidden=false;
  } else {$('detail-panel').hidden=true;}
  commentUI?.refresh();requestRender();
}
function updateDetails(){
  const r=recordById.get(selectedId),g=model.groups.get(selectedId);
  $('detail-category').textContent=categoryLabels[r.category]+(g.visible?'':' · 숨겨짐');$('detail-category').style.setProperty('--region-color',r.color);
  $('detail-title').textContent=r.name;$('detail-en').textContent=r.en;
  const stats=[];
  if(r.areaPyeong)stats.push(`<div><dt>원본 표기 면적</dt><dd>${r.areaPyeong}<small>평</small></dd></div>`);
  if(r.seats)stats.push(`<div><dt>원본 표기 좌석</dt><dd>${r.seats}<small>석</small></dd></div>`);
  if(!stats.length)stats.push(`<div><dt>선택 영역의 객체</dt><dd>${g.children.filter(c=>c.isMesh).length}<small>개</small></dd></div>`);
  $('detail-stats').innerHTML=stats.join('');
  $('detail-note').textContent=(r.note||'도면에서 읽은 실 경계를 반영했습니다. 높이·벽 재료·가구 상세는 가정입니다.')+(selectedObject?` 선택 객체: ${selectedObject.userData.name}.${selectedObject.userData.furnitureId?' 도면 좌표: '+selectedObject.userData.sourceAnchor.join(', ')+'.':''}`:'');
}
makeList();
$('search').addEventListener('input',()=>{
  const q=$('search').value.trim().toLowerCase();
  for(const [id,row] of rows){const r=recordById.get(id);row.hidden=![r.name,r.en,r.id].some(s=>s.toLowerCase().includes(q));}
  for(const s of document.querySelectorAll('.region-section')){s.hidden=!Array.from(s.querySelectorAll('.region-row')).some(row=>!row.hidden);if(q)s.classList.remove('collapsed');}
});
$('show-all').onclick=()=>{for(const g of model.groups.values())g.visible=true;syncVisibility();$('view-title').textContent='전체 도면';$('view-subtitle').textContent='기존 공간 + 계획된 공용 시설';fit();toast('전체 영역을 표시했습니다.');};
$('close-detail').onclick=()=>selectRegion(null);
$('open-studio').onclick=()=>{if(selectedId)location.href='studio.html?room='+encodeURIComponent(selectedId);};
function commentCamera(){return {kind:'overview',mode,position:camera.position.toArray(),target:controls.target.toArray(),up:camera.up.toArray(),height:camera.top-camera.bottom,zoom:camera.zoom,wallHeight:Number($('wall-height').value)};}
function visitComment(c){
 if(c.camera?.kind==='interior'){location.href='studio.html?room='+encodeURIComponent(c.regionId)+'&comment='+encodeURIComponent(c.id);return;}
 model.setRegionVisible(c.regionId,true);syncVisibility();selectRegion(c.regionId,model.pickables.find(m=>(m.userData.furnitureId||m.userData.objectId)===c.objectId)||null);
 if(c.camera){const v=c.camera;mode=['iso','top','reverse'].includes(v.mode)?v.mode:'iso';controls.enableRotate=mode!=='top';for(const m of ['iso','top','reverse']){$('view-'+m).classList.toggle('active',m===mode);$('view-'+m).setAttribute('aria-pressed',String(m===mode));}$('view-title').textContent=recordById.get(c.regionId).name;$('view-subtitle').textContent='코멘트 작성 시점';camera.position.fromArray(v.position);camera.up.fromArray(v.up);controls.target.fromArray(v.target);const aspect=host.clientWidth/host.clientHeight;camera.top=v.height/2;camera.bottom=-v.height/2;camera.left=-v.height*aspect/2;camera.right=v.height*aspect/2;camera.zoom=v.zoom;if(Number.isFinite(v.wallHeight)){model.setWallHeight(v.wallHeight);$('wall-height').value=v.wallHeight;$('wall-value').textContent=v.wallHeight+'m';}camera.lookAt(controls.target);camera.updateProjectionMatrix();controls.update();}
 else fit(new THREE.Box3().setFromObject(model.groups.get(c.regionId)));
 requestRender();
}
commentPins=mountCommentPins({host,camera,model,onSelect:id=>commentUI.activate(id,{move:false}),requestRender});
commentUI=mountComments($('room-comments'),()=>selectedId?{regionId:selectedId}:null,{regionName:id=>recordById.get(id)?.name||id,onPlace:enabled=>{if(enabled)$('detail-panel').hidden=true;host.classList.toggle('comment-placing',enabled);controls.enableRotate=!enabled&&mode!=='top';},onSelect:visitComment,onChange:(items,id,draft)=>commentPins.set(items,id,draft)});
const requestedComment=new URLSearchParams(location.search).get('comment');if(requestedComment)commentUI.refresh().then(()=>commentUI.activate(requestedComment));

$('focus-region').onclick=()=>{
  if(!selectedId)return;model.setRegionVisible(selectedId,true);syncVisibility();
  const bounds=new THREE.Box3().setFromObject(model.groups.get(selectedId));if(bounds.isEmpty())return;
  fit(bounds);$('view-title').textContent=recordById.get(selectedId).name;$('view-subtitle').textContent='선택 공간 확대';
};
$('isolate-region').onclick=()=>{
  if(!selectedId)return;for(const [id,g] of model.groups)g.visible=id===selectedId;
  overlay.visible=false;$('toggle-overlay').checked=false;$('overlay-range-row').hidden=true;
  syncVisibility();$('focus-region').click();toast('선택 영역만 표시합니다. 전체 표시로 돌아갈 수 있습니다.');
};
for(const m of ['iso','top','reverse'])$('view-'+m).onclick=()=>{fit(model.bounds,m);$('view-title').textContent='전체 도면';$('view-subtitle').textContent=m==='top'?'위에서 본 공간 배치':'기존 공간 + 계획된 공용 시설';};
$('fit-view').onclick=()=>fit();
renderer.domElement.addEventListener('pointerdown',e=>{down={x:e.clientX,y:e.clientY,button:e.button};});
renderer.domElement.addEventListener('pointerup',e=>{
  if(!down||down.button!==0||Math.hypot(e.clientX-down.x,e.clientY-down.y)>5){down=null;return;}down=null;
  const rect=renderer.domElement.getBoundingClientRect();pointer.set((e.clientX-rect.left)/rect.width*2-1,-(e.clientY-rect.top)/rect.height*2+1);raycaster.setFromCamera(pointer,camera);
  const hit=raycaster.intersectObjects(model.pickables,false).find(hit=>hit.object.visible && model.groups.get(hit.object.userData.regionId).visible);
  if(commentUI.placing){if(!hit){toast('벽·바닥·가구 위에 위치를 지정하세요.');return;}selectRegion(hit.object.userData.regionId,hit.object);commentUI.begin({regionId:hit.object.userData.regionId,objectId:hit.object.userData.furnitureId||hit.object.userData.objectId,objectName:hit.object.userData.name,point:hit.point.toArray(),camera:commentCamera()});$('detail-panel').hidden=true;}else selectRegion(hit?.object.userData.regionId||null,hit?.object);
});
host.addEventListener('keydown',e=>{if(e.key==='Escape'){commentUI.cancel();selectRegion(null);}if(e.key.toLowerCase()==='f')fit();});

const shortLabels={living:'퍼블릭 리빙룸',reading:'리딩룸',water:'워터바',mtg1:'M1',mtg2:'M2',mtg3:'M3',mtg4:'M4',vip:'VIP',tea:'티룸',podcast:'팟캐스트','core-east':'동측 코어','context-se':'경계 미확인'};
const labelNodes=model.labels.map(original=>{
  const label={...original,text:shortLabels[original.id]||original.text};
  const button=document.createElement('button');button.className='space-label';button.textContent=label.text;button.title=recordById.get(label.id).name;button.setAttribute('aria-label',recordById.get(label.id).name+' 선택');button.onclick=()=>selectRegion(label.id);
  $('labels').append(button);return {...label,button};
});
function updateLabels(){
  const w=host.clientWidth,h=host.clientHeight;
  for(const label of labelNodes){
    const show=showLabels&&model.groups.get(label.id).visible;
    if(!show){label.button.hidden=true;continue;}
    const [x,z]=world(label.p),v=new THREE.Vector3(x,.8,z).project(camera);
    const sx=(v.x*.5+.5)*w,sy=(-v.y*.5+.5)*h;
    label.button.hidden=v.z<-1||v.z>1||sx<0||sx>w||sy<0||sy>h;
    label.button.style.left=sx+'px';label.button.style.top=sy+'px';label.button.classList.toggle('selected',selectedId===label.id);
  }
}
$('toggle-labels').onchange=e=>{showLabels=e.target.checked;requestRender();};
$('toggle-furniture').onchange=e=>{model.setFurnitureVisible(e.target.checked);requestRender();};
$('wall-height').oninput=e=>{model.setWallHeight(Number(e.target.value));$('wall-value').textContent=Number(e.target.value).toFixed(1)+'m';requestRender();};

overlay=new THREE.Group();overlay.visible=false;
if(SOURCE.file){
 const texture=new THREE.TextureLoader().load(SOURCE.file,()=>{texture.colorSpace=THREE.SRGBColorSpace;requestRender();},undefined,()=>toast('원본 미리보기 파일을 확인하세요.'));
 const crop=[0,0,SOURCE.width,SOURCE.height];
 const [x1,y1,x2,y2]=crop;
 texture.repeat.set((x2-x1)/SOURCE.width,(y2-y1)/SOURCE.height);texture.offset.set(x1/SOURCE.width,(SOURCE.height-y2)/SOURCE.height);
 overlay=new THREE.Mesh(new THREE.PlaneGeometry((x2-x1)*SCALE,(y2-y1)*SCALE),new THREE.MeshBasicMaterial({map:texture,transparent:true,opacity:.65,depthWrite:false,depthTest:false,side:THREE.DoubleSide}));
 overlay.renderOrder=10;overlay.rotation.x=-Math.PI/2;const center=world([(x1+x2)/2,(y1+y2)/2]);overlay.position.set(center[0],.075,center[1]);overlay.visible=false;scene.add(overlay);
}else{$('toggle-overlay').disabled=true;}
$('toggle-overlay').onchange=e=>{overlay.visible=e.target.checked;$('overlay-range-row').hidden=!e.target.checked;requestRender();};
$('overlay-opacity').oninput=e=>{overlay.material.opacity=Number(e.target.value)/100;$('opacity-value').textContent=e.target.value+'%';requestRender();};

for(const dialog of document.querySelectorAll('dialog')){dialog.querySelector('.dialog-close').onclick=()=>dialog.close();dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close();}});}
$('open-plan').onclick=()=>$('plan-dialog').showModal();
$('info-button').onclick=$('assumptions-button').onclick=()=>$('info-dialog').showModal();
for(const a of META.assumptions){const li=document.createElement('li');li.textContent=a;$('assumptions-list').append(li);}
$('data-facts').textContent=MODEL?`${regions.length}개 영역 · ${model.objectCount}개 객체 · ${META.scaleBasis} · 1좌표 단위 = ${SCALE}m`:`${regions.length}개 영역 · ${columns.length}개 기둥 표식 · ${model.objectCount.toLocaleString()}개 3D 객체 · 원본 ${SOURCE.originalWidth} × ${SOURCE.originalHeight}px · 추정 축척: ${SCALE.toFixed(4)}m / 표시 이미지 px`;

function download(blob,name){const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);}
$('download-data').onclick=()=>{
  const data=MODEL;
  download(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}),'spatial-model.json');toast('모델 데이터 다운로드를 요청했습니다.');
};
$('download-image').onclick=()=>{
  renderer.render(scene,camera);
  const exportCanvas=document.createElement('canvas'),ratio=renderer.getPixelRatio(),footer=64*ratio;
  exportCanvas.width=renderer.domElement.width;exportCanvas.height=renderer.domElement.height+footer;
  const ctx=exportCanvas.getContext('2d');ctx.drawImage(renderer.domElement,0,0);
  if(showLabels)for(const label of labelNodes){
    if(label.button.hidden)continue;
    const x=parseFloat(label.button.style.left)*ratio,y=parseFloat(label.button.style.top)*ratio;
    ctx.font=`${10*ratio}px sans-serif`;const tw=ctx.measureText(label.text).width;
    ctx.fillStyle='#fffffff0';ctx.fillRect(x-tw/2-6*ratio,y-8*ratio,tw+12*ratio,17*ratio);ctx.fillStyle='#365369';ctx.textAlign='center';ctx.fillText(label.text,x,y+3.5*ratio);
  }
  ctx.fillStyle='#fff';ctx.fillRect(0,renderer.domElement.height,exportCanvas.width,footer);
  ctx.textAlign='left';ctx.fillStyle='#173c53';ctx.font=`600 ${13*ratio}px sans-serif`;ctx.fillText(META.title+' · '+(selectedId?recordById.get(selectedId).name:'전체 도면'),20*ratio,renderer.domElement.height+25*ratio);
  ctx.fillStyle='#7b8f9c';ctx.font=`${10*ratio}px sans-serif`;ctx.fillText(META.scaleBasis+' · 모델 정보의 가정 확인',20*ratio,renderer.domElement.height+45*ratio);
  const dataURL=exportCanvas.toDataURL('image/png');$('export-preview').src=dataURL;$('export-link').href=dataURL;$('export-dialog').showModal();
};

renderer.setSize(host.clientWidth,host.clientHeight);fit();
requestAnimationFrame(()=>{$('loading').hidden=true;requestRender();});
