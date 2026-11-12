const { chromium } = require('playwright');
const path=require('path'),fs=require('fs');
(async()=>{const b=await chromium.launch();const pg=await(await b.newContext({viewport:{width:390,height:800}})).newPage();const errs=[];pg.on('pageerror',e=>errs.push(e.message));
const tmp=fs.mkdtempSync('/tmp/aos-');fs.copyFileSync(path.resolve(__dirname,'../index.html'),tmp+'/index.html');fs.writeFileSync(tmp+'/config.js','window.AOS_CONFIG={url:"",key:""};');
await pg.goto('file://'+tmp+'/index.html');await pg.waitForSelector('.chal');await pg.evaluate(()=>{S.chal=false;S.tab='aide';render()});
const ok=(c,m)=>{if(!c){console.log('FAIL',m);process.exitCode=1}else console.log('ok  ',m)};
for(const k of ['appels','auj','plan','stats','clients','donnees','outreach','contenu','scripts','aide']){await pg.click(`[data-act="aide-tab"][data-v="${k}"]`);ok(await pg.$(`#aide-${k}`)!==null&&(await pg.$$('.aidep')).length===1,'onglet '+k)}
await pg.click('[data-act="aide-tab"][data-v="all"]');ok((await pg.$$('.aidep')).length===10,'tout afficher = 10 panneaux');
ok(await pg.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'pas de scroll horizontal mobile');
await pg.screenshot({path:'/tmp/aidetabs.png'});ok(errs.length===0,'aucune erreur JS '+errs);await b.close()})();
