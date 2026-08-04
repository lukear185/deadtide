/* 🔥 塗りの物差し(tool_paint.js) — 2026-08-05(174)ユーザー指示で作った
   ⚠⚠**作った理由**=「重くはないのにスマホが熱くなる」を tool_bench が素通りした。
     あちらは**1コマの時間**の道具。熱さは **1コマで塗ったピクセル数(オーバードロー)** と
     **ラジアルグラデの生成枚数** で決まるので、そこを直接数える。
     ⚠ヘッドレスのソフト描画では**時間には出ない**種類の重さなので、時間ではなく**数**を見る。

   使い方:
     node tool_paint.js          … 盤面の場面ごとに「塗り倍率 / グラデ枚数」を重い順で出す
     node tool_paint.js --check  … 上限を超えたら落ちる(tool_release から呼ぶ)
     node tool_paint.js <HTML>   … 別のHTML(古い版)を測る=前後比較

   見方:
     **塗り倍率** = 1コマで塗った面積 ÷ 画面の面積。**画面を何回塗り直したか**。
     **グラデ** = 1コマで作ったラジアル/線形グラデの枚数。⚠**ここが効く**(canvas 2Dで一番高い部類)。
     ⚠**filter / 影(shadowBlur)は0でなければ即アウト**([[NOTES_絵]]の禁止事項)。

   ⚠⚠**当て方**=①この道具で犯人の節(灯り/塔/敵/演出/ビネット)を絞る
     ②**構造で潰す**(升目でまとめる・頭切りする・焼き込む)③もう一度測って数が減ったか見る。
*/
const fs=require('fs'),path=require('path'),cp=require('child_process');
const ARG=process.argv.slice(2);
const CHECK=ARG.indexOf('--check')>=0;
const TARGET=path.resolve(ARG.find(a=>/\.html$/i.test(a))||'./index.html');
const BROWSERS=['C:/Program Files/Google/Chrome/Application/chrome.exe',
 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'];
const BR=BROWSERS.find(p=>fs.existsSync(p));
if(!BR){console.log('ChromeもEdgeも見つからない');process.exit(1);}
const OUT=path.join(require('os').tmpdir(),'dt_paint.html');
const html=fs.readFileSync(TARGET,'utf-8');

/* ⚠**上限**(1コマあたり)。⚠数字を動かす時は「なぜ増えてよいのか」を必ず書くこと。
   📌グラデ22枚=(173)で見つけた「塔1台につき1枚」の状態。そこへ戻らないための柵。 */
const LIM={grad:32,area:9.0};
/* 📌**いまの実測(2026-08-05(174))**=塗り 7.1〜7.2倍 / グラデ 10〜30枚。
   内訳は **地面 3.2 / ビネット 2.0 / 塔 1.9 / 灯り 0.08**。
   ⚠グラデが多いのは🔥火炎(29.7)と⚡重テスラ(22.9)=燃えている敵と稲妻の灯り(升目で頭切り済み)。
   ⚠**上限は「いまより悪くなったら落ちる」ための柵**。減らせたら**必ず柵も下げる**こと。 */

const SCRIPT=`
var TOWS=["rifle","shot","net","gren","flame","tesla","mortar","sniper","cryo","laser","acid","drone","arty","coil","rail","gat","plasma","fort","medic","scrap"];
var SCN=[];
TOWS.forEach(function(id){SCN.push({n:"塔22台 "+id,mix:[id]});});
SCN.push({n:"兵科20体+塔22",mix:["rifle"],units:20});
SCN.push({n:"英雄+塔22",mix:["hNox"],hero:"hNox",tw:"rifle"});
var R=[];
function snap(){var o={};for(var k in PF.cur)o[k]=PF.cur[k];return o;}
for(var si=0;si<SCN.length;si++){
 var S9=SCN[si];
 try{
  FXLV=2;META.tut=1;META.sc=[[1,1,1,1,1,1],[1,1,1,1,1,1]];META.sclr=[1,1,1];META.stg=1;
  META.hero={};META.hsel="";if(S9.hero){META.hero[S9.hero]=1;META.hsel=S9.hero;}
  setDiff=3;showIntro=function(){};startSolo();
  var g=0;while(typeof PAUSED!=="undefined"&&PAUSED&&g++<60)introNext();
  var me=G.players[0],built=0,mix=S9.tw?[S9.tw]:S9.mix;
  me.scrap=9999999;me.up=99999;
  for(var i=0;i<AI_ORDER.length;i++){var s2=AI_ORDER[i];if(me.towers[s2])continue;
   var id=mix[built%mix.length],ti=TOWERS.findIndex(function(q){return q.id===id;});
   if(ti<0)continue;
   var pu=me.unlocked;me.unlocked=ti+1;try{buildTower(me,s2,ti);built++;}catch(e){}me.unlocked=pu;
   var tw=me.towers[s2];if(tw){twStats(tw.ti).forEach(function(x){tw.us[x]=USTAT_MAX;});}}
  if(S9.hero){me.hUi=hUiOf(S9.hero);me.hOut=0;try{heroDeploy(me);}catch(e){}me.hCg=1;}
  if(S9.units)for(var u9=0;u9<S9.units;u9++){try{me.ucd=[];deployUnit(me,me.team[u9%me.team.length]);}catch(e){}}
  /* 数える。⚠**最初の数コマは焼き込みが走る**ので捨てる */
  var A={area:0,grad:0,fill:0,stroke:0,img:0,filt:0,shad:0},N=0,TG={};
  for(var k=0;k<80;k++){
   while(me.zombies.filter(function(z){return !z.dead;}).length<45){
    me.zombies.push(mkZ(zSpec(ri(0,5),18,20),PLEN*(0.22+Math.random()*0.55)));}
   me.core=me.coreMax;if(S9.hero)me.hCg=1;
   gameStep(0.033);
   for(var q in PF.cur)PF.cur[q]=0;PF.tags={};
   renderCamp(me,k*0.033);
   if(k>=30){for(var q2 in A)A[q2]+=PF.cur[q2]||0;N++;
    for(var tg in PF.tags){if(!TG[tg])TG[tg]=0;TG[tg]+=PF.tags[tg].area;}}
  }
  var cv=document.getElementById('cv'),px=Math.max(1,cv.width*cv.height);
  N=Math.max(1,N);
  var top=Object.keys(TG).map(function(t){return{t:t,a:TG[t]/N/px};})
   .sort(function(x,y){return y.a-x.a;}).slice(0,4)
   .map(function(x){return x.t+' '+x.a.toFixed(2);}).join(' / ');
  R.push([(A.area/N/px).toFixed(2),(A.grad/N).toFixed(1),(A.fill/N).toFixed(0),
   (A.stroke/N).toFixed(0),(A.img/N).toFixed(0),(A.filt/N).toFixed(2),(A.shad/N).toFixed(2),
   S9.n,top].join("\\u0001"));
  try{backTitle();}catch(e){}
 }catch(e){R.push("ERR\\u0001"+S9.n+"\\u0001"+e.message);}
}
document.title=R.join(" || ");
`;
fs.writeFileSync(OUT,html.replace('</body>','<scr'+'ipt>(function(){try{'+SCRIPT+'}catch(e){document.title="ERR "+e.message;}})();</scr'+'ipt></body>'),'utf-8');
console.log('🔥 塗りを数えています(1〜3分)… 対象='+path.basename(TARGET));
/* ⚠**?perf=1 を付けて開く**=計測の仕掛けはそれでしか動かない */
const r=cp.execSync('"'+BR+'" --headless --disable-gpu --window-size=852,393 --dump-dom "file:///'+OUT.replace(/\\/g,'/')+'?perf=1"',{maxBuffer:1e9}).toString();
const m=/<title>([^<]*)<\/title>/.exec(r);
if(!m){console.log('(結果が取れなかった)');process.exit(1);}
const rows=m[1].split(' || ').map(l=>l.split('\u0001'));
rows.sort((a,b)=>parseFloat(b[0])-parseFloat(a[0]));
let bad=[];
console.log('──────── 塗りの重い順(1コマあたり) ────────');
console.log('塗り倍率\tグラデ\t塗\t線\t画\t場面');
for(const c of rows){
 if(c[0]==='ERR'){console.log('ERR\t'+c[1]+'\t'+c[2]);bad.push('ERR '+c[1]);continue;}
 console.log(c[0]+'倍\t'+c[1]+'\t'+c[2]+'\t'+c[3]+'\t'+c[4]+'\t'+c[7]);
 console.log('\t\t\t\t\t  └ '+c[8]);
 if(+c[1]>LIM.grad)bad.push(c[7]+': グラデ '+c[1]+'枚(上限'+LIM.grad+')');
 if(+c[0]>LIM.area)bad.push(c[7]+': 塗り '+c[0]+'倍(上限'+LIM.area+'倍)');
 if(+c[5]>0)bad.push(c[7]+': ctx.filter を '+c[5]+'回/コマ使っている(禁止)');
 if(+c[6]>0)bad.push(c[7]+': shadowBlur を '+c[6]+'回/コマ使っている(禁止)');
}
console.log('──────────────────────────────────────────');
console.log('⚠塗り倍率=1コマで画面を何回塗り直したか / グラデ=ラジアル+線形の生成枚数(一番高い)');
console.log('⚠**時間ではなく数を見る道具**。熱さはここに出る(ヘッドレスの時間には出ない)。');
if(bad.length){
 console.log('');
 for(const b of bad)console.log('❌ '+b);
 if(CHECK)process.exit(1);
}else if(CHECK)console.log('✅ 上限内(グラデ'+LIM.grad+'枚/コマ・塗り'+LIM.area+'倍まで)');
