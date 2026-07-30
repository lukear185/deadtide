/* 兵科とタワーの強さが「解放順に右肩上がり」になっているかを検査する開発用ツール
   使い方: node test_balance.js
   ⚠**これは落ちない(報告するだけの道具)**。数値を触ったら流して「← 前より弱い」が出ないか目で見る。

   【兵科】戦力 = (実DPS)^0.6 × (HP)^0.4 × 役割ボーナス
       実DPS = 攻撃力÷攻撃間隔 ×(複数同時攻撃の割引) ×(範囲攻撃の加点) + 燃焼
       役割ボーナス = 凍結2.2 / 回復2.0 / 壁(shd,gld,titan)1.45
     ※凍結・回復・壁は数値に出ない価値があるので加点している
     ・目標曲線 = バット(2番目)から末尾まで1段ごとに約+7%の等比
     ・強さの調整は index.html の UNITS の hp/atk を直接いじる(一括倍率はもう無い)

   【タワー】⭐2026-07-27に追加(ユーザー指示「タレットも解放順の強さになってるか確認しよう」)。
     実戦DPS = (dmg ÷ rate) × 同時に当たる敵の数 + 継続ダメージ + 酸爆発
     ⚠**dmg は一括調整(×0.5625)を通した後の値**を読む=index.html を実際に読み込んで取り出している。
     ⚠この式は index.html の TOWERS のコメントにある目安値
       (レールガン174 / ガトリング225 / プラズマ307 / 要塞砲482)と一致する=設計側の数え方と同じ。
     ⚠**減速/凍結(net)と廃品工房(eco)は対象外**=DPSでは価値を測れないため(兵科の壁役と同じ扱い)。 */
const fs=require('fs'),os=require('os'),path=require('path'),cp=require('child_process');
const html=fs.readFileSync(path.join(__dirname,'index.html'),'utf-8');
const BR=['C:/Program Files/Google/Chrome/Application/chrome.exe',
 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'].find(p=>fs.existsSync(p));
if(!BR){console.log('ChromeもEdgeも見つからない');process.exit(1);}
/* ⚠英雄(UNITSの末尾・U_N以降)は解放順の対象外なので数えない */
const TK=['id','n','cost','rng','dmg','rate','type','multi','aoe','burn','chain','grow','gmax','cont',
 'slow','frz','frzN','inc','drn','heatM','beam','fspl','acdT','axr','axm'];
const js=`var o=[];var N=(typeof U_N!=='undefined')?U_N:UNITS.length;for(var i=0;i<N;i++){var U=UNITS[i];
 o.push([i,U.id,U.n,U.hp,U.atk,U.rate,U.rng,U.aoe||0,U.burn||0,U.multi||1,U.type,U.cost,UNITP[i]||0].join('|'));}
var t=[];for(var i=0;i<T_PLAY;i++){var T=TOWERS[i];var a=[i];
 ${JSON.stringify(TK)}.forEach(function(k){a.push(T[k]===undefined?'':T[k]);});
 a.push(UNLOCK_P[i]||0);t.push(a.join('|'));}
document.body.insertAdjacentHTML('beforeend','<pre>%%'+o.join(' ## ')+'%%@@'+t.join(' ## ')+'@@</pre>');`;
const tmp=path.join(os.tmpdir(),'dt_balance.html');
fs.writeFileSync(tmp,html.replace('</body>','<scr'+'ipt>'+js+'</scr'+'ipt></body>'));
const r=cp.spawnSync(BR,['--headless=new','--disable-gpu','--no-sandbox','--virtual-time-budget=4000',
 '--dump-dom','file:///'+tmp.replace(/\\/g,'/')],{encoding:'utf-8',maxBuffer:1e8});
const ms=(r.stdout||'').match(/%%[^%]*%%/g),ts=(r.stdout||'').match(/@@[^@]*@@/g);
if(!ms||!ts){console.log('取得できず(ブラウザが動かなかった)');process.exit(1);}

/* ============ 兵科 ============ */
const U=ms[ms.length-1].replace(/%%/g,'').split(' ## ').map(l=>{const a=l.split('|');
 return {i:+a[0],id:a[1],n:a[2],hp:+a[3],atk:+a[4],rate:+a[5],rng:+a[6],aoe:+a[7],
  burn:+a[8],multi:+a[9],type:a[10],cost:+a[11],up:+a[12]};});
const TANK=['big','shd','gld','titan'];
const dpsOf=u=>u.atk/u.rate*(1+((u.multi||1)-1)*.6)*(1+u.aoe/220)+(u.burn?u.burn*.8:0);
const roleOf=u=>u.type==='frost'?2.2:u.type==='heal'?2:TANK.indexOf(u.id)>=0?1.45:1;
const scoreOf=u=>Math.pow(dpsOf(u),.6)*Math.pow(u.hp,.4)*roleOf(u);
const sc=U.map(scoreOf);
const ANCHOR=1,g=Math.pow(sc[U.length-1]/sc[ANCHOR],1/(U.length-1-ANCHOR));
console.log('=== 🪖兵科30種 === 目標の伸び=1段ごとに約+'+Math.round((g-1)*100)+'%');
console.log('番 兵科          HP    攻  出撃  解放費   DPS  戦力  目標   ずれ');
let bad=0,prev=-1,prevHp=-1,wallBad=0;
for(let i=0;i<U.length;i++){
 const u=U[i],tgt=i<=ANCHOR?sc[i]:sc[ANCHOR]*Math.pow(g,i-ANCHOR);
 const dev=Math.round((sc[i]/tgt-1)*100);
 /* ⚠壁役はHPが価値の全てで、この式(DPS重視)では正しく測れない。
    順番の検査からは外し、壁どうしでHPが増えているかだけ見る */
 const isWall=TANK.indexOf(u.id)>=0;
 if(isWall){if(u.hp<prevHp){console.log('  ↑壁役なのに前の壁よりHPが低い');wallBad++;}prevHp=u.hp;}
 const inv=!isWall&&sc[i]<prev;if(inv)bad++;if(!isWall)prev=sc[i];
 console.log(String(i).padStart(2)+' '+u.n.padEnd(12,'　').slice(0,12)+
  String(u.hp).padStart(6)+String(u.atk).padStart(6)+String(u.cost).padStart(6)+
  String(u.up).padStart(8)+String(Math.round(dpsOf(u))).padStart(6)+
  String(Math.round(sc[i])).padStart(6)+String(Math.round(tgt)).padStart(6)+
  (dev>0?'+':'')+String(dev).padStart(4)+'%'+(isWall?'  [壁役=順番検査の対象外]':inv?'  ← 前より弱い':''));
}
console.log(bad?('⚠順番が逆転している兵科が'+bad+'件ある'):'✅ 解放順に強くなっている(逆転なし・壁役を除く)');
if(wallBad)console.log('⚠壁役のHPの並びが逆転している');
else console.log('✅ 壁役('+TANK.join('/')+')はHPが解放順に増えている');

/* ============ タワー ============ */
const T=ts[ts.length-1].replace(/@@/g,'').split(' ## ').map(l=>{const a=l.split('|'),o={i:+a[0]};
 TK.forEach((k,j)=>{const v=a[j+1];o[k]=(k==='id'||k==='n'||k==='type')?v:(v===''?0:+v);});
 o.up=+a[TK.length+1];return o;});
/* 1発(1秒)で同時に当たる敵の数 */
function hits(t){
 let h=1;
 if(t.multi>1)h*=t.multi;                                  /* 同時撃ち(ショットガン台・要塞砲) */
 if(t.aoe)h*=1+t.aoe/50;                                   /* 爆発範囲 */
 if(t.beam)h*=1+t.beam/13;                                 /* 線状に貫く(レールガン) */
 if(t.fspl)h*=1.5;                                         /* 周りへ1/4が2体ぶん(火炎放射塔) */
 if(t.drn)h*=t.drn;                                        /* 飛ばす機体の数(ドローン基地) */
 if(t.chain){let s=0;for(let k=0;k<t.chain;k++)s+=t.grow?Math.min(Math.pow(t.grow,k),t.gmax||99):1;h*=s;}
 return h;
}
const twDps=t=>{
 if(t.type==='eco'||!t.rate||!t.dmg)return 0;
 let d=t.dmg/t.rate;
 if(t.heatM)d*=(1+t.heatM)/2;                              /* 焼き切るまでの平均倍率(レーザー塔) */
 let v=d*hits(t);
 /* ⭐酸(axr持ち)は「継続ダメージ + 倒れた時の酸爆発」。
    爆発は**酸が残る秒数に1回**、半径ぶんの敵に入る、という数え方にしてある。 */
 if(t.axr)v+=t.burn*.8+t.burn*t.axm*(1+t.axr/50)/(t.acdT||3);
 else if(t.burn)v+=t.burn*.8*hits(t);
 return v;
};
/* 強化を全部MAX(各5段)にした時。⚠塔ごとに伸ばせる軸が違う(index.html の twStats と同じ分岐) */
const maxed=t=>{const o=Object.assign({},t);
 const st=t.drn?['d','r','n']:t.frzN?['f','r','g']:t.cont?(t.heatM?['d','h','m']:['d','b','g'])
  :t.heatM?['d','r','h']:(t.type==='elec'?['d','c','g']:['d','r','g']);
 if(st.indexOf('d')>=0)o.dmg=t.dmg*(1+.18*5);
 if(st.indexOf('r')>=0)o.rate=t.rate*(1-.09*5);
 if(st.indexOf('c')>=0)o.chain=t.chain+5;
 if(st.indexOf('b')>=0)o.burn=t.burn*(1+.25*5);
 if(st.indexOf('m')>=0)o.heatM=t.heatM+.6*5;
 if(st.indexOf('n')>=0)o.drn=Math.min(5,(t.drn||1)+5);
 return o;};
const CTL=t=>t.type==='net'||t.type==='eco';               /* 減速/凍結・工房はDPSで測れない */
console.log('');
console.log('=== 🗼タワー'+T.length+'種 ===');
console.log('番 タワー            建設費  解放費   実戦DPS 強化MAX  費用比   前比(素)');
let tbad=0,tprev=-1,tprevN='';
for(const t of T){
 const d=twDps(t),dm=twDps(maxed(t)),ctl=CTL(t);
 let mark='';
 if(!ctl){ if(tprev>0){const rr=d/tprev;mark=(rr<1?'← '+tprevN+'より弱い ':'')+'x'+rr.toFixed(2);if(rr<1)tbad++;}
  tprev=d;tprevN=t.n; }
 console.log(String(t.i).padStart(2)+' '+t.n.padEnd(10,'　').slice(0,10)+
  String(t.cost).padStart(7)+String(t.up).padStart(8)+
  (ctl?'        -       -       -  [制圧/工房=DPS対象外]'
     :String(Math.round(d)).padStart(9)+String(Math.round(dm)).padStart(8)+
      (d/t.cost).toFixed(2).padStart(8)+'   '+mark));
}
console.log(tbad?('⚠タワーの実戦DPSが解放順で下がっている所が'+tbad+'件ある'):'✅ タワーは解放順に実戦DPSが上がっている');
const ct=T.filter(t=>t.type==='net');
console.log('制圧タワー(DPS対象外): '+ct.map(t=>t.n+'(減速'+(t.slow||0)+'/凍結'+(t.frz||0)+'秒x'+(t.frzN||0)+'回)').join(' → '));
