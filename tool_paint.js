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
   📌グラデ22枚=(173)で見つけた「塔1台につき1枚」の状態。そこへ戻らないための柵。
   ⭐⭐(185)**グラデは使い回すようにしたので実測0枚**になった=柵を 24→**4** まで下げた
     (1枚でも「毎コマ作る所」が戻ったらすぐ落ちる。作るのは最初の1コマだけなので平均は0.x)。
   ⚠(185)**合成の数え方を直した**=それまで `save→lighter→restore` の restore を数え落としていて
     **本当より少なく出ていた**(加算で塗った面積は逆に多く出ていた)。柵はいまの実測に合わせ直した。 */
const LIM={grad:4,area:9.0,garea:0.6,comp:8};
/* ⭐**合成(globalCompositeOperation の切り替え回数)**も見る=(177)で炎の塔だけ **20回/コマ**あった。
   ⚠GPU側で描画のまとめが毎回切れるので、**時間には出ないのに端末が熱くなる**。
   ⚠潰し方=**同じ合成でまとめて描く**(溜めておいて最後に1回だけ lighter で吐く)。
   ⚠⚠**溜めた物を吐く所は、必ず台数のループの"外"**=中に置くと台数ぶん走って1つも減らない。 */
/* 📌**いまの実測(2026-08-05(185)の手当て後)**=塗り 6.6〜7.6倍 / 枚数 **0.0** / グ塗り 0.06〜0.28 /
   合成 **2〜5回**。内訳は **地面 3.2 / ビネット 2.0(=焼いた絵を貼るだけ) / 演出 1.0 / 塔 0.3〜0.9 / 灯り 0.06〜0.28**。
   📌**(185)で潰した3つ**=①ラジアルグラデを使い回す(46枚→0)②撃たれた敵の白光りをまとめて1回
   ③倒れた死体の白光りをまとめて1回(要塞砲12台+ボスで**合成 11.3→5.5**)。
   ⭐**グ塗りが本命**=(175)でビネットを焼き込みにして **2.0倍ぶんのグラデ塗りが丸ごと消えた**。
   ⚠**上限は「いまより悪くなったら落ちる」ための柵**。減らせたら**必ず柵も下げる**こと。 */

const SCRIPT=`
var TOWS=["rifle","shot","net","gren","flame","tesla","mortar","sniper","cryo","laser","acid","drone","arty","coil","rail","gat","plasma","fort","medic","scrap"];
var SCN=[];
TOWS.forEach(function(id){SCN.push({n:"塔22台 "+id,mix:[id]});});
SCN.push({n:"兵科20体+塔22",mix:["rifle"],units:20});
SCN.push({n:"英雄+塔22",mix:["hNox"],hero:"hNox",tw:"rifle"});
/* 🔥⭐⭐(185)**「12枠MAX+ボスを湧かせ続ける」場面を足した**(ユーザー実機
   「重テスラで熱さテストしたら(ボス出しまくって)熱くなった すぐに」)。
   ⚠⚠**上の普通の場面では出ない**=難易度3の雑魚では**死体も被弾も桁が違う**ので、
     グラデ46枚・合成11回といった山が**丸ごと素通り**していた(実際に素通りしていた)。
   ⭐**🧪検証場の🔥熱さタブと同じ形**にする=実機で熱いと言われた場面がそのまま検査になる。
   ⚠**全部の塔でやると倍の時間が掛かる**ので、火力と演出が濃い塔だけに絞る。 */
["fort","coil","gat","flame","plasma","tesla","gren","arty"].forEach(function(id){
 SCN.push({n:"🔥12枠MAX+ボス "+id,heat:id});});
var R=[];
function snap(){var o={};for(var k in PF.cur)o[k]=PF.cur[k];return o;}
for(var si=0;si<SCN.length;si++){
 var S9=SCN[si];
 try{
  FXLV=2;META.tut=1;META.sc=[[1,1,1,1,1,1],[1,1,1,1,1,1]];META.sclr=[1,1,1];META.stg=1;
  META.hero={};META.hsel="";if(S9.hero){META.hero[S9.hero]=1;META.hsel=S9.hero;}
  var me,built=0,mix=null;
  if(S9.heat){
   /* 🔥(185)🧪検証場の🔥熱さタブと同じ形=12枠にMAXで建てて、ボスを湧かせ続ける */
   startTst();me=G.players[0];
   var th=TOWERS.findIndex(function(q){return q.id===S9.heat;});
   tstFill(th);TSTKEEP="b";
  }else{
   setDiff=3;showIntro=function(){};startSolo();
   var g=0;while(typeof PAUSED!=="undefined"&&PAUSED&&g++<60)introNext();
   me=G.players[0];mix=S9.tw?[S9.tw]:S9.mix;
   me.scrap=9999999;me.up=99999;
   for(var i=0;i<AI_ORDER.length;i++){var s2=AI_ORDER[i];if(me.towers[s2])continue;
    var id=mix[built%mix.length],ti=TOWERS.findIndex(function(q){return q.id===id;});
    if(ti<0)continue;
    var pu=me.unlocked;me.unlocked=ti+1;try{buildTower(me,s2,ti);built++;}catch(e){}me.unlocked=pu;
    var tw=me.towers[s2];if(tw){twStats(tw.ti).forEach(function(x){tw.us[x]=USTAT_MAX;});}}
   if(S9.hero){me.hUi=hUiOf(S9.hero);me.hOut=0;try{heroDeploy(me);}catch(e){}me.hCg=1;}
   if(S9.units)for(var u9=0;u9<S9.units;u9++){try{me.ucd=[];deployUnit(me,me.team[u9%me.team.length]);}catch(e){}}
  }
  /* 数える。⚠**最初の数コマは焼き込みが走る**ので捨てる */
  var A={area:0,garea:0,aarea:0,grad:0,comp:0,fill:0,stroke:0,img:0,filt:0,shad:0},N=0,TG={};
  for(var k=0;k<80;k++){
   /* ⚠**🔥の場面は敵を自分で足さない**=検証場の側が湧かせ続けている(ボスは6体まで) */
   if(!S9.heat)while(me.zombies.filter(function(z){return !z.dead;}).length<45){
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
   .sort(function(x,y){return y.a-x.a;}).slice(0,7)
   .map(function(x){return x.t+' '+x.a.toFixed(2);}).join(' / ');
  R.push([(A.area/N/px).toFixed(2),(A.grad/N).toFixed(1),(A.garea/N/px).toFixed(2),
   (A.aarea/N/px).toFixed(2),(A.comp/N).toFixed(0),(A.filt/N).toFixed(2),(A.shad/N).toFixed(2),
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
console.log('塗り倍率\t枚数\tグ塗り\t加塗り\t合成\t場面');
for(const c of rows){
 if(c[0]==='ERR'){console.log('ERR\t'+c[1]+'\t'+c[2]);bad.push('ERR '+c[1]);continue;}
 console.log(c[0]+'倍\t'+c[1]+'\t'+c[2]+'\t'+c[3]+'\t'+c[4]+'\t'+c[7]);
 console.log('\t\t\t\t\t  └ '+c[8]);
 if(+c[1]>LIM.grad)bad.push(c[7]+': グラデ '+c[1]+'枚(上限'+LIM.grad+')');
 if(+c[0]>LIM.area)bad.push(c[7]+': 塗り '+c[0]+'倍(上限'+LIM.area+'倍)');
 if(+c[4]>LIM.comp)bad.push(c[7]+': **合成の切り替え** '+c[4]+'回/コマ(上限'+LIM.comp+'回)=同じ合成でまとめて描く');
 if(+c[2]>LIM.garea)bad.push(c[7]+': **グラデで塗った面積** '+c[2]+'倍(上限'+LIM.garea+'倍)=全画面のグラデを疑う');
 if(+c[5]>0)bad.push(c[7]+': ctx.filter を '+c[5]+'回/コマ使っている(禁止)');
 if(+c[6]>0)bad.push(c[7]+': shadowBlur を '+c[6]+'回/コマ使っている(禁止)');
}
console.log('──────────────────────────────────────────');
console.log('⚠塗り倍率=1コマで画面を何回塗り直したか / 枚数=グラデの生成数 / **グ塗り=グラデで塗った面積**');
console.log('⚠⚠**本当の熱さは「グ塗り」**=同じ面積でもグラデ塗りは1画素ずつ計算するので桁で高い。');
console.log('　(焼き込みに替えると面積は変わらないが「グ塗り」だけ減る=効いたかはここで見る)');
console.log('⚠加塗り=加算(lighter)で塗った面積 / **合成=合成の切り替え回数**(多いとGPUのまとめが切れて熱い)');
console.log('⚠**時間ではなく数を見る道具**。熱さはここに出る(ヘッドレスの時間には出ない)。');
if(bad.length){
 console.log('');
 for(const b of bad)console.log('❌ '+b);
 if(CHECK)process.exit(1);
}else if(CHECK)console.log('✅ 上限内(グラデ'+LIM.grad+'枚・塗り'+LIM.area+'倍・合成'+LIM.comp+'回/コマまで)');
