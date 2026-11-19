const { chromium } = require('playwright');const path=require('path'),fs=require('fs');
// à minuit : compteur du jour remis à 0, écran rafraîchi, chrono ON continue sur le nouveau jour, pause reste en pause
(async()=>{const b=await chromium.launch();const pg=await(await b.newContext()).newPage();const errs=[];pg.on('pageerror',e=>errs.push(e.message));
const tmp=fs.mkdtempSync('/tmp/aos-');fs.copyFileSync(path.resolve(__dirname,'../index.html'),tmp+'/index.html');fs.writeFileSync(tmp+'/config.js','window.AOS_CONFIG={url:"",key:""};');
await pg.addInitScript(()=>{const R=Date,off={v:0};window.__off=off;class D extends R{constructor(...a){if(a.length)super(...a);else super(R.now()+off.v)}static now(){return R.now()+off.v}}window.Date=D});
await pg.goto('file://'+tmp+'/index.html');await pg.waitForSelector('.chal');
const ok=(c,m)=>{if(!c){console.log('FAIL',m);process.exitCode=1}else console.log('ok  ',m)};
await pg.evaluate(()=>{S.chal=false;S.tab='appels';S.act[today()]=3*3600+25*60;WK.on=false;workSave();render()});
ok(/3h25/.test(await pg.locator('#worktimer').innerText()),'avant minuit : 3h25 affichées (en pause)');
const d0=await pg.evaluate(()=>today());
await pg.evaluate(()=>{window.__off.v=24*36e5});
await pg.waitForFunction(()=>!document.getElementById('worktimer'),null,{timeout:12000}).catch(()=>{});
ok(await pg.locator('#worktimer').count()===0,'après minuit : le compteur de la veille n\'est plus affiché');
const r=await pg.evaluate(()=>({d:today(),a:S.act[today()]||0,y:S.act[addDays(today(),-1)]||0}));
ok(r.d!==d0&&r.a===0,'nouveau jour à 0');
ok(r.y===3*3600+25*60,'le temps de la veille reste conservé pour le débrief');
// chrono ON qui traverse minuit : continue de compter sur le nouveau jour
await pg.evaluate(()=>{window.__off.v=24*36e5;WK.on=true;workSave();lastAct=Date.now();lastTick=Date.now();render()});
await pg.waitForTimeout(6500);
ok(await pg.evaluate(()=>(S.act[today()]||0)>0),'chrono ON : le temps s\'ajoute au nouveau jour');
ok(errs.length===0,'aucune erreur JS '+errs);await b.close()})();
