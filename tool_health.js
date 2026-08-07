// 🩺 保管庫と本体の健康診断(tool_health.js) — 2026-08-06(189)ユーザー指示で作った
//
// ⚠⚠**作った理由**=このセッションで踏んだ「誰も見張っていないから静かに腐る物」への対策。
//   ①`typeof` が TDZ で例外→**空の catch に飲まれてリセットが静かに途中で止まった**
//     (⚠**同じ型の事故は 2026-07-26 にもある**=2度目)
//   ②ノートが15冊あって相互リンクだらけ。**どこからも張られていない迷子**が実在した
//   ③CLAUDE.md は「100〜120行」の掟があるのに、誰も数えていなかった
//   ④index.html が 3.37MB。**何がどれだけ食っているか**を誰も知らない
//
// 使い方:
//   node tool_health.js            # 全部
//   node tool_health.js --check    # 増えていたら exit 1(リリースゲート用)
//   node tool_health.js --accept   # いまの件数を基準として記録する
//
// ⚠**0件を目標にしない**。空の catch は「そこで落ちてはいけない」場所にも要る。
//   ⭐見るのは**増えたかどうか**だけ。

const fs=require('fs');
const path=require('path');
const CHECK=process.argv.includes('--check');
const ACCEPT=process.argv.includes('--accept');
const BASE='./health_baseline.json';

const R={warn:[],info:[]};
const num={};

/* ============ ① 握り潰し(空の catch) ============ */
/* ⚠**字句を剥がしてから数える**=文字列やコメントの中の catch を数えないため。
   剥がし方は test_undef.js と同じ考え方(あちらは識別子、こちらは catch の形)。 */
function strip(src){
 let out='',i=0,n=src.length;
 while(i<n){
  const c=src[i],d=src[i+1];
  if(c==='/'&&d==='/'){while(i<n&&src[i]!=='\n')i++;continue;}
  if(c==='/'&&d==='*'){i+=2;while(i<n&&!(src[i]==='*'&&src[i+1]==='/'))i++;i+=2;out+=' ';continue;}
  if(c==='"'||c==="'"||c==='`'){const q=c;i++;while(i<n&&src[i]!==q){if(src[i]==='\\')i++;i++;}i++;out+='""';continue;}
  out+=c;i++;
 }
 return out;
}
function countCatch(file){
 const s=strip(fs.readFileSync(file,'utf8'));
 const empty=(s.match(/catch\s*\([^)]*\)\s*\{\s*\}/g)||[]).length;
 const all=(s.match(/catch\s*\(/g)||[]).length;
 return {empty,all};
}
{
 const a=countCatch('./index.html');
 num.catchEmpty=a.empty;
 R.info.push('🕳 握り潰し(空のcatch)  index.html '+a.empty+'/'+a.all+'か所');
 if(a.empty>0)R.info.push('   ⚠**中で例外が起きても誰も気づかない**。新しく足す時は、せめて DEV では赤いエラー帯に出す形にできないか考える');
}

/* ============ ①' 死にコード(どこからも呼ばれていない関数) ============ */
/* ⚠⚠**作った理由**=[[TODO]] に「もう当たらない古い分岐が残っている」と書いてあるのに、
     どれが死んでいるかを**誰も数えていなかった**(`U_PZ`/`uCos`/`uArmTo` など)。
   ⭐**静的に数えるだけ**=名前が「宣言の1回しか出てこない」関数は、どこからも呼ばれていない。
   ⚠**これは「未実行コード地図」の安い版**。動的な網羅率(CDP)は
     ❌「カバレッジ率を目標値にしない」の掟があるので作らない=**一覧を出すだけ**にする。
   ⚠**消してよいとは限らない**(道具や検査から呼ぶ物・将来使う物がある)。見るのは**増えていないか**。 */
{
 /* ⚠⚠**宣言は字句を剥がした側・数えるのは生のまま**=この保管庫は HTML をテンプレート文字列で
    組み立てるので、`onclick` や文字列の中から呼ばれる関数がある。剥がした側で数えると
    それが全部「死んでいる」に見える(実際に `tgtBtns` などが誤検出された)。 */
 const raw=fs.readFileSync('./index.html','utf8');
 const s=strip(raw);
 const names=[];
 for(const m of s.matchAll(/\bfunction\s+([A-Za-z_$][\w$]*)\s*\(/g))names.push(m[1]);
 const cnt={};
 for(const m of raw.matchAll(/[A-Za-z_$][\w$]*/g))cnt[m[0]]=(cnt[m[0]]||0)+1;
 const dead=[...new Set(names)].filter(n=>cnt[n]===1);
 num.deadFn=dead.length;
 R.info.push('🗺 死にコード  どこからも呼ばれていない関数 '+dead.length+'本 / 全'+new Set(names).size+'本');
 if(dead.length)R.info.push('   '+dead.slice(0,14).join(' ')+(dead.length>14?(' …他'+(dead.length-14)+'本'):''));
 R.info.push('   ⚠**消してよいとは限らない**(道具や検査から呼ぶ物がある)。見るのは増えていないか');
}

/* ============ ② ノート(保管庫)の健康 ============ */
const MD=fs.readdirSync('.').filter(f=>/\.md$/i.test(f));
const mdSet=new Set(MD.map(f=>f.replace(/\.md$/i,'')));
const linked=new Set();
const broken=[];
for(const f of MD){
 const s=fs.readFileSync(f,'utf8');
 for(const m of s.matchAll(/\[\[([^\]|#]+)(?:[|#][^\]]*)?\]\]/g)){
  const t=m[1].trim().replace(/\.md$/i,'');
  linked.add(t);
  if(!mdSet.has(t))broken.push(f+' → [['+m[1].trim()+']]');
 }
}
/* ⚠HOME/CLAUDE/HANDOFF は入口なので、張られていなくても迷子ではない */
const ENTRY=['HOME','CLAUDE','HANDOFF','README'];
const orphan=MD.map(f=>f.replace(/\.md$/i,'')).filter(n=>!linked.has(n)&&ENTRY.indexOf(n)<0);
num.mdBroken=broken.length;num.mdOrphan=orphan.length;
R.info.push('🔗 ノート  '+MD.length+'冊 / リンク切れ '+broken.length+'件 / 迷子 '+orphan.length+'件');
for(const b of broken)R.warn.push('   🔴 リンク切れ: '+b);
for(const o of orphan)R.warn.push('   🔴 迷子(どこからも張られていない): '+o+'.md');

/* ノートの行数(掟のあるものだけ) */
const LIMIT={'CLAUDE.md':[100,130],'HANDOFF.md':[40,75]};
for(const f in LIMIT){
 if(!fs.existsSync(f))continue;
 const n=fs.readFileSync(f,'utf8').split('\n').length;
 const [lo,hi]=LIMIT[f];
 num['line_'+f]=n;
 if(n>hi)R.warn.push('   🔴 '+f+' が '+n+'行(掟は'+lo+'〜'+hi+'行)=**他のmdへ移す時期**');
 else R.info.push('📏 '+f+' '+n+'行(掟は'+lo+'〜'+hi+')');
}

/* ============ ③ 本体の重さの内訳 ============ */
{
 const s=fs.readFileSync('./index.html','utf8');
 const zlib=require('zlib');
 const total=Buffer.byteLength(s);
 let b64=0,b64n=0;
 for(const m of s.matchAll(/data:[a-z/+-]+;base64,([A-Za-z0-9+/=]+)/g)){b64+=m[1].length;b64n++;}
 const gz=zlib.gzipSync(Buffer.from(s)).length;
 num.bytes=total;
 R.info.push('📦 index.html  '+total.toLocaleString()+'B (gzip '+gz.toLocaleString()+'B)');
 R.info.push('   うち埋め込み素材(base64) '+b64n+'件 '+b64.toLocaleString()+'B ('+Math.round(b64/total*100)+'%)'
  +' / コードほか '+(total-b64).toLocaleString()+'B');
}

/* ============ ④ 道具の棚卸し(TOOLS.md の表と実体のズレ) ============ */
{
 const tools=fs.readdirSync('.').filter(f=>/^(tool_|test_).*\.js$/.test(f));
 const t=fs.existsSync('TOOLS.md')?fs.readFileSync('TOOLS.md','utf8'):'';
 const missing=tools.filter(f=>t.indexOf(f)<0);
 num.toolMissing=missing.length;
 R.info.push('🛠 道具  '+tools.length+'本 / TOOLS.md に載っていない '+missing.length+'本');
 for(const m of missing)R.warn.push('   🔴 TOOLS.md の表に無い道具: '+m);
}

/* ============ ⑤🚑 公開の門番(2026-08-07(196)に痛い目を見て足した) ============
   ⚠⚠**公開が3回ぶん黙って失敗して、2日ぶんの変更が1つも公開URLへ届いていなかった**。
     手元の検査は全部通っていたので**誰も気づけなかった**のが一番まずい。
   ⚠⚠**本当の原因は GitHub 側の一時的な認証エラー**(deploy の段でだけ落ちる。ビルドは毎回成功していた)=
     **押し直せば直る類**。⭐だから**push したら公開が反映されたかを必ず見ること**
     (⭐**手順の本体は NOTES_道具.md の「🚑push したら公開が反映されたかを必ず見る」**=
      配信物そのものを curl で見るのが一番確か。⚠`pages/builds/latest` は古いまま返ることがある)。
   ⭐`.nojekyll` は**原因ではなかった**が、md を解釈させない方が速くて安全なので置いてある。
   ⚠この空ファイルを消さないこと。 */
{
 const ok=fs.existsSync('.nojekyll');
 R.info.push('🚑 公開の門番  .nojekyll '+(ok?'あり':'⚠無い'));
 if(!ok)R.warn.push('   🔴 .nojekyll が無い=公開ビルドが黙って失敗する(空ファイルを置くこと)');
 num.noJekyll=ok?0:1;
}

/* ============ 出力 ============ */
console.log('🩺 健康診断');
console.log('─'.repeat(60));
for(const l of R.info)console.log(l);
if(R.warn.length){console.log('');for(const l of R.warn)console.log(l);}
console.log('─'.repeat(60));

let base={};try{base=JSON.parse(fs.readFileSync(BASE,'utf8'));}catch(e){}
if(ACCEPT){
 fs.writeFileSync(BASE,JSON.stringify(num,null,1));
 console.log('📝 基準を今の値にした: '+JSON.stringify(num));
 process.exit(0);
}
/* ⚠**増えた時だけ落ちる**(0を目標にしない)。⚠バイト数は素材を足せば必ず増えるので見張らない */
const watch=['catchEmpty','mdBroken','mdOrphan','toolMissing'];
const worse=watch.filter(k=>base[k]!=null&&(num[k]|0)>base[k]);
if(worse.length){
 console.log('🔴 基準より増えた:');
 for(const k of worse)console.log('   '+k+' '+base[k]+'→'+num[k]);
 console.log('   ⚠直すか、わざとなら --accept で基準を上げる');
 if(CHECK)process.exit(1);
}else{
 console.log('🟢 基準より増えたものは無い'+(Object.keys(base).length?'':'(基準が無いので --accept で作る)'));
}
process.exit(0);
