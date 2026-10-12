import * as THREE from 'three';
import {normalizeModel} from './model-schema.js';
export function buildGenericModel(definition,{interior=false}={}){
 const {regions,zones,footprint,voids,world,META,SCALE}=normalizeModel(definition);
 const root=new THREE.Group(),groups=new Map(),pickables=[],walls=[],furniture=[],labels=[];
 root.name=definition.name;
 for(const r of regions){const g=new THREE.Group();g.name=r.name;g.userData.regionId=r.id;root.add(g);groups.set(r.id,g);}
 const materials=new Map();
 function material(color,glass=false){const key=color+glass;if(!materials.has(key))materials.set(key,new THREE.MeshStandardMaterial({color,roughness:.8,transparent:glass,opacity:glass?.28:1,depthWrite:!glass,side:THREE.DoubleSide}));return materials.get(key);}
 function add(mesh,regionId,id,type,name){mesh.userData={regionId,objectId:id,objectType:type,name};mesh.receiveShadow=true;mesh.castShadow=!['floor','glass','ceiling'].includes(type);groups.get(regionId).add(mesh);pickables.push(mesh);if(type==='furniture')furniture.push(mesh);return mesh;}
 function shape(poly,holes=[]){const convert=p=>{const [x,z]=world(p);return new THREE.Vector2(x,-z);};const s=new THREE.Shape(poly.map(convert));s.holes=holes.map(h=>new THREE.Path(h.map(convert)));return s;}
 function surface(regionId,id,poly,color,y,holes=[],ceiling=false){const geometry=new THREE.ShapeGeometry(shape(poly,holes));geometry.rotateX(-Math.PI/2);const mat=ceiling?new THREE.MeshStandardMaterial({color:'#f2f0e9',roughness:.95,side:THREE.BackSide,emissive:'#f2f0e9',emissiveIntensity:.4}):material(color);const mesh=add(new THREE.Mesh(geometry,mat),regionId,id,ceiling?'ceiling':'floor',ceiling?'평천장 · 입력 높이 기준':groups.get(regionId).name+' 바닥');mesh.position.y=y;return mesh;}
 surface('circulation','auto-floor',footprint,'#e4dfd5',-.015,voids.map(v=>v.polygon));
 for(const r of zones){surface(r.id,'auto-floor-'+r.id,r.polygon,r.color,0);labels.push({id:r.id,text:r.name,p:r.label,color:r.color});}
 for(const o of definition.objects){
  const mat=material(o.color||'#c5c2b8',o.type==='glass');let mesh,p=o.position,angle=o.rotation||0;
  if(o.kind==='cylinder'){mesh=new THREE.Mesh(new THREE.CylinderGeometry(o.radius*SCALE,o.radius*SCALE,1,20),mat);}
  else {let size=o.size;if(o.kind==='wall'){size=[Math.hypot(o.b[0]-o.a[0],o.b[1]-o.a[1]),o.thickness];p=[(o.a[0]+o.b[0])/2,(o.a[1]+o.b[1])/2];angle=-Math.atan2(o.b[1]-o.a[1],o.b[0]-o.a[0]);}mesh=new THREE.Mesh(new THREE.BoxGeometry(size[0]*SCALE,1,size[1]*SCALE),mat);}
  const [x,z]=world(p),base=o.base||0;mesh.position.set(x,base+o.height/2,z);mesh.scale.y=o.height;mesh.rotation.y=angle;
  add(mesh,o.regionId,o.id,o.type,o.name||o.id);Object.assign(mesh.userData,{sourceAnchor:p,sourceId:o.sourceId||null,assumed:!!o.assumed,...(o.furnitureId?{furnitureId:o.furnitureId}:{})});
  if(['wall','glass','column'].includes(o.type))walls.push({mesh,height:o.height,base});
 }
 if(interior)surface('circulation','auto-ceiling',footprint,'#f2f0e9',META.ceilingHeight,voids.map(v=>v.polygon),true);
 const bounds=new THREE.Box3().setFromObject(root);
 return {root,groups,pickables,walls,furniture,labels,bounds,objectCount:pickables.length,setWallHeight(h){for(const w of walls){const height=Math.max(.001,Math.min(w.height,h-w.base));w.mesh.scale.y=height;w.mesh.position.y=w.base+height/2;w.mesh.visible=h>w.base;}},setFurnitureVisible(show){for(const m of furniture)m.visible=show;},setRegionVisible(id,show){groups.get(id).visible=show;}};
}
