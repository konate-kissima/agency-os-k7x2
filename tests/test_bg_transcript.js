const { chromium } = require('playwright');
const path = require('path'), fs = require('fs');
(async () => {
  const b = await chromium.launch();
  const pg = await (await b.newContext()).newPage();
  const errs = []; pg.on('pageerror', e => errs.push(e.message));
  const tmp = fs.mkdtempSync('/tmp/aos-');
  fs.copyFileSync(path.resolve(__dirname, '../index.html'), tmp + '/index.html');
  fs.writeFileSync(tmp + '/config.js', 'window.AOS_CONFIG={url:"",key:""};');
  await pg.goto('file://' + tmp + '/index.html'); await pg.waitForSelector('.chal'); await pg.evaluate(() => { S.chal = false; render() });
  const ok = (c, m) => { if (!c) { console.log('FAIL', m); process.exitCode = 1 } else console.log('ok  ', m) };
  const r = await pg.evaluate(async () => {
    window.__sb = { auth: { getSession: async () => ({ data: { session: { access_token: 't' } } }) } };
    let release; const gate = new Promise(r => release = r);
    window.fetch = async () => { await gate; return { ok: true, json: async () => ({ text: '[Voix 1] a\n[Voix 2] b', resume: 'Résumé test', besoin: 'x' }) } };
    S.prospects = [{ id: 'A1', name: 'Alpha', phone: '01 30 00 00 05', stage: 'a_contacter' }, { id: 'B2', name: 'Beta', phone: '01 30 00 00 06', stage: 'a_contacter' }];
    S.calls = []; S.tab = 'appels'; S.call.pid = 'A1'; S.call.open = 'A1'; S.call.step = 'ans';
    const p = recSend(new Blob(['x']), 'appel.webm');
    await new Promise(r => setTimeout(r, 50));
    const busy1 = S.rec.busy;
    await callResult('ans');           // l'utilisateur enregistre le résultat sans attendre
    const after = { busy: S.rec.busy, pid: S.call.pid, n: S.calls.length };
    S.call.pid = 'B2'; S.call.open = 'B2';   // fiche suivante
    release(); await p; await new Promise(r => setTimeout(r, 100));
    return { busy1, after, tr: S.calls[0] && S.calls[0].transcript, auto: S.calls[0] && S.calls[0].auto, callAuto: S.call.auto, pt1: S.call.pt1 || '', note: S.prospects[0].notes || '' };
  });
  ok(r.busy1 === true, 'transcription en cours'); ok(r.after.busy === false && r.after.n === 1, 'résultat enregistré sans attendre, plus bloqué ' + JSON.stringify(r.after));
  ok(r.tr && r.tr.includes('[Voix 1]'), 'transcription ajoutée à l\'appel déjà enregistré');
  ok((r.auto || '').includes('Résumé test'), 'résumé ajouté à l\'appel'); ok(!r.callAuto && !r.pt1, 'rien n\'a débordé sur la fiche suivante');
  ok(r.note.includes('Résumé test'), 'note de la fiche mise à jour');
  ok(errs.length === 0, 'aucune erreur JS ' + errs.join('|'));
  await b.close();
})();
