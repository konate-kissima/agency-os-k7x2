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
S.calls.push(mk(1,10,'rdvv'),mk(1,10,'rdvv'),mk(1,11,'rdvt'),mk(1,11,'rdvt'),mk(1,14,'ans'),mk(1,15,'no'),mk(1,16,'nr'));
// aujourd'hui : 1 RDV réel + 1 tél + 2 appels
S.calls.push(mk(0,0,'rdvv'),mk(0,0,'rdvv'),mk(0,0,'rdvt'),mk(0,0,'ans'),mk(0,0,'nr'));
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
ok(/RDV placés/.test(t)&&/Vraies conversations/.test(t)&&/Appels/.test(t),'bandeau : 3 colonnes RDV placés, vraies conversations, appels');
ok(/Série/.test(t)&&/Taux de RDV/.test(t),'bandeau : série et taux');
const r=await pg.evaluate(()=>({rdv:ladder('r').cur,rec:ladder('r').rec,y:2,streak:rdvStreak().n,streakToday:rdvStreak().todayIn,txt:ladderTxt(ladder('r'))}));
ok(r.rdv===2&&r.rec===3&&r.y===2,'paliers RDV : aujourd\'hui 2, hier 2, record 3 '+JSON.stringify(r));
ok(r.streak>=2&&r.streakToday===true,'série : jours d\'affilée avec au moins 2 RDV (aujourd\'hui + hier) '+JSON.stringify(r));
const pc=await pg.evaluate(()=>paceInfo());
ok(pc&&pc.bn===10&&pc.at<=10,'rythme : comparé au meilleur jour (10 appels) '+JSON.stringify(pc));
ok(/encore <b>2<\/b> pour battre ton record \(3,/.test(r.txt),'comparaison toujours au record : '+r.txt);
const lines=await pg.evaluate(()=>defiLines().join(' | '));
ok(/RDV placés/.test(lines)&&/vraies conversations/.test(lines)&&/appels/.test(lines)&&/ton meilleur jour/.test(lines),'rythme de chaque indicateur contre son meilleur jour');
ok(!/hier \(|ta moyenne/.test(await pg.locator('details.defi').innerText()),'plus de paliers intermédiaires (hier, moyenne)');
// zones de couleur : RDV 0 rouge, 1 orange, 2 vert, 5+ top ; conversations vert dès 60 % des décrochés
const z=await pg.evaluate(()=>({a:rdvZone(0),b:rdvZone(1),c:rdvZone(2),d:rdvZone(4),e:convZone(.7),f:convZone(.5),g:convZone(.2),h:convZone(null),t5:/top/.test(rdvTierTxt(5)),t2:/objectif tenu/.test(rdvTierTxt(2))}));
ok(z.a==='r'&&z.b==='o'&&z.c==='g'&&z.d==='g','RDV : 0 rouge, 1 orange, 2 et 4 vert '+JSON.stringify(z));
ok(z.e==='g'&&z.f==='o'&&z.g==='r'&&z.h==='','conversations : 70 % vert, 50 % orange, 20 % rouge, aucune donnée sans pastille');
ok(z.t5&&z.t2,'textes : 5 RDV = le top, 2 = objectif tenu');
ok(await pg.locator('.pill:has-text("RDV") .zdot').count()===1&&await pg.locator('.pill:has-text("vraies conversations") .zdot').count()===1,'pastilles RDV et vraies conversations ont un point de couleur');
ok(await pg.locator('.defic.star .zdot').count()===1,'bandeau : colonne RDV avec point de couleur');
// popup une seule fois par jour
await pg.reload();await pg.waitForTimeout(1500);
ok(await pg.locator('.chal').count()===0,'après rechargement le même jour : pas de popup');
// repli mémorisé
await pg.evaluate(()=>{S.tab='appels';render()});await pg.waitForSelector('details.defi');
await pg.locator('details.defi > summary').click();await pg.waitForTimeout(150);
await pg.evaluate(()=>render());await pg.waitForTimeout(100);
ok(await pg.locator('details.defi[open]').count()===0,'bandeau replié : reste replié');
ok(errs.length===0,'aucune erreur JS '+errs);await b.close()})();
