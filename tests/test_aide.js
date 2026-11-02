const { chromium } = require('playwright'); const path=require('path'); const fs=require('fs');
(async()=>{
  const b=await chromium.launch(); const pg=await (await b.newContext()).newPage(); const errs=[]; pg.on('pageerror',e=>errs.push(e.message));
  const tmp=fs.mkdtempSync('/tmp/aos-'); fs.copyFileSync(path.resolve(__dirname,'../index.html'),tmp+'/index.html'); fs.writeFileSync(tmp+'/config.js','window.AOS_CONFIG={url:"",key:""};');
  await pg.goto('file://'+tmp+'/index.html'); await pg.waitForSelector('.chal'); await pg.evaluate(()=>{S.chal=false;render()});
  const ok=(c,m)=>{console.log(c?'ok  ':'FAIL',m); if(!c) process.exitCode=1};
  await pg.click('[data-v=aide]'); const t=await pg.textContent('main');
  ok(/Explication de l'outil/.test(t)&&/La note \(score\)/.test(t),'explication présente'); ok(/3000 € au départ/.test(t)&&/environ 8 clients/.test(t),'prix et clients'); ok(!/\{settings|\$\{/.test(t),'pas de gabarit brut');
  await pg.click('[data-v=donnees]'); const opts=await pg.$$eval('#osmscope option',o=>o.map(x=>x.value));
  ok(opts.includes('idf')&&opts.includes('bre')&&opts.includes('fr')&&opts.length===15,'sélecteur de régions : '+opts.length);
  ok(errs.length===0,'aucune erreur JS '+errs.join(';')); await b.close();
})();
