const { chromium } = require('playwright');
const path = require('path'), fs = require('fs');
(async () => {
  const b = await chromium.launch();
  const pg = await (await b.newContext()).newPage();
  const errs = [];
  pg.on('pageerror', e => errs.push(e.message));
  const tmp = fs.mkdtempSync('/tmp/aos-');
  fs.copyFileSync(path.resolve(__dirname, '../index.html'), tmp + '/index.html');
  fs.writeFileSync(tmp + '/config.js', 'window.AOS_CONFIG={url:"",key:""};');
  await pg.goto('file://' + tmp + '/index.html'); await pg.waitForSelector('.chal'); await pg.evaluate(() => { S.chal = false; render() });
  await pg.waitForSelector('nav.tabs');
  const ok = (c, m) => { if (!c) { console.log('FAIL', m); process.exitCode = 1; } else console.log('ok  ', m); };
  await pg.evaluate(async () => { const P = { name: 'Plomberie Durand', phone: '01 30 00 00 05', stage: 'a_contacter', city: 'Poissy', instagram: 'durand_plomberie', facebook: 'durandplomberie' }; await DB.set('prospects', 'A1', P); S.prospects = [{ id: 'A1', ...P }]; S.calls = []; S.clients=[]; S.tab = 'appels'; S.call.pid = ''; render() });
  ok(await pg.locator('.callcard a[href*="instagram.com/durand_plomberie"]').count() === 1, 'lien Instagram sur la fiche d\'appel');
  ok(await pg.locator('.callcard a[href*="facebook.com/durandplomberie"]').count() === 1, 'lien Facebook sur la fiche d\'appel');
  const href = await pg.locator('.callcard .adsb a').getAttribute('href');
  ok(/facebook\.com\/ads\/library\/.*q=Plomberie%20Durand/.test(href), 'lien Bibliothèque publicitaire cherché sur le nom : ' + href);
  ok((await pg.locator('.callcard .adsb a').innerText()).includes('Pub Meta potentielle'), 'libellé « Pub Meta potentielle » par défaut');
  await pg.locator('#cn').fill('note en cours');
  await pg.selectOption('#adsm', 'oui');
  await pg.waitForTimeout(200);
  const st = await pg.evaluate(() => ({ v: S.prospects[0].adsMeta, at: S.prospects[0].adsMetaAt, note: document.querySelector('#cn').value }));
  ok(st.v === 'oui' && /^\d{4}-\d\d-\d\dT/.test(st.at), 'choix « fait de la pub » enregistré avec date et heure ' + st.at);
  ok(st.note === 'note en cours', 'la note en cours n\'est pas perdue');
  ok((await pg.locator('.callcard .adsb a').innerText()).includes('vue le'), 'libellé mis à jour avec la date');
  // DM tab
  await pg.evaluate(() => { S.tab = 'outreach'; S.out.pid=''; render() });
  ok(await pg.locator('.adsb').count() >= 1, 'bloc Pub Meta aussi dans DM & vidéos');
  // Stats journal
  await pg.evaluate(() => { S.calls.push({ id: 'c1', prospectId: 'A1', prospectName: 'Plomberie Durand', t: new Date().toISOString(), hour: 14, result: 'rdv', joint: true, obj: 'Pas le temps', note: 'RDV lundi' }); S.clients=[{id:'k1',name:'Renobtp',signedAt:'2026-11-12'}]; S.st.days=0; S.tab = 'donnees'; render(); document.querySelectorAll('details').forEach(d=>d.open=true) });
  const txt = await pg.locator('main, body').first().innerText();
  ok(/Journal daté/.test(txt), 'section « Journal daté » dans Données');
  ok(/Plomberie Durand/.test(txt) && /Renobtp/.test(txt) && /Signé/.test(txt), 'journal : appel, signature client listés');
  ok(/2026|20\d\d/.test(await pg.locator('table:has-text("Date et heure")').innerText()), 'dates complètes avec année');
  ok(errs.length === 0, 'aucune erreur JS ' + errs.join('|'));
  await b.close();
})();
