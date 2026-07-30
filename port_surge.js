/* ============================================================================
   ⚡雷光(SURGE) — 別プロジェクトの見た目デモから持ち込む用の一式
   出どころ: Claude Games/Game/index.html（魔法4番）。2026-07-31。

   ⚠これは**貼り付け元の置き場**であって、読み込まれるファイルではない。
     DEADTIDE は単一HTML(index.html)で完結の約束なので、下の①〜④を index.html へ移して
     このファイルは消してよい。node --check だけ通してある（構文の保証用）。

   何をするものか:
     押している間ためて、離すと**太い雷の柱を直線に撃つ**。溜め具合(0〜1)で
     長さ・太さ・威力が伸びる。線上の敵を全部撃つ（貫通）。

   DEADTIDE に合わせて直したところ（元のデモとの違い）:
     ・演出は **addFx に1件だけ積む**。ギザギザの折れ線は毎フレーム乱数で作らず、
       **種(sd)から sin/cos で生成**する＝既存の 'zap' と同じ作り。
       ⭐これでホストが配信した fxq をクライアントが再生しても**同じ形**になる。
     ・寿命は FX_LIFE を触らずに **e.lf** で指定（fxLife が e.lf を優先して見るため）。
     ・当たり判定と**ダメージは呼び出し側に任せた**（onHit コールバック）。
       ⚠ホスト権威なので、**dmg を入れてよいのはホストだけ**。演出は両方で出す。
     ・溜め中は fx に積まない（毎フレーム積むと即あふれる。塔の継続攻撃と同じ考え）。

   ★数値はデモのまま＝**DEADTIDEの数値体系では意味がない**。必ず調整して
     `node test_balance.js` を通すこと。触るのは SURGE の4行だけ。
============================================================================ */

/* ── 調整ノブ（ここだけ触ればよい） ───────────────────────────────── */
const SURGE = {
  T: 1.25,          // 最大まで溜まる秒数
  LEN: [300, 900],  // 射程（溜め0→1）
  W: [20, 56],      // 柱の太さ
  DMG: [26, 150],   // 威力  ⚠DEADTIDEの体力に合わせて要調整
  LIFE: .34,        // 柱が消えるまで
  COL: '150,120,255',   // 外側の紫
  COL2: '235,220,255'   // 芯の白紫
};

/* ============================================================================
   ① 発射   —— campStep 側（ロジック）に置く
   ============================================================================
   x,y   撃つ位置（杖の先／砲口）
   ang   撃つ向き（ラジアン）
   pw    溜め具合 0〜1
   onHit(z,dmg,qx,qy) … 当たった敵ごとに呼ぶ。⚠ホストのみ dmg を入れること
*/
function surgeFire(C, x, y, ang, pw, onHit) {
  pw = Math.max(.25, Math.min(1, pw));
  const lp = a => a[0] + (a[1] - a[0]) * pw;
  const len = lp(SURGE.LEN), w = lp(SURGE.W), dmg = lp(SURGE.DMG);
  const ex = x + Math.cos(ang) * len, ey = y + Math.sin(ang) * len;

  /* 線分と敵の距離で判定＝柱の上に居る敵は全部撃つ（貫通） */
  const dx = ex - x, dy = ey - y, l2 = dx * dx + dy * dy || 1;
  for (const z of (C.zombies || [])) {
    if (z.dead) continue;
    let t = ((z.px - x) * dx + (z.py - y) * dy) / l2;
    t = t < 0 ? 0 : t > 1 ? 1 : t;
    const qx = x + dx * t, qy = y + dy * t;
    if (Math.hypot(z.px - qx, z.py - qy) < w * .5 + (z.r || 12)) {
      if (onHit) onHit(z, dmg, qx, qy);
      /* 柱から敵へ枝分かれ（既存の zap を借りる＝形が揃う） */
      addFx(C, 'zap', qx, qy, '', { pts: [[qx, qy], [z.px, z.py]], sd: Math.random() * 99, lf: .18 });
      addP(C, 6, z.px, z.py, { sp: 210, r: 2.6, life: .34, col: 'rgba(' + SURGE.COL2 + ',1)' });
    }
  }

  /* 演出は1件だけ。⚠形は sd から作るのでクライアントでも同じものが出る */
  addFx(C, 'surge', x, y, '', { ex, ey, w, pw, sd: Math.random() * 999, lf: SURGE.LIFE });
  addP(C, 22, x, y, { sp: 380, a: ang, spread: .5, r: 3.4, life: .45, col: 'rgba(' + SURGE.COL2 + ',1)' });
  return { len, w, dmg, ex, ey };
}

/* ============================================================================
   ② 溜め   —— 押している間、毎フレーム呼ぶ（ロジック側）
   ============================================================================
   ⚠fx には積まない。粒だけ。粒は PMAX/FXLV で自動的に間引かれる。
*/
function surgeCharge(C, x, y, chg, dt) {
  const n = Math.random() < dt * (6 + chg * 26) ? 1 + (chg * 3 | 0) : 0;
  for (let i = 0; i < n; i++) {
    const a = Math.random() * 6.283, d = (34 + Math.random() * 56) * (1.2 - chg * .4);
    /* 外から中心へ吸い込まれる＝溜まっているのが目で分かる */
    addP(C, 1, x + Math.cos(a) * d, y + Math.sin(a) * d, {
      a: a + Math.PI, spread: .12, sp: d * 3.2, g: 0, r: 2.2, life: .3,
      col: 'rgba(' + SURGE.COL2 + ',1)'
    });
  }
  /* 満タンになったら手元で弾ける */
  if (chg >= 1 && Math.random() < dt * 9)
    addFx(C, 'zap', x, y, '', {
      pts: [[x, y], [x + rnd(-46, 46), y + rnd(-46, 46)]], sd: Math.random() * 99, lf: .12
    });
}

/* 溜めの光そのもの（砲口の球と足元の輪）。⚠fxではないので**描画側から直接**呼ぶ。
   c=ctx / x,y=砲口 / chg=0〜1 / t=経過秒(演出の回転用) */
function drawSurgeCharge(c, x, y, chg, t) {
  if (chg <= .01) return;
  const R = 5 + chg * 14;
  c.save(); c.globalCompositeOperation = 'lighter';
  const g = c.createRadialGradient(x, y, 0, x, y, R * 4.4);
  g.addColorStop(0, 'rgba(' + SURGE.COL2 + ',' + (.5 + chg * .45) + ')');
  g.addColorStop(.34, 'rgba(' + SURGE.COL + ',' + (.22 * chg) + ')');
  g.addColorStop(1, 'rgba(' + SURGE.COL + ',0)');
  c.fillStyle = g; c.beginPath(); c.arc(x, y, R * 4.4, 0, 7); c.fill();
  c.fillStyle = 'rgba(' + SURGE.COL2 + ',.95)';
  c.beginPath(); c.arc(x, y, R * .5, 0, 7); c.fill();
  /* 回る環＝溜まっている最中だと分かる印 */
  c.strokeStyle = 'rgba(' + SURGE.COL2 + ',' + (.4 + chg * .5) + ')'; c.lineWidth = 1.6;
  c.save(); c.translate(x, y); c.rotate(t * 3.4); c.scale(1, .4);
  c.beginPath(); c.arc(0, 0, R * 2.1, 0, 7); c.stroke(); c.restore();
  if (chg >= .999) { /* 満タンの合図 */
    c.strokeStyle = 'rgba(255,255,255,' + (.7 + Math.sin(t * 22) * .3) + ')'; c.lineWidth = 2;
    c.beginPath(); c.arc(x, y, R * 2.8 + Math.sin(t * 18) * 2, 0, 7); c.stroke();
  }
  c.restore();
}

/* ============================================================================
   ③ 柱の描画   —— fx の描画チェーンに1本足す
   ============================================================================
   貼る場所: index.html の  else if(e.k==='zap'){   の**直前**（14694行あたり）。
   下の中身をそのまま  else if(e.k==='surge'){ … }  として入れる。
   ⚠この関数のまま呼んでもよい（引数 c,e）。その場合は
       else if(e.k==='surge'){drawSurge(c,e);}
   の1行だけ足せば済む。
*/
function drawSurge(c, e) {
  const k = Math.max(0, 1 - e.t / (e.lf || SURGE.LIFE));  // 1→0
  const a = Math.pow(k, 1.6);
  const ang = Math.atan2(e.ey - e.y, e.ex - e.x);
  const len = Math.hypot(e.ex - e.x, e.ey - e.y);
  const w = e.w * (.45 + k * .55);
  c.save(); c.globalCompositeOperation = 'lighter';
  c.translate(e.x, e.y); c.rotate(ang);

  /* 外側の帯：根本が濃く、先へ行くほど薄く細く */
  let g = c.createLinearGradient(0, 0, len, 0);
  g.addColorStop(0, 'rgba(' + SURGE.COL2 + ',' + (a * .95) + ')');
  g.addColorStop(.35, 'rgba(' + SURGE.COL + ',' + (a * .8) + ')');
  g.addColorStop(1, 'rgba(' + SURGE.COL + ',0)');
  c.fillStyle = g;
  c.beginPath();
  c.moveTo(0, -w * .5); c.lineTo(len, -w * .18); c.lineTo(len, w * .18); c.lineTo(0, w * .5);
  c.closePath(); c.fill();

  /* 白い芯 */
  g = c.createLinearGradient(0, 0, len, 0);
  g.addColorStop(0, 'rgba(255,255,255,' + a + ')');
  g.addColorStop(.7, 'rgba(255,255,255,' + (a * .5) + ')');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  c.fillStyle = g;
  c.beginPath();
  c.moveTo(0, -w * .16); c.lineTo(len, -w * .05); c.lineTo(len, w * .05); c.lineTo(0, w * .16);
  c.closePath(); c.fill();

  /* まとわりつく稲妻。⚠乱数ではなく sd と t から作る＝クライアントでも同じ形 */
  c.lineCap = 'round'; c.lineJoin = 'round';
  for (let b = 0; b < 3; b++) {
    c.strokeStyle = 'rgba(' + (b ? SURGE.COL2 : '255,255,255') + ',' + (a * (b ? .6 : .9)) + ')';
    c.lineWidth = (b ? 2.2 : 1.4) * (.5 + k * .5);
    c.beginPath(); c.moveTo(0, 0);
    for (let i = 1; i <= 12; i++) {
      const f = i / 12;
      const j = Math.sin(e.sd + b * 2.3 + i * 2.7 + e.t * 26) * w * .42 * (1 - f * .55);
      c.lineTo(len * f, i === 12 ? 0 : j);
    }
    c.stroke();
  }

  /* 根本の閃光 */
  c.rotate(-ang); c.translate(-e.x, -e.y);
  const fg = c.createRadialGradient(e.x, e.y, 0, e.x, e.y, e.w * 2.4);
  fg.addColorStop(0, 'rgba(255,255,255,' + (a * .9) + ')');
  fg.addColorStop(1, 'rgba(' + SURGE.COL + ',0)');
  c.fillStyle = fg; c.beginPath(); c.arc(e.x, e.y, e.w * 2.4, 0, 7); c.fill();
  c.restore();
}

/* ============================================================================
   ④ 明かり   —— ライティングのパスに1行足す
   ============================================================================
   貼る場所: index.html の
       else if(e.k==='zap'&&e.t<.2)for(const p4 of e.pts){…}
   の**直後**（15035行あたり）。下を続けて書く:

     else if(e.k==='surge'&&e.t<.24){
      const st=6;for(let i=0;i<=st;i++){const f=i/st,lx=e.x+(e.ex-e.x)*f,ly=e.y+(e.ey-e.y)*f;
       lite(lx,ly,e.w*2.2,.9*(1-f*.5));glow.push([lx,ly,e.w*2.0,.5*(1-f*.5),'170,150,255']);}}

   ⚠これが無いと「画面が光っていない」＝威力が伝わらない。夜のステージだと特に差が出る。
============================================================================ */

/* ============================================================================
   ⑤ 繋ぎ込みの手順（ゲーム側）
   ============================================================================
   どこに載せるかは決めていない（設計はチャット側の判断）。載せ先の候補と要る作業:

   A. 🎯砲撃の新種として足す
      STK_ORDER に1つ足す／LAB_STK に価格を1つ足す／砲撃のチャージ秒を SURGE.T にする。
      ⭐**並びがそのまま強さの順**の約束があるので、1発の総ダメージが
        絨毯爆撃(9520)より上か下かを決めてから数値を置くこと。検査が実際に測って見張る。

   B. 🦸英雄の必殺技として足す
      heroUlt() に1本足す。⚠**押した瞬間に何か起きること**（雷嵐と同じ落とし穴：
      全部 later() に回すと不発に見える）。この柱は即着弾なので元から問題ない。

   C. タワーの進化先の攻撃として足す
      ⚠タワーの性能に触る話になるので、支援施設の約束（情報/部隊/経済の3軸）とは別枠。

   どれでも、共通で要るもの:
     ・撃つ位置は塔なら twMzPt()、部隊なら銃口。⚠**塔の中心から出さない**（2026-07-27の指摘）。
     ・ダメージは装甲/鱗の判定を通すこと（onHit の中で既存の dmgZ を呼ぶ）。
     ・数値を触ったので `node test_undef.js` → `node test_headless.js` → `node test_balance.js`。
     ・⭐見た目は必ず撮る: `node test_shot.js out.png 852 393 …`
     ・⚠新しく「珍しいもの」を足したら、同じ回に `?dev=1` の底上げも足す（NOTES.md）。
============================================================================ */

/* このファイル単体で node --check を通すためのダミー（貼り付け時は持って行かない） */
function addFx() { } function addP() { } function rnd(a, b) { return a + Math.random() * (b - a); }
