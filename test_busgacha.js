// 🎰🚌 バスガチャの矛盾検査(test_busgacha.js) — 2026-08-08(212)
//
// ⚠⚠**大原則(DESIGN)=演出でガチャ結果を決めない**。先に結果を確定し、矛盾しない演出を後から選ぶ。
//   この検査は「でたらめな10連を何千回も流して、生成された演出プランが結果と1件も矛盾しない」ことを
//   機械で保証する(DESIGNの検査4つ+降車の掟)。
//
// 使い方: node test_busgacha.js     # 落ちたら seed 付きで出る=同じ seed で再現できる
//
// ⚠プラン(bgPlan)と検査(bgCheck)は index.html 側の純関数。ここは回すだけ。

const fs=require('fs');
const TARGET=process.argv[2]||'./index.html';
const html=fs.readFileSync(TARGET,'utf8');
const js=html.split('<script>')[1].split('</'+'script>')[0];

/* ---- 張りぼて(test_save.js と同じ形) ---- */
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
const cache={};
global.document={getElementById:id=>cache[id]||(cache[id]=mkEl(id)),createElement:()=>mkEl('dyn'),
 querySelector:()=>mkEl('q'),querySelectorAll:()=>[],addEventListener(){},
 body:{classList:{add(){},remove(){},toggle(){}}}};
global.requestAnimationFrame=x=>0;
const LS={};
global.localStorage={getItem:k=>(k in LS?LS[k]:null),setItem:(k,v)=>{LS[k]=''+v;},
 removeItem:k=>{delete LS[k];},clear:()=>{for(const k in LS)delete LS[k];}};

const G=new Function(js+'\n;return {HEROES,bgPlan,bgCheck,bgScenes,gcPick,BG_LEN};')();
const {HEROES,bgPlan,bgCheck,bgScenes,gcPick,BG_LEN}=G;

/* 種つきLCG(test_headless.js の型)。⚠落ちた回は seed で再現できる */
const lcg=seed=>{let s=(seed>>>0)||1;return ()=>{s=(s*1103515245+12345)>>>0;return s/4294967296;};};
const realR=Math.random;
let bad=0,n10=0,n1=0;
const H5=HEROES.filter(h=>h.rk===5),H1=HEROES.filter(h=>h.rk===1);

/* シーン列の掟: 全スロットが降車に1回・開示に1回/尺が正 */
function sceneCheck(res,p,scs,simp){
 const drop=[],rev=[];
 let t=0;
 for(const e of scs){
  if(!(e.len>0))return '尺が0以下のシーンがある('+e.k+')';
  t+=e.len;
  if(e.k==='hdrop'||e.k==='snatch')drop.push(e.slot);
  if(e.k==='drop')drop.push.apply(drop,p.lows);
  if(e.k==='rv')rev.push(e.slot);
  if(e.k==='rvlow')rev.push.apply(rev,p.lows);
  if(e.tb<1||e.tb>5||e.ta<e.tb)return 'バスの段階の焼き込みが変('+e.k+' '+e.tb+'→'+e.ta+')';
 }
 const all=i9=>i9.slice().sort((a,b)=>a-b).join(',');
 const want=res.map((_,i)=>i).join(',');
 if(all(drop)!==want)return '降車が全員ぶんでない('+all(drop)+')';
 if(all(rev)!==want)return '開示が全員ぶんでない('+all(rev)+')';
 /* ⚠上限は「★5×10」の理論最悪(3印+急ブレーキ+1人ずつ10連発)が収まる線 */
 if(t>85)return '通しの尺が長すぎる('+t.toFixed(1)+'秒)';
 /* ⚠簡素化でも★3以上の人数ぶんの開示は残る(1人1秒×最大10人)=上限は30秒 */
 if(simp&&t>30)return '簡素化なのに30秒を超える('+t.toFixed(1)+'秒)';
 return '';
}

function run(res,seed,label){
 const rnd=lcg(seed^0x9e37);
 const p=bgPlan(res,rnd);
 let e=bgCheck(res,p);
 if(!e)e=sceneCheck(res,p,bgScenes(p,0),0);
 if(!e)e=sceneCheck(res,p,bgScenes(p,1),1);
 if(e){console.log('  🔴 '+label+' seed='+seed+' : '+e
  +'  結果=['+res.map(o=>o.hero.rk).join(',')+'] 段階='+p.tier+' 印='+p.mark+' 昇格='+JSON.stringify(p.up)+(p.brake?'+brake'+p.brake.up:''));bad++;}
 return p;
}

console.log('🎰🚌 バスガチャの矛盾検査');
console.log('─'.repeat(66));

/* ① 実際の排出(gcPick)で10連×6000+単発×2000 */
try{
 for(let i=0;i<6000&&bad<8;i++){
  Math.random=lcg(i+1);
  const res=[];for(let k=0;k<10;k++)res.push(gcPick());
  run(res,i+1,'10連');n10++;}
 for(let i=0;i<2000&&bad<8;i++){
  Math.random=lcg(70000+i);
  run([gcPick()],70000+i,'単発');n1++;}
}finally{Math.random=realR;}

/* ② 端の形(★5×10 / ★1×10 / ★5×2 / 🎫確定チケット相当=単発★5) */
{
 const mk=list=>list.map(h=>({hero:h}));
 const edges=[
  ['★5×10',mk(Array.from({length:10},(_,i)=>H5[i%H5.length]))],
  ['★1×10',mk(Array.from({length:10},(_,i)=>H1[i%H1.length]))],
  ['★5×2+★1×8',mk([H5[0],H5[H5.length-1]].concat(Array.from({length:8},(_,i)=>H1[i%H1.length])))],
  ['🎫単発★5',mk([H5[0]])],
  ['単発★1',mk([H1[0]])]];
 for(const [lb,res] of edges)for(let s=0;s<400&&bad<8;s++)run(res,900000+s,lb);
}

/* ③ 出現率のゆるい見張り(★5×2の回だけ合成で4000回)=虹★50%/赤止まり10%(DESIGN) */
{
 const res=[{hero:H5[0]},{hero:H5[H5.length-1]}].concat(Array.from({length:8},(_,i)=>({hero:H1[i%H1.length]})));
 let mk9=0,rd9=0;const N=4000;
 for(let s=0;s<N;s++){const p=bgPlan(res,lcg(500000+s));if(p.mark)mk9++;if(p.tier===4)rd9++;}
 const mp=mk9/N*100,rp=rd9/N*100;
 if(Math.abs(mp-50)>4){console.log('  🔴 虹★の出方が50%から外れた('+mp.toFixed(1)+'%)');bad++;}
 if(Math.abs(rp-10)>3){console.log('  🔴 赤止まりが10%から外れた('+rp.toFixed(1)+'%)');bad++;}
 if(!bad)console.log('  ✅ ★5×2の回: 虹★'+mp.toFixed(1)+'% / 赤止まり'+rp.toFixed(1)+'%(狙い50/10)');
}

console.log('─'.repeat(66));
if(bad){console.log('🔴 '+bad+'件の矛盾。⚠**演出が結果と食い違っている**(seedで再現できる)');process.exit(1);}
console.log('🟢 10連'+n10+'回+単発'+n1+'回+端の形2000回=矛盾ゼロ');
process.exit(0);
