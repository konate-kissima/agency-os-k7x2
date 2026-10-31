const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext();
  const pg = await ctx.newPage();
  const errs = [];
  pg.on('pageerror', e => errs.push('pageerror: ' + e.message));
  pg.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
  const tmp = fs.mkdtempSync('/tmp/aos-');
  fs.copyFileSync(path.resolve(__dirname, '../index.html'), tmp + '/index.html');
  fs.writeFileSync(tmp + '/config.js', 'window.AOS_CONFIG={url:"",key:""};');
  await pg.goto('file://' + tmp + '/index.html');
  const ok = (c, m) => { if (!c) { console.log('FAIL', m); process.exitCode = 1; } else console.log('ok  ', m); };

  await pg.waitForSelector('nav.tabs');
  ok(await pg.locator('text=Plus personne à appeler').count() === 1, 'file vide au départ');

  // import CSV
  const csv = 'name;phone;website;rating;reviews;address;city;dept;place_id;maps_url;score;mobile\n' +
    'Dupont Plomberie;01 39 70 00 00;https://dupont.fr;4.8;40;1 rue X 78510;Triel;78;P1;https://maps/1;100;\n' +
    'Martin Chauffage;06 12 34 56 78;;4.2;5;2 rue Y 92100;Boulogne;92;P2;;60;oui\n' +
    'Sans Tel;;;;;;;;P3;;0;\n' +
    'Dupont Doublon;0139700000;;;;;;78;P4;;0;\n';
  fs.writeFileSync('/tmp/t.csv', csv);
  await pg.click('[data-v=donnees]');
  await pg.setInputFiles('#csvf', '/tmp/t.csv');
  await pg.waitForSelector('#toast:visible');
  const t = await pg.textContent('#toast');
  ok(/2 fiches ajoutées, 1 doublons ignorés, 1 sans téléphone/.test(t), 'import : ' + t);

  // appel 1 : Dupont (score 100) -> RDV
  await pg.click('[data-v=appels]');
  ok(await pg.locator('h2:has-text("Dupont Plomberie")').count() === 1, 'file triée par score : Dupont en premier');
  ok(await pg.locator('.script:has-text("40 avis")').count() === 1, 'script rempli avec avis');
  await pg.fill('#cn', 'Gérant sympa, 2 techniciens');
  await pg.selectOption('#co', 'Déjà trop de travail');
  await pg.click('[data-act=callres][data-r=rdv]');
  ok(/date et l'heure/.test(await pg.textContent('#toast')), 'RDV exige une date');
  await pg.waitForTimeout(600);
  await pg.fill('#cr', '2026-11-04T10:00');
  await pg.click('[data-act=callres][data-r=rdv]');
  try{await pg.waitForSelector('h2:has-text("Martin Chauffage")',{timeout:5000})}catch(e){console.log('DIAG toast=',await pg.textContent('#toast'),'| cr=',await pg.inputValue('#cr').catch(()=>'-'),'| h2=',await pg.$$eval('h2',h=>h.map(x=>x.textContent)).catch(()=>'-'));process.exitCode=1}
  ok(true, 'fiche suivante après RDV');

  // appel 2 : Martin -> pas de réponse (reprogrammé) puis plus personne
  await pg.selectOption('#cang', 'B');
  await pg.click('[data-act=callres][data-r=nr]');
  ok(await pg.locator('text=Plus personne à appeler').count() === 1, 'Pas de réponse reprogrammé au lendemain');

  // outreach : file DM
  await pg.click('[data-v=outreach]');
  ok(await pg.locator('h2:has-text("Martin Chauffage")').count() === 1, 'Martin dans la file DM (Dupont a un RDV)');
  await pg.selectOption('#och', 'dm_insta');
  await pg.selectOption('#ovar', 'D2');
  ok((await pg.textContent('#otext')).includes('5 avis'), 'DM D2 rempli');
  await pg.fill('#oh', '@martinchauffage');
  await pg.fill('#on', 'DM envoyé');
  await pg.click('[data-act=outres][data-r=sent]');
  ok(await pg.locator('text=Personne à contacter').count() === 1, 'relance programmée après envoi');

  // contenu
  await pg.click('[data-v=contenu]');
  await pg.fill('#ct-h', 'Pourquoi les artisans perdent des chantiers');
  await pg.fill('#ct-v', '1200'); await pg.fill('#ct-m', '3');
  await pg.click('[data-act=ct-add]');
  ok(await pg.locator('td:has-text("Pourquoi les artisans")').count() === 1, 'publication ajoutée');

  // pipeline + signé + client
  await pg.click('[data-v=pipeline]');
  ok(await pg.locator('section:has(h3:has-text("RDV pris")) b:has-text("Dupont")').count() === 1, 'Dupont dans RDV pris');
  await pg.click('section:has(h3:has-text("RDV pris")) [data-act=open]');
  await pg.selectOption('#fp-stage', 'signe');
  await pg.click('[data-act=savep]');
  await pg.click('section:has(h3:has-text("Signé")) [data-act=open]');
  await pg.click('[data-act=mkclient]');
  ok(await pg.locator('h3:has-text("Dupont Plomberie")').count() === 1, 'client créé');
  ok((await pg.textContent('main')).replace(/[\u202f\u00a0]/g,' ').includes('1 200 €'), 'prix pilote 1 200 €');
  await pg.check('[data-k=launch]');
  ok(await pg.locator('.banner:has-text("Revue J+14")').count() === 0, 'pas de revue due le jour du lancement');
  await pg.fill('#m-spend', '420'); await pg.fill('#m-leads', '21'); await pg.fill('#m-qual', '12'); await pg.fill('#m-jobs', '2');
  await pg.click('[data-act=met-add]');
  ok((await pg.textContent('main')).includes('20 €') || (await pg.textContent('main')).includes('coût/lead 20 €'), 'coût par lead = 20 €');

  // stats
  await pg.click('[data-v=stats]');
  const st = await pg.textContent('main');
  ok(/2\s*appels/.test(st), 'stats : 2 appels');
  ok(st.includes('DM Instagram') && st.includes('Appel'), 'stats par canal');
  ok(st.includes('A · Capacité') && st.includes('B · Découverte'), 'stats par angle');

  // scripts + export
  await pg.click('[data-v=scripts]');
  await pg.click('[data-act=addangle]');
  ok(await pg.locator('#sn-D').count() === 1, 'nouvel angle D');
  await pg.fill('#sn-D', 'D · Test'); await pg.fill('#st-D', 'Bonjour {nom}');
  await pg.click('[data-act=set-save]');
  await pg.click('[data-v=donnees]');
  const [dl] = await Promise.all([pg.waitForEvent('download'), pg.click('[data-act=exp-calls]')]);
  const content = fs.readFileSync(await dl.path(), 'utf8');
  ok(content.includes('Dupont Plomberie') && content.includes('DM Instagram'), 'export CSV des appels');

  // persistance
  await pg.reload(); await pg.waitForSelector('nav.tabs'); await pg.click('[data-v=clients]');
  ok(await pg.locator('h3:has-text("Dupont Plomberie")').count() === 1, 'persistance après rechargement');

  console.log(errs.length ? 'ERRORS:\n' + errs.join('\n') : 'aucune erreur JS');
  if (errs.length) process.exitCode = 1;
  await b.close();
})();
