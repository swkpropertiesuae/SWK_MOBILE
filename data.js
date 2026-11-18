// All data hardcoded. Sources: swkpropertiesuae/SWKOS (roles, departments, modules, compliance),
// swkpropertiesuae/data (market: DLD medians 2025 vs 2024, yields), swkapp (calculator rules).
window.D={
company:{name:"SWK Properties L.L.C.",ar:"إس دبليو كي العقارية ش.ذ.م.م",orn:"51517",site:"os.swk.properties"},
user:{name:"Shabib Siraj",role:"Owner & Managing Director"},
team:[
 {n:"Shabib Siraj",r:"Owner & Managing Director",a:"Complete system control; final approver for deletions & refunds",s:"in",t:"09:48"},
 {n:"Mohammad Haseeb",r:"Operations Manager",a:"All 3 departments, CRM, sales, HR, finance; admin decisions need Owner approval",s:"in",t:"09:57"},
 {n:"Talha Shabbir",r:"BDM & IT Admin",a:"CRM/ERP ops, Bayut & Dubizzle syndication, marketing, AI workflows",s:"late",t:"10:22"},
 {n:"Sales Advisor 1",r:"Sales Advisor (DLD-registered)",a:"50–50% net commission split",s:"in",t:"10:02"},
 {n:"Sales Advisor 2",r:"Sales Advisor (DLD-registered)",a:"50–50% net commission split",s:"in",t:"10:04"},
 {n:"Sales Advisor 3",r:"Sales Advisor (DLD-registered)",a:"50–50% net commission split",s:"absent",t:""}],
depts:[
 {k:"OFFPLAN",n:"Off-Plan Projects",c:"#007b52",steps:["Developer inventory & launches","Promote & campaign syndication","Platform leads intake","Calls, meetings & follow-ups","Site visit & show apartment","EOI, booking, SPA & Oqood","Escrow payment collection","Handover & 50/50 commission"]},
 {k:"SECONDARY",n:"Secondary Sales",c:"#15526b",steps:["Seller / A2A inventory","Bayut & Dubizzle promotion","Leads intake","Qualification & follow-ups","Property site visits","Buyer finance, Form F, NOC, DLD trustee","Payment & withdrawal protection","Title deed & commission split"]},
 {k:"LEASING",n:"Leasing",c:"#8c4329",steps:["Landlord mandate / A2A search","Portal promotion","Tenant leads intake","Calls & qualification","Property viewings","Tenancy contract, Ejari & PDCs","Rent & deposit collection","Key handover & settlement"]}],
deals:[
 {id:"D-1042",t:"Marina Sky Penthouse",d:"SECONDARY",st:5,v:6850000,cm:137000,ag:"Sales Advisor 1",cl:"Mr. Al Mansoori"},
 {id:"D-1041",t:"Creek Harbour Waterside TH",d:"OFFPLAN",st:5,v:3120000,cm:124800,ag:"Sales Advisor 2",cl:"Ms. Petrova"},
 {id:"D-1040",t:"JVC Boulevard 1BR",d:"LEASING",st:5,v:78000,cm:3900,ag:"Sales Advisor 1",cl:"Mr. Khan"},
 {id:"D-1039",t:"Hills Estate Golf Mansion",d:"SECONDARY",st:6,v:14500000,cm:290000,ag:"Sales Advisor 3",cl:"Mr. Zhang"},
 {id:"D-1038",t:"Business Bay Executive 2BR",d:"SECONDARY",st:3,v:1850000,cm:37000,ag:"Sales Advisor 2",cl:"Ms. Rossi"},
 {id:"D-1037",t:"Dubai Islands Off-Plan 3BR",d:"OFFPLAN",st:4,v:4250000,cm:170000,ag:"Sales Advisor 1",cl:"Mr. Patel"},
 {id:"D-1036",t:"Palm Garden Homes Villa",d:"LEASING",st:4,v:420000,cm:21000,ag:"Sales Advisor 3",cl:"Mr. Becker"},
 {id:"D-1035",t:"Raw District Studio",d:"OFFPLAN",st:2,v:1250000,cm:50000,ag:"Sales Advisor 2",cl:"Ms. Haddad"}],
leads:[
 {n:"Ahmed R.",src:"Bayut",i:"2BR Marina, buy",sc:86,st:"Hot",d:"OFFPLAN",f:"Today 15:00"},
 {n:"Elena K.",src:"Dubizzle",i:"Studio JVC, rent",sc:72,st:"Warm",d:"LEASING",f:"Today 17:30"},
 {n:"James W.",src:"Website",i:"Villa Hills Estate",sc:91,st:"Hot",d:"SECONDARY",f:"Tomorrow 11:00"},
 {n:"Priya S.",src:"WhatsApp",i:"1BR Business Bay, buy",sc:58,st:"Warm",d:"SECONDARY",f:"Tomorrow 14:00"},
 {n:"Omar F.",src:"Referral",i:"Off-plan Creek Harbour",sc:80,st:"Hot",d:"OFFPLAN",f:"Thu 10:30"},
 {n:"Li Wei",src:"Bayut",i:"Penthouse Palm",sc:44,st:"Cold",d:"SECONDARY",f:"Fri 16:00"}],
tasks:[
 "Send Form F draft — D-1042","Collect PDC cheques — D-1036","Upload Title Deed scan — D-1039","Bayut feed check (Talha)","Follow up Ahmed R. 15:00","Submit EOD report"],
compliance:[
 {n:"RERA ORN",v:"51517",ok:true},{n:"Trakheesi permits",v:"3 expire in 14 days",ok:false},{n:"KYC / AML checklist",v:"All clients current",ok:true},{n:"goAML cash-threshold scan",v:"No hits",ok:true},{n:"Trade licence renewal",v:"In 62 days",ok:true},{n:"Staff visa expiries",v:"1 in 30 days",ok:false}],
modules:[
 ["01","Company & Administration","Entities, branches, roles, audit"],["02","CRM","Leads, pipelines, scoring, follow-ups"],["03","Sales Management","Quotes, contracts, commissions"],["04","Accounting & Finance","GL, AR/AP, P&L, bank rec"],["05","Tax & e-Invoicing","VAT 5%, UBL PINT AE"],["06","Procurement","RFQs, POs, supplier bills"],["07","Inventory & Warehousing","Items, bins, valuation"],["08","HR & Payroll","Visas, leave, WPS SIF"],["09","Project Management","Milestones, timesheets"],["10","Document Management","Versions, expiry, secure links"],["11","Approval Engine","Chains, thresholds, escalation"],["12","Workflow Automation","Triggers, reminders, audit"],["13","Communications & Dashboards","WhatsApp, owner command center"],["14","Service Catalogue","Implementation & support"]],
kpi:{pipeline:40295000,gci:834500,leads:6,viewings:9,toRecv:512000,approvals:3},
hours:[["Mon–Fri","10:00 – 19:00"],["Saturday","10:00 – 16:00"],["Sunday","Holiday"],["Grace","Until 10:05 — 10:06+ is Late"]],
mkt:[{"n":"Palm Jumeirah","psf":2625,"px":4375000,"g":12.5,"tx":1692,"y":5.24},{"n":"Downtown Dubai","psf":2930,"px":2950000,"g":10.0,"tx":4000,"y":5.25},{"n":"Dubai Marina","psf":2220,"px":1927288,"g":16.6,"tx":4419,"y":5.66},{"n":"Business Bay","psf":2446,"px":1524999,"g":10.3,"tx":11634,"y":5.73},{"n":"Dubai Hills Estate","psf":2426,"px":2028135,"g":6.3,"tx":3849,"y":6.03},{"n":"Jumeirah Village Circle","psf":1475,"px":1030000,"g":13.1,"tx":18733,"y":6.24},{"n":"Jumeirah Lake Towers","psf":1880,"px":1716660,"g":6.4,"tx":3417,"y":6.69},{"n":"Dubai Creek Harbour","psf":2447,"px":2534888,"g":2.2,"tx":3931,"y":5.65},{"n":"Arjan","psf":1427,"px":925000,"g":7.7,"tx":3930,"y":7.07},{"n":"Al Furjan","psf":1348,"px":1476704,"g":15.2,"tx":3889,"y":6.33},{"n":"Dubai South Residential District","psf":1149,"px":1000000,"g":20.1,"tx":2096,"y":6.25},{"n":"Dubai Sports City","psf":1229,"px":876000,"g":7.4,"tx":3753,"y":7.71},{"n":"Motor City","psf":1910,"px":1198391,"g":3.5,"tx":6197,"y":7.83},{"n":"Jumeirah Golf Estates","psf":1509,"px":6168243,"g":20.7,"tx":604,"y":7.1},{"n":"Dubai Harbour","psf":3931,"px":5681976,"g":0.8,"tx":1625,"y":5.07},{"n":"Dubai Water Canal","psf":3089,"px":3333333,"g":32.0,"tx":1062,"y":5.07}],
banks:[["FAB",4.25],["Emirates NBD",4.35],["ADCB",4.4],["DIB",4.5],["Mashreq",4.45],["HSBC UAE",4.6]]};
