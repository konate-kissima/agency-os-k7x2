const { chromium } = require('playwright'); const fs=require('fs');
(async()=>{const b=await chromium.launch({args:['--autoplay-policy=no-user-gesture-required']});const pg=await (await b.newContext()).newPage();let f=0;const ok=(n,c)=>{console.log((c?'PASS ':'FAIL ')+n);if(!c)f++};
const lame=fs.readFileSync('/tmp/lame/node_modules/lamejs/lame.min.js','utf8');
await pg.route('**/lamejs/**',r=>r.fulfill({contentType:'application/javascript',body:lame}));
const tmp=fs.mkdtempSync('/tmp/aos-');fs.copyFileSync('index.html',tmp+'/index.html');fs.writeFileSync(tmp+'/config.js','window.AOS_CONFIG={url:"",key:""};');
pg.on('pageerror',e=>console.log('ERR',e.message));
await pg.goto('file://'+tmp+'/index.html');await pg.waitForSelector('.chal');
// WAV stéréo 44,1 kHz de 60 s (≈ 10,6 Mo) avec une tonalité
const r=await pg.evaluate(async()=>{
  const sr=44100,sec=60,n=sr*sec,buf=new ArrayBuffer(44+n*4),v=new DataView(buf);const w=(o,s)=>[...s].forEach((c,i)=>v.setUint8(o+i,c.charCodeAt(0)));
  w(0,'RIFF');v.setUint32(4,36+n*4,true);w(8,'WAVEfmt ');v.setUint32(16,16,true);v.setUint16(20,1,true);v.setUint16(22,2,true);v.setUint32(24,sr,true);v.setUint32(28,sr*4,true);v.setUint16(32,4,true);v.setUint16(34,16,true);w(36,'data');v.setUint32(40,n*4,true);
  for(let i=0;i<n;i++){const x=Math.round(Math.sin(i/20)*12000);v.setInt16(44+i*4,x,true);v.setInt16(46+i*4,x,true)}
  const file=new File([buf],'gros.wav',{type:'audio/wav'});const t0=Date.now();const out=await compressAudio(file);
  return {in:file.size,out:out.size,type:out.type,ms:Date.now()-t0}});
console.log(JSON.stringify(r));
ok('réduit au moins 20 fois',r.out*20<r.in);ok('type mp3',r.type==='audio/mpeg');ok('~0,25 Mo/min',r.out>150000&&r.out<400000);
await b.close();process.exit(f?1:0)})();
