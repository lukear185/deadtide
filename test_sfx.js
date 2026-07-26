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
 +'  var vol=[];'
 +'  for(var k2 in SFXBUF){var b=SFXBUF[k2];if(!b)continue;'
 +'   var d=b.getChannelData(0),sq=0;'
 +'   for(var i=0;i<d.length;i++)sq+=d[i]*d[i];'
 +'   vol.push(k2+"="+(Math.sqrt(sq/d.length)*(SFX_GAIN[k2]||1)).toFixed(4));}'
 +'  document.title="SFX "+ok+"/"+n+(bad.length?(" NG:"+bad.join(",")):"")+" V "+vol.join(",");'
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

/* ---- ⭐実際に鳴る音量(RMS×SFX_GAIN)を測って釣り合いを見る(2026-07-26 第83弾) ----
   ⚠ユーザー指示「ゾンビの声を全体的に下げて。特にボス登場時の叫び声」。
     直した時に測ったら、**ボス登場の咆哮 growl が53種で一番大きかった**(素のRMS 0.441)。
   ⚠**耳で確かめられないので数字で見る**。ここが落ちたら音量の釣り合いが崩れている。 */
const vm=/ V (.+)$/.exec(t);
if(!vm){console.log('FAIL: 音量を測れなかった');process.exit(1);}
const V={};
for(const kv of vm[1].split(',')){const [k,v]=kv.split('=');V[k]=+v;}
/* 役割ごとの分類。⚠bite/bite2は「噛みつく音」で声ではないので入れない */
const ROAR=['growl','growl2'];                                   /* ボス登場の咆哮 */
const MOAN=['moan','moan2','moan3','moanW','moanN','die'];       /* 始終鳴るうめき */
const BIG=['moanBig','moanBig2'];                                /* エリート/ボスのうめき */
const VOICE=ROAR.concat(MOAN,BIG,['bossKill','scratch']);
const other=Object.keys(V).filter(k=>VOICE.indexOf(k)<0);
const miss=VOICE.filter(k=>V[k]===undefined);
if(miss.length){console.log('FAIL: 音が見つからない: '+miss.join('/'));process.exit(1);}
const avg=a=>a.reduce((x,k)=>x+V[k],0)/a.length;
const max=a=>a.reduce((x,k)=>Math.max(x,V[k]),0);
const oMax=max(other),oAvg=avg(other);
const fail=[];
/* ① ゾンビの声が「ゾンビ以外の一番大きい音」を超えていないか(=ゾンビが一番うるさい状態に戻っていないか) */
for(const k of VOICE)if(V[k]>oMax)fail.push(k+'('+V[k].toFixed(3)+')が非ゾンビの最大'+oMax.toFixed(3)+'を超えている');
/* ② 始終鳴るうめきは、ほかの音の平均より小さいこと(環境音なので前に出てはいけない) */
for(const k of MOAN)if(V[k]>oAvg)fail.push(k+'('+V[k].toFixed(3)+')が他の音の平均'+oAvg.toFixed(3)+'より大きい');
/* ③ 同じ役割の変種どうしで音量が離れていないこと(くじで引くので、鳴るたびに大きさが変わってしまう) */
for(const grp of [ROAR,MOAN,BIG])
 if(max(grp)>avg(grp)*1.8)fail.push('['+grp.join('/')+']の音量差が大きすぎる(最大'+max(grp).toFixed(3)+' 平均'+avg(grp).toFixed(3)+')');
if(fail.length){console.log('FAIL: 音量の釣り合い\n  - '+fail.join('\n  - '));process.exit(1);}
console.log('音量の釣り合い: 咆哮'+avg(ROAR).toFixed(3)+' / うめき'+avg(MOAN).toFixed(3)
 +' / 大うめき'+avg(BIG).toFixed(3)+' / ボス撃破'+V.bossKill.toFixed(3)
 +' ← ゾンビ以外(平均'+oAvg.toFixed(3)+' 最大'+oMax.toFixed(3)+') OK');
