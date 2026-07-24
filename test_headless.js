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
;console.log('LOAD OK. PLEN='+Math.round(PLEN)+' slots='+SLOTS.length+' units='+UNITS.length);
function frames(n,step){for(let i=0;i<n;i++){NOW+=step*1000;const q=rafq.splice(0);for(const f of q)f(NOW);}}
function chkShares(tag){
 if(!G)return;
 const alive=G.players.filter(p=>!p.dead).length;
 const sum=G.tide.shares.reduce((a,b)=>a+b,0);
 if(alive>0&&Math.abs(sum-100)>2){console.log('FAIL sharesum '+tag+' ='+sum.toFixed(1));process.exit(1);}
 for(const x of G.tide.shares)if(x<-0.01){console.log('FAIL negative share '+tag);process.exit(1);}
}
function runMatch(cpu,diff,tag){
 setCpu=cpu;setDiff=diff;
 startSolo();
 frames(30,.016);
 buildTower(G.players[0],2,0);buildTower(G.players[0],1,0);
 let guard=0,struck=false,pushed=0,dep=0;
 while(G&&!G.over&&guard++<30000){
  frames(1,.033);
  if(guard%500===0)chkShares(tag+'@'+guard);
  if(!struck&&G.players[0].charge>=1&&G.players[0].zombies.length){const z=G.players[0].zombies[0];airstrike(G.players[0],z.px,z.py,G.wave);struck=true;}
  if(pushed<5&&G.phase==='wave'&&G.players[0].scrap>200&&Math.random()<.01){if(pushTide(G.players[0],-1))pushed++;}
  if(G.phase==='wave'&&Math.random()<.02){if(typeof deployUnit==='function'&&deployUnit(G.players[0],ri(0,Math.min(1,G.players[0].uUn-1))))dep++;}
  if(G.phase==='interval'&&!G.players[0].ready){
   const me=G.players[0];
   doPurchase(me,'unlock',{});doPurchase(me,'atk',{});
   const tgt=G.players.findIndex((p,i)=>i!==0&&!p.dead);
   if(tgt>0){doPurchase(me,'big',{tgt});doPurchase(me,'send',{tgt,zi:1,cnt:3});}
   me.ready=true;
  }
 }
 console.log(tag+': over='+(G&&G.over)+' wave='+(G&&G.wave)+' winner='+(G&&G.winner>=0?G.players[G.winner].name:'?')+' places=['+(G?G.players.map(p=>p.name+':'+p.place).join(','):'')+'] dep0='+dep+' push0='+pushed+' guard='+guard);
 for(const P of (G?G.players:[])) console.log('  ['+P.name+'] dead='+P.dead+' core='+Math.ceil(P.core)+' units='+P.units.length+' dep='+P.dep+' kills='+P.kills+' twr='+P.towers.filter(t=>t).length);
 if(!G||!G.over){console.log('FAIL: 終了せず');process.exit(1);}
 backTitle();
}
runMatch(1,2,'1v1鬼軍曹');
runMatch(2,1,'三つ巴古参');
console.log('ALL TESTS DONE');
process.exit(0);
`;
try{eval(js+'\n'+body);}catch(e){console.log('LOAD FAIL:',e.message,(e.stack||'').split('\n').slice(0,4).join(' | '));process.exit(1);}
