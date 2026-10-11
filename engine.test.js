import test from 'node:test';import assert from 'node:assert/strict';import {signal,backtest} from './engine.js';
test('insufficient signal history',()=>assert.equal(signal([1,2]).action,'WAIT'));
test('backtest validates FX',()=>assert.throws(()=>backtest([],{}),/汇率/));
test('backtest never trades more than 25% at purchase',()=>{let rows=Array.from({length:150},(_,i)=>({date:new Date(Date.UTC(2025,0,1+i)).toISOString().slice(0,10),open:100+i*.15,close:100+i*.15}));let r=backtest(rows,{usdPerAud:0.7});assert.ok(r.curve.length>0);assert.ok(r.orders.filter(x=>x.side==='BUY').every(x=>x.shares*x.price<=175.01));});
