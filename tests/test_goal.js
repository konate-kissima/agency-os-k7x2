const { chromium } = require('playwright');
const path = require('path'), fs = require('fs');
(async () => {
  const b = await chromium.launch();
  const pg = await (await b.newContext()).newPage();
  const errs = [];
  pg.on('pageerror', e => errs.push('pageerror: ' + e.message));
  const tmp = fs.mkdtempSync('/tmp/aos-');
  fs.copyFileSync(path.resolve(__dirname, '../index.html'), tmp + '/index.html');
  fs.writeFileSync(tmp + '/config.js', 'window.AOS_CONFIG={url:"",key:""};');
  await pg.goto('file://' + tmp + '/index.html'); await pg.waitForSelector('.chal'); await pg.evaluate(() => { S.chal = false; render() });
  await pg.waitForSelector('nav.tabs');
  const ok = (c, m) => { if (!c) { console.log('FAIL', m); process.exitCode = 1; } else console.log('ok  ', m); };
  await pg.evaluate(() => { S.tab = 'auj'; S.clients = []; S.prospects = []; S.calls = []; render() });
  let txt = await pg.locator('main').innerText();
  ok(/Objectif 8 000 à 10 000/.test(txt) || /Objectif 8\s?000 à 10\s?000/.test(txt), 'carte objectif affichée');
  ok(/Prochain jalon/.test(txt), 'prochain jalon affiché');
  ok(/hypothèses/.test(txt), 'taux de départ signalés comme hypothèses');
  const g0 = await pg.evaluate(() => goalCalc());
  ok(g0.signed === 0 && g0.cash === 0, 'zéro client : 0 signature, 0 € encaissé');
  ok(g0.need && g0.need.n >= 1 && g0.need.calls > 0 && g0.need.perDay > 0, 'appels nécessaires calculés');
  await pg.evaluate(() => {
    const t = today();
    S.clients = [
      { id: 'c1', name: 'A', price: 3000, signedAt: t, status: 'live', metrics: [{ d: t, spend: 100, leads: 25, qual: 21, jobs: 0 }] },
      { id: 'c2', name: 'B', price: 3000, signedAt: t, status: 'onboarding', metrics: [] },
      { id: 'c3', name: 'C', price: 3000, signedAt: t, status: 'onboarding', metrics: [] }
    ];
    render();
  });
  const g1 = await pg.evaluate(() => goalCalc());
  ok(g1.signed === 3 && g1.cash === 3000 + 1500 + 1500, 'cash estimé = acomptes + 2e paiement si 20 qualifiés (7 500)');
  ok(g1.need && g1.need.n === 4, 'avec 3 signatures le prochain jalon est 4');
  ok(errs.length === 0, 'aucune erreur JS ' + errs.join(';'));
  await b.close();
})();
