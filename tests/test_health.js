const { chromium } = require('playwright'); const fs=require('fs');
(async()=>{const b=await chromium.launch();const pg=await (await b.newContext()).newPage();let f=0;const ok=(n,c)=>{console.log((c?'PASS ':'FAIL ')+n);if(!c)f++};
const tmp=fs.mkdtempSync('/tmp/aos-');fs.copyFileSync('index.html',tmp+'/index.html');fs.writeFileSync(tmp+'/config.js','window.AOS_CONFIG={url:"",key:""};');
const errs=[];pg.on('pageerror',e=>errs.push(e.message));
await pg.goto('file://'+tmp+'/index.html');await pg.waitForSelector('.chal');
const r=await pg.evaluate(async()=>{
 const past=new Date(Date.now()-5*36e5).toISOString().slice(0,16);
 S.prospects=[
  {id:'A',name:'Gros A',siren:'111',stage:'perdu',lostReason:'Pas intéressé',phone:'06 11 11 11 11'},
  {id:'B',name:'Gros B',siren:'111',stage:'a_contacter',phone:'01 11 11 11 12',city:'x'},
  {id:'C',name:'Sans suite',stage:'rdv',rdvAt:past,phone:'06 22 22 22 22'},
  {id:'D',name:'Dbl1',stage:'a_contacter',phone:'06 33 33 33 33'},{id:'E',name:'Dbl2',stage:'a_contacter',phone:'06 33 33 33 33'},
  {id:'F',name:'Autre site',siren:'222',stage:'perdu',lostReason:'Injoignable (2 cycles)'},{id:'G',name:'Frère injoignable',siren:'222',stage:'a_contacter',phone:'01 44 44 44 44'}];
 const iss=healthIssues().map(i=>i.txt).join(' | ');
 DB.update=async()=>{};await healthSib();
 const g=rdvGcal({name:'Test',rdvAt:'2026-11-10T19:00',rdvType:'visio'});const gt=rdvGcal({name:'T',rdvAt:'2026-11-10T19:00',rdvType:'tel'});
 return {iss,B:S.prospects.find(p=>p.id==='B').stage,G:S.prospects.find(p=>p.id==='G').stage,g,gt}});
console.log(r.iss);
ok('RDV passé sans suite détecté',/RDV passé/.test(r.iss));
ok('même entreprise détectée',/entreprise déjà écartée/.test(r.iss));
ok('doublon de numéro détecté',/en double/.test(r.iss));
ok('frère retiré si SIREN refusé, pas si injoignable',r.B==='perdu'&&r.G==='a_contacter');
ok('lien agenda sur le bon compte',r.g.includes('authuser=kissima.closing%40gmail.com')&&r.gt.includes('Appel%20avec'));
ok('aucune erreur JS',errs.length===0);
await b.close();process.exit(f?1:0)})();
