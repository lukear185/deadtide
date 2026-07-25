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
/* 例 z=fBeast,nmHorr = その敵だけを経路上に並べて撮る(見た目の確認用) */
const ZM=/z=([A-Za-z0-9,]+)/.exec(OPT),ZIDS=ZM?ZM[1].split(','):[];
/* 例 t=rail = そのタワーを最初の枠に建てて撃たせ続ける(発射エフェクトを撮るため)
   ⚠発射の瞬間しか出ないエフェクト(電撃の連鎖など)は、ヘッドレスの仮想時間の進み方しだいで
     写らないことがある。写らなければ w の値を変えて数回撮る。最終確認は実機で。 */
const TM=/t=([A-Za-z]+)/.exec(OPT),TID=TM?TM[1]:'';
const inj=(PC?'':'<style>'+coarseCSS(html)+'</style>')
 +'<scr'+'ipt>setTimeout(function(){try{'
 /* ステージ2以降は「前のステージをナイトメアでクリア」が条件なので、撮影用に全部クリア済みにする */
 +(ST?('META.sc=[[1,1,1,1,1,1],[1,1,1,1,1,1]];META.sclr=[1,1,1];META.stg='+(+ST[1]-1)+';'):'')
 +(GC?'META.gem=200;renderGacha(null);document.getElementById("md-gacha").classList.add("on");gcPull(10);'
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
       +'if(TOWERS[ti9].type==="sup"){for(var k9=0;k9<SUP_N;k9++){me.towers[SUP_BASE+k9]=null;buildTower(me,SUP_BASE+k9,T_PLAY+k9);}}else{'
       +'var si9=AI_ORDER[0];me.towers[si9]=null;'
       /* 解放数は建てる瞬間だけ上げて戻す(上げっぱなしにすると解放カード周りで画面が止まる) */
       +'var pu9=me.unlocked;me.unlocked=ti9+1;buildTower(me,si9,ti9);me.unlocked=pu9;}'
       +'setInterval(function(){try{var t9=me.towers[AI_ORDER[0]];if(t9)t9.cd=0;'
       +'me.zombies.forEach(function(z){z.hp=z.mhp;});}catch(e){}},80);'):'')
     +'}catch(e){document.title="ERR2 "+e.message;}},1200);'):'')
 +'setTimeout(function(){try{var g=0;while(typeof PAUSED!=="undefined"&&PAUSED&&g++<40)introNext();}catch(e){}},900);},200);</scr'+'ipt>';
const tmp=path.join(os.tmpdir(),'dt_shot_'+W+'x'+H+(PC?'_pc':'')+'.html');
fs.writeFileSync(tmp,html.replace('</body>',inj+'</body>'));
const args=['--headless=new','--disable-gpu','--no-sandbox',
 '--force-device-scale-factor=2','--window-size='+W+','+H,'--virtual-time-budget='+WAIT,
 '--screenshot='+OUT,'file:///'+tmp.replace(/\\/g,'/')+(OPT.indexOf('edit')>=0?'?edit=1':'')];/* edit=マス編集モードで撮る */
const r=cp.spawnSync(BR,args,{encoding:'utf-8'});
console.log((r.stderr||'').split('\n').filter(l=>/written to file|ERROR/.test(l)).join('\n')||'(出力なし)');
console.log('→ '+OUT+'  '+W+'x'+H+' / '+(PC?'PC用CSS':'スマホ用CSSを強制適用')+' / 実寸の2倍で撮影');
