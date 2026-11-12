const { chromium } = require('playwright');
const path = require('path'), fs = require('fs');
(async () => {
  const b = await chromium.launch(); const pg = await (await b.newContext()).newPage();
  const errs = []; pg.on('pageerror', e => errs.push(e.message));
  const tmp = fs.mkdtempSync('/tmp/aos-'); fs.copyFileSync(path.resolve(__dirname, '../index.html'), tmp + '/index.html');
  fs.writeFileSync(tmp + '/config.js', 'window.AOS_CONFIG={url:"",key:""};');
  await pg.goto('file://' + tmp + '/index.html'); await pg.waitForSelector('.chal'); await pg.evaluate(() => { S.chal = false; render() });
  const ok = (c, m) => { if (!c) { console.log('FAIL', m); process.exitCode = 1 } else console.log('ok  ', m) };
  await pg.evaluate(() => { window.__stopped = 0; S.rec.on = true; S.rec.mr = { state: 'recording', stop() { window.__stopped++; this.state = 'inactive' } }; recAsk() });
  ok(await pg.locator('#recask').count() === 1, 'question affichée après 30 min');
  await pg.click('[data-act=rec-keep]');
  ok(await pg.locator('#recask').count() === 0 && await pg.evaluate(() => window.__stopped) === 0, '« Oui, continuer » : on continue');
  await pg.evaluate(() => recAsk()); await pg.click('[data-act=rec-end]');
  ok(await pg.evaluate(() => window.__stopped) === 1 && await pg.locator('#recask').count() === 0, '« Non, arrêter » : enregistrement arrêté');
  ok(errs.length === 0, 'aucune erreur JS ' + errs.join('|'));
  await b.close();
})();
