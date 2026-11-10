const { chromium } = require('playwright'); const fs=require('fs');
(async()=>{const b=await chromium.launch();const pg=await (await b.newContext()).newPage();let f=0;const ok=(n,c)=>{console.log((c?'PASS ':'FAIL ')+n);if(!c)f++};
const tmp=fs.mkdtempSync('/tmp/aos-');fs.copyFileSync('index.html',tmp+'/index.html');fs.writeFileSync(tmp+'/config.js','window.AOS_CONFIG={url:"",key:""};');
await pg.goto('file://'+tmp+'/index.html');await pg.waitForSelector('.chal');
await pg.evaluate(()=>{window.__noSleep=true;
 S.prospects=[{id:'rEXIST',name:'Déjà',phone:'06 11 11 11 11',siren:'111111111',city:'X'}];
 const rows=[
  {siret:'20000000000011',nom_entreprise:'MOBILE OK',telephone:'06 22 22 22 22',email:'a@b.fr',code_postal:'78100',commune:'ST GERMAIN',domaine:'Pompe à chaleur : chauffage',site_internet:'https://www.qualit-enr.org/x'},
  {siret:'20000000000011',nom_entreprise:'MOBILE OK',telephone:'06 22 22 22 22',code_postal:'78100',commune:'ST GERMAIN',domaine:'Architecte'},
  {siret:'30000000000011',nom_entreprise:'ARCHI SEUL',telephone:'06 33 33 33 33',code_postal:'78100',commune:'X',domaine:'Architecte'},
  {siret:'11111111100011',nom_entreprise:'DEJA SIREN',telephone:'06 44 44 44 44',code_postal:'78100',commune:'X',domaine:'Chauffe-Eau Thermodynamique'},
  {siret:'50000000000011',nom_entreprise:'GROS MOBILE',telephone:'07 55 55 55 55',code_postal:'92100',commune:'BOULOGNE',domaine:'Fenêtres, volets, portes donnant sur l\'extérieur'},
  {siret:'60000000000011',nom_entreprise:'FIXE PETIT',telephone:'01 66 66 66 66',code_postal:'75010',commune:'PARIS',domaine:'Ventilation mécanique'},
  {siret:'70000000000011',nom_entreprise:'FIXE GRAND',telephone:'01 77 77 77 77',code_postal:'75010',commune:'PARIS',domaine:'Ventilation mécanique'},
  {siret:'80000000000011',nom_entreprise:'FERMEE',telephone:'06 88 88 88 88',code_postal:'75010',commune:'PARIS',domaine:'Ventilation mécanique'},
  {siret:'90000000000011',nom_entreprise:'SANS TEL',telephone:'',code_postal:'75010',commune:'PARIS',domaine:'Ventilation mécanique'}];
 const reg={'200000000':{tranche_effectif_salarie:'01',date_creation:'2015-01-01',activite_principale:'43.22B',dirigeants:[{prenoms:'JEAN,PAUL',nom:'DUPONT',qualite:'Gérant'}]},
  '500000000':{tranche_effectif_salarie:'41',etat_administratif:'A'},'600000000':{tranche_effectif_salarie:'02'},'700000000':{tranche_effectif_salarie:'12'},'800000000':{etat_administratif:'C'}};
 const of=window.fetch;window.fetch=async(u)=>{u=String(u);
  if(u.includes('data.ademe.fr')){const dep=decodeURIComponent(u).match(/code_postal:(\d+)\*/)[1];const r=rows.filter(x=>x.code_postal.startsWith(dep));return {ok:true,json:async()=>({results:r,next:null})}}
  if(u.includes('recherche-entreprises')){const s=u.split('q=')[1];const r=reg[s];return {ok:true,status:200,json:async()=>({results:r?[{siren:s,...r}]:[]})}}
  return of(u)};
 document.body.insertAdjacentHTML('beforeend','<select id="leadzone"><option value="idf" selected>idf</option></select>');
});
await pg.evaluate(async()=>{await leadsSearch()});
const L=await pg.evaluate(()=>({n:S.leads.items.length,ids:S.leads.items.map(i=>i[0]).sort().join(','),st:S.leads.stat,m:S.leads.items.find(i=>i[0]==='r20000000000011')[1]}));
console.log(JSON.stringify(L.st),L.ids);
ok('leads retenus = mobile ok, gros mobile, fixe petit',L.ids==='r20000000000011,r50000000000011,r60000000000011');
ok('architecte seul écarté',L.st.horsMetier===1);ok('déjà en base (siren) écarté',L.st.deja===1);ok('fermée écartée',L.st.cessees===1);ok('fixe grande écarté',L.st.fixeGrand===1);ok('sans tel écarté',L.st.sansTel===1);
ok('dirigeant et effectif remplis',L.m.dirigeant==='Jean Dupont'&&L.m.effectif==='01'&&L.m.dept==='78'&&L.m.website==='');
ok('mobile score > fixe',L.m.score>=95);
await b.close();process.exit(f?1:0)})();
