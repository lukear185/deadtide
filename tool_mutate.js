// 🧨 壊して確かめる検査(tool_mutate.js) — 2026-08-06(189)ユーザー指示で作った
//
// ⚠⚠**作った理由**=このセッションで払った代償が全部「検査は通っていたのに間違っていた」だった。
//   ①`META.nt` に代入しても何も起きないのに、検査は全部グリーンだった
//   ②ステージ2が黙って①に落ちていたのに、検査は「②を測った」と言っていた
//   ③🧬の配布を3.6倍外したのに、誰も落ちなかった
//   ④昔からある test_layout / test_balance の exit(0) 固定も同じ型
//
// ⭐**何をするか**=index.html の数値を**わざと1か所だけ壊して**検査を流す。
//   全部グリーンのままなら「**その数字は誰も見ていない**」＝検査の穴が1つ見つかったということ。
//   ⚠**壊すのは一時ファイル**。index.html は1バイトも触らない。
//
// 使い方:
//   node tool_mutate.js              # git の変更行(HEAD比)にある数値だけを壊す=「今回の変更は守られているか」
//   node tool_mutate.js --all        # index.html 全体から拾う(⚠数が多いので --n で絞る)
//   node tool_mutate.js --pick=RPT_X,ARMOR_CUT,FIRE_VS_ARMOR   # 名前つきの定数だけ
//   node tool_mutate.js --n=30       # 最大件数(既定20)
//   node tool_mutate.js --full       # 実走(数分の試合)も流す。⚠既定は飛ばす(1件4秒→1件40秒)
//
// ⚠**生き残り(SURVIVED)が0件になることを目標にしない**。演出の数値や見た目の座標は
//   検査で落とす物ではない(撮って目視する側)。⭐見るのは「**遊びの数値なのに生き残っている**」もの。

const fs=require('fs');
const {execFileSync,spawnSync}=require('child_process');
const path=require('path');

const NODE=process.execPath;
const SRC='./index.html';
const ARG=process.argv.slice(2).join(' ');
const OPT=k=>{const m=new RegExp('--'+k+'=([^ ]+)').exec(ARG);return m?m[1]:null;};
const HAS=k=>ARG.indexOf('--'+k)>=0;
const MAXN=+(OPT('n')||20);
const FULL=HAS('full');

/* 一時ファイルの置き場(⚠リポジトリを汚さない) */
const TMPDIR=fs.mkdtempSync(path.join(require('os').tmpdir(),'dtmut-'));
const TMP=path.join(TMPDIR,'m.html');
process.on('exit',()=>{try{fs.rmSync(TMPDIR,{recursive:true,force:true});}catch(e){}});

const src=fs.readFileSync(SRC,'utf8');
const lines=src.split('\n');

/* ---- 壊す場所を選ぶ ---- */
/* ⚠**触ってはいけない行**=base64のかたまり・色の16進・絵の座標が並ぶ表。
   壊しても検査が落ちないのが当たり前なので、生き残り一覧をノイズで埋めてしまう。 */
const skipLine=l=>l.length>400||/base64|data:image|#[0-9a-fA-F]{3,6}\b.*#[0-9a-fA-F]{3,6}/.test(l);

function pickFromDiff(){
 let out='';
 try{out=execFileSync('git',['diff','-U0','HEAD','--',SRC],{encoding:'utf8',maxBuffer:1<<28});}catch(e){}
 if(!out.trim()){
  /* 変更が無ければ「直近のコミット」を見る=「さっき入れた物は守られているか」 */
  try{out=execFileSync('git',['diff','-U0','HEAD~1','HEAD','--',SRC],{encoding:'utf8',maxBuffer:1<<28});}catch(e){}
 }
 const ln=[];let cur=0;
 for(const l of out.split('\n')){
  const m=/^@@ .* \+(\d+)(?:,(\d+))?/.exec(l);
  if(m){cur=+m[1];continue;}
  if(l[0]==='+'&&l[1]!=='+'){ln.push(cur);cur++;}
  else if(l[0]!=='-')cur++;
 }
 return ln;
}

/* 数値リテラルを1つ拾う(名前つきの定数を優先) */
const NUMRE=/(?<![\w.$])(\d+\.\d+|\d+)(?![\w.$])/g;
function targetsInLine(i){
 const l=lines[i];if(!l||skipLine(l))return [];
 const out=[];let m;NUMRE.lastIndex=0;
 while((m=NUMRE.exec(l))){
  const v=+m[1];
  /* 0/1 と大きすぎる数(座標や年号)は避ける=壊しても意味を持ちにくい */
  if(!isFinite(v)||v===0)continue;
  if(v>100000)continue;
  out.push({line:i,col:m.index,txt:m[1],val:v});
 }
 return out;
}

let targets=[];
const pick=OPT('pick');
if(pick){
 const names=pick.split(',');
 for(const n of names){
  let found=false;
  for(let i=0;i<lines.length;i++){
   const re=new RegExp('\\b(?:const|let|var)\\s+'+n+'\\s*=\\s*([\\d.]+)');
   const m=re.exec(lines[i]);
   if(m){targets.push({line:i,col:lines[i].indexOf(m[1],m.index),txt:m[1],val:+m[1],name:n});found=true;break;}
  }
  if(!found)console.log('⚠ 見つからない定数: '+n);
 }
}else if(HAS('all')){
 for(let i=0;i<lines.length;i++)targets=targets.concat(targetsInLine(i));
}else{
 const ln=pickFromDiff();
 if(!ln.length){console.log('⚠ 変更行が無い(--all か --pick= を使う)');process.exit(0);}
 for(const n of ln)targets=targets.concat(targetsInLine(n-1));
}

/* 多すぎる時は間引く(端から取ると同じ関数ばかりになるので等間隔で) */
if(targets.length>MAXN){
 const step=targets.length/MAXN,t2=[];
 for(let k=0;k<MAXN;k++)t2.push(targets[Math.floor(k*step)]);
 targets=t2;
}
if(!targets.length){console.log('⚠ 壊せる数値が見つからなかった');process.exit(0);}

/* ---- 壊し方 ---- */
/* ⭐**「効いていれば必ず結果が変わる」大きさ**にする=小さすぎると誤差に埋もれ、
   大きすぎると別の所(NaN・無限ループ)で落ちて「守られている」と誤読する。 */
function mutate(v){
 if(Number.isInteger(v))return v===1?2:(v>=2?Math.round(v*1.6):v+1);
 return +(v*1.6).toFixed(4);
}

/* ---- 検査を1回流す ---- */
function runTests(file){
 const env=Object.assign({},process.env);
 if(!FULL)env.DT_SKIP_RUN='1';
 for(const t of ['test_undef.js','test_headless.js']){
  const r=spawnSync(NODE,[t,file],{encoding:'utf8',env,timeout:600000,maxBuffer:1<<28});
  if(r.status!==0)return {ok:false,by:t};
  if(/FAIL|LOAD FAIL/.test((r.stdout||'')+(r.stderr||'')))return {ok:false,by:t};
 }
 return {ok:true};
}

/* ---- 実行 ---- */
console.log('🧨 壊して確かめる検査  '+targets.length+'件'+(FULL?'(実走あり)':'(実走は飛ばす)'));
console.log('─'.repeat(60));
const t0=Date.now();
const survived=[],killed=[];
for(let k=0;k<targets.length;k++){
 const t=targets[k];
 const l=lines[t.line];
 const nv=mutate(t.val);
 const l2=l.slice(0,t.col)+String(nv)+l.slice(t.col+t.txt.length);
 const out=lines.slice();out[t.line]=l2;
 fs.writeFileSync(TMP,out.join('\n'));
 const r=runTests(TMP);
 const label=(t.name?('['+t.name+'] '):'')+'L'+(t.line+1)+'  '+t.txt+' → '+nv;
 if(r.ok){survived.push({t,nv,label});console.log('  🔴 生き残り  '+label);}
 else{killed.push(label);console.log('  ✅ 落ちた    '+label+'  ('+r.by+')');}
}
console.log('─'.repeat(60));
const sec=Math.round((Date.now()-t0)/1000);
console.log('✅ 落ちた '+killed.length+'件 / 🔴 生き残り '+survived.length+'件  ('+sec+'秒)');
if(survived.length){
 console.log('');
 console.log('🔴 **生き残り**=壊しても誰も気づかなかった数値。');
 console.log('   ⚠**全部潰すのが目的ではない**(演出の数値・絵の座標は撮って目視する側)。');
 console.log('   ⭐見るのは「遊びの数値なのに生き残っているもの」=そこに検査の穴がある。');
 for(const s of survived)console.log('   ・'+s.label+'   '+lines[s.t.line].trim().slice(0,90));
}
process.exit(0);
