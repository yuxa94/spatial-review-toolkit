import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,mkdtemp,rm,writeFile,stat} from 'node:fs/promises';
import path from 'node:path';
import {tmpdir} from 'node:os';
import {execFileSync} from 'node:child_process';
import * as THREE from 'three';
import {validateModel,normalizeModel} from '../model-schema.js';
import {buildGenericModel} from '../generic-scene.js';
import {createProject} from '../scripts/new-project.mjs';
const example=JSON.parse(await readFile(new URL('../examples/new-plan.json',import.meta.url),'utf8'));

test('arbitrary region IDs and stable furniture IDs produce separate selectable models',()=>{
 const model=buildGenericModel(example,{interior:true});model.root.updateMatrixWorld(true);
 assert.ok(model.groups.has('lounge-a'));assert.ok(!model.groups.has('living'));
 assert.equal(model.pickables.find(m=>m.userData.objectId==='sofa-a-back').userData.furnitureId,'sofa-a');
 const ray=new THREE.Raycaster(new THREE.Vector3(8,1.6,8),new THREE.Vector3(0,1,0));
 assert.ok(Math.abs(ray.intersectObjects(model.pickables)[0].point.y-3)<1e-6);
 model.setRegionVisible('meeting-b',false);assert.equal(model.groups.get('lounge-a').visible,true);
 const m=structuredClone(example);m.scale=.01;m.origin=[100,200];assert.deepEqual(normalizeModel(m).world([300,500]),[2,3]);
});
test('invalid identities, geometry and scale fail before new model creation',()=>{
 for(const change of [m=>m.scale=0,m=>m.regions[0].id='circulation',m=>m.objects[0].regionId='missing',m=>m.objects[1].id=m.objects[0].id,m=>m.objects[0].height=NaN,m=>m.objects[0].a=m.objects[0].b]){const m=structuredClone(example);change(m);assert.throws(()=>validateModel(m));}
});
test('new project starts clean, runs portable journey engine with its own model, and rejects overwrite',async()=>{
 const base=await mkdtemp(path.join(tmpdir(),'spatial-reuse-')),dest=path.join(base,'client');
 try{
  await createProject({destination:dest,modelFile:new URL('../examples/new-plan.json',import.meta.url)});
  const state=JSON.parse(await readFile(path.join(dest,'project/review.json'),'utf8'));assert.equal(state.views.length,0);assert.equal(state.comments.length,0);assert.equal(state.assets.length,0);
  await assert.rejects(stat(path.join(dest,'assets/source-plan.png')));
  const output=execFileSync(process.execPath,['--input-type=module','-e',"import {generateJourney} from './scripts/journey-engine.mjs'; console.log(JSON.stringify(generateJourney({stops:[{regionId:'lounge-a',preset:'west'},{regionId:'meeting-b',preset:'east'}]})));"],{cwd:dest,encoding:'utf8'});
  const journey=JSON.parse(output);assert.ok(journey.length>0);assert.equal(journey.stops[1].regionId,'meeting-b');assert.match(journey.validatedAgainst,/새 도면 예제/);
  await assert.rejects(createProject({destination:dest,modelFile:new URL('../examples/new-plan.json',import.meta.url)}),/이미 있습니다/);
  await writeFile(path.join(dest,'model.json'),'{"schema":"bad"}');const previous=await readFile(path.join(dest,'model-definition.js'),'utf8');
  assert.throws(()=>execFileSync(process.execPath,['scripts/sync-model.mjs'],{cwd:dest,stdio:'pipe'}));assert.equal(await readFile(path.join(dest,'model-definition.js'),'utf8'),previous);
 }finally{await rm(base,{recursive:true,force:true});}
});
