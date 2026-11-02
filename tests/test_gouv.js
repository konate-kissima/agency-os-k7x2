const { chromium } = require('playwright'); const path=require('path'); const fs=require('fs');
(async()=>{
  const b=await chromium.launch(); const pg=await (await b.newContext()).newPage(); const errs=[]; pg.on('pageerror',e=>errs.push(e.message));
  const tmp=fs.mkdtempSync('/tmp/aos-'); fs.copyFileSync(path.resolve(__dirname,'../index.html'),tmp+'/index.html'); fs.writeFileSync(tmp+'/config.js','window.AOS_CONFIG={url:"",key:""};');
  let calls=0;
  await pg.route('https://recherche-entreprises.api.gouv.fr/**',r=>{calls++;r.fulfill({contentType:'application/json',body:JSON.stringify({total_results:2,total_pages:1,results:[
    {siren:'111111111',nom_complet:'DUPONT PLOMBERIE (DUPONT P)',date_creation:'2025-03-01',tranche_effectif_salarie:'NN',siege:{libelle_commune:'POISSY',adresse:'1 RUE X 78300 POISSY'},dirigeants:[{prenoms:'JEAN PIERRE',nom:'DUPONT'}]},
    {siren:'222222222',nom_complet:'SARL MARTIN CHAUFFAGE',date_creation:'2005-01-01',siege:{libelle_commune:'TRIEL SUR SEINE'},dirigeants:[]}]})})});
  await pg.addInitScript(()=>{window.__noSleep=true});
  await pg.goto('file://'+tmp+'/index.html'); await pg.waitForSelector('.chal'); await pg.evaluate(()=>{S.chal=false;render()});
  const ok=(c,m)=>{console.log(c?'ok  ':'FAIL',m); if(!c) process.exitCode=1};
  await pg.click('[data-v=donnees]'); await pg.click('#govbtn');
  await pg.waitForFunction(()=>/annuaire officiel/.test(document.querySelector('#toast').textContent),null,{timeout:30000});
  const t=await pg.textContent('#toast'); ok(/2 entreprises ajoutées/.test(t),'gouv : '+t);
  ok(calls===16,'16 requêtes (8 départements x 2 codes NAF) : '+calls);
  const main=await pg.textContent('main'); ok(/À enrichir : 2/.test(main),'compteur À enrichir');
  await pg.click('[data-v=outreach]'); const dm=await pg.textContent('main'); ok(/Personne à contacter/.test(dm),'fiches sans contact hors de la file DM');
  await pg.click('[data-v=appels]'); ok(/Plus personne à appeler/.test(await pg.textContent('main')),'pas dans la file d\'appels (pas de téléphone)');
  ok(errs.length===0,'aucune erreur JS '+errs.join(';')); await b.close();
})();
