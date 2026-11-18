const $=s=>document.querySelector(s),f=n=>Math.round(n).toLocaleString('en-US'),A=n=>'AED '+f(n);
const M=n=>n>=1e6?(n/1e6).toFixed(n>=1e7?1:2).replace(/\.?0+$/,'')+'M':f(n);
const S={tab:'home',sub:{pipe:'deals',more:'team',tool:'mort'},dept:'ALL',tasks:D.tasks.map((t,i)=>({t,d:i<2}))};
const TABS=[['home','⌂','Home'],['pipe','◧','Pipeline'],['mkt','▲','Market'],['tool','▦','Tools'],['more','☰','More']];
const chips=(k,o)=>`<div class="chips">${o.map(([v,l])=>`<button class="${S.sub[k]===v?'on':''}" data-sub="${k}:${v}">${l}</button>`).join('')}</div>`;
const dn=k=>D.depts.find(d=>d.k===k);
const stageName=(d,i)=>dn(d).steps[Math.min(i,7)];
const pill=(t,c='')=>`<span class="pill ${c}">${t}</span>`;

const V={
home(){const k=D.kpi,done=S.tasks.filter(t=>t.d).length;return`
<h2>Good morning, ${D.user.name.split(' ')[0]}</h2>
<div class="grid">
<div class="k"><b>${A(k.pipeline)}</b><span>Open pipeline</span></div>
<div class="k"><b>${A(k.gci)}</b><span>GCI this month</span></div>
<div class="k"><b>${k.leads}</b><span>Active leads</span></div>
<div class="k"><b>${k.viewings}</b><span>Viewings this week</span></div>
<div class="k"><b>${A(k.toRecv)}</b><span>Receivables</span></div>
<div class="k"><b>${k.approvals}</b><span>Pending approvals</span></div></div>
<h3>Today · ${done}/${S.tasks.length} done</h3>
<div class="card">${S.tasks.map((t,i)=>`<label class="ck"><input type="checkbox" data-task="${i}" ${t.d?'checked':''}><span style="${t.d?'text-decoration:line-through;color:var(--mut)':''}">${t.t}</span></label>`).join('')}</div>
<h3>Attendance roll call</h3>
<div class="card">${['in','late','absent'].map(s=>`<div class="row"><span>${{in:'On time',late:'Late',absent:'Absent'}[s]}</span>${pill(D.team.filter(x=>x.s===s).length,s==='late'?'warn':s==='absent'?'bad':'')}</div>`).join('')}</div>`},

pipe(){const s=S.sub.pipe;let h='<h2>Pipeline</h2>'+chips('pipe',[['deals','Deals'],['leads','Leads'],['flow','Workflow']]);
 if(s!=='leads')h+=`<div class="chips">${[['ALL','All'],...D.depts.map(d=>[d.k,d.n])].map(([v,l])=>`<button class="${S.dept===v?'on':''}" data-dept="${v}">${l}</button>`).join('')}</div>`;
 if(s==='deals')h+=D.deals.filter(d=>S.dept==='ALL'||d.d===S.dept).map(d=>`<div class="card"><div class="row"><b>${d.t}</b>${pill(d.id)}</div><div class="m">${dn(d.d).n} · ${d.cl} · ${d.ag}</div><div class="row"><span class="big">${d.d==='LEASING'?A(d.v)+'/yr':A(d.v)}</span><span class="m">Comm. ${A(d.cm)}</span></div><div class="bar"><i style="width:${(d.st+1)/8*100}%;background:${dn(d.d).c}"></i></div><div class="m">Stage ${d.st+1}/8 · ${stageName(d.d,d.st)}</div></div>`).join('');
 if(s==='leads')h+=D.leads.map(l=>`<div class="card"><div class="row"><b>${l.n}</b>${pill(l.st,l.st==='Hot'?'bad':l.st==='Warm'?'warn':'')}</div><div class="m">${l.i} · ${l.src}</div><div class="row"><span class="m">${dn(l.d).n}</span><span class="m">Score ${l.sc} · ${l.f}</span></div><div class="bar"><i style="width:${l.sc}%"></i></div></div>`).join('');
 if(s==='flow')h+=D.depts.filter(d=>S.dept==='ALL'||d.k===S.dept).map(d=>`<div class="card"><b style="color:${d.c}">${d.n}</b><ol class="steps">${d.steps.map((x,i)=>`<li><i>${i+1}</i>${x}</li>`).join('')}</ol></div>`).join('');
 return h},

mkt(){const q=S.q||'';const L=D.mkt.filter(m=>m.n.toLowerCase().includes(q.toLowerCase())).sort((a,b)=>b.psf-a.psf);return`
<h2>Market Pulse</h2><div class="m">DLD registered sales, 2025 median vs 2024 · swkpropertiesuae/data</div>
<input id="q" placeholder="Search community" value="${q}" aria-label="Search community">
${L.map(m=>`<div class="card"><div class="row"><b>${m.n}</b>${pill((m.g>=0?'▲ ':'▼ ')+Math.abs(m.g)+'%',m.g<0?'bad':'')}</div><div class="row"><span class="big">AED ${f(m.psf)}<small class="m">/sqft</small></span><span class="m">Median ${M(m.px)}</span></div><div class="m">Yield ${m.y??'–'}% · ${f(m.tx)} sales in 2025</div></div>`).join('')||'<div class="m">No match</div>'}`},

tool(){const t=S.sub.tool;return'<h2>UAE Toolkit</h2>'+chips('tool',[['mort','Mortgage'],['cost','Cost to close'],['yield','Yield'],['comm','Commission'],['rera','RERA rent']])+`<div class="card" id="tc">${T[t]()}</div><div class="m">Indicative figures only — verify with RERA/DLD.</div>`},

more(){const s=S.sub.more;let h='<h2>More</h2>'+chips('more',[['team','Team'],['comp','Compliance'],['mod','Modules'],['info','Company']]);
 if(s==='team')h+=D.team.map(x=>`<div class="card"><div class="row"><b>${x.n}</b>${pill({in:'On time '+x.t,late:'Late '+x.t,absent:'Absent'}[x.s],x.s==='late'?'warn':x.s==='absent'?'bad':'')}</div><div class="m">${x.r}</div><div class="m">${x.a}</div></div>`).join('');
 if(s==='comp')h+=`<div class="card">${D.compliance.map(c=>`<div class="row"><span>${c.n}<br><span class="m">${c.v}</span></span>${pill(c.ok?'OK':'Action',c.ok?'':'bad')}</div>`).join('<hr style="border:0;border-top:1px solid var(--line);width:100%">')}</div>`;
 if(s==='mod')h+=D.modules.map(m=>`<div class="card"><div class="row"><b>${m[1]}</b>${pill(m[0])}</div><div class="m">${m[2]}</div></div>`).join('');
 if(s==='info')h+=`<div class="card"><b>${D.company.name}</b><div class="m" dir="rtl">${D.company.ar}</div><div class="m">RERA ORN ${D.company.orn} · ${D.company.site}</div></div><h3>Working hours (UAE)</h3><div class="card">${D.hours.map(([a,b])=>`<div class="row"><span>${a}</span><b>${b}</b></div>`).join('')}</div><h3>Legal payment channels</h3><div class="card m">SWK company bank account · Developer DLD escrow · Manager's cheque / PDC · Licensed exchange house · VARA-licensed crypto gateway. Never a personal account.</div>`;
 return h}};

const inp=(id,l,v,st='')=>`<label>${l}<input id="${id}" type="number" inputmode="decimal" value="${v}" ${st}></label>`;
const out=(a)=>a.map(([k,v,b])=>`<div class="row"><span class="${b?'':'m'}">${k}</span>${b?`<span class="big">${v}</span>`:`<b>${v}</b>`}</div>`).join('');
const T={
mort(){return`<label>Buyer<select id="ty"><option value="80">Expat (80% LTV)</option><option value="85">UAE National (85% LTV)</option><option value="50">Off-plan (50% LTV)</option></select></label>${inp('p','Price (AED)',2000000)}${inp('r','Rate % (e.g. FAB '+D.banks[0][1]+')',D.banks[0][1],'step=".05"')}${inp('y','Years',25)}<div id="o"></div><div class="m">${D.banks.map(b=>b.join(' ')+'%').join(' · ')}</div>`},
cost(){return`${inp('p','Price (AED)',2000000)}<label class="ck"><input id="mg" type="checkbox">Mortgage (adds registration)</label>${inp('l','Loan (AED)',1600000)}<div id="o"></div>`},
yield(){return`${inp('p','Price (AED)',1500000)}${inp('a','Annual rent (AED)',95000)}<div id="o"></div>`},
comm(){return`${inp('p','Sale price (AED)',2000000)}${inp('c','Commission %',2)}${inp('a','3rd-party A2A share (AED)',0)}<div id="o"></div>`},
rera(){return`${inp('rt','Current annual rent (AED)',80000)}${inp('ix','RERA index average (AED)',100000)}<div id="o"></div>`}};
const v=id=>+($('#'+id)?.value)||0;
const C={
mort(){const p=v('p'),loan=p*v('ty')/100,m=pmt(loan,v('r'),v('y')),dp=p-loan;$('#o').innerHTML=out([['Down payment',A(dp)],['Loan',A(loan)],['Monthly payment',A(m),1],['Total interest',A(m*v('y')*12-loan)]])},
cost(){const c=closing(v('p'),{mortgage:$('#mg').checked,loan:v('l')});$('#o').innerHTML=out([['DLD 4%',A(c.dld)],['Admin',A(c.admin)],['Agency 2%',A(c.agency)],['VAT 5% on agency',A(c.vat)],['Mortgage reg.',A(c.mReg)],['Total fees',A(c.total),1],['Cash needed',A(c.cash)]])},
yield(){const y=v('p')>0?v('a')/v('p')*100:0;$('#o').innerHTML=out([['Gross yield',y.toFixed(2)+'%',1]])},
comm(){const g=v('p')*v('c')/100,s=split(g,v('a'));$('#o').innerHTML=out([['Gross commission',A(g)],['VAT 5%',A(s.vat)],['Company net pool',A(s.pool)],['SWK share 50%',A(s.swk),1],['Advisor share 50%',A(s.agent),1]])},
rera(){const r=rera(v('rt'),v('ix'));$('#o').innerHTML=out([['Below index',r.below+'%'],['Max increase',r.pct+'%',1],['Max new rent',A(r.max)]])}};

function render(){
 $('#sub').textContent=S.tab==='home'?D.company.name:TABS.find(t=>t[0]===S.tab)[2];
 $('#v').innerHTML=V[S.tab]();$('#nav').innerHTML=TABS.map(([k,i,l])=>`<button class="${S.tab===k?'on':''}" data-tab="${k}"><span>${i}</span>${l}</button>`).join('');
 if(S.tab==='tool')C[S.sub.tool]();
}
document.addEventListener('click',e=>{const b=e.target.closest('[data-tab],[data-sub],[data-dept]');if(!b)return;
 if(b.dataset.tab){S.tab=b.dataset.tab;scrollTo(0,0)}
 if(b.dataset.sub){const[k,x]=b.dataset.sub.split(':');S.sub[k]=x}
 if(b.dataset.dept)S.dept=b.dataset.dept;render()});
document.addEventListener('change',e=>{if(e.target.dataset.task!=null){S.tasks[e.target.dataset.task].d=e.target.checked;render()}});
document.addEventListener('input',e=>{
 if(e.target.id==='q'){S.q=e.target.value;const p=e.target.selectionStart;render();const q=$('#q');q.focus();q.setSelectionRange(p,p)}
 else if(S.tab==='tool')C[S.sub.tool]()});
$('#ar').onclick=()=>{document.documentElement.dir=document.documentElement.dir==='rtl'?'ltr':'rtl'};
if('serviceWorker' in navigator)navigator.serviceWorker.register('sw.js').catch(()=>{});
render();
