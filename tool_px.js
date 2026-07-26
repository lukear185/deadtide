/* ============ tool_px.js — 生成されたドット絵PNGをゲーム用のデータに変換する ============
   2026-07-27 第93弾。ユーザー決定=**絵は生成AIに描かせ、揃えるのはこちらでやる**。
   画像生成AIは「ドット絵風のイラスト」しか出せない(格子が揃わない・色が数万色・縁がぼける)。
   そこでこの道具が**規格を機械的に強制する**:
     ①高さを40ドットに正規化  ②足の位置で横を揃える(コマ間のがたつきを消す)
     ③色を共通パレットに寄せる ④コマの幅を揃える
   これで、生成のたびに絵柄が多少ぶれても **大きさ・色・接地だけは全種そろう**。

   使い方:
     node tool_px.js px_src/walk.png walk          … 変換して px_data/walk.json と下見PNGを作る
     node tool_px.js px_src/walk.png walk --h=44   … 高さ(ドット)を変える
     node tool_px.js --embed                       … px_data/*.json を index.html に流し込む
     node tool_px.js --pal px_src/walk.png         … その絵から16色の色表を作って表示(パレット更新用)

   ⚠元のPNG(px_src/)は1枚2MBあるのでGitに入れない。**入れるのは変換後のjsonだけ**(1体5KB程度)。 */
const fs=require('fs'),path=require('path'),zlib=require('zlib');

/* ---- 共通パレット(全種で共有する。ここを変えると全部の色が変わる) ----
   ⚠**種類ごとに色を変えない**。同じ表に寄せるからこそ36種を並べても浮かない。
   ⚠青や紫の敵(ステージ2の海の生き物)を足す時は、ここに色を足してから変換し直すこと。 */
const PALETTE=['#fed207','#ffff95','#000000','#020302','#02233d','#0868a7',
 '#33390e','#612f0a','#7e3f0d','#ba521e','#728f26','#aeaa2e',
 '#ccda37','#1586cb','#1a8bd1','#1b8cd2','#98d047','#6cbb7b',
 '#1e8cd0','#1d8dd3','#b7d548','#c7e048','#1d93da','#e3f35a',
 /* ⭐2026-07-27に8色足した(ここまでの24色はウォーカー1体から作ったので緑・黄・青しか無かった)。
    足さないと**鋼が黄緑になってアーマードの胸当てと兜が消える**(実際にそうなった)。
    ⚠**CHARSが32文字なのでこれで満枠**。次に色を足す時はどれかを捨てること。 */
 '#2f353b','#6b757d','#aab4bb',/* 鋼(暗・中・明) アーマード/重装兵/ブルートの肩当て */
 '#b03a2e','#6e2a22',          /* 赤・暗い赤   ブルートの筋肉/バイザーの灯り/布 */
 '#5a3a72','#9a6fb5','#d67ba8' /* 紫(暗・中)・桃 ブローター/ストーカー/スクリーマー */];
/* データに書く時の1文字。⚠16色までしか使えないので、色を足す時はここも足す */
const CHARS='0123456789abcdefghijklmnopqrstuv';/* 最大32色 */

/* ============ PNG 読み書き(依存パッケージなし) ============ */
function decodePNG(buf){
 if(buf.readUInt32BE(0)!==0x89504e47)throw new Error('PNGではない');
 let p=8,ihdr=null,idat=[],plte=null,trns=null;
 while(p<buf.length){
  const len=buf.readUInt32BE(p),typ=buf.toString('ascii',p+4,p+8),d=buf.slice(p+8,p+8+len);
  if(typ==='IHDR')ihdr={w:d.readUInt32BE(0),h:d.readUInt32BE(4),bd:d[8],ct:d[9],il:d[12]};
  else if(typ==='IDAT')idat.push(d);else if(typ==='PLTE')plte=d;else if(typ==='tRNS')trns=d;
  else if(typ==='IEND')break;
  p+=12+len;}
 if(ihdr.il)throw new Error('インターレースPNGは未対応');
 if(ihdr.bd!==8)throw new Error('8bit以外は未対応');
 const ch={0:1,2:3,3:1,4:2,6:4}[ihdr.ct];
 const raw=zlib.inflateSync(Buffer.concat(idat));
 const stride=ihdr.w*ch,out=Buffer.alloc(ihdr.h*stride);let q=0;
 for(let y=0;y<ihdr.h;y++){
  const f=raw[q++],line=raw.slice(q,q+stride);q+=stride;
  const o=y*stride,pr=(y-1)*stride;
  for(let x=0;x<stride;x++){
   const a=x>=ch?out[o+x-ch]:0,b=y>0?out[pr+x]:0,c=(y>0&&x>=ch)?out[pr+x-ch]:0;
   let v=line[x];
   if(f===1)v+=a;else if(f===2)v+=b;else if(f===3)v+=((a+b)>>1);
   else if(f===4){const pa=Math.abs(b-c),pb=Math.abs(a-c),pc=Math.abs(a+b-2*c);
    v+=(pa<=pb&&pa<=pc)?a:(pb<=pc?b:c);}
   out[o+x]=v&255;}}
 const px=(x,y)=>{const i=y*stride+x*ch;
  if(ihdr.ct===6)return [out[i],out[i+1],out[i+2],out[i+3]];
  if(ihdr.ct===2)return [out[i],out[i+1],out[i+2],255];
  if(ihdr.ct===0)return [out[i],out[i],out[i],255];
  if(ihdr.ct===4)return [out[i],out[i],out[i],out[i+1]];
  const k=out[i];return [plte[k*3],plte[k*3+1],plte[k*3+2],trns&&k<trns.length?trns[k]:255];};
 return {w:ihdr.w,h:ihdr.h,px};}
const CRC=(()=>{const t=[];for(let n=0;n<256;n++){let c=n;for(let k=0;k<8;k++)c=(c&1)?(0xedb88320^(c>>>1)):(c>>>1);t[n]=c>>>0;}
 return b=>{let c=0xffffffff;for(let i=0;i<b.length;i++)c=t[(c^b[i])&255]^(c>>>8);return (c^0xffffffff)>>>0;};})();
function chunk(type,data){const len=Buffer.alloc(4);len.writeUInt32BE(data.length);
 const td=Buffer.concat([Buffer.from(type,'ascii'),data]),cr=Buffer.alloc(4);cr.writeUInt32BE(CRC(td));
 return Buffer.concat([len,td,cr]);}
function encodePNG(w,h,rgba){
 const stride=w*4,raw=Buffer.alloc(h*(stride+1));
 for(let y=0;y<h;y++){raw[y*(stride+1)]=0;rgba.copy(raw,y*(stride+1)+1,y*stride,(y+1)*stride);}
 const ihdr=Buffer.alloc(13);ihdr.writeUInt32BE(w,0);ihdr.writeUInt32BE(h,4);ihdr[8]=8;ihdr[9]=6;
 return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),
  chunk('IHDR',ihdr),chunk('IDAT',zlib.deflateSync(raw,{level:9})),chunk('IEND',Buffer.alloc(0))]);}

/* ============ 色 ============ */
const hex2rgb=h=>[parseInt(h.slice(1,3),16),parseInt(h.slice(3,5),16),parseInt(h.slice(5,7),16)];
const PAL=PALETTE.map(hex2rgb);
/* 目に合わせた重み付き距離(緑の違いに敏感・青の違いに鈍い) */
function nearIn(pal,r,g,b){let bi=0,bd=1e18;
 for(let i=0;i<pal.length;i++){const p=pal[i];
  const d=(r-p[0])**2*.9+(g-p[1])**2*1.2+(b-p[2])**2*.7;if(d<bd){bd=d;bi=i;}}
 return bi;}
/* 絵から色表を作る(メディアンカット)=パレットを更新したい時用 */
function medianCut(list,n){
 let boxes=[list];
 while(boxes.length<n){
  let bi=-1,bs=-1;
  boxes.forEach((b,i)=>{if(b.length<2)return;let s=0;
   for(let k=0;k<3;k++){let mn=255,mx=0;for(const p of b){if(p[k]<mn)mn=p[k];if(p[k]>mx)mx=p[k];}s=Math.max(s,mx-mn);}
   if(s>bs){bs=s;bi=i;}});
  if(bi<0)break;
  const b=boxes[bi];let ch=0,bs2=-1;
  for(let k=0;k<3;k++){let mn=255,mx=0;for(const p of b){if(p[k]<mn)mn=p[k];if(p[k]>mx)mx=p[k];}
   if(mx-mn>bs2){bs2=mx-mn;ch=k;}}
  b.sort((p,q)=>p[ch]-q[ch]);
  const h=b.length>>1;boxes.splice(bi,1,b.slice(0,h),b.slice(h));}
 return boxes.filter(b=>b.length).map(b=>{const s=[0,0,0];for(const p of b){s[0]+=p[0];s[1]+=p[1];s[2]+=p[2];}
  return s.map(v=>Math.round(v/b.length));});}

/* ============ 変換 ============ */
/* auto=その絵から16色を作って使う(基準の絵を選ぶ時用)。既定は全種で共有するPALETTE */
function convert(file,id,TH,auto,nf){
 const im=decodePNG(fs.readFileSync(file));
 let pal=PAL;
 if(auto){const pts=[];
  for(let y=0;y<im.h;y+=2)for(let x=0;x<im.w;x+=2){const [r,g,b,a]=im.px(x,y);if(a>200)pts.push([r,g,b]);}
  /* ⚠**面積で色を割り当てるので、目のような小さくて派手な部分は色をもらえない**。
     先に「一番鮮やかな色」と「一番明るい色」を種として押さえてから残りを割る */
  const NC=+((/--c=(d+)/.exec(process.argv.join(" "))||[])[1]||24);
  const sat=c=>Math.max(...c)-Math.min(...c);
  const seeds=[];
  const byS=pts.slice().sort((a,b)=>sat(b)-sat(a));if(byS[0])seeds.push(byS[0]);
  const byL=pts.slice().sort((a,b)=>(b[0]+b[1]+b[2])-(a[0]+a[1]+a[2]));if(byL[0])seeds.push(byL[0]);
  pal=seeds.concat(medianCut(pts,Math.max(2,NC-seeds.length)));}
 const solid=(x,y)=>im.px(x,y)[3]>16;
 /* ---- 1つの帯(=1方向ぶんの4コマ)をドットに落とす ---- */
 const oneRow=(y0,y1)=>{
  /* コマに切る(縦に1本も絵が無い列で区切る) */
  const has=[];for(let x=0;x<im.w;x++){let n=0;for(let y=y0;y<=y1;y++)if(solid(x,y)){n=1;break;}has.push(n);}
  const segs=[];let st=-1;
  for(let x=0;x<im.w;x++){if(has[x]&&st<0)st=x;else if(!has[x]&&st>=0){segs.push([st,x-1]);st=-1;}}
  if(st>=0)segs.push([st,im.w-1]);
  if(!segs.length)throw new Error('絵が見つからない(背景が透明か確認)');
  /* ⚠**手が隣のコマに届いていると空白で切れない**(実際に4コマを3つと誤認した)。
     コマ数が分かっている時は、絵のある範囲を等分して切る */
  if(nf&&segs.length!==nf){
   let a=im.w,b=-1;for(const s of segs){if(s[0]<a)a=s[0];if(s[1]>b)b=s[1];}
   segs.length=0;const wd=(b-a+1)/nf;
   for(let i=0;i<nf;i++)segs.push([Math.round(a+i*wd),Math.round(a+(i+1)*wd)-1]);
   console.log('  (コマが繋がっていたので'+nf+'等分で切った)');}
  /* 帯の上端と下端で縮尺を決める=**コマごとに拡大率を変えない**(変えると大きさがちらつく)。
     ⭐帯ごとに測るので、生成AIが正面だけ少し小さく描いても**3方向の背丈が自動でそろう**。 */
  const sc=(y1-y0+1)/TH;
  /* 各コマをドットに落とす。
     ⭐**平均を取ってはいけない**(2026-07-27に踏んだ)。目や歯のような「小さくて明るい点」は
       周りの暗い色と平均されて濁り、**一番読ませたいものほど消える**。実際、元絵には黄色い目が
       はっきり描かれているのに、変換後は緑の塊になっていた。
     ⭐正しいやり方は**セル内で一番多い色を選ぶ**(最頻色)。輪郭と小さな特徴が残る。 */
  const raw=segs.map(s=>{
   const tw=Math.max(1,Math.round((s[1]-s[0]+1)/sc)),g=[];
   for(let ty=0;ty<TH;ty++){const row=[];
    for(let tx=0;tx<tw;tx++){
     const cnt=new Array(pal.length).fill(0);let op=0,n=0;
     const sx0=s[0]+tx*sc,sy0=y0+ty*sc;
     for(let y=Math.floor(sy0);y<Math.min(im.h,Math.ceil(sy0+sc));y++)
      for(let x=Math.floor(sx0);x<Math.min(im.w,Math.ceil(sx0+sc));x++){
       const [r,g2,b,a]=im.px(x,y);n++;
       if(a<128)continue;
       op++;cnt[nearIn(pal,r,g2,b)]++;}
     if(!n||op/n<.42){row.push(null);continue;}
     let bi=0;for(let i=1;i<cnt.length;i++)if(cnt[i]>cnt[bi])bi=i;
     row.push(bi);}
    g.push(row);}
   return {w:tw,g};});
  /* 横の基準点=**足の位置**(体の中心だと腕を伸ばしたコマでずれて、歩くたびに横滑りする) */
  const anch=raw.map(f=>{
   let sum=0,n=0;
   /* ⚠色の番号は0もありうる。真偽で判定すると一番暗い色(輪郭)が空と見なされる */
   for(let y=TH-1;y>=TH-4;y--)for(let x=0;x<f.w;x++)if(f.g[y]&&f.g[y][x]!=null){sum+=x;n++;}
   if(!n){for(let x=0;x<f.w;x++)for(let y=0;y<TH;y++)if(f.g[y][x]!=null){sum+=x;n++;}}
   return n?sum/n:f.w/2;});
  /* 基準点を揃えて同じ幅の枠へ入れ直す */
  const L=Math.ceil(Math.max(...raw.map((f,i)=>anch[i]))),
        R=Math.ceil(Math.max(...raw.map((f,i)=>f.w-anch[i])));
  const OW=L+R;
  const frames=raw.map((f,i)=>{
   const off=Math.round(L-anch[i]),rows=[];
   for(let y=0;y<TH;y++){let s='';
    for(let x=0;x<OW;x++){const sx=x-off;
     const c=(sx>=0&&sx<f.w)?f.g[y][sx]:null;/* もう色の番号が入っている */
     s+=(c==null)?' ':CHARS[c];}
    rows.push(s);}
   return rows;});
  return {w:OW,ax:L,f:frames};};
 /* ---- ⭐3行×4コマの絵(横向き/正面/背面)に対応する(2026-07-27) ----
    道の**約半分は縦移動**なので、横向きの絵だけだと「絵が滑っている」ようにしか見えない。
    横に1本も絵が無い行で帯に切り、帯が3本以上あれば**上から 横向き→正面→背面**とみなす。
    ⚠生成AIは頼んでいない4行目を足すことがある(ウォーカーで実際に4行出た)。
      `--map=0,1,3` でどの帯を使うか選び直せる。
    ⚠**高さ1〜2画素の細い帯は縁のゴミ**なので捨てる(これも実際に出た)。 */
 const bands=[];{let st=-1;
  for(let y=0;y<im.h;y++){let has=0;for(let x=0;x<im.w;x++)if(solid(x,y)){has=1;break;}
   if(has&&st<0)st=y;else if(!has&&st>=0){bands.push([st,y-1]);st=-1;}}
  if(st>=0)bands.push([st,im.h-1]);}
 if(!bands.length)throw new Error('絵が見つからない(背景が透明か確認)');
 const tall=Math.max(...bands.map(b=>b[1]-b[0]+1));
 const rows=bands.filter(b=>(b[1]-b[0]+1)>=tall*.4);
 const out={id,h:TH,src:path.basename(file),
  /* ⚠その絵から作った色表を使った時は、色表も一緒に返す(描く側がこれで引く) */
  pal:pal.map(c=>'#'+c.map(v=>v.toString(16).padStart(2,'0')).join(''))};
 if(rows.length>=3){
  const MM=/--map=(\d+),(\d+),(\d+)/.exec(process.argv.join(' '));
  const map=MM?[+MM[1],+MM[2],+MM[3]]:[0,1,2];
  console.log('  帯'+rows.length+'本 → 横向き=帯'+map[0]+' / 正面=帯'+map[1]+' / 背面=帯'+map[2]);
  const S=oneRow(rows[map[0]][0],rows[map[0]][1]),
        F=oneRow(rows[map[1]][0],rows[map[1]][1]),
        B=oneRow(rows[map[2]][0],rows[map[2]][1]);
  out.w=S.w;out.ax=S.ax;out.f=S.f;
  out.fr={w:F.w,ax:F.ax,f:F.f};out.bk={w:B.w,ax:B.ax,f:B.f};
 }else{
  const S=oneRow(rows[0][0],rows[rows.length-1][1]);
  out.w=S.w;out.ax=S.ax;out.f=S.f;}
 return out;}

/* ---- 下見用のPNG(実寸と5倍を並べる。3方向あれば縦に3段) ---- */
function preview(d,out){
 const P=(d.pal||PALETTE).map(hex2rgb);
 const M=5,GAP=3,BG=[236,232,220];
 const sets=[{w:d.w,ax:d.ax,f:d.f}];
 if(d.fr)sets.push(d.fr);
 if(d.bk)sets.push(d.bk);
 const OW=Math.max(...sets.map(s=>(s.w+GAP)*s.f.length))*M+8;
 const SH=d.h+GAP*2+d.h*M+GAP*3;/* 1方向ぶんの高さ(実寸の段+5倍の段) */
 const OH=SH*sets.length+8;
 const buf=Buffer.alloc(OW*OH*4,0);
 const px=(x,y,c)=>{if(x<0||y<0||x>=OW||y>=OH)return;const i=(y*OW+x)*4;
  buf[i]=c[0];buf[i+1]=c[1];buf[i+2]=c[2];buf[i+3]=255;};
 for(let y=0;y<OH;y++)for(let x=0;x<OW;x++)px(x,y,BG);
 sets.forEach((sp,si)=>{const oy=2+si*SH;
  sp.f.forEach((rows,k)=>{
   for(let y=0;y<d.h;y++)for(let x=0;x<sp.w;x++){
    const ch=rows[y][x];if(ch===' ')continue;
    const c=P[CHARS.indexOf(ch)];
    px(2+k*(sp.w+GAP)+x,oy+y,c);
    for(let j=0;j<M;j++)for(let i=0;i<M;i++)px(2+(k*(sp.w+GAP)+x)*M+i,oy+d.h+GAP*2+y*M+j,c);}});});
 fs.writeFileSync(out,encodePNG(OW,OH,buf));}

/* ---- index.html へ流し込む ---- */
const MARK0='/* PX-DATA-START */',MARK1='/* PX-DATA-END */';
function embed(){
 const dir=path.join(__dirname,'px_data');
 if(!fs.existsSync(dir)){console.log('px_data/ が無い');process.exit(1);}
 const files=fs.readdirSync(dir).filter(f=>f.endsWith('.json')).sort();
 /* ⚠**向きごとに幅と基準点が違う**(横向きは腕を伸ばすぶん広い)ので、正面/背面も w と ax を持たせる */
 const fx=f=>'[\n'+f.map(rows=>'  ['+rows.map(r=>"'"+r+"'").join(',\n   ')+']').join(',\n')+']';
 const parts=files.map(f=>{
  const d=JSON.parse(fs.readFileSync(path.join(dir,f),'utf8'));
  let s=' '+d.id+':{w:'+d.w+',h:'+d.h+',ax:'+d.ax+',lh:50,f:'+fx(d.f);
  if(d.fr)s+=',\n  fr:{w:'+d.fr.w+',ax:'+d.fr.ax+',f:'+fx(d.fr.f)+'}';
  if(d.bk)s+=',\n  bk:{w:'+d.bk.w+',ax:'+d.bk.ax+',f:'+fx(d.bk.f)+'}';
  return s+'}';});
 /* ⚠**1文字→色の番号は CHARS の並び順**。16色を超えた時に parseInt(ch,16) では引けないので、
    描く側にも同じ並びを渡す(PX_CH) */
 const js='const PX_CH=\''+CHARS+'\';\n'
  +'const PX_PAL=['+PALETTE.map(h=>"'"+h+"'").join(',')+'];\n'
  +'const PX_Z={\n'+parts.join(',\n')+'\n};';
 const p=path.join(__dirname,'index.html');
 const s=fs.readFileSync(p,'utf8');
 const a=s.indexOf(MARK0),b=s.indexOf(MARK1);
 if(a<0||b<0){console.log('index.html に '+MARK0+' / '+MARK1+' が無い');process.exit(1);}
 fs.writeFileSync(p,s.slice(0,a+MARK0.length)+'\n'+js+'\n'+s.slice(b));
 console.log('index.html に流し込んだ: '+files.length+'種 ('+(js.length/1024).toFixed(1)+'KB)');}

/* ============ 入口 ============ */
const args=process.argv.slice(2);
if(args[0]==='--embed'){embed();return;}
if(args[0]==='--pal'){
 const im=decodePNG(fs.readFileSync(args[1]));
 const pts=[];
 for(let y=0;y<im.h;y+=2)for(let x=0;x<im.w;x+=2){const [r,g,b,a]=im.px(x,y);if(a>200)pts.push([r,g,b]);}
 const p=medianCut(pts,+(args[2]||16));
 console.log(p.map(c=>"'#"+c.map(v=>v.toString(16).padStart(2,'0')).join('')+"'").join(','));
 return;}
if(args.length<2){
 console.log('使い方: node tool_px.js <png> <id> [--h=40]  /  node tool_px.js --embed');
 process.exit(1);}
const HM=/--h=(\d+)/.exec(args.join(' ')),TH=HM?+HM[1]:40;
const AUTO=/--auto/.test(args.join(' '));const NFM=/--f=(d+)/.exec(args.join(' '));
const d=convert(args[0],args[1],TH,AUTO,NFM?+NFM[1]:4);
for(const dir of ['px_data','px_prev'])if(!fs.existsSync(path.join(__dirname,dir)))fs.mkdirSync(path.join(__dirname,dir));
fs.writeFileSync(path.join(__dirname,'px_data',d.id+'.json'),JSON.stringify(d));
preview(d,path.join(__dirname,'px_prev',d.id+'.png'));
/* 点検: コマ間で足の位置と体の量がぶれていないか */
console.log('■ '+d.id+': '+(d.fr?'3方向':'横向きのみ')+' / '+d.f.length+'コマ / '+d.w+'x'+d.h+'ドット / 基準点x='+d.ax);
const look=(nm,sp)=>{
 const cnt=sp.f.map(rows=>rows.join('').split('').filter(c=>c!==' ').length);
 const top=sp.f.map(rows=>{for(let y=0;y<d.h;y++)if(rows[y].trim())return y;return d.h;});
 /* ⭐**下半分(脚)がコマごとに動いているか**を見る。正面/背面は生成AIが脚を動かさないことがあり、
    向きが正しくても「絵が滑っている」ように見える。1コマ目との違いを数える */
 const leg=sp.f.map(rows=>{let s='';for(let y=Math.floor(d.h*.55);y<d.h;y++)s+=rows[y];return s;});
 const dif=leg.slice(1).map(s=>{let n=0;for(let i=0;i<s.length;i++)if(s[i]!==leg[0][i])n++;return n;});
 /* ⭐**元絵が粗いと「絵面が別のゲーム」になる**(2026-07-27に踏んだ)。
    生成AIに「平らな色で・色数を絞って」と強く言うと、**もっと粗いドットで描いてくる**ことがある。
    それを44ドットへ引き伸ばすので、輪郭が2〜3ドットに太り、体つきもずんぐりして画風が変わる。
    ⚠数値だけ見ていると気づけない(塗り数も脚の変化も正常に見える)。
    測り方=**1ドットあたりの色の変わり目**。ウォーカーと良い方のアーマードが0.62、
    粗い絵は0.35しか無かった(=細部が半分消えている)。
    ⚠⭐**これは目安であって判定ではない**(2026-07-27に誤検知した)。
      **大きくて平らな体ほど低く出る**=重装兵0.42・ストーカー0.41は元絵が粗いのではなく
      「一枚板の装甲」「のっぺりした胴」だからで、実寸で見ると何の問題も無かった。
      輪郭の厚みでも測ってみたが、粗い絵と良い絵がどちらも2ドットで**分けられなかった**。
      **最後は実寸で目視すること**。この数字は「前より急に下がった」に気づくために出している。 */
 let fill=0,chg=0;
 for(const rows of sp.f)for(const r of rows){let p=' ';
  for(let x=0;x<r.length;x++){const c=r.charAt(x);if(c!==' ')fill++;if(c!==p)chg++;p=c;}}
 const den=fill?chg/fill:0;
 console.log('  ['+nm+'] 幅'+sp.w+' 塗り数'+cnt.join('/')+'(差'+(Math.max(...cnt)-Math.min(...cnt))
  +') 上端差'+(Math.max(...top)-Math.min(...top))+' 脚の変化'+dif.join('/')+' 細かさ'+den.toFixed(2)
  +(den<.38?' ⚠元絵が粗いかも(目安0.38未満)=実寸で見て確かめる':''));};
look('横向き',{w:d.w,f:d.f});
if(d.fr)look('正面 ',d.fr);
if(d.bk)look('背面 ',d.bk);
console.log('  書き出し: px_data/'+d.id+'.json / px_prev/'+d.id+'.png');
