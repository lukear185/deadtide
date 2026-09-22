// 実ブラウザ用。Chromeのある開発環境とGitHub Actionsで実行する。
const fs=require('fs'),path=require('path'),os=require('os'),cp=require('child_process');
const chrome=[process.env.DT_CHROME,'/usr/bin/google-chrome','/usr/bin/chromium','C:/Program Files/Google/Chrome/Application/chrome.exe'].filter(Boolean).find(p=>fs.existsSync(p));
if(!chrome){console.error('実ブラウザ検査にはChromeが必要です');process.exit(1);}
const html=fs.readFileSync(path.join(__dirname,'index.html'),'utf8');
const check=String.raw`
setTimeout(()=>{try{
 const need=(ok,text)=>{if(!ok)throw new Error(text);};
 need(FRONTLINE_MODE&&FLVIEW,'試作が起動していない');
 need(META_KEY==='dt_meta_frontline','保存先が本編と混ざる');
 need(document.querySelectorAll('#fl-root .fl-card').length===8,'配置カード不足');
 frontlineDraw();
 const tap=(x,y)=>{const r=FLVIEW.canvas.getBoundingClientRect(),opts={bubbles:true,pointerId:1,pointerType:'touch',clientX:r.left+FLVIEW.ox+x*FLVIEW.scale,clientY:r.top+FLVIEW.oy+y*FLVIEW.scale};
  FLVIEW.canvas.dispatchEvent(new PointerEvent('pointerdown',opts));FLVIEW.canvas.dispatchEvent(new PointerEvent('pointerup',opts));};
 document.querySelector('.fl-card[data-id="gun"]').click();tap(250,110);need(FLVIEW.battle.units.length===1,'兵士を配置できない');
 const funds=FLVIEW.battle.scrap;tap(1000,350);need(FLVIEW.battle.scrap===funds,'配置範囲外で費用が減った');
 document.querySelector('.fl-card[data-id="shd"]').click();tap(430,100);need(FLVIEW.battle.units.length===2,'盾持ちを配置できない: '+document.getElementById('fl-hint').textContent);
 document.querySelector('.fl-card[data-id="rifle"]').click();tap(450,260);need(FLVIEW.battle.towers.length===1,'タレットを配置できない');
 document.getElementById('fl-start').click();need(FLVIEW.battle.phase==='battle','開始できない');
 document.getElementById('fl-pause').click();need(FLVIEW.battle.paused,'停止できない');
 document.getElementById('fl-pause').click();need(!FLVIEW.battle.paused,'再開できない');
 for(let i=0;i<430;i++)FLVIEW.battle.step(.033);
 FLVIEW.cursor=null;frontlineHUD();frontlineDraw();
 const root=document.getElementById('fl-root').getBoundingClientRect(),cv9=FLVIEW.canvas.getBoundingClientRect();
 need(root.left>=-1&&root.right<=innerWidth+1&&root.bottom<=innerHeight+1,'画面がはみ出す');
 need(cv9.height>=140&&cv9.width>=300,'戦場がつぶれている: viewport='+innerWidth+'x'+innerHeight+', canvas='+cv9.width+'x'+cv9.height);
 for(const e of document.querySelectorAll('#fl-root button')){
  if(!e.getClientRects().length)continue;const r=e.getBoundingClientRect();
  need(r.height>=43,'ボタンが小さい: '+e.textContent);
  need(r.top>=-1&&r.bottom<=innerHeight+1,'ボタンが画面外: '+e.textContent);
 }
 const c=FLVIEW.context.getImageData(0,0,FLVIEW.canvas.width,FLVIEW.canvas.height).data;
 let visible=0;for(let i=3;i<c.length;i+=400)if(c[i])visible++;
 need(visible>100,'Canvasが描かれていない');
 document.title='FLPASS '+innerWidth+'x'+innerHeight;
 FLVIEW.battle.paused=true;
}catch(e){document.title='FLFAIL '+e.message;console.error(e);}},700);
`;
const out=path.join(__dirname,'test-output');fs.mkdirSync(out,{recursive:true});
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'deadtide-frontline-'));
try{
 const file=path.join(tmp,'index.html');fs.writeFileSync(file,html.replace('</body>','<script>'+check+'</script></body>'));
 for(const [w,h] of [[852,393],[1365,935]]){
  const png=path.join(out,'frontline-'+w+'x'+h+'.png');
  const r=cp.spawnSync(chrome,['--headless=new','--no-sandbox','--disable-gpu','--hide-scrollbars','--force-device-scale-factor=1',
   '--user-data-dir='+path.join(tmp,'profile-'+w),'--window-size='+w+','+h,'--virtual-time-budget=3500','--screenshot='+png,'--dump-dom','file://'+file+'?frontline=1'],
   {encoding:'utf8',maxBuffer:32*1024*1024,timeout:60000});
  const title=/<title>(FLPASS[^<]*|FLFAIL[^<]*)<\/title>/.exec(r.stdout||'');
  if(r.status!==0||!title||!title[1].startsWith('FLPASS')||!fs.existsSync(png)){
   console.error('実ブラウザ検査失敗',w,h,title&&title[1],r.error?.message,(r.stderr||'').slice(-1500));process.exitCode=1;break;
  }
  console.log('実ブラウザの起動・配置・停止・寸法・描画 OK:',title[1],png);
 }
}finally{fs.rmSync(tmp,{recursive:true,force:true});}
