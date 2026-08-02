/* 🏷 開発者名(NAKIGARA)のアイコンとヘッダーを書き出す道具。
   使い方: node tool_brand.js [名前] [説明文]
     例) node tool_brand.js                    … いまの設定のまま作り直す
         node tool_brand.js NAKIGARA ""        … 説明文なし(既定)
         node tool_brand.js NAKIGARA "ひとりで作っています"
   ・⭐**絵はゲーム本体(index.html)が描いているゾンビをそのまま使う**=素材を1枚も増やさない。
     ヘッドレスChromeで index.html を読み込み、`zcThumb`/`drawZombie` の結果を data URI で吸い出す。
   ・出力先は `brand/`。⚠**スマホから落とせるように `brand/index.html` も置いてある**
     (公開URL/brand/ で開く)。
   ・⚠Chromeが無ければ Edge を使う(test_shot.js と同じ探し方)。 */
const fs=require('fs'),os=require('os'),path=require('path'),cp=require('child_process');
const DIR=__dirname, OUT=path.join(DIR,'brand');
const NAME=process.argv[2]||'NAKIGARA';
/* ⚠**説明文は既定で「無し」**(2026-08-03ユーザー指示で消した)。付けたい時だけ第2引数で渡す */
const TAG=process.argv[3]!==undefined?process.argv[3]:'';
const BR=['C:/Program Files/Google/Chrome/Application/chrome.exe',
 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
 'C:/Program Files/Microsoft/Edge/Application/msedge.exe'].find(p=>fs.existsSync(p));
if(!BR){console.log('❌ Chrome/Edge が見つからない');process.exit(1);}
if(!fs.existsSync(OUT))fs.mkdirSync(OUT);

/* ── ① ゲーム本体から絵を吸い出す ────────────────────────────
   ⚠**`--screenshot` では絵を「持ち帰れない」**ので `--dump-dom` を使う=
     ページ側で `toDataURL()` した結果を `<div id="dump">` に詰めて、標準出力から抜く。 */
function pullArt(){
 const html=fs.readFileSync(path.join(DIR,'index.html'),'utf-8');
 const inj='<scr'+'ipt>setTimeout(function(){try{'
  +'var o={},mk=function(w,h){var c=document.createElement("canvas");c.width=w;c.height=h;return c;};'
  +'var ids=["walk","run","arm","brut","crwl","dog","stlk","tank","blo","scr"];'
  +'ids.forEach(function(id){'
  +' var zi=ZOMBIES.findIndex(function(z){return z.id===id;});if(zi<0)return;'
  +' try{var a=mk(512,512);zcThumb(a,zi,0);o["z_"+id]=a.toDataURL("image/png");}catch(e){}'
  +' try{var b=mk(512,512);zcThumb(b,zi,1);o["s_"+id]=b.toDataURL("image/png");}catch(e){}'
  +'});'
  /* 顔だけ大きく=アイコン用。⚠足元が原点なので、頭(-52単位)が真ん中へ来るよう寄せる */
  +'[["walk",16],["brut",13]].forEach(function(q){'
  +' var zi=ZOMBIES.findIndex(function(z){return z.id===q[0];});if(zi<0)return;'
  +' var k=q[1]/(ZOMBIES[zi].sc||1);'
  +' try{var c=mk(512,512),cc=c.getContext("2d");'
  +'  cc.translate(256,256+52*k);cc.scale(k,k);cc.lineWidth=2.4/k;'
  +'  drawZombie(cc,zi,0,0,-1,.4,0,{});o["head_"+q[0]]=c.toDataURL("image/png");}catch(e){}'
  +'});'
  +'var e=document.createElement("div");e.id="dump";e.textContent=JSON.stringify(o);'
  +'document.body.appendChild(e);'
  +'}catch(e){var d=document.createElement("div");d.id="dump";d.textContent=JSON.stringify({err:e.message});'
  +'document.body.appendChild(d);}},1500);</scr'+'ipt>';
 const tmp=path.join(os.tmpdir(),'dt_brand_pull.html');
 fs.writeFileSync(tmp,html.replace('</body>',inj+'</body>'));
 const r=cp.spawnSync(BR,['--headless=new','--disable-gpu','--no-sandbox','--window-size=852,393',
  '--virtual-time-budget=7000','--dump-dom','file:///'+tmp.replace(/\\/g,'/')+'?dev=1'],
  {encoding:'utf-8',maxBuffer:1024*1024*96});
 const m=/<div id="dump">([\s\S]*?)<\/div>/.exec(r.stdout||'');
 if(!m){console.log('❌ 絵を取り出せなかった');process.exit(1);}
 const j=JSON.parse(m[1]);
 if(j.err){console.log('❌ ページ側で例外: '+j.err);process.exit(1);}
 console.log('✓ ゲームから絵を取り出した('+Object.keys(j).length+'枚)');
 return j;
}

/* ── ② 絵を差し込んだ作成ページを作って、実寸で撮る ── */
const ART=pullArt();
let tpl=fs.readFileSync(path.join(OUT,'_maker.html'),'utf-8');
tpl=tpl.replace('<script>','<script>window.__BRAND__='+JSON.stringify(ART)+';</scr'+'ipt>\n<script>');
const page=path.join(os.tmpdir(),'dt_brand_maker.html');
fs.writeFileSync(page,tpl);
function shot(q,w,h,out,scale){
 const u='file:///'+page.replace(/\\/g,'/')+'?'+q;
 const r=cp.spawnSync(BR,['--headless=new','--disable-gpu','--no-sandbox',
  '--force-device-scale-factor='+(scale||1),'--hide-scrollbars','--window-size='+w+','+h,
  '--virtual-time-budget=4000','--screenshot='+path.join(OUT,out),u],{encoding:'utf-8'});
 const ok=/written to file/.test(r.stderr||'');
 console.log((ok?'✓ ':'✗ ')+'brand/'+out+'  '+w+'×'+h+(scale>1?(' @'+scale+'x'):''));
}
const N=encodeURIComponent(NAME),T=encodeURIComponent(TAG);
shot('p=B',400,400,'nakigara_icon.png');                       /* Xのアイコン */
shot('p=B',400,400,'nakigara_icon@2x.png',2);                  /* 大きい版(800相当) */
shot('p=horde&n='+N+'&tag='+T,1500,500,'nakigara_header.png'); /* Xのヘッダー */
shot('p=prev&i=B&h=horde&n='+N+'&tag='+T,1200,560,'nakigara_preview.png');
shot('p=B&bg='+encodeURIComponent('#241f19'),400,400,'ico_bg_ink.png');
shot('p=B&bg='+encodeURIComponent('#5f7a33'),400,400,'ico_bg_green.png');
console.log('名前: '+NAME+' / 説明文: '+(TAG||'(なし)'));
console.log('⭐スマホから落とす時は 公開URL/brand/ を開く');
