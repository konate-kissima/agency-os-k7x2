const { chromium } = require('playwright');
const path = require('path'), fs = require('fs');
(async () => {
  const b = await chromium.launch(); const pg = await (await b.newContext()).newPage();
  const errs = []; pg.on('pageerror', e => errs.push(e.message));
  const tmp = fs.mkdtempSync('/tmp/aos-'); fs.copyFileSync(path.resolve(__dirname, '../index.html'), tmp + '/index.html');
  fs.writeFileSync(tmp + '/config.js', 'window.AOS_CONFIG={url:"",key:""};');
  await pg.goto('file://' + tmp + '/index.html'); await pg.waitForSelector('.chal'); await pg.evaluate(() => { S.chal = false; render() });
  const ok = (c, m) => { if (!c) { console.log('FAIL', m); process.exitCode = 1 } else console.log('ok  ', m) };
  const r = await pg.evaluate(() => ({
    abs: rdvLine({ rdvAt: '2026-11-10T10:00', rdvShow: 'absent', nextDate: '2026-11-11', nextTime: '10:00' }),
    fut: rdvLine({ rdvAt: '2099-01-05T14:30', rdvType: 'visio' }),
    tenu: rdvLine({ rdvAt: '2026-11-10T10:00', rdvShow: 'tenu' }),
    none: rdvLine({})
  }));
  ok(r.abs.includes('10/11') && r.abs.includes('absent') && r.abs.includes('rappel le 11/11'), 'absent : date, statut et rappel ' + r.abs);
  ok(r.fut.includes('à venir') && r.fut.includes('visio'), 'RDV à venir');
  ok(r.tenu.includes('tenu'), 'RDV tenu'); ok(r.none === '', 'pas de RDV : rien');
  ok(errs.length === 0, 'aucune erreur JS ' + errs.join('|'));
  await b.close();
})();
