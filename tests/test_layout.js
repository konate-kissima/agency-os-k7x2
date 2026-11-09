const { chromium } = require('playwright'); const fs=require('fs');
(async()=>{const b=await chromium.launch();let f=0;const ok=(n,c)=>{console.log((c?'PASS ':'FAIL ')+n);if(!c)f++};
for(const w of [1000,1300,390]){
const pg=await (await b.newContext({viewport:{width:w,height:900}})).newPage();
const tmp=fs.mkdtempSync('/tmp/aos-');fs.copyFileSync('index.html',tmp+'/index.html');fs.writeFileSync(tmp+'/config.js','window.AOS_CONFIG={url:"",key:""};');
await pg.goto('file://'+tmp+'/index.html');await pg.waitForSelector('.chal');await pg.evaluate(()=>{S.chal=false;render()});await pg.waitForSelector('nav.tabs');
await pg.evaluate(async()=>{await DB.set('prospects','A1',{name:'Alpha',city:'Paris',phone:'01 83 61 98 86',stage:'contacte',nextDate:today()});await loadAll();S.tab='appels';render()});
const r=await pg.evaluate(()=>{const c=document.querySelector('.callcard'),s=document.querySelector('.scriptcard');const bs=[...document.querySelectorAll('.actbar .btn')].map(x=>x.getBoundingClientRect());return{nested:!!c.querySelector('.scriptcard'),side:s.getBoundingClientRect().left>c.getBoundingClientRect().left+50,sameTop:new Set(bs.slice(0,2).map(x=>Math.round(x.top))).size===1,sameH:new Set(bs.map(x=>Math.round(x.height))).size===1,overflow:document.documentElement.scrollWidth>innerWidth}});
ok(w+' script hors carte appel',!r.nested);if(w>820)ok(w+' script à droite',r.side);ok(w+' boutons alignés',r.sameTop&&r.sameH);ok(w+' pas de débordement',!r.overflow)}
await b.close();process.exit(f?1:0)})();
