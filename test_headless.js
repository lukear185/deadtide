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
function frames(n,step){for(let i=0;i<n;i++){NOW+=step*1000;const q=rafq.splice(0);for(const f of q)f(NOW);
 try{if(typeof PAUSED!=='undefined'&&PAUSED&&typeof INTROQ!=='undefined'){let g=0;while(PAUSED&&g++<40)introNext();}}catch(e){}}}
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
 /* 初期解放されている枠(AI_ORDERの先頭6つ)から選ぶこと */
 buildTower(G.players[0],2,0);buildTower(G.players[0],8,0);
 let guard=0,dep=0,struck=false;
 while(G&&!G.over&&guard++<60000){
  frames(1,.033);
  const me=G.players[0];
  if(!struck&&me.charge>=1&&me.zombies.length){const z=me.zombies[0];airstrike(me,z.px,z.py,G.wave);struck=true;}
  if(G.phase==='wave'&&Math.random()<.02){if(deployUnit(me,ri(0,me.uUn-1)))dep++;}
  if(guard%1400===700&&G.phase==='wave'){me.flagD=clamp(projPath(ri(150,1450),ri(150,700)),PLEN*.1,PLEN*.9);}
  if(cheat&&G.phase==='wave'&&guard%90===0){
   for(let si=0;si<SLOTS.length;si++){if(!me.towers[si]){const ti=me.unlocked-1;if(me.scrap>=TOWERS[ti].cost){buildTower(me,si,ti);}break;}}
   for(let si=0;si<SLOTS.length;si++){const tw=me.towers[si];if(!tw)continue;let done=false;
    for(const st of twStats(tw.ti)){if(tw.us[st]<USTAT_MAX&&(me.up||0)>=stCost(tw,st)){upTower(me,si,st);done=true;break;}}
    if(done)break;}
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
 console.log(tag+': over='+(G&&G.over)+' wave='+(G&&G.wave)+'/'+curW()+' 結果='+(won?'クリア':'陥落')+' dep0='+dep+' guard='+guard+' ('+mins+'分)');
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
 /* 初期解放されている枠(AI_ORDERの先頭6つ)から選ぶこと */
 buildTower(G.players[0],2,0);buildTower(G.players[0],8,0);
 let guard=0,struck=false,pushed=0,dep=0;
 while(G&&!G.over&&guard++<40000){
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
/* ---- 協力プレイ(ホスト+疑似リモート2) ---- */
function runCoop(tag){
 MODE='solo';
 newGame([{name:'ホスト',kind:'me'},{name:'P2',kind:'remote'},{name:'P3',kind:'remote'}],0);
 COOP=true;G.pve=1;G.coop=1;G.pveDiff=2;
 for(const P of G.players)P.scrap=D5[2].scrap;
 G.players[0].coreMax=90;G.players[0].core=90;
 startGameUI([{i:1,n:'P2'},{i:2,n:'P3'}]);
 frames(30,.016);
 buildTower(G.players[0],2,0);buildTower(G.players[1],8,0);buildTower(G.players[2],12,0);
 let guard=0,dep=[0,0,0];
 while(G&&!G.over&&guard++<60000){
  frames(1,.033);
  const F=G.players[0];
  if(G.phase==='wave'){
   for(let pi=0;pi<3;pi++){const P=G.players[pi];
    if(Math.random()<.02&&deployUnit(P,ri(0,P.uUn-1)))dep[pi]++;
    if(guard%(1100+pi*300)===500)P.flagD=clamp(projPath(ri(150,1450),ri(150,700)),PLEN*.1,PLEN*.9);}
   if(guard%120===0){for(let pi=0;pi<3;pi++){const P=G.players[pi];
    for(let si=0;si<SLOTS.length;si++){if(!F.towers[si]&&P.unlocked>0&&P.scrap>=TOWERS[P.unlocked-1].cost){buildTower(P,si,P.unlocked-1);break;}}
    for(let si=0;si<SLOTS.length;si++){const tw=F.towers[si];if(!tw||(tw.own||0)!==pi)continue;let done=false;
     for(const st of twStats(tw.ti)){if(tw.us[st]<USTAT_MAX&&(P.up||0)>=stCost(tw,st)){upTower(P,si,st);done=true;break;}}
     if(done)break;}}}
  }
  if(G.phase==='interval'){for(const P of G.players){if(!P.ready){P.scrap+=600;doPurchase(P,'unlock',{});doPurchase(P,'uun',{});doPurchase(P,'atk',{});doPurchase(P,'repair',{});P.ready=true;}}}
 }
 const mins=Math.round(guard*.033/60*10)/10;
 const F=G?G.players[0]:null,won=G&&G.winner===0;
 const owns=[0,0,0];if(F)for(const u of F.units)owns[u.own||0]++;
 console.log(tag+': over='+(G&&G.over)+' wave='+(G&&G.wave)+'/'+curW()+' 結果='+(won?'クリア':'陥落')+' dep=['+dep.join(',')+'] 部隊owner内訳=['+owns.join(',')+'] コア='+(F?Math.ceil(F.core)+'/'+F.coreMax:'?')+' ('+mins+'分)');
 if(F)console.log('  各自⚙️=['+G.players.map(P=>Math.round(P.scrap)).join(',')+'] uUn=['+G.players.map(P=>P.uUn).join(',')+'] twr='+F.towers.filter(t=>t).length);
 if(!G||!G.over){console.log('FAIL: 終了せず');process.exit(1);}
 if(guard<600){console.log('FAIL: 即終了(協力の勝敗判定バグの疑い)');process.exit(1);}
 if(dep[1]===0||dep[2]===0){console.log('FAIL: リモートプレイヤーの出撃が機能していない');process.exit(1);}
 COOP=false;backTitle();
 return won;
}
/* ---- ステージ2(沈んだ港・海の亡骸)の疎通確認 ---- */
function runStage2(){
 META.sc=[[1,1,1,1,1,1],[1,1,1,1,1,1]];META.sclr=[1];META.stg=1;
 const seen={};
 setDiff=1;startSolo();
 frames(30,.016);
 if(STAGE!==1){console.log('FAIL: ステージ2が読み込まれていない');process.exit(1);}
 buildTower(G.players[0],STAGES[1].order[0],0);
 let guard=0;
 while(G&&!G.over&&guard++<9000){
  frames(1,.033);
  const me=G.players[0];
  for(const z of me.zombies)seen[ZOMBIES[z.zi].n]=1;
  if(G.phase==='wave'&&Math.random()<.02)deployUnit(me,ri(0,me.uUn-1));
  if(G.phase==='interval'&&!me.ready){doPurchase(me,'unlock',{});doPurchase(me,'uun',{});me.ready=true;}
 }
 const names=Object.keys(seen);
 console.log('ステージ2: wave='+(G?G.wave:'?')+' 出た敵='+names.join('/'));
 const bad=names.filter(n=>['ウォーカー','ランナー','アーマード','ブローター'].indexOf(n)>=0);
 if(bad.length){console.log('FAIL: ステージ1のゾンビが混ざっている '+bad.join(','));process.exit(1);}
 if(!names.length){console.log('FAIL: 敵が1体も出ていない');process.exit(1);}
 META.stg=0;backTitle();loadStage(0);
}
/* ---- 最終ウェーブのボスが、ステージ専用の特別な1体になっているか ---- */
function checkFinalBoss(){
 const want=[['ステージ1',0,FIN_ZI,4],['ステージ2',1,FIN2_ZI,4],['🌑ナイトメア',0,FINNM_ZI,NM_DIFF]];
 for(const [nm,si,fi,df] of want){
  META.sc=[[1,1,1,1,1,1],[1,1,1,1,1,1]];META.sclr=[1];META.stg=si;META.nmOK=1;setDiff=df;startSolo();
  /* 通常のボス波(15)と最終波を作って中身を見る */
  const got=[];
  for(const w of [15,20]){
   buildTide(w);
   const b=G.tide.pool.find(e=>e.boss);
   got.push(b?ZOMBIES[b.z.zi].n:'なし');
  }
  console.log(nm+': WAVE15のボス='+got[0]+' / 最終WAVE20のボス='+got[1]);
  if(!ZOMBIES[fi]||got[1]!==ZOMBIES[fi].n){console.log('FAIL: 最終ボスが出ていない('+nm+')');process.exit(1);}
  if(got[0]===got[1]){console.log('FAIL: 通常ボスと最終ボスが同じ('+nm+')');process.exit(1);}
  backTitle();
 }
 META.stg=0;setDiff=2;loadStage(0);
}
/* ---- 🌑ナイトメア(獣プール)を実走: 獣しか出ないか・最終ボスまで描画で例外が出ないか ---- */
function runNightmare(){
 META.sc=[[1,1,1,1,1,1],[1,1,1,1,1,1]];META.sclr=[1];META.stg=0;META.nmOK=1;setDiff=NM_DIFF;startSolo();
 frames(30,.016);
 if(!isNM()){console.log('FAIL: ナイトメアになっていない');process.exit(1);}
 const seen={};
 let guard=0;
 while(G&&!G.over&&guard++<9000){
  frames(1,.033);
  const me=G.players[0];
  for(const z of me.zombies)seen[ZOMBIES[z.zi].n]=1;
  if(G.phase==='wave'&&Math.random()<.02)deployUnit(me,ri(0,me.uUn-1));
  if(G.phase==='interval'&&!me.ready){doPurchase(me,'unlock',{});doPurchase(me,'uun',{});me.ready=true;}
 }
 const names=Object.keys(seen);
 console.log('🌑ナイトメア: wave='+(G?G.wave:'?')+' 出た敵='+names.join('/'));
 const bad=names.filter(n=>{const Z=ZOMBIES.find(q=>q.n===n);return !Z||!Z.nm;});
 if(bad.length){console.log('FAIL: 獣以外が混ざっている '+bad.join(','));process.exit(1);}
 if(!names.length){console.log('FAIL: 敵が1体も出ていない');process.exit(1);}
 /* 最終ボスは描画も通しておく(bakeZ→drawZombieで例外が出ないこと) */
 try{SPR.z={};bakeZ(FINNM_ZI,0);bakeZ(FINNM_ZI,1);}
 catch(e){console.log('FAIL: 原初の獣の描画で例外: '+e.message);process.exit(1);}
 setDiff=2;backTitle();loadStage(0);
}
/* ---- 砲撃4種+機関銃掃射が、発射も着弾も例外なく通るか ----
   ⚠rAFの中の例外はtry/catchに飲まれるので、着弾処理は直接呼んで確かめる */
function checkStrikes(){
 META.stg=0;setDiff=1;startSolo();
 frames(20,.016);
 const me=G.players[0],p=pathPos(PLEN*.5),ks=Object.keys(STRIKES);
 for(const k of ks){
  me.stk=k;me.charge=1;
  let ok=false;
  try{ok=airstrike(me,p[0],p[1],3);}catch(e){console.log('FAIL: 砲撃'+k+'の発射で例外: '+e.message);process.exit(1);}
  if(!ok){console.log('FAIL: 砲撃'+k+'が発射できない');process.exit(1);}
  try{airstrikeHit(me,p[0],p[1],3,k,true);}catch(e){console.log('FAIL: 砲撃'+k+'の着弾処理で例外: '+e.message);process.exit(1);}
 }
 frames(120,.033);/* 飛んでいる弾を着弾させる */
 console.log('砲撃'+ks.length+'種('+ks.join('/')+'): 発射と着弾OK');
 backTitle();
}
/* ---- 冷却塔の完全凍結が本当に効いているか ----
   ⚠campStepはrAFの中なので例外もロジック抜けもテストに出ない。直接呼んで数字で確かめる */
function checkCryo(){
 META.stg=0;setDiff=2;startSolo();
 frames(20,.016);
 const me=G.players[0],ti=TOWERS.findIndex(t=>t.id==='cryo');
 if(ti<0){console.log('FAIL: 冷却塔が見つからない');process.exit(1);}
 const si=AI_ORDER[0];me.scrap=9999;me.towers[si]=null;me.unlocked=Math.max(me.unlocked,ti+1);
 buildTower(me,si,ti);
 if(!me.towers[si]||me.towers[si].ti!==ti){console.log('FAIL: 冷却塔が建たない');process.exit(1);}
 /* 塔の足元に敵を1体置いて、凍る→止まる→解ける→再凍結しない を見る */
 const [sx,sy]=SLOTS[si];
 me.zombies.length=0;
 const z=mkZ(zSpec(0,1,5),projPath(sx,sy));
 z.hp=z.mhp=1e9;/* 凍結の検証中に死なせない */
 me.zombies.push(z);
 me.towers[si].cd=0;
 let frozeAt=-1,movedWhileFrozen=0,d0=0;
 for(let k=0;k<400;k++){
  const wasF=z.frzT>0;d0=z.d;
  campStep(me,.05,G.wave);
  if(z.frzT>0&&frozeAt<0)frozeAt=k;
  if(wasF&&z.frzT>0&&Math.abs(z.d-d0)>1e-6)movedWhileFrozen++;
 }
 if(frozeAt<0){console.log('FAIL: 冷却塔が敵を凍らせていない');process.exit(1);}
 if(movedWhileFrozen){console.log('FAIL: 凍結中なのに敵が動いている '+movedWhileFrozen+'回');process.exit(1);}
 /* 解凍直後に撃たれても再凍結しないこと(永久ロック防止) */
 z.frzT=0;z.frzCd=1.5;
 me.towers[si].cd=0;campStep(me,.05,G.wave);
 if(z.frzT>0){console.log('FAIL: 凍結耐性(frzCd)が効いていない=永久ロックできてしまう');process.exit(1);}
 /* 同じ敵を凍らせられる回数の上限(初期5・❄冷却回数で最大10) */
 const tw=me.towers[si],Tc=TOWERS[tw.ti];
 if(twFrzN(Tc,tw)!==5){console.log('FAIL: 冷却回数の初期値が5でない '+twFrzN(Tc,tw));process.exit(1);}
 tw.us.f=USTAT_MAX;
 if(twFrzN(Tc,tw)!==10){console.log('FAIL: 冷却回数を最大まで上げても10にならない '+twFrzN(Tc,tw));process.exit(1);}
 if(twStats(tw.ti).indexOf('d')>=0){console.log('FAIL: 冷却塔に⚔攻撃の強化が残っている');process.exit(1);}
 if(twStats(tw.ti).indexOf('f')<0){console.log('FAIL: 冷却塔に❄冷却回数の強化が無い');process.exit(1);}
 tw.us.f=0;
 z.frzT=0;z.frzCd=0;z.frzUsed=5;/* 5回使い切った敵はもう凍らない */
 tw.cd=0;campStep(me,.05,G.wave);
 if(z.frzT>0){console.log('FAIL: 上限(5回)を超えて凍っている');process.exit(1);}
 console.log('冷却塔: '+(frozeAt*.05).toFixed(2)+'秒で凍結・凍結中の移動0・再凍結なし・同じ敵は5回まで(強化で10) OK');
 backTitle();
}
/* ---- 火炎放射塔の周囲ダメージ / レーザー塔の焼き切り / 廃品工房の建て替え(2026-07-26) ---- */
function checkTwNew(){
 META.stg=0;setDiff=2;startSolo();
 frames(20,.016);
 const me=G.players[0],si=AI_ORDER[0],[sx,sy]=SLOTS[si];
 /* ① 火炎放射塔: 狙った1体の周りにも1/4だけ通る */
 {const ti=TOWERS.findIndex(t=>t.id==='flame');
  if(ti<0){console.log('FAIL: 火炎放射塔が見つからない');process.exit(1);}
  me.scrap=99999;me.towers[si]=null;me.unlocked=Math.max(me.unlocked,ti+1);
  buildTower(me,si,ti);
  me.zombies.length=0;
  /* 塔の目の前に3体重ねて置く(px/pyはcampStepでしか入らないので1回回してから測る) */
  for(let k=0;k<3;k++){const z=mkZ(zSpec(0,1,5),projPath(sx,sy));z.hp=z.mhp=1e6;me.zombies.push(z);}
  me.towers[si].cd=999;campStep(me,.001,G.wave);/* 座標だけ入れる(まだ撃たせない) */
  const hp0=me.zombies.map(z=>z.hp);
  me.towers[si].cd=0;campStep(me,.001,G.wave);
  const hit=me.zombies.map((z,i)=>hp0[i]-z.hp).filter(d=>d>0).sort((a,b)=>b-a);
  if(hit.length<2){console.log('FAIL: 火炎放射塔が周りの敵に当たっていない(当たったのは'+hit.length+'体)');process.exit(1);}
  const r=hit[1]/hit[0];
  if(Math.abs(r-.25)>.02){console.log('FAIL: 火炎の周囲ダメージが直撃の1/4でない ('+(r*100).toFixed(1)+'%)');process.exit(1);}
  console.log('火炎放射塔: 直撃'+hit[0].toFixed(1)+' + 周りの'+(hit.length-1)+'体へ'+hit[1].toFixed(1)+'(直撃の'+(r*100).toFixed(0)+'%) OK');
 }
 /* ② レーザー塔: 同じ敵を撃ち続けると最大2倍・別の敵に移ると0に戻る */
 {const ti=TOWERS.findIndex(t=>t.id==='laser'),T=TOWERS[ti];
  if(ti<0){console.log('FAIL: レーザー塔が見つからない');process.exit(1);}
  me.scrap=99999;me.towers[si]=null;me.unlocked=Math.max(me.unlocked,ti+1);
  buildTower(me,si,ti);
  me.zombies.length=0;
  const z=mkZ(zSpec(0,1,5),projPath(sx,sy));z.hp=z.mhp=1e9;me.zombies.push(z);
  me.towers[si].cd=999;campStep(me,.001,G.wave);
  const tw=me.towers[si];
  /* 1発目(溜まり0)の被害量 */
  tw.cd=0;let h0=z.hp;campStep(me,.001,G.wave);const d1=h0-z.hp;
  /* heatN 発ぶん撃ち込んでから測る=最大まで焼き切った状態 */
  for(let k=0;k<T.heatN+2;k++){tw.cd=0;campStep(me,.001,G.wave);}
  tw.cd=0;h0=z.hp;campStep(me,.001,G.wave);const dMax=h0-z.hp;
  if(tw.hs!==T.heatN){console.log('FAIL: レーザーの溜まりが上限に達しない '+tw.hs+'/'+T.heatN);process.exit(1);}
  const mul=dMax/d1;
  if(Math.abs(mul-T.heatM)>.05){console.log('FAIL: レーザーが最大'+T.heatM+'倍にならない ('+mul.toFixed(2)+'倍)');process.exit(1);}
  /* 別の敵に移ったら0へ戻る */
  z.dead=true;z.hp=0;
  const z2=mkZ(zSpec(0,1,5),projPath(sx,sy));z2.hp=z2.mhp=1e9;me.zombies.push(z2);
  tw.cd=999;campStep(me,.001,G.wave);
  tw.cd=0;h0=z2.hp;campStep(me,.001,G.wave);const dNew=h0-z2.hp;
  if(tw.hs!==0){console.log('FAIL: 別の敵に移っても溜まりが残っている hs='+tw.hs);process.exit(1);}
  if(Math.abs(dNew-d1)>d1*.05){console.log('FAIL: 次の敵で威力が戻っていない '+dNew.toFixed(1)+' vs '+d1.toFixed(1));process.exit(1);}
  console.log('レーザー塔: 1発目'+d1.toFixed(1)+' → '+T.heatN+'発で'+dMax.toFixed(1)+'('+mul.toFixed(2)+'倍)・次の敵で'+dNew.toFixed(1)+'にリセット OK');
 }
 /* ③ 廃品工房 → 上級廃品工房への建て替え */
 {const ti=TOWERS.findIndex(t=>t.id==='scrap'),esi=ECO_BASE;
  me.scrap=99999;me.ecoN=Math.max(me.ecoN||1,1);me.towers[esi]=null;
  me.unlocked=Math.max(me.unlocked,ti+1);
  buildTower(me,esi,ti);
  const tw=me.towers[esi];
  if(!tw){console.log('FAIL: 廃品工房が建たない');process.exit(1);}
  if(canGrade(me,tw)){console.log('FAIL: 強化していないのに建て替えられる');process.exit(1);}
  for(const st of twStats(ti))tw.us[st]=USTAT_MAX;
  if(!canGrade(me,tw)){console.log('FAIL: 全部MAXにしても建て替えられない');process.exit(1);}
  /* 建て替える前後の産出(毎秒)を比べる=下がってはいけない */
  const rateOf=t=>{const T=TOWERS[t.ti];return (T.inc*(1+.2*t.us.d))/(T.rate*(1-.08*t.us.r));};
  const before=rateOf(tw);
  me.scrap=99999;
  if(!gradeTower(me,esi)){console.log('FAIL: 建て替えが通らない');process.exit(1);}
  if(tw.ti!==GRD_TI){console.log('FAIL: 上級廃品工房になっていない');process.exit(1);}
  if(twStats(tw.ti).some(st=>tw.us[st]!==0)){console.log('FAIL: 建て替えても強化Lvが0に戻っていない');process.exit(1);}
  const after=rateOf(tw);
  if(after<before){console.log('FAIL: 建て替えると産出が下がる '+before.toFixed(2)+'→'+after.toFixed(2)+'/秒');process.exit(1);}
  if(canGrade(me,tw)){console.log('FAIL: 上級廃品工房をさらに建て替えられる');process.exit(1);}
  for(const st of twStats(tw.ti))tw.us[st]=USTAT_MAX;
  /* 元を取るのにかかる時間も出す(安すぎると工房を並べるだけで勝ててしまう) */
  const maxR=rateOf(tw);let cst=GRD_COST;
  for(const st of twStats(tw.ti))for(let l=0;l<USTAT_MAX;l++)cst+=Math.round(TOWERS[tw.ti].cost*.45*Math.pow(1.75,l));
  const pay=Math.round(cst/(maxR-before));
  if(pay<150){console.log('FAIL: 上級化が安すぎる(元を取るのに'+pay+'秒)=工房を並べるだけで勝ててしまう');process.exit(1);}
  if(pay>600){console.log('FAIL: 上級化が高すぎる(元を取るのに'+pay+'秒)=1試合で元が取れない');process.exit(1);}
  console.log('上級廃品工房: 工房MAX'+before.toFixed(2)+'/秒 → 建て替え直後'+after.toFixed(2)+'/秒 → 上級MAX'+maxR.toFixed(2)+'/秒'
   +' (⚙️'+cst+'で+'+(maxR-before).toFixed(1)+'/秒=元を取るのに'+pay+'秒) OK');
 }
 /* ④ 上級廃品工房は建設リストにも解放チェーンにも出さない */
 if(GRD_TI<T_PLAY){console.log('FAIL: 上級廃品工房が解放チェーン(T_PLAY)に入っている');process.exit(1);}
 if(metaTowerCap()>T_PLAY){console.log('FAIL: 研究所の解放枠が T_PLAY を超えている');process.exit(1);}
 backTitle();
}
/* ---- 難易度の進行(新兵から順に開く)とステージの解放 ---- */
function checkProgress(){
 META.sc=[[0,0,0,0,0,0],[0,0,0,0,0,0]];META.sclr=[];
 if(!diffOK(0,0)){console.log('FAIL: 新兵が選べない');process.exit(1);}
 if(diffOK(0,1)){console.log('FAIL: 新兵をクリアしていないのに兵長が選べる');process.exit(1);}
 if(stageOK(1)){console.log('FAIL: ステージ1をナイトメアでクリアしていないのに港が開いている');process.exit(1);}
 scArr(0)[0]=1;
 if(!diffOK(0,1)){console.log('FAIL: 新兵クリア後に兵長が開かない');process.exit(1);}
 for(let d=1;d<=4;d++)scArr(0)[d]=1;
 if(stageOK(1)){console.log('FAIL: 悪夢どまりで港が開いている(ナイトメアが条件のはず)');process.exit(1);}
 scArr(0)[NM_DIFF]=1;
 if(!stageOK(1)){console.log('FAIL: ナイトメアをクリアしても港が開かない');process.exit(1);}
 /* 難易度ごとの最終ウェーブ */
 const ws=D5.map(d=>d.w).join('/');
 if(ws!=='5/7/10/15/20/20'){console.log('FAIL: 難易度ごとの最終ウェーブが違う '+ws);process.exit(1);}
 /* 港は廃線ハイウェイより重い */
 if(!((STAGES[1].hpM||1)>(STAGES[0].hpM||1))){console.log('FAIL: 港がステージ1より重くない');process.exit(1);}
 console.log('進行: 難易度は順に解放(最終W='+ws+')/港はナイトメアクリアで解放/港の重さx'+STAGES[1].hpM+' OK');
 META.sc=[[1,1,1,1,1,1],[1,1,1,1,1,1]];
}
/* ---- レールガン(ビーム砲)が線上の敵を全部巻き込むか ---- */
function checkBeam(){
 META.stg=0;setDiff=2;startSolo();
 frames(20,.016);
 const me=G.players[0],ti=TOWERS.findIndex(t=>t.id==='rail');
 if(ti<0||!TOWERS[ti].beam){console.log('FAIL: レールガンがビーム砲になっていない');process.exit(1);}
 const si=AI_ORDER[0];me.scrap=9999;me.towers[si]=null;me.unlocked=Math.max(me.unlocked,ti+1);
 buildTower(me,si,ti);
 if(!me.towers[si]){console.log('FAIL: レールガンが建たない');process.exit(1);}
 /* 塔から見て同じ方向・別の距離に3体並べる=1発で全部当たるはず */
 const [sx,sy]=SLOTS[si],T=TOWERS[ti];
 me.zombies.length=0;
 const zs=[],base=projPath(sx,sy);
 /* 経路の形に依存しないよう、塔の正面に3体を密着させて並べる(ビーム半幅26に全部入る間隔) */
 for(let k=0;k<3;k++){const z=mkZ(zSpec(0,1,5),Math.max(20,base-8+k*8));z.hp=z.mhp=1e9;me.zombies.push(z);zs.push(z);}
 campStep(me,.001,G.wave);/* px/pyを経路から埋める */
 const ang=Math.atan2(zs[0].py-sy,zs[0].px-sx);
 const hp0=zs.map(z=>z.hp);
 me.towers[si].cd=0;
 /* 位置を上書きしたまま撃たせる=campStepは位置を再計算してしまうので発射部分だけ直接呼べない。
    代わりに敵の経路距離dを使わない当たり判定(segDist)を直接検証する */
 const ex=sx+Math.cos(ang)*T.rng,ey=sy+Math.sin(ang)*T.rng;
 let onLine=0;for(const z of zs)if(segDist(z.px,z.py,sx,sy,ex,ey)<=T.beam)onLine++;
 if(onLine<3){console.log('FAIL: ビームの判定(segDist)が線上の敵を拾えていない '+onLine+'/3');process.exit(1);}
 /* 実際に1フレーム回して、複数体が同時に削れることを確かめる */
 let hit=0;
 for(let k=0;k<60&&hit<2;k++){campStep(me,.05,G.wave);hit=zs.filter((z,i)=>z.hp<hp0[i]).length;}
 if(hit<2){console.log('FAIL: ビームが1体しか巻き込んでいない('+hit+'体)');process.exit(1);}
 console.log('レールガン(ビーム砲): 1発で'+hit+'体を同時に貫通 OK');
 backTitle();
}
/* ---- 重テスラ: 連鎖が「時間をかけて」伝わり、跳ねるほど威力が上がるか ---- */
function checkCoil(){
 META.stg=0;setDiff=2;startSolo();
 frames(20,.016);
 const me=G.players[0],ti=TOWERS.findIndex(t=>t.id==='coil'),T=TOWERS[ti];
 if(ti<0||!T.arcT){console.log('FAIL: 重テスラが「ゆっくり伝わる」設定になっていない');process.exit(1);}
 const si=AI_ORDER[0];me.scrap=9999;me.towers[si]=null;me.unlocked=Math.max(me.unlocked,ti+1);
 buildTower(me,si,ti);
 const [sx,sy]=SLOTS[si];
 me.zombies.length=0;
 const zs=[];
 for(let k=0;k<6;k++){const z=mkZ(zSpec(0,1,5),200+k*30);z.hp=z.mhp=1e9;me.zombies.push(z);zs.push(z);}
 campStep(me,.001,G.wave);/* px/pyを経路から埋める(位置は毎フレーム経路で上書きされるので直接いじらない) */
 me.towers[si].cd=0;
 const hp0=zs.map(z=>z.hp);
 /* 1フレームで全部終わっていないこと=時間をかけて伝わっていること */
 campStep(me,.02,G.wave);
 const hitNow=zs.filter((z,i)=>z.hp<hp0[i]).length;
 if(!me.arcs||!me.arcs.length){console.log('FAIL: 連鎖電撃(arcs)が発生していない');process.exit(1);}
 if(hitNow>2){console.log('FAIL: 連鎖が一瞬で全部に届いている(遅延していない) '+hitNow+'体');process.exit(1);}
 for(let k=0;k<80&&me.arcs.length;k++)campStep(me,.02,G.wave);
 const dmg=zs.map((z,i)=>Math.round(hp0[i]-z.hp));
 const hit=dmg.filter(d=>d>0);
 if(hit.length<4){console.log('FAIL: 連鎖が伸びていない('+hit.length+'体) '+dmg.join('/'));process.exit(1);}
 /* 跳ねる順は経路の形で決まるので、順番ではなく「差」で見る=後半の一撃が初撃の何倍か */
 const mn=Math.min.apply(null,hit),mx=Math.max.apply(null,hit);
 if(mx<mn*2.5){console.log('FAIL: 跳ねるほど威力が上がっていない(最大'+mx+' / 最小'+mn+') '+dmg.join('/'));process.exit(1);}
 console.log('重テスラ: '+hit.length+'体へ順に伝播・被弾量='+dmg.join('/')+' (最大は最小の'+(mx/mn).toFixed(1)+'倍) OK');
 backTitle();
}
/* ---- 鎖使いが、重なったすり抜け敵を取りこぼさないか ----
   ⚠1体が抱えられる数(ENG_MAX=3)で頭打ちになり、4体目から素通りしていたバグの再発防止 */
/* ---- 噛みつかれている相手には必ず反撃できるか ----
   ⚠近接兵科の射程は34〜40しかないのに、ゾンビは gap=36 まで近づけば殴れる。
     素のままだと猟犬(射程34)は「殴られているのに届かない」うえ、旗で足が止まっていて詰められない
     =一方的に殴られ続ける(2026-07-26にユーザーから指摘)。全近接兵科で反撃できることを見る */
function checkBite(){
 META.stg=0;setDiff=2;startSolo();frames(20,.016);
 const me=G.players[0];
 const mel=[];
 for(let i=0;i<U_N;i++)if(UNITS[i].rng<=ENG_GAP+2)mel.push(i);
 if(!mel.length){console.log('FAIL: 近接兵科が1つも見つからない');process.exit(1);}
 const zi=ZOMBIES.findIndex(z=>z.id==='walk');
 let ng=[];
 for(const ui of mel){
  const U=UNITS[ui];
  me.units.length=0;me.zombies.length=0;
  /* 部隊を旗の位置に置き、ゾンビを「噛みつける一番遠い所」(gap=ENG_GAP)に置く */
  const ud=me.flagD;
  me.units.push({eid:EID++,ui,own:0,am:1,d:ud,hp:U.hp,mhp:U.hp,cd:0,hitT:0,fireT:0,ph:0,px:0,py:0,dr:-1,eng:0});
  const z=mkZ(zSpec(zi,1,10),ud-ENG_GAP);
  z.hp=z.mhp=99999;
  me.zombies.push(z);
  const hp0=z.hp,uhp0=me.units[0].hp;
  for(let k=0;k<40;k++)campStep(me,.05,G.wave);
  const bitten=me.units[0].hp<uhp0;
  const hit=z.hp<hp0;
  if(bitten&&!hit)ng.push(U.n+'(射程'+U.rng+')');
 }
 if(ng.length){
  console.log('FAIL: 噛みつかれているのに反撃できない兵科がある → '+ng.join(' / '));process.exit(1);}
 /* ---- 攻撃の絵が出ているか(2026-07-26 第64弾) ----
    ⚠近接攻撃には長らく**絵が1つも無かった**。数で確かめられるようにしておく */
 {/* ⚠範囲攻撃(aoe)や多目標(multi)の近接兵科は別の枝を通るので、**素の近接**を選び直して置く */
  const pi=mel.filter(i=>!UNITS[i].aoe&&!UNITS[i].multi&&UNITS[i].type!=='heal')[0];
  if(pi==null){console.log('FAIL: 素の近接兵科が見つからない');process.exit(1);}
  const PU=UNITS[pi];
  me.units.length=0;me.zombies.length=0;me.fx.length=0;
  const ud=me.flagD;
  me.units.push({eid:EID++,ui:pi,own:0,am:1,d:ud,hp:99999,mhp:99999,cd:0,hitT:0,fireT:0,ph:0,px:0,py:0,dr:-1,eng:0});
  const z3=mkZ(zSpec(zi,1,10),ud-ENG_GAP);z3.hp=z3.mhp=99999;me.zombies.push(z3);
  /* ⚠**エフェクトは寿命が短い**(斬撃0.26秒・銃口の閃光0.14秒)。
     まとめて回してから me.fx を見ると、消えた後なので何も見つからない(実際にそうなった)。
     1ステップごとに拾うこと */
  const kinds={};
  for(let k=0;k<40;k++){campStep(me,.05,G.wave);for(const e of me.fx)kinds[e.k]=(kinds[e.k]||0)+1;}
  if(!kinds.slash){
   console.log('FAIL: 近接攻撃に斬撃の絵が出ていない('+PU.n+' / 出た絵='+Object.keys(kinds).join(',')+')');process.exit(1);}
  if(!kinds.hit&&!kinds.ric){console.log('FAIL: 着弾の絵が出ていない');process.exit(1);}}
 /* ---- タワーの銃口の閃光と、装甲に弾かれる火花 ---- */
 {me.units.length=0;me.zombies.length=0;me.fx.length=0;me.scrap=99999;
  const si=AI_ORDER[0],ti=TOWERS.findIndex(T=>T.id==='rifle');
  me.towers[si]=null;const pu=me.unlocked;me.unlocked=ti+1;buildTower(me,si,ti);me.unlocked=pu;
  const base=projPath(SLOTS[si][0],SLOTS[si][1]);
  /* 装甲持ち(アーマード)を目の前に置くと、通常弾は弾かれる絵になるはず */
  const az=ZOMBIES.findIndex(z=>z.id==='arm');
  const z2=mkZ(zSpec(az,1,20),Math.max(20,base-40));z2.hp=z2.mhp=99999;me.zombies.push(z2);
  const kinds={};
  for(let k=0;k<60;k++){campStep(me,.05,G.wave);for(const e of me.fx)kinds[e.k]=(kinds[e.k]||0)+1;}
  if(!kinds.mzl){console.log('FAIL: タワーの銃口の閃光が出ていない');process.exit(1);}
  if(!kinds.ric){console.log('FAIL: 装甲に通常弾が弾かれる火花が出ていない');process.exit(1);}
  console.log('演出: 近接の斬撃・着弾・銃口の閃光・装甲に弾かれる火花 すべて出ている OK');}
 console.log('反撃: 近接'+mel.length+'兵科すべて、噛みつかれた相手(gap='+ENG_GAP+')に反撃できる OK');
 backTitle();
}
/* ---- エフェクト第2弾(2026-07-26 第65弾) ----
   投擲の軌道(toss) / 炎の帯(flame) / 火の海(pool) / 氷の破片(ice) / 土煙(dust) / 倒れる死体(corpse)。
   ⚠寿命が短い(炎0.2秒・投擲0.16〜0.42秒)ので、まとめて回してから見ると消えた後になる。
     1ステップごとに拾うこと。⚠投擲の着弾は later() で遅らせているので、飛ぶ秒数ぶん回す必要がある */
function checkFx2(){
 META.stg=0;setDiff=2;startSolo();frames(20,.016);
 const me=G.players[0];
 const zi=ZOMBIES.findIndex(z=>z.id==='walk');
 /* その兵科を1体置き、射程の内側にゾンビを置いて撃たせ、出た絵を数える */
 const run=(uid,tough,steps)=>{
  const ui=UNITS.findIndex(u=>u.id===uid);
  if(ui<0){console.log('FAIL: 兵科 '+uid+' が見つからない');process.exit(1);}
  const U=UNITS[ui],ud=me.flagD;
  me.units.length=0;me.zombies.length=0;me.fx.length=0;me.dly=[];
  me.units.push({eid:EID++,ui,own:0,am:1,d:ud,hp:99999,mhp:99999,cd:0,hitT:0,fireT:0,ph:0,px:0,py:0,dr:-1,eng:0});
  const z=mkZ(zSpec(zi,1,10),ud-Math.min(U.rng*.55,110));
  if(tough)z.hp=z.mhp=99999;
  me.zombies.push(z);
  const kinds={};
  for(let k=0;k<(steps||60);k++){campStep(me,.05,G.wave);
   for(const e of me.fx)kinds[e.k]=(kinds[e.k]||0)+1;}
  return kinds;
 };
 const need=(kinds,k,msg)=>{if(!kinds[k]){
  console.log('FAIL: '+msg+'(出た絵='+(Object.keys(kinds).join(',')||'なし')+')');process.exit(1);}};
 /* 擲弾兵: 投げた物が飛び、遅れて爆発する */
 {const k=run('grn',true);
  need(k,'toss','擲弾兵の投擲が飛んでいない');
  need(k,'boom','擲弾兵の着弾の爆発が出ていない');}
 /* 火炎瓶: 瓶が飛び、割れた所に火の海が残る */
 {const k=run('mol',true);
  need(k,'toss','火炎瓶が飛んでいない');
  need(k,'pool','火炎瓶の火の海が出ていない');}
 /* 火炎放射兵: 曳光線ではなく炎の帯 */
 {const k=run('flm',true);
  need(k,'flame','火炎放射兵の炎が出ていない');
  if(k.tr){console.log('FAIL: 火炎放射兵がまだ銃の曳光線を出している');process.exit(1);}}
 /* 撃破: 敵が倒れる(死体が残る) */
 {const k=run('grn',false,40);
  need(k,'corpse','倒した敵の死体が出ていない');}
 /* 火炎放射塔も炎の帯を吹く */
 {me.units.length=0;me.zombies.length=0;me.fx.length=0;me.scrap=99999;
  const si=AI_ORDER[0],ti=TOWERS.findIndex(T=>T.id==='flame');
  me.towers[si]=null;const pu=me.unlocked;me.unlocked=ti+1;buildTower(me,si,ti);me.unlocked=pu;
  const base=projPath(SLOTS[si][0],SLOTS[si][1]);
  const z=mkZ(zSpec(zi,1,20),Math.max(20,base-40));z.hp=z.mhp=99999;me.zombies.push(z);
  const kinds={};
  for(let k2=0;k2<40;k2++){campStep(me,.05,G.wave);for(const e of me.fx)kinds[e.k]=(kinds[e.k]||0)+1;}
  need(kinds,'flame','火炎放射塔の炎が出ていない');
  me.towers[si]=null;}
 /* 砲撃5種の着弾: 種類ごとに違う絵が出る */
 {me.units.length=0;me.zombies.length=0;
  const z=mkZ(zSpec(zi,1,10),PLEN*.5);z.hp=z.mhp=99999;me.zombies.push(z);
  campStep(me,.001,G.wave);/* ⚠画面座標(px/py)はcampStepでしか入らない */
  const want={air:['shock','dust','pool'],frost:['ice'],napalm:['pool'],carpet:['dust'],mgun:['dust']};
  for(const stk of Object.keys(want)){
   me.fx.length=0;me.dly=[];
   airstrikeHit(me,z.px,z.py,10,stk,true);
   const kinds={};for(const e of me.fx)kinds[e.k]=1;
   for(const w of want[stk])need(kinds,w,'砲撃'+stk+'の着弾に'+w+'が出ていない');}}
 console.log('演出2: 投擲の軌道・炎の帯・火の海・氷の破片・土煙・倒れる死体・砲撃5種の着弾 すべて出ている OK');
 backTitle();
}
/* ---- タワーごとに撃ち方が違うか(2026-07-26 第66弾) ----
   ユーザー指摘=「威力が多少変わってるだけで変化がない」。
   絵(fxの種類)と音(TW_SFX)が、タワーごとに別物になっていることを見る */
/* ---- 💎英雄召集の演出(2026-07-26 第71弾) ----
   ⚠**結果(gcPick/gcApply)は演出で変わってはいけない**。段階が進むこと・全部見せ終えて閉じることを見る */
function checkGachaFx(){
 const res=[{hero:HEROES[HEROES.length-1],txt:'NEW!'},{dud:GDUD[0],txt:'🧬 研究pt +100'},
  {hero:HEROES[0],txt:'重複 → 🔧 鍛錬素材 +3',dupe:true}];
 gcStart(res);
 if(!GC){console.log('FAIL: 召集の演出が始まらない(canvasが取れていない)');process.exit(1);}
 if(GC.best!==5){console.log('FAIL: 予告の色が最高レア度になっていない best='+GC.best);process.exit(1);}
 /* ⭐撃つ場面は**召集1回につき1回だけ**。最初から「撃て!」で始まること */
 if(GC.ph!=='aim'){console.log('FAIL: 「撃て!」から始まっていない '+GC.ph);process.exit(1);}
 /* ⭐押すまで絶対に進まないこと(時間では進まない) */
 for(let k=0;k<120;k++)gcStep(.05);
 if(GC.ph!=='aim'){console.log('FAIL: 押していないのに勝手に進んだ '+GC.ph);process.exit(1);}
 /* 押すと撃つ。弾が飛んでいる間は飛ばせない */
 gcTap(0,0);
 if(GC.ph!=='fire'){console.log('FAIL: 押しても撃たない '+GC.ph);process.exit(1);}
 gcTap(0,0);
 if(GC.ph!=='fire'){console.log('FAIL: 弾が飛んでいる途中で飛ばせてしまう');process.exit(1);}
 for(let k=0;k<12;k++)gcStep(.05);/* 着弾させる(⚠0.05を10回足しても浮動小数で0.5に届かない) */
 if(!GC.hit){console.log('FAIL: 弾が当たっていない(GC_FLY秒たっても着弾しない)');process.exit(1);}
 for(let k=0;k<80&&GC.ph==='fire';k++)gcStep(.05);
 if(GC.ph!=='card'){console.log('FAIL: 撃ったあと結果カードに進まない '+GC.ph);process.exit(1);}
 /* ⭐撃つ場面は1回きり=2枚目以降はカードのまま(「撃て!」に戻らない) */
 gcTap(0,0);
 if(!GC||GC.i!==1||GC.ph!=='card'){console.log('FAIL: 2枚目で撃つ場面に戻っている '+(GC&&GC.ph));process.exit(1);}
 gcTap(0,0);gcTap(0,0);
 if(GC){console.log('FAIL: 全部見せ終えても演出が閉じない');process.exit(1);}
 /* ⭐展開が読めること: タレット/ゾンビは予告で**下振れだけ**(上振れしない)
    → レーザー(段2)が出たら★4以上が確定 / レアでない時は基本ライフル+通常ゾンビ */
 let sawRifleLow=0;
 for(let k=0;k<400;k++){
  const rk=k%6;
  const one=[rk===0?{dud:GDUD[0],txt:''}:{hero:HEROES.find(h=>h.rk===rk),txt:''}];
  if(!one[0].dud&&!one[0].hero)continue;
  gcStart(one);const r=gcRank(one[0]),base=r>=4?2:r>=2?1:0;
  if(GC.tw>base){console.log('FAIL: 予告が上振れしている(レア度'+r+' 予告'+GC.tw+' 上限'+base+')');process.exit(1);}
  if(GC.tw===2&&r<4){console.log('FAIL: レーザーが出たのに★4未満(レア度'+r+')');process.exit(1);}
  if(r===5&&GC.tw!==2){console.log('FAIL: ★5なのにレーザーで見せていない');process.exit(1);}
  if(GC.zk!==GC.tw){console.log('FAIL: ゾンビの種類がタレットの段と揃っていない');process.exit(1);}
  if(r<=1){if(GC.tw!==0){console.log('FAIL: レアでないのにライフル以外が出ている(レア度'+r+')');process.exit(1);}sawRifleLow=1;}
  gcEnd();
 }
 if(!sawRifleLow){console.log('FAIL: レアでない時の見せ方を確かめられていない');process.exit(1);}
 /* ⭐10連でも撃つ場面は1回だけ=示唆するのは「その回の一番いい結果」 */
 {const many=[{dud:GDUD[0],txt:''},{hero:HEROES.find(h=>h.rk===4),txt:''},{dud:GDUD[1],txt:''}];
  gcStart(many);
  if(GC.best!==4){console.log('FAIL: 10連の示唆が一番いい結果になっていない '+GC.best);process.exit(1);}
  if(GC.tw>2||GC.tw<1){console.log('FAIL: ★4の予告の段がおかしい '+GC.tw);process.exit(1);}
  gcEnd();}
 /* 「まとめて見る」で途中でも閉じられること */
 gcStart(res);GC.ph='card';GC.sk=[10,10,90,20];
 gcTap(20,15);
 if(GC){console.log('FAIL: 「まとめて見る」で閉じられない');process.exit(1);}
 /* 演出を通しても、配られる中身が変わっていないこと */
 const before=JSON.stringify(res);
 gcStart(res);for(let k=0;k<80;k++)gcStep(.05);gcEnd();
 if(JSON.stringify(res)!==before){console.log('FAIL: 演出が結果の中身を書き換えている');process.exit(1);}
 /* ---- 召集結果は別ウィンドウのアイコン一覧(2026-07-26 第73弾) ----
    ⚠ヘッドレスのDOMは差し込んだ要素を数えられないので、DOMを触らない gcResRows() の方を検査する */
 {const rows=gcResRows(res);
  if(rows.length!==res.length){console.log('FAIL: アイコンの数が結果の数と合わない '+rows.length+'/'+res.length);process.exit(1);}
  const hero=rows.filter(r=>!r.dud),dud=rows.filter(r=>r.dud);
  if(hero.some(r=>!(r.ui>=0))){console.log('FAIL: 英雄のアイコンに絵が割り当たっていない');process.exit(1);}
  if(hero.some(r=>!r.lbl)){console.log('FAIL: 英雄のアイコンに★が付いていない');process.exit(1);}
  if(dud.some(r=>!r.ic)){console.log('FAIL: はずれ枠のアイコンが空');process.exit(1);}
  /* 新規はNEW・重複はNEWなし */
  if(rows[0].nw!==1||rows[2].nw!==0){console.log('FAIL: NEW/重複の印が合っていない');process.exit(1);}
  /* 一番レアなもの(★5=先頭)が最初から選ばれること */
  if(gcResBest(rows)!==0){console.log('FAIL: 一番レアな結果が最初に選ばれない '+gcResBest(rows));process.exit(1);}
  /* 枠の中に長い文章が入っていないこと(アイコン制の肝) */
  for(const r of rows)if((r.lbl||'').length>6){console.log('FAIL: アイコンの文字が長すぎる「'+r.lbl+'」');process.exit(1);}
  console.log('召集結果の一覧: アイコン'+rows.length+'個(英雄'+hero.length+'/はずれ'+dud.length+')・一番レアを最初に選ぶ・文字は★と+数字だけ OK');
  try{renderGcRes(res);}catch(e){console.log('FAIL: 召集結果の描き出しで例外 '+e.message);process.exit(1);}}
 console.log('💎英雄召集の演出: 撃て!(押すまで進まない)→弾が飛ぶ→木っ端みじん→跡地の示唆→結果カード / 撃つのは1回だけ / 予告は下振れのみ OK');
}
function checkTwFx(){
 META.stg=0;setDiff=2;startSolo();frames(20,.016);
 const me=G.players[0];
 const zi=ZOMBIES.findIndex(z=>z.id==='walk');
 const si=AI_ORDER[0],base=projPath(SLOTS[si][0],SLOTS[si][1]);
 const run=(tid,steps)=>{
  const ti=TOWERS.findIndex(T=>T.id===tid);
  if(ti<0){console.log('FAIL: タワー '+tid+' が無い');process.exit(1);}
  me.units.length=0;me.zombies.length=0;me.fx.length=0;me.dly=[];me.shells.length=0;me.scrap=99999;
  me.towers[si]=null;const pu=me.unlocked;me.unlocked=ti+1;buildTower(me,si,ti);me.unlocked=pu;
  /* ⚠最小射程を持つ砲(迫撃砲・重砲台)はここでは見ない=近すぎて撃たないため */
  for(let k=0;k<5;k++){const z=mkZ(zSpec(zi,1,20),Math.max(20,base-30-k*26));z.hp=z.mhp=99999;me.zombies.push(z);}
  const kinds={};
  for(let k=0;k<(steps||60);k++){campStep(me,.05,G.wave);for(const e of me.fx)kinds[e.k]=(kinds[e.k]||0)+1;}
  me.towers[si]=null;
  return kinds;
 };
 const want={cryo:['ice','shock'],drone:['pel'],fort:['beam'],sonic:['wave'],
  shot:['spread'],laser:['beam'],plasma:['pboom'],gat:['tr'],rail:['beam','shock']};
 for(const tid of Object.keys(want)){
  const k=run(tid,tid==='plasma'?140:60);
  for(const w of want[tid])if(!k[w]){
   console.log('FAIL: '+tid+' に '+w+' の絵が出ていない(出た絵='+(Object.keys(k).join(',')||'なし')+')');process.exit(1);}
  /* 撃ち方を分けたタワーが、汎用の曳光線(tr)に戻っていないこと */
  if(['drone','sonic','fort','laser','rail'].indexOf(tid)>=0&&k.tr){
   console.log('FAIL: '+tid+' がまだ汎用の曳光線(tr)を出している');process.exit(1);}
 }
 /* ---- ドローンは常時2機が浮いて漂っている(2026-07-26 第68弾) ----
    ⚠位置は「時刻と枠番号だけ」で決まる=描画と発射で同じ場所になり、対戦の相手盤面でも同じに見える */
 {const a0=droneOff(0,3,0),a1=droneOff(1,3,0),b0=droneOff(0,3,1.3);
  if(Math.abs(a0[0]-a1[0])<6&&Math.abs(a0[1]-a1[1])<6){
   console.log('FAIL: 2機のドローンが同じ場所に重なっている');process.exit(1);}
  if(Math.abs(a0[0]-b0[0])<2&&Math.abs(a0[1]-b0[1])<2){
   console.log('FAIL: ドローンが時間で動いていない');process.exit(1);}
  /* 塔から離れすぎない(枠の周りを漂う範囲に収まっているか) */
  for(let q=0;q<40;q++){const p=droneOff(q%2,3,q*.37);
   if(Math.hypot(p[0],p[1])>60){console.log('FAIL: ドローンが塔から離れすぎ '+p);process.exit(1);}}
  console.log('ドローン基地: 2機が塔の周りを常時漂う(位置は時刻と枠番号だけで決まる) OK');}
 /* ---- レールガンは「一番多く貫ける向き」を狙う(2026-07-26 第68弾) ---- */
 {const ti=TOWERS.findIndex(T=>T.id==='rail');
  me.units.length=0;me.zombies.length=0;me.fx.length=0;me.dly=[];me.scrap=99999;
  me.towers[si]=null;const pu=me.unlocked;me.unlocked=ti+1;buildTower(me,si,ti);me.unlocked=pu;
  /* 経路の前方に「まとまった群れ」、別の場所に「硬い1体」を置く。
     素直に一番硬いのを狙うと1体、並びを狙うと群れごと抜ける */
  const grp=[];
  for(let k=0;k<5;k++){const z=mkZ(zSpec(zi,1,20),Math.max(20,base-40-k*30));z.hp=z.mhp=5000;me.zombies.push(z);grp.push(z);}
  const solo=mkZ(zSpec(zi,1,20),Math.max(20,base-300));solo.hp=solo.mhp=1e7;me.zombies.push(solo);
  campStep(me,.001,G.wave);
  const tw=me.towers[si];
  let hits=0;
  for(let k=0;k<80&&!hits;k++){
   const hp0=me.zombies.map(z=>z.hp);
   campStep(me,.05,G.wave);
   let n=0;for(let q=0;q<me.zombies.length;q++)if(me.zombies[q].hp<hp0[q])n++;
   if(n)hits=n;}
  me.towers[si]=null;
  if(hits<3){console.log('FAIL: レールガンが並びを狙えていない(1発で'+hits+'体しか当たっていない)');process.exit(1);}
  if(tw.aim==null){console.log('FAIL: レールガンの狙い(tw.aim)が決まっていない');process.exit(1);}
  console.log('レールガン: 一番多く貫ける向きを自動で狙う(1発で'+hits+'体) OK');}
 /* ---- レールガンの充填(2026-07-26 第67弾) ----
    撃つ前に tw.chg が 0→1 で溜まり、撃った瞬間に0へ戻ること。ビームは普通より長く残ること */
 {const ti=TOWERS.findIndex(T=>T.id==='rail');
  me.units.length=0;me.zombies.length=0;me.fx.length=0;me.dly=[];me.scrap=99999;
  me.towers[si]=null;const pu=me.unlocked;me.unlocked=ti+1;buildTower(me,si,ti);me.unlocked=pu;
  const z=mkZ(zSpec(zi,1,20),Math.max(20,base-60));z.hp=z.mhp=1e9;me.zombies.push(z);
  const tw=me.towers[si];
  let maxChg=0,fired=0,chgBefore=0,beamLf=0;
  for(let k=0;k<120;k++){
   const before=tw.cd;
   campStep(me,.05,G.wave);
   maxChg=Math.max(maxChg,tw.chg||0);
   /* 撃った回(cdが増えた回)の直前に、ちゃんと溜まっていたか */
   if(tw.cd>before){fired++;if(chgBefore<.5)chgBefore=maxChg;}
   for(const e of me.fx)if(e.k==='beam')beamLf=Math.max(beamLf,fxLife('beam',e));}
  me.towers[si]=null;
  if(!fired){console.log('FAIL: レールガンが1発も撃っていない');process.exit(1);}
  if(maxChg<.9){console.log('FAIL: レールガンの充填(tw.chg)が溜まりきっていない 最大'+maxChg.toFixed(2));process.exit(1);}
  if(beamLf<=FX_LIFE.beam){console.log('FAIL: 超電磁砲のビームが普通のビームより長く残っていない '+beamLf);process.exit(1);}
  if(typeof SFXB!=='undefined'&&!SFXB.railChg){console.log('FAIL: 充填音(railChg)が埋め込まれていない');process.exit(1);}
  console.log('レールガン: 充填0→'+maxChg.toFixed(2)+'→発射('+fired+'回)・ビームは'+beamLf.toFixed(2)+'秒(普通は'+FX_LIFE.beam+'秒) OK');}
 /* 発射音の使い回しが残っていないこと(要塞砲=重砲台 / 擲弾砲台=迫撃砲 / 冷却塔=凍結爆弾 だった) */
 {const ids=['fort','arty','mortar','gren','cryo','net','plasma','drone','laser','sonic','rail','gat'];
  const seen={};
  for(const id of ids){const k=TW_SFX[id];
   if(!k){console.log('FAIL: '+id+' に発射音が割り当てられていない');process.exit(1);}
   if(seen[k]){console.log('FAIL: '+id+' と '+seen[k]+' が同じ発射音('+k+')を使っている');process.exit(1);}
   seen[k]=id;
   if(typeof SFXB!=='undefined'&&!SFXB[k]){console.log('FAIL: 発射音 '+k+' が埋め込まれていない');process.exit(1);}}}
 console.log('タワーの撃ち方: 冷却塔/ドローン/要塞砲/音響砲/ショットガン/レーザー/プラズマ が別々の絵・別々の音 OK');
 backTitle();
}
function checkHook(){
 META.stg=0;setDiff=2;startSolo();
 frames(20,.016);
 const me=G.players[0];
 const ci=UNITS.findIndex(u=>u.hook),zi=ZOMBIES.findIndex(z=>z.noblock&&!z.nm&&!z.st);
 if(ci<0||zi<0){console.log('FAIL: 鎖使い/すり抜け敵が見つからない');process.exit(1);}
 me.units.length=0;me.zombies.length=0;
 /* 鎖使いを1体だけ置き、その目の前にすり抜け敵をENG_HOOK体ぴったり重ねる */
 me.uUn=Math.max(me.uUn,ci+1);me.ucd[ci]=0;me.scrap=9999;
 if(!deployUnit(me,ci)){console.log('FAIL: 鎖使いが出せない');process.exit(1);}
 const u=me.units[0];u.d=PLEN*.5;
 /* ⚠ここは ENG_HOOK ではなく実数で書く。定数を使うと「上限を下げただけ」でもテストが通ってしまう */
 const NEED=6;
 for(let k=0;k<NEED;k++){const z=mkZ(zSpec(zi,1,5),u.d-2);z.hp=z.mhp=1e9;me.zombies.push(z);}
 const d0=me.zombies.map(z=>z.d);
 for(let k=0;k<40;k++)campStep(me,.03,G.wave);
 /* 敵はdが増える向き(0=侵入口→PLEN=コア)に進む。足止めできていればdはほとんど増えない */
 const slipped=me.zombies.filter((z,i)=>z.d-d0[i]>18).length;
 if(slipped){console.log('FAIL: 鎖使いが居るのにすり抜け敵が'+slipped+'/'+NEED+'体 素通りした');process.exit(1);}
 /* 逆に、上限を超えたぶんは素通りしてよい(鎖使い1体が無限に抱えないこと) */
 while(me.zombies.length<ENG_HOOK+4){const z=mkZ(zSpec(zi,1,5),u.d-2);z.hp=z.mhp=1e9;me.zombies.push(z);}
 const ex=me.zombies.slice(ENG_HOOK),e0=ex.map(z=>z.d);
 for(let k=0;k<40;k++)campStep(me,.03,G.wave);
 const through=ex.filter((z,i)=>z.d-e0[i]>18).length;
 if(!through){console.log('FAIL: 鎖使い1体が上限(ENG_HOOK='+ENG_HOOK+')を超えて抱えている');process.exit(1);}
 console.log('鎖使い: 重なったすり抜け敵'+ENG_HOOK+'体を全部足止め・超過分'+through+'体は素通り OK');
 backTitle();
}
/* ---- 研究所の進化: どの兵科からでも選べるか / 大幅に強くなるか ---- */
function checkEvo(){
 META.uv=[];META.nu=0;META.pts=1e9;
 renderLab();
 const vs=LAB_ITEMS.filter(o=>o.k==='uv');
 if(vs.length<VBASE.length){console.log('FAIL: 進化の選択肢が'+vs.length+'件しか出ていない(基本兵科'+VBASE.length+'種ぶん出るはず)');process.exit(1);}
 /* 上級兵科の進化は、本体が未解放なら出ないこと */
 const adv=vs.filter(o=>/上級進化/.test(o.t));
 if(adv.length){console.log('FAIL: 本体未解放の上級兵科の進化が出ている '+adv.length+'件');process.exit(1);}
 /* 1つ買っても「次の段階」が同じ兵科で出る=段階は飛ばせない */
 const first=vs[0];META.uv.push(first.id);renderLab();
 const again=LAB_ITEMS.filter(o=>o.k==='uv');
 if(again.some(o=>o.id===first.id)){console.log('FAIL: 買った進化がまだ選択肢に残っている');process.exit(1);}
 /* 進化で大幅に強くなること(最終段階が素の2.5倍以上) */
 let worst=99;
 for(const b of ALLVB){const list=UVAR[b]||[];if(!list.length)continue;
  const top=list[list.length-1];worst=Math.min(worst,Math.max(top.hp||1,top.atk||1));}
 if(worst<2.5){console.log('FAIL: 最終進化の伸びが小さい(最小'+worst+'倍)');process.exit(1);}
 console.log('進化: 同時に'+vs.length+'兵科から選べる / 最終段階は最低でも素の'+worst.toFixed(2)+'倍 / 1個目'+LAB_UV(0)+'pt OK');
 META.uv=[];
}
/* ---- 💎英雄召集(ガチャ): 排出率・重複・魔石の増減 ---- */
function checkGacha(){
 if(HEROES.length!==11){console.log('FAIL: 英雄が11種でない '+HEROES.length);process.exit(1);}
 const cnt={};for(const h of HEROES)cnt[h.rk]=(cnt[h.rk]||0)+1;
 const want={1:5,2:3,3:1,4:1,5:1};
 for(const k in want)if(cnt[k]!==want[k]){console.log('FAIL: ★'+k+'の数が違う '+cnt[k]+'(想定'+want[k]+')');process.exit(1);}
 if(Math.abs(G_RATE.reduce((a,r)=>a+r[1],0)-100)>1e-9){console.log('FAIL: 排出率の合計が100でない');process.exit(1);}
 /* 魔石が足りない時は引けない */
 META.gem=0;META.hero={};META.hmat=0;META.pts=0;
 gcPull(1);
 if((META.gem||0)!==0||Object.keys(META.hero).length){console.log('FAIL: 魔石0でも引けてしまう');process.exit(1);}
 /* 10連=25個ぴったり減る */
 META.gem=25;gcPull(10);
 if(META.gem!==0){console.log('FAIL: 10連の消費が25でない(残'+META.gem+')');process.exit(1);}
 /* 十分な回数で排出分布を確認(はずれ55%前後・英雄が全レア度から出る) */
 META.gem=3*20000;META.hero={};
 let dud=0,byRk={1:0,2:0,3:0,4:0,5:0};
 for(let i=0;i<20000;i++){const o=gcPick();if(o.dud)dud++;else byRk[o.hero.rk]++;}
 const dp=dud/200;
 if(Math.abs(dp-55)>3){console.log('FAIL: はずれ枠の率がずれている '+dp.toFixed(1)+'%');process.exit(1);}
 if(!byRk[5]){console.log('WARN: 2万回でギガトンレアが出なかった(確率0.1%なので稀にあり得る)');}
 /* 重複は鍛錬素材になる */
 META.hero={};META.hmat=0;
 const h5=HEROES.find(h=>h.rk===5);
 gcApply({hero:h5});const m0=META.hmat;gcApply({hero:h5});
 if(META.hero[h5.id]!==2){console.log('FAIL: 所持数が増えていない');process.exit(1);}
 if(META.hmat<=m0){console.log('FAIL: 重複が鍛錬素材になっていない');process.exit(1);}
 /* ボス撃破の💎付与(通常1/最終3)が定義されているか */
 if(!(GEM_BOSS===1&&GEM_FIN===3)){console.log('FAIL: ボスの魔石量が想定と違う');process.exit(1);}
 console.log('ガチャ: 英雄11種(★1x5/★2x3/★3/★4/★5)・はずれ'+dp.toFixed(1)+'%・重複→素材・10連25個 OK');
 META.gem=0;META.hero={};META.hmat=0;
}
/* ---- 🦸英雄: 出撃(1ゲーム1回)と必殺技11種 ----
   ⚠必殺技は画面のボタンからしか呼ばれない=普段のテストを素通りするので、ここで11人ぶん直接呼ぶ */
function checkHero(){
 if(HERO_I0!==U_N){console.log('FAIL: 英雄がUNITSの末尾(U_N以降)に無い');process.exit(1);}
 META.stg=0;setDiff=2;META.nu=99;startSolo();
 if(metaUnitCap()>U_N){console.log('FAIL: 英雄まで兵科として解放できてしまう '+metaUnitCap());process.exit(1);}
 backTitle();META.nu=0;
 let dmgN=0;
 for(const h of HEROES){
  META.stg=0;setDiff=2;META.hero={};META.hero[h.id]=1;META.hsel=h.id;
  startSolo();frames(20,.016);
  const me=G.players[0];
  if(me.hUi<0||heroAt(me.hUi).id!==h.id){console.log('FAIL: 英雄が装備されていない '+h.id);process.exit(1);}
  /* 出撃するまで必殺技は溜まらない */
  me.waveDone=false;campStep(me,1,3);
  if((me.hCg||0)>0){console.log('FAIL: 出撃前なのに必殺技が溜まる '+h.id);process.exit(1);}
  if(!heroDeploy(me)){console.log('FAIL: 英雄が出撃できない '+h.id);process.exit(1);}
  if(heroDeploy(me)){console.log('FAIL: 英雄が2回出撃できてしまう '+h.id);process.exit(1);}
  const hu=me.units.filter(u=>u.hro)[0];
  if(!hu){console.log('FAIL: 英雄の実体が居ない '+h.id);process.exit(1);}
  frames(5,.016);/* 英雄ボタン/描画まわりを1回通す(例外が出ないか) */
  if(heroUlt(me,5)){console.log('FAIL: チャージ0で必殺技が撃てた '+h.id);process.exit(1);}
  campStep(me,h.uch,3);
  if((me.hCg||0)<1){console.log('FAIL: 必殺技が溜まらない '+h.id);process.exit(1);}
  /* 敵を前に並べて撃つ */
  me.zombies.length=0;
  for(let k=0;k<8;k++)me.zombies.push(mkZ(zSpec(0,1,20),Math.max(20,hu.d-40-k*60)));
  me.core=me.coreMax-20;me.fallen=[{ui:0,am:1,mhp:100,d:hu.d}];
  campStep(me,.001,5);/* ⚠画面上の座標(px/py)はcampStepでしか入らない=範囲判定の必殺技が空振りする */
  const snap=()=>[me.zombies.reduce((a,z)=>a+z.hp,0),me.core,me.units.length,
   me.zombies.reduce((a,z)=>a+(z.frzT||0)+(z.slowT||0),0),me.zombies.reduce((a,z)=>a+z.d,0)];
  const s0=snap();
  let ok=false;
  try{ok=heroUlt(me,5);}catch(e){console.log('FAIL: 必殺技『'+h.ult+'』で例外: '+e.message);process.exit(1);}
  if(!ok){console.log('FAIL: 必殺技が発動しない '+h.id);process.exit(1);}
  if((me.hCg||0)!==0){console.log('FAIL: 必殺技のチャージが戻っていない '+h.id);process.exit(1);}
  const s1=snap();
  if(s0.every((v,i)=>Math.abs(v-s1[i])<1e-6)){console.log('FAIL: 必殺技『'+h.ult+'』に何の効果も無い');process.exit(1);}
  if(s1[0]<s0[0])dmgN++;
  /* 倒れたら二度と出せない */
  dmgU(me,hu,hu.hp+1);
  if(me.hOut!==2){console.log('FAIL: 英雄の戦死が記録されない '+h.id);process.exit(1);}
  if(heroDeploy(me)){console.log('FAIL: 戦死した英雄が再出撃できる '+h.id);process.exit(1);}
  backTitle();
 }
 if(dmgN<8){console.log('FAIL: 敵にダメージを与える必殺技が少なすぎる '+dmgN);process.exit(1);}
 console.log('英雄: 11人の出撃(1ゲーム1回・戦死したら終わり)と必殺技11種 OK(うち'+dmgN+'種が直接ダメージ)');
 META.hero={};META.hsel='';
}
/* ---- 🏋鍛錬所(🔧で英雄を鍛える)と 📖ゾンビ図鑑 ----
   ⚠2026-07-26(第53弾)に洞窟(掘って生態系を育てる防衛戦)をまるごと廃止した。
     ここで見るのは「🔧が減る/経験が入る/Lv上限/鍛錬LvがTD側の英雄のHPに乗る/図鑑がソロの撃破で埋まる」だけ */
function checkTrain(){
 const h=HEROES[0];
 META.hero={};META.hero[h.id]=1;META.hsel=h.id;META.hmat=100;META.hlv={};META.hxp={};META.tr0=1;META.zdex={};
 try{renderTrain();}catch(e){console.log('FAIL: 鍛錬所の一覧で例外: '+e.message);process.exit(1);}
 TRTAB='zoo';
 try{renderTrain();}catch(e){console.log('FAIL: ゾンビ図鑑で例外: '+e.message);process.exit(1);}
 TRTAB='hero';
 /* 図鑑の欄分けが全ゾンビをちょうど1回ずつ拾っているか(漏れも重複も駄目) */
 {let n=0;for(const z of ZOMBIES)for(const G2 of ZDEX_G)if(G2.f(z))n++;
  if(n!==ZOMBIES.length){
   console.log('FAIL: 図鑑の欄分けが全'+ZOMBIES.length+'種を1回ずつ拾えていない '+n);process.exit(1);}}
 /* 🔧を注ぐと減って経験が入る */
 const m0=META.hmat;
 trainGrind(h.id);
 if(META.hmat!==m0-TR_COST){console.log('FAIL: 🔧鍛錬素材が減っていない');process.exit(1);}
 if(hLv(h.id)*10000+((META.hxp||{})[h.id]||0)<=0){console.log('FAIL: 経験が入っていない');process.exit(1);}
 /* 🔧が足りなければ鍛えられない */
 META.hmat=0;
 {const lv0=hLv(h.id),xp0=META.hxp[h.id];
  trainGrind(h.id);
  if(hLv(h.id)!==lv0||META.hxp[h.id]!==xp0){console.log('FAIL: 🔧が無いのに鍛えられる');process.exit(1);}}
 /* 上限Lvを超えない・上限に達したら🔧を食わない */
 META.hmat=99999;
 for(let k=0;k<400;k++)trainGrind(h.id);
 if(hLv(h.id)!==TR_MAX){console.log('FAIL: 鍛錬Lvの上限が'+TR_MAX+'でない '+hLv(h.id));process.exit(1);}
 {const mm=META.hmat;trainGrind(h.id);
  if(META.hmat!==mm){console.log('FAIL: 上限に達しても🔧を消費している');process.exit(1);}}
 /* 鍛錬Lvが実際の英雄のHPに乗るか + 📖図鑑がソロの撃破で埋まるか */
 META.stg=0;setDiff=2;startSolo();frames(20,.016);
 const me=G.players[0];
 if(!heroDeploy(me)){console.log('FAIL: 鍛錬後に英雄が出撃できない');process.exit(1);}
 const hu=me.units.filter(u=>u.hro)[0],U=UNITS[me.hUi],want=Math.round(U.hp*hBoost(h.id));
 if(hu.mhp!==want){console.log('FAIL: 鍛錬LvがHPに乗っていない '+hu.mhp+'(想定'+want+')');process.exit(1);}
 frames(1600,.02);
 const seen=ZOMBIES.filter(z=>zcSeen(z.id)).length;
 if(seen<1){console.log('FAIL: ソロで倒しても図鑑が埋まらない('+seen+'種)');process.exit(1);}
 /* 同じ種類は二度登録されない */
 {const id=ZOMBIES.filter(z=>zcSeen(z.id))[0].id;
  if(zdexAdd(id)){console.log('FAIL: 同じ種類が二度図鑑に登録される');process.exit(1);}
  if(!zdexAdd('__test__')){console.log('FAIL: 新しい種類が図鑑に登録されない');process.exit(1);}
  delete META.zdex['__test__'];}
 backTitle();
 console.log('鍛錬所: 🔧で鍛える(消費/経験/Lv上限'+TR_MAX+'/英雄のHPに反映)・'
  +'📖ゾンビ図鑑 全'+ZOMBIES.length+'種を'+ZDEX_G.length+'欄に整理・ソロの撃破で'+seen+'種登録 OK');
 META.hero={};META.hsel='';META.hmat=0;META.hlv={};META.hxp={};META.tr0=0;META.zdex={};
}
/* ---- ⚔冒険(育成RPG) ----
   ⚠画面をタップしないと動かない部分なので、歩く/戦う/育つ/町の施設 を直接呼んで確かめる */
function checkRpg(){
 META.hero={};for(const id of ['hCop','hSf','hMed','hBomb'])META.hero[id]=1;
 META.tr0=1;META.rpg=null;META.hlv={};META.hxp={};
 /* ステージ1は古参まで、ステージ2は未クリア という状態にする */
 META.sc=[[1,1,1,0,0,0],[0,0,0,0,0,0]];
 const R=rgMeta();
 if(R.gold<=0){console.log('FAIL: 初期の所持金が無い');process.exit(1);}
 /* ---- 行けるエリアはTD側のクリア状況で決まる ---- */
 if(!rgAreaOK(rgArea('a0'))){console.log('FAIL: クリア済みのエリアに行けない');process.exit(1);}
 if(rgAreaOK(rgArea('a3'))){console.log('FAIL: 未クリアの難易度のエリアに行けてしまう');process.exit(1);}
 if(rgAreaOK(rgArea('b0'))){console.log('FAIL: 未クリアのステージのエリアに行けてしまう');process.exit(1);}
 /* ---- 拠点から始まる ---- */
 if(!rgOpen()){console.log('FAIL: 冒険が始まらない');process.exit(1);}
 if(RG.sc!=='town'){console.log('FAIL: 拠点から始まらない');process.exit(1);}
 if(RG.pt.length!==Math.min(RG_PARTY,4)){console.log('FAIL: パーティが4人にならない '+RG.pt.length);process.exit(1);}
 /* ---- エリアへ入って歩く ---- */
 rgEnter('a0');
 if(RG.sc!=='field'){console.log('FAIL: エリアへ入れない');process.exit(1);}
 {const x0=RG.px,y0=RG.py;
  /* ⚠入口の左隣は「拠点へ戻る出口」なので壁ではない。壁の判定はマスの中身で選ぶこと */
  let wall=null,open=null;
  for(const d of [[1,0],[0,1],[0,-1],[-1,0]]){
   const t=rgAt(x0+d[0],y0+d[1]);
   if(t===0&&!wall)wall=d;
   if(t===1&&!open)open=d;}
  if(wall){RG.walk=0;rgMove(wall[0],wall[1]);
   if(RG.px!==x0||RG.py!==y0){console.log('FAIL: 壁を抜けて歩けてしまう');process.exit(1);}}
  if(!open){console.log('FAIL: 入口からどこにも進めない');process.exit(1);}
  RG.walk=0;rgMove(open[0],open[1]);
  if(RG.px===x0&&RG.py===y0){console.log('FAIL: 空いている所へ歩けない');process.exit(1);}
  /* 遭遇して戦闘に入ってしまっていたら、いったん戻す */
  if(RG.sc==='battle'){RG.bt=null;RG.sc='field';}}
 /* ---- 敵はエリアのステージに合ったものだけ出る ---- */
 {const A=rgArea('b0'),pool=rgPool(A);
  for(const zi of pool)if(ZOMBIES[zi].st!==2){
   console.log('FAIL: 港のエリアに港以外の敵が出る '+ZOMBIES[zi].id);process.exit(1);}
  const A2=rgArea('n0'),p2=rgPool(A2);
  for(const zi of p2)if(!ZOMBIES[zi].nm){
   console.log('FAIL: ナイトメアのエリアに獣以外が出る '+ZOMBIES[zi].id);process.exit(1);}}
 /* ---- 戦闘: 全員ぶんコマンドを入れて解決する ---- */
 const A=rgArea('a0');
 rgBattle([rgFoe(0,A),rgFoe(1,A)],false);
 if(RG.sc!=='battle'||RG.bt.ph!=='cmd'){console.log('FAIL: 戦闘が始まらない');process.exit(1);}
 const hp0=RG.bt.fs[0].hp;
 let guard=0;
 while(RG.bt&&RG.bt.ph!=='end'&&guard++<400){
  const B=RG.bt;
  if(B.ph==='cmd'){
   const p=RG.pt[B.si];
   const sk=rgSkills(p.id).filter(s=>s.mp<=p.mp&&s.t==='atk');
   if(sk.length&&Math.random()<.5){
    const s=sk[0];
    rgBtSet(s.tg==='one'?{c:'sk',sk:s.id,tg:0}:{c:'sk',sk:s.id});
   }else rgBtSet({c:'atk',tg:0});
  }else rgBtStep();}
 if(guard>=400){console.log('FAIL: 戦闘が終わらない(無限ループ)');process.exit(1);}
 if(RG.bt.fs[0].hp>=hp0){console.log('FAIL: 敵にダメージが入っていない');process.exit(1);}
 const res=RG.bt.res;
 if(res!=='win'&&res!=='lose'){console.log('FAIL: 勝敗がつかない res='+res);process.exit(1);}
 /* ---- 勝つと経験値が入り、TD側の鍛錬Lvへ反映される ---- */
 if(res==='win'){
  const id=RG.pt[0].id;
  if(rgLv(id)<1||(rgXp(id)<=0&&rgLv(id)<=1)){console.log('FAIL: 経験値が入っていない');process.exit(1);}}
 rgBtClose();
 /* 反映の式そのものも確かめる(戦闘の乱数に頼らない) */
 {const id='hCop';META.rpg.lv[id]=1;META.rpg.xp[id]=0;META.hlv={};
  rgAddXp(id,999999);
  if(rgLv(id)!==RG_LVMAX){console.log('FAIL: 上限までレベルが上がらない '+rgLv(id));process.exit(1);}
  if((META.hlv[id]||0)!==TR_MAX){
   console.log('FAIL: RPGのLvがTD側の鍛錬Lvに反映されない '+(META.hlv[id]||0));process.exit(1);}
  if(rgTrLv(1)!==0||rgTrLv(21)!==10){console.log('FAIL: 鍛錬Lvの換算がおかしい');process.exit(1);}}
 /* ---- 町の施設 ---- */
 RG.sc='town';RG.map=rgTown();RG.px=10;RG.py=10;RG.pt=rgMkParty();
 for(const p of RG.pt)p.hp=1;
 {const R2=rgMeta(),cost=rgInnCost();R2.gold=cost+50;
  R2.gold-=cost;rgRest();
  if(RG.pt.some(p=>p.hp<p.mhp)){console.log('FAIL: 宿屋で全回復しない');process.exit(1);}}
 {const R2=rgMeta(),n0=rgHave('herb');R2.gold=999;
  R2.gold-=RG_IT_BY.herb.p;R2.it.herb=(R2.it.herb||0)+1;
  if(rgHave('herb')!==n0+1){console.log('FAIL: どうぐが増えない');process.exit(1);}
  const p=RG.pt[0];p.hp=1;rgUseItem(RG_IT_BY.herb,p);
  if(p.hp<=1){console.log('FAIL: やくそうで回復しない');process.exit(1);}}
 /* ---- 全12エリアが3つのテーマに割り振られていて、ぬしが必ずいる ---- */
 for(const Ax of RG_AREAS){
  const l=rgLord(Ax);
  if(l==null||!ZOMBIES[l]){console.log('FAIL: '+Ax.n+' のぬしが決まらない');process.exit(1);}
  if(!rgPool(Ax).length){console.log('FAIL: '+Ax.n+' の敵プールが空');process.exit(1);}}
 /* ---- 全11人ぶんのRPGステータスと、Lv1で使えるとくぎがある ---- */
 for(const H of HEROES){
  if(!RG_HERO[H.id]){console.log('FAIL: '+H.n+' のRPGステータスが無い');process.exit(1);}
  const sk=(RG_HERO[H.id].sk||[]).filter(s=>s[0]<=1);
  if(!sk.length){console.log('FAIL: '+H.n+' がLv1でとくぎを覚えていない');process.exit(1);}
  for(const s of RG_HERO[H.id].sk)if(!RG_SK_BY[s[1]]){
   console.log('FAIL: 存在しないとくぎ '+s[1]);process.exit(1);}}
 rgBack();
 if(RG!==null){console.log('FAIL: 冒険をやめても状態が残っている');process.exit(1);}
 console.log('⚔冒険: 行けるエリアはTD側のクリア連動(12エリア)・拠点/歩行/壁・'
  +'コマンド戦闘('+res+')・経験値→鍛錬Lv反映(Lv'+RG_LVMAX+'→鍛錬Lv'+TR_MAX+')・'
  +'宿屋/どうぐ・英雄'+HEROES.length+'人ぶんのステータスととくぎ'+RG_SK.length+'種 OK');
 META.hero={};META.rpg=null;META.hlv={};META.hxp={};META.tr0=0;
 META.sc=[[0,0,0,0,0,0],[0,0,0,0,0,0]];
}
/* ---- 支援施設2枠(タワーとは別軸)が、解放してから建つか・効果が乗るか ---- */
function checkSup(){
 META.stg=0;setDiff=2;startSolo();
 frames(20,.016);
 const me=G.players[0];me.scrap=99999;
 const sti=TOWERS.findIndex(T=>T.type==='sup');
 if(sti<0||sti<T_PLAY){console.log('FAIL: 支援施設がTOWERSの末尾に無い');process.exit(1);}
 /* 未解放の支援枠には建たない */
 if(buildTower(me,SUP_BASE,sti)){console.log('FAIL: 未解放の支援枠に建った');process.exit(1);}
 doPurchase(me,'supslot',{});
 if((me.supN||0)!==1){console.log('FAIL: 支援枠が開かない');process.exit(1);}
 /* 支援枠にタワー、通常枠に支援施設は建たない */
 if(buildTower(me,SUP_BASE,0)){console.log('FAIL: 支援枠に普通のタワーが建った');process.exit(1);}
 if(buildTower(me,AI_ORDER[0],sti)){console.log('FAIL: 通常枠に支援施設が建った');process.exit(1);}
 /* 野戦病院: 部隊を回復し、出撃CDを短縮する */
 const tim=TOWERS.findIndex(T=>T.id==='medic');
 if(!buildTower(me,SUP_BASE,tim)){console.log('FAIL: 野戦病院が建たない');process.exit(1);}
 campStep(me,.02,G.wave);
 if(!(me.supH>0&&me.supCd<1)){console.log('FAIL: 野戦病院の効果が乗っていない');process.exit(1);}
 me.ucd[0]=0;deployUnit(me,0);
 const u=me.units[0];if(u){u.hp=1;campStep(me,.5,G.wave);
  if(!(u.hp>1)){console.log('FAIL: 野戦病院が回復していない');process.exit(1);}}
 /* 同じ施設は2つ建たない */
 doPurchase(me,'supslot',{});
 if(buildTower(me,SUP_BASE+1,tim)){console.log('FAIL: 同じ支援施設が2つ建った');process.exit(1);}
 /* 物資投下所: ウェーブ開始で補給が届く */
 const tid2=TOWERS.findIndex(T=>T.id==='depot');
 buildTower(me,SUP_BASE+1,tid2);campStep(me,.02,G.wave);
 if(!me.supDepot){console.log('FAIL: 物資投下所が効いていない');process.exit(1);}
 const s0=me.scrap,u0=me.up||0,c0=me.core,ch0=me.charge;
 let got=false;for(let k=0;k<40&&!got;k++){resetCampWave(me);
  if(me.scrap>s0||(me.up||0)>u0||me.core>c0||me.charge>ch0||me.ucd.every(v=>v===0))got=true;}
 if(!got){console.log('FAIL: 補給が一度も届かない');process.exit(1);}
 /* 支援施設は解放チェーンに混ざらない */
 if(metaTowerCap()>T_PLAY){console.log('FAIL: 支援施設が解放チェーンに混ざっている');process.exit(1);}
 console.log('支援施設: 枠は⚙️解放制・専用枠のみ・同じ物は1つまで・野戦病院と物資投下所の効果OK');
 backTitle();
}
checkStrikes();
checkSup();
checkGacha();
checkHero();
checkTrain();
checkRpg();
checkProgress();
checkEvo();
checkHook();
checkBite();
checkFx2();
checkGachaFx();
checkTwFx();
checkTwNew();
checkCryo();
checkBeam();
checkCoil();
checkFinalBoss();
runStage2();
runNightmare();
runPvE(2,'PvE'+D5[2].n+'(素の腕前・W'+D5[2].w+')',false);
const won=runPvE(4,'PvE'+D5[4].n+'(強化プレイ・W'+D5[4].w+')',true);
if(!won)console.log('WARN: 悪夢は強化プレイでもクリア不可(バランス要確認)');
const cw=runCoop('協力3人(古参)');
if(!cw)console.log('INFO: 協力3人は陥落(良プレイなら勝てるかは実機で確認)');
runPvP('対戦三つ巴');
console.log('ALL TESTS DONE');
process.exit(0);
`;
/* ---- 書体と色の表(パレット)が崩れていないか ----
   ⚠これはソースを読む静的な検査(実走ではない)。
   ①canvasの文字が全部 FF(共通の書体)を通っているか=以前は canvas だけ sans-serif で別書体だった
   ②CSSの :root と JS の定数が同じ値か=**片方だけ直すとHTMLとcanvasで色がずれる**
   ③canvasの文字色・HTML本文に色を直に書いていないか=同じ役目の色が少しずつ違う値で散らばるのを防ぐ */
(function checkPalette(){
 const nFont=(html.match(/\.font=/g)||[]).length,nFF=(html.match(/px '\+FF/g)||[]).length;
 if(nFont!==nFF){console.log('FAIL: canvasの書体がバラバラ('+nFont+'か所中'+nFF+'か所しかFFを通っていない)');process.exit(1);}
 if(/px sans-serif'/.test(html)){console.log('FAIL: canvasに sans-serif 直書きが残っている');process.exit(1);}
 /* CSSの :root と JS の定数の突き合わせ。左=CSS変数名 右=JSの定数名 */
 const PAIR=[['ink','INK'],['ink2','INK2'],['ink3','INK3'],['ink4','INK4'],['void','VOID'],
  ['pane','PANE'],['paper','PAPER'],['paper2','PAPER2'],['paper3','PAPER3'],['dim','DIM'],
  ['rust','RUST'],['rust2','RUST2'],['amber','AMBER'],['gold','GOLD'],['gold2','GOLD2'],['glow','GLOW'],
  ['toxic','TOXIC'],['life','LIFE'],['life2','LIFE2'],['tech','TECH'],['tech2','TECH2'],
  ['frost','FROST'],['steel','STEEL'],['hero','HEROC'],['danger','DANGER'],['danger2','DANGER2'],['gone','GONE']];
 for(const [cv,jv] of PAIR){
  const a=(html.match(new RegExp('--'+cv+':(#[0-9a-f]{6})'))||[])[1];
  const b=(html.match(new RegExp('\\b'+jv+"='(#[0-9a-f]{6})'"))||[])[1];
  if(!a){console.log('FAIL: CSSに --'+cv+' が無い');process.exit(1);}
  if(!b){console.log('FAIL: JSに '+jv+' が無い');process.exit(1);}
  if(a!==b){console.log('FAIL: --'+cv+'('+a+') と '+jv+'('+b+') の色が違う=HTMLとcanvasでずれる');process.exit(1);}
 }
 /* canvasの文字色に直書きが残っていないか(font と同じ行の fillStyle を見る) */
 const bad=[];
 for(const ln of html.split('\n'))if(/\.font=/.test(ln)){
  const m=ln.match(/fillStyle=[^;]*'#[0-9a-fA-F]{3,6}'/);if(m)bad.push(m[0]);}
 if(bad.length){console.log('FAIL: canvasの文字色に直書きが残っている: '+bad.slice(0,3).join(' / '));process.exit(1);}
 /* HTML本文(</style>より後・<script>より前)の直書き色 */
 const bodyHtml=html.slice(html.indexOf('</style>'),html.indexOf('\n<script>',html.indexOf('</style>')));
 const bh=bodyHtml.match(/#[0-9a-fA-F]{6}\b|#[0-9a-fA-F]{3}\b/g);
 if(bh){console.log('FAIL: HTML本文に色を直に書いている: '+bh.slice(0,3).join(' / '));process.exit(1);}
 const nc=(html.match(/#[0-9a-fA-F]{6}\b|#[0-9a-fA-F]{3}\b/g)||[]).length;
 console.log('書体と色の表: canvasの文字'+nFont+'か所すべて共通の書体 / CSSとJSの色'+PAIR.length+'組が一致 / 直書きの色 '+nc+'か所(絵の色だけ) OK');
})();
/* ---- 🛠DEVモード(?dev=1)でも最後まで読み込めるか ----
   ⚠DEVは location.search で決まるので、下の実走テストは**常にDEV=false側しか通らない**。
     DEV側だけで落ちる事故(constのTDZを typeof で見て例外→スクリプト全体が停止)を実際に踏んだので、
     ここで別スコープ(new Function)で1回だけ読み込んで、最後まで走るかを確かめる。 */
(function checkDevLoad(){
 const savedLoc=global.location,savedRaf=rafq.length;
 global.location={search:'?dev=1',href:'',hash:''};
 try{
  const f=new Function(js+'\n;return (typeof renderTrain==="function")&&(typeof heroUlt==="function")&&DEV===true;');
  if(!f()){console.log('FAIL: 🛠DEVモードでスクリプトが最後まで走らない');process.exit(1);}
  /* ⭐実機テスト用に「最初から全開放」になっているか(2026-07-26ユーザー指示)。
     ⚠soloMeta()はGを見るので、ソロを1戦始めてから拠点の状態を測る */
  const g=new Function(js+'\n;META.stg=0;setDiff=2;startSolo();'
   +'const m=G.players[0];'
   +'return [m.unlocked,T_PLAY,m.uUn,U_N,m.ecoN,ECO_MAX,m.supN,SUP_MAX,'
   +'m.slk.slice(0,ECO_BASE).filter(v=>v).length,ECO_BASE,META.st.length,Object.keys(STRIKES).length];')();
  const [un,tp,uu,un2,ec,ecm,sp,spm,sl,slm,st,stm]=g;
  if(un<tp){console.log('FAIL: 🛠DEVでタワーが全解放されていない '+un+'/'+tp);process.exit(1);}
  if(uu<un2){console.log('FAIL: 🛠DEVで兵科が全解放されていない '+uu+'/'+un2);process.exit(1);}
  if(ec<ecm||sp<spm){console.log('FAIL: 🛠DEVで工房/支援の枠が全部開いていない '+ec+'/'+ecm+' '+sp+'/'+spm);process.exit(1);}
  if(sl<slm){console.log('FAIL: 🛠DEVで建設マスが全部開いていない '+sl+'/'+slm);process.exit(1);}
  if(st<stm){console.log('FAIL: 🛠DEVで砲撃が全部解放されていない '+st+'/'+stm);process.exit(1);}
  console.log('🛠DEVモード: タワー'+un+'種・兵科'+uu+'種・建設マス'+sl+'+工房'+ec+'+支援'+sp+'・砲撃'+st+'種 すべて最初から使える OK');
 }catch(e){
  console.log('FAIL: 🛠DEVモード(?dev=1)の読み込みで例外: '+e.message);process.exit(1);
 }finally{
  global.location=savedLoc;rafq.length=savedRaf;/* 二重読み込みの後始末 */
 }
 console.log('🛠DEVモード(?dev=1): 最後まで読み込める OK');
})();
try{eval(js+'\n'+body);}catch(e){console.log('LOAD FAIL:',e.message,(e.stack||'').split('\n').slice(0,4).join(' | '));process.exit(1);}
