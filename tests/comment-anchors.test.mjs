import test from 'node:test';
import assert from 'node:assert/strict';
import {emptyProject,applyAction} from '../project-store.mjs';
const camera={kind:'overview',position:[12,30,20],target:[2,0,3],up:[0,1,0],height:25,zoom:2};
test('coordinate comment retains hit location, object anchor and authored camera',()=>{
 const state=emptyProject();applyAction(state,{type:'comment.add',regionId:'living',objectId:'seat-1',objectName:'좌석',point:[2,0.5,3],camera,text:'마감 검토'});
 assert.deepEqual(state.comments[0].point,[2,.5,3]);assert.deepEqual(state.comments[0].camera,camera);
 applyAction(state,{type:'comment.resolve',id:state.comments[0].id,resolved:true});assert.deepEqual(state.comments[0].camera,camera);
});
test('old room comments remain unanchored and invalid coordinate/view data is rejected',()=>{
 const state=emptyProject();applyAction(state,{type:'comment.add',regionId:'living',text:'공간 의견'});assert.equal(state.comments[0].point,null);assert.equal(state.comments[0].camera,null);
 for(const bad of [{point:[NaN,0,1]},{point:[1,2]},{point:[0,0,0],camera:{...camera,zoom:0}},{point:[0,0,0],camera:{...camera,position:[null,0,0]}}])assert.throws(()=>applyAction(state,{type:'comment.add',regionId:'living',text:'bad',...bad}));assert.equal(state.comments.length,1);
});
