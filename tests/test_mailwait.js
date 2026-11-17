const { chromium } = require('playwright');
const path = require('path'), fs = require('fs');
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext();
  const pg = await ctx.newPage();
  const errs = [];
  pg.on('pageerror', e => errs.push('pageerror: ' + e.message));
  const tmp = fs.mkdtempSync('/tmp/aos-');
  fs.copyFileSync(path.resolve(__dirname, '../index.html'), tmp + '/index.html');
  fs.writeFileSync(tmp + '/config.js', 'window.AOS_CONFIG={url:"",key:""};');
  await pg.goto('file://' + tmp + '/index.html'); await pg.waitForSelector('.chal'); await pg.evaluate(() => { S.chal = false; render() });
  await pg.waitForSelector('nav.tabs');
  const ok = (c, m) => { if (!c) { console.log('FAIL', m); process.exitCode = 1; } else console.log('ok  ', m); };
  await pg.evaluate(async () => {
    window.open = () => null;
    const mk = (id, name, extra) => ({ id, name, phone: '06 30 00 00 0' + id.slice(-1), stage: 'a_contacter', city: 'Poissy', score: 50, ...extra });
    S.prospects = [mk('P1', 'Milair Test', { score: 10, email: 'milair@outlook.fr' }), mk('P2', 'Nouvelle Une', { score: 90 }), mk('P3', 'Nouvelle Deux', { score: 80 }), mk('P4', 'Perdue Repond', { stage: 'perdu', score: 5 })];
    for (const p of S.prospects) await DB.set('prospects', p.id, p);
    S.tab = 'appels'; S.call.open = 'P1'; S.call.pid = 'P1'; S.call.step = ''; S.call.mail = { to: 'milair@outlook.fr', su: 'Suite', body: 'Bonjour' }; S.call.panel = 'mail'; render();
  });
  await pg.locator('[data-act=mailgmail]').first().click();
  await pg.waitForTimeout(300);
  const st = await pg.evaluate(() => { const p = byId('P1'); return { sent: p.mailSent, due: p.mailDue, t: today(), w5: workday(5), pid: S.call.pid, q: callQueue().map(x => x.id) } });
  ok(st.sent === st.t && st.due === st.w5, 'mail envoyé : date du jour + retour dans 5 jours ouvrés (' + st.due + ')');
  ok(st.pid !== 'P1' && !st.q.includes('P1'), 'la fiche sort de la file et on passe à la suivante : ' + st.q.join(','));
  ok((await pg.evaluate(() => mailWaitCard())).includes('Milair Test'), 'liste « en attente de réponse » affiche la fiche');
  // bouton manuel
  await pg.evaluate(() => { S.tab = 'appels'; S.call.open = ''; S.call.pid = ''; render() });
  await pg.locator('summary:has-text("en attente de réponse")').click();
  await pg.locator('[data-act=mailreply][data-id=P1]').click();
  await pg.waitForTimeout(300);
  let q = await pg.evaluate(() => callQueue().map(x => x.id));
  ok(q[0] === 'P1', 'réponse notée : la fiche passe en haut de la file malgré un score plus bas : ' + q.join(','));
  // réponse sur fiche perdue
  await pg.evaluate(() => { Object.assign(byId('P4'), { mailSent: today(), mailDue: workday(5), mailReply: new Date().toISOString(), mailReplyTxt: 'Ça m\'intéresse, rappelez-moi.' }); });
  q = await pg.evaluate(() => callQueue().map(x => x.id));
  ok(q.includes('P4') && q.indexOf('P4') < q.indexOf('P2'), 'une réponse sur une fiche « perdue » revient aussi devant : ' + q.join(','));
  // affichage de la boîte réponse
  await pg.evaluate(() => { S.call.open = 'P4'; S.call.pid = 'P4'; render() });
  const txt = await pg.locator('.callcard').innerText();
  ok(txt.includes('Il a répondu à ton mail') && txt.includes('rappelez-moi'), 'boîte « Il a répondu » avec le texte sur la fiche');
  // mail rejeté : pas en haut
  await pg.evaluate(() => { Object.assign(byId('P3'), { mailSent: today(), mailDue: '', mailReply: new Date().toISOString(), mailBounce: true }); });
  q = await pg.evaluate(() => callQueue().map(x => x.id));
  ok(q.indexOf('P3') > q.indexOf('P2') || q.indexOf('P3') === -1, 'mail rejeté : retour normal, pas en tête : ' + q.join(','));
  // résultat enregistré : l'état « réponse » disparaît
  await pg.evaluate(async () => { S.call.pid = 'P1'; S.call.open = 'P1'; S.call.step = 'ans'; render(); await doCallRes('ans') });
  await pg.waitForTimeout(300);
  const p1 = await pg.evaluate(() => { const p = byId('P1'); return { r: p.mailReply, d: p.mailDue, st: p.stage } });
  ok(!p1.r && !p1.d, 'résultat d\'appel enregistré : état « réponse » effacé (' + p1.st + ')');
  // retour automatique après l'échéance
  await pg.evaluate(() => { Object.assign(byId('P2'), { mailSent: '2026-11-10', mailDue: '2026-11-16' }); });
  ok((await pg.evaluate(() => callQueue().map(x => x.id))).includes('P2'), 'échéance dépassée : la fiche revient dans la file');
  await pg.evaluate(() => { Object.assign(byId('P2'), { mailSent: today(), mailDue: workday(5) }); });
  ok(!(await pg.evaluate(() => callQueue().map(x => x.id))).includes('P2'), 'avant l\'échéance : la fiche reste en attente');
  ok(errs.length === 0, 'aucune erreur JS ' + errs.join('|'));
  await b.close();
})();
