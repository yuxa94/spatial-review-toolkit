// Portable data contract: x/y are plan coordinates; all vertical dimensions are metres.
export function validateModel(m){
 const fail=msg=>{throw Error('모델 데이터: '+msg);},finite=Number.isFinite;
 const pair=p=>Array.isArray(p)&&p.length===2&&p.every(finite);
 const polygon=p=>Array.isArray(p)&&p.length>=3&&p.every(pair)&&Math.abs(p.reduce((s,a,i)=>{const b=p[(i+1)%p.length];return s+a[0]*b[1]-b[0]*a[1];},0))>1e-8;
 if(m?.schema!=='spatial-model/1')fail('schema는 spatial-model/1이어야 합니다.');
 if(typeof m.name!=='string'||!m.name.trim())fail('프로젝트 이름 필요');
 if(!finite(m.scale)||m.scale<=0||!pair(m.origin)||!polygon(m.footprint))fail('축척·원점·외곽 확인');
 if(!finite(m.ceilingHeight)||m.ceilingHeight<2.2||m.ceilingHeight>12)fail('천장 높이 2.2~12m');
 if(!Array.isArray(m.regions)||!m.regions.length||!Array.isArray(m.objects))fail('영역과 객체 배열 필요');
 const ids=new Set(['circulation','columns','perimeter']);
 const id=s=>typeof s==='string'&&/^[a-zA-Z0-9_-]{1,100}$/.test(s);
 for(const r of [...m.regions,...(m.voids||[])]){if(!id(r.id)||ids.has(r.id)||!r.name||!polygon(r.polygon))fail('영역 ID·이름·폴리곤 오류: '+r.id);ids.add(r.id);}
 const objectIds=new Set();
 for(const o of m.objects){
  if(!id(o.id)||o.id.startsWith('auto-')||objectIds.has(o.id)||!ids.has(o.regionId))fail('객체 ID 또는 소속 영역 오류: '+o.id);objectIds.add(o.id);
  if(!['box','cylinder','wall'].includes(o.kind)||!['wall','glass','column','furniture'].includes(o.type))fail('객체 종류 오류: '+o.id);
  if(!finite(o.height)||o.height<=0||(o.base!=null&&(!finite(o.base)||o.base<0))||(o.rotation!=null&&!finite(o.rotation)))fail('높이/회전 오류: '+o.id);
  if(o.kind==='wall'){if(!pair(o.a)||!pair(o.b)||Math.hypot(o.b[0]-o.a[0],o.b[1]-o.a[1])<1e-6||!finite(o.thickness)||o.thickness<=0)fail('벽 선분 오류: '+o.id);}
  else if(!pair(o.position)||(o.kind==='box'&&(!pair(o.size)||o.size.some(n=>n<=0)))||(o.kind==='cylinder'&&(!finite(o.radius)||o.radius<=0)))fail('객체 치수 오류: '+o.id);
 }
 if(m.source?.preview&&(!finite(m.source.width)||m.source.width<=0||!finite(m.source.height)||m.source.height<=0))fail('겹치기 이미지의 폭·높이 필요');
 if(!Array.isArray(m.assumptions)||!m.assumptions.every(s=>typeof s==='string'))fail('가정 목록 필요');
 return m;
}
export function normalizeModel(input){
 const m=validateModel(input),SCALE=m.scale,world=([x,y])=>[(x-m.origin[0])*SCALE,(y-m.origin[1])*SCALE],source=([x,z])=>[x/SCALE+m.origin[0],z/SCALE+m.origin[1]];
 const categoryLabels={public:'라운지·공용 공간',meeting:'회의·부속 공간',service:'코어·설비·창고',existing:'기존 미표기 영역',structure:'구조·보이드',circulation:'공용 동선'};
 const zones=m.regions.map(r=>({...r,category:categoryLabels[r.category]?r.category:'public',en:r.en||r.name,color:r.color||'#d9c9b4',label:r.label||r.polygon.reduce((a,p)=>[a[0]+p[0]/r.polygon.length,a[1]+p[1]/r.polygon.length],[0,0])}));
 const voids=m.voids||[],structuralRegions=[{id:'circulation',name:'공용 동선',category:'circulation',color:'#e4dfd5'},{id:'columns',name:'구조 기둥',category:'structure',color:'#adb7bb'},{id:'perimeter',name:'외곽 벽체',category:'structure',color:'#c5cdcf'},...voids.map(v=>({...v,category:'structure',color:'#92a2ae'}))].map(r=>({...r,en:r.name}));
 return {MODEL:m,SCALE,world,source,zones,regions:[...zones,...structuralRegions],structuralRegions,categoryLabels,footprint:m.footprint,voids,columns:m.objects.filter(o=>o.type==='column').map(o=>o.position||o.a),partialBoundaries:[],SOURCE:{file:m.source?.preview||'',width:m.source?.width||1,height:m.source?.height||1,originalWidth:m.source?.width||1,originalHeight:m.source?.height||1},META:{title:m.name,revision:m.revision||'1',ceilingHeight:m.ceilingHeight,scale:SCALE,scaleBasis:m.scaleBasis||'입력 모델의 축척',assumptions:m.assumptions}};
}
