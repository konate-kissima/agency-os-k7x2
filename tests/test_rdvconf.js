const { chromium } = require('playwright');const path=require('path'),fs=require('fs');
(async()=>{const b=await chromium.launch();const pg=await(await b.newContext()).newPage();const errs=[];pg.on('pageerror',e=>errs.push(e.message));
const tmp=fs.mkdtempSync('/tmp/aos-');fs.copyFileSync(path.resolve(__dirname,'../index.html'),tmp+'/index.html');fs.writeFileSync(tmp+'/config.js','window.AOS_CONFIG={url:"",key:""};');
await pg.goto('file://'+tmp+'/index.html');await pg.waitForSelector('.chal');
const ok=(c,m)=>{if(!c){console.log('FAIL',m);process.exitCode=1}else console.log('ok  ',m)};
await pg.evaluate(()=>{S.chal=false;S.lastRDV='';const d=new Date(Date.now()+20*36e5),p2=x=>String(x).padStart(2,'0');const at=d.getFullYear()+'-'+p2(d.getMonth()+1)+'-'+p2(d.getDate())+'T19:00';
S.prospects=[{id:'A1',name:'Aura Cool',dirigeant:'Jack Gabriel',phone:'06 06 79 76 96',email:'c@auracool.fr',stage:'rdv',rdvAt:at,rdvType:'visio',rdvMsgFor:at,rdvMsgAI:'Bonjour Jack, Konaté Kissima. Vous avez indiqué signer 5 devis sur 10 envoyés, soit 50 %. On se retrouve en visio à 19h00. Répondez OK pour confirmer.'}];S.calls=[];S.tab='appels';localStorage.setItem('aos_alerts_hidden','1');S.prospects.push({id:'S1',name:'Vieux',phone:'06 11 11 11 11',stage:'contacte',rdvAt:'2026-11-01T10:00',rdvType:'visio'});render()});
ok(await pg.locator('[data-act=alerts-toggle][aria-expanded=false]').count()===1,'bandeau d\'alertes replié');
ok(await pg.locator('#rdvmsgbox').count()===1,'carte de confirmation visible sans passer par l\'appel');
ok(await pg.locator('#rdvbtns a:has-text("WhatsApp")').count()===1,'bouton WhatsApp présent');
const href=await pg.locator('a:has-text("E-mail avec le brief")').getAttribute('href');
ok(/signer%205%20devis/.test(href)&&/Dur%C3%A9e/.test(href),'mail brief contient les points évoqués');
ok(!/Konat%C3%A9%20Kissima\.%20Vous|R%C3%A9pondez/.test(decodeURIComponent(href).replace(/Cordialement[\s\S]*/,'').split('Ce dont')[1]||''),'brief sans phrases de salutation/confirmation');
await pg.locator('[data-act=rdvdone]').click();
ok(await pg.locator('#rdvmsgbox').count()===0,'après "OK, fait" la carte disparaît');
ok(await pg.evaluate(()=>S.prospects[0].rdvConfSent===true),'envoi marqué, ne revient pas');
ok(errs.length===0,'aucune erreur JS '+errs);await b.close()})();
// plusieurs RDV : aujourd'hui, demain, après-demain, tous visibles ; "demain" corrigé si le RDV est aujourd'hui
(async()=>{const b=await chromium.launch();const pg=await(await b.newContext()).newPage();const errs=[];pg.on('pageerror',e=>errs.push(e.message));
const tmp=fs.mkdtempSync('/tmp/aos-');fs.copyFileSync(path.resolve(__dirname,'../index.html'),tmp+'/index.html');fs.writeFileSync(tmp+'/config.js','window.AOS_CONFIG={url:"",key:""};');
await pg.goto('file://'+tmp+'/index.html');await pg.waitForSelector('.chal');
const ok=(c,m)=>{if(!c){console.log('FAIL',m);process.exitCode=1}else console.log('ok  ',m)};
await pg.evaluate(()=>{S.chal=false;S.lastRDV='';const p2=x=>String(x).padStart(2,'0'),mk=(h,t)=>{const d=new Date(Date.now()+h*36e5);return d.getFullYear()+'-'+p2(d.getMonth()+1)+'-'+p2(d.getDate())+'T'+t};
const t1=new Date(Date.now()+1*36e5),at1=t1.getFullYear()+'-'+p2(t1.getMonth()+1)+'-'+p2(t1.getDate())+'T'+p2(t1.getHours())+':'+p2((t1.getMinutes()+30)%60);
S.prospects=[
{id:'M1',name:'Aujourdhui',phone:'06 11 11 11 11',stage:'rdv',rdvAt:at1,rdvType:'visio',rdvMsgFor:at1,rdvMsgAI:'Bonjour, on se retrouve demain en visio.',rdvMsgAt:new Date(Date.now()-86400000).toISOString()},
{id:'M2',name:'Demain',phone:'06 22 22 22 22',stage:'rdv',rdvAt:mk(24,'14:00'),rdvType:'visio'},
{id:'M3',name:'ApresDemain',phone:'06 33 33 33 33',stage:'rdv',rdvAt:mk(48,'10:00'),rdvType:'visio'}];S.calls=[];S.tab='appels';render()});
ok(await pg.locator('.rdvmsgbox').count()===3,'les 3 RDV (aujourd\'hui, demain, après-demain) ont leur carte');
const today=await pg.evaluate(()=>{const p=S.prospects[0];return String(p.rdvAt).slice(0,10)===today()});
if(today)ok(/aujourd'hui en visio/.test(await pg.locator('.rdvmsgbox').first().inputValue()),'"demain" remplacé par "aujourd\'hui" pour un RDV du jour');
await pg.locator('[data-act=rdvdone][data-id=M2]').click();
ok(await pg.locator('.rdvmsgbox').count()===2&&await pg.locator('.rdvmsgbox[data-id=M2]').count()===0,'"OK, fait" ne retire que la carte concernée');
await pg.fill('.rdvmsgbox[data-id=M3]','Texte modifié M3');
ok((await pg.locator('#rdvbtns-M3 [data-act=copysms]').getAttribute('data-m')).includes('Texte modifié M3'),'boutons de la 3e carte mis à jour');
ok(errs.length===0,'aucune erreur JS '+errs);await b.close()})();
