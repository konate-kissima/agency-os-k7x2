const { chromium } = require('playwright');
const path = require('path'), fs = require('fs');
(async () => {
  const b = await chromium.launch(); const pg = await (await b.newContext()).newPage(); const errs = [];
  pg.on('pageerror', e => errs.push(e.message));
  const tmp = fs.mkdtempSync('/tmp/aos-'); fs.copyFileSync(path.resolve(__dirname, '../index.html'), tmp + '/index.html');
  fs.writeFileSync(tmp + '/config.js', 'window.AOS_CONFIG={url:"",key:""};');
  await pg.goto('file://' + tmp + '/index.html'); await pg.waitForSelector('.chal'); await pg.evaluate(() => { S.chal = false; render() });
  await pg.waitForSelector('nav.tabs');
  const ok = (c, m) => { if (!c) { console.log('FAIL', m); process.exitCode = 1 } else console.log('ok  ', m) };
  await pg.evaluate(() => { const n = new Date(); S.calls = [{ id: 'a', prospectId: 'x', t: n.toISOString(), hour: 10, result: 'rdv', channel: 'appel', obj: 'Pas le temps' }, { id: 'b', prospectId: 'y', t: n.toISOString(), hour: 15, result: 'nr', channel: 'appel' }]; S.tab = 'stats'; S.st.days = 'm'; render() });
  ok(await pg.locator('.chartcard svg').count() >= 4, 'au moins 4 graphiques');
  const t = await pg.locator('main').innerText(); ok(/Entonnoir/.test(t) && /Appels par jour/.test(t) && /progression/.test(t), 'titres des graphiques');
  ok(await pg.locator('details:has-text("Détails chiffrés")').count() === 1, 'tableaux repliés');
  ok(errs.length === 0, 'aucune erreur JS ' + errs.join('|'));
  await pg.screenshot({ path: '/tmp/stats.png', fullPage: true });
  await b.close();
})();
