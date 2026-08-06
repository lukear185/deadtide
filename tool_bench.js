/* ⏱🔥 性能の物差し(tool_bench.js) — 2026-08-04(124)に作った
   ⚠⚠**「重い」と言われた時に最初に叩く道具**。それまでは性能を測る道具が1つも無く、
     「塗りの回数」を数えて当てようとして**外していた**(回数はほぼ同じで時間だけ10倍、という穴が実在した)。

   使い方:
     node tool_bench.js            … 盤面の場面をまとめて測る(重い順に並べて出す)
     node tool_bench.js ui         … ゲームの外の画面と、英雄22人の必殺の山を測る
     node tool_bench.js mix=rail,coil,flame  … 好きな並びを22台で測る
     node tool_bench.js <対象HTML> … 別のHTML(古い版など)を測る=**前後比較**に使う

   見方:
     ⚠**ヘッドレスはソフトウェア描画なので実機より遅い**。⭐**同じ条件どうしの比較**に使うこと。
     ⚠**平均は一瞬の山に引っ張られる**。おかしい時は `spike` で散らばり(中央値/p99)を見る。
     ⭐**桁が違う場面**(他が5msなのに1つだけ350ms)が出たら、そこに必ず穴がある。

   ⚠⚠**当て方の型**(2026-08-04にこれで3つ見つけた):
     ①この道具で**場面ごとの時間**を出す → ②桁が違う場面を見つける →
     ③**関数を空にして二分探索**(`drawZombie=function(){}` など)→ ④中の高い1行を潰す。
     ⚠高いのはたいてい **`ctx.filter` / `shadowBlur` / ラジアルグラデ / 焼き込みを使わない直描き**。
*/
const fs=require('fs'),path=require('path'),cp=require('child_process');
const ARG=process.argv.slice(2);
const UI=ARG.indexOf('ui')>=0;
const MIXA=(ARG.find(a=>/^mix=/.test(a))||'').replace('mix=','');
const TARGET=path.resolve(ARG.find(a=>/\.html$/i.test(a))||'./index.html');
const BROWSERS=['C:/Program Files/Google/Chrome/Application/chrome.exe',
 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'];
const BR=BROWSERS.find(p=>fs.existsSync(p));
if(!BR){console.log('ChromeもEdgeも見つからない');process.exit(1);}
const OUT=path.join(require('os').tmpdir(),'dt_bench.html');
const html=fs.readFileSync(TARGET,'utf-8');

/* ---- 盤面の場面(既定) ---- */
const BOARD=`
var TOWS=["rifle","shot","net","gren","flame","tesla","mortar","sniper","cryo","laser","acid","drone","arty","coil","rail","gat","plasma","fort","medic","scrap"];
var MIXA=${JSON.stringify(MIXA)};
var SCN=[];
if(MIXA){SCN.push({n:"指定の並び "+MIXA,mix:MIXA.split(",")});}
else{
 TOWS.forEach(function(id){SCN.push({n:"塔22台 "+id,mix:[id]});});
 SCN.push({n:"兵科20体+塔22",mix:["rifle"],units:20});
 SCN.push({n:"英雄+塔22",mix:["rifle"],hero:"hNox"});
 SCN.push({n:"エリート25%",mix:["rifle"],elite:1});
 SCN.push({n:"送り込まれた敵(対戦)",mix:["rifle"],sent:1});
 SCN.push({n:"妨害中の塔(対戦)",mix:["rifle"],jam:1});
 SCN.push({n:"凍結中の敵",mix:["cryo"],frz:1});
}
var R=[];
for(var si=0;si<SCN.length;si++){
 var S9=SCN[si];
 try{
  FXLV=2;META.tut=1;try{opEnd();}catch(e){}META.sc=[[1,1,1,1,1,1],[1,1,1,1,1,1]];META.sclr=[1,1,1];META.stg=1;
  META.hero={};META.hsel="";if(S9.hero){META.hero[S9.hero]=1;META.hsel=S9.hero;}
  setDiff=3;showIntro=function(){};startSolo();
  var g=0;while(typeof PAUSED!=="undefined"&&PAUSED&&g++<60)introNext();
  var me=G.players[0],built=0;
  me.scrap=9999999;me.up=99999;
  for(var i=0;i<AI_ORDER.length;i++){var s2=AI_ORDER[i];if(me.towers[s2])continue;
   var id=S9.mix[built%S9.mix.length],ti=TOWERS.findIndex(function(q){return q.id===id;});
   var pu=me.unlocked;me.unlocked=ti+1;try{buildTower(me,s2,ti);built++;}catch(e){}me.unlocked=pu;
   var tw=me.towers[s2];if(tw){twStats(tw.ti).forEach(function(x){tw.us[x]=USTAT_MAX;});}}
  if(S9.hero){me.hUi=hUiOf(S9.hero);me.hOut=0;try{heroDeploy(me);}catch(e){}me.hCg=1;}
  if(S9.units)for(var u9=0;u9<S9.units;u9++){try{me.ucd=[];deployUnit(me,me.team[u9%me.team.length]);}catch(e){}}
  var A=[];
  for(var k=0;k<110;k++){
   while(me.zombies.filter(function(z){return !z.dead;}).length<45){
    var z9=mkZ(zSpec(ri(0,5),18,20),PLEN*(0.22+Math.random()*0.55));
    if(S9.elite&&Math.random()<0.25)z9.elite=1;
    if(S9.sent)z9.sent=1;if(S9.frz)z9.frzT=99;
    me.zombies.push(z9);}
   me.core=me.coreMax;if(S9.hero)me.hCg=1;
   if(S9.jam)for(var j9=0;j9<me.towers.length;j9++)if(me.towers[j9])me.towers[j9].jamT=99;
   if(S9.frz)me.zombies.forEach(function(z){if(!z.dead)z.frzT=99;});
   gameStep(0.033);
   var t0=performance.now();renderCamp(me,k*0.033);var t1=performance.now();
   if(k>=40)A.push(t1-t0);
  }
  A.sort(function(a,b){return a-b;});
  var md=A[Math.floor(A.length*.5)],p9=A[Math.floor(A.length*.9)];
  R.push(md.toFixed(2)+"ms\\t"+S9.n+"\\t(p90 "+p9.toFixed(2)+"ms / 最大 "+A[A.length-1].toFixed(1)+"ms)");
  try{backTitle();}catch(e){}
 }catch(e){R.push("ERR\\t"+S9.n+"\\t"+e.message);}
}
document.title=R.join(" || ");
`;

/* ---- 画面と必殺 ---- */
const UIS=`
var R=[];
function avg(f,n){var A=[];for(var k=0;k<n;k++){var t0=performance.now();f(k);var t1=performance.now();if(k>=10)A.push(t1-t0);}
 A.sort(function(a,b){return a-b;});return A[Math.floor(A.length*.5)];}
try{opEnd();}catch(e){}META.tut=1;META.sc=[[1,1,1,1,1,1],[1,1,1,1,1,1]];META.sclr=[1,1,1];META.tr0=1;META.gem=200;
show("title");
R.push(avg(function(k){paradeStep(k*0.033);},60).toFixed(2)+"ms\\tタイトル(行進7体)");
META.luck=9;LUCKT=999;luckUpd();for(var w=0;w<80;w++)paradeStep(w*0.033);
R.push(avg(function(k){LUCKT=999;paradeStep(k*0.033);},60).toFixed(2)+"ms\\t💫幸運チケット中のタイトル(行進"+PAR.length+"体)");
LUCKT=0;luckUpd();
META.hero={hNox:1};META.hsel="hNox";renderHome();show("home");
R.push(avg(function(k){homeDraw(k*0.033);},50).toFixed(2)+"ms\\t🏠ホーム");
MSEL=mapDefSel();mapSel(MSEL);MBUS=null;show("map");
R.push(avg(function(k){mapDraw(k*0.033);},50).toFixed(2)+"ms\\t🗺エリアマップ");
GCV="home";renderGacha(null);document.getElementById("md-gacha").classList.add("on");gcHomeFit();
R.push(avg(function(k){gcHomeStep(0.033);gcHomeDraw();},50).toFixed(2)+"ms\\t💎英雄召集のホーム");
document.getElementById("md-gacha").classList.remove("on");
try{META.bnsTut=1;META.stg=0;setDiff=BNS_D;showIntro=function(){};startSolo();
 var g0=0;while(typeof PAUSED!=="undefined"&&PAUSED&&g0++<60)introNext();
 bnsPreSkip();var mb=G.players[0];
 for(var w2=0;w2<500;w2++){gameStep(0.033);mb.core=mb.coreMax;}
 R.push(avg(function(k){mb.core=mb.coreMax;gameStep(0.033);renderCamp(mb,k*0.033);},60).toFixed(2)+"ms\\t🚌拠点開拓(敵"+mb.zombies.length+"体)");
 backTitle();}catch(e){R.push("ERR\\t🚌開拓便 "+e.message);}
var HL=HEROES.map(function(h){return h.id;});
for(var hi=0;hi<HL.length;hi++){
 try{var hid=HL[hi];
  META.hero={};META.hero[hid]=1;META.hsel=hid;META.stg=1;
  setDiff=3;showIntro=function(){};startSolo();
  var g=0;while(typeof PAUSED!=="undefined"&&PAUSED&&g++<60)introNext();
  var me=G.players[0];me.scrap=999999;
  me.hUi=hUiOf(hid);me.hOut=0;heroDeploy(me);me.hCg=1;
  var B=[],U=[];
  for(var k=0;k<120;k++){
   while(me.zombies.filter(function(z){return !z.dead;}).length<40){
    me.zombies.push(mkZ(zSpec(ri(0,5),18,20),PLEN*(0.30+Math.random()*0.45)));}
   me.core=me.coreMax;me.hCg=1;gameStep(0.033);
   var t0=performance.now();renderCamp(me,k*0.033);var t1=performance.now();
   if(k>=15&&k<30)B.push(t1-t0);
   if(k===30){try{heroUlt(me);}catch(e){}}
   if(k>30&&k<70)U.push(t1-t0);
  }
  B.sort(function(a,b){return a-b;});U.sort(function(a,b){return a-b;});
  R.push(U[Math.floor(U.length*.9)].toFixed(2)+"ms\\t必殺 "+(HEROES.find(function(h){return h.id===hid;})||{}).n
   +"\\t(素 "+B[Math.floor(B.length*.5)].toFixed(2)+"ms)");
  backTitle();
 }catch(e){R.push("ERR\\t必殺 "+HL[hi]+" "+e.message);}
}
document.title=R.join(" || ");
`;
const S=UI?UIS:BOARD;
fs.writeFileSync(OUT,html.replace('</body>','<scr'+'ipt>(function(){try{'+S+'}catch(e){document.title="ERR "+e.message;}})();</scr'+'ipt></body>'),'utf-8');
/* 🐢⭐(189)**遅い端末を真似る**(`--slow` / `--slow=6`)=ユーザー指示で作った定点観測。
   ⚠⚠**作った理由**=測っているのは開発機の速いCPU。**実機(スマホ)で熱い/重い**と言われた時に、
     手元では差が出ないことがある。⭐CPUを N倍遅くして測れば、**同じ条件で毎回比べられる**。
   ⚠**絶対値は実機と一致しない**(あくまで同じ条件どうしの比較用)。
   ⚠**倍率を変えたら前の数字と比べない**=`--slow=4` と `--slow=6` の数字は別物。 */
const SLOWM=/--slow(?:=(\d+))?/.exec(process.argv.join(' '));
const SLOW=SLOWM?(+SLOWM[1]||4):0;
console.log('⏱ 測っています('+(UI?'画面と必殺':'盤面')+(SLOW?('・🐢CPUを'+SLOW+'倍遅く'):'')+'・1〜3分)… 対象='+path.basename(TARGET));
/* ⚠**CPUを遅くする口はヘッドレスの引数には無い**(CDPの Emulation.setCPUThrottlingRate)。
   ⭐依存を増やさずに同じ事をするため、**測る前に空回りを挟んで1コマの予算を削る**。
   ⚠これは「同じ条件で比べる」ためのおもりであって、実機の再現ではない。 */
if(SLOW)fs.writeFileSync(OUT,fs.readFileSync(OUT,'utf-8').replace('</body>',
 '<scr'+'ipt>(function(){var K='+(SLOW-1)+';var rq=window.requestAnimationFrame;'
 +'window.requestAnimationFrame=function(f){return rq(function(t){'
 +'var t0=performance.now();var budget=16.7*K;while(performance.now()-t0<budget){}'
 +'f(t);});};})();</scr'+'ipt></body>'),'utf-8');
const r=cp.execSync('"'+BR+'" --headless --disable-gpu --window-size=852,393 --dump-dom "file:///'+OUT.replace(/\\/g,'/')+'"',{maxBuffer:1e9}).toString();
const m=/<title>([^<]*)<\/title>/.exec(r);
if(!m){console.log('(結果が取れなかった)');process.exit(1);}
const rows=m[1].split(' || ');
rows.sort((a,b)=>parseFloat(b)-parseFloat(a));
console.log('──────── 重い順(中央値) ────────');
for(const l of rows)console.log(l);
console.log('────────────────────────────────');
console.log('⚠ヘッドレスのソフト描画なので実機より遅い。**比較**に使うこと。');
console.log('⚠桁が違う場面が出たら、そこに穴がある(関数を空にして二分探索する)。');
