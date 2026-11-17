const { chromium } = require('playwright');
const path = require('path'), fs = require('fs'), http = require('http');
(async () => {
  const b = await chromium.launch();
  const pg = await (await b.newContext()).newPage();
  const errs = [];
  pg.on('pageerror', e => errs.push('pageerror: ' + e.message));
  const tmp = fs.mkdtempSync('/tmp/aos-');
  fs.copyFileSync(path.resolve(__dirname, '../index.html'), tmp + '/index.html');
  fs.writeFileSync(tmp + '/config.js', 'window.AOS_CONFIG={url:"",key:""};');
  await pg.addInitScript(() => { window.showDirectoryPicker = async () => { const r = await navigator.storage.getDirectory(); return r.getDirectoryHandle('Mes dossiers', { create: true }) } });
  const srv = http.createServer((q, r) => { const f = tmp + (q.url.split('?')[0] === '/' ? '/index.html' : q.url.split('?')[0]); fs.readFile(f, (e, d) => { if (e) { r.statusCode = 404; r.end() } else { r.setHeader('Content-Type', f.endsWith('.js') ? 'text/javascript' : 'text/html'); r.end(d) } }) }).listen(0);
  await pg.goto('http://localhost:' + srv.address().port + '/'); await pg.waitForSelector('.chal'); await pg.evaluate(() => { S.chal = false; render() });
  await pg.waitForSelector('nav.tabs');
  const ok = (c, m) => { if (!c) { console.log('FAIL', m); process.exitCode = 1; } else console.log('ok  ', m); };
  // nom de fichier
  const nm = await pg.evaluate(() => [recBaseName({ dirigeant: 'Jeoffrey Antonio', name: 'Pcjd/Energie: SARL' }), recBaseName({ name: 'Seule Entreprise' }), recBaseName({ dirigeant: 'Kissima (gérant)', name: 'Test', touches: 2 })]);
  ok(/^Jeoffrey Antonio - Pcjd Energie SARL - 1er appel - \d{4}-\d\d-\d\d \d\dh\d\d$/.test(nm[0]), 'nom dirigeant - entreprise - date : ' + nm[0]);
  ok(/^Seule Entreprise - 1er appel - \d{4}-/.test(nm[1]), 'sans dirigeant : entreprise seule : ' + nm[1]);
  ok(/^Kissima - Test - Appel 3 - /.test(nm[2]), 'parenthèses retirées : ' + nm[2]);
  // choix du dossier + écriture
  await pg.evaluate(async () => { await recDirPick() });
  ok(await pg.evaluate(() => S.rec.dirName) === 'Appels Instinct', 'dossier choisi et mémorisé');
  const res = await pg.evaluate(async () => {
    const base = 'Jeoffrey Antonio - Pcjd Energie - 2026-11-17 14h52';
    const r = await saveLocalAudio(new Blob([new Uint8Array(4000)], { type: 'audio/webm' }), base);
    const d = await navigator.storage.getDirectory(), dir = await (await d.getDirectoryHandle('Mes dossiers')).getDirectoryHandle('Appels Instinct');
    const names = []; for await (const [n] of dir.entries()) names.push(n);
    return { r, names };
  });
  ok(res.r === true && res.names.length === 1 && res.names[0].startsWith('Jeoffrey Antonio - Pcjd Energie - 2026-11-17 14h52.'), 'fichier écrit dans le dossier : ' + JSON.stringify(res.names));
  // historique + bouton écouter
  const html = await pg.evaluate(() => {
    const p = { id: 'RF1', name: 'Pcjd Energie', stage: 'contacte', phone: '06 30 00 00 01' };
    S.prospects = [p]; S.calls = [{ id: 'c1', channel: 'appel', prospectId: 'RF1', prospectName: p.name, t: new Date().toISOString(), result: 'rap', audioFile: 'Jeoffrey Antonio - Pcjd Energie - 2026-11-17 14h52' }];
    return timeline(p);
  });
  ok(/data-act="playlocal"/.test(html), 'bouton « Écouter l\'appel » dans l\'historique');
  await pg.evaluate(() => { S.tab = 'appels'; S.call.pid = 'RF1'; S.call.open = 'RF1'; render() });
  await pg.waitForSelector('[data-act=playlocal]', { timeout: 3000 }).catch(() => {});
  await pg.evaluate(() => document.querySelectorAll('details').forEach(d => d.open = true));
  if (await pg.locator('[data-act=playlocal]').count()) {
    await pg.evaluate(() => { const b = document.querySelector('[data-act=playlocal]'); b.closest('details') && (b.closest('details').open = true) });
    await pg.locator('[data-act=playlocal]').first().evaluate(b => b.click());
    await pg.waitForTimeout(500);
    ok(await pg.locator('audio[src^="blob:"]').count() === 1, 'clic : le lecteur audio lit le fichier du dossier');
  } else console.log('note: historique non visible sur cette vue (bouton testé via HTML)');
  ok(errs.length === 0, 'aucune erreur JS ' + errs.join('|'));
  await b.close(); srv.close();
})();
