// ✨ 粒の絵を作る(tool_tex.js) — 2026-08-06(189)ユーザー指示で作った
//
// ⚠⚠**作った理由**=粒(パーティクル)の画像は Kenney Particle Pack(CC0)だけが頼りで、
//   **そこに無い形**(細い線状の火花・十字の閃光・薄いリング)は作れなかった。
//   ⭐**手続きで作れば形も色も自由**。⚠外部素材ではないのでライセンスの心配もゼロ。
//
// ⚠**依存ゼロで作る**=PNGは Node 標準の `zlib` だけで書ける(pngjs も要らない)。
// ⚠**置き場は `px_src/kenney/` に合流させる**=既にある `tool_part.js` の埋め込み経路に乗せるため。
//   ⭐作った後: `node tool_part.js` で index.html に base64 で埋め込まれる。
//
// 使い方:
//   node tool_tex.js            # 作れる形を一覧
//   node tool_tex.js all        # 全部作って px_src/kenney/ に置く
//   node tool_tex.js ring --size=64 --col=ffd23d

const fs=require('fs'),path=require('path'),zlib=require('zlib');
const OUTDIR=path.join(__dirname,'px_src','kenney');
const ARG=process.argv.slice(2).join(' ');
const CMD=(process.argv[2]||'list').replace(/^--/,'');
const SIZE=+((/--size=(\d+)/.exec(ARG)||[])[1]||48);
const COL=((/--col=([0-9a-fA-F]{6})/.exec(ARG)||[])[1]||'ffffff');

/* ---- 依存ゼロのPNG書き出し(RGBA) ---- */
function png(w,h,rgba){
 const crcT=(()=>{const t=[];for(let n=0;n<256;n++){let c=n;
  for(let k=0;k<8;k++)c=c&1?0xEDB88320^(c>>>1):c>>>1;t[n]=c>>>0;}return t;})();
 const crc=b=>{let c=0xFFFFFFFF;for(let i=0;i<b.length;i++)c=crcT[(c^b[i])&255]^(c>>>8);return (c^0xFFFFFFFF)>>>0;};
 const chunk=(type,data)=>{
  const len=Buffer.alloc(4);len.writeUInt32BE(data.length);
  const t=Buffer.from(type,'ascii');
  const c=Buffer.alloc(4);c.writeUInt32BE(crc(Buffer.concat([t,data])));
  return Buffer.concat([len,t,data,c]);};
 const ihdr=Buffer.alloc(13);
 ihdr.writeUInt32BE(w,0);ihdr.writeUInt32BE(h,4);
 ihdr[8]=8;ihdr[9]=6;ihdr[10]=0;ihdr[11]=0;ihdr[12]=0;/* 8bit RGBA */
 /* ⚠**各行の先頭にフィルタ種別のバイトが要る**(0=なし)。忘れると壊れたPNGになる */
 const raw=Buffer.alloc((w*4+1)*h);
 for(let y=0;y<h;y++){raw[y*(w*4+1)]=0;
  rgba.copy(raw,y*(w*4+1)+1,y*w*4,(y+1)*w*4);}
 return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),
  chunk('IHDR',ihdr),chunk('IDAT',zlib.deflateSync(raw,{level:9})),chunk('IEND',Buffer.alloc(0))]);
}
const rgb=h=>[parseInt(h.slice(0,2),16),parseInt(h.slice(2,4),16),parseInt(h.slice(4,6),16)];

/* ---- 形の作り方(⚠どれも「中心が明るく外へ薄く」=加算合成で綺麗に重なる形) ---- */
const SHAPES={
 ring:{d:'薄い輪(衝撃波・範囲の合図)',f:(x,y,r,t)=>{
  /* 縁だけ明るく、内も外も薄い */
  const w=0.14;return Math.max(0,1-Math.abs(r-(0.72))/w)**1.6;}},
 ringw:{d:'太い輪(着弾のひろがり)',f:(x,y,r)=>{
  const w=0.30;return Math.max(0,1-Math.abs(r-0.62)/w)**1.2;}},
 spark:{d:'細い線状の火花(縦に伸びる)',f:(x,y,r)=>{
  const ax=Math.abs(x),ay=Math.abs(y);
  const line=Math.max(0,1-ax/0.10)**2*Math.max(0,1-ay/0.95);
  return Math.max(line,Math.max(0,1-r/0.16)**2);}},
 cross:{d:'十字の閃光(急所に当たった合図)',f:(x,y,r)=>{
  const ax=Math.abs(x),ay=Math.abs(y);
  const h=Math.max(0,1-ay/0.07)**2*Math.max(0,1-ax/0.95);
  const v=Math.max(0,1-ax/0.07)**2*Math.max(0,1-ay/0.95);
  return Math.min(1,Math.max(h,v)+Math.max(0,1-r/0.13)**2);}},
 star4:{d:'四方に伸びる星(強い一撃)',f:(x,y,r)=>{
  const ax=Math.abs(x),ay=Math.abs(y);
  const arm=Math.max(Math.max(0,1-ay/(0.05+ax*0.10))*Math.max(0,1-ax/0.98),
                     Math.max(0,1-ax/(0.05+ay*0.10))*Math.max(0,1-ay/0.98));
  return Math.min(1,arm**1.4+Math.max(0,1-r/0.18)**2);}},
 soft:{d:'ぼんやりした丸(煙・灯り)',f:(x,y,r)=>Math.max(0,1-r)**2.2},
 hard:{d:'芯のある丸(火花の粒)',f:(x,y,r)=>Math.max(0,1-r)**5+Math.max(0,1-r/0.35)},
 shard:{d:'縦長の破片(飛び散る欠片)',f:(x,y,r)=>{
  const ax=Math.abs(x/0.30),ay=Math.abs(y/0.95);
  return (ax+ay<1)?Math.max(0,1-(ax+ay))**0.6:0;}},
};

if(CMD==='list'||!SHAPES[CMD]&&CMD!=='all'){
 console.log('✨ 粒の絵を作る  '+Object.keys(SHAPES).length+'種');
 console.log('─'.repeat(58));
 for(const k in SHAPES)console.log('  '+k.padEnd(10)+SHAPES[k].d);
 console.log('─'.repeat(58));
 console.log('  node tool_tex.js all                  # 全部作る');
 console.log('  node tool_tex.js ring --size=64 --col=ffd23d');
 console.log('⚠ 作った後: node tool_part.js で index.html に埋め込まれる(既存の経路に合流)');
 console.log('⚠ 置き場: '+OUTDIR);
 process.exit(0);
}

function make(name){
 const S=SIZE,f=SHAPES[name].f,[R,Gc,B]=rgb(COL);
 const buf=Buffer.alloc(S*S*4);
 for(let y=0;y<S;y++)for(let x=0;x<S;x++){
  /* -1〜1 の座標に直す(中心が0) */
  const nx=(x+0.5)/S*2-1,ny=(y+0.5)/S*2-1;
  const r=Math.sqrt(nx*nx+ny*ny);
  let a=f(nx,ny,r);
  a=Math.max(0,Math.min(1,a));
  const i=(y*S+x)*4;
  /* ⚠**色は白寄りに、濃さはαで表す**=ゲーム側で色を掛けて使い回せるようにするため */
  buf[i]=Math.round(R*(0.55+0.45*a));
  buf[i+1]=Math.round(Gc*(0.55+0.45*a));
  buf[i+2]=Math.round(B*(0.55+0.45*a));
  buf[i+3]=Math.round(a*255);
 }
 const p=path.join(OUTDIR,'gen_'+name+'.png');
 fs.mkdirSync(OUTDIR,{recursive:true});
 fs.writeFileSync(p,png(S,S,buf));
 return p;
}
const names=CMD==='all'?Object.keys(SHAPES):[CMD];
console.log('✨ 粒の絵を作った  '+SIZE+'x'+SIZE+' / 色 #'+COL);
for(const n of names)console.log('   '+path.basename(make(n)).padEnd(20)+SHAPES[n].d);
console.log('⚠ 次: node tool_part.js  で index.html に埋め込む');
