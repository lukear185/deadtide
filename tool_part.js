/* 粒(パーティクル)の絵を index.html へ埋め込む開発用ツール(2026-08-02(34))
   使い方: node tool_part.js [--size=48] [--dry]

   ⚠**素材の出所**: Kenney "Particle Pack" (kenney.nl) / **CC0**(商用可・クレジット任意)。
     ⚠ライセンス本文は px_src/kenney/Kenney-License.txt にそのまま置いてある。
     ⚠**元の大きいPNGはリポジトリに入れない**(効果音の生WAVと同じ扱い)。ここで縮めて base64 にする。

   ⚠**なぜ素材を入れたか**(2026-08-02(34)ユーザー「音とかエフェクトに限界感じてる」→
     「商用OKで無料なら使ってもいいよ」)=**粒だけはコードで描くと限界がある**。
     四角と丸をどれだけ重ねても「柔らかい煙」「散る飛沫」にはならない。
     ⚠**キャラと地形は今までどおりプロシージャル**(この素材は粒の texture だけに使う)。

   ⚠ffmpeg が要る(tool_sfx.js と同じ探し方をする)。 */
const fs=require('fs'),path=require('path'),cp=require('child_process');
const A=process.argv.slice(2);
const opt=(k,d)=>{const m=A.find(s=>s.startsWith('--'+k+'='));return m?m.slice(k.length+3):d;};
const SIZE=+opt('size',48),DRY=A.indexOf('--dry')>=0;
const SRC=path.join(__dirname,'px_src','kenney');
const HTML=path.join(__dirname,'index.html');
/* 使う粒 → ゲーム側のキー。⚠**増やす時はここだけ**(index.html 側は PARTS[キー] で引く) */
const MAP={
 'smoke_04.png':'puff', /* 柔らかい丸い煙=血の飛沫・土埃の主役 */
 'smoke_08.png':'puf2', /* もう少しちぎれた煙 */
 'dirt_02.png' :'grit', /* ざらついた土 */
 'light_02.png':'glow', /* ぼんやりした光=ヘッドライト・被弾の光 */
 'flare_01.png':'flar', /* 十字の閃光=まとめ轢きの瞬間 */
 'scorch_02.png':'splt',/* 地面の染み=血だまり */
 'spark_04.png':'sprk'  /* 細かい火花=金属の擦れ */
};
function findFF(){
 const c=[process.env.FFMPEG,'ffmpeg',
  path.join(process.env.LOCALAPPDATA||'','Microsoft','WinGet','Links','ffmpeg.exe')];
 for(const x of c){if(!x)continue;try{cp.execFileSync(x,['-hide_banner','-version'],{stdio:'ignore'});return x;}catch(e){}}
 return null;
}
const FF=findFF();
if(!FF){console.log('FAIL: ffmpeg が見つからない');process.exit(1);}
const TMP=path.join(require('os').tmpdir(),'dt_part');
if(!fs.existsSync(TMP))fs.mkdirSync(TMP);
const out={};let total=0;
for(const f of Object.keys(MAP)){
 const src=path.join(SRC,f);
 if(!fs.existsSync(src)){console.log('× 素材なし: '+f);continue;}
 const dst=path.join(TMP,MAP[f]+'.png');
 /* ⚠⚠**`-pix_fmt rgba` を必ず付ける**(2026-08-02(34)に踏んだ)=付けないと**透明が落ちて
    四角い板**になり、画面に「謎の四角い光」が出る(撮って気づいた)。 */
 cp.execFileSync(FF,['-y','-hide_banner','-loglevel','error','-i',src,
  '-vf','scale='+SIZE+':'+SIZE+':flags=lanczos','-pix_fmt','rgba','-compression_level','100',dst]);
 const b=fs.readFileSync(dst);
 out[MAP[f]]='data:image/png;base64,'+b.toString('base64');
 total+=b.length;
 console.log('  '+MAP[f].padEnd(5)+' '+f.padEnd(16)+' '+(b.length/1024).toFixed(1)+'KB');
}
console.log('---- '+Object.keys(out).length+'種 / '+(total/1024).toFixed(1)+'KB (base64で約'+((total*1.37)/1024).toFixed(0)+'KB)');
if(DRY)process.exit(0);
let html=fs.readFileSync(HTML,'utf-8');
const S='/* <<PARTS>> */',E='/* <<PARTS-END>> */';
const i0=html.indexOf(S),i1=html.indexOf(E);
if(i0<0||i1<0){console.log('FAIL: index.html に PARTS の枠が無い');process.exit(1);}
const body=S+'\n/* 粒の絵(Kenney Particle Pack・CC0・商用可)。⚠この塊は tool_part.js が書き換える。手で編集しない */\n'
 +'const PARTS={\n'+Object.keys(out).map(k=>' '+k+":'"+out[k]+"'").join(',\n')+'\n};\n';
html=html.slice(0,i0)+body+html.slice(i1);
fs.writeFileSync(HTML,html);
console.log('埋め込み完了');
