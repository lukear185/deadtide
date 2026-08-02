/* 実画面のスクリーンショットを撮る開発用ツール(見た目の確認はこれで行う)
   使い方: node test_shot.js [出力png] [幅] [高さ] [pc]
     例) node test_shot.js shot.png 852 393      … スマホ想定(既定)
         node test_shot.js shot.png 1280 720 pc  … PC想定
   ・index.htmlに「ソロを自動で開始する」スクリプトを足した一時ファイルを作り、ヘッドレスChromeで撮る
   ・⚠ヘッドレスChromeでは @media (pointer:coarse) が効かないので、既定ではスマホ用CSSを
     条件なしのCSSとして後ろに足して強制適用する(実機と同じ寸法で撮るため)
   ・一時ファイルはOSのテンポラリに作るのでリポジトリは汚れない
   ・Chromeが無い場合はEdgeを使う */
const fs=require('fs'),os=require('os'),path=require('path'),cp=require('child_process');
const OUT=path.resolve(process.argv[2]||'shot.png');
const W=+(process.argv[3]||852),H=+(process.argv[4]||393);
const OPT=(process.argv[5]||'');
const PC=OPT.indexOf('pc')>=0;
const ST=/st(\d)/.exec(OPT);/* 例 st2 = ステージ2を撮る */
const WM=/w(\d+)/.exec(OPT),WAIT=WM?+WM[1]:9000;/* 例 w30000 = 30秒ぶん進めてから撮る(敵が出た状態) */
const BROWSERS=['C:/Program Files/Google/Chrome/Application/chrome.exe',
 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'];
const BR=BROWSERS.find(p=>fs.existsSync(p));
if(!BR){console.log('ChromeもEdgeも見つからない');process.exit(1);}
const html=fs.readFileSync(path.join(__dirname,'index.html'),'utf-8');
/* @media (pointer:coarse){...} を全部取り出す(入れ子の}を数えて閉じ位置を見つける) */
function coarseCSS(s){
 const k='@media (pointer:coarse){';let out='',from=0;
 for(;;){const i=s.indexOf(k,from);if(i<0)break;
  let d=1,j=i+k.length;
  while(j<s.length&&d>0){if(s[j]==='{')d++;else if(s[j]==='}')d--;j++;}
  out+=s.slice(i+k.length,j-1)+'\n';from=j;}
 return out;}
const VS=OPT.indexOf('vs')>=0;/* vs = 対戦(空き枠はCPU)を撮る */
const GC=OPT.indexOf('gacha')>=0;/* gacha = タイトルの英雄召集を10連した状態で撮る */
const NB=OPT.indexOf('nmboss')>=0;/* nmboss = 🌑ナイトメア(獣プール)で撮る */
/* ⭐bns = 🚌ボーナス面「バスの日」(四方から+バス)。⚠st2 と併せるとステージ2の面になる */
const BNS=/(^|\+)bns(\+|$)/.test(OPT);
/* ⭐h0 = 🧍主人公を大写しで撮る(UNITSに居ないので pose= では撮れない) */
const H0=/(^|\+)h0(\+|$)/.test(OPT);
/* ⭐dbg = 画面の中の状態をトーストで出す(「絵は出るのに中が止まっている」を切り分ける用) */
const DBG=/(^|\+)dbg(\+|$)/.test(OPT);
/* ⭐bnsn=12 = ボーナス面を何秒ぶん進めてから撮るか。
   ⚠⚠**ヘッドレスの仮想時間では rAF がほとんど回らない**ので、放っておくと敵が1体も湧かない絵になる
     (検証場で踏んだのと同じ罠。「敵が湧かない不具合」だと勘違いして半日溶かしかけた)。 */
const BNM=/bnsn=(\d+)/.exec(OPT),BNSN=BNM?+BNM[1]:12;
/* ⭐bnsdrv = 進めている間**バスを勝手に走らせる**(スティックをぐるっと回す)。
   ⚠これが無いとバスは中央に止まったままなので、**轢き応え(血だまり・轍・連なりの数字)が
     1つも写らない**(2026-08-02(2)に足した)。⚠bns と併せて使う。 */
const BDRV=/(^|\+)bnsdrv(\+|$)/.test(OPT);
/* ⭐bnsent[=番号] = 🏚**入れる廃墟**の前へバスを移して撮る(番号=BENTの何棟目。既定0)。
   ⚠**カメラはバスを追う**ので、これが無いと拠点まわりしか写らず、入れる廃墟が一度も画に出ない。
   ⚠bns と併せて使う。⚠**bnsdrv とは併用しない**(走らせると寄せた場所から離れていく)。 */
const BEM=/(^|\+)bnsent(=(\d+))?(\+|$)/.exec(OPT),BENTI=BEM?(+(BEM[3]||0)):-1;
/* ⭐bnsnit = 🔥**ニトロを撃った直後**を撮る(群れの中を走らせながら、終わりの2秒前に発動)。
   ⚠これが無いと炎・速度線・縁の橙・ゲージが1枚も写らない。⚠bns と併せて使う。 */
const BNIT=/(^|\+)bnsnit(\+|$)/.test(OPT);
/* ⭐bnsarr[=秒] = 🏁**到着のムービー**(拠点の入り口を通過する所)を撮る。⚠bns と併せて使う。
   ⚠**自分で始める**=締め切りは75秒なので、待っていると撮影が終わらない。
   ⭐秒=ムービーを何秒進めた所を撮るか(既定2.2=門をくぐる瞬間)。 */
const BAM=/(^|\+)bnsarr(=([0-9.]+))?(\+|$)/.exec(OPT),BARR=BAM?(+(BAM[3]||2.2)):-1;
/* 🎒⭐**走る前の流れ**(2026-08-02(43))を撮る。⚠bns と併せて使う。
   `bnssel`=①ミニゲーム選択画面(広場を見下ろして棟が光る)
   `bnsmg`=②⛽給油のミニゲーム(3本目まで進めた所)
   `bnsbrd`=③乗り込みのムービー / `bnsup`=④強化画面の🔧性能 / `bnseqp`=🚌車体 / `bnsgep`=🛠艤装
   ⚠⚠**どれも指定しなければ流れは丸ごと飛ばす**(`bnsPreSkip`)=でないと敵が1体も湧かない絵になる。 */
const BPRE=(/(^|\+)bns(sel|mg|brd|up|eqp|gep)(=\d)?(\+|$)/.exec(OPT)||[])[2]||'';
/* ⚔bnseq = **装備を全部付けたバス**で走らせて撮る(2026-08-02(44))。⚠bnsdrv と併せて使う */
const BEQA=/(^|\+)bnseq(\+|$)/.test(OPT);
/* ⭐bnsmg[=0/1/2] = どのミニゲームを撮るか(0=⛽給油 / 1=🏭荷積み / 2=🏠物色)。
   ⚠**棟の種類でゲームが変わる**ので、番号でその棟を選んでから始めている。 */
const MGK=+((/(^|\+)bnsmg=(\d)/.exec(OPT)||[])[2]||0);
/* ⭐noitr = 「🆕新種のゾンビが現れる!」の紹介モーダルを出さない(2026-07-27ユーザー許可)。
   ⚠このモーダルは PAUSED=true で画面を覆うので、**新しい敵の絵を撮ろうとすると必ず邪魔になる**
     (深海のナイトメアのボス2体が3回撮り直しても撮れなかった)。⚠st2+nmboss と併用すること。 */
const NOITR=OPT.indexOf('noitr')>=0;
/* ⭐pose=z:walk / pose=u:bat = **1体だけを大写しにして絵を磨くための画面**(2026-07-30)。
   ⚠⚠**オプション名に `t=`/`u=`/`z=`/`w数字` を含めてはいけない**。最初 `art=` にしたら
     `/t=([A-Za-z0-9]+)/`(タワー指定)が **`art=z:walk` の中の `t=z` を拾って**タワー"z"を建てようとし、
     撮影プロセスが固まって1枚も撮れなかった(`gtw2` で踏んだのと同じ罠。2度目)。
   ⚠実寸だけでは細部が見えず、拡大だけでは実機での見え方が分からない=**同じ1枚に両方並べる**。
   ⚠**明るい地面と暗い地面の両方に置く**こと=黒フチと色の効き方は背景で変わる
     (💎召集の金色が「夜では見えて朝では消える」で実際に踏んだ)。
   ⚠歩行の位相を4コマ並べる=止め絵1枚だけ見て直すと、動いた時に脚が入れ替わる不具合を見逃す。 */
const ARTM=/pose=([zu]):([A-Za-z0-9]+)/.exec(OPT);
const ARTCHG=(/posechg=([0-9.]+)/.exec(OPT)||[0,''])[1];/* 溜めの姿で並べる(部隊のみ) */
/* ⭐posesw = バットのスイングを**段階ごとに**並べる(2026-07-30)。
   ⚠止め絵1枚では「振れているか」が分からないので、5コマを振り抜き〜振りかぶりに割り当てる。 */
const ARTSW=OPT.indexOf('posesw')>=0;
/* ⭐poseult = 必殺技の詠唱モーションを**段階ごとに**並べる(2026-08-02)。
   ⚠posechg(通常の溜め)では詠唱の枝を1コマも通らない=型ごとの動きを目で見られない。
   5コマ= 押した直後 → 構え → 詰め → **一拍のタメ** → 発射の抜け。 */
const ARTUL=OPT.indexOf('poseult')>=0;
/* ⭐arena=bat:walk = 🧪検証場(一本道)を開いて撮る(2026-07-30)。
   ⚠オプション名に `t=`/`u=`/`z=` を含めないこと=`tst=` にすると **`t=` に食われて**タワーを建てにいく。 */
const ARN=/arena=([A-Za-z0-9]+):([A-Za-z0-9]+)/.exec(OPT);
const LM=/lab(?:=([a-z]+))?/.exec(OPT);/* lab / lab=twup(タワー強化) / lab=unup(部隊強化) / lab=rec(記録) = 🔬研究所の指定タブ */
const LAB=!!LM,LABT=(LM&&LM[1])||'new';
const LDM=/load(?:=([a-z]+))?/.exec(OPT);/* load / load=am = 🎖編成の指定タブ */
const LOAD=!!LDM,LOADT=(LDM&&LDM[1])||'base';
const TRH=OPT.indexOf('trhome')>=0;/* trhome = 🏋鍛錬所のモーダル */
const SFXT=OPT.indexOf('sfx')>=0;/* sfx = 🔊音の確認の画面 */
const TTL=OPT.indexOf('title')>=0;/* title = タイトル画面をそのまま撮る */
/* ⭐setup = 🧟ソロの出撃準備画面(ステージ/難易度/砲撃/英雄を選ぶ所)。2026-07-27に2列へ作り替えた */
const STP=OPT.indexOf('setup')>=0;
/* ⭐opt = ⚙オプション(音量バー+演出の強さ)。⚠title と一緒に渡すこと(例: "title+opt") */
const OPTM=OPT.indexOf('opt')>=0;
/* 例 z=fBeast,nmHorr = その敵だけを経路上に並べて撮る(見た目の確認用) */
const ZM=/z=([A-Za-z0-9,]+)/.exec(OPT),ZIDS=ZM?ZM[1].split(','):[];
/* 例 t=rail = そのタワーを最初の枠に建てて撃たせ続ける(発射エフェクトを撮るため)
   ⚠発射の瞬間しか出ないエフェクト(電撃の連鎖など)は、ヘッドレスの仮想時間の進み方しだいで
     写らないことがある。写らなければ w の値を変えて数回撮る。最終確認は実機で。 */
const TM=/t=([A-Za-z0-9]+)/.exec(OPT),TID=TM?TM[1]:'';/* ⚠数字も拾うこと(以前は [A-Za-z]+ で `t=scrap2` が `scrap` になっていた) */
/* ⚔冒険(育成RPG): rpg=拠点の町 / rpgf=エリアのフィールド / rpgb=戦闘 / rpgg=門(エリア選択) / rpgs=つよさ */
const RPM=/rpg([a-z]?)/.exec(OPT),RPG=!!RPM,RPGK=RPM?RPM[1]:'';
/* 例 hero=hNox = その英雄を出撃させて撮る / hero=all = 英雄11人を経路上に並べて撮る */
const HM=/hero=([A-Za-z]+)/.exec(OPT),HID=HM?HM[1]:'';
/* ⭐ult=0.7 = hero= と一緒に渡すと、**必殺技の詠唱をその進み具合で止めて盤面ごと撮る**(2026-08-02)。
   ⚠pose= の並べ撮りでは体の動きしか見えない=足元の紋章や照準線(drawUChg)は盤面でしか出ない。
   ⚠止め方=毎回 ulW を書き戻す(発射そのものは待ち行列で進むが、絵は詠唱のまま残る)。 */
const ULM=/ult=([0-9.]+)/.exec(OPT),ULP=ULM?ULM[1]:'';
/* 例 u=grn = その兵科を3体出して、目の前にゾンビを湧かせ続ける(攻撃と撃破の演出を撮るため)
   ⚠ゾンビは倒されたら補充されるので、投擲の軌道・炎・死体がいつでも画面に出ている状態になる */
const UM=/u=([A-Za-z0-9]+)/.exec(OPT),UID=UM?UM[1]:'';
/* 例 stk=napalm = その砲撃を繰り返し撃ち込む(着弾の演出を撮るため。air/mgun/carpet/frost/napalm) */
const SKM=/stk=([a-z]+)/.exec(OPT),SKID=SKM?SKM[1]:'';
/* fxdemo = 新しい演出を1つずつ並べて、寿命の途中の姿で止めて撮る(絵そのものを確かめる用)
   ⚠一瞬しか出ない演出は実戦の撮影ではまず捉えられないので、こうして並べて見る */
const FXD=OPT.indexOf('fxdemo')>=0;
/* tut / tut=3 = 🎓チュートリアルを撮る(数字はその段まで進めてから撮る) */
const TUM=/tut(?:auto)?(?:=([0-9]+))?/.exec(OPT),TUT=!!TUM,TUTI=TUM&&TUM[1]?+TUM[1]:0;
/* ⭐grid=tw|u|hero|z = 見た目を**実機と同じ大きさで並べて**撮る(2026-07-26 第91弾)。
   ⚠絵を直す作業は「撮る→直す→また撮る」の繰り返しになるので、1種ずつ実戦で撮っていては回らない。
   ⚠**実機の大きさ(タワー35px・キャラ25px前後)で見ること**。大きく描いて満足すると実機で潰れる。
     並べる時は 実寸 と 3倍 を2段に出す(実寸=見分けが付くか / 3倍=細部が壊れていないか)。
   例) node test_shot.js out.png 1280 720 grid=u */
const GRM=/grid=([a-z]+)/.exec(OPT),GRID=GRM?GRM[1]:'';
/* pxcmp / pxcmp=walk = 🧪ドット絵の試作をコード描画と並べて撮る */
const PXM=/pxcmp(?:=([A-Za-z0-9]+))?/.exec(OPT),PXC=!!PXM,PXID=(PXM&&PXM[1])||'walk';
/* intro=t|u|z = 新登場の紹介モーダル(タワー/兵科/ゾンビ) */
const IRM=/intro(?:=([tuz]))?/.exec(OPT),INTRO=!!IRM,INTROK=(IRM&&IRM[1])||'u';
/* iv = 作戦タイム(準備画面)の強化カードを撮る。⚠🔩と⚙️を潤沢にして全部のカードを押せる状態にする */
const IV=/(^|\+)iv(=\d+)?(\+|$)/.test(OPT);
/* ⭐iv=12 でそのウェーブの作戦タイムとして撮る(次の波の性格の行を見るため。2026-08-02) */
const IVW=(/(^|\+)iv=(\d+)/.exec(OPT)||[])[2]||0;
/* re2 = 一度タイトルへ戻ってから**もう一度出撃**して撮る。
   ⚠2回目でしか出ない不具合(DOMを作り直す所で要素が消える等)を捕まえるための撮り方。
   画面下に赤いエラー帯が出ていないかを見る。 */
const RE2=/(^|\+)re2(\+|$)/.test(OPT);
const inj=(PC?'':'<style>'+coarseCSS(html)+'</style>')
 +'<scr'+'ipt>setTimeout(function(){try{'
 /* 🎓チュートリアルの自動起動を止める。⚠これが無いと、起動0.6秒後に勝手に始まって
    タイトルや研究所の撮影が全部チュートリアルの絵になる(tut オプションは自分で呼ぶので影響なし) */
 +'META.tut=1;'
 /* ⭐タレット/工房の進化先は🔬研究所の解放制になった(2026-07-30)。撮影用は全部開けておく
    (でないと t=fort2 などの「進化先を撮る」オプションが gradeTower で止まる) */
 +'try{META.tg=TG_ALL.slice();}catch(e){}'
 /* tut2 = 2回目以降のチュートリアル(やめるボタンが出て、💎とガチャの段が無い状態)を撮る */
 +(/tut2/.test(OPT)?'META.tutOk=1;':'')
 /* pxon = 🧪ドット絵の試作を有効にして撮る(既定は切ってある) */
 +(/pxon/.test(OPT)?'PX_ON=true;':'')
 /* v2 = ⭐輪郭を1本にまとめる2度描きを有効にして撮る(?v2=1 と同じ。既定は切ってある) */
 +(/v2on/.test(OPT)?'VEC2=true;':'')
 /* ステージ2以降は「前のステージをナイトメアでクリア」が条件なので、撮影用に全部クリア済みにする */
 +(ST?('META.sc=[[1,1,1,1,1,1],[1,1,1,1,1,1]];META.sclr=[1,1,1];META.stg='+(+ST[1]-1)+';'):'')
 +(LAB?('META.pts=99999;META.nt=2;META.nu=3;META.sc0=1;META.tg=[];/* ⚠研究所を撮る時は進化の解放を戻す(上で全部開けているため) */META.st.push("frost");LABTAB="'+LABT+'";renderLab();document.getElementById("md-lab").classList.add("on");'
     /* ⭐tmtip = 初めて兵科を解放した時に1回だけ出る「🎒編成のはなし」(2026-08-02)。
        ⚠1回きりの案内なので、こうしないと撮る機会が無い */
     +(/tmtip/.test(OPT)?'META.tmTip=0;META.team=[];teamTip(UBASE[BASE_U].id,"add");':''))
     :LOAD?('META.uv=VARLIST.slice(0,10).map(function(x){return x.v.id;});META.am=2;LDTAB="'+LOADT+'";renderLoad();document.getElementById("md-load").classList.add("on");')
     /* tutauto=はじめての人の入り口(タイトルで「🎓あそびかた」を光らせる段)から撮る */
     /* tutbm = その段のまま塔を建てて強化ウィンドウを開いて撮る(帯と被っていないかを見る) */
     :TUT?((OPT.indexOf('tutauto')>=0?'tutAuto();':'tutStart();')+'for(var q=0;q<'+TUTI+';q++)tutGo(TUT.i+1);'
       /* ⚠resize で closeBM されるので、開き直し続ける(撮影の瞬間まで開いていればよい) */
       +(OPT.indexOf('tutbm')>=0?'try{var s9=tutSlot(G.players[0]);G.players[0].scrap=9999;actBuild(s9,0);'
         /* ⚠**撮る直前に resize が飛ぶ**(--screenshot は撮影前に窓を作り直す)。
            index.html は resize で closeBM() するので、**resize の後にも開き直す**こと
            (setInterval では撮影に間に合わず、いつまでもウィンドウ無しの絵が撮れる) */
         +'window.addEventListener("resize",function(){try{openBM(s9);}catch(e9){}});'
         +'setInterval(function(){try{if(document.getElementById("buildmenu").style.display!=="block")openBM(s9);}catch(e9){}},120);'
         +'}catch(e){}':''))
     /* zoo=📖ゾンビ図鑑の単独の窓(🛠DEV専用)。⚠dev と一緒に渡すこと(例: "dev+zoo") */
     :(OPT.indexOf('zoo')>=0)?'openZoo();'
     /* hstat=🦸英雄ステータス。hs=英雄id を足すとその1人を選んだ状態で撮る */
     :(OPT.indexOf('hstat')>=0)?('META.hero={hNox:1,hSf:2,hCop:1,hDawn:1,hStorm:1};META.gem=17;'
       +'openHStat("'+((/hs=([A-Za-z0-9]+)/.exec(OPT)||[0,''])[1])+'");')
     :STP?('META.tr0=1;META.pts=4820;META.gem=17;META.hmat=64;META.nmOK=1;META.st=["air","mgun","frost","napalm"];'
       +'META.sc=[[1,1,1,1,1,1],[1,1,1,1,1,1]];META.sclr=[1];META.hero={hNox:1,hSf:1,hCop:1};'
       +'renderStkSeg();renderHeroSeg();updLabBtn();refreshDiffUI();refreshRunUI();show("setup");')
     /* lob=✨黄金のロブスター(0.1%)を画面の真ん中に立たせて撮る / rb=🌈虹のゾンビ */
     :TTL?('META.tr0=1;META.pts=4820;META.gem=17;META.hmat=64;updLabBtn();'
       /* ⚠ほかの行進を消してから置く=隣のゾンビと重なって形が読めない */
       +(OPT.indexOf('lob')>=0?'setTimeout(function(){PAR.length=0;PAR.push({zi:LB_ZI,x:innerWidth*.3,sp:0,ph:1,ht:0,hp:LB_HP,kb:0,fl:0,lb:1});},300);':'')
       +(OPT.indexOf('rbz')>=0?'setTimeout(function(){PAR.length=0;PAR.push({zi:5,x:innerWidth*.3,sp:0,ph:1,ht:0,hp:RB_HP,kb:0,fl:0,rb:1});},300);':'')
       /* bus=🚌ゾンビバス(0.001%・8発・💎100)。⚠行進canvasが高くなるので上が切れていないか見ること。
          busn=残りHP(窓の手が減っていく所を撮る) */
       +(OPT.indexOf('bus')>=0?('setTimeout(function(){PAR.length=0;PAR.push({zi:-1,x:innerWidth*.3,sp:0,ph:1,ht:0,hp:'
         +((/busn=(\d+)/.exec(OPT)||[0,''])[1]||'BUS_HP')+',kb:0,fl:0,bus:1});},300);'):'')
       +(OPTM?'optRender();document.getElementById("md-opt").classList.add("on");':''))
     :TRH?('META.tr0=1;META.hmat=88;META.hero={hNox:1,hSf:1,hMed:2,hCop:1};META.hlv={hNox:3,hSf:10};META.hxp={hNox:120};'
       /* 図鑑タブ(trzoo)は、半分ぐらい発見済みの状態で撮る */
       +'META.zdex={};ZOMBIES.forEach(function(z,i){if(i%2===0)META.zdex[z.id]=1;});'
       +'META.rpg={lv:{hNox:12,hSf:7,hMed:5,hCop:3},xp:{hNox:60},pt:["hNox","hSf","hMed","hCop"],gold:1240,cl:{a0:1,a1:1}};'
       +'META.sc=[[1,1,1,1,1,1],[1,1,1,0,0,0]];'
       +'TRTAB="'+(OPT.indexOf('trzoo')>=0?'zoo':OPT.indexOf('trhero')>=0?'hero':'adv')+'";renderTrain();document.getElementById("md-train").classList.add("on");')
     :RPG?('META.tr0=1;META.hero={hNox:1,hSf:1,hMed:1,hCop:1,hBomb:1,hSeer:1};'
       +'META.sc=[[1,1,1,1,1,1],[1,1,1,1,1,1]];META.stg=1;'
       +'rgOpen();rgMeta().gold=1240;rgMeta().it={herb:6,herb2:2,water:3,wing:1};'
       +(RPGK==='f'||RPGK==='b'?'rgEnter("a2");':'')
       +(RPGK==='b'?'rgBattle([rgFoe(0,rgArea("a2")),rgFoe(4,rgArea("a2")),rgFoe(2,rgArea("a2"))],false);'
         +'RG.bt.ph="cmd";RG.bt.si=0;':'')
       +(RPGK==='g'?'RG.md={k:"gate"};':'')
       +(RPGK==='s'?'RG.md={k:"stat"};':'')
       +'RG.fade=0;rgStep(0.02);')
     :SFXT?'openSfxTest();'
     /* ⚠**pose= と grid= は戦闘を始めない**(タイトルのまま)。既定の `startSolo()` に落ちると
        仮想時間ぶんの試合が丸ごと走って**撮影が1分以上終わらない**(実際に何度も固まった)。
        どちらも canvas を全面に被せて絵を並べるだけなので盤面は要らない。 */
     :ARN?('var ui9=UNITS.findIndex(function(q){return q.id==="'+ARN[1]+'";});'
       +'var zi9=ZOMBIES.findIndex(function(q){return q.id==="'+ARN[2]+'";});'
       +'if(ui9<0)throw new Error("兵科 '+ARN[1]+' が無い");'
       +'if(zi9<0)throw new Error("敵 '+ARN[2]+' が無い");'
       +'startTst();'
       /* ⭐arnh を付けると上の帯を🦸英雄側にして撮る(2026-08-01に切り替えを足した) */
       +(OPT.indexOf('arnh')>=0?'TSTBAR="h";buildZbar();':'')
       /* ⚠検証場は**押した時だけ出る**ようになった(2026-07-30)ので、撮影側で出してやる。
          味方は1.1秒おきに3体、敵は1.5秒おきに出す(自動で湧いていた頃と同じ絵になる) */
       +'var U9=UNITS[ui9];'
       +'window.tstPut9=function(q9){var m9=G.players[0];'
       +'if(q9%45===0)tstSpawnZ(zi9);'                       /* 敵=1.5秒おき */
       +'if(q9%33===0&&q9<99){if(U9&&U9.hro)tstHero(ui9);'
       +'else{m9.ucd[ui9]=0;deployUnit(m9,ui9);}}};'          /* 味方=1.1秒おきに3体 */
       /* ⚠**ヘッドレスの仮想時間では rAF がほとんど回らない**(💎召集で踏んだのと同じ)。
          撮る前に tstStep を直に回して時間を進める。arn=秒数 で長さを変えられる */
       +'for(var q9=0;q9<'+Math.round((+((/arn=(\d+)/.exec(OPT)||[0,'14'])[1]))*30)+';q9++)'
       +'{try{tstPut9(q9);tstStep(1/30);}catch(e){document.title="TSTERR "+e.message;break;}}')
     :(ARTM||GRID)?''
     /* gacha=10連の演出 / gacha5=★5を引いた状態で撮る(いちばん派手な絵を確かめる用) */
     :GC?('META.gem=200;'
       /* gowned=★5まで持っている状態(目玉が下のレア度に降りた時の絵を確かめる用) */
       +(OPT.indexOf('gowned')>=0?'META.hero={};HEROES.forEach((h,i)=>{if(i>0)META.hero[h.id]=1;});':'')
       +'renderGacha(null);document.getElementById("md-gacha").classList.add("on");'
       /* gopen=召集画面を開いただけの姿 / gdex=📖英雄図鑑 / grate=確率 */
       +(OPT.indexOf('gdex')>=0?'gcView("dex");':'')
       +(OPT.indexOf('grate')>=0?'gcView("rate");':'')
       +((OPT.indexOf('gopen')>=0||OPT.indexOf('gdex')>=0||OPT.indexOf('grate')>=0)
         /* ⚠gspin=N は**何人目を正面にするか**(2026-07-30にスワイプ操作へ作り替えたので秒数ではない) */
         ?('if(GCV==="home"){gcHomeFit();gcHomeStep(0.016);GCH.idx='+((/gspin=(\d+)/.exec(OPT)||[0,'0'])[1])
           +';for(var q9=0;q9<40;q9++)gcHomeStep(0.05);}'):'gcPull(10);')+''
       +(OPT.indexOf('gacha5')>=0
         ?'if(GC){GC.res[0]={hero:HEROES[HEROES.length-1],txt:"NEW!"};GC.best=5;}':'')
       /* ⭐期待度の演出を狙って撮る(2026-07-30)。
          gnight/gmorn=背景の朝夜 / gfc=0..2 で「撃て!」の文字色(白/赤/虹) /
          glob=的が✨黄金のロブスター / gtwist=どんでん返し(しょぼい見た目から始まる) /
          ggold=金色に変わっていく途中 */
       +(OPT.indexOf('gtwist')>=0?'if(GC){GC.twist=1;GC.lob=0;GC.tw=GC.zk=0;GC.fc=0;GC.night=false;GC.best=Math.max(4,GC.best);}':'')
       +(OPT.indexOf('glob')>=0?'if(GC){GC.lob=1;GC.twist=0;GC.tw=GC.zk=2;GC.fc=2;GC.night=true;GC.best=5;}':'')
       +(OPT.indexOf('gnight')>=0?'if(GC){GC.night=true;}':'')
       +(OPT.indexOf('gmorn')>=0?'if(GC){GC.night=false;}':'')
       +((/gfc=(\d)/.exec(OPT))?('if(GC){GC.fc='+(/gfc=(\d)/.exec(OPT))[1]+';}'):'')
       /* ggold=金色の個体がせり上がった所 / gtwgib=その手前(まず普通に爆散する所) */
       +(OPT.indexOf('ggold')>=0?'if(GC){GC.ph="fire";GC.t=GC_FLY+GC_HOLD+GC_TWIST*.8;GC.hit=1;}':'')
       +(OPT.indexOf('gtwgib')>=0?'if(GC){GC.ph="fire";GC.t=GC_FLY+GC_HOLD+GC_TWIST*.3;GC.hit=1;}':'')
       /* ⚠ヘッドレスの仮想時間ではrAFがほとんど回らず、いつまでも魔法陣のまま。
          カードの絵を撮りたい時は段階を直に進める(gcard=カード / gburst=炸裂) */
       +(OPT.indexOf('gcard')>=0?'if(GC){GC.ph="card";GC.t=.42;}':'')
       +(OPT.indexOf('gaim')>=0?'if(GC){GC.ph="aim";GC.t=.2;}':'')
       /* gres=召集結果の別ウィンドウ(アイコンの一覧)を撮る */
       +(OPT.indexOf('gres')>=0?'gcEnd();':'')
       /* gfly=弾が飛んでいる途中 / gbang=木っ端みじん+跡地の示唆 */
       +(OPT.indexOf('gfly')>=0?'if(GC){GC.ph="fire";GC.t=GC_FLY*.55;}':'')
       +(OPT.indexOf('gbang')>=0?'if(GC){GC.ph="fire";GC.t=GC_FLY+GC_HOLD+.75+(GC.twist?GC_TWIST:0);GC.hit=1;GC.hit2=1;}':'')
       /* gchg=溜め(押してから撃つまで) / ghold=着弾で止めている一瞬 */
       +(OPT.indexOf('gchg')>=0?'if(GC){GC.ph="chg";GC.t=GC_CHG*.8;}':'')
       +(OPT.indexOf('ghold')>=0?'if(GC){GC.ph="fire";GC.t=GC_FLY+GC_HOLD*.5;GC.hit=1;}':'')
       /* gt0/gt1/gt2 でタレットの段(ライフル/ショットガン/レーザー)を指定。
          ⚠オプション名に「w+数字」を入れないこと=時間指定 `w(\d+)` に食われる(gtw2 で実際に踏んだ) */
       +((/gt(\d)/.exec(OPT))?('if(GC){GC.tw=GC.zk='+(/gt(\d)/.exec(OPT))[1]+';}'):''))
     :VS?'NET.host=true;NET.hostName="キミ";setLMode=0;hostStart();'
     :NB?'META.nmOK=1;setDiff=NM_DIFF;startSolo();'
     /* ⭐bns = 🚌ボーナス面「バスの日」を撮る(st2 と併せるとステージ2の面) */
     :BNS?'setDiff=BNS_D;startSolo();'
     :'setDiff=2;startSolo();')+(NOITR?'showIntro=function(){};':'')+'}catch(e){document.title="ERR "+e.message;}'
 /* ⚠以前は `ZIDS.length` を条件にしていたため、**`t=` を単体で指定すると丸ごと無視されていた**
      (敵を並べずにタワーだけ撮りたい時に、何も建たないまま撮れてしまう)。`t=` だけでも走らせる */
 +((ZIDS.length||TID)?('setTimeout(function(){try{var me=G.players[0];me.zombies.length=0;'
     +'var ids='+JSON.stringify(ZIDS)+';'
     /* t= でタワーも建てる時は、そのタワーの目の前に詰めて並べる(射程・連鎖の確認用) */
     +(TID?'var si0=AI_ORDER[0],base=projPath(SLOTS[si0][0],SLOTS[si0][1]);':'var base=0;')
     +'ids.forEach(function(id,k){var zi=ZOMBIES.findIndex(function(q){return q.id===id;});'
     +'if(zi>=0){var z9=mkZ(zSpec(zi,1,20),'+(TID?'Math.max(20,base-60+k*45)':'PLEN*(.3+k*.18)')+');'
     +(OPT.indexOf('frz')>=0?'if(k%2===0)z9.frzT=99;':'')/* frz=1体おきに凍結させて見比べる */
     +'me.zombies.push(z9);}});'
     +(TID?('var ti9=TOWERS.findIndex(function(q){return q.id==="'+TID+'";});'
       +'me.scrap=99999;'
       /* 支援施設(type:sup)は専用枠にしか建たないので、施設枠へ3種まとめて建てる */
       +'if(TOWERS[ti9].type==="sup"){for(var k9=0;k9<SUP_N;k9++){me.towers[SUP_BASE+k9]=null;buildTower(me,SUP_BASE+k9,T_PLAY+k9);}}'
       /* 廃品工房は工房エリア専用の枠にしか建たない */
       /* 上級廃品工房(grd)は直接は建たない=普通の工房を全部MAXにしてから建て替える */
       +'else if(TOWERS[ti9].type==="eco"){me.towers[ECO_BASE]=null;var pe=me.unlocked;me.unlocked=ti9+1;'
       +'buildTower(me,ECO_BASE,TOWERS[ti9].grd?ECO_TI:ti9);me.unlocked=pe;'
       /* 目的の段(ti9)に届くまで「全部MAX→建て替え」を繰り返す=3段目以降も撮れる */
       +'if(TOWERS[ti9].grd){var tg9=me.towers[ECO_BASE],gu9=0;'
       +'while(tg9&&tg9.ti!==ti9&&gu9++<8){twStats(tg9.ti).forEach(function(s9){tg9.us[s9]=USTAT_MAX;});'
       +'me.scrap=999999;if(!gradeTower(me,ECO_BASE))break;}}'
       +'setInterval(function(){try{var te=me.towers[ECO_BASE];if(te)te.cd=0;}catch(e){}},120);}else{'
       +'var si9=AI_ORDER[0];me.towers[si9]=null;'
       /* ⭐タレットの進化先(grd)も直接は建たない=素のタワーを建てて全部MAXにしてから進化させる */
       +'var b9=TOWERS[ti9].grd?TOWERS.findIndex(function(q){return q.up2===TOWERS[ti9].id;}):ti9;'
       /* 解放数は建てる瞬間だけ上げて戻す(上げっぱなしにすると解放カード周りで画面が止まる) */
       +'var pu9=me.unlocked;me.unlocked=b9+1;buildTower(me,si9,b9);me.unlocked=pu9;'
       +'if(TOWERS[ti9].grd){var tg9=me.towers[si9],gu9=0;'
       +'while(tg9&&tg9.ti!==ti9&&gu9++<8){twStats(tg9.ti).forEach(function(s9){tg9.us[s9]=USTAT_MAX;});'
       +'me.scrap=999999;if(!gradeTower(me,si9))break;}}}'
       +'setInterval(function(){try{var t9=me.towers[AI_ORDER[0]];if(t9)t9.cd=0;'
       +'me.zombies.forEach(function(z){z.hp=z.mhp;});}catch(e){}},80);'):'')
     +'}catch(e){document.title="ERR2 "+e.message;}},1200);'):'')
 +(HID?('setTimeout(function(){try{var me=G.players[0];'
     +(HID==='all'
       ?'me.units.length=0;HEROES.forEach(function(h,k){var ui=HERO_I0+k;'
        +'me.units.push({eid:EID++,ui:ui,own:0,hro:1,am:1,d:PLEN*(.22+k*.05),hp:UNITS[ui].hp,mhp:UNITS[ui].hp,cd:99,hitT:0,ph:k,px:0,py:0});});'
       :'META.hero["'+HID+'"]=1;META.hsel="'+HID+'";me.hUi=hUiOf("'+HID+'");me.hOut=0;'
        +(OPT.indexOf('nodep')>=0?''/* nodep=出撃させずにボタンだけ見る */
          :'heroDeploy(me);me.hCg=1;var hu=me.units.filter(function(u){return u.hro;})[0];if(hu)hu.d=PLEN*.62;'))
     +'updHUD();}catch(e){document.title="ERR3 "+e.message;}},1000);'):'')
 /* 🧍主人公の大写し(⚠実寸でも並べる=25pxで何を持っているか読めるかが本番) */
 +(H0?('setTimeout(function(){try{'
     +'var cvv=document.createElement("canvas");document.body.appendChild(cvv);'
     +'cvv.style.cssText="position:fixed;left:0;top:0;width:100%;height:100%;z-index:9999";'
     +'var c=null;function render(){var W2=window.innerWidth,H2=window.innerHeight,DP=window.devicePixelRatio||1;'
     +'cvv.width=W2*DP;cvv.height=H2*DP;c=cvv.getContext("2d");c.setTransform(DP,0,0,DP,0,0);'
     +'c.fillStyle="#2b2419";c.fillRect(0,0,W2,H2*.54);'
     +'c.fillStyle="#b2a278";c.fillRect(0,H2*.54,W2,H2*.28);'
     +'c.fillStyle=PAPER;c.fillRect(0,H2*.82,W2,H2*.18);'
     +'c.textAlign="left";c.fillStyle=PAPER;c.font="900 15px "+FF;c.fillText("🧍主人公",14,26);'
     +'function put(px,py,mag,tt){c.save();c.translate(px,py);c.scale(mag,mag);'
     +'c.lineWidth=3;c.strokeStyle=INK;try{drawHero0(c,tt,0,Math.sin(tt*10)*.34);}catch(e){}c.restore();}'
     +'for(var k=0;k<4;k++)put(W2*(.14+k*.20),H2*.50,3.2,k*.157);'
     +'for(var k=0;k<4;k++)put(W2*(.14+k*.20),H2*.80,1.6,k*.157);'
     +'for(var k=0;k<8;k++)put(W2*(.12+k*.05),H2*.96,.52,k*.08);'
     +'}render();window.addEventListener("resize",render);'
     +'}catch(e){document.title="ERR16 "+e.message;}},1500);'):'')
 /* 🚌ボーナス面は仮想時間で rAF が回らないので、撮る前に自分で時間を進める */
 /* ⚠⚠**撮る間はコアを落とさない**(2026-08-02(7)に踏んだ)=撮影は読み込みから実際に1分以上かかるので、
    その間に rAF が回って**リザルト画面になってしまい、盤面が1枚も撮れない**
    (bnsn を小さくしても直らない=進んでいるのは仮想時間ではなく実時間の方)。 */
 +(BNS?'setInterval(function(){try{var m9=G&&G.players[0];if(m9){m9.core=m9.coreMax;}}catch(e){}},150);':'')
 /* 🎒⭐**走る前の流れ**(2026-08-02(43))。⚠**指定が無ければ丸ごと飛ばす**=
    そうしないと `bns` の撮影が選択画面で止まって、敵も血だまりも1枚も写らない。 */
 +((BNS&&!BPRE)?('setTimeout(function(){try{'
     /* ⚔装備を全部付けてから走らせる(絵と当たりの両方を実走で見る) */
     +(BEQA?'BEQ.forEach(function(q){META.beq[q.k]=1;});'
       +'if(G.bpre)G.bpre.eq=META.beq;'
       +'if(G.players[0].bus)bupApply(G.players[0].bus,META.bup,META.beq);':'')
     +'bnsPreSkip();'
     +(BEQA?'if(G.players[0].bus)bupApply(G.players[0].bus,META.bup,META.beq);':'')
     +'}catch(e){document.title="ERR18 "+e.message;}},1100);'):'')
 +((BNS&&BPRE)?('setTimeout(function(){try{var Q=G.bpre;if(!Q)throw new Error("bpre なし");'
     /* ⭐bnsmg=⛽給油 / bnsmg2=🏭荷積み / bnsmg3=🏠物色(⚠棟の種類でゲームが変わる) */
     +(BPRE==='mg'?('var kk='+MGK+';var bb=Q.pick.filter(function(q){return (q.ek|0)===kk;})[0]||Q.pick[0];'
       +'bnsMgStart(Q,bb);'
       +'if(kk===0){for(var k=0;k<2;k++){Q.mg.pos=Q.mg.tgt;bnsMgTap(Q,0,0);}}'
       +'else if(kk===1){for(var k=0;k<3;k++){Q.mg.bx=Q.mg.cx+(k?0.03:0);bnsMgTap(Q,0,0);}}'
       +'else{Q.mg.pts=14;Q.mg.run=2;for(var k3=0;k3<3;k3++)bnsMmRound(Q.mg,1);'
        +'for(var k4=0;k4<200&&Q.mg.ph!=="in";k4++)bnsMgStep(Q,.05);'
        +'for(var k5=0;k5<8;k5++)bnsMgStep(Q,.05);var R9=bnsMmRects(cv.width,cv.height);'
        +'bnsMgTap(Q,R9[Q.mg.seq[0]].x+4,R9[Q.mg.seq[0]].y+4);}'
       +'for(var k2=0;k2<24;k2++)bnsPreStep(.02);'):'')
     +(BPRE==='brd'?'Q.res=[120,90,80];Q.left=0;bnsBoardStart();'
       +'for(var k=0;k<70;k++)bnsPreStep(.02);':'')
     /* ⚠**強化画面は物資を持たせて撮る**=素寒貧だと全部灰色の札しか写らない。
        ⭐bnsup=🔧性能の枠 / bnseqp=🚌車体の枠 / bnsgep=🛠艤装の枠(2026-08-02(63)にタブが3つになった) */
     +((BPRE==='up'||BPRE==='eqp'||BPRE==='gep')?'Q.res[0]=150;Q.res[1]=110;Q.res[2]=95;Q.left=0;Q.st="up";'
       +'Q.tab='+(BPRE==='gep'?2:BPRE==='eqp'?1:0)+';Q.up.sp=2;Q.up.ram=1;Q.eq.tire=1;Q.eq.wire=1;Q.eq.blast=1;Q.eq.plate=1;'
       +'if(G.players[0].bus){var B7=G.players[0].bus;bupApply(B7,Q.up,Q.eq);camOn(B7.x,B7.y,.62,BNS_SQ);camApply();}':'')
     +'}catch(e){document.title="ERR17 "+e.message;}},1200);'):'')
 +((BNS&&!BPRE)?('setTimeout(function(){try{var n='+Math.round(BNSN/.05)+';'
     /* 🏚入れる廃墟の前へバスごと移す(⚠カメラはバスを追うので、バスを動かすのが一番確実) */
     +(BENTI>=0?('try{var mB=G.players[0],e8=BENT['+BENTI+'%BENT.length];'
       +'var f8=bnsRoadFit(e8.dx,e8.dy,BUS_CL);'
       +'mB.bus.x=f8?f8[0]:e8.dx;mB.bus.y=f8?f8[1]:e8.dy;mB.bus.vx=0;mB.bus.vy=0;'
       +'if(CAM){CAM.x=CAM.sx=mB.bus.x;CAM.y=CAM.sy=mB.bus.y;}}catch(e8b){}'):'')
     +'for(var k=0;k<n;k++){'
     /* ⚠**群れの中を往復させる**=中央で回らせても敵に当たらず、片道だけだと**マップの端まで
        走り去って**群れも血だまりも画面から消える(どちらも実際に撮って気づいた)。
        敵が湧いてから(k>110=約5.5秒)左上のレーンを3秒ごとに行き来する */
     /* ⚠**2026-08-02(24)から道は縦一直線**=上(次の拠点)へ倒しっぱなしにして、
        少しだけ左右に振る(群れの中を突っ切る絵になる)。 */
     +(BDRV?'try{if(k>40)bnsStick(Math.sin(k/26)*.5,-1);}catch(e9){}':'')
     /* 🔥ニトロ=群れの中を走らせて、終わりの2秒前に撃つ(炎と速度線が乗った所を撮る) */
     /* ⚠bnsdrv と併せた時は**運転を上書きしない**(往復させたまま撃つ) */
     /* ⚠**大群が来ている道へ向かって走らせる**=適当な向きに走らせると群れと一度も出会わず、
        轢き応え(肉片・吹き飛ぶ体・血だまり)が1つも写らない。 */
     +(BNIT?('try{'+(BDRV?'':'if(k>110){var L7=LANES[(G.tide.hotLn!=null?G.tide.hotLn:0)],a7=L7.seg[0].a,'
       +'b7=G.players[0].bus,dx7=a7[0]-b7.x,dy7=a7[1]-b7.y,l7=Math.hypot(dx7,dy7)||1;'
       +'bnsStick(dx7/l7,dy7/l7);}')
       +'if(k===n-40){var m7=G.players[0];m7.bus.nit=1;bnsNitro();}}catch(e7){}'):'')
     /* ⚠⚠**カメラは rAF の中で動く**(gameStep には入っていない)ので、
        自分で時間を進める撮影では**camStep も一緒に回さないとカメラが置いていかれる**
        (バスが画面の外にいる絵になる。2026-08-02(24)に撮って気づいた)。 */
     /* 🏁到着のムービー=**終わりの指定秒ぶん前に始める**(門をくぐる所で撮れる) */
     +(BARR>=0?('try{if(k===Math.max(0,n-'+Math.round(BARR/.05)+')){var m6=G.players[0];bnsArrStart(m6);}}catch(e5){}'):'')
     +'gameStep(.05);try{camStep(.05);}catch(e6){}}'
     +'}catch(e){document.title="ERR15 "+e.message;}},1200);'):'')
 +(DBG?('var _gs=gameStep,_ge=null;gameStep=function(d){try{_gs(d);}catch(e){if(!_ge){_ge=e;}throw e;}};'
     +'setInterval(function(){try{if(_ge){toast("STEPERR "+_ge.message+" @ "+String(_ge.stack).split("\\n")[1]);}}catch(x){}},1600);'
     +'setInterval(function(){try{if(!G){toast("DBG G=null");return;}'
     +'toast("ph="+G.phase+" w="+G.wave+" pool="+G.tide.pool.length+" z="+G.players[0].zombies.length'
     +'+" lead="+Math.round(G.tide.lead)+" P="+PAUSED+" act="+gameActive+" over="+G.over);'
     +'}catch(e){try{toast("DBGERR "+e.message);}catch(x){}}},1500);'):'')
 +((HID&&ULP)?('setTimeout(function(){try{var me=G.players[0];me.hCg=1;'
     +'me.zombies.length=0;for(var k9=0;k9<5;k9++)me.zombies.push(mkZ(zSpec(0,1,10),PLEN*.62-150-k9*40));'
     +'heroUlt(me,10);'
     +'var pin=function(){var hu=(G.players[0].units||[]).filter(function(u){return u.hro;})[0];'
     +'if(hu&&hu.ulW0){hu.ulW=hu.ulW0*(1-'+ULP+');hu.ulT=hu.ulW+.55;}};'
     +'pin();setInterval(pin,60);'
     +'}catch(e){document.title="ERR14 "+e.message;}},1400);'):'')
 +(UID?('setTimeout(function(){try{var me=G.players[0];me.scrap=999999;'
     +'var ui9=UNITS.findIndex(function(q){return q.id==="'+UID+'";});'
     +'if(ui9<0)throw new Error("兵科 '+UID+' が無い");'
     +'var pu9=me.uUn;me.uUn=UNITS.length;'
     +'for(var k9=0;k9<3;k9++){me.ucd[ui9]=0;deployUnit(me,ui9);}me.uUn=pu9;'
     +'var D9=PLEN*.55;me.units.forEach(function(u,i){u.d=D9-i*26;});'
     +'var zi9=ZOMBIES.findIndex(function(q){return !q.boss&&!q.nm&&!q.st;});'
     +'var add9=function(){me.zombies.push(mkZ(zSpec(zi9,1,10),D9-160-Math.random()*80));};'
     +'me.zombies.length=0;for(var k9=0;k9<6;k9++)add9();'
     /* die= を付けない限りゾンビのHPを戻す(倒れると的が消えて攻撃の演出が撮れないため) */
     /* ⭐uchg=0〜1 を付けると**溜めの途中で止めて撮れる**(2026-07-30の攻撃モーション用)。
        ⚠付けないと撃った直後ばかり撮れて、溜めの絵が確かめられない */
     +'setInterval(function(){try{me.units.forEach(function(u){u.cd=0;'
     +((/uchg=([0-9.]+)/.exec(OPT))?('u.chg='+(/uchg=([0-9.]+)/.exec(OPT))[1]+';u.ct=1;'):'')
     +'});'
     +(OPT.indexOf('die')>=0?'':'me.zombies.forEach(function(z){z.hp=z.mhp;});')
     +'while(me.zombies.length<6)add9();}catch(e){}},80);'
     +'}catch(e){document.title="ERR4 "+e.message;}},1200);'):'')
 +(SKID?('setTimeout(function(){try{var me=G.players[0];me.stk="'+SKID+'";'
     +'var zi8=ZOMBIES.findIndex(function(q){return !q.boss&&!q.nm&&!q.st;});'
     +'var add8=function(){me.zombies.push(mkZ(zSpec(zi8,1,10),PLEN*(.42+Math.random()*.12)));};'
     +'me.zombies.length=0;for(var k8=0;k8<8;k8++)add8();'
     /* ⚠飛来物を飛ばす airstrike() だと、ヘッドレスの仮想時間では着弾の瞬間をまず捉えられない
        (撮れるのは飛んでいる途中ばかり)。**着弾処理を直に呼んで**、着弾の絵が常に出ている状態にする */
     +'var n8=0;setInterval(function(){try{while(me.zombies.length<8)add8();'
     +'me.zombies.forEach(function(z){z.hp=z.mhp;z.burnT=0;});'
     /* ⚠画面座標(px)はcampStepでしか入らない。足したばかりの敵はpx=0なので、
        **座標が入っている個体**を選ぶこと(zombies[0]を使うと1発も撃てない) */
     +'var z8=null;for(var i8=0;i8<me.zombies.length;i8++)if(me.zombies[i8].px){z8=me.zombies[i8];break;}'
     +'if(!z8)return;'
     /* ⚠連射すると煙が溜まって画面が真っ白になる。**前の着弾が消えてから**次を撃つ */
     +'var busy8=me.fx.some(function(e){return /^(pool|boomL|dust|ice)$/.test(e.k);});'
     +'if(!busy8){n8++;airstrikeHit(me,z8.px,z8.py,10,"'+SKID+'",true);}}catch(e){}},90);'
     +'}catch(e){document.title="ERR5 "+e.message;}},1300);'):'')
 +(RE2?('setTimeout(function(){try{backTitle();startSolo();'
     +'}catch(e){document.title="ERR10 "+e.message;}},1000);'):'')
 +(IV?('setTimeout(function(){try{var mI=G.players[0];mI.up=9999;mI.scrap=99999;'
     /* ⭐iv=12 のように数字を付けると、そのウェーブの作戦タイムとして撮る(2026-08-02)。
        次の波の性格(🐜物量/🗿重厚)の行はW5以降しか出ないので、これが無いと一生撮れない */
     +(IVW?('G.wave='+IVW+';'):'')
     /* ⚠新登場の紹介モーダル(PAUSED)が上に乗るので、待ってから畳んで開く */
     +'INTROQ.length=0;G.introQ=[];document.getElementById("md-intro").classList.remove("on");PAUSED=false;ivOpen();'
     +'}catch(e){document.title="ERR6 "+e.message;}},1200);'):'')
 +(FXD?('setTimeout(function(){try{var me=G.players[0];me.zombies.length=0;'
     +'var D=[["toss",240,300,{x2:420,y2:300,lf:.3,hi:90,kind:"nade",col:"#7d8a5c",sd:1},.5],'
     +'["toss",240,430,{x2:420,y2:430,lf:.3,hi:90,kind:"bottle",col:"#ffb347",sd:2},.5],'
     +'["toss",240,560,{x2:420,y2:560,lf:.3,hi:90,kind:"ice",col:"#cdf1ff",sd:3},.5],'
     +'["flame",560,300,{ang:0,len:200,col:"#ff9a3d",sd:1},.55],'
     +'["flame",560,470,{ang:0,len:200,col:"#a8e05a",sd:2},.55],'
     +'["ice",900,320,{r:120,sd:1},.35],'
     +'["dust",900,540,{r:150},.35],'
     +'["pool",1240,340,{r:120,sd:1,lf:4.2},.15],'
     +'["shock",1240,560,{r:92,col:"#ffdd66"},.3],'
     +'["corpse",1450,400,{zi:0,el:0,dr:1,lf:1},.55],'
     /* 第66弾: タワーごとの撃ち方 */
     +'["pel",300,660,{x2:620,y2:660,lf:.16,col:"rgba(255,235,150,"},.55],'
     +'["spread",760,690,{ang:0,len:210,col:"rgba(255,235,150,",sd:2},.35],'
     +'["pboom",1400,680,{r:140,sd:3},.30]];'
     /* 毎フレーム作り直して、寿命の途中の姿で止める */
     +'setInterval(function(){try{me.fx.length=0;me.dly=[];'
     +'D.forEach(function(d){var e=Object.assign({k:d[0],x:d[1],y:d[2],t:0,s:""},d[3]);'
     +'e.t=(fxLife(e.k,e))*d[4];me.fx.push(e);});}catch(e){}},16);'
     +'}catch(e){document.title="ERR6 "+e.message;}},1200);'):'')
 +(GRID?('setTimeout(function(){try{'
     /* 実機(852px幅)と同じ縮尺。⚠ウィンドウの大きさで変えない=毎回同じ大きさで見比べるため */
     +'var s0=852/1600;'
     +'var cvv=document.createElement("canvas");document.body.appendChild(cvv);'
     +'cvv.style.cssText="position:fixed;left:0;top:0;width:100%;height:100%;z-index:9999";'
     +'var W2=window.innerWidth,H2=window.innerHeight,DP=window.devicePixelRatio||1;'
     +'cvv.width=W2*DP;cvv.height=H2*DP;var c=cvv.getContext("2d");c.scale(DP,DP);'
     +'c.fillStyle=PAPER;c.fillRect(0,0,W2,H2);'
     +'var K="'+GRID+'",items=[];'
     /* ⭐tw=素のタワーだけ / tg=進化先だけ(2026-07-27)。42種を一度に並べると固まる */
     +'if(K==="tw"){for(var i=0;i<TOWERS.length;i++)if(!TOWERS[i].grd)items.push({n:TOWERS[i].n,i:i});}'
     +'else if(K==="tg"){for(var i=0;i<TOWERS.length;i++)if(TOWERS[i].grd)items.push({n:TOWERS[i].n,i:i});}'
     +'else if(K==="u"){for(var i=0;i<U_N;i++)items.push({n:UNITS[i].n,i:i});}'
     +'else if(K==="hero"){for(var i=0;i<HEROES.length;i++)items.push({n:HEROES[i].n,i:HERO_I0+i});}'
     +'else{for(var i=0;i<ZOMBIES.length;i++)items.push({n:ZOMBIES[i].n,i:i});}'
     +'var n=items.length,cols=Math.ceil(Math.sqrt(n*W2/H2*.75)),rows=Math.ceil(n/cols);'
     +'var cw=W2/cols,ch=H2/rows;'
     +'for(var k=0;k<n;k++){var cx=(k%cols)*cw,cy=Math.floor(k/cols)*ch;'
     +'c.save();c.beginPath();c.rect(cx,cy,cw,ch);c.clip();'
     +'c.strokeStyle="rgba(0,0,0,.15)";c.lineWidth=1;c.strokeRect(cx+.5,cy+.5,cw-1,ch-1);'
     +'c.fillStyle=INK;c.font="900 11px "+FF;c.textAlign="left";c.fillText(items[k].n,cx+5,cy+13);'
     /* 左=実寸 / 右=3倍。⚠実寸で見分けが付くかが本番、3倍は細部の壊れを見るため */
     +'var by=cy+ch-8;'
     +'for(var m=0;m<2;m++){var sc=(m?3:1)*s0,px=cx+(m?cw*.62:cw*.22);'
     /* タワーは中心が原点なので、足元が同じ高さに並ぶよう少し持ち上げる */
     +'c.save();c.translate(px,by-(K==="tw"||K==="tg"?22*sc:0));c.scale(sc,sc);c.lineWidth=3;c.strokeStyle=INK;'
     +'try{if(K==="tw"||K==="tg")drawTower(c,items[k].i,0,0,0,-0.55,1.2,{});'
     +'else if(K==="z"){if(typeof PX_ON!=="undefined")PX_ON=false;drawZombie(c,items[k].i,0,0,1,1.2,0,{});if(typeof PX_ON!=="undefined")PX_ON=true;}'
     +'else drawUnit(c,items[k].i,0,0,1,1.2,0,{});}catch(e){}'
     +'c.restore();}'
     +'c.restore();}'
     +'}catch(e){document.title="ERR7 "+e.message;}},1500);'):'')
 /* ⭐pxcmp = 🧪ドット絵の試作を「コード描画と並べて」撮る(2026-07-27 第92弾)。
    ⚠**実寸で並べないと比べる意味が無い**。左=今のコード描画・右=ドット絵。下段は3倍 */
 +(PXC?('setTimeout(function(){try{'
     +'var s0=852/1600;'
     +'var cvv=document.createElement("canvas");document.body.appendChild(cvv);'
     +'cvv.style.cssText="position:fixed;left:0;top:0;width:100%;height:100%;z-index:9999";'
     +'var W2=window.innerWidth,H2=window.innerHeight,DP=window.devicePixelRatio||1;'
     +'cvv.width=W2*DP;cvv.height=H2*DP;var c=cvv.getContext("2d");c.scale(DP,DP);'
     +'c.fillStyle=PAPER;c.fillRect(0,0,W2,H2);'
     +'var zi=ZOMBIES.findIndex(function(q){return q.id==="'+PXID+'";});'
     +'var LB=["今のコード描画","ドット絵の試作"];'
     /* ⚠**行の位置は窓の高さの割合で決めてはいけない**(2026-07-27に踏んだ)。
        x6の絵は実寸の6倍=130pxあるので、割合で置くと**x3の絵がx6の絵に重なって描かれ**、
        「頭に瘤が乗った変な絵」に見える。それを絵の不具合だと思って4回も直しに行った。
        絵の高さ(実寸で約22px)から**下から積み上げて**置くこと。 */
     +'var UH=46,BY=H2*.94;'/* UH=実寸1倍の絵の高さ(px)。55単位x Z.sc x s0 ≒ 46 */
     +'var ROWY={1:BY-6*UH-3*UH-40,3:BY-6*UH-20,6:BY};'
     +'[1,3,6].forEach(function(mag,row){'
     +' [0,1].forEach(function(side){'
     +'  var px=W2*(.25+side*.5),py=ROWY[mag];'
     +'  c.fillStyle=INK;c.font="900 13px "+FF;c.textAlign="center";'
     +'  if(row===0)c.fillText(LB[side],px,H2*.12);'
     +'  c.fillText("x"+mag,px-90,py);'
     +'  PX_ON=!!side;'
     +'  c.save();c.translate(px,py);c.scale(s0*mag,s0*mag);c.lineWidth=3;c.strokeStyle=INK;'
     +'  try{drawZombie(c,zi,0,0,1,1.15,0,{});}catch(e){}c.restore();'
     +' });});'
     +'PX_ON=true;'
     +'}catch(e){document.title="ERR9 "+e.message;}},1500);'):'')
 /* ⭐art= の中身。⚠**撮る直前に resize が飛ぶ**(--screenshot が窓を作り直す)ので、
    描画は関数にまとめて resize でも描き直すこと(でないと真っ白な絵が撮れる) */
 +(ARTM?('setTimeout(function(){try{'
     +'var s0=852/1600;'/* 実機(852px幅)と同じ縮尺 */
     +'var cvv=document.createElement("canvas");document.body.appendChild(cvv);'
     +'cvv.style.cssText="position:fixed;left:0;top:0;width:100%;height:100%;z-index:9999";'
     +'var KD="'+ARTM[1]+'",ID="'+ARTM[2]+'";'
     +'var LS=(KD==="z")?ZOMBIES:UNITS;'
     +'var idx=LS.findIndex(function(q){return q.id===ID;});'
     +'if(idx<0)throw new Error("art: "+ID+" が無い");'
     +'var NM=LS[idx].n;'
     /* ⚠歩行の周期は種類ごとに違う(ゾンビは速いほど速い/部隊は一定)。4コマに割るため周期から出す */
     +'var PER=(KD==="z")?(6.2832/((LS[idx].sp>90)?14:8)):(6.2832/10);'
     +(ARTCHG?('var OCHG={chg:'+ARTCHG+',ct:1};'):'var OCHG={};')
     /* ⚠スイングは**段階を並べないと振れているか分からない**=コマごとに bsw を変える */
     /* ⚠**時間の順に並べる**=振りかぶり→振り出し→当たる瞬間→フォロースルー→構えへ */
     +'var SWSEQ='+(ARTSW?'[.65,.9,.999,.06,.22]':'null')+';'
     /* ⚠必殺の詠唱は [詠唱の進み, 発射の余韻]。進み<0 が「もう撃った」の印。
        ⚠⚠**put の外に置くこと**=中で var 宣言すると外の `(SWSEQ||ULSEQ)` が
          未定義の名前になり、**render がそこで止まって x3 と実寸の段が丸ごと出ない**(実際に踏んだ) */
     +'var ULSEQ='+(ARTUL?'[[.06,0],[.38,0],[.72,0],[1,0],[-1,.88]]':'null')+';'
     +'function put(px,py,mag,tt,dr,k){c.save();c.translate(px,py);c.scale(s0*mag,s0*mag);'
     +'c.lineWidth=3;c.strokeStyle=INK;'
     /* ⚠ヴァルキリーの斬りも同じ枠で撮る(vsw)。vcb=連撃の何発目か */
     /* ⚠汎用の振り(bSwing)は sw と chg が別物なので**専用の並び**で撮る。
        ⚠bSwing は sw>0 の間 chg を見ない=振りかぶりのコマは sw=0 にすること */
     +'var SW2=[[0,.55],[0,1],[.001,0],[.18,0],[.36,0]];'
     +'var oo=ULSEQ?{ulm:1,ulp:ULSEQ[k%5][0],ulr:ULSEQ[k%5][1],chg:ULSEQ[k%5][1],ct:1,mv:0}'
     +':SWSEQ?{bsw:SWSEQ[k%5],vsw:SWSEQ[k%5],sw:SW2[k%5][0],chg:SW2[k%5][1],ct:1,vcb:k%3}:OCHG;'
     +'try{if(KD==="z")drawZombie(c,idx,0,0,dr,tt,0,{});else drawUnit(c,idx,0,0,dr,tt,0,oo);}catch(e){}'
     +'c.restore();}'
     +'var c=null,W2=0,H2=0;'
     +'function render(){'
     +'W2=window.innerWidth;H2=window.innerHeight;var DP=window.devicePixelRatio||1;'
     +'cvv.width=W2*DP;cvv.height=H2*DP;c=cvv.getContext("2d");c.setTransform(DP,0,0,DP,0,0);'
     /* 背景=夜の地面 / 昼の地面 / 図鑑の紙。⚠**3つとも実際に絵が置かれる背景**にする */
     +'c.fillStyle="#2b2419";c.fillRect(0,0,W2,H2*.54);'
     +'c.fillStyle="#6a6154";c.fillRect(0,H2*.54,W2,H2*.28);'
     +'c.fillStyle=PAPER;c.fillRect(0,H2*.82,W2,H2*.18);'
     +'c.textAlign="left";c.fillStyle=PAPER;c.font="900 15px "+FF;'
     +'c.fillText(NM+"  ("+KD+":"+ID+")",14,26);'
     +'c.font="900 11px "+FF;c.fillStyle="rgba(242,236,220,.6)";'
     +'c.fillText("上=x6(暗い地面) / 中=x3(明るい地面) / 下=実寸x1(紙) ／ 左から歩行の4コマ・右端は反転",14,44);'
     /* x6 を4コマ+反転1体。⚠ベースラインを揃える(絵の原点は足元) */
     +'for(var k=0;k<4;k++)put(W2*(.12+k*.20),H2*.50,6,k*PER/4,1,k);'
     +'put(W2*.92,H2*.50,6,PER*.25,(SWSEQ||ULSEQ)?1:-1,4);'
     /* x3 を4コマ */
     +'for(var k=0;k<4;k++)put(W2*(.12+k*.20),H2*.80,3,k*PER/4,1,k);'
     +'put(W2*.92,H2*.80,3,PER*.25,(SWSEQ||ULSEQ)?1:-1,4);'
     /* 実寸。⚠**ここで見分けが付くかが本番** */
     +'for(var k=0;k<8;k++)put(W2*(.10+k*.055),H2*.96,1,k*PER/8,1,k);'
     +'c.fillStyle="rgba(0,0,0,.55)";c.font="900 11px "+FF;'
     +'c.fillText("実寸(実機での見え方)",14,H2*.99);'
     +'}'
     /* ⚠**setInterval で描き直し続けてはいけない**=`--virtual-time-budget` の仮想時間では
        タイマーが積まれ続けて budget を食い切るまで進まず、撮影が終わらない(実際に固まった)。
        撮る直前の resize には**リスナーだけ**で足りる。 */
     +'render();window.addEventListener("resize",render);'
     +'}catch(e){document.title="ERR11 "+e.message;}},1500);'):'')
 /* intro / intro=t|u|z = 新登場の紹介モーダルを出して撮る(姿が枠いっぱいに出るかの確認用) */
 +(INTRO?('setTimeout(function(){try{showIntro([{k:"'+INTROK+'",i:'+(INTROK==='t'?15:INTROK==='z'?12:20)+'}]);}'
     +'catch(e){document.title="ERR8 "+e.message;}},1400);'):'')
 +(INTRO?'':'setTimeout(function(){try{var g=0;while(typeof PAUSED!=="undefined"&&PAUSED&&g++<40)introNext();}catch(e){}},900);')
 /* ⭐bmenu = 🔨建設メニューを**タワーを全部解放した状態**で開いて撮る(2026-08-01)。
    ⚠これが無いと「解放が進むとパネルが画面より高くなる」不具合を撮って確かめられない。
    ⚠resize で closeBM されるので、tutbm と同じく開き直し続ける。 */
 +(OPT.indexOf('bmenu')>=0?('setTimeout(function(){try{var m9=G.players[0];'
     +'m9.scrap=99999;m9.unlocked=TOWERS.length;'
     +'var s9=-1;for(var k9=0;k9<ECO_BASE;k9++){if(!m9.towers[k9]){s9=k9;break;}}'
     +'if(s9<0)s9=0;if(m9.slk)m9.slk[s9]=true;'
     +'openBM(s9);window.addEventListener("resize",function(){try{openBM(s9);}catch(e){}});'
     +'setInterval(function(){try{if(document.getElementById("buildmenu").style.display!=="block")openBM(s9);}catch(e){}},120);'
     +'}catch(e){document.title="ERR12 "+e.message;}},1300);'):'')
 +'},200);</scr'+'ipt>';
const tmp=path.join(os.tmpdir(),'dt_shot_'+W+'x'+H+(PC?'_pc':'')+'.html');
fs.writeFileSync(tmp,html.replace('</body>',inj+'</body>'));
const args=['--headless=new','--disable-gpu','--no-sandbox',
 '--force-device-scale-factor=2','--window-size='+W+','+H,'--virtual-time-budget='+WAIT,
 /* edit=マス編集モード / dev=🛠DEVモード(全開放の見た目を確かめる)で撮る */
 '--screenshot='+OUT,'file:///'+tmp.replace(/\\/g,'/')
  +(OPT.indexOf('edit')>=0?'?edit=1':OPT.indexOf('dev')>=0?'?dev=1':'')];
const r=cp.spawnSync(BR,args,{encoding:'utf-8'});
console.log((r.stderr||'').split('\n').filter(l=>/written to file|ERROR/.test(l)).join('\n')||'(出力なし)');
console.log('→ '+OUT+'  '+W+'x'+H+' / '+(PC?'PC用CSS':'スマホ用CSSを強制適用')+' / 実寸の2倍で撮影');
