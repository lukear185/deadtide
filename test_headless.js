// DEADTIDE ヘッドレス実走テスト(単体・可搬版)
// 使い方: node test_headless.js [対象HTML(省略時 ./index.html)]
const fs=require('fs');
const TARGET=process.argv[2]||'./index.html';
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
 querySelectorAll:()=>[],addEventListener(){},body:{classList:{add(){},remove(){},toggle(){}}}};
global.innerWidth=800;global.innerHeight=380;global.devicePixelRatio=1;global.navigator={};
let NOW=0;global.performance={now:()=>NOW};
const rafq=[];global.requestAnimationFrame=f=>{rafq.push(f);return rafq.length;};
global.AudioContext=function(){return {state:'running',resume(){},createOscillator:()=>({type:'',frequency:{setValueAtTime(){},exponentialRampToValueAtTime(){}},connect:()=>({connect(){}}),start(){},stop(){}}),createGain:()=>({gain:{setValueAtTime(){},exponentialRampToValueAtTime(){}},connect:()=>({connect(){}})}),destination:{},currentTime:0};};
global.Peer=function(){return {on(){},destroy(){},connect:()=>({on(){},open:false})};};
const html=fs.readFileSync(TARGET,'utf-8');
const js=html.split('<script>')[1].split('</'+'script>')[0];
const body=`
;console.log('LOAD OK. PLEN='+Math.round(PLEN)+' slots='+SLOTS.length+' units='+UNITS.length+' STAGE_W='+STAGE_W);
function frames(n,step){for(let i=0;i<n;i++){NOW+=step*1000;const q=rafq.splice(0);for(const f of q)f(NOW);}}
function chkShares(tag){
 if(!G||G.pve)return;
 const alive=G.players.filter(p=>!p.dead).length;
 const sum=G.tide.shares.reduce((a,b)=>a+b,0);
 if(alive>0&&Math.abs(sum-100)>2){console.log('FAIL sharesum '+tag+' ='+sum.toFixed(1));process.exit(1);}
 for(const x of G.tide.shares)if(x<-0.01){console.log('FAIL negative share '+tag);process.exit(1);}
}
/* ---- PvEソロ(ステージ制) ---- */
function runPvE(diff,tag,cheat){
 setDiff=diff;
 startSolo();
 frames(30,.016);
 buildTower(G.players[0],2,0);buildTower(G.players[0],1,0);
 let guard=0,dep=0,struck=false;
 while(G&&!G.over&&guard++<60000){
  frames(1,.033);
  const me=G.players[0];
  if(!struck&&me.charge>=1&&me.zombies.length){const z=me.zombies[0];airstrike(me,z.px,z.py,G.wave);struck=true;}
  if(G.phase==='wave'&&Math.random()<.02){if(deployUnit(me,ri(0,me.uUn-1)))dep++;}
  if(guard%1400===700&&G.phase==='wave'){me.flagD=clamp(projPath(ri(150,1450),ri(150,700)),PLEN*.1,PLEN*.9);}
  if(cheat&&G.phase==='wave'&&guard%90===0){
   for(let si=0;si<SLOTS.length;si++){if(!me.towers[si]){const ti=me.unlocked-1;if(me.scrap>=TOWERS[ti].cost){buildTower(me,si,ti);}break;}}
   for(let si=0;si<SLOTS.length;si++){const tw=me.towers[si];if(tw&&tw.lv<3&&me.scrap>=upCost(tw.ti,tw.lv)){upTower(me,si);break;}}
  }
  if(G.phase==='interval'&&!me.ready){
   if(cheat)me.scrap+=1500;
   doPurchase(me,'unlock',{});doPurchase(me,'uun',{});doPurchase(me,'atk',{});doPurchase(me,'repair',{});
   me.ready=true;
  }
 }
 const mins=Math.round(guard*.033/60*10)/10;
 const me=G?G.players[0]:null;
 const won=G&&G.winner===0;
 console.log(tag+': over='+(G&&G.over)+' wave='+(G&&G.wave)+'/'+STAGE_W+' 結果='+(won?'クリア':'陥落')+' dep0='+dep+' guard='+guard+' ('+mins+'分)');
 if(me)console.log('  [キミ] core='+Math.ceil(me.core)+' kills='+me.kills+' twr='+me.towers.filter(t=>t).length+' uUn='+me.uUn+' 回収⚙️='+Math.round(me.enTotal));
 if(!G||!G.over){console.log('FAIL: 終了せず');process.exit(1);}
 if(guard<600){console.log('FAIL: 即終了(PvE勝敗判定バグの疑い)');process.exit(1);}
 backTitle();
 return won;
}
/* ---- 対戦(ホスト相当・CPU2で三つ巴) ---- */
function runPvP(tag){
 MODE='solo';
 newGame([{name:'キミ',kind:'me'},{name:'CPUカラス',kind:'cpu',ai:DIFFS[2]},{name:'CPUハイエナ',kind:'cpu',ai:DIFFS[1]}],0);
 startGameUI([{i:1,n:'CPUカラス'},{i:2,n:'CPUハイエナ'}]);
 frames(30,.016);
 buildTower(G.players[0],2,0);buildTower(G.players[0],1,0);
 let guard=0,struck=false,pushed=0,dep=0;
 while(G&&!G.over&&guard++<30000){
  frames(1,.033);
  if(guard%500===0)chkShares(tag+'@'+guard);
  if(!struck&&G.players[0].charge>=1&&G.players[0].zombies.length){const z=G.players[0].zombies[0];airstrike(G.players[0],z.px,z.py,G.wave);struck=true;}
  if(pushed<5&&G.phase==='wave'&&G.players[0].scrap>200&&Math.random()<.01){if(pushTide(G.players[0],-1))pushed++;}
  if(G.phase==='wave'&&Math.random()<.02){if(deployUnit(G.players[0],ri(0,G.players[0].uUn-1)))dep++;}
  if(guard%1400===700&&G.phase==='wave'){G.players[0].flagD=clamp(projPath(ri(150,1450),ri(150,700)),PLEN*.1,PLEN*.9);}
  if(G.phase==='interval'&&!G.players[0].ready){
   const me=G.players[0];
   doPurchase(me,'unlock',{});doPurchase(me,'uun',{});doPurchase(me,'atk',{});
   const tgt=G.players.findIndex((p,i)=>i!==0&&!p.dead);
   if(tgt>0){doPurchase(me,'big',{tgt});doPurchase(me,'send',{tgt,zi:1,cnt:3});}
   me.ready=true;
  }
 }
 const mins=Math.round(guard*.033/60*10)/10;
 console.log(tag+': over='+(G&&G.over)+' wave='+(G&&G.wave)+' winner='+(G&&G.winner>=0?G.players[G.winner].name:'?')+' places=['+(G?G.players.map(p=>p.name+':'+p.place).join(','):'')+'] dep0='+dep+' push0='+pushed+' guard='+guard+' ('+mins+'分)');
 for(const P of (G?G.players:[])) console.log('  ['+P.name+'] dead='+P.dead+' core='+Math.ceil(P.core)+' units='+P.units.length+' dep='+P.dep+' kills='+P.kills+' twr='+P.towers.filter(t=>t).length+' 回収⚙️='+Math.round(P.enTotal)+' uUn='+P.uUn);
 if(!G||!G.over){console.log('FAIL: 終了せず');process.exit(1);}
 if(mins>10)console.log('WARN: 決着まで10分超('+mins+'分)');
 backTitle();
}
runPvE(1,'PvE古参(素の腕前)',false);
const won=runPvE(1,'PvE古参(強化プレイ)',true);
if(!won)console.log('WARN: 強化プレイでもステージクリア不可(バランス要確認)');
runPvP('対戦三つ巴');
console.log('ALL TESTS DONE');
process.exit(0);
`;
try{eval(js+'\n'+body);}catch(e){console.log('LOAD FAIL:',e.message,(e.stack||'').split('\n').slice(0,4).join(' | '));process.exit(1);}
