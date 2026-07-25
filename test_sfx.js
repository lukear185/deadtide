/* 効果音の実ブラウザ検査(2026-07-26 第57弾)
   ⚠ヘッドレスのNode環境には AudioContext が無いので、test_headless.js では
     **合成音のフォールバック側しか通らない**。埋め込んだMP3が本当に鳴るかはここで見る。
   やること: ヘッドレスChromeでindex.htmlを開き、ensureAC()→sfxLoad() を回して
             decodeAudioData が何本成功したかを数える。
   使い方: node test_sfx.js */
const fs=require('fs'),os=require('os'),path=require('path'),cp=require('child_process');
const BROWSERS=['C:/Program Files/Google/Chrome/Application/chrome.exe',
 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'];
const BR=BROWSERS.find(p=>fs.existsSync(p));
if(!BR){console.log('ChromeもEdgeも見つからない(検査を飛ばす)');process.exit(0);}
const html=fs.readFileSync(path.join(__dirname,'index.html'),'utf-8');
/* 読み込み後に音を全部展開して、結果を <title> に書き出させる */
const inj='<scr'+'ipt>setTimeout(function(){try{'
 +'ensureAC();'
 +'var n=Object.keys(SFXB).length;'
 +'var t0=Date.now();'
 +'(function wait(){'
 +' var ok=Object.keys(SFXBUF).length;'
 +' if(ok>=n||Date.now()-t0>7000){'
 +'  var bad=[];for(var k in SFXB)if(!SFXBUF[k])bad.push(k);'
 +'  document.title="SFX "+ok+"/"+n+(bad.length?(" NG:"+bad.join(",")):"");'
 +' }else setTimeout(wait,120);})();'
 +'}catch(e){document.title="ERR "+e.message;}},400);</scr'+'ipt>';
const tmp=path.join(os.tmpdir(),'dt_sfx_'+Date.now()+'.html');
fs.writeFileSync(tmp,html.replace('</body>',inj+'</body>'));
const out=cp.execFileSync(BR,['--headless=new','--disable-gpu','--no-sandbox','--mute-audio',
 '--autoplay-policy=no-user-gesture-required','--virtual-time-budget=12000','--dump-dom',
 'file:///'+tmp.replace(/\\/g,'/')],{encoding:'utf8',maxBuffer:1<<28});
try{fs.unlinkSync(tmp);}catch(e){}
const m=/<title>([^<]*)<\/title>/.exec(out);
const t=m?m[1]:'(タイトルが取れなかった)';
console.log('結果: '+t);
if(/^ERR/.test(t)){console.log('FAIL: 読み込みで例外');process.exit(1);}
const q=/^SFX (\d+)\/(\d+)/.exec(t);
if(!q){console.log('FAIL: 検査が完了しなかった');process.exit(1);}
if(+q[1]<+q[2]){console.log('FAIL: 展開できなかった効果音がある(形式が合っていない可能性)');process.exit(1);}
console.log('効果音: '+q[1]+'種すべて decodeAudioData に成功 OK');
