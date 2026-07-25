/* ui_src/ のアイコンPNGを縮小してbase64にし、index.html の ICONS ブロックへ埋め込む開発用ツール
   使い方:
     node tool_embed.js            … 既定(96px)で埋め込む
     node tool_embed.js --size=128 … 大きめで埋め込む
     node tool_embed.js --dry      … 書き込まずに容量だけ見る
   ・index.html の「ICONS-START 〜 ICONS-END」の間を丸ごと作り直す
   ・単一HTML完結を保つため、元の512pxではなく表示に足りる大きさまで縮めてから埋める
     (HUDは実寸18px前後・2倍解像度でも36px。96pxあれば足りる)
   ⚠ImageMagick/PILが無い環境なので、縮小もヘッドレスChromeのcanvasでやる */
const fs=require('fs'),os=require('os'),path=require('path'),cp=require('child_process');
const A=process.argv.slice(2);
const opt=(k,d)=>{const m=A.find(s=>s.startsWith('--'+k+'='));return m?m.slice(k.length+3):d;};
const SIZE=+opt('size',96),DRY=A.indexOf('--dry')>=0,NOPAL=A.indexOf('--nopal')>=0;
/* ゲームの配色。⚠AI生成の絵は「なめらかな陰影+数百色」で、これが一番のAI臭の元。
   縮小したあとに全ピクセルをこの色のどれかへ寄せる(減色)と、
   グラデーションが消えて全アイコンの色調が揃い、手描きの素材に近い見え方になる。
   --nopal を付けると素の色のまま埋め込む */
const PAL=[
 [0x24,0x1f,0x19],[0x3a,0x31,0x28],[0x4a,0x40,0x34],   /* 墨・焦茶 */
 [0x3f,0x4a,0x54],[0x5c,0x6b,0x78],[0x8a,0x8f,0x96],   /* 鋼 */
 [0x93,0x38,0x1e],[0xc1,0x50,0x2e],[0xd9,0x78,0x4a],   /* 錆 */
 [0xc9,0xa1,0x3d],[0xe8,0xa3,0x3d],[0xf0,0xc4,0x73],   /* 琥珀 */
 [0x6f,0x9c,0x43],[0x8f,0xbf,0x4d],[0xb7,0xe0,0x7a],   /* 毒々しい緑 */
 [0x6b,0x5a,0x3a],[0xa0,0x83,0x56],[0xc9,0xa9,0x6a],   /* 土・革 */
 [0x8f,0x6f,0xae],[0xb0,0x7a,0xd0],                    /* 紫 */
 [0xd8,0xd2,0xc4],[0xe8,0xe0,0xce],[0xf2,0xec,0xdc]    /* 紙 */
];
const DIR=path.join(__dirname,'ui_src'),HTML=path.join(__dirname,'index.html');
/* 資源の5種だけは絵文字から引けるようにする(文字列中の絵文字を画像へ差し替えるため)。
   ⚠画面アイコンやタブは絵文字が重複する(🧬も📖も2用途ある)ので、名前で引く ICN を使うこと */
const EMOJI={'ic-scrap':'⚙️','ic-up':'🔩','ic-res':'🧬','ic-gem':'💎','ic-mat':'🔧'};
const files=fs.readdirSync(DIR).filter(f=>/^(ic|fr)-.*\.png$/i.test(f)).sort();
if(!files.length){console.log('ui_src に ic-*.png / fr-*.png が無い');process.exit(1);}
const BR=['C:/Program Files/Google/Chrome/Application/chrome.exe',
 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'].find(p=>fs.existsSync(p));
if(!BR){console.log('ChromeもEdgeも見つからない');process.exit(1);}
const srcs=files.map(f=>({n:path.basename(f,'.png'),
 u:'data:image/png;base64,'+fs.readFileSync(path.join(DIR,f)).toString('base64')}));
const page=`<!doctype html><meta charset="utf-8"><body><pre id="o"></pre><script>
const SRC=${JSON.stringify(srcs)},SIZE=${SIZE},PAL=${JSON.stringify(PAL)},USEPAL=${NOPAL?'false':'true'};
/* 減色: 一番近いパレット色へ寄せる(ディザは掛けない=ベタになるのが狙い) */
function quantize(c,w,h){
 const id=c.getImageData(0,0,w,h),q=id.data;
 for(let i=0;i<w*h;i++){
  if(q[i*4+3]<8){q[i*4+3]=0;continue;}
  const r=q[i*4],g=q[i*4+1],b=q[i*4+2];
  let bi=0,bd=1e9;
  for(let k=0;k<PAL.length;k++){
   const dr=r-PAL[k][0],dg=g-PAL[k][1],db=b-PAL[k][2];
   /* 目の感度に合わせて緑を重く見る */
   const d=dr*dr*3+dg*dg*4+db*db*2;
   if(d<bd){bd=d;bi=k;}
  }
  q[i*4]=PAL[bi][0];q[i*4+1]=PAL[bi][1];q[i*4+2]=PAL[bi][2];
 }
 c.putImageData(id,0,0);
}
let done=0;const out={};
SRC.forEach(function(s){
 const im=new Image();
 im.onload=function(){
  /* 枠(fr-)は縦横比を保ったまま、アイコン(ic-)は正方形に収める */
  const ar=im.naturalWidth/im.naturalHeight;
  const w=ar>=1?SIZE:Math.round(SIZE*ar),h=ar>=1?Math.round(SIZE/ar):SIZE;
  const cv=document.createElement('canvas');cv.width=w;cv.height=h;
  const c=cv.getContext('2d');c.imageSmoothingQuality='high';
  c.drawImage(im,0,0,w,h);
  if(USEPAL)quantize(c,w,h);
  out[s.n]=cv.toDataURL('image/png');
  if(++done===SRC.length)fin();
 };
 im.onerror=function(){out[s.n]='';if(++done===SRC.length)fin();};
 im.src=s.u;
});
function fin(){document.getElementById('o').textContent='%%'+btoa(unescape(encodeURIComponent(JSON.stringify(out))))+'%%';}
</scr`+`ipt></body>`;
const tmp=path.join(os.tmpdir(),'dt_embed.html');
fs.writeFileSync(tmp,page);
const r=cp.spawnSync(BR,['--headless=new','--disable-gpu','--no-sandbox','--virtual-time-budget=20000',
 '--dump-dom','file:///'+tmp.replace(/\\/g,'/')],{encoding:'utf-8',maxBuffer:5e8});
const m=/%%([\s\S]*?)%%/.exec(r.stdout||'');
if(!m){console.log('縮小できなかった(ブラウザが動かなかった)');process.exit(1);}
const OUT=JSON.parse(Buffer.from(m[1],'base64').toString('utf-8'));
let total=0;
const lines=[];
for(const n of Object.keys(OUT)){
 if(!OUT[n]){console.log('  読めなかった: '+n);continue;}
 total+=OUT[n].length;
 console.log('  '+n.padEnd(14)+Math.round(OUT[n].length/1024)+'KB');
}
console.log('合計 '+Math.round(total/1024)+'KB ('+SIZE+'px)');
/* 埋め込むJSを組み立てる */
lines.push("/* 名前で引くアイコン。tool_embed.js が自動生成する=手で書き換えないこと */");
lines.push("const ICN={"+Object.keys(OUT).filter(n=>OUT[n]).map(n=>"'"+n+"':'"+OUT[n]+"'").join(",\n")+"};");
lines.push("/* 資源の5種だけ絵文字からも引ける(文字列中の絵文字を画像へ差し替えるため) */");
lines.push("const ICO={"+Object.keys(EMOJI).filter(n=>OUT[n]).map(n=>"'"+EMOJI[n]+"':ICN['"+n+"']").join(",")+"};");
lines.push("const ICO_RE=/"+Object.keys(EMOJI).filter(n=>OUT[n]).map(n=>EMOJI[n]).join('|')+"/g;");
lines.push("/* HTML文字列の中の絵文字を画像に差し替える。⚠textContentに入れる文字列には使わないこと */");
lines.push("const IC=s=>String(s).replace(ICO_RE,m=>ICO[m]?'<img class=\"ico\" src=\"'+ICO[m]+'\" alt=\"\">':m);");
const block=lines.join('\n');
const html=fs.readFileSync(HTML,'utf-8');
const S='/* === ICONS-START === */',E='/* === ICONS-END === */';
const i=html.indexOf(S),j=html.indexOf(E);
if(i<0||j<0){console.log('index.html に ICONS-START / ICONS-END が無い');process.exit(1);}
if(DRY){console.log('(--dry なので書き込まない)');process.exit(0);}
fs.writeFileSync(HTML,html.slice(0,i+S.length)+'\n'+block+'\n'+html.slice(j));
console.log('index.html へ埋め込んだ (index.html は '+Math.round(fs.statSync(HTML).size/1024)+'KB)');
