// 👊 手応えの計測(test_feel.js) — 2026-08-06(189)ユーザー指示で作った
//
// ⚠⚠**作った理由**=この保管庫の一番痛い教訓は「**検査は全部通っていたのに手応えがゼロ**」
//   (2026-08-02(65) の🪤鉄条網)。**手応えは数値検査で落ちない**ので、
//   せめて**測って並べる**=「この一撃は何msの間・どれだけ揺れて・どれだけ光るのか」を見えるようにする。
//
// ⭐**何を測るか**(相場は下の表)
//   ①ヒットストップ(止まる秒数) ②画面の揺れ(強さと消えるまでの秒数) ③白フラッシュ ④出た演出の数
// ⚠⚠**合否は出さない**(最初は順位だけ出すのが安全=閾値の当てずっぽうが一番の罠)。
//   ⭐使い方は「**強くしたのに数字が動いていない**」「**雑魚1体が最終ボス級に揺れている**」を見つけること。
//
// 使い方:
//   node test_feel.js            # 一覧(手応えの強い順)
//   node test_feel.js --md       # md の表として出す(ノートに貼る用)

const fs=require('fs');
const TARGET=process.argv[2]&&!/^--/.test(process.argv[2])?process.argv[2]:'./index.html';
const MD=process.argv.includes('--md');

/* ---- 張りぼて(test_headless.js と同じ) ---- */
function mkCtx(){return new Proxy({},{get:(t,k)=>{
 if(k==='canvas')return {};
 if(k==='createLinearGradient'||k==='createRadialGradient')return ()=>({addColorStop(){}});
 if(k==='measureText')return ()=>({width:10});
 return typeof k==='string'?()=>{}:undefined;},set:()=>true});}
function mkEl(id){return {id,children:[],classList:{add(){},remove(){},toggle(){},contains:()=>false},
 style:new Proxy({},{get:()=>'',set:()=>true}),dataset:{},disabled:false,
 set innerHTML(v){},get innerHTML(){return ''},set textContent(v){},get textContent(){return ''},
 appendChild(){},remove(){},querySelector:()=>mkEl(id+'_q'),querySelectorAll:()=>[],
 addEventListener(){},getContext:mkCtx,getBoundingClientRect:()=>({left:0,top:0,width:800,height:380}),
 clientWidth:800,clientHeight:380,width:0,height:0,offsetWidth:100,offsetHeight:60,value:'',
 set onclick(f){},get onclick(){return null}};}
const cache={};
global.window=global;
global.document={getElementById:id=>cache[id]||(cache[id]=mkEl(id)),createElement:()=>mkEl('dyn'),
 querySelector:()=>mkEl('q'),querySelectorAll:()=>[],addEventListener(){},
 body:{classList:{add(){},remove(){},toggle(){}}}};
global.innerWidth=800;global.innerHeight=380;global.devicePixelRatio=1;global.navigator={};
{const LS={};global.localStorage={getItem:k=>(k in LS?LS[k]:null),setItem:(k,v)=>{LS[k]=''+v;},
 removeItem:k=>{delete LS[k];},clear:()=>{for(const k in LS)delete LS[k];}};}
let NOW=0;global.performance={now:()=>NOW};
const rafq=[];global.requestAnimationFrame=f=>{rafq.push(f);return rafq.length;};
global.AudioContext=function(){return {state:'running',resume(){},createOscillator:()=>({type:'',frequency:{setValueAtTime(){},exponentialRampToValueAtTime(){}},connect:()=>({connect(){}}),start(){},stop(){}}),createGain:()=>({gain:{setValueAtTime(){},exponentialRampToValueAtTime(){}},connect:()=>({connect(){}})}),destination:{},currentTime:0};};
global.Peer=function(){return {on(){},destroy(){},connect:()=>({on(){},open:false})};};
global.location={search:'',href:'',hash:''};

const html=fs.readFileSync(TARGET,'utf8');
const js=html.split('<script>')[1].split('</'+'script>')[0];

/* ⚠**乱数を種で固定**=測るたびに数字が振れると「強くしたのに動かない」が読めない */
const body=`
(function(){var _s=20260806;Math.random=function(){_s=(_s*1103515245+12345)%2147483648;return _s/2147483648;};})();
function frames(n,step){for(var i=0;i<n;i++){NOW+=step*1000;var q=rafq.splice(0);for(var k=0;k<q.length;k++)q[k](NOW);}}
var R=[];
/* 1つの出来事を起こして、そこから何が出たかを測る */
function feel(name,setup){
 META.stg=0;setDiff=2;startSolo();frames(10,.016);
 var me=G.players[0];
 me.shake=0;me.fx.length=0;me.dly=[];G.hitStopT=0;G.flashT=0;me.zombies.length=0;me.units.length=0;
 try{setup(me);}catch(e){R.push({n:name,err:e.message});backTitle();return;}
 /* ⚠⚠**その場の値だけ見てはいけない**=必殺技は**詠唱してから出る**ので、
    起こした瞬間を測ると22人ぜんぶ0になる(実際に一度そうなった)。
    ⭐**2.5秒ぶん回して、その間の最大**を測る。 */
 var step=1/60,mxShake=0,mxHit=0,mxFx=0,lastShake=0,t=0,kinds={};
 for(var g=0;g<150;g++){
  if((me.shake||0)>mxShake)mxShake=me.shake||0;
  if((G.hitStopT||0)>mxHit)mxHit=G.hitStopT||0;
  if(me.fx.length>mxFx)mxFx=me.fx.length;
  if((me.shake||0)>0.001)lastShake=t;
  for(var i=0;i<me.fx.length;i++)kinds[me.fx[i].k]=1;
  campStep(me,step,G.wave);t+=step;
 }
 R.push({n:name,shake:+mxShake.toFixed(3),shakeMs:Math.round(lastShake*1000),
  hitMs:Math.round(mxHit*1000),fx:mxFx,kinds:Object.keys(kinds).slice(0,6).join('/')});
 backTitle();
}
function putZ(me,id,d){
 var zi=ZOMBIES.findIndex(function(z){return z.id===id;});
 if(zi<0)zi=0;
 var z=mkZ(zSpec(zi,1,10),d==null?PLEN*0.5:d);
 me.zombies.push(z);campStep(me,.001,G.wave);return z;
}
/* --- 撃破 --- */
feel('雑魚を1体倒す',function(me){var z=putZ(me,'walk');z.hp=1;dmgZ(me,z,999,1);});
feel('固い敵を1体倒す',function(me){var z=putZ(me,'tank');z.hp=1;dmgZ(me,z,999,1);});
feel('ボスを倒す',function(me){var z=putZ(me,'jug');z.hp=1;dmgZ(me,z,999999,1);});
/* --- 砲撃 --- */
var STK=['air','mgun','frost','napalm','carpet'];
for(var s9=0;s9<STK.length;s9++)(function(k){
 feel('砲撃 '+(STRIKES[k]?STRIKES[k].n:k),function(me){var z=putZ(me,'walk');airstrikeHit(me,z.px,z.py,10,k,true);});
})(STK[s9]);
/* --- 必殺技(英雄22人) --- */
for(var h9=0;h9<HEROES.length;h9++)(function(H){
 feel('必殺 '+H.n,function(me){
  var ui=hUiOf(H.id);
  META.hsel=H.id;
  me.units.push({eid:EID++,ui:ui,own:0,am:1,hro:H.rk,d:me.flagD,hp:99999,mhp:99999,cd:0,hitT:0,ph:0,px:0,py:0,dr:-1});
  for(var q=0;q<6;q++)putZ(me,'walk',PLEN*(.4+q*.03));
  var u=me.units[me.units.length-1];
  me.hChg=999;heroUlt(me,u);});
})(HEROES[h9]);
/* --- コアに漏れる --- */
feel('コアに1体漏れる',function(me){var z=putZ(me,'walk',2);z.d=0;campStep(me,.02,G.wave);});
/* ⚠**ここで process.exit しない**=外の整形処理まで走らずに終わる(実際に一度そうなった) */
console.log('@@FEEL@@'+JSON.stringify(R));
`;
/* ⚠ゲーム側の console.log を横取りして、結果だけ受け取る */
let RAW=null;
const realLog=console.log;
console.log=(...a)=>{const s=''+a[0];
 if(s.indexOf('@@FEEL@@')===0){RAW=s.slice(8);return;}
 if(/^(LOAD OK|FAIL|LOAD FAIL)/.test(s))realLog(...a);};
let died=null;
try{eval(js+'\n'+body);}catch(e){died=e;}
console.log=realLog;
if(!RAW){console.log('LOAD FAIL: '+(died&&died.message||'結果が返ってこない'));process.exit(1);}
const R=JSON.parse(RAW);
/* ⭐**手応えの強い順**に並べる=「雑魚1体が最終ボス級に揺れている」を見つけるため */
const score=r=>(r.shake||0)*100+(r.hitMs||0)*0.2+(r.fx||0)*0.5;
R.sort((a,b)=>score(b)-score(a));
const pad=(s,n)=>{s=''+s;while(s.length<n)s+=' ';return s;};
const padL=(s,n)=>{s=''+s;while(s.length<n)s=' '+s;return s;};
if(MD){
 console.log('| 出来事 | 揺れ | 揺れの長さ | 止まる | 演出 | 中身 |');
 console.log('|---|---|---|---|---|---|');
 for(const r of R)console.log('| '+r.n+' | '+(r.shake||0)+' | '+(r.shakeMs||0)+'ms | '
  +(r.hitMs||0)+'ms | '+(r.fx||0)+' | '+(r.kinds||'')+' |');
 process.exit(0);
}
console.log('👊 手応えの計測  '+R.length+'件(強い順)');
console.log('⚠**合否は出さない**=見るのは「強くしたのに数字が動かない」「雑魚がボス級に揺れている」');
console.log('─'.repeat(78));
console.log('  '+pad('出来事',26)+padL('揺れ',6)+padL('揺れ ms',9)+padL('止まる',8)+padL('演出',6)+'  中身');
for(const r of R){
 if(r.err){console.log('  '+pad(r.n,26)+'  ⚠ '+r.err);continue;}
 console.log('  '+pad(r.n,26)+padL(r.shake,6)+padL(r.shakeMs,9)+padL(r.hitMs,8)+padL(r.fx,6)+'  '+(r.kinds||''));
}
console.log('─'.repeat(78));
const dead=R.filter(r=>!r.err&&!r.shake&&!r.hitMs&&(r.fx||0)<=1);
if(dead.length){
 console.log('🔴 **何も出ていない** '+dead.length+'件=手応えが1つも無い出来事');
 console.log('   '+dead.map(r=>r.n).join(' / '));
 console.log('   ⚠**必ずしも不具合ではない**(そういう設計の物もある)が、意図しているか一度見ること');
}
process.exit(0);
