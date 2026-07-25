/* 1枚のシート画像から、載っているアイコンを自動で切り出す開発用ツール
   使い方:
     node tool_slice.js ui_src/sheet-a.png ic-scrap,ic-up,ic-res,ic-gem,ic-mat
     node tool_slice.js ui_src/sheet-a.png --list           … 何個見つかったかだけ見る(確認用の連番で出す)
   オプション:
     --bg=#ff00ff  背景色を指定(既定=四隅から自動判定)
     --tol=60      背景とみなす色の近さ(0〜200。にじみが残るなら上げる)
     --gap=26      この距離以内の塊は「1つのアイコンの部品」として繋げる
     --size=512    書き出す1枚のサイズ(正方形)
     --pad=0.06    切り出しの余白(短辺に対する割合)
   ・背景が透過PNGならそのまま透過を使う。不透明なら背景色を抜いて透過にする
   ・並び順は「上の行から、左から右へ」。名前はその順に割り当てる
   ・出力先は ui_src/ (指定した名前 + .png)
   ⚠ImageMagickもPILも無い環境なので、ヘッドレスChromeのcanvasで処理している */
const fs=require('fs'),os=require('os'),path=require('path'),cp=require('child_process');
const A=process.argv.slice(2);
const SRC=A.find(s=>!s.startsWith('--')&&/\.(png|jpg|jpeg|webp)$/i.test(s));
const NAMES=(A.find(s=>!s.startsWith('--')&&s!==SRC)||'').split(',').map(s=>s.trim()).filter(Boolean);
const opt=(k,d)=>{const m=A.find(s=>s.startsWith('--'+k+'='));return m?m.slice(k.length+3):d;};
const LIST=A.indexOf('--list')>=0;
if(!SRC||!fs.existsSync(SRC)){console.log('画像が見つからない: '+SRC);process.exit(1);}
if(!LIST&&!NAMES.length){console.log('保存名をカンマ区切りで渡すか --list を付けること');process.exit(1);}
const BR=['C:/Program Files/Google/Chrome/Application/chrome.exe',
 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'].find(p=>fs.existsSync(p));
if(!BR){console.log('ChromeもEdgeも見つからない');process.exit(1);}
const ext=path.extname(SRC).slice(1).toLowerCase();
const mime=ext==='jpg'?'jpeg':ext;
const dataUrl='data:image/'+mime+';base64,'+fs.readFileSync(SRC).toString('base64');
const CFG={bg:opt('bg',''),tol:+opt('tol',60),gap:+opt('gap',26),size:+opt('size',512),pad:+opt('pad',.06)};

const page=`<!doctype html><meta charset="utf-8"><body><pre id="o"></pre><script>
const CFG=${JSON.stringify(CFG)};
const img=new Image();
img.onload=function(){try{run();}catch(e){document.getElementById('o').textContent='%%ERR '+e.message+'%%';}};
img.onerror=function(){document.getElementById('o').textContent='%%ERR 画像を読めない%%';};
img.src=${JSON.stringify(dataUrl)};
function hex2rgb(h){return [parseInt(h.substr(1,2),16),parseInt(h.substr(3,2),16),parseInt(h.substr(5,2),16)];}
function run(){
 const w=img.naturalWidth,h=img.naturalHeight;
 const cv=document.createElement('canvas');cv.width=w;cv.height=h;
 const c=cv.getContext('2d',{willReadFrequently:true});c.drawImage(img,0,0);
 const d=c.getImageData(0,0,w,h).data;
 /* 背景色: 指定が無ければ四隅の平均 */
 let bg;
 if(CFG.bg)bg=hex2rgb(CFG.bg);
 else{const pts=[[2,2],[w-3,2],[2,h-3],[w-3,h-3]],s=[0,0,0];
  for(const p of pts){const i=(p[1]*w+p[0])*4;s[0]+=d[i];s[1]+=d[i+1];s[2]+=d[i+2];}
  bg=[s[0]/4|0,s[1]/4|0,s[2]/4|0];}
 const tol2=CFG.tol*CFG.tol*3;
 const fg=new Uint8Array(w*h);
 let anyAlpha=false;
 for(let i=0;i<w*h;i++){const a=d[i*4+3];if(a<250)anyAlpha=true;}
 for(let i=0;i<w*h;i++){
  const a=d[i*4+3];
  if(anyAlpha){fg[i]=a>40?1:0;continue;}/* もともと透過PNGならアルファをそのまま使う */
  const dr=d[i*4]-bg[0],dg=d[i*4+1]-bg[1],db=d[i*4+2]-bg[2];
  fg[i]=(dr*dr+dg*dg+db*db)>tol2?1:0;
 }
 /* 連結成分(4近傍のBFS) */
 const lab=new Int32Array(w*h).fill(-1),boxes=[],qx=new Int32Array(w*h);
 let n=0;
 for(let p=0;p<w*h;p++){
  if(!fg[p]||lab[p]>=0)continue;
  let head=0,tail=0;qx[tail++]=p;lab[p]=n;
  let x0=p%w,x1=x0,y0=(p/w)|0,y1=y0,cnt=0;
  while(head<tail){
   const q=qx[head++],x=q%w,y=(q/w)|0;cnt++;
   if(x<x0)x0=x;if(x>x1)x1=x;if(y<y0)y0=y;if(y>y1)y1=y;
   if(x>0&&fg[q-1]&&lab[q-1]<0){lab[q-1]=n;qx[tail++]=q-1;}
   if(x<w-1&&fg[q+1]&&lab[q+1]<0){lab[q+1]=n;qx[tail++]=q+1;}
   if(y>0&&fg[q-w]&&lab[q-w]<0){lab[q-w]=n;qx[tail++]=q-w;}
   if(y<h-1&&fg[q+w]&&lab[q+w]<0){lab[q+w]=n;qx[tail++]=q+w;}
  }
  boxes.push({x0,y0,x1,y1,cnt});n++;
 }
 /* 小さすぎる粒(ノイズ)を捨てる */
 const minA=Math.max(24,(w*h)/40000);
 let bs=boxes.filter(b=>b.cnt>=minA);
 /* 近い塊は1つのアイコンの部品としてくっつける */
 const near=(a,b)=>!(a.x0-CFG.gap>b.x1||b.x0-CFG.gap>a.x1||a.y0-CFG.gap>b.y1||b.y0-CFG.gap>a.y1);
 for(let ch=1;ch;){ch=0;
  outer:for(let i=0;i<bs.length;i++)for(let j=i+1;j<bs.length;j++){
   if(!near(bs[i],bs[j]))continue;
   bs[i]={x0:Math.min(bs[i].x0,bs[j].x0),y0:Math.min(bs[i].y0,bs[j].y0),
    x1:Math.max(bs[i].x1,bs[j].x1),y1:Math.max(bs[i].y1,bs[j].y1),cnt:bs[i].cnt+bs[j].cnt};
   bs.splice(j,1);ch=1;break outer;}
 }
 /* 「上の行から、左から右へ」に並べ直す */
 const hAvg=bs.reduce((a,b)=>a+(b.y1-b.y0),0)/Math.max(1,bs.length);
 bs.sort((a,b)=>(a.y0+a.y1)-(b.y0+b.y1));
 const rows=[];
 for(const b of bs){
  const cy=(b.y0+b.y1)/2,r=rows.find(r=>Math.abs(r.cy-cy)<hAvg*.6);
  if(r){r.list.push(b);r.cy=(r.cy*r.list.length+cy)/(r.list.length+1);}
  else rows.push({cy,list:[b]});
 }
 const out=[];
 for(const r of rows){r.list.sort((a,b)=>(a.x0+a.x1)-(b.x0+b.x1));for(const b of r.list)out.push(b);}
 /* 正方形に切って書き出す */
 const S=CFG.size,res=[];
 const t=document.createElement('canvas');t.width=S;t.height=S;
 const tc=t.getContext('2d');
 for(const b of out){
  const bw=b.x1-b.x0+1,bh=b.y1-b.y0+1,side=Math.max(bw,bh)*(1+CFG.pad*2);
  const cx=(b.x0+b.x1)/2,cy=(b.y0+b.y1)/2;
  tc.clearRect(0,0,S,S);
  tc.imageSmoothingQuality='high';
  tc.drawImage(cv,cx-side/2,cy-side/2,side,side,0,0,S,S);
  /* 背景を抜いて透過にする(元が透過PNGならそのまま) */
  if(!anyAlpha){
   const id=tc.getImageData(0,0,S,S),q=id.data;
   for(let i=0;i<S*S;i++){
    const dr=q[i*4]-bg[0],dg=q[i*4+1]-bg[1],db=q[i*4+2]-bg[2];
    const dist2=dr*dr+dg*dg+db*db;
    if(dist2<=tol2){q[i*4+3]=0;continue;}
    if(dist2>=tol2*2.6)continue;/* 中はそのまま */
    /* 縁: 半透明にしたうえで、混ざっている背景色を引き算する
       (これをしないと輪郭に背景色のフチが残る。px = a*本来の色 + (1-a)*背景 を解く) */
    const a=(dist2-tol2)/(tol2*1.6);
    q[i*4+3]=Math.round(q[i*4+3]*a);
    if(a>.02)for(let k=0;k<3;k++)
     q[i*4+k]=Math.max(0,Math.min(255,Math.round((q[i*4+k]-(1-a)*bg[k])/a)));
   }
   tc.putImageData(id,0,0);
  }
  res.push({x:b.x0,y:b.y0,w:bw,h:bh,url:t.toDataURL('image/png')});
 }
 /* ⚠JSONをそのままDOMに置くと --dump-dom が " を &quot; に直してしまう。base64で包んで渡す */
 const js=JSON.stringify({w,h,bg,anyAlpha,items:res});
 document.getElementById('o').textContent='%%'+btoa(unescape(encodeURIComponent(js)))+'%%';
}
</scr`+`ipt></body>`;
const tmp=path.join(os.tmpdir(),'dt_slice.html');
fs.writeFileSync(tmp,page);
const r=cp.spawnSync(BR,['--headless=new','--disable-gpu','--no-sandbox','--virtual-time-budget=20000',
 '--dump-dom','file:///'+tmp.replace(/\\/g,'/')],{encoding:'utf-8',maxBuffer:5e8});
const m=/%%([\s\S]*?)%%/.exec(r.stdout||'');
if(!m){console.log('切り出せなかった(ブラウザが動かなかった)');process.exit(1);}
if(m[1].startsWith('ERR')){console.log(m[1].replace(/&quot;/g,'"'));process.exit(1);}
let J;
try{J=JSON.parse(Buffer.from(m[1],'base64').toString('utf-8'));}
catch(e){console.log('結果を読めなかった: '+e.message);process.exit(1);}
console.log('シート '+J.w+'x'+J.h+' / 背景='+(J.anyAlpha?'元から透過':'rgb('+J.bg.join(',')+')を抜いた')+' / 見つけた数='+J.items.length);
const dir=path.dirname(SRC);
J.items.forEach((it,i)=>{
 const nm=LIST?('cut'+String(i+1).padStart(2,'0')):(NAMES[i]||('extra'+(i+1)));
 const f=path.join(dir,nm+'.png');
 fs.writeFileSync(f,Buffer.from(it.url.split(',')[1],'base64'));
 console.log('  '+String(i+1).padStart(2)+' '+nm+'.png  (元位置 x'+it.x+' y'+it.y+' '+it.w+'x'+it.h+')');
});
if(!LIST&&NAMES.length!==J.items.length)
 console.log('⚠ 名前の数('+NAMES.length+')と見つけた数('+J.items.length+')が違う。--list で並びを確認すること');
