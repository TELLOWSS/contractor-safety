import {test} from 'node:test';
import assert from 'node:assert/strict';
import {openLocalStore} from '../src/local-store.mjs';
import {renderSiteRequirements} from '../web/site-requirements-ui.js';
test('optional effective periods are validated and versioned without changing earlier records',async()=>{
 const db=await openLocalStore();try{
  const site=(await db.request('manager','state')).sites[0];
  const data={site_id:site.id,kind:'양식',title:'가상 양식',source_kind:'현장 지시',confirmation:'확인 전',detail:'실증'};
  await assert.rejects(db.request('manager','addSiteRequirement',{...data,applicable_from:'2026-12-01',applicable_until:'2026-11-01'}));
  let s=await db.request('manager','addSiteRequirement',data);const r=s.siteRequirements[0];assert.equal(r.applicable_from,null);assert.equal(r.applicable_until,null);
  const rev={...data,requirement_id:r.id,revision:1,reason:'기간 확인',applicable_from:'2026-11-01',applicable_until:'2026-12-31'};
  await assert.rejects(db.request('manager','reviseSiteRequirement',{...rev,applicable_until:'2026-10-01'}));
  s=await db.request('manager','reviseSiteRequirement',rev);assert.equal(s.siteRequirements[0].applicable_from,null);assert.equal(new Date(s.siteRequirementRevisions[0].applicable_from).toISOString().slice(0,10),'2026-11-01');
  s=await db.request('manager','reviseSiteRequirement',{...rev,revision:2,applicable_from:'',applicable_until:'2027-01-01',reason:'시작일 확인 전'});assert.equal(s.siteRequirementRevisions[1].applicable_from,null);
  const html=renderSiteRequirements({...s,actors:{}},x=>String(x??''));assert.match(html,/시작일 미확인/);assert.match(html,/2026-11-01/);assert.match(html,/2027-01-01/);
 }finally{await db.close();}
});
