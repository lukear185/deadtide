# DEADTIDE UI素材の生成プロンプト集(2026-07-25 完全版)

生成したPNGはこの `ui_src/` に **sheet-a.png / sheet-b.png / sheet-c.png / sheet-d.png** の名前で置く。

## 手順
```
node tool_slice.js ui_src/sheet-a.png --list                        # まず個数と並びを確認
node tool_slice.js ui_src/sheet-a.png ic-scrap,ic-up,ic-res,ic-gem,ic-mat
node tool_embed.js                                                  # 96pxへ縮小+減色してindex.htmlへ埋め込む
```
うまく抜けない時: `--tol=90` / `--gap=60` / `--bg=#ff00ff` ／ 減色を切るなら `tool_embed.js --nopal`

## シートを作る時の条件
- 背景は**マゼンタ `#FF00FF` のベタ塗り**(白/黒は絵の中で使うので不可)
- **アイコン同士を離す**(くっつくと1個として切り出される)
- **影・文字・ラベル・番号を入れない**
- 並びは「**上の行から、左から右へ**」。この順で名前が割り当たる
- **画像サイズの指定は効かないので気にしない**(1個350px以上あれば足りる)

## ⚠プロンプトに全部入れてある対策(実測から)
1. **表示は14〜18px**。2つの物を組み合わせた絵(ボルト+ナット等)は潰れて判別不能になる → 1アイコン=1物体
2. **きらめき・光の粒は輪郭をぼやけさせるだけ** → 禁止
3. **斜め45°配置は潰れる** → 正面か真横
4. **資源アイコンは色がかぶると致命的**(初回は研究ptと魔石が両方みどりだった) → 主色を全部変える
5. **AI感の正体は「なめらかな陰影・ハイライト・意味のないディテール・線の均一さ」**
   → ベタ塗り2階調まで/陰影禁止/線を揺らす/**版ズレ**を指定する
   ※①〜④は形の話、⑤は質感の話。⑤の「版ズレ(misregistered print offset)」が一番効く

---

## シートA(資源5種)→ ic-scrap,ic-up,ic-res,ic-gem,ic-mat

A hand screen-printed sprite sheet of exactly 5 separate game icons arranged in a grid, 3 on the top row and 2 on the bottom row, evenly spaced with wide empty gaps so no icon touches another. In reading order: (1) a mechanical gear, dominant color rust red #C1502E; (2) one single hex bolt seen from straight ahead, dominant color steel blue #5c6b78; (3) a round laboratory flask filled with liquid, dominant color toxic green #8FBF4D; (4) a single faceted crystal shard, dominant color violet purple; (5) one single blacksmith hammer, dominant color amber gold #E8A33D. Each icon uses a completely different dominant color so they can be told apart at a glance. Rendered as if screen printed by hand onto board game tokens: flat single-tone fills only, absolutely no gradients, no soft shading, no ambient occlusion, no glossy highlights, no rim light. At most two tones per object, one base color and one darker shadow shape with a hard edge. Very thick dark outlines #241f19 with slightly uneven hand-drawn wobble and imperfect corners, and a subtle misregistered print offset as if the color layer is printed a little off from the black outline layer. No random speckles, no scratches, no grain noise, no extra rivets or details that serve no purpose. Each icon must be a SINGLE object, not two objects combined, large and simple with minimal interior detail, no sparkles, no glow marks, no motion lines, no decorative particles, straight front or side view, not tilted at an angle, instantly recognizable when scaled down to 16 pixels. Plain solid magenta #FF00FF background, no shadows, no text, no labels, no numbers, no frames.

## シートB(画面アイコン6種)→ ic-lab,ic-load,ic-train,ic-solo,ic-online,ic-howto

A hand screen-printed sprite sheet of exactly 6 separate game icons arranged in a 3 by 2 grid, evenly spaced with wide empty gaps so no icon touches another. In reading order: (1) a microscope, dominant color steel blue #5c6b78; (2) a round military medal on a short ribbon, dominant color amber gold #E8A33D; (3) a barbell weight, dominant color rust red #C1502E; (4) a battered riot shield, dominant color cream #F2ECDC; (5) a satellite dish antenna, dominant color toxic green #8FBF4D; (6) a closed thick manual book, dominant color rust brown. Each icon uses a completely different dominant color so they can be told apart at a glance. Rendered as if screen printed by hand onto board game tokens: flat single-tone fills only, absolutely no gradients, no soft shading, no ambient occlusion, no glossy highlights, no rim light. At most two tones per object, one base color and one darker shadow shape with a hard edge. Very thick dark outlines #241f19 with slightly uneven hand-drawn wobble and imperfect corners, and a subtle misregistered print offset as if the color layer is printed a little off from the black outline layer. No random speckles, no scratches, no grain noise, no extra rivets or details that serve no purpose. Each icon must be a SINGLE object, not two objects combined, large and simple with minimal interior detail, no sparkles, no glow marks, no motion lines, no decorative particles, straight front or side view, not tilted at an angle, instantly recognizable when scaled down to 16 pixels. Plain solid magenta #FF00FF background, no shadows, no text, no labels, no numbers, no frames.

## シートC(研究所タブ7種)→ ic-tab-new,ic-tab-var,ic-tab-stk,ic-tab-line,ic-tab-start,ic-tab-eco,ic-tab-rec

A hand screen-printed sprite sheet of exactly 7 separate game icons arranged in a grid, 4 on the top row and 3 on the bottom row, evenly spaced with wide empty gaps so no icon touches another. In reading order: (1) a four-pointed star, dominant color cream white #F2ECDC; (2) an arrow that splits into two branches, dominant color toxic green #8FBF4D; (3) a round crosshair target reticle, dominant color rust red #C1502E; (4) an arrow pointing diagonally up-right, dominant color steel blue #5c6b78; (5) a simple rocket seen from the side, dominant color amber gold #E8A33D; (6) a closed drawstring money pouch, dominant color tan brown; (7) a clipboard board, dominant color pale grey with a rust red clip. Each icon uses a completely different dominant color so they can be told apart at a glance. Rendered as if screen printed by hand onto board game tokens: flat single-tone fills only, absolutely no gradients, no soft shading, no ambient occlusion, no glossy highlights, no rim light. At most two tones per object, one base color and one darker shadow shape with a hard edge. Very thick dark outlines #241f19 with slightly uneven hand-drawn wobble and imperfect corners, and a subtle misregistered print offset as if the color layer is printed a little off from the black outline layer. No random speckles, no scratches, no grain noise, no extra details that serve no purpose. These are tab icons displayed very small, so keep them extremely simple: each icon must be a SINGLE bold shape with almost no interior detail, no sparkles, no glow marks, no motion lines, no decorative particles, straight front or side view, not tilted at an angle, instantly recognizable when scaled down to 14 pixels. Plain solid magenta #FF00FF background, no shadows, no text, no labels, no numbers, no frames.

## シートD(ゲーム中HUD3種)→ ic-core,ic-flag,ic-hero

A hand screen-printed sprite sheet of exactly 3 separate game icons arranged in one horizontal row, evenly spaced with wide empty gaps so no icon touches another. In reading order: (1) a corrugated metal quonset hut bunker seen from the front, dominant color steel blue #5c6b78; (2) a triangular flag on a pole, dominant color toxic green #8FBF4D; (3) the head and shoulders of a masked caped hero seen from the front, dominant color rust red #C1502E. Each icon uses a completely different dominant color so they can be told apart at a glance. Rendered as if screen printed by hand onto board game tokens: flat single-tone fills only, absolutely no gradients, no soft shading, no ambient occlusion, no glossy highlights, no rim light. At most two tones per object, one base color and one darker shadow shape with a hard edge. Very thick dark outlines #241f19 with slightly uneven hand-drawn wobble and imperfect corners, and a subtle misregistered print offset as if the color layer is printed a little off from the black outline layer. No random speckles, no scratches, no grain noise, no extra details that serve no purpose. Each icon must be a SINGLE object, large and simple with minimal interior detail, no sparkles, no glow marks, no motion lines, no decorative particles, straight front view, not tilted at an angle, instantly recognizable when scaled down to 16 pixels. Plain solid magenta #FF00FF background, no shadows, no text, no labels, no numbers, no frames.

---

# 枠(9スライス用・アイコンが終わってから)
⚠**中央が完全に透明**であることが必須。中が塗られていると使えない。

## fr-btn.png(普通のボタン枠 / 横長)
A hand screen-printed UI button frame, border only, hollow rectangular frame with a completely transparent empty center, rounded corners with small riveted metal corner plates, plain straight uninterrupted edges between the corners so the middle can be stretched horizontally. Flat single-tone fills only, no gradients, no soft shading, no glossy highlights, at most two tones. Very thick dark outline #241f19 with slightly uneven hand-drawn wobble and a subtle misregistered print offset. Cream #F2ECDC and steel blue #5c6b78. No text, no fill inside, transparent background, PNG with alpha.

## fr-btn-red.png / fr-btn-gold.png
上と同じ文で、色を rust red #C1502E / amber gold #E8A33D に差し替える。

## fr-panel.png(モーダルのパネル枠 / 正方形)
A hand screen-printed UI panel frame, border only, hollow square frame with a completely transparent empty center, rounded corners with riveted sheet metal brackets, plain straight uninterrupted edges between the corners so it can be stretched in both directions. Flat single-tone fills only, no gradients, no soft shading, no glossy highlights, at most two tones. Very thick dark outline #241f19 with slightly uneven hand-drawn wobble and a subtle misregistered print offset. Cream #F2ECDC and steel blue #5c6b78. No text, no fill inside, transparent background, PNG with alpha.
