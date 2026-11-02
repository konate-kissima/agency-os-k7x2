const { chromium } = require('playwright'); const path=require('path'); const fs=require('fs');
(async()=>{
  const b=await chromium.launch(); const pg=await (await b.newContext()).newPage(); const errs=[]; pg.on('pageerror',e=>errs.push(e.message));
  const tmp=fs.mkdtempSync('/tmp/aos-'); fs.copyFileSync(path.resolve(__dirname,'../index.html'),tmp+'/index.html'); fs.writeFileSync(tmp+'/config.js','window.AOS_CONFIG={url:"",key:""};');
  await pg.route('https://recherche-entreprises.api.gouv.fr/**',r=>r.fulfill({contentType:'application/json',body:JSON.stringify({total_results:1,total_pages:1,results:[{siren:'111111111',nom_complet:'DUPONT CHAUFFAGE',date_creation:'2020-01-01',siege:{libelle_commune:'POISSY'},dirigeants:[]}]})}));
  await pg.route('https://data.ademe.fr/**',r=>r.fulfill({contentType:'application/json',body:JSON.stringify({total:3,results:[
    {siret:'11111111100011',nom_entreprise:'DUPONT CHAUFFAGE',telephone:'01 39 11 22 33',email:'a@d.fr',commune:'POISSY',code_postal:'78300',domaine:'Chaudière bois'},
    {siret:'11111111100029',nom_entreprise:'DUPONT CHAUFFAGE AGENCE 2',telephone:'01 39 99 99 99',commune:'ACHERES',code_postal:'78260',domaine:'Chaudière bois'},
    {siret:'33333333300033',nom_entreprise:'MARTIN SARL',telephone:'01 39 11 22 33',commune:'TRIEL',code_postal:'78510',domaine:'Poêle ou insert bois'}]})}));
  await pg.addInitScript(()=>{window.__noSleep=true});
  await pg.goto('file://'+tmp+'/index.html'); await pg.waitForSelector('.chal'); await pg.evaluate(()=>{S.chal=false;render()});
  const ok=(c,m)=>{console.log(c?'ok  ':'FAIL',m); if(!c) process.exitCode=1};
  const wait=async re=>pg.waitForFunction(r=>new RegExp(r).test(document.querySelector('#toast').textContent),re.source,{timeout:30000});
  await pg.click('[data-v=donnees]');
  await pg.selectOption('#osmscope','cor'); await pg.click('#govbtn'); await wait(/annuaire officiel/);
  const n1=await pg.evaluate(()=>S.prospects.length); ok(n1===1,'gouv : 1 fiche ('+n1+')');
  await pg.click('[data-v=donnees]'); await pg.selectOption('#osmscope','cor'); await pg.click('#rgebtn'); await wait(/RGE ajoutées/);
  const P=await pg.evaluate(()=>S.prospects.map(p=>({n:p.name,t:p.phone,e:p.enrich})));
  ok(P.length===1&&P[0].t==='01 39 11 22 33'&&P[0].e==='done','fiche gouv enrichie par RGE, pas de doublon SIREN/téléphone : '+JSON.stringify(P));
  await pg.click('[data-v=donnees]'); await pg.selectOption('#osmscope','cor'); await pg.click('#rgebtn'); await wait(/RGE ajoutées/);
  ok(await pg.evaluate(()=>S.prospects.length)===1,'relance : toujours 1 fiche');
  // doublon existant -> nettoyage
  await pg.evaluate(async()=>{const a=[['x1',{name:'Dupont Chauffage',city:'Poissy',phone:'',stage:'a_contacter',created:'2099-01-01'}],['x2',{name:'Autre',city:'Paris',phone:'01 39 11 22 33',stage:'a_contacter',created:'2099-01-02'}]];await DB.setMany('prospects',a);a.forEach(([id,d])=>S.prospects.push({id,...d}))});
  await pg.click('[data-v=donnees]'); await pg.click('[data-act=dedupe]'); await pg.waitForTimeout(300);
  const st=await pg.evaluate(()=>S.prospects.filter(p=>p.stage==='perdu'&&p.lostReason==='Doublon').map(p=>p.id));
  ok(st.length===2&&st.includes('x1')&&st.includes('x2'),'nettoyage : '+st);
  ok(errs.length===0,'aucune erreur JS '+errs.join(';')); await b.close();
})();
