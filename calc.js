// Rules from swkapp/public/calc.js + SWKOS README (LTV, 50/50 split). Indicative only.
const r2=n=>Math.round(n*100)/100;
const closing=(p,{mortgage=false,loan=0}={})=>{const dld=p*.04,admin=580,ag=p*.02,vat=ag*.05,mr=mortgage?loan*.0025+290:0,t=dld+admin+ag+vat+mr;return{dld:r2(dld),admin,agency:r2(ag),vat:r2(vat),mReg:r2(mr),total:r2(t),cash:r2(p+t)}};
const pmt=(L,rate,y)=>{const n=y*12,i=rate/1200;return n<=0?0:r2(i?L*i/(1-Math.pow(1+i,-n)):L/n)};
const split=(gross,a2a)=>{const pool=Math.max(0,gross-a2a);return{pool:r2(pool),swk:r2(pool/2),agent:r2(pool/2),vat:r2(gross*.05)}};
const rera=(rent,idx)=>{const b=idx>0?(idx-rent)/idx*100:0,p=b<=10?0:b<=20?5:b<=30?10:b<=40?15:20;return{below:r2(Math.max(0,b)),pct:p,max:r2(rent*(1+p/100))}};
if(typeof module!=='undefined')module.exports={closing,pmt,split,rera};
