/* 効果音づくりの道具(2026-07-26 第57弾)
   素材: Sonniss #GameAudioGDC Bundle(ROYALTY-FREE・商用利用可・クレジット不要)
   ⚠素材の生WAVはリポジトリに入れない(1本40MBある)。ここでは「切って・縮めて・埋め込む」だけをやる。

   使い方(Node.js):
     node tool_sfx.js scan  [素材フォルダ]        … 素材の中の「音のかたまり」を一覧にする(テイク番号を決めるため)
     node tool_sfx.js build [素材フォルダ] [キー]  … レシピどおりに切り出して sfx_out/*.mp3 を作る
     node tool_sfx.js embed                       … sfx_out/*.mp3 を index.html へ base64 で埋め込む

   ⚠**素材の生WAVは作ったあと消してある**(1本40MBあるため)。作り直す時は
     Downloadsの5つのzipから**必要なファイルだけ**取り出して sfx_src へ置く。
     その時は `build` の第2引数に**直したいキーだけ**をカンマ区切りで渡すこと
     (素材が揃っていない他のキーを巻き込まずに済む。既存の sfx_out はそのまま残るので embed で全部入る)。
       例) node tool_sfx.js build sfx_src cryo,fort,plasma

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
 /* ⚠ショットガンだけは**重ねずに1本のまま**。第59弾で合成に変えたらユーザーから
    「前のほうがよかった」と指摘が出たので第57弾の音に戻した(2026-07-26)。 */
 {k:'shotgun', f:'Explosion Small Blast Enemy',  t:0, d:.30, g:-1, r:.80},
 {k:'snipe',   d:.58, g:-1, mix:[{f:'WHIP Snap Crack',t:0,d:.12,g:-4,r:.85},
                           {f:'powerful explosions_multiples',t:3,d:.58,g:-1,r:.72,dl:12}]},
 {k:'cannon',  d:.95, g:-1, mix:[{f:'Booms_Vol2_011',t:0,d:.95,g:-2,r:.85},
                           {f:'powerful explosions_multiples',t:1,d:.75,g:-5,r:.60,dl:6}]},
 {k:'mortar',  d:.38, g:-4, mix:[{f:'Metal Hit Thud Thump Low Ring',t:0,d:.28,g:-5,r:1.0},
                           {f:'powerful explosions_multiples',t:1,d:.38,g:-7,r:.80,dl:10}]},
 /* ⭐要塞砲は重砲台と同じ `cannon` を鳴らしていた=最終兵器なのに特別感が無かった(2026-07-26ユーザー指摘)。
    **閂を落とす金属音 → 巨砲の一発 → 破片が飛び散る尾** の3段にして、他のどの砲とも違う音にする */
 {k:'fort',    d:1.25,g:-1, mix:[{f:'METLImpt_Metal Old File Impact',t:0,d:.20,g:-9,r:.75},
                           {f:'EffectiveTrailer_Booms_Vol2_214',t:0,d:1.25,g:-1,r:.82,dl:70},
                           {f:'Woosh Debris',t:0,d:1.0,g:-10,r:.90,dl:150}]},
 /* ⭐擲弾砲台も迫撃砲と同じ音だった。小回りの利く砲なので**軽く短い「ポンッ」**に分ける */
 {k:'gren',    d:.30, g:-4, mix:[{f:'Metal Hit Thud Thump Low Ring',t:0,d:.22,g:-4,r:1.45},
                           {f:'Explosion Small Blast Enemy',t:0,d:.30,g:-11,r:1.30,dl:8}]},
 /* --- タワーの種類ごとの音 --- */
 {k:'laser',   f:'UIGlitch_User interface_Glitch_High',t:0, d:.28, g:-6, r:1.25},
 /* ⭐レールガンは「きゅいーん」と充填してから撃つ(2026-07-26ユーザー指示)。
    音を**充填(railChg)**と**発射(rail)**の2本に分け、撃つ RAIL_CHG 秒前から充填音を鳴らす。
    ⚠充填音は上がっていく系(ArcPowerUp)でないと「きゅいーん」にならない。
      発射は電気の放電を主役にして、ジェットの抜けと低い胴鳴りを足す=近未来の超電磁砲 */
 {k:'railChg', d:.60, g:-6, mix:[{f:'ELECArc_ArcPowerUpDesign04',t:0,d:.60,g:-2,r:1.15},
                           {f:'Shimmer Loop Small Bell Metal Taps',t:0,d:.60,g:-15,r:1.60,dl:60}]},
 {k:'rail',    d:.95, g:-1, mix:[{f:'ELECArc_ArcDesign15',t:0,d:.95,g:-2,r:.88},
                           {f:'AEROJet_Blast Off Clean',t:0,d:.80,g:-7,r:1.20,dl:15},
                           {f:'EffectiveTrailer_Booms_Vol2_214',t:0,d:.95,g:-7,r:.90,dl:30}]},
 /* ⚠プラズマ砲は「水のはじけ」で作っていたので、迫撃砲との違いが出ていなかった(2026-07-26ユーザー指摘)。
    **電気の充填 → 放電 → 低音のバースト** に組み直して、エネルギー兵器だと音だけで分かるようにする */
 {k:'plasma',  d:.70, g:-2, mix:[{f:'ELECArc_ArcPowerUpDesign04',t:0,d:.30,g:-8,r:1.25},
                           {f:'ELECArc_ArcDesign15',t:0,d:.55,g:-2,r:.85,dl:70},
                           {f:'Collect Scifi Futuristic Electronic Bass Burst',t:0,d:.70,g:-6,r:.80,dl:95}]},
 {k:'sonic',   f:'Metal Bowed Screech Tonal',    t:0, d:.55, g:-8, r:1.0},
 {k:'acid',    f:'Water, Liquid Impact, Bubble, Sci Fi',t:0, d:.34, g:-8, r:1.35},
 {k:'flame',   f:'Whoosh Fire Deep Growl Monster',t:0, d:.50, g:-8, r:1.15},
 /* ⚠ドローン基地は「建設」と同じ素材を早回ししただけだった。
    **回転翼のブーン + サーボの立ち上がり**で、機体が飛び出す音にする */
 {k:'dronefx', d:.46, g:-6, mix:[{f:'ELECBuzz_Buzz27',t:0,d:.46,g:-4,r:1.85},
                           {f:'Tower Deploy Hitech Robot',t:0,d:.30,g:-9,r:1.70,dl:20}]},
 /* --- 汎用 --- */
 {k:'zap',     f:'Impact Electric Tonal Deep',   t:0, d:.32, g:-1, r:1.1},
 /* ⚠重テスラは「ゆっくり伝わって跳ねるほど重くなる」タワーなので、テスラコイルと同じ音では役割が伝わらない。
    電撃を低くしたものに**低い胴鳴り(トレーラーのブーム)と金属の低音**を重ねて重量感を出す */
 /* ⚠第62弾で低音を足したが、まだ**軽い・電気感が薄い**とユーザー指摘(2026-07-26)。**4層**に組み直す:
    ①低く落とした放電(主役) ②「ぶぅぅん」という高電圧のハム(Buzzを大きく下げて唸らせる)
    ③コイルのハム(実物の電気ハム) ④トレーラーの低い胴鳴り。長さも0.62→0.90秒に伸ばして重さを出す。
    ⚠テスラコイル(`zap`)は軽いままにしておくこと=役割の違いが音で分かるのが狙い */
 /* ⚠🔊(190)**音が割れていた**(🔊音の物差しが検出=山が0dBに張り付き)。
    ⚠⚠**原因は下のEQで200Hzを+9dB持ち上げているのに、全体の音量が -1dB のままだった**こと。
    ⭐**EQで持ち上げたら、その分だけ全体を下げる**=でないと必ず頭が潰れる。 */
 {k:'zap2',    d:.90, g:-6,
  /* ⚠「重い」の正体は150〜300Hz。ここを持ち上げ、スマホで鳴らない60Hz以下は逆に削って場所を空ける。
     2.6kHzを少し上げると放電の“バチッ”が立って電気感が出る */
  af:'highpass=f=58:p=2,equalizer=f=200:t=q:w=0.9:g=9,equalizer=f=130:t=q:w=1.0:g=4,'
    +'equalizer=f=2600:t=q:w=1.6:g=3,treble=g=-6:f=4500',
  mix:[{f:'ELECArc_ArcDesign15',t:0,d:.90,g:-4,r:.62},
       {f:'ELECBuzz_Buzz27',t:0,d:.90,g:-1,r:.52},
       {f:'Electricity Hum, Lightbulb',t:0,d:.90,g:-8,r:.70,dl:25},
       {f:'EffectiveTrailer_Booms_Vol2_214',t:0,d:.90,g:-3,r:1.0,dl:15}]},
 {k:'thunk',   f:'METAL SWING HIT',              t:0, d:.26, g:-3, r:1.0},
 /* ⭐⭐🚌**轢いた音**(2026-08-02(26)ユーザー「轢いた音というかどっと音にしか聞こえない」)。
    ⚠⚠**鉄の衝撃を主役にすると必ず「ドッ」になる**=それは「ぶつかった音」であって「轢いた音」ではない。
    ⭐**轢いた音の正体は ①骨が砕ける ②肉が潰れる**の2つ。鉄は隠し味にとどめる。
    ⭐**骨=氷を割る音**(音づくりの定石)。**潰れ=クランチ系を落として濁らせる**。
    ⚠**候補を並べて ?sfx=1 で選んでもらう**(音は言葉で詰めても収束しない)。 */
 /* 1体ずつ(⚠0.075秒に1回まで鳴る=**短く薄く**。長いと重なって濁る) */
 {k:'crush',   d:.13, g:-5, r:1.0,
  af:'lowpass=f=2600,equalizer=f=260:t=q:w=1.0:g=5',
  mix:[{f:'ice, crack, ice block snapping',t:0,d:.13,g:-3,r:.78},
       {f:'Explosion Small Blast Enemy Death Crunchy',t:0,d:.11,g:-10,r:1.35,dl:6}]},
 {k:'crush2',  d:.14, g:-5, r:1.0, af:'lowpass=f=3000',
  mix:[{f:'Whoosh Glass Crystal Fragments',t:0,d:.14,g:-4,r:.62},
       {f:'ice, crack, ice block snapping',t:0,d:.12,g:-8,r:.90,dl:5}]},
 {k:'crush3',  d:.12, g:-5, r:1.0, af:'lowpass=f=2200,equalizer=f=200:t=q:w=1.0:g=6',
  mix:[{f:'Explosion Small Blast Enemy Death Crunchy',t:0,d:.12,g:-3,r:.72}]},
 /* ⭐**採用案(③)に「車体に当たる芯」を1枚だけ足したもの**(2026-08-02(30)ユーザー
    「ゾンビに当たるときになりそうな音」)。⚠鉄は**-17dB**=聞こえないくらいでよい。
    ⚠**主役は湿った潰れのまま**(鉄を上げると「どっと音」に逆戻りする)。 */
 {k:'crush4',  d:.14, g:-5, r:1.0, af:'lowpass=f=2400,equalizer=f=190:t=q:w=1.0:g=6',
  mix:[{f:'Explosion Small Blast Enemy Death Crunchy',t:0,d:.14,g:-3,r:.72},
       {f:'Metal Hit Thud Thump Low Ring',t:0,d:.12,g:-17,r:1.25,dl:0}]},
 /* ⭐⭐⭐**本物のゴア素材に差し替え**(2026-08-02(33)ユーザー「商用OKで無料なら使ってもいいよ」)。
    ⚠⚠**それまでは氷で骨を、小さな爆発で肉を代用していた**=バンドル本体(5つのzip・347本)を
      開いていなかったのが原因。**そのものずばりの素材が入っていた**:
      `GORESplt_Gore Designed Heavy Impact Smash` / `WOODImpt_Hit Blood Spill Splat ... Squelch`
      / `FGHTImpt_4 x Punch, Body`(肉を殴る音)。
    ⭐**1体ずつ=血しぶきの潰れ+肉を殴る芯**。**まとめ=ゴアのスマッシュ**。
    ⚠**素材は sfx_src に取り出してある**(zipから必要な物だけ。生WAVはリポジトリに入れない)。 */
 {k:'crush5',  d:.17, g:-4, r:1.0, af:'lowpass=f=3200,equalizer=f=210:t=q:w=1.0:g=4',
  mix:[{f:'Blood Spill Splat Wood Impact',t:0,d:.17,g:-2,r:.95},
       {f:'4 x Punch, Body',t:0,d:.14,g:-8,r:1.10,dl:0}]},
 {k:'crush6',  d:.18, g:-4, r:1.0, af:'lowpass=f=2800,equalizer=f=180:t=q:w=1.0:g=5',
  mix:[{f:'Blood Spill Splat Wood Impact',t:0,d:.18,g:-3,r:1.18},
       {f:'4 x Punch, Body',t:2,d:.16,g:-7,r:.85,dl:4}]},
 /* まとめ轢き=**本物のゴア・スマッシュ**(1試合で数十回しか鳴らないので厚く鳴らしてよい) */
 {k:'smash4',  d:.55, g:-2, r:1.0, af:'highpass=f=45:p=2,lowpass=f=6000',
  mix:[{f:'Gore Designed Transient Heavy Impact Smash',t:0,d:.55,g:-1,r:.92},
       {f:'4 x Punch, Body',t:1,d:.30,g:-8,r:.80,dl:0}]},
 /* ⭐**本物のタイヤのきしみ**(急に曲がった時だけ1回)。⚠長い素材なので頭を0.85秒だけ切る */
 {k:'skid',    f:'Tire Skids on Gravel', t:0, d:.85, g:-6, r:1.0},
 /* ⭐🚌**まとめて轢いた瞬間の「ゴシャアッ」**(2026-08-02(25)ユーザー「もっと轢いてる感が欲しい。
    SEとかVFXってもういい感じのないかな?」)。⚠**1体ずつの音(`crush`)とは別**=
    こちらは1試合で数十回しか鳴らない見せ場用なので、素材を使って厚く鳴らしてよい。
    ①車体の鉄が食い込む鈍い衝撃 ②潰れる音(小さい爆発のクランチ) ③飛び散る破片。 */
 /* ⚠⚠**鉄(Metal Thud)を主役にしていたのが「どっと音」の正体**だった=**-13dBまで下げて隠し味に**し、
    骨(氷を割る)と潰れ(クランチ)を前に出した。 */
 {k:'smash',   d:.42, g:-3, r:1.0,
  af:'highpass=f=48:p=2,lowpass=f=5200,equalizer=f=220:t=q:w=1.0:g=5',
  mix:[{f:'ice, crack, ice block snapping',t:0,d:.42,g:-2,r:.55},
       {f:'Explosion Small Blast Enemy Death Crunchy',t:0,d:.36,g:-6,r:.82,dl:10},
       {f:'Metal Hit Thud Thump Low Ring',t:0,d:.30,g:-13,r:.90,dl:0}]},
 {k:'smash3',  d:.44, g:-3, r:1.0, af:'lowpass=f=4200',
  mix:[{f:'Whoosh Glass Crystal Fragments',t:0,d:.44,g:-3,r:.50},
       {f:'ice, crack, ice block snapping',t:0,d:.34,g:-6,r:.70,dl:8},
       {f:'Metal Hit Thud Thump Low Ring',t:0,d:.28,g:-15,r:.85,dl:4}]},
 /* ⭐候補②=金属寄り(タイヤレバーの打撃)。⚠?sfx=1 で聴き比べて選んでもらう用 */
 {k:'smash2',  d:.46, g:-3, r:1.0,
  af:'highpass=f=52:p=2,equalizer=f=210:t=q:w=1.0:g=5',
  mix:[{f:'Metal Old File Impact Tap Against Tire Iron',t:0,d:.46,g:-2,r:.72},
       {f:'Explosion Small Blast Enemy Death Crunchy',t:0,d:.40,g:-6,r:.92,dl:8}]},
 {k:'boom',    f:'Booms_Vol2_011',               t:0, d:.85, g:-1, r:1.0},
 {k:'net',     f:'Whoosh Glass Crystal',         t:0, d:.36, g:-3, r:1.0},
 {k:'frost',   f:'Skill Freeze Whoosh Break',    t:0, d:.60, g:-2, r:1.0},
 /* ⭐冷却塔は凍結爆弾(frost)と同じ音だった。**氷が張っていく「ひんやり感」**を専用に作る(2026-07-26ユーザー指摘)。
    地面が凍るパキパキ + 鈴の煌めき + 氷が締まる音。爆発系の音を1つも混ぜないのが肝 */
 {k:'cryo',    d:.72, g:-3, mix:[{f:'ice, surface cracking, fissure, fast, hard',t:0,d:.72,g:-2,r:.92},
                           {f:'Shimmer Loop Small Bell Metal Taps',t:0,d:.72,g:-10,r:1.35,dl:10},
                           {f:'ice, crack, ice block snapping',t:0,d:.45,g:-9,r:1.10,dl:55}]},
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
 {k:'lose',     f:'Transition Braam Slow Dark',    t:0, d:1.5, g:-2, r:1.0},

 /* ===== 🎯狙撃王ジョルジ(2026-08-03(73)) =====
    ⭐⭐**バンドルを漁って作り直した候補**(ユーザー「①②いいよ」)。
    ⚠それまでは**タワー用の合成音を重ねただけ**で、本物の素材は1本も使っていなかった。
    ⚠⚠**バンドルに銃声は1本も無い**(347本を名前で総当たりして確認)=
      「銃らしさ」は**至近の花火の破裂(頭)+雷鳴のクラップ(胴)**で作る。
    ⭐**機構音(コッキング)と薬莢は本物がある**=骨董の小金物(錠前・ブロートーチの蓋・巻尺)と
      バネ線のカチャつき。⚠ここが今回の一番の収穫。 */
 /* 🔩コッキング=「引く→戻す」の2拍。⚠1拍だと機構に聞こえない */
 {k:'geoCkA', d:.34, g:-4, af:'highpass=f=180,equalizer=f=2600:width_type=o:width=1.6:g=4',
   mix:[{f:'Tinkering Antique Lock',t:1,d:.16,g:-2,r:1.15},
        {f:'Tinkering Antique Lock',t:3,d:.20,g:-3,r:1.05,dl:95}]},
 {k:'geoCkB', d:.34, g:-4, af:'highpass=f=180',
   mix:[{f:'Opening Lid Of Antique Blowtorch',t:1,d:.16,g:-2,r:1.00},
        {f:'Tinkering Antique Lock',t:2,d:.22,g:-4,r:.92,dl:100}]},
 {k:'geoCkC', d:.40, g:-4, af:'highpass=f=180',
   mix:[{f:'Antique Measuring Tape',t:0,d:.24,g:-3,r:.90},
        {f:'Tinkering Antique Lock',t:0,d:.10,g:-5,r:1.20,dl:120}]},
 /* 🥉薬莢=**高い所だけ**残す(300Hz以下を切る)。⚠低音が残ると「落ちた物」が重く聞こえる */
 {k:'geoShA', d:.42, g:-8, af:'highpass=f=300',
   mix:[{f:'Spring Wire Impact Flick',t:0,d:.40,g:-2,r:1.25}]},
 {k:'geoShB', d:.40, g:-8, af:'highpass=f=300',
   mix:[{f:'METLImpt_Metal Old File Impact',t:0,d:.16,g:-2,r:1.50},
        {f:'Spring Wire Impact Flick',t:0,d:.32,g:-6,r:1.10,dl:70}]},
 /* 💥締めの一撃=①頭(破裂)②胴(雷鳴/爆発)③尾。⚠**150〜300Hzを持ち上げる**(スマホで「重い」を出す唯一の帯域) */
 {k:'geoBigF', d:1.30,g:-1, af:'equalizer=f=220:width_type=o:width=1.4:g=4',
   mix:[{f:'powerful explosions_multiples',t:1,d:.14,g:-1,r:.95},
        {f:'Texas Rain Thunder',t:3,d:.85,g:-3,r:.80,dl:22},
        {f:'Booms_Vol2_011',t:0,d:1.30,g:-9,r:.75,dl:150}]},
 {k:'geoBigG', d:1.10,g:-1, af:'equalizer=f=240:width_type=o:width=1.4:g=3',
   mix:[{f:'powerful explosions_multiples',t:0,d:.28,g:-1,r:1.05},
        {f:'powerful explosions_multiples',t:4,d:.55,g:-4,r:.72,dl:30},
        {f:'Texas Rain Thunder',t:8,d:1.10,g:-11,r:.70,dl:170}]},
 /* ===== ⚔近接英雄の攻撃音(2026-08-03(84)ユーザー「攻撃音全員微妙だわ」) =====
    ❌**微妙だった正体**=lslash / thrust / quake などは**素材が無く合成音のフォールバック**で鳴っていた。
    ⭐**バンドルに中世武器のパックがある**(Medieval Weapons Vol 2 / MWP2)=
      剣の金属斬り・槍と棒の木の当たり・重い武器の風切り→ドスッ。これを層にする。
    ⚠**連撃で毎秒何発も鳴る**ので**短く・薄く**(0.20〜0.30秒)。長いと重なって濁る。 */
 /* 🗡大鎌(終焉の騎士)=刃の風切り→金属の斬り当て */
 {k:'mLong', d:.30, g:-5, af:'highpass=f=140',
   mix:[{f:'SWING SCRAPE Swift Melee',t:0,d:.16,g:-6,r:1.30},
        {f:'Sword Slide Cuts',t:1,d:.30,g:-1,r:1.05,dl:35}]},
 /* 🏇騎槍(暗黒の騎士)=木の柄の突き→鈍い芯 */
 {k:'mSpear', d:.26, g:-4, af:'highpass=f=120',
   mix:[{f:'Spear And Stick Impact',t:6,d:.26,g:-1,r:.92},
        {f:'SWING IMPACTS Quick Heavy',t:4,d:.26,g:-8,r:1.15,dl:20}]},
 /* 🥊鉄拳(鋼鉄の巨人)=重い風切り→肉と鉄の打撃 */
 {k:'mHeavy', d:.34, g:0, af:'equalizer=f=200:width_type=o:width=1.4:g=4',
   mix:[{f:'SWING IMPACTS Quick Heavy',t:0,d:.34,g:-1,r:.86},
        {f:'4 x Punch, Body',t:1,d:.28,g:-5,r:.80,dl:40}]},
 /* 🔧レンチ(整備士)=金属の軽いタップ(連打なので一番短く薄く) */
 {k:'mTool', d:.24, g:-2, af:'highpass=f=220',
   mix:[{f:'METLImpt_METAL SWING HIT',t:0,d:.24,g:-1,r:1.45},
        {f:'METLImpt_Metal Old File Impact',t:0,d:.18,g:-4,r:1.25,dl:10}]},
 /* 📦鈍器(配達人)=木と体の鈍い当たり */
 {k:'mBlunt', d:.26, g:-3, af:'lowpass=f=4200',
   mix:[{f:'4 x Punch, Body',t:2,d:.26,g:-1,r:1.0},
        {f:'Spear And Stick Impact',t:13,d:.22,g:-8,r:.85,dl:25}]},
 /* 🥉薬莢(第2陣・2026-08-03(74)ユーザー「薬莢はダメ」)。
    ❌**ボツにした形**=バネ線のカチャつき/金属やすりのタップ=**「跳ねて転がる真鍮」に聞こえない**。
    ⭐**真鍮の薬莢はコインとほぼ同じ音**(明るい"チン"+短い跳ね)=素材はコイン系に切り替えた。
    ⚠**300Hz以下を切る**=低音が残ると「重い物が落ちた」になる。⚠短く=1発ごとに鳴る。 */
 {k:'geoShC', d:.46, g:-9, af:'highpass=f=380',
   mix:[{f:'Ting Coins',t:0,d:.46,g:-1,r:1.15}]},
 {k:'geoShD', d:.44, g:-9, af:'highpass=f=380',
   mix:[{f:'Foley Coin Flip Single Fast',t:0,d:.44,g:-1,r:1.05}]},
 {k:'geoShE', d:.50, g:-9, af:'highpass=f=340',
   mix:[{f:'Fall Bounce',t:0,d:.20,g:-2,r:1.20},
        {f:'Ting Coins',t:0,d:.44,g:-5,r:1.30,dl:60}]},
 {k:'geoShF', d:.40, g:-9, af:'highpass=f=400',
   mix:[{f:'Keys In Out',t:1,d:.16,g:-1,r:1.35},
        {f:'Ting Coins',t:0,d:.34,g:-7,r:1.45,dl:70}]},
 /* 🔩コッキングの別案(⭐**採用は geoCkC**。これは押さえの4本目) */
 {k:'geoCkD', d:.34, g:-4, af:'highpass=f=180',
   mix:[{f:'Latch Button Nearfield',t:0,d:.13,g:-1,r:1.05},
        {f:'Tinkering Antique Lock',t:3,d:.20,g:-4,r:1.0,dl:100}]},
 {k:'geoBigH', d:1.05,g:-1, af:'equalizer=f=200:width_type=o:width=1.4:g=4',
   mix:[{f:'powerful explosions_multiples',t:1,d:.12,g:-2,r:1.10},
        {f:'METAL SWING HIT Weapon Swing',t:0,d:1.00,g:-2,r:.78,dl:18}]},
 /* ===== 🏇騎槍の突き・第2陣(2026-08-03(86)ユーザー「騎槍の突き以外の音はOK」) =====
    ❌**1本目(mSpear)がダメだった理由**=**木の棒を叩いた「カツン」しか鳴っていなかった**。
      ⚠2層目の `SWING IMPACTS` を**かたまりの頭から**切っていたが、この素材は
      **前半0.17秒が風切り・当たりはその後**=つまり**当たりが1ミリも入っていなかった**。
      ⭐だから `o`(かたまりの中のずらし)を足した。位置は `node tool_sfx.js peak` で見る。
    ⭐**突きは斬りと別物**=①穂先が刺さる鋭い頭 ②**貫いた肉/鎧の胴** ③短い尾。
      「カツン」は当たりではなく**柄が鳴っているだけ**。 */
 /* A 貫き=穂先の細い頭→濡れた肉の潰れ→鈍い芯(「刺さった」寄り) */
 {k:'mSprA', d:.28, g:-5.5, af:'highpass=f=130',
   mix:[{f:'WHIP Snap Crack',t:0,o:.13,d:.05,g:-11,r:1.50},
        {f:'Blood Spill Splat',t:0,d:.22,g:-1,r:.85},
        {f:'SWING IMPACTS Quick Heavy',t:9,o:.17,d:.20,g:-7,r:.80,dl:25}]},
 /* B 鉄の穂先=金属が体に刺さって短く残響(「鉄」寄り) */
 {k:'mSprB', d:.26, g:-2.5, af:'highpass=f=150',
   mix:[{f:'METAL SWING HIT Weapon Swing',t:0,o:.35,d:.26,g:-1,r:1.05},
        {f:'Spear And Stick Impact',t:2,d:.14,g:-8,r:.95}]},
 /* C 重い突進=当たりだけを低くして正面から(「ドスッ」寄り) */
 {k:'mSprC', d:.28, g:-9.5, af:'equalizer=f=200:width_type=o:width=1.4:g=4',
   mix:[{f:'SWING IMPACTS Quick Heavy',t:9,o:.17,d:.26,g:-1,r:.82},
        {f:'4 x Punch, Body',t:1,d:.20,g:-7,r:.85,dl:20}]},
 /* D 現行の直し=木の柄は残したまま、肉と芯を足して「当たった」を作る */
 {k:'mSprD', d:.26, g:-5.3, af:'highpass=f=120',
   mix:[{f:'Spear And Stick Impact',t:6,d:.24,g:-2,r:.92},
        {f:'Blood Spill Splat',t:0,d:.20,g:-7,r:.90,dl:20},
        {f:'SWING IMPACTS Quick Heavy',t:15,o:.17,d:.18,g:-10,r:.78,dl:35}]},
 /* E 突進=速い風を先に置いてから抉る(「馬で突っ込んだ」寄り) */
 {k:'mSprE', d:.30, g:-4.8, af:'highpass=f=140',
   mix:[{f:'Wind, Rush, Whoosh',t:0,o:.06,d:.10,g:-10,r:1.60},
        {f:'Gore Designed',t:0,d:.22,g:-3,r:1.15,dl:45}]},
 /* ===== 🏇騎槍・第3陣(2026-08-03(87)ユーザー「もっと風を切るような音ない?そのあとにAをつける感じがいい」)=
    **風切りの頭を先に立てて→Aの中身(肉の潰れ+鈍い芯)**。風の材質だけ3種で作り分け。 */
 /* F 剣の風切り(デザイン済みのシュッ。一番「風を切ってる」が立つ) */
 {k:'mSprF', d:.38, g:-5, af:'highpass=f=130',
   mix:[{f:'Sword Slice Special',t:0,o:.16,d:.14,g:-7,r:1.30},
        {f:'Blood Spill Splat',t:0,d:.20,g:-1,r:.85,dl:115},
        {f:'SWING IMPACTS Quick Heavy',t:9,o:.17,d:.18,g:-7,r:.80,dl:140}]},
 /* G 刃の擦過(金属のヒュンッ。長物を振った時の鉄の鳴りが乗る) */
 {k:'mSprG', d:.38, g:-5, af:'highpass=f=130',
   mix:[{f:'SWING SCRAPE Swift Melee',t:0,o:.02,d:.16,g:-8,r:1.25},
        {f:'Blood Spill Splat',t:0,d:.20,g:-1,r:.85,dl:120},
        {f:'SWING IMPACTS Quick Heavy',t:9,o:.17,d:.18,g:-7,r:.80,dl:145}]},
 /* H 空気の風(武器スイングの生の風だけ。素朴で速い) */
 {k:'mSprH', d:.36, g:-5, af:'highpass=f=130',
   mix:[{f:'SWING IMPACTS Quick Heavy',t:15,o:.02,d:.13,g:-6,r:1.35},
        {f:'Blood Spill Splat',t:0,d:.20,g:-1,r:.85,dl:105},
        {f:'SWING IMPACTS Quick Heavy',t:9,o:.17,d:.18,g:-7,r:.80,dl:130}]},
 /* ===== 👑暁の王の攻撃音(2026-08-03(88)ユーザー「暁の王の攻撃音終わってるから変えて」)=====
    ❌それまで**60%の確率で虹ゾンビ用の合成音かライフルの銃声**が鳴っていた(専用の音が1本も無かった)。
    ⭐攻撃=**天から金の光柱が落ちる**。①空気/光の頭 ②重い胴 ③薄い鐘の尾。
    ⚠**高いキラキラ音は禁止**(既知の掟)=鐘は-13dB以下・0.3秒まで。毎秒1回鳴るので0.6秒まで。 */
 /* A 光の柱=ジェットの空気の頭→低い胴。「空気が裂けて落ちた」寄り */
 {k:'dwnA', d:.55, g:-5.5, af:'highpass=f=150',
   mix:[{f:'Blast Off Clean',t:0,d:.28,g:-5,r:1.70},
        {f:'Booms_Vol2_011',t:0,d:.50,g:-7,r:1.35,dl:40},
        {f:'Shimmer Loop Small Bell',t:0,d:.28,g:-14,r:1.05,dl:70}]},
 /* B 天罰=雷鳴のクラップを主役に。「裁きが落ちた」寄り */
 {k:'dwnB', d:.55, g:-1.5, af:'highpass=f=140',
   mix:[{f:'Texas Rain Thunder',t:3,d:.48,g:-1,r:1.10},
        {f:'Shimmer Loop Small Bell',t:0,d:.28,g:-13,r:1.0,dl:60}]},
 /* C 魔法の光=本物の光魔法の素材を低めに。「魔法」寄り */
 {k:'dwnC', d:.55, g:-8.5, af:'highpass=f=150',
   mix:[{f:'Magic Light Spell',t:0,o:.70,d:.34,g:-2,r:.82},
        {f:'Booms_Vol2_011',t:0,d:.45,g:-9,r:1.40,dl:30}]},
 /* D 号砲=破裂の頭を高くして光の弾けに。「まばゆい一発」寄り */
 {k:'dwnD', d:.50, g:-2.5, af:'highpass=f=160',
   mix:[{f:'powerful explosions_multiples',t:4,d:.30,g:-4,r:1.55},
        {f:'Shimmer Loop Small Bell',t:0,d:.30,g:-12,r:1.15,dl:45}]},
 /* E エネルギー=低いバーストを主役に。「重い光」寄り */
 {k:'dwnE', d:.55, g:-4.5, af:'highpass=f=140',
   mix:[{f:'Collect Scifi Futuristic Electronic Bass Burst',t:0,d:.45,g:-2,r:.90},
        {f:'Shimmer Loop Small Bell',t:0,d:.26,g:-14,r:1.05,dl:55}]},
 /* ===== 必殺技の音の総点検(2026-08-03(91)ユーザー「死の宣告の音がダサい。こういうの全部見直して。確実に」)=====
    ❌ダサかった正体=**死の宣告と暁の号令が「勝利ジングル(win)」を鳴らしていた**。
      他にも 漆黒の突撃=素材の無い合成音(lslash) / 放水と時間停止=冷凍砲(frost) /
      雷嵐=テスラ(zap) / 地響き=ただの爆発(boom) / 速達=金属の単発(thunk) の使い回し。
    ⭐必殺技は1試合に数回しか鳴らない=**長め・重め**でよい(連撃の掟の逆)。 */
 /* ☠死の宣告(終焉の騎士)=鎌の金属の頭→暗いブラームの胴(ホラーの誇張) */
 {k:'ultDoom', d:1.25, g:-2, af:'highpass=f=85',
   mix:[{f:'Sword Slide Cuts',t:4,d:.34,g:-5,r:.70},
        {f:'Transition Braam Slow Dark',t:0,d:1.20,g:-1,r:1.30,dl:70}]},
 /* 👑暁の号令(暁の王)=王の角笛。エピックなホーンブラームを短く+薄い鐘 */
 {k:'ultDawn', d:1.15, g:-3, af:'highpass=f=110',
   mix:[{f:'Cinematic Horn Braam',t:0,d:1.10,g:-1,r:1.30},
        {f:'Shimmer Loop Small Bell',t:0,d:.45,g:-14,r:1.0,dl:90}]},
 /* 🚒放水(消防士)=本物の水の重い塊+風の押し出し */
 {k:'ultHose', d:.80, g:-3, af:'highpass=f=120',
   mix:[{f:'Impact Water Deep Submerge',t:0,d:.75,g:-1,r:1.25},
        {f:'Wind, Rush, Whoosh',t:0,o:.06,d:.22,g:-9,r:1.25}]},
 /* ⏳時間停止(死潮の預言者)=低いバーストを逆さ寄りに沈める+薄い鐘(世界が止まる「ドゥン…」) */
 {k:'ultTime', d:.95, g:-3, af:'highpass=f=95',
   mix:[{f:'Collect Scifi Futuristic Electronic Bass Burst',t:0,d:.90,g:-1,r:.60},
        {f:'Shimmer Loop Small Bell',t:0,d:.40,g:-15,r:.85,dl:80}]},
 /* ⚡雷嵐(雷鳴の巫女)=本物の雷鳴のクラップ。1本ずつ落ちるたびに鳴るので短く */
 {k:'ultBolt', d:.60, g:-5, af:'highpass=f=110',
   mix:[{f:'Texas Rain Thunder',t:3,d:.55,g:-1,r:1.30}]},
 /* 🥊地響き(鋼鉄の巨人)=低い胴鳴り+飛び散る破片(150〜300Hzを盛る=スマホで重く) */
 {k:'ultQuake', d:1.10, g:-12, af:'equalizer=f=210:width_type=o:width=1.4:g=5',
   mix:[{f:'EffectiveTrailer_Booms_Vol2_214',t:0,d:1.05,g:-1,r:.70},
        {f:'Woosh Debris',t:0,d:.85,g:-8,r:.85,dl:130}]},
 /* 📦速達(配達人)=走り出しの風→重い体当たり */
 {k:'ultRush', d:.70, g:-3, af:'highpass=f=120',
   mix:[{f:'Wind, Rush, Whoosh',t:0,o:.04,d:.22,g:-4,r:1.10},
        {f:'4 x Punch, Body',t:3,d:.32,g:-2,r:.88,dl:200}]},
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
 /* ⭐**素材名を直に渡して調べられるようにした**(2026-08-03(73))=
      node tool_sfx.js scan sfx_src "Antique Lock,Spring Wire"
    ⚠これが無いと**レシピに書く前のかたまり番号が分からない**(先に番号が要るのに、
      番号を知るにはレシピが要る、というにわとり卵になっていた)。 */
 const frags=(process.argv[4]||'').split(',').map(s=>s.trim()).filter(Boolean);
 if(frags.length){
  for(const fr of frags){
   const f=findSrc(fr);
   if(!f){console.log('× 素材なし: "'+fr+'"');continue;}
   const s=segs(f);
   console.log('■ '+path.basename(f)+'  かたまり'+s.length+'個');
   s.slice(0,24).forEach((q,i)=>console.log('   '+i+': 開始'+q[0].toFixed(2)+'s 長さ'+q[1].toFixed(2)+'s'));
  }
  process.exit(0);
 }
 for(const R of REC){
  /* ⚠**`mix`(層で作る音)は `R.f` を持たない**=そのまま回すと undefined で落ちる
     (2026-08-03(73)に踏んだ。scan は全部 `f` を持っていた頃のまま止まっていた)。 */
  const layers=R.mix?R.mix:[{f:R.f,t:R.t}];
  console.log('['+R.k+']'+(R.mix?' ('+R.mix.length+'層)':''));
  for(const L of layers){
   const f=L.f?findSrc(L.f):null;
   if(!f){console.log('  × 素材なし: "'+(L.f||'(未指定)')+'"');continue;}
   const s=segs(f);
   console.log('  '+path.basename(f)+'  かたまり'+s.length+'個');
   s.slice(0,10).forEach((q,i)=>console.log('     '+(i===(L.t||0)?'→':'  ')+i+': 開始'+q[0].toFixed(2)+'s 長さ'+q[1].toFixed(2)+'s'));
  }
 }
 process.exit(0);
}
if(process.argv[2]==='peak'){
 /* ⭐**かたまりの中の「一番大きい所」が頭から何秒目か**を出す(2026-08-03(86))=
      node tool_sfx.js peak sfx_src "SWING IMPACTS" 9
    ⚠**風切り→当たり**が1つのかたまりになっている素材は、頭から切ると当たりが入らない。
      ここで出た秒数を レシピの `o:` に書くと当たりだけを切り出せる。 */
 const fr=(process.argv[4]||'').split(',')[0].trim(),ti=+(process.argv[5]||0);
 const f=findSrc(fr);
 if(!f){console.log('× 素材なし: "'+fr+'"');process.exit(1);}
 const s=segs(f),q=s[Math.min(ti,s.length-1)]||[0,1];
 console.log('■ '+path.basename(f)+' かたまり'+ti+' 開始'+q[0].toFixed(2)+'s 長さ'+q[1].toFixed(2)+'s');
 const STEP=.04;
 for(let t=0;t<q[1];t+=STEP){
  const o=runE(['-hide_banner','-ss',String(q[0]+t),'-t',String(STEP),'-i',f,'-af','volumedetect','-f','null','-']);
  const mx=+((/max_volume: (-?[\d.]+) dB/.exec(o)||[0,-99])[1]);
  console.log('   +'+t.toFixed(2)+'s  '+mx.toFixed(1).padStart(6)+'dB  '+'#'.repeat(Math.max(0,Math.round((mx+50)/2))));
 }
 process.exit(0);
}
if(process.argv[2]==='build'){
 if(!fs.existsSync(OUT))fs.mkdirSync(OUT);
 const TMP=path.join(require('os').tmpdir(),'dt_sfx_tmp.wav');
 let total=0,ng=0,warn=0;
 /* 第2引数があれば、そのキーだけ作り直す(素材を全部そろえなくて済む) */
 const only=(process.argv[4]||'').split(',').map(s=>s.trim()).filter(Boolean);
 /* ⭐**2回に分けて作る**。
    ① まず素の音を一時WAVへ書き出す(層を重ねるならここで混ぜる)
    ② できた音のピークを測り、そのぶんだけ持ち上げてMP3へ
    ⚠これをやらないと、録り音の小さい素材を重ねた時に全体が-43dBまで沈んで**ほぼ無音**になる
      (ライフルの銃声で実際に沈んだ)。R.g は「最終的なピークを-1dBから何dB下げるか」 */
 for(const R of REC){
  if(only.length&&only.indexOf(R.k)<0)continue;
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
    /* ⭐`o` = **かたまりの頭から何秒ずらして切り出すか**(2026-08-03(86))。
       ⚠これが無いと「風切り→当たり」で1つのかたまりになっている素材から**当たりだけ**を取れない
         (頭から切ると必ず風切りしか入らない)。位置は `node tool_sfx.js peak` で調べる。 */
    const lst=Math.max(0,lq[0]-.005+(L.o||0)),ld=Math.min(L.d,lq[1]+.02-(L.o||0));
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
   const st=Math.max(0,q[0]-.01+(R.o||0));
   dur=Math.min(R.d,q[1]+.02-(R.o||0));
   /* ⚠`-vn -sn -dn -map_metadata -1` は**必ず -i の後ろ**に置く(前だと入力側の指定と見なされて無視される)。
      付け忘れると素材WAVに埋まったジャケット画像が動画として混ざり、1本30KBに膨らむ(実際に膨らんだ) */
   runE(['-y','-hide_banner','-ss',String(st),'-t',String(dur),'-i',f,
    '-vn','-sn','-dn','-map_metadata','-1','-ac','1','-ar','22050',TMP]);
   ok=fs.existsSync(TMP);}
  if(!ok){console.log('× 書き出し失敗: '+R.k);ng++;continue;}
  /* ---- ② ピークを測って、狙った音量でMP3へ ----
     ⚠`R.af` があれば**先に**掛けてから測る(EQで持ち上げたぶんを含めてピークを合わせるため)。
       R.af は「スマホで聴こえる帯域へ寄せる」ためのEQに使う。
       ⚠**120Hz以下はスマホのスピーカーがほぼ鳴らせない**=そこに置いた低音は聴こえない。
         「重い」を作るなら 150〜300Hz を持ち上げること(重テスラで実際に踏んだ) */
  const eq=R.af?R.af+',':'';
  const pr=runE(['-hide_banner','-i',TMP,'-af',eq+'volumedetect','-f','null','-']);
  const mx=+((/max_volume: (-?[\d.]+) dB/.exec(pr)||[0,0])[1]);
  const gain=(-1-mx)+(R.g||0);
  const fo=Math.max(.03,Math.min(.14,dur*.22));
  const af=eq+'volume='+gain.toFixed(2)+'dB,atrim=0:'+dur.toFixed(3)
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
