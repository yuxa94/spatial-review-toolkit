import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as THREE from 'three';
import { IfcAPI } from 'web-ifc';
import { loadDxf } from '../importers/dxf.js';
import { loadIfc } from '../importers/ifc.js';
const dxf=fs.readFileSync(new URL('../examples/sample.dxf',import.meta.url),'utf8');
test('DXF preserves source layers, handles, units and reports unsupported text',()=>{
  const m=loadDxf(dxf);assert.deepEqual(m.entries.map(e=>e.name),['WALL','FURNITURE']);
  assert.equal(m.entries[0].objects.length,2);assert.equal(m.entries[1].objects.length,4);
  assert.equal(m.entries[0].objects[0].id,'/100');assert.equal(m.metadata.metersPerUnit,.001);
  assert.match(m.warnings.join(' '),/TEXT/);
  const bounds=new THREE.Box3().setFromObject(m.root),size=bounds.getSize(new THREE.Vector3());assert.ok(Math.abs(size.x-10)<1e-5);assert.ok(Math.abs(size.z-6)<1e-5);
});
test('unknown DXF units require explicit choice and override rescales coordinates',()=>{
  const missing=dxf.replace('70\n4\n','70\n0\n');assert.throws(()=>loadDxf(missing),/단위/);
  assert.equal(loadDxf(missing,'cm').metadata.metersPerUnit,.01);
  assert.throws(()=>loadDxf('AutoCAD Binary DXF'),/바이너리/);
});
test('IFC WASM imports wall and slab with GUIDs, storey containment and actual geometry',async()=>{
  const api=new IfcAPI();await api.Init();const bytes=new Uint8Array(fs.readFileSync(new URL('../examples/sample.ifc',import.meta.url)));
  const m=loadIfc(bytes,api);assert.equal(m.entries.length,2);assert.deepEqual(m.entries.map(e=>e.kind).sort(),['IfcSlab','IfcWall']);
  for(const e of m.entries){assert.equal(e.storey,'Level 1');assert.equal(e.globalId.length,22);assert.ok(e.objects.every(o=>o.triangles>0));}
  const wall=m.entries.find(e=>e.kind==='IfcWall'),size=new THREE.Box3().setFromObject(wall.group).getSize(new THREE.Vector3());
  assert.ok(Math.abs(size.x-5)<1e-4);assert.ok(Math.abs(size.y-3)<1e-4);assert.ok(Math.abs(size.z-.2)<1e-4);
  // Repeat verifies model closure does not invalidate copied mesh arrays or subsequent loads.
  assert.equal(loadIfc(bytes,api).entries.length,2);api.Dispose();
});
const pairs=(...xs)=>xs.join('\n')+'\n';
const header=pairs(0,'SECTION',2,'HEADER',9,'$INSUNITS',70,6,0,'ENDSEC');
test('DXF block base point, rotation, scale and layer inheritance survive normalization',()=>{
  const blocks=pairs(0,'SECTION',2,'BLOCKS',0,'BLOCK',2,'seat',10,10,20,20,30,0,0,'LINE',5,'C1',8,'0',10,10,20,20,30,0,11,12,21,20,31,0,0,'ENDBLK',0,'ENDSEC');
  const entities=pairs(0,'SECTION',2,'ENTITIES',0,'INSERT',5,'I1',8,'CHAIR',2,'seat',10,100,20,200,30,0,41,2,42,3,43,1,50,90,0,'ENDSEC',0,'EOF');
  const m=loadDxf(header+blocks+entities);assert.equal(m.entries[0].name,'CHAIR');
  const o=m.entries[0].objects[0];assert.equal(o.id,'/I1/C1');assert.deepEqual(o.points,[[100,0,-200],[100,0,-204]]);assert.deepEqual(m.metadata.renderOrigin,[100,0,-200]);
});
test('DXF bulge retains semicircular geometry rather than a straight chord',()=>{
  const m=loadDxf(header+pairs(0,'SECTION',2,'ENTITIES',0,'LWPOLYLINE',8,'ARC',90,2,70,0,10,0,20,0,42,1,10,2,20,0,0,'ENDSEC',0,'EOF'));
  const points=m.entries[0].objects[0].points;assert.ok(points.length>20);assert.ok(Math.max(...points.map(p=>p[2]))>.99);assert.ok(Math.abs(points.at(-1)[0]-2)<1e-8);
});
