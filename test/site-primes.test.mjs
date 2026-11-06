import {test} from 'node:test';
import assert from 'node:assert/strict';
import {openLocalStore} from '../src/local-store.mjs';
test('site prime relationships preserve history and isolate company and site',async()=>{
 const db=await openLocalStore();
 try{
  const owner=await db.request('owner','state'), site=(await db.request('manager','state')).sites[0],another=owner.sites.find(s=>s.id!==site.id);
  const input={site_id:site.id,prime_name:'가상 원도급 A',relationship:'원도급사',starts_on:'2026-01-01',note:''};
  await assert.rejects(db.request('manager','addSitePrime',input));
  let result=await db.request('owner','addSitePrime',input);const id=result.sitePrimes[0].id;
  result=await db.request('owner','addSitePrime',{...input,site_id:another.id,prime_name:'가상 원도급 B'});
  assert.equal(result.sitePrimes.length,2);assert.equal((await db.request('manager','state')).sitePrimes.length,1);assert.equal((await db.request('other','state')).sitePrimes.length,0);
  await assert.rejects(db.request('other','endSitePrime',{site_id:site.id,prime_id:id,ends_on:'2026-03-01',reason:'변경'}));
  await assert.rejects(db.request('owner','endSitePrime',{site_id:site.id,prime_id:id,ends_on:'2025-12-31',reason:'변경'}));
  result=await db.request('owner','endSitePrime',{site_id:site.id,prime_id:id,ends_on:'2026-03-01',reason:'계약 종료'});
  assert.equal(result.sitePrimeEnds.length,1);assert.equal(result.sitePrimes.find(p=>p.id===id).prime_name,'가상 원도급 A');
  await assert.rejects(db.request('owner','endSitePrime',{site_id:site.id,prime_id:id,ends_on:'2026-03-02',reason:'변경'}));
 }finally{await db.close();}
});
