#!/usr/bin/env node
/* 🎙 tool_aisfx.js — ElevenLabs Sound Effects で効果音を生成して sfx_src へ置く(2026-08-08(218))
   ⚠⚠**Starter($5/月)以上でのみ商用利用可**。無料プランの出力は商用不可=ゲームに入れない(TOOLS.mdの❌)。
   ⚠APIキーはリポジトリに入れない=次のどれかに置く(上から順に探す):
     ①環境変数 ELEVEN_KEY ②リポジトリ直下の .eleven_key(⚠.gitignore済み)
     ③%USERPROFILE%\.deadtide_eleven_key
   使い方:
     node tool_aisfx.js "single rifle gunshot, dry, punchy, close range" rifle_a 1.2
       → sfx_src/AI_rifle_a.wav(44.1kHz)+ai_ledger.json に台帳1行
     そのあとは今までどおり: tool_sfx.js のレシピに {f:'AI_rifle_a',...} を書く → build → embed。
   ⚠プロンプトは**英語**(その方が精度が高い)。⚠**Sonniss素材を種・参照に使わない**(契約で禁止)。
   📒台帳(ai_ledger.json)=Steam の AI開示(Content Survey)に貼るための記録。**書けない時は生成しない**。 */
'use strict';
const fs=require('fs'),path=require('path'),cp=require('child_process'),os=require('os');

function findKey(){
 if(process.env.ELEVEN_KEY)return process.env.ELEVEN_KEY.trim();
 for(const p of [path.join(__dirname,'.eleven_key'),path.join(os.homedir(),'.deadtide_eleven_key')]){
  try{const s=fs.readFileSync(p,'utf8').trim();if(s)return s;}catch(e){}}
 return null;}

/* ffmpeg 探し(tool_sfx.js と同じ順) */
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

async function main(){
 const [,,prompt,name,durS]=process.argv;
 if(!prompt||!name){
  console.log('使い方: node tool_aisfx.js "<英語プロンプト>" <出力名> [長さ秒0.5〜22]');
  console.log('  例: node tool_aisfx.js "single rifle gunshot, dry, punchy" rifle_a 1.2');
  console.log('  → sfx_src/AI_<出力名>.wav と ai_ledger.json の1行');
  process.exit(1);}
 if(!/^[A-Za-z0-9_]+$/.test(name)){console.log('FAIL: 出力名は英数字と_だけ');process.exit(1);}
 const key=findKey();
 if(!key){console.log('FAIL: APIキーが無い。ELEVEN_KEY か .eleven_key に置く(⚠Starter以上で契約してから)');process.exit(1);}
 const FF=findFF();
 if(!FF){console.log('FAIL: ffmpeg が見つからない');process.exit(1);}
 const dur=durS?Math.max(.5,Math.min(22,parseFloat(durS))):null;
 const body={text:prompt,prompt_influence:.3};
 if(dur)body.duration_seconds=dur;
 console.log('🎙 生成中… "'+prompt+'"'+(dur?(' ('+dur+'秒)'):''));
 const res=await fetch('https://api.elevenlabs.io/v1/sound-generation',{
  method:'POST',headers:{'xi-api-key':key,'Content-Type':'application/json'},
  body:JSON.stringify(body)});
 if(!res.ok){console.log('FAIL: API '+res.status+' '+(await res.text()).slice(0,300));process.exit(1);}
 const buf=Buffer.from(await res.arrayBuffer());
 const dstDir=path.join(__dirname,'sfx_src');
 if(!fs.existsSync(dstDir))fs.mkdirSync(dstDir,{recursive:true});
 const tmp=path.join(os.tmpdir(),'aisfx_'+name+'.mp3');
 fs.writeFileSync(tmp,buf);
 const out=path.join(dstDir,'AI_'+name+'.wav');
 cp.execFileSync(FF,['-y','-i',tmp,'-ar','44100','-ac','1',out],{stdio:'ignore'});
 /* 📒台帳(Steam の AI開示用)。⚠**書けなければ生成物も置かない**(設計=台帳なしの出力を作らない) */
 const lp=path.join(__dirname,'ai_ledger.json');
 let led=[];try{led=JSON.parse(fs.readFileSync(lp,'utf8'));}catch(e){}
 led.push({date:new Date().toISOString().slice(0,10),tool:'ElevenLabs Sound Effects API',
  prompt,duration:dur,file:'sfx_src/AI_'+name+'.wav',
  license:'ElevenLabs 有料プラン(商用可)。⚠無料プラン中に作った物は商用不可=作り直すこと',
  ships:'加工してbase64でindex.htmlに埋め込む(Steam Content Survey 開示対象)'});
 fs.writeFileSync(lp,JSON.stringify(led,null,1));
 console.log('✅ '+out+'  ('+(buf.length/1024).toFixed(0)+'KB → wav)');
 console.log('📒 ai_ledger.json に記録した('+led.length+'件)');
 console.log('次: tool_sfx.js のレシピに {f:\'AI_'+name+'\',...} を書いて build → embed');}
main().catch(e=>{console.log('FAIL: '+e.message);process.exit(1);});
