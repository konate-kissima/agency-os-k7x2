const { chromium } = require('playwright');
const path = require('path'), fs = require('fs');
(async () => {
  const b = await chromium.launch(); const pg = await (await b.newContext()).newPage();
  const errs = []; pg.on('pageerror', e => errs.push(e.message));
  const tmp = fs.mkdtempSync('/tmp/aos-'); fs.copyFileSync('/home/claude/agency-os-k7x2/index.html', tmp + '/index.html');
  fs.writeFileSync(tmp + '/config.js', 'window.AOS_CONFIG={url:"",key:""};');
  await pg.goto('file://' + tmp + '/index.html'); await pg.waitForSelector('.chal'); await pg.evaluate(() => { S.chal = false; render() });
  const ok = (c, m) => { if (!c) { console.log('FAIL', m); process.exitCode = 1 } else console.log('ok  ', m) };
  const r = await pg.evaluate(async () => {
    const p = { id: 'zz1', name: 'Test Bat', stage: 'rdv', rdvAt: '2099-01-05T14:00', rdvType: 'visio', rem24: true, rem3: true, rdvConfSent: true, showCallFor: '2099-01-05T14:00', rdvMsgAI: 'x', rdvMsgFor: '2099-01-05T14:00', rdvs: [{ n: 1, at: '2099-01-05T14:00', type: 'visio', show: 'absent' }] };
    S.prospects.push(p);
    const a = redatePatch(p, '2099-01-06T10:30');
    const html = rdvTimeBtn(p);
    redateOpen('zz1'); const open1 = !!document.getElementById('redate');
    document.getElementById('redatev').value = '2099-01-06T10:30';
    await redateSave();
    return { a, html, open1, after: { rdvAt: p.rdvAt, rem24: p.rem24, conf: p.rdvConfSent, last: S.lastRDV, show: !!document.getElementById('redate'), rdvs: p.rdvs[0].at } };
  });
  ok(r.a.patch.rdvAt === '2099-01-06T10:30' && r.a.patch.rem24 === false && r.a.patch.rdvConfSent === false, 'patch réinitialise rappels et confirmation');
  ok(r.html.includes('data-act="rdv-redate"'), 'heure cliquable');
  ok(r.open1, 'fenêtre ouverte');
  ok(r.after.rdvAt === '2099-01-06T10:30' && r.after.rem24 === false && r.after.conf === false, 'RDV déplacé et rappels remis à zéro ' + JSON.stringify(r.after));
  ok(r.after.last === 'zz1' && !r.after.show, 'confirmation à renvoyer, fenêtre fermée');
  ok(r.after.rdvs === '2099-01-06T10:30', 'historique mis à jour');
  ok(errs.length === 0, 'aucune erreur JS ' + errs.join('|'));
  await b.close();
})();
