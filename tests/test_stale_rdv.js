const { chromium } = require('playwright');
const path = require('path'), fs = require('fs');
(async () => {
  const b = await chromium.launch(); const pg = await (await b.newContext()).newPage();
  const errs = []; pg.on('pageerror', e => errs.push(e.message));
  const tmp = fs.mkdtempSync('/tmp/aos-'); fs.copyFileSync(path.resolve(__dirname, '../index.html'), tmp + '/index.html');
  fs.writeFileSync(tmp + '/config.js', 'window.AOS_CONFIG={url:"",key:""};');
  await pg.goto('file://' + tmp + '/index.html'); await pg.waitForSelector('.chal'); await pg.evaluate(() => { S.chal = false; render() });
  const ok = (c, m) => { if (!c) { console.log('FAIL', m); process.exitCode = 1 } else console.log('ok  ', m) };
  const r = await pg.evaluate(() => {
    const t = today(), y = addDays(t, -2);
    S.prospects.push({ id: 'old', name: 'Vieux RDV', stage: 'contacte', phone: '0612345678', rdvAt: y + 'T14:00', nextDate: addDays(t, -1) });
    S.prospects.push({ id: 'tel', name: 'RDV tel passé', stage: 'contacte', phone: '0612345679', rdvAt: y + 'T14:00', rdvType: 'tel', nextDate: y });
    S.prospects.push({ id: 'sk', name: 'Passée', stage: 'a_contacter', phone: '0612345670' });
    S.tab = 'appels'; render();
    const q = callQueue().map(p => p.id);
    return { q, html: document.body.innerText };
  });
  ok(!r.q.includes('old'), 'RDV passé non qualifié : plus dans la file d\'appels');
  ok(r.q.includes('tel'), 'RDV téléphone passé : reste un rappel normal');
  ok(r.html.includes('RDV passé à qualifier') && r.html.includes('Vieux RDV'), 'bannière « RDV passé à qualifier »');
  await pg.evaluate(() => { S.call.pid = 'sk'; S.call.open = ''; });
  await pg.evaluate(() => document.querySelector('[data-act="callskip"]') ? document.querySelector('[data-act="callskip"]').click() : (S.call.skip.push('sk'), localStorage.setItem('aos_skip_' + today(), JSON.stringify(S.call.skip))));
  await pg.reload(); await pg.waitForSelector('.chal'); await pg.evaluate(() => { S.chal = false; render() });
  ok(await pg.evaluate(() => S.call.skip.includes('sk')), 'les fiches passées restent passées après rechargement');
  ok(errs.length === 0, 'aucune erreur JS ' + errs.join('|'));
  await b.close();
})();
