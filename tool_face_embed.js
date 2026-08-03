/* 🙂 切り出した顔(px_data/face-*.txt)を index.html へ埋め込む(2026-08-03(101))
 *
 *   node tool_face_embed.js            全部入れ直す
 *
 * ⚠**アイコン(ICN)とは別の入れ物(FACE)にする**=役割が違う物を同じ表に混ぜると、
 *   片方を消した時にもう片方が巻き添えになる(NOTESの「同じ物の入れ物を2つ作らない」の逆で、
 *   **違う物は分ける**)。⭐差し込み先は FACES-START/END の間だけ。
 */
const fs=require('fs');
const SRC='index.html';
let h=fs.readFileSync(SRC,'utf8');

const files=fs.readdirSync('px_data').filter(f=>/^face-.+\.txt$/.test(f));
if(!files.length){console.log('px_data に face-*.txt が無い');process.exit(1);}

const rows=files.map(f=>{
 const id=f.replace(/^face-/,'').replace(/\.txt$/,'');
 const b64=fs.readFileSync('px_data/'+f,'utf8').trim();
 return " '"+id+"':'data:image/png;base64,"+b64+"'";
});
const block="/* === FACES-START === */\n"
 +"/* 🙂**英雄の顔の絵**(2026-08-03(101)ユーザー指示で方針変更=顔だけ画像にしてよい)。\n"
 +"   ⚠**顔だけ**=体・武器・髪の揺れは今までどおりプロシージャル。⭐差し替えは tool_face.js→tool_face_embed.js。\n"
 +"   ⚠ここは道具が丸ごと書き換える=手で編集しない。 */\n"
 +"const FACE={\n"+rows.join(',\n')+"\n};\n"
 +"const FACEI={};/* 読み込んだ Image の置き場(1回だけ作る) */\n"
 +"function faceImg(id){\n"
 +" if(!FACE[id])return null;\n"
 +" let im=FACEI[id];\n"
 +" if(im===undefined){im=new Image();im.src=FACE[id];FACEI[id]=im;}\n"
 +" return (im&&im.complete&&im.naturalWidth)?im:null;\n"
 +"}\n"
 +"/* === FACES-END === */";

if(h.indexOf('/* === FACES-START === */')>=0){
 h=h.replace(/\/\* === FACES-START === \*\/[\s\S]*?\/\* === FACES-END === \*\//,block);
}else{
 /* 初回=アイコンの表の直後に置く(画像の仲間なので近くにまとめる) */
 const anc='/* === ICONS-END === */';
 if(h.indexOf(anc)<0){console.log('差し込み先(ICONS-END)が見つからない');process.exit(1);}
 h=h.replace(anc,anc+'\n'+block);
}
fs.writeFileSync(SRC,h);
console.log('埋め込んだ顔: '+files.map(f=>f.replace(/^face-|\.txt$/g,'')).join(', '));
console.log('index.html: '+Math.round(fs.statSync(SRC).size/1024)+'KB');
