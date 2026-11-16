const { chromium } = require('playwright');const path=require('path'),fs=require('fs');
(async()=>{const b=await chromium.launch();const pg=await(await b.newContext({viewport:{width:1200,height:900},permissions:['clipboard-read','clipboard-write']})).newPage();const errs=[];pg.on('pageerror',e=>errs.push(e.message));
const tmp=fs.mkdtempSync('/tmp/aos-');fs.copyFileSync(path.resolve(__dirname,'../index.html'),tmp+'/index.html');fs.writeFileSync(tmp+'/config.js','window.AOS_CONFIG={url:"",key:""};');
await pg.goto('file://'+tmp+'/index.html');await pg.waitForSelector('.chal');
const ok=(c,m)=>{if(!c){console.log('FAIL',m);process.exitCode=1}else console.log('ok  ',m)};
const r=await pg.evaluate(async()=>{
 S.chal=false;S.prospects.length=0;S.calls.length=0;S.clients.length=0;const t=today(),y=addDays(t,-1);
 const call=(id,res,d)=>S.calls.push({id,channel:'appel',prospectId:'p'+id,result:res,t:d+'T10:'+String(10+S.calls.length).padStart(2,'0')+':00.000Z',hour:10,answered:ANSWERED.includes(res),joint:JOINT.includes(res)});
 // aujourd'hui : 10 appels : 6 décrochés (rdvv, rdvp, rdvt, rap, no, ans), 4 sans réponse
 ['rdvv','rdvp','rdvt','rap','no','ans','nr','nr','rep','nr'].forEach((r,i)=>call('a'+i,r,t));
 call('hier','rdvv',y);
 // RDV du jour : 1 tenu signé R1 (1500 €), 1 absent, 1 à qualifier
 S.prospects.push({id:'s1',name:'S1',stage:'signe',rdvs:[{n:1,type:'visio',at:t+'T09:00:00',show:'tenu',out:'signe',amount:1500}]});
 S.prospects.push({id:'s2',name:'S2',stage:'contacte',rdvs:[{n:1,type:'physique',at:t+'T11:00:00',show:'absent',out:''}]});
 S.prospects.push({id:'s3',name:'S3',stage:'rdv',rdvAt:t+'T16:00:00',rdvType:'visio'});
 S.prospects.push({id:'s4',name:'S4',stage:'contacte',rdvs:[{n:1,type:'tel',at:t+'T12:00:00',show:'tenu',out:''}]});
 S.tab='stats';render();
 const x=debriefData(t);
 return{x,ts:todayStats(),card:!!document.getElementById('debrief'),txt:debriefText(x),cardTxt:document.getElementById('debrief').innerText}});
ok(r.card,'carte Débrief affichée en haut de Stats');
ok(r.x.n===10&&r.x.dec===6,'10 appels, 6 décrochés : '+r.x.n+'/'+r.x.dec);
ok(r.x.rdv===2&&r.x.tel===1,'RDV comptés = 2 (visio+physique), tél à part = 1 : '+r.x.rdv+'/'+r.x.tel);
ok(r.ts.r===2,'barre du haut (todayStats) : 2 RDV, le tél ne compte pas');
ok(r.x.prevus===3&&r.x.tenus===1&&r.x.abs===1&&r.x.pend===1,'show up : 3 prévus (RDV tél exclu), 1 tenu, 1 absent, 1 à qualifier');
ok(r.x.sgN===1&&r.x.amt===1500&&r.x.enc===750,'1 signé, 1 500 € signés, 750 € encaissés');
ok(/Débrief du/.test(r.txt)&&/55|60 %|%/.test(r.txt)&&/RDV tél non comptés/.test(r.txt),'texte copiable complet');
await pg.click('[data-act="deb-day"][data-v="-1"]');
const h=await pg.evaluate(()=>({d:S.dbd,n:debriefData(S.dbd).rdv,disabled:document.querySelector('[data-act="deb-day"][data-v="1"]').disabled}));
ok(h.n===1&&h.d<new Date().toISOString().slice(0,10)+'z','navigation : hier = 1 RDV ('+h.n+')');
await pg.click('[data-act="deb-day"][data-v="1"]');await pg.click('[data-act="deb-copy"]');await pg.waitForTimeout(300);
const clip=await pg.evaluate(()=>navigator.clipboard.readText().catch(()=>'ERR'));
ok(/Débrief du/.test(clip),'bouton Copier : texte dans le presse-papiers');
ok(errs.length===0,'aucune erreur JS '+errs);await b.close()})();
