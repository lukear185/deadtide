/* 🙂 顔の画像を「透過で切り抜いて」ゲームに埋め込める形にする道具(2026-08-03(101))
 *
 *   node tool_face.js <入力.png> <名前> [--keep=0.30] [--pad=6]
 *   例: node tool_face.js "ui_srcfaces/ルピナ.png" hLupi
 *
 * ⭐**何をするか**
 *   ①背景(四隅の色に近い画素)を透明にする ②残った絵の外周を測って切り詰める
 *   ③正方形の枠に収めて 256x256 のPNGで書き出す ④base64 を px_data/face-<名前>.txt に置く
 *
 * ⚠**なぜヘッドレスChromeか**=Node に画像ライブラリを足さない約束(単一HTML+素の道具)。
 *   Chrome の canvas で読めば追加の依存ゼロで画素を触れる。⭐**--dump-dom でテキストを持ち帰る**
 *   (--screenshot では透過が落ちる=NOTES_道具の掟)。
 */
const fs=require('fs'),path=require('path'),{execFileSync}=require('child_process');

const A=process.argv.slice(2);
const SRC=A[0],NAME=A[1];
if(!SRC||!NAME){console.log('使い方: node tool_face.js <入力.png> <名前> [--keep=0.30] [--pad=6]');process.exit(1);}
const KEEP=+((A.find(x=>x.startsWith('--keep='))||'--keep=0.30').split('=')[1]);
const PAD=+((A.find(x=>x.startsWith('--pad='))||'--pad=6').split('=')[1]);
const OUT=+((A.find(x=>x.startsWith('--out='))||'--out=256').split('=')[1]);

const CHROME=[
 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
].find(p=>fs.existsSync(p));
if(!CHROME){console.log('Chrome が見つからない');process.exit(1);}

const b64=fs.readFileSync(SRC).toString('base64');
const html=`<!doctype html><meta charset="utf-8"><body><div id="dump">WAIT</div><script>
const IMG=new Image();
IMG.onload=function(){
 const w=IMG.width,h=IMG.height;
 const c=document.createElement('canvas');c.width=w;c.height=h;
 const x=c.getContext('2d',{willReadFrequently:true});
 x.drawImage(IMG,0,0);
 const d=x.getImageData(0,0,w,h),p=d.data;
 /* ⭐**もう透過されている画像はそのまま使う**(2026-08-03(101)に踏んだ)=
    四隅のアルファが0なら背景抜きは済んでいる。⚠**RGBだけ見て「背景は黒」と決めつけると、
    絵の黒フチまで巻き添えで消える**(実際に2回消した)。 */
 const at=(px,py)=>{const i=(py*w+px)*4;return [p[i],p[i+1],p[i+2],p[i+3]];};
 const cor=[at(2,2),at(w-3,2),at(2,h-3),at(w-3,h-3)];
 const alphaOK=cor.every(q=>q[3]<8);
 const bg=[0,1,2].map(k=>cor.reduce((s,q)=>s+q[k],0)/cor.length);
 if(alphaOK){/* 透過済み=何も抜かない(外周を測るだけ) */}
 else{
 /* ⭐⭐**外側から届く背景だけを抜く**(2026-08-03(101)に踏んだ)=
    絵の黒フチが背景の黒と同じ色なので、単純な色距離だと**輪郭ごと消える**。
    ⭐画面の外周から塗りつぶし(flood fill)で繋がっている背景だけを辿れば、
      絵に囲まれた内側の黒(フチ・目・線)は残る。 */
 const TH=${KEEP}*441;
 const near=i=>Math.hypot(p[i]-bg[0],p[i+1]-bg[1],p[i+2]-bg[2])<TH;
 const seen=new Uint8Array(w*h);
 const st=[];
 for(let px=0;px<w;px++){st.push(px);st.push(px+(h-1)*w);}
 for(let py=0;py<h;py++){st.push(py*w);st.push(w-1+py*w);}
 while(st.length){
  const q=st.pop();if(seen[q])continue;
  if(!near(q*4))continue;
  seen[q]=1;
  const qx=q%w,qy=(q-qx)/w;
  if(qx>0)st.push(q-1);if(qx<w-1)st.push(q+1);
  if(qy>0)st.push(q-w);if(qy<h-1)st.push(q+w);
 }
 for(let q=0;q<w*h;q++)if(seen[q])p[q*4+3]=0;
 /* 縁を1画素なじませる(ギザギザ止め) */
 for(let py=1;py<h-1;py++)for(let px=1;px<w-1;px++){
  const q=py*w+px;if(seen[q])continue;
  if(p[q*4+3]<250)continue;
  if(seen[q-1]||seen[q+1]||seen[q-w]||seen[q+w])p[q*4+3]=200;
 }
 }
 x.putImageData(d,0,0);
 /* 残った絵の外周を測る */
 let x0=w,y0=h,x1=-1,y1=-1;
 for(let py=0;py<h;py++)for(let px=0;px<w;px++){
  if(p[(py*w+px)*4+3]>16){if(px<x0)x0=px;if(px>x1)x1=px;if(py<y0)y0=py;if(py>y1)y1=py;}}
 if(x1<0){document.getElementById('dump').textContent='ERR:空';return;}
 const bw=x1-x0+1,bh=y1-y0+1,side=Math.max(bw,bh)+${PAD}*2;
 const o=document.createElement('canvas');o.width=${OUT};o.height=${OUT};
 const ox=o.getContext('2d');
 ox.imageSmoothingQuality='high';
 const k=${OUT}/side;
 const dx0=(${OUT}-bw*k)/2,dy0=(${OUT}-bh*k)/2;
 ox.drawImage(c,x0,y0,bw,bh,dx0,dy0,bw*k,bh*k);
 /* ⭐⭐**接続点を自動で測る**(2026-08-03(102)ユーザー指示「見本と見た目で判断じゃなく仕組化」)。
    体と繋ぐのに要るのは3つ:
      ①**顎の高さ**(ここが肩に乗る)  ②**顔(頬)の横幅**(これを肩幅に対して決める)
      ③**顔の中心の横位置**(体の中心へ合わせる)
    測り方=**肌色の画素**を拾う(このゲームの顔は必ず明るいクリーム色)。
    ⚠髪や帽子ではなく**肌**を見る=髪型が変わっても同じ場所を指す。 */
 const od=ox.getImageData(0,0,${OUT},${OUT}),op=od.data;
 let sx0=${OUT},sx1=-1,sy0=${OUT},sy1=-1,sn=0;
 for(let py=0;py<${OUT};py++)for(let px=0;px<${OUT};px++){
  const i=(py*${OUT}+px)*4;
  if(op[i+3]<200)continue;
  const R=op[i],G2=op[i+1],B=op[i+2];
  /* 肌=明るくて、赤がわずかに強い(頬の赤みや白い帽子と混ざらない範囲) */
  if(R>225&&G2>205&&B>180&&R-B>12&&R-B<75&&Math.abs(R-G2)<32){
   sn++;if(px<sx0)sx0=px;if(px>sx1)sx1=px;if(py<sy0)sy0=py;if(py>sy1)sy1=py;}}
 const face=(sn>50&&sx1>sx0)?{x0:sx0,x1:sx1,y0:sy0,y1:sy1,w:sx1-sx0+1,h:sy1-sy0+1,cx:(sx0+sx1)/2,n:sn}:null;
 document.getElementById('dump').textContent=JSON.stringify({
  src:[w,h],box:[x0,y0,bw,bh],bg:bg.map(Math.round),face:face,out:${OUT},url:o.toDataURL('image/png')});
};
IMG.onerror=function(){document.getElementById('dump').textContent='ERR:読めない';};
IMG.src='data:image/png;base64,${b64}';
</script></body>`;

const tmp=path.join(require('os').tmpdir(),'face_'+Date.now()+'.html');
fs.writeFileSync(tmp,html);
let out='';
try{
 out=execFileSync(CHROME,['--headless=new','--disable-gpu','--no-sandbox','--virtual-time-budget=6000',
  '--dump-dom','file:///'+tmp.replace(/\\/g,'/')],{encoding:'utf8',maxBuffer:1024*1024*80});
}catch(e){console.log('Chrome 失敗:',e.message);process.exit(1);}
fs.unlinkSync(tmp);

const m=/<div id="dump">([\s\S]*?)<\/div>/.exec(out);
if(!m){console.log('結果を取り出せなかった');process.exit(1);}
const txt=m[1].trim();
if(txt.startsWith('ERR')){console.log(txt);process.exit(1);}
const r=JSON.parse(txt);
const raw=r.url.split(',')[1];
if(!fs.existsSync('px_data'))fs.mkdirSync('px_data');
fs.writeFileSync('px_data/face-'+NAME+'.txt',raw);
fs.writeFileSync('px_data/face-'+NAME+'.png',Buffer.from(raw,'base64'));
console.log('元の絵      : '+r.src[0]+'x'+r.src[1]+' / 背景色 rgb('+r.bg.join(',')+')');
console.log('切り出した所: x'+r.box[0]+' y'+r.box[1]+' '+r.box[2]+'x'+r.box[3]);
console.log('書き出し    : px_data/face-'+NAME+'.png ('+Math.round(raw.length/1024)+'KB の base64)');
/* ⭐**接続点を「絵に対する割合」で保存する**=絵の大きさが変わっても使える。
   ゲーム側はこの3つだけ見て、目分量なしで体に合わせる。 */
if(!r.face){
 console.log('⚠ 肌の色が見つからなかった=接続点を測れない(既定値で貼る)。');
}else{
 const F=r.face,O=r.out;
 const meta={
  faceW:+(F.w/O).toFixed(4),   /* 顔(頬)の幅 / 絵の幅 */
  chinY:+(F.y1/O).toFixed(4),  /* 顎の高さ  / 絵の高さ(上からの割合) */
  faceCx:+(F.cx/O).toFixed(4)  /* 顔の中心  / 絵の幅 */
 };
 const p='px_data/face-'+NAME+'.json';
 fs.writeFileSync(p,JSON.stringify(meta));
 console.log('接続点(自動): 顔幅 '+(meta.faceW*100).toFixed(1)+'% / 顎 上から'+(meta.chinY*100).toFixed(1)+'% / 顔の中心 '+(meta.faceCx*100).toFixed(1)+'%');
}
console.log('⭐ 次: node tool_face_embed.js で index.html へ入れる(接続点も一緒に入る)');
