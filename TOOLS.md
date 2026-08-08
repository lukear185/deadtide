---
tags: [deadtide, tools]
aliases: [道具の候補]
---

# ゲーム制作の道具の候補(TOOLS.md)

Claude Code 自身が作って Claude Code 自身が使う道具の洗い出し。対象は **DEADTIDE(単一HTML・canvas 2D)** と **Yadocho(UE5)** の2つ。
⭐**下の「いま既にあるもの」が道具の唯一の棚卸し**(`tool_health.js` がこの表と実体のズレを見張っている)。
⚠**着手待ちなのは候補として残っている物だけ**=既に作った物には ✅ が付いている。

---

## いま既にあるもの

重複提案を防ぐための棚卸し。⚠**踏んだ穴と使い方の細かい所は [[NOTES_道具]]**。
📌**実物は30本**=`test_*.js` **9本** / `tool_*.js` **21本**(2026-08-08に `ls` で実測。下の表に全部載っている)。
⚠⚠**この節より下の「候補」の表に出てくるファイル名はまだ無い物**(`test_seq.js` `tool_cdp.js` `fx_edit.html` `perf_fx.js`)=
**作る時に付ける予定の名前**であって、実在しない。⭐**実在する道具はこの表だけ**。

| 道具 | 何をする / いつ使う | 誰が使う |
|---|---|---|
| `test_undef.js` | 構文検査＋未定義識別子スキャン。FAIL で exit 1 | Claude |
| `test_headless.js` | DOM/Canvas/Audio/localStorage/Peer をスタブして index.html を Node で実走。`check*()` 約50本 | Claude |
| `test_balance.js` | UNITS/TOWERS の実値を取り出し解放順に右肩上がりか表示。⚠落ちない | Claude |
| `test_layout.js` | 852x393 でスロット・コア・道路が HUD と重ならないか。⚠`exit(0)` 固定 | Claude |
| `test_sfx.js` | 埋め込みMP3の decode 本数と SFX_GAIN 後の RMS を測る | Claude |
| `test_shot.js` | 実画面スクショ。オプション**80種以上**(`st2` `dev` `arena=` `fxdemo` 等) | Claude→人 |
| `tool_sfx.js` | Sonniss素材を scan / build / embed(ffmpeg・base64埋め込み) | Claude |
| `tool_px.js` | ドット絵の規格化と PX-DATA 埋め込み | Claude |
| `tool_slice.js` | シート画像からアイコン自動切り出し | Claude |
| `tool_embed.js` | アイコンPNGを減色して ICONS ブロック再生成 | Claude |
| `tool_part.js` | Kenney Particle Pack(CC0)の粒を縮めて base64 埋め込み | Claude |
| `?dev=1` `?sfx=1` `?edit=1` `?perf=1` | DEVモード／音の確認／マス編集モード／🔥**実機**で塗り倍率を画面下に出す | 人 |
| 🧪検証場・📖ゾンビ図鑑・🔬DEVリセット | DEVタイトルからの確認用画面 | 人(+撮影で Claude) |
| `?v2=1` `?px=1` | 輪郭2度描き／ドット絵の試作スイッチ(既定オフ) | 人 |
| 赤いエラー帯 | 実機で例外を画面下に6秒表示 | 人 |
| Stop フック | セッション終了時に `test_undef.js` を自動実行、FAIL なら block | Claude(自動) |
| ⭐`tool_release.js` | 🚦リリースゲート。**11本**を順に流し1本でも落ちたら止める＋⚠件数の基準比較。⭐**毎回これ1本**(使い方と基準の下げ方は [[NOTES_道具]]) | Claude |
| ⭐`test_view.js` | 👁UIの**実測**検査(重なり/はみ出し/44px/10.5px)。⚠`test_layout.js` は1件も見つけられない | Claude |
| ⭐`tool_bench.js` | ⏱**「重い」**=場面ごとの1コマの時間(ms)を本物のChromeで測る。**重いと言われた時** | Claude |
| ⭐`tool_paint.js` | 🔥**「熱い」**=1コマで塗った面積・グラデ枚数・合成の切り替え回数・描く回数。`--check`はゲートで自動。**熱いと言われた時** | Claude |
| ⭐`tool_mutate.js` | 🧨**壊して確かめる検査**=数値を1か所壊して検査が落ちるか見る(落ちなければ穴)。**数値を触った回・検査を疑う時** | Claude |
| ⭐`tool_health.js` | 🩺**健康診断**=空catch/ノートのリンク切れ・迷子・行数/容量の内訳/道具の棚卸し。**ゲートで自動** | Claude |
| ⭐`tool_sheet.js` | 🖼**コンタクトシート**=全種を1枚の格子に(tw/tg/sup/un/uv/hero/zom)。`--sil`でシルエット / ⭐`--pick=`で数種だけ大きく。**絵を触る前後**。📌兵科30/派生78/英雄22/ゾンビ61(2026-08-08 実測) | Claude |
| ⭐`tool_tune.js` | 🎚**つまみ**=一覧/雛形/?tune=のURL作り/**index.htmlへ書き戻す**。**バランスを実機で詰める時** | Claude+人 |
| ⭐`test_feel.js` | 👊**手応えの計測**=揺れ/止まる時間/演出の数を強い順に。⚠合否は出さない。**爽快感を触る時** | Claude |
| ⭐`test_save.js` | 🛡**セーブ移行の門番**=昔のセーブの標本(save_fixtures/)を毎回全通し。**ゲートで自動** | Claude |
| ⭐`tool_snd.js` | 🔊**音の物差し**=check(重心/平坦さ/長さ/割れ) / sheet(スペクトログラム1枚) / stock(在庫)。**音を触る時** | Claude |
| ⭐`tool_look.js` | 🎨**色の物差し**=コントラスト/近すぎる色/色覚多様性で衝突する組(WCAG2は自前実装)。**ゲートで自動** | Claude |
| ⭐`tool_tex.js` | ✨**粒の絵を作る**(輪・線状火花・十字・星・破片…8種)。依存ゼロでPNG生成。**粒を足す時** | Claude |
| ⭐`tool_nums.js` | 📌**数字の腐り止め**=実装から表を作り直す+文章の数字を`@claim`で検算。**ゲートで自動** | Claude |
| ⭐`tool_stock.js` | 📦**素材の在庫台帳**=zipを開かずに**日本語で引ける**(骨/血/バス/歓声…)。`--take`で取り出し方だけ出す。**音を探す時** | Claude |
| 🎙`tool_aisfx.js` | **ElevenLabsで効果音を生成**して sfx_src へ+📒`ai_ledger.json` に台帳(Steam AI開示用)。⚠⚠**Starter($5/月)以上で契約してから**(無料プランの出力は商用不可)。キーは `.eleven_key`(gitignore済み)か環境変数 | Claude(契約は人) |
| 🔬研究所の`💾書き出す/読み込む` | セーブを1本の文字列に。**実機の状態をPCで再現**する口。**実機で変な事が起きた時** | 人→Claude |
| `tool_face.js` `tool_face_embed.js` | 🎨英雄の顔画像の規格化と埋め込み | Claude |
| `tool_brand.js` `tool_devicon.js` | 🎨ロゴ・アイコンの生成 | Claude |
| `tool_bench.js --slow[=N]` | 🐢**遅い端末を真似て測る**(同じ条件どうしの比較用)。**実機だけ重い時** | Claude |
| `test_shot.js --help` | ❓主なオプション(名前の衝突つき)。⚠**全部の一覧は [[NOTES_道具]]** | Claude |
| 🚪DEVタイトルの入口 | ?dev/?perf/?sfx/?edit/?v2 をURL直打ちせず切り替える | 人 |
| `DT_SKIP_RUN=1` / `DT_SHUFFLE=n` | ⏱実走だけ飛ばす(40秒→4秒) / 🔀検査の順番をシャッフルして順序依存を暴く | Claude |

### 目についた穴(この文書の出発点)

1. ~~まとめて流す口が無い~~ ✅**`tool_release.js` で塞いだ**(2026-08-02(69))
2. 絵の前回比較(視覚回帰)が無い ⚠**まだ空いている**
3. ~~`test_layout.js` と `test_balance.js` は必ず成功扱い~~ ✅**⚠件数を `release_baseline.json` に持ち、
   増えた時だけ落とす形にした**(`tool_release.js`)。⚠exit 0 自体は今も変えていない
4. ~~`test_sfx.js` が公式手順に載っておらず流し忘れる~~ ✅**リリースゲートに組み込んだ**
5. DEV系画面(マス編集・図鑑・音の確認・検証場)に自動検査がほぼ無い ⚠**まだ空いている**
6. ~~性能を測る道具が無い~~ ✅**`tool_bench.js` で塞いだ**(2026-08-04(124))=
   場面ごとの**1コマの時間(ms)**を本物のChromeで実測して重い順に出す。
   `node tool_bench.js`(盤面27通り)/ `node tool_bench.js ui`(画面と必殺22人)/ `mix=rail,coil`(好きな並び)/
   HTMLを渡すと**前後比較**。⚠**「重い」と言われたら最初にこれ**。⚠塗りの回数を数えても穴は見つからない
   (回数が同じで時間だけ10倍、が実在した)。詳しい当て方は [[NOTES_絵]] の性能の節。
7. ~~`test_shot.js` に `--help` が無い~~ ✅**2026-08-06(189)に足した**
8. ~~デバッグモードの入口が URL 直打ちのみ~~ ✅**🚪DEVタイトルの入口を作った**

---

## ⭐すぐ作った方がいいもの(費用対効果が高い順に5つ)

### ~~1. まとめて流す口 + 検査の合否を本物にする(`tool_release.js`)~~ ✅**2026-08-02(69)に作った**
> ⭐**できた物**=`node tool_release.js`(全部) / `--quick`(数秒) / `--accept`(基準の記録)。
> ⚠**`exit(0)` 固定をやめる案は採らなかった**=元からある⚠4件で毎回赤くなって形骸化するため、
> **⚠の件数を `release_baseline.json` に持ち、増えた時だけ落とす**形にした。使い方は [[NOTES_道具]]。
> ⚠**git hook には入れていない**(理由は下の落とし穴のとおり)。以下は当時の提案文。

- **何をする** … 既存検査を決まった順に全部流し、1本でも落ちたら止める1コマンド。ついでに index.html の容量差分を出す。同時に `test_layout.js` / `test_balance.js` の `exit(0)` 固定をやめて本当に落ちるようにする。
- **どう作る** … `child_process.spawnSync` で `test_undef` → `test_layout` → `test_balance` → `test_sfx` を順に起動して赤緑をまとめる。依存ゼロ。`.git/hooks/pre-push` に1行(Git for Windows 同梱の sh で動く)。
- **誰が使う** … Claude / **手間** 小 / **効き目** 大
- ⭐**なぜ効くか** … 新しい検査を1本も書かずに、既にある5本の「流し忘れ」と「落ちない検査」を同時に潰せる。
- ⚠落とし穴 … `.git/hooks` は clone に付いてこない(入れ直しコマンドが要る)。重い検査を入れると `--no-verify` で素通りされ形骸化＝ゲートは数秒で終わる静的検査だけに。

### ~~2. コンタクトシート撮影(全種1枚 + 連写1枚)~~ ✅**2026-08-06(189)に作った(`tool_sheet.js`)**
> ⭐**できた物**=`node tool_sheet.js out.png tw|tg|sup|un|uv|hero|zom`。`--sil`でシルエット / `--pick=`で数種だけ大きく。
> ⚠**連写(コマ撮り)の方はまだ**=下の VFX の表に残してある(⚠`test_seq.js` は**まだ無い**=作る時の予定の名前)。
> ⚠**肝と落とし穴**(真っ黒な絵になる/小さな差が潰れる/長いパスを渡すと帰ってこない)は [[NOTES_道具]]。以下は当時の提案文。

- **何をする** … ①全兵科・全タワー・全敵・全アイコンを実表示サイズのまま格子に並べて1枚 ②エフェクト等の連続フレームを等間隔で撮って1枚のタイルに。Claude が画像1枚で「全種の統一感」と「動きの流れ」を判断できる。
- **どう作る** … `test_shot.js` と同じヘッドレス Chrome 直叩き。描画関数だけを呼ぶ一時HTMLを生成。連写はゲーム側に決定論的な1ステップ進行関数を1本足し、毎フレーム `canvas.toDataURL()` を吸って別canvasへ格子描画。ラベルは canvas 標準フォント(外部フォント不要)。タイル化を ffmpeg に任せるなら `-vf "tile=6x4"`。依存ゼロ。
- **誰が使う** … Claude / **手間** 小〜中 / **効き目** 大
- ⭐**なぜ効くか** … Claude の唯一の目である「画像1枚」の情報密度を数十倍にする。他の絵・VFX系の道具はほぼ全部これの上に乗る。
- ⚠落とし穴 … 描画関数がゲーム状態に依存していると単体で呼べない＝先に「状態を引数で受ける」形へ寄せる小改修が要る。乱数と経過時間を固定しないと毎回違う絵。1枚に詰め込みすぎると潰れる(20〜40個ずつ／連写は8〜16コマ・1コマ256px程度)。

### ~~3. 素材の在庫台帳(zipを開かずに引ける索引)~~ ✅**2026-08-07(209)に作った(`tool_stock.js`)**
- **何をする** … Sonniss バンドル等を解凍せずに中身の一覧を作り、「骨が砕ける音の在庫はあるか」を1コマンドで引けるようにする。
- **どう作る** … Node標準＋`yauzl`(MIT)か`adm-zip`(MIT)で zip の**エントリ名だけ**を読む(展開しない)。UCS の CatID(GORESplt・METLImpt 等)の対訳は Universal Category System(パブリックドメイン)の一覧を取り込む。必要な1本だけストリーム展開して ffprobe で長さ/ピークを付ける。Kenney Audio(CC0)や CC0 で絞った Freesound の手動DL分も同じ台帳に。
- **誰が使う** … Claude / 人 / **手間** 小 / **効き目** 大
- ⭐**なぜ効くか** … 347本あるのに余り18本で音を作っていた、という実際に踏んだ穴への直球。
- ⚠落とし穴 … Sonniss は**単体ファイルとしての再配布と AI 学習利用が禁止**＝台帳(ファイル名リスト)はリポジトリに入れてよいが生WAVは今まで通り入れない。ライセンス原文の写しを置いておく。CatID が付いていないベンダー独自命名は取りこぼす。
- ✅**作った結果**(`tool_stock.js` / 索引は `stock_index.json`)…
  ⭐**ライブラリは足していない**(zipの中央ディレクトリだけを自前で読む=展開しない)。
  ⭐**日本語で引ける**(骨/血/バス/歓声/ホーン…)。UCSのCatIDに対訳を付けてある。
  ⭐`--take` で**取り出し方だけ**出す(展開はしない=生WAVをリポジトリに入れない歯止め)。
  📌**実測**=効果音**347本**の在庫に対し、使用中は**102本**。粒はKenneyから15枚落として**7枚**使用。
  🐞**踏んだ穴**=英語の語を部分一致で引くと `ice` が Voices に、`splat` が Reutersplatz に当たる
    (骨で33本の的外れ)。⭐**語の頭で合わせる**ようにして直した。

### 4. 音の見取り図シート ✅ + **帯域の門番**(⚠②だけ未着手)
> ✅**①見取り図シートは作った**=`node tool_snd.js sheet`(スペクトログラム1枚)。
> ⚠**②「掟を数値で FAIL にする」はまだ**=`tool_snd.js check` は重心/平坦さ/長さ/割れを**並べるだけで合否を出さない**。
> ⭐**掟**=重心だけで「高い笛」を探すと雑音系が半分誤爆する→**平坦さと組で見る**([[NOTES_道具]])。以下は当時の提案文。

- **何をする** … ①全効果音をスペクトログラムと波形の絵に焼き、16個ずつ1枚に束ねる(Claude が「見て」帯域・尾の長さ・立ち上がりを判定) ②`NOTES_音.md` の掟(1000Hz超の笛は禁止／150〜300Hzが要る／120Hz以下は実機で鳴らない／尾は短く)を数値検査に翻訳して FAIL にする。
- **どう作る** … ffmpeg の `showspectrumpic=s=512x256:legend=on` と `showwavespic`、束ねは `tile`/`xstack`。判定側は `aspectralstats`(centroid/rolloff/flatness/crest を `ametadata=print` でCSV化)＋`astats`。`tool_sfx.js` に `sheet` サブコマンド、`test_sfx.js` に検査項目として追加。
- **誰が使う** … Claude / **手間** 小〜中 / **効き目** 大
- ⭐**なぜ効くか** … Claude は音を聴けない(2026-08時点でネイティブ音声入力なし)。耳の代わりは①数字②画像③人が押す一覧、の3点セットしかなく、③(`?sfx=1`)だけ既にある状態。
- ⚠落とし穴 … 絵は「何が鳴っているか」しか教えず良し悪しは判定できない。`legend=on` を付けないと絶対値が読めず無意味。閾値の当てずっぽうが最大の罠＝ノイズ系(nzHit)は本質的に重心が高いので**種類別に閾値**を持つ。厳しすぎると新しい音が全部落ちて足かせになる。

### ~~5. つまみ抽出 + 上書き口 + 書き戻し器(`tool_tune.js`)~~ ✅**2026-08-06(189)に作った**
> ⭐**できた物**=一覧 / 雛形json / `?tune=` のURL作り / **index.html へ書き戻す**。
> ⚠**掟**=宣言は `DEV_INF` の直後 / **対戦・協力に効く数値はつまみにしない** / 式に埋まった係数はつまみにできない([[NOTES_道具]])。以下は当時の提案文。

- **何をする** … 数値表(UNITS/TOWERS/ZOMBIES/研究所)から「調整してよい数値」を機械可読に吸い出し、起動時に外から差し替える口を作り、詰めた値を index.html に書き戻す。調整の輪を閉じる。
- **どう作る** … ソース側の数値行に `/*@tune 名前 min max step*/` の目印コメント → `tool_tune.js` が拾って `tune.schema.json` を吐く。ゲーム側は起動直後に `location.search` の `tune=`(Base64 JSON)と `localStorage['dt.tune']` を読んで代入する20行程度の関数(既存の `?dev=1` と同じ場所)。書き戻しは**錨が index.html 内で一意であることを assert してから**置換。依存ゼロ。
- **誰が使う** … Claude / 人 / **手間** 中 / **効き目** 大
- ⭐**なぜ効くか** … つまみUIより先に要るのは「上書き口」と「書き戻し」。この2つが無い限り値は手作業でコードへ戻り、何も速くならない。かつ `test_headless.js` が index.html の script を文字列で切り出して実走する作りなので、**上書き口ができた瞬間に自動バランス探索の土台が完成する**。
- ⚠落とし穴 … 正規表現の抽出はコード整形で壊れる＝「見つからなかった目印」を必ずエラーに。`lineAcc` のような**式に埋まった係数は置換できない**＝つまみにできる数値/できない数値の線引きを先に決める。`?tune=` は URL 長の上限があるので本命は localStorage。対戦モードの通信に関わる数値には上書きを効かせない判断が要る。

> 次点(効き目大だが手間や前提が重い): ~~**セーブ移行の門番**~~ ✅**`test_save.js` として作った**
> (標本は `save_fixtures/`・ゲートに組み込み済み)／**道具のSkill化＋hooks**／**未実行コード地図**。

---

## 分野別の候補一覧

### 音

| 道具 | 何をする | 実現方法とライセンス | 手間 | 効き目 |
|---|---|---|---|---|
| ✅見取り図シート | 全SFXをスペクトログラム＋波形で1枚に束ねる | ✅**`tool_snd.js sheet`**。ffmpeg `showspectrumpic` / `showwavespic` / `tile` | 小 | 大 |
| ⭐帯域の門番 | [[NOTES_音]]の掟を数値検査にして FAIL | ⚠**未着手**(`tool_snd.js check` は並べるだけ)。ffmpeg `aspectralstats` `astats`／Node側FFTなら `fft.js`(MIT) | 中 | 大 |
| ✅素材の在庫台帳 | zipを開かず中身を索引化・UCS対訳で検索 | ✅**`tool_stock.js`**(⭐ライブラリを足さず自前でzipの中央ディレクトリだけ読んだ)。素材=Sonniss(商用可)・Kenney Audio(CC0)・Freesound CC0・ZapSplat CC0のみ | 小 | 大 |
| 場面まるごとのミックス検査 | 一番混む10秒を1本に焼き、クリップ／埋もれを測る | `OfflineAudioContext`(ヘッドレスChrome)＋ffmpeg `ebur128=peak=true` | 中 | 大 |
| レシピ振り＋聴き比べ自動生成 | 1レシピから8〜12案を焼き `?sfx=1` にA/Bブラインド比較を足す | `tool_sfx.js` の REC 表をグリッド展開(乱数は自前LCGでシード固定) | 中 | 大 |
| 物差しをRMS→K特性へ | 人の耳の重み付けで音量を揃え直す | ITU-R BS.1770のK特性。ffmpeg `ebur128` のモーメンタリ最大＋True Peak | 小 | 中 |
| 合成音の帳簿(UI限定) | コードだけで鳴る音を数字の配列で持つ | ZzFX(MIT)／jsfxr chr15m版(Unlicense)／Tone.js(MIT `Tone.Offline()`)／BGMは ZzFXM(MIT) | 小 | 中 |
| 埋め込みを Opus/WebM へ | 同音質で base64 量を減らす | `ffmpeg -c:a libopus -b:a 32k -f webm`(Opusはロイヤリティフリー) | 小 | 中 |
| **[UE5]** 音のカタログをデータから | 表から MetaSound アセットを自動生成 | MetaSound Builder API＋`AssetImportTask`(Python・⚠Experimental) | 大 | 中 |
| **[UE5]** 鳴らして・録って・測る輪 | サブミックス出力をWAVに落として ffmpeg で測る | `StartRecordingOutput`/`FinishRecordingOutput`＋`-run=pythonscript` | 大 | 中 |

### VFX

| 道具 | 何をする | 実現方法とライセンス | 手間 | 効き目 |
|---|---|---|---|---|
| ⭐コマ撮りシート(⚠`test_seq.js`=**まだ無い**) | Nフレームを等間隔で撮って1枚のタイルに | ヘッドレスChrome＋固定dtステップ関数＋ffmpeg `tile` | 中 | 大 |
| 粒エディタ(⚠`fx_edit.html`=**まだ無い**) | 初速・重力・寿命・色カーブをスライダで即プレビュー、JSONで保存 | 素のcanvas 2D＋JSON。埋め込みは `tool_part.js` と同じ枠置換。JSONスキーマの決め方だけ tsParticles(MIT) を参考に | 中 | 大 |
| VFXカタログ＋画像回帰 | 全エフェクトを格子で同時再生、前回と自動比較 | `?dev=1` に相乗り＋`pixelmatch`(ISC・依存ゼロ・1ファイル同梱可) | 小 | 大 |
| ✅手応え計測(`test_feel.js`) | ヒットストップms・画面揺れ振幅と減衰・フラッシュ持続を数値化 | ✅**作った**(⚠合否は出さない)。⚠**その場の値を見ない=2.5秒ぶんの最大を測る**([[NOTES_道具]])。📌**相場=3〜12フレーム/40〜80ms・揺れ2〜3px(弱)〜8〜10px(強)・指数減衰** | 中 | 大 |
| ✅粒テクスチャの手続き生成(`tool_tex.js`) | Kenneyに無い形(リング・線状火花・十字閃光)を生成 | ✅**作った**(8種・⭐**依存ゼロでPNG生成**=`pngjs` は入れずに済んだ)。`tool_part.js` の48px/rgba/base64経路に合流 | 中 | 中 |
| 光の層(加算＋安いブルーム)と撮り比べ | 光る物だけ低解像度canvasに描いて加算合成、URLフラグでON/OFF | `globalCompositeOperation='lighter'`＋縮小→拡大の擬似ブラー | 中 | 大 |
| 粒の予算番(⚠`perf_fx.js`=**まだ無い**) | 60fpsを割る粒数を割り出して上限に | CDP `Emulation.setCPUThrottlingRate`＋`performance.now()`。相場は drawImage 1000〜2500スプライト/60fps | 小 | 中 |
| **[UE5]** Niagara量産と自動検品 | テンプレ複製＋User Parameters を JSON/DataTable から流す | `AssetToolsHelpers`／`NiagaraSystemFactoryNew`／撮影は `take_high_res_screenshot`。2D流用は Niagara Baker | 大 | 中 |
| **[UE5]** VFXの画像回帰 | 決まったカメラ・時刻で撮って基準と比較 | UE標準 Screenshot Comparison Tool＋Functional Testing(エンジン同梱) | 中 | 中 |

### 絵・UI

| 道具 | 何をする | 実現方法とライセンス | 手間 | 効き目 |
|---|---|---|---|---|
| ✅コンタクトシート撮り | 全種を実表示サイズのまま1枚に並べて撮る | ✅**`tool_sheet.js`**。⚠**index.html そのものをページに使う**(描画関数だけ別ページで呼ぶと真っ黒になる) | 小 | 大 |
| 見た目の差分検査(スクショ回帰) | 触っていない所が変わったら知らせる | `pixelmatch`(ISC)／`odiff-bin`(MIT・約6倍速)／`looks-same`(MIT・CIEDE2000でAA無視)。canvas の `getImageData` 同士なら PNG デコード不要 | 中 | 大 |
| ✅パレット検査 | コントラスト比・色覚多様性・色数を機械判定 | ✅**`tool_look.js`**(ゲートで自動)。WCAG2の比は**自前実装**にした。❌**APCAは使わない**(商用に書面契約) | 小 | 大 |
| シルエット判別テスト | 白黒化→縮小ぼかしで「見分けがつかない組」を一覧に | 追加ライブラリ不要。輝度化→1/4縮小→全ペアIoU＋平均輝度差 | 中 | 大 |
| ✅UIレイアウトの実測検査 | 手打ち矩形をやめ、実測で重なり/はみ出し/タップ領域を判定 | ✅**`test_view.js`**(ゲートで自動・⚠**`test_layout.js` では代わりにならない**)。`getBoundingClientRect()`。下限は WCAG 2.2 の 24×24 CSS px、採ったのは 44px と 10.5px | 中 | 中 |
| 色の単一の正 | パレットJSON 1枚から両プロジェクトへ配布 | Node生成＋UE5は `EditorAssetLibrary`/DataTable。明度ランプを先に決める方式 | 中 | 中 |
| プロシージャル描画の共通部品 | 質感ノイズ・明度ランプ・接地影を関数1本に | 起動時1回だけノイズを焼いて `ctx.createPattern()` で使い回し。`simplex-noise`(MIT)か自前value noise | 小 | 中 |
| **[UE5]** データ検証(命名規約) | 命名・フォルダ・sRGB設定ミスを自動検出 | 内蔵 Data Validation(`UEditorValidatorBase`＋`-run=DataValidation`)。ルールは Allar/ue5-style-guide(MIT) | 中 | 大 |
| **[UE5]** スクショ回帰(内蔵) | UMG/マテリアル変更の巻き込み事故を検出 | Screenshot Comparison Tool。基準は `Saved/Automation/Comparisons`、許容度 Zero〜Custom | 中 | 中 |
| **[UE5]** UMG文字あふれ検査 | 枠からはみ出す・潰れる箇所を翻訳前に発見 | Localization Dashboard の Pseudolocalization＋Widget Reflector | 小 | 中 |

### 検査

| 道具 | 何をする | 実現方法とライセンス | 手間 | 効き目 |
|---|---|---|---|---|
| Chrome直結ドライバ(⚠`tool_cdp.js`=**まだ無い**) | `--dump-dom`＋正規表現をやめ、実ブラウザと双方向で会話する土台 | CDP。Node v24.18 は `WebSocket`/`fetch` 標準搭載＝**npm依存ゼロ**で書ける | 中 | 大(土台) |
| リプレイ台帳 | シード＋入力ログだけでランを完全再現、状態ハッシュで分岐点を特定 | 乱数を**進行用/演出用の二系統に分離**。Mulberry32等を自前、または `pure-rand`(MIT)/`seedrandom`(MIT)。ハッシュは FNV-1a | 大 | 大 |
| 勝率マトリクス | 実際に数百回自動プレイして勝率・到達波・死因を表に | `test_headless.js` の PvE ループを `child_process.fork` で並列化。固定戦術のスクリプトAI 3段で十分 | 中 | 大 |
| 未実行コード地図 | 一度も実行されなかった関数・分岐を一覧に | CDP `Profiler.startPreciseCoverage({detailed:true})`。単一HTMLなので行番号変換が楽 | 中 | 大 |
| 性能の定点観測 | 低速端末想定でフレーム時間・描画命令数・メモリを毎回同条件で測る | `Emulation.setCPUThrottlingRate`(rate 4〜6)＋`setDeviceMetricsOverride`。描画命令数は既存のProxyスタブ手法で `ctx` をラップ。メモリは `Performance.getMetrics` | 中 | 大 |
| ✅不変条件の総当たり | 「シェア合計100」「資源は負にならない」「保存→再開で一致」をランダム操作列で破る | ✅**`checkInvariants`**(実走の中・でたらめな操作1320手・⚠**種を固定**)。`fast-check` は入れず**自前簡易版**で済ませた | 中 | 中 |
| パラメータ自動探索 | 数値の組み合わせを振って狙った勝率カーブに近い組を出す | 総当たり＋座標降下で足りる。本格化するなら `Optuna`(MIT・Python)をサブプロセスで | 中 | 中 |
| DEV画面の自動検査 | `edPanel`/`edBad`/`edOut`・`openZoo`・`openSfxTest` を `test_headless.js` から一度も呼んでいない穴を埋める | 既存の `check*()` に追加するだけ | 小 | 中 |
| **[UE5]** コマンドラインで回る自動テスト土台 | エディタを開かずテストを流し結果JSONを受け取る | `UnrealEditor-Cmd.exe <proj> -ExecCmds="Automation RunTests X;Quit" -unattended -nullrhi -ReportOutputPath=…`＋Data Validation(エンジン同梱) | 中 | 大 |
| **[UE5]** 性能の自動計測 | 決まった場面のフレーム時間をCSVに吐き前回と比較 | 内蔵 CSV Profiler(`csvprofile start/stop`、出力は `Saved/Profiling/CSV/`)。本格運用は Gauntlet＋Unreal Insights | 大 | 中 |

### 調整

| 道具 | 何をする | 実現方法とライセンス | 手間 | 効き目 |
|---|---|---|---|---|
| ✅つまみ抽出＆上書き口 | 数値を機械可読に吸い出し、外から差し替える口を作る | ✅**`tool_tune.js`**。実際は `TUNE(名前,既定,下限,上限,刻み)` 宣言＋`?tune=`/localStorage。依存ゼロ | 中 | 大 |
| ✅値の書き戻し器 | 詰めた JSON を index.html に反映して輪を閉じる | ✅**`tool_tune.js` に同居**。錨の一意性を assert してから置換 | 小 | 大 |
| ライブつまみパネル | 遊びながらスライダで即反映、値をJSONで吐く dev 専用HTMLを生成 | **lil-gui 0.21.0(MIT・UMD min 29,668B・CSSがJSに同梱・`gui.save()`/`load()`)** が最適。Tweakpane 4.0.5(MIT)は152,084Bで5倍重い、dat.GUI 0.7.9(Apache-2.0)はCSS別＋更新停滞 | 小 | 大 |
| 自動バランス探索 | ヘッドレスを回して狙った波の推移に近い数値の組を探す | `test_headless.js` の script 文字列を評価前に差し替えるだけ。`child_process` で4〜8並列、乱択→山登り | 中 | 大 |
| CDP直結ライブチューナー | 動いているゲームに外から数値を注入して即スクショ | `--remote-debugging-port=9222`＋`Runtime.evaluate`/`Page.captureScreenshot`。Node標準WebSocketで依存ゼロ | 中 | 中 |
| 実機つまみ＋値の持ち帰り | スマホで触った値をPCのファイルへ戻す | Node標準 `http` の LAN サーバ＋QR(`qrcode` MIT／`qrcode-terminal` Apache-2.0) | 中 | 中 |
| **[UE5]** Remote Control API | 動いているUE5のプロパティを外から読み書き・関数呼び出し | 標準プラグイン。HTTP 30010／WS 30020、`PUT /remote/object/property`。Node の fetch や curl だけで叩ける。⚠Beta | 中 | 大 |
| **[UE5]** CVar集約＋ini流し込み | 調整数値を1ファイルに宣言、iniから一括投入 | `TAutoConsoleVariable`＋`ConsoleVariables.ini` の `[Startup]`。BP から触る値は `UDeveloperSettings`(config=Game) | 中 | 大 |
| **[UE5]** DataTable⇄CSV往復 | 表をCSVで持ち、エディタを開かず流し込む | `FTableRowBase` 継承struct＋`DataTableFunctionLibrary.fill_data_table_from_csv_file()`／`export_…`。`-run=pythonscript` で起動不要 | 中 | 大 |
| **[UE5]** Dear ImGui オーバーレイ | 画面上に即席スライダー・グラフ | UnrealImGui(MIT)＋Dear ImGui(MIT)。本家はUE4.26で停止＝UE5対応フォークが要る | 大 | 中 |

### AI生成

⚠**大前提** … Steam は 2026-01-16 の改訂で「開発効率ツールは開示の対象外」と明記(原文『Efficiency gains through the use of these tools is not the focus of this section.』)。**Claude Code で道具を作ること自体は開示不要**、AI が作った素材(絵・音・物語・**ローカライズ**)を出荷したら開示。

| 道具 | 何をする | 実現方法とライセンス | 手間 | 効き目 |
|---|---|---|---|---|
| AI生成物の台帳 | AI由来素材のプロンプト・シード・モデル・ライセンス・日付を集約し、Steam の Content Survey に貼れる文面を吐く | 自作 Node(`ai_ledger.json`)。生成ツール側から**書かないと出力しない**設計に | 小 | 大 |
| 見た目の自動採点(二段構え) | 数値検査で足切りし、抜けたものだけ画像モデルに講評させる | `pixelmatch`(ISC)＋WCAG輝度式自前＋Anthropic Messages API(出力の権利はユーザーに譲渡と規約に明記) | 中 | 大 |
| 参考画像ジェネレータ | 「こんな雰囲気」の当たり付け画像。ゲームには一切入れない | ComfyUI(GPL-3.0)を `--listen` で常駐させ **HTTP API 越し**に叩く。モデルは **FLUX.1-schnell(Apache-2.0)** か SDXL 1.0。RTX 3080 なら fp8/GGUF で動く | 中 | 中 |
| 参考画像→描画パラメータ抽出 | 代表色16色・明度分布・シルエット比を JS 定数として吐く | ヘッドレスChromeのcanvasでピクセル読み＋median-cut 自前。外部なら `node-vibrant`(MIT) | 小 | 中 |
| 効果音の合成器(AI不使用) | UI音・ピコ音をコードで合成＝完全再現・開示不要 | `jsfxr`(Unlicense)の `toWave().dataURI`／Node側 OfflineAudioContext。圧縮は `tool_sfx.js` の ffmpeg 探索を流用 | 小 | 中 |
| AI効果音の穴埋め | Sonniss を漁っても無い音だけ生成 | ElevenLabs Sound Effects API(**$5/月の Starter 以上でのみ商用可**)／Stable Audio Open 1.0(Community License・**要登録**・年商$1M未満) | 中 | 中 |
| ローカライズ抽出→翻訳→再埋め込み | 日本語文言をID付きJSONに抜き、訳してビルド時に埋め戻す | 自作 Node＋Anthropic API か DeepL API。用語集は別ファイルで固定 | 中 | 中 |
| セリフ/ボイスの生成 | 掛け声・警告アナウンスをローカルTTSで | Kokoro TTS(hexgrad/Kokoro-82M・Apache-2.0・VRAM 2GB未満・日英対応)→`tool_sfx.js` 経路へ | 中 | 中 |
| **[UE5]** レベル配置ジェネレータ | 配置案JSONの通りにアクタを置く/差分更新 | Python Editor Scripting＋`EditorActorSubsystem`。配置後は `AssetTools.save_assets([])` で OFPA ごと保存 | 中 | 大 |

### 運用

| 道具 | 何をする | 実現方法とライセンス | 手間 | 効き目 |
|---|---|---|---|---|
| ✅出す前の関門(リリースゲート) | 検査を決まった順で全部流し、1本でも落ちたら止める | ✅**`tool_release.js`**。`spawnSync`・依存ゼロ。⚠**git hook には入れていない**。**[UE5]** は `RunUAT.bat BuildCookRun`＋`-run=DataValidation` を並べる | 小 | 大 |
| ✅セーブ移行の門番 | セーブに版番号を持たせ、移行関数を並べて旧セーブ標本を毎回全通し | ✅**`test_save.js`**＋`save_fixtures/*.json`。`zod`/`valibot` は入れずに済ませた。**[UE5]** は `FCustomVersionRegistration`＋`UObject::Serialize` | 中 | 大 |
| ✅実機セーブの持ち帰り | 実機の localStorage を1本の文字列で書き出す/読み戻す | ✅**🔬研究所の `💾書き出す/読み込む`**。`CompressionStream('deflate')`(ブラウザ標準)→base64 | 小 | 大 |
| 重さの内訳と棚卸し | 2.46MB の内訳(コード/音/画像)と未使用の関数・キーを出す | `test_undef.js` の字句剥がしを流用＋Node標準 `zlib` で gzip 後サイズ。`knip`(ISC)は package.json 前提で今の構成には効かない | 小 | 中 |
| ✅数値表の自動生成＋設計書との照合 | 実装の数値から Markdown 表を作り、md のズレを報告 | ✅**`tool_nums.js`**(ゲートで自動)。[[DESIGN]] の `<!-- AUTO:nums -->` を差し替え＋文章の数字を `@claim` で検算 | 小 | 大 |
| 文言の一元化と枠はみ出し検査 | 画面文言を表に集め、未定義/未使用キーと**実測幅のはみ出し**を検出 | 抽出は自前(または `acorn` MIT／`espree` BSD-2)。運用の型は `i18next-parser`(MIT)を真似る。幅は `ctx.measureText()` を実寸で。**[UE5]** は `-run=GatherText` | 大 | 中 |
| 配信の自動化 | ビルド→点検→Steamアップまで1コマンド、実績解除もコードから | `electron-builder`(MIT)＋`steamcmd`(`+run_app_build_http`)＋`steamworks.js`(MIT・プリビルド同梱)。⚠CI化は非推奨(下記) | 中 | 中 |
| 詰まり所の見える化 | どの面・どの波で何回負けたかを端末内だけで集計し、人がコピーして渡す | localStorage 集計＋DEV画面に表。外送りは自前サーバが要る(Umami MIT／GoatCounter EUPL-1.2／Plausible AGPL-3.0) | 中 | 中 |

### エージェント向け(Claude Code 自身の効率)

| 道具 | 何をする | 実現方法とライセンス | 手間 | 効き目 |
|---|---|---|---|---|
| 道具のSkill化＋hooksで強制 | 道具の使い方を1か所にまとめ、「編集したら必ず検査が走る」を仕組みで強制 | Claude Code の Agent Skills(`.claude/skills/deadtide-tools/SKILL.md`・必要な時だけ読み込まれる)＋hooks(PreToolUse/Stop)。⚠**MCPサーバは作らない** | 小 | 大 |
| ⭐Superpowers を**手本として読む** | スキルの書き方・「終わったと言う前に確かめる」の言語化を借りる | [obra/superpowers](https://github.com/obra/superpowers/)(**MIT**)。⚠**丸ごと入れない**(下の❌参照)。読むのは `writing-skills` / `verification-before-completion` / `systematic-debugging` の3本 | 小 | 中 |
| `test_shot.js` に `--help` とオプション表 | 50以上のオプションを一覧化し、`w+数字` が時間指定に食われる等の名前衝突を明示 | ソース内に表を1つ持たせて印字するだけ | 小 | 中 |
| デバッグモードの入口を画面に出す | `?dev=1` `?edit=1` `?sfx=1` `?v2=1` `?px=1` をURL直打ちせず切り替える | DEVタイトルの🔊📖🧪と同じ場所にトグルを足す | 小 | 中 |
| **[UE5]** 「起動して測る」を1本のバッチに | エディタPython実行・自動スクショ・自動テストを1コマンドにまとめ、Claude は結果テキストだけ読む | `-run=pythonscript -script=…`／`take_high_res_screenshot`(`is_task_done()` で完了待ち)／`-ExecCmds="Automation RunTests …"`／Gauntlet。既存 Unreal MCP は軽い操作用に残す | 大 | 大 |

---

## ❌やらない方がいいもの

### ライセンスで踏んではいけない
- ⚠**Sonniss 素材を AI の学習・fine-tune・生成の種にする** … 契約で明示的に禁止(『expressly prohibited from using any sound effects … for the purpose of training artificial intelligence technologies』)。単体SFXとしての再配布も禁止(base64でゲームに埋め込むのは可)。
- ❌**FLUX.1-dev**(非商用)、❌**declare-lab/Tango 系**(CC-BY-NC-SA-4.0＝商用不可)、❌**ElevenLabs 無料プランの出力**(商用不可)。
- ❌**apca-w3(APCAコントラスト)** … 「Limited W3 License」で商用利用に書面契約が必要。WCAG2の比を自前実装する。
- ❌**Freesound の API を商用アプリに組み込む** … APIは非商用限定(音そのもののCC0ライセンスとは別の話)。手動DLして使うのは可。
- ❌**ComfyUI の `custom_nodes/` に自作コードを置く** … 本体が GPL-3.0。別プロセスから HTTP API 越しに叩く。
- ❌**ffmpeg バイナリの製品同梱**(winget版はGPLビルド)。ビルド時にCLIで呼ぶだけなら伝播しない。
- ❌**Steamworks SDK 本体をリポジトリに入れる** … Valve 独自ライセンスで再配布不可。gitignore。
- ❌**NC(非商用)素材全般**。

### この保管庫の決定に反するので蒸し返さない
- ❌**ドット絵への回帰** … 決定済み。`tool_px.js` の存在が示すとおり、規格を後から矯正するコストが高い。
- ❌**Blender** … 2回試して捨てた。
- ❌**外部フォント** … ラベルも canvas 標準フォントで足りる。
- ❌**輪郭の2度描き** … [[NOTES_絵]] で既に捨てた決定(`?v2=1` は見比べ用のスイッチとして残っているだけ)。
- ⭐例外は**粒(パーティクル)の画像だけ**(Kenney Particle Pack・CC0)。

### 技術的に罠だと分かったもの
- ❌**オシレータ合成(ZzFX/sfxr)で肉・骨・衝撃を作る** … [[NOTES_音]] に「オシレータは何をどう重ねても電子音になる」と結論済み。**UIと電子機器に限定**。
- ❌**短い効果音の Integrated LUFS で音量を揃える** … 絶対-70LUFS/相対-10LUのゲートと400msブロックで、0.1〜0.3秒の音は測定が壊れる。モーメンタリ最大かK特性RMSで。
- ❌**Ogg-Opus で埋め込む** … Chrome の `decodeAudioData` が通るのは**WebMコンテナのOpusだけ**。iOS Safari の WebM/Opus は 18.4 でやっと(15.4〜17.3は壊れていた)＝mp3のフォールバックを残すか実機確認してから。
- ❌**CDP の `HeadlessExperimental.beginFrame` に依存した撮影** … Chromium 147+ で削除済み。ゲーム側の step を自分で呼ぶ方式に。
- ❌**`ctx.filter='blur()'`** … MDN で Baseline ではない扱い。ぼかしは縮小→拡大の擬似ブラーで。
- ❌**`'lighter'`(加算)の多用** … Firefox は source-over 以外の合成が遅い既知バグ。白飛びもする。
- ❌**WebGL移行 / Effekseer(MIT・商用可だが)** … canvas 2D の drawImage は 1000〜2500スプライト/60fps が相場で、粒2000超えて初めて検討する規模。Effekseer は canvas 2枚重ねの管理コスト＋wasm を base64 で抱える羽目になる。**[UE5]** 側なら選択肢だが Niagara で足りる。
- ❌**Playwright / Puppeteer / jsdom / node-canvas の導入** … 依存ゼロ構成を崩す。実 Chrome が手元にあるのに別実装で近似する意味が薄い(node-canvas は Windows のネイティブビルドで嵌る)。
- ❌**自作MCPサーバを増やす** … MCPはツール定義を毎ターン常時コンテキストに載せる。3サーバで200kのうち143kを食った実測例、実用上限5〜7、ツール選択精度43%→14%の劣化報告。CLIはトークン4〜32倍安い。**[UE5]** も既存 Unreal MCP で足り、重い処理は CLI へ寄せる。
- ❌**ゲーム画面まるごとのスクショ回帰を最初に作る** … 乱数とアニメで落ちまくって誰も見なくなる。まず「部品を並べたコンタクトシート」の回帰から。
- ❌**完全リプレイを先にやる** … `Math.random()` が93か所、固定ステップ化も要る大手術。まず「盤面を丸ごと吐くスナップショット」で10分の1の手間で8割の再現ができる。
- ❌**3,130箇所の日本語文言を今一括置換する** … 過去の置換事故(`ifisMine`)の再演リスク。先に「枠からはみ出す検査」だけ作れば実利の8割。
- ❌**Steam アップロードの CI 化** … Steam Guard(2FA)と ssfn 周りが Valve 側の変更で壊れており、game-ci/steam-deploy に未解決 issue(#4/#15/#38/#56)。個人開発ならローカル1コマンドで十分。
- ❌**外部へ送るアナリティクス** … Steam 配信時に自分名義のプライバシーポリシーが要り、EEA 向けは同意も要る。遊ぶ人が少ない段階では統計にもならない＝端末内集計だけ。
- ❌**カバレッジ率・スクショ差分ゼロを「目標値」にする** … 数字を守るためのテストが増え、面白さには1ミリも効かない。
- ❌**自動プレイボットの成績を見て難易度を下げる** … ボットの腕≠人間の腕。使えるのは**変更前後の差分**だけ(`CLAUDE.md` の既存の警告と同じ)。
- ❌**AI の講評を合否判定に使う** … 2026時点でも VLM は密なグリッド・細い境界・小さい要素を取り違え、UIアニメの意図理解は最良モデルでも精度0.64、同一試験で文字89.5%に対し画像66.0%。落とすべき不具合は必ず数値側で落とす。
- ❌**Superpowers を丸ごとプラグインとして入れる**(2026-08-02 調査)…
  [obra/superpowers](https://github.com/obra/superpowers/)(MIT)は
  **ブレスト→worktree→計画→サブエージェント実行→TDD→レビュー→ブランチを畳む**の7段階を
  「Mandatory workflows, not suggestions」として**自動発火で強制**する。この案件では3点で噛み合わない:
  ①**単一 index.html なので worktree と並行エージェントが空回り**(7段階のうち4つがこれ)
  ②**TDD の強制が「検査が通った=完成」という一番危ない誤解を強める**
    (2026-08-02(65)の🪤鉄条網=**検査は全部通っていたのに手応えがゼロ**だった件がまさにそれ)
  ③**`CLAUDE.md` の「聞かれたら答えるだけ。勝手に着手しない」と正面から競合する**
    (向こうはスキルが自動で発火して計画を書き始める)。
  ⭐**MITなので中身を読んで掟に混ぜるのが一番安い**=読む価値があるのは
  `writing-skills`(スキルの書き方の手本)/`verification-before-completion`(この保管庫の
  「撮って目視するまで報告しない」と同じ思想の言語化)/`systematic-debugging`
  ([[NOTES_道具]] の「**『効果があった』を合計で測ると、不具合があっても素通りする**」の一般形)の3本。
- ❌**週1回も使わない道具を作る/残す** … 道具の保守が本体より重くなる典型的負債。追加時に「どれを消すか」を同時に決める。
- **[UE5]** ❌**Niagara を Python で一から組む**(`NiagaraEmitterConversionContext` 等) … UE5.6でも Experimental＋変換プラグイン付属でドキュメントが薄い。テンプレ複製＋User Parameters 差し替えに留める。
- **[UE5]** ❌**Remote Control を配布ビルドに残す** … Beta かつ**認証なしのローカルHTTPサーバ**が開く。
- **[UE5]** ❌**`-NullRHI` でスクショ系テストを回す** … 描画しないので絵が出ない。
- **[UE5]** ❌**`ConsoleVariables.ini` に製品の既定値を置く** … Shipping/Test ビルドでは読み込まれない。

---

## ⚠分かっていないこと / 要確認

- **Kokoro TTS** … Apache-2.0 はモデル本体の話。**個々の voicepack の学習元データの由来は追い切れていない**。商用出荷前に使う voice を1つに絞って確認が要る。
- **Stable Audio Open / SD3.5(Stability Community License)** … 年商$1M未満なら商用可だが **stability.ai/community-license での登録が必須**。登録の実手順は未確認。
- **参考画像がAI生成のとき、そこから抽出した色数値**が Steam の『ships with your game』に当たるかは**グレー**。実害は無いので開示欄に書く方が安全。
- **[UE5] レベル配置データ**が pre-generated 開示対象かも**グレー**(手続き的生成に近い)。書いても損はない。
- **[UE5] Python API 全般が Experimental 表記** … MetaSound Builder / Niagara 変換 / DataTable 系ともバージョン間(5.2〜5.8)で差がある。**UE更新で壊れる前提**で書く。
- **[UE5] ue5-style-guide の Linter プラグイン** … 本体は MIT だが、配布元(Fab/GitHub)と UE バージョン対応は要確認。
- **[UE5] PerfGuard(Fab)** … 有料の可能性。導入前に価格確認。
- **[UE5] FMOD Indie / Wwise Indie** … 無料枠(FMOD=年商$200K未満＋資金$500K未満／Wwise=制作予算$250K未満)に入っていても**審査申請と定期報告**が要る。当面 MetaSound で足りる。
- **CDP の一部メソッド** … `Emulation.setVirtualTimePolicy` 等は Experimental で Chrome 更新時に挙動が変わる。Edge フォールバックは完全互換ではない。
- **`performance.measureUserAgentSpecificMemory()`** … 新ヘッドレスモードで失敗する既知報告あり。`Performance.getMetrics` を使う方が確実。
- **`CompressionStream`** … Safari 16.4 以降。古い端末向けに素の base64 へ落とす分岐が要る。
- **閾値に理論値が無いもの**(帯域の門番・シルエット判別・手応え計測) … 「今OKと言われている物」から逆算するしかない。**最初は合否を出さずランキングだけ**出すのが安全。
- **lil-gui / Tweakpane / dat.GUI のサイズ** … 2026-08時点で npm registry / jsDelivr から実ファイルを取って実測した値。将来版で変わる。

---

⚠**まだ作っていない候補**に手を付けるのはユーザーの指示待ち(✅の付いた物は作り終えている)。

---

## 📌 2026-08-02(68) 実際に代償を払った所(この順で作るのを勧める)

⭐**この節は「机上の順位」ではなく、1セッション(2面の作成+UIの作り直し)で実際に起きたことの記録**。

1. ✅**まとめて流す口 + 落ちない検査を落ちるようにする**(上の候補1)=**2026-08-02(69)に作った**
   - `test_layout.js` を**流し忘れた**(UIを丸ごと作り替えた後に思い出した)。
   - `test_balance.js` が「⚠タワーのDPSが解放順で下がっている3件」と出しながら **exit 0** なので、
     **自分のせいか元からかを確かめるために `git stash` する**羽目になった。
     ⚠さらに **stash で index.html が CRLF に化けて**、戻す作業まで発生した(既知の穴・[[NOTES_道具]])。
2. ⭐**UIレイアウトの実測検査**(絵・UIの表)
   - このセッションの不具合は**全部この型**だった:
     ①ミニゲームの見出しが**右の数字に食われて説明ごと消えていた**(⚠**実機報告まで漏れた**)
     ②CSS grid の `1fr` が min-content を守って**隣のカラムへはみ出した**
     ③縦積みしたはずの `<b>`/`<i>` が**同じ行に並んだ**
   - ⚠**検査は全部グリーンだった**。⭐`getBoundingClientRect()` で
     **重なり / はみ出し / タップ44px / 文字10.5px** を機械判定できていれば全部落ちていた。
3. ⭐**コンタクトシート撮り**(上の候補2)
   - 資料用に**その場しのぎで作ったら5分で動いた**ので「手間 小」は正しい。
   - ⭐**一番安いレシピ**=ヘッドレスChromeを `--dump-dom` で起動し、ページ側で
     `UTHUMBS[i].toDataURL()` を集めて `<div id="dump">` にJSONで詰め、標準出力から正規表現で抜く。
     ⚠`--screenshot` と違って**テキストを持ち帰れる**のがこの手の道具の肝。

⚠**順番を下げた方がいいもの**(⚠**2026-08-02(68)時点の判断**。⭐**結果はどれも後で作った**):
- **つまみ抽出(`tool_tune.js`)**=バランス調整が「実機確認待ち」で止まっているので、
  上書き口を作っても**回す相手がいない**。実機のバランス確認が始まってから。
  → ✅**(189)で作った**(実機のバランス確認が始まったため)。
- **音の道具(在庫台帳・見取り図・帯域の門番)**=いま音を1つも触っていない。
  → ✅**在庫台帳=(209)`tool_stock.js` / 見取り図=(189)`tool_snd.js sheet`**。⚠**帯域の門番だけまだ**。
- **デバッグモードの入口を画面に出す**=今回の事故(「?dev=1 を付け忘れて渡した」)を直したのは
  トグルではなく**検査**(まっさらでも2面の開拓便に入れるか)だった。
  → ✅**その後 🚪DEVタイトルの入口も作った**。

⚠**表の訂正**: 「Stop フック=`test_undef.js` の自動実行」は**設定されている**が、
置き場所が `.claude/settings.local.json` = **git 管理外**。環境が変わると消える。

## 🔥 塗りの物差し(2026-08-05(174)に作った)
⚠⚠**`tool_bench.js`(時間)と役割が違う**=「重い」は時間、「熱い」は塗った面積。
**(173)の「塔1台につき灯り1枚」は時間には出ず、塗りの物差しにだけ出た**。
📌**3つ(`?perf=1` / `tool_paint.js` / `--check`)の使い分け・実測値・作る時に踏んだ穴は
[[NOTES_道具]] の「🔥塗りの物差し」に全部ある**(上の表の1行だけここに残す)。
