import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {backtest, signal} from './strategy.js';
const root=path.dirname(fileURLToPath(import.meta.url));
const allowed=new Set(['SPY','QQQ','IWM','DIA']);
const cache=new Map();
async function history(symbol){
 if(!allowed.has(symbol))throw Error('Unsupported symbol');
 const old=cache.get(symbol);if(old&&Date.now()-old.at<3600000)return old.rows;
 const end=Math.floor(Date.now()/1000),start=end-86400*365*6;
 const url=`https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?period1=${start}&period2=${end}&interval=1d&events=div%2Csplits`;
 const resp=await fetch(url,{headers:{'User-Agent':'Mozilla/5.0 QuantV2 educational app','Accept':'application/json'},signal:AbortSignal.timeout(12000)});
 if(!resp.ok)throw Error(`Market data provider HTTP ${resp.status}`);
 const payload=await resp.json(),result=payload.chart?.result?.[0];
 if(!result)throw Error('No market data');
 const q=result.indicators?.quote?.[0],adj=result.indicators?.adjclose?.[0]?.adjclose;
 const rows=(result.timestamp||[]).map((t,i)=>({date:new Date(t*1000).toISOString().slice(0,10),open:q.open?.[i],high:q.high?.[i],low:q.low?.[i],close:q.close?.[i],adjusted:adj?.[i],volume:q.volume?.[i]})).filter(x=>[x.open,x.close,x.adjusted].every(v=>Number.isFinite(v)&&v>0));
 if(rows.length<220)throw Error('Insufficient historical observations');
 cache.set(symbol,{at:Date.now(),rows});return rows;
}
const respond=(res,status,obj)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(obj));};
http.createServer(async(req,res)=>{try{
 const u=new URL(req.url,'http://localhost');
 if(u.pathname==='/api/backtest'){
  const symbol=u.searchParams.get('symbol')||'SPY';const rows=await history(symbol);
  return respond(res,200,{symbol,source:'Yahoo Finance chart API (unofficial; availability not guaranteed)',currency:'USD',adjustment:'split/dividend adjusted closes for signals and valuation; execution approximated from adjusted close',latest:rows.at(-1).date,signal:signal(rows),...backtest(rows)});
 }
 if(u.pathname==='/api/health')return respond(res,200,{ok:true});
 if(u.pathname!=='/')return respond(res,404,{error:'Not found'});
 const html=await readFile(path.join(root,'index.html'));res.writeHead(200,{'Content-Type':'text/html; charset=utf-8'});res.end(html);
 }catch(e){respond(res,400,{error:e.message});}}).listen(process.env.PORT||3000,'0.0.0.0',()=>console.log('Quant V2 listening'));
