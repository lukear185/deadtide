// 🔊 音の道具(tool_snd.js) — 2026-08-06(189)ユーザー指示で作った
//
// ⚠⚠**作った理由**=**Claude は音を聴けない**。耳の代わりは3つしかない:
//   ①数字 ②画像(スペクトログラム) ③人が押す一覧(`?sfx=1`)。**③しか無かった**。
//   さらに [[NOTES_音]] には「1000Hz超の笛は禁止」「200Hz以下は実機で鳴らない」「尾は短く」という
//   **掟が文章でだけ**あって、誰も測っていなかった。
//
// 使い方:
//   node tool_snd.js check        # 🚦掟を数値で見る(⚠**合否は出さない**=順位と外れ値だけ)
//   node tool_snd.js sheet out.png  # 🖼全部のスペクトログラム+波形を1枚に
//   node tool_snd.js stock        # 📚素材の在庫(sfx_src/)を種類ごとに数える
//
// ⚠⚠**閾値で落とさない**=NOTES_道具の「閾値の当てずっぽうが最大の罠」「最初は合否を出さず
//   ランキングだけ」に従う。ノイズ系(nzHit)は本質的に重心が高いので、一律の線では必ず誤爆する。
// ⚠**Sonniss の素材は AI 学習に使わない**(契約で禁止)。この道具は**測るだけ**で学習には使わない。
// ⚠生WAVはリポジトリに入れない決まり。`sfx_src/` は手元にあるだけ。

const fs=require('fs'),path=require('path'),os=require('os'),cp=require('child_process');
const CMD=(process.argv[2]||'check').replace(/^--/,'');
const OUT=process.argv[3];

/* ---- ffmpeg を探す(tool_sfx.js と同じ手) ---- */
function findFF(){
 const cands=[process.env.FFMPEG,'ffmpeg'];
 for(const c of cands){if(!c)continue;
  try{cp.execFileSync(c,['-hide_banner','-version'],{stdio:'ignore'});return c;}catch(e){}}
 try{
  const base=path.join(process.env.LOCALAPPDATA||'','Microsoft','WinGet','Packages');
  for(const d of fs.readdirSync(base)){
   if(!/ffmpeg/i.test(d))continue;
   const st=[path.join(base,d)];
   while(st.length){const cur=st.pop();
    for(const e of fs.readdirSync(cur,{withFileTypes:true})){
     const p=path.join(cur,e.name);
     if(e.isDirectory())st.push(p);
     else if(e.name.toLowerCase()==='ffmpeg.exe')return p;}}}
 }catch(e){}
 return null;}

/* ============ 📚 在庫台帳 ============ */
if(CMD==='stock'){
 const dirs=['sfx_src'];
 let n=0;const byCat={},byVendor={};
 for(const d of dirs){
  if(!fs.existsSync(d))continue;
  for(const f of fs.readdirSync(d)){
   if(!/\.(wav|mp3|ogg|flac)$/i.test(f))continue;
   n++;
   /* ⭐UCS(Universal Category System)の CatID=先頭の英字の塊。付いていない物は「その他」 */
   const m=/^([A-Za-z]{4,8})_/.exec(f);
   const cat=m?m[1]:'(CatIDなし)';
   byCat[cat]=(byCat[cat]||0)+1;
   /* ベンダー名は末尾の「_◯◯」に入っていることが多い */
   const v=(/_([^_]+)\.[a-z0-9]+$/i.exec(f)||[])[1]||'?';
   byVendor[v]=(byVendor[v]||0)+1;
  }}
 console.log('📚 音素材の在庫  '+n+'本');
 console.log('─'.repeat(60));
 if(!n){console.log('⚠ sfx_src/ に素材が無い(生WAVはリポジトリに入れない決まり=手元にだけ置く)');process.exit(0);}
 console.log('▼ 種類(UCSのCatID)');
 for(const k of Object.keys(byCat).sort((a,b)=>byCat[b]-byCat[a]))
  console.log('   '+k.padEnd(12)+byCat[k]+'本');
 console.log('▼ 提供元(上位8)');
 for(const k of Object.keys(byVendor).sort((a,b)=>byVendor[b]-byVendor[a]).slice(0,8))
  console.log('   '+String(k).slice(0,28).padEnd(30)+byVendor[k]+'本');
 console.log('─'.repeat(60));
 console.log('⚠**Sonniss は単体での再配布とAI学習利用が禁止**(base64でゲームに埋め込むのは可)');
 process.exit(0);
}

const FF=findFF();
if(!FF){console.log('⚠ ffmpeg が見つからない(winget install "FFmpeg (Essentials Build)")');process.exit(1);}

/* ---- 埋め込み済みのMP3を一時フォルダへ取り出す ---- */
const html=fs.readFileSync('./index.html','utf8');
const TMP=fs.mkdtempSync(path.join(os.tmpdir(),'dtsnd-'));
process.on('exit',()=>{try{fs.rmSync(TMP,{recursive:true,force:true});}catch(e){}});
const list=[];
/* ⚠**形は `名前:['<base64>',音量]`**(tool_sfx.js が書き込む形)。⚠変えたらここも直す */
for(const m of html.matchAll(/^\s([A-Za-z0-9_]+):\['([A-Za-z0-9+/=]{200,})',([\d.]+)\]/gm)){
 const name=m[1],b64=m[2],gain=+m[3];
 const f=path.join(TMP,name+'.mp3');
 fs.writeFileSync(f,Buffer.from(b64,'base64'));
 list.push({name,f,gain});
}
if(!list.length){console.log('⚠ 埋め込みの音が見つからない(形が変わった?)');process.exit(1);}

/* ---- 1本ずつ測る ---- */
function probe(f){
 /* astats=山と平均 / aspectralstats=重心。⚠**ametadata=print で標準エラーに出る** */
 const r=cp.spawnSync(FF,['-hide_banner','-nostats','-i',f,
  '-af','astats=metadata=1:reset=0,aspectralstats=measure=centroid+rolloff+flatness,'
   +'ametadata=mode=print:key=lavfi.aspectralstats.1.centroid,'
   +'ametadata=mode=print:key=lavfi.aspectralstats.1.rolloff,'
   +'ametadata=mode=print:key=lavfi.aspectralstats.1.flatness',
  '-f','null','-'],{encoding:'utf8',maxBuffer:1<<26});
 const t=(r.stderr||'');
 const num=(re)=>{const m=re.exec(t);return m?+m[1]:null;};
 const cs=[...t.matchAll(/centroid=([\d.]+)/g)].map(x=>+x[1]).filter(isFinite);
 const rs=[...t.matchAll(/rolloff=([\d.]+)/g)].map(x=>+x[1]).filter(isFinite);
 /* ⭐**平坦さ(flatness)**=1に近いほど雑音・0に近いほど「音程のある音」。
    ⚠掟①が言う「高い笛」は**重心が高い かつ 平坦さが低い**もの。
      重心だけで見ると、雑音系(nzHit)は元から重心が高いので**半分が誤爆する**(実際にそうなった)。 */
 const fl=[...t.matchAll(/flatness=([\d.]+)/g)].map(x=>+x[1]).filter(isFinite);
 const avg=a=>a.length?a.reduce((x,y)=>x+y,0)/a.length:null;
 return {
  /* ⚠**長さは Duration の行から採る**(`time=` は進捗表示で -nostats だと出ない) */
  sec:(()=>{const m=/Duration:\s*(\d+):(\d+):([\d.]+)/.exec(t);
   return m?(+m[1]*3600+ +m[2]*60+ +m[3]):null;})(),
  peak:num(/Peak level dB:\s*(-?[\d.]+)/),
  rms:num(/RMS level dB:\s*(-?[\d.]+)/),
  centroid:avg(cs),rolloff:avg(rs),flat:avg(fl),
 };
}

if(CMD==='check'){
 console.log('🔊 音の物差し  '+list.length+'本');
 console.log('⚠**合否は出さない**=見るのは順位と外れ値。掟は [[NOTES_音]]:');
 console.log('   ①1000Hz超の笛は使わない ②200Hz以下は実機でほぼ鳴らない ③尾は短く ④長い音は大きく感じる');
 console.log('─'.repeat(72));
 const rows=[];
 for(const it of list){const p=probe(it.f);rows.push(Object.assign({},it,p));}
 rows.sort((a,b)=>(b.centroid||0)-(a.centroid||0));
 const pad=(s,n)=>{s=''+s;while(s.length<n)s+=' ';return s;};
 const padL=(s,n)=>{s=''+s;while(s.length<n)s=' '+s;return s;};
 console.log('  '+pad('名前',16)+padL('秒',7)+padL('重心Hz',9)+padL('平坦さ',8)+padL('RMSdB',8)+padL('山dB',8)+padL('音量',6));
 for(const r of rows)console.log('  '+pad(r.name,16)
  +padL(r.sec==null?'?':r.sec.toFixed(2),7)
  +padL(r.centroid==null?'?':Math.round(r.centroid),9)
  +padL(r.flat==null?'?':r.flat.toFixed(3),8)
  +padL(r.rms==null?'?':r.rms.toFixed(1),8)
  +padL(r.peak==null?'?':r.peak.toFixed(1),8)
  +padL(r.gain,6));
 console.log('─'.repeat(72));
 /* ⭐**外れ値だけ言う**(落としはしない) */
 /* ⚠**重心だけで見ない**=雑音系(nzHit)は元から高い。**音程のある高い音**だけを拾う */
 const hi=rows.filter(r=>r.centroid>2600&&r.flat!=null&&r.flat<0.12);
 const lo=rows.filter(r=>r.centroid!=null&&r.centroid<300);
 const long=rows.filter(r=>r.sec>1.2);
 const clip=rows.filter(r=>r.peak!=null&&r.peak>-0.2);
 if(hi.length)console.log('⚠ 高くて音程のある音(重心2600Hz超・平坦さ0.12未満) '+hi.length+'本: '+hi.map(r=>r.name).join(' ')
  +'\n   → 掟①「高い笛は世界に合わない」に触れていないか(⚠ノイズ系は元から高いので誤爆する)');
 if(lo.length)console.log('⚠ 重心が低い(300Hz未満) '+lo.length+'本: '+lo.map(r=>r.name).join(' ')
  +'\n   → 掟②「スマホは200Hz以下をほぼ鳴らせない」=実機で聞こえているか確かめる');
 if(long.length)console.log('⚠ 長い(1.2秒超) '+long.length+'本: '+long.map(r=>r.name).join(' ')
  +'\n   → 掟④「長い音はRMSが同じでも大きく感じる」=音量を下げる余地');
 if(clip.length)console.log('🔴 山が0dBに張り付き(割れている疑い) '+clip.length+'本: '+clip.map(r=>r.name).join(' '));
 process.exit(0);
}

if(CMD==='sheet'){
 const out=path.resolve(OUT||'snd_sheet.png');
 /* 1本ずつ「スペクトログラム(凡例つき)+波形」を縦に重ねた小さい絵を作り、最後に格子へ並べる */
 /* ⚠⚠**スペクトログラムと波形を1回の呼び出しで縦に積めない**=どちらも「最後に1枚だけ」出す
    フィルタなので、`vstack` が相手を待てずに落ちる(実際に "Could not open encoder before EOF")。
    ⭐**2回に分けて作ってから、画像として重ねる**のが確実。 */
 const tiles=[];
 for(const it of list){
  const a=path.join(TMP,it.name+'_a.png'),b=path.join(TMP,it.name+'_b.png'),c=path.join(TMP,it.name+'_c.png');
  cp.spawnSync(FF,['-y','-hide_banner','-nostats','-i',it.f,
   '-lavfi','showspectrumpic=s=360x150:legend=1','-frames:v','1',a],{encoding:'utf8'});
  cp.spawnSync(FF,['-y','-hide_banner','-nostats','-i',it.f,
   '-lavfi','showwavespic=s=360x70:colors=0xd8c79b','-frames:v','1',b],{encoding:'utf8'});
  if(!fs.existsSync(a))continue;
  const nm=it.name.replace(/[^A-Za-z0-9_]/g,'');
  if(fs.existsSync(b)){
   cp.spawnSync(FF,['-y','-hide_banner','-nostats','-i',a,'-i',b,
    '-filter_complex','[0:v][1:v]vstack=inputs=2,drawtext=text='+nm
     +':x=8:y=8:fontsize=18:fontcolor=white:box=1:boxcolor=black@0.65','-frames:v','1',c],{encoding:'utf8'});
  }
  tiles.push(fs.existsSync(c)?c:a);
 }
 if(!tiles.length){console.log('⚠ 1枚も作れなかった');process.exit(1);}
 /* ⚠**凡例(legend=1)は必須**=付けないと縦軸の絶対値が読めず、絵として無意味になる */
 const cols=4,rows=Math.ceil(tiles.length/cols);
 const args=['-y','-hide_banner','-nostats'];
 for(const t of tiles)args.push('-i',t);
 args.push('-filter_complex','tile='+cols+'x'+rows+':padding=4:color=0x141210',out);
 /* tile は1本の入力を並べるフィルタなので、複数入力は一度 concat する必要がある=
    ⚠簡単のため ffmpeg の image2 入力(連番)に落とす */
 const seq=path.join(TMP,'t%03d.png');
 tiles.forEach((t,i)=>fs.copyFileSync(t,path.join(TMP,'t'+String(i).padStart(3,'0')+'.png')));
 const r2=cp.spawnSync(FF,['-y','-hide_banner','-nostats','-i',seq,
  '-vf','tile='+cols+'x'+rows+':padding=4:color=0x141210','-frames:v','1',out],{encoding:'utf8'});
 if(!fs.existsSync(out)){console.log('⚠ 束ねられなかった:\n'+(r2.stderr||'').split('\n').slice(-6).join('\n'));process.exit(1);}
 console.log('🖼 → '+out+'  '+tiles.length+'本 / '+cols+'列(上=スペクトログラム 下=波形)');
 console.log('⚠**絵は「何が鳴っているか」しか教えない**=良し悪しは人が聴いて決める');
 process.exit(0);
}
console.log('知らない命令: '+CMD+'  (check / sheet / stock)');
