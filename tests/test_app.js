const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext();
  const pg = await ctx.newPage();
  const errs = [];
  pg.on('pageerror', e => errs.push('pageerror: ' + e.message));
  pg.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errs.push('console: ' + m.text()); });
  const tmp = fs.mkdtempSync('/tmp/aos-');
  fs.copyFileSync(path.resolve(__dirname, '../index.html'), tmp + '/index.html');
  fs.writeFileSync(tmp + '/config.js', 'window.AOS_CONFIG={url:"",key:""};');
  await pg.goto('file://' + tmp + '/index.html'); await pg.waitForSelector('.chal'); await pg.evaluate(()=>{S.chal=false;render()});
  const ok = (c, m) => { if (!c) { console.log('FAIL', m); process.exitCode = 1; } else console.log('ok  ', m); };

  await pg.waitForSelector('nav.tabs');
  ok(/Aujourd'hui/.test(await pg.textContent('main')) && /0<\/b>|0 \//.test(await pg.innerHTML('main')),'onglet Aujourd\'hui par défaut');
  await pg.click('[data-v=appels]');
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
  ok(await pg.evaluate(() => callQueue()[0].name) !== 'Dupont Plomberie', 'mobiles (06/07) passent avant les fixes dans la file');
  await pg.evaluate(() => { const d = S.prospects.find(p => p.name === 'Dupont Plomberie'); S.call.open = d.id; S.call.pid = d.id; render() });
  ok(await pg.locator('h2:has-text("Dupont Plomberie")').count() === 1, 'fiche Dupont ouverte');
  ok(await pg.locator('.script:has-text("20 à 30 chantiers")').count() === 1, 'script court P affiché');
  await pg.fill('#cn', 'Gérant sympa, 2 techniciens');
  await pg.click('[data-act=callstep][data-s=ans]');
  await pg.click('[data-act=callpanel][data-r=rdvv]');
  ok(await pg.locator('[data-act=callres][data-r=rdvt]').count() === 0, 'plus de bouton RDV téléphonique');
  await pg.click('[data-act=callres][data-r=rdvv]');
  ok(/date et l'heure/.test(await pg.textContent('#toast')), 'RDV exige une date');
  await pg.waitForTimeout(600);
  await pg.fill('#cr', '2026-12-15T10:00');
  await pg.click('[data-act=callres][data-r=rdvv]');
  try{await pg.waitForSelector('h2:has-text("Martin Chauffage")',{timeout:5000})}catch(e){console.log('DIAG toast=',await pg.textContent('#toast'),'| cr=',await pg.inputValue('#cr').catch(()=>'-'),'| h2=',await pg.$$eval('h2',h=>h.map(x=>x.textContent)).catch(()=>'-'));process.exitCode=1}
  ok(true, 'fiche suivante après RDV');
  ok(/RDV visio pris : Dupont/.test(await pg.textContent('main')) && await pg.locator('a[href^="https://calendar.google.com"]').count()===1 && await pg.locator('a[href^="whatsapp://"]').count()===0 && (await pg.textContent('main')).includes('Numéro fixe'), 'carte confirmation RDV (Google Agenda, pas de WhatsApp sur fixe)');

  // appel 2 : Martin -> pas de réponse (reprogrammé) puis plus personne
  await pg.selectOption('#cang', 'B');
  await pg.click('[data-act=callres][data-r=nr]');
  ok(await pg.locator('text=Plus personne à appeler').count() === 1, 'Pas de réponse reprogrammé au lendemain');
  ok(/double contact/.test(await pg.textContent('main')) && await pg.locator('a[href^="sms:"]').count()===1, 'carte relance SMS après pas de réponse');
  { const sms=decodeURIComponent((await pg.getAttribute('a[href^="sms:"]','href'))||''); ok(/c'est Kissima, j'ai essayé de vous joindre\. (J'ai vu|Je suis)/.test(sms)&&/5 minutes cette semaine/.test(sms)&&/Très cordialement, Kissima/.test(sms)&&!/\{/.test(sms), 'SMS de relance : chaleureux, fait sur l\'entreprise, question de disponibilité, formule de politesse'); console.log(sms); }
  { const v=await pg.evaluate(()=>{const y=new Date().getFullYear();return [companyLine({name:'Climtech',created_co:(y-12)+'-05-02',naf:'43.22B',effectif:'03',dirigeant:'Jean Durand'}),companyLine({name:'Dupont Chauffage'}),ageBucket({created_co:(y-1)+'-01-01'}),ageBucket({}),sectorOf({name:'SOS Plomberie'}),reviewBucket({reviews:751})]});
    ok(/créée en/.test(v[0])&&/12 ans/.test(v[0])&&/Chauffage \/ climatisation/.test(v[0])&&/6-9 salariés/.test(v[0])&&/Jean Durand/.test(v[0]),'fiche d\'appel : année de création, secteur, effectif, dirigeant');
    ok(/pas encore trouvée/.test(v[1])&&/Chauffage/.test(v[1])&&v[2]==='Moins de 2 ans'&&v[3]==='Année inconnue'&&v[4]==='Plomberie / dépannage'&&v[5]==='200 avis et plus','valeurs de repli et tranches pour les stats');
    await pg.evaluate(()=>{S.tab='stats';S.st.days=0;render()}); const stx=await pg.textContent('main'); ok(/par ancienneté/.test(stx)&&/par secteur d.activité/.test(stx)&&/nombre d.avis/.test(stx),'stats : ancienneté, secteur, avis, site, taille'); }
  { await pg.evaluate(()=>{S.chal=true;render()}); const ch=await pg.textContent('.chal');
    ok(/Ton record à battre/.test(ch)&&/Je relève le défi|C'est parti/.test(ch),'défi affiché à la connexion'); await pg.click('[data-act=chal-ok]'); ok(await pg.locator('.chal').count()===0,'défi fermé par le bouton'); }
  { await pg.evaluate(()=>{S.tab='stats';S.st.days='w';render()}); const tx=await pg.textContent('main');
    ok(/Tes records à battre/.test(tx)&&/Jour/.test(tx)&&/Semaine/.test(tx)&&/Mois/.test(tx), 'stats : bloc référence à battre (jour, semaine, mois)');
    const r=await pg.evaluate(()=>{const A=periodAgg();return [Object.keys(A.D).length,weekStart('2026-11-01'),weekStart('2026-11-02')]});
    ok(r[1]==='2026-10-26'&&r[2]==='2026-11-02','semaine du lundi'); 
    await pg.evaluate(()=>{S.st.days='c';S.st.from='2026-01-01';S.st.to='2026-12-31';render()}); ok(await pg.locator('#stfrom').count()===1,'période choisie : champs dates');
    await pg.evaluate(()=>{S.tab='auj';render()}); ok(/Bilan de la journée/.test(await pg.textContent('main')),'bilan de fin de journée'); await pg.evaluate(()=>{S.tab='appels';render()}); }
  { const v=await pg.evaluate(()=>[valueFor({}),valueFor({created_co:'2009-03-01'}),valueFor({reviews:12,rating:4.8}),valueFor({reviews:40,rating:4.9}),valueFor({created_co:'2025-01-01'})]);
    ok(v[0]===''&&/depuis 2009/.test(v[1])&&/4,8\/5/.test(v[2])&&v[3]===''&&v[4]==='', 'atout valorisant seulement s\'il est réel (sinon rien)'); console.log(v); }

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
  ok((await pg.textContent('main')).replace(/[\u202f\u00a0]/g,' ').includes('3 000 €'), 'prix pilote 3 000 €');
  await pg.check('[data-k=launch]');
  ok(await pg.locator('.banner:has-text("Revue J+14")').count() === 0, 'pas de revue due le jour du lancement');
  await pg.fill('#m-spend', '420'); await pg.fill('#m-leads', '21'); await pg.fill('#m-qual', '12'); await pg.fill('#m-jobs', '2');
  await pg.click('[data-act=met-add]');
  ok((await pg.textContent('main')).includes('20 €') || (await pg.textContent('main')).includes('coût/lead 20 €'), 'coût par lead = 20 €');

  // aujourd'hui
  await pg.click('[data-v=auj]');
  const aj=await pg.textContent('main');
  ok(/1\s*\/\s*50/.test(aj),'conversations 1 / 50 ('+aj.replace(/\s+/g,' ').slice(0,200)+')');
  await pg.check('[data-k=liste]'); ok(await pg.isChecked('[data-k=liste]'),'case cochée persistée');
  await pg.waitForTimeout(300); await pg.click('details summary'); await pg.fill('#g-conv-0','80'); await pg.click('[data-act=goals-save]'); await pg.waitForTimeout(200);
  const m80=await pg.textContent('main');ok(/1\s*\/\s*80/.test(m80),'objectif modifiable '+m80.replace(/\s+/g,' ').slice(0,260));

  // stats
  await pg.click('[data-v=stats]');
  const st = await pg.textContent('main');
  ok(/2\s*appels/.test(st), 'stats : 2 appels');
  ok(st.includes('DM Instagram') && st.includes('Appel'), 'stats par canal');
  ok(st.includes('P · Court') && st.includes('B · Découverte'), 'stats par angle');

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
  await pg.reload(); await pg.waitForSelector('.chal'); await pg.evaluate(()=>{S.chal=false;render()}); await pg.click('[data-v=clients]');
  ok(await pg.locator('h3:has-text("Dupont Plomberie")').count() === 1, 'persistance après rechargement');

  console.log(errs.length ? 'ERRORS:\n' + errs.join('\n') : 'aucune erreur JS');
  if (errs.length) process.exitCode = 1;
  await b.close();
})();
