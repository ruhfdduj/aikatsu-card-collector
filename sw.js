const APP_CACHE='cc-v6';
const IMAGE_CACHE='cc-images-v1';
const APP_FILES=['./','./index.html','./manifest.json','./icon.svg'];

self.addEventListener('install',event=>{
  event.waitUntil(caches.open(APP_CACHE).then(cache=>cache.addAll(APP_FILES)));
  self.skipWaiting();
});

self.addEventListener('activate',event=>{
  event.waitUntil(
    caches.keys().then(keys=>Promise.all(
      keys.filter(key=>![APP_CACHE,IMAGE_CACHE].includes(key)).map(key=>caches.delete(key))
    )).then(()=>self.clients.claim())
  );
});

self.addEventListener('fetch',event=>{
  const req=event.request;
  const url=new URL(req.url);

  // 公式カード画像は一度取得したらCache Storageに保存し、
  // 次回以降はネットワークへ取りに行かずローカルキャッシュを優先する。
  if(req.method==='GET' && url.hostname==='dcd.aikatsu.com' && /\/encore\/images\/cardlist\/card\//.test(url.pathname)){
    event.respondWith(
      caches.open(IMAGE_CACHE).then(async cache=>{
        const cached=await cache.match(req);
        if(cached)return cached;
        try{
          const response=await fetch(req);
          // CORS設定のない画像でもopaque responseとして保存できる。
          if(response.ok || response.type==='opaque'){
            await cache.put(req,response.clone());
          }
          return response;
        }catch(error){
          const fallback=await cache.match(req);
          if(fallback)return fallback;
          throw error;
        }
      })
    );
    return;
  }

  event.respondWith(
    caches.match(req).then(cached=>cached||fetch(req))
  );
});
