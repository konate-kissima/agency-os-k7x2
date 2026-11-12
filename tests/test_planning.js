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
    const t = today(), soon = new Date(Date.now() + 90 * 60000), hh = n => String(n).padStart(2, '0');
    const at = t + 'T' + hh(soon.getHours()) + ':' + hh(soon.getMinutes());
    S.prospects.push({ id: 'zz1', name: 'Test Visio', stage: 'rdv', rdvAt: at, rdvType: 'visio', rdvLink: 'https://meet.google.com/abc', phone: '0612345678' });
    S.prospects.push({ id: 'zz2', name: 'Test Rappel', stage: 'contacte', nextDate: t, nextTime: '23:50' });
    S.tab = 'plan'; render();
    const tabs = [...document.querySelectorAll('nav.tabs [role=tab]')].map(x => x.textContent.trim());
    return { html: document.body.innerText, btn: !!document.querySelector('[data-act="rem-open"][data-id="zz1"]'), tabs, k: document.querySelector('[data-act="rem-open"]')?.dataset.k };
  });
  ok(r.html.includes('Test Visio') && r.html.includes('Test Rappel'), 'jour : RDV et rappel affichés');
    const i = r.tabs.findIndex(x => /Aujourd/.test(x)); ok(i >= 0 && /Planning/.test(r.tabs[i + 1]), 'Planning juste après Aujourd\'hui ' + r.tabs.slice(0, 4));
  await pg.click('[data-act="plan-mode"][data-m="week"]'); ok(await pg.$('.pg-ev[data-id="zz1|rdv"]') !== null && (await pg.$$('.pg-col')).length === 7, 'vue semaine : 7 colonnes');
  await pg.click('[data-act="plan-nav"][data-n="1"]'); ok(await pg.$('.pg-ev[data-id="zz1|rdv"]') === null, 'semaine suivante vide');
  await pg.click('[data-act="plan-nav"][data-n="0"]');
  ok(await pg.$('.pg .pg-ev[data-id="zz1|rdv"]') !== null && await pg.$('.pg-now') !== null, 'grille horaire : bloc RDV et trait de l\'heure');
  await pg.click('[data-act="plan-ev"][data-id="zz1|rdv"]'); ok((await pg.innerText('body')).includes('Lien de visio'), 'clic sur le bloc : détail');
  await pg.click('[data-act="rem-open"][data-id="zz1"]'); ok((await pg.innerText('body')).includes('rappel 2 h avant'), 'clic : message de rappel ouvert');
  ok(errs.length === 0, 'aucune erreur JS ' + errs.join('|'));
  await b.close();
})();
