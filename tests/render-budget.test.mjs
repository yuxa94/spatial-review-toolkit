import test from 'node:test';
import assert from 'node:assert/strict';
import {createRenderBudget} from '../render-budget.js';
test('a stationary studio draws once rather than on every animation callback',()=>{
 const budget=createRenderBudget();let frames=0;
 for(let t=0;t<1000;t+=10)if(budget.consume(t))frames++;
 assert.equal(frames,1);budget.invalidate();assert.equal(budget.consume(1000),true);
});
test('continuous walking is rate limited and hidden or lost contexts never render',()=>{
 const budget=createRenderBudget();let frames=0;
 for(let t=0;t<1000;t+=10)if(budget.consume(t,{continuous:true}))frames++;
 assert.ok(frames>=20&&frames<=30);
 budget.invalidate();assert.equal(budget.consume(1100,{visible:false}),false);
 assert.equal(budget.consume(1200,{contextLost:true}),false);
 assert.equal(budget.consume(1300),true,'pending change survives suspension');
});
