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
const LM=/lab(?:=([a-z]+))?/.exec(OPT);/* lab / lab=line = 🔬研究所の指定タブを開いた状態で撮る */
const LAB=!!LM,LABT=(LM&&LM[1])||'new';
const LDM=/load(?:=([a-z]+))?/.exec(OPT);/* load / load=am = 🎖編成の指定タブ */
const LOAD=!!LDM,LOADT=(LDM&&LDM[1])||'base';
const TRH=OPT.indexOf('trhome')>=0;/* trhome = 🏋鍛錬所のモーダル */
const SFXT=OPT.indexOf('sfx')>=0;/* sfx = 🔊音の確認の画面 */
const TTL=OPT.indexOf('title')>=0;/* title = タイトル画面をそのまま撮る */
/* 例 z=fBeast,nmHorr = その敵だけを経路上に並べて撮る(見た目の確認用) */
const ZM=/z=([A-Za-z0-9,]+)/.exec(OPT),ZIDS=ZM?ZM[1].split(','):[];
/* 例 t=rail = そのタワーを最初の枠に建てて撃たせ続ける(発射エフェクトを撮るため)
   ⚠発射の瞬間しか出ないエフェクト(電撃の連鎖など)は、ヘッドレスの仮想時間の進み方しだいで
     写らないことがある。写らなければ w の値を変えて数回撮る。最終確認は実機で。 */
const TM=/t=([A-Za-z]+)/.exec(OPT),TID=TM?TM[1]:'';
/* ⚔冒険(育成RPG): rpg=拠点の町 / rpgf=エリアのフィールド / rpgb=戦闘 / rpgg=門(エリア選択) / rpgs=つよさ */
const RPM=/rpg([a-z]?)/.exec(OPT),RPG=!!RPM,RPGK=RPM?RPM[1]:'';
/* 例 hero=hNox = その英雄を出撃させて撮る / hero=all = 英雄11人を経路上に並べて撮る */
const HM=/hero=([A-Za-z]+)/.exec(OPT),HID=HM?HM[1]:'';
/* 例 u=grn = その兵科を3体出して、目の前にゾンビを湧かせ続ける(攻撃と撃破の演出を撮るため)
   ⚠ゾンビは倒されたら補充されるので、投擲の軌道・炎・死体がいつでも画面に出ている状態になる */
const UM=/u=([A-Za-z0-9]+)/.exec(OPT),UID=UM?UM[1]:'';
/* 例 stk=napalm = その砲撃を繰り返し撃ち込む(着弾の演出を撮るため。air/mgun/carpet/frost/napalm) */
const SKM=/stk=([a-z]+)/.exec(OPT),SKID=SKM?SKM[1]:'';
/* fxdemo = 新しい演出を1つずつ並べて、寿命の途中の姿で止めて撮る(絵そのものを確かめる用)
   ⚠一瞬しか出ない演出は実戦の撮影ではまず捉えられないので、こうして並べて見る */
const FXD=OPT.indexOf('fxdemo')>=0;
const inj=(PC?'':'<style>'+coarseCSS(html)+'</style>')
 +'<scr'+'ipt>setTimeout(function(){try{'
 /* ステージ2以降は「前のステージをナイトメアでクリア」が条件なので、撮影用に全部クリア済みにする */
 +(ST?('META.sc=[[1,1,1,1,1,1],[1,1,1,1,1,1]];META.sclr=[1,1,1];META.stg='+(+ST[1]-1)+';'):'')
 +(LAB?('META.pts=99999;META.nt=2;META.nu=3;META.sc0=1;META.st.push("frost");LABTAB="'+LABT+'";renderLab();document.getElementById("md-lab").classList.add("on");')
     :LOAD?('META.uv=VARLIST.slice(0,10).map(function(x){return x.v.id;});META.am=2;LDTAB="'+LOADT+'";renderLoad();document.getElementById("md-load").classList.add("on");')
     :TTL?'META.tr0=1;META.pts=4820;META.gem=17;META.hmat=64;updLabBtn();'
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
     /* gacha=10連の演出 / gacha5=★5を引いた状態で撮る(いちばん派手な絵を確かめる用) */
     :GC?('META.gem=200;renderGacha(null);document.getElementById("md-gacha").classList.add("on");gcPull(10);'
       +(OPT.indexOf('gacha5')>=0
         ?'if(GC){GC.res[0]={hero:HEROES[HEROES.length-1],txt:"NEW!"};GC.best=5;}':'')
       /* ⚠ヘッドレスの仮想時間ではrAFがほとんど回らず、いつまでも魔法陣のまま。
          カードの絵を撮りたい時は段階を直に進める(gcard=カード / gburst=炸裂) */
       +(OPT.indexOf('gcard')>=0?'if(GC){GC.ph="card";GC.t=.42;}':'')
       +(OPT.indexOf('gaim')>=0?'if(GC){GC.ph="aim";GC.t=.2;}':'')
       /* gres=召集結果の別ウィンドウ(アイコンの一覧)を撮る */
       +(OPT.indexOf('gres')>=0?'gcEnd();':'')
       /* gfly=弾が飛んでいる途中 / gbang=木っ端みじん+跡地の示唆 */
       +(OPT.indexOf('gfly')>=0?'if(GC){GC.ph="fire";GC.t=GC_FLY*.55;}':'')
       +(OPT.indexOf('gbang')>=0?'if(GC){GC.ph="fire";GC.t=GC_FLY+.75;GC.hit=1;}':'')
       /* gt0/gt1/gt2 でタレットの段(ライフル/ショットガン/レーザー)を指定。
          ⚠オプション名に「w+数字」を入れないこと=時間指定 `w(\d+)` に食われる(gtw2 で実際に踏んだ) */
       +((/gt(\d)/.exec(OPT))?('if(GC){GC.tw=GC.zk='+(/gt(\d)/.exec(OPT))[1]+';}'):''))
     :VS?'NET.host=true;NET.hostName="キミ";setLMode=0;hostStart();'
     :NB?'META.nmOK=1;setDiff=NM_DIFF;startSolo();'
     :'setDiff=2;startSolo();')+'}catch(e){document.title="ERR "+e.message;}'
 +(ZIDS.length?('setTimeout(function(){try{var me=G.players[0];me.zombies.length=0;'
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
       +'else if(TOWERS[ti9].type==="eco"){me.towers[ECO_BASE]=null;var pe=me.unlocked;me.unlocked=ti9+1;'
       +'buildTower(me,ECO_BASE,ti9);me.unlocked=pe;'
       +'setInterval(function(){try{var te=me.towers[ECO_BASE];if(te)te.cd=0;}catch(e){}},120);}else{'
       +'var si9=AI_ORDER[0];me.towers[si9]=null;'
       /* 解放数は建てる瞬間だけ上げて戻す(上げっぱなしにすると解放カード周りで画面が止まる) */
       +'var pu9=me.unlocked;me.unlocked=ti9+1;buildTower(me,si9,ti9);me.unlocked=pu9;}'
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
     +'setInterval(function(){try{me.units.forEach(function(u){u.cd=0;});'
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
     +'["wave",1030,690,{ang:0,r:220,col:"#c8b4f0"},.45],'
     +'["pboom",1400,680,{r:140,sd:3},.30]];'
     /* 毎フレーム作り直して、寿命の途中の姿で止める */
     +'setInterval(function(){try{me.fx.length=0;me.dly=[];'
     +'D.forEach(function(d){var e=Object.assign({k:d[0],x:d[1],y:d[2],t:0,s:""},d[3]);'
     +'e.t=(fxLife(e.k,e))*d[4];me.fx.push(e);});}catch(e){}},16);'
     +'}catch(e){document.title="ERR6 "+e.message;}},1200);'):'')
 +'setTimeout(function(){try{var g=0;while(typeof PAUSED!=="undefined"&&PAUSED&&g++<40)introNext();}catch(e){}},900);},200);</scr'+'ipt>';
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
