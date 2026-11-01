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
  await pg.goto('file://' + tmp + '/index.html');
  await pg.waitForSelector('nav.tabs');
  const ok = (c, m) => { if (!c) { console.log('FAIL', m); process.exitCode = 1; } else console.log('ok  ', m); };
  const r = await pg.evaluate(async () => {
    const out = {};
    const t = today(), y = addDays(t, -1);
    const P = (id, o) => ({ id, name: id, phone: '01 39 00 00 ' + String(id.length + (id.charCodeAt(1) % 90)).padStart(2, '0'), stage: 'a_contacter', score: 50, ...o });
    S.prospects = [
      P('Fresh1', { phone: '01 30 11 11 11', score: 90 }),
      P('RapMatin', { phone: '01 30 22 22 22', stage: 'contacte', nextDate: y, slots: ['d', 's'], score: 10 }),
      P('RapTous', { phone: '01 30 33 33 33', stage: 'contacte', nextDate: y, slots: ['m', 'd', 's'], score: 10 })
    ];
    S.calls = []; S.call.skip = []; S.call.mob = 'all';
    const names = () => callQueue().map(p => p.id);
    // créneau actuel simulé via Date
    const RealDate = Date;
    const fake = h => { const base = new RealDate(); base.setHours(h, 0, 0, 0); const ms = base.getTime(); globalThis.Date = class extends RealDate { constructor(...a) { if (a.length) super(...a); else super(ms); } static now() { return ms; } }; };
    fake(9); out.matin = names();      // 9 h : RapTous (créneau ok) puis RapMatin (autre créneau) puis Fresh1
    fake(13); out.midi = names();      // 13 h : les deux rappels ok, puis Fresh1
    globalThis.Date = RealDate;
    // quota de rappels atteint : les nouvelles passent devant
    S.prospects.push(P('Old', { phone: '01 30 44 44 44', stage: 'contacte', nextDate: y }));
    const iso = new RealDate().toISOString();
    for (let i = 0; i < RAPPEL_CAP; i++) { S.calls.push({ id: 'x' + i, prospectId: 'Old', t: '2000-01-01T10:00:00.000Z', result: 'nr', channel: 'appel' }); S.calls.push({ id: 'y' + i, prospectId: 'Old', t: iso, result: 'nr', channel: 'appel' }); }
    out.cap = callQueue()[0].id;
    // 5 tentatives sans jamais joindre : réserve 30 jours puis perdu au 2e cycle
    S.calls = []; S.call.skip = [];
    S.prospects = [P('Inj', { phone: '01 30 55 55 55', stage: 'contacte', touches: 4 })];
    for (let i = 0; i < 4; i++) S.calls.push({ id: 'z' + i, prospectId: 'Inj', t: '2026-01-0' + (i + 1) + 'T10:00:00.000Z', result: 'nr', channel: 'appel', hour: 10 });
    S.call.pid = 'Inj'; S.call.angle = 'H';
    await callResult('nr');
    const p1 = byId('Inj'); out.p1 = { stage: p1.stage, cycle: p1.cycle, next: p1.nextDate, due: addDays(today(), 30), lost: p1.lostReason || '' };
    // 2e cycle : 5 nouvelles tentatives
    for (let i = 0; i < 4; i++) S.calls.push({ id: 'w' + i, prospectId: 'Inj', t: new RealDate(RealDate.now() + 1000 * (i + 5)).toISOString(), result: 'nr', channel: 'appel', hour: 10 });
    S.call.pid = 'Inj'; S.call.skip = [];
    await callResult('nr');
    const p2 = byId('Inj'); out.p2 = { stage: p2.stage, lost: p2.lostReason || '' };
    // créneau conseillé : un appel à 9 h exclut le matin
    S.prospects = [P('Sl', { phone: '01 30 66 66 66', stage: 'a_contacter' })]; S.calls = []; S.call.pid = 'Sl';
    globalThis.Date = RealDate;
    await callResult('nr'); out.slots = byId('Sl').slots;
    return out;
  });
  console.log(JSON.stringify(r));
  ok(r.matin.join() === 'RapTous,RapMatin,Fresh1', 'à 9 h : rappel du bon créneau, autre rappel, puis nouvelles fiches — ' + r.matin);
  ok(r.midi.join() === 'RapMatin,RapTous,Fresh1' || r.midi.join() === 'RapTous,RapMatin,Fresh1', 'à 13 h : les deux rappels passent avant les nouvelles — ' + r.midi);
  ok(r.cap === 'Fresh1', 'quota de rappels atteint : une nouvelle fiche passe devant');
  ok(r.p1.stage === 'contacte' && r.p1.cycle === 2 && r.p1.next === r.p1.due && !r.p1.lost, '5 tentatives sans réponse : mise en réserve 30 jours, pas perdu');
  ok(r.p2.stage === 'perdu' && /2 cycles/.test(r.p2.lost), 'toujours injoignable au 2e cycle : perdu');
  ok(Array.isArray(r.slots) && r.slots.length === 2 && !r.slots.includes(new Date().getHours() < 11 ? 'm' : new Date().getHours() < 17 ? 'd' : 's'), 'créneau de la tentative exclu des suivants — ' + r.slots);
  ok(errs.length === 0, 'aucune erreur JS ' + errs.join(' | '));
  await b.close();
})();
