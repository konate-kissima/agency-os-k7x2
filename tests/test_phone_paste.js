const { chromium } = require('playwright'); const fs=require('fs');
(async()=>{const b=await chromium.launch();const pg=await (await b.newContext()).newPage();let f=0;const ok=(n,c)=>{console.log((c?'PASS ':'FAIL ')+n);if(!c)f++};
const tmp=fs.mkdtempSync('/tmp/aos-');fs.copyFileSync('index.html',tmp+'/index.html');fs.writeFileSync(tmp+'/config.js','window.AOS_CONFIG={url:"",key:""};');
await pg.goto('file://'+tmp+'/index.html');await pg.waitForSelector('.chal');
await pg.evaluate(()=>{S.prospects=[{id:'A',name:'Delver Companie',phone:'06 63 03 17 43'},{id:'B',name:'Autre',phone:'01 83 61 98 86'}]});
const forms=['+33 6 63 03 17 43','‪+33 6 63 03 17 43‬','+33 6 63 03 17 43','0033663031743','06.63.03.17.43','‎+33 6 63 03 17 43','06 63 03 17 43','0663031743','663031743','+33 (0)6 63 03 17 43','+33 1 83 61 98 86'];
for(const q of forms){const r=await pg.evaluate(q=>callSearch(q).map(p=>p.id).join(','),q);ok(JSON.stringify(q)+' -> '+r,r===(q.includes('1 83')?'B':'A'))}
ok('recherche par nom',await pg.evaluate(()=>callSearch('delver').length===1));
await b.close();process.exit(f?1:0)})();
