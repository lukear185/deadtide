/* ============ tool_pose.js — 「ポーズ表(1枚のPNG)」をキャラの絵としてゲームに入れる ============
   2026-08-09(227g)。ユーザー決定=**狼は顔だけでなく全身を画像にする**
   (「今までのやつだと図形組み合わせました感が強すぎる」)。

   ⭐**考え方は tool_px.js と同じ**=**絵は外で描く / 規格を機械的に強制するのはこちら**。
     生成AIは毎回ぶれるので、**大きさ・接地・向きだけはこの道具が揃える**。
   ⚠⚠**ポーズは必ず1枚のPNGにまとめて描く**=生成を分けると**コマごとに顔が変わる**
     (ドット絵の時に踏んだ穴。NOTES_絵に記録あり)。

   使い方:
     node tool_pose.js <入力.png> <id> [--cols=4] [--rows=2] [--gy=0.88]
        [--names=idle,walkA,walkB,leap,bite,claw,howl,breath] [--keep=0.30]
     node tool_pose.js --embed     … px_data/pose-*.txt を index.html へ流し込む

   ⭐**升目の決まり**(絵を描く側と、この道具の唯一の約束):
     ・1つの升に1ポーズ。**左上から右へ**、名前の並び順どおりに置く。
     ・**接地線は全部の升で同じ高さ**(升の高さの gy=0.88 の所)。
       跳んでいるポーズは**その線より上に浮かせて描く**=浮きがそのまま画面に出る。
     ・**体の中心は升の横の真ん中**。⚠向きは**右向き**で統一(左は反転して使う)。
     ・背景は**べた1色**(四隅の色を透明に抜く)。⚠キャラに背景と同じ色を使わない。

   ⚠**元のPNGはGitに入れない**(数MB)。⭐入れるのは px_data/pose-*.txt(切り出し後)だけ。
   ⚠Node に画像ライブラリを足さない約束なので、画素を触るのはヘッドレスChromeの canvas。
     ⭐**--dump-dom で持ち帰る**(--screenshot では透過が落ちる=NOTES_道具の掟)。 */
const fs=require('fs'),path=require('path'),{execFileSync}=require('child_process');

const A=process.argv.slice(2);
const EMBED=A.includes('--embed');
const arg=(k,d)=>{const f=A.find(x=>x.startsWith('--'+k+'='));return f?f.split('=').slice(1).join('='):d;};

const CHROME=['C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
 '/usr/bin/chromium','/usr/bin/google-chrome'].find(p=>fs.existsSync(p));

/* ---------------- 埋め込み(index.html を書き換える) ---------------- */
/* ⚠**顔(FACE)とは別の入れ物にする**=役割が違う物を同じ表に混ぜない(tool_face_embed と同じ掟) */
if(EMBED){
 const SRC='index.html';
 let h=fs.readFileSync(SRC,'utf8');
 const files=fs.readdirSync('px_data').filter(f=>/^pose-.+\.txt$/.test(f)).sort();
 if(!files.length){console.log('px_data に pose-*.txt が無い');process.exit(1);}
 /* pose-<id>-<ポーズ名>.txt → POSE[id][ポーズ名] */
 const byId={};
 for(const f of files){
  const m=/^pose-(.+?)-([A-Za-z0-9]+)\.txt$/.exec(f);if(!m)continue;
  (byId[m[1]]=byId[m[1]]||{})[m[2]]=fs.readFileSync('px_data/'+f,'utf8').trim();
 }
 const rows=Object.keys(byId).map(id=>{
  const inner=Object.keys(byId[id]).map(k=>"  "+k+":'data:image/png;base64,"+byId[id][k]+"'").join(',\n');
  return " '"+id+"':{\n"+inner+"}";
 });
 const mrows=Object.keys(byId).map(id=>{
  const p='px_data/pose-'+id+'.json';
  if(!fs.existsSync(p))return null;
  return " '"+id+"':"+fs.readFileSync(p,'utf8').trim();
 }).filter(Boolean);
 const block="/* === POSES-START === */\n"
  +"/* 🖼**画像で描くキャラ**(2026-08-09(227g)ユーザー決定)。⚠ここは道具が丸ごと書き換える=手で編集しない。\n"
  +"   ⭐入れ方=`node tool_pose.js <ポーズ表.png> <id>` → `node tool_pose.js --embed`。 */\n"
  +"const POSE={\n"+rows.join(',\n')+"\n};\n"
  +"/* 接地点と大きさ(道具が測った値)。ox,oy=絵の左上から見た「足元の中心」/ k=1画素あたりの絵の単位 */\n"
  +"const POSEM={\n"+mrows.join(',\n')+"\n};\n"
  +"const POSEI={};/* 読み込んだ Image の置き場(1回だけ作る) */\n"
  +"function poseImg(id,k){\n"
  +" const P=POSE[id];if(!P||!P[k])return null;\n"
  +" if(typeof Image==='undefined')return null;/* ⚠Image の無い環境(検査)では描かない */\n"
  +" const key=id+'|'+k;let im=POSEI[key];\n"
  +" if(im===undefined){try{im=new Image();im.src=P[k];}catch(e){im=null;}POSEI[key]=im;}\n"
  +" return (im&&im.complete&&im.naturalWidth)?im:null;\n"
  +"}\n"
  +"/* === POSES-END === */";
 const a=h.indexOf('/* === POSES-START === */'),b=h.indexOf('/* === POSES-END === */');
 if(a>=0&&b>a){h=h.slice(0,a)+block+h.slice(b+'/* === POSES-END === */'.length);}
 else{/* まだ無ければ FACES-END の直後に置く(顔の表の隣=絵の資産をひとまとめにする) */
  const fe=h.indexOf('/* === FACES-END === */');
  if(fe<0){console.log('FACES-END が見つからない(置き場所が決まらない)');process.exit(1);}
  const at=fe+'/* === FACES-END === */'.length;
  h=h.slice(0,at)+"\n"+block+h.slice(at);}
 fs.writeFileSync(SRC,h);
 console.log('✅ '+Object.keys(byId).length+'体ぶんを index.html へ入れた: '+Object.keys(byId).join(', '));
 for(const id of Object.keys(byId))console.log('   '+id+' … '+Object.keys(byId[id]).join(' / '));
 process.exit(0);
}

/* ---------------- 切り出し ---------------- */
const SRC=A[0],ID=A[1];
if(!SRC||!ID){
 console.log('使い方: node tool_pose.js <入力.png> <id> [--cols=4] [--rows=2] [--gy=0.88] [--names=…]');
 console.log('        node tool_pose.js --embed');
 process.exit(1);
}
if(!CHROME){console.log('Chrome/Edge が見つからない');process.exit(1);}
if(!fs.existsSync(SRC)){console.log('入力が見つからない: '+SRC);process.exit(1);}

const COLS=+arg('cols',4),ROWS=+arg('rows',2),GY=+arg('gy','0.88'),KEEP=+arg('keep','0.30');
/* ⭐既定のポーズ=いまの狼の動きがそのまま要る分(歩き2コマ/跳ぶ/噛む/ひっかく/吠える/ブレス) */
const NAMES=arg('names','idle,walkA,walkB,leap,bite,claw,howl,breath').split(',').map(s=>s.trim()).filter(Boolean);

const b64=fs.readFileSync(SRC).toString('base64');
/* ⚠**この中身はブラウザで動く**(Nodeの変数はテンプレートで埋め込む) */
const html=`<!doctype html><meta charset="utf-8"><body><div id="dump">WAIT</div><script>
const COLS=${COLS},ROWS=${ROWS},GY=${GY},KEEP=${KEEP},NAMES=${JSON.stringify(NAMES)};
const im=new Image();
im.onload=()=>{try{
 const W=im.naturalWidth,H=im.naturalHeight;
 const cv=document.createElement('canvas');cv.width=W;cv.height=H;
 const c=cv.getContext('2d',{willReadFrequently:true});
 c.drawImage(im,0,0);
 const d=c.getImageData(0,0,W,H),p=d.data;
 /* ①背景=四隅の平均色。そこから離れていない画素を透明にする */
 const cor=[[0,0],[W-1,0],[0,H-1],[W-1,H-1]].map(q=>{const i=(q[1]*W+q[0])*4;return [p[i],p[i+1],p[i+2]];});
 const bg=[0,1,2].map(k=>cor.reduce((s,q)=>s+q[k],0)/4);
 const TH=KEEP*441;/* 441 = 255*sqrt(3) の近似=色の距離のしきい */
 for(let i=0;i<p.length;i+=4){
  const dr=p[i]-bg[0],dg=p[i+1]-bg[1],db=p[i+2]-bg[2];
  if(Math.sqrt(dr*dr+dg*dg+db*db)<TH)p[i+3]=0;
 }
 c.putImageData(d,0,0);
 /* ②升ごとに中身を測る。⚠**接地線と横の真ん中は升で決め打ち**=ポーズ間で揃う */
 const cw=Math.floor(W/COLS),ch=Math.floor(H/ROWS);
 const out=[];
 for(let n=0;n<NAMES.length;n++){
  const cx0=(n%COLS)*cw,cy0=Math.floor(n/COLS)*ch;
  if(cy0+ch>H)break;
  let x0=cw,y0=ch,x1=-1,y1=-1;
  for(let y=0;y<ch;y++)for(let x=0;x<cw;x++){
   const a=p[((cy0+y)*W+(cx0+x))*4+3];
   if(a>16){if(x<x0)x0=x;if(x>x1)x1=x;if(y<y0)y0=y;if(y>y1)y1=y;}
  }
  if(x1<x0){out.push({n:NAMES[n],empty:1});continue;}
  const bw=x1-x0+1,bh=y1-y0+1;
  const o=document.createElement('canvas');o.width=bw;o.height=bh;
  o.getContext('2d').drawImage(cv,cx0+x0,cy0+y0,bw,bh,0,0,bw,bh);
  /* 足元の中心=升の真ん中(横) と 接地線(縦)。切り詰めたぶんを引いて絵の中の座標にする */
  out.push({n:NAMES[n],w:bw,h:bh,ox:cw*0.5-x0,oy:ch*GY-y0,url:o.toDataURL('image/png')});
 }
 document.getElementById('dump').textContent=JSON.stringify({cw,ch,out});
}catch(e){document.getElementById('dump').textContent='ERR '+e.message;}};
im.onerror=()=>{document.getElementById('dump').textContent='ERR 画像を読めない';};
im.src='data:image/png;base64,${b64}';
</script></body>`;

const tmp=path.join(require('os').tmpdir(),'dt_pose_'+Date.now()+'.html');
fs.writeFileSync(tmp,html);
let dom='';
try{
 dom=execFileSync(CHROME,['--headless=new','--disable-gpu','--dump-dom','--virtual-time-budget=6000',
  'file://'+tmp.replace(/\\/g,'/')],{encoding:'utf8',maxBuffer:1024*1024*400});
}catch(e){console.log('Chrome の実行に失敗: '+e.message);process.exit(1);}
try{fs.unlinkSync(tmp);}catch(e){}

const m=/<div id="dump">([\s\S]*?)<\/div>/.exec(dom);
if(!m){console.log('結果を取り出せなかった');process.exit(1);}
const txt=m[1].trim();
if(txt.startsWith('ERR')){console.log(txt);process.exit(1);}
if(txt==='WAIT'){console.log('画像の読み込みが終わらなかった(大きすぎる?)');process.exit(1);}

let R;try{R=JSON.parse(txt);}catch(e){console.log('結果が壊れている');process.exit(1);}
if(!fs.existsSync('px_data'))fs.mkdirSync('px_data');
/* 古い同じidのポーズを消す(名前を変えた時に前のが残らないように) */
for(const f of fs.readdirSync('px_data'))if(new RegExp('^pose-'+ID+'-').test(f))fs.unlinkSync('px_data/'+f);

const meta={cw:R.cw,ch:R.ch,p:{}};
let n=0,bytes=0;
for(const q of R.out){
 if(q.empty){console.log('  ⚠ '+q.n+' … 升が空(飛ばした)');continue;}
 const b=q.url.replace(/^data:image\/png;base64,/,'');
 fs.writeFileSync('px_data/pose-'+ID+'-'+q.n+'.txt',b);
 meta.p[q.n]={w:q.w,h:q.h,ox:Math.round(q.ox*10)/10,oy:Math.round(q.oy*10)/10};
 n++;bytes+=b.length*3/4;
 console.log('  ✅ '+q.n.padEnd(8)+q.w+'x'+q.h+'  足元('+Math.round(q.ox)+','+Math.round(q.oy)+')  '+Math.round(b.length*3/4/1024)+'KB');
}
fs.writeFileSync('px_data/pose-'+ID+'.json',JSON.stringify(meta));
console.log('🖼 '+ID+' … '+n+'ポーズ / 合計 '+Math.round(bytes/1024)+'KB');
console.log('⚠ 升の大きさ '+R.cw+'x'+R.ch+' … 絵の単位への倍率(k)は index.html の POSE_K で合わせる');
console.log('⭐ 次: node tool_pose.js --embed');
