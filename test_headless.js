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
/* ---- 🏋鍛錬所の洞窟(マザーゾンビ防衛) ----
   ⚠画面をタップしないと動かない部分なので、掘る・湧く・英雄のAI・波の進行を直接呼んで確かめる */
function checkTrain(){
 const h=HEROES[0];
 META.hero={};META.hero[h.id]=1;META.hsel=h.id;META.hmat=100;META.hlv={};META.hxp={};META.tr0=1;
 META.zc={};META.zl={walk:1};
 try{renderTrain();}catch(e){console.log('FAIL: 鍛錬所の一覧で例外: '+e.message);process.exit(1);}
 /* ---- 🧿コアの解放と強化 ---- */
 META.zc.run=ZC_OPEN;zcBuy('run');
 if(zcLv('run')!==1){console.log('FAIL: 🧿コアでゾンビを解放できない');process.exit(1);}
 if(zcHave('run')!==0){console.log('FAIL: 解放してもコアが減っていない');process.exit(1);}
 META.zc.run=zcNeed(1);zcBuy('run');
 if(zcLv('run')!==2||Math.abs(zcBoost('run')-1.12)>1e-9){
  console.log('FAIL: 🧿コアの強化が乗らない Lv'+zcLv('run')+' 倍率'+zcBoost('run'));process.exit(1);}
 META.zc.tank=1;zcBuy('tank');
 if(zcLv('tank')!==0){console.log('FAIL: コアが足りないのに解放できてしまう');process.exit(1);}
 /* ---- 訓練の開始 ---- */
 const m0=META.hmat;
 trainStart(h.id,1);
 if(!TR){console.log('FAIL: 訓練が始まらない');process.exit(1);}
 if(META.hmat!==m0-TR_COST){console.log('FAIL: 🔧鍛錬素材が減っていない');process.exit(1);}
 if(SCR!=='train'){console.log('FAIL: 訓練画面へ切り替わらない');process.exit(1);}
 if(TR.wave!==1||TR.phase!=='nest'){console.log('FAIL: 第1波の巣作りから始まらない');process.exit(1);}
 if(!TR.next||TR.next.length!==1||!TR.next[0].own){
  console.log('FAIL: 第1波は育成対象1人だけのはず');process.exit(1);}
 try{trainStep(.016);}catch(e){console.log('FAIL: 洞窟の進行で例外: '+e.message);process.exit(1);}
 /* ---- 掘る: 空洞に隣接した土だけ・🦴骸を消費 ---- */
 if(cvCanDig(6,5)){console.log('FAIL: 空洞から離れた土が掘れてしまう');process.exit(1);}
 if(!cvCanDig(1,5)){console.log('FAIL: 侵入口の隣が掘れない');process.exit(1);}
 const mn=TR.mana;
 if(!cvDigAt(1,5)){console.log('FAIL: 掘れない');process.exit(1);}
 if(Math.abs(TR.mana-(mn-CV_DIG))>1e-9){console.log('FAIL: 掘っても🦴骸が減らない');process.exit(1);}
 TR.mana=0;
 if(cvDigAt(2,5)){console.log('FAIL: 🦴骸が0でも掘れてしまう');process.exit(1);}
 TR.mana=CV_MAX;
 /* ---- 養分をふくむ土を掘ると、その場でゾンビが生まれる ---- */
 {TR.zs.length=0;
  let born=0,tried=0;
  for(let y=0;y<CV_H&&born<3;y++){
   const x=1;if(!cvCanDig(x,y))continue;
   tried++;TR.nut[cvI(x,y)]=3;const n0=TR.zs.length;
   cvDigAt(x,y,true);
   if(TR.zs.length>n0)born++;}
  if(!tried){console.log('FAIL: 侵入口の隣が1マスも掘れない');process.exit(1);}
  if(born<3){console.log('FAIL: 養分のある土を掘ってもゾンビが生まれない '+born+'/'+tried);process.exit(1);}
  /* 養分は掘ると消える=同じ所から二度は出ない */
  if(TR.nut[cvI(1,0)]!==0){console.log('FAIL: 掘っても養分が残っている');process.exit(1);}}
 /* ---- 開放度で格が決まる: 広く掘るほど強いゾンビ ---- */
 for(let y=3;y<=7;y++)for(let x=1;x<=5;x++)cvDigAt(x,y,true);
 const dMid=cvDeg(3,5);
 if(cvTier(dMid)!==4){console.log('FAIL: 広間の中心が格4にならない(開放度'+dMid+')');process.exit(1);}
 const dNeck=cvDeg(0,0);
 if(cvTier(dNeck)>2){console.log('FAIL: 細い坑道の格が高すぎる(開放度'+dNeck+')');process.exit(1);}
 /* ---- 湧き: 解放した種類だけ・格を超えない ---- */
 TR.zs.length=0;
 for(let k=0;k<60;k++)cvSpawn();
 if(!TR.zs.length){console.log('FAIL: ゾンビが湧かない');process.exit(1);}
 for(const z of TR.zs){
  if(z.inf)continue;
  const id=ZOMBIES[z.zi].id;
  if(zcLv(id)<=0){console.log('FAIL: 未解放のゾンビが湧いた '+id);process.exit(1);}
  if(!ZC_BY[id]){console.log('FAIL: 洞窟に出ないはずのゾンビが湧いた '+id);process.exit(1);}}
 /* ---- 巣作り→侵攻 ---- */
 let gd=0;
 while(TR.phase==='nest'&&gd++<3000)trainStep(.05);
 if(TR.phase!=='raid'){console.log('FAIL: 侵攻フェーズへ移らない');process.exit(1);}
 if(!TR.hs.length||TR.hs[0].cx!==0){console.log('FAIL: 英雄が侵入口から攻めてこない');process.exit(1);}
 /* ---- 英雄は掘ってある道を選び、無ければ自分で掘って進む ---- */
 {const H=TR.hs[0],x0=H.cx;
  TR.zs.length=0;TR.sp=-999;/* 湧きを止めて移動だけを見る */
  let g2=0;while(H.cx===x0&&!TR.done&&g2++<400)trainStep(.05);
  if(H.cx<=x0){console.log('FAIL: 英雄が奥へ進まない(st='+H.st+' p='+(+H.p).toFixed(2)
   +' cost='+TR.hpf[cvI(H.cx,H.cy)]+' 敵'+TR.zs.length+' pos='+H.cx+','+H.cy+')');process.exit(1);}
  TR.sp=0;/* 湧きを戻す */}
 /* ---- 最後まで走らせる(全波しのぐ or マザーゾンビが倒される) ---- */
 gd=0;
 while(!TR.done&&gd++<24000)trainStep(.05);
 if(!TR.done||!TR.res){console.log('FAIL: 訓練が終わらない(波'+TR.wave+'/'+TR.phase+')');process.exit(1);}
 if(TR.dmg<=0){console.log('FAIL: ゾンビが英雄に一度もダメージを与えていない');process.exit(1);}
 if(TR.res.gain<=0){console.log('FAIL: 経験値が入らない(しのいだ波'+TR.waveOK+' 与ダメ'+Math.round(TR.dmg)+')');process.exit(1);}
 if(hLv(h.id)<=0){console.log('FAIL: 訓練しても鍛錬Lvが上がらない');process.exit(1);}
 const okWin=TR.win,okWv=TR.waveOK;
 trainBack();
 if(TR){console.log('FAIL: 訓練から戻れない');process.exit(1);}
 /* ---- 必殺技11種が例外なく撃てる ---- */
 META.hmat=100;trainStart(h.id,0);cvInvade();
 for(const q of HEROES){
  const H=cvMkHero(q.id,false);
  TR.hs=[H];TR.zs.length=0;
  for(let k=0;k<6;k++)cvSpawn();
  try{cvUlt(H);}catch(e){console.log('FAIL: 必殺技『'+q.ult+'』で例外: '+e.message);process.exit(1);}
  if(H.ch!==0){console.log('FAIL: 必殺技を撃ってもチャージが戻らない '+q.id);process.exit(1);}}
 trainBack();
 /* ---- マザーゾンビが倒されたら失敗として終わる ---- */
 META.hmat=100;trainStart(h.id,0);
 cvInvade();
 {const H=TR.hs[0];H.cx=CV_CORE_X-1;H.cy=CV_CORE_Y;H.cd=0;H.st='core';
  TR.core=1;TR.zs.length=0;
  let g3=0;while(!TR.done&&g3++<200)trainStep(.05);}
 if(!TR.done){console.log('FAIL: マザーゾンビが倒されても終わらない');process.exit(1);}
 if(TR.win){console.log('FAIL: マザーゾンビが倒されたのに成功扱いになっている');process.exit(1);}
 /* ---- 経験値の上限(鍛錬Lv10を超えない) ---- */
 META.hlv[h.id]=0;META.hxp[h.id]=0;
 TR.done=false;TR.score=999999;trainEnd(false);
 if(hLv(h.id)!==TR_MAX){console.log('FAIL: 鍛錬Lvの上限が'+TR_MAX+'でない '+hLv(h.id));process.exit(1);}
 trainBack();
 /* ---- 鍛錬Lvが実際の英雄のHPに乗るか ---- */
 META.stg=0;setDiff=2;startSolo();frames(20,.016);
 const me=G.players[0];
 if(!heroDeploy(me)){console.log('FAIL: 鍛錬後に英雄が出撃できない');process.exit(1);}
 const hu=me.units.filter(u=>u.hro)[0],U=UNITS[me.hUi],want=Math.round(U.hp*hBoost(h.id));
 if(hu.mhp!==want){console.log('FAIL: 鍛錬LvがHPに乗っていない '+hu.mhp+'(想定'+want+')');process.exit(1);}
 backTitle();
 console.log('鍛錬所の洞窟: 🧿コアの解放と強化・掘る(🦴骸)・開放度で格が決まる湧き・英雄のAI(掘って進む)'
  +'・必殺技'+HEROES.length+'種・波の進行('+okWv+'波しのいで'+(okWin?'訓練成功':'マザーゾンビが倒された')+')'
  +'・マザーゾンビが倒されたら失敗・Lv上限'+TR_MAX+'・英雄のHPに反映 OK');
 META.hero={};META.hsel='';META.hmat=0;META.hlv={};META.hxp={};META.tr0=0;META.zc={};META.zl={walk:1};
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
checkProgress();
checkEvo();
checkHook();
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
/* ---- 🛠DEVモード(?dev=1)でも最後まで読み込めるか ----
   ⚠DEVは location.search で決まるので、下の実走テストは**常にDEV=false側しか通らない**。
     DEV側だけで落ちる事故(constのTDZを typeof で見て例外→スクリプト全体が停止)を実際に踏んだので、
     ここで別スコープ(new Function)で1回だけ読み込んで、最後まで走るかを確かめる。 */
(function checkDevLoad(){
 const savedLoc=global.location,savedRaf=rafq.length;
 global.location={search:'?dev=1',href:'',hash:''};
 try{
  const f=new Function(js+'\n;return (typeof cvSpawn==="function")&&(typeof heroUlt==="function")&&DEV===true;');
  if(!f()){console.log('FAIL: 🛠DEVモードでスクリプトが最後まで走らない');process.exit(1);}
 }catch(e){
  console.log('FAIL: 🛠DEVモード(?dev=1)の読み込みで例外: '+e.message);process.exit(1);
 }finally{
  global.location=savedLoc;rafq.length=savedRaf;/* 二重読み込みの後始末 */
 }
 console.log('🛠DEVモード(?dev=1): 最後まで読み込める OK');
})();
try{eval(js+'\n'+body);}catch(e){console.log('LOAD FAIL:',e.message,(e.stack||'').split('\n').slice(0,4).join(' | '));process.exit(1);}
