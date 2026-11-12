const { chromium } = require('playwright');
const path=require('path'),fs=require('fs');
(async()=>{const b=await chromium.launch();const pg=await(await b.newContext()).newPage();const errs=[];pg.on('pageerror',e=>errs.push(e.message));
const tmp=fs.mkdtempSync('/tmp/aos-');fs.copyFileSync(path.resolve(__dirname,'../index.html'),tmp+'/index.html');fs.writeFileSync(tmp+'/config.js','window.AOS_CONFIG={url:"",key:""};');
await pg.goto('file://'+tmp+'/index.html');await pg.waitForSelector('.chal');
const ok=(c,m)=>{if(!c){console.log('FAIL',m);process.exitCode=1}else console.log('ok  ',m)};
await pg.evaluate(async()=>{S.chal=false;const t=today();const p={id:'ab1',name:'Martin Plomberie',dirigeant:'Paul',stage:'rdv',phone:'0612345678',rdvAt:addDays(t,-1)+'T10:00',rdvType:'visio',rdvN:1,rdvs:[]};await DB.set('prospects','ab1',p);await loadAll();S.loaded=true;S.tab='appels';render();rdvqCheck()});
// via popup
await pg.waitForSelector('#rdvq [data-s="absent"]',{timeout:8000});
await pg.click('#rdvq [data-s="absent"]');await pg.click('#rdvq [data-d="absent"]');
await pg.waitForSelector('#absmsgbox');
const v=await pg.inputValue('#absmsgbox');
ok(/Paul/.test(v)&&/n'ai pas pu vous joindre/.test(v)&&/10h/.test(v)&&/14h/.test(v)&&/notre visio/.test(v),'message d\'absence prêt : '+v.slice(0,90));
ok(!/\[lien|finaliser|financ/i.test(v),'pas de langage interne');
ok((await pg.innerHTML('#absbtns')).includes('whatsapp://send')&&(await pg.innerHTML('#absbtns')).includes('sms:'),'boutons WhatsApp + SMS');
await pg.fill('#absmsgbox','Bonjour Paul, nouveau texte');
ok((await pg.innerHTML('#absbtns')).includes(encodeURIComponent('nouveau texte')),'boutons suivent le texte modifié');
await pg.click('#absbtns [data-act="absdone"]:not(a)').catch(async()=>{await pg.click('button[data-act="absdone"]')});
ok(await pg.$('#absmsgbox')===null,'carte fermée après OK');
// via planning
await pg.evaluate(()=>{S.tab='plan';S.plan={d:today(),m:'week'};render()});
const btn=await pg.$('[data-act="plan-ev"]');if(btn)await btn.click();
const ab=await pg.$('[data-act="abs-open"]');ok(!!ab,'bouton « Message d\'absence » dans le planning');
if(ab){await ab.click();ok(await pg.$('#absmsgbox')!==null,'carte rouverte depuis le planning')}
ok(errs.length===0,'aucune erreur JS '+errs);await b.close()})();
