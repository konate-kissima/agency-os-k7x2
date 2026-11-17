const { chromium } = require('playwright');const path=require('path'),fs=require('fs');
(async()=>{const b=await chromium.launch();const pg=await(await b.newContext()).newPage();const errs=[];pg.on('pageerror',e=>errs.push(e.message));
const tmp=fs.mkdtempSync('/tmp/aos-');fs.copyFileSync(path.resolve(__dirname,'../index.html'),tmp+'/index.html');fs.writeFileSync(tmp+'/config.js','window.AOS_CONFIG={url:"",key:""};');
await pg.goto('file://'+tmp+'/index.html');await pg.waitForSelector('.chal');
const ok=(c,m)=>{if(!c){console.log('FAIL',m);process.exitCode=1}else console.log('ok  ',m)};
const d=h=>new Date(Date.now()-h*3600e3).toISOString();
await pg.evaluate(async(a)=>{S.chal=false;
 const p={id:'P1',name:'Prodaf',dirigeant:'Foued',email:'f@x.fr',phone:'06 30 00 00 01',stage:'rdv',rdvAt:a.rdv,rdvType:'visio',rdvN:1,score:99};
 S.prospects=[p];await DB.set('prospects','P1',p);
 S.calls=[{id:'c1',channel:'appel',prospectId:'P1',t:a.c1,result:'nr'},{id:'c2',channel:'appel',prospectId:'P1',t:a.c2,result:'rdvv'}];
 S.tab='appels';S.call.pid='P1';S.call.open='P1';render()},{rdv:d(3),c1:d(100),c2:d(50)});
const txt=await pg.locator('.parcours').innerText();
ok(/1er appel/.test(txt)&&/Appel 2/.test(txt)&&/R1 visio/.test(txt)&&/prévu/.test(txt),'parcours affiché : '+txt.replace(/\n/g,' '));
// Fathom auto
await pg.evaluate(()=>{window.__sb={auth:{getSession:async()=>({data:{session:{access_token:'x'}}})}};window.AOS_CONFIG={url:'http://x',key:'k'};window.__calls=0;window.fetch=async()=>{window.__calls++;return {ok:true,json:async()=>({items:[{url:'https://fathom.video/share/abc',title:'Visio Prodaf',summary:'Résumé test',created_at:new Date().toISOString()}]})}}});
await pg.evaluate(async()=>{await fathomAuto()});
let st=await pg.evaluate(()=>({n:window.__calls,log:(byId('P1').log||[]).filter(l=>l.k==='fathom').length,fa:byId('P1').fathomAuto}));
ok(st.n===1&&st.log===1&&st.fa&&st.fa.n===1,'débrief Fathom récupéré automatiquement 1 h après la visio : '+JSON.stringify(st));
await pg.evaluate(async()=>{await fathomAuto()});
ok(await pg.evaluate(()=>window.__calls)===1,'pas de nouvel essai une fois le débrief trouvé');
await pg.evaluate(()=>render());
ok(/Fathom/.test(await pg.locator('.parcours').innerText()),'le lien Fathom apparaît dans le parcours');
// visio future : rien
await pg.evaluate(async(f)=>{const p=byId('P1');p.rdvAt=f;p.log=[];p.fathomAuto=null;window.__calls=0;await fathomAuto()},new Date(Date.now()+3600e3).toISOString());
ok(await pg.evaluate(()=>window.__calls)===0,'visio pas encore passée : aucune recherche');
ok(errs.length===0,'aucune erreur JS '+errs);await b.close()})();
