const { chromium } = require('playwright');
const path = require('path'), fs = require('fs');
(async () => {
  const b = await chromium.launch();
  const pg = await (await b.newContext()).newPage();
  const errs = []; pg.on('pageerror', e => errs.push(e.message));
  const tmp = fs.mkdtempSync('/tmp/aos-');
  fs.copyFileSync(path.resolve(__dirname, '../index.html'), tmp + '/index.html');
  fs.writeFileSync(tmp + '/config.js', 'window.AOS_CONFIG={url:"",key:""};');
  await pg.goto('file://' + tmp + '/index.html'); await pg.waitForSelector('.chal'); await pg.evaluate(() => { S.chal = false; render() });
  await pg.waitForSelector('nav.tabs');
  const ok = (c, m) => { if (!c) { console.log('FAIL', m); process.exitCode = 1; } else console.log('ok  ', m); };
  const tm = (mins) => pg.evaluate(m => { const d = new Date(Date.now() + m * 60000); return pad(d.getHours()) + ':' + pad(d.getMinutes()) }, mins);
  await pg.evaluate(() => { S.prospects = [
    { id: 'P1', name: 'Alpha', dirigeant: 'Paul', phone: '06 12 34 56 78', email: 'a@x.fr', stage: 'a_contacter' },
    { id: 'P2', name: 'Beta', phone: '01 30 00 00 02', stage: 'a_contacter' },
    { id: 'P3', name: 'Gamma', phone: '06 00 00 00 03', stage: 'contacte', nextDate: today(), nextTime: '00:01' }]; S.calls = []; S.tab = 'appels'; S.call.pid = 'P1'; S.call.open = 'P1'; render(); S.prospects.forEach(p => DB.set('prospects', p.id, p)) });
  await pg.waitForTimeout(300);
  ok(await pg.locator('[data-act=callstep][data-s=ans]').count() === 1 && await pg.locator('[data-act=callres][data-r=nr]').count() === 1, 'étape 1 : Répondu / Pas répondu');
  ok(await pg.locator('[data-r=rep]').count() === 1 && await pg.locator('[data-r=bad]').count() === 1, 'Répondeur + Mauvais numéro visibles');
  // tout fermer
  await pg.evaluate(() => alarmCheck()); ok(await pg.locator('#alarm').count() === 1, 'pop-up de retard affiché');
  await pg.click('[data-act=al-closeall][data-m="60"]');
  ok(await pg.locator('#alarm').count() === 0, 'Tout fermer masque le pop-up');
  await pg.evaluate(() => { alarmCheck() });
  ok(await pg.locator('#alarm').count() === 0, 'reste fermé');
  // à rappeler
  await pg.click('.pill + .pill + .pill + .pill + button, button:has-text("À rappeler (")');
  ok(await pg.locator('text=Gamma').count() > 0, 'liste À rappeler contient Gamma');
  // carte 5 minutes avant
  const t5 = await tm(4);
  await pg.evaluate(t => { byId('P2').stage = 'contacte'; byId('P2').nextDate = today(); byId('P2').nextTime = t; soonCheck() }, t5);
  ok(await pg.locator('#soon').count() === 1, 'carte « dans 5 min » apparaît');
  await pg.click('#soon [data-act=soon-ok]');
  ok(await pg.locator('#soon').count() === 0, 'Compris la ferme');
  // pas répondu = un clic
  await pg.evaluate(() => { S.call.pid = 'P1'; S.call.open = 'P1'; S.call.step = ''; render() });
  await pg.click('button.big[data-r=nr]'); await pg.waitForTimeout(200);
  ok(await pg.evaluate(() => S.calls.length === 1 && S.calls[0].result === 'nr' && !S.calls[0].answered), 'Pas répondu : 1 clic, pas une conversation');
  // RDV visio
  await pg.evaluate(() => { S.call.pid = 'P1'; S.call.open = 'P1'; S.call.step = 'ans'; render() });
  await pg.click('[data-act=callpanel][data-r=rdvv]'); await pg.evaluate(() => document.querySelectorAll('.card details').forEach(d => d.open = true));
  await pg.fill('#pt1', 'pompes à chaleur'); await pg.fill('#pt2', 'plus de devis qualifiés'); await pg.fill('#pt3', 'garder leur marge');
  await pg.fill('#cr', '2026-11-13T16:30'); await pg.click('[data-act=callres][data-r=rdvv]'); await pg.waitForTimeout(300);
  const pr = await pg.evaluate(() => byId('P1'));
  ok(pr.stage === 'rdv' && pr.rdvType === 'visio' && pr.pts.objectif === 'plus de devis qualifiés', 'RDV visio enregistré avec points évoqués');
  const card = await pg.textContent('main'); 
  ok(card.includes('RDV visio pris : Alpha') && card.includes('Bonjour Paul') && card.includes('garder leur marge') && !card.includes('Ça vous va'), 'message de confirmation sans question, avec les points');
  
  ok(await pg.locator('a[href^="whatsapp://send?phone=3361234"]').count() >= 1 && await pg.locator('a[href^="sms:"]').count() >= 1 && await pg.locator('a[href^="https://mail.google.com"]').count() === 1, 'WhatsApp + SMS + Gmail sur mobile');
  // RDV tel (fixe) : stage contacte + nextDate
  await pg.evaluate(() => { S.call.pid = 'P2'; S.call.open = 'P2'; S.call.step = 'ans'; render() });
  await pg.click('[data-act=callpanel][data-r=rdvt]'); await pg.evaluate(() => { S.call.pt2 = 'plus de devis qualifiés'; render() }); await pg.fill('#cr', '2026-11-12T10:00'); await pg.click('[data-act=callres][data-r=rdvt]'); await pg.waitForTimeout(300);
  const p2 = await pg.evaluate(() => byId('P2'));
  ok(p2.stage === 'contacte' && p2.rdvType === 'tel' && p2.nextDate === '2026-11-12' && p2.nextTime === '10:00', 'RDV téléphonique : rappel daté');
  ok((await pg.textContent('main')).includes('plus de devis qualifiés'), 'confirmation du RDV téléphonique avec le résumé de l\'appel');
  // RDV physique exige lieu
  await pg.evaluate(() => { S.call.pid = 'P3'; S.call.open = 'P3'; S.call.step = 'ans'; render() });
  await pg.click('[data-act=callpanel][data-r=rdvp]'); await pg.fill('#cr', '2026-11-12T10:00'); await pg.click('[data-act=callres][data-r=rdvp]');
  ok(/lieu/.test(await pg.textContent('#toast')), 'RDV physique exige le lieu');
  // raccroché au nez = conversation
  await pg.click('[data-act=callpanel][data-r=""]'); await pg.click('[data-r=hu]'); await pg.waitForTimeout(300);
  ok(await pg.evaluate(() => S.calls.some(c => c.result === 'hu' && c.answered && !c.joint)), 'Raccroché au nez compte comme répondu');
  // RDV passé : qualification obligatoire (modal)
  await pg.evaluate(() => { const p = byId('P1'); p.rdvAt = '2026-11-01T10:00'; p.rdvShow = ''; p.stage = 'rdv'; p.rdvType = 'visio'; p.rdvN = 1; alarmCheck() });
  ok(await pg.locator('#rdvq').count() === 1, 'pop-up obligatoire pour qualifier le RDV');
  await pg.click('#rdvq [data-act=rq-go][data-s=tenu]'); await pg.click('#rdvq [data-act=rq-go][data-s=r2]');
  await pg.fill('#rq-at', '2026-11-20T10:00'); await pg.click('#rdvq [data-act=rq-do][data-d=r2]'); await pg.waitForTimeout(300);
  ok(await pg.evaluate(() => byId('P1').rdvN === 2 && byId('P1').stage === 'rdv' && byId('P1').rdvs.length === 1 && byId('P1').rdvs[0].out === 'r2'), 'R1 tenu puis R2 prévu');
  ok(await pg.locator('#rdvq').count() === 0, 'pop-up fermé une fois répondu');
  await pg.evaluate(() => { byId('P1').rdvAt = '2026-11-02T10:00'; alarmCheck() });
  await pg.click('#rdvq [data-act=rq-go][data-s=tenu]'); await pg.click('#rdvq [data-act=rq-go][data-s=signe]');
  await pg.fill('#rq-amt', '3000'); await pg.click('#rdvq [data-act=rq-do][data-d=signe]'); await pg.waitForTimeout(300);
  ok(await pg.evaluate(() => byId('P1').stage === 'signe' && S.clients.some(c => c.prospectId === 'P1' && c.price === 3000)), 'R2 tenu puis signé : client créé à 3000');
  // stats
  await pg.evaluate(() => { S.tab = 'stats'; render() });
  const st = await pg.textContent('main');
  ok(st.includes('Décroché') && st.includes('Présence aux RDV') && st.includes('R2 prévus') && st.includes('Décrochés par jour'), 'page Stats : indicateurs cibles');
  await pg.evaluate(() => { S.tab = 'auj'; render() });
  ok((await pg.textContent('main')).includes('Conversations'), 'Aujourd\'hui : conversations');
  ok(errs.length === 0, 'aucune erreur JS ' + errs.join('|'));
  await b.close();
})();
