const { chromium } = require('playwright'); const path=require('path'); const fs=require('fs');
(async()=>{
  const b=await chromium.launch(); const pg=await (await b.newContext()).newPage(); const errs=[]; pg.on('pageerror',e=>errs.push(e.message));
  const tmp=fs.mkdtempSync('/tmp/aos-'); fs.copyFileSync(path.resolve(__dirname,'../index.html'),tmp+'/index.html'); fs.writeFileSync(tmp+'/config.js','window.AOS_CONFIG={url:"",key:""};');
  let calls=0;
  await pg.route('https://data.ademe.fr/**',r=>{calls++;r.fulfill({contentType:'application/json',body:JSON.stringify({total:3,results:[
    {siret:'11111111100011',nom_entreprise:'DUPONT CHAUFFAGE',telephone:'01 39 11 22 33',email:'a@dupont.fr',site_internet:'dupont.fr',commune:'POISSY',code_postal:'78300',domaine:'Chaudière bois'},
    {siret:'11111111100011',nom_entreprise:'DUPONT CHAUFFAGE',telephone:'01 39 11 22 33',domaine:'Pompe à chaleur : chauffage',code_postal:'78300'},
    {siret:'22222222200022',nom_entreprise:'ISOL SA',telephone:'01 39 00 00 01',domaine:'Isolation des combles perdus',code_postal:'78300'},
    {siret:'33333333300033',nom_entreprise:'MARTIN SARL',telephone:'06 12 34 56 78',domaine:'Poêle ou insert bois',code_postal:'92100'}]})})});
  await pg.addInitScript(()=>{window.__noSleep=true});
  await pg.goto('file://'+tmp+'/index.html'); await pg.waitForSelector('nav.tabs');
  const ok=(c,m)=>{console.log(c?'ok  ':'FAIL',m); if(!c) process.exitCode=1};
  await pg.click('[data-v=donnees]'); await pg.click('#rgebtn');
  await pg.waitForFunction(()=>/RGE ajoutées/.test(document.querySelector('#toast').textContent),null,{timeout:30000});
  const t=await pg.textContent('#toast'); ok(/2 entreprises chauffage\/plomberie RGE ajoutées/.test(t),'rge : '+t);
  ok(calls===8,'8 requêtes (1 par département) : '+calls);
  await pg.click('[data-v=appels]'); ok(/Dupont Chauffage|Martin Sarl/.test(await pg.textContent('main')),'appelable dans la file');
  ok(errs.length===0,'aucune erreur JS '+errs.join(';')); await b.close();
})();
