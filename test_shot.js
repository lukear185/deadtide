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
/* train = 🏋鍛錬所の洞窟(巣作り中) / trainraid = 侵攻中 / trainres = 結果画面 */
const TRN=OPT.indexOf('train')>=0;
const TRRAID=OPT.indexOf('trainraid')>=0,TRRES=OPT.indexOf('trainres')>=0;
const LM=/lab(?:=([a-z]+))?/.exec(OPT);/* lab / lab=line = 🔬研究所の指定タブを開いた状態で撮る */
const LAB=!!LM,LABT=(LM&&LM[1])||'new';
const LDM=/load(?:=([a-z]+))?/.exec(OPT);/* load / load=am = 🎖編成の指定タブ */
const LOAD=!!LDM,LOADT=(LDM&&LDM[1])||'base';
const TRH=OPT.indexOf('trhome')>=0;/* trhome = 🏋鍛錬所のモーダル */
const TTL=OPT.indexOf('title')>=0;/* title = タイトル画面をそのまま撮る */
/* 例 z=fBeast,nmHorr = その敵だけを経路上に並べて撮る(見た目の確認用) */
const ZM=/z=([A-Za-z0-9,]+)/.exec(OPT),ZIDS=ZM?ZM[1].split(','):[];
/* 例 t=rail = そのタワーを最初の枠に建てて撃たせ続ける(発射エフェクトを撮るため)
   ⚠発射の瞬間しか出ないエフェクト(電撃の連鎖など)は、ヘッドレスの仮想時間の進み方しだいで
     写らないことがある。写らなければ w の値を変えて数回撮る。最終確認は実機で。 */
const TM=/t=([A-Za-z]+)/.exec(OPT),TID=TM?TM[1]:'';
/* 例 hero=hNox = その英雄を出撃させて撮る / hero=all = 英雄11人を経路上に並べて撮る */
const HM=/hero=([A-Za-z]+)/.exec(OPT),HID=HM?HM[1]:'';
const inj=(PC?'':'<style>'+coarseCSS(html)+'</style>')
 +'<scr'+'ipt>setTimeout(function(){try{'
 /* ステージ2以降は「前のステージをナイトメアでクリア」が条件なので、撮影用に全部クリア済みにする */
 +(ST?('META.sc=[[1,1,1,1,1,1],[1,1,1,1,1,1]];META.sclr=[1,1,1];META.stg='+(+ST[1]-1)+';'):'')
 +(LAB?('META.pts=99999;META.nt=2;META.nu=3;META.sc0=1;META.st.push("frost");LABTAB="'+LABT+'";renderLab();document.getElementById("md-lab").classList.add("on");')
     :LOAD?('META.uv=VARLIST.slice(0,10).map(function(x){return x.v.id;});META.am=2;LDTAB="'+LOADT+'";renderLoad();document.getElementById("md-load").classList.add("on");')
     :TTL?'META.tr0=1;META.pts=4820;META.gem=17;META.hmat=64;updLabBtn();'
     :TRH?('META.tr0=1;META.hmat=88;META.hero={hNox:1,hSf:1,hMed:2,hCop:1};META.hlv={hNox:3,hSf:10};META.hxp={hNox:120};'
       +'META.zl={walk:3,run:2,dog:1,arm:2,scr:1,blo:1};META.zc={walk:22,run:9,tank:4,crwl:8,brut:31};'
       +'TRTAB="'+(OPT.indexOf('trzoo')>=0?'zoo':'hero')+'";renderTrain();document.getElementById("md-train").classList.add("on");')
     :GC?'META.gem=200;renderGacha(null);document.getElementById("md-gacha").classList.add("on");gcPull(10);'
     :TRN?('META.tr0=1;META.hmat=99;META.hero={hNox:1,hSf:1};META.hlv={hNox:3};'
       +'META.zl={walk:3,run:2,dog:1,arm:2,scr:1,crwl:1,blo:1,stlk:1,brut:1};META.zc={walk:22,run:9,tank:4};'
       +'renderTrain();trainStart("hNox",1);'
       /* 実時間で掘るのを待たず、見栄えのする盤面(広間2つ+つなぎの坑道)を作ってしまう */
       +'(function(){var d=function(x,y){cvDigAt(x,y,true);};'
       +'for(var y=6;y<=14;y++)for(var x=1;x<=8;x++)d(x,y);'
       +'for(var x=9;x<=19;x++)d(x,10);'
       +'for(var y=7;y<=13;y++)for(var x=19;x<=26;x++)d(x,y);'
       +'for(var x=27;x<=37;x++)d(x,10);'
       +'for(var y=8;y<=14;y++)for(var x=37;x<=44;x++)d(x,y);})();'
       +(TRRAID||TRRES?'cvInvade();':'')
       /* trainflood = 🌊死潮が満ちている所を撮る(本来は第2波から) */
       +(OPT.indexOf('trainflood')>=0?'TR.twMax=3.4;':'')
       /* ⚠1フレームしか進めないと、削った瞬間の採掘レーザーの光条が45本すべて残って画面が縦線だらけになる */
       +'for(var k=0;k<45;k++)cvSpawn();for(var k3=0;k3<8;k3++)trainStep(0.05);'
       /* 侵攻中は少し時間を進めて、英雄が奥へ入った所を撮る */
       +(TRRAID?'for(var k2=0;k2<200;k2++)if(!TR.done)trainStep(0.05);':'')
       +(TRRES?'TR.dmg=5200;TR.waveOK=6;TR.hkill=3;TR.zkill=41;TR.dug=58;trainEnd(true);trainStep(0.001);':''))
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
 +'setTimeout(function(){try{var g=0;while(typeof PAUSED!=="undefined"&&PAUSED&&g++<40)introNext();}catch(e){}},900);},200);</scr'+'ipt>';
const tmp=path.join(os.tmpdir(),'dt_shot_'+W+'x'+H+(PC?'_pc':'')+'.html');
fs.writeFileSync(tmp,html.replace('</body>',inj+'</body>'));
const args=['--headless=new','--disable-gpu','--no-sandbox',
 '--force-device-scale-factor=2','--window-size='+W+','+H,'--virtual-time-budget='+WAIT,
 '--screenshot='+OUT,'file:///'+tmp.replace(/\\/g,'/')+(OPT.indexOf('edit')>=0?'?edit=1':'')];/* edit=マス編集モードで撮る */
const r=cp.spawnSync(BR,args,{encoding:'utf-8'});
console.log((r.stderr||'').split('\n').filter(l=>/written to file|ERROR/.test(l)).join('\n')||'(出力なし)');
console.log('→ '+OUT+'  '+W+'x'+H+' / '+(PC?'PC用CSS':'スマホ用CSSを強制適用')+' / 実寸の2倍で撮影');
