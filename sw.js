/* DEADTIDE Service Worker: ネット優先+キャッシュfallback(オフラインでもソロが遊べる) */
const C='deadtide-v2';
self.addEventListener('install',e=>{self.skipWaiting();});
self.addEventListener('activate',e=>{
 e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==C).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));
});
self.addEventListener('fetch',e=>{
 if(e.request.method!=='GET')return;
 /* ページ本体(index.html)はブラウザのキャッシュ(GitHub Pagesはmax-age=600)を必ず飛ばして取りに行く。
    でないとホーム画面のアプリを開き直しても10分間は古い版が出ることがある */
 const nav=e.request.mode==='navigate'||/\.html($|\?)/.test(e.request.url);
 const req=nav?new Request(e.request.url,{cache:'no-store',credentials:'same-origin'}):e.request;
 e.respondWith(
  fetch(req).then(r=>{
   const cp=r.clone();
   caches.open(C).then(c=>c.put(e.request,cp)).catch(()=>{});
   return r;
  }).catch(()=>caches.match(e.request,{ignoreSearch:true}))
 );
});
