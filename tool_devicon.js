/* 🛠 テストモード用のアイコンを作る道具(icon-dev-180/192/512.png)。
   使い方: node tool_devicon.js

   ・⭐**素材を増やさない**=いまある icon-180/192/512.png を読み込んで、
     **緑の斜め帯 + 「TEST」の文字**を焼き込むだけ。ホーム画面で本番と一目で見分けが付くようにする。
   ・⚠**本番のアイコンは書き換えない**(別名で出す)。
   ・作り方は tool_brand.js と同じ=ヘッドレスChromeで描いて `--dump-dom` で data URI を持ち帰る
     (`--screenshot` では「絵を持ち帰る」ことができないため)。
   ・⚠Chromeが無ければ Edge を使う(test_shot.js と同じ探し方)。 */
const fs=require('fs'),os=require('os'),path=require('path'),cp=require('child_process');
const DIR=__dirname;
const BR=['C:/Program Files/Google/Chrome/Application/chrome.exe',
 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
 'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
 process.env.DT_CHROME||'',
 '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
 '/usr/bin/chromium','/usr/bin/chromium-browser','/usr/bin/google-chrome'].filter(Boolean).find(p=>fs.existsSync(p));
if(!BR){console.log('❌ Chrome/Edge が見つからない');process.exit(1);}

const SIZES=[180,192,512];
/* 素のアイコンを data URI にして、ページの中へ渡す(file:// の img は canvas を汚さないが、
   data URI にしておけば確実に toDataURL() できる) */
const SRC={};
for(const s of SIZES){
 const p=path.join(DIR,'icon-'+s+'.png');
 if(!fs.existsSync(p)){console.log('❌ '+p+' が無い');process.exit(1);}
 SRC[s]='data:image/png;base64,'+fs.readFileSync(p).toString('base64');
}

const page='<!doctype html><meta charset="utf-8"><body><div id="dump"></div><script>\n'
 +'var SRC='+JSON.stringify(SRC)+';\n'
 +'var out={},left=Object.keys(SRC).length;\n'
 +'Object.keys(SRC).forEach(function(s){\n'
 +' var n=+s,im=new Image();\n'
 +' im.onload=function(){\n'
 +'  var c=document.createElement("canvas");c.width=n;c.height=n;\n'
 +'  var x=c.getContext("2d");\n'
 +'  x.drawImage(im,0,0,n,n);\n'
 /* ⭐左上から右下へ斜めの帯。⚠**角に寄せる**=真ん中に置くと元の絵(ゾンビ)の顔を潰す */
 +'  var w=n*0.30;\n'
 +'  x.save();x.translate(n*0.5,n*0.5);x.rotate(-Math.PI/4);\n'
 +'  x.fillStyle="#7ac943";x.fillRect(-n,n*0.30-w*0.5,n*2,w);\n'
 +'  x.fillStyle="#1a1512";x.fillRect(-n,n*0.30-w*0.5,n*2,n*0.035);\n'
 +'  x.fillRect(-n,n*0.30+w*0.5-n*0.035,n*2,n*0.035);\n'
 +'  x.fillStyle="#1a1512";x.textAlign="center";x.textBaseline="middle";\n'
 +'  x.font="900 "+Math.round(n*0.17)+"px system-ui,sans-serif";\n'
 +'  x.fillText("TEST",0,n*0.30);\n'
 +'  x.restore();\n'
 +'  out[s]=c.toDataURL("image/png");\n'
 +'  if(--left===0)document.getElementById("dump").textContent=JSON.stringify(out);\n'
 +' };\n'
 +' im.src=SRC[s];\n'
 +'});\n'
 +'<\/script></body>';

const tmp=path.join(os.tmpdir(),'dt_devicon.html');
fs.writeFileSync(tmp,page);
const r=cp.spawnSync(BR,['--headless=new','--disable-gpu','--no-sandbox',
 '--virtual-time-budget=4000','--dump-dom','file:///'+tmp.replace(/\\/g,'/')],
 {encoding:'utf-8',maxBuffer:1024*1024*128});
const m=/<div id="dump">([\s\S]*?)<\/div>/.exec(r.stdout||'');
if(!m||!m[1].trim()){console.log('❌ 絵を持ち帰れなかった');process.exit(1);}
let o;try{o=JSON.parse(m[1].replace(/&quot;/g,'"').replace(/&amp;/g,'&'));}
catch(e){console.log('❌ 読めない: '+e.message);process.exit(1);}
for(const s of SIZES){
 const d=o[s];if(!d){console.log('❌ '+s+' が出てこなかった');process.exit(1);}
 const f=path.join(DIR,'icon-dev-'+s+'.png');
 fs.writeFileSync(f,Buffer.from(d.split(',')[1],'base64'));
 console.log('✅ '+path.basename(f)+'  '+fs.statSync(f).size+' B');
}
