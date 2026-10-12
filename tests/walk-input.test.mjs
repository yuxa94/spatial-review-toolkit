import test from 'node:test';
import assert from 'node:assert/strict';
import {updateWalkKeys} from '../walk-input.js';
test('physical WASD works with Korean composition, English and Shift',()=>{
 for(const [code,key,expected] of [['KeyW','ㅈ','w'],['KeyA','ㅁ','a'],['KeyS','Process','s'],['KeyD','ㅇ','d'],['KeyW','W','w'],['KeyD','d','d'],['ArrowLeft','ArrowLeft','ArrowLeft']]){
  const keys=new Set();assert.ok(updateWalkKeys(keys,{code,key,isComposing:true,shiftKey:true},true));assert.deepEqual([...keys],[expected]);
 }
});
test('releasing a physical key after an input-language change clears movement',()=>{
 const keys=new Set();updateWalkKeys(keys,{code:'KeyW',key:'w'},true);
 updateWalkKeys(keys,{code:'KeyW',key:'ㅈ'},false);assert.equal(keys.size,0);
});
test('browser shortcuts are not swallowed and modifier changes cannot stick a key',()=>{
 const keys=new Set();assert.equal(updateWalkKeys(keys,{code:'KeyW',key:'w',metaKey:true},true),false);
 assert.equal(keys.size,0);updateWalkKeys(keys,{code:'KeyW',key:'w'},true);
 updateWalkKeys(keys,{code:'KeyW',key:'w',metaKey:true},false);assert.equal(keys.size,0);
 assert.equal(updateWalkKeys(keys,{code:'KeyQ',key:'q'},true),false);
});
