import {test} from 'node:test';
import assert from 'node:assert/strict';
import {openLocalStore} from '../src/local-store.mjs';
import {currentSitePrimes,renderSitePrimes} from '../web/site-primes-ui.js';
import {renderSiteRequirements} from '../web/site-requirements-ui.js';
test('prime corrections keep original, use latest dates, and keep linked requirements',async()=>{
 const db=await openLocalStore();try{
  const site=(await db.request('manager','state')).sites[0],base={site_id:site.id,prime_name:'이전 회사명',relationship:'원도급',starts_on:'2026-01-01',note:''};
  const prime=(await db.request('owner','addSitePrime',base)).sitePrimes[0];
  await db.request('owner','addSiteRequirement',{site_id:site.id,prime_id:prime.id,kind:'양식',title:'실증 양식',source_kind:'확인 전',confirmation:'확인 전',detail:'내용'});
  const change={...base,prime_id:prime.id,revision:1,prime_name:'정정 회사명',starts_on:'2026-02-01',reason:'입력 정정'};
  await assert.rejects(db.request('manager','reviseSitePrime',change));await assert.rejects(db.request('other','reviseSitePrime',change));await assert.rejects(db.request('owner','reviseSitePrime',{...change,reason:' '}));
  let s=await db.request('owner','reviseSitePrime',change);assert.equal(s.sitePrimes[0].prime_name,'이전 회사명');assert.equal(currentSitePrimes(s)[0].prime_name,'정정 회사명');
  await assert.rejects(db.request('owner','reviseSitePrime',change),/REVISION_CONFLICT/);
  await assert.rejects(db.request('owner','endSitePrime',{site_id:site.id,prime_id:prime.id,ends_on:'2026-01-15',reason:'종료'}));
  await db.request('owner','endSitePrime',{site_id:site.id,prime_id:prime.id,ends_on:'2026-03-01',reason:'종료'});
  await assert.rejects(db.request('owner','reviseSitePrime',{...change,revision:2,starts_on:'2026-04-01'}),/INVALID_PRIME_PERIOD/);
  s=await db.request('owner','reviseSitePrime',{...change,revision:2,starts_on:'2026-02-15',reason:'일자 정정'});assert.equal(s.sitePrimeRevisions.length,2);assert.equal((await db.request('other','state')).sitePrimeRevisions.length,0);
  const esc=x=>String(x??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
  assert.match(renderSitePrimes({...s,actors:{}},esc),/이전 회사명/);assert.match(renderSiteRequirements({...s,actors:{}},esc),/정정 회사명/);assert.equal(s.siteRequirements[0].prime_id,prime.id);
 }finally{await db.close();}
});
