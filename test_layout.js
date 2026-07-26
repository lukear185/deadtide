/* 画面レイアウトの当たり判定チェック(iPhone横向き 852x393・セーフエリア左右59/下21 想定)
   使い方: node test_layout.js  → 倍率・余白と、全スロット/コア/道路がUIに被っていないかを判定 */
const fs=require('fs');
const RECTS={
 /* 操作バー: 上下padding(3+7) + カード高72 = 82 (スマホ指定。PCは card78 → 86) */
 abar:{left:0,top:311,right:852,bottom:393,width:852,height:82},
 /* 上のHUD: WAVE+コア+⚙️+🔩+⏸ まで(🏳諦めると🔊は操作バーへ移動済み)。
    右端=セーフエリア59+実測455=514(WAVEパネルは最長表示ぶんを常に確保する固定幅) */
 topbar:{left:59,top:3,right:514,bottom:32,width:455,height:29},
 minis:{left:0,top:0,right:0,bottom:0,width:0,height:0},
};
/* 対戦だけ出るもの(セーフエリア左59/右59を見込んだ実測値)。
   死潮ゲージは上のHUDの真下・左寄せの1行(2026-07-25にここへ移した)。
   ミニ盤面は右上に縦積み=そのぶんマップは左へ寄る(minisResPx) */
const VS={
 tidebar:{left:67,top:33,right:267,bottom:47,width:200,height:14},
 minis:{left:669,top:8,right:793,bottom:250,width:124,height:242},
};
function mkCtx(){return new Proxy({},{get:(t,k)=>{
 if(k==='canvas')return {};
 if(k==='createLinearGradient'||k==='createRadialGradient')return ()=>({addColorStop(){}});
 if(k==='measureText')return ()=>({width:10});
 return typeof k==='string'?()=>{}:undefined;},set:()=>true});}
function mkEl(id){return {id,children:[],classList:{add(){},remove(){},toggle(){},contains:()=>false},
 style:new Proxy({},{get:()=>'',set:()=>true}),dataset:{},disabled:false,
 set innerHTML(v){},get innerHTML(){return ''},set textContent(v){},get textContent(){return ''},
 appendChild(){},remove(){},querySelector:()=>mkEl(id+'_q'),querySelectorAll:()=>[],
 addEventListener(){},getContext:mkCtx,
 getBoundingClientRect:()=>RECTS[id]||{left:0,top:0,width:800,height:380,right:800,bottom:380},
 clientWidth:852,clientHeight:393,width:0,height:0,offsetWidth:100,offsetHeight:60,value:'',
 set onclick(f){},get onclick(){return null}};}
const cache={};
global.window=global;
global.document={getElementById:id=>cache[id]||(cache[id]=mkEl(id)),createElement:()=>mkEl('dyn'),
 querySelectorAll:()=>[],addEventListener(){},body:{classList:{add(){},remove(){},toggle(){}}}};
global.innerWidth=852;global.innerHeight=393;global.devicePixelRatio=3;global.navigator={};
let NOW=0;global.performance={now:()=>NOW};
const rafq=[];global.requestAnimationFrame=f=>{rafq.push(f);return rafq.length;};
global.AudioContext=function(){return {state:'running',resume(){},createOscillator:()=>({type:'',frequency:{setValueAtTime(){},exponentialRampToValueAtTime(){}},connect:()=>({connect(){}}),start(){},stop(){}}),createGain:()=>({gain:{setValueAtTime(){},exponentialRampToValueAtTime(){}},connect:()=>({connect(){}})}),destination:{},currentTime:0};};
global.Peer=function(){return {on(){},destroy(){},connect:()=>({on(){},open:false})};};
const html=fs.readFileSync('./index.html','utf-8');
const js=html.split('<script>')[1].split('</'+'script>')[0];
const body=`
;NOW=5000;/* 起動直後の400ms間は既定値が返るため、実測が走る時刻まで進めてから測る */
fitCanvas();
const css=v=>v/DPR;
console.log('画面 852x393 / DPR='+DPR+'  倍率SC(CSS)='+(SC/DPR).toFixed(4));
const fw=css(MW*SC),fh=css(MH*SC);
console.log('フィールド見た目='+fw.toFixed(0)+'x'+fh.toFixed(0)+'CSSpx  横の余白=左右'+css(OX).toFixed(0)+'px  上端OY='+css(OY).toFixed(0)+'px(マイナス=空を画面外へ)');
console.log('空の見えている高さ='+(css(OY)+SKYH*SC/DPR).toFixed(1)+'px');
const R=${JSON.stringify(RECTS)},VS=${JSON.stringify(VS)};
const S=(x,y)=>[css(OX+x*SC),css(OY+y*SC)];
function hit(x,y,r,box){return x+r>box.left&&x-r<box.right&&y+r>box.top&&y-r<box.bottom;}
let bad=0;
/* 全ステージのマス・道路がUIに被っていないか */
for(let si=0;si<STAGES.length;si++){
 loadStage(si);
 let ng=0;
 SLOTS.forEach((s,i)=>{const [x,y]=S(s[0],s[1]);
  for(const k of ['abar','topbar']){const b=R[k];if(!b.width)continue;
   if(hit(x,y,30*SC/DPR,b)){console.log('NG: ステージ'+(si+1)+' スロット'+i+' が '+k+' と重なる');ng++;}}
  if(x<0||y<0||x>852||y>393){console.log('NG: ステージ'+(si+1)+' スロット'+i+' が画面外');ng++;}});
 let lo=0,up2=0;
 for(let d=0;d<=PLEN;d+=10){const p=pathPos(d);const [x,y]=S(p[0],p[1]);const r=css(52*SC);
  if(y+r>R.abar.top)lo++;if(hit(x,y,r,R.topbar))up2++;}
 if(lo){console.log('NG: ステージ'+(si+1)+' 道路が操作バーに潜る '+lo+'点');ng++;}
 if(up2){console.log('NG: ステージ'+(si+1)+' 道路が上のHUDに潜る '+up2+'点');ng++;}
 console.log('ステージ'+(si+1)+' ('+STAGES[si].n+'): マス'+SLOTS.length+'個・道路'+(ng?'✗':'OK'));
 bad+=ng;
}
loadStage(0);
SLOTS.forEach((s,i)=>{const [x,y]=S(s[0],s[1]);
 for(const k of ['abar','topbar']){const b=R[k];if(!b.width)continue;
  if(hit(x,y,30*SC/DPR,b)){console.log('NG: スロット'+i+' ('+s[0]+','+s[1]+') が '+k+' と重なる → 画面('+x.toFixed(0)+','+y.toFixed(0)+')');bad++;}}
 if(x<0||y<0||x>852||y>393){console.log('NG: スロット'+i+' が画面外 ('+x.toFixed(0)+','+y.toFixed(0)+')');bad++;}
});
/* コア(経路の終点)と侵入口 */
const cE=PATH[PATH.length-1],cS=PATH[0];
[['コア',cE],['侵入口',cS]].forEach(([n,p])=>{const [x,y]=S(p[0],p[1]);
 let s='';for(const k of ['abar','topbar']){const b=R[k];if(b.width&&hit(x,y,46*SC/DPR,b))s+=' ['+k+'と重なる]';}
 console.log(n+' 画面('+x.toFixed(0)+','+y.toFixed(0)+')'+(s||' OK'));if(s)bad++;});
/* 道路(幅98=半分49に路肩を足して52)がUIに潜らないか。細かくサンプルして判定 */
let low=0,up=0;
for(let d=0;d<=PLEN;d+=10){const p=pathPos(d);const [x,y]=S(p[0],p[1]);const r=css(52*SC);
 if(y+r>R.abar.top)low++;
 if(hit(x,y,r,R.topbar))up++;
}
console.log('道路が操作バーに潜る点='+low+'箇所 / 上のHUDに潜る点='+up+'箇所');
if(low)bad++;
if(up)bad++;
/* ===== 対戦(死潮ゲージ+ミニ盤面)の重なり ===== */
/* ミニ盤面のぶんマップが左へ寄るので、対戦の倍率で測り直す */
/* ⚠minisResPx() と同じ式で測ること。幅だけで測ると本体側の直し(小窓の左端から画面右端までを余白にする)が
   検査に反映されず、**直したのに掛かったままに見える** */
MINIRES=Math.ceil(Math.max(VS.minis.width,innerWidth-VS.minis.left)+8);MINIT=NOW;fitCanvas();
const S2=(x,y)=>[css(OX+x*SC),css(OY+y*SC)];
function ovBox(a,b){return a.left<b.right&&a.right>b.left&&a.top<b.bottom&&a.bottom>b.top;}
console.log('--- 対戦 ---');
console.log('倍率SC(CSS)='+(SC/DPR).toFixed(4)+'  フィールド見た目='+css(MW*SC).toFixed(0)+'x'+css(MH*SC).toFixed(0)+'CSSpx');
/* ①死潮ゲージが上のHUD/ミニ盤面と重なっていないか(重なると コア/⚙️/🔩/⏸ が隠れる) */
for(const [k,b] of [['topbar',R.topbar],['minis',VS.minis]])
 if(ovBox(VS.tidebar,b)){console.log('NG: 死潮ゲージが '+k+' と重なる');bad++;}
/* ②死潮ゲージが道路に被っていないか(侵入口は画面右上=ここが本題) */
let tb=0;for(let d=0;d<=PLEN;d+=10){const p=pathPos(d);const [x,y]=S2(p[0],p[1]);const r=css(52*SC);
 if(hit(x,y,r,VS.tidebar))tb++;}
if(tb){console.log('NG: 死潮ゲージが道路に被る '+tb+'点');bad++;}
else console.log('死潮ゲージ x 道路: OK');
/* ③ ⭐ミニ盤面と道路の重なりは**許さない**(2026-07-26ユーザー指示「完全にかからないようにして」)。
   以前は「参考表示」で失敗にしていなかったが、要件になったので NG にする。
   直し方=マップを縮める(fitCanvas が PMAXX まで収める)か、小窓を小さくする */
let ts=0;SLOTS.forEach(s=>{const [x,y]=S2(s[0],s[1]);if(hit(x,y,30*SC/DPR,VS.tidebar))ts++;});
let ms=0;for(let d=0;d<=PLEN;d+=10){const p=pathPos(d);const [x,y]=S2(p[0],p[1]);
 if(hit(x,y,css(52*SC),VS.minis))ms++;}
if(ms){console.log('NG: ミニ盤面が道路(マップ外の侵入路)に掛かる '+ms+'点');bad++;}
else console.log('ミニ盤面 x 道路: OK(掛かる点ゼロ)');
console.log('参考: 死潮ゲージが建設マスの上端をかすめる='+ts+'個');
MINIRES=0;MINIT=NOW;fitCanvas();
console.log(bad?('要修正 '+bad+'件'):'レイアウト判定: 重なりゼロ OK');
process.exit(0);
`;
try{eval(js+'\n'+body);}catch(e){console.log('LOAD FAIL:',e.message,(e.stack||'').split('\n').slice(0,4).join(' | '));process.exit(1);}
