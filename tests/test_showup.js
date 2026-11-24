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
    const at = h => { const d = new Date(Date.now() + h * 36e5), z = n => String(n).padStart(2, '0'); return d.getFullYear() + '-' + z(d.getMonth() + 1) + '-' + z(d.getDate()) + 'T' + z(d.getHours()) + ':' + z(d.getMinutes()) };
    const base = { stage: 'rdv', phone: '06 12 34 56 78', dirigeant: 'Ousmane Drame', email: 'o@x.fr', rdvType: 'visio', pts: { objectif: 'Recevoir plus de devis qualifiés' } };
    S.prospects = [{ ...base, id: 'a', name: 'A', rdvAt: at(20) }, { ...base, id: 'b', name: 'B', rdvAt: at(3) }, { ...base, id: 'c', name: 'C', rdvAt: at(1) }, { ...base, id: 'd', name: 'D', rdvAt: at(3), rem2: true }];
    const kinds = remindDue().map(x => x.p.id + ':' + x.k).sort().join(',');
    const p = S.prospects[0], m = {}; ['conf', 'r24', 'r3', 'r1'].forEach(k => m[k] = rdvMail(p, k));
    const early = showCallInfo({ rdvAt: '2026-11-25T09:00' }), late = showCallInfo({ rdvAt: '2026-11-25T14:00' }), mon = showCallInfo({ rdvAt: '2026-11-23T09:00' });
    return { kinds, m, early: early.veille, late: late.veille, mon: mon.veille, meet: settings().meetLink };
  });
  ok(r.kinds === 'a:r24,b:r3,c:r1', 'rappels : veille, 3 h et 1 h (rem2 hérité = pas de doublon) ' + r.kinds);
  ok(r.m.conf.body.includes('Bonjour Ousmane,') && r.m.conf.body.includes('meet.google.com/yaa-rnwr-igk') && r.m.conf.body.includes('Au programme : recevoir plus de devis qualifiés'), 'mail de confirmation : prénom, lien Meet, points de la conversation');
  ok(/^À demain Ousmane/.test(r.m.r24.su) && r.m.r24.body.includes('demain') && r.m.r24.body.includes('Instinct Agency'), 'mail de la veille');
  ok(r.m.r3.su.startsWith('Tout à l') && r.m.r1.body.includes('dans une heure'), 'mails 3 h et 1 h avant');
  ok(r.early === true && r.late === false && r.mon === false, 'appel de présence : veille si RDV avant midi (pas le week-end), sinon le matin même');
  // fenêtre RDV : champ e-mail
  await pg.evaluate(() => { S.prospects = [{ id: 'z', name: 'Z', stage: 'a_contacter', phone: '06 11 22 33 44', score: 9 }]; S.tab = 'appels'; S.call.pid = 'z'; S.call.panel = 'rdvv'; render() });
  ok(await pg.locator('#cem').count() === 1, 'fenêtre RDV : champ « Email du contact »');
  // taux de présence
  await pg.evaluate(() => {
    const ev = (show, rem) => ({ n: 1, type: 'visio', at: '2026-11-20T10:00', show, rem });
    S.prospects = [{ id: 'x', name: 'X', stage: 'contacte', rdvs: [ev('tenu', { mail: true, call: 1 }), ev('tenu', { mail: true, call: 1 }), ev('absent', { mail: false, call: 0 }), ev('tenu', { mail: false, call: 0 })] }];
    S.tab = 'stats'; render();
  });
  const t = await pg.innerText('#presence');
  ok(t.includes('75 %') && t.includes('3 sur 4') && /Mail \+ appel joint\s*2\s*2\s*100 %/.test(t), 'stats : taux de présence global et par rappels faits ' + t.replace(/\s+/g, ' ').slice(0, 220));
  ok(errs.length === 0, 'aucune erreur JS ' + errs.join('|'));
  await b.close();
})();
