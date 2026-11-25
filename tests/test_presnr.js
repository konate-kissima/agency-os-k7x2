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
    const d1 = workday(1);
    S.prospects.push({ id: 'a1', name: 'X', stage: 'rdv', rdvAt: d1 + 'T10:00', rdvType: 'visio', phone: '0612345678' });
    const f = freeSlot(d1, ['10:00', '14:00']);
    const p = { id: 'b1', name: 'Y', stage: 'rdv', rdvAt: '2099-01-05T14:00', rdvType: 'visio', phone: '0612345678', dirigeant: 'Paul Z' };
    S.prospects.push(p); S.presNr = 'b1';
    return { f, msg: presNrMsg(p), card: presNrCard(), msgAbs: absMsg({ ...p, rdvs: [{ type: 'visio' }] }) };
  });
  ok(r.f === '14:00', 'créneau libre évite 10h déjà pris : ' + r.f);
  ok(r.msg.includes('essayé de vous joindre') && r.msg.includes('OK'), 'message pas joint');
  ok(r.card.includes('WhatsApp') && r.card.includes('rdv-redate'), 'carte avec WhatsApp et changement d\'heure');
  ok(r.msgAbs.includes('14h'), 'message d\'absence avec un créneau libre');
  ok(errs.length === 0, 'aucune erreur JS ' + errs.join('|'));
  await b.close();
})();
