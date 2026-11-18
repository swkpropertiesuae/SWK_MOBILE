const $=s=>document.querySelector(s),f=n=>Math.round(n).toLocaleString('en-US'),A=n=>'AED '+f(n);
const Mn=n=>n>=1e6?(n/1e6).toFixed(2).replace(/\.?0+$/,'')+'M':f(n);
const ICO={
command:'<rect x="3" y="3" width="7" height="9"/><rect x="14" y="3" width="7" height="5"/><rect x="14" y="12" width="7" height="9"/><rect x="3" y="16" width="7" height="5"/>',
inventory:'<path d="M4 21V5l8-3v19M12 21h8V9l-8-3M8 8h1M8 12h1M8 16h1M16 12h1M16 16h1"/>',
clients:'<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c0-3.5 3-6 6.5-6s6.5 2.5 6.5 6M16 4.5a3.5 3.5 0 010 7M18 14c2.5.6 3.5 2.6 3.5 6"/>',
sales:'<path d="M14 3H6a1 1 0 00-1 1v16a1 1 0 001 1h12a1 1 0 001-1V8zM14 3v5h5M8 14h8M8 17h5"/>',
leasing:'<circle cx="8" cy="15" r="4"/><path d="M11 12l9-9M16 7l3 3M14 9l2 2"/>',
owners:'<circle cx="10" cy="8" r="3.5"/><path d="M3 20c0-3.5 3-6 7-6M16 15h5M16 18h5M16 21h3"/>',
finance:'<path d="M19 5L5 19"/><circle cx="7" cy="7" r="2.5"/><circle cx="17" cy="17" r="2.5"/>',
compliance:'<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/><path d="M8.5 12l2.5 2.5 4.5-5"/>',
team:'<rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="9" cy="11" r="2"/><path d="M6 16c.5-1.5 1.7-2 3-2s2.5.5 3 2M14 10h4M14 13h3"/>',
field:'<path d="M12 21s7-6.2 7-11.5A7 7 0 005 9.5C5 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/>',
tools:'<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M8 7h8M8 12h1M12 12h1M16 12h0M8 16h1M12 16h1M16 16h0"/>',
admin:'<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1L7 17M17 7l2.1-2.1"/>',
apps:'<rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="7" rx="2"/><rect x="3" y="14" width="7" height="7" rx="2"/><rect x="14" y="14" width="7" height="7" rx="2"/>',
mkt:'<path d="M3 17l6-6 4 4 8-8M15 7h6v6"/>',cal:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',qr:'<rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><path d="M14 14h3v3h-3zM20 14v0M17 20h4"/>',calc:'<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M8 7h8M8 12h1M12 12h1M8 16h1M12 16h1"/>',
home:'<path d="M3 11l9-8 9 8v9a1 1 0 01-1 1h-5v-6H9v6H4a1 1 0 01-1-1z"/>'};
const svg=k=>`<svg viewBox="0 0 24 24" aria-hidden="true">${ICO[k]||ICO.command}</svg>`;
const slug=to=>to.replace(/^\//,'').replace(/[\/?=&]/g,'_');
const find=sl=>{for(const s of D.nav)for(const i of s.items)if(slug(i[1])===sl)return{s,i}};
const dn=k=>D.depts.find(d=>d.k===k);
const chipc=s=>/hot|overdue|absent|late|cold|reject/i.test(s)?(/cold/i.test(s)?'info':/late/i.test(s)?'warn':'bad'):/pending|warm|due|review/i.test(s)?'warn':'';
const st=s=>`<span class="st ${chipc(s)}">${s}</span>`;
const dubai=()=>{const p=Object.fromEntries(new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Dubai',weekday:'long',hour:'2-digit',minute:'2-digit',day:'numeric',month:'long',hour12:false}).formatToParts(new Date()).map(x=>[x.type,x.value]));return p};
const greet=()=>{const h=+dubai().hour;return h<12?'Good morning':h<17?'Good afternoon':'Good evening'};
const toast=m=>{const t=document.createElement('div');t.className='toast';t.textContent=m;document.body.append(t);setTimeout(()=>t.remove(),2200)};
const bar=(t,back=true)=>`<div class="bar">${back?`<button class="circ back" onclick="history.back()" aria-label="Back">←</button>`:''}<h2>${t}</h2><button class="circ" onclick="rtl()" aria-label="Toggle Arabic layout">ع</button></div>`;
const li=(ic,tone,t,sub,r,href)=>`<a class="li" ${href?`href="${href}"`:''}><span class="ic t-${tone}">${ic}</span><span class="tx"><b>${t}</b><small>${sub||''}</small></span>${r||''}${href?'<span class="arr">›</span>':''}</a>`;
const rtl=()=>{document.documentElement.dir=document.documentElement.dir==='rtl'?'ltr':'rtl'};
window.rtl=rtl;
const recents=()=>{try{return JSON.parse(localStorage.getItem('swk.recent')||'[]')}catch{return[]}};
const remember=sl=>{try{localStorage.setItem('swk.recent',JSON.stringify([sl,...recents().filter(x=>x!==sl)].slice(0,6)))}catch{}};

const R={
launcher(q=''){const n=q.trim().toLowerCase();
 const apps=D.nav.filter(s=>!n||s.label.toLowerCase().includes(n)||s.b.toLowerCase().includes(n));
 const feats=n?D.nav.flatMap(s=>s.items.map(i=>({s,i}))).filter(x=>x.i[0].toLowerCase().includes(n)||x.i[2].toLowerCase().includes(n)).slice(0,12):[];
 const rc=!n?recents().map(find).filter(Boolean).slice(0,4):[];
 return`<header class="hero"><div class="top"><img class="logo" src="assets/brand/logo-horizontal.png" alt="SWK Properties OS"><button class="circ" onclick="rtl()" aria-label="Toggle Arabic layout">ع</button></div>
 <div class="eyebrow">${D.company.name} · ${dubai().weekday}, ${dubai().day} ${dubai().month}</div>
 <h1>${greet()}, ${D.me.name.split(' ')[0]}.</h1>
 <form class="search" onsubmit="return false" role="search"><span>⌕</span><input id="q" type="search" placeholder="Search apps or pages…" aria-label="Search apps and pages" value="${q}" autocomplete="off"></form></header>
 <div class="wrap">
 ${rc.length?`<div><div class="lbl" style="margin-bottom:8px">Recent</div><div class="chips">${rc.map(x=>`<a class="chip" href="#/f/${slug(x.i[1])}">${x.i[0]}</a>`).join('')}</div></div>`:''}
 ${!n?`<div><div class="lbl" style="margin-bottom:8px">Quick create</div><div class="chips">${D.quick.map(([l,t])=>`<a class="chip on" href="#/f/${slug(t)}">+ ${l}</a>`).join('')}</div></div>`:''}
 ${feats.length?`<div class="list">${feats.map(x=>li(svg(x.s.key),x.s.tone,x.i[0],x.i[2]||x.s.label,'',`#/f/${slug(x.i[1])}`)).join('')}</div>`:''}
 ${apps.length?`<div class="tiles">${apps.map(s=>`<a class="tile" href="#/app/${s.key}"><span class="ic t-${s.tone}">${svg(s.key)}</span><b>${s.label}</b><small>${s.items.length} apps</small></a>`).join('')}</div>`:(!feats.length?`<div class="card"><b>No app or page matches “${q}”</b><span class="m">Try a simpler word.</span></div>`:'')}
 <div class="note">${D.company.ar} · RERA ORN ${D.company.orn}</div></div>`},

app(key){const s=D.nav.find(x=>x.key===key);if(!s)return R.launcher();
 return bar(s.label)+`<div class="wrap"><div class="card" style="background:var(--champ)"><span class="m">${s.b}</span></div><div class="list">${s.items.map((i,n)=>li(`<span>${n+1}</span>`,s.tone,i[0],i[2].replace(/^Step \d+ · /,''),'',`#/f/${slug(i[1])}`)).join('')}</div></div>`},

f(sl){const x=find(sl);if(!x)return R.launcher();remember(sl);const [t,to,desc]=x.i;
 const body=(V[to]||V[sl]||(D.rec[to]?()=>recList(to):generic))(x);
 return bar(t)+`<div class="wrap">${/^Step/.test(desc)||desc?`<div class="m">${x.s.label}${desc?' · '+desc:''}</div>`:''}${body}</div>`}};

const recList=to=>`<div class="list">${D.rec[to].map(r=>`<div class="li"><span class="tx"><b>${r[0]}</b><small>${r[1]}</small></span><span style="text-align:right;display:grid;gap:2px;justify-items:end">${st(r[2])}${r[3]?`<small class="m">${/^[\d,]+$/.test(r[3])?'AED '+r[3]:r[3]}</small>`:''}</span></div>`).join('')}</div><div class="note">Sample records</div>`;
const generic=x=>`<div class="card"><b class="hd">${x.i[0]}</b><span class="m">${x.i[2]||x.s.blurb}</span></div><div class="card"><div class="lbl">Where it sits in the workflow</div><ol class="steps">${x.s.items.map((i,n)=>`<li style="${i===x.i?'font-weight:700':'color:var(--mut)'}"><i>${n+1}</i>${i[0]}</li>`).join('')}</ol></div><div class="note">No sample records in this offline build.</div>`;

const propCards=filter=>`<div class="list">${D.props.filter(p=>!filter||filter(p)).map(p=>`<div class="pc"><div class="photo"><img loading="lazy" src="assets/properties/${p[0]}.webp" alt="${p[1]}"><div class="ov"><span><b>${p[1]}</b><small>${p[2]} · ${p[3]}</small></span>${st(p[4])}</div></div><div class="in"><span class="big">${A(p[5])}${/Rent/.test(p[4])?'<small class="m"> /yr</small>':''}</span></div></div>`).join('')}</div>`;

const V={
'/dashboard'(){const t=D.deals.reduce((a,d)=>a+d[4],0),gci=D.deals.reduce((a,d)=>a+d[5],0);return`
<div class="card cash"><small>Open pipeline value</small><span class="n">${A(t)}</span><small>${D.deals.length} live deals · 3 departments</small></div>
<div class="grid2"><div class="k"><b>${A(gci)}</b><span>Gross commission</span></div><div class="k"><b>AED 512,000</b><span>Receivables</span></div><div class="k"><b>6</b><span>Active leads</span></div><div class="k"><b>3</b><span>Pending approvals</span></div></div>
<div class="lbl">Needs attention</div><div class="list">
${li(svg('compliance'),'dune','Trakheesi permits','3 expire in 14 days','',`#/f/compliance`)}
${li(svg('finance'),'oasis','Overdue invoice INV-2227','AED 22,050 · D-1036','',`#/f/e_invoices`)}
${li(svg('sales'),'champ','Refund request awaiting Owner','AED 15,000 · D-1030','',`#/f/e_universal_approvals`)}</div>
<div class="lbl">Latest deals</div><div class="list">${D.deals.slice(0,4).map(d=>`<div class="li"><span class="tx"><b>${d[1]}</b><small>${d[0]} · ${dn(d[2]).n}</small></span><b class="hd">${Mn(d[4])}</b></div>`).join('')}</div>
<div class="lbl">Upcoming</div><div class="list">${D.cal.slice(0,3).map(c=>`<div class="li"><span class="tx"><b>${c[2]}</b><small>${c[0]} · ${c[1]}</small></span>${st(c[3])}</div>`).join('')}</div>
<div class="note">Sample figures</div>`},
'/pipeline'(){const d=S.dept||'ALL';return`<div class="chips">${[['ALL','All'],...D.depts.map(x=>[x.k,x.n])].map(([k,l])=>`<button class="chip ${d===k?'on':''}" data-dept="${k}">${l}</button>`).join('')}</div>
<div class="list">${D.deals.filter(x=>d==='ALL'||x[2]===d).map(x=>{const dp=dn(x[2]);return`<div class="card"><div class="row"><b class="hd">${x[1]}</b><span class="st">${x[0]}</span></div><span class="m">${dp.n} · ${x[6]}</span><div class="row"><span class="big">${A(x[4])}</span><span class="m">Comm. ${A(x[5])}</span></div><div class="progress"><i style="width:${(x[3]+1)/8*100}%;background:${dp.c}"></i></div><span class="m">Step ${x[3]+1}/8 · ${dp.steps[x[3]]}</span></div>`}).join('')}</div>
${d!=='ALL'?`<div class="card"><div class="lbl">${dn(d).n} workflow</div><ol class="steps">${dn(d).steps.map((s,i)=>`<li><i>${i+1}</i>${s}</li>`).join('')}</ol></div>`:''}`},
'/market'(){const q=(S.q||'').toLowerCase();const L=D.mkt.filter(m=>m.n.toLowerCase().includes(q)).sort((a,b)=>b.psf-a.psf);return`
<div class="m">DLD registered sales — 2025 median vs 2024.</div><div class="search" style="border:1px solid var(--line2)"><span>⌕</span><input id="mq" type="search" placeholder="Search community" value="${S.q||''}" aria-label="Search community"></div>
<div class="list">${L.map(m=>{const ph=D.comm[m.n];const inner=`<div class="row"><b class="hd">${m.n}</b><span class="st ${m.g<0?'bad':''}">${m.g<0?'▼':'▲'} ${Math.abs(m.g)}%</span></div><div class="row"><span class="big">AED ${f(m.psf)}<small class="m">/sqft</small></span><span class="m">Median ${Mn(m.px)}</span></div><span class="m">Yield ${m.y??'–'}% · ${f(m.tx)} sales (2025)</span>`;
 return ph?`<div class="pc"><div class="photo" style="aspect-ratio:16/7"><img loading="lazy" src="assets/communities/${ph}-640.webp" alt="${m.n}"></div><div class="in">${inner}</div></div>`:`<div class="card">${inner}</div>`}).join('')||'<div class="card">No match</div>'}</div>`},
'/calendar'(){const g={};D.cal.forEach(c=>(g[c[0]]??=[]).push(c));return Object.entries(g).map(([d,a])=>`<div class="lbl">${d}</div><div class="list">${a.map(c=>`<div class="li"><span class="tx"><b>${c[2]}</b><small>${c[1]}</small></span>${st(c[3])}</div>`).join('')}</div>`).join('')},
'/reception-qr'(){const p=dubai(),h=+p.hour,m=+p.minute,sun=p.weekday==='Sunday',late=h*60+m>10*60+5;const done=S.checked;return`
<div class="card" style="text-align:center"><span class="m">Permanent office reception QR · SWK-RECEPTION-STAND-DXB-1</span><div class="hd" style="font-size:34px;font-weight:700">${p.hour}:${p.minute}</div><span class="m">${p.weekday} · Dubai time</span>
${sun?'<b>Sunday — official holiday</b>':done?`<div>${st(done.late?'Late '+done.t:'On time '+done.t)}</div><b>Checked in</b>`:`<button class="big-btn" onclick="checkin()">Check in</button><span class="m">${late?'Past 10:05 — will be marked Late':'On time until 10:05'}</span>`}</div>
<div class="card"><div class="lbl">Working hours</div>${D.hours.map(([a,b])=>`<div class="row"><span>${a}</span><b>${b}</b></div>`).join('')}</div>
<div class="note">Demo: no GPS / Wi-Fi verification in this offline build.</div>`},
'/toolkit'(){const t=S.calc||'mort';return`<div class="chips">${[['mort','Mortgage'],['cost','Buyer cost'],['yield','Yield'],['comm','Commission'],['rera','RERA rent']].map(([k,l])=>`<button class="chip ${t===k?'on':''}" data-calc="${k}">${l}</button>`).join('')}</div><div class="card">${T[t]()}</div><div class="note">Indicative — verify with RERA / DLD.</div>`},
'/agents'(){return`<div class="list">${D.board.map((b,i)=>`<div class="li"><span class="ic t-champ hd">${i+1}</span><span class="tx"><b>${b[0]}</b><small>${b[1]} deals</small></span><b class="hd">${Mn(b[2])}</b></div>`).join('')}</div><div class="note">Sample leaderboard</div>`},
'/compliance'(){return`<div class="card">${D.rera.map(r=>`<div class="row"><span><b>${r[0]}</b><br><span class="m">${r[1]}</span></span>${st(r[2]?'OK':'Action')}</div>`).join('<hr style="border:0;border-top:1px solid var(--line);width:100%">')}</div>`},
'/handover'(){return`<div class="list">${D.docs.map(d=>li(svg('tools'),'plum',d,'PDF dossier · see SWKOS /handover')).join('')}</div>`},
'/e/properties':()=>propCards(),'/e/units':()=>propCards(p=>/Sale|Off/.test(p[4])),'/listings':()=>propCards(),'/offplan':()=>propCards(p=>p[4]==='Off-plan'),'/smart-search':()=>propCards(),
'/e/communities'(){return V['/market']()}};
V['/rera']=V['/compliance'];

const calcIn=(id,l,v,s='')=>`<label>${l}<input id="${id}" type="number" inputmode="decimal" value="${v}" ${s}></label>`;
const out=a=>`<div id="o" style="display:grid;gap:6px;margin-top:6px">${a.map(([k,v,b])=>`<div class="row"><span class="m">${k}</span>${b?`<span class="big">${v}</span>`:`<b>${v}</b>`}</div>`).join('')}</div>`;
const g=id=>+($('#'+id)?.value)||0;
const T={
mort(){const p=g('p')||2e6,l=p*(g('ty')||80)/100,m=pmt(l,g('r')||D.banks[0][1],g('y')||25);return`<label>Buyer<select id="ty"><option value="80">Expat · 80% LTV</option><option value="85">UAE National · 85% LTV</option><option value="50">Off-plan · 50% LTV</option></select></label>${calcIn('p','Price (AED)',p)}${calcIn('r','Rate % (FAB '+D.banks[0][1]+')',D.banks[0][1],'step=".05"')}${calcIn('y','Years',25)}<div id="o"></div><span class="m">${D.banks.map(b=>b.join(' ')+'%').join(' · ')} — sample rates</span>`},
cost(){return`${calcIn('p','Price (AED)',2000000)}<label class="ck"><input id="mg" type="checkbox">Mortgage</label>${calcIn('l','Loan (AED)',1600000)}<div id="o"></div>`},
yield(){return`${calcIn('p','Price (AED)',1500000)}${calcIn('a','Annual rent (AED)',95000)}<div id="o"></div>`},
comm(){return`${calcIn('p','Sale price (AED)',2000000)}${calcIn('c','Commission %',2)}${calcIn('a','3rd-party A2A share (AED)',0)}<div id="o"></div>`},
rera(){return`${calcIn('rt','Current annual rent (AED)',80000)}${calcIn('ix','RERA index average (AED)',100000)}<div id="o"></div>`}};
const C={
mort(){const p=g('p'),l=p*g('ty')/100,m=pmt(l,g('r'),g('y'));$('#o').outerHTML=out([['Down payment',A(p-l)],['Loan',A(l)],['Monthly payment',A(m),1],['Total interest',A(Math.max(0,m*g('y')*12-l))]])},
cost(){const c=closing(g('p'),{mortgage:$('#mg').checked,loan:g('l')});$('#o').outerHTML=out([['DLD 4%',A(c.dld)],['Admin',A(c.admin)],['Agency 2%',A(c.agency)],['VAT 5% on agency',A(c.vat)],['Mortgage reg.',A(c.mReg)],['Total fees',A(c.total),1],['Cash needed',A(c.cash)]])},
yield(){$('#o').outerHTML=out([['Gross yield',(g('p')>0?g('a')/g('p')*100:0).toFixed(2)+'%',1]])},
comm(){const gr=g('p')*g('c')/100,s=split(gr,g('a'));$('#o').outerHTML=out([['Gross commission',A(gr)],['VAT 5%',A(s.vat)],['Company net pool',A(s.pool)],['SWK 50%',A(s.swk),1],['Advisor 50%',A(s.agent),1]])},
rera(){const r=rera(g('rt'),g('ix'));$('#o').outerHTML=out([['Below index',r.below+'%'],['Max increase',r.pct+'%',1],['Max new rent',A(r.max)]])}};

const S={};
window.checkin=()=>{const p=dubai();S.checked={t:p.hour+':'+p.minute,late:+p.hour*60+ +p.minute>605};toast('Attendance recorded');render()};
const DOCK=[['','Apps','apps'],['f/dashboard','Overview','command'],['f/market','Market','mkt'],['f/toolkit','Tools','calc'],['f/reception-qr','Check-in','qr']];
function render(){const h=location.hash.replace(/^#\/?/,'');const [a,b]=h.split('/');
 const html=!h?R.launcher(S.lq||''):a==='app'?R.app(b):a==='f'?R.f(b):R.launcher();
 $('#v').innerHTML=html;scrollTo(0,0);
 $('#dock').innerHTML=DOCK.map(([p,l,i])=>`<a href="#/${p}" class="${h===p||(!p&&!h)?'on':''}">${svg(i)}${l}</a>`).join('');
 if(a==='f'&&b==='toolkit')C[S.calc||'mort']()}
addEventListener('hashchange',render);
document.addEventListener('click',e=>{const b=e.target.closest('[data-dept],[data-calc]');if(!b)return;if(b.dataset.dept)S.dept=b.dataset.dept;if(b.dataset.calc)S.calc=b.dataset.calc;const y=scrollY;render();scrollTo(0,y)});
const keep=(id,key)=>{const el=$('#'+id),p=el.selectionStart;S[key]=el.value;const h=location.hash;render();const n=$('#'+id);n.focus();n.setSelectionRange(p,p)};
document.addEventListener('input',e=>{
 if(e.target.id==='q'){S.lq=e.target.value;const p=e.target.selectionStart;$('#v').innerHTML=R.launcher(S.lq);const n=$('#q');n.focus();n.setSelectionRange(p,p)}
 else if(e.target.id==='mq'){S.q=e.target.value;const p=e.target.selectionStart;const y=scrollY;$('#v').innerHTML=R.f('market');const n=$('#mq');n.focus();n.setSelectionRange(p,p);scrollTo(0,y)}
 else if(location.hash==='#/f/toolkit')C[S.calc||'mort']()});
if('serviceWorker' in navigator&&location.protocol!=='file:')navigator.serviceWorker.register('sw.js').catch(()=>{});
render();
