// 🖼 コンタクトシート撮り(tool_sheet.js) — 2026-08-06(189)ユーザー指示で作った
//
// ⚠⚠**作った理由**=Claude の目は「画像1枚」しかない。1体ずつ撮っていては
//   **全種の統一感**(色・大きさ・シルエット・光り方)を判断できない。
//   ⭐**全部を実表示サイズのまま格子に並べて1枚**にすると、情報の密度が数十倍になる。
//   📌これから **中段17種の絵 / 派生90種の見分け / 材質3種** を描くので、その前に要る道具。
//
// 使い方:
//   node tool_sheet.js out.png tw      # 🗼素のタワー
//   node tool_sheet.js out.png tg      # 🗼進化先(中段+最終形態)
//   node tool_sheet.js out.png un      # 🪖兵科30種
//   node tool_sheet.js out.png uv      # ⭐派生(78種)…素と並べて見分けが付くか
//   node tool_sheet.js out.png hero    # 🦸英雄22人
//   node tool_sheet.js out.png zom     # 🧟ゾンビ61種
// ⚠**数を手で持たない**=並ぶのは `UBASE`/`VARLIST`/`HEROES`/`ZOMBIES` の中身そのもの。
//   上の数は 2026-08-08 に index.html を数えた実測(⚠昔は「ゾンビ46種」「派生90種」と書いてあった)。
//   📌`VARLIST` が78で90でないのは、`VBASE` の4つ(mortarU/gren2/rail2/frost2)に派生が無いため。
//   node tool_sheet.js out.png zom --sil     # 🕶シルエットだけ=形で見分けが付くか
//   node tool_sheet.js out.png un --cols=8 --cell=150
//
// ⚠⚠**ページは index.html そのものを使う**(描画関数だけを別ページで呼ぶと、
//   本体の起動処理がDOMを触って落ちる=実際にそれで真っ黒な絵が出た)。
// ⚠**乱数と時刻を固定して描く**=毎回同じ絵にしないと前回と比べられない。
// ⚠❌**ゲーム画面まるごとのスクショ回帰は作らない**(TOOLS.md の判断)。部品のシートだけ。

const fs=require('fs'),path=require('path'),os=require('os'),cp=require('child_process');
const OUT=path.resolve(process.argv[2]||'sheet.png');
const KIND=(process.argv[3]||'tw').replace(/^--/,'');
const ARG=process.argv.slice(2).join(' ');
const NUM=(k,d)=>{const m=new RegExp('--'+k+'=(\\d+)').exec(ARG);return m?+m[1]:d;};
const SIL=ARG.indexOf('--sil')>=0;
/* ⭐(192)**--pick=名前,名前**=名前の一部で絞る(大きく撮って細部を見るため) */
const PICK=((/--pick=([^\s]+)/.exec(ARG)||[])[1]||'').split(',').filter(Boolean);
const COLS=NUM('cols',6),CELL=NUM('cell',180);
/* ⚠**7番目の引数は時刻であって大きさではない**(drawTower(c,ti,lv,x,y,ang,t,o))=
   大きさを変えたい時は ctx.scale で掛けること。既定は1マスに気持ちよく収まる倍率。 */
const ZOOM=+((/--zoom=([\d.]+)/.exec(ARG)||[])[1]||(KIND==='zom'?1.5:1.9));

const BROWSERS=['C:/Program Files/Google/Chrome/Application/chrome.exe',
 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
 process.env.DT_CHROME||'',
 '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
 '/usr/bin/chromium','/usr/bin/chromium-browser','/usr/bin/google-chrome'].filter(Boolean);
const BR=BROWSERS.find(p=>fs.existsSync(p));
if(!BR){console.log('ChromeもEdgeも見つからない');process.exit(1);}

/* ---- 何を並べるか ----
   ⚠**描画関数に渡せる物だけ**を並べる。盤面ごとでないと描けない物は test_shot.js の担当。 */
const KINDS={
 tw:  {t:'素のタワー',   list:'TOWERS.map(function(T,i){return{i:i,n:T.n,skip:T.grd||T.off||T.type==="sup"};})',
       draw:'function(c,e){drawTower(c,e.i,0,0,0,-0.55,1.3,{});}'},
 tg:  {t:'進化先',       list:'TOWERS.map(function(T,i){return{i:i,n:T.n,skip:!T.grd};})',
       draw:'function(c,e){drawTower(c,e.i,0,0,0,-0.55,1.3,{});}'},
 sup: {t:'支援施設',     list:'TOWERS.map(function(T,i){return{i:i,n:T.n,skip:T.type!=="sup"};})',
       draw:'function(c,e){drawTower(c,e.i,0,0,0,-0.55,1.3,{});}'},
 un:  {t:'兵科',         list:'UBASE.map(function(U,i){return{i:i,n:U.n};})',
       draw:'function(c,e){drawUnitAs(c,e.i,UBASE[e.i]);}'},
 uv:  {t:'派生(素→段)',  list:'VARLIST.map(function(v,k){return{i:UBASE.findIndex(function(u){return u.id===v.b;}),n:v.v.n,def:k};})',
       draw:'function(c,e){drawUnitAs(c,e.i,mkVar(UBASE[e.i],VARLIST[e.def].v));}'},
 hero:{t:'英雄',         list:'HEROES.map(function(H,k){return{i:HERO_I0+k,n:H.n};})',
       draw:'function(c,e){drawUnitAs(c,e.i,UNITS[e.i]);}'},
 zom: {t:'ゾンビ',       list:'ZOMBIES.map(function(Z,i){return{i:i,n:Z.n};})',
       draw:'function(c,e){drawZombie(c,e.i,0,0,-1,0,0,{});}'},
};
const K=KINDS[KIND];
if(!K){console.log('知らない種類: '+KIND+'  (使えるのは '+Object.keys(KINDS).join(' / ')+')');process.exit(1);}

/* ---- index.html に「シートを描くだけ」の script を足す ---- */
const html=fs.readFileSync(path.join(__dirname,'index.html'),'utf-8');
const inj='<script>(function(){\n'
+'/* 乱数と時刻を固定=毎回同じ絵にする(前回と比べるため) */\n'
+'var _x=20260806;Math.random=function(){_x=(_x*1103515245+12345)%2147483648;return _x/2147483648;};\n'
+'function build(){try{\n'
+' var PICK='+JSON.stringify(PICK)+';\n'
/* ⭐(192)**--pick=名前,名前** で数種だけに絞る=**大きく撮って細部を見る**ための口。
   ⚠派生78種を1枚にすると1体140pxで、肩当てや面頬のような小さな差は潰れて見えない。 */
+' var LIST=('+K.list+').filter(function(e){return e&&!e.skip&&e.n&&e.i>=0\n'
+'   &&(!PICK.length||PICK.some(function(q){return e.n.indexOf(q)>=0;}));});\n'
+' var DRAW='+K.draw+';\n'
+' var COLS='+COLS+',CELL='+CELL+',LBL=20,HEAD=28;\n'
+' var ROWS=Math.ceil(LIST.length/COLS);\n'
+' var cv=document.createElement("canvas");\n'
+' cv.width=COLS*CELL;cv.height=ROWS*(CELL+LBL)+HEAD;\n'
+' cv.style.cssText="position:fixed;left:0;top:0;z-index:99999";\n'
+' document.body.appendChild(cv);\n'
+' var c=cv.getContext("2d");\n'
+' c.fillStyle="#141210";c.fillRect(0,0,cv.width,cv.height);\n'
+' c.fillStyle="#e8e0cc";c.font="bold 17px sans-serif";c.textBaseline="top";\n'
+' c.fillText("'+K.t+'  "+LIST.length+"種'+(SIL?'  シルエット':'')+'",8,6);\n'
+' for(var k=0;k<LIST.length;k++){\n'
+'  var e=LIST[k],cx=(k%COLS)*CELL,cy=Math.floor(k/COLS)*(CELL+LBL)+HEAD;\n'
+'  var t=document.createElement("canvas");t.width=CELL;t.height=CELL;\n'
+'  var tc=t.getContext("2d");\n'
+'  /* ⭐**枠いっぱいに収める**=ゲーム側の `fitDraw` を借りる。\n'
+'     ⚠固定倍率だと、小さい塔は豆粒・ボスは枠からはみ出す(実際に両方出た)。\n'
+'     ⚠--zoom=1 を渡すと素の大きさ(実表示サイズ)で並ぶ=大きさの比を見たい時はこちら。 */\n'
+'  if('+(ZOOM?0:1)+'||!window.fitDraw){\n'
+'   tc.save();tc.translate(CELL/2,CELL*0.72);tc.scale('+(ZOOM||1)+','+(ZOOM||1)+');\n'
+'   try{DRAW(tc,e);}catch(err){tc.fillStyle="#c1502e";tc.font="12px sans-serif";tc.fillText("ERR",-12,0);}\n'
+'   tc.restore();\n'
+'  }else{try{fitDraw(t,function(cc){DRAW(cc,e);},10);}catch(err){\n'
+'   tc.fillStyle="#c1502e";tc.font="12px sans-serif";tc.fillText("ERR",4,20);}}\n'
+(SIL?
 '  /* シルエット化=白黒にして縮小→拡大でぼかす。⚠色でごまかせている物を炙り出すため */\n'
+'  var im=tc.getImageData(0,0,CELL,CELL),d=im.data;\n'
+'  for(var p=0;p<d.length;p+=4){var a=d[p+3];d[p]=d[p+1]=d[p+2]=255;d[p+3]=a>40?255:0;}\n'
+'  tc.putImageData(im,0,0);\n'
+'  var s2=document.createElement("canvas");s2.width=Math.max(4,CELL/7);s2.height=s2.width;\n'
+'  s2.getContext("2d").drawImage(t,0,0,s2.width,s2.height);\n'
+'  tc.clearRect(0,0,CELL,CELL);tc.imageSmoothingEnabled=true;tc.drawImage(s2,0,0,CELL,CELL);\n'
:'')
+'  c.drawImage(t,cx,cy);\n'
+'  c.strokeStyle="#2a2622";c.strokeRect(cx+0.5,cy+0.5,CELL-1,CELL-1);\n'
+'  c.fillStyle="#b8b2a4";c.font="12px sans-serif";\n'
+'  c.fillText(e.n.length>13?e.n.slice(0,12)+"…":e.n,cx+4,cy+CELL+3);\n'
+' }\n'
+' document.title="SHEET "+cv.width+" "+cv.height+" "+LIST.length;\n'
+'}catch(err){document.title="SHEETERR "+err.message;}}\n'
+'setTimeout(build,700);})();</scr'+'ipt>';

const tmp=path.join(os.tmpdir(),'dt_sheet_'+KIND+(SIL?'_sil':'')+'.html');
fs.writeFileSync(tmp,html.replace('</body>',inj+'</body>'));
const url='file:///'+tmp.replace(/\\/g,'/')+'?dev=1';

/* ---- 1回目=大きさを聞く(⚠--dump-dom は**テキストを持ち帰れる**のがこの手の道具の肝) ---- */
function probe(){
 const r=cp.spawnSync(BR,['--headless=new','--disable-gpu','--no-sandbox',
  '--virtual-time-budget=5000','--window-size=1200,900','--dump-dom',url],
  {encoding:'utf-8',maxBuffer:1<<28});
 const m=/<title>SHEET(ERR)? ([^<]*)<\/title>/.exec(r.stdout||'');
 if(!m)return null;
 if(m[1])return {err:m[2]};
 const p=m[2].trim().split(/\s+/).map(Number);
 return {w:p[0],h:p[1],n:p[2]};
}
const info=probe();
if(!info){console.log('🔴 シートを組み立てられなかった(index.html が読み込めていない)');process.exit(1);}
if(info.err){console.log('🔴 描画で例外: '+info.err);process.exit(1);}

/* ---- 2回目=その大きさで撮る ---- */
const r2=cp.spawnSync(BR,['--headless=new','--disable-gpu','--no-sandbox',
 '--force-device-scale-factor=1','--virtual-time-budget=6000',
 '--window-size='+info.w+','+info.h,'--screenshot='+OUT,url],{encoding:'utf-8'});
const line=(r2.stderr||'').split('\n').filter(l=>/written to file|ERROR/.test(l)).join('\n');
console.log(line||'(出力なし)');
console.log('→ '+OUT+'  '+K.t+(SIL?' 🕶シルエット':'')+' '+info.n+'種  '+info.w+'x'+info.h+'  ('+COLS+'列 / 1マス'+CELL+'px)');
