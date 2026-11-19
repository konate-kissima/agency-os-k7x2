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
{const d=new Date();for(let i=0;i<2;i++)S.calls.push({id:'h'+i,t:d.toISOString(),result:'ans',channel:'appel',prospectId:'hh'+i,prospectName:'H'+i});S.act[today()]=3600;S.act[addDays(today(),-3)]=7200}
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
ok(await pg.locator('details.defi[open]').count()===1,'par défaut : grosses barres visibles (ouvert)');
await pg.locator('details.defi > summary').click();await pg.waitForTimeout(150);
ok(await pg.locator('details.defi[open]').count()===0,'repliable en un clic');
await pg.locator('details.defi > summary').click();await pg.waitForTimeout(150);
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
const hr=await pg.evaluate(()=>({n:hourInfo('n'),r:hourInfo('r'),eff:effInfo(),l:defiLines().join(' | ')}));
ok(hr.n.best>=4&&hr.r.best===3,'meilleure heure : appels et RDV (3 RDV en une heure le jour du record) '+JSON.stringify({n:hr.n.best,r:hr.r.best}));
ok(hr.n.cur>=2,'heure en cours comptée '+hr.n.cur);
ok(/Cette heure/.test(hr.l)&&/meilleure heure/.test(hr.l),'ligne « Cette heure » avec la meilleure heure');
ok(hr.eff.cur>0&&hr.eff.best>0,'efficacité : appels par heure travaillée, aujourd\'hui et meilleur jour '+JSON.stringify(hr.eff));
const co=await pg.evaluate(()=>coachLines().join(' | '));
ok(/Il reste/.test(co)&&/presque|Plus qu|Plus que|manque/.test(co),'coach : message de motivation avec le temps restant : '+co.replace(/<[^>]+>/g,''));
ok(await pg.locator('.dv-row').count()>=5&&await pg.locator('.dv-track .dv-bar').count()>=5,'visuel : barres pour chaque comparaison');
ok(await pg.locator('.dv-day').count()===7&&await pg.locator('.dv-day.today').count()===1,'visuel : série en 7 pastilles dont aujourd\'hui');
ok(await pg.locator('.dv-mark').count()>=3,'visuel : repère « ton meilleur » sur les barres');
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
