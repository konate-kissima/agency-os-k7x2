const { chromium } = require('playwright');
const path = require('path'), fs = require('fs');
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext();
  const errs = [];
  const tmp = fs.mkdtempSync('/tmp/aos-');
  fs.copyFileSync(path.resolve(__dirname, '../index.html'), tmp + '/index.html');
  fs.writeFileSync(tmp + '/config.js', 'window.AOS_CONFIG={url:"",key:""};');
  const url = 'file://' + tmp + '/index.html';
  const ok = (c, m) => { if (!c) { console.log('FAIL', m); process.exitCode = 1; } else console.log('ok  ', m); };
  const A = await ctx.newPage(); A.on('pageerror', e => errs.push('A ' + e.message));
  await A.goto(url); await A.waitForSelector('.chal'); await A.evaluate(() => { S.chal = false; render() });
  await A.waitForSelector('nav.tabs');
  await A.evaluate(async () => {
    await DB.set('prospects', 'R1', { name: 'Renobtp', dirigeant: 'Mattéo Zahm', contact: 'Matteo Zam (dirigeant)', siren: '934123209', address: '17 RUE DES LILAS 93100', phone: '07 44 31 02 05', stage: 'rdv', rdvAt: '2026-11-09T12:00', rdvType: 'physique', rating: 4.7, reviews: 15, prep: { at: new Date().toISOString(), activite: 'Rénovation énergétique', points_forts: ['RGE Qualibat', '4,7 sur 5'], registre: { creation: '2024-10-11' }, accroches: ['Accroche privée'], questions: ['Question privée'], vigilance: ['Vigilance privée'], sources: ['Registre officiel'] }, notes: 'Note privée secrète' });
    await DB.set('prospects', 'R2', { name: 'AutreEntreprise', phone: '06 00 00 00 01', stage: 'a_contacter' });
    await loadAll(); render();
  });
  // fiche prospect : panneau privé
  await A.evaluate(() => openProspect('R1'));
  ok(await A.locator('[data-act=prep]').count() >= 1 && await A.locator('[data-act=rdvopen]').count() >= 1, 'boutons Préparer le RDV et Fiche de RDV dans la fiche');
  ok((await A.locator('#prepbox').innerText()).includes('Accroche privée'), 'dossier de recherche affiché dans la vue privée');
  // fenêtre partagée
  const B = await ctx.newPage(); B.on('pageerror', e => errs.push('B ' + e.message));
  await B.goto(url + '#rdv=R1'); await B.waitForSelector('.rf');
  const txt = await B.locator('body').innerText();
  ok(await B.locator('nav.tabs').count() === 0 && await B.locator('header.top').count() === 0, 'aucun menu ni onglet dans la fenêtre partagée');
  ok(!/Pipeline|Appels|Données|AutreEntreprise/.test(txt), 'aucune autre fiche ni onglet visible');
  ok(!/Note privée|Accroche privée|Question privée|Vigilance privée/.test(txt), 'notes et dossier privés absents de la fiche partagée');
  ok(/RGE Qualibat/.test(txt) && /Renobtp/.test(txt), 'atouts et nom du prospect affichés');
  await B.click('[data-k=prio] [data-v="PAC air/eau"]');
  await B.fill('#f_panier', '12000'); await B.fill('#f_marge', '50'); await B.fill('#f_taux', '20'); await B.fill('#f_zone', '78, 91, 28');
  await B.fill('#sim_budget', '50');
  await B.click('[data-k=verif] [data-v="Option 2 · confirmation par rappel"]');
  await B.click('[data-k=decision] [data-v="Il réfléchit"]');
  await B.click('[data-k=crit3] [data-v="À modifier"]');
  await B.fill('[data-k=critnote3]', 'zone à revoir');
  await B.check('[data-k=chk0]');
  const net = await B.locator('#rs0 tr.key td:last-child').innerText();
  ok(/\d/.test(net), 'simulation calculée en direct : ' + net);
  await B.waitForTimeout(1000);
  ok(await B.evaluate(() => byId('R1').rdvForm && byId('R1').rdvForm.fields.panier === '12000'), 'sauvegarde automatique');
  await B.click('#rfval'); await B.waitForTimeout(500);
  ok((await B.locator('#rfdone').isVisible()), 'message « Réponses validées » affiché');
  const after = await B.locator('body').innerText();
  ok(!/Compte rendu|Accord de collaboration|ACCORD DE COLLABORATION|Message WhatsApp/.test(after), 'aucun texte généré visible dans la fenêtre partagée');
  // données enregistrées
  await A.goto(url); await A.waitForSelector('.chal'); await A.evaluate(() => { S.chal = false; render() }); await A.waitForSelector('nav.tabs');
  const r = await A.evaluate(() => { const p = byId('R1'); return { stage: p.stage, nd: p.nextDate, out: p.rdvOut, show: p.rdvShow }; });
  ok(r.stage === 'contacte' && /^\d{4}-\d\d-\d\d$/.test(r.nd), 'décision « Il réfléchit » : en attente avec date de rappel ' + r.nd);
  ok(r.out && /Konaté Kissima, Instinct Agency/.test(r.out.msg) && /1[\s\u202f\u00a0]500/.test(r.out.msg) && /78, 91, 28/.test(r.out.msg), 'message WhatsApp généré (signature, honoraires, zone)');
  ok(r.out && /Prudent|simulation prudente/i.test(r.out.cr) && /zone à revoir/.test(r.out.cr), 'compte rendu généré (simulation, critère à reprendre)');
  ok(r.out && /ACCORD DE COLLABORATION/.test(r.out.accord) && /78, 91, 28/.test(r.out.accord) && /confirmation lors du rappel/.test(r.out.accord) && /rembourse le premier versement/.test(r.out.accord) && /934 123 209/.test(r.out.accord), 'accord généré avec les champs remplis');
  await A.evaluate(() => openProspect('R1'));
  ok(await A.locator('#outbox [data-act=rdvcopy]').count() === 3 && await A.locator('[data-act=rdvdl]').count() === 1, 'vue privée : compte rendu, message et accord avec Copier/Télécharger');
  ok(errs.length === 0, 'aucune erreur JS ' + errs.join(' | '));
  await b.close();
})();
