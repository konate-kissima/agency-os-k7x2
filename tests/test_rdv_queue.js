const { chromium } = require('playwright'); const fs=require('fs');
(async()=>{const b=await chromium.launch();const pg=await (await b.newContext()).newPage();let f=0;const ok=(n,c)=>{console.log((c?'PASS ':'FAIL ')+n);if(!c)f++};
const tmp=fs.mkdtempSync('/tmp/aos-');fs.copyFileSync('index.html',tmp+'/index.html');fs.writeFileSync(tmp+'/config.js','window.AOS_CONFIG={url:"",key:""};');
await pg.goto('file://'+tmp+'/index.html');await pg.waitForSelector('.chal');
const r=await pg.evaluate(async()=>{const soon=new Date(Date.now()+3*36e5);const iso=d=>new Date(d.getTime()-d.getTimezoneOffset()*6e4).toISOString().slice(0,16);
 S.prospects=[{id:'A',name:'RdvProche',phone:'06 11 11 11 11',stage:'contacte',nextDate:today(),rdvAt:iso(soon),rdvType:'visio',rdvShow:''},
  {id:'B',name:'Normal',phone:'06 22 22 22 22',stage:'a_contacter'},
  {id:'C',name:'RdvTel',phone:'06 33 33 33 33',stage:'contacte',nextDate:today(),nextTime:'00:00',rdvAt:iso(soon),rdvType:'tel',rdvShow:''}];
 const q=callQueue().map(p=>p.id).sort().join(',');
 S.prospects=[{id:'D',name:'RdvDemain',phone:'06 44 44 44 44',stage:'rdv',rdvAt:iso(soon),rdvType:'visio',rdvShow:''}];
 DB.update=async()=>{};await waReply('D',true);const d=S.prospects[0];
 return {q,stage:d.stage,nd:d.nextDate||'',wa:d.waReply}});
ok('RDV visio à venir hors file, rdv tel et fiche normale gardés',r.q==='B,C');
ok('réponse WhatsApp ne casse pas un RDV',r.stage==='rdv'&&r.nd===''&&r.wa==='yes');
await b.close();process.exit(f?1:0)})();
