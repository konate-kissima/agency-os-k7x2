const { chromium } = require('playwright');
const path = require('path'), fs = require('fs');
(async () => {
  const b = await chromium.launch(); const pg = await (await b.newContext()).newPage();
  const errs = []; pg.on('pageerror', e => errs.push(e.message));
  const tmp = fs.mkdtempSync('/tmp/aos-'); fs.copyFileSync(path.resolve(__dirname, '../index.html'), tmp + '/index.html');
  fs.writeFileSync(tmp + '/config.js', 'window.AOS_CONFIG={url:"",key:""};');
  await pg.goto('file://' + tmp + '/index.html'); await pg.waitForSelector('.chal'); await pg.evaluate(() => { S.chal = false; render() });
  const ok = (c, m) => { if (!c) { console.log('FAIL', m); process.exitCode = 1 } else console.log('ok  ', m) };
  const y = new Date().getFullYear();
  // 1) ordre de la file : moins de 5 ans d'abord, puis 5-9 ans, puis 10 ans et plus
  await pg.evaluate(async ([y]) => {
    const mk = (id, name, yr, score) => ({ id, name, stage: 'a_contacter', phone: '06 12 34 56 7' + id.slice(-1), score, created_co: yr + '-03-01' });
    S.prospects.length = 0; S.calls.length = 0;
    for (const p of [mk('p1', 'Ancienne SARL', y - 20, 99), mk('p2', 'Moyenne SARL', y - 7, 98), mk('p3', 'Jeune SARL', y - 2, 50)]) { const { id, ...d } = p; await DB.set('prospects', id, d); S.prospects.push(p) }
    S.call.skip = []; S.call.pid = ''; S.call.open = ''; render();
  }, [y]);
  const order = await pg.evaluate(() => callQueue().map(p => p.name));
  ok(order.join('|') === 'Jeune SARL|Moyenne SARL|Ancienne SARL', 'file d\'appels : plus jeune d\'abord ' + order.join('|'));
  // 2) RDV visio : la fiche reste ouverte avec « Fiche suivante »
  await pg.waitForTimeout(200);
  const first = await pg.evaluate(() => S.call.pid);
  await pg.keyboard.press('a'); await pg.waitForTimeout(150);
  await pg.keyboard.press('1'); await pg.waitForTimeout(150);
  await pg.evaluate(() => { const d = new Date(Date.now() + 36e5 * 30), z = n => String(n).padStart(2, '0'); document.getElementById('cr').value = d.getFullYear() + '-' + z(d.getMonth() + 1) + '-' + z(d.getDate()) + 'T10:00' });
  await pg.click('[data-act="callres"][data-r="rdvv"]'); await pg.waitForTimeout(500);
  ok(await pg.locator('[data-act="callnext"]').count() === 1, 'après « RDV visio pris » : bouton « Fiche suivante » affiché');
  ok(await pg.evaluate(f => S.call.pid === f && S.call.hold === f, first), 'la fiche reste ouverte (pas de saut automatique)');
  ok((await pg.innerText('main')).includes('RDV visio pris'), 'carte de confirmation du RDV visible pendant l\'appel');
  ok(await pg.evaluate(f => byId(f).stage === 'rdv', first), 'le RDV est bien enregistré tout de suite');
  await pg.click('[data-act="callnext"]'); await pg.waitForTimeout(400);
  const next = await pg.evaluate(() => S.call.pid);
  ok(next && next !== first && await pg.locator('[data-act="callnext"]').count() === 0, 'clic sur « Fiche suivante » : fiche suivante');
  ok(errs.length === 0, 'aucune erreur JS ' + errs.join('|'));
  await b.close();
})();
