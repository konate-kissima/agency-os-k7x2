const { chromium } = require('playwright');const path=require('path'),fs=require('fs');
// onglet Stats : les 14 blocs « tout ce qui se mesure » + ville / note / source, sans erreur, sans NaN
(async()=>{const b=await chromium.launch();const ctx=await b.newContext();const pg=await ctx.newPage();const errs=[];pg.on('pageerror',e=>errs.push(e.message));
const tmp=fs.mkdtempSync('/tmp/aos-');fs.copyFileSync(path.resolve(__dirname,'../index.html'),tmp+'/index.html');fs.writeFileSync(tmp+'/config.js','window.AOS_CONFIG={url:"",key:""};');
await pg.goto('file://'+tmp+'/index.html');await pg.waitForSelector('.chal');
const ok=(c,m)=>{if(!c){console.log('FAIL',m);process.exitCode=1}else console.log('ok  ',m)};
const seed=async(empty)=>pg.evaluate((empty)=>{S.calls=[];S.prospects=[];S.content=[];S.act={};if(!empty){let k=0;const mk=(dAgo,h,res,pid,ex)=>{const d=new Date();d.setDate(d.getDate()-dAgo);d.setHours(h,5,0,0);return {id:'c'+(k++),t:d.toISOString(),result:res,channel:'appel',prospectId:pid,prospectName:pid,...ex}};
S.prospects=[{id:'a',name:'A',stage:'rdv',city:'Triel',rating:'4,7',source:'maps',rdvs:[{n:1,type:'visio',at:addDays(today(),-1)+'T10:00',show:'tenu',out:'signe',amount:1000}]},{id:'b',name:'B',stage:'perdu',lostReason:'Trop cher',city:'Poissy',rating:'3.9'},{id:'c',name:'C',stage:'contacte',city:'Triel'}];
S.calls.push(mk(5,10,'nr','a',{dial:25}),mk(4,10,'ans','a',{dur:240,dial:240,dead:20}),mk(2,11,'rdvv','a',{dur:600,rdvAt:addDays(today(),-1)+'T10:00'}),mk(3,9,'nr','b'),mk(2,9,'ans','b',{dur:120}),mk(1,9,'no','b',{dur:60,obj:'Trop cher'}),mk(0,9,'rap','c',{dur:200}),mk(0,10,'ans','c',{dur:90}));
S.calls.push({id:'o1',t:new Date().toISOString(),result:'sent',channel:'dm_insta',prospectId:'a'},{id:'o2',t:new Date().toISOString(),result:'reply',channel:'dm_insta',prospectId:'a'});
S.content=[{id:'ct',d:today(),platform:'Instagram',format:'Reel',views:1200,dms:3,rdv:1}];S.act[today()]=3600;S.act[addDays(today(),-2)]=7200}
S.tab='stats';S.st.days=0;render()},empty);
for(const empty of [false,true]){await seed(empty);await pg.evaluate(()=>{const d=document.querySelector('main details.card');if(d)d.open=true});
 const tx=await pg.textContent('main');const tag=empty?'(base vide) ':'';
 for(const t of ['1 · Où partent','2 · Durée des conversations','3 · Sonnerie','4 · Appels par heure','5 · Pourquoi tu perds','6 · Combien d','7 · Délais','8 · Visio, physique','12 · Tes rappels','13 · DM, vidéos','14 · Contenus','par ville','par note Google','par source'])ok(tx.includes(t),tag+'bloc présent : '+t);
 ok(!/NaN|undefined|Infinity/.test(tx),tag+'aucun NaN / undefined / Infinity');
 if(!empty){ok(/Trop cher/.test(tx)&&/Triel/.test(tx)&&/4,5 à 4,7/.test(tx),'valeurs : motif, ville, note');ok(/Instagram/.test(tx)&&/1 200/.test(tx.replace(/ | /g,' ')),'contenu affiché')}}
ok(errs.length===0,'aucune erreur JS '+errs.join('|'));await b.close()})();
