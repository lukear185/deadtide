/* 効果音づくりの道具(2026-07-26 第57弾)
   素材: Sonniss #GameAudioGDC Bundle(ROYALTY-FREE・商用利用可・クレジット不要)
   ⚠素材の生WAVはリポジトリに入れない(1本40MBある)。ここでは「切って・縮めて・埋め込む」だけをやる。

   使い方(Node.js):
     node tool_sfx.js scan  [素材フォルダ]   … 素材の中の「音のかたまり」を一覧にする(テイク番号を決めるため)
     node tool_sfx.js build [素材フォルダ]   … レシピどおりに切り出して sfx_out/*.mp3 を作る
     node tool_sfx.js embed                  … sfx_out/*.mp3 を index.html へ base64 で埋め込む

   ⚠ffmpeg が要る(winget install "FFmpeg (Essentials Build)")。
     PATHに無ければ winget の既定の置き場を自動で探す。 */
const fs=require('fs'),path=require('path'),cp=require('child_process');

/* ---- ffmpeg を見つける ---- */
function findFF(){
 const cands=[process.env.FFMPEG,'ffmpeg',
  path.join(process.env.LOCALAPPDATA||'','Microsoft','WinGet','Links','ffmpeg.exe'),
  path.join(process.env.LOCALAPPDATA||'','Microsoft','WinGet','Packages',
   'Gyan.FFmpeg.Essentials_Microsoft.Winget.Source_8wekyb3d8bbwe','ffmpeg-8.1.1-essentials_build','bin','ffmpeg.exe')];
 for(const c of cands){
  if(!c)continue;
  try{cp.execFileSync(c,['-hide_banner','-version'],{stdio:'ignore'});return c;}catch(e){}}
 /* winget のフォルダ名にはバージョンが入るので、総当たりで探す */
 try{
  const base=path.join(process.env.LOCALAPPDATA||'','Microsoft','WinGet','Packages');
  for(const d of fs.readdirSync(base)){
   if(!/ffmpeg/i.test(d))continue;
   const st=[path.join(base,d)];
   while(st.length){
    const cur=st.pop();
    for(const e of fs.readdirSync(cur,{withFileTypes:true})){
     const p=path.join(cur,e.name);
     if(e.isDirectory())st.push(p);
     else if(e.name.toLowerCase()==='ffmpeg.exe')return p;}}}
 }catch(e){}
 return null;}
const FF=findFF();
if(!FF){console.log('FAIL: ffmpeg が見つからない。winget install "FFmpeg (Essentials Build)" を実行するか、環境変数 FFMPEG にパスを入れてください');process.exit(1);}
const run=a=>{try{return cp.execFileSync(FF,a,{encoding:'utf8',stdio:['ignore','pipe','pipe']});}
 catch(e){return (e.stdout||'')+(e.stderr||'');}};
const runE=a=>{try{const r=cp.spawnSync(FF,a,{encoding:'utf8'});return (r.stdout||'')+(r.stderr||'');}catch(e){return '';}};

/* ---- レシピ ----
   k=ゲーム側のキー / f=素材ファイル名の一部 / t=テイク番号(scanで出る番号・0始まり)
   d=切り出す最大秒 / g=音量の足し引き(dB) / r=再生ピッチ(1より小さいと低く長くなる)
   ⚠短いUI素材は「かたまり」が1つしかないので t:0 のまま */
const REC=[
 /* --- 銃と砲 -------------------------------------------------------------
    ⚠**銃声の素材はバンドルに無い**。なので**重ねて作る**=
      ①鋭い立ち上がり(鞭のスナップ/クラッカーの破裂) + ②胴鳴り(花火の至近爆発)。
      実際のゲーム音響でも銃声はこうやって組み立てる。`mix:[…]` が層。dl=遅らせるミリ秒 */
 {k:'shot',    d:.30, g:-1, mix:[{f:'WHIP Snap Crack',t:0,d:.10,g:-5,r:1.30},
                           {f:'powerful explosions_multiples',t:1,d:.30,g:-3,r:1.45,dl:8}]},
 {k:'gat',     d:.16, g:-6, mix:[{f:'WHIP Snap Crack',t:0,d:.07,g:-7,r:1.75},
                           {f:'powerful explosions_multiples',t:3,d:.16,g:-8,r:2.10,dl:5}]},
 {k:'shotgun', d:.44, g:-2, mix:[{f:'CrackerPull_WithBang',t:0,d:.13,g:-5,r:.95},
                           {f:'powerful explosions_multiples',t:1,d:.44,g:-2,r:1.00,dl:10}]},
 {k:'snipe',   d:.58, g:-1, mix:[{f:'WHIP Snap Crack',t:0,d:.12,g:-4,r:.85},
                           {f:'powerful explosions_multiples',t:3,d:.58,g:-1,r:.72,dl:12}]},
 {k:'cannon',  d:.95, g:-1, mix:[{f:'Booms_Vol2_011',t:0,d:.95,g:-2,r:.85},
                           {f:'powerful explosions_multiples',t:1,d:.75,g:-5,r:.60,dl:6}]},
 {k:'mortar',  d:.38, g:-4, mix:[{f:'Metal Hit Thud Thump Low Ring',t:0,d:.28,g:-5,r:1.0},
                           {f:'powerful explosions_multiples',t:1,d:.38,g:-7,r:.80,dl:10}]},
 /* --- タワーの種類ごとの音 --- */
 {k:'laser',   f:'UIGlitch_User interface_Glitch_High',t:0, d:.28, g:-6, r:1.25},
 {k:'rail',    d:.42, g:-3, mix:[{f:'AEROJet_Blast Off Clean',t:0,d:.42,g:-5,r:1.55},
                           {f:'Impact Electric Tonal Deep',t:0,d:.42,g:-6,r:1.15,dl:4}]},
 {k:'plasma',  d:.42, g:-3, mix:[{f:'Water, Liquid Impact, Bubble, Sci Fi',t:0,d:.42,g:-4,r:.85},
                           {f:'Impact Electric Tonal Deep',t:0,d:.42,g:-8,r:.90,dl:6}]},
 {k:'sonic',   f:'Metal Bowed Screech Tonal',    t:0, d:.55, g:-8, r:1.0},
 {k:'acid',    f:'Water, Liquid Impact, Bubble, Sci Fi',t:0, d:.34, g:-8, r:1.35},
 {k:'flame',   f:'Whoosh Fire Deep Growl Monster',t:0, d:.50, g:-8, r:1.15},
 {k:'dronefx', f:'Tower Deploy Hitech Robot',    t:0, d:.28, g:-9, r:1.55},
 /* --- 汎用 --- */
 {k:'zap',     f:'Impact Electric Tonal Deep',   t:0, d:.32, g:-1, r:1.1},
 {k:'thunk',   f:'METAL SWING HIT',              t:0, d:.26, g:-3, r:1.0},
 {k:'boom',    f:'Booms_Vol2_011',               t:0, d:.85, g:-1, r:1.0},
 {k:'net',     f:'Whoosh Glass Crystal',         t:0, d:.36, g:-3, r:1.0},
 {k:'frost',   f:'Skill Freeze Whoosh Break',    t:0, d:.60, g:-2, r:1.0},
 /* --- 建設・経済・UI --- */
 {k:'build',   f:'Tower Deploy Hitech Robot',    t:0, d:.60, g:-2, r:1.0},
 {k:'sell',    f:'Interface Deny Low Fat Dark',  t:0, d:.40, g:-3, r:1.0},
 {k:'coin',    f:'Ting Coins',                   t:0, d:.40, g:-4, r:1.0},
 {k:'buy',     f:'Interface Accept Glassy Snap', t:0, d:.36, g:-3, r:1.0},
 {k:'warn',    f:'Alarms_Vol2_QuarterNotes',     t:0, d:.55, g:-3, r:1.0},
 {k:'dep',     f:'Action Deploy Units Sword',    t:0, d:.50, g:-3, r:1.0},
 {k:'heal',    f:'Magic Light Spell Enchantment',t:0, d:.60, g:-3, r:1.0},
 /* --- 波・拠点 --- */
 {k:'horn',    f:'Alarms_Vol2_WholeNotes',       t:0, d:1.2, g:-2, r:.9},
 {k:'leak',    f:'Impact Hit Rapid Chord',       t:0, d:.55, g:-2, r:1.0},
 {k:'push',    f:'Impact Water Deep Submerge',   t:0, d:.60, g:-2, r:1.0},
 /* --- ゾンビの声 ----------------------------------------------------------
    ⚠**同じ呻きが繰り返されると怖くない**。通常の呻きは3種そろえて毎回くじを引く。
    さらにステージで声が変わる: ①廃線=人型 / ②沈んだ港=水棲 / 🌑ナイトメア=獣・蟲。
    怖さの主役は `growl`(ボスの唸り)=**アステカの死の笛**。実在の「一番怖い楽器」 */
 {k:'growl',   f:'Aztec Death Whistle Distortion',t:0,d:1.1, g:-2, r:.85},
 {k:'growl2',  f:'Werewolf Growl Menacing',      t:0, d:.95, g:-2, r:.85},
 {k:'moan',    f:'Violent Humanoid Creature Exhale',t:0,d:.55,g:-5, r:.9},
 {k:'moan2',   f:'Male Screeching Breath Inhale',t:0, d:.70, g:-6, r:.88},
 {k:'moan3',   f:'Ethereal Entity Grim Pain',    t:0, d:.85, g:-6, r:.92},
 {k:'moanW',   f:'Aquatic Creature Gurgling',    t:0, d:.80, g:-6, r:.9},
 {k:'moanN',   f:'Insectoid Creature Tremble',   t:0, d:.75, g:-6, r:.9},
 {k:'moanBig', f:'Sea Beast Creature Pain',      t:0, d:1.0, g:-3, r:.8},
 {k:'moanBig2',f:'T Rex',                        t:0, d:1.2, g:-3, r:.85},
 {k:'die',     f:'Male Flutter Death Vocal',     t:0, d:.85, g:-5, r:.9},
 {k:'bite',    f:'Hit Blood Spill Splat Wood',   t:0, d:.26, g:-4, r:1.0},
 {k:'bite2',   f:'Orc Male Attack Long Heavy',   t:0, d:.45, g:-6, r:1.0},
 {k:'splat',   f:'Gore Designed Transient',      t:0, d:.36, g:-5, r:1.0},
 {k:'scratch', f:'Cladding_NailScratch',         t:0, d:.60, g:-7, r:1.0},
 /* --- 節目 --- */
 /* ⚠エリート出現は「怖い」で正解。ささやき声の悲鳴を歪ませた素材を使う */
 {k:'elite',    f:'Jumpscare Vocal Aggressive',    t:0, d:.95, g:-3, r:1.0},
 {k:'eliteKill',f:'Impact Cut Sweep',              t:0, d:.60, g:-2, r:1.0},
 {k:'bossKill', f:'Booms_Vol2_214',                t:0, d:1.3, g:-1, r:.95},
 {k:'clearJ',   f:'Power Up Bright Positive',      t:0, d:.85, g:-3, r:1.0},
 {k:'win',      f:'Game Entry Happy Short',        t:0, d:1.3, g:-3, r:1.0},
 {k:'lose',     f:'Transition Braam Slow Dark',    t:0, d:1.5, g:-2, r:1.0}
];

const SRC=process.argv[3]||path.join(__dirname,'sfx_src');
const OUT=path.join(__dirname,'sfx_out');
function findSrc(frag){
 const fs2=fs.readdirSync(SRC).filter(f=>/\.wav$/i.test(f));
 const hit=fs2.filter(f=>f.toLowerCase().indexOf(frag.toLowerCase())>=0);
 return hit.length?path.join(SRC,hit[0]):null;}
/* 無音で区切って「音のかたまり」を出す。⚠40MBの多テイク素材から1発を選ぶための要 */
const segCache={};
function segs(file){
 if(segCache[file])return segCache[file];
 const o=runE(['-hide_banner','-i',file,'-af','silencedetect=noise=-45dB:d=0.12','-f','null','-']);
 const dur=(/Duration: (\d+):(\d+):([\d.]+)/.exec(o)||[]).slice(1);
 const total=dur.length?(+dur[0]*3600+ +dur[1]*60+ +dur[2]):0;
 const ends=[...o.matchAll(/silence_end: ([\d.]+)/g)].map(m=>+m[1]);
 const starts=[...o.matchAll(/silence_start: ([\d.]+)/g)].map(m=>+m[1]);
 const out=[];
 let cur=0;
 if(starts.length===0){out.push([0,total]);}
 else{
  for(let i=0;i<starts.length;i++){
   const s=cur,e=starts[i];
   if(e-s>.05)out.push([s,e-s]);
   cur=ends[i]!==undefined?ends[i]:e;}
  if(total-cur>.05)out.push([cur,total-cur]);}
 segCache[file]=out;return out;}

if(process.argv[2]==='scan'){
 for(const R of REC){
  const f=findSrc(R.f);
  if(!f){console.log('× 素材なし: '+R.k+'  ("'+R.f+'")');continue;}
  const s=segs(f);
  console.log('['+R.k+'] '+path.basename(f)+'  かたまり'+s.length+'個');
  s.slice(0,10).forEach((q,i)=>console.log('   '+(i===R.t?'→':'  ')+i+': 開始'+q[0].toFixed(2)+'s 長さ'+q[1].toFixed(2)+'s'));
 }
 process.exit(0);
}
if(process.argv[2]==='build'){
 if(!fs.existsSync(OUT))fs.mkdirSync(OUT);
 const TMP=path.join(require('os').tmpdir(),'dt_sfx_tmp.wav');
 let total=0,ng=0,warn=0;
 /* ⭐**2回に分けて作る**。
    ① まず素の音を一時WAVへ書き出す(層を重ねるならここで混ぜる)
    ② できた音のピークを測り、そのぶんだけ持ち上げてMP3へ
    ⚠これをやらないと、録り音の小さい素材を重ねた時に全体が-43dBまで沈んで**ほぼ無音**になる
      (ライフルの銃声で実際に沈んだ)。R.g は「最終的なピークを-1dBから何dB下げるか」 */
 for(const R of REC){
  const dst=path.join(OUT,R.k+'.mp3');
  let dur=R.d,ok=false;
  try{fs.unlinkSync(TMP);}catch(e){}
  if(R.mix){
   /* ---- 層を重ねて作る(銃声など。バンドルに銃声の素材が無いため) ---- */
   const args=[],fc=[];let n=0,miss=0;
   for(const L of R.mix){
    const lf=findSrc(L.f);
    if(!lf){console.log('× 素材なし: '+R.k+' の層 "'+L.f+'"');miss=1;break;}
    const ls=segs(lf),lq=ls[Math.min(L.t||0,ls.length-1)]||[0,L.d];
    const lst=Math.max(0,lq[0]-.005),ld=Math.min(L.d,lq[1]+.02);
    /* ⚠層ごとに**先にピークを揃えてから** L.g で混ぜ具合を決める(素材の録り音量がバラバラなため) */
    const lp=runE(['-hide_banner','-ss',String(lst),'-t',String(ld),'-i',lf,'-af','volumedetect','-f','null','-']);
    const lmx=+((/max_volume: (-?[\d.]+) dB/.exec(lp)||[0,0])[1]);
    args.push('-ss',String(lst),'-t',String(ld),'-i',lf);
    /* ⚠asetrate はピッチと速さを一緒に変える(テープの早回しと同じ)=銃の「軽い/重い」を作り分けられる */
    fc.push('['+n+':a]volume='+((-1-lmx)+(L.g||0)).toFixed(2)+'dB,asetrate=44100*'+(L.r||1)+',aresample=44100'
     +(L.dl?(',adelay='+L.dl+'|'+L.dl):'')+'[a'+n+']');
    n++;}
   if(miss){ng++;continue;}
   fc.push(Array.from({length:n},(_,i)=>'[a'+i+']').join('')
    +'amix=inputs='+n+':duration=longest:normalize=0,alimiter=limit=0.98[out]');
   runE(['-y','-hide_banner'].concat(args,['-filter_complex',fc.join(';'),'-map','[out]',
    '-vn','-sn','-dn','-map_metadata','-1','-ac','1','-ar','22050',TMP]));
   ok=fs.existsSync(TMP);
  }else{
   const f=findSrc(R.f);
   if(!f){console.log('× 素材なし: '+R.k);ng++;continue;}
   const s=segs(f),q=s[Math.min(R.t,s.length-1)]||[0,R.d];
   const st=Math.max(0,q[0]-.01);
   dur=Math.min(R.d,q[1]+.02);
   /* ⚠`-vn -sn -dn -map_metadata -1` は**必ず -i の後ろ**に置く(前だと入力側の指定と見なされて無視される)。
      付け忘れると素材WAVに埋まったジャケット画像が動画として混ざり、1本30KBに膨らむ(実際に膨らんだ) */
   runE(['-y','-hide_banner','-ss',String(st),'-t',String(dur),'-i',f,
    '-vn','-sn','-dn','-map_metadata','-1','-ac','1','-ar','22050',TMP]);
   ok=fs.existsSync(TMP);}
  if(!ok){console.log('× 書き出し失敗: '+R.k);ng++;continue;}
  /* ---- ② ピークを測って、狙った音量でMP3へ ---- */
  const pr=runE(['-hide_banner','-i',TMP,'-af','volumedetect','-f','null','-']);
  const mx=+((/max_volume: (-?[\d.]+) dB/.exec(pr)||[0,0])[1]);
  const gain=(-1-mx)+(R.g||0);
  const fo=Math.max(.03,Math.min(.14,dur*.22));
  const af='volume='+gain.toFixed(2)+'dB,atrim=0:'+dur.toFixed(3)
   +',afade=t=in:st=0:d=0.004,afade=t=out:st='+(dur-fo).toFixed(3)+':d='+fo.toFixed(3)
   +',alimiter=limit=0.97';
  /* ⚠形式は**MP3**。ogg/vorbis も ogg/opus も Safari(iPhone) で鳴らない可能性があるので使わない */
  runE(['-y','-hide_banner','-i',TMP,'-vn','-sn','-dn','-map_metadata','-1','-ac','1','-ar','22050',
   '-af',af,'-c:a','libmp3lame','-q:a','5',dst]);
  if(!fs.existsSync(dst)){console.log('× 変換失敗: '+R.k);ng++;continue;}
  /* 仕上がりのピークを確認(小さすぎたら知らせる) */
  const pr2=runE(['-hide_banner','-i',dst,'-af','volumedetect','-f','null','-']);
  const mx2=+((/max_volume: (-?[\d.]+) dB/.exec(pr2)||[0,0])[1]);
  const kb=fs.statSync(dst).size/1024;total+=kb;
  const low=mx2<-14;if(low)warn++;
  console.log('  '+R.k.padEnd(9)+dur.toFixed(2)+'s '+kb.toFixed(1).padStart(5)+'KB  ピーク'+mx2.toFixed(1)+'dB'
   +(low?' ⚠小さい':'')+'  ← '+(R.mix?(R.mix.length+'層を合成'):path.basename(findSrc(R.f)).slice(0,40)));
 }
 try{fs.unlinkSync(TMP);}catch(e){}
 console.log('---- 合計 '+total.toFixed(1)+'KB / '+REC.length+'種'
  +(ng?('  ⚠失敗'+ng):'')+(warn?('  ⚠音量が小さい'+warn+'種'):'')+' ----');
 process.exit(ng?1:0);
}
if(process.argv[2]==='embed'){
 const H=path.join(__dirname,'index.html');
 let s=fs.readFileSync(H,'utf8');
 const A='/* <<SFXB>> */',B='/* <</SFXB>> */';
 const ia=s.indexOf(A),ib=s.indexOf(B);
 if(ia<0||ib<0){console.log('FAIL: index.html に '+A+' 〜 '+B+' の目印が無い');process.exit(1);}
 const rows=[];let total=0;
 for(const R of REC){
  const p=path.join(OUT,R.k+'.mp3');
  if(!fs.existsSync(p)){console.log('  (無し) '+R.k);continue;}
  const b=fs.readFileSync(p).toString('base64');
  total+=b.length;
  rows.push(" "+R.k+":['"+b+"',"+(R.r||1)+"]");
 }
 const body=A+"\r\n/* 効果音(Sonniss #GameAudioGDC Bundle・ROYALTY-FREE・商用可・クレジット不要)。\r\n"
  +"   ⚠この塊は tool_sfx.js が書き換える。手で編集しない。[base64, 再生ピッチ] */\r\n"
  +"const SFXB={\r\n"+rows.join(",\r\n")+"};\r\n"+B;
 s=s.slice(0,ia)+body+s.slice(ib+B.length);
 fs.writeFileSync(H,s);
 console.log('埋め込み '+rows.length+'種 / base64 '+(total/1024).toFixed(0)+'KB');
 process.exit(0);
}
console.log('使い方: node tool_sfx.js scan|build|embed [素材フォルダ]');
