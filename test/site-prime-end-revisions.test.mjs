import {test} from 'node:test';
import assert from 'node:assert/strict';
import {openLocalStore} from '../src/local-store.mjs';
import {renderSitePrimes} from '../web/site-primes-ui.js';
test('end date correction preserves history and validates latest start and end',async()=>{
 const db=await openLocalStore();try{
  const site=(await db.request('manager','state')).sites[0],base={site_id:site.id,prime_name:'가상 원도급',relationship:'원도급',starts_on:'2026-01-01',note:''};
  const p=(await db.request('owner','addSitePrime',base)).sitePrimes[0];
  const change={site_id:site.id,prime_id:p.id,revision:1,ends_on:'2026-04-01',reason:'계약 기간 정정'};
  await assert.rejects(db.request('owner','reviseSitePrimeEnd',change));
  await db.request('owner','endSitePrime',{site_id:site.id,prime_id:p.id,ends_on:'2026-03-01',reason:'최초 기록'});
  await assert.rejects(db.request('manager','reviseSitePrimeEnd',change));await assert.rejects(db.request('other','reviseSitePrimeEnd',change));await assert.rejects(db.request('owner','reviseSitePrimeEnd',{...change,reason:' '}));
  await assert.rejects(db.request('owner','reviseSitePrimeEnd',{...change,ends_on:'2025-12-31'}),/INVALID_PRIME_PERIOD/);
  let s=await db.request('owner','reviseSitePrimeEnd',change);assert.equal(new Date(s.sitePrimeEnds[0].ends_on).toISOString().slice(0,10),'2026-03-01');assert.equal(new Date(s.sitePrimeEndRevisions[0].ends_on).toISOString().slice(0,10),'2026-04-01');
  await assert.rejects(db.request('owner','reviseSitePrimeEnd',change),/REVISION_CONFLICT/);
  await db.request('owner','reviseSitePrime',{...base,prime_id:p.id,revision:1,starts_on:'2026-03-15',reason:'시작일 정정'});
  await assert.rejects(db.request('owner','reviseSitePrimeEnd',{...change,revision:2,ends_on:'2026-03-01'}),/INVALID_PRIME_PERIOD/);
  await assert.rejects(db.request('owner','reviseSitePrime',{...base,prime_id:p.id,revision:2,starts_on:'2026-04-02',reason:'오류'}),/INVALID_PRIME_PERIOD/);
  s=await db.request('owner','reviseSitePrimeEnd',{...change,revision:2,ends_on:'2026-05-01',reason:'종료일 변경'});assert.equal(s.sitePrimeEndRevisions.length,2);assert.equal((await db.request('other','state')).sitePrimeEndRevisions.length,0);
  const html=renderSitePrimes(s,x=>String(x??''));assert.match(html,/종료일 원본·정정 이력 3건/);assert.match(html,/2026-03-01/);assert.match(html,/2026-05-01/);
 }finally{await db.close();}
});
