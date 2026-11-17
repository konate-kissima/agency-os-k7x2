const { chromium } = require('playwright');const path=require('path'),fs=require('fs');
(async()=>{const b=await chromium.launch();const pg=await(await b.newContext({viewport:{width:1000,height:800}})).newPage();const errs=[];pg.on('pageerror',e=>errs.push(e.message));
const tmp=fs.mkdtempSync('/tmp/aos-');fs.mkdirSync(tmp+'/tournee');fs.copyFileSync(path.resolve(__dirname,'../index.html'),tmp+'/index.html');fs.copyFileSync(path.resolve(__dirname,'../tournee/index.html'),tmp+'/tournee/index.html');fs.writeFileSync(tmp+'/config.js','window.AOS_CONFIG={url:"",key:""};');
await pg.goto('file://'+tmp+'/index.html');await pg.waitForSelector('.chal');
const ok=(c,m)=>{if(!c){console.log('FAIL',m);process.exitCode=1}else console.log('ok  ',m)};
await pg.evaluate(()=>{S.chal=false;S.prospects.length=0;S.tab='terrain';render()});
ok(await pg.$('#terrainFrame')!==null&&await pg.evaluate(()=>getComputedStyle(document.getElementById('terrainFrame')).display==='block'),'onglet Terrain : cadre affiché');
ok(await pg.$('button[data-v="terrain"]')!==null,'onglet visible dans la barre');
// simule un résultat envoyé par la tournée (même origine : file:// -> on appelle directement le gestionnaire)
const r=await pg.evaluate(async()=>{
 await terrainSave({id:'node/1',n:'Opti Claire',cat:'opticien',catL:'Opticien',addr:'3 rue X, 75019 Paris',cp:'75019',tel:'01 42 00 00 01',lat:48.88,lng:2.37,r:'rdv',note:'repasser 16h',dir:''});
 await terrainSave({id:'node/2',n:'Garage Y',cat:'garage',catL:'Garage',addr:'',cp:'',tel:'',lat:48.8,lng:2.3,r:'refus',note:'',dir:''});
 await terrainSave({id:'node/3',n:'Fermé Z',cat:'garage',catL:'Garage',addr:'',cp:'',tel:'',lat:48.8,lng:2.3,r:'passe',note:'',dir:''});
 await terrainSave({id:'node/1',n:'Opti Claire',cat:'opticien',catL:'Opticien',addr:'3 rue X, 75019 Paris',cp:'75019',tel:'01 42 00 00 01',lat:48.88,lng:2.37,r:'carte',note:'',dir:''});
 return{n:S.prospects.length,a:S.prospects.find(p=>p.name==='Opti Claire'),b:S.prospects.find(p=>p.name==='Garage Y'),c:S.prospects.some(p=>p.name==='Fermé Z')}});
ok(r.n===2,'2 fiches créées (le « passé » ne crée rien) : '+r.n);
ok(r.a&&r.a.stage==='contacte'&&r.a.dept==='75'&&r.a.source==='terrain'&&/repasser 16h/.test(r.a.notes)&&/Carte laissée/.test(r.a.notes),'fiche mise à jour au 2e résultat, notes cumulées');
ok(r.b&&r.b.stage==='perdu','pas intéressé : fiche perdue');
ok(!r.c,'fermé / passer : aucune fiche');
const f=await pg.evaluate(async()=>{
 const mk=(i,r,extra)=>terrainSave({id:'node/'+i,n:'Boutique '+i,cat:'garage',catL:'Garage',addr:'5 rue Z, 75011 Paris',cp:'75011',tel:'',lat:48.86,lng:2.38,r,note:'',dir:'',...extra});
 await mk(10,'rdv',{when:'2026-11-25T14:30',type:'physique'});await mk(11,'planif',{when:'2026-11-24T10:00'});await mk(12,'interesse',{});await mk(13,'rdv',{when:'2026-11-26T09:00',type:'visio'});
 const g=n=>S.prospects.find(p=>p.name==='Boutique '+n);return{a:g(10),b:g(11),c:g(12),d:g(13),log:g(10).log.map(l=>l.txt)}});
ok(f.a.stage==='rdv'&&f.a.rdvAt==='2026-11-25T14:30'&&f.a.rdvType==='physique'&&/75011/.test(f.a.rdvPlace),'RDV pris sur place : fiche en RDV, date, type physique, lieu');
ok(f.d.stage==='rdv'&&f.d.rdvType==='visio','RDV visio pris sur place');
ok(f.b.stage==='contacte'&&f.b.nextDate==='2026-11-24'&&f.b.nextTime==='10:00','rencontre planifiée : retour le 24/11 à 10:00 dans le planning');
ok(f.c.stage==='contacte'&&f.c.nextDate&&/Intéressé, pas de RDV/.test(f.c.notes),'intéressé sans RDV : à recontacter');
ok(/^Rencontre|^RDV pris/.test(f.log[0]),'journal : le libellé commence par le résultat (stats)');
await pg.evaluate(()=>{S.tab='appels';render()});
ok(await pg.evaluate(()=>getComputedStyle(document.getElementById('terrainFrame')).display==='none'),'cadre caché hors onglet Terrain');
ok(errs.length===0,'aucune erreur JS '+errs);await b.close()})();
