const mean=a=>a.reduce((s,v)=>s+v,0)/a.length;
const stdev=a=>Math.sqrt(mean(a.map(x=>(x-mean(a))**2)));
export function signal(rows,i=rows.length-1){
 if(i<200)return {score:0,action:'WAIT',reason:'Warmup'};
 const p=rows.map(x=>x.adjusted??x.close),slice=(n)=>p.slice(i-n+1,i+1);
 const ma20=mean(slice(20)),ma50=mean(slice(50)),ma200=mean(slice(200));
 const mom20=p[i]/p[i-20]-1,mom60=p[i]/p[i-60]-1;
 const returns=slice(21).slice(1).map((v,j)=>Math.log(v/slice(21)[j]));
 const vol=stdev(returns)*Math.sqrt(252);
 const score=(p[i]>ma200?1:-1)*0.3+(ma20>ma50?1:-1)*0.2+(mom20>0?1:-1)*0.2+(mom60>0?1:-1)*0.2+(vol<0.35?1:-1)*0.1;
 return {score:+score.toFixed(3),action:score>=0.4?'BUY':score<=-0.4?'SELL':'HOLD',volatility:+vol.toFixed(3),ma20:+ma20.toFixed(2),ma200:+ma200.toFixed(2)};
}
export function backtest(rows,{initialUSD=650,feeBps=5,slippageBps=5,maxPosition=0.25,stopDrawdown=0.10}={}){
 let cash=initialUSD,shares=0,peak=initialUSD,maxDD=0,trades=[],curve=[],halted=false;
 const cost=(feeBps+slippageBps)/10000;
 // Signal from day i-1; execute at day i adjusted-close proxy. No lookahead in signal.
 for(let i=200;i<rows.length;i++){
  const price=rows[i].adjusted??rows[i].close;
  const equity=cash+shares*price;peak=Math.max(peak,equity);
  const dd=1-equity/peak;maxDD=Math.max(maxDD,dd);
  if(dd>=stopDrawdown)halted=true;
  const sig=signal(rows,i-1);
  if((halted||sig.action==='SELL')&&shares>0){cash+=shares*price*(1-cost);trades.push({date:rows[i].date,side:'SELL',shares:+shares.toFixed(5),price:+price.toFixed(2)});shares=0;}
  else if(!halted&&sig.action==='BUY'&&shares===0){
   const budget=Math.min(cash,maxPosition*equity);const qty=budget/(price*(1+cost));
   if(qty>0){cash-=qty*price*(1+cost);shares=qty;trades.push({date:rows[i].date,side:'BUY',shares:+qty.toFixed(5),price:+price.toFixed(2)});}
  }
  curve.push({date:rows[i].date,equity:+(cash+shares*price).toFixed(2)});
 }
 const final=curve.at(-1)?.equity??initialUSD;
 return {initialUSD,finalUSD:final,returnPct:+((final/initialUSD-1)*100).toFixed(2),maxDrawdownPct:+(maxDD*100).toFixed(2),halted,trades:trades.slice(-60),tradeCount:trades.length,curve,assumptions:{feeBps,slippageBps,maxPosition,stopDrawdown,execution:'next-day adjusted-close proxy; not an executable price',fx:'AUD/USD not modeled; USD initial amount is illustrative'}};
}
