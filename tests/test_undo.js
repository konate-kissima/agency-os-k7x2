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
  await pg.evaluate(async () => {
    const mk = (id, name, score) => ({ id, name, phone: '06 30 00 00 0' + id.slice(-1), stage: 'a_contacter', city: 'Poissy', score });
    S.prospects = [mk('U1', 'Un Test', 99), mk('U2', 'Deux Test', 50)]; S.calls = [];
    for (const p of S.prospects) await DB.set('prospects', p.id, p);
    S.tab = 'appels'; S.call.pid = 'U1'; S.call.open = 'U1'; S.call.step = ''; S.call.panel = ''; render();
  });
  // écran de départ simplifié
  ok(await pg.locator('.cres2 [data-act=callstep][data-s=ans]').count() === 1 && await pg.locator('.cres2 [data-r=nr]').count() === 1 && await pg.locator('.cres2 [data-r=bad]').count() === 1, 'départ : Répondu, Pas répondu, Mauvais n°');
  ok(await pg.locator('[data-r=rep]').count() === 0, 'plus de bouton Répondeur');
  ok(await pg.locator('.cres [data-r=rdvv]').count() === 0 && await pg.locator('[data-act=mailprep]').count() === 0, 'résultats de conversation et mail de suivi masqués au départ');
  ok(await pg.locator('[data-act=callskip]').count() >= 1, 'Passer reste disponible');
  // touche R = pas répondu
  await pg.keyboard.press('r');
  await pg.waitForTimeout(400);
  let st = await pg.evaluate(() => { const p = byId('U1'); return { r: p.lastResult, t: p.touches, n: S.calls.length, u: !!S.undo } });
  ok(st.r === 'nr' && st.n === 1 && st.u, 'touche R = Pas répondu (le répondeur est inclus) : ' + JSON.stringify(st));
  ok(await pg.locator('[data-act=calundo]').count() === 1, 'bouton « Annuler, il a répondu » affiché');
  // annulation
  await pg.locator('[data-act=calundo]').click();
  await pg.waitForTimeout(400);
  st = await pg.evaluate(() => { const p = byId('U1'); return { r: p.lastResult || null, t: p.touches || 0, stage: p.stage, n: S.calls.length, pid: S.call.pid, step: S.call.step, u: !!S.undo } });
  ok(st.r === null && st.t === 0 && st.stage === 'a_contacter' && st.n === 0, 'appel annulé : fiche et historique restaurés : ' + JSON.stringify(st));
  ok(st.pid === 'U1' && st.step === 'ans', 'la fiche est rouverte à l\'étape « Répondu »');
  ok(await pg.locator('.cres [data-r=rdvv]').count() === 1, 'les résultats de conversation sont visibles pour noter la vraie réponse');
  // enregistrer ensuite un vrai résultat
  await pg.locator('.cres [data-r=ans]').first().click();
  await pg.waitForTimeout(400);
  st = await pg.evaluate(() => { const p = byId('U1'); return { r: p.lastResult, n: S.calls.length, u: !!S.undo } });
  ok(st.r === 'ans' && st.n === 1 && st.u, 'le vrai résultat s\'enregistre ensuite : ' + JSON.stringify(st));
  // pas d'annulation pour un pas intéressé
  await pg.evaluate(() => { S.call.pid = 'U2'; S.call.open = 'U2'; S.call.step = 'ans'; render() });
  await pg.evaluate(async () => { await doCallRes('no') });
  await pg.waitForTimeout(300);
  ok(await pg.evaluate(() => !S.undo), 'pas de bouton Annuler après un « Pas intéressé »');
  ok(errs.length === 0, 'aucune erreur JS ' + errs.join('|'));
  await b.close();
})();
