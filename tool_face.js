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
 ox.drawImage(c,x0,y0,bw,bh,(${OUT}-bw*k)/2,(${OUT}-bh*k)/2,bw*k,bh*k);
 document.getElementById('dump').textContent=JSON.stringify({
  src:[w,h],box:[x0,y0,bw,bh],bg:bg.map(Math.round),url:o.toDataURL('image/png')});
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
console.log('⭐ 目で見てから index.html へ入れること(透け残り・切れが無いか)');
