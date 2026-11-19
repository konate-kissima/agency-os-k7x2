const { chromium } = require('playwright');const path=require('path'),fs=require('fs');
// défis du jour : RDV = visio/physique seulement, paliers, rythme, taux, série ; popup une fois par jour ; bandeau repliable
(async()=>{const b=await chromium.launch();const ctx=await b.newContext();const pg=await ctx.newPage();const errs=[];pg.on('pageerror',e=>errs.push(e.message));
const tmp=fs.mkdtempSync('/tmp/aos-');fs.copyFileSync(path.resolve(__dirname,'../index.html'),tmp+'/index.html');fs.writeFileSync(tmp+'/config.js','window.AOS_CONFIG={url:"",key:""};');
await pg.goto('file://'+tmp+'/index.html');await pg.waitForSelector('.chal');
const ok=(c,m)=>{if(!c){console.log('FAIL',m);process.exitCode=1}else console.log('ok  ',m)};
await pg.evaluate(()=>{let k=0;const mk=(dAgo,h,res)=>{const d=new Date();d.setDate(d.getDate()-dAgo);d.setHours(h,5,0,0);return {id:'c'+(k++),t:d.toISOString(),result:res,channel:'appel',prospectId:'x'+k,prospectName:'P'+k}};
S.calls=[];
// il y a 3 jours : record = 3 RDV réels, 10 appels
for(let i=0;i<7;i++)S.calls.push(mk(3,9+i%5,'ans'));for(let i=0;i<3;i++)S.calls.push(mk(3,12,'rdvv'));
// hier : 1 RDV réel + 2 RDV téléphoniques (ne comptent pas), 6 appels
S.calls.push(mk(1,10,'rdvv'),mk(1,11,'rdvt'),mk(1,11,'rdvt'),mk(1,14,'ans'),mk(1,15,'no'),mk(1,16,'nr'));
// aujourd'hui : 1 RDV réel + 1 tél + 2 appels
S.calls.push(mk(0,0,'rdvv'),mk(0,0,'rdvt'),mk(0,0,'ans'),mk(0,0,'nr'));
S.prospects=[];render()});
// popup
let ch=await pg.locator('.chal').innerText();
ok(/Record de RDV sur une journée/.test(ch)&&/\b3\b/.test(ch),'popup : record de RDV réels = 3 (le tél ne compte pas)');
ok(/Je relève le défi : \d+ RDV/.test(ch),'bouton : défi en RDV');
ok(/Taux de RDV/.test(ch)&&/Série/.test(ch),'popup : taux et série présents');
await pg.click('[data-act=chal-ok]');
ok(await pg.locator('.chal').count()===0,'popup fermée');
await pg.evaluate(()=>{S.tab='appels';render()});
await pg.waitForSelector('details.defi');
const t=await pg.locator('details.defi').innerText();
ok(/RDV/.test(t)&&/Conversations/.test(t)&&/Appels/.test(t),'bandeau : 3 colonnes RDV, conversations, appels');
ok(/Série/.test(t)&&/Taux de RDV/.test(t),'bandeau : série et taux');
const r=await pg.evaluate(()=>({rdv:ladder('r').cur,rec:ladder('r').rec,y:ladder('r').y,streak:rdvStreak().n,streakToday:rdvStreak().todayIn}));
ok(r.rdv===1&&r.rec===3&&r.y===1,'paliers RDV : aujourd\'hui 1, hier 1, record 3 '+JSON.stringify(r));
ok(r.streak===2&&r.streakToday===true,'série : aujourd\'hui + hier (avant-hier sans RDV = rompue) '+JSON.stringify(r));
const pc=await pg.evaluate(()=>paceInfo());
ok(pc&&pc.bn===10&&pc.at<=10,'rythme : comparé au meilleur jour (10 appels) '+JSON.stringify(pc));
// popup une seule fois par jour
await pg.reload();await pg.waitForTimeout(1500);
ok(await pg.locator('.chal').count()===0,'après rechargement le même jour : pas de popup');
// repli mémorisé
await pg.evaluate(()=>{S.tab='appels';render()});await pg.waitForSelector('details.defi');
await pg.locator('details.defi > summary').click();await pg.waitForTimeout(150);
await pg.evaluate(()=>render());await pg.waitForTimeout(100);
ok(await pg.locator('details.defi[open]').count()===0,'bandeau replié : reste replié');
ok(errs.length===0,'aucune erreur JS '+errs);await b.close()})();
