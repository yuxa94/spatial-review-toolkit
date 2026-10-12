import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm,readFile,readdir} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {ProjectStore} from '../project-store.mjs';
const png='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aA1cAAAAASUVORK5CYII=';
test('capture export writes identical PNG plus camera metadata with safe unique filenames',async()=>{
 const base=await mkdtemp(path.join(tmpdir(),'capture-export-'));try{
  const store=new ProjectStore(path.join(base,'project')),a=await store.asset({name:'view.png',dataURL:png});
  const data={type:'view.add',name:'../라운지:같은 이름',regionId:'lounge',assetId:a.id,camera:{position:[0,1.6,0],target:[1,1.6,1],fov:65}};
  const v1=await store.action(data),v2=await store.action(data),first=await store.exportCapture(v1.id),second=await store.exportCapture(v2.id);
  assert.notEqual(first.path,second.path);assert.equal(path.dirname(first.path),path.join(base,'captures'));
  assert.deepEqual(await readFile(first.path),Buffer.from(png.split(',')[1],'base64'));
  assert.deepEqual(JSON.parse(await readFile(first.path.replace(/\.png$/,'.json'),'utf8')).camera,data.camera);
  await store.exportCapture(v1.id);assert.equal((await readdir(path.join(base,'captures'))).length,4);
  await assert.rejects(store.exportCapture('../invalid'));assert.equal((await store.read()).views.length,2);
 }finally{await rm(base,{recursive:true,force:true});}
});
