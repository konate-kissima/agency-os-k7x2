const { chromium } = require('playwright');const path=require('path'),fs=require('fs');
(async()=>{const b=await chromium.launch();const pg=await(await b.newContext()).newPage();const errs=[];pg.on('pageerror',e=>errs.push(e.message));
const tmp=fs.mkdtempSync('/tmp/aos-');fs.copyFileSync(path.resolve(__dirname,'../index.html'),tmp+'/index.html');fs.writeFileSync(tmp+'/config.js','window.AOS_CONFIG={url:"",key:""};');
await pg.goto('file://'+tmp+'/index.html');await pg.waitForSelector('.chal');await pg.evaluate(()=>{S.chal=false;render()});await pg.waitForSelector('nav.tabs');
const ok=(c,m)=>{if(!c){console.log('FAIL',m);process.exitCode=1}else console.log('ok  ',m)};
ok(await pg.locator('[data-act=work-start]').count()===1&&await pg.locator('[data-act=work-end]').count()===0,'au départ : seul « Démarrer » est affiché');
// hors chrono : le temps ne compte pas
const before=await pg.evaluate(()=>{S.act={};lastAct=Date.now()-1000;lastTick=Date.now()-5000;actTick();return S.act[today()]||0});
ok(before===0,'chrono arrêté : aucun temps compté');
await pg.locator('[data-act=work-start]').click();
ok(await pg.locator('[data-act=work-pause]').count()===1&&await pg.locator('[data-act=work-end]').count()===1&&await pg.locator('#worktimer').count()===1,'après Démarrer : chrono, Pause et Fin de journée');
const after=await pg.evaluate(()=>{lastAct=Date.now();lastTick=Date.now()-5000;actTick();return S.act[today()]||0});
ok(after>=4,'chrono en marche : le temps compte ('+after.toFixed(1)+' s)');
await pg.locator('[data-act=work-pause]').click();
const p2=await pg.evaluate(()=>{const a=S.act[today()];lastAct=Date.now();lastTick=Date.now()-5000;actTick();return S.act[today()]===a});
ok(p2,'en pause : le temps ne bouge plus');
// un résultat d'appel redémarre le chrono
await pg.evaluate(async()=>{const p={id:'W1',name:'Test',phone:'06 30 00 00 01',stage:'a_contacter',score:90};S.prospects=[p];await DB.set('prospects','W1',p);S.calls=[];S.tab='appels';S.call.pid='W1';S.call.open='W1';render()});
await pg.keyboard.press('n');await pg.waitForTimeout(400);
ok(await pg.evaluate(()=>WK.on),'noter un appel relance le chrono automatiquement');
await pg.locator('[data-act=work-end]').click();await pg.waitForTimeout(200);
ok(await pg.evaluate(()=>!WK.on)&&await pg.locator('[data-act=work-start]').count()===1,'Fin de journée arrête le chrono');
ok(errs.length===0,'aucune erreur JS '+errs);await b.close()})();
