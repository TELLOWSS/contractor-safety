const DB_NAME='contractor-safety-local-photo-queue',STORE='photos',LIMIT=20;
export function createPhotoQueue(idb=globalThis.indexedDB){
 let openPromise;
 function open(){
  if(!idb)return Promise.reject(new Error('QUEUE_UNAVAILABLE'));
  if(!openPromise)openPromise=new Promise((resolve,reject)=>{const req=idb.open(DB_NAME,1);req.onupgradeneeded=()=>{if(!req.result.objectStoreNames.contains(STORE))req.result.createObjectStore(STORE,{keyPath:'id'});};req.onsuccess=()=>{const db=req.result;db.onversionchange=()=>{db.close();openPromise=null;};resolve(db);};req.onerror=()=>reject(new Error('QUEUE_UNAVAILABLE'));req.onblocked=()=>reject(new Error('QUEUE_UNAVAILABLE'));}).catch(e=>{openPromise=null;throw e;});
  return openPromise;
 }
 async function list(){const db=await open();return new Promise((resolve,reject)=>{const tx=db.transaction(STORE,'readonly'),req=tx.objectStore(STORE).getAll();req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(new Error('QUEUE_READ_FAILED'));});}
 async function put(item){const db=await open();return new Promise((resolve,reject)=>{let full=false;const tx=db.transaction(STORE,'readwrite'),store=tx.objectStore(STORE),count=store.count();count.onsuccess=()=>{if(count.result>=LIMIT){full=true;tx.abort();return;}store.add(item);};tx.oncomplete=()=>resolve();tx.onerror=()=>reject(new Error('QUEUE_WRITE_FAILED'));tx.onabort=()=>reject(new Error(full?'QUEUE_FULL':'QUEUE_WRITE_FAILED'));});}
 async function remove(id){const db=await open();return new Promise((resolve,reject)=>{const tx=db.transaction(STORE,'readwrite');tx.objectStore(STORE).delete(id);tx.oncomplete=()=>resolve();tx.onerror=()=>reject(new Error('QUEUE_DELETE_FAILED'));tx.onabort=()=>reject(new Error('QUEUE_DELETE_FAILED'));});}
 return {list,put,remove};
}
export function visiblePhotoQueue(items,state){
 const sites=new Set((state?.sites??[]).map(s=>s.id));return items.filter(x=>x.actor===state?.actor&&x.company_id===state?.member?.company_id&&sites.has(x.site_id));
}
export async function stageAndSendPhoto(queue,item,send){
 let staged=false,stageError=null;
 try{await queue.put(item);staged=true;}catch(error){stageError=error;}
 try{await send(item);if(staged){try{await queue.remove(item.id);return {status:'sent'};}catch{return {status:'sent_cleanup_needed'};}}return {status:'sent_unstaged'};}
 catch(error){return {status:staged?'queued':'failed_unstaged',error,stageError};}
}
export async function retryQueuedPhoto(queue,item,send){
 await send(item);try{await queue.remove(item.id);return {status:'sent'};}catch{return {status:'sent_cleanup_needed'};}
}
export function renderPhotoQueue(items,state,esc,available=true){
 const visible=visiblePhotoQueue(items,state);
 return `<section class="panel action-panel" id="photo-queue"><h2>사진 전송 대기</h2><p class="small">전송이 완료되지 않은 최적화 사진을 이 PC 브라우저에 임시 보관합니다. DB 백업에는 포함되지 않으며 브라우저 데이터 삭제 시 사라질 수 있습니다. 실제 인증·암호화가 없는 개발 환경이므로 가상자료만 사용하세요.</p>${available?`<p>현재 역할과 접근 현장에 표시되는 대기 사진 ${visible.length}건</p>${visible.map(x=>{const site=(state.sites??[]).find(s=>s.id===x.site_id),action=(state.actions??[]).find(a=>a.id===x.action_id);return `<article class="record"><b>${esc(x.filename)}</b><p>현장: ${esc(site?.name??'현장')} · 조치: ${esc(action?.title??'현재 목록에서 확인 불가')}<br>선택한 조치 버전 ${esc(x.action_revision)} · ${esc(x.phase)} · ${esc(Math.ceil(x.byte_size/1024))}KB</p><p class="small">조치 상태나 접근 권한이 바뀌면 재전송이 거부될 수 있습니다. 대기는 서버 저장 완료를 뜻하지 않습니다.</p><div class="toolbar"><button type="button" data-retry-photo="${esc(x.id)}">다시 전송</button><button type="button" data-remove-queued-photo="${esc(x.id)}">대기 항목 제거</button></div></article>`;}).join('')||'<p class="empty">표시할 대기 사진이 없습니다.</p>'}`:'<p>브라우저 임시 저장소를 사용할 수 없습니다. 전송 실패 시 사진을 다시 선택해야 합니다.</p>'}</section>`;
}
