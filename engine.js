export const SYMBOLS=['SPY','QQQ','IWM','DIA'];
export const SETTINGS={capitalAUD:1000,maxPosition:0.25,maxInvested:0.8,riskPerTrade:0.01,dailyLossLimit:0.02,maxDrawdown:0.10,feeUSD:0.10,slippage:0.0005};
const avg=a=>a.reduce((x,y)=>x+y,0)/a.length;
export function signal(closes){
 if(closes.length<65)return {score:0,action:'WAIT',reason:'至少需要65根日K线'};
 const p=closes.at(-1),ma20=avg(closes.slice(-20)),ma60=avg(closes.slice(-60)),mom=p/closes.at(-21)-1;
 const rets=closes.slice(-21).map((x,i,a)=>i?Math.log(x/a[i-1]):0).slice(1);
 const mu=avg(rets),vol=Math.sqrt(avg(rets.map(x=>(x-mu)**2)))*Math.sqrt(252);
 const score=(p>ma20?1:-1)+(ma20>ma60?1:-1)+(mom>0?1:-1)+(vol<0.35?1:-1);
 return {score,action:score>=3?'BUY':score<=0?'EXIT':'HOLD',ma20,ma60,momentum:mom,volatility:vol};
}
export function backtest(rows,config={}){
 const cfg={...SETTINGS,...config}, fx=cfg.usdPerAud;
 if(!(fx>0))throw Error('缺少有效 AUD/USD 汇率');
 if(!Array.isArray(rows)||rows.length<100)throw Error('历史数据不足100个交易日');
 let cash=cfg.capitalAUD*fx, shares=0,peak=cash,paused=false,orders=[],curve=[],lastDay=null,dayStart=cash;
 for(let i=65;i<rows.length;i++){
  const today=rows[i],prev=rows[i-1],prices=rows.slice(0,i).map(r=>r.close),s=signal(prices);
  if(today.date!==lastDay){lastDay=today.date;dayStart=cash+shares*prev.close;}
  const open=today.open;
  if(!(open>0))continue;
  let equity=cash+shares*open;peak=Math.max(peak,equity);
  if(equity<peak*(1-cfg.maxDrawdown)||equity<dayStart*(1-cfg.dailyLossLimit))paused=true;
  if((paused||s.action==='EXIT')&&shares>0){const price=open*(1-cfg.slippage);cash+=shares*price-cfg.feeUSD;orders.push({date:today.date,side:'SELL',shares,price});shares=0;}
  if(!paused&&s.action==='BUY'&&shares===0){
   const stopDistance=Math.max(open*0.02,open*(s.volatility||0.2)/Math.sqrt(252)*2);
   const riskShares=Math.floor(equity*cfg.riskPerTrade/stopDistance);
   const capShares=Math.floor(Math.min(equity*cfg.maxPosition,equity*cfg.maxInvested,cash-cfg.feeUSD)/(open*(1+cfg.slippage)));
   const qty=Math.max(0,Math.min(riskShares,capShares));
   if(qty>0){const price=open*(1+cfg.slippage);cash-=qty*price+cfg.feeUSD;shares=qty;orders.push({date:today.date,side:'BUY',shares:qty,price});}
  }
  equity=cash+shares*today.close;peak=Math.max(peak,equity);curve.push({date:today.date,equityUSD:+equity.toFixed(2),equityAUD:+(equity/fx).toFixed(2)});
 }
 const end=curve.at(-1)?.equityUSD??cash, initial=cfg.capitalAUD*fx;
 let high=initial,maxDD=0;for(const p of curve){high=Math.max(high,p.equityUSD);maxDD=Math.max(maxDD,(high-p.equityUSD)/high);}
 return {initialAUD:cfg.capitalAUD,finalAUD:+(end/fx).toFixed(2),returnPct:+((end/initial-1)*100).toFixed(2),maxDrawdownPct:+(maxDD*100).toFixed(2),orders,curve,paused,fxUsed:fx,remainingShares:shares};
}
