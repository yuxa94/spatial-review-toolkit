import {updateWalkKeys} from './walk-input.js';
import {createRenderBudget} from './render-budget.js';
import {createRenderer} from './webgl-support.js';
import * as THREE from 'three';
import {buildModel} from './scene-builder.js';
import {regions,META} from './plan-data.js';
import {createNavigation,roomCamera,planJourney,sampleJourney} from './navigation.js';
import {getProject,action,asset,fileData} from './project-client.js';
import {mountCommentPins} from './comment-pins.js';
import {mountComments} from './comments.js';
const $=id=>document.getElementById(id),host=$('stage'),scene=new THREE.Scene();scene.background=new THREE.Color('#eaf0f3');
const renderer=createRenderer(THREE,{antialias:true,preserveDrawingBuffer:false});renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;host.append(renderer.domElement);
const camera=new THREE.PerspectiveCamera(65,1,.06,400),model=buildModel({interior:true});model.setWallHeight(META.ceilingHeight);scene.add(model.root);
scene.add(new THREE.HemisphereLight('#ffffff','#aaa99e',2));const sun=new THREE.DirectionalLight('#fff8e9',2.1);sun.position.set(-30,70,25);scene.add(sun);
const renderBudget=createRenderBudget();
const nav=createNavigation(model),byId=new Map(regions.map(r=>[r.id,r]));
let project,workspace='',roomId=new URLSearchParams(location.search).get('room')||'living',object=null,yaw=0,pitch=0,drag=null,keys=new Set(),highlight=[],tab='camera',baseImage=new Image(),marks=[],markStart=null,markMode='rect',references=[],stops=[],journey=null,playing=false,elapsed=0,routeLine=null,recorder=null,recordChunks=[],videoURL=null,stopTarget=null;
function status(t){$('status').textContent=t;}
function guard(fn){return async()=>{try{await fn();}catch(e){status(e.message);}};}
function cameraSpec(){const direction=new THREE.Vector3();camera.getWorldDirection(direction);return {position:camera.position.toArray(),target:camera.position.clone().addScaledVector(direction,5).toArray(),fov:camera.fov,aspect:camera.aspect};}
function setCamera(spec){camera.position.fromArray(spec.position);const d=new THREE.Vector3().fromArray(spec.target).sub(camera.position).normalize();yaw=Math.atan2(d.x,-d.z);pitch=Math.asin(d.y);camera.fov=spec.fov||65;$('fov').value=camera.fov;$('fov-value').value=camera.fov+'°';camera.updateProjectionMatrix();look();}
function look(){renderBudget.invalidate();camera.lookAt(camera.position.clone().add(new THREE.Vector3(Math.sin(yaw)*Math.cos(pitch),Math.sin(pitch),-Math.cos(yaw)*Math.cos(pitch))));}
function clearHighlight(){for(const [m,original] of highlight){m.material.dispose();m.material=original;}highlight=[];}
function select(id,mesh=null){renderBudget.invalidate();roomId=id;object=mesh;$('room').value=id;clearHighlight();if(mesh){const original=mesh.material;mesh.material=original.clone();if(mesh.material.emissive)mesh.material.emissive.set('#205e74');highlight.push([mesh,original]);}$('selection-info').textContent=mesh?'선택 객체: '+mesh.userData.name:'공간 전체: '+byId.get(id)?.name;comments.refresh();}
const pins=mountCommentPins({host,camera,model,onSelect:id=>comments.activate(id,{move:false})});
function visitComment(c){
 if(c.camera?.kind==='overview'){location.href='/?comment='+encodeURIComponent(c.id);return;}
 playing=false;finishRecording();switchTab('camera');select(c.regionId,model.pickables.find(m=>(m.userData.furnitureId||m.userData.objectId)===c.objectId)||null);if(c.camera){setCamera(c.camera);$('eye').value=c.camera.position[1];$('stage-badge').textContent='코멘트 작성 시점 · 눈높이 '+c.camera.position[1].toFixed(1)+'m';status('코멘트를 남긴 실내 시점으로 돌아왔습니다.');}else preset();
}
const comments=mountComments($('studio-comments'),()=>({regionId:roomId}),{regionName:id=>byId.get(id)?.name||id,onPlace:enabled=>{if(enabled){playing=false;finishRecording();switchTab('camera');}host.classList.toggle('comment-placing',enabled);},onSelect:visitComment,onChange:(items,id,draft)=>pins.set(items,id,draft)});

for(const r of regions){const option=document.createElement('option');option.value=r.id;option.textContent=r.name;$('room').append(option);}
if(!byId.has(roomId))roomId=regions.find(r=>r.polygon&&!['service','existing','structure'].includes(r.category))?.id||regions[0].id;
document.title=META.title+' · 인테리어 스튜디오';$('ceiling-hint').textContent=`천장: 높이 ${META.ceilingHeight}m의 밝은 무광 평천장입니다. 실제 높이와 상부 개구부는 모델 가정 목록을 확인하세요.`;
function preset(){playing=false;finishRecording();const r=byId.get(roomId),spec=roomCamera(r,nav,$('preset').value,Number($('eye').value));setCamera(spec);$('stage-badge').textContent='눈높이 '+$('eye').value+'m · 모델 기준';status(r.name+' · 눈높이 '+$('eye').value+'m. 드래그로 둘러보고 W/A/S/D로 이동하세요.');}
$('room').onchange=()=>{select($('room').value);guard(preset)();};$('apply-camera').onclick=guard(preset);$('preset').onchange=guard(preset);
$('eye').onchange=()=>{const h=Number($('eye').value);if(h<1||h>2.1)return;camera.position.y=h;look();$('stage-badge').textContent='눈높이 '+h+'m · 모델 기준';};$('fov').oninput=()=>{camera.fov=Number($('fov').value);$('fov-value').value=camera.fov+'°';camera.updateProjectionMatrix();renderBudget.invalidate();};
new ResizeObserver(()=>{if(host.clientWidth&&host.clientHeight){renderer.setSize(host.clientWidth,host.clientHeight);camera.aspect=host.clientWidth/host.clientHeight;camera.updateProjectionMatrix();renderBudget.invalidate();}}).observe(host);
function switchTab(name){renderBudget.invalidate();tab=name;document.querySelector('aside').scrollTop=0;for(const b of document.querySelectorAll('[data-tab]'))b.classList.toggle('active',b.dataset.tab===name);for(const t of ['camera','image','journey'])$(t+'-panel').hidden=t!==name;$('image-stage').hidden=name!=='image';host.hidden=name==='image';$('stage-badge').hidden=name==='image';if(name==='image'){playing=false;finishRecording();}}
for(const b of document.querySelectorAll('[data-tab]'))b.onclick=()=>switchTab(b.dataset.tab);
host.addEventListener('pointerdown',e=>{host.focus();drag={x:e.clientX,y:e.clientY,startX:e.clientX,startY:e.clientY};host.setPointerCapture(e.pointerId);});
host.addEventListener('pointermove',e=>{if(!drag||playing||comments.placing)return;yaw-=(e.clientX-drag.x)*.004;pitch=Math.max(-1.15,Math.min(1.15,pitch+(e.clientY-drag.y)*.004));drag.x=e.clientX;drag.y=e.clientY;look();});
host.addEventListener('pointerup',e=>{if(drag&&Math.hypot(e.clientX-drag.startX,e.clientY-drag.startY)<5){const r=host.getBoundingClientRect(),ray=new THREE.Raycaster();ray.setFromCamera(new THREE.Vector2((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1),camera);const hit=ray.intersectObjects(model.pickables,false).find(h=>h.object.visible);if(hit){select(hit.object.userData.regionId,hit.object);if(comments.placing)comments.begin({regionId:hit.object.userData.regionId,objectId:hit.object.userData.furnitureId||hit.object.userData.objectId,objectName:hit.object.userData.name,point:hit.point.toArray(),camera:{...cameraSpec(),kind:'interior'}});}else if(comments.placing)status('벽·바닥·가구 위에 위치를 지정하세요.');}drag=null;});
host.addEventListener('keydown',e=>{if(e.key==='Escape')comments.cancel();if(updateWalkKeys(keys,e,true))e.preventDefault();});window.addEventListener('keyup',e=>updateWalkKeys(keys,e,false));window.addEventListener('blur',()=>keys.clear());host.addEventListener('blur',()=>keys.clear());
let last=performance.now();renderer.setAnimationLoop(now=>{const dt=Math.min(.05,(now-last)/1000);last=now;
 if(document.hidden||host.hidden||renderer.graphicsLost)return;
 if(playing&&journey){elapsed=Math.min(journey.duration,elapsed+dt);applyJourney();if(elapsed>=journey.duration){playing=false;finishRecording();}}
 else if(tab!=='image'&&keys.size){if(keys.has('ArrowLeft'))yaw-=dt;if(keys.has('ArrowRight'))yaw+=dt;if(keys.has('ArrowUp'))pitch=Math.min(.8,pitch+dt);if(keys.has('ArrowDown'))pitch=Math.max(-.8,pitch-dt);let forward=(keys.has('w')?1:0)-(keys.has('s')?1:0),side=(keys.has('d')?1:0)-(keys.has('a')?1:0),len=Math.hypot(forward,side)||1;
 const start=[camera.position.x,camera.position.z],delta=[(forward*Math.sin(yaw)+side*Math.cos(yaw))*dt*1.6/len,(-forward*Math.cos(yaw)+side*Math.sin(yaw))*dt*1.6/len],next=nav.move(start,delta);
 camera.position.x=next[0];camera.position.z=next[1];
 if(forward||side){const blocked=Math.hypot(next[0]-start[0]-delta[0],next[1]-start[1]-delta[1])>1e-6;$('stage-badge').textContent=!nav.free(start)?'현재 위치가 장애물 안입니다 · 실내 뷰 잡기로 위치를 다시 선택하세요':blocked?'벽·가구에 닿음 · 옆이나 뒤로 이동할 수 있습니다':'눈높이 '+camera.position.y.toFixed(1)+'m · 모델 기준';}look();}
 if(renderBudget.consume(now,{continuous:playing||recorder?.state==='recording'}))renderer.render(scene,camera);pins.update();
});
document.addEventListener('visibilitychange',()=>{renderBudget.invalidate();if(document.hidden){keys.clear();playing=false;finishRecording();}});
renderer.domElement.addEventListener('webglcontextlost',()=>{keys.clear();playing=false;finishRecording();});
renderer.domElement.addEventListener('webglcontextrestored',()=>{renderBudget.invalidate();status('그래픽 연결이 복구되었습니다.');});
async function refresh(){project=await getProject();workspace=project.workspace;for(const id of ['saved-views','image-view']){const select=$(id),old=select.value;select.replaceChildren(new Option('뷰 선택',''));for(const v of project.views)select.add(new Option(byId.get(v.regionId)?.name+' · '+v.name,v.id));select.value=old;}
 const old=$('saved-journeys').value;$('saved-journeys').replaceChildren(new Option('동선 선택',''));for(const j of project.journeys)$('saved-journeys').add(new Option(j.name,j.id));$('saved-journeys').value=old;}
function assetById(id){return project.assets.find(a=>a.id===id);}
function capture(){if(renderer.graphicsLost)throw Error('그래픽 연결이 복구된 후 다시 캡처하세요.');renderBudget.invalidate();const size=renderer.getSize(new THREE.Vector2()),ratio=renderer.getPixelRatio(),aspect=camera.aspect,hidden=routeLine?.visible;
 const selectedMaterials=highlight.map(([m])=>m.material);for(const [m,original] of highlight)m.material=original;if(routeLine)routeLine.visible=false;
 renderer.setPixelRatio(1);renderer.setSize(1280,720,false);camera.aspect=16/9;camera.updateProjectionMatrix();renderer.render(scene,camera);const data=renderer.domElement.toDataURL('image/png');
 renderer.setPixelRatio(ratio);renderer.setSize(size.x,size.y,false);camera.aspect=aspect;camera.updateProjectionMatrix();if(routeLine)routeLine.visible=hidden;
 highlight.forEach(([m],i)=>m.material=selectedMaterials[i]);return data;}
let captureDirectory=null;
$('choose-capture-folder').onclick=async()=>{
 if(!window.showDirectoryPicker){status('이 브라우저에서는 기본 captures 폴더와 PNG 다운로드를 사용하세요.');return;}
 try{captureDirectory=await window.showDirectoryPicker({id:'spatial-captures',mode:'readwrite'});$('capture-folder').textContent='추가 저장 폴더: '+captureDirectory.name+' · 현재 탭에서 유지';}
 catch(e){if(e.name!=='AbortError')status('폴더를 선택할 수 없습니다. 기본 captures 폴더는 계속 사용할 수 있습니다.');}
};
$('save-view').onclick=guard(async()=>{
 playing=false;finishRecording();const button=$('save-view');button.disabled=true;
 try{
  const data=capture(),saved=await asset($('view-name').value+'.png',data),res=await action({type:'view.add',regionId:roomId,name:$('view-name').value,assetId:saved.id,camera:{...cameraSpec(),aspect:16/9}});
  const link=$('capture-download');link.href=saved.path;link.download=$('view-name').value+'.png';link.hidden=false;
  await refresh();$('saved-views').value=res.id;$('image-view').value=res.id;loadVersions();
  let exported;
  try{const response=await fetch('/api/capture',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({viewId:res.id})});exported=await response.json();if(!response.ok)throw Error(exported.error||'폴더 저장 실패');}
  catch(e){$('capture-path').textContent='프로젝트 뷰는 저장됐지만 captures 폴더 저장은 실패했습니다. PNG 다운로드를 이용하세요.';status($('capture-path').textContent);return;}
  link.href=exported.url;link.download=exported.filename;$('capture-path').textContent='저장 완료: '+exported.path;
  if(captureDirectory){
   try{const file=await captureDirectory.getFileHandle(exported.filename,{create:true}),writer=await file.createWritable();await writer.write(await (await fetch(data)).blob());await writer.close();$('capture-path').textContent+=' · 선택 폴더에도 저장: '+captureDirectory.name;}
   catch(e){status('기본 captures 폴더에는 저장했습니다. 선택 폴더 저장은 실패했습니다. 폴더를 다시 선택하거나 PNG를 다운로드하세요.');return;}
  }
  status('PNG를 저장했습니다. 외부 이미지 도구에서 사용하세요. 저장 위치는 캡처 버튼 아래에 표시됩니다.');
 }finally{button.disabled=false;}
});
$('restore-view').onclick=guard(()=>{const v=project.views.find(v=>v.id===$('saved-views').value);if(!v)throw Error('저장한 뷰를 선택하세요.');select(v.regionId);setCamera(v.camera);switchTab('camera');});
function loadVersions(){const id=$('image-view').value,v=project.views.find(v=>v.id===id);$('base-image').replaceChildren();$('version-list').replaceChildren();marks=[];references=[];renderReferences();if(!v)return;select(v.regionId);$('base-image').add(new Option('원본 3D 캡처',v.assetId));for(const [i,version] of project.versions.filter(x=>x.viewId===id).entries()){const label='v'+(i+1)+' · '+(version.comment||'시각화 이미지');$('base-image').add(new Option(label,version.assetId));const button=document.createElement('button');button.textContent=label;button.onclick=()=>{$('base-image').value=version.assetId;loadBase();};$('version-list').append(button);}loadBase();}
$('image-view').onchange=loadVersions;$('base-image').onchange=loadBase;
function loadBase(){marks=[];const a=assetById($('base-image').value);if(!a){$('mark-list').replaceChildren();const ctx=$('annotation').getContext('2d');ctx.clearRect(0,0,$('annotation').width,$('annotation').height);return;}baseImage=new Image();baseImage.onload=()=>{const c=$('annotation');c.width=baseImage.naturalWidth;c.height=baseImage.naturalHeight;drawMarks();};baseImage.src=a.path;}
function drawMarks(preview=null){const c=$('annotation'),ctx=c.getContext('2d');if(!baseImage.complete||!baseImage.naturalWidth)return;ctx.clearRect(0,0,c.width,c.height);ctx.drawImage(baseImage,0,0);[...marks,...(preview?[preview]:[])].forEach((m,i)=>{const x=m.x*c.width,y=m.y*c.height;ctx.strokeStyle='#ec612f';ctx.lineWidth=Math.max(2,c.width/400);ctx.fillStyle='#ed602633';if(m.type==='rect'){ctx.fillRect(x,y,m.w*c.width,m.h*c.height);ctx.strokeRect(x,y,m.w*c.width,m.h*c.height);}ctx.fillStyle='#df5428';ctx.beginPath();ctx.arc(x,y,Math.max(11,c.width/65),0,Math.PI*2);ctx.fill();ctx.fillStyle='white';ctx.font=`bold ${Math.max(12,c.width/85)}px sans-serif`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(String(i+1),x,y);});$('mark-list').replaceChildren();marks.forEach((m,i)=>{const li=document.createElement('li');li.textContent=m.text;$('mark-list').append(li);});}
const xy=e=>{const r=$('annotation').getBoundingClientRect();return [Math.max(0,Math.min(1,(e.clientX-r.left)/r.width)),Math.max(0,Math.min(1,(e.clientY-r.top)/r.height))];};
$('annotation').onpointerdown=e=>{if(!$('base-image').value)return;if(!$('mark-text').value.trim()){status('먼저 마감·수정 내용을 입력하세요.');return;}markStart=xy(e);$('annotation').setPointerCapture(e.pointerId);};
$('annotation').onpointermove=e=>{if(!markStart||markMode!=='rect')return;const p=xy(e);drawMarks({type:'rect',x:Math.min(p[0],markStart[0]),y:Math.min(p[1],markStart[1]),w:Math.abs(p[0]-markStart[0]),h:Math.abs(p[1]-markStart[1])});};
$('annotation').onpointerup=e=>{if(!markStart)return;const p=xy(e),m={type:markMode,x:markMode==='pin'?p[0]:Math.min(p[0],markStart[0]),y:markMode==='pin'?p[1]:Math.min(p[1],markStart[1]),w:markMode==='pin'?0:Math.abs(p[0]-markStart[0]),h:markMode==='pin'?0:Math.abs(p[1]-markStart[1]),text:$('mark-text').value.trim()};if(markMode==='pin'||m.w>.005&&m.h>.005)marks.push(m);markStart=null;drawMarks();};
for(const type of ['rect','pin'])$('mark-'+type).onclick=()=>{markMode=type;$('mark-rect').classList.toggle('active',type==='rect');$('mark-pin').classList.toggle('active',type==='pin');};$('undo-mark').onclick=()=>{marks.pop();drawMarks();};
function renderReferences(){$('reference-list').replaceChildren();for(const id of references){const a=assetById(id),div=document.createElement('div'),img=document.createElement('img'),button=document.createElement('button');img.src=a.path;img.alt=a.name;button.textContent='제외';button.onclick=()=>{references=references.filter(x=>x!==id);renderReferences();};div.append(img,button);$('reference-list').append(div);}}
$('references').onchange=guard(async()=>{for(const f of $('references').files){const a=await asset(f.name,await fileData(f));references.push(a.id);}await refresh();renderReferences();$('references').value='';status('레퍼런스를 프로젝트 폴더에 저장했습니다.');});
$('save-brief').onclick=guard(async()=>{const viewId=$('image-view').value,baseAssetId=$('base-image').value;if(!viewId||!baseAssetId)throw Error('작업할 뷰와 이미지를 선택하세요.');const annotated=marks.length?await asset('material-notes.png',$('annotation').toDataURL('image/png')):null;const res=await action({type:'brief.add',viewId,baseAssetId,annotatedAssetId:annotated?.id,referenceIds:references,annotations:marks,comment:$('brief-comment').value});
 await refresh();makeHandoff(res.id);status('지시서를 저장했습니다. 전달문을 Astra 대화에 붙여넣으면 이어서 작업할 수 있습니다.');});
function makeHandoff(id){$('handoff').value=`${workspace}/skills/interior-visualization/SKILL.md를 읽고, ${workspace}/project/review.json의 지시서 ${id}를 사용해 인테리어 이미지를 만들어 줘. 원본 카메라와 벽·기둥·가구 배치를 유지하고, 표시한 마감과 레퍼런스 및 공간 코멘트를 적용해 줘. API 연결 없이 대화의 GPT Image 도구를 사용하고, 요청 모델은 GPT Image 2.5로 기록해 줘. 도구에서 모델을 지정할 수 없다면 실제 모델을 확정해서 말하지 마. 결과는 원본을 덮어쓰지 않고 새 이미지 버전으로 등록해 줘.`;}
$('load-brief').onclick=guard(async()=>{await refresh();const b=project.briefs.filter(b=>b.viewId===$('image-view').value&&b.baseAssetId===$('base-image').value).at(-1);if(!b)throw Error('이 이미지에 저장된 지시서가 없습니다.');marks=structuredClone(b.annotations);references=[...b.referenceIds];$('brief-comment').value=b.comment;renderReferences();drawMarks();makeHandoff(b.id);status('저장한 마감 지시와 레퍼런스를 불러왔습니다.');});
$('copy-handoff').onclick=guard(async()=>{if(!$('handoff').value)throw Error('먼저 지시서를 저장하세요.');try{await navigator.clipboard.writeText($('handoff').value);status('전달문을 복사했습니다.');}catch{$('handoff').select();status('전달문을 선택했습니다. 복사해서 대화에 붙여넣으세요.');}});
$('add-version').onclick=guard(async()=>{const f=$('version-file').files[0],viewId=$('image-view').value,parentAssetId=$('base-image').value;if(!f||!viewId)throw Error('뷰와 이미지 파일을 선택하세요.');const saved=await asset(f.name,await fileData(f));await action({type:'version.add',viewId,assetId:saved.id,parentAssetId,comment:$('version-note').value,modelUsed:'사용자 등록 · 모델 미확인'});await refresh();$('image-view').value=viewId;loadVersions();$('base-image').value=saved.id;loadBase();status('이미지를 새 버전으로 보관했습니다.');});
function renderStops(){$('stops').replaceChildren();stops.forEach((s,i)=>{const row=document.createElement('div'),text=document.createElement('span'),button=document.createElement('button');text.textContent=(i+1)+'. '+s.name;button.textContent='제외';button.onclick=()=>{stops.splice(i,1);renderStops();};row.append(text,button);$('stops').append(row);});}
$('add-stop').onclick=()=>{stops.push({name:byId.get(roomId)?.name||'정지점',regionId:roomId,...cameraSpec()});renderStops();};
$('demo-route').onclick=guard(()=>{const r=byId.get(roomId);stops=['west','east','north'].map(p=>({name:r.name+' '+p,regionId:r.id,...roomCamera(r,nav,p,Number($('eye').value))}));renderStops();status('예제 정지점을 추가했습니다. 동선 만들기를 누르세요.');});
function setJourney(j){finishRecording();journey=j;elapsed=0;playing=false;if(routeLine){scene.remove(routeLine);routeLine.geometry.dispose();routeLine.material.dispose();}routeLine=new THREE.Line(new THREE.BufferGeometry().setFromPoints(j.points.map(p=>new THREE.Vector3(p[0],.06,p[2]))),new THREE.LineBasicMaterial({color:'#267a91'}));scene.add(routeLine);$('route-info').textContent=`${j.length.toFixed(1)}m · ${j.duration.toFixed(1)}초 · 눈높이 ${j.eye}m`;applyJourney();}
$('build-route').onclick=guard(async()=>{const j=planJourney(stops,nav,{name:$('journey-name').value,eye:Number($('eye').value),speed:Number($('speed').value)});await action({type:'journey.add',journey:j});setJourney(j);await refresh();status('벽·가구·보이드를 피하는 동선을 저장했습니다.');});
function applyJourney(){const sample=sampleJourney(journey,elapsed);camera.position.fromArray(sample.position);const ahead=sampleJourney(journey,Math.min(journey.duration,elapsed+.55)),d=new THREE.Vector3().fromArray(ahead.position).sub(camera.position);if(d.length()<.001)d.fromArray(sample.direction);const desired=Math.atan2(d.x,-d.z),delta=Math.atan2(Math.sin(desired-yaw),Math.cos(desired-yaw));yaw+=delta*.2;pitch=-.035;look();$('timeline').value=journey.duration?elapsed/journey.duration*1000:0;$('stage-badge').textContent=`보행 ${elapsed.toFixed(1)} / ${journey.duration.toFixed(1)}초 · ${journey.speed}m/s`;}
$('play-route').onclick=()=>{if(!journey){status('동선을 먼저 만드세요.');return;}if(elapsed>=journey.duration)elapsed=0;playing=true;};$('pause-route').onclick=()=>{playing=false;finishRecording();};$('reset-route').onclick=()=>{if(!journey)return;playing=false;finishRecording();elapsed=0;applyJourney();};$('timeline').oninput=()=>{if(journey){playing=false;finishRecording();elapsed=Number($('timeline').value)/1000*journey.duration;applyJourney();}};
$('load-route').onclick=guard(()=>{const j=project.journeys.find(x=>x.id===$('saved-journeys').value);if(!j)throw Error('동선을 선택하세요.');for(let i=1;i<j.points.length;i++)if(!nav.segment([j.points[i-1][0],j.points[i-1][2]],[j.points[i][0],j.points[i][2]]))throw Error('현재 모델에서 동선 충돌이 발견됐습니다. 다시 계산하세요.');stops=j.stops||[];renderStops();setJourney(j);});
function finishRecording(){if(recorder&&recorder.state==='recording')recorder.stop();}
$('record-route').onclick=guard(()=>{if(!journey)throw Error('먼저 동선을 만드세요.');if(typeof MediaRecorder==='undefined'||!renderer.domElement.captureStream)throw Error('이 브라우저는 영상 녹화를 지원하지 않습니다. Chrome/Edge에서 사용하세요.');const mime=['video/webm;codecs=vp9','video/webm;codecs=vp8','video/mp4'].find(m=>MediaRecorder.isTypeSupported(m));if(!mime)throw Error('지원되는 녹화 형식을 찾지 못했습니다.');if(recorder?.state==='recording')return;recordChunks=[];const stream=renderer.domElement.captureStream(30);recorder=new MediaRecorder(stream,{mimeType:mime});recorder.ondataavailable=e=>{if(e.data.size)recordChunks.push(e.data);};recorder.onstop=()=>{stream.getTracks().forEach(t=>t.stop());if(videoURL)URL.revokeObjectURL(videoURL);const video=new Blob(recordChunks,{type:mime});videoURL=URL.createObjectURL(video);$('video-download').href=videoURL;$('video-download').download='spatial-journey.'+(mime.includes('mp4')?'mp4':'webm');$('video-download').hidden=false;$('video-download').textContent='녹화한 동선 영상 다운로드 ('+Math.round(video.size/1024)+' KB)';status('녹화를 마쳤습니다. 영상 다운로드를 누르세요.');};recorder.start(200);elapsed=0;playing=true;status('동선을 녹화하고 있습니다. 끝에서 자동 종료되며, 일시 정지로 짧게 저장할 수도 있습니다.');});
try{await refresh();select(roomId);preset();const id=new URLSearchParams(location.search).get('comment');if(id){await comments.refresh();comments.activate(id);}}catch(e){status(e.message);}
