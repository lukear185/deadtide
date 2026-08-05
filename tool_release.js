/* ============================================================================
   🚦 tool_release.js — 出す前の関門(リリースゲート)
   ----------------------------------------------------------------------------
   ⭐**これ1本で「出していいか」が分かる**。検査を決まった順に全部流し、
     1本でも落ちたらそこで止める。⚠**新しい検査は1本も書いていない**=
     既にある5本の「流し忘れ」と「落ちない検査」を潰すだけの道具。

   使い方:
     node tool_release.js            全部流す(既定)
     node tool_release.js --quick    重い実走(test_headless)を飛ばす
     node tool_release.js --accept   いまの⚠件数を「基準」として記録する

   ⚠⚠**この道具が生まれた理由**(2026-08-02(68)に実際に払った代償):
     ① UIを丸ごと作り替えた後に `test_layout.js` を**流し忘れた**。
     ② `test_balance.js` が「⚠3件」と出しながら **exit 0** なので、
        自分のせいか元からかを確かめるために `git stash` する羽目になり、
        さらに stash で index.html が CRLF に化けて戻す作業まで発生した。

   ⭐**落ちない検査の扱い**(`test_layout` / `test_balance`):
     いきなり exit 1 にすると、**元からある⚠3件で毎回赤くなって誰も見なくなる**。
     ⭐そこで**⚠の件数を `release_baseline.json` に記録**しておき、
       **増えた時だけ落とす**。減った時は「基準を更新して」と言うだけ(落とさない)。
     ⚠これが「自分のせいか元からか」を git stash せずに答える仕掛け。

   ⚠**git hook には入れていない**=`.git/hooks` は clone に付いてこないうえ、
     重い検査を入れると `--no-verify` で素通りされて形骸化する(TOOLS.md の警告)。
     入れるなら `--quick`(実走なし・数秒)だけを pre-push に。
   ============================================================================ */
const {spawnSync}=require('child_process');
const fs=require('fs'),path=require('path'),zlib=require('zlib');

const DIR=__dirname;
const NODE=process.execPath;
const BASE_F=path.join(DIR,'release_baseline.json');
const ARG=process.argv.slice(2);
const QUICK=ARG.includes('--quick');
const ACCEPT=ARG.includes('--accept');

/* ⚠**軽い順に並べる**=落ちるなら早く落ちてほしい。実走(headless)は一番最後。
   soft:true = その検査は exit 0 しか返さないので、⚠の件数で判定する。
   flake  = 統計のゆらぎで落ちることが分かっている検査(1回だけ流し直す)。 */
const STEPS=[
 {f:'test_undef.js',  n:'文法+未定義の名前'},
 {f:'test_layout.js', n:'画面の寸法',       soft:true},
 {f:'test_balance.js',n:'数値(hp/atk)',     soft:true},
 {f:'test_sfx.js',    n:'効果音',           heavy:true},
 /* 👁 本物のブラウザで座標を実測する検査(2026-08-03(109)に追加)。
    ⚠⚠**`test_layout.js` では代わりにならない**=あちらはDOMがスタブなので
      「画面からはみ出している」を1件も見つけられず、実機で3回崩れを見逃した。
    ⚠Chrome/Edgeを起動するので少し重い=--quick では飛ばす。基準は release_baseline.json の view_852x393。 */
 {f:'test_view.js',   n:'見た目の実測(852x393)',heavy:true},
 /* 🔥**塗りの量の検査**(2026-08-05(174)に追加)。⚠⚠**時間の検査(tool_bench)では代わりにならない**=
    「重くはないのにスマホが熱くなる」は**塗った面積とグラデの枚数**に出るので、そこに柵を立てる。
    ⚠(173)の「塔1台につき灯り1枚」はこれがあれば通らなかった。⚠Chromeを起動するので --quick では飛ばす。
    ⚠上限は tool_paint.js の LIM。**減らせたら必ず柵も下げる**こと。 */
 {f:'tool_paint.js',  n:'塗りの量(熱さ)',   heavy:true,args:['--check']},
 /* 📌**数字の腐り止め**(2026-08-06(189)に追加)。⚠⚠**「①NMのクリアで8400🧬」という古いコメントを
    信じて配布を3.6倍外した**のがきっかけ。DESIGNの自動の表が古い/`@claim` がズレたら落ちる。
    ⚠依存ゼロ・1秒で終わるので --quick でも流す。 */
 /* 🛡**セーブ移行の門番**(2026-08-06(189)に追加)=昔のセーブの標本を毎回全部通す。
    ⚠⚠**壊れた形の標本で、ゲームが1画面も出ずに死んでいた**のをこれが見つけた。 */
 {f:'test_save.js',   n:'セーブ移行の門番'},
 {f:'tool_nums.js',   n:'数字の腐り止め',   args:['--check']},
 /* 🩺**健康診断**(同上)=空catch・ノートのリンク切れ/迷子・道具の棚卸しが**増えたら**落ちる。
    ⚠**0件を目標にしない**=基準(health_baseline.json)より増えた時だけ。 */
 /* 🎨**色の物差し**(2026-08-06(189)に追加)=読めない組み合わせが増えたら落ちる。⚠0件は目標にしない */
 {f:'tool_look.js',   n:'色の物差し',       args:['--check']},
 {f:'tool_health.js', n:'健康診断',         args:['--check']},
 {f:'test_headless.js',n:'実走(PvE/協力/対戦)',heavy:true,flake:'★4'},
];

/* ⚠**⚠と←の付いた行を数える**=`test_balance` は表の行に「← ○○より弱い」を出し、
   最後に「⚠…3件ある」とまとめる。両方拾って**行数**を件数とする。
   ⚠**行の中身では比べない**=数値を触るたびに文言が動いて、毎回赤くなるだけになる。 */
const warnLines=out=>out.split(/\r?\n/).filter(L=>/[⚠←]/.test(L)&&!/^\s*$/.test(L));

const fmtN=n=>String(n).replace(/\B(?=(\d{3})+(?!\d))/g,',');
/* ⚠**全角は2文字ぶんの幅**=`padEnd` は文字数で数えるので、日本語の名前だと桁が揃わない */
/* ⚠**かなと漢字の範囲を必ず入れる**(落とすと日本語のラベルがまったく揃わない) */
const wide=s=>[...s].reduce((a,c)=>{const u=c.codePointAt(0);
 return a+(((u>=0x1100&&u<=0x115F)||(u>=0x2E80&&u<=0xA4CF)||(u>=0xAC00&&u<=0xD7A3)||
            (u>=0xF900&&u<=0xFAFF)||(u>=0xFE30&&u<=0xFE6F)||(u>=0xFF00&&u<=0xFF60)||
            (u>=0xFFE0&&u<=0xFFE6)||u>0xFFFF)?2:1);},0);
const padW=(s,w)=>s+' '.repeat(Math.max(1,w-wide(s)));

function run(step){
 const t0=Date.now();
 const r=spawnSync(NODE,[path.join(DIR,step.f)].concat(step.args||[]),{cwd:DIR,encoding:'utf8',maxBuffer:64*1024*1024});
 const sec=((Date.now()-t0)/1000).toFixed(1);
 const out=(r.stdout||'')+(r.stderr||'');
 return {code:r.status==null?1:r.status,out,sec};
}

/* ---- 本体 ---- */
let base={};
try{base=JSON.parse(fs.readFileSync(BASE_F,'utf8'));}catch(e){base={};}
const nextBase={};
let bad=null,note=[];

console.log('🚦 リリースゲート'+(QUICK?'(--quick=実走なし)':'')+'  検査 '+
            STEPS.filter(s=>!(QUICK&&s.heavy)).length+'本');
console.log('─'.repeat(60));

for(const s of STEPS){
 if(QUICK&&s.heavy){console.log('⏭  '+padW(s.n,26)+' 飛ばした(--quick)');continue;}
 let r=run(s);
 /* ⚠**既知のゆらぎは1回だけ流し直す**=CLAUDE.md「落ちたらまず もう一度流す」を自動化。
    ⭐**2回目も落ちたら本物**として扱う(黙って握り潰さない)。 */
 if(r.code!==0&&s.flake&&r.out.includes(s.flake)){
  console.log('🎲 '+s.n+' が「'+s.flake+'」で落ちた=既知のゆらぎ。もう一度流す…');
  r=run(s);
  if(r.code===0)note.push('🎲 '+s.f+' は1回目だけ落ちた(統計のゆらぎ)');
 }
 if(r.code!==0){
  console.log('❌ '+padW(s.n,26)+' '+r.sec+'s');
  bad={step:s,out:r.out};break;
 }
 /* 落ちない検査=⚠の件数で見る */
 if(s.soft){
  const W=warnLines(r.out),n=W.length,b=base[s.f];
  nextBase[s.f]=n;
  if(b==null){
   console.log('🆕 '+padW(s.n,26)+' '+r.sec+'s  ⚠'+n+'件(基準がまだ無い)');
   note.push('🆕 '+s.f+' の基準が無い。`node tool_release.js --accept` で記録する');
  }else if(n>b){
   console.log('❌ '+padW(s.n,26)+' '+r.sec+'s  ⚠'+n+'件(基準'+b+'件)=**増えている**');
   bad={step:s,out:W.join('\n'),grew:[b,n]};break;
  }else if(n<b){
   console.log('✅ '+padW(s.n,26)+' '+r.sec+'s  ⚠'+n+'件(基準'+b+'件から減った)');
   note.push('👍 '+s.f+' の⚠が '+b+'→'+n+' に減った。`--accept` で基準を下げる');
  }else{
   console.log('✅ '+padW(s.n,26)+' '+r.sec+'s  ⚠'+n+'件(基準どおり=元からある分)');
  }
 }else{
  console.log('✅ '+padW(s.n,26)+' '+r.sec+'s');
 }
}

/* ---- 重さの差分(⚠単一HTMLなので、ここが膨らむのは直接の害) ---- */
console.log('─'.repeat(60));
try{
 const cur=fs.readFileSync(path.join(DIR,'index.html'));
 const gz=zlib.gzipSync(cur).length;
 let d='';
 const g=spawnSync('git',['show','HEAD:index.html'],{cwd:DIR,encoding:'buffer',maxBuffer:64*1024*1024});
 if(g.status===0&&g.stdout&&g.stdout.length){
  const df=cur.length-g.stdout.length;
  d=' (HEAD比 '+(df>=0?'+':'')+fmtN(df)+')';
 }
 console.log('📦 index.html '+fmtN(cur.length)+' B / gzip '+fmtN(gz)+' B'+d);
}catch(e){console.log('📦 index.html の大きさが読めなかった: '+e.message);}

/* ---- 基準の記録 ---- */
if(ACCEPT){
 const merged=Object.assign({},base,nextBase);
 fs.writeFileSync(BASE_F,JSON.stringify(merged,null,1)+'\n','utf8');
 console.log('📝 基準を記録した → release_baseline.json  '+JSON.stringify(merged));
}

for(const m of note)console.log(m);

if(bad){
 console.log('─'.repeat(60));
 console.log('❌ 止まった: '+bad.step.f+' ('+bad.step.n+')');
 if(bad.grew)console.log('   ⚠が '+bad.grew[0]+'件 → '+bad.grew[1]+'件 に増えた=**今回の変更で増えた分**:');
 const L=bad.out.split(/\r?\n/).filter(x=>x.trim());
 console.log(L.slice(-40).map(x=>'   '+x).join('\n'));
 console.log('─'.repeat(60));
 console.log('🚫 出せない。上を直してからもう一度。');
 process.exit(1);
}
console.log('─'.repeat(60));
console.log('🟢 全部通った。'+(QUICK?'⚠--quick なので実走は見ていない。':'出してよい。'));
console.log('   ⚠**見た目は撮って目視する**(検査は絵を見ていない): node test_shot.js out.png 852 393');
