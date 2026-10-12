import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm,readFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {ProjectStore,emptyProject,applyAction} from '../project-store.mjs';
const png='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aA1cAAAAASUVORK5CYII=';
test('concurrent comments survive disk reload and resolve without overwriting one another',async()=>{
 const dir=await mkdtemp(path.join(tmpdir(),'spatial-project-'));try{
 const store=new ProjectStore(dir);await Promise.all(Array.from({length:12},(_,i)=>store.action({type:'comment.add',regionId:'living',objectId:'sofa-'+i,text:'코멘트 '+i})));
 const loaded=await new ProjectStore(dir).read();assert.equal(loaded.comments.length,12);assert.equal(loaded.revision,12);await store.action({type:'comment.resolve',id:loaded.comments[0].id,resolved:true});assert.equal((await store.read()).comments.filter(c=>c.resolved).length,1);
 }finally{await rm(dir,{recursive:true,force:true});}
});
test('view, material brief, references and generated version retain source and parent relationships',async()=>{
 const dir=await mkdtemp(path.join(tmpdir(),'spatial-project-'));try{
 const store=new ProjectStore(dir),base=await store.asset({name:'뷰.png',dataURL:png}),ref=await store.asset({name:'참조.png',dataURL:png});
 const view=await store.action({type:'view.add',regionId:'living',name:'라운지',assetId:base.id,camera:{position:[1,1.6,2],target:[3,1.6,2],fov:65}});
 await store.action({type:'brief.add',viewId:view.id,baseAssetId:base.id,referenceIds:[ref.id],annotations:[{type:'rect',x:.2,y:.3,w:.2,h:.1,text:'오크 마감'}],comment:'배치 유지'});
 const output=await store.asset({name:'v1.png',dataURL:png});await store.action({type:'version.add',viewId:view.id,assetId:output.id,parentAssetId:base.id});const state=await store.read();
 assert.equal(state.briefs[0].referenceIds[0],ref.id);assert.equal(state.briefs[0].annotations[0].text,'오크 마감');assert.equal(state.versions[0].parentAssetId,base.id);assert.equal(state.versions[0].modelUsed,'미확인');assert.equal(state.views[0].assetId,base.id);assert.ok((await readFile(path.join(dir,'assets',output.id+'.png'))).length>50);
 await assert.rejects(store.asset({name:'fake.png',dataURL:'data:image/png;base64,aGVsbG8='}));
 await assert.rejects(store.action({type:'brief.add',viewId:view.id,baseAssetId:'missing'}));
 }finally{await rm(dir,{recursive:true,force:true});}
});
test('invalid camera and journey data do not mutate project',()=>{const state=emptyProject();assert.throws(()=>applyAction(state,{type:'journey.add',journey:{name:'bad',points:[[0,0,0],[Infinity,0,0]],speed:1}}));assert.equal(state.revision,0);});
