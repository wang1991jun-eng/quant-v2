import test from 'node:test';import assert from 'node:assert/strict';import {backtest,signal} from './strategy.js';
const rows=Array.from({length:260},(_,i)=>({date:new Date(Date.UTC(2024,0,1+i)).toISOString().slice(0,10),adjusted:100+i*.2,close:100+i*.2}));
test('signal produces finite score',()=>assert.ok(Number.isFinite(signal(rows).score)));
test('backtest respects position and returns finite equity',()=>{const r=backtest(rows);assert.ok(Number.isFinite(r.finalUSD));assert.ok(r.trades.length>0);assert.ok(r.maxDrawdownPct>=0)});
