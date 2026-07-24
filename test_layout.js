/* 一時: 画面レイアウトの当たり判定チェック(iPhone横向き 852x393 想定) */
const fs=require('fs');
const RECTS={
 abar:{left:0,top:331,right:852,bottom:393,width:852,height:62},
 topbar:{left:59,top:3,right:650,bottom:32,width:591,height:29},
 minis:{left:0,top:0,right:0,bottom:0,width:0,height:0},
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
;fitCanvas();
const css=v=>v/DPR;
console.log('画面 852x393 / DPR='+DPR+'  倍率SC(CSS)='+(SC/DPR).toFixed(4));
const fw=css(MW*SC),fh=css(MH*SC);
console.log('フィールド見た目='+fw.toFixed(0)+'x'+fh.toFixed(0)+'CSSpx  横の余白=左右'+css(OX).toFixed(0)+'px  上端OY='+css(OY).toFixed(0)+'px(マイナス=空を画面外へ)');
console.log('空の見えている高さ='+(css(OY)+SKYH*SC/DPR).toFixed(1)+'px');
const R=${JSON.stringify(RECTS)};
const S=(x,y)=>[css(OX+x*SC),css(OY+y*SC)];
function hit(x,y,r,box){return x+r>box.left&&x-r<box.right&&y+r>box.top&&y-r<box.bottom;}
let bad=0;
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
/* 経路が操作バーに潜らないか(細かくサンプル) */
let low=0;for(let d=0;d<=PLEN;d+=20){const p=pathPos(d);const [x,y]=S(p[0],p[1]);if(y+css(50*SC)>R.abar.top)low++;}
console.log('道路が操作バーに潜る点='+low+'箇所');
if(low)bad++;
console.log(bad?('要修正 '+bad+'件'):'レイアウト判定: 重なりゼロ OK');
process.exit(0);
`;
try{eval(js+'\n'+body);}catch(e){console.log('LOAD FAIL:',e.message,(e.stack||'').split('\n').slice(0,4).join(' | '));process.exit(1);}
