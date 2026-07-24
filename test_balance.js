/* 兵科の強さが「解放順に右肩上がり」になっているかを検査する開発用ツール
   使い方: node test_balance.js
   ・戦力 = (実DPS)^0.6 × (HP)^0.4 × 役割ボーナス
       実DPS = 攻撃力÷攻撃間隔 ×(複数同時攻撃の割引) ×(範囲攻撃の加点) + 燃焼
       役割ボーナス = 凍結2.2 / 回復2.0 / 壁(shd,gld,tnk,titan)1.45
     ※凍結・回復・壁は数値に出ない価値があるので加点している
   ・目標曲線 = バット(2番目)から末尾まで1段ごとに約+7%の等比
   ・数値を変えたらこれを流して「← 前より弱い」が出ないことを確認する
   ・強さの調整は index.html の UNITS の hp/atk を直接いじる(一括倍率はもう無い) */
const fs=require('fs'),os=require('os'),path=require('path'),cp=require('child_process');
const html=fs.readFileSync(path.join(__dirname,'index.html'),'utf-8');
const BR=['C:/Program Files/Google/Chrome/Application/chrome.exe',
 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'].find(p=>fs.existsSync(p));
if(!BR){console.log('ChromeもEdgeも見つからない');process.exit(1);}
const js=`var o=[];for(var i=0;i<UNITS.length;i++){var U=UNITS[i];
 o.push([i,U.id,U.n,U.hp,U.atk,U.rate,U.rng,U.aoe||0,U.burn||0,U.multi||1,U.type,U.cost,UNITP[i]||0].join('|'));}
document.body.insertAdjacentHTML('beforeend','<pre>%%'+o.join(' ## ')+'%%</pre>');`;
const tmp=path.join(os.tmpdir(),'dt_balance.html');
fs.writeFileSync(tmp,html.replace('</body>','<scr'+'ipt>'+js+'</scr'+'ipt></body>'));
const r=cp.spawnSync(BR,['--headless=new','--disable-gpu','--no-sandbox','--virtual-time-budget=4000',
 '--dump-dom','file:///'+tmp.replace(/\\/g,'/')],{encoding:'utf-8',maxBuffer:1e8});
const ms=(r.stdout||'').match(/%%[^%]*%%/g);
if(!ms){console.log('取得できず(ブラウザが動かなかった)');process.exit(1);}
const U=ms[ms.length-1].replace(/%%/g,'').split(' ## ').map(l=>{const a=l.split('|');
 return {i:+a[0],id:a[1],n:a[2],hp:+a[3],atk:+a[4],rate:+a[5],rng:+a[6],aoe:+a[7],
  burn:+a[8],multi:+a[9],type:a[10],cost:+a[11],up:+a[12]};});
const TANK=['big','shd','gld','tnk','titan'];
const dpsOf=u=>u.atk/u.rate*(1+((u.multi||1)-1)*.6)*(1+u.aoe/220)+(u.burn?u.burn*.8:0);
const roleOf=u=>u.type==='frost'?2.2:u.type==='heal'?2:TANK.indexOf(u.id)>=0?1.45:1;
const scoreOf=u=>Math.pow(dpsOf(u),.6)*Math.pow(u.hp,.4)*roleOf(u);
const sc=U.map(scoreOf);
const ANCHOR=1,g=Math.pow(sc[U.length-1]/sc[ANCHOR],1/(U.length-1-ANCHOR));
console.log('目標の伸び=1段ごとに約+'+Math.round((g-1)*100)+'%');
console.log('番 兵科          HP    攻  出撃  解放費   DPS  戦力  目標   ずれ');
let bad=0,prev=-1;
for(let i=0;i<U.length;i++){
 const u=U[i],tgt=i<=ANCHOR?sc[i]:sc[ANCHOR]*Math.pow(g,i-ANCHOR);
 const dev=Math.round((sc[i]/tgt-1)*100);
 const inv=sc[i]<prev;if(inv)bad++;prev=sc[i];
 console.log(String(i).padStart(2)+' '+u.n.padEnd(12,'　').slice(0,12)+
  String(u.hp).padStart(6)+String(u.atk).padStart(6)+String(u.cost).padStart(6)+
  String(u.up).padStart(8)+String(Math.round(dpsOf(u))).padStart(6)+
  String(Math.round(sc[i])).padStart(6)+String(Math.round(tgt)).padStart(6)+
  (dev>0?'+':'')+String(dev).padStart(4)+'%'+(inv?'  ← 前より弱い':''));
}
console.log(bad?('⚠順番が逆転している兵科が'+bad+'件ある'):'✅ 解放順に強くなっている(逆転なし)');
