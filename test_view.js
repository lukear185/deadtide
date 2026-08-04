/* 👁 見た目の実測検査(test_view.js)
   ⚠⚠**`test_layout.js` とは別物**。あちらはDOMをスタブ(作り物)しているので
     「画面からはみ出している」を**原理的に1件も見つけられない**(2026-08-03(108)に実際に素通りした)。
   ⭐こちらは**本物のヘッドレスChromeでページを開いて `getBoundingClientRect` を叩く**。

   使い方:
     node test_view.js              … 1920x1080(PC・既定)で全場面を測る
     node test_view.js 852 393      … 凍結したスマホ版を見る時だけ
     node test_view.js 932 430      … 別の画面の大きさで測る
     node test_view.js --all        … 見つかったものを全部並べる(既定は各種10件まで)

   見ているのは4つ:
     ✂ はみ出し      … 画面や親の枠から出ていて**スクロールしても見えない**
     🔀 押す所の重なり … 押し間違いになる
     👆 押す所が小さい … 44px未満(この企画の物差し)
     🔡 文字が小さい   … 10.5px未満
   ⚠**「スクロールしないと見えない」は見ない**=長い一覧では当たり前で、300件超のノイズになった。

   ⚠**件数は `release_baseline.json` の基準と比べる**=増えた時だけ落とす(元からある分は通す)。
     減ったら `node test_view.js --accept` で基準を下げる。 */
const fs=require('fs'),os=require('os'),path=require('path'),cp=require('child_process');

const ARG=process.argv.slice(2);
const ALL=ARG.indexOf('--all')>=0;
const ACCEPT=ARG.indexOf('--accept')>=0;
const NUMS=ARG.filter(a=>/^\d+$/.test(a));
/* ⭐既定をPC(1920x1080)にした(2026-08-04にPCへ移行) */
const W=+(NUMS[0]||1920),H=+(NUMS[1]||1080);

const BROWSERS=['C:/Program Files/Google/Chrome/Application/chrome.exe',
 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'];
const BR=BROWSERS.find(p=>fs.existsSync(p));
if(!BR){console.log('ChromeもEdgeも見つからない');process.exit(1);}

const html=fs.readFileSync(path.join(__dirname,'index.html'),'utf-8');
/* ⚠ヘッドレスChromeでは @media (pointer:coarse) が効かない=スマホ用CSSを条件なしで後ろに足す
   (test_shot.js と同じ理屈。これを忘れると**実機と違う寸法**を測って嘘の結果になる) */
function coarseCSS(s){
 const k='@media (pointer:coarse){';let out='',from=0;
 for(;;){const i=s.indexOf(k,from);if(i<0)break;
  let d=1,j=i+k.length;
  while(j<s.length&&d>0){if(s[j]==='{')d++;else if(s[j]==='}')d--;j++;}
  out+=s.slice(i+k.length,j-1)+'\n';from=j;}
 return out;}

/* ---- 測る場面 ----
   ⚠**「たまにしか出ない形」こそ入れる**=▶続きから が出ている時だけ崩れていた(2026-08-03(108))。
   ⚠盤面(canvas)の中は測れない=ここで見るのはDOMで組んだ画面だけ。 */
const RUNJS='JSON.stringify({v:2,stg:0,dif:2,wave:4})';
const OWN='META.hero={hNox:1,hSf:1,hMed:2,hCop:1,hLupi:1};META.hsel="hLupi";';
const BASE='META.tr0=1;META.pts=4820;META.gem=200;META.hmat=88;'+OWN
 +'META.sc=[[1,1,1,1,0,0],[0,0,0,0,0,0]];META.st=["air","mgun","frost"];META.eq="air";'
 +'META.hlv={hNox:3,hSf:22};META.zdex={};ZOMBIES.forEach(function(z,i){if(i%2===0)META.zdex[z.id]=1;});';
const NORUN='try{localStorage.removeItem(RUN_KEY);}catch(e){}';
const HASRUN='try{localStorage.setItem(RUN_KEY,'+RUNJS+');}catch(e){}';
const SCENES=[
 ['タイトル',            'show("title");'],
 ['ホーム',              NORUN+'renderHome();show("home");'],
 ['ホーム(▶続きから)',   HASRUN+'renderHome();show("home");'],
 ['エリアマップ',        'MSEL=mapDefSel();mapSel(MSEL);MBUS=null;show("map");'],
 ['研究所',              'renderLab();MD("md-lab");'],
 ['英雄召集',            'META.tk5=0;renderGacha(null);MD("md-gacha");'],
 ['英雄召集(🎫あり)',    'META.tk5=1;renderGacha(null);MD("md-gacha");'],
 ['鍛錬所',              'META.tk5=0;TRTAB="hero";renderTrain();MD("md-train");'],
 /* 📖(142)図鑑は鍛錬所のタブから**独立した窓(md-zoo)**へ出した=開き方も変える。
    ⚠古い開き方(TRTAB="zoo")のままだと「鍛える」画面を2回測るだけになる */
 ['ゾンビ図鑑',          'openZoo();MD("md-zoo");'],
 ['編成',                'renderLoad();MD("md-load");'],
 ['英雄を選ぶ',          'renderHeroPick();MD("md-hpick");'],
 /* ⚠**「←戻る」が出ている形で測る**=たまにしか出ない物こそ入れる(2026-08-03(108)の教訓)。
    ⚠⚠**先に他の窓を閉じる**=openHStat は自分で閉じないので、前の場面の窓が開いたままだと
      `.modal.on` の**1枚目**(=前の窓)を測ってしまう(実際に英雄を選ぶ窓を測っていた) */
 ['英雄ステータス',      'MDX();openHStat("hLupi","gacha");'],
 ['砲撃を選ぶ',          'renderStkPick();MD("md-stk");'],
 ['オプション',          'optRender();MD("md-opt");'],
 /* 🏹(125)弓比べ=別ゲーム。ホームと盤面の両方を測る(盤面は下の操作の帯が要になる) */
 ['🏹弓比べ ホーム',     'MDX();arcOpen();'],
 ['🏹弓比べ 盤面',       'MDX();arcPlay();'],
 ['🏹弓比べ 盤面(相手の番)', 'MDX();arcPlay();ARC.ph="ethink";arcUI();'],
];

/* ---- ページの中で走る測定器 ---- */
const RUNNER=`
/* 開いているモーダルを1枚だけにする(前の場面が残っていると重なって嘘の結果になる) */
function MDX(){document.querySelectorAll('.modal.on').forEach(function(m){m.classList.remove('on');});}
function MD(id){MDX();document.getElementById(id).classList.add('on');}
function VIS(e){var cs=getComputedStyle(e);
 if(cs.display==='none'||cs.visibility==='hidden'||+cs.opacity===0)return false;
 var r=e.getBoundingClientRect();return r.width>0.5&&r.height>0.5;}
/* ⭐**親の切り取りをたどる**=overflowがvisible以外の親は、そこから先を隠す。
   ⚠scroll/auto なら「スクロールすれば届く」ので、はみ出しとは区別する。 */
function CLIP(e){
 var L=0,T=0,R=innerWidth,B=innerHeight,sc=false;
 for(var p=e.parentElement;p;p=p.parentElement){
  var cs=getComputedStyle(p),ox=cs.overflowX,oy=cs.overflowY;
  if(ox==='visible'&&oy==='visible')continue;
  var q=p.getBoundingClientRect();
  if(ox!=='visible'){L=Math.max(L,q.left);R=Math.min(R,q.right);if(ox==='auto'||ox==='scroll')sc=true;}
  if(oy!=='visible'){T=Math.max(T,q.top);B=Math.min(B,q.bottom);if(oy==='auto'||oy==='scroll')sc=true;}
 }
 return {L:L,T:T,R:R,B:B,sc:sc};
}
function TAPPABLE(e){
 var t=e.tagName;
 if(t==='BUTTON'||t==='A'||t==='INPUT'||t==='SELECT')return true;
 if(e.classList&&(e.classList.contains('btn')||e.classList.contains('xbtn')||e.classList.contains('tb')))return true;
 return !!e.onclick;
}
function NAME(e){return (e.id?'#'+e.id:'')+(e.className&&typeof e.className==='string'?('.'+e.className.trim().split(/\\s+/).slice(0,2).join('.')):'')||e.tagName;}
/* 自分の文字を直接持っているか(親の箱まで数えると同じ文字を何度も咎めてしまう) */
function OWNTEXT(e){for(var i=0;i<e.childNodes.length;i++){var n=e.childNodes[i];
 if(n.nodeType===3&&n.nodeValue&&n.nodeValue.trim())return true;}return false;}
function VIEW_SCAN(scene){
 var out=[],vw=innerWidth,vh=innerHeight;
 var root=document.querySelector('.modal.on')||document.querySelector('.scr.on');
 if(!root)return out;
 var els=[],all=root.querySelectorAll('*');
 for(var i=0;i<all.length;i++)if(VIS(all[i]))els.push(all[i]);
 var taps=[];
 for(var k=0;k<els.length;k++){var e=els[k],r=e.getBoundingClientRect(),c=CLIP(e);
  /* ①はみ出し。⚠2pxは丸め誤差の逃がし。
     ⚠**スクロールできる親の中は見ない**(c.sc)=長い一覧では下が隠れていて当たり前。
     ⚠**インラインのアイコン画像(.ico)は除く**=height:1.4em で行の箱からわざと はみ出す作り。 */
  var ico=e.classList&&e.classList.contains('ico');
  var over=Math.max(r.bottom-c.B,c.T-r.top,r.right-c.R,c.L-r.left);
  if(over>2&&!c.sc&&!ico){
   /* 大きな入れ物(親そのもの)は代表して1件でよい=子まで全部咎めると同じ崩れが何十件にもなる */
   var pr=e.parentElement?e.parentElement.getBoundingClientRect():null;
   var dup=pr&&Math.abs(pr.bottom-r.bottom)<2&&Math.abs(pr.right-r.right)<2;
   if(!dup)out.push({s:scene,k:'cut',e:NAME(e),d:Math.round(over)+'px'});
  }
  if(TAPPABLE(e)&&!e.disabled){taps.push({e:e,r:r});
   /* ③押す所の大きさ。⚠44pxはこの企画の物差し(CLAUDE.md) */
   if(r.width<43.5||r.height<43.5)
    out.push({s:scene,k:'tap',e:NAME(e),d:Math.round(r.width)+'x'+Math.round(r.height)});
  }
  /* ④文字の大きさ。⚠自分の文字を持つ要素だけ */
  if(OWNTEXT(e)){var fs=parseFloat(getComputedStyle(e).fontSize)||99;
   if(fs<10.4)out.push({s:scene,k:'font',e:NAME(e),d:fs.toFixed(1)+'px'});}
 }
 /* ⑤押す所どうしの重なり(押し間違いになる) */
 for(var a=0;a<taps.length;a++)for(var b=a+1;b<taps.length;b++){
  var p=taps[a],q=taps[b];
  if(p.e.contains(q.e)||q.e.contains(p.e))continue;
  var ow=Math.min(p.r.right,q.r.right)-Math.max(p.r.left,q.r.left);
  var oh=Math.min(p.r.bottom,q.r.bottom)-Math.max(p.r.top,q.r.top);
  if(ow>2&&oh>2)out.push({s:scene,k:'overlap',e:NAME(p.e)+' × '+NAME(q.e),d:Math.round(ow)+'x'+Math.round(oh)});
 }
 return out;
}
`;

const scenesJs=SCENES.map(s=>'['+JSON.stringify(s[0])+',function(){'+s[1]+'}]').join(',');

const inj='<scr'+'ipt>\n'
 +'/* 👁 実測検査の注入分。⚠index.html 本体には何も足していない(一時ファイルにだけ足す) */\n'
 +RUNNER
 +'setTimeout(function(){var R=[];try{\n'
 +BASE+'\n'
 +'var SC=['+scenesJs+'];\n'
 +'for(var i=0;i<SC.length;i++){try{SC[i][1]();}catch(e){R.push({s:SC[i][0],k:"err",e:"場面を作れない",d:e.message});continue;}\n'
 +'  try{R=R.concat(VIEW_SCAN(SC[i][0]));}catch(e){R.push({s:SC[i][0],k:"err",e:"測れない",d:e.message});}}\n'
 +'}catch(e){R.push({s:"(準備)",k:"err",e:"準備で落ちた",d:e.message});}\n'
 /* ⭐測り終わったらページを捨てて結果だけにする=--dump-dom の出力が3MBにならない */
 +'try{var j=JSON.stringify({vw:innerWidth,vh:innerHeight,r:R});\n'
 +' document.documentElement.innerHTML="<head></head><body><pre id=\\"VIEWOUT\\">"'
 +'+j.replace(/&/g,"&amp;").replace(/</g,"&lt;")+"</pre></body>";}catch(e){}\n'
 +'},2600);\n'
 +'</scr'+'ipt>';

const tmp=path.join(os.tmpdir(),'dt_view_'+W+'x'+H+'.html');
fs.writeFileSync(tmp,html.replace('</body>',
 '<style>'+coarseCSS(html)+'</style>'+inj+'</body>'));

/* ⚠⚠**`--window-size` は窓の外枠**=中身(innerWidth/innerHeight)はそれより小さい
   (実測で 852x393 を頼むと 836x298 になった=**95pxも違う**)。
   ⭐**まず小さな板で測って差を出し、その差を足して開き直す**=どの版のChromeでも狙った寸法になる。
   ⚠これを怠ると**実機と違う画面で測って嘘の結果**が出る(はみ出しが大量に出た)。 */
function probe(w,h){
 const p=path.join(os.tmpdir(),'dt_view_probe.html');
 fs.writeFileSync(p,'<body><script>setTimeout(function(){document.documentElement.innerHTML='
  +'"<pre id=\\"VP\\">"+innerWidth+"x"+innerHeight+"</pre>";},50)<\/script></body>');
 const o=cp.spawnSync(BR,['--headless=new','--disable-gpu','--no-sandbox','--hide-scrollbars',
  '--window-size='+w+','+h,'--virtual-time-budget=800','--dump-dom','file:///'+p.replace(/\\/g,'/')],
  {encoding:'utf-8',maxBuffer:1024*1024*8});
 const mm=/<pre id="VP">(\d+)x(\d+)</.exec(o.stdout||'');
 return mm?{w:+mm[1],h:+mm[2]}:null;
}
const p1=probe(W,H);
let winW=W,winH=H;
if(p1){winW=W+(W-p1.w);winH=H+(H-p1.h);}
else console.log('⚠ 画面の大きさを測れなかった(そのままの寸法で開く)');

const args=['--headless=new','--disable-gpu','--no-sandbox','--hide-scrollbars',
 '--window-size='+winW+','+winH,'--virtual-time-budget=6000','--dump-dom',
 'file:///'+tmp.replace(/\\/g,'/')];
const r=cp.spawnSync(BR,args,{encoding:'utf-8',maxBuffer:1024*1024*64});
const dom=r.stdout||'';
const m=/<pre id="VIEWOUT">([\s\S]*?)<\/pre>/.exec(dom);
if(!m){
 console.log('❌ 測定結果を取り出せなかった(ページが最後まで動いていない)');
 console.log((r.stderr||'').split('\n').filter(l=>/ERROR|error/.test(l)).slice(0,6).join('\n'));
 process.exit(1);
}
let data;
try{data=JSON.parse(m[1].replace(/&lt;/g,'<').replace(/&amp;/g,'&'));}
catch(e){console.log('❌ 結果を読めない: '+e.message);process.exit(1);}

const KIND={cut:'✂ はみ出し(スクロールしても見えない)',
 tap:'👆 押す所が44px未満',font:'🔡 文字が10.5px未満',overlap:'🔀 押す所が重なっている',
 err:'💥 場面を作れない/測れない'};
const ORDER=['err','cut','overlap','tap','font'];

/* ⚠狙った寸法で測れたかを必ず言う=違う画面で測った結果を「合格」と言わないため */
if(data.vw!==W||data.vh!==H)
 console.log('⚠ 狙い '+W+'x'+H+' に対して実際は '+data.vw+'x'+data.vh+' で測った(差が大きいなら結果は当てにならない)');
console.log('👁 見た目の実測検査  '+data.vw+'x'+data.vh+' / 場面 '+SCENES.length+'枚');
console.log('─'.repeat(60));
const cnt={};
for(const f of data.r)cnt[f.k]=(cnt[f.k]||0)+1;
for(const k of ORDER){
 const list=data.r.filter(f=>f.k===k);
 if(!list.length)continue;
 console.log((KIND[k]||k)+'  '+list.length+'件');
 const show=ALL?list:list.slice(0,10);
 for(const f of show)console.log('   ['+f.s+'] '+f.e+'  '+f.d);
 if(list.length>show.length)console.log('   … 他'+(list.length-show.length)+'件(--all で全部出る)');
}
if(!data.r.length)console.log('🟢 何も見つからなかった');
console.log('─'.repeat(60));

/* ---- 基準と比べる(増えた時だけ落とす) ---- */
const BF=path.join(__dirname,'release_baseline.json');
let base={};
try{base=JSON.parse(fs.readFileSync(BF,'utf-8'));}catch(e){}
const key='view_'+W+'x'+H;
const now={};for(const k of ORDER)now[k]=cnt[k]||0;
if(ACCEPT){
 base[key]=now;fs.writeFileSync(BF,JSON.stringify(base,null,1));
 console.log('📝 基準を今の件数に更新した: '+JSON.stringify(now));
 process.exit(0);
}
const was=base[key];
if(!was){
 console.log('⚠ この大きさの基準がまだ無い。`node test_view.js '+W+' '+H+' --accept` で今の件数を基準にする。');
 process.exit(0);
}
/* ⚠**err(場面が作れない)だけは基準に関係なく落とす**=測れていないのに🟢と言うのが一番まずい。
   ⚠cut(はみ出し)は基準と比べる=元からある小さいものが1件あり、それで永久に赤にはしない。
     ただし**増えたら必ず落ちる**ので、新しく作った崩れは捕まる。 */
let ng=[];
for(const k of ORDER){const a=now[k],b=was[k]||0;if(a>b)ng.push(KIND[k]+' '+b+'→'+a);}
if(cnt.err){console.log('🔴 '+cnt.err+'件の場面が作れない/測れない=まずこれを直す');process.exit(1);}
if(ng.length){console.log('🔴 基準より増えた:\n   '+ng.join('\n   '));process.exit(1);}
const down=ORDER.filter(k=>now[k]<(was[k]||0));
console.log('🟢 基準どおり(増えていない)'+(down.length?'  ⭐減った項目あり=`--accept` で基準を下げられる':''));
