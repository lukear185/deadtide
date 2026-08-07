/* 📦 tool_stock.js — 素材の在庫台帳(zipを開かずに中身を引く)
   ⚠⚠**作った理由**=347本のバンドルが未開封のまま、余り18本で音を作っていた事故への直球
     (2026-08-02(33)(34)。掟は NOTES_音 の先頭)。**「限界」を感じたら、まず在庫を確かめる**。

   使い方:
     node tool_stock.js                 在庫の概要(分類ごとの本数)
     node tool_stock.js 骨              日本語でも英語でも検索(部分一致・複数語はAND)
     node tool_stock.js バス エンジン    2語ともを含む物だけ
     node tool_stock.js --cat           UCSの分類(CatID)の一覧と本数
     node tool_stock.js --all           全件
     node tool_stock.js --rebuild       索引を作り直す(zipを足した時だけ)
     node tool_stock.js --take <語>     取り出し方(PowerShellの1行)を出す。⚠展開はしない

   ⚠**依存ゼロ**=zipの中央ディレクトリだけを自前で読む(展開しない・ライブラリを足さない)。
   ⚠⚠**生WAVはリポジトリに入れない**(Sonnissは単体ファイルの再配布とAI学習利用が禁止)。
     ⭐**台帳(ファイル名の一覧)は入れてよい**。ライセンス原文の写しは px_src/ に置く。 */
const fs=require('fs'),path=require('path');

/* ---- 素材の置き場。⚠**商用可の物だけ**(Sonniss/Kenney CC0/Freesound CC0/ZapSplat CC0) ---- */
const SRC=[
 {k:'sfx',n:'Sonniss GDC(商用可)',dir:'C:/Users/acecl/Downloads',zip:/^Sonniss.*GameAudioBundle.*\.zip$/i,
  ext:/\.(wav|mp3|flac|aif|aiff|ogg)$/i},
 {k:'part',n:'Kenney 粒(CC0)',dir:path.join(__dirname,'px_src','kenney'),ext:/\.png$/i},
];
const CACHE=path.join(__dirname,'stock_index.json');

/* ---- UCS(Universal Category System)の分類。⚠**頭の英字がそれ**。パブリックドメインの規格 ---- */
const UCS={
 AMB:'環境音',AMBUrbn:'環境/都市',AMBInd:'環境/工場',AMBSubn:'環境/郊外',AMBDsgn:'環境/作り物',AMBWar:'環境/戦場',
 ANML:'動物',ANMLDog:'動物/犬',ANMLRept:'動物/爬虫類',
 AERO:'航空',AEROJet:'航空/ジェット',
 BOAT:'船',BOATMotr:'船/機関',
 CREA:'怪物',CREAMnstr:'怪物/モンスター',CREABeast:'怪物/獣',
 CRWD:'群衆',CRWDWalla:'群衆/ざわめき',CRWDCheer:'群衆/歓声',
 DSGN:'作り物',DSGNBram:'作り物/ホーン(Braam)',DSGNMisc:'作り物/その他',
 ELEC:'電気',ELECMisc:'電気/その他',
 EQUI:'道具',EQUISprt:'道具/スポーツ',
 FGHT:'格闘',FGHTImpt:'格闘/打撃',
 FIRE:'火',FIREBurn:'火/燃焼',FIRECrkl:'火/爆ぜ',FIREWhsh:'火/風切り',
 GLAS:'ガラス',GLASMvmt:'ガラス/動き',
 GORE:'ゴア',GORESplt:'ゴア/飛沫',GOREMisc:'ゴア/その他',
 MAG:'魔法',MAGMisc:'魔法/その他',
 METL:'金属',METLImpt:'金属/打撃',METLMisc:'金属/その他',METLFric:'金属/こすれ',METLMvmt:'金属/動き',
 STORM:'嵐',THUN:'雷',
 TRN:'列車',TRNElec:'列車/電車',
 VEH:'車両',VEHSkid:'車両/スキール',VEHMoto:'車両/バイク',VEHFrght:'車両/トラック',VEHMech:'車両/機構',
 VOX:'声',VOXMale:'声/男',VOXFutz:'声/加工',
 WATR:'水',WEAP:'武器',WEAPBlnt:'武器/打撃',
 WIND:'風',WINDDsgn:'風/作り物',WINDInt:'風/屋内',WOOD:'木',WOODImpt:'木/打撃',
 /* ⚠(209)実物を数えて足した分。⚠**ベンダー独自の命名は UCS ではない**ので取りこぼす(SBmb 等) */
 OBJ:'物',OBJMisc:'物/その他',OBJLug:'物/鞄',HMN:'人',HMNBrth:'人/呼吸',VOXFem:'声/女',VOXReac:'声/反応',
 AMBTran:'環境/乗り物',CREAEthr:'怪物/霊',PAPR:'紙',PAPRMisc:'紙/その他',COM:'通信',COMTelph:'通信/電話',
 COMType:'通信/打鍵',VEHInt:'車両/車内',VEHCar:'車両/乗用車',GAME:'遊具',GAMECas:'遊具/カジノ',
 FOLY:'衣擦れ',FOLYClth:'衣擦れ/布',MUSC:'楽器',MUSCInst:'楽器/単音',CLOCK:'時計',CLOCKTick:'時計/秒針',
 DSGNBass:'作り物/低音',DSGNWhsh:'作り物/風切り',DSGNSwrl:'作り物/渦',
};
/* ---- 日本語で引けるようにする対訳。⚠**この作りで実際に探す語**だけ入れる ---- */
const JA={
 骨:['bone','crack','ice'],肉:['squelch','splat','flesh','meat'],血:['blood','gore','splat'],
 潰:['crush','smash','squelch'],轢:['crush','smash','impact','tire'],
 バス:['bus','vehicle','truck','engine','diesel'],車:['car','vehicle','truck','veh'],
 エンジン:['engine','diesel','motor','rpm'],タイヤ:['tire','skid'],ブレーキ:['brake','skid'],
 扉:['door','gate'],ドア:['door','gate'],空気:['air','hiss','pneumat'],
 歓声:['cheer','crowd','applause'],群衆:['crowd','walla','cheer'],声:['vox','voice','vocal'],
 唸:['growl','snarl','roar'],悲鳴:['scream','yell','pain'],
 ホーン:['horn','braam'],ラッパ:['horn','braam'],
 爆発:['explosion','blast','boom','impact'],衝撃:['impact','hit','smash'],
 金属:['metal','metl','clank'],ガラス:['glass'],木:['wood'],
 雷:['thunder','lightning','storm'],風:['wind','whoosh'],雨:['rain','storm'],
 火:['fire','burn','flame','crackl'],水:['water','liquid'],
 銃:['gun','weapon','shot','fire'],足音:['foot','step'],
 怪物:['creature','monster','beast'],動物:['animal','anml','dog'],
 魔法:['magic','mag'],光:['shine','sparkle','glass','magic'],
 環境:['ambien','amb'],列車:['train','trn'],機械:['mech','machine','motor'],
 うねり:['riser','sweep','whoosh'],溜め:['riser','sweep','build'],
};

/* ============ zipの中央ディレクトリだけを読む(展開しない) ============
   ⚠**ここが依存ゼロの肝**。末尾の EOCD を探して、そこから項目名だけ拾う。 */
function zipList(file){
 const fd=fs.openSync(file,'r'),sz=fs.statSync(file).size;
 try{
  /* EOCD(終端レコード)を末尾64KBから探す */
  const tail=Math.min(sz,66560),buf=Buffer.alloc(tail);
  fs.readSync(fd,buf,0,tail,sz-tail);
  let e=-1;
  for(let i=buf.length-22;i>=0;i--)if(buf.readUInt32LE(i)===0x06054b50){e=i;break;}
  if(e<0)throw new Error('EOCDが見つからない(zipではない?)');
  let n=buf.readUInt16LE(e+10),cdSize=buf.readUInt32LE(e+12),cdOff=buf.readUInt32LE(e+16);
  /* ZIP64(4GB超/65535項目超)。⚠いまの素材は該当しないが、踏んだ時に黙って壊れないよう見る */
  if(cdOff===0xffffffff||n===0xffff){
   let z=-1;
   for(let i=e-20;i>=0;i--)if(buf.readUInt32LE(i)===0x07064b50){z=i;break;}
   if(z<0)throw new Error('ZIP64だが終端が見つからない');
   const eo=Number(buf.readBigUInt64LE(z+8)),hb=Buffer.alloc(56);
   fs.readSync(fd,hb,0,56,eo);
   if(hb.readUInt32LE(0)!==0x06064b50)throw new Error('ZIP64のEOCDが壊れている');
   n=Number(hb.readBigUInt64LE(32));cdSize=Number(hb.readBigUInt64LE(40));cdOff=Number(hb.readBigUInt64LE(48));
  }
  const cd=Buffer.alloc(cdSize);fs.readSync(fd,cd,0,cdSize,cdOff);
  const out=[];let p=0;
  for(let i=0;i<n&&p+46<=cd.length;i++){
   if(cd.readUInt32LE(p)!==0x02014b50)break;
   const nl=cd.readUInt16LE(p+28),el=cd.readUInt16LE(p+30),cl=cd.readUInt16LE(p+32);
   const usz=cd.readUInt32LE(p+24);
   out.push({name:cd.toString('utf8',p+46,p+46+nl),size:usz});
   p+=46+nl+el+cl;
  }
  return out;
 }finally{fs.closeSync(fd);}
}

/* ---- 索引を作る ---- */
function build(){
 const rows=[];
 for(const s of SRC){
  if(!fs.existsSync(s.dir)){console.log('⚠置き場が無い: '+s.dir+'('+s.n+')');continue;}
  if(s.zip){
   const zs=fs.readdirSync(s.dir).filter(f=>s.zip.test(f));
   for(const z of zs){
    let L=[];try{L=zipList(path.join(s.dir,z));}catch(e){console.log('⚠読めない '+z+': '+e.message);continue;}
    for(const it of L){
     const base=path.basename(it.name);
     if(!s.ext.test(base))continue;
     rows.push({k:s.k,src:s.n,box:z,name:base,size:it.size});
    }
   }
  }else{
   for(const f of fs.readdirSync(s.dir)){
    if(!s.ext.test(f))continue;
    rows.push({k:s.k,src:s.n,box:path.basename(s.dir),name:f,size:fs.statSync(path.join(s.dir,f)).size});
   }
  }
 }
 fs.writeFileSync(CACHE,JSON.stringify({at:new Date().toISOString().slice(0,10),rows},null,0));
 return rows;
}
function load(){
 if(!fs.existsSync(CACHE))return build();
 try{return JSON.parse(fs.readFileSync(CACHE,'utf8')).rows||[];}catch(e){return build();}
}

/* ---- UCSの分類を名前の頭から拾う ---- */
function catOf(n){
 const m=/^([A-Za-z]+)_/.exec(n);if(!m)return null;
 const c=m[1];
 return {id:c,ja:UCS[c]||UCS[c.slice(0,4)]||UCS[c.slice(0,3)]||null};
}
const MB=b=>(b/1048576).toFixed(1)+'MB';
/* 検索語を英語の候補へ広げる(日本語で引けるようにする)。
   ⚠⚠**一番長く一致した語だけ**を使う=「歓声」で「声」まで拾うと、声の素材が全部並んで検索にならない */
const JAK=Object.keys(JA).sort((a,b)=>b.length-a.length);
function terms(q){
 const out=[q.toLowerCase()];
 for(const k of JAK)if(q.indexOf(k)>=0){out.push(...JA[k]);break;}
 return out;
}
/* ⚠⚠**英語の語は「語の頭」で見る**=単なる部分一致だと ice が Voices に、splat が Reutersplatz に当たる
   (骨で33本・血で7本の的外れが出た)。⭐名前は空白/下線/記号で区切られているので頭合わせで足りる。 */
function hit(row,q){
 const n=row.name.toLowerCase(),c=catOf(row.name);
 const ja=c&&c.ja?c.ja:'';
 const ok=t=>{
  if(/[^\x00-\x7f]/.test(t))return n.indexOf(t)>=0;/* 日本語はそのまま */
  let i=-1;
  while((i=n.indexOf(t,i+1))>=0){const p=i?n[i-1]:' ';if(!/[a-z0-9]/.test(p))return true;}
  return false;};
 return terms(q).some(ok)||(ja&&ja.indexOf(q)>=0);
}

/* ============ 出す ============ */
const A=process.argv.slice(2);
if(A.indexOf('--rebuild')>=0){const r=build();console.log('📦 索引を作り直した: '+r.length+'件 → '+path.basename(CACHE));process.exit(0);}
const rows=load();
const sfx=rows.filter(r=>r.k==='sfx'),part=rows.filter(r=>r.k==='part');

if(!A.length){
 console.log('📦 素材の在庫台帳');
 console.log('─'.repeat(60));
 const boxes={};for(const r of sfx)boxes[r.box]=(boxes[r.box]||0)+1;
 console.log('🔊 効果音  '+sfx.length+'本 ('+Object.keys(boxes).length+'個のzip・'+MB(sfx.reduce((a,b)=>a+b.size,0))+')');
 /* いま index.html に埋め込んである本数と並べる=「まだ開けていない分」が一目で分かる */
 try{const s=fs.readFileSync(path.join(__dirname,'index.html'),'utf8');
  const emb=(s.match(/^\s*[a-zA-Z0-9_]+:\['SUQzB/gm)||[]).length;
  console.log('   ├ 使用中(index.htmlに埋め込み済み) '+emb+'本');
  console.log('   └ ⭐**手持ちの在庫** '+sfx.length+'本');}catch(e){}
 console.log('🎆 粒の絵  '+part.length+'枚(手元に落としてある分)');
 console.log('─'.repeat(60));
 /* 分類の上位 */
 const cat={};for(const r of sfx){const c=catOf(r.name);const k=c?(c.ja||c.id):'(分類なし)';cat[k]=(cat[k]||0)+1;}
 const top=Object.entries(cat).sort((a,b)=>b[1]-a[1]).slice(0,14);
 console.log('よくある分類:');
 for(const [k,v] of top)console.log('  '+String(v).padStart(4)+'本  '+k);
 console.log('─'.repeat(60));
 console.log('引き方: node tool_stock.js 骨 / バス エンジン / --cat / --all / --take <語>');
 process.exit(0);
}
if(A[0]==='--cat'){
 const cat={};
 for(const r of sfx){const c=catOf(r.name);const k=c?c.id:'(なし)';(cat[k]=cat[k]||{n:0,ja:c&&c.ja}).n++;}
 console.log('📚 UCSの分類('+Object.keys(cat).length+'種)');
 for(const [k,v] of Object.entries(cat).sort((a,b)=>b[1].n-a[1].n))
  console.log('  '+String(v.n).padStart(4)+'本  '+k.padEnd(10)+(v.ja||'⚠対訳なし'));
 process.exit(0);
}
if(A[0]==='--all'){
 for(const r of sfx)console.log('  '+r.name);
 console.log('計 '+sfx.length+'本');process.exit(0);
}
/* --take: 取り出し方だけ出す(⚠展開はしない=生WAVをリポジトリに入れないため) */
const take=A[0]==='--take';
const qs=(take?A.slice(1):A).filter(x=>x[0]!=='-');
if(!qs.length){console.log('⚠語を渡してください');process.exit(1);}
const found=sfx.filter(r=>qs.every(q=>hit(r,q)));
console.log('🔎 「'+qs.join(' + ')+'」 … '+found.length+'本');
console.log('─'.repeat(60));
for(const r of found){
 const c=catOf(r.name);
 console.log('  ['+(c&&c.ja?c.ja:'?')+'] '+r.name);
 console.log('      '+r.box+'  '+MB(r.size));
}
if(take&&found.length){
 console.log('─'.repeat(60));
 console.log('⚠**生WAVはリポジトリに入れない**。作業用の置き場へ出して、加工したmp3だけを埋め込むこと。');
 console.log('取り出し(PowerShell・1本ずつ):');
 const r=found[0];
 console.log('  Add-Type -AssemblyName System.IO.Compression.FileSystem');
 console.log('  $z=[System.IO.Compression.ZipFile]::OpenRead("C:\\Users\\acecl\\Downloads\\'+r.box+'")');
 console.log('  $e=$z.Entries | Where-Object { $_.Name -eq "'+r.name+'" }');
 console.log('  [System.IO.Compression.ZipFileExtensions]::ExtractToFile($e,"<出す先>\\'+r.name+'",$true)');
 console.log('  $z.Dispose()');
}
if(!found.length){
 console.log('⚠見つからない。--cat で分類を見るか、英語の語(bone/impact/engine…)で引き直す。');
 console.log('  日本語で引ける語: '+Object.keys(JA).join(' '));
}
