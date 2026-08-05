// 📌 数字の腐り止め(tool_nums.js) — 2026-08-06(189)ユーザー指示で作った
//
// ⚠⚠**作った理由**=このセッションで **🧬の配布を3.6倍外した**。原因は
//   `awardMeta` のコメントにあった「①ナイトメアのクリアで8400🧬」を信じたこと。
//   **書いた時は正しくても、敵の量を変えた瞬間に嘘になる**。ノートの数字は必ず腐る。
//
// ⭐**2つの仕事をする**
//   ① **自動の表**: 実装から数字を取り出して md の `<!-- AUTO:nums -->`〜`<!-- /AUTO -->` を差し替える。
//      ⭐**手で書かない=腐らない**。
//   ② **@claim の検算**: 文章の中の数字に目印を付けておくと、実装から計算し直して突き合わせる。
//      書き方(md でも index.html のコメントでもよい):
//        📌①NMのクリアで 2255🧬 <!--@claim metaGainOf(5,0,20,358) ±5%-->
//      ⚠**式は「実装の関数」を呼ぶこと**。写した式を書くと一緒に腐る。
//
// 使い方:
//   node tool_nums.js           # 表を作り直して md に書き戻す + @claim を検算
//   node tool_nums.js --check   # 書き戻さずに、ズレていたら exit 1(リリースゲート用)

const fs=require('fs');
const CHECK=process.argv.includes('--check');
const TARGET='./index.html';

/* ---- ゲーム本体を読み込む(test_headless.js と同じ張りぼて) ---- */
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

const html=fs.readFileSync(TARGET,'utf8');
const js=html.split('<script>')[1].split('</'+'script>')[0];
/* ⚠**評価は new Function の中でやる**=グローバルを汚さず、失敗しても行番号が出る */
const RUN=new Function(js+'\n;return (expr)=>eval(expr);')();

/* ============ ① 自動の表 ============ */
/* ⚠**ここに並べるのは「遊びの骨格を決める数字」だけ**。全部並べると誰も読まない。 */
function table(){
 const g=e=>RUN(e);
 const fmt=n=>typeof n==='number'?(Number.isInteger(n)?n.toLocaleString():n):n;
 const rows=[];
 const add=(k,v,memo)=>rows.push('| '+k+' | '+fmt(v)+' | '+(memo||'')+' |');
 add('初期解放','塔'+g('BASE_T')+'種 / 兵科'+g('BASE_U')+'種','`BASE_T`/`BASE_U`');
 add('連れて行く兵科',g('TEAM_N')+'体','`TEAM_N`');
 add('出撃コストの上限',g('MAXU'),'`MAXU`(兵科の重さ `uWt` の合計)');
 add('研究所の段',g('LINE_MAX'),'`LINE_MAX`');
 add('硬い敵に通る割合',Math.round(g('ARMOR_CUT')*100)+'%','`ARMOR_CUT`(✊🔫❄が弾かれる)');
 add('特効の倍率','🔥×'+g('FIRE_VS_ARMOR')+' / ⚡×'+g('ELEC_VS_SCALE'),'`FIRE_VS_ARMOR`/`ELEC_VS_SCALE`');
 add('🧬配布の全体倍率,'.slice(0,-1),g('RPT_X'),'`RPT_X`(1拠点クリアで棚の物2種ぶん)');
 add('②沈んだ港の重さ','×'+g('STAGES[1].hpM'),'`STAGES[].hpM`');
 add('🚌道中の締め切り',g('BNS_TIME')+'秒 / 1日'+g('BNS_DAY_N')+'回','`BNS_TIME`/`BNS_DAY_N`');
 add('鍛錬Lvの上限',g('TR_MAX')+'(+'+Math.round(g('TR_PER')*g('TR_MAX')*100)+'%)','`TR_MAX`/`TR_PER`');
 add('セーブの版',g('META_RESET'),'`META_RESET`(上げると全員リセット)');
 /* 難易度の表 */
 const d5=g('D5');
 rows.push('');
 rows.push('| 難易度 | 最終W | 体力 | 物量 | 足 | ボス | 初期⚙️ |');
 rows.push('|---|---|---|---|---|---|---|');
 for(const d of d5)rows.push('| '+d.n+' | '+d.w+' | '+d.hp+' | '+d.cnt+' | '+d.sp+' | '+d.boss+' | '+d.scrap+' |');
 /* 解放の棚 */
 const T=g('UNL_T'),U=g('UNL_U'),TN=g('UNL_TN'),UN=g('UNL_UN');
 rows.push('');
 rows.push('| 段 | 🗼棚に並ぶ塔 | 🪖棚に並ぶ兵科 |');
 rows.push('|---|---|---|');
 {let ti=0,ui=0;
  for(let s=0;s<TN.length;s++){
   const t=[],u=[];
   for(let k=0;k<TN[s];k++){t.push(g('(TOWERS[TW_IDX["'+T[ti]+'"]]||{}).n'));ti++;}
   for(let k=0;k<UN[s];k++){u.push(g('(UBASE[UB_IDX["'+U[ui]+'"]]||{}).n'));ui++;}
   rows.push('| '+s+' | '+t.join(' / ')+' | '+u.join(' / ')+' |');
  }}
 return ['| 何 | 値 | どこ |','|---|---|---|'].concat(rows).join('\n');
}

/* ============ ② @claim の検算 ============ */
function claims(){
 const files=fs.readdirSync('.').filter(f=>/\.md$/i.test(f)).concat(['index.html']);
 const out=[];
 for(const f of files){
  const s=fs.readFileSync(f,'utf8');
  /* 「…数字… <!--@claim 式 ±許容-->」 または index.html のコメント内 /*@claim 式 ±許容*&#47; */
  /* ⚠**目印と数字の間に別の数字を挟ませない**=挟むと手前の関係ない数字を拾う(実際に踏んだ) */
  const re=/([-\d,.]+)\s*[^<\n\d]{0,24}?<!--\s*@claim\s+([^>]+?)\s*-->/g;
  let m;
  while((m=re.exec(s))){
   const said=+m[1].replace(/,/g,'');
   let body=m[2],tol=.05;
   const tm=/±\s*([\d.]+)\s*%\s*$/.exec(body);
   if(tm){tol=+tm[1]/100;body=body.slice(0,tm.index).trim();}
   let got=null,err=null;
   try{got=RUN(body);}catch(e){err=e.message;}
   const ln=s.slice(0,m.index).split('\n').length;
   if(err){out.push({f,ln,ok:false,said,body,msg:'式が動かない: '+err});continue;}
   const ok=isFinite(got)&&Math.abs(got-said)<=Math.abs(said)*tol+1e-9;
   out.push({f,ln,ok,said,got,body,tol});
  }
 }
 return out;
}

/* ============ 実行 ============ */
console.log('📌 数字の腐り止め');
console.log('─'.repeat(60));
let bad=0;

/* 表の差し替え */
const T0='<!-- AUTO:nums -->',T1='<!-- /AUTO -->';
const tbl=table();
let wrote=0,stale=0,found=0;
for(const f of fs.readdirSync('.').filter(x=>/\.md$/i.test(x))){
 const s=fs.readFileSync(f,'utf8');
 const i0=s.indexOf(T0),i1=s.indexOf(T1);
 if(i0<0||i1<0||i1<i0)continue;
 found++;
 const cur=s.slice(i0+T0.length,i1).trim();
 if(cur===tbl.trim()){console.log('✅ '+f+' の自動の表は最新');continue;}
 stale++;
 if(CHECK){console.log('🔴 '+f+' の自動の表が古い(node tool_nums.js で作り直す)');bad++;}
 else{fs.writeFileSync(f,s.slice(0,i0+T0.length)+'\n'+tbl+'\n'+s.slice(i1));
  console.log('📝 '+f+' の自動の表を作り直した');wrote++;}
}
if(!found)console.log('ℹ 自動の表の置き場が無い(md に <!-- AUTO:nums --> 〜 <!-- /AUTO --> を置くと入る)');

/* @claim */
const cs=claims();
if(!cs.length)console.log('ℹ @claim の目印はまだ0件(腐りやすい数字に付ける)');
for(const c of cs){
 if(c.ok)console.log('✅ '+c.f+':'+c.ln+'  '+c.said+' ≒ '+c.got+'  ['+c.body+']');
 else{bad++;console.log('🔴 '+c.f+':'+c.ln+'  書いてある値 '+c.said+' / 実装は '+(c.got==null?'?':c.got)
  +'  ['+c.body+']'+(c.msg?'  '+c.msg:''));}
}
console.log('─'.repeat(60));
if(bad){console.log('🔴 ズレ '+bad+'件。⚠**書いてある数字を直すか、実装が間違っているかのどちらか**');process.exit(CHECK?1:0);}
console.log('🟢 ズレなし');
process.exit(0);
