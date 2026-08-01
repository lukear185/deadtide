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
/* ⚠document.querySelector を持たせておく。無いと🎓チュートリアルの「光らせる」処理が例外になり、
   しかもそれを try/catch で握り潰すと**検査が何も見ていない**状態になる(2026-07-26 第86弾) */
global.document={getElementById:id=>cache[id]||(cache[id]=mkEl(id)),createElement:()=>mkEl('dyn'),
 querySelector:sel=>mkEl('q'),querySelectorAll:()=>[],
 addEventListener(){},body:{classList:{add(){},remove(){},toggle(){}}}};
global.innerWidth=800;global.innerHeight=380;global.devicePixelRatio=1;global.navigator={};
/* ⭐localStorage のスタブ。⚠これが無いと**中断/再開が一度も検査されない**
   (実際に supN の保存漏れ=再開すると建てた支援施設が消えるバグを見逃していた) */
{const LS={};global.localStorage={getItem:k=>(k in LS?LS[k]:null),setItem:(k,v)=>{LS[k]=''+v;},
 removeItem:k=>{delete LS[k];},clear:()=>{for(const k in LS)delete LS[k];}};}
let NOW=0;global.performance={now:()=>NOW};
const rafq=[];global.requestAnimationFrame=f=>{rafq.push(f);return rafq.length;};
global.AudioContext=function(){return {state:'running',resume(){},createOscillator:()=>({type:'',frequency:{setValueAtTime(){},exponentialRampToValueAtTime(){}},connect:()=>({connect(){}}),start(){},stop(){}}),createGain:()=>({gain:{setValueAtTime(){},exponentialRampToValueAtTime(){}},connect:()=>({connect(){}})}),destination:{},currentTime:0};};
global.Peer=function(){return {on(){},destroy(){},connect:()=>({on(){},open:false})};};
const html=fs.readFileSync(TARGET,'utf-8');
const js=html.split('<script>')[1].split('</'+'script>')[0];
/* ⚠**この下の body はテンプレート文字列(バッククォート)**なので、
   中のコメントにバッククォートを書くと文字列が途中で閉じて
   「どう見ても正しいコメント行で SyntaxError」になる(2026-07-26に実際に踏んだ)。
   コード片を引用したい時は「」で囲むか、記号なしで書くこと。 */
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
  if(G.phase==='wave'&&Math.random()<.02){if(deployUnit(me,me.team[ri(0,me.uUn-1)]))dep++;}
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
  if(G.phase==='wave'&&Math.random()<.02){if(deployUnit(G.players[0],G.players[0].team[ri(0,G.players[0].uUn-1)]))dep++;}
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
 /* ⚠1試合が長いことは問題ではない(2026-07-26ユーザー明示)。
    「息抜きゲーム」は**別プロジェクトの合間に作る**という意味で、短時間で終わるゲームという意味ではない。
    無限に終わらない(=決着しない)ことだけが困るので、その水準まで閾値を上げてある */
 if(mins>45)console.log('WARN: 決着まで45分超('+mins+'分)=綱引きが噛み合っていない疑い');
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
    if(Math.random()<.02&&deployUnit(P,P.team[ri(0,P.uUn-1)]))dep[pi]++;
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
  if(G.phase==='wave'&&Math.random()<.02)deployUnit(me,me.team[ri(0,me.uUn-1)]);
  if(G.phase==='interval'&&!me.ready){doPurchase(me,'unlock',{});doPurchase(me,'uun',{});me.ready=true;}
 }
 const names=Object.keys(seen);
 console.log('ステージ2: wave='+(G?G.wave:'?')+' 出た敵='+names.join('/'));
 const bad=names.filter(n=>['ウォーカー','ランナー','アーマード','ブローター'].indexOf(n)>=0);
 if(bad.length){console.log('FAIL: ステージ1のゾンビが混ざっている '+bad.join(','));process.exit(1);}
 if(!names.length){console.log('FAIL: 敵が1体も出ていない');process.exit(1);}
 META.stg=0;backTitle();loadStage(0);
}
/* ---- ⭐序盤の歯ごたえ(2026-07-27ユーザー指示「序盤の敵の強さをもっと強くして」) ----
   ⚠**慣らし(warm)を薄くし、1〜6波だけ体力を底上げ(earlyX)してある**。
     ここを緩めると「最初の数波は置いておくだけで勝てる」に戻るので、数字で見張る。
   ⚠見るのは**1波の総HP**(体×1体のHP)。数だけ・強さだけを見ると片方を薄めても通ってしまう。 */
function checkEarly(){
 META.stg=0;setDiff=2;startSolo();
 /* ⚠**顔ぶれは毎回ランダムに引く**ので、1回ぶんの総HPで隣どうしを比べると普通に前後する。
    5回ぶんの平均で見て、しかも**隣ではなく離れた波**(W1<W3<W6)で比べる。 */
 const tot=w=>{let t=0;for(let k=0;k<5;k++){buildTide(w);t+=G.tide.pool.reduce((a,e)=>a+(e.z.mhp||0),0);}return t/5;};
 const hp=[1,2,3,4,5,6].map(tot);
 if(!(hp[0]<hp[2]&&hp[2]<hp[5])){
  console.log('FAIL: 波が進んでも総HPが増えていない '+hp.map(v=>Math.round(v)).join('/'));process.exit(1);}
 /* ⭐⭐**W1→最終波まで総HPが一度も下がらないこと**(2026-08-01に足した)。
    ⚠2026-08-01に序盤の底上げ(earlyX)と終盤の間引き(cut)を入れた時、
      **W1>W2 / W5>W6 / W10>W11 の逆転**が実際に出た。原因は
      「末尾バイアスで引かれる敵(プールの最後)が波によって軽くなる」こと。
    ⚠隣どうしは乱数で前後するので**8回の平均**で見る。 */
 /* ⚠⚠**隣どうしを直に比べない**(NOTESの掟)=顔ぶれは毎回引き直すので、
    末尾バイアス(1400HPのジャガーノートを最大40%で引く)だけで±10%は普通に振れる。
    ⭐**3波ぶんの移動平均**にしてから比べる=乱数に強く、本物の逆転だけ捕まえる。 */
 {const tot8=w=>{let t=0;for(let k=0;k<12;k++){buildTide(w);t+=G.tide.pool.reduce((a,e)=>a+(e.z.mhp||0),0);}return t/12;};
  const ws=[];for(let w=1;w<=20;w++)ws.push(tot8(w));
  const sm=ws.map((v,i)=>{const a=ws.slice(Math.max(0,i-1),Math.min(ws.length,i+2));return a.reduce((x,y)=>x+y,0)/a.length;});
  for(let w=1;w<20;w++)if(sm[w]<sm[w-1]*.97){
   console.log('FAIL: 総HP(3波の移動平均)がW'+w+'→W'+(w+1)+'で下がっている '+Math.round(sm[w-1])+'→'+Math.round(sm[w]));process.exit(1);}
  /* ⭐**終盤に数が増えすぎないこと**(2026-08-01ユーザー指摘「数が多すぎてぐちゃぐちゃ・重い」) */
  buildTide(20);const n20=G.tide.pool.length;
  if(n20>34){console.log('FAIL: 最終波の敵が多すぎる '+n20+'体');process.exit(1);}
  console.log('  (総HPは W1='+Math.round(ws[0])+' → W20='+Math.round(ws[19])+' で単調増加 / W20の体数='+n20+')');}
 /* ⭐**1波目の体力倍率が1を下回らない**=「慣らし」で最初の数波を空気にしない。
    ⚠総HPの比では見ないこと=序盤は**出る敵の顔ぶれ(mw)**が軽いので、どう調整しても4波目とは開く。
    見るべきは**倍率そのもの**(2026-07-27に 0.60 → 1.17 へ上げた)。 */
 buildTide(1);const m1=G.tide.mul;
 if(!(m1>=1)){console.log('FAIL: 1波目の体力倍率が1未満(序盤が空気になる) x'+m1.toFixed(2));process.exit(1);}
 /* 1波目に出る数(置いておくだけで捌ける数にしない) */
 buildTide(1);const n1=G.tide.pool.length;
 if(n1<6){console.log('FAIL: 1波目の敵が少なすぎる('+n1+'体)');process.exit(1);}
 /* ⭐**中盤からウェーブの中が小波に割れている**(2026-07-27ユーザー指示)。
    ⚠見るのは「長い間隔(小波の切れ目)がいくつ入っているか」。
      敵の数や強さは**一切変えていない**ので、そちらで測ろうとしても差が出ない。 */
 {const gaps=w=>{buildTide(w);return G.tide.pool.filter((e,i)=>i>0&&e.dl>=2).length;};
  if(gaps(3)!==0){console.log('FAIL: 序盤(W3)まで小波に割れている');process.exit(1);}
  const g14=gaps(14),g20=gaps(20);
  if(g14!==subN(14)-1){console.log('FAIL: W14の小波が想定と違う '+g14+'(想定'+(subN(14)-1)+')');process.exit(1);}
  if(!(g20>=g14)){console.log('FAIL: 波が進んでも小波が増えていない W14='+g14+' W20='+g20);process.exit(1);}
  /* 切れ目の休みが「一瞬」になっていないこと(一気に出るのを防ぐのが目的) */
  buildTide(14);const gp=G.tide.pool.filter((e,i)=>i>0&&e.dl>=2).map(e=>e.dl);
  if(gp.some(v=>v<2)){console.log('FAIL: 小波の切れ目が短すぎる');process.exit(1);}
  console.log('小波: W3=割らない / W14='+(g14+1)+'波に分割(休み'+subGap(14).toFixed(1)+'秒) / W20='+(g20+1)+'波 OK');}
 console.log('序盤の歯ごたえ: 古参の総HP W1〜W6 = '+hp.map(v=>Math.round(v)).join('<')+' / 1波目'+n1+'体・体力x'+m1.toFixed(2)+' OK');
 backTitle();META.stg=0;setDiff=2;loadStage(0);
}
/* ---- 最終ウェーブのボスが、ステージ専用の特別な1体になっているか ---- */
function checkFinalBoss(){
 /* ⭐2026-07-27に**「🌑×ステージ2=深海のナイトメア」**を足した(4プール目)。
    ⚠ここに行を足すだけでは足りず、下の checkZPools() が「混ざっていないか」を見ている。
    ⚠⚠このファイルは39行目から末尾まで**丸ごとテンプレートリテラル**なので、
      コメントであってもバッククォートを書いた瞬間に文字列が閉じて壊れる。絶対に使わないこと。 */
 const want=[['ステージ1',0,FIN_ZI,4],['ステージ2',1,FIN2_ZI,4],['🌑ナイトメア',0,FINNM_ZI,NM_DIFF],
  ['🌑深海のナイトメア',1,FINNM2_ZI,NM_DIFF]];
 for(const [nm,si,fi,df] of want){
  META.sc=[[1,1,1,1,1,1],[1,1,1,1,1,1]];META.sclr=[1];META.stg=si;META.nmOK=1;setDiff=df;startSolo();
  /* 通常のボス波(15)と最終波を作って中身を見る */
  const got=[];
  for(const w of [15,20]){
   buildTide(w);
   const b=G.tide.pool.find(e=>e.boss);
   got.push(b?ZOMBIES[b.z.zi].n:'なし');
  }
  /* ⭐**最終ウェーブの主(siege)**が1体だけ付いていること(2026-07-30)。
     ⚠それまでは最終ボスに抜かれてもコアが残っていれば「クリア」になっていた。 */
  {buildTide(20);const sg=G.tide.pool.filter(e=>e.z.siege);
   if(sg.length!==1){console.log('FAIL: 最終ウェーブの主が1体になっていない('+nm+' '+sg.length+'体)');process.exit(1);}
   if(!sg[0].boss){console.log('FAIL: ボスが出る波なのに主がボスでない('+nm+')');process.exit(1);}
   /* 中盤の波には主を付けない */
   buildTide(10);
   if(G.tide.pool.some(e=>e.z.siege)){console.log('FAIL: 最終ウェーブでない波に主が付いている('+nm+')');process.exit(1);}
   buildTide(20);}
  console.log(nm+': WAVE15のボス='+got[0]+' / 最終WAVE20のボス='+got[1]+' / 最終波の主=1体 OK');
  if(!ZOMBIES[fi]||got[1]!==ZOMBIES[fi].n){console.log('FAIL: 最終ボスが出ていない('+nm+')');process.exit(1);}
  if(got[0]===got[1]){console.log('FAIL: 通常ボスと最終ボスが同じ('+nm+')');process.exit(1);}
  backTitle();
 }
 META.stg=0;setDiff=2;loadStage(0);
}
/* ---- ⭐敵プール4つが1体も混ざっていないか(2026-07-27に「🌑×ステージ2」を足した時に追加) ----
   ⚠印は nm と st の2枚重ねで、①無/無 ②無/2 ③有/無 ④有/2 の4通り。
     Z.nm だけ・Z.st===2 だけで拾うコードが1か所でも残ると**④が二重に混ざる**。
   ⚠**波の中身だけでなく、ボス・最終ボス・分裂の子・図鑑の並びも同じ印で分かれているか**を見る。 */
function checkZPools(){
 const key=Z=>(Z.nm?'n':'-')+(Z.st||0);
 const want=[['① 廃線',0,4,'-0'],['② 沈んだ港',1,4,'-2'],['🌑 ナイトメア',0,NM_DIFF,'n0'],['🌑 深海のナイトメア',1,NM_DIFF,'n2']];
 for(const [nm,si,df,k] of want){
  META.sc=[[1,1,1,1,1,1],[1,1,1,1,1,1]];META.sclr=[1];META.stg=si;META.nmOK=1;setDiff=df;startSolo();
  const seen={},bad=[];
  for(const w of [1,5,10,15,20]){buildTide(w);
   for(const e of G.tide.pool){const Z=ZOMBIES[e.z.zi];seen[Z.n]=1;if(key(Z)!==k)bad.push(Z.n+'('+key(Z)+')');}}
  if(bad.length){console.log('FAIL: '+nm+' に別プールが混ざっている: '+[...new Set(bad)].join(','));process.exit(1);}
  if(Object.keys(seen).length<5){console.log('FAIL: '+nm+' の顔ぶれが少なすぎる('+Object.keys(seen).length+'種)');process.exit(1);}
  /* 分裂の子も同じプールから湧くこと(印が違う子が湧くと、獣の波に深海が生まれる) */
  const sp=ZOMBIES.map((Z,i)=>({Z,i})).filter(o=>o.Z.split&&key(o.Z)===k);
  for(const o of sp){
   const me=G.players[0];me.zombies.length=0;
   const z=mkZ(zSpec(o.i,1,10),PLEN*.5);z.hp=1;me.zombies.push(z);
   campStep(me,.001,G.wave);killZ(me,z);
   for(const c2 of me.zombies){const Z2=ZOMBIES[c2.zi];
    if(key(Z2)!==k){console.log('FAIL: '+o.Z.n+' の分裂から別プールの '+Z2.n+' が湧いた');process.exit(1);}}}
  console.log(nm+': '+Object.keys(seen).length+'種すべて印'+k+' / 分裂の子も同じプール OK');
  backTitle();
 }
 /* 図鑑は4グループに分かれ、同じ敵が2グループに出ないこと */
 const cnt={};
 for(const g of ZDEX_G)for(const Z of ZOMBIES)if(g.f(Z))cnt[Z.id]=(cnt[Z.id]||0)+1;
 const dup=Object.keys(cnt).filter(k2=>cnt[k2]>1),miss=ZOMBIES.filter(Z=>!cnt[Z.id]);
 if(dup.length){console.log('FAIL: 図鑑で2グループに出ている敵: '+dup.join(','));process.exit(1);}
 if(miss.length){console.log('FAIL: 図鑑のどのグループにも入らない敵: '+miss.map(Z=>Z.id).join(','));process.exit(1);}
 console.log('📖図鑑: '+ZDEX_G.length+'グループに'+ZOMBIES.length+'種が重複なく収まっている OK');
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
  if(G.phase==='wave'&&Math.random()<.02)deployUnit(me,me.team[ri(0,me.uUn-1)]);
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
 /* ⭐**凍っていない敵は必ず凍る**(2026-07-27に再凍結の耐性 frzCd を廃止した)。
    ⚠**位置を戻してから見ること**=20秒歩かせたあとは射程200の外に出ていて、
      何を検査しても素通りしてしまう(耐性の検査が実際そうなっていた) */
 z.d=projPath(sx,sy);z.frzT=0;z.frzUsed=0;
 me.towers[si].cd=0;campStep(me,.05,G.wave);
 if(!(z.frzT>0)){console.log('FAIL: 凍っていない敵を凍らせていない(冷却塔の空振り)');process.exit(1);}
 /* すでに凍っている敵に撃っても冷却回数を食わないこと */
 {const u0=z.frzUsed;z.frzT=1;me.towers[si].cd=0;campStep(me,.05,G.wave);
  if(z.frzUsed!==u0){console.log('FAIL: 凍結中の敵に冷却回数を使っている');process.exit(1);}}
 /* 同じ敵を凍らせられる回数の上限(初期5・❄冷却回数で最大10) */
 const tw=me.towers[si],Tc=TOWERS[tw.ti];
 if(twFrzN(Tc,tw)!==5){console.log('FAIL: 冷却回数の初期値が5でない '+twFrzN(Tc,tw));process.exit(1);}
 tw.us.f=USTAT_MAX;
 if(twFrzN(Tc,tw)!==10){console.log('FAIL: 冷却回数を最大まで上げても10にならない '+twFrzN(Tc,tw));process.exit(1);}
 if(twStats(tw.ti).indexOf('d')>=0){console.log('FAIL: 冷却塔に⚔攻撃の強化が残っている');process.exit(1);}
 if(twStats(tw.ti).indexOf('f')<0){console.log('FAIL: 冷却塔に❄冷却回数の強化が無い');process.exit(1);}
 tw.us.f=0;
 z.d=projPath(sx,sy);z.frzT=0;z.frzUsed=5;/* 5回使い切った敵はもう凍らない */
 tw.cd=0;campStep(me,.05,G.wave);
 if(z.frzT>0){console.log('FAIL: 上限(5回)を超えて凍っている');process.exit(1);}
 console.log('冷却塔: '+(frozeAt*.05).toFixed(2)+'秒で凍結・凍結中の移動0・空振りなし・同じ敵は5回まで(強化で10) OK');
 backTitle();
}
/* ---- WAVE1の操作案内(tips)が古くなっていないか / ボタンを押した音があるか(2026-07-26に追加) ---- */
/* ---- 🎓チュートリアルの文言(2026-07-26 第86弾) ----
   ⭐WAVE1のトースト案内(waveTips)は廃止し、操作の説明はチュートリアルに一本化した。
   ⚠**説明文は仕様変更に取り残される**。実際に2回踏んでいる:
     ①廃止した操作(デッキ長押しで部隊レベルアップ)を案内し続けていた
     ②最終ウェーブを STAGE_W 固定で出していたので新兵(5波)でも「WAVE20まで」と嘘をついていた。
   ⚠**中身(tutSteps)はDOMを触らないデータの関数**にしてあるので、こちらで直に検査できる。
   ⚠DOM側だけを見る検査は、ヘッドレスでは0個でも通ってしまう=何も見ていないのにOKと出る。 */
function checkTut(){
 /* 廃止した操作・古い言い回しが混ざっていないか */
 const NG=[['長押し','デッキ長押しの部隊レベルアップは廃止済み'],
  ['段階進化','部隊の段階進化は廃止済み'],['洞窟','🕳洞窟は削除済み'],
  ['WAVE20','最終ウェーブは難易度ごとに違う(新兵5〜悪夢20)ので固定で書かない'],
  ['6ヶ所','建設スロットの初期解放は SLOT0(いま8)'],['7ヶ所','建設スロットの初期解放は SLOT0(いま8)'],
  ['あそびかた画面','あそびかたのモーダルは削除しチュートリアルに置き換えた']];
 META.stg=0;setDiff=0;startSolo();frames(10,.016);
 /* ⚠**最後まで通した印を消してから測る**=立っていると2回目扱いになり💎とガチャの段が消える(2026-07-28) */
 META.tutOk=0;
 const st=tutSteps();
 if(st.length<6){console.log('FAIL: チュートリアルの段が少なすぎる('+st.length+')');process.exit(1);}
 const ids={};
 for(const S of st){
  if(!S.id||!S.t||!S.m){console.log('FAIL: チュートリアルの段に見出しか本文が無い: '+JSON.stringify(S.id));process.exit(1);}
  if(ids[S.id]){console.log('FAIL: チュートリアルの段のidが重複: '+S.id);process.exit(1);}
  ids[S.id]=1;
  for(const d of NG)if((S.t+S.m).indexOf(d[0])>=0){
   console.log('FAIL: チュートリアルに古い内容が残っている「'+d[0]+'」('+d[1]+') → '+S.m);process.exit(1);}
 }
 /* ⭐**操作の説明が一通り揃っているか**。案内を消した時に説明ごと消える事故を防ぐ */
 const all=st.map(S=>S.t+S.m).join(' ');
 /* ⚠2026-07-27ユーザー指示で 廃品工房 / タレットの強化 / 支援設備 / 🦸英雄 の4つを足した。
    ここに残しておけば、段を整理した時に説明ごと消えても検査が落ちる */
 const MUST=[['タワー','タワーの建設'],['デッキ','部隊の出撃'],['🚩','集結旗'],
  ['🎯','航空支援'],['⚙️','スクラップ'],['🔩','強化ポイント'],['🔬','研究所'],
  ['🏭','廃品工房'],['🏗','支援施設'],['🦸','英雄の出撃'],['⏩連射','タレット(塔)の個別強化']];
 const lack=MUST.filter(x=>all.indexOf(x[0])<0).map(x=>x[1]);
 if(lack.length){console.log('FAIL: チュートリアルで説明していない要素: '+lack.join('/'));process.exit(1);}
 /* ⭐**操作させる段が実際にあるか**(読むだけの紙芝居になっていないか=ユーザー指示は「操作させる形式」) */
 const act=st.filter(S=>typeof S.ok==='function').length;
 if(act<4){console.log('FAIL: 実際に操作させる段が少なすぎる('+act+'段)');process.exit(1);}
 /* ⭐**いきなり戦場を始めない**(2026-07-26ユーザー指示)。
    はじめての人=タイトルで「🎓あそびかた」を押させる段から / ボタンから=そのまま戦場へ。 */
 if(st[0].id!=='open'||st[0].scr!=='title'){console.log('FAIL: 1段目がタイトルの「開くところ」になっていない');process.exit(1);}
 tutAuto();
 if(!TUT||TUT.st[TUT.i].id!=='open'){console.log('FAIL: 自動起動が「開くところ」から始まっていない');process.exit(1);}
 if(G&&G.tut){console.log('FAIL: 自動起動でいきなり戦場が始まっている');process.exit(1);}
 tutOpen();/* ボタンを押した=次へ進む(TUTを作り直さないこと) */
 if(!TUT||TUT.st[TUT.i].id==='open'){console.log('FAIL: 🎓あそびかたを押しても最初の段から動かない');process.exit(1);}
 tutEnd(false);
 /* ⭐**終わりに💎3個を渡し、ガチャを1回引くまでがチュートリアル**(2026-07-26ユーザー指示) */
 const gEnd=st.filter(S=>S.scr==='title').map(S=>S.id);
 if(gEnd.indexOf('gift')<0||gEnd.indexOf('pull')<0){console.log('FAIL: 💎を渡す段/ガチャを引く段が無い');process.exit(1);}
 if(st[st.length-1].scr!=='title'){console.log('FAIL: 最後の段がタイトル側になっていない');process.exit(1);}
 /* 本編の記録を汚さないか */
 tutStart();
 if(!G||!G.tut){console.log('FAIL: チュートリアルに G.tut が立っていない(戦績が記録されてしまう)');process.exit(1);}
 if(!TUT||TUT.st[TUT.i].scr!=='game'){console.log('FAIL: ボタンから始めた時に戦場へ入っていない');process.exit(1);}
 /* 作戦タイムの残り時間が止まるか(操作を覚える前に波が来ない) */
 const t0=G.tI;frames(60,.05);
 if(G.tI!==t0){console.log('FAIL: チュートリアル中に作戦タイムが進んでいる('+t0+'→'+G.tI+')');process.exit(1);}
 /* ⭐**進めなくなる段が無いか**(2026-07-26に実際に踏んだ)。
    1波目の前には作戦タイムのパネルが出ないので、そこで「✅配置完了!」を押させようとすると
    見えないボタンを待つうえに時間も止まっていて**永久に進めない**。
    → 各段の pre を通しながら進め、時間の停止が解除されて実際にウェーブが始まるかを見る。 */
 for(let k=0;k<st.length&&TUT;k++){
  if(TUT.st[TUT.i]&&TUT.st[TUT.i].id==='go')break;
  tutGo(TUT.i+1);
 }
 if(!TUT||TUT.st[TUT.i].id!=='go'){console.log('FAIL: goの段までたどり着けない');process.exit(1);}
 if(tutHold()){console.log('FAIL: ウェーブ開始の段なのに時間が止まったまま=永久に進めない');process.exit(1);}
 frames(300,.05);
 if(!G||G.phase!=='wave'){console.log('FAIL: ウェーブ開始の段で待ってもウェーブが始まらない');process.exit(1);}
 /* 全段を通せるか(ぶら下がりや例外が無いか) */
 const gem0=META.gem||0;
 for(let k=0;k<st.length+2&&TUT;k++)tutGo(TUT.i+1);
 if(TUT){console.log('FAIL: チュートリアルが最後まで進まない');process.exit(1);}
 const got=(META.gem||0)-gem0;
 if(got!==3){console.log('FAIL: チュートリアルで渡す💎が3個ではない('+got+'個)');process.exit(1);}
 META.gem=gem0;/* ⚠測ったら戻す=検査どうしがMETAを汚し合わないように */
 if(!META.tut){console.log('FAIL: チュートリアルを終えても META.tut が立たない(毎回出てしまう)');process.exit(1);}
 if(!META.tutOk){console.log('FAIL: 最後まで通しても META.tutOk が立たない(2回目の判定ができない)');process.exit(1);}
 /* ⭐**2回目からは💎とガチャの段を外す**(2026-07-28ユーザー指示)。
    ⚠ここが壊れると**やり直すたびに💎が3個ずつ増える**=無限に増やせてしまう */
 {const st2=tutStepsNow();
  for(const id of ['gift','pull','end'])if(st2.some(S=>S.id===id)){
   console.log('FAIL: 2回目のチュートリアルに「'+id+'」の段が残っている(何度もガチャへ誘導される)');process.exit(1);}
  if(st2.length>=st.length){console.log('FAIL: 2回目の段が減っていない');process.exit(1);}
  const g2=META.gem||0;
  tutStart();for(let k=0;k<st2.length+2&&TUT;k++)tutGo(TUT.i+1);
  if(TUT){console.log('FAIL: 2回目のチュートリアルが最後まで進まない');process.exit(1);}
  if((META.gem||0)!==g2){console.log('FAIL: 2回目のチュートリアルで💎が増えている('+((META.gem||0)-g2)+'個)');process.exit(1);}
  console.log('🎓2回目: '+st2.length+'段(💎とガチャの3段を外した)/💎は増えない OK');}
 META.tutOk=0;
 backTitle();
 console.log('🎓チュートリアル: '+st.length+'段(操作させる段'+act+'/タイトル側'+gEnd.length+')'+
  ' / 開くところから始まる / 最後に💎3個+ガチャ1回 / 古い言い回しなし / 説明の抜けなし / 戦績を汚さない OK');
 /* ボタンを押した音(2026-07-26ユーザー指示=タイトル等が無音だった) */
 for(const k of ['tap','back']){
  if(typeof sfx[k]!=='function'){console.log('FAIL: sfx.'+k+' が無い(ボタンの音)');process.exit(1);}
  if(!SFXSYN[k]){console.log('FAIL: sfx.'+k+' に合成音が無い=素材が無い環境で無音になる');process.exit(1);}
  if(!SFX_LBL[k]||SFX_LBL[k][2]!=='ui'){console.log('FAIL: 🔊音の確認に sfx.'+k+' が出ない');process.exit(1);}}
 console.log('ボタンの音: tap・back OK');
}
/* ---- 🎓チュートリアル中は「光っている所」以外を押せない(2026-07-26 第89弾) ----
   ユーザー指示「ここを選べって案内はあるけど、ほかのところをタップできちゃう。強制的にやらせて」。
   ⚠tutPass() は DOM を持たない=**closest だけを持つ偽の要素**で検査できる
     (DOM側だけを見る検査はヘッドレスでは0個でも通ってしまうため、こちら側で見る)。 */
function checkTutLock(){
 META.tutOk=0;/* ⚠段の数が変わらないよう初回扱いに戻す */
 /* 偽の要素。自分のセレクタが問い合わせの並びに入っていれば当たったことにする */
 const mk=s=>({id:'',closest:q=>{
  const a=String(q).split(',');
  for(let i=0;i<a.length;i++)if(a[i].trim()===s)return {};
  return null;}});
 tutStart();
 if(!TUT){console.log('FAIL: チュートリアルが始まっていない');process.exit(1);}
 const st=TUT.st;let nHi=0,nAl=0;
 for(let i=0;i<st.length;i++){
  TUT.i=i;TUT.hi=st[i].hi||null;
  if(tutPass({target:mk('#tut')})!==true){
   console.log('FAIL: 帯の「▶次へ」が押せない段がある: '+st[i].id);process.exit(1);}
  if(tutPass({target:mk('#bt-solo')})!==false){
   console.log('FAIL: 光っていない所を押せてしまう段がある: '+st[i].id);process.exit(1);}
  if(tutPass({target:mk('#pausebtn')})!==false){
   console.log('FAIL: 光っていない所を押せてしまう段がある: '+st[i].id);process.exit(1);}
  /* ⭐**ゲームを止めて閉じるまで待つもの**(新登場の紹介)は、どの段でも押せること。
     塞ぐと PAUSED のまま二度と動かない(実機で踏んだ) */
  if(tutPass({target:mk('#md-intro')})!==true){
   console.log('FAIL: 新登場の紹介を閉じられない段がある(止まったまま詰む): '+st[i].id);process.exit(1);}
  if(st[i].hi&&st[i].hi.k==='dom'){nHi++;
   if(tutPass({target:mk(st[i].hi.s)})!==true){
    console.log('FAIL: 光っている所を押せない段がある: '+st[i].id+' '+st[i].hi.s);process.exit(1);}}
  if(st[i].al){const a=String(st[i].al).split(',');
   for(let k=0;k<a.length;k++){nAl++;
    if(tutPass({target:mk(a[k].trim())})!==true){
     console.log('FAIL: al で許した所が押せない: '+st[i].id+' '+a[k]);process.exit(1);}}}
 }
 /* 盤面(canvas)。⭐マスの段は「光っているマスだけ」・🚩🎯は狙っている最中だけ通す */
 const cvT={id:'cv',closest:()=>null};
 TUT.hi=null;AIM=false;FLAGAIM=false;
 if(tutPass({target:cvT})!==false){console.log('FAIL: 盤面のタップが素通りしている');process.exit(1);}
 FLAGAIM=true;
 if(tutPass({target:cvT})!==true){console.log('FAIL: 🚩の地点タップが通らない=集結旗の段で詰まる');process.exit(1);}
 FLAGAIM=false;AIM=true;
 if(tutPass({target:cvT})!==true){console.log('FAIL: 🎯の地点タップが通らない=航空支援の段で詰まる');process.exit(1);}
 AIM=false;
 const si=tutSlot(G.players[0]);
 if(slotHit(SLOTS[si][0],SLOTS[si][1])!==si){
  console.log('FAIL: slotHit がそのマスを返さない(チュートリアルが正しいマスを判定できない)');process.exit(1);}
 if(slotHit(-9999,-9999)!==-1){console.log('FAIL: マスから遠く離れた所で slotHit が当たっている');process.exit(1);}
 /* ⭐**「ここだ」の矢印**(ユーザー指示「左右とかに反復しながら案内印」)。
    ⚠置き場所を決める所はDOMを触らないので、寸法を渡して直に見られる。
    見るのは①下端の帯は真上から指す ②右寄りは左から指す ③左寄りは右から指す
    ④画面からはみ出さない ⑤印が対象に重ならない。 */
 {const W=852,H=393,S=34;
  const rc=(l,t,w,h)=>({left:l,top:t,width:w,height:h,right:l+w,bottom:t+h});
  const deck=tutPtrPos(rc(235,315,460,70),W,H,S,6);
  if(deck.k!=='pd'){console.log('FAIL: 下端の帯を指す矢印が真上から出ていない('+deck.k+')');process.exit(1);}
  if(deck.y+S>315){console.log('FAIL: 矢印が対象(デッキ)に重なっている');process.exit(1);}
  const rgt=tutPtrPos(rc(470,235,335,50),W,H,S,6);
  if(rgt.k!=='pr'){console.log('FAIL: 右寄りのボタンを左から指していない('+rgt.k+')');process.exit(1);}
  if(rgt.x+S>470){console.log('FAIL: 矢印が対象(右寄りのボタン)に重なっている');process.exit(1);}
  const lft=tutPtrPos(rc(20,120,180,50),W,H,S,6);
  if(lft.k!=='pl'){console.log('FAIL: 左寄りのボタンを右から指していない('+lft.k+')');process.exit(1);}
  /* 端に貼り付いた対象でも画面の中に収まるか(はみ出すと印が見えない) */
  const eg=[rc(0,0,60,40),rc(W-60,0,60,40),rc(0,H-40,60,40),rc(W-60,H-40,60,40),rc(0,0,W,H)];
  for(let i=0;i<eg.length;i++){const q=tutPtrPos(eg[i],W,H,S,6);
   if(q.x<0||q.y<0||q.x+S>W||q.y+S>H){console.log('FAIL: 矢印が画面からはみ出す(端の対象'+i+')');process.exit(1);}}
 }
 /* ⭐**逃げ道**: 建設メニューを閉じられた時に、光っているマスを押し直せること
    (実機で確かめて見つけた。塞いだままだとメニューを閉じた瞬間に永久に詰む) */
 const bs=st.filter(S=>S.hi&&S.hi.k==='dom'&&S.hi.s==='#buildmenu')[0];
 if(!bs){console.log('FAIL: 建設メニューを光らせる段が無い');process.exit(1);}
 TUT.i=st.indexOf(bs);TUT.hi=bs.hi;
 if(tutSlotOK()!==1){console.log('FAIL: 建てる段でマスを押せない=建設メニューを閉じると永久に詰む');process.exit(1);}
 const us=st.filter(S=>S.hi&&S.hi.k==='dom'&&S.hi.s==='#deck')[0];
 if(us){TUT.i=st.indexOf(us);TUT.hi=us.hi;
  if(tutSlotOK()){console.log('FAIL: 部隊を出す段で盤面のマスまで押せる(印と食い違う)');process.exit(1);}}
 /* ⭐**戦っている最中は手を縛らない**=デッキを許した段は、どのマスにも建てられること
    (塞ぐと押せないまま拠点を削られる) */
 for(let i=0;i<st.length;i++){
  if(!st[i].al||String(st[i].al).indexOf('#deck')<0)continue;
  TUT.i=i;TUT.hi=st[i].hi||null;
  if(tutSlotOK()!==2){console.log('FAIL: 戦っている段で盤面が塞がっている: '+st[i].id);process.exit(1);}}
 /* ⭐**逃げ道**: 1波目で負けた時にリザルトが閉じられないと詰む */
 const scr0=SCR;SCR='result';
 if(tutPass({target:mk('#res-back')})!==true){
  console.log('FAIL: リザルトが出ている時まで塞いでいる(負けると閉じられず詰む)');process.exit(1);}
 SCR=scr0;
 /* ⭐**再読み込みの逃げ道**: 始めた時点で META.tut が立っていないと、詰んだ時に永久に出続ける */
 if(!META.tut){console.log('FAIL: チュートリアルを始めても META.tut が立たない(詰んだ時の逃げ道が無い)');process.exit(1);}
 /* チュートリアル中でなければ何も塞がない */
 tutEnd(false);backTitle();
 if(tutPass({target:mk('#bt-solo')})!==true){console.log('FAIL: チュートリアル外まで塞いでいる');process.exit(1);}
 console.log('🎓チュートリアルの縛り: 光っている所'+nHi+'件+特例'+nAl+'件だけ押せる / '+
  '盤面はマスと🚩🎯の狙いだけ / リザルトと再読み込みの逃げ道あり OK');
}
function checkResume(){
 META.stg=0;setDiff=2;startSolo();
 frames(20,.016);
 const m=G.players[0];
 /* 一通り「進んだ状態」を作る=枠を開け、支援施設を建て、工房を上級化し、冷却塔を強化する */
 m.scrap=99999;m.unlocked=T_PLAY;m.team=UNITS.map((u,i)=>i);m.uUn=U_N;m.up=77;m.upTotal=120;m.uLv=4;m.atkLv=2;
 m.core=41;m.kills=123;m.enTotal=4567;m.charge=.7;m.flagD=PLEN*.4;
 m.ecoN=ECO_MAX;m.supN=SUP_MAX;m.slk=m.slk.map(()=>true);
 /* 支援施設3種のうち2つを支援枠へ */
 for(let k=0;k<SUP_MAX;k++){m.towers[SUP_BASE+k]=null;buildTower(m,SUP_BASE+k,T_PLAY+k);}
 /* 工房を建てて全部MAX → 上級へ建て替え */
 m.towers[ECO_BASE]=null;buildTower(m,ECO_BASE,ECO_TI);
 for(const st of twStats(ECO_TI))m.towers[ECO_BASE].us[st]=USTAT_MAX;
 m.scrap=99999;gradeTower(m,ECO_BASE);
 /* 冷却塔を建てて❄冷却回数を上げる(us.f が保存されるか) */
 const cti=TOWERS.findIndex(t=>t.id==='cryo'),csi=AI_ORDER[0];
 m.towers[csi]=null;buildTower(m,csi,cti);m.towers[csi].us.f=3;m.towers[csi].us.r=2;
 G.wave=7;G.phase='iv';
 const want={supN:m.supN,ecoN:m.ecoN,unlocked:m.unlocked,uUn:m.uUn,team:(m.team||[]).join(','),uLv:m.uLv,up:Math.round(m.up),
  atkLv:m.atkLv,core:m.core,kills:m.kills,slk:m.slk.filter(v=>v).length,
  ecoTi:m.towers[ECO_BASE].ti,cryoF:m.towers[csi].us.f,cryoR:m.towers[csi].us.r,
  sup:m.towers.slice(SUP_BASE).filter(t=>t).length,stk:m.stk};
 saveRun();
 backTitle();
 if(!resumeRun()){console.log('FAIL: 中断したのに再開できない');process.exit(1);}
 const n=G.players[0];
 const got={supN:n.supN,ecoN:n.ecoN,unlocked:n.unlocked,uUn:n.uUn,team:(n.team||[]).join(','),uLv:n.uLv,up:Math.round(n.up),
  atkLv:n.atkLv,core:n.core,kills:n.kills,slk:n.slk.filter(v=>v).length,
  ecoTi:n.towers[ECO_BASE]?n.towers[ECO_BASE].ti:-1,
  cryoF:n.towers[csi]?n.towers[csi].us.f:-1,cryoR:n.towers[csi]?n.towers[csi].us.r:-1,
  sup:n.towers.slice(SUP_BASE).filter(t=>t).length,stk:n.stk};
 for(const k of Object.keys(want))if(want[k]!==got[k]){
  console.log('FAIL: 再開で '+k+' が失われている(中断時 '+want[k]+' → 再開後 '+got[k]+')');process.exit(1);}
 /* 建ててあった支援施設が「未解放の枠の上」になっていないか=これが supN 保存漏れの症状 */
 for(let k=0;k<SUP_MAX;k++)if(n.towers[SUP_BASE+k]&&!slotUnlocked(n,SUP_BASE+k)){
  console.log('FAIL: 再開後、支援施設が未解放の枠に建っている(支援枠が閉じた)');process.exit(1);}
 /* 上級廃品工房が再開後もちゃんと⚙️を生むか */
 const g0=n.scrap;n.towers[ECO_BASE].cd=0;campStep(n,.05,G.wave);
 if(n.scrap<=g0){console.log('FAIL: 再開した上級廃品工房が⚙️を生んでいない');process.exit(1);}
 /* 強化ボタンの価格が NaN にならないか(usの形が場所ごとに違っていた事故の再発防止) */
 for(let si=0;si<SLOTS.length;si++){const tw=n.towers[si];if(!tw)continue;
  for(const st of twStats(tw.ti)){const p=stCost(tw,st);
   if(!isFinite(p)){console.log('FAIL: 再開後の強化費がNaN(枠'+si+' '+st+')');process.exit(1);}}}
 console.log('中断→再開: 支援枠'+got.supN+'・工房'+got.ecoN+'・支援施設'+got.sup+'基・上級工房・冷却塔の強化(f='+got.cryoF+')'
  +'・解放'+got.unlocked+'種・マス'+got.slk+'枠 すべて引き継げている OK');
 clearRun();backTitle();
}
/* ⭐**中断→再開で同じウェーブを稼ぎ直せないか**(2026-07-28ユーザー指摘
     「ウェーブ2でゾンビ倒して400稼いでタレット置く→中断→再開 で永遠に稼げちゃう」)。
   ⚠原因=中断した瞬間の状態(稼いだ⚙️・建てた塔)を保存したうえで**ウェーブ番号だけ1つ戻していた**。
   ⭐直し方=ウェーブが始まった瞬間の写し(G.rsnap)を保存する。**戻すなら丸ごと戻す**。 */
function checkResumeFarm(){
 META.stg=0;setDiff=2;startSolo();
 const m=G.players[0];
 m.scrap=500;G.wave=1;G.phase='interval';
 nextWave();PAUSED=false;/* WAVE2を始める=ここで写しを取っているはず */
 const w0=G.wave,s0=Math.round(m.scrap);
 /* 戦闘中に400稼いで塔を1基建てる */
 m.scrap+=400;const si=AI_ORDER[0];m.towers[si]=null;buildTower(m,si,0);
 if(!m.towers[si]){console.log('FAIL: 検査用の塔が建っていない');process.exit(1);}
 saveRun();
 const d=loadRun();
 if(!d){console.log('FAIL: 戦闘中に中断しても何も保存されない');process.exit(1);}
 if(d.scrap!==s0){console.log('FAIL: 戦闘中に稼いだ⚙️まで保存している(ウェーブ開始時'+s0+' → 保存'+d.scrap+')'
  +'=同じウェーブを何度でも稼ぎ直せる');process.exit(1);}
 if(d.tw[si]){console.log('FAIL: 戦闘中に建てた塔まで保存している=稼ぎ直せる');process.exit(1);}
 if((d.wave||0)+1!==w0){console.log('FAIL: 再開するウェーブがずれている(保存'+d.wave+' → WAVE'
  +((d.wave||0)+1)+' / 中断したのは WAVE'+w0+')');process.exit(1);}
 backTitle();
 if(!resumeRun()){console.log('FAIL: 戦闘中の中断から再開できない');process.exit(1);}
 const n=G.players[0];
 if(Math.round(n.scrap)!==s0){console.log('FAIL: 再開後の⚙️がウェーブ開始時と違う('+s0+'→'+Math.round(n.scrap)+')');process.exit(1);}
 if(n.towers[si]){console.log('FAIL: 再開後に戦闘中の塔が残っている');process.exit(1);}
 console.log('中断の稼ぎ直し: WAVE'+w0+'の戦闘中に+400して塔を建てて中断 → 保存も再開も⚙️'+s0+'・塔なし(丸ごと巻き戻る) OK');
 clearRun();backTitle();
}
/* ---- 研究所の個別強化(タワー1種ごと / 兵科1種ごと)と砲撃の威力(2026-07-26) ---- */
/* ---- 研究所の個別強化の「刻み」(2026-07-26 第88弾) ----
   ⭐ユーザー指示「3段だとすぐ強化が終わって全部マックスになる。
     おれはこの火炎系を上げていくぞ、みたいな各々のビルドを作っていくのを大事にしたい」。
   ⚠**狙いそのものを数字で見張る**=段数を戻したり価格を緩めたりすると落ちる。
     ①十分細かく刻んであるか ②1本は手が届くか ③全部取りは手が届かないか。
   ⚠②と③の両方を見ること。どちらか片方だと「全部安い」「全部高い」に倒れても気づけない。 */
function checkLabSteps(){
 if(LINE_MAX<10){console.log('FAIL: 個別強化の段数が少なすぎる('+LINE_MAX+'段)=すぐ全部マックスになる');process.exit(1);}
 if(STK_MAX<10){console.log('FAIL: 砲撃の段数が少なすぎる('+STK_MAX+'段)');process.exit(1);}
 const sum=(f)=>{let t=0;for(let i=0;i<LINE_MAX;i++)t+=f(i);return t;};
 const tw1=sum(LAB_TW),un1=sum(LAB_UN);
 let st1=0;for(let i=0;i<STK_MAX;i++)st1+=LAB_ST0(i);
 /* 1本を伸ばし切るのは「何回かの出撃ぶん」で届くこと(届かないと選ぶ楽しみ以前に何も伸びない)。
    ⚠上限は2026-07-27に4,000→9,000→**20,000**へ上げた=ユーザー判断「研究所の必要ptが少なすぎる」で
      ①全タブを1.5倍→さらに1.8倍(素の2.7倍) ②タワー/部隊は1段ごとの伸びを x1.13→x1.20
      と2回上げたため。**安くしたい時はここも一緒に下げること** */
 if(tw1>20000||un1>20000){console.log('FAIL: 1本を伸ばし切るのが高すぎる(タワー'+tw1+'/兵科'+un1+'🧬)');process.exit(1);}
 if(tw1<800||un1<800){console.log('FAIL: 1本を伸ばし切るのが安すぎる(タワー'+tw1+'/兵科'+un1+'🧬)=すぐ終わる');process.exit(1);}
 /* 全部取りは手が届かないこと=何を伸ばすか選ばせるための本丸 */
 const seenT={};let nT=0;
 for(let i=0;i<T_PLAY;i++){const T=TOWERS[i];if(T.type==='sup')continue;
  const k=twKey(T);if(seenT[k])continue;seenT[k]=1;nT++;}
 const all=tw1*nT+un1*U_N+st1;
 if(all<60000){console.log('FAIL: 全部取りが安すぎる('+all+'🧬)=結局すべてマックスになる');process.exit(1);}
 /* 1段の伸びが細かいこと(段数だけ増やして1段を据え置くと、伸び切った時に壊れる) */
 if(TW_DMG_STEP*LINE_MAX>1.5){console.log('FAIL: 伸び切ったタワーが強すぎる(x'+(1+TW_DMG_STEP*LINE_MAX).toFixed(2)+')');process.exit(1);}
 for(const ty in TW_TRAIT){const v=TW_TRAIT[ty].v*LINE_MAX;
  if(TW_TRAIT[ty].k!=='chain'&&v>2){console.log('FAIL: 伸び切った持ち味が強すぎる '+ty+' +'+Math.round(v*100)+'%');process.exit(1);}}
 console.log('研究所の刻み: '+LINE_MAX+'段 / 1本フル タワー'+tw1+'・兵科'+un1+'🧬 / 全部取り'+all+'🧬(=選ばせる) OK');
}
/* ⭐まとめ買い(×5)の検査。⚠**値段だけ合っていても駄目**で、
   「払った段数ぶん実際に上がるか」「残りが足りない時に縮むか」「表に無い項目は1回きりか」を見る。
   ⚠DOMを見ても分からない(ヘッドレスは差し込んだ要素を数えられない)ので LAB_ITEMS を見る */
/* ⭐⭐**攻撃の溜め**の検査(2026-07-30)。⚠見るのは3つ:
   ①溜めたぶんが1発の威力で戻っているか(実効DPSが表と一致するか)
   ②**溜めが攻撃間隔に対して長すぎないか**(1発が重くなりすぎると、DPSが同じでも
     数の多い相手に弱くなる=オーバーキルで威力がこぼれ、同時に相手できる敵も減る)
   ③溜めが0.9秒を超えてよいのは間隔の長い砲だけか */
function checkUChg(){
 let mx=0,mxId='',n0=0,long=[];
 for(let i=0;i<UNITS.length;i++){const U=UNITS[i],ct=uChgT(i),m=uChgM(i);
  if(ct<0){console.log('FAIL: 溜めが負になっている '+U.id);process.exit(1);}
  if(ct===0)n0++;
  /* ①実効DPS=表の atk/rate と一致すること(test_balance が表で見ているので、ここがズレると嘘になる) */
  const eff=(U.atk*m)/(U.rate+ct),paper=U.atk/U.rate;
  if(Math.abs(eff-paper)>paper*1e-9){
   console.log('FAIL: '+U.id+' の実効DPSが表とズレている '+eff.toFixed(2)+' vs '+paper.toFixed(2));process.exit(1);}
  /* ②溜めは攻撃間隔の CHG_CAP 倍まで=1発の倍率は 1+CHG_CAP を超えない */
  if(ct>U.rate*CHG_CAP+1e-9){
   console.log('FAIL: '+U.id+' の溜めが攻撃間隔に対して長すぎる '+ct+'秒(間隔'+U.rate+'秒)');process.exit(1);}
  if(m>mx){mx=m;mxId=U.id;}
  if(ct>.9)long.push(U.id+'('+ct+'秒/間隔'+U.rate+'秒)');}
 if(mx>1+CHG_CAP+1e-9){console.log('FAIL: 1発の倍率が上限を超えている '+mxId+' x'+mx.toFixed(2));process.exit(1);}
 if(!n0){console.log('FAIL: 溜め0秒の兵科が1つも無い(テンポを担保する枠が必要)');process.exit(1);}
 /* ③0.9秒を超える溜めは、間隔1.5秒以上の砲だけ */
 for(const q of long){const id=q.split('(')[0],U=UNITS.find(u=>u.id===id);
  if(U.rate<1.5){console.log('FAIL: '+id+' は間隔が短いのに溜めが0.9秒を超えている');process.exit(1);}}
 console.log('攻撃の溜め: 溜め0秒'+n0+'種 / 1発の最大倍率 x'+mx.toFixed(2)+'('+mxId+')'
  +' / 特大枠 '+(long.length?long.join('・'):'なし')+' / 実効DPSは表と一致 OK');
}
/* ⭐攻撃モーションは「交戦している時」だけ動くこと(2026-07-30ユーザー指摘
   「出した途端に振る」「敵がいないのに振る」)。⚠u.cd は出撃直後にも倒した後にも残っている。
   ⚠他のキャラに攻撃モーションを付けた時もここに1件足すこと。 */
function checkAtkMotion(){
 const ui=UNITS.findIndex(u=>u.id==="bat"),U=UNITS[ui];
 if(ui<0){console.log("FAIL: バットが無い");process.exit(1);}
 const mk=(o)=>Object.assign({ui,cd:0,eng:0,fired:0},o);
 if(uBatP(mk({cd:0.25}))!==0){
  console.log("FAIL: 出撃直後(交戦していない)なのに振っている");process.exit(1);}
 if(uBatP(mk({cd:U.rate*0.5,fired:1}))!==0){
  console.log("FAIL: 敵が居ないのに振りかぶっている");process.exit(1);}
 if(!(uBatP(mk({cd:U.rate*0.5,eng:1}))>0)){
  console.log("FAIL: 交戦中なのに振っていない");process.exit(1);}
 if(!(uBatP(mk({cd:U.rate*0.9,fired:1}))>0)){
  console.log("FAIL: 倒した直後の振り抜きが途切れている");process.exit(1);}
 console.log("攻撃モーション: 出撃直後=振らない / 敵なし=振らない / 交戦中=振る / 倒した直後の振り抜きは続く OK");
}
/* ⭐⭐**開始タブの段**(2026-08-02ユーザー指示「もっと段階増やして。上げてくごとに数値増やそう。
   例で初期スクラップ 40→120→360→720→1200→2000」)。見るのは4つ:
   ①累計が増え続ける ②**1段の伸びが前の段以上**(これが指示の本体) ③値段も上がる
   ④実際に出撃に効く(表を作っても startSolo が拾っていなければ意味がない)。 */
function checkStart0(){
 const tbl=[['⚙️初期スクラップ',SC0_V,LAB_SC],['🏕コアHP',HP0_V,LAB_HP],['🔩開始の強化pt',UP0_V,LAB_UP0]];
 const line=[];
 for(const t of tbl){const n=t[0],V=t[1],F=t[2];
  if(V[0]!==0){console.log('FAIL: '+n+' の表がLv0=0で始まっていない');process.exit(1);}
  if(V.length-1<6){console.log('FAIL: '+n+' の段が少ない('+(V.length-1)+'段)');process.exit(1);}
  let pStep=0,pPrice=0,sum=0;
  for(let lv=0;lv<V.length-1;lv++){
   const step=V[lv+1]-V[lv],p=F(lv);
   if(!(step>0)){console.log('FAIL: '+n+' のLv'+(lv+1)+'で累計が増えていない');process.exit(1);}
   if(step<pStep){console.log('FAIL: '+n+' のLv'+(lv+1)+'で1段の伸びが減っている(+'+step+' < +'+pStep+')');process.exit(1);}
   if(!(p>pPrice)){console.log('FAIL: '+n+' のLv'+(lv+1)+'の値段が上がっていない('+p+')');process.exit(1);}
   pStep=step;pPrice=p;sum+=p;}
  if(sum>20000){console.log('FAIL: '+n+' を伸ばし切るのが高すぎる('+sum+'🧬)');process.exit(1);}
  line.push(n+' +'+V[V.length-1]+'/'+(V.length-1)+'段/'+sum+'🧬');}
 /* まとめ買いの上限が段数と揃っているか(古い数字が残ると途中で買えなくなる) */
 const cap=[['sc0',SC0_MAX],['hp0',HP0_MAX],['up0',UP0_MAX],['uu0',UU0_MAX],['sl0',SL0_MAX]];
 for(const c of cap)if(LAB_MSTEP[c[0]][0]!==c[1]){
  console.log('FAIL: まとめ買いの上限が段数と違う '+c[0]+' '+LAB_MSTEP[c[0]][0]+'/'+c[1]);process.exit(1);}
 /* ④ 全部取り切った状態で出撃して、実際に効いているか */
 const kp=[META.sc0,META.hp0,META.up0,META.uu0,META.sl0,META.nu];
 META.sc0=SC0_MAX;META.hp0=HP0_MAX;META.up0=UP0_MAX;META.uu0=UU0_MAX;META.sl0=SL0_MAX;META.nu=U_N-BASE_U;
 META.stg=0;setDiff=2;startSolo();
 const me=G.players[0];
 if(me.scrap!==D5v().scrap+SC0_V[SC0_MAX]){console.log('FAIL: 初期スクラップが効いていない '+me.scrap);process.exit(1);}
 if(me.coreMax!==50+HP0_V[HP0_MAX]){console.log('FAIL: コアHPが効いていない '+me.coreMax);process.exit(1);}
 if(me.upTotal!==12+UP0_V[UP0_MAX]){console.log('FAIL: 開始の強化ptが効いていない '+me.upTotal);process.exit(1);}
 if(me.uUn!==Math.min(me.team.length,2+UU0_MAX)){console.log('FAIL: 開始の部隊枠が効いていない '+me.uUn);process.exit(1);}
 const sl=me.slk.filter(Boolean).length;
 if(sl!==SLOT0+SL0_MAX){console.log('FAIL: 建設スロットが効いていない '+sl+'(想定'+(SLOT0+SL0_MAX)+')');process.exit(1);}
 backTitle();
 META.sc0=kp[0];META.hp0=kp[1];META.up0=kp[2];META.uu0=kp[3];META.sl0=kp[4];META.nu=kp[5];
 console.log('開始タブ: '+line.join(' / ')+' / 🤝部隊枠'+UU0_MAX+'段・🧱建設枠'+SL0_MAX+'段 / 出撃に反映 OK');
}
function checkLabMul(){
 const keep=META.pts;
 META.pts=999999;META.tw={};META.un={};META.st0=0;META.nt=3;META.nu=3;
 LABMUL=5;renderLab();
 const it=LAB_ITEMS.find(x=>x.k==='tw');
 if(!it){console.log('FAIL: まとめ買いの検査でタワー強化の項目が出ない');process.exit(1);}
 let want=0;for(let i=0;i<5;i++)want+=LAB_TW(i);
 if(it.n!==5||it.p!==want){console.log('FAIL: ×5の値段が1段ずつの合計と違う('+it.p+'/'+want+' n='+it.n+')');process.exit(1);}
 /* 実際に5段上がるか */
 const id=it.id,before=(META.tw[id]||0);
 META.pts-=it.p;META.tw[id]=before+it.n;
 if(META.tw[id]!==before+5){console.log('FAIL: ×5を買っても5段上がらない');process.exit(1);}
 /* 残りが足りない時は縮むこと(あと3段しか無いのに×5と出すのは嘘) */
 META.tw[id]=LINE_MAX-3;renderLab();
 const it2=LAB_ITEMS.find(x=>x.k==='tw'&&x.id===id);
 if(!it2||it2.n!==3){console.log('FAIL: 残り3段なのに×3へ縮んでいない(n='+(it2&&it2.n)+')');process.exit(1);}
 /* 「次の1つ」を買う形の項目(新型タワーなど)はまとめ買いの対象外 */
 const nt=LAB_ITEMS.find(x=>x.k==='nt');
 if(nt&&nt.n>1){console.log('FAIL: 新型タワーの解放がまとめ買いになっている');process.exit(1);}
 LABMUL=1;META.pts=keep;META.tw={};META.un={};
 console.log('研究所のまとめ買い: ×5='+want+'🧬(1段ずつの合計と一致)/残り3段では×3へ縮む/解放項目は対象外 OK');
}
function checkPerUp(){
 META.stg=0;setDiff=2;startSolo();frames(20,.016);
 const me=G.players[0],si=AI_ORDER[0],[sx,sy]=SLOTS[si];
 /* 素の状態にしてから測る(前の検査の買い物が残っていると倍率がずれる) */
 META.tw={};META.un={};META.st0=0;
 /* --- ① タワー1種ごとに威力が上がる。他のタワーには影響しない --- */
 const put=(id)=>{const ti=TOWERS.findIndex(t=>t.id===id);
  me.scrap=999999;me.unlocked=Math.max(me.unlocked,ti+1);me.towers[si]=null;buildTower(me,si,ti);return me.towers[si];};
 const hit1=(id)=>{const tw=put(id);
  me.zombies.length=0;
  const z=mkZ(zSpec(0,1,5),projPath(sx,sy));z.hp=z.mhp=1e9;me.zombies.push(z);
  tw.cd=999;campStep(me,.001,G.wave);
  tw.cd=0;const h0=z.hp;campStep(me,.001,G.wave);return h0-z.hp;};
 const base=hit1('rifle');
 if(!(base>0)){console.log('FAIL: ライフル台が当たっていない');process.exit(1);}
 META.tw={rifle:LINE_MAX};
 const up=hit1('rifle');
 const want=1+TW_DMG_STEP*LINE_MAX;
 if(Math.abs(up/base-want)>.03){console.log('FAIL: タワー個別強化Lv'+LINE_MAX+'で威力が'+want.toFixed(2)+'倍にならない ('+(up/base).toFixed(2)+'倍)');process.exit(1);}
 /* 別のタワー(ショットガン台)には乗らない=個別であること */
 META.tw={};
 const sBase=hit1('shot');
 META.tw={rifle:LINE_MAX,shot:0};
 const sNow=hit1('shot');
 if(Math.abs(sNow-sBase)>sBase*.02){console.log('FAIL: ライフル台を鍛えたのにショットガン台まで強くなっている');process.exit(1);}
 /* --- ② 型の持ち味も同じ段数で伸びる --- */
 META.tw={};
 /* 火炎の燃焼 */
 {const tw=put('flame');me.zombies.length=0;
  const z=mkZ(zSpec(0,1,5),projPath(sx,sy));z.hp=z.mhp=1e9;me.zombies.push(z);
  tw.cd=999;campStep(me,.001,G.wave);tw.cd=0;campStep(me,.001,G.wave);const b0=z.burnD;
  META.tw={flame:LINE_MAX};const tw2=put('flame');
  me.zombies.length=0;const z2=mkZ(zSpec(0,1,5),projPath(sx,sy));z2.hp=z2.mhp=1e9;me.zombies.push(z2);
  tw2.cd=999;campStep(me,.001,G.wave);tw2.cd=0;campStep(me,.001,G.wave);const b1=z2.burnD;
  /* ⚠燃焼(burnD)は威力(dm)とは別枠で作られている=威力+15%は乗らない(元の型ごと強化の頃からそう)。
     つまり火炎放射塔を鍛えると『直撃x1.45 + 燃焼x1.75』になる */
  const wb=1+TW_TRAIT.fire.v*LINE_MAX;
  if(!(b1>b0)){console.log('FAIL: 火炎放射塔を鍛えても燃焼が増えない '+b0+'→'+b1);process.exit(1);}
  if(Math.abs(b1/b0-wb)>.05){console.log('FAIL: 燃焼の伸びが想定と違う 期待'+wb.toFixed(2)+'倍 実際'+(b1/b0).toFixed(2)+'倍');process.exit(1);}}
 /* 電撃の連鎖数。⚠**実際に飛んだ体数を数える**こと。
    期待値を実装と同じ式で作ると、実装が壊れても検査も同じように壊れて必ず通ってしまう(レビュー指摘) */
 {const chainHit=(id,lv)=>{
   META.tw={};if(lv)META.tw[id]=lv;
   const ti=TOWERS.findIndex(t=>t.id===id);
   me.scrap=999999;me.unlocked=Math.max(me.unlocked,ti+1);me.towers[si]=null;buildTower(me,si,ti);
   const tw=me.towers[si];
   me.zombies.length=0;
   /* 連鎖は150px以内へ跳ねるので、塔の前に詰めて12体並べる(上限まで届く数) */
   for(let k=0;k<12;k++){const z=mkZ(zSpec(0,1,5),Math.max(20,projPath(sx,sy)-40+k*22));z.hp=z.mhp=1e9;me.zombies.push(z);}
   tw.cd=999;campStep(me,.001,G.wave);
   const h0=me.zombies.map(z=>z.hp);
   tw.cd=0;campStep(me,.001,G.wave);
   return me.zombies.filter((z,i)=>h0[i]-z.hp>0).length;};
  const c0=chainHit('tesla',0),c3=chainHit('tesla',LINE_MAX);
  if(!(c0>0)){console.log('FAIL: テスラコイルが1体にも当たっていない');process.exit(1);}
  const wantC=TW_TRAIT.elec.v*LINE_MAX;
  if(c3-c0!==wantC){console.log('FAIL: テスラの連鎖が Lv'+LINE_MAX+'で+'+wantC+'体にならない ('+c0+'体→'+c3+'体)');process.exit(1);}
  console.log('電撃の連鎖: 素'+c0+'体 → 研究所Lv'+LINE_MAX+'で'+c3+'体(実際に当たった数を数えた) OK');}
 /* --- ③ 工房の3段は1つの枠を共有する(建て替えで無駄にならない) --- */
 {const ks=['scrap','scrap2','scrap3'].map(id=>twKey(TOWERS[TOWERS.findIndex(t=>t.id===id)]));
  if(new Set(ks).size!==1){console.log('FAIL: 工房の3段が別々の強化枠になっている ['+ks.join(',')+']');process.exit(1);}
  META.tw={scrap:LINE_MAX};
  const inc=(id)=>{const ti=TOWERS.findIndex(t=>t.id===id),T=TOWERS[ti];
   me.towers[ECO_BASE]=null;me.scrap=999999;me.unlocked=Math.max(me.unlocked,ti+1);
   if(T.grd){buildTower(me,ECO_BASE,ECO_TI);let g=0;
    while(me.towers[ECO_BASE].ti!==ti&&g++<8){const t2=me.towers[ECO_BASE];
     twStats(t2.ti).forEach(x=>t2.us[x]=USTAT_MAX);me.scrap=999999;if(!gradeTower(me,ECO_BASE))break;}
   }else buildTower(me,ECO_BASE,ti);
   const tw=me.towers[ECO_BASE];tw.us=newUs();
   const g0=me.scrap;tw.cd=0;campStep(me,.001,G.wave);return me.scrap-g0;};
  const a=inc('scrap'),b=inc('scrap3');
  if(!(a>0&&b>0)){console.log('FAIL: 工房が⚙️を生んでいない '+a+' / '+b);process.exit(1);}
  META.tw={};const a0=inc('scrap');
  if(!(a>a0)){console.log('FAIL: 工房を鍛えても産出が増えない '+a0+'→'+a);process.exit(1);}}
 /* --- ④ 支援施設は強化の対象にしない --- */
 META.tw={};META.nt=T_PLAY-BASE_T;META.nu=U_N-BASE_U;renderLab();/* 全部解放した状態で数える */
 {const rows=LAB_ITEMS.filter(o=>o.cat==='twup');
  const supN=TOWERS.filter(T=>T.type==='sup').length;
  /* ⚠「一覧に出ていないか」だけ見ると、支援施設は T_PLAY の外なので**構造上ぜったい落ちない検査**になる。
     ①持ち味の表に sup が無い ②形の表にも無い ③T_PLAY の範囲に sup が居ない ④一覧にも出ない、の4つを見る(レビュー指摘) */
  if(TW_TRAIT.sup){console.log('FAIL: 支援施設の型が持ち味の表に入っている');process.exit(1);}
  for(const T of TOWERS)if(T.type==='sup'&&TW_SHAPE[T.id]){
   console.log('FAIL: 支援施設('+T.n+')が基部の形の表に入っている=専用の絵が上書きされる');process.exit(1);}
  for(let i=0;i<T_PLAY;i++)if(TOWERS[i].type==='sup'){
   console.log('FAIL: 支援施設が T_PLAY の範囲に入っている(強化の対象になってしまう)');process.exit(1);}
  if(rows.some(o=>{const T=TOWERS.find(t=>twKey(t)===o.id);return T&&T.type==='sup';})){
   console.log('FAIL: 支援施設が強化の一覧に出ている');process.exit(1);}
  /* ⚠支援施設(sup)とグレードアップ専用(grd)はどちらも T_PLAY の**外**(TOWERSの末尾)にあるので、
     T_PLAY のループには最初から入らない=解放済みなら T_PLAY 種ぜんぶが並ぶ。
     工房も T_PLAY 内には scrap の1つだけ(上級/プラントは外)なので自然に1枠になる */
  const wantN=T_PLAY;
  if(rows.length!==wantN){console.log('FAIL: タワー強化の項目数が合わない 期待'+wantN+' 実際'+rows.length);process.exit(1);}
  const uns=LAB_ITEMS.filter(o=>o.cat==='unup');
  if(uns.length!==U_N){console.log('FAIL: 兵科強化の項目数が合わない 期待'+U_N+' 実際'+uns.length);process.exit(1);}
  const st=LAB_ITEMS.filter(o=>o.k==='st0');
  if(st.length!==1){console.log('FAIL: 砲撃の威力強化が研究所に出ていない');process.exit(1);}
  /* まだ解放していないタワーは出さない */
  META.nt=0;renderLab();
  const rows0=LAB_ITEMS.filter(o=>o.cat==='twup');
  if(rows0.length>=rows.length){console.log('FAIL: 未解放のタワーまで強化の一覧に出ている');process.exit(1);}
  console.log('研究所の個別強化: タワー'+rows.length+'枠(支援'+supN+'種と工房の上位2段は対象外=工房は1枠を共有)/兵科'+uns.length+'種/砲撃の威力1項目 OK');}
 /* --- ⑤ 兵科1種ごと。派生キャラは元の兵科の枠を共有する --- */
 META.un={};
 {const ui=0,U=UNITS[ui];
  me.units.length=0;me.scrap=999999;me.ucd=UNITS.map(()=>0);me.team=UNITS.map((u,i)=>i);me.uUn=U_N;
  deployUnit(me,ui);const u0=me.units[me.units.length-1];const a0=u0.am,h0=u0.mhp;
  META.un={[U.id]:LINE_MAX};
  me.units.length=0;me.ucd=UNITS.map(()=>0);deployUnit(me,ui);
  const u1=me.units[me.units.length-1];
  const st=UN_STEP(U.type);
  if(Math.abs(u1.am/a0-(1+st.a*LINE_MAX))>.03){console.log('FAIL: 兵科強化で攻撃が上がらない '+(u1.am/a0).toFixed(2)+'倍');process.exit(1);}
  if(Math.abs(u1.mhp/h0-(1+st.h*LINE_MAX))>.03){console.log('FAIL: 兵科強化でHPが上がらない '+(u1.mhp/h0).toFixed(2)+'倍');process.exit(1);}
  /* 派生キャラ(進化)が元の兵科の強化を継承するか */
  const vb=(typeof UVAR==='object'&&UVAR[U.id])?UVAR[U.id][0]:null;
  if(vb){const V=mkVar(U,vb);
   if(unKey(V)!==U.id){console.log('FAIL: 派生キャラ('+V.n+')が元の兵科の強化枠を引き継いでいない');process.exit(1);}
   if(unlv(unKey(V))!==LINE_MAX){console.log('FAIL: 派生キャラに元の兵科の強化Lvが乗っていない');process.exit(1);}}
  console.log('兵科の個別強化: '+U.n+'をLv'+LINE_MAX+'で攻撃x'+(u1.am/a0).toFixed(2)+'・HPx'+(u1.mhp/h0).toFixed(2)
   +(vb?' / 派生「'+mkVar(U,vb).n+'」も同じ枠を共有':'')+' OK');}
 /* --- ⑥ 砲撃の威力。直撃と燃焼の両方に乗ること --- */
 {const stkDmg=()=>{me.zombies.length=0;
   const z=mkZ(zSpec(0,1,5),PLEN*.5);z.hp=z.mhp=1e9;me.zombies.push(z);
   campStep(me,.001,G.wave);
   const h0=z.hp;airstrikeHit(me,z.px,z.py,5,'napalm',true);
   return {d:h0-z.hp,b:z.burnD};};
  META.st0=0;const s0=stkDmg();
  META.st0=STK_MAX;const s1=stkDmg();
  const w=1+STK_STEP*STK_MAX;
  if(!(s0.d>0)){console.log('FAIL: 砲撃が当たっていない');process.exit(1);}
  if(Math.abs(s1.d/s0.d-w)>.02){console.log('FAIL: 砲撃の威力がLv'+STK_MAX+'で'+w.toFixed(2)+'倍にならない ('+(s1.d/s0.d).toFixed(2)+'倍)');process.exit(1);}
  if(Math.abs(s1.b/s0.b-w)>.02){console.log('FAIL: 砲撃の燃焼に強化が乗っていない ('+(s1.b/s0.b).toFixed(2)+'倍)');process.exit(1);}
  /* 5種すべてに乗っているか(1つでも掛け忘れると片方だけ強くならない) */
  for(const k of ['air','carpet','frost','mgun']){
   me.zombies.length=0;const z=mkZ(zSpec(0,1,5),PLEN*.5);z.hp=z.mhp=1e9;me.zombies.push(z);
   campStep(me,.001,G.wave);
   META.st0=0;let h=z.hp;airstrikeHit(me,z.px,z.py,5,k,true);
   const d0=k==='mgun'?(me.mg?me.mg.dmg:0):(h-z.hp);
   META.st0=STK_MAX;h=z.hp;airstrikeHit(me,z.px,z.py,5,k,true);
   const d1=k==='mgun'?(me.mg?me.mg.dmg:0):(h-z.hp);
   if(!(d0>0)){console.log('FAIL: 砲撃'+k+'が効いていない');process.exit(1);}
   if(Math.abs(d1/d0-w)>.03){console.log('FAIL: 砲撃'+k+'に威力強化が乗っていない ('+(d1/d0).toFixed(2)+'倍)');process.exit(1);}}
  META.st0=0;
  /* ⭐**砲撃は解放の順に強くなる**(2026-07-27ユーザー指示「順番に開放に、順番に強さも変えて」)。
     ⚠1体あたりではなく**1回撃った時の総ダメージ**で見る=絨毯爆撃は薄く広い、ナパームは狭く重い、
       という違いを1体だけ置いて測ると順番が逆に出る。道に沿って敵を並べて総量を測る。 */
  {const tot=k=>{me.zombies.length=0;me.mg=null;
    for(let i=0;i<14;i++){const z=mkZ(zSpec(0,1,5),PLEN*.5-260+i*40);z.hp=z.mhp=1e9;me.zombies.push(z);}
    campStep(me,.001,G.wave);
    const mid=me.zombies[7],h0=me.zombies.map(z=>z.hp);
    airstrikeHit(me,mid.px,mid.py,10,k,true);
    let d=0;me.zombies.forEach((z,i)=>{d+=(h0[i]-z.hp)+(z.burnD||0)*(z.burnT||0);});
    /* 機関銃掃射は撃った瞬間ではなく3.6秒かけて当たるので、その総量を足す */
    if(me.mg)d+=me.mg.dmg*(me.mg.t/.075);/* 0.075秒ごとに1発 */
    return d;};
   const seq=['air'].concat(STK_ORDER),pw=seq.map(tot);
   for(let i=1;i<seq.length;i++)if(!(pw[i]>pw[i-1])){
    console.log('FAIL: 砲撃が解放の順に強くなっていない '+seq[i-1]+'('+Math.round(pw[i-1])+') → '+seq[i]+'('+Math.round(pw[i])+')');process.exit(1);}
   /* 解放は「次の1つ」だけ出ること(タワー/兵科と同じ形) */
   const keep=(META.st||[]).slice();META.st=['air'];
   renderLab();
   const st1=LAB_ITEMS.filter(it=>it.k==='stk');
   if(st1.length!==1||st1[0].id!==STK_ORDER[0]){
    console.log('FAIL: 砲撃の解放が「次の1つ」になっていない('+st1.length+'件)');process.exit(1);}
   if(st1[0].cat!=='new'){console.log('FAIL: 砲撃の解放が新種タブに出ていない');process.exit(1);}
   if(LAB_CATS.some(c=>c.k==='stk')){console.log('FAIL: 砲撃タブが残っている');process.exit(1);}
   META.st=keep;
   console.log('砲撃: 新種タブで順番に解放(air→'+STK_ORDER.join('→')+')・総ダメージ '+pw.map(v=>Math.round(v)).join('<')+' OK');}
  console.log('砲撃の威力: Lv'+STK_MAX+'で直撃x'+(s1.d/s0.d).toFixed(2)+'・燃焼x'+(s1.b/s0.b).toFixed(2)+'(5種すべて) OK');}
 /* --- ⑦ 派生キャラを装備した状態でも、研究所が『素の兵科のid』で保存すること(2026-07-26レビュー) ---
    ⚠applyLoadout(true) は UNITS[i] を派生キャラの実体に差し替え、タイトルへ戻っても元に戻らない。
      研究所が UNITS から引くと『狼』のidで保存され、出撃側(unKey=元のid)が読めず**強化が消えて🧬が丸損**になる。
      しかも Lv0/3 と表示されて重ね買いできてしまう。 */
 {const U0=UBASE[0];
  const vb=(typeof UVAR==='object'&&UVAR[U0.id])?UVAR[U0.id][0]:null;
  if(vb){
   META.uv=[vb.id];META.ld={};META.ld[U0.id]=vb.id;META.nu=U_N-BASE_U;META.un={};
   META.stg=0;setDiff=2;startSolo();frames(10,.016);
   /* 派生が実際に UNITS に入っているか(前提の確認。入っていないとこの検査は何も見ていない) */
   if(UNITS[0].id!==vb.id){console.log('FAIL: 検査の前提が崩れている(編成で派生が適用されていない)');process.exit(1);}
   backTitle();
   renderLab();
   const uns=LAB_ITEMS.filter(o=>o.k==='un');
   const ng=uns.filter(o=>!UBASE.some(u=>u.id===o.id));
   if(ng.length){console.log('FAIL: 研究所の兵科強化が派生キャラのidで登録されている ['+ng.map(o=>o.id).join(',')+']');process.exit(1);}
   /* 素のidで買った強化が、派生を装備した状態でもちゃんと乗るか */
   META.un={};META.un[U0.id]=LINE_MAX;
   META.stg=0;setDiff=2;startSolo();frames(10,.016);
   const me2=G.players[0];
   me2.scrap=999999;me2.ucd=UNITS.map(()=>0);me2.team=UNITS.map((u,i)=>i);me2.uUn=U_N;me2.units.length=0;
   deployUnit(me2,0);
   const uu=me2.units[me2.units.length-1];
   const st2=UN_STEP(UNITS[0].type),wantA=1+st2.a*LINE_MAX;
   if(Math.abs((uu.am||1)-wantA)>.03){
    console.log('FAIL: 派生キャラに元の兵科の強化が乗っていない 期待x'+wantA.toFixed(2)+' 実際x'+(uu.am||1).toFixed(2));process.exit(1);}
   console.log('派生キャラ: 「'+UNITS[0].n+'」を装備しても研究所は素のid('+uns.length+'件すべて)で登録し、強化x'+(uu.am||1).toFixed(2)+'が乗る OK');
   META.uv=[];META.ld={};META.un={};backTitle();
  }}
 /* --- ⑧ 廃品工房の産出は「発射処理」と「ウェーブ放棄の精算」で同じ額であること ---
    ⚠同じ式が2か所に散らばっていて、精算側だけ研究所の産出強化が抜けていた(鍛えた工房ほど損をしていた) */
 {META.stg=0;setDiff=2;startSolo();frames(20,.016);
  const me3=G.players[0];
  me3.towers[ECO_BASE]=null;me3.scrap=999999;me3.unlocked=Math.max(me3.unlocked,ECO_TI+1);
  buildTower(me3,ECO_BASE,ECO_TI);
  const tw3=me3.towers[ECO_BASE];
  META.tw={};const p0=ecoPer(TOWERS[ECO_TI],tw3);
  META.tw={scrap:LINE_MAX};const p1=ecoPer(TOWERS[ECO_TI],tw3);
  const wantR=1+TW_TRAIT.eco.v*LINE_MAX;
  /* ⚠**倍率(割り算)で見てはいけない**。ecoPer は Math.round した整数を返すので、
     素が5⚙️だと x1.70 の期待に対して round(8.5)=9 → 実測 x1.80 になり、
     正しく効いていても落ちる(2026-07-26に段数を20に刻んだ時に踏んだ)。
     **丸めの1⚙️ぶんを許して「値」で見る**。強化が丸ごと乗っていなければ差は1より大きく開く。 */
  if(Math.abs(p1-p0*wantR)>1.2){console.log('FAIL: 工房の産出に研究所の強化が乗っていない 期待'+(p0*wantR).toFixed(1)+'⚙️ 実際'+p1+'⚙️(x'+(p1/p0).toFixed(2)+')');process.exit(1);}
  /* 実際に⚙️が入る額と、精算に使う額が一致するか(2か所に式が散らばる事故の再発防止) */
  const g0=me3.scrap;tw3.cd=0;campStep(me3,.001,G.wave);const real=me3.scrap-g0;
  if(real!==p1){console.log('FAIL: 実際に入る⚙️('+real+')と ecoPer('+p1+')が食い違う=式が2か所にある');process.exit(1);}
  console.log('工房の産出: 1サイクル'+p0+'⚙️ → 研究所Lv'+LINE_MAX+'で'+p1+'⚙️(x'+(p1/p0).toFixed(2)+')・放棄の精算も同じ式 OK');
  META.tw={};backTitle();}
 /* --- ⑨ ⭐ドローン基地(2026-07-27に作り替え=機体1つ1つが敵を追って撃つ) ---
    見るのは4つ: ①強化で機体が増える(1→5・母艦は8) ②機体が基地から飛び出す
    ③弾(pel)が機体の位置から出て座標が有限 ④📡射程の強化代が消えて🛩機体数になっている。
    ⚠**塔の tw.cd では撃たない**(機体ごとに cd を持つ)ので、cd を0にする昔の書き方では何も出ない。 */
 {META.stg=0;setDiff=2;startSolo();frames(20,.016);
  const me4=G.players[0],si4=AI_ORDER[0],ti4=TOWERS.findIndex(t=>t.id==='drone');
  if(ti4>=0){
   const T4=TOWERS[ti4];
   const stl4=twStats(ti4);
   if(stl4.indexOf('g')>=0){console.log('FAIL: ドローン基地に📡射程の強化が残っている');process.exit(1);}
   if(stl4.indexOf('n')<0){console.log('FAIL: ドローン基地に🛩機体数の強化が無い');process.exit(1);}
   if(twDrN(T4,{us:newUs()})!==1){console.log('FAIL: 素のドローンが1機でない '+twDrN(T4,{us:newUs()}));process.exit(1);}
   if(twDrN(T4,{us:Object.assign(newUs(),{n:USTAT_MAX})})!==5){console.log('FAIL: 強化しても5機にならない');process.exit(1);}
   /* ⭐**進化しても機数は5機のまま**。進化で増えるのは1機が積める弾数(2026-07-27ユーザー指示) */
   {const g4=TOWERS.findIndex(t=>t.id==='drone2'),G4=TOWERS[g4];
    if(twDrN(G4,{us:Object.assign(newUs(),{n:USTAT_MAX*2})})!==5){console.log('FAIL: 母艦の機数が5機を超えている');process.exit(1);}
    if(twStats(g4).indexOf('n')>=0){console.log('FAIL: 母艦にまだ🛩機体数の強化が残っている');process.exit(1);}
    if(twStats(g4).indexOf('a')<0){console.log('FAIL: 母艦に🔫弾数の強化が無い');process.exit(1);}
    if(twDrAmmo(G4,{us:newUs()})!==10){console.log('FAIL: 母艦の素の弾数が10発でない');process.exit(1);}
    if(twDrAmmo(G4,{us:Object.assign(newUs(),{a:USTAT_MAX})})!==20){console.log('FAIL: 🔫弾数MAXで20発にならない');process.exit(1);}
    /* ⚠🔫弾数は**素のドローン基地に無かった枠**=0段から5段ぶん買える(引き継ぎ0) */
    if(usMinSt(g4,'a')!==0){console.log('FAIL: 母艦の🔫弾数が引き継ぎ段から始まっている');process.exit(1);}
    if(usMinSt(g4,'d')!==USTAT_MAX){console.log('FAIL: 母艦の⚔攻撃が引き継がれていない');process.exit(1);}
    if(usCap(g4,'a')!==USTAT_MAX){console.log('FAIL: 母艦の🔫弾数の上限が5段でない');process.exit(1);}}
   /* 🛩機体数は上限(1→5=4段)より先は買えないこと=無駄な段を作らない */
   if(usCap(ti4,'n')!==4){console.log('FAIL: 🛩機体数の上限が4段でない '+usCap(ti4,'n'));process.exit(1);}
   me4.scrap=999999;me4.unlocked=Math.max(me4.unlocked,ti4+1);me4.towers[si4]=null;
   buildTower(me4,si4,ti4);
   const tw4=me4.towers[si4],[sx4,sy4]=SLOTS[si4];
   tw4.us.n=2;/* 3機にして散らばりも見る */
   me4.zombies.length=0;
   /* ⚠**機体の射程(基地の半分×0.7)より遠くに置く**=近すぎると「もう届く」ので飛ばない */
   for(let k=0;k<4;k++){const z=mkZ(zSpec(0,1,5),projPath(sx4,sy4)-230-k*26);z.hp=z.mhp=1e9;me4.zombies.push(z);}
   me4.fx.length=0;
   /* ⚠**弾(pel)は0.16秒で消える**ので、最後のフレームだけ見ると空振りする=毎フレーム集める */
   const pel=[];
   for(let k=0;k<80;k++){campStep(me4,.05,G.wave);for(const e of me4.fx)if(e.k==='pel'&&pel.indexOf(e)<0)pel.push(e);}
   if(!tw4.dr||tw4.dr.length!==3){console.log('FAIL: 機体が3機になっていない '+(tw4.dr?tw4.dr.length:'なし'));process.exit(1);}
   /* 機体が基地から飛び出しているか(=追いかけている) */
   const away=tw4.dr.filter(d=>Math.hypot(d.x-sx4,d.y-sy4)>40).length;
   if(!away){console.log('FAIL: 機体が基地から飛び出していない(敵を追っていない)');process.exit(1);}
   /* 基地の射程より外へは行かないこと */
   const far=tw4.dr.filter(d=>Math.hypot(d.x-sx4,d.y-sy4)>T4.rng*twRngM(tw4)+2).length;
   if(far){console.log('FAIL: 機体が基地の射程の外まで飛んでいる');process.exit(1);}
   if(!pel.length){console.log('FAIL: ドローンの弾(pel)が1つも出ていない');process.exit(1);}
   const nan=pel.filter(e=>!isFinite(e.x)||!isFinite(e.y)||!isFinite(e.x2||0)||!isFinite(e.y2||0));
   if(nan.length){console.log('FAIL: ドローンの弾の座標がNaN('+nan.length+'/'+pel.length+'発)');process.exit(1);}
   /* ⭐弾は**機体の位置から**出ていること(基地の中心から出ていたのがユーザー指摘の元) */
   const fromBase=pel.filter(e=>Math.hypot(e.x-sx4,e.y-sy4)<6).length;
   if(fromBase===pel.length){console.log('FAIL: 弾が基地の中心から出ている(機体から出ていない)');process.exit(1);}
   /* ⭐**弾を撃ち切ったら基地へ戻って補給する**(2026-07-27ユーザー指示)。
      ⚠弾数(10発)より多く撃たせて、基地へ戻る→補給→また撃つ が回るかを見る。 */
   {const d0=tw4.dr[0];d0.am=1;d0.rl=0;d0.x=sx4+200;d0.y=sy4;
    let back=false,refill=false;
    for(let k=0;k<200;k++){campStep(me4,.05,G.wave);
     if(d0.rl>0&&Math.hypot(d0.x-sx4,d0.y-sy4)<40)back=true;
     if(back&&d0.am>=twDrAmmo(T4,tw4)){refill=true;break;}}
    if(!back){console.log('FAIL: 弾切れのドローンが基地へ戻っていない');process.exit(1);}
    if(!refill){console.log('FAIL: 基地へ戻っても弾が補給されない');process.exit(1);}}
   console.log('ドローン基地: 素1機→強化で5機(進化しても5機)・弾10発で基地へ戻って補給・母艦は弾20発まで・弾'+pel.length+'発すべて機体から OK');}
  backTitle();}
 META.tw={};META.un={};META.st0=0;
 backTitle();
}
/* ---- 火炎放射塔の周囲ダメージ / レーザー塔の焼き切り / 廃品工房の建て替え(2026-07-26) ---- */
function checkTwNew(){
 META.stg=0;setDiff=2;startSolo();
 frames(20,.016);
 const me=G.players[0],si=AI_ORDER[0],[sx,sy]=SLOTS[si];
 /* ① 火炎放射塔: 継続攻撃(狙っている間ずっと当たる)+狙った1体の周りにも1/4だけ通る
    ⭐2026-07-27に**連射→継続攻撃**へ変えた。1発ぶんではなく**1秒あたり**で見る。 */
 {const ti=TOWERS.findIndex(t=>t.id==='flame'),T=TOWERS[ti];
  if(ti<0){console.log('FAIL: 火炎放射塔が見つからない');process.exit(1);}
  if(!T.cont){console.log('FAIL: 火炎放射塔が継続攻撃(cont)になっていない');process.exit(1);}
  me.scrap=99999;me.towers[si]=null;me.unlocked=Math.max(me.unlocked,ti+1);
  buildTower(me,si,ti);
  me.zombies.length=0;
  /* 塔の目の前に3体重ねて置く(px/pyはcampStepでしか入らないので1回回してから測る) */
  for(let k=0;k<3;k++){const z=mkZ(zSpec(0,1,5),projPath(sx,sy));z.hp=z.mhp=1e6;me.zombies.push(z);}
  campStep(me,.001,G.wave);/* 座標を入れる */
  me.zombies.forEach(z=>{z.hp=z.mhp;z.burnT=0;z.burnD=0;});
  const hp0=me.zombies.map(z=>z.hp);
  /* ⚠燃焼が混ざると直撃と周囲の比が測れないので、測る間だけ燃焼を切る */
  const bk=T.burn;T.burn=0;
  const DT=.5;campStep(me,DT,G.wave);
  T.burn=bk;
  const hit=me.zombies.map((z,i)=>hp0[i]-z.hp).filter(d=>d>0).sort((x,y)=>y-x);
  if(hit.length<2){console.log('FAIL: 火炎放射塔が周りの敵に当たっていない(当たったのは'+hit.length+'体)');process.exit(1);}
  const r=hit[1]/hit[0];
  if(Math.abs(r-.25)>.02){console.log('FAIL: 火炎の周囲ダメージが直撃の1/4でない ('+(r*100).toFixed(1)+'%)');process.exit(1);}
  /* 1秒あたりの威力が「連射だった頃と同じ(dmg/rate)」であること */
  const dpsWant=T.dmg/T.rate,dpsGot=hit[0]/DT;
  if(Math.abs(dpsGot/dpsWant-1)>.06){console.log('FAIL: 継続攻撃のDPSが連射だった頃と違う '+dpsGot.toFixed(1)+' vs '+dpsWant.toFixed(1));process.exit(1);}
  /* 強化の内訳: ⏩連射を消して🔥継続ダメージにした */
  {const stl=twStats(ti);
   if(stl.indexOf('r')>=0){console.log('FAIL: 火炎放射塔に⏩連射の強化が残っている');process.exit(1);}
   if(stl.indexOf('b')<0){console.log('FAIL: 火炎放射塔に🔥継続ダメージの強化が無い');process.exit(1);}
   if(!(twBurnM({us:Object.assign(newUs(),{b:USTAT_MAX})})>=2.2)){console.log('FAIL: 🔥継続ダメージLv5でも燃焼が2.2倍に届かない');process.exit(1);}}
  console.log('火炎放射塔: 継続攻撃 毎秒'+dpsGot.toFixed(1)+' + 周りの'+(hit.length-1)+'体へ'+(hit[1]/DT).toFixed(1)+'(直撃の'+(r*100).toFixed(0)+'%)'+' / 強化=['+twStats(ti).map(x=>USTAT_L[x]).join(',')+'] OK');
 }
 /* ⭐① -2 酸噴射砲: 燃焼ではなく**酸**が乗る / 酸まみれのまま倒れると周りの敵にも入る
    (2026-07-27ユーザー指示。それまでは type:'fire' の燃焼そのままで全19種の最弱だった) */
 {const ti=TOWERS.findIndex(t=>t.id==='acid'),T=TOWERS[ti];
  if(ti<0){console.log('FAIL: 酸噴射砲が見つからない');process.exit(1);}
  if(!T.axr||!T.axm){console.log('FAIL: 酸噴射砲に酸爆発(axr/axm)が無い');process.exit(1);}
  me.scrap=99999;me.towers[si]=null;me.unlocked=Math.max(me.unlocked,ti+1);
  buildTower(me,si,ti);
  me.zombies.length=0;
  const z0=mkZ(zSpec(0,1,5),projPath(sx,sy));z0.hp=z0.mhp=1e6;me.zombies.push(z0);
  campStep(me,.6,G.wave);
  if(!(z0.acdT>0&&z0.acdD>0)){console.log('FAIL: 酸噴射砲を撃っても酸(acdT)が乗らない');process.exit(1);}
  if(z0.burnT>0){console.log('FAIL: 酸噴射砲がまだ燃焼(burnT)を付けている=酸に置き換わっていない');process.exit(1);}
  if(!(z0.acdX>0)){console.log('FAIL: 酸爆発の威力(acdX)が乗っていない');process.exit(1);}
  /* 倒れた瞬間に周りへ入るか。⚠部隊とコアには当たらないこと */
  const nb=mkZ(zSpec(0,1,5),z0.d+2);nb.hp=nb.mhp=1e6;me.zombies.push(nb);
  campStep(me,.001,G.wave);/* nb に座標を入れる */
  nb.acdT=0;nb.acdD=0;nb.acdX=0;/* 巻き込まれる側は酸なしにして、入った量だけを見る */
  const nb0=nb.hp,ux=me.units.length,cx=me.core,ax=z0.acdX;
  z0.hp=0;killZ(me,z0);
  const got=nb0-nb.hp;
  if(!(got>0)){console.log('FAIL: 酸まみれの敵が倒れても周りに酸爆発が入らない');process.exit(1);}
  if(Math.abs(got/ax-1)>.02){console.log('FAIL: 酸爆発の威力が acdX と違う '+got.toFixed(1)+' vs '+ax.toFixed(1));process.exit(1);}
  if(me.core!==cx||me.units.length!==ux){console.log('FAIL: 酸爆発がコアか部隊に当たっている');process.exit(1);}
  if(z0.acdX!==0){console.log('FAIL: 酸爆発のあとも acdX が残っている(二度撒ける)');process.exit(1);}
  console.log('酸噴射砲: 酸'+z0.acdD.toFixed(1)+'/秒('+T.acdT+'秒)+ 倒れると半径'+T.axr+'へ'+Math.round(ax)+'(酸の'+T.axm+'倍)・部隊とコアには当たらない OK');
 }
 /* ② レーザー塔: 継続攻撃。同じ敵を焼き続けると最大 heatM 倍・別の敵に移ると0に戻る
    ⭐2026-07-27に**連射→継続攻撃**へ変えた。溜まり(tw.hs)は「発射数」ではなく
      **経過時間を発射数に換算した値**(dt/T.rate ずつ増える)。 */
 {const ti=TOWERS.findIndex(t=>t.id==='laser'),T=TOWERS[ti];
  if(ti<0){console.log('FAIL: レーザー塔が見つからない');process.exit(1);}
  if(!T.cont){console.log('FAIL: レーザー塔が継続攻撃(cont)になっていない');process.exit(1);}
  me.scrap=99999;me.towers[si]=null;me.unlocked=Math.max(me.unlocked,ti+1);
  buildTower(me,si,ti);
  me.zombies.length=0;
  const z=mkZ(zSpec(0,1,5),projPath(sx,sy));z.hp=z.mhp=1e9;me.zombies.push(z);
  campStep(me,.001,G.wave);
  const tw=me.towers[si];
  /* 溜まり0のときの1秒あたり */
  tw.hz=null;tw.hs=0;let h0=z.hp;const DT=.02;campStep(me,DT,G.wave);const d1=(h0-z.hp)/DT;
  /* 最大まで焼き切ってから測る */
  const secs=twHeatT(T,tw);
  for(let k=0;k<Math.ceil(secs/DT)+4;k++)campStep(me,DT,G.wave);
  h0=z.hp;campStep(me,DT,G.wave);const dMax=(h0-z.hp)/DT;
  if(Math.abs(tw.hs-T.heatN)>1e-6){console.log('FAIL: レーザーの溜まりが上限に達しない '+tw.hs+'/'+T.heatN);process.exit(1);}
  const mul=dMax/d1;
  if(Math.abs(mul-T.heatM)>.05){console.log('FAIL: レーザーが最大'+T.heatM+'倍にならない ('+mul.toFixed(2)+'倍)');process.exit(1);}
  /* 1秒あたりの素の威力が「連射だった頃と同じ(dmg/rate)」であること */
  if(Math.abs(d1/(T.dmg/T.rate)-1)>.06){console.log('FAIL: 継続攻撃のDPSが連射だった頃と違う '+d1.toFixed(1));process.exit(1);}
  /* 別の敵に移ったら0へ戻る */
  z.dead=true;z.hp=0;
  const z2=mkZ(zSpec(0,1,5),projPath(sx,sy));z2.hp=z2.mhp=1e9;me.zombies.push(z2);
  campStep(me,.001,G.wave);
  h0=z2.hp;campStep(me,DT,G.wave);const dNew=(h0-z2.hp)/DT;
  if(dNew>d1*1.3){console.log('FAIL: 次の敵で威力が戻っていない '+dNew.toFixed(1)+' vs '+d1.toFixed(1));process.exit(1);}
  /* ⭐強化の内訳(2026-07-27): 📡射程は🔥昇温速度・⏩連射は🔺最大倍率に置き換えてある */
  const stl=twStats(ti);
  if(stl.indexOf('g')>=0){console.log('FAIL: レーザー塔に📡射程の強化が残っている');process.exit(1);}
  if(stl.indexOf('r')>=0){console.log('FAIL: レーザー塔に⏩連射の強化が残っている');process.exit(1);}
  if(stl.indexOf('h')<0){console.log('FAIL: レーザー塔に🔥昇温速度の強化が無い');process.exit(1);}
  if(stl.indexOf('m')<0){console.log('FAIL: レーザー塔に🔺最大倍率の強化が無い');process.exit(1);}
  if(T.rng!==360){console.log('FAIL: レーザー塔の射程が初期の1.2倍(360)でない '+T.rng);process.exit(1);}
  if(T.heatM!==3){console.log('FAIL: レーザー塔の最大倍率が3でない '+T.heatM);process.exit(1);}
  if(!(twHeatM(T,{us:Object.assign(newUs(),{m:USTAT_MAX})})>=5.9)){console.log('FAIL: 🔺最大倍率Lv5でも6倍に届かない');process.exit(1);}
  /* 🔥昇温速度を上げると、最大倍率まで要る秒数が減る */
  const t0=twHeatT(T,{us:newUs()}),t5=twHeatT(T,{us:Object.assign(newUs(),{h:USTAT_MAX})});
  if(!(t5<t0*.6)){console.log('FAIL: 🔥昇温速度を最大にしても秒数が十分減らない '+t0+'→'+t5);process.exit(1);}
  console.log('レーザー塔: 継続攻撃 毎秒'+d1.toFixed(1)+' → '+t0.toFixed(1)+'秒で'+dMax.toFixed(1)+'('+mul.toFixed(2)+'倍)・次の敵でリセット'
   +' / 射程'+T.rng+' / 強化=['+stl.map(x=>USTAT_L[x]).join(',')+'] / 🔥昇温速度Lv5で'+t0.toFixed(1)+'秒→'+t5.toFixed(1)+'秒 OK');
 }
 /* ④ ⭐タレットの進化(2026-07-27ユーザー指示。研究所の弾薬アップグレードの置き換え)
    ⚠見るのは4つ: ①素のタワー全部に進化先がある ②全部MAXにしないと進化できない
    ③進化しても強化Lvが消えない(工房だけは0に戻る) ④進化後は必ず強くなる。 */
 {
  /* ①素の実戦タワー(工房を除く)は全部 up2 を持つ */
  const lack=[];
  for(let i=0;i<T_PLAY;i++){const T=TOWERS[i];
   if(T.type==='sup'||T.type==='eco')continue;
   if(T_GRD(i)<0)lack.push(T.n);}
  if(lack.length){console.log('FAIL: 進化先の無いタワーがある: '+lack.join('/'));process.exit(1);}
  /* 進化先は解放チェーン(T_PLAY)の外に居ること=建設リストにも研究所にも出さない */
  for(let i=0;i<T_PLAY;i++){const g=T_GRD(i);
   if(g>=0&&g<T_PLAY){console.log('FAIL: 進化先が解放チェーンの中に居る: '+TOWERS[g].n);process.exit(1);}}
  /* ④どの進化先も、素のタワーを全部MAXにした時より強いこと(1秒あたりの威力で見る) */
  const mx={us:Object.assign(newUs(),{d:USTAT_MAX,r:USTAT_MAX,g:USTAT_MAX,c:USTAT_MAX,f:USTAT_MAX,h:USTAT_MAX,b:USTAT_MAX,m:USTAT_MAX})};
  const dps=(T,tw)=>T.rate>0?(T.dmg*twDmgM(tw))/(T.rate*(T.cont?1:twRateM(tw))):0;
  /* ⚠⚠**2026-08-02から進化は2段**(素→中段→最終形態)。**鎖を1段ずつ見ること**=
     素と次の1つだけを見ていると、最終形態が野放しになる。 */
  for(let i=0;i<T_PLAY;i++){const T0=TOWERS[i];
   if(T_GRD(i)<0||T0.type==='eco'||T0.type==='sup')continue;
   let cur=i,step=0;
   while(T_GRD(cur)>=0){const g=T_GRD(cur),T=TOWERS[cur],E=TOWERS[g];step++;
    if(step>4){console.log('FAIL: 進化の鎖が長すぎる(輪になっている?) '+T0.n);process.exit(1);}
    /* ⚠1段あたりの下限は**1.15倍**=2段に割ったぶん1段は小さくなる(素→最終の総量は下で見る)。
       火炎放射塔・レーザー塔は最終形態でも間隔が縮まないので、1段ぶんは威力の伸びだけになる。 */
    if(!(dps(E,mx)>dps(T,mx)*1.15)){
     console.log('FAIL: '+E.n+' が '+T.n+'(全部MAX)より十分強くない '+dps(E,mx).toFixed(1)+' vs '+dps(T,mx).toFixed(1));process.exit(1);}
    /* ⚠射程は**強化Lvを引き継ぐ**ので素の値どうしで比べる(実効値は両方に同じ倍率が乗る) */
    if(E.rng>0&&!(E.rng>T.rng)){
     console.log('FAIL: '+E.n+' の射程が '+T.n+' より広くない '+E.rng+' vs '+T.rng);process.exit(1);}
    /* ⭐研究所の枠は元のタワーと共有する=進化しても積んだLvが無駄にならない */
    if(twKey(E)!==twKey(T)){console.log('FAIL: '+E.n+' の研究所の枠が '+T.n+' と別になっている');process.exit(1);}
    /* 発射音の割り当てが無いと無音になる */
    if(!TW_SFX[E.id]){console.log('FAIL: '+E.n+' に発射音が割り当てられていない');process.exit(1);}
    cur=g;}
   /* ⚠ドローン基地だけ1段(機数がDR_MAXで頭打ち=中段に置ける強化枠が作れない。index.htmlのGRD_MID参照) */
   const want9=(T0.id==='drone')?1:2;
   if(step!==want9){console.log('FAIL: '+T0.n+' の進化が'+want9+'段になっていない('+step+'段)');process.exit(1);}
   /* 素から最終形態までで、射程は1.1倍以上・威力は2.5倍以上 */
   const F=TOWERS[cur];
   if(F.rng>0&&!(F.rng>=T0.rng*1.1)){
    console.log('FAIL: '+F.n+' の射程が素の1.1倍に届かない '+F.rng+' vs '+T0.rng);process.exit(1);}
   /* ⚠**素→最終形態の総量は作り替える前と同じ1.4倍以上**(最終形態の数値は1つも触っていない) */
   if(!(dps(F,mx)>dps(T0,mx)*1.4)){
    console.log('FAIL: '+F.n+' が素より十分強くない x'+(dps(F,mx)/dps(T0,mx)).toFixed(2));process.exit(1);}}
  /* ②③実際に建てて、MAXにするまで進化できず、進化したら強化Lvが残ること */
  /* ⭐2026-07-30: 進化先は🔬研究所で解放してから使える(META.tg)。まず未解放で試す */
  META.tg=[];
  const ti=TOWERS.findIndex(t=>t.id==='rifle');
  me.scrap=9999999;me.towers[si]=null;me.unlocked=Math.max(me.unlocked,ti+1);
  buildTower(me,si,ti);
  const tw=me.towers[si];
  if(canGrade(me,tw)){console.log('FAIL: 強化していないのに進化できてしまう');process.exit(1);}
  for(const st of twStats(ti))for(let k=0;k<USTAT_MAX;k++)upTower(me,si,st);
  /* ⭐研究所で解放していないうちは、全部MAXでも進化できないこと */
  if(canGrade(me,tw)){console.log('FAIL: 研究所で解放していないのに進化できてしまう');process.exit(1);}
  META.tg=TG_ALL.slice();
  if(TG_ALL.length!==TOWERS.filter(T=>T.grd).length||!TG_ALL.length){console.log('FAIL: 進化先の一覧(TG_ALL)がおかしい');process.exit(1);}
  if(!canGrade(me,tw)){console.log('FAIL: 全部MAXにしても進化できない');process.exit(1);}
  /* ⚠**引き継ぎは「外す前の一覧(twStatsRaw)」で見る**=進化すると⏩連射が買えなくなるので、
     twStats どうしで比べると数が合わず、消えていないのに落ちる(2026-07-27) */
  const before=twStatsRaw(ti).map(st=>tw.us[st]);
  const rate0=twRateM(tw);
  if(!gradeTower(me,si)){console.log('FAIL: 進化に失敗した');process.exit(1);}
  if(tw.ti!==T_GRD(ti)){console.log('FAIL: 進化先が違う');process.exit(1);}
  const after=twStatsRaw(ti).map(st=>tw.us[st]);
  if(after.join()!==before.join()){console.log('FAIL: 進化で強化Lvが消えた '+before.join()+'→'+after.join());process.exit(1);}
  /* ⭐**進化後は⏩連射を買えない**(2026-07-27ユーザー指示「攻撃速度が早すぎてうるさすぎる」)。
     ⚠買った段はそのまま効くこと=進化して遅くなったら「進化が罰」になる。 */
  if(twStats(tw.ti).indexOf('r')>=0){console.log('FAIL: 進化後も⏩連射が買えてしまう');process.exit(1);}
  if(twRateM(tw)!==rate0){console.log('FAIL: 進化で連射が変わった '+rate0+'→'+twRateM(tw));process.exit(1);}
  if(canGrade(me,tw)){console.log('FAIL: 進化先からさらに進化できてしまう');process.exit(1);}
  /* ⭐**進化したあとも、もう5段ぶん強化できる**(2026-07-27ユーザー指示)。
     ⚠引き継いだLvが上限だと、進化した瞬間に買うものが無くなる。 */
  if(usMax(tw.ti)!==USTAT_MAX*2){console.log('FAIL: 進化先の強化上限が2倍になっていない '+usMax(tw.ti));process.exit(1);}
  {const d0=twDmgM(tw),r0=twRateM(tw),g0=twRngM(tw);
   me.scrap=99999999;
   for(const st of twStats(tw.ti))for(let k=0;k<USTAT_MAX;k++)
    if(!upTower(me,si,st)){console.log('FAIL: 進化後に '+st+' を強化できない(Lv'+tw.us[st]+')');process.exit(1);}
   if(twStats(tw.ti).some(st=>tw.us[st]!==USTAT_MAX*2)){console.log('FAIL: 進化後の強化が上限まで届かない');process.exit(1);}
   if(upTower(me,si,twStats(tw.ti)[0])){console.log('FAIL: 上限を超えて強化できてしまう');process.exit(1);}
   /* 6段目から先は効き目が半分(⏩連射が10段で10倍撃つ壊れ方を防ぐ) */
   if(!(twDmgM(tw)>d0&&twRngM(tw)>g0)){console.log('FAIL: 進化後の強化が効いていない');process.exit(1);}
   /* ⭐**連射は進化後フルでも素MAX(0.55倍)で頭打ち**=これが「うるさすぎる」の直し。
      ⚠旧は 1-.09*usEff(10)=0.325倍まで縮んでいた。 */
   if(twRateM(tw)!==r0){console.log('FAIL: 進化後に連射が伸びている '+r0+'→'+twRateM(tw));process.exit(1);}
   if(Math.abs(twRateM(tw)-.55)>1e-9){console.log('FAIL: 連射が素MAXの0.55倍になっていない '+twRateM(tw));process.exit(1);}
   /* ⭐**⏩連射を外したぶんは⚔攻撃で埋め合わせる**=フル強化のDPSが作り替える前と揃うこと。
      旧 (1+.18*7.5)/(1-.09*7.5)=7.23倍。⚠±8%まで許す(段の刻みが違うのでぴったりにはならない) */
   {const dps=twDmgM(tw)/twRateM(tw);
    if(Math.abs(dps/7.231-1)>.08){console.log('FAIL: 進化フルのDPSが作り替える前とずれている x'+dps.toFixed(2)+' (旧7.23)');process.exit(1);}
    console.log('進化の強化: 連射は素MAX(x'+(1/twRateM(tw)).toFixed(2)+')で頭打ち / フル強化のDPS x'+dps.toFixed(2)+'(旧7.23) OK');}}
  me.towers[si]=null;
  /* ⭐**進化後の「買えるのに何も起きない強化」を全塔で潰す**(2026-07-27ユーザー指摘
       「ドローンとかも進化すると攻撃速度ないけど大丈夫?」を調べて見つけた)。
     ⚠❄冷却回数は twFrzN が5段までしか数えないので、上限を止めないと6段目から死に枠になる。
     ⚠**買える枠が1つしかない塔も作らない**=進化しても伸ばす楽しみが無くなる。 */
  {const bad=[],thin=[];
   for(let i=0;i<TOWERS.length;i++){const T=TOWERS[i];
    if(!T.grd||T.type==='sup')continue;
    const st=twStats(i),live=st.filter(k=>usCap(i,k)>usMinSt(i,k));
    for(const k of st)if(usCap(i,k)<usMinSt(i,k))bad.push(T.n+':'+k);
    if(live.length<2)thin.push(T.n+'('+live.length+'枠)');}
   if(bad.length){console.log('FAIL: 進化後の上限が引き継ぎ段より低い '+bad.join(','));process.exit(1);}
   if(thin.length){console.log('FAIL: 進化後に伸ばせる枠が1つ以下の塔がある '+thin.join(','));process.exit(1);}
   /* ⚠冷却塔は⏩連射を外さない例外(威力枠が無く、外すとただ弱くなるだけのため) */
   {const ci=TOWERS.findIndex(t=>t.id==='cryo2');
    if(ci<0||twStats(ci).indexOf('r')<0){console.log('FAIL: 極低温塔から⏩連射が外れている(威力枠が無いので外してはいけない)');process.exit(1);}
    if(usCap(ci,'f')!==USTAT_MAX){console.log('FAIL: ❄冷却回数が5段で止まっていない');process.exit(1);}}
   console.log('進化後の強化枠: 全'+TOWERS.filter(t=>t.grd&&t.type!==\'sup\').length+'種すべて2枠以上が実際に伸びる / 死に枠なし OK');}
  /* 工房だけは今までどおり0に戻ること(次の段の素が前の段のMAXより上なので下がらない) */
  {const eti=TOWERS.findIndex(t=>t.id==='scrap'),esi=ECO_BASE;
   me.scrap=9999999;me.towers[esi]=null;me.unlocked=Math.max(me.unlocked,eti+1);
   buildTower(me,esi,eti);const et=me.towers[esi];
   for(const st of twStats(eti))for(let k=0;k<USTAT_MAX;k++)upTower(me,esi,st);
   gradeTower(me,esi);
   if(twStats(et.ti).some(st=>(et.us[st]||0)!==0)){console.log('FAIL: 工房の建て替えで強化Lvが0に戻っていない');process.exit(1);}
   if(usMax(et.ti)!==USTAT_MAX){console.log('FAIL: 工房の強化上限まで2倍になっている(工房は3段あるので伸ばさない)');process.exit(1);}
   me.towers[esi]=null;}
  console.log('タレットの進化: 素の'+(T_PLAY-1)+'種すべてに専用の進化先 / 全部MAXでだけ進化 / 強化Lvは引き継ぐ(工房だけ0に戻る) / 進化後にもう'+USTAT_MAX+'段(効き目は半分) / どれも素のMAXより強い OK');
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
  if(TOWERS[tw.ti].id!=='scrap2'){console.log('FAIL: 上級廃品工房になっていない');process.exit(1);}
  if(twStats(tw.ti).some(st=>tw.us[st]!==0)){console.log('FAIL: 建て替えても強化Lvが0に戻っていない');process.exit(1);}
  const after=rateOf(tw);
  if(after<before){console.log('FAIL: 建て替えると産出が下がる '+before.toFixed(2)+'→'+after.toFixed(2)+'/秒');process.exit(1);}
  /* ⭐3段目(廃品プラント)まで通しで確かめる。段を足したらここも自然に伸びる */
  for(const st of twStats(tw.ti))tw.us[st]=USTAT_MAX;
  const line=[TOWERS[ECO_TI].n+'MAX'+before.toFixed(1),TOWERS[tw.ti].n+'MAX'+rateOf(tw).toFixed(1)];
  { /* 2段目(上級)の採算 */
   let cc=T_GCOST(ECO_TI);
   for(const st of twStats(tw.ti))for(let l=0;l<USTAT_MAX;l++)cc+=Math.round(TOWERS[tw.ti].cost*.45*Math.pow(1.75,l));
   const pp=Math.round(cc/(rateOf(tw)-before));
   if(pp<150||pp>600){console.log('FAIL: '+TOWERS[tw.ti].n+'の採算が外れている(元を取るのに'+pp+'秒)');process.exit(1);}
  }
  let guard=0;
  while(canGrade(me,tw)&&guard++<8){
   const prevMax=rateOf(tw),nm=TOWERS[T_GRD(tw.ti)].n,gcst=T_GCOST(tw.ti);
   me.scrap=999999;
   if(!gradeTower(me,ECO_BASE)){console.log('FAIL: '+nm+'への建て替えが通らない');process.exit(1);}
   if(twStats(tw.ti).some(st=>tw.us[st]!==0)){console.log('FAIL: '+nm+'で強化Lvが0に戻っていない');process.exit(1);}
   const raw=rateOf(tw);
   if(raw<prevMax){console.log('FAIL: '+nm+'にすると産出が下がる '+prevMax.toFixed(2)+'→'+raw.toFixed(2)+'/秒');process.exit(1);}
   for(const st of twStats(tw.ti))tw.us[st]=USTAT_MAX;
   const mx=rateOf(tw);
   /* この段も「元を取るのに1試合の半分」に収まっているか */
   let cc=gcst;for(const st of twStats(tw.ti))for(let l=0;l<USTAT_MAX;l++)cc+=Math.round(TOWERS[tw.ti].cost*.45*Math.pow(1.75,l));
   const pp=Math.round(cc/(mx-prevMax));
   if(pp<150||pp>600){console.log('FAIL: '+nm+'の採算が外れている(元を取るのに'+pp+'秒)');process.exit(1);}
   line.push(nm+'MAX'+mx.toFixed(1));
  }
  if(line.length<3){console.log('FAIL: 廃品工房の段が2つしかない(3段目が作られていない)');process.exit(1);}
  if(canGrade(me,tw)){console.log('FAIL: 最終段をさらに建て替えられる');process.exit(1);}
  console.log('廃品工房の段('+line.length+'段・建て替えても産出は下がらない・どの段も元を取るのに150〜600秒): ');
  console.log('  '+line.join(' → ')+' 毎秒 OK');
 }
 /* ④ 上級廃品工房は建設リストにも解放チェーンにも出さない */
 for(const T of TOWERS)if(T.grd&&TOWERS.indexOf(T)<T_PLAY){console.log('FAIL: '+T.n+' が解放チェーン(T_PLAY)に入っている');process.exit(1);}
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
 /* ⚠末尾の1は🚌ボーナス面(1波だけ)。⚠**並びの真ん中に差し込まない**=META.sc の添字がずれる */
 if(ws!=='5/7/10/15/20/20/1'){console.log('FAIL: 難易度ごとの最終ウェーブが違う '+ws);process.exit(1);}
 /* 港は廃線ハイウェイより重い */
 if(!((STAGES[1].hpM||1)>(STAGES[0].hpM||1))){console.log('FAIL: 港がステージ1より重くない');process.exit(1);}
 /* ⭐**クリアした難易度がそのまま記録されるか**を awardMeta() を通して見る(2026-07-26に追加)。
    ⚠ここを scArr(0)[d]=1 と直に書く検査だけにしていたため、
      G.pveDiff||2(新兵=0 が古参=2 として記録される)というバグを長く見逃していた。
      症状は「新兵をクリアしても兵長が開かない・鬼軍曹が勝手に開く」。 */
 /* ⚠⚠**解放の鎖は添字の順ではなく D_ORD の並び**(2026-08-02に🚌ボーナス面を挟んだ)。
    ⚠この検査ファイルは丸ごとテンプレート文字列なので、コメントにバッククォートを書かないこと。
    D5 の末尾(6)に置いてあるので、d+1 で見ると「ナイトメアの次がボーナス」という別物を検査してしまう。 */
 for(let oi=0;oi<D_ORD.length;oi++){const d=D_ORD[oi];
  META.sc=[D5.map(()=>0),D5.map(()=>0)];META.sclr=[];META.clr=[0,0,0,0,0,0];META.pts=0;META.bcl=[];
  META.stg=0;setDiff=d;startSolo();
  G.winner=0;G.over=true;G.wave=D5[d].w;
  awardMeta();
  const got=scArr(0).map((v,i)=>v?i:-1).filter(i=>i>=0);
  if(got.length!==1||got[0]!==d){
   console.log('FAIL: '+D5[d].n+'(難易度'+d+')をクリアしたのに、記録されたのは難易度 ['+got.join(',')+']');process.exit(1);}
  const nx=D_ORD[oi+1],nx2=D_ORD[oi+2];
  if(nx!=null&&!diffOK(0,nx)){
   console.log('FAIL: '+D5[d].n+'をクリアしても次の'+D5[nx].n+'が開かない');process.exit(1);}
  if(nx2!=null&&diffOK(0,nx2)){
   console.log('FAIL: '+D5[d].n+'をクリアしただけで'+D5[nx2].n+'まで開いている(飛び越し)');process.exit(1);}
  backTitle();
 }
 console.log('進行: 難易度は順に解放(最終W='+ws+')/クリアした難易度がそのまま記録される/港はナイトメアクリアで解放/港の重さx'+STAGES[1].hpM+' OK');
 META.sc=[D5.map(()=>1),D5.map(()=>1)];META.bcl=[];
}
/* ---- セーブの1回だけのリセットが、消してはいけないものを消していないか(2026-07-26) ---- */
function checkMetaReset(){
 META.gem=7;META.hero={hNox:1};META.hmat=5;META.zdex={walk:1};META.hlv={hNox:2};META.hxp={hNox:30};
 META.rpg={gold:99};META.hsel='hNox';META.tr0=1;META.tmTip=1;
 META.pts=500;META.nt=3;META.nu=4;META.uv=['x'];META.py0=3;
 META.tw={rifle:2};META.un={bat:3};META.st0=4;/* タワー/兵科の個別強化と砲撃威力 */
 META.sc=[[1,1,1,1,1,1],[0,0,0,0,0,0]];META.nmOK=1;
 /* ⭐🛠DEVの「研究をリセット」は**研究所ぶんだけ**を戻す=難易度とステージの解放は残す */
 metaResetLab();
 if(META.pts!==0||META.nt!==0||META.st0!==0){console.log('FAIL: 研究リセットで研究所ぶんが消えていない');process.exit(1);}
 if(!(META.sc&&META.sc[0]&&META.sc[0][0])||META.nmOK!==1){console.log('FAIL: 研究リセットで難易度の解放まで消えている');process.exit(1);}
 META.pts=500;META.nt=3;META.nu=4;META.uv=['x'];META.py0=3;
 META.tw={rifle:2};META.un={bat:3};META.st0=4;
 metaReset();
 /* ⭐**2026-07-27から「全部消す」**(ユーザー指示「通常プレイ用のやつは初期化して最初からに」)。
    ⚠それまでは💎英雄🔧図鑑⚔冒険を残す作りで、この検査もそれを守っていた。**方針が変わった**。
    ⚠新しいセーブ項目を足したら metaResetAll() にも書くこと=ここで消え残りを捕まえる。 */
 const gone2=[['💎魔石',(META.gem||0)===0],['引いた英雄',Object.keys(META.hero||{}).length===0],
  ['🔧鍛錬素材',(META.hmat||0)===0],['📖図鑑',Object.keys(META.zdex||{}).length===0],
  ['鍛錬Lv',Object.keys(META.hlv||{}).length===0],['鍛錬経験',Object.keys(META.hxp||{}).length===0],
  ['⚔冒険',Object.keys(META.rpg||{}).length===0],['連れて行く英雄',!META.hsel],
  ['鍛錬所の解放',!META.tr0],['選んでいたステージ',!META.stg],
  /* ⚠🎒編成の案内は「1回だけ出す」印=消し忘れると初期化した人に案内が出ない(2026-08-02) */
  ['🎒編成の案内の印',!META.tmTip]];
 for(const [n,ok] of gone2)if(!ok){console.log('FAIL: 初期化しても '+n+' が残っている');process.exit(1);}
 const gone=[['研究pt',META.pts===0],['新種タワー',META.nt===0],['新種兵科',META.nu===0],
  ['派生',META.uv.length===0],['経済強化',META.py0===0],
  ['タワー個別強化',Object.keys(META.tw).length===0],['兵科個別強化',Object.keys(META.un).length===0],
  ['砲撃の威力',(META.st0||0)===0],['砲撃の種類',META.st.length===1&&META.st[0]==='air'],
  ['難易度の記録',!scArr(0)[0]&&!scArr(0)[5]],['ナイトメア解放',!META.nmOK]];
 for(const [n,ok] of gone)if(!ok){console.log('FAIL: リセットしたのに '+n+' が残っている');process.exit(1);}
 console.log('セーブの初期化: 難易度と研究所('+gone.length+'項目)+💎英雄🔧図鑑⚔冒険('+gone2.length+'項目)を全部消す OK');
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
 /* ⭐ヴァルキリー=遠距離斬撃(2026-07-31ユーザー指示)。
    飛ぶ光の刃(wave)が出て、着弾で斬撃(slash)になること。⚠爆発(boom)には**しない** */
 {const k=run("valk",true,80);
  need(k,"wave","ヴァルキリーの飛ぶ斬撃が出ていない");
  need(k,"slash","ヴァルキリーの着弾の斬撃が出ていない");
  if(k.toss){console.log("FAIL: ヴァルキリーがまだ物を投げている");process.exit(1);}
  if(k.boom){console.log("FAIL: ヴァルキリーの着弾が爆発のままになっている");process.exit(1);}}
 /* 撃破: 敵が倒れる(死体が残る) */
 {const k=run('grn',false,40);
  need(k,'corpse','倒した敵の死体が出ていない');}
 /* ⭐火炎放射塔・レーザー塔は**継続攻撃**(2026-07-27)。
    ⚠fx を毎フレーム積むのをやめて塔の描画で直に引くようにしたので、**絵の検査は fx ではなく
      「狙っている先(tw.ct)が入っているか」で見る**。ここを fx で見ていると、直した瞬間に落ちる。 */
 for(const cid of ['flame','laser']){
  me.units.length=0;me.zombies.length=0;me.fx.length=0;me.scrap=99999;
  const si=AI_ORDER[0],ti=TOWERS.findIndex(T=>T.id===cid);
  me.towers[si]=null;const pu=me.unlocked;me.unlocked=ti+1;buildTower(me,si,ti);me.unlocked=pu;
  const base=projPath(SLOTS[si][0],SLOTS[si][1]);
  const z=mkZ(zSpec(zi,1,20),Math.max(20,base-40));z.hp=z.mhp=99999;me.zombies.push(z);
  const hp0=z.hp;let nfx=0;
  for(let k2=0;k2<40;k2++){campStep(me,.05,G.wave);nfx=Math.max(nfx,me.fx.length);}
  const tw=me.towers[si];
  if(!tw.ct){console.log('FAIL: '+cid+' が狙っている先(tw.ct)を持っていない=継続攻撃の絵が出ない');process.exit(1);}
  if(!(hp0-z.hp>0)){console.log('FAIL: '+cid+' の継続攻撃がダメージを与えていない');process.exit(1);}
  /* ⚠**溜まる演出を作っていないこと**=何台も置くと重い問題の対策そのもの */
  if(nfx>12){console.log('FAIL: '+cid+' が毎フレーム演出を積んでいる(最大'+nfx+'件)');process.exit(1);}
  me.towers[si]=null;}
 console.log('継続攻撃: 火炎放射塔/レーザー塔 は狙い先を持ち、演出を積まない OK');
 /* 砲撃5種の着弾: 種類ごとに違う絵が出る */
 {me.units.length=0;me.zombies.length=0;
  const z=mkZ(zSpec(zi,1,10),PLEN*.5);z.hp=z.mhp=99999;me.zombies.push(z);
  campStep(me,.001,G.wave);/* ⚠画面座標(px/py)はcampStepでしか入らない */
  const want={air:['shock','dust','pool'],frost:['ice'],napalm:['pool'],carpet:['dust'],mgun:['dust']};
  for(const stk of Object.keys(want)){
   me.fx.length=0;me.dly=[];
   airstrikeHit(me,z.px,z.py,10,stk,true);
   const kinds={};for(const e of me.fx)kinds[e.k]=1;
   for(const w of want[stk])need(kinds,w,'砲撃'+stk+'の着弾に'+w+'が出ていない');
   /* ⭐2026-07-27に足した「砲撃の着弾は思いきり盛る」= 白フラッシュ+強い揺れ+短いスロー */
   if(!(me.flash>0)){console.log('FAIL: 砲撃'+stk+'の着弾で白フラッシュ(flash)が焚かれていない');process.exit(1);}
   if(!(me.shake>=.3)){console.log('FAIL: 砲撃'+stk+'の着弾の揺れが弱い('+me.shake+')');process.exit(1);}
   /* ⚠掃射(mgun)だけは3.6秒撃ち続けるのでスローを掛けない(撃っている間ずっと遅くなるため) */
   if(stk!=='mgun'&&!(G.hitStopT>0)){console.log('FAIL: 砲撃'+stk+'の着弾でスローが掛かっていない');process.exit(1);}
   me.flash=0;me.shake=0;G.hitStopT=0;}
  /* ⭐**爆風で死体が吹き飛ぶ**(kbZ→killZ→死体fxのkb)。⚠dmgZより先に呼ばないと死体が湧いたあとになる */
  {me.zombies.length=0;
   const z2=mkZ(zSpec(0,1,10),PLEN*.5);z2.hp=z2.mhp=200;me.zombies.push(z2);
   campStep(me,.001,G.wave);
   me.fx.length=0;/* ⚠**campStepの後に消す**=盤面の塔が先に倒すと、吹き飛びの無い死体が混ざる */
   airstrikeHit(me,z2.px-40,z2.py,10,'air',true);
   const cp=me.fx.find(e=>e.k==='corpse');
   if(!cp){console.log('FAIL: 砲撃で倒しても死体が出ない');process.exit(1);}
   if(!(cp.kb>0)){console.log('FAIL: 爆風で倒した死体に吹き飛び(kb)が乗っていない');process.exit(1);}
   if(!(cp.kx>0)){console.log('FAIL: 死体の吹き飛ぶ向きが爆心の外向きでない(kx='+cp.kx+')');process.exit(1);}
   me.flash=0;me.shake=0;G.hitStopT=0;}}
 console.log('演出2: 投擲の軌道・炎の帯・火の海・氷の破片・土煙・倒れる死体・砲撃5種の着弾 すべて出ている OK');
 console.log('🎯砲撃の手応え: 白フラッシュ+揺れ+スローが5種すべてに乗る / 爆風で死体が外へ吹き飛ぶ OK');
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
 /* ⭐押すと**まず溜める**(2026-07-27)。⚠押した瞬間に結果へ向かうのが安っぽさの元だった */
 gcTap(0,0);
 if(GC.ph!=='chg'){console.log('FAIL: 押しても溜めに入らない '+GC.ph);process.exit(1);}
 /* ⚠溜めは飛ばせないこと(飛ばせると「ため」が無くなって元に戻る) */
 gcTap(0,0);
 if(GC.ph!=='chg'){console.log('FAIL: 溜めを飛ばせてしまう '+GC.ph);process.exit(1);}
 for(let k=0;k<40&&GC.ph==='chg';k++)gcStep(.05);
 if(GC.ph!=='fire'){console.log('FAIL: 溜め切っても撃たない '+GC.ph);process.exit(1);}
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
 let sawRifleLow=0,twN=0,lobN=0,nightN=[0,0],dayN=[0,0],hiN=[0,0,0];
 for(let k=0;k<1200;k++){
  const rk=k%6;
  const one=[rk===0?{dud:GDUD[0],txt:''}:{hero:HEROES.find(h=>h.rk===rk),txt:''}];
  if(!one[0].dud&&!one[0].hero)continue;
  gcStart(one);const r=gcRank(one[0]),base=r>=4?2:r>=2?1:0;
  /* ⭐2026-07-30に**どんでん返し(twist)**を足した=★4以上の時だけ、わざと一番しょぼい見せ方をする。
     ⚠twist の時は上の「★5ならレーザー」が成り立たないので、先に切り分ける。 */
  if(GC.twist){
   if(r<4){console.log('FAIL: ★4未満でどんでん返しが起きている(レア度'+r+')');process.exit(1);}
   if(GC.tw!==0||GC.zk!==0||GC.fc!==0||GC.night!==false||GC.lob){
    console.log('FAIL: どんでん返しなのに見た目がしょぼくない');process.exit(1);}
   twN++;hiN[1]++;gcEnd();continue;}
  /* ⭐2026-07-30: ロブスターは★4以上に広げ、3通り(ロブ/どんでん返し/通常)を**均等**にした */
  if(GC.lob&&r<4){console.log('FAIL: ★4未満なのに黄金のロブスターが出た(レア度'+r+')');process.exit(1);}
  if(GC.lob)lobN++;
  if(r>=4)hiN[GC.lob?0:2]++;
  if(GC.tw>base){console.log('FAIL: 予告が上振れしている(レア度'+r+' 予告'+GC.tw+' 上限'+base+')');process.exit(1);}
  if(GC.tw===2&&r<4){console.log('FAIL: レーザーが出たのに★4未満(レア度'+r+')');process.exit(1);}
  if(r===5&&GC.tw!==2){console.log('FAIL: ★5なのにレーザーで見せていない');process.exit(1);}
  if(GC.zk!==GC.tw){console.log('FAIL: ゾンビの種類がタレットの段と揃っていない');process.exit(1);}
  /* ⭐「撃て!」の文字色も**下振れだけ**(虹=fc2 が出たら★4以上が確定) */
  if(GC.fc>base){console.log('FAIL: 文字色が上振れしている(レア度'+r+' 色'+GC.fc+')');process.exit(1);}
  if(GC.fc===2&&r<4){console.log('FAIL: 虹の文字なのに★4未満(レア度'+r+')');process.exit(1);}
  if(typeof GC.night!=='boolean'){console.log('FAIL: 背景の朝夜が決まっていない');process.exit(1);}
  if(GC.night)nightN[r>=3?1:0]++;else dayN[r>=3?1:0]++;
  if(r<=1){if(GC.tw!==0){console.log('FAIL: レアでないのにライフル以外が出ている(レア度'+r+')');process.exit(1);}sawRifleLow=1;}
  gcEnd();
 }
 if(!sawRifleLow){console.log('FAIL: レアでない時の見せ方を確かめられていない');process.exit(1);}
 if(!twN){console.log('FAIL: どんでん返しが一度も起きなかった');process.exit(1);}
 if(!lobN){console.log('FAIL: ✨黄金のロブスターが一度も出なかった');process.exit(1);}
 /* ⭐★4以上の3通りが**ピラミッド**(✨黄金20% / どんでん返し35% / 通常45%)であること
    (2026-07-30ユーザー指示「ピラミッドにしよう」)。⚠珍しい絵ほど出にくいこと=順番も見る。
    ⚠別々に乱数を引くと確率が掛け算になって狙った比にならないので、1回の乱数を割っている。 */
 {const tot=hiN[0]+hiN[1]+hiN[2],want=[GC_P_LOB,GC_P_TW,1-GC_P_LOB-GC_P_TW];
  for(let q=0;q<3;q++){const pc=hiN[q]/Math.max(1,tot);
   if(Math.abs(pc-want[q])>.07){console.log('FAIL: ★4以上の演出の割合がずれている '+hiN.join('/')+' (計'+tot+' 想定'+want.map(v=>Math.round(v*100)).join('/')+')');process.exit(1);}}
  if(!(hiN[0]<hiN[1]&&hiN[1]<hiN[2])){console.log('FAIL: 珍しい演出ほど出にくくなっていない '+hiN.join('/'));process.exit(1);}}
 /* ⭐**夜の方が期待度が高い**=レアな時ほど夜が出やすいこと(逆になっていたら演出が嘘になる) */
 {const hi=nightN[1]/Math.max(1,nightN[1]+dayN[1]),lo=nightN[0]/Math.max(1,nightN[0]+dayN[0]);
  if(!(hi>lo+.2)){console.log('FAIL: 夜が期待度になっていない(レア時'+(hi*100|0)+'% / それ以外'+(lo*100|0)+'%)');process.exit(1);}}
 console.log('💎召集の予告: 下振れだけ / 虹の文字とレーザーは★4以上が確定 / '
  +'夜'+(nightN[1]/Math.max(1,nightN[1]+dayN[1])*100|0)+'% vs '+(nightN[0]/Math.max(1,nightN[0]+dayN[0])*100|0)+'% / '
  +'★4以上の内訳 ✨黄金'+hiN[0]+'/どんでん返し'+hiN[1]+'/通常'+hiN[2]+'(ピラミッド) OK');
 /* ⭐10連でも撃つ場面は1回だけ=示唆するのは「その回の一番いい結果」 */
 {const many=[{dud:GDUD[0],txt:''},{hero:HEROES.find(h=>h.rk===4),txt:''},{dud:GDUD[1],txt:''}];
  gcStart(many);
  if(GC.best!==4){console.log('FAIL: 10連の示唆が一番いい結果になっていない '+GC.best);process.exit(1);}
  /* ⚠どんでん返し(twist)の時はわざと段0で見せるので、その時は見ない(2026-07-30) */
  if(!GC.twist&&(GC.tw>2||GC.tw<1)){console.log('FAIL: ★4の予告の段がおかしい '+GC.tw);process.exit(1);}
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
/* ---- ゾンビ36種が1種ずつ違う絵になっているか(2026-07-26 第82弾) ----
   ⭐それまでステージ1の13種のうち10種が**同じ胴を共有**していて、実機(22px)では色しか違わなかった。
   ⚠検査の期待値を実装と同じ式で作らないこと=drawZombie が実際に積んだ**図形の並びを記録して**数える。
   ⚠色は見ない。色だけ違って形が同じ、を通してしまうため。
   ⚠数値も見ない。ゾンビごとに Z.sc と歩幅が違うので、数値を入れると
     「胴が丸ごと同じでも別物に見える」=必ず通る検査になってしまう。 */
/* ⭐⭐**🚌ゾンビバス(バスくん)**=タイトル専用の巨大ゆるキャラ(2026-08-01)。
   見るのは4つ:
   ①**ZOMBIES に混ざっていないこと**(図鑑・波・冒険に出したら設計違反。zi=-1 で持っている)
   ②**8発で倒れて 💎100 が入ること**(途中の発では入らない)
   ③**叩くたびに窓のゾンビが1匹こぼれること**(手応え。残りHPで窓の手も減る)
   ④**行進canvasが高くなること**(素の120pxのままだと上下が切れる=屍熊で実際に切れた)
   ⚠絵そのものは見られない(ヘッドレス)。**見た目は node test_shot.js ... "title+bus" で撮る**。 */
/* ⭐英雄18人の攻撃が1人ずつ固有か(2026-08-01ユーザー指示「全ヒーロー完璧に固有に」)。
 ⚠見るのは ①全員が H_FX に居るか ②中身が使い回されていないか の2つ。
 ⚠絵そのものは見られない=撮るのは node test_shot.js ... "arena=<id>:walk+arn=13"。 */
function checkHeroFx(){
 const miss=HEROES.filter(h=>!H_FX[h.id]).map(h=>h.n);
 if(miss.length){console.log("FAIL: 攻撃が型の使い回しのままの英雄: "+miss.join("/"));process.exit(1);}
 const fp={};
 for(const h of HEROES){const k=String(H_FX[h.id]).replace(/s+/g,"");
  (fp[k]||(fp[k]=[])).push(h.n);}
 const dup=Object.keys(fp).filter(k=>fp[k].length>1).map(k=>fp[k].join("="));
 if(dup.length){console.log("FAIL: 攻撃の中身が同じ英雄: "+dup.join(" / "));process.exit(1);}
 /* ⚠⚠**投擲型(toss)の英雄は H_FX で投げてはいけない**(2026-08-02にユーザー実機で発覚
    「2回爆弾投げてる?」)=飛ばすのは呼び出し側の tossFly で、H_FX は**着弾の瞬間**に呼ばれる。
    両方で投げると爆弾が2個飛び、爆発だけがさらに遅れて出る。 */
 {const bad=HEROES.filter(h=>((U_MOT[h.id]||[])[0]==='toss')&&/'toss'/.test(String(H_FX[h.id]))).map(h=>h.n);
  if(bad.length){console.log("FAIL: 着弾時に呼ばれる H_FX がもう一度投げている: "+bad.join("/"));process.exit(1);}}
 /* ⭐**実際に1発撃たせて見る**=静的検査だけだと、呼び出し側で2重に飛ばす作りに戻っても気づけない。
    見るのは ①飛んだ物が1個だけ ②爆発の絵と当たり判定が同じコマで起きること。 */
 {META.stg=0;setDiff=2;META.hero={};META.hero.hBomb=1;META.hsel='hBomb';
  startSolo();frames(20,.016);
  const me=G.players[0];
  if(!heroDeploy(me)){console.log('FAIL: 爆破屋が出撃できない');process.exit(1);}
  const hu=me.units.filter(u=>u.hro)[0];
  if(!hu){console.log('FAIL: 爆破屋の実体が居ない');process.exit(1);}
  me.zombies.length=0;me.fx.length=0;
  const z9=mkZ(zSpec(0,1,20),Math.max(20,hu.d-120));z9.hp=z9.mhp=1e9;z9.sp=0;me.zombies.push(z9);
  let toss=0,boomK=-1,dmgK=-1;
  const hp1=z9.hp;
  for(let k=0;k<90;k++){
   campStep(me,.02,3);
   for(const e of me.fx){if(e.chk)continue;e.chk=1;
    if(e.k==='toss')toss++;
    else if(e.k==='boomL'&&boomK<0)boomK=k;}
   if(dmgK<0&&z9.hp<hp1)dmgK=k;}
  if(toss!==1){console.log('FAIL: 爆破屋が1発で'+toss+'個の爆弾を投げている(1個のはず)');process.exit(1);}
  if(boomK<0||dmgK<0){console.log('FAIL: 爆破屋の攻撃が出ていない(爆発'+boomK+'/命中'+dmgK+')');process.exit(1);}
  if(Math.abs(boomK-dmgK)>1){console.log('FAIL: 爆発の絵と着弾がずれている(爆発'+boomK+'コマ目/命中'+dmgK+'コマ目)');process.exit(1);}
  backTitle();META.hero={};META.hsel='';}
 console.log("英雄の攻撃: "+HEROES.length+"人すべてが専用の演出 / 投擲型は投げ直さない OK");
}
function checkBus(){
 if(ZOMBIES.some(z=>z.id==='bus'||z.id==='zbus')){
  console.log('FAIL: 🚌ゾンビバスが ZOMBIES に入っている(タイトル専用のはず)');process.exit(1);}
 /* ⚠💎は2026-08-02にユーザー指示で 100→250(ロブスターは30→50)。確率と発数は据え置き */
 if(BUS_GEM!==250||BUS_HP!==8||Math.abs(BUS_RATE-.00001)>1e-12){
  console.log('FAIL: 🚌ゾンビバスの枠(0.001%/💎250/8発)が変わっている');process.exit(1);}
 if(LB_GEM!==50||LB_HP!==5||Math.abs(LB_RATE-.0005)>1e-12){
  console.log('FAIL: ✨黄金のロブスターの枠(0.05%/💎50/5発)が変わっている');process.exit(1);}
 /* ⭐**バスはロブスターより明らかに旨い**(珍しさの順=虹<ロブ<バス) */
 if(!(BUS_GEM>LB_GEM)){console.log('FAIL: 🚌バスの💎が✨ロブスター以下になっている');process.exit(1);}
 const savedScr=SCR,savedPar=PAR.slice(),savedGem=META.gem||0,savedDz=PARDZ.length;
 SCR='title';PAR.length=0;PARDZ.length=0;
 const bus={zi:-1,x:400,sp:0,ph:1,ht:0,hp:BUS_HP,kb:0,fl:0,bus:1};PAR.push(bus);
 try{paradeStep(2.4);}catch(e){
  console.log('FAIL: 🚌ゾンビバスの描画で例外: '+e.message);process.exit(1);}
 /* ④ バスが居る間だけ canvas が高い */
 const tallH=pcv.height;
 PAR.length=0;PAR.push({zi:0,x:400,sp:0,ph:1,ht:0,hp:1,kb:0,fl:0});
 try{paradeStep(2.4);}catch(e){console.log('FAIL: 行進の描画で例外: '+e.message);process.exit(1);}
 if(!(tallH>pcv.height)){
  console.log('FAIL: 🚌バスが居ても行進canvasが高くならない(大きい個体は上下が切れる)');process.exit(1);}
 /* ②③ 8発で倒れる。途中の発では💎が入らない */
 PAR.length=0;PAR.push(bus);
 for(let k=0;k<BUS_HP-1;k++){
  if(!paradeHit(400,340)){console.log('FAIL: 🚌バスに当たり判定が無い('+(k+1)+'発目)');process.exit(1);}
  if((META.gem||0)!==savedGem){console.log('FAIL: 🚌バスを倒し切る前に💎が入った');process.exit(1);}}
 if(bus.hp!==1){console.log('FAIL: 🚌バスの残りHPが合わない '+bus.hp);process.exit(1);}
 if(PARDZ.length<BUS_HP-1){
  console.log('FAIL: 叩いても窓のゾンビがこぼれ落ちない '+PARDZ.length);process.exit(1);}
 paradeHit(400,340);
 if((META.gem||0)!==savedGem+BUS_GEM){
  console.log('FAIL: 🚌バスを倒しても💎'+BUS_GEM+'が入らない');process.exit(1);}
 if(!(bus.ht>0)){console.log('FAIL: 🚌バスが倒れない');process.exit(1);}
 /* 倒れている最中の絵と、こぼれ落ちたゾンビの絵も一度通す(ここでしか通らない枝) */
 try{for(let k=0;k<6;k++)paradeStep(2.4+k*.2);}catch(e){
  console.log('FAIL: 🚌バスが倒れる所/落ちたゾンビの描画で例外: '+e.message);process.exit(1);}
 META.gem=savedGem;SCR=savedScr;PAR.length=0;savedPar.forEach(p=>PAR.push(p));PARDZ.length=savedDz;
 console.log('🚌ゾンビバス: 図鑑に混ざらない / '+BUS_HP+'発で💎'+BUS_GEM
  +' / 叩くたびに窓のゾンビが落ちる / 居る間だけ行進canvasが高くなる OK');
}
function checkZLook(){
 /* (1) 静的: 全ゾンビが drawZombie の中に自分の枝を持っているか */
 const miss=ZOMBIES.filter(Z=>js.indexOf("Z.id==='"+Z.id+"'")<0).map(Z=>Z.n);
 if(miss.length){console.log('FAIL: 専用の絵が無いゾンビ(共通の胴に落ちる): '+miss.join('/'));process.exit(1);}
 /* (2) 実走: 図形を積む命令の並びを記録して、同じ並びの組が無いか見る */
 const GEO=['moveTo','lineTo','arc','arcTo','ellipse','rect','fillRect','strokeRect',
  'quadraticCurveTo','bezierCurveTo','closePath','fill','stroke','clip'];
 const fp={};
 for(let zi=0;zi<ZOMBIES.length;zi++){
  const rec=[];
  const rc=new Proxy({},{get:(t,k)=>{
   if(k==='canvas')return {};
   if(k==='measureText')return ()=>({width:10});
   if(typeof k!=='string')return undefined;
   return ()=>{if(GEO.indexOf(k)>=0)rec.push(k);};},set:()=>true});
  drawZombie(rc,zi,0,0,1,1.7,0,{});
  if(!rec.length){console.log('FAIL: '+ZOMBIES[zi].n+' が何も描いていない');process.exit(1);}
  const key=rec.join(',');
  (fp[key]||(fp[key]=[])).push(ZOMBIES[zi].n);
 }
 const dup=Object.keys(fp).filter(k=>fp[k].length>1).map(k=>fp[k].join('='));
 if(dup.length){console.log('FAIL: 同じ形で描かれているゾンビ: '+dup.join(' / '));process.exit(1);}
 console.log('ゾンビの絵: '+ZOMBIES.length+'種すべてが専用の枝を持ち、図形の並びも全部違う OK');
}
/* ---- 兵科32種・英雄11人・タワー20種の絵が1つずつ違うか(2026-07-26 第91弾) ----
   ⭐ゾンビ(checkZLook)と同じ考え方。**共通の胴+武器だけ**の作りに戻ると、
     実機(25px)では色しか違わない絵になる=それを静的+実走で見張る。
   ⚠**色も数値も見ない**。図形を積む命令の並びだけを見る(色を入れると必ず通る検査になる)。 */
function shapeFp(drawFn){
 const GEO=['moveTo','lineTo','arc','arcTo','ellipse','rect','fillRect','strokeRect',
  'quadraticCurveTo','bezierCurveTo','closePath','fill','stroke','clip','translate','rotate','scale'];
 const rec=[];
 const rc=new Proxy({},{get:(t,k)=>{
  if(k==='canvas')return {};
  if(k==='measureText')return ()=>({width:10});
  if(typeof k!=='string')return undefined;
  return ()=>{if(GEO.indexOf(k)>=0)rec.push(k);};},set:()=>true});
 drawFn(rc);
 return rec;
}
/* ---- 🧪ドット絵の試作(2026-07-27 第92弾) ----
   ⚠絵は文字の並びなので、**行の長さが1つでも違うと絵がずれる**。目では気づけないので検査する。 */
function checkPixel(){
 for(const id in PX_Z){
  const sp=PX_Z[id],Z=ZOMBIES.find(z=>z.id===id);
  if(!Z){console.log('FAIL: ドット絵の指す先が無い: '+id);process.exit(1);}
  /* ⭐向きは3つ(横向き/正面/背面)。正面と背面が無い種類は横向きだけを見る。
     ⚠**幅と基準点は向きごとに違う**(横向きは腕を伸ばすぶん広い)ので、向きごとに測ること */
  const sets=[['横向き',sp],['正面',sp.fr],['背面',sp.bk]].filter(a=>a[1]);
  for(const st of sets){const nm=st[0],S=st[1];
   for(let k=0;k<S.f.length;k++){
    const rows=S.f[k];
    if(rows.length!==sp.h){console.log('FAIL: ドット絵の行数が違う '+id+' '+nm+' コマ'+k+': '+rows.length+'/'+sp.h);process.exit(1);}
    for(let y=0;y<rows.length;y++){
     if(rows[y].length!==S.w){console.log('FAIL: ドット絵の行の長さが違う '+id+' '+nm+' コマ'+k+' '+y+'行目: '+rows[y].length+'/'+S.w);process.exit(1);}
     for(let x=0;x<rows[y].length;x++){const ch=rows[y].charAt(x);
      /* ⚠1文字→色は PX_CH の並び順で引く(tool_px.js が書き出す形) */
      if(ch!==' '&&!PX_PAL[PX_CH.indexOf(ch)]){console.log('FAIL: 色表に無い文字「'+ch+'」 '+id+' '+nm+' '+y+'行目');process.exit(1);}}}}
   /* 横の基準点(足の位置)が枠の中にあるか */
   if(S.ax==null||S.ax<0||S.ax>S.w){console.log('FAIL: 基準点axが枠の外: '+id+' '+nm+' ax='+S.ax);process.exit(1);}
   /* 中身が空でないか(全部空白だと透明のまま消える) */
   let n=0;for(const r of S.f[0])for(let x=0;x<r.length;x++)if(r.charAt(x)!==' ')n++;
   if(n<80){console.log('FAIL: ドット絵の中身が薄すぎる: '+id+' '+nm+' ('+n+'点)');process.exit(1);}}}
 /* ⭐進む向きから正しい絵を選べているか。⚠**画面のyは下が正**なので sin>0 が「手前に来る=正面」。
    ここを取り違えると、縦の道で全員が背中を見せて歩いてくる */
 const HP=Math.PI/2;
 const wants=[[0,'s'],[Math.PI,'s'],[HP,'f'],[-HP,'b']];
 for(const w of wants){const got=pxVw(w[0]);
  if(got!==w[1]){console.log('FAIL: 向きの選び方が違う 角度'+w[0].toFixed(2)+' → '+got+'(正しくは'+w[1]+')');process.exit(1);}}
 /* 既定では切ってあること(1体だけ画風が違う状態で公開しないため) */
 if(PX_ON){console.log('FAIL: ドット絵の試作が既定で有効になっている(?px=1 の時だけにすること)');process.exit(1);}
 const dirN=Object.keys(PX_Z).filter(k=>PX_Z[k].fr&&PX_Z[k].bk).length;
 console.log('🧪ドット絵の試作: '+Object.keys(PX_Z).length+'種('+Object.keys(PX_Z).join('/')+') / 3方向そろい='+dirN+'種 形は正しい / 既定は切 OK');
}
function checkULook(){
 /* (1) 全兵科に「体型・かぶり物・背負い物」の指定があるか */
 const miss=[];
 for(let i=0;i<U_N;i++){const id=UBASE[i].id;if(!U_LOOK[id])miss.push(UBASE[i].n);}
 if(miss.length){console.log('FAIL: 見た目の指定が無い兵科(共通の姿になる): '+miss.join('/'));process.exit(1);}
 /* (2) かぶり物が偏っていないか(同じ頭が多すぎると見分けが付かない) */
 const hc={};for(const k in U_LOOK)hc[U_LOOK[k].h]=(hc[U_LOOK[k].h]||0)+1;
 const many=Object.keys(hc).filter(k=>k&&hc[k]>4);
 if(many.length){console.log('FAIL: 同じかぶり物が5種以上に付いている: '+many.join('/'));process.exit(1);}
 /* (3) 実走: 図形の並びが全部違うか */
 const fp={};
 for(let i=0;i<U_N;i++){
  const rec=shapeFp(rc=>drawUnit(rc,i,0,0,1,1.7,0,{}));
  if(!rec.length){console.log('FAIL: '+UNITS[i].n+' が何も描いていない');process.exit(1);}
  const key=rec.join(',');(fp[key]||(fp[key]=[])).push(UNITS[i].n);}
 const dup=Object.keys(fp).filter(k=>fp[k].length>1).map(k=>fp[k].join('='));
 if(dup.length){console.log('FAIL: 同じ形で描かれている兵科: '+dup.join(' / '));process.exit(1);}
 console.log('兵科の絵: '+U_N+'種すべてが違う体型/かぶり物/背負い物を持ち、図形の並びも全部違う OK');
}
function checkHeroLook(){
 const miss=HEROES.filter(h=>!H_LOOK[h.id]).map(h=>h.n);
 if(miss.length){console.log('FAIL: 見た目の指定が無い英雄(共通の姿になる): '+miss.join('/'));process.exit(1);}
 const fp={};
 for(let k=0;k<HEROES.length;k++){
  const rec=shapeFp(rc=>drawUnit(rc,HERO_I0+k,0,0,1,1.7,0,{}));
  if(!rec.length){console.log('FAIL: '+HEROES[k].n+' が何も描いていない');process.exit(1);}
  const key=rec.join(',');(fp[key]||(fp[key]=[])).push(HEROES[k].n);}
 const dup=Object.keys(fp).filter(k=>fp[k].length>1).map(k=>fp[k].join('='));
 if(dup.length){console.log('FAIL: 同じ形で描かれている英雄: '+dup.join(' / '));process.exit(1);}
 /* 武器とかぶり物が全員バラバラか(1人ずつの造形にした意味が消えるため) */
 const ws={},hs={};for(const id in H_LOOK){ws[H_LOOK[id].w]=1;hs[H_LOOK[id].h]=1;}
 if(Object.keys(ws).length<HEROES.length){console.log('FAIL: 英雄の武器が重複している');process.exit(1);}
 if(Object.keys(hs).length<HEROES.length){console.log('FAIL: 英雄のかぶり物が重複している');process.exit(1);}
 console.log('英雄の絵: '+HEROES.length+'人すべてが専用のかぶり物・武器・背中の物を持つ OK');
}
function checkTwLook(){
 const fp={};
 for(let i=0;i<TOWERS.length;i++){
  const rec=shapeFp(rc=>drawTower(rc,i,0,0,0,0.3,1.7,{}));
  if(!rec.length){console.log('FAIL: '+TOWERS[i].n+' が何も描いていない');process.exit(1);}
  const key=rec.join(',');(fp[key]||(fp[key]=[])).push(TOWERS[i].n);}
 const dup=Object.keys(fp).filter(k=>fp[k].length>1).map(k=>fp[k].join('='));
 if(dup.length){console.log('FAIL: 同じ形で描かれているタワー: '+dup.join(' / '));process.exit(1);}
 /* ⚠⚠**進化の中段(gmid)はまだ専用の絵が無い**=素の絵を色だけ変えて流用している(2026-08-02)。
    ⭐17種の絵を描いたらこの一覧が0件になる。0件にしたら drawTower の読み替え(T.gmid なら T.base)も外すこと。
    ⚠形が同じでも色が違うのでこの検査は通ってしまう=**通ったからといって絵があるとは限らない**。 */
 {const todo=TOWERS.filter(T=>T.gmid).map(T=>T.n);
  if(todo.length)console.log('TODO: 進化の中段'+todo.length+'種は素の絵を流用中(色だけ違う)= '+todo.slice(0,4).join('/')+'…');}
 console.log('タワーの絵: '+TOWERS.length+'種すべてが違う砲身/特徴パーツを持つ OK');
}
/* ---- 姿のプレビュー(第91弾) ----
   ⭐ユーザー指示「全容が見える大きさに」。⚠DOM側だけの検査はヘッドレスでは0個でも通るので、
     **項目データ(LAB_ITEMS)に姿の指定(pv)が付いているか**を見る。 */
function checkPreview(){
 META.pts=999999;META.nt=3;META.nu=4;renderLab();
 const need=LAB_ITEMS.filter(it=>it.k==='nt'||it.k==='nu'||it.k==='tw'||it.k==='un'||it.k==='uv');
 if(!need.length){console.log('FAIL: 研究所にタワー/兵科の項目が1つも無い');process.exit(1);}
 const nopv=need.filter(it=>!it.pv).map(it=>it.t);
 if(nopv.length){console.log('FAIL: 姿(pv)の無い項目がある=絵文字のままになる: '+nopv.slice(0,5).join('/'));process.exit(1);}
 for(const it of need){
  if(it.pv.k==='t'&&!TOWERS[it.pv.i]){console.log('FAIL: 姿の指す先が無い(タワー): '+it.t);process.exit(1);}
  if(it.pv.k==='u'&&!UNITS[it.pv.i]){console.log('FAIL: 姿の指す先が無い(兵科): '+it.t);process.exit(1);}}
 /* fitDraw が例外を出さずに描けるか(測れない環境でも中央に置くだけで通ること) */
 let drew=0;
 const fake={width:80,height:60,getContext:()=>({save(){},restore(){},clearRect(){},translate(){},scale(){},
  beginPath(){},moveTo(){},lineTo(){},arc(){},ellipse(){},rect(){},closePath(){},fill(){},stroke(){},
  fillRect(){},strokeRect(){},quadraticCurveTo(){},bezierCurveTo(){},clip(){},drawImage(){},fillText(){},strokeText(){},
  measureText:()=>({width:10}),set fillStyle(v){},set strokeStyle(v){},set lineWidth(v){},set font(v){},
  set textAlign(v){},set globalAlpha(v){},set filter(v){},set shadowColor(v){},set shadowBlur(v){},set lineJoin(v){}})};
 fitDraw(fake,()=>{drew++;},4);
 if(!drew){console.log('FAIL: fitDraw が絵を描いていない');process.exit(1);}
 /* 派生キャラを描いても UNITS が元に戻っているか(戻し忘れると編成が壊れる) */
 const keep=UNITS[0];drawUnitAs({save(){},restore(){},translate(){},scale(){},beginPath(){},moveTo(){},lineTo(){},
  arc(){},ellipse(){},rect(){},closePath(){},fill(){},stroke(){},fillRect(){},strokeRect(){},quadraticCurveTo(){},
  clip(){},fillText(){},strokeText(){},measureText:()=>({width:10})},0,{id:'zzz',n:'X',c:'#fff',type:'melee',hp:1,atk:1,cost:1,cd:1,rate:1,rng:1,sp:1});
 if(UNITS[0]!==keep){console.log('FAIL: drawUnitAs が UNITS を元に戻していない');process.exit(1);}
 console.log('姿のプレビュー: 研究所'+need.length+'件に実物の絵 / 枠いっぱいに収める処理あり OK');
}
/* ---- 音を鳴らす所が必ず音量の表(SFX_GAIN)を通っているか(2026-07-26 第84弾) ----
   ⚠**?sfx=1 の確認画面だけ素の音量で鳴らしていた**。音量を下げる直しを入れたのに
     確認画面では下がって聴こえず、**「ゲームを進めずに音を確かめる」という画面の存在意義が
     丸ごと無効**になっていた(ユーザーが「まだでかい」と気づいて発覚)。
   ⚠新しく音を鳴らす所を足した時に同じことが起きるので、静的に見張る。
   ⚠この関数は body(テンプレート文字列)の中に入るので、正規表現も改行のエスケープも使わない。 */
function checkSfxGain(){
 const NL=String.fromCharCode(10),bad=[];
 for(const ln of js.split(NL)){
  if(ln.indexOf('function sfxPlay(')>=0)continue;/* 定義そのものは除く */
  if(ln.indexOf('sfxPlay(')<0)continue;
  if(ln.indexOf('SFX_GAIN')<0)bad.push(ln.trim().slice(0,70));
 }
 if(bad.length){console.log('FAIL: 音量の表(SFX_GAIN)を通さずに鳴らしている所がある: '+bad.join(' / '));process.exit(1);}
 /* 表のキーが実在するか。⚠打ち間違えると**黙って効かない**(下げたつもりで下がらない) */
 const un=Object.keys(SFX_GAIN).filter(k=>!SFXB[k]);
 if(un.length){console.log('FAIL: SFX_GAIN に素材の無いキーがある: '+un.join('/'));process.exit(1);}
 /* ⚠1.0を超える値は書かない約束(「下げる」ための表なので) */
 const up=Object.keys(SFX_GAIN).filter(k=>SFX_GAIN[k]>1);
 if(up.length){console.log('FAIL: SFX_GAIN に1.0を超える値がある: '+up.join('/'));process.exit(1);}
 console.log('音量の表: 鳴らす所すべてが SFX_GAIN を通り、'+Object.keys(SFX_GAIN).length+'件すべて実在するキー OK');
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
 const want={cryo:['ice','shock'],drone:['pel'],fort:['beam'],
  /* ⚠レーザー塔は**継続攻撃**にしたので fx を出さない(絵は塔の描画で引く)=ここに入れない */
  shot:['spread'],plasma:['pboom'],gat:['tr'],rail:['beam','shock']};
 for(const tid of Object.keys(want)){
  const k=run(tid,tid==='plasma'?140:60);
  for(const w of want[tid])if(!k[w]){
   console.log('FAIL: '+tid+' に '+w+' の絵が出ていない(出た絵='+(Object.keys(k).join(',')||'なし')+')');process.exit(1);}
  /* 撃ち方を分けたタワーが、汎用の曳光線(tr)に戻っていないこと */
  if(['drone','fort','rail'].indexOf(tid)>=0&&k.tr){
   console.log('FAIL: '+tid+' がまだ汎用の曳光線(tr)を出している');process.exit(1);}
 }
 /* ---- ⚠droneOff は**敵が居ない時の漂い先**にだけ使う(2026-07-27に役割が変わった) ----
    ⚠位置は「時刻と枠番号だけ」で決まる=描画と発射で同じ場所になり、対戦の相手盤面でも同じに見える */
 {const a0=droneOff(0,3,0),a1=droneOff(1,3,0),b0=droneOff(0,3,1.3);
  if(Math.abs(a0[0]-a1[0])<6&&Math.abs(a0[1]-a1[1])<6){
   console.log('FAIL: 2機のドローンが同じ場所に重なっている');process.exit(1);}
  if(Math.abs(a0[0]-b0[0])<2&&Math.abs(a0[1]-b0[1])<2){
   console.log('FAIL: ドローンが時間で動いていない');process.exit(1);}
  /* 塔から離れすぎない(枠の周りを漂う範囲に収まっているか) */
  for(let q=0;q<40;q++){const p=droneOff(q%2,3,q*.37);
   if(Math.hypot(p[0],p[1])>60){console.log('FAIL: ドローンが塔から離れすぎ '+p);process.exit(1);}}
  console.log('ドローンの漂い: 敵が居ない時の行き先が枠と時刻だけで決まり、塔から離れすぎない OK');}
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
 {const ids=['fort','arty','mortar','gren','cryo','net','plasma','drone','laser','rail','gat'];/* 発射音は継続攻撃の2つにも要る */
  const seen={};
  for(const id of ids){const k=TW_SFX[id];
   if(!k){console.log('FAIL: '+id+' に発射音が割り当てられていない');process.exit(1);}
   if(seen[k]){console.log('FAIL: '+id+' と '+seen[k]+' が同じ発射音('+k+')を使っている');process.exit(1);}
   seen[k]=id;
   if(typeof SFXB!=='undefined'&&!SFXB[k]){console.log('FAIL: 発射音 '+k+' が埋め込まれていない');process.exit(1);}}}
 console.log('タワーの撃ち方: 冷却塔/ドローン/要塞砲/ショットガン/プラズマ が別々の絵・別々の音 OK');
 backTitle();
}
function checkHook(){
 META.stg=0;setDiff=2;startSolo();
 frames(20,.016);
 const me=G.players[0];
 const zi=ZOMBIES.findIndex(z=>z.noblock&&!z.nm&&!z.st);
 const hooks=[];UNITS.forEach((u,i)=>{if(u.hook)hooks.push(i);});
 if(!hooks.length||zi<0){console.log('FAIL: すり抜けを止められる兵科/すり抜け敵が見つからない');process.exit(1);}
 /* ⭐**すり抜け敵を止められる兵科は複数ある**(2026-07-27ユーザー指示で鎖使い以外にも増やした)。
    hook の値がそのまま「同時に抱えられる数」。⚠専門の鎖使いが一番広いこと。 */
 if(hooks.length<3){console.log('FAIL: すり抜けを止められる兵科が少なすぎる('+hooks.length+'種)');process.exit(1);}
 const ci=UNITS.findIndex(u=>u.id==='chain');
 if(ci<0||UNITS[ci].hook!==Math.max(...hooks.map(i=>UNITS[i].hook))){
  console.log('FAIL: 専門の鎖使いが一番多く抱えられていない');process.exit(1);}
 const names=[];
 for(const ui of hooks){
  const N=UNITS[ui].hook;
  me.units.length=0;me.zombies.length=0;
  me.team=UNITS.map((u,i)=>i);me.uUn=Math.max(me.uUn,ui+1);me.ucd[ui]=0;me.scrap=999999;
  if(!deployUnit(me,ui)){console.log('FAIL: '+UNITS[ui].n+' が出せない');process.exit(1);}
  const u=me.units[me.units.length-1];u.d=PLEN*.5;u.hp=u.mhp=1e9;
  /* ⚠**上限ぴったり**を重ねて、1体も素通りしないこと */
  for(let k=0;k<N;k++){const z=mkZ(zSpec(zi,1,5),u.d-2);z.hp=z.mhp=1e9;me.zombies.push(z);}
  const d0=me.zombies.map(z=>z.d);
  for(let k=0;k<40;k++)campStep(me,.03,G.wave);
  const slipped=me.zombies.filter((z,i)=>z.d-d0[i]>18).length;
  if(slipped){console.log('FAIL: '+UNITS[ui].n+' が居るのにすり抜け敵が'+slipped+'/'+N+'体 素通りした');process.exit(1);}
  /* 逆に、上限を超えたぶんは素通りしてよい(1体が無限に抱えないこと) */
  while(me.zombies.length<N+4){const z=mkZ(zSpec(zi,1,5),u.d-2);z.hp=z.mhp=1e9;me.zombies.push(z);}
  const ex=me.zombies.slice(N),e0=ex.map(z=>z.d);
  for(let k=0;k<40;k++)campStep(me,.03,G.wave);
  const through=ex.filter((z,i)=>z.d-e0[i]>18).length;
  if(!through){console.log('FAIL: '+UNITS[ui].n+' 1体が上限('+N+')を超えて抱えている');process.exit(1);}
  names.push(UNITS[ui].n+N+'体');
 }
 /* 普通の兵科ではすり抜け敵を止められないこと(hookの意味が消えていないか) */
 {const ni=UNITS.findIndex(u=>!u.hook&&u.type==='melee');
  me.units.length=0;me.zombies.length=0;me.team=UNITS.map((u,i)=>i);me.uUn=Math.max(me.uUn,ni+1);me.ucd[ni]=0;me.scrap=999999;
  deployUnit(me,ni);const u=me.units[me.units.length-1];u.d=PLEN*.5;u.hp=u.mhp=1e9;
  const z=mkZ(zSpec(zi,1,5),u.d-2);z.hp=z.mhp=1e9;me.zombies.push(z);const d0=z.d;
  for(let k=0;k<40;k++)campStep(me,.03,G.wave);
  if(z.d-d0<=18){console.log('FAIL: hookを持たない'+UNITS[ni].n+'がすり抜け敵を止めている');process.exit(1);}}
 console.log('すり抜けを止める兵科: '+names.join(' / ')+' — 上限ぴったりまで足止め・超過分は素通り・他の兵科は素通り OK');
 backTitle();
}
/* ⭐⭐**出撃枠は「体数」ではなく「重さ」で数える**(2026-08-02ユーザー決定)。見るのは4つ:
   ①タイタン級(4枠)は5体で止まる ②雑魚(1枠)は今までどおり20体まで
   ③重い兵科は「残り枠が足りない」で弾かれる(=体数ではなく重さで見ている証拠)
   ④倒れた部隊は枠を食わない。 */
function checkSlotWt(){
 META.stg=0;setDiff=2;META.nu=U_N-BASE_U;META.team=null;startSolo();
 const me=G.players[0];
 const fill=(id)=>{const i=UBASE.findIndex(u=>u.id===id);
  me.units.length=0;me.team=[i];me.uUn=1;me.scrap=1e9;
  let n=0;for(let k=0;k<60;k++){me.ucd[i]=0;if(!deployUnit(me,i))break;n++;}
  return {i,n};};
 const T=fill('titan');
 if(uWt(T.i)!==4){console.log('FAIL: タイタンの枠が4でない '+uWt(T.i));process.exit(1);}
 if(T.n!==Math.floor(MAXU/4)){console.log('FAIL: タイタンが'+T.n+'体出せる(4枠なので'+Math.floor(MAXU/4)+'体のはず)');process.exit(1);}
 /* ③満杯(20)の時に、1枠の兵科すら入らないこと=重さで見ている */
 {const h=UBASE.findIndex(u=>u.id==='hnd');me.team=[T.i,h];me.uUn=2;me.ucd[h]=0;
  if(deployUnit(me,h)){console.log('FAIL: 枠が満杯なのに猟犬が入った');process.exit(1);}}
 /* ④倒れた部隊は枠を食わない */
 {me.units[0].dead=1;const h=UBASE.findIndex(u=>u.id==='hnd');me.ucd[h]=0;
  if(!deployUnit(me,h)){console.log('FAIL: 倒れた部隊が枠を食い続けている');process.exit(1);}}
 const H=fill('hnd');
 if(H.n!==MAXU){console.log('FAIL: 猟犬が'+H.n+'体しか出せない(1枠なので'+MAXU+'体のはず)');process.exit(1);}
 /* ⑤ ⭐**まだ出していない英雄のぶんは予約される**=枠を埋め切っても英雄が出せる(詰み防止) */
 {const h=UBASE.findIndex(u=>u.id==='hnd');
  me.units.length=0;me.team=[h];me.uUn=1;me.scrap=1e9;
  me.hUi=HERO_I0;me.hOut=0;/* 英雄を連れている状態 */
  let n=0;for(let k=0;k<60;k++){me.ucd[h]=0;if(!deployUnit(me,h))break;n++;}
  if(n!==MAXU-uWt(HERO_I0)){console.log('FAIL: 英雄のぶんの枠が予約されていない(部隊が'+n+'体入った)');process.exit(1);}
  if(!heroDeploy(me)){console.log('FAIL: 枠を埋め切ると英雄が出せない(詰み)');process.exit(1);}
  me.hUi=-1;me.hOut=0;}
 me.units.length=0;me.team=null;META.nu=0;/* ⚠**解放数を戻す**=戻さないと後の検査が全兵科ありで走る */
 backTitle();
 console.log('出撃枠(重さ制): タイタン4枠='+T.n+'体 / 猟犬1枠='+H.n+'体 / 満杯なら1枠も入らない / 戦死した枠は空く / 英雄のぶんは予約される OK');
}
/* ⭐⭐**波ごとに「物量」と「重厚」が振れる**(2026-08-02ユーザー決定)。⚠見るのは3つ:
   ①W1〜4は振らない ②物量の波と重厚の波が両方ちゃんとある
   ③**総HPを変えずに**体数と1体あたりのHPが逆に振れる(=難易度カーブを動かしていない証拠)。
   ⚠顔ぶれは毎回ランダムなので**何回かの平均**で見ること(1回だと普通に前後する)。 */
function checkTideKind(){
 for(let w=1;w<=4;w++)if(tideKof(w)!==1){console.log('FAIL: W'+w+' で波の性格が振れている(序盤は振らない約束)');process.exit(1);}
 let mass=0,heavy=0;
 for(let w=5;w<=20;w++){const k=tideKof(w);if(k>1.05)mass++;else if(k<.95)heavy++;}
 if(mass<3||heavy<3){console.log('FAIL: 物量'+mass+'波/重厚'+heavy+'波=偏りすぎ');process.exit(1);}
 /* ⚠**ボス波(5の倍数)は振らない**=振ると①漏らした時のコア被害が減ってボス波が一番安く諦められる
    ②cut と掛け算になって1体が厚くなりすぎる(2026-08-02の検証で判明) */
 for(let w=5;w<=20;w+=5)if(tideKof(w)!==1){console.log('FAIL: W'+w+'(ボス波)で波の性格が振れている');process.exit(1);}
 /* ⚠W12以降は cut の狙いを潰さないよう振れ幅を薄める */
 if(!(Math.abs(tideKof(13)-1)<Math.abs(tideKof(7)-1))){console.log('FAIL: 終盤の振れ幅が薄まっていない');process.exit(1);}
 /* ⚠**作戦タイムに出す文言**も見る=振れているのに見せないと「ただの当たり外れ」になる */
 if(tideKind(7).t.indexOf('物量')<0){console.log('FAIL: W7が物量の波として案内されない');process.exit(1);}
 if(tideKind(8).t.indexOf('重厚')<0){console.log('FAIL: W8が重厚の波として案内されない');process.exit(1);}
 if(tideKind(15).d){console.log('FAIL: ボス波(W15)にも波の性格の案内が出ている');process.exit(1);}
 if(tideKind(2).d){console.log('FAIL: 序盤(W2)にも波の性格の案内が出ている');process.exit(1);}
 META.stg=0;setDiff=2;startSolo();
 const meas=(w)=>{let n=0,hp=0,bt=0;
  for(let r=0;r<12;r++){G.wave=w;buildTide(w);
   const p=G.tide.pool.filter(e=>!e.boss);
   n+=p.length;hp+=p.reduce((a,e)=>a+e.z.hp,0);bt+=p.reduce((a,e)=>a+e.z.bt,0);}
  return {n:n/12,hp:hp/12,bt:bt/12};};
 const A=meas(7),B=meas(8);/* W7=物量 / W8=重厚(隣どうしで比べる=波の重さがほぼ同じ) */
 if(!(A.n>B.n*1.2)){console.log('FAIL: 物量の波の体数が増えていない '+A.n.toFixed(1)+' vs '+B.n.toFixed(1));process.exit(1);}
 if(!(A.hp/A.n<B.hp/B.n*.9)){console.log('FAIL: 重厚の波の1体が厚くなっていない');process.exit(1);}
 /* ⚠**⚙️の総額は振らない**=物量の波だけ稼ぎやすい、を作らない。
    ⚠**波をまたいで比べない**(顔ぶれも成長率も違うので比較にならない)。
      1体あたりの報酬が「体数に掛けた値の逆数」でちゃんと割り戻されているかを直に見る。
    ⚠総HPが動いていないことは checkEarly(3波の移動平均)が見ている。 */
 for(const w of [7,8,13,14]){const k=tideKof(w);
  const b1=zSpec(0,1,w,0,'',1).bt,b2=zSpec(0,1,w,0,'',1/k).bt;
  if(Math.abs((b2/b1)-(1/k))>.06){
   console.log('FAIL: W'+w+' の報酬が体数ぶん割り戻されていない x'+(b2/b1).toFixed(3)+'(想定 x'+(1/k).toFixed(3)+')');process.exit(1);}}
 backTitle();
 console.log('波の性格: 物量'+mass+'波/重厚'+heavy+'波 / W7(物量)は'+A.n.toFixed(0)+'体(1体'+Math.round(A.hp/A.n)
  +') → W8(重厚)は'+B.n.toFixed(0)+'体(1体'+Math.round(B.hp/B.n)+') / 総HPと⚙️は据え置き OK');
}
/* ---- 研究所の進化: どの兵科からでも選べるか / 大幅に強くなるか ---- */
function checkEvo(){
 /* ⚠⚠**2026-08-01に「未解放の兵科は進化も出さない」に変えた**(実機で
    「巨漢も何も解放していないのに進化が並ぶ」と指摘)。nu=0 で出るのは初期解放の2種ぶんだけ。 */
 META.uv=[];META.nu=0;META.pts=1e9;
 renderLab();
 {const vs0=LAB_ITEMS.filter(o=>o.k==='uv');
  const base0=VBASE.filter(b=>UBASE.findIndex(u=>u.id===b)<BASE_U).length;
  if(vs0.length!==base0){console.log('FAIL: 未解放の兵科の進化が出ている(出たのは'+vs0.length+'件・解放済みは'+base0+'種)');process.exit(1);}
  /* 上級兵科の進化は、本体が未解放なら出ないこと */
  /* ⚠以前は o.t(名前)を見ていたが '上級進化' は o.tag 側にあるため**常に0件=何も検査していなかった**(2026-07-26に修正) */
  const adv0=vs0.filter(o=>/上級進化/.test(o.tag||''));
  if(adv0.length){console.log('FAIL: 本体未解放の上級兵科の進化が出ている '+adv0.length+'件');process.exit(1);}}
 /* 全部解放すれば基本8種+上級2種ぶん選べる */
 META.nu=U_N-BASE_U;renderLab();
 const vs=LAB_ITEMS.filter(o=>o.k==='uv');
 if(vs.length<ALLVB.length){console.log('FAIL: 進化の選択肢が'+vs.length+'件しか出ていない(全解放なら'+ALLVB.length+'種ぶん出るはず)');process.exit(1);}
 /* 1つ買っても「次の段階」が同じ兵科で出る=段階は飛ばせない */
 const first=vs[0];META.uv.push(first.id);renderLab();
 const again=LAB_ITEMS.filter(o=>o.k==='uv');
 if(again.some(o=>o.id===first.id)){console.log('FAIL: 買った進化がまだ選択肢に残っている');process.exit(1);}
 /* 進化で大幅に強くなること(最終段階が素の2.5倍以上) */
 let worst=99;
 for(const b of ALLVB){const list=UVAR[b]||[];if(!list.length)continue;
  const top=list[list.length-1];worst=Math.min(worst,Math.max(top.hp||1,top.atk||1));}
 if(worst<2.5){console.log('FAIL: 最終進化の伸びが小さい(最小'+worst+'倍)');process.exit(1);}
 /* ⭐⭐**タレットの進化は2段**(2026-08-02)=研究所には**中段が先に出て、最終形態はその後**。
    ⚠値段も別(最終形態は中段の2.6倍)。ここが逆になると「初期のタワーの最終形態が数百🧬で買える」に戻る。 */
 {const nt0=META.nt,tg0=META.tg;
  META.tg=[];META.nt=T_PLAY-BASE_T;renderLab();
  const t1=LAB_ITEMS.filter(o=>o.k==='tg'),r1=t1.find(o=>o.id==='rifleM');
  if(!r1){console.log('FAIL: 進化の中段(速射ライフル台)が研究所に出ない');process.exit(1);}
  if(t1.some(o=>o.id==='rifle2')){console.log('FAIL: 中段を取る前に最終形態が研究所に出ている');process.exit(1);}
  META.tg=['rifleM'];renderLab();
  const r2=LAB_ITEMS.filter(o=>o.k==='tg').find(o=>o.id==='rifle2');
  if(!r2){console.log('FAIL: 中段を取っても最終形態が出ない');process.exit(1);}
  if(!(r2.p>r1.p*2)){console.log('FAIL: 最終形態の値段が中段と大差ない '+r2.p+' vs '+r1.p);process.exit(1);}
  console.log('タレットの進化(研究所): 中段'+r1.p+'🧬 → 最終形態'+r2.p+'🧬 の順にだけ出る OK');
  META.tg=tg0;META.nt=nt0;}
 console.log('進化: 解放した兵科だけ出る(未解放0件) / 全解放で'+vs.length+'兵科から選べる / 最終段階は最低でも素の'+worst.toFixed(2)+'倍 / 1個目'+LAB_UV(0)+'pt OK');
 META.uv=[];META.nu=0;
}
/* ---- 🎒編成(連れて行く10体)。2026-08-01ユーザー指示で入れた仕組み ----
   ⚠画面のボタンからしか触らない所なので、放っておくと**検査が一度も通らない**。 */
function checkTeam(){
 /* ⚠**ソロを1戦始めてから測る**=teamIdx は soloMeta() を見ており、
    タイトルのままだと対戦扱い(PVP_TEAM の10体固定)になって何を変えても動かない */
 META.stg=0;setDiff=2;META.nu=U_N-BASE_U;startSolo();
 const keep=META.team;
 /* ① 一度も触っていない(null)=安い順に自動で10体そろう */
 META.team=null;
 let t=teamIdx();
 if(t.length!==TEAM_N){console.log('FAIL: 未設定の編成が'+TEAM_N+'体そろわない '+t.length);process.exit(1);}
 for(const f of TEAM_FIX)if(t.indexOf(f)<0){console.log('FAIL: 固定枠('+f+')が編成に入っていない');process.exit(1);}
 for(let k=1;k<t.length;k++)if(t[k]<=t[k-1]){console.log('FAIL: 編成が安い順に並んでいない');process.exit(1);}
 /* ② 触った後(配列)=**自動で埋めない**。埋めると「外したのに戻る」になる */
 META.team=[UBASE[2].id];
 t=teamIdx();
 if(t.length!==TEAM_FIX.length+1){console.log('FAIL: 編成を触った後も自動で埋まっている '+t.length);process.exit(1);}
 /* ③ 解放費は「元の添字の UNITP」で引く=高い兵科ばかり選ぶと進まない */
 {const hi=UBASE.length-1;META.team=[UBASE[hi].id];
  const C={team:teamIdx(),uUn:TEAM_FIX.length};
  const p=uupCost(C);
  if(p!==UNITP[hi]){console.log('FAIL: 解放費が元のコストになっていない '+p+'(想定'+UNITP[hi]+')');process.exit(1);}
  C.uUn=C.team.length;
  if(uupCost(C)<1e8){console.log('FAIL: 連れて来た全員を解放した後も買えてしまう');process.exit(1);}}
 /* ④ 上限を超えない */
 {const all=[];for(let i=0;i<U_N;i++)all.push(UBASE[i].id);META.team=all;
  if(teamIdx().length>TEAM_N){console.log('FAIL: 編成が'+TEAM_N+'体を超える');process.exit(1);}}
 /* ⑤ ⭐⭐**タイトル(試合が始まっていない時)もソロの上限で見る**(2026-08-01に実機で発覚)。
    soloMeta() は G を見るので**タイトルでは必ず対戦扱い**になり、研究所で1つも解放していないのに
    編成へ10体(巨漢〜火炎瓶)が並んでいた。 */
 {META.team=null;backTitle();META.nu=0;
  if(metaUnitCap()!==BASE_U){console.log('FAIL: タイトルの兵科上限が解放済みの数にならない '+metaUnitCap()+'(想定'+BASE_U+')');process.exit(1);}
  if(metaTowerCap()!==BASE_T){console.log('FAIL: タイトルのタワー上限が解放済みの数にならない '+metaTowerCap()+'(想定'+BASE_T+')');process.exit(1);}
  const t9=teamIdx();
  if(t9.length!==BASE_U||t9.some(i=>i>=BASE_U)){console.log('FAIL: タイトルの編成に未解放の兵科が入っている '+t9.join(','));process.exit(1);}
  META.nu=3;
  if(metaUnitCap()!==BASE_U+3){console.log('FAIL: 研究所で解放したぶんがタイトルの編成に出ない '+metaUnitCap());process.exit(1);}}
 /* ⑥ ⭐**研究所で解放した兵科は、空きがあれば自動で編成に入る**(2026-08-02ユーザー指示) */
 {backTitle();
  META.nu=0;META.team=null;
  if(teamAutoAdd(UBASE[BASE_U].id)!=='auto'){
   console.log('FAIL: 編成を触っていない人の team を勝手に配列にしている(以後の自動補充が止まる)');process.exit(1);}
  if(META.team!=null){console.log('FAIL: teamAutoAdd が未設定の編成を書き換えた');process.exit(1);}
  /* 触った状態で空きがある=入る */
  META.nu=1;META.team=[];
  if(teamAutoAdd(UBASE[BASE_U].id)!=='add'){console.log('FAIL: 解放した兵科が編成に自動で入らない');process.exit(1);}
  if(teamIdx().indexOf(BASE_U)<0){console.log('FAIL: 自動で入れた兵科が編成に居ない');process.exit(1);}
  /* 満杯なら入れない(何を外すかはプレイヤーが決める) */
  META.nu=U_N-BASE_U;META.team=[];
  for(let i=TEAM_FIX.length;i<TEAM_N;i++)META.team.push(UBASE[i].id);
  if(teamIdx().length!==TEAM_N){console.log('FAIL: 検査の前提が崩れている(編成が'+teamIdx().length+'体)');process.exit(1);}
  if(teamAutoAdd(UBASE[TEAM_N].id)!=='full'){console.log('FAIL: 編成が満杯なのに押し込んでいる');process.exit(1);}
  if(teamIdx().indexOf(TEAM_N)>=0){console.log('FAIL: 満杯の編成に'+TEAM_N+'体を超えて入っている');process.exit(1);}
  META.team=null;META.nu=0;}
 META.team=keep;META.nu=0;
 console.log('🎒編成: 未設定なら安い順に'+TEAM_N+'体・触った後は自動で埋めない・解放費は元のコスト・上限'+TEAM_N+'体・タイトルでも解放済みだけ・解放した兵科は空きがあれば自動で入る OK');
}
/* ---- 💎英雄召集(ガチャ): 排出率・重複・魔石の増減 ---- */
function checkGacha(){
 /* ⚠2026-07-28ユーザー指示で★3x2・★4x1(→14種)、さらに★2〜★5を1人ずつ(→18種)足した。
    ⚠2026-08-01に★5の暗黒の騎士を足して19種。⭐排出率は『1体あたり』なので数値表は触らない */
 if(HEROES.length!==21){console.log('FAIL: 英雄が21種でない '+HEROES.length);process.exit(1);}
 const cnt={};for(const h of HEROES)cnt[h.rk]=(cnt[h.rk]||0)+1;
 /* ⚠2026-08-01に★5へ暗黒の騎士を足し、同日に**暁の王を★5→★4へ降格**した(ユーザー指示) */
 const want={1:5,2:4,3:4,4:4,5:4};
 for(const k in want)if(cnt[k]!==want[k]){console.log('FAIL: ★'+k+'の数が違う '+cnt[k]+'(想定'+want[k]+')');process.exit(1);}
 if(Math.abs(G_RATE.reduce((a,r)=>a+r[1],0)-100)>1e-9){console.log('FAIL: 排出率の合計が100でない');process.exit(1);}
 /* ⭐**排出率は「1体あたり」で決まる**(2026-07-30ユーザー指示)=英雄を足すとその枠が太くなること。
    ⚠それまではレア度の枠が固定で、足すほど狙った1人が出にくくなる逆の作りだった。 */
 for(let rk=1;rk<=5;rk++){
  const row=G_RATE.find(r=>r[0]==='r'+rk),n9=HEROES.filter(h=>h.rk===rk).length;
  if(!row){console.log('FAIL: ★'+rk+'の枠が無い');process.exit(1);}
  if(Math.abs(row[1]-RK_EACH[rk]*n9)>1e-9){
   console.log('FAIL: ★'+rk+'の枠が「1体あたり×人数」になっていない '+row[1]+' vs '+(RK_EACH[rk]*n9));process.exit(1);}}
 for(let rk=1;rk<5;rk++)if(!(RK_EACH[rk]>RK_EACH[rk+1])){console.log('FAIL: 1体あたりの確率がレア度順に下がっていない');process.exit(1);}
 if(G_RATE[0][0]!=='dud'||G_RATE[0][1]<DUD_MIN){console.log('FAIL: はずれ枠が下限を割っている');process.exit(1);}
 console.log('排出率: 1体あたり ★1 '+RK_EACH[1]+'% … ★5 '+RK_EACH[5]+'% / いまの枠 '
  +G_RATE.map(r=>(r[0]==='dud'?'はずれ':RK_S[+r[0].slice(1)])+r[1].toFixed(1)).join(' ')+' OK');
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
 /* ⚠**55固定で見ない**=はずれ枠は「残り全部」なので英雄を足すと動く(2026-07-30) */
 if(Math.abs(dp-G_RATE[0][1])>3){console.log('FAIL: はずれ枠の率がずれている '+dp.toFixed(1)+'%(想定'+G_RATE[0][1].toFixed(1)+'%)');process.exit(1);}
 if(!byRk[5]){console.log('WARN: 2万回でギガトンレアが出なかった(確率0.1%なので稀にあり得る)');}
 /* 重複は鍛錬素材になる */
 META.hero={};META.hmat=0;
 const h5=HEROES.find(h=>h.rk===5);
 gcApply({hero:h5});const m0=META.hmat;gcApply({hero:h5});
 if(META.hero[h5.id]!==2){console.log('FAIL: 所持数が増えていない');process.exit(1);}
 if(META.hmat<=m0){console.log('FAIL: 重複が鍛錬素材になっていない');process.exit(1);}
 /* ボス撃破の💎付与。⭐2026-07-30に大幅増(タイトルのロブスター/虹が主な取得源になっていたため)。
    難易度で増える(gemBoss)=新兵5/18 → 🌑ナイトメア12/43 */
 if(!(GEM_BOSS===5&&GEM_FIN===18)){console.log('FAIL: ボスの魔石量が想定と違う');process.exit(1);}
 if(typeof gemBoss==='function'){
  const g0=gemBoss(false),g1=gemBoss(true);
  if(!(g0>=GEM_BOSS&&g1>=GEM_FIN&&g1>g0)){console.log('FAIL: gemBossの計算がおかしい '+g0+'/'+g1);process.exit(1);}}
 /* ⚠内訳は**実際に数える**(2026-08-01)=前は決め打ちの文字列で、暁の王を★4へ降格しても
    表示が変わらないどころか、元から実際の人数と合っていなかった */
 {const rkN=[0,0,0,0,0];for(const h of HEROES)rkN[clamp((h.rk||1)-1,0,4)]++;
  const brk=rkN.map((n,i)=>'★'.repeat(i+1)+'x'+n).join('/');
  console.log('ガチャ: 英雄'+HEROES.length+'種('+brk+')・はずれ'+dp.toFixed(1)+'%・重複→素材・10連25個 OK');}
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
  let ok=false;
  try{ok=heroUlt(me,5);}catch(e){console.log('FAIL: 必殺技『'+h.ult+'』で例外: '+e.message);process.exit(1);}
  if(!ok){console.log('FAIL: 必殺技が発動しない '+h.id);process.exit(1);}
  if((me.hCg||0)!==0){console.log('FAIL: 必殺技のチャージが戻っていない '+h.id);process.exit(1);}
  /* ⭐⭐**必殺技には前置きのモーションがある**(2026-08-01ユーザー指示)=押した瞬間には効かない。
     ⚠低レアは短め・★5は長めだが、**0秒の英雄が居てはいけない**(それが「味気ない」の正体) */
  if(!((hu.ulW||0)>0)){console.log('FAIL: 必殺技に前置きのモーションが無い '+h.id);process.exit(1);}
  frames(2,.016);/* 溜め中の描画を1回通す(drawUltWindで例外が出ないか) */
  /* ⚠**効果の前後を測るのはここから**=溜めの間に敵が歩くぶんを s0 に含める */
  const s0=snap();
  /* ⚠**campStepで待たない**=敵が歩いてしまい「効果が出たのか敵が動いただけか」を見分けられなくなる。
     待ち行列(dly)だけを直に進める。⚠campStepと違い例外を握り潰さないので不具合も出る */
  for(let k=0;k<80;k++){
   if(!me.dly||!me.dly.length)break;
   for(const q of me.dly.slice()){q.t-=.05;if(q.t<=0&&!q.done){q.done=1;q.fn();}}
   me.dly=me.dly.filter(q=>!q.done);}
  const s1=snap();
  if(s0.every((v,i)=>Math.abs(v-s1[i])<1e-6)){console.log('FAIL: 必殺技『'+h.ult+'』に何の効果も無い');process.exit(1);}
  if(s1[0]<s0[0])dmgN++;
  /* 倒れたら二度と出せない */
  /* ⚠**十分に大きい一撃で殺す**=暁の号令(uOv)が生きていると被ダメージが半分になり、
     hp+1 では死なない(2026-07-28に踏んだ) */
  dmgU(me,hu,hu.hp*10+1000);
  if(me.hOut!==2){console.log('FAIL: 英雄の戦死が記録されない '+h.id);process.exit(1);}
  if(heroDeploy(me)){console.log('FAIL: 戦死した英雄が再出撃できる '+h.id);process.exit(1);}
  backTitle();
 }
 if(dmgN<8){console.log('FAIL: 敵にダメージを与える必殺技が少なすぎる '+dmgN);process.exit(1);}
 console.log('英雄: '+HEROES.length+'人の出撃(1ゲーム1回・戦死したら終わり)と必殺技'+HEROES.length+'種 OK(うち'+dmgN+'種が直接ダメージ)');
 META.hero={};META.hsel='';
}
/* ⭐⭐🎥**カメラ追従**(2026-08-02)。開拓便のための土台。見るのは4つ:
   ①**いつもの面ではカメラを持たない**(全景のまま=既存の見え方を1pxも変えない)
   ②開拓便では寄る ③**マップの外を映さない**(収まっている向きは中央寄せ)
   ④追従は一気に飛ばず、いつかは目標に着く
   ⚠この検査ファイルは丸ごとテンプレート文字列なので、コメントにバッククォートを書かないこと。 */
function checkCam(){
 /* 画面に地図の外が入っていないか(収まっている向きは中央寄せ)を見る */
 const inv=(tag)=>{
  /* ⚠**いま遊んでいる面の広さ(MAPW/MAPH)で見る**=開拓便は MW/MH より広い */
  const okX=(MAPW*SC<=VW)?Math.abs(OX-(VW-MAPW*SC)/2)<.02:(OX<=.02&&OX>=VW-MAPW*SC-.02);
  const okY=(MAPH*SC<=VH)?Math.abs(OY-(VH-MAPH*SC)/2)<.02:(OY<=.02&&OY>=VH-MAPH*SC-.02);
  if(!okX||!okY){console.log('FAIL: カメラが地図の外を映している '+tag+' OX='+OX.toFixed(1)+' OY='+OY.toFixed(1));process.exit(1);}
 };
 META.sc=[D5.map(()=>1),D5.map(()=>1)];META.stg=0;setDiff=2;startSolo();
 if(CAM){console.log('FAIL: いつもの面でカメラが入っている');process.exit(1);}
 fitCanvas();const sc0=SC,ox0=OX,oy0=OY;
 fitCanvas();
 if(SC!==sc0||OX!==ox0||OY!==oy0){console.log('FAIL: カメラ無しなのに毎フレーム値が変わる');process.exit(1);}
 backTitle();
 META.stg=0;setDiff=BNS_D;startSolo();bnsPreSkip();
 if(!CAM){console.log('FAIL: 開拓便でカメラが入らない');process.exit(1);}
 fitCanvas();
 /* ⚠**寄り具合(zm)は面ごとに変わる**(開拓便はマップが広いので1を切る=全景より引く)。
    ここで見るのは「カメラが効いていること」だけ=倍率が全景と違うこと。 */
 if(Math.abs(SC-sc0)<1e-6){console.log('FAIL: カメラが効いていない '+SC+' vs '+sc0);process.exit(1);}
 for(const p of [[0,0],[MAPW,0],[0,MAPH],[MAPW,MAPH],[MAPW/2,MAPH/2],[-500,-500],[MAPW+900,MAPH+900]]){
  camOn(p[0],p[1],2.2);fitCanvas();inv('('+p[0]+','+p[1]+')');}
 camOn(400,400,2.2);camTo(1200,400);camStep(.016);
 if(!(CAM.x>400&&CAM.x<1200)){console.log('FAIL: カメラの追従が一気に飛ぶか動かない '+CAM.x);process.exit(1);}
 for(let k=0;k<400;k++)camStep(.016);
 if(Math.abs(CAM.x-1200)>1){console.log('FAIL: カメラが目標にたどり着かない '+CAM.x);process.exit(1);}
 backTitle();
 if(CAM){console.log('FAIL: 面を出てもカメラが残っている');process.exit(1);}
 fitCanvas();
 if(Math.abs(SC-sc0)>1e-9){console.log('FAIL: 面を出ても全景の倍率に戻らない');process.exit(1);}
 META.stg=0;setDiff=2;
 console.log('🎥カメラ: いつもの面は全景のまま/開拓便だけ寄る/地図の外を映さない/追従はなめらか OK');
}
/* ⭐⭐⭐**🚌ボーナス面「バスの日」**(2026-08-02ユーザー決定)。
   見るのは6つ: ①四方の道が4本あって長さが揃っているか(揃っていないとコア到達がレーンごとにずれる)
   ②敵が4本すべてに散るか ③兵科・英雄・集結旗が無く、バスが居るか
   ④**遊べば次の難易度が開く**(クリア不要) ⑤報酬は初回だけ(2回クリアしても増えない)
   ⑥**中断の記録を残さない**(残すと再開で何度も入り直せて報酬の周回になる)
   ⚠この検査ファイルは丸ごとテンプレート文字列なので、コメントにバッククォートを書かないこと。 */
function checkBonus(){
 META.sc=[D5.map(()=>1),D5.map(()=>1)];META.sclr=[1,1];
 for(let si=0;si<STAGES.length;si++){
  META.bcl=[];META.gem=0;META.pts=0;
  scArr(si)[BNS_D]=0;
  META.stg=si;setDiff=BNS_D;startSolo();bnsPreSkip();
  const me=G.players[0];
  /* ⭐**道は「ほぼ縦の一直線」1本**(2026-08-02(24)ユーザー決定) */
  if(!LANES||LANES.length!==1){console.log('FAIL: 道中の道が1本ではない');process.exit(1);}
  if(!(LANES[0].len>MAPH*.9)){console.log('FAIL: 道がマップの縦を貫いていない '+Math.round(LANES[0].len));process.exit(1);}
  for(const s of LANES[0].seg)if(Math.abs(s.b[0]-s.a[0])>Math.abs(s.b[1]-s.a[1])*.25){
   console.log('FAIL: 道が縦になっていない(横に振れすぎ)');process.exit(1);}
  /* ⚠**進む向き**=道に沿った距離が増えるほど下(=ゾンビは上から下りてくる) */
  if(!(LANES[0].seg[0].a[1]<LANES[0].seg[LANES[0].seg.length-1].b[1])){
   console.log('FAIL: 道の向きが逆(ゾンビが後ろから来る)');process.exit(1);}
  /* ⚠**タレット置き場は1つも無い**(拠点防衛を外した面) */
  for(const s of SLOTS)if(s[0]>-9000){console.log('FAIL: 道中にタレット置き場が残っている');process.exit(1);}
  if(diffW(BNS_D)!==1){console.log('FAIL: ボーナス面が1波で終わらない');process.exit(1);}
  if(me.uUn!==0){console.log('FAIL: ボーナス面で兵科が出せる');process.exit(1);}
  /* team は空にしない(空配列だと作戦タイムの強化カードが undefined を触って止まる) */
  if(!(me.team||[]).length){console.log('FAIL: ボーナス面で team を空にしている');process.exit(1);}
  if(me.hUi>=0){console.log('FAIL: ボーナス面に英雄が居る');process.exit(1);}
  if(!me.bus){console.log('FAIL: ボーナス面にバスが居ない');process.exit(1);}
  /* ④遊べば次(古参)が開く=クリアしていなくても */
  if(!scArr(si)[BNS_D]){console.log('FAIL: ボーナス面に入っても記録が立たない');process.exit(1);}
  if(!diffOK(si,2)){console.log('FAIL: ボーナス面を遊んでも次の難易度が開かない');process.exit(1);}
  /* ⑥中断の記録を残さない */
  try{localStorage.removeItem(RUN_KEY);}catch(e){}
  saveRun();
  if(localStorage.getItem(RUN_KEY)){console.log('FAIL: ボーナス面が中断できてしまう(再開で周回できる)');process.exit(1);}
  /* ②⭐**敵はバスの少し先に湧く**(2026-08-02(24))=走っても密度が落ちない形になっていること */
  nextWave();
  for(let k=0;k<1400&&me.zombies.length<60;k++)tideStep(.05);
  if(me.zombies.length<20){console.log('FAIL: 道中に敵が湧かない '+me.zombies.length);process.exit(1);}
  {const bd=projPath(me.bus.x,me.bus.y);let bad=0;
   for(const z of me.zombies){if(z.d>bd-BNS_AHEAD+400||z.d<bd-BNS_AHEAD2-400)bad++;}
   if(bad>me.zombies.length*.1){
    console.log('FAIL: 敵がバスの先に湧いていない '+bad+'/'+me.zombies.length);process.exit(1);}}
  /* ⚠**後ろへ抜けた敵は耐久を削らない**(すれ違っただけ) */
  {const c0=me.core;const z9=me.zombies[0];z9.d=PLEN+10;campStep(me,.05,1);
   if(me.core<c0){console.log('FAIL: すれ違った敵でバスの耐久が減る');process.exit(1);}}
  /* ③バスがタップした所へ走って敵を轢く */
  /* 湧いた直後の敵は d が負(道の手前)。少し歩かせてから見る=画面の座標もここで入る */
  for(let k=0;k<20;k++)campStep(me,.05,1);
  const z0=me.zombies.find(z=>!z.dead&&z.d>=0);
  if(!z0){console.log('FAIL: ボーナス面に敵が湧いていない');process.exit(1);}
  /* ⚠バスの位置は盤面の内側へ丸められるので、**敵の方をバスに寄せて**当てる */
  z0.px=me.bus.x;z0.py=me.bus.y;
  const hp0=z0.hp;bnsBusStep(me,.2);
  if(!(z0.hp<hp0||z0.dead)){console.log('FAIL: バスが敵を轢いていない');process.exit(1);}
  /* スティックを右へ倒したら、加速して右へ動くか(重い車=すぐ最高速にはならない)
     ⚠**道の真ん中に置いてから見る**=森はバスが通れないので、道から外れた所だと
       通路の縁で押し戻されて「走り出さない」に見える */
  me.bus.x=BNS_CX;me.bus.y=BNS_CY;me.bus.arr=0;
  me.bus.vx=0;me.bus.vy=0;bnsStick(1,0);
  const bx0=me.bus.x;bnsBusStep(me,.2);
  if(!(me.bus.vx>0&&me.bus.x>bx0)){console.log('FAIL: スティックで走り出さない');process.exit(1);}
  if(me.bus.vx>BUS_SP){console.log('FAIL: 最高速を超えている');process.exit(1);}
  /* 離したら惰性で流れてから止まる(その場で止まらない) */
  bnsStick(0,0);const v1=me.bus.vx;bnsBusStep(me,.05);
  if(!(me.bus.vx>0&&me.bus.vx<v1)){console.log('FAIL: 離した時に惰性が無い');process.exit(1);}
  for(let k=0;k<200;k++)bnsBusStep(me,.05);
  if(Math.abs(me.bus.vx)>4){console.log('FAIL: いつまでも止まらない');process.exit(1);}
  /* ⭐**到着=クリア**(2026-08-02(24))=上の到着線に触れたら、残りの敵と湧く予定が消えて試合が終わる */
  /* ⚠⚠**2026-08-02(42)から、到着はまず「拠点の入り口を通過するムービー」になる**=
     この場では arr は立たない(立てるとリザルトが即出てムービーが1コマも見えない)。
     ⭐湧く予定と敵はムービーの開始で消す(門の前で群れに詰まらせないため)。 */
  {me.bus.arr=0;me.bus.mov=0;me.bus.movT=0;me.bus.movP=0;me.bus.movGY=null;
   me.bus.x=BNS_CX;me.bus.y=BNS_GOALY+100;me.bus.vx=0;me.bus.vy=0;
   bnsBusStep(me,.05);
   if(!me.bus.mov){console.log('FAIL: 到着線に着いてもムービーが始まらない');process.exit(1);}
   /* ⚠**道の端で始まった時は本物の門を使う**=自前の門を2つ目に出さない */
   if(me.bus.movOwn){console.log('FAIL: 到着線の目の前なのに門をもう1つ出している');process.exit(1);}
   if(G.tide.pool.length){console.log('FAIL: 到着したのに湧く予定が残っている');process.exit(1);}
   if(me.zombies.some(z=>!z.dead)){console.log('FAIL: 到着したのに敵が残っている');process.exit(1);}
   for(let k=0;k<400&&me.bus.mov;k++)bnsBusStep(me,.05);
   if(!me.bus.arr){console.log('FAIL: ムービーが終わっても到着にならない');process.exit(1);}
   if(!(me.bus.y>0)){console.log('FAIL: ムービーでマップの外まで走り抜けている y='+Math.round(me.bus.y));process.exit(1);}
   G.tide.bnsTpl=null;
   campStep(me,.05,1);
   if(!me.waveDone){console.log('FAIL: 到着しても制圧にならない(試合が終わらない)');process.exit(1);}}
  /* ⑤報酬は初回だけ */
  G.winner=0;G.over=true;G.wave=1;awardMeta();
  const gm1=META.gem,pt1=META.pts;
  if(gm1!==BNS_GEM){console.log('FAIL: 初回クリアの💎が'+gm1);process.exit(1);}
  if(!(pt1>0)){console.log('FAIL: 初回クリアの🧬が入らない');process.exit(1);}
  backTitle();
  META.stg=si;setDiff=BNS_D;startSolo();bnsPreSkip();
  /* ⚠⚠**倒した数で🧬を配らない**(2026-08-02(50)ユーザー「無限プレイで研究ptを無限獲得できちゃう」)=
     この面は**負けが無く75秒で終わる**ので、キルに比例させると1走で本編クリア1回ぶんを超える。
     ⭐**2回目からは⚡スコアに応じた少額+上限**(2026-08-02(52))=**上限を超えないこと**を見る。
     ⚠**回数制限(1日1回)は入れて外した**=ユーザー決定「回数制限はやめて報酬を減らそう」。 */
  G.players[0].kills=2000;
  if(G.players[0].bus)G.players[0].bus.score=999999;/* どれだけ稼いでも上限で止まること */
  const pt2=META.pts;
  G.winner=0;G.over=true;G.wave=1;awardMeta();
  if(META.gem!==gm1){console.log('FAIL: 2回目のクリアでも💎が増える(周回で稼げる)');process.exit(1);}
  {const d2=META.pts-pt2;
   if(d2>BNS_RPT_MAX){console.log('FAIL: 2回目の🧬が上限を超える +'+d2+'(上限'+BNS_RPT_MAX+')');process.exit(1);}
   if(d2<BNS_RPT_MIN){console.log('FAIL: 2回目の🧬が少なすぎる +'+d2);process.exit(1);}
   if(d2>=pt1){console.log('FAIL: 2回目の🧬が初回と同じかそれ以上 +'+d2+' vs 初回'+pt1);process.exit(1);}}
  backTitle();
  /* ⚠**何度でも入れること**(2026-08-02(52)に1日1回をやめた) */
  if(!diffOK(si,BNS_D)){console.log('FAIL: 2回走ったら道中が選べなくなっている');process.exit(1);}
  if(LANES){console.log('FAIL: ボーナス面を出てもレーンが残っている');process.exit(1);}
 }
 META.sc=[D5.map(()=>1),D5.map(()=>1)];META.bcl=[];META.stg=0;setDiff=2;
 console.log('🚌道中: ステージ'+STAGES.length+'面ぶん(縦一直線1本/置き場なし/バスの先に湧く/すれ違いは無傷/到着でクリア/遊べば次が開く/報酬は初回だけ/2回目からは🧬が少額+上限/中断できない) OK');
}
/* ⭐⭐**米粒ゾンビと轢き応え**(2026-08-02(2)ユーザー①)。見るのは6つ:
   ①数百体が盤面に乗ること+米粒の描き方が例外を出さずに通ること
   ②轢いた跡(血だまり/肉片/轍)が**上限を超えて増えない**こと(使い回しの輪。ここが伸びると青天井)
   ③連なりが増える・途切れて0に戻る・最高記録は残る
   ④⚙️の文字が**1体ずつ湧かない**(まとめて出す)
   ⑤米粒は**死体(corpse)を残さない**=これが「1体あたりの重さ」の正体だった
   ⑥⚠**本編(普通の面)では今までどおり死体も文字も出る**=米粒の細工が漏れていないこと */
function checkRice(){
 const fx0=FXLV;FXLV=2;
 META.sc=[D5.map(()=>1),D5.map(()=>1)];META.sclr=[1,1];
 META.stg=0;setDiff=BNS_D;startSolo();bnsPreSkip();
 const me=G.players[0];
 fitCanvas();
 nextWave();
 for(let k=0;k<3000&&G.tide.pool.length&&me.zombies.length<BNS_CAP-20;k++)tideStep(.05);
 for(let k=0;k<40;k++)campStep(me,.05,1);
 const live=me.zombies.filter(z=>!z.dead&&z.d>=0);
 /* ① 数百体が盤面に乗る(⚠**以前の上限は260**=そこを超えられていなければ意味が無い) */
 if(me.zombies.length<=260){console.log('FAIL: 以前の上限(260)を超えられていない '+me.zombies.length+'体');process.exit(1);}
 if(live.length<250){console.log('FAIL: 米粒が盤面に乗っていない '+live.length+'体');process.exit(1);}
 if(me.zombies.length>BNS_CAP){console.log('FAIL: 盤面の上限を超えている '+me.zombies.length);process.exit(1);}
 try{drawZRice(ctx,me,1.2);}catch(e){console.log('FAIL: 米粒の描画で例外 '+e.message);process.exit(1);}
 try{drawBnsMarks(ctx,me);drawBnsGore(ctx,me);drawBnsCombo(ctx,me,1.2);}catch(e){
  console.log('FAIL: 轢き応えの描画で例外 '+e.message);process.exit(1);}
 /* ② 使い回しの輪が伸びない */
 for(let k=0;k<900;k++)bnsSplat(me,{px:BNS_CX+k,py:BNS_CY,zi:0});
 for(let k=0;k<900;k++)bnsRing(me,'btrk',BNS_TRK,{x:0,y:0,tx:1,ty:0,nx:0,ny:1,t:0,b:0});
 if(me.bstn.length>BNS_STN||me.bchk.length>BNS_CHK||me.btrk.length>BNS_TRK||me.bbod.length>BNS_BOD){
  console.log('FAIL: 轢いた跡が上限を超えて増える 血'+me.bstn.length+'/肉'+me.bchk.length+'/轍'+me.btrk.length+'/体'+me.bbod.length);process.exit(1);}
 /* ④⑤ 米粒を倒しても文字と死体が湧かない */
 me.fx.length=0;me.bus.gain=0;me.bus.gainT=0;
 let n5=0;
 for(const z of me.zombies){if(z.dead||z.boss||z.elite)continue;killZ(me,z);if(++n5>=100)break;}
 if(n5<50){console.log('FAIL: 倒せる米粒が足りない '+n5);process.exit(1);}
 const nCp=me.fx.filter(e=>e.k==='corpse').length;
 if(nCp){console.log('FAIL: 米粒が死体を残している(重さの正体) '+nCp+'件');process.exit(1);}
 /* ⚠⚠**「txtが何件あるか」で測ってはいけない**(2026-08-02(40)に直した)=
    📖図鑑に初めて登録された種類ぶんの txt が混ざるので、**どのゾンビを引いたかで普通に落ちる**
    (無関係な変更で何度も「3件」で落ちた)。⭐見たいのは**⚙️の文字だけ**。 */
 const nTx=me.fx.filter(e=>e.k==='txt'&&e.s.indexOf('⚙️')>=0).length;
 if(nTx>2){console.log('FAIL: ⚙️の文字が1体ずつ湧いている '+nTx+'件');process.exit(1);}
 if(!(me.bus.gain>0)){console.log('FAIL: ⚙️が足し込まれていない');process.exit(1);}
 /* ③ 連なり */
 const B=me.bus;
 me.zombies.length=0;B.cmb=0;B.cmbT=0;B.cmbMx=0;B.kill=0;
 for(let k=0;k<12;k++){const z9=mkZ(zSpec(0,.02,1),200);z9.ln=0;z9.px=B.x;z9.py=B.y;me.zombies.push(z9);}
 for(let k=0;k<8;k++){for(const z of me.zombies){z.px=B.x;z.py=B.y;}bnsBusStep(me,.05);}
 if(!(B.cmb>=5)){console.log('FAIL: 連続轢殺が数えられていない ×'+B.cmb);process.exit(1);}
 if(!(B.kill>=5)){console.log('FAIL: 轢き殺した数が数えられていない '+B.kill);process.exit(1);}
 const mx=B.cmbMx;
 if(mx<B.cmb){console.log('FAIL: 最高連続が更新されていない');process.exit(1);}
 me.zombies.length=0;
 for(let k=0;k<Math.ceil((BNS_CMB_T+.4)/.05);k++)bnsBusStep(me,.05);
 if(B.cmb!==0){console.log('FAIL: 連なりが途切れない ×'+B.cmb);process.exit(1);}
 if(B.cmbMx!==mx){console.log('FAIL: 最高連続が消えている');process.exit(1);}
 /* ⑫ 🔥⭐**ニトロ**(2026-08-02(23))。見るのは5つ:
    ①轢くと溜まる ②満タンでないと撃てない ③撃つと速さが跳ねる ④切れたら元に戻る
    ⑤使っている間は溜まらない(撃ちっぱなしにできない) */
 {const B=me.bus;
  B.nit=0;B.nitT=0;B.vx=B.vy=0;B.x=BNS_CX;B.y=BNS_CY;
  me.zombies.length=0;
  for(let k=0;k<12;k++){const z9=mkZ(zSpec(0,.02,1),200);z9.ln=0;z9.px=B.x;z9.py=B.y;me.zombies.push(z9);}
  for(let k=0;k<8;k++){for(const z of me.zombies){z.px=B.x;z.py=B.y;}bnsBusStep(me,.05);}
  if(!(B.nit>0)){console.log('FAIL: 轢いてもニトロが溜まらない');process.exit(1);}
  /* ⭐**体そのものが吹き飛ぶ**(轢殺に見せる主役)=肉片とは別の輪(bbod)に1体1つ積まれること。
     ⚠2026-08-02(36)に「bchk」の bd 印から専用の輪へ移した(高さ z を持たせて本物の弾道にしたため) */
  if(!(me.bbod||[]).length){console.log('FAIL: 轢いた体が吹き飛んでいない');process.exit(1);}
  /* ⭐**高さ(z)を持って飛んでいること**=これが無いと着地も跳ねも転がりも起きない(偽物の弾道に戻っている)。
     ⚠⚠**盤面の体を見て「どれかが vz>0」で測ってはいけない**(2026-08-02(40)に直した)=
       上がっているのは初速150/重力1750の**0.09秒だけ**なので、
       「最後のコマで死んだ個体が居るか」=**どのゾンビを引いたか**で決まり、**普通に落ちる**
       (無関係な変更で4回中3回落ちた)。⭐**その場で1体飛ばして、その体を見る**=意味は同じで引きに左右されない。 */
  {me.bbod.length=0;me.bbodI=0;
   bnsSplat(me,{px:B.x,py:B.y,zi:0});
   if(!me.bbod.some(p=>p.vz>0&&p.rv!==undefined)){
    console.log('FAIL: 吹き飛んだ体が高さ(z)と回りを持っていない');process.exit(1);}}
  /* ⭐**バスが速いほど遠くへ高く飛ぶ**=初速がバスの速さから出ていること(固定の乱数に戻っていないか) */
  {const sv=B.vx,sv2=B.vy;
   me.bbod.length=0;me.bbodI=0;B.vx=0;B.vy=0;
   for(let k=0;k<12;k++)bnsSplat(me,{px:B.x,py:B.y,zi:0});
   const slow=Math.max.apply(null,me.bbod.map(p=>p.vz));
   me.bbod.length=0;me.bbodI=0;B.vx=0;B.vy=-BUS_SP;
   for(let k=0;k<12;k++)bnsSplat(me,{px:B.x,py:B.y-30,zi:0});
   const fast=Math.max.apply(null,me.bbod.map(p=>p.vz));
   B.vx=sv;B.vy=sv2;
   if(!(fast>slow*1.25)){
    console.log('FAIL: 速く走っても体の飛び方が変わらない 止='+Math.round(slow)+' 全速='+Math.round(fast));process.exit(1);}}
  /* ⭐**着地して跳ねて止まること**=飛び続けない・地面をすり抜けない・いつまでも震えない */
  {me.bbod.length=0;me.bbodI=0;B.vx=0;B.vy=-BUS_SP;
   bnsSplat(me,{px:B.x,py:B.y-30,zi:0});
   for(let k=0;k<Math.round(BBOD_LF/.02);k++)bnsFxStep(me,.02);
   const p9=me.bbod[0];
   if(!(p9&&p9.z===0)){console.log('FAIL: 吹き飛んだ体が着地しない z='+(p9?p9.z:'なし'));process.exit(1);}
   if(!(p9.nb>0)){console.log('FAIL: 吹き飛んだ体が一度も跳ねていない');process.exit(1);}
   if(!(Math.hypot(p9.vx,p9.vy)<50)){
    console.log('FAIL: 吹き飛んだ体が転がり止まらない v='+Math.round(Math.hypot(p9.vx,p9.vy)));process.exit(1);}
   B.vx=0;B.vy=0;}
  B.nit=.5;
  if(bnsNitro()!==false){console.log('FAIL: 満タンでないのにニトロが撃てる');process.exit(1);}
  B.nit=1;
  if(bnsNitro()!==true){console.log('FAIL: 満タンなのにニトロが撃てない');process.exit(1);}
  if(!(B.nitT>0)){console.log('FAIL: ニトロが効いていない');process.exit(1);}
  if(bnsNitro()!==false){console.log('FAIL: ニトロを二重に撃てる');process.exit(1);}
  if(B.nit!==0){console.log('FAIL: 撃ったのにゲージが減っていない');process.exit(1);}
  /* ③速さ=同じ入力・同じ秒数で、素の最高速を超えること。
     ⚠**道に沿って(上へ)走らせる**=横へ倒すと道幅の端で押し戻されて速さが出ない(2026-08-02(28)に踏んだ) */
  me.zombies.length=0;B.vx=B.vy=0;B.x=BNS_CX;B.y=BNS_CY;bnsStick(0,-1);
  for(let k=0;k<12;k++)bnsBusStep(me,.05);
  const spN=Math.hypot(B.vx,B.vy);
  if(!(spN>BUS_SP*1.3)){console.log('FAIL: ニトロで速くなっていない '+Math.round(spN));process.exit(1);}
  /* ⑤使用中は溜まらない */
  const n0=B.nit;
  me.zombies.length=0;
  for(let k=0;k<10;k++){const z9=mkZ(zSpec(0,.02,1),200);z9.ln=0;z9.px=B.x;z9.py=B.y;me.zombies.push(z9);}
  for(let k=0;k<6;k++){for(const z of me.zombies){z.px=B.x;z.py=B.y;}bnsBusStep(me,.05);}
  if(B.nit!==n0){console.log('FAIL: ニトロ中なのにゲージが溜まる');process.exit(1);}
  /* ④切れたら戻る */
  me.zombies.length=0;
  for(let k=0;k<Math.ceil(BUS_NIT_T/.05)+4;k++)bnsBusStep(me,.05);
  if(B.nitT!==0){console.log('FAIL: ニトロが切れない');process.exit(1);}
  B.vx=B.vy=0;B.x=BNS_CX;B.y=BNS_CY;
  for(let k=0;k<12;k++)bnsBusStep(me,.05);
  const spB=Math.hypot(B.vx,B.vy);
  if(!(spB<=BUS_SP+1)){console.log('FAIL: ニトロが切れても速いまま '+Math.round(spB));process.exit(1);}
  bnsStick(0,0);
  /* まとめて轢いた時だけ光る */
  B.flashT=0;B.flashCd=0;me.zombies.length=0;
  for(let k=0;k<20;k++){const z9=mkZ(zSpec(0,.02,1),200);z9.ln=0;z9.px=B.x;z9.py=B.y;z9.hp=1;me.zombies.push(z9);}
  for(let k=0;k<3;k++){for(const z of me.zombies){z.px=B.x;z.py=B.y;}bnsBusStep(me,.05);}
  if(!(B.flashT>0)){console.log('FAIL: まとめて轢いても画面が抜けない');process.exit(1);}
  try{drawBnsRush(ctx,me);}catch(e){
   console.log('FAIL: 走っている感じの描画で例外 '+e.message);process.exit(1);}
  console.log('🔥ニトロ: 轢いて溜まる/満タンだけ撃てる/速さ'+Math.round(spN)+'→'+Math.round(spB)
   +'/使用中は溜まらない/まとめ轢きで白抜き OK');}
 /* ⑬ 🚗**壊せる障害物**(2026-08-02(37))=置いてある/道の外にはみ出さない/当たると壊れて減速する */
 if(BOBJ.length<30){console.log('FAIL: 壊せる障害物が足りない '+BOBJ.length+'個');process.exit(1);}
 {let outN=0;
  for(const o of BOBJ){const u8=clamp(projPath(o.x,o.y)/LANES[0].len,0,1);
   const w8=bnsCorrW(u8),dd8=Math.abs(bnsLaneD(o.x,o.y));
   if(dd8>w8+10)outN++;}
  if(outN){console.log('FAIL: 障害物が道の外にはみ出している '+outN+'個');process.exit(1);}}
 {const m8=G.players[0],B8=m8.bus,o8=BOBJ.find(o=>!o.dead);
  B8.x=o8.x;B8.y=o8.y;B8.vx=0;B8.vy=-BUS_SP;m8.bbod.length=0;m8.bbodI=0;
  const sp0=Math.hypot(B8.vx,B8.vy);
  bnsBusStep(m8,.02);
  if(!o8.dead){console.log('FAIL: 障害物に当たっても壊れない');process.exit(1);}
  if(!(Math.hypot(B8.vx,B8.vy)<sp0)){console.log('FAIL: 障害物を壊しても減速しない');process.exit(1);}
  if(!m8.bbod.some(p=>p.dbr)){console.log('FAIL: 障害物を壊しても破片が飛ばない');process.exit(1);}
  /* ⭐ドラム缶は爆発して周りのゾンビを巻き込む */
  const di=BOBJ_K.findIndex(k=>k.bl),o9=BOBJ.find(o=>!o.dead&&o.k===di);
  if(di>=0&&o9){m8.zombies.length=0;
   for(let k=0;k<10;k++){const z8=mkZ(zSpec(0,.02,1),200);z8.ln=0;z8.px=o9.x+k*4;z8.py=o9.y;m8.zombies.push(z8);}
   B8.x=o9.x;B8.y=o9.y;B8.vx=0;B8.vy=-BUS_SP;
   bnsBusStep(m8,.02);
   if(!o9.dead){console.log('FAIL: ドラム缶が壊れない');process.exit(1);}
   if(m8.zombies.filter(z=>!z.dead).length>2){console.log('FAIL: ドラム缶が爆発して巻き込んでいない');process.exit(1);}}
  B8.vx=0;B8.vy=0;m8.zombies.length=0;}
 /* ⑭ 🧟**しがみつき**=倒しきれない敵に当たり続けると最高速が落ち、ニトロで振り払える */
 {const m7=G.players[0],B7=m7.bus;
  B7.grip=0;B7.nitT=0;B7.x=BNS_CX;B7.y=BNS_CY;B7.vx=0;B7.vy=0;m7.zombies.length=0;
  for(let k=0;k<14;k++){const z7=mkZ(zSpec(0,60,1),200);z7.ln=0;z7.px=B7.x;z7.py=B7.y;m7.zombies.push(z7);}
  for(let k=0;k<30;k++){for(const z of m7.zombies){z.px=B7.x;z.py=B7.y;}bnsBusStep(m7,.05);}
  if(!(B7.grip>.2)){console.log('FAIL: 倒しきれない敵に当たっても沈まない grip='+B7.grip.toFixed(2));process.exit(1);}
  B7.nitT=1;bnsBusStep(m7,.02);
  if(B7.grip!==0){console.log('FAIL: ニトロでしがみつきを振り払えない');process.exit(1);}
  B7.nitT=0;m7.zombies.length=0;
  for(let k=0;k<40;k++)bnsBusStep(m7,.05);
  if(B7.grip>.02){console.log('FAIL: 離れてもしがみつきが戻らない');process.exit(1);}}
 /* ⑮ 🏁⭐⭐**到着のムービー**(2026-08-02(42))。見るのは6つ:
    ①締め切りでムービーが始まる ②**その間はリザルトが出ない**(arr が立たない)
    ③門が必ず前に出る ④門を通り抜ける ⑤必ず終わって arr が立つ ⑥終わってから二度始まらない */
 {const m8=G.players[0],B8=m8.bus;
  B8.arr=0;B8.mov=0;B8.movT=0;B8.movP=0;B8.movGY=null;
  B8.x=BNS_CX;B8.y=BNS_CY;B8.vx=0;B8.vy=0;m8.zombies.length=0;
  B8.left=.01;bnsBusStep(m8,.05);
  if(!B8.mov){console.log('FAIL: 締め切りが来てもムービーが始まらない');process.exit(1);}
  if(B8.arr){console.log('FAIL: ムービーの前にリザルトへ行っている(arr が立っている)');process.exit(1);}
  if(!(B8.movGY<B8.y)){console.log('FAIL: 拠点の門がバスの前に出ていない');process.exit(1);}
  /* ⚠**必ず終わること**=物理ではなくスクリプトで走らせているので、止まる要素があってはいけない */
  let n8=0;
  while(B8.mov&&n8<400){bnsBusStep(m8,.05);n8++;}
  if(B8.mov){console.log('FAIL: 到着のムービーが終わらない');process.exit(1);}
  if(!B8.movP){console.log('FAIL: 門を通り抜けていない');process.exit(1);}
  if(!B8.arr){console.log('FAIL: ムービーが終わっても到着になっていない');process.exit(1);}
  if(!(B8.y<B8.movGY)){console.log('FAIL: 門の手前で止まっている');process.exit(1);}
  const y8=B8.y;bnsBusStep(m8,.05);
  if(B8.mov){console.log('FAIL: 到着の後にムービーがまた始まる');process.exit(1);}
  if(B8.y!==y8){console.log('FAIL: 到着の後もバスが動いている');process.exit(1);}
  console.log('🏁到着のムービー: '+BNS_ARR_T+'秒・門は'+BNS_ARR_D+'px先・通過してからリザルト OK');}
 /* ⑯ 🧱⭐**出発点の後ろは壁**(2026-08-02(42)ユーザー「バスで行けないように普通に壁にして」)。
    ⚠**絵(drawBnsEnds)と当たり(bnsRoadFit)が同じ BNS_WALLY から出ていること**=別々だと見えない壁になる。 */
 {if(!(BNS_WALLY>BNS_STARTY)){console.log('FAIL: 壁が出発点より前にある');process.exit(1);}
  const f8=bnsRoadFit(BNS_CX,BNS_WALLY+300,BUS_CL);
  if(!f8){console.log('FAIL: 出発点の後ろへバスで行けてしまう');process.exit(1);}
  if(!(f8[1]<BNS_WALLY)){console.log('FAIL: 壁の押し戻し先が壁の中');process.exit(1);}
  /* ⚠**端も塞がっていること**=道幅ぶんだけ塞ぐと森の縁を回り込んで裏へ出られる */
  for(const x8 of [120,MAPW-120])if(!bnsRoadFit(x8,BNS_WALLY+300,BUS_CL)){
   console.log('FAIL: 壁の端(x='+x8+')から裏へ回り込める');process.exit(1);}
  /* ⚠**手前(出発点そのもの)は今までどおり自由** */
  if(bnsRoadFit(BNS_CX,BNS_STARTY,BUS_CL)){console.log('FAIL: 出発点が走れなくなった');process.exit(1);}
  console.log('🧱出発点の後ろの壁: y='+BNS_WALLY+'(出発点の'+(BNS_WALLY-BNS_STARTY)+'px後ろ)・幅いっぱい OK');}
 backTitle();
 /* ⑨⭐**導線**(2026-08-02(3)ユーザー「障害物というかゾンビの導線が欲しい」)。見るのは3つ:
    a)関所で通路が本当に絞れている b)敵が通路からはみ出さない c)壁が通路の中に立っていない
    ⚠ c)が壊れると「壁の中をゾンビが歩く」=絵と挙動がずれる(別々に持つと必ず起きる) */
 let nwall=0,ntree=0;
 META.stg=0;setDiff=BNS_D;startSolo();bnsPreSkip();
 {const m5=G.players[0];
  nwall=BBLD.length;ntree=BTREE.length;/* ⚠タイトルへ戻すと消えるので、ここで控えておく */
  if(BBLD.length<60){console.log('FAIL: 建物が少なすぎる '+BBLD.length);process.exit(1);}
  if(BTREE.length<300){console.log('FAIL: 森が少なすぎる '+BTREE.length);process.exit(1);}
  for(const g of BNS_GATE)if(!(bnsCorrW(g)<BNS_OFF*.6)){
   console.log('FAIL: 関所で通路が絞れていない '+g+'→'+bnsCorrW(g));process.exit(1);}
  if(!(bnsCorrW(.005)>BNS_OFF*.95)){console.log('FAIL: 関所以外まで絞れている');process.exit(1);}
  /* ⚠**建物も木も通路の中に立っていないこと**=ここが崩れると「壁の中をゾンビが歩く」。
     ⚠⚠**建物は「道の通路」だけで見る**(2026-08-02(40))=探索場(出発点の広場)には
       **わざと廃墟を建てる**ので、広場まで混ぜると正しい配置が落ちる。
       ⭐木は広場にも生やさない(bnsFreeAt)ので今までどおり。⚠この検査ファイルは丸ごと
       テンプレート文字列なので、コメントにバッククォートを書かないこと(3度目)。 */
  for(const b of BBLD)if(!bnsCorrFree(b.x,b.y,0)){
   console.log('FAIL: 建物が道の通路の中に立っている');process.exit(1);}
  for(const t of BTREE)if(!bnsFreeAt(t.x,t.y,0)){
   console.log('FAIL: 木が通路の中に立っている');process.exit(1);}
  /* ⚠⚠**タレット置き場は 2026-08-02(24) に丸ごと外した**(走り抜ける面になったため)。
     ⭐**1つも残っていないこと**を見る(書き戻しの検出)。 */
  {for(const s of SLOTS)if(s[0]>-9000){
    console.log('FAIL: 道中にタレット置き場が残っている');process.exit(1);}}
  /* ⑪ 🏚⭐**入れる廃墟**(2026-08-02(12) / 壁の当たりは(40))。見るのは7つ:
     ①数がある ②**道の通路**の中に立っていない ③タレット置き場を兼ねていない(=枠に化けていない)
     ④入口の前に立つ点が建物の外で、**広場の中心(探索場)の側**を向いている ⑤棟どうしが重なっていない
     ⭐⑥**壁に当たる**(すり抜けない) ⑦**中は空洞で、入口からだけ入れる**(⚠バスは入れない) */
  /* ⚠**bnsMgN() 棟ぴったり建っていること**(2026-08-02(40)に「8以上」から締めた)=
     「8以上」で見ていたせいで**毎回1棟建っていないのに気づけなかった**。
     ⚠**棟数は面ごと**(2026-08-02(43)に9→3)=1面はミニゲーム3個。 */
  {if(BENT.length<bnsMgN()){console.log('FAIL: 入れる廃墟が少なすぎる '+BENT.length+'/'+bnsMgN()+'棟');process.exit(1);}
   const kn={};for(const b of BENT)kn[b.ek]=(kn[b.ek]||0)+1;
   if(Object.keys(kn).length<ENT_K.length){
    console.log('FAIL: 入れる廃墟の種類が偏っている '+JSON.stringify(kn));process.exit(1);}
   /* 局所座標(l=長さ方向 / w=幅方向。⚠ds を畳んだ後=入口は必ず +w 側)から世界の点を出す */
   const eLoc=(b,l,w)=>[b.x+b.ca*l-b.sa*w*b.ds, b.y+b.sa*l+b.ca*w*b.ds];
   const PW=14;/* 歩く人くらいの当たり(⚠次の段=主人公が入る時の目安) */
   for(const b of BENT){
    if(!b.en||b.rf){console.log('FAIL: 入れる廃墟がタレット置き場を兼ねている');process.exit(1);}
    if(!bnsCorrFree(b.x,b.y,0)){
     console.log('FAIL: 入れる廃墟が道の通路の中に立っている');process.exit(1);}
    for(let i=0;i<ECO_BASE;i++){const s=SLOTS[i];if(!s||s[0]<-9000)continue;
     if(Math.abs(s[0]-b.x)<2&&Math.abs(s[1]-b.y)<2){
      console.log('FAIL: 入れる廃墟が建設マスになっている');process.exit(1);}}
    /* ⚠**入口の前の点は建物の外**=壁の上だと近づいたかの判定に使えない */
    if(dist(b.dx,b.dy,b.x,b.y)<=b.W){console.log('FAIL: 入口の前の点が建物の中');process.exit(1);}
    /* ⚠⚠**広場の中心の側を向いていること**(2026-08-02(40)に「街路の側」から入れ替えた)=
       探索場は出発点の広場なので、入口が外を向いていると裏へ回らされる。 */
    if(!(dist(b.dx,b.dy,BNS_CX,BNS_STARTY)<dist(b.x,b.y,BNS_CX,BNS_STARTY))){
     console.log('FAIL: 入れる廃墟の入口が広場の中心と反対を向いている');process.exit(1);}
    /* ⭐⑥⑦**壁の当たり**。⚠**この4つが揃って初めて「入る」が成立する** */
    const cb=b.cb,lc=(cb[0]+cb[1])/2,wc=(cb[2]+cb[3])/2;
    const pWall=eLoc(b,lc,cb[2]+ENT_TH/2);/* 奥の壁のど真ん中 */
    const pIn=eLoc(b,lc,wc);              /* 中(空洞) */
    const pDoor=eLoc(b,b.ex,cb[3]);       /* 入口の面のど真ん中 */
    if(!bnsEntFit(pWall[0],pWall[1],PW)){
     console.log('FAIL: 廃墟の壁をすり抜ける('+ENT_K[b.ek].n+')');process.exit(1);}
    if(bnsEntFit(pIn[0],pIn[1],PW)){
     console.log('FAIL: 廃墟の中が空洞になっていない('+ENT_K[b.ek].n+')');process.exit(1);}
    if(bnsEntFit(pDoor[0],pDoor[1],PW)){
     console.log('FAIL: 入口が開いていない('+ENT_K[b.ek].n+')');process.exit(1);}
    if(bnsEntFit(b.dx,b.dy,PW)){
     console.log('FAIL: 入口の前に立てない('+ENT_K[b.ek].n+')');process.exit(1);}
    /* ⭐⭐**「入る」が本当に成立するか**=入口の前の点から中まで**歩かせてみる**。
       ⚠点を1つずつ見るだけでは足りない=入口が開いていても、そこへ至る途中で
       壁の角に引っかかると入れない(押し戻しは滑らせるので、詰まったら止まる)。 */
    {let px9=b.dx,py9=b.dy,stuck=0;
     for(let k=0;k<400;k++){
      const ddx=pIn[0]-px9,ddy=pIn[1]-py9,dd9=Math.hypot(ddx,ddy);
      if(dd9<8)break;
      const st9=Math.min(8,dd9);
      let nx9=px9+ddx/dd9*st9,ny9=py9+ddy/dd9*st9;
      const f9=bnsEntFit(nx9,ny9,PW);if(f9){nx9=f9[0];ny9=f9[1];}
      if(Math.hypot(nx9-px9,ny9-py9)<.5){stuck=1;break;}
      px9=nx9;py9=ny9;}
     if(stuck||dist(px9,py9,pIn[0],pIn[1])>20){
      console.log('FAIL: 入口から中へ歩いて入れない('+ENT_K[b.ek].n+')');process.exit(1);}}
    /* ⚠⚠**バスは入口をくぐれないし中にも居られない**=くぐれると屋根の下で画面から消える */
    if(!bnsEntFit(pDoor[0],pDoor[1],BUS_CL)){
     console.log('FAIL: バスが廃墟の入口をくぐれてしまう('+ENT_K[b.ek].n+')');process.exit(1);}
    if(!bnsEntFit(pIn[0],pIn[1],BUS_CL)){
     console.log('FAIL: バスが廃墟の中に居られる('+ENT_K[b.ek].n+')');process.exit(1);}
    /* ⭐**当たりが bnsRoadFit(=バスが使う唯一の入口)から引けていること**。
       ⚠ここが繋がっていないと、当たりを作っただけで**バスは今までどおりすり抜ける**。 */
    if(!bnsRoadFit(pIn[0],pIn[1],BUS_CL)){
     console.log('FAIL: バスが広場の廃墟をすり抜ける('+ENT_K[b.ek].n+')');process.exit(1);}
    try{drawEntBld(ctx,b);}catch(e){
     console.log('FAIL: 入れる廃墟の描画で例外 '+e.message);process.exit(1);}}
   /* ⚠**広場のうち廃墟の無い所は今までどおり自由**=当たりを足したせいで
      「何も無いのに走れない広場」になっていないか(乗り物を地形で止める面の掟) */
   if(bnsRoadFit(BNS_CX,BNS_STARTY,BUS_CL)){
    console.log('FAIL: 出発点の広場の真ん中が走れない');process.exit(1);}
   for(let i=0;i<BENT.length;i++)for(let j=i+1;j<BENT.length;j++)
    if(dist(BENT[i].x,BENT[i].y,BENT[j].x,BENT[j].y)<220){
     console.log('FAIL: 入れる廃墟どうしが重なっている');process.exit(1);}
   if(!bnsEntNear(BENT[0].dx,BENT[0].dy,300)){
    console.log('FAIL: bnsEntNear が一番近い廃墟を返さない');process.exit(1);}
   console.log('🏚入れる廃墟: '+BENT.length+'棟 '+ENT_K.map(k=>k.n+'x'+(kn[ENT_K.indexOf(k)]||0)).join('/')+' 壁の当たりOK');}
  /* ⭐**森はバスも通れない**(2026-08-02(8))。見るのは3つ:
     ①関所でもバスが通れる幅がある ②森の中に置いたバスが街路へ押し戻される
     ③街路の真ん中は押し戻されない(=見えない壁が通路の中に無い) */
  if(!(BNS_GATW-BUS_CL>40)){
   console.log('FAIL: 関所がバスの通れない狭さ('+BNS_GATW+'/'+BUS_CL+')');process.exit(1);}
  /* ⚠⚠**見えない壁を作らない**=バスが止まる所より手前に木が生えていること。
     バスの端(中心+BUS_R)が木の生え際(空き地の縁+木の半径)を越えていれば、
     「何もない所で止められた」にはならない。 */
  if(!(BUS_R-BUS_CL>=26)){
   console.log('FAIL: 木の手前で見えない壁に当たる(BUS_R'+BUS_R+' - BUS_CL'+BUS_CL+')');process.exit(1);}
  /* ⚠⚠**掟の検査=「地面が見えている所は必ず走れる」**(2026-08-02(11)ユーザー「この2箇所で突っかかる」)。
     木も建物も無いのにバスが入れない場所があると、それが全部「変な判定」になる。
     ⚠バスの体(半径 BUS_R)が覆う範囲までは許す=中心が入れなくても絵の上では届いている。 */
  {let bad9=0,bx9=0,by9=0;
   const near9=(x,y)=>{
    if(!TRE_CELL)return false;
    const i=clamp(Math.floor(x/TRE_CS),0,TRE_GX-1),j=clamp(Math.floor(y/TRE_CS),0,TRE_GY-1);
    for(let jj=Math.max(0,j-1);jj<=Math.min(TRE_GY-1,j+1);jj++)
     for(let ii=Math.max(0,i-1);ii<=Math.min(TRE_GX-1,i+1);ii++){
      const cl=TRE_CELL[ii+jj*TRE_GX];if(!cl)continue;
      /* ⚠**「この1点が緑か」ではなく「この辺りが森か」で見る**=木と木の間には必ず小さな隙間があり、
         そこを1つずつ拾うと本物の空き地と区別が付かない(実際に隅の隙間で落ちた) */
      for(const t of cl){const dx=t.x-x,dy=t.y-y,r9=t.r+50;if(dx*dx+dy*dy<r9*r9)return true;}}
    return false;};
   /* ⚠**出発点の後ろ(壁の向こう)は見ない**(2026-08-02(42))=そこは**絵でも壁**なので
      「何も無いのに走れない」には当たらない。⭐掟は「地面が見えている所は必ず走れる」であって、
      壁が描いてある所まで走れという話ではない。 */
   for(let x=220;x<MAPW-220&&!bad9;x+=140)for(let y=220;y<Math.min(MAPH-220,BNS_WALLY)&&!bad9;y+=140){
    if(near9(x,y))continue;
    let inb=0;
    for(const b of BBLD){const dx=b.x-x,dy=b.y-y,r8=b.rr+50;if(dx*dx+dy*dy<r8*r8){inb=1;break;}}
    if(inb)continue;
    const f9=bnsRoadFit(x,y,BUS_CL);
    if(f9&&dist(x,y,f9[0],f9[1])>BUS_R){bad9=1;bx9=x;by9=y;}
   }
   if(bad9){console.log('FAIL: 木も建物も無いのにバスが入れない所がある ('+Math.round(bx9)+','+Math.round(by9)+')');process.exit(1);}}
  {const b5=m5.bus;
   b5.x=400;b5.y=400;b5.vx=0;b5.vy=0;bnsStick(0,0);
   bnsBusStep(m5,.05);
   if(bnsRoadFit(b5.x,b5.y,BUS_CL)){console.log('FAIL: バスが森の中に居座れる');process.exit(1);}
   const p5=pathPos(LANES[0].len*.5,0);b5.x=p5[0];b5.y=p5[1];b5.vx=0;b5.vy=0;
   if(bnsRoadFit(b5.x,b5.y,BUS_CL)){console.log('FAIL: 街路の真ん中なのに通れない扱いになる');process.exit(1);}
   b5.x=BNS_CX;b5.y=BNS_CY;
   if(bnsRoadFit(b5.x,b5.y,BUS_CL)){console.log('FAIL: 拠点の中なのに通れない扱いになる');process.exit(1);}}
  nextWave();
  for(let k=0;k<1200&&G.tide.pool.length&&m5.zombies.length<300;k++)tideStep(.05);
  for(let k=0;k<60;k++)campStep(m5,.05,1);
  /* ⚠**最後に「ほぼ止まった1コマ」を1回入れてから測る**=歩いた分だけ関所が狭まるので、
     0.05秒ぶん歩いた直後の横ずれは最大6ほど古い値のまま(次のコマで必ず切られる)。
     ⚠**画面に出る位置は切ったあとの値で出している**ので、見えている絵は常に通路の中。
     ⚠この検査ファイルは丸ごとテンプレート文字列なので、コメントにバッククォートを書かないこと。 */
  campStep(m5,.001,1);
  let wo=0;for(const z of m5.zombies){if(z.dead||z.ln==null)continue;
   const pl=LANES[z.ln].len,w5=bnsCorrW(clamp(z.d/pl,0,1));
   if(Math.abs(z.off||0)>w5+1)wo++;}
  if(wo){console.log('FAIL: 通路からはみ出した敵が'+wo+'体');process.exit(1);}}
 backTitle();
 /* ⑩⭐**着くまで湧きが絶えない**(2026-08-02(24))=距離で終わる面なので、
    用意した体数が尽きても写し(bnsTpl)から積み直されること。⚠着いたら積まないこと。 */
 META.stg=0;setDiff=BNS_D;startSolo();bnsPreSkip();
 {nextWave();
  const T=G.tide,m6=G.players[0];
  if(!T.bnsTpl||T.bnsTpl.length<50){console.log('FAIL: 湧きの写しが用意されていない');process.exit(1);}
  T.pool.length=0;T.lead=0;
  tideStep(.05);
  if(!T.pool.length){console.log('FAIL: 体数が尽きたのに補充されない(道が空になる)');process.exit(1);}
  m6.bus.arr=1;T.pool.length=0;
  tideStep(.05);
  if(T.pool.length){console.log('FAIL: 到着した後も湧きが積まれる');process.exit(1);}}
 backTitle();
 /* ⑦⭐⭐**この面に負けは無い**(2026-08-02(31)ユーザー「耐久力とかいらないね ダメージエフェクトもなし」)。
    見るのは2つ: a)すれ違っても b)群れに埋もれても**1も削られない**+**被弾の演出も出ない** */
 META.stg=0;setDiff=BNS_D;startSolo();bnsPreSkip();
 {const m4=G.players[0];m4.fx.length=0;m4.zombies.length=0;
  {const p4=pathPos(PLEN*.5,0);m4.bus.x=p4[0];m4.bus.y=p4[1];m4.bus.vx=0;m4.bus.vy=0;}
  for(let k=0;k<20;k++)m4.zombies.push(mkZ(zSpec(0,.02,1),PLEN+10));
  const c4=m4.core;
  campStep(m4,.05,1);
  if(m4.core!==c4){console.log('FAIL: すれ違った敵で耐久が減る '+(c4-m4.core));process.exit(1);}
  /* b)埋もれる=バスの真上に大量に置いて時間を進める */
  m4.zombies.length=0;m4.fx.length=0;
  for(let k=0;k<40;k++){const z4=mkZ(zSpec(0,4,1),PLEN*.5);z4.ln=0;z4.hp=z4.mhp=99999;
   z4.px=m4.bus.x;z4.py=m4.bus.y;m4.zombies.push(z4);}
  const c5=m4.core;
  for(let k=0;k<40;k++){for(const z of m4.zombies){z.px=m4.bus.x;z.py=m4.bus.y;}bnsBusStep(m4,.05);}
  if(m4.core!==c5){console.log('FAIL: 群れに埋もれて耐久が減っている '+(c5-m4.core));process.exit(1);}
  if(m4.dying||m4.dead){console.log('FAIL: 道中でバスが潰される');process.exit(1);}
  if(m4.fx.some(e=>e.k==='leak')){console.log('FAIL: 被弾の演出が出ている');process.exit(1);}
  console.log('🚌道中に負けは無い: すれ違いも埋もれも無傷 / 被弾の演出なし OK');}
 backTitle();
 /* ⑧⚠⚠**時間切れで必ず終わる**(2026-08-02(38)に「距離で終わる」から作り替え)。
    ⚠時間制なので怖いのは「終わらない」方だけ。⭐上へ倒し続けて実走し、締め切りで締まることを見る。
    ⚠**道は走り切れない長さ**にしたので、端に着いて終わったら**それは道が短すぎる**(それも捕まえる)。 */
 let bsec=0,bkil=0,bdmg=0;
 META.stg=0;setDiff=BNS_D;startSolo();bnsPreSkip();
 {const m3=G.players[0];
  nextWave();
  let done=0;
  for(let k=0;k<8000;k++){
   /* ⚠尺だけ見たいので耐久は落とさない。⭐**受けた量は数えておく**=きつさの目安 */
   bdmg+=(m3.coreMax-m3.core);m3.core=m3.coreMax;
   bnsStick(0,-1);/* 上(次の拠点)へ倒しっぱなし */
   try{gameStep(.05);}catch(e){console.log('FAIL: 🚌道中の実走で例外 '+e.message);process.exit(1);}
   bsec+=.05;
   if(m3.bus.arr&&m3.waveDone){done=1;break;}
  }
  bkil=m3.bus.kill||0;
  bnsStick(0,0);
  if(!done){console.log('FAIL: 時間切れになっても終わらない('+Math.round(bsec)+'秒)');process.exit(1);}
  /* ⚠**締め切りの前後で終わっていること**=長さは BNS_TIME で決まる(実走の刻みぶんの余裕を見る) */
  if(bsec<BNS_TIME-2||bsec>BNS_TIME+6){
   console.log('FAIL: 締め切りで終わっていない '+Math.round(bsec)+'秒(制限'+BNS_TIME+'秒)');process.exit(1);}
  /* ⚠⚠**道の端に着いてしまったら道が短すぎる**=「あと少しで着く」が見えると時間制の意味が消える */
  if(m3.bus.y<=BNS_GOALY+400){
   console.log('FAIL: 制限時間内に道の端まで着いてしまう(道が短すぎる) 残り'
    +Math.round((m3.bus.y-BNS_GOALY)/10)+'m');process.exit(1);}
  /* ⚡**スコアが積まれていること**=倒した数より必ず多い(段の倍率が乗るので) */
  if(!(m3.bus.score>0)){console.log('FAIL: スコアが積まれていない');process.exit(1);}
  if(!(m3.bus.score>=bkil)){console.log('FAIL: スコアが倒した数を下回っている '
   +Math.round(m3.bus.score)+'<'+bkil);process.exit(1);}}
 backTitle();
 /* ⑥ 本編は今までどおり(米粒の細工が漏れていないこと) */
 META.stg=0;setDiff=2;startSolo();
 {const m2=G.players[0];
  if(m2.bus){console.log('FAIL: 普通の面にバスが居る');process.exit(1);}
  m2.fx.length=0;
  const z2=mkZ(zSpec(0,1,3),200);m2.zombies.push(z2);
  killZ(m2,z2);
  if(!m2.fx.some(e=>e.k==='corpse')){console.log('FAIL: 普通の面で死体が出なくなっている');process.exit(1);}
  if(!m2.fx.some(e=>e.k==='txt')){console.log('FAIL: 普通の面で⚙️の文字が出なくなっている');process.exit(1);}}
 backTitle();
 META.sc=[D5.map(()=>1),D5.map(()=>1)];META.bcl=[];META.stg=0;setDiff=2;FXLV=fx0;
 console.log('🧟米粒ゾンビ: 盤面'+live.length+'体(上限'+BNS_CAP+')/描画は例外なし/跡は上限どまり(血'+me.bstn.length+'・肉'+me.bchk.length+'・轍'+me.btrk.length+')/'
  +'死体と1体ずつの文字と漏れの音を出さない/連なり×'+mx+'まで数えて途切れる/本編は今までどおり OK');
 console.log('  (🏚🌲地形: 建物'+nwall+'棟・木'+ntree+'本/関所'+BNS_GATE.length+'か所で道幅'+BNS_OFF+'→'+BNS_GATW
  +'/敵は道の外へ出ない/タレット置き場は無し)');
 console.log('  (🚌道中の尺: 上へ倒しっぱなしで '+Math.round(bsec)+'秒 で到着 / 轢いた数 '+bkil+'体'
  +'/ ⚠負けは無い面(耐久もダメージ演出も外した))');
}
/* ⭐⭐**必殺技の詠唱モーション**(2026-08-02)。⚠画面のボタンからしか動かないので直に呼んで見る。
   見るのは4つ: ①型が21人ぶん全部あって、体も得物も動く値が入っているか
   ②進みの曲線が「0から始まり・戻らず・.82で完成し・そこから先は止まる(タメ)」か
   ③実際に姿勢が変わるか(変換を記録する偽の画布で測る=**表の値だけ見ても動いた証拠にならない**)
   ④腕の上乗せ(UL_HA)が描き終わりに0へ戻っているか(戻し忘れると次のキャラの腕が曲がる) */
function checkUltMot(){
 const need=['now','heat','snipe','cast','slash','toss','bolt','mag','spin','nowS','nowB'];
 for(const k of need)if(!U_ULM[k]){console.log('FAIL: 詠唱モーションの型が無い '+k);process.exit(1);}
 for(const h of HEROES){
  const ui=hUiOf(h.id);if(ui<0){console.log('FAIL: 英雄が UNITS に無い '+h.id);process.exit(1);}
  const M=ulMotOf({mk:uMotK(ui)},h.id);
  const bd=Math.abs(M.ln)*12+Math.abs(M.ri)+Math.abs(M.fw);
  /* ⚠**据える型(狙撃)は動かないのが正解**(2026-08-02ユーザー指示「ジョルジは構えてるとき
     体は動かさないように」)=ここだけ逆向きに見る。⚠r0=1 も一緒に見る
     (0だと押した瞬間に構えを解いて立ち上がる) */
  if(M.still){
   if(bd!==0||M.sx!==1||M.sy!==1||M.tr){console.log('FAIL: 据える型なのに体が動く '+h.id);process.exit(1);}
   if(!(M.r0>=1)){console.log('FAIL: 据える型が構えを解いてしまう '+h.id);process.exit(1);}
  }
  else if(!(bd>2)){console.log('FAIL: 詠唱で体が動かない '+h.id);process.exit(1);}
  if(!(M.rc>1.05||Math.abs(M.ha||0)>.05||Math.abs(M.hy||0)>1)){
   console.log('FAIL: 詠唱で得物が動かない '+h.id);process.exit(1);}
 }
 if(ulKof(0)!==0){console.log('FAIL: 詠唱の進みが0から始まっていない');process.exit(1);}
 let pv=-1;
 for(let i=0;i<=100;i++){const v=ulKof(i/100);
  if(v<pv-1e-9){console.log('FAIL: 詠唱の進みが戻っている p='+(i/100));process.exit(1);}
  pv=v;}
 if(Math.abs(ulKof(.82)-1)>1e-6){console.log('FAIL: 詠唱が .82 で完成していない '+ulKof(.82));process.exit(1);}
 if(ulKof(.9)!==ulKof(1)){console.log('FAIL: 溜め終わりの一拍(タメ)で姿勢が止まっていない');process.exit(1);}
 /* 変換だけを記録する偽の画布 */
 const rec=L=>new Proxy({},{get:(t,k)=>{
  if(k==='canvas')return {};
  if(k==='createLinearGradient'||k==='createRadialGradient')return ()=>({addColorStop(){}});
  if(k==='measureText')return ()=>({width:10});
  if(k==='translate')return (x,y)=>{L.push('t'+(+x).toFixed(3)+','+(+y).toFixed(3));};
  if(k==='rotate')return a=>{L.push('r'+(+a).toFixed(4));};
  if(k==='scale')return (x,y)=>{L.push('s'+(+x).toFixed(4)+','+(+y).toFixed(4));};
  return typeof k==='string'?()=>{}:undefined;},set:()=>true});
 const sig=(id,p,r)=>{const L=[];
  drawUnit(rec(L),hUiOf(id),0,0,1,0,0,{ulm:1,ulp:p,ulr:r||0,chg:r||0,ct:1,mv:0});
  if(UL_HA||UL_HX||UL_HY){console.log('FAIL: 詠唱の腕の上乗せが戻っていない '+id);process.exit(1);}
  return L.join('|');};
 let still=0;
 for(const h of HEROES){
  const M=ulMotOf({mk:uMotK(hUiOf(h.id))},h.id);
  if(M.still){still++;continue;}/* ⚠据える型は「変わらない」のが正解なので姿勢の比べ方が逆になる */
  const a=sig(h.id,0),b=sig(h.id,.5),c=sig(h.id,1),d=sig(h.id,-1,.9);
  if(a===b||b===c){console.log('FAIL: 詠唱の途中で姿勢が変わらない '+h.id);process.exit(1);}
  if(c===d){console.log('FAIL: 発射で姿勢が抜けていない '+h.id);process.exit(1);}
  if(sig(h.id,.9)!==sig(h.id,1)){console.log('FAIL: タメの間に姿勢が動いている '+h.id);process.exit(1);}
 }
 console.log('必殺技の詠唱モーション: 型'+need.length+'種 / 英雄'+(HEROES.length-still)+'人が「構え→タメ→発射」で姿勢が変わる'
  +' / 据える型(狙撃)'+still+'人は構えたまま動かない OK');
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
/* 🎒⭐⭐⭐**走る前の流れ**(2026-08-02(43)ユーザー決定の1試合の流れ①〜④)。見るのは8つ:
   ①startSolo の直後は「走る前」で止まっていて、**敵も残り時間も波も1つも動かない**
   ②選択画面に棟がミニゲームの数だけ並ぶ ③**選んでも棟は消えない**(1面は3種しかないため)
   ④棟を押すとミニゲームが始まり、撃ち切ると物資が入って回数が1つ減る
   ⑤3回で乗り込みムービー→強化画面へ必ず進む(**ムービーは必ず終わる**)
   ⑥強化は物資が足りる時だけ買えて、上限で止まる
   ⑦準備OKで**初めて波が始まり**、寄りが運転用(.62)に戻る
   ⑧強化は**この試合かぎり**(次の試合に残らない=定数ではなくバスの持ち物に入れてある)
   ⚠この検査ファイルは丸ごとテンプレート文字列なので、コメントにバッククォートを書かないこと。 */
function checkBnsFlow(){
 META.sc=[D5.map(()=>1),D5.map(()=>1)];META.sclr=[1,1];
 /* ⚠**永続の分は先にまっさらに戻す**(2026-08-02(44))=前の検査で買った物が残っていると
    「買えていない」「値段が減らない」が全部すり抜ける。 */
 META.bres=[0,0,0];META.bup={};META.beq={};
 META.stg=0;setDiff=BNS_D;startSolo();
 const me=G.players[0];
 if(!G.bpre){console.log('FAIL: 走る前の流れに入っていない');process.exit(1);}
 if(G.bpre.st!=='sel'){console.log('FAIL: 最初が選択画面でない '+G.bpre.st);process.exit(1);}
 /* ① 何も動かない */
 {const t0=me.bus.left;
  for(let k=0;k<40;k++)gameStep(.05);
  if(me.zombies.length){console.log('FAIL: 走る前なのに敵が湧いている '+me.zombies.length);process.exit(1);}
  if(me.bus.left!==t0){console.log('FAIL: 走る前なのに残り時間が減っている');process.exit(1);}
  if(G.wave>0){console.log('FAIL: 走る前なのに波が始まっている');process.exit(1);}}
 /* ② 選択肢 */
 if(G.bpre.pick.length!==bnsMgN()){
  console.log('FAIL: 選択肢の棟数が違う '+G.bpre.pick.length+'/'+bnsMgN());process.exit(1);}
 fitCanvas();
 try{drawBnsPre(ctx,me,1.2);}catch(e){console.log('FAIL: 選択画面の描画で例外 '+e.message);process.exit(1);}
 /* 🏠⚠⚠**光が段のたびに出ること**(2026-08-02(48)ユーザー「光が見えなかった。しかも初回の1回以降
    光が何も見えない」)=**押した時の光の時計(litT)を、見せる光にも使っていた**のが原因だった。
    ⭐**1段目と2段目の両方で、順番の数だけ光ること**を数える。 */
 {const hb=(G.bpre.pick.filter(b=>(b.ek|0)===2))[0];
  if(hb){
   bnsMgStart(G.bpre,hb);
   const M=G.bpre.mg;
   const cnt=()=>{let n=0,pv=-1;
    for(let k=0;k<600&&M.ph==='show';k++){bnsMgStep(G.bpre,.02);if(M.lit>=0&&M.lit!==pv)n++;pv=M.lit;}
    return n;};
   const a1=cnt();
   if(a1<M.seq.length){console.log('FAIL: 🏠記憶の1段目で光る回数が足りない '+a1+'/'+M.seq.length);process.exit(1);}
   const R=bnsMmRects(cv.width,cv.height);
   for(const v of M.seq)bnsMgTap(G.bpre,R[v].x+4,R[v].y+4);
   for(let k=0;k<60&&M.ph!=='show';k++)bnsMgStep(G.bpre,.05);
   const a2=cnt();
   if(a2<M.seq.length){console.log('FAIL: 🏠記憶の2段目で光らない '+a2+'(1段目は'+a1+')');process.exit(1);}
  }
  G.bpre.mg=null;G.bpre.st='sel';}
 /* ③④⭐**3回遊ぶ**。⚠⚠**3種とも別の遊び**なので、種類ごとに上手く遊んでやること
    (2026-08-02(45)ユーザー「全部同じミニゲームはやめて」)。⭐棟は左から順に選ぶ=3種とも通る。 */
 /* 1回ぶんを上手にこなす。⚠**盤面(mg)が消えるまで押し切らない**=締めの一拍を見たいので */
 const mgPlay=()=>{
  for(let n=0;n<80;n++){
   const M=G.bpre.mg;if(!M||M.endT>0)break;
   if(M.kind===1){M.bx=M.cx;bnsMgTap(G.bpre,0,0);}
   else if(M.kind===2){
    /* 🏠記憶=**見せている間は押せない**ので、まず見せ終わるまで時間を進めてから順に押す */
    for(let g=0;g<200&&M.ph!=='in';g++)bnsMgStep(G.bpre,.05);
    if(M.ph!=='in'){console.log('FAIL: 🏠記憶が押す番にならない');process.exit(1);}
    const R=bnsMmRects(cv.width,cv.height);
    const sq=M.seq.slice();
    for(const v of sq){bnsMgTap(G.bpre,R[v].x+4,R[v].y+4);}
    /* 段が上がる間(ok)も時間で進む */
    for(let g=0;g<40&&M.ph==='ok'&&!(M.endT>0);g++)bnsMgStep(G.bpre,.05);
   }else{M.pos=M.tgt;bnsMgTap(G.bpre,0,0);}
  }
 };
 let tot=0,kinds=[];
 for(let r=0;r<BNS_MG_T;r++){
  const b=G.bpre.pick[r%G.bpre.pick.length];
  bnsPreTap(0,0,b.x,b.y);
  if(G.bpre.st!=='mini'){console.log('FAIL: 棟を押してもミニゲームが始まらない');process.exit(1);}
  if((G.bpre.mg.kind|0)!==(b.ek|0)){
   console.log('FAIL: 棟の種類とミニゲームが食い違う');process.exit(1);}
  kinds.push(BMG_K[G.bpre.mg.kind].n);
  try{drawBnsPre(ctx,me,1.2);}catch(e){
   console.log('FAIL: ミニゲームの描画で例外('+BMG_K[G.bpre.mg.kind].n+') '+e.message);process.exit(1);}
  mgPlay();
  if(!G.bpre.mg){console.log('FAIL: 締めの前にミニゲームが消えている');process.exit(1);}
  if(!(G.bpre.mg.pts>0)){
   console.log('FAIL: 上手く遊んでも点が入らない('+BMG_K[G.bpre.mg.kind].n+')');process.exit(1);}
  try{drawBnsPre(ctx,me,1.2);}catch(e){console.log('FAIL: 締めの描画で例外 '+e.message);process.exit(1);}
  for(let k=0;k<120&&G.bpre.st==='mini';k++)gameStep(.05);
  if(G.bpre.st==='mini'){console.log('FAIL: ミニゲームが終わらない');process.exit(1);}
  const t2=G.bpre.res[0]+G.bpre.res[1]+G.bpre.res[2];
  if(!(t2>tot)){console.log('FAIL: 遊んでも物資が増えない '+t2);process.exit(1);}
  tot=t2;
  if(G.bpre.left!==BNS_MG_T-1-r){
   console.log('FAIL: 残り回数が減っていない '+G.bpre.left);process.exit(1);}
  if(G.bpre.pick.length!==bnsMgN()){console.log('FAIL: 選んだ棟が消えている');process.exit(1);}
 }
 /* ⚠**3種とも別の遊びであること**(同じ物を3つ並べない=ユーザー決定) */
 if(new Set(kinds).size!==bnsMgN()){
  console.log('FAIL: 3棟のミニゲームが同じ物になっている '+kinds.join('/'));process.exit(1);}
 /* ⑤ 乗り込みムービー */
 if(G.bpre.st!=='board'){console.log('FAIL: 3回終わっても乗り込みへ進まない '+G.bpre.st);process.exit(1);}
 try{drawBnsPre(ctx,me,1.2);}catch(e){console.log('FAIL: 乗り込みの描画で例外 '+e.message);process.exit(1);}
 for(let k=0;k<200&&G.bpre&&G.bpre.st==='board';k++)gameStep(.05);
 if(!G.bpre||G.bpre.st!=='up'){
  console.log('FAIL: 乗り込みムービーが強化画面で終わらない');process.exit(1);}
 try{drawBnsPre(ctx,me,1.2);}catch(e){console.log('FAIL: 強化画面の描画で例外 '+e.message);process.exit(1);}
 /* ⑥ 強化(🔧性能の枠)。⚠**鉄材だけ0にして「足りないと買えない」も一緒に見る** */
 {const Q=G.bpre;
  if((Q.tab|0)!==0){console.log('FAIL: 最初が🔧性能の枠でない');process.exit(1);}
  const R=bnsUpRects(cv.width,cv.height,0);
  Q.res[0]=9999;Q.res[1]=0;Q.res[2]=9999;
  bnsUpTap(Q,R[0].x+4,R[0].y+4);
  if((Q.up.sp|0)!==1){console.log('FAIL: 強化が買えていない');process.exit(1);}
  if(Q.res[0]>=9999){console.log('FAIL: 買っても物資が減らない');process.exit(1);}
  /* ⚠**買った瞬間からバスに効くこと**(強化画面でも絵と当たりが変わる) */
  if(!(me.bus.spMx>BUS_SP)){console.log('FAIL: 買っても その場でバスに効かない');process.exit(1);}
  for(let k=0;k<12;k++)bnsUpTap(Q,R[0].x+4,R[0].y+4);
  if((Q.up.sp|0)!==BUP[0].mx){console.log('FAIL: 強化の段が上限で止まらない '+Q.up.sp);process.exit(1);}
  bnsUpTap(Q,R[2].x+4,R[2].y+4);
  if((Q.up.ram|0)!==0){console.log('FAIL: 物資が足りないのに強化が買える');process.exit(1);}
  /* ⚔装備の枠=つまみで切り替わる/買い切り/2度は買えない/絵が例外なく描ける */
  bnsUpTap(Q,R.tab[1].x+4,R.tab[1].y+4);
  if((Q.tab|0)!==1){console.log('FAIL: ⚔装備の枠に切り替わらない');process.exit(1);}
  {const R2=bnsUpRects(cv.width,cv.height,1);
   if(R2.length!==BEQ.length){console.log('FAIL: 装備の札の数が違う '+R2.length);process.exit(1);}
   for(let i=0;i<BEQ.length;i++){Q.res[BEQ[i].r]=9999;bnsUpTap(Q,R2[i].x+4,R2[i].y+4);}
   for(const q of BEQ)if(!Q.eq[q.k]){console.log('FAIL: 装備が買えていない '+q.k);process.exit(1);}
   const r0=Q.res[BEQ[0].r];bnsUpTap(Q,R2[0].x+4,R2[0].y+4);
   if(Q.res[BEQ[0].r]!==r0){console.log('FAIL: 同じ装備を2度買える');process.exit(1);}}
  /* ⚠装備の効き目がバスに入っていること(絵と当たりの両方がこれを見る) */
  if(!(me.bus.bladeR>0&&me.bus.flame&&me.bus.zap&&me.bus.siren)){
   console.log('FAIL: 装備の効き目がバスに入っていない');process.exit(1);}
  try{drawBnsPre(ctx,me,1.2);}catch(e){console.log('FAIL: ⚔装備の枠の描画で例外 '+e.message);process.exit(1);}
  try{drawBus(ctx,me,1.2);}catch(e){console.log('FAIL: 装備を付けたバスの描画で例外 '+e.message);process.exit(1);}
  bnsUpTap(Q,R.go.x+4,R.go.y+4);}
 /* ⑦ 出発 */
 if(G.bpre){console.log('FAIL: 準備OKでも走る前の流れが終わらない');process.exit(1);}
 if(!(G.wave>0)){console.log('FAIL: 準備OKで波が始まらない');process.exit(1);}
 if(!(me.bus.spMx>BUS_SP)){console.log('FAIL: 強化が最高速に効いていない '+me.bus.spMx);process.exit(1);}
 if(!(CAM&&Math.abs(CAM.zm-.62)<1e-6)){
  console.log('FAIL: 運転の寄りに戻っていない '+(CAM?CAM.zm:'なし'));process.exit(1);}
 /* ⚠**設置猶予(BNS_LEAD)ぶんは湧かない**ので、3秒では足りない(実際に落ちた) */
 for(let k=0;k<200;k++){bnsStick(0,-1);gameStep(.05);}
 bnsStick(0,0);
 if(!me.zombies.length){console.log('FAIL: 走り出しても敵が湧かない');process.exit(1);}
 const sp1=me.bus.spMx,res1=META.bres.slice();
 backTitle();
 /* ⑧⭐⭐**永続**(2026-08-02(44)ユーザー決定)=段も装備も余った物資も次の試合へ持ち越す */
 META.stg=0;setDiff=BNS_D;startSolo();
 {const b2=G.players[0].bus;
  if(Math.abs(b2.spMx-sp1)>1e-6){
   console.log('FAIL: 強化の段が次の試合に残っていない '+b2.spMx+'/'+sp1);process.exit(1);}
  if(!(b2.bladeR>0)){console.log('FAIL: 装備が次の試合に残っていない');process.exit(1);}
  for(let i=0;i<3;i++)if(META.bres[i]!==res1[i]){
   console.log('FAIL: 余った物資が次の試合に残っていない');process.exit(1);}
  /* ⚠**初期化した人には残らないこと**(metaResetAll に書き忘れると残る) */
  metaResetAll();
  if((META.bres[0]|0)||Object.keys(META.bup).length||Object.keys(META.beq).length){
   console.log('FAIL: 初期化してもバスの強化が残っている');process.exit(1);}}
 bnsPreSkip();backTitle();
 META.stg=0;setDiff=2;
 console.log('🎒走る前の流れ: 選択'+bnsMgN()+'棟 → '+kinds.join('/')+'(物資 計'+tot
  +') → 乗り込み → 🔧性能'+BUP.length+'項目/⚔装備'+BEQ.length+'種(最高速 '+BUS_SP+'→'+Math.round(sp1)
  +') → 出発 / 永続で持ち越す OK');
}
checkStrikes();
checkSup();
checkTeam();
checkGacha();
checkHero();
checkUltMot();
checkBonus();
checkRice();
checkCam();
checkBnsFlow();
checkTrain();
checkRpg();
checkProgress();
checkMetaReset();
checkEvo();
checkHook();
checkBite();
checkFx2();
checkGachaFx();
checkTwFx();
checkZLook();
checkBus();
checkHeroFx();
checkPixel();
checkULook();
checkHeroLook();
checkTwLook();
checkPreview();
checkSfxGain();
checkTut();
checkTutLock();
checkResume();
checkResumeFarm();
checkTwNew();
checkPerUp();
checkLabSteps();
checkStart0();checkLabMul();checkUChg();checkAtkMotion();checkSlotWt();checkTideKind();
checkCryo();
checkBeam();
checkCoil();
checkEarly();
checkFinalBoss();
checkZPools();
runStage2();
runNightmare();
runPvE(2,'PvE'+D5[2].n+'(素の腕前・W'+D5[2].w+')',false);
const won=runPvE(4,'PvE'+D5[4].n+'(強化プレイ・W'+D5[4].w+')',true);
/* ⚠悪夢がこのテストでクリアできないのは**設計どおり**(2026-07-26ユーザー明示・何度も同じ話になっている)。
   ソロはローグライトで、🔬研究所の永久解放を積んで初めて勝てる難易度にしてある。
   このテストは「研究所をほとんど解放していない状態＋機械的な操作」なので、負けて当たり前。
   ⭐**ここを見て難易度を下げないこと**。見るべきは「どこまで行けたか(wave)」の推移だけ。 */
if(!won)console.log('INFO: 悪夢は上の行の wave まで(研究所の解放を積んで勝つ難易度=これは想定どおり)');
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
   /* ⚠🛠DEVで見るのは「**持っている**兵科が全部か」(metaUnitCap)。
      連れて行けるのは編成制の10体なので team.length で見てはいけない(2026-08-01) */
   +'return [m.unlocked,T_PLAY,metaUnitCap(),U_N,m.ecoN,ECO_MAX,m.supN,SUP_MAX,'
   +'m.slk.slice(0,ECO_BASE).filter(v=>v).length,ECO_BASE,META.st.length,Object.keys(STRIKES).length];')();
  const [un,tp,uu,un2,ec,ecm,sp,spm,sl,slm,st,stm]=g;
  if(un<tp){console.log('FAIL: 🛠DEVでタワーが全解放されていない '+un+'/'+tp);process.exit(1);}
  if(uu<un2){console.log('FAIL: 🛠DEVで兵科が全解放されていない '+uu+'/'+un2);process.exit(1);}
  if(ec<ecm||sp<spm){console.log('FAIL: 🛠DEVで工房/支援の枠が全部開いていない '+ec+'/'+ecm+' '+sp+'/'+spm);process.exit(1);}
  if(sl<slm){console.log('FAIL: 🛠DEVで建設マスが全部開いていない '+sl+'/'+slm);process.exit(1);}
  if(st<stm){console.log('FAIL: 🛠DEVで砲撃が全部解放されていない '+st+'/'+stm);process.exit(1);}
  console.log('🛠DEVモード: タワー'+un+'種・兵科'+uu+'種・建設マス'+sl+'+工房'+ec+'+支援'+sp+'・砲撃'+st+'種 すべて最初から使える OK');
  /* ⭐⭐**🛠DEVでは「見て欲しいもの」の確率が上がっていること**(2026-07-30ユーザー指示
       「見て欲しいやつの確率は上げて欲しい。テストするときは毎回そうして」)。
     ⚠素の確率のままでは★4以上が約1%で、どんでん返しも黄金のロブスターも確かめようがない。
     ⚠**新しく珍しいものを足したら、ここの一覧にも足すこと**。 */
  const d=new Function(js+String.fromCharCode(10)+'return {hi:G_RATE.filter(r=>r[0]==="r4"||r[0]==="r5").reduce((a,r)=>a+r[1],0),'
   +'lob:lbRate(),rb:rbRate(),bus:busRate(),pl:GC_P_LOB,pt:GC_P_TW,sum:G_RATE.reduce((a,r)=>a+r[1],0)};')();
  if(Math.abs(d.sum-100)>1e-9){console.log('FAIL: 🛠DEVの排出率の合計が100でない '+d.sum);process.exit(1);}
  if(d.hi<10){console.log('FAIL: 🛠DEVで★4以上が出にくすぎる '+d.hi.toFixed(1)+'%(演出を確かめられない)');process.exit(1);}
  if(d.lob<.2){console.log('FAIL: 🛠DEVで✨黄金のロブスターが出にくすぎる');process.exit(1);}
  if(d.rb<.2){console.log('FAIL: 🛠DEVで🌈虹のゾンビが出にくすぎる');process.exit(1);}
  if(d.bus<.2){console.log('FAIL: 🛠DEVで🚌ゾンビバスが出にくすぎる(0.001%では実機で一度も見られない)');process.exit(1);}
  if(Math.abs(d.pl-1/3)>1e-9||Math.abs(d.pt-1/3)>1e-9){
   console.log('FAIL: 🛠DEVで召集の3通りが均等になっていない');process.exit(1);}
  console.log('🛠DEVの底上げ: ★4以上 '+d.hi.toFixed(1)+'% / 召集の演出は3通り均等 / '
   +'タイトルの✨金'+(d.lob*100)+'%・🌈虹'+(d.rb*100)+'%・🚌バス'+(d.bus*100)+'% OK');
 }catch(e){
  console.log('FAIL: 🛠DEVモード(?dev=1)の読み込みで例外: '+e.message);process.exit(1);
 }finally{
  global.location=savedLoc;rafq.length=savedRaf;/* 二重読み込みの後始末 */
 }
 console.log('🛠DEVモード(?dev=1): 最後まで読み込める OK');
})();
try{eval(js+'\n'+body);}catch(e){console.log('LOAD FAIL:',e.message,(e.stack||'').split('\n').slice(0,4).join(' | '));process.exit(1);}
