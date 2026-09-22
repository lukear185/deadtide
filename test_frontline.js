// 開放戦場の挙動検査。既存のDOMスタブを借り、実装そのものを読み込む。
const fs=require('fs');
const prefix=fs.readFileSync('test_headless.js','utf8').split("const html=fs.readFileSync(TARGET,'utf-8');")[0];
const js=fs.readFileSync('index.html','utf8').split('<script>')[1].split('</script>')[0];
const checks=String.raw`
const assert=require('assert/strict');
const fresh=()=>new FrontlineBattle(71);
let b=fresh();
assert.equal(b.deploy('unit','gun',250,100),'');
assert.equal(b.scrap,600-UNITS.find(u=>u.id==='gun').cost);
const money=b.scrap;
assert.notEqual(b.deploy('unit','gun',250,430),'');assert.equal(b.scrap,money);
for(const p of [[900,90],[390,145],[12,100],[220,900]])assert.notEqual(b.deploy('tower','rifle',...p),'');
assert.equal(b.scrap,money);
const x=b.units[0].x;b.step(.05);assert.equal(b.units[0].x,x);assert.equal(b.phase,'ready');
console.log('配置範囲・障害物・費用・待ち時間・開始前の停止 OK');
b=fresh();b.scrap=99999;
for(let i=0;i<20;i++){b.cooldowns.bat=0;assert.equal(b.deploy('unit','bat',140+i%10*31,210+Math.floor(i/10)*55),'');}
b.cooldowns.bat=0;assert.equal(b.deploy('unit','bat',150,440),'部隊上限');
console.log('部隊上限と追加配置の拒否 OK');
b=fresh();const a={x:270,y:145},z={x:560,y:145};
assert.equal(b.clearLine(a,z),false);assert.equal(b.clearLine({x:270,y:240},{x:560,y:240}),true);
const path=b.path(a,z);assert.ok(path.length>1);
const actor={...a,r:15,nav:0,route:[],walk:0};
for(let i=0;i<400;i++){b.move(actor,z,72,.05);assert.equal(b.inside(actor.x,actor.y,14.5),false);}
assert.ok(Math.hypot(actor.x-z.x,actor.y-z.y)<4);
console.log('遮蔽・障害物の迂回・通り抜け防止 OK');
b=fresh();b.deploy('unit','gun',250,110);b.phase='battle';b.queue=[{at:999,id:'walk',band:1}];b.elapsed=0;
const far=b.spawn('walk',2);far.x=260;far.y=455;const hp=far.hp;
b.step(.05);assert.equal(far.hp,hp);
far.x=340;far.y=110;b.units[0].cd=0;b.step(.05);assert.ok(far.hp<hp);
console.log('別の高さにいる敵への誤命中なし・射程内は命中 OK');
b=fresh();b.deploy('tower','rifle',280,145);b.phase='battle';b.queue=[{at:999,id:'walk',band:1}];b.elapsed=0;
const covered=b.spawn('walk',0);covered.x=510;covered.y=145;const protectedHP=covered.hp;
b.step(.05);assert.equal(covered.hp,protectedHP);
console.log('障害物越しの射撃を拒否 OK');
b=fresh();const ys=Array.from({length:12},()=>b.spawn('walk',1).y);assert.equal(new Set(ys).size,12);
b=fresh();b.beginWave();const before=b.time;b.paused=true;b.step(.05);assert.equal(b.time,before);assert.equal(b.enemies.length,0);
console.log('出現位置の分散・一時停止 OK');
b=fresh();
for(let wave=1;wave<=5;wave++){
 assert.equal(b.beginWave(),true);
 for(let i=0;i<2000&&b.phase==='battle';i++){b.step(.05);for(const q of b.enemies)b.damage(q,1e6,'bullet');}
 assert.equal(b.wave,wave);assert.equal(b.phase,wave===5?'won':'between');
}
assert.equal(b.beginWave(),false);
console.log('5波進行・制圧・勝利後の進行停止 OK');
b=fresh();b.core=1;b.beginWave();
for(let i=0;i<2000&&b.phase!=='lost';i++)b.step(.05);
assert.equal(b.phase,'lost');assert.equal(b.core,0);
console.log('突破ダメージ・敗北 OK');
b=fresh();b.deploy('unit','gun',300,110);b.deploy('unit','shd',420,100);b.deploy('tower','rifle',390,260);b.beginWave();
for(let i=0;i<7200&&!['won','lost'].includes(b.phase);i++){
 b.step(.05);
 for(const e of [...b.units,...b.enemies,...b.towers]){
  assert.ok(Number.isFinite(e.x)&&Number.isFinite(e.y)&&Number.isFinite(e.hp));assert.equal(b.inside(e.x,e.y,e.r-.6),false);
 }
}
assert.ok(['won','lost'].includes(b.phase));
assert.equal(META_KEY,'dt_meta');assert.equal(RUN_KEY,'dt_run');
console.log('通常戦闘の継続・有限座標・本編の保存先維持 OK');
console.log('開放戦場の検査: 全項目合格');
`;
new Function('require',prefix+'\n'+js+'\n'+checks)(require);


// 専用URLでも初期化を通し、実際に配線した配置・開始・停止ボタンを押す。
const protoSetup=String.raw`
global.location={search:'?frontline=1',protocol:'file:',href:'file:///index.html?frontline=1'};
const baseElement=mkEl;
mkEl=function(id){const el=baseElement(id);el.setAttribute=function(){};el.hidden=true;
 Object.defineProperty(el,'onclick',{value:null,writable:true,configurable:true});
 el.appendChild=function(child){this.children.push(child);};return el;};
`;
const protoChecks=String.raw`
const assert=require('assert/strict');
assert.equal(FRONTLINE_MODE,true);assert.ok(FLVIEW);assert.equal(SCR,'frontline');
assert.equal(META_KEY,'dt_meta_frontline');assert.equal(RUN_KEY,'dt_run_frontline');
assert.equal(cache['fl-root'].hidden,false);
assert.equal(cache['fl-units'].children.length,4);assert.equal(cache['fl-towers'].children.length,4);
frontlineFrame(16);
const px=250*FLVIEW.scale+FLVIEW.ox,py=250*FLVIEW.scale+FLVIEW.oy;
FLVIEW.canvas.onpointerdown({clientX:px,clientY:py});FLVIEW.canvas.onpointerup({clientX:px,clientY:py});
assert.equal(FLVIEW.battle.units.length,1);
cache['fl-start'].onclick();assert.equal(FLVIEW.battle.phase,'battle');
$('fl-helpbox').hidden=true;cache['fl-pause'].onclick();assert.equal(FLVIEW.battle.paused,true);
cache['fl-help'].onclick();cache['fl-helpclose'].onclick();assert.equal(FLVIEW.battle.paused,true);
cache['fl-again'].onclick();assert.equal(FLVIEW.battle.units.length,0);assert.equal(FLVIEW.battle.phase,'ready');
console.log('専用URL起動・保存分離・カード・配置タップ・開始・停止・やり直し OK');
`;
new Function('require',prefix+'\n'+protoSetup+'\n'+js+'\n'+protoChecks)(require);
process.exit(0);

