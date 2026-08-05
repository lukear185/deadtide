// 🎨 色の物差し(tool_look.js) — 2026-08-06(189)ユーザー指示で作った
//
// ⚠⚠**作った理由**=色は**目で見て決める**物だが、**読めない組み合わせは数字で分かる**。
//   この保管庫の掟(NOTES_UI)は「文字10.5px以上」「押す所44px」までは実測できるようになったが、
//   **文字と背景のコントラスト**は誰も測っていなかった。
//   さらに [[NOTES_絵]] に「ゾンビの `ZW.pa`/`ZW.sho` が黒フチとほぼ同色」という記録があるのに、
//   **どの色とどの色が近いのか**を数えたことが一度も無い。
//
// ⚠⚠**APCA(apca-w3)は使わない**=「Limited W3 License」で商用利用に書面契約が要る(TOOLS.mdの❌)。
//   ⭐**WCAG2の比は仕様公開の四則演算**なので自前で実装する(依存ゼロ)。
//
// 使い方:
//   node tool_look.js            # 全部
//   node tool_look.js --check    # 読めない組み合わせが増えたら exit 1
//
// ⚠**0件を目標にしない**=飾りの文字や、わざと沈めている色がある。見るのは**増えたかどうか**。

const fs=require('fs');
const CHECK=process.argv.includes('--check');
const BASE='./look_baseline.json';
const html=fs.readFileSync('./index.html','utf8');

/* ---- 色の道具(WCAG 2.x の相対輝度とコントラスト比。仕様どおりの四則演算) ---- */
const hex2rgb=h=>{h=h.replace('#','');
 if(h.length===3)h=h[0]+h[0]+h[1]+h[1]+h[2]+h[2];
 return [parseInt(h.slice(0,2),16),parseInt(h.slice(2,4),16),parseInt(h.slice(4,6),16)];};
const lin=c=>{c/=255;return c<=0.03928?c/12.92:Math.pow((c+0.055)/1.055,2.4);};
const lum=rgb=>0.2126*lin(rgb[0])+0.7152*lin(rgb[1])+0.0722*lin(rgb[2]);
const ratio=(a,b)=>{const l1=lum(a),l2=lum(b);const hi=Math.max(l1,l2),lo=Math.min(l1,l2);
 return (hi+0.05)/(lo+0.05);};
/* 色の距離(CIE76 相当の簡易版。⚠**厳密さより「近すぎる組を見つける」用途**) */
const dist=(a,b)=>Math.sqrt((a[0]-b[0])**2*0.3+(a[1]-b[1])**2*0.59+(a[2]-b[2])**2*0.11);
/* 色覚多様性(1型/2型)の見え方に寄せる簡易変換=**赤緑の差だけを潰す** */
const cvd=rgb=>{const g=(rgb[0]*0.56+rgb[1]*0.44);return [g,g,rgb[2]];};

const num={};const out=[];const warn=[];

/* ============ ① CSS変数の色を集める ============ */
const root=(/:root\{([^}]*)\}/.exec(html)||['',''])[1];
const VARS={};
for(const m of root.matchAll(/--([\w-]+)\s*:\s*(#[0-9a-fA-F]{3,6})/g))VARS[m[1]]=m[2];
num.cssVars=Object.keys(VARS).length;
out.push('🎨 CSSの色  '+num.cssVars+'色');

/* ============ ② 文字と背景のコントラスト ============ */
/* ⚠**全部の組を見ても意味が無い**=実際に「文字色 on 背景色」で使われている組だけを見たい。
   ⭐この保管庫は `color:var(--x)` と `background:var(--y)` の形なので、
     **同じCSS規則の中に両方が出てくる組**を拾う。 */
{
 const pairs=[];
 for(const m of html.matchAll(/\{([^{}]{0,400}?)\}/g)){
  const b=m[1];
  const fg=/color\s*:\s*var\(--([\w-]+)\)/.exec(b);
  const bg=/background(?:-color)?\s*:\s*(?:[^;]*?)var\(--([\w-]+)\)/.exec(b);
  if(fg&&bg&&VARS[fg[1]]&&VARS[bg[1]])pairs.push([fg[1],bg[1]]);
 }
 const seen={},bad=[];
 for(const [f,g] of pairs){
  const k=f+'|'+g;if(seen[k])continue;seen[k]=1;
  const r=ratio(hex2rgb(VARS[f]),hex2rgb(VARS[g]));
  if(r<4.5)bad.push({f,g,r:+r.toFixed(2)});
 }
 num.lowContrast=bad.length;
 out.push('🔡 文字と背景  '+Object.keys(seen).length+'組 / **読みにくい(4.5未満)** '+bad.length+'組');
 for(const b of bad.sort((x,y)=>x.r-y.r).slice(0,10))
  warn.push('   ⚠ '+b.f+'('+VARS[b.f]+') on '+b.g+'('+VARS[b.g]+')  比 '+b.r
   +(b.r<3?'  🔴3未満=大きな文字でも読みにくい':''));
 out.push('   ⚠**基準はWCAG2の4.5:1**(大きい文字は3:1でよい)。⚠飾りの文字は対象外なので0件を目標にしない');
}

/* ============ ③ 近すぎる色 ============ */
{
 const ks=Object.keys(VARS),close=[];
 for(let i=0;i<ks.length;i++)for(let j=i+1;j<ks.length;j++){
  const d=dist(hex2rgb(VARS[ks[i]]),hex2rgb(VARS[ks[j]]));
  if(d<12)close.push({a:ks[i],b:ks[j],d:Math.round(d)});
 }
 num.closeColors=close.length;
 out.push('👀 近すぎる色(距離12未満)  '+close.length+'組');
 for(const c of close.slice(0,8))warn.push('   ⚠ '+c.a+' ≈ '+c.b+'  ('+VARS[c.a]+' / '+VARS[c.b]+')');
}

/* ============ ④ 色覚多様性で見分けが付かなくなる組 ============ */
/* ⚠**赤と緑で意味を分けている所**が危ない(この保管庫だと「効いている/弾かれた」の色) */
{
 const ks=Object.keys(VARS),bad=[];
 for(let i=0;i<ks.length;i++)for(let j=i+1;j<ks.length;j++){
  const A=hex2rgb(VARS[ks[i]]),B=hex2rgb(VARS[ks[j]]);
  if(dist(A,B)<30)continue;/* 元から似ている物は③で言った */
  if(dist(cvd(A),cvd(B))<12)bad.push({a:ks[i],b:ks[j]});
 }
 num.cvdClash=bad.length;
 out.push('🟥🟩 色覚多様性で見分けが付かなくなる組  '+bad.length+'組');
 for(const c of bad.slice(0,8))warn.push('   ⚠ '+c.a+' と '+c.b+' が同じに見える('+VARS[c.a]+' / '+VARS[c.b]+')');
 out.push('   ⚠**色だけで意味を分けない**=形・位置・記号を1つ添える(この保管庫は▲▼を使っている)');
}

/* ============ ⑤ 直書きの色の数 ============ */
{
 const all=[...html.matchAll(/#[0-9a-fA-F]{6}\b/g)].map(m=>m[0].toLowerCase());
 const uniq=new Set(all);
 num.hexTotal=all.length;num.hexUniq=uniq.size;
 out.push('🖌 直書きの色  '+all.length+'か所 / '+uniq.size+'色');
 out.push('   ⚠絵の色は直書きでよい(掟)。⚠**画面の色**はCSS変数から引くこと(checkPalette が見張っている)');
}

console.log('🎨 色の物差し');
console.log('─'.repeat(60));
for(const l of out)console.log(l);
if(warn.length){console.log('');for(const l of warn)console.log(l);}
console.log('─'.repeat(60));
let base={};try{base=JSON.parse(fs.readFileSync(BASE,'utf8'));}catch(e){}
if(process.argv.includes('--accept')){
 fs.writeFileSync(BASE,JSON.stringify(num,null,1));
 console.log('📝 基準を今の値にした: '+JSON.stringify(num));process.exit(0);}
const watch=['lowContrast','closeColors','cvdClash'];
const worse=watch.filter(k=>base[k]!=null&&(num[k]|0)>base[k]);
if(worse.length){
 console.log('🔴 基準より増えた: '+worse.map(k=>k+' '+base[k]+'→'+num[k]).join(' / '));
 console.log('   ⚠直すか、わざとなら --accept で基準を上げる');
 if(CHECK)process.exit(1);
}else console.log('🟢 基準より増えたものは無い'+(Object.keys(base).length?'':'(基準が無いので --accept で作る)'));
process.exit(0);
