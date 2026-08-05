// 🎚 つまみ(tool_tune.js) — 2026-08-06(189)ユーザー指示で作った
//
// ⚠⚠**作った理由**=バランスの数字は**実機で触って決める**しかないのに、
//   いままでは「実機で見る → こちらがコードを書き換える → push → また実機」の往復しかなかった。
//   ⭐**上書き口**と**書き戻し**の2つが揃って初めて「調整の輪」が閉じる。
//   ⚠つまみUIより先に要るのはこの2つ(スライダーだけ作っても値は手でコードへ戻る)。
//
// 使い方:
//   node tool_tune.js                    # つまみの一覧(いまの値/下限/上限/刻み)
//   node tool_tune.js json               # tune.json の雛形を書き出す(既定値入り)
//   node tool_tune.js url tune.json      # 実機で使う ?tune=... のURLを作る
//   node tool_tune.js apply tune.json    # ⭐詰めた値を index.html に**書き戻す**
//   node tool_tune.js apply tune.json --dry   # 書き戻さずに差分だけ見る
//
// ⚠**書き戻しは錨が一意であることを確かめてから**置換する(見つからない/複数なら止める)。
// ⚠**つまみにできない物**=式に埋まった係数(`lineAcc` の中など)・対戦/協力に効く数値。

const fs=require('fs');
const path=require('path');
const CMD=(process.argv[2]||'list').replace(/^--/,'');
const FILE=process.argv[3];
const DRY=process.argv.includes('--dry');
const SRC=path.join(__dirname,'index.html');

/* ---- ゲーム本体を読み込んで TUNE_D を取り出す(test_headless.js と同じ張りぼて) ---- */
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

const html=fs.readFileSync(SRC,'utf8');
const js=html.split('<script>')[1].split('</'+'script>')[0];
const D=new Function(js+'\n;return TUNE_D;')();
const NAMES=Object.keys(D);

function show(){
 console.log('🎚 つまみ  '+NAMES.length+'件');
 console.log('─'.repeat(64));
 for(const n of NAMES){const t=D[n];
  console.log('  '+n.padEnd(16)+' = '+String(t.v).padStart(7)
   +'   ('+t.mn+' 〜 '+t.mx+' / 刻み'+t.st+')');}
 console.log('─'.repeat(64));
 console.log('⭐ 雛形を作る: node tool_tune.js json');
 console.log('⭐ 実機で試す: node tool_tune.js url tune.json  → 出たURLで開く');
 console.log('⭐ 書き戻す  : node tool_tune.js apply tune.json');
}

if(CMD==='list'){show();process.exit(0);}

if(CMD==='json'){
 const o={};for(const n of NAMES)o[n]=D[n].v;
 fs.writeFileSync('tune.json',JSON.stringify(o,null,1));
 console.log('📝 tune.json を書き出した('+NAMES.length+'件)。数字を書き換えてから apply / url へ');
 process.exit(0);
}

if(!FILE||!fs.existsSync(FILE)){console.log('⚠ JSONのファイルを渡す(例: node tool_tune.js apply tune.json)');process.exit(1);}
let J;try{J=JSON.parse(fs.readFileSync(FILE,'utf8'));}catch(e){console.log('⚠ JSONが読めない: '+e.message);process.exit(1);}

if(CMD==='url'){
 /* ⚠**変えた物だけ載せる**=URLは長さの上限があるので、既定と同じ値は落とす */
 const o={};for(const n in J)if(D[n]&&+J[n]!==D[n].v)o[n]=+J[n];
 const b=Buffer.from(JSON.stringify(o),'utf8').toString('base64');
 console.log('🎚 変えたつまみ '+Object.keys(o).length+'件');
 for(const n in o)console.log('   '+n+' '+D[n].v+' → '+o[n]);
 console.log('');
 console.log('https://lukear185.github.io/deadtide/?dev=1&tune='+encodeURIComponent(b));
 console.log('');
 console.log('⚠ 長すぎて開けない時は、実機の画面で localStorage["dt.tune"] に下のJSONを入れる:');
 console.log('   '+JSON.stringify(o));
 process.exit(0);
}

if(CMD==='apply'){
 let src=fs.readFileSync(SRC,'utf8');
 const done=[],skip=[];
 for(const n in J){
  const t=D[n];
  if(!t){skip.push(n+' (そんなつまみは無い)');continue;}
  const v=+J[n];
  if(!isFinite(v)){skip.push(n+' (数字ではない)');continue;}
  if(v===t.v){continue;}
  if(v<t.mn||v>t.mx){skip.push(n+' ('+v+' は範囲外 '+t.mn+'〜'+t.mx+')');continue;}
  /* ⚠**錨は TUNE('名前', の直後の数値**=名前で一意になる。見つからない/複数なら止める */
  const re=new RegExp('(TUNE\\((?:"|\')'+n.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'(?:"|\')\\s*,\\s*)(-?[\\d.]+)','g');
  const hits=src.match(re)||[];
  if(hits.length!==1){skip.push(n+' (錨が'+hits.length+'件=書き戻せない)');continue;}
  src=src.replace(re,'$1'+v);
  done.push(n+' '+t.v+' → '+v);
 }
 console.log('🎚 書き戻し'+(DRY?'(見るだけ)':'')+'  変える '+done.length+'件 / 飛ばす '+skip.length+'件');
 for(const d of done)console.log('  ✅ '+d);
 for(const s of skip)console.log('  ⚠ '+s);
 if(!DRY&&done.length){
  fs.writeFileSync(SRC,src);
  console.log('📝 index.html に書き戻した。⚠**この後に必ず**: node tool_release.js');
  console.log('   ⚠**決めた数字の検査(checkDesignNums)も直す**=チャットで決めた値を変えたなら、そちらも更新する');
 }
 process.exit(0);
}
console.log('知らない命令: '+CMD);
show();
