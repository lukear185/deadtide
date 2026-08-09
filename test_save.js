// 🛡 セーブ移行の門番(test_save.js) — 2026-08-06(189)ユーザー指示で作った
//
// ⚠⚠**作った理由**=セーブの形を変えるたびに「昔から遊んでいる人のデータが壊れないか」を
//   **一度も確かめていなかった**。実際に 2026-08-06(187) で
//   **持ち物を「先頭からN個」から「idの集合」へ変えた**=一歩間違えば全員の解放が消える変更だった。
//   ⭐**昔のセーブの標本を毎回全部通す**のが唯一の守り方。
//
// 使い方:
//   node test_save.js            # save_fixtures/*.json を全部読み込ませて壊れないか見る
//
// ⚠**標本を足すのは「セーブの形を変えた回」**=その時点の形を1つ save_fixtures/ に置く。
//   ⚠**壊れた形の標本も1つ置いてある**(数字のはずが文字列、配列のはずが数値)。
//   実機の localStorage は人の手で触れるし、途中で書き込みが切れることもある。

const fs=require('fs');
const path=require('path');
const DIR=path.join(__dirname,'save_fixtures');
const TARGET=process.argv[2]||'./index.html';

const html=fs.readFileSync(TARGET,'utf8');
const js=html.split('<script>')[1].split('</'+'script>')[0];

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
global.window=global;
global.innerWidth=800;global.innerHeight=380;global.devicePixelRatio=1;global.navigator={};
let NOW=0;global.performance={now:()=>NOW};
global.AudioContext=function(){return {state:'running',resume(){},createOscillator:()=>({type:'',frequency:{setValueAtTime(){},exponentialRampToValueAtTime(){}},connect:()=>({connect(){}}),start(){},stop(){}}),createGain:()=>({gain:{setValueAtTime(){},exponentialRampToValueAtTime(){}},connect:()=>({connect(){}})}),destination:{},currentTime:0};};
global.Peer=function(){return {on(){},destroy(){},connect:()=>({on(){},open:false})};};
global.location={search:'',href:'',hash:''};

const files=fs.existsSync(DIR)?fs.readdirSync(DIR).filter(f=>/\.json$/.test(f)):[];
if(!files.length){console.log('⚠ save_fixtures/ に標本が無い');process.exit(0);}

let bad=0;
console.log('🛡 セーブ移行の門番  標本'+files.length+'件');
console.log('─'.repeat(66));
for(const f of files){
 const raw=fs.readFileSync(path.join(DIR,f),'utf8');
 /* ⚠**毎回まっさらな環境で読み込む**=前の標本の残りが混ざると意味が無い */
 const cache={};
 global.document={getElementById:id=>cache[id]||(cache[id]=mkEl(id)),createElement:()=>mkEl('dyn'),
  querySelector:()=>mkEl('q'),querySelectorAll:()=>[],addEventListener(){},
  body:{classList:{add(){},remove(){},toggle(){}}}};
 const rafq=[];global.requestAnimationFrame=x=>{rafq.push(x);return rafq.length;};
 const LS={'dt_meta':raw};
 global.localStorage={getItem:k=>(k in LS?LS[k]:null),setItem:(k,v)=>{LS[k]=''+v;},
  removeItem:k=>{delete LS[k];},clear:()=>{for(const k in LS)delete LS[k];}};
 let out=null,err=null;
 try{
  out=new Function(js+'\n;return {'
   +'ot:(META.ot||[]).length,ou:(META.ou||[]).length,'
   +'tw:twOwnList().length,un:uOwnList().length,'
   +'pts:META.pts,sc:JSON.stringify(META.sc||[]),'
   +'team:JSON.stringify(teamIdx()),'
   +'stg:(function(){try{return unlStep();}catch(e){return -1;}})(),'
   +'save:localStorage.getItem("dt_meta")?1:0'
   +'};')();
 }catch(e){err=e;}
 if(err){console.log('  🔴 '+f+'  読み込みで例外: '+err.message);bad++;continue;}
 /* ---- 壊れていないかの物差し ---- */
 const ng=[];
 if(!(out.pts>=0))ng.push('🧬が数字でない('+out.pts+')');
 if(out.tw<2)ng.push('持っている塔が初期の2種を下回る('+out.tw+')');
 if(out.un<2)ng.push('持っている兵科が初期の2種を下回る('+out.un+')');
 if(out.stg<0)ng.push('拠点の数が数えられない');
 let t=[];try{t=JSON.parse(out.team);}catch(e){}
 if(!t.length)ng.push('編成が空になった(出撃できない)');
 if(!out.save)ng.push('セーブが消えた');
 if(ng.length){console.log('  🔴 '+f+'  '+ng.join(' / '));bad++;}
 else console.log('  ✅ '+f+'  塔'+out.tw+'種 兵科'+out.un+'種 / 🧬'+out.pts
  +' / 拠点'+out.stg+' / 編成'+t.length+'体');
}
console.log('─'.repeat(66));
/* ⭐(187)旧セーブの移し替え+🔒(229)**面の進みより先の解放は🧬を返して巻き戻す**(2026-08-09ユーザー指示
   「すでに終盤のタレットとか解放してるやつも未解放に戻す。辻褄合ってるやつはそのまま」)。
   ⚠**「解放済みを取り上げない」の物差しは(229)で変わった**=棚(面のクリアで並ぶ分)に無い物は
   未解放へ戻し、**払った🧬を全額返す**(同じ値段で買い直せる)。
   ⭐この標本は拠点0=棚は段0だけ → **塔4種・兵科2種が残る**(標本の塔5種のうち4種と、
   兵科8種のうち2種が段0の棚に居る)。⚠**段0の顔ぶれを変えたらこの数字も直すこと**。 */
{
 const raw=fs.readFileSync(path.join(DIR,'v1_旧式_解放は個数.json'),'utf8');
 const o=JSON.parse(raw);
 const cache={};
 global.document={getElementById:id=>cache[id]||(cache[id]=mkEl(id)),createElement:()=>mkEl('dyn'),
  querySelector:()=>mkEl('q'),querySelectorAll:()=>[],addEventListener(){},
  body:{classList:{add(){},remove(){},toggle(){}}}};
 const rafq=[];global.requestAnimationFrame=x=>{rafq.push(x);return rafq.length;};
 const LS={'dt_meta':raw};
 global.localStorage={getItem:k=>(k in LS?LS[k]:null),setItem:(k,v)=>{LS[k]=''+v;},
  removeItem:k=>{delete LS[k];},clear:()=>{for(const k in LS)delete LS[k];}};
 /* 返す物=[残った塔, 残った兵科, いまの🧬, 残りが全部棚の中か(1/0), 返るべき🧬の合計]
    ⚠返金の式は本体と同じ物差し(何個目かの値段)を**本体の関数で**数える(式を写さない) */
 const g=new Function(js+'\n;return [(META.ot||[]).length,(META.ou||[]).length,META.pts|0,'
  +'((META.ot||[]).every(id=>shelfT().indexOf(id)>=0)&&(META.ou||[]).every(id=>shelfU().indexOf(id)>=0))?1:0,'
  +'(function(){let s=0;for(let k=(META.ot||[]).length;k<'+(o.nt|0)+';k++)s+=LAB_NT(k);'
  +'for(let k=(META.ou||[]).length;k<'+(o.nu|0)+';k++)s+=LAB_NU(k);return s;})()];')();
 const wantP=(o.pts|0)+g[4];
 if(!g[3]){console.log('🔴 棚に無い物が解放済みのまま残っている 塔'+g[0]+' 兵科'+g[1]);bad++;}
 else if(g[0]!==4||g[1]!==2){console.log('🔴 巻き戻しの残りが想定と違う 塔'+g[0]+'(想定4) 兵科'+g[1]+'(想定2)=棚の中まで取り上げた?');bad++;}
 else if(g[2]!==wantP){console.log('🔴 巻き戻した🧬が全額返っていない '+g[2]+'(想定'+wantP+')');bad++;}
 else console.log('✅ 旧セーブ: 棚の中は残る(塔4・兵科2)+先の解放は🧬を全額返して巻き戻し(🧬'+g[2]+')');
}
if(bad){console.log('🔴 '+bad+'件おかしい。⚠**昔から遊んでいる人のデータが壊れる**');process.exit(1);}
console.log('🟢 標本すべて壊れずに読み込めた');
process.exit(0);
