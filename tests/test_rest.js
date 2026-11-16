const { chromium } = require('playwright');const path=require('path'),fs=require('fs');
(async()=>{const b=await chromium.launch();const pg=await(await b.newContext({viewport:{width:1200,height:800}})).newPage();const errs=[];pg.on('pageerror',e=>errs.push(e.message));
const tmp=fs.mkdtempSync('/tmp/aos-');fs.copyFileSync(path.resolve(__dirname,'../index.html'),tmp+'/index.html');fs.writeFileSync(tmp+'/config.js','window.AOS_CONFIG={url:"",key:""};');
await pg.goto('file://'+tmp+'/index.html');await pg.waitForSelector('.chal');
const ok=(c,m)=>{if(!c){console.log('FAIL',m);process.exitCode=1}else console.log('ok  ',m)};
const r=await pg.evaluate(async()=>{
 S.chal=false;S.prospects.length=0;S.calls.length=0;
 const y=addDays(today(),-1),old=addDays(today(),-5);
 // A : 2 appels sans réponse hier -> au repos. B : 2 appels il y a 5 jours -> revient. C : 1 seul appel hier -> revient. D : nouvelle fiche.
 const mk=(id,lc,n)=>{S.prospects.push({id,name:id,stage:'contacte',phone:'06123456'+id.charCodeAt(0),nextDate:today(),lastResult:'nr',lastCall:lc+'T10:00:00.000Z',score:50});for(let i=0;i<n;i++)S.calls.push({id:'c'+id+i,prospectId:id,channel:'appel',result:'nr',t:lc+'T0'+(8+i)+':00:00.000Z'})};
 mk('A',y,2);mk('B',old,2);mk('C',y,1);S.prospects.push({id:'D',name:'D',stage:'a_contacter',phone:'0612345699',score:90});
 const q=callQueue().map(p=>p.id);
 // 2e appel sans réponse sur C -> nextDate +3 jours ouvrés
 S.tab='appels';S.call.pid='C';S.call.panel='';render();
 await callResult('nr');
 const c=byId('C');
 return{q,cNext:c.nextDate,w3:workday(3),w1:workday(1),pill:document.body.innerText.includes('au repos')}});
ok(!r.q.includes('A'),'A (2 appels hier) au repos : '+r.q);
ok(r.q.includes('B'),'B (2 appels il y a 5 jours) revient');
ok(r.q.includes('C'),'C (1 seul appel) revient');
ok(r.q.includes('D'),'nouvelle fiche présente');
ok(r.cNext===r.w3,'2e appel sans réponse : prochain essai +3 jours ouvrés ('+r.cNext+' / '+r.w3+')');
ok(r.pill,'compteur « au repos » affiché');
ok(errs.length===0,'aucune erreur JS '+errs);await b.close()})();
