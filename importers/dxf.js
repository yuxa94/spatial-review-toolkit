import * as THREE from 'three';
import DxfParser from '../vendor/dxf-parser.js';

export function loadDxf(text,unitOverride='auto') {
  if(text.startsWith('AutoCAD Binary DXF'))throw new Error('바이너리 DXF는 지원하지 않습니다. ASCII DXF로 저장하세요.');
  const data=new DxfParser().parseSync(text);
  if(!data?.entities)throw new Error('DXF ENTITIES 섹션을 읽을 수 없습니다.');
  const unitCode=data.header?.$INSUNITS||0,units={1:['inch',.0254],2:['ft',.3048],4:['mm',.001],5:['cm',.01],6:['m',1]};
  const override={mm:.001,cm:.01,m:1,inch:.0254,ft:.3048};
  const unit=unitOverride==='auto'?units[unitCode]?.[0]:unitOverride;
  const scale=unitOverride==='auto'?units[unitCode]?.[1]:override[unitOverride];
  if(!scale)throw new Error('도면 단위를 확인할 수 없습니다. 상단에서 DXF 단위를 선택한 후 다시 여세요.');
  const root=new THREE.Group(),entries=[],warnings=[],skipped={},layers=new Map();
  const miss=type=>skipped[type]=(skipped[type]||0)+1;
  let serial=0,origin=null;
  function emit(points,e,layer,path) {
    if(points.length<2||points.some(p=>p.some(v=>!Number.isFinite(v)))){miss('잘못된 좌표');return;}
    const world=points.map(([x,y,z=0])=>[x*scale,z*scale,-y*scale]);
    let entry=layers.get(layer);
    if(!entry){const group=new THREE.Group();root.add(group);entry={id:'layer-'+layers.size,name:layer,kind:'DXF 레이어',group,objects:[]};entries.push(entry);layers.set(layer,entry);}
    origin ||= [...world[0]];
    const objectId=path+'/'+(e.handle||++serial),geometry=new THREE.BufferGeometry().setFromPoints(world.map(p=>new THREE.Vector3(...p).sub(new THREE.Vector3(...origin))));
    const color=e.color||data.tables?.layer?.layers?.[layer]?.color||0x355e77;
    const line=new THREE.Line(geometry,new THREE.LineBasicMaterial({color:color===0xffffff?0x355e77:color}));
    line.userData={entryId:entry.id,objectId,type:e.type,sourceLayer:layer};entry.group.add(line);
    entry.objects.push({id:objectId,type:e.type,layer,points:world});
  }
  function walk(e,matrix=new THREE.Matrix4(),inherited='0',path='',depth=0) {
    if(++serial>200000)throw new Error('DXF 요소가 너무 많습니다. 층별 파일로 나눠 주세요.');
    const layer=!e.layer||e.layer==='0'?inherited:e.layer;
    const normal=e.extrusionDirection||{x:e.extrusionDirectionX||0,y:e.extrusionDirectionY||0,z:e.extrusionDirectionZ??1};
    if(normal.x||normal.y||normal.z!==1){miss(e.type+' / 비표준 OCS');return;}
    const transform=points=>points.map(p=>new THREE.Vector3(...p).applyMatrix4(matrix).toArray());
    if(e.type==='INSERT') {
      const block=data.blocks?.[e.name];
      if(!block||depth>12){miss('해결 불가/순환 INSERT');return;}
      if((e.rowCount||1)>1||(e.columnCount||1)>1){miss('배열 INSERT');return;}
      const p=e.position||{},base=block.position||{};
      const local=new THREE.Matrix4().makeTranslation(p.x||0,p.y||0,p.z||0)
        .multiply(new THREE.Matrix4().makeRotationZ((e.rotation||0)*Math.PI/180))
        .multiply(new THREE.Matrix4().makeScale(e.xScale??1,e.yScale??1,e.zScale??1))
        .multiply(new THREE.Matrix4().makeTranslation(-(base.x||0),-(base.y||0),-(base.z||0)));
      for(const child of block.entities||[])walk(child,matrix.clone().multiply(local),layer,path+'/'+(e.handle||e.name),depth+1);
      return;
    }
    let points=[];
    if(['LINE','LWPOLYLINE','POLYLINE'].includes(e.type)) {
      if(e.is3dPolygonMesh||e.is3dPolyline||e.isPolyfaceMesh){miss(e.type+' / 3D');return;}
      const vs=e.vertices||[],n=vs.length,closed=!!e.shape;
      for(let i=0;i<n;i++) {
        const a=vs[i],b=vs[(i+1)%n];points.push([a.x,a.y,a.z??e.elevation??0]);
        if(a.bulge&&(i<n-1||closed)) {
          const theta=4*Math.atan(a.bulge),dx=b.x-a.x,dy=b.y-a.y,L=Math.hypot(dx,dy),offset=L*(1-a.bulge*a.bulge)/(4*a.bulge);
          const cx=(a.x+b.x)/2-dy/L*offset,cy=(a.y+b.y)/2+dx/L*offset,r=Math.hypot(a.x-cx,a.y-cy),start=Math.atan2(a.y-cy,a.x-cx),steps=Math.max(8,Math.ceil(Math.abs(theta)*24));
          for(let j=1;j<steps;j++){const t=start+theta*j/steps;points.push([cx+r*Math.cos(t),cy+r*Math.sin(t),a.z??e.elevation??0]);}
        }
      }
      if(closed&&points.length)points.push(points[0]);
    } else if(e.type==='CIRCLE'||e.type==='ARC') {
      const c=e.center,start=e.type==='CIRCLE'?0:e.startAngle;
      let sweep=e.type==='CIRCLE'?Math.PI*2:e.endAngle-start;if(sweep<=0)sweep+=Math.PI*2;
      const n=Math.max(12,Math.ceil(sweep*32));for(let i=0;i<=n;i++){const a=start+sweep*i/n;points.push([c.x+e.radius*Math.cos(a),c.y+e.radius*Math.sin(a),c.z||0]);}
    } else {miss(e.type);return;}
    emit(transform(points),e,layer,path);
  }
  for(const e of data.entities)walk(e);
  // Parser silently ignores some entities; enumerate raw records to report those too.
  const tokens=text.split(/\r\n|\r|\n/),known=new Set(['LINE','LWPOLYLINE','POLYLINE','CIRCLE','ARC','INSERT','VERTEX','SEQEND','BLOCK','ENDBLK']);
  let inEntities=false,inBlocks=false;const rawSkipped={};
  for(let i=0;i<tokens.length-1;i+=2){const code=tokens[i].trim(),value=tokens[i+1].trim();if(code==='2'&&value==='ENTITIES')inEntities=true;if(code==='2'&&value==='BLOCKS')inBlocks=true;if(code==='0'&&value==='ENDSEC'){inEntities=false;inBlocks=false;}else if((inEntities||inBlocks)&&code==='0'&&!known.has(value))rawSkipped[value]=(rawSkipped[value]||0)+1;}
  for(const [type,n] of Object.entries(rawSkipped))skipped[type]=Math.max(skipped[type]||0,n);
  if(Object.keys(skipped).length)warnings.push('표시하지 않은 요소: '+Object.entries(skipped).map(([k,v])=>`${k} (${v})`).join(', '));
  if(!entries.length)throw new Error('표시 가능한 선 형상이 없습니다. '+warnings.join(' '));
  return {root,entries,warnings,metadata:{format:'DXF',unit,metersPerUnit:scale,sourceUnitCode:unitCode,renderOrigin:origin,upAxis:'source Z → viewer Y',limits:'2D 선형상만 표시. 벽/가구/실 의미 및 높이 자동 생성 없음.'}};
}
