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
await pg.evaluate(()=>{S.tab='appels';render()});
ok(await pg.evaluate(()=>getComputedStyle(document.getElementById('terrainFrame')).display==='none'),'cadre caché hors onglet Terrain');
ok(errs.length===0,'aucune erreur JS '+errs);await b.close()})();
