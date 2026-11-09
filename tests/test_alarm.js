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
  await pg.evaluate(() => {
    const t = today();
    S.prospects = [
      { id: 'A', name: 'Alpha', phone: '01 30 11 11 11', stage: 'contacte', nextDate: t, nextTime: '00:00' },
      { id: 'B', name: 'Beta', phone: '01 30 22 22 22', stage: 'contacte', nextDate: t, nextTime: '23:59' },
      { id: 'C', name: 'Gamma', phone: '01 30 33 33 33', stage: 'contacte', nextDate: t }
    ];
    S.calls = []; S.snooze = {}; alarmCheck();
  });
  ok(await pg.locator('#alarm').count() === 1, 'pop-up affiché pour le rappel dû');
  const txt = await pg.locator('#alarm').innerText();
  ok(txt.includes('Alpha') && !txt.includes('Beta') && !txt.includes('Gamma'), 'seul Alpha (heure passée) est listé');
  await pg.click('[data-act="al-snooze"]');
  ok(await pg.locator('#alarm').count() === 0, 'report 5 min : pop-up masqué');
  await pg.evaluate(() => { S.snooze = {}; alarmCheck() });
  ok(await pg.locator('#alarm').count() === 1, 'le pop-up revient après le report');
  await pg.click('[data-act="al-open"]');
  ok(await pg.evaluate(() => S.tab === 'appels' && S.call.open === 'A'), 'Ouvrir la fiche : onglet Appels sur Alpha');
  ok(await pg.locator('#alarm').count() === 0, 'pop-up masqué après ouverture');
  await pg.evaluate(() => { S.snooze = {}; alarmCheck() });
  ok(await pg.locator('#alarm').count() === 1, 'toujours là tant que pas appelé');
  await pg.evaluate(async () => { document.getElementById('cn').value = 'test'; await callResult('nr') });
  const st = await pg.evaluate(() => ({ nt: byId('A').nextTime, n: dueCallbacks().length }));
  ok(st.nt === '' && st.n === 0, 'résultat enregistré : heure effacée, plus de pop-up');
  await pg.evaluate(async () => { S.call.open = 'A'; S.call.pid = 'A'; S.call.step = 'ans'; S.call.panel = 'rap'; render(); document.getElementById('cd').value = addDays(today(), 1); document.getElementById('ct').value = '14:30'; await callResult('rap') });
  const st2 = await pg.evaluate(() => ({ d: byId('A').nextDate, t: byId('A').nextTime }));
  ok(st2.t === '14:30' && st2.d === (await pg.evaluate(() => addDays(today(), 1))), 'rappel : date + heure enregistrées');
  ok(errs.length === 0, 'aucune erreur JS ' + errs.join('|'));
  await b.close();
})();
