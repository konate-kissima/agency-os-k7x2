const { chromium } = require('playwright');const path=require('path'),fs=require('fs');
(async()=>{const b=await chromium.launch();const pg=await(await b.newContext()).newPage();const errs=[];pg.on('pageerror',e=>errs.push(e.message));
const tmp=fs.mkdtempSync('/tmp/aos-');fs.copyFileSync(path.resolve(__dirname,'../index.html'),tmp+'/index.html');fs.writeFileSync(tmp+'/config.js','window.AOS_CONFIG={url:"",key:""};');
await pg.goto('file://'+tmp+'/index.html');await pg.waitForSelector('.chal');
const ok=(c,m)=>{if(!c){console.log('FAIL',m);process.exitCode=1}else console.log('ok  ',m)};
const q=await pg.evaluate(()=>{S.chal=false;const mk=(id,n,st,ph)=>({id,name:n,phone:ph,stage:st,score:50});
 S.prospects=[mk('A','Nouveau même numéro','a_contacter','01 64 57 17 08'),mk('B','Déjà perdu','perdu','0164571708'),mk('C','Autre numéro','a_contacter','01 30 17 05 15'),mk('D','Même numéro écrit +33','a_contacter','+33 1 30 17 05 16'),mk('E','Stop','stop','01 30 17 05 16')];
 return callQueue().map(p=>p.id)});
ok(JSON.stringify(q)==='["C"]','un numéro déjà perdu / stop ne revient pas via une autre fiche : '+JSON.stringify(q));
// jour local d'un appel à 23h30 UTC = lendemain à Paris
const d=await pg.evaluate(()=>[dayOf('2026-11-16T23:30:00.000Z'),dayOf('2026-11-16T10:00:00.000Z'),dayOf('2026-11-16T18:00'),dayOf('2026-11-16')]);
console.log('dayOf',JSON.stringify(d));
ok(d[1]==='2026-11-16'&&d[2]==='2026-11-16'&&d[3]==='2026-11-16','jours calculés sans décalage (journée, heure locale, date seule)');
ok(errs.length===0,'aucune erreur JS '+errs);await b.close()})();
