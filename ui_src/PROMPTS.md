# DEADTIDE UI素材の生成プロンプト集

## ★1枚のシートにまとめて描いてもらう方式(推奨・こちらが速い)
複数のアイコンを1枚に並べて生成し、`tool_slice.js` で自動的に1個ずつ切り出す。
- 背景は**真っ黒でも白でもなく、絵に使わない色(マゼンタ `#FF00FF`)のベタ塗り**にしてもらう
- **アイコン同士を離す**(くっつくと1個として切り出される)。影は付けない
- 並びは「**上の行から、左から右へ**」。この順で名前が割り当たる
```
node tool_slice.js ui_src/sheet-a.png --list                  # まず個数と並びを確認(cut01.png…で出る)
node tool_slice.js ui_src/sheet-a.png ic-scrap,ic-up,ic-res   # 名前を付けて書き出す
```
うまく抜けない時: `--tol=90`(背景の判定を緩く) / `--gap=60`(離れた部品も1個にまとめる) / `--bg=#ff00ff`(背景色を明示)


生成したPNGはこの `ui_src/` フォルダに **下の「保存名」で** 入れる。
Claude Code側でbase64に変換して index.html へ組み込む(単一HTML完結を維持)。

## 守ってもらう条件
- **PNG・背景透過**(JPEG不可)
- **アイコンは正方形512x512・余白は詰める・描くものは1つだけ・文字は入れない**
- **枠(フレーム)は中央が完全に透明**。角にだけ飾り、辺はまっすぐ=`border-image`で伸ばせる形に
- 色は ink `#241f19` / paper `#E8E0CE` / pane `#F2ECDC` / rust `#C1502E` / rust2 `#93381E` / amber `#E8A33D` / toxic `#8FBF4D` / steel `#5c6b78`

## 共通スタイル文(全プロンプトに入れてある)
flat 2D vector game icon, thick dark outline, limited retro palette, hand-printed silkscreen texture,
post-apocalyptic survival tower-defense UI, centered single object, no text, transparent background

## ネガティブ(対応しているツールなら入れる)
text, letters, numbers, watermark, signature, background, scenery, drop shadow, 3d render, photorealistic,
glossy, gradient background, multiple objects, frame, border

---

# A. 資源アイコン(最優先・512x512)

| 保存名 | 置き換える絵文字 | 意味 |
|---|---|---|
| ic-scrap.png | ⚙️ | スクラップ(建設・出撃の通貨) |
| ic-up.png | 🔩 | 強化ポイント |
| ic-res.png | 🧬 | 研究pt |
| ic-gem.png | 💎 | 魔石(ガチャ通貨) |
| ic-mat.png | 🔧 | 鍛錬素材 |

# B. 画面アイコン(512x512)

| 保存名 | 置き換える絵文字 | 意味 |
|---|---|---|
| ic-lab.png | 🔬 | 研究所 |
| ic-load.png | 🎖 | 編成 |
| ic-train.png | 🏋 | 鍛錬所 |
| ic-solo.png | 🛡 | ソロ作戦 |
| ic-online.png | 📡 | オンライン対戦 |
| ic-howto.png | 📖 | あそびかた |

# C. 研究所タブ(512x512)

| 保存名 | 置き換える絵文字 | 意味 |
|---|---|---|
| ic-tab-new.png | 🆕 | 新しい種類 |
| ic-tab-var.png | 🧬 | 派生キャラ・弾薬 |
| ic-tab-stk.png | 🎯 | 砲撃 |
| ic-tab-line.png | 📈 | 系統強化 |
| ic-tab-start.png | 🚀 | 開始時ブースト |
| ic-tab-eco.png | 💰 | 収入と効率 |
| ic-tab-rec.png | 📖 | 記録 |

# D. ゲーム中HUD(512x512)

| 保存名 | 置き換える絵文字 | 意味 |
|---|---|---|
| ic-core.png | 🏕 | シェルター(コア) |
| ic-flag.png | 🚩 | 集結旗 |
| ic-strike.png | 🎯 | 砲撃ボタン |
| ic-hero.png | 🦸 | 英雄 |

# E. 枠(9スライス用・後回しでよい)

| 保存名 | サイズ | 用途 |
|---|---|---|
| fr-btn.png | 512x192 | 普通のボタン枠 |
| fr-btn-red.png | 512x192 | 強調ボタン枠(赤) |
| fr-btn-gold.png | 512x192 | 強調ボタン枠(金) |
| fr-panel.png | 512x512 | モーダルのパネル枠 |
| fr-head.png | 512x128 | 見出しの飾り帯 |
