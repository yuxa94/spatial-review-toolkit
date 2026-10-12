import * as THREE from 'three';
// The caller supplies the browser or Node web-ifc API; geometry conversion is identical.
export function loadIfc(bytes,api) {
  const modelID=api.OpenModel(bytes,{COORDINATE_TO_ORIGIN:true});
  if(modelID<0)throw new Error('IFC 모델을 열지 못했습니다. IFC STEP(.ifc) 파일을 확인하세요.');
  const root=new THREE.Group(),entries=[],warnings=[];
  try {
    const storeys=new Map(),rels=api.GetLineIDsWithType(modelID,3242617779); // IFCRELCONTAINEDINSPATIALSTRUCTURE
    for(let i=0;i<rels.size();i++) {
      const rel=api.GetLine(modelID,rels.get(i)),parent=api.GetLine(modelID,rel.RelatingStructure.value);
      for(const child of rel.RelatedElements||[])storeys.set(child.value,parent.Name?.value||'#'+parent.expressID);
    }
    rels.delete?.();
    api.StreamAllMeshes(modelID,flat=>{
      const item=api.GetLine(modelID,flat.expressID),group=new THREE.Group(),id='ifc-'+flat.expressID;
      const record={id,expressID:flat.expressID,globalId:item.GlobalId?.value||null,name:item.Name?.value||api.GetNameFromTypeCode(item.type),kind:api.GetNameFromTypeCode(item.type),storey:storeys.get(flat.expressID)||'층 연결 없음',group,objects:[]};
      for(let i=0;i<flat.geometries.size();i++) {
        const placement=flat.geometries.get(i),g=api.GetGeometry(modelID,placement.geometryExpressID);
        try {
          const vertices=api.GetVertexArray(g.GetVertexData(),g.GetVertexDataSize()),indices=api.GetIndexArray(g.GetIndexData(),g.GetIndexDataSize());
          const positions=new Float32Array(vertices.length/2),normals=new Float32Array(vertices.length/2);
          for(let k=0;k<vertices.length/6;k++){positions.set(vertices.subarray(k*6,k*6+3),k*3);normals.set(vertices.subarray(k*6+3,k*6+6),k*3);}
          const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.BufferAttribute(positions,3));geometry.setAttribute('normal',new THREE.BufferAttribute(normals,3));geometry.setIndex(new THREE.BufferAttribute(new Uint32Array(indices),1));
          const c=placement.color,material=new THREE.MeshStandardMaterial({color:new THREE.Color(c.x,c.y,c.z),opacity:c.w,transparent:c.w<1,side:THREE.DoubleSide,roughness:.8});
          const mesh=new THREE.Mesh(geometry,material);mesh.applyMatrix4(new THREE.Matrix4().fromArray(placement.flatTransformation));mesh.userData={entryId:id,objectId:id+'-'+i,type:record.kind};group.add(mesh);
          record.objects.push({id:mesh.userData.objectId,geometryExpressID:placement.geometryExpressID,triangles:indices.length/3});
        } finally {g.delete();}
      }
      if(group.children.length){root.add(group);entries.push(record);}
    });
    if(!entries.length)throw new Error('IFC에서 표시 가능한 형상을 찾지 못했습니다.');
    warnings.push('IFC에서 생성된 형상을 표시합니다. 미지원 표현·외부 참조·숨은 객체의 완전성 및 속성 전체는 검증하지 않았습니다.');
    return {root,entries,warnings,metadata:{format:'IFC',schema:api.GetModelSchema(modelID),coordinateOrigin:'COORDINATE_TO_ORIGIN',coordinationMatrix:Array.from(api.GetCoordinationMatrix(modelID)),unit:'m',limits:'객체 ID·이름·유형·층 연결 및 형상. 전체 BIM 속성 편집/저장 미지원.'}};
  } catch(error) {
    root.traverse(o=>{o.geometry?.dispose();o.material?.dispose();});throw error;
  } finally {api.CloseModel(modelID);}
}
