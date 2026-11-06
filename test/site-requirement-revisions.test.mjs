import {test} from 'node:test';
import assert from 'node:assert/strict';
import {openLocalStore} from '../src/local-store.mjs';
import {renderSiteRequirements} from '../web/site-requirements-ui.js';
test('requirement revisions preserve originals, reject stale and unauthorized changes',async()=>{
 const db=await openLocalStore();try{
  const site=(await db.request('manager','state')).sites[0],owner=await db.request('owner','state'),other=owner.sites.find(s=>s.id!==site.id);
  const prime=(await db.request('owner','addSitePrime',{site_id:other.id,prime_name:'다른 현장',relationship:'원도급',starts_on:'2026-01-01'})).sitePrimes[0];
  const data={site_id:site.id,kind:'양식',title:'실증 점검표',source_kind:'현장 지시',confirmation:'확인 전',detail:'최초 내용',version_label:'1판',location_note:''};
  const original=(await db.request('manager','addSiteRequirement',data)).siteRequirements[0];
  const change={...data,requirement_id:original.id,revision:1,detail:'변경 내용',version_label:'2판',reason:'원도급사 양식 변경'};
  await assert.rejects(db.request('viewer','reviseSiteRequirement',change));
  await assert.rejects(db.request('other','reviseSiteRequirement',change));
  await assert.rejects(db.request('manager','reviseSiteRequirement',{...change,reason:' '}));
  await assert.rejects(db.request('manager','reviseSiteRequirement',{...change,prime_id:prime.id}));
  let state=await db.request('manager','reviseSiteRequirement',change);assert.equal(state.siteRequirements[0].version_label,'1판');assert.equal(state.siteRequirementRevisions[0].version_label,'2판');
  await assert.rejects(db.request('manager','reviseSiteRequirement',change),/REVISION_CONFLICT/);
  state=await db.request('manager','reviseSiteRequirement',{...change,revision:2,version_label:'3판',reason:'추가 수정'});assert.equal(state.siteRequirementRevisions.length,2);assert.equal((await db.request('other','state')).siteRequirementRevisions.length,0);
  const esc=x=>String(x??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
  const html=renderSiteRequirements({...state,actors:{}},esc);assert.match(html,/원본·변경 이력 3건/);assert.match(html,/1판/);assert.match(html,/3판/);assert.match(html,/원도급사 양식 변경/);
 }finally{await db.close();}
});
