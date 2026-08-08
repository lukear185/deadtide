#!/usr/bin/env node
/* 🎵 tool_bgm.js — BGMファイル(bgm_src/*.mp3)を低ビットレートに焼いて index.html へ埋め込む(2026-08-08(219))
   ⚠素材の生mp3はリポジトリに入れない(bgm_src/ は .gitignore 済み)=このツールが埋め込んだ物だけが配布物。
   出所: Pixabay(商用可・クレジット不要)。曲を差し替える時は下の LIST を書き換えて実行。
   使い方: node tool_bgm.js        … 焼き直して index.html の BGM-DATA ブロックを書き換える */
'use strict';
const fs=require('fs'),path=require('path'),cp=require('child_process'),os=require('os');

/* k=ゲーム側のキー / f=bgm_srcのファイル名 / d=切り出す秒(nullなら全部) / br=ビットレート / ar=サンプルレート
   src=出所のURL(台帳代わり。ここに必ず書く) */
const LIST=[
 {k:'gsc',f:'gacha_home_groove.mp3',d:null,br:'64k',ar:32000,fade:0,
  src:'https://pixabay.com/music/funk-loop-seamless-groove-bed-573931/'},/* ガチャ画面(明るい) */
 {k:'gpl',f:'gacha_pull_tension.mp3',d:66,br:'48k',ar:24000,fade:.8,
  src:'https://pixabay.com/music/crime-scene-drama-tension-1-113757/'},/* 引いてる最中(緊張) */
];

function findFF(){
 const cands=['ffmpeg',process.env.FFMPEG||'',
  path.join(process.env.LOCALAPPDATA||'','Microsoft','WinGet','Links','ffmpeg.exe')];
 for(const c of cands){if(!c)continue;
  try{cp.execFileSync(c,['-hide_banner','-version'],{stdio:'ignore'});return c;}catch(e){}}
 try{const base=path.join(process.env.LOCALAPPDATA||'','Microsoft','WinGet','Packages');
  for(const d of fs.readdirSync(base)){if(!/ffmpeg/i.test(d))continue;
   const st=[path.join(base,d)];
   while(st.length){const cur=st.pop();
    for(const e of fs.readdirSync(cur,{withFileTypes:true})){const p=path.join(cur,e.name);
     if(e.isDirectory())st.push(p);else if(e.name.toLowerCase()==='ffmpeg.exe')return p;}}}
 }catch(e){}
 return null;}

const FF=findFF();
if(!FF){console.log('FAIL: ffmpeg が見つからない');process.exit(1);}
const SRC=path.join(__dirname,'bgm_src');
const IH=path.join(__dirname,'index.html');
let out='const BGMB={';
for(const R of LIST){
 const src=path.join(SRC,R.f);
 if(!fs.existsSync(src)){console.log('FAIL: 無い '+src);process.exit(1);}
 const tmp=path.join(os.tmpdir(),'bgm_'+R.k+'.mp3');
 const args=['-y','-i',src];
 if(R.d)args.push('-t',String(R.d));
 if(R.fade&&R.d)args.push('-af','afade=t=out:st='+(R.d-R.fade)+':d='+R.fade);
 args.push('-ac','1','-ar',String(R.ar),'-b:a',R.br,tmp);
 cp.execFileSync(FF,args,{stdio:'ignore'});
 const b=fs.readFileSync(tmp);
 out+='\n '+R.k+':"data:audio/mpeg;base64,'+b.toString('base64')+'",';
 console.log('  '+R.k+'  '+(b.length/1024).toFixed(0)+'KB  ← '+R.f+(R.d?(' ('+R.d+'秒)'):''));
}
out+='\n};';
let html=fs.readFileSync(IH,'utf8');
const M1='/*🎵BGM-DATA*/',M2='/*🎵BGM-DATA-END*/';
const i1=html.indexOf(M1),i2=html.indexOf(M2);
if(i1<0||i2<0){console.log('FAIL: index.html に BGM-DATA の目印が無い');process.exit(1);}
html=html.slice(0,i1+M1.length)+'\n'+out+'\n'+html.slice(i2);
fs.writeFileSync(IH,html);
console.log('✅ index.html の BGM-DATA を書き換えた('+LIST.length+'曲)');
