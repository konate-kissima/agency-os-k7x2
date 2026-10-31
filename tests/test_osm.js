const { chromium } = require('playwright');
const path = require('path'); const fs = require('fs');
(async () => {
  const b = await chromium.launch(); const pg = await (await b.newContext()).newPage();
  const errs = []; pg.on('pageerror', e => errs.push(e.message));
  const tmp = fs.mkdtempSync('/tmp/aos-'); fs.copyFileSync(path.resolve(__dirname,'../index.html'), tmp+'/index.html');
  fs.writeFileSync(tmp+'/config.js','window.AOS_CONFIG={url:"",key:""};');
  await pg.route('https://overpass-api.de/**', r => r.fulfill({ contentType:'application/json', body: JSON.stringify({elements:[
    {type:'node',id:1,tags:{name:'Chauffage Durand',phone:'+33 1 30 00 00 01','contact:instagram':'durand_chauffage','addr:city':'Poissy','addr:postcode':'78300'}},
    {type:'way',id:2,tags:{name:'SOS Plomberie',phone:'01 30 00 00 02','addr:postcode':'95000'}},
    {type:'node',id:3,tags:{name:'Sans contact'}},
    {type:'node',id:4,tags:{name:'Doublon',phone:'0130000001'}} ]}) }));
  await pg.addInitScript(()=>{window.__noSleep=true});
  await pg.goto('file://'+tmp+'/index.html'); await pg.waitForSelector('nav.tabs');
  const ok=(c,m)=>{console.log(c?'ok  ':'FAIL',m); if(!c) process.exitCode=1};
  await pg.click('[data-v=donnees]'); await pg.click('#osmbtn'); await pg.waitForFunction(()=>/OpenStreetMap ajoutées|ajoutées/.test(document.querySelector('#toast').textContent),null,{timeout:30000}); await pg.waitForTimeout(300);
  const t = await pg.textContent('#toast'); ok(/2 fiches OpenStreetMap ajoutées/.test(t), 'osm : '+t);
  await pg.click('[data-v=dm]').catch(()=>{});
  const tabs = await pg.$$eval('nav.tabs button', bs=>bs.map(b=>b.dataset.v+':'+b.textContent));
  console.log(tabs.join(' | '));
  const dm = tabs.find(x=>/DM/.test(x)).split(':')[0]; await pg.click(`[data-v=${dm}]`);
  const body = await pg.textContent('main');
  ok(/0 \/ 70/.test(body), 'objectif 0 / 70'); ok(/Accroche suggérée/.test(body), 'accroche affichée');
  ok(/Chauffage Durand/.test(body), 'cible avec Instagram en premier');
  ok(await pg.locator('a[href="https://instagram.com/durand_chauffage"]').count()===1, 'lien Instagram');
  ok(errs.length===0, 'aucune erreur JS '+errs.join(';'));
  await b.close();
})();
