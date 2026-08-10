// DEADTIDE 未定義の名前スキャナ(静的検査)
// 使い方: node test_undef.js [対象HTML(省略時 ./index.html)]
//
// 何のためのものか:
//   一括置換(sed/正規表現)で名前がくっついて壊れる事故を、実行しなくても見つけるための検査。
//   例: `if(C.isMe||F.isMe)sfx.frost();` → `ifisMinesfx.frost();`(2026-07-25に実際に起きた)
//   node --check は文法しか見ないので通ってしまい、test_headless も「その行を通る経路」を
//   走らせない限り気づけなかった。この検査は **一度も実行されない分岐の中まで** 全部見る。
//
// やっていること:
//   1. <script>の中身からコメント・文字列・正規表現リテラルを取り除く
//   2. 変数として使われている名前を全部拾う(o.name のようなプロパティ参照は除く)
//   3. どこにも宣言が見つからない名前を報告する
//      - 予約語がくっついた形(ifXxx / returnXxx など) = 一括置換事故ほぼ確定 → FAIL
//      - 1回しか出てこない名前 = 誤字の疑いが濃い → FAIL(誤検出はALLOWに足す)
const fs=require('fs');
const TARGET=process.argv[2]||'./index.html';

/* ============ 0. まず文法を見る ============
   ⚠置換パッチで**閉じ括弧の数がずれる**事故は、この検査(名前の照合)では捕まらない。
     2026-07-26に `if(C.isMe){…}}` を `twSfx(C,T);}}` へ置き換えて `}` が1個余り、
     ここは素通りして test_headless で初めて落ちた。先に構文だけ見ておけば一瞬で分かる。 */
(function checkSyntax(){
 const html=fs.readFileSync(TARGET,'utf-8');
 const i=html.indexOf('<scr'+'ipt>'),j=html.lastIndexOf('</scr'+'ipt>');
 if(i<0||j<0)return;
 const js=html.slice(i+8,j);
 try{new Function(js);}
 catch(e){
  console.log('❌ 文法エラー: '+e.message);
  console.log('   (置換パッチで括弧の数がずれていないか確かめること)');
  process.exit(1);}
 console.log('文法: OK');
})();

/* ============ 1. コメント・文字列・正規表現を空白に潰す ============
   テンプレート文字列は `文字の部分だけ` を潰し、${ }の中はコードとして残す(入れ子にも対応) */
function strip(src){
 const n=src.length;const out=new Array(n);
 for(let i=0;i<n;i++)out[i]=src[i];
 const blank=(a,b)=>{for(let i=a;i<b&&i<n;i++)if(out[i]!=='\n')out[i]=' ';};
 const st=[{t:'code',d:0}];/* t:code=通常 / tmpl=テンプレート文字列の中 */
 let i=0,prev='';
 while(i<n){
  const top=st[st.length-1];
  if(top.t==='tmpl'){/* テンプレートの文字部分 */
   if(src[i]==='\\'){blank(i,i+2);i+=2;continue;}
   if(src[i]==='`'){st.pop();i++;prev='`';continue;}
   if(src[i]==='$'&&src[i+1]==='{'){blank(i,i+2);st.push({t:'code',d:0});i+=2;prev='{';continue;}
   if(src[i]!=='\n')out[i]=' ';
   i++;continue;
  }
  const c=src[i],c2=src.substr(i,2);
  if(c2==='//'){const j=src.indexOf('\n',i),e=j<0?n:j;blank(i,e);i=e;continue;}
  if(c2==='/*'){const j=src.indexOf('*/',i+2),e=j<0?n:j+2;blank(i,e);i=e;continue;}
  if(c==='"'||c==="'"){
   let j=i+1;while(j<n){if(src[j]==='\\'){j+=2;continue;}if(src[j]===c||src[j]==='\n')break;j++;}
   blank(i+1,j);i=Math.min(j+1,n);prev=c;continue;
  }
  if(c==='`'){st.push({t:'tmpl'});i++;continue;}
  if(c==='{'){top.d++;out[i]='{';i++;prev='{';continue;}
  if(c==='}'){
   if(top.d===0&&st.length>1){st.pop();blank(i,i+1);i++;prev='}';continue;}/* ${ } の終わり */
   top.d--;i++;prev='}';continue;
  }
  if(c==='/'){/* 正規表現リテラルか除算か */
   const isRe=!prev||'(,=:[!&|?{};+-*%~^<>'.indexOf(prev)>=0||
    /\b(return|typeof|case|in|of|new|delete|do|else|void|yield|await)$/.test(src.slice(Math.max(0,i-9),i));
   if(isRe){
    let j=i+1,cls=false,ok=false;
    while(j<n){const d=src[j];
     if(d==='\\'){j+=2;continue;}
     if(d==='\n')break;
     if(d==='"'||d==="'"||d==='`')break;/* ⚠クォート入りは正規表現と見なさない=誤判定してもズレない */
     if(cls){if(d===']')cls=false;}else if(d==='['){cls=true;}else if(d==='/'){ok=true;break;}
     j++;}
    if(ok){let e=j+1;while(e<n&&/[a-z]/.test(src[e]))e++;blank(i,e);i=e;prev='/';continue;}
   }
  }
  if(/\S/.test(c))prev=c;
  i++;
 }
 return out.join('');
}

/* ============ 2. 変数として使われている名前を拾う ============
   ⚡⚠⚠**行の前後を slice で切り出さない**(2026-08-10(239)に285秒→0.6秒へ)。
     🐞**正体**=index.html には**埋め込み素材(base64)の1行が数十万文字**あり、
       strip はその中身を**同じ長さの空白**に置き換えるので、長い行はそのまま残る。
       そこで識別子1個ごとに `ln.slice(0,s)` と `ln.slice(e)` を作っていたため、
       **1行の長さ×識別子の数**(実質2乗)になって、この検査だけで**4分45秒**かかっていた。
     ⭐**直し方=文字を1つずつ見る**(空白を飛ばして前後の1〜2文字だけ調べる)=結果は1文字も変わらない。
     ⚠**新しく「前後を見る」条件を足す時も slice を作らないこと**。 */
function collectUses(code){
 const uses=new Map();const lines=code.split('\n');
 let prevEnd='';/* 直前の中身がある行の末尾文字(オブジェクトのキー判定に使う) */
 const isSp=c=>c===' '||c==='\t'||c==='\r'||c==='\f'||c==='\v';
 lines.forEach((ln,li)=>{
  const re=/[A-Za-z_$][A-Za-z0-9_$]*/g;let m;
  const L=ln.length;
  while((m=re.exec(ln))){
   const s=m.index,e=re.lastIndex;
   /* 1e9 / 0x1F など数値の一部=直前の1文字が数字 */
   if(s>0){const c0=ln.charCodeAt(s-1);if(c0>=48&&c0<=57)continue;}
   /* 空白を飛ばして「直前の中身のある1文字」 */
   let p=s-1;while(p>=0&&isSp(ln[p]))p--;
   const bc=p>=0?ln[p]:'';
   if(bc==='.')continue;/* o.name / o?.name = プロパティ参照 */
   /* オブジェクトのキー( name: )は変数ではない。行頭のキーは前の行の末尾で判断する */
   let q=e;while(q<L&&isSp(ln[q]))q++;
   if(ln[q]===':'&&ln[q+1]!==':'){
    const ctx=(p>=0)?bc:prevEnd;
    if(ctx===''||ctx==='{'||ctx===','||ctx==='['||ctx==='(')continue;
   }
   const name=m[0];
   if(!uses.has(name))uses.set(name,[]);
   uses.get(name).push(li+1);
  }
  let z=L-1;while(z>=0&&isSp(ln[z]))z--;
  if(z>=0)prevEnd=ln[z];
 });
 return uses;
}
/* ============ 3. 宣言されている名前を広めに集める ============
   ここは「拾いすぎ」で構わない(見逃し=誤報になるだけ)。逆に拾い漏れると誤報が増える */
function collectDecls(code){
 const d=new Set();let m;
 const put=s=>{for(const x of (s||'').match(/[A-Za-z_$][\w$]*/g)||[])d.add(x);};
 const one=(re,g)=>{re.lastIndex=0;while((m=re.exec(code)))d.add(m[g||1]);};
 one(/\bfunction\s+([A-Za-z_$][\w$]*)/g);
 one(/\bclass\s+([A-Za-z_$][\w$]*)/g);
 let r=/\b(?:const|let|var)\s+([^=;\n]+)/g;while((m=r.exec(code)))put(m[1]);
 one(/,\s*([A-Za-z_$][\w$]*)\s*=/g);/* const a=1,b=2 の続き */
 r=/\[([^\][\n]*)\]\s*=[^=]/g;while((m=r.exec(code)))put(m[1]);/* const [a,b]=... の分解 */
 r=/\{([^{}\n]*)\}\s*=[^=]/g;while((m=r.exec(code)))put(m[1]);/* const {a,b}=... の分解 */
 r=/(?:function\s*[\w$]*\s*|catch\s*|\bfor\s*)\(([^)]*)\)/g;while((m=r.exec(code)))put(m[1]);
 r=/\(([^()]*)\)\s*=>/g;while((m=r.exec(code)))put(m[1]);/* アロー関数の引数 */
 one(/([A-Za-z_$][\w$]*)\s*=>/g);/* 引数1個のアロー */
 r=/(?:^|[,{;\n])\s*([A-Za-z_$][\w$]*)\s*\([^)]*\)\s*\{/g;while((m=r.exec(code)))d.add(m[1]);/* メソッド短縮 */
 return d;
}

const GLOBALS=new Set((
 'Math JSON Object Array String Number Boolean Date RegExp Error TypeError RangeError Map Set WeakMap WeakSet '+
 'Promise Symbol Proxy Reflect BigInt Function parseInt parseFloat isNaN isFinite '+
 'Uint8Array Uint16Array Uint32Array Int8Array Int16Array Int32Array Float32Array Float64Array ArrayBuffer DataView '+
 'encodeURIComponent decodeURIComponent encodeURI decodeURI escape unescape atob btoa '+
 'window document navigator location history localStorage sessionStorage console performance '+
 'requestAnimationFrame cancelAnimationFrame setTimeout clearTimeout setInterval clearInterval queueMicrotask '+
 'Image Audio AudioContext webkitAudioContext Peer Blob URL FileReader XMLHttpRequest fetch alert confirm prompt '+
 'globalThis undefined NaN Infinity this arguments true false null '+
 'if else for while do return function const let var new typeof instanceof in of delete void switch case default '+
 'break continue throw try catch finally class extends super yield await async static get set '+
 'DOMParser TextEncoder TextDecoder structuredClone matchMedia devicePixelRatio innerWidth innerHeight screen '+
 'visualViewport CustomEvent Event MouseEvent TouchEvent KeyboardEvent PointerEvent ResizeObserver '+
 'IntersectionObserver MutationObserver OffscreenCanvas createImageBitmap ImageData Path2D CanvasRenderingContext2D'
).split(/\s+/));

/* 中身を見て「これは誤検出」と確認済みの名前(オブジェクトのキーなど)。増やす時は必ず現物を見てから */
const ALLOW=new Set([]);

const KWGLUE=/^(if|else|for|while|do|return|const|let|var|function|typeof|new|case|switch|delete|instanceof|break|continue|throw|try|catch|finally|class|await|yield|in|of|void)[A-Za-z0-9_$]/;

const html=fs.readFileSync(TARGET,'utf-8');
const pre=html.split('<script>')[0];
const OFF=pre.split('\n').length-1;/* index.html基準の行番号に直すためのオフセット */
const js=html.split('<script>')[1].split('</'+'script>')[0];
const code=strip(js);
const uses=collectUses(code),decls=collectDecls(code);

const bad=[];
for(const [name,ls] of uses){
 if(decls.has(name)||GLOBALS.has(name)||ALLOW.has(name))continue;
 bad.push({name,n:ls.length,ls});
}
bad.sort((a,b)=>a.n-b.n||a.name.localeCompare(b.name));
const at=ls=>ls.slice(0,5).map(l=>l+OFF).join(',');

const glue=bad.filter(b=>KWGLUE.test(b.name));
const once=bad.filter(b=>b.n===1&&!KWGLUE.test(b.name));
const many=bad.filter(b=>b.n>1&&!KWGLUE.test(b.name));

console.log('スキャン対象: '+TARGET+'  (識別子 '+uses.size+'種 / 宣言 '+decls.size+'種)');
if(glue.length){
 console.log('\n❌ 予約語がくっついた名前=一括置換の事故:');
 for(const b of glue)console.log('   '+b.name+'   index.html '+at(b.ls)+'行');
}
if(once.length){
 console.log('\n❌ 宣言が見つからず1回しか出てこない名前=誤字の疑い:');
 for(const b of once)console.log('   '+b.name+'   index.html '+at(b.ls)+'行');
}
if(many.length){
 console.log('\n⚠ 宣言が見つからないが複数回出てくる名前(たいていは誤検出。中身を確認すること):');
 for(const b of many)console.log('   '+b.name+' x'+b.n+'   index.html '+at(b.ls)+'行');
}
if(glue.length||once.length){
 console.log('\nFAIL: 上の名前は実行時に ReferenceError になる可能性がある。');
 console.log('      誤検出だと現物を見て確認できた場合だけ、test_undef.js の ALLOW に足すこと。');
 process.exit(1);
}
console.log('\n✅ 未定義の名前なし'+(many.length?'(⚠の分は要確認)':''));
