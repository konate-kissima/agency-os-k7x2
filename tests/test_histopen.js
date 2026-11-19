const { chromium } = require('playwright');const path=require('path'),fs=require('fs');
// fiche d'appel : l'historique est ouvert d'office s'il y en a un, fermé sinon
(async()=>{const b=await chromium.launch();const pg=await(await b.newContext()).newPage();const errs=[];pg.on('pageerror',e=>errs.push(e.message));
const tmp=fs.mkdtempSync('/tmp/aos-');fs.copyFileSync(path.resolve(__dirname,'../index.html'),tmp+'/index.html');fs.writeFileSync(tmp+'/config.js','window.AOS_CONFIG={url:"",key:""};');
await pg.goto('file://'+tmp+'/index.html');await pg.waitForSelector('.chal');
const ok=(c,m)=>{if(!c){console.log('FAIL',m);process.exitCode=1}else console.log('ok  ',m)};
await pg.evaluate(()=>{S.chal=false;S.tab='appels';S.calls=[{id:'c1',t:new Date(Date.now()-864e5).toISOString(),result:'ans',channel:'appel',prospectId:'H1',prospectName:'Avec Histo',note:'a dit rappeler'}];
S.prospects=[{id:'H1',name:'Avec Histo',phone:'06 11 11 11 11',stage:'contacte',log:[]},{id:'H2',name:'Sans Histo',phone:'06 22 22 22 22',stage:'nouveau',log:[]}];S.call.open='H1';S.call.pid='H1';render()});
await pg.waitForSelector('.chist');
ok(await pg.locator('details.chist[open]').count()===1,'avec historique : ouvert direct');
await pg.evaluate(()=>{S.call.open='H2';S.call.pid='H2';render()});
await pg.waitForSelector('.chist');
ok(await pg.locator('details.chist[open]').count()===0,'sans historique : fermé');
// rétracter : reste replié après un nouvel affichage et sur une autre fiche, jusqu'à ce qu'on le rouvre
await pg.evaluate(()=>{S.call.open='H1';S.call.pid='H1';render()});await pg.waitForSelector('.chist');
await pg.locator('details.chist > summary').click();await pg.waitForTimeout(150);
ok(await pg.locator('details.chist[open]').count()===0,'clic sur Historique : se replie');
await pg.evaluate(()=>render());await pg.waitForTimeout(100);
ok(await pg.locator('details.chist[open]').count()===0,'reste replié après un nouvel affichage');
await pg.locator('details.chist > summary').click();await pg.waitForTimeout(150);
await pg.evaluate(()=>render());await pg.waitForTimeout(100);
ok(await pg.locator('details.chist[open]').count()===1,'rouvert : reste ouvert');
ok(errs.length===0,'aucune erreur JS '+errs);await b.close()})();
