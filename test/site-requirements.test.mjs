import {test} from 'node:test';
import assert from 'node:assert/strict';
import {openLocalStore} from '../src/local-store.mjs';
import {renderSiteRequirements} from '../web/site-requirements-ui.js';
test('site requirements isolate sites and do not accept another site contractor',async()=>{
 const db=await openLocalStore();try{
  const state=await db.request('owner','state');const site=(await db.request('manager','state')).sites[0],otherSite=state.sites.find(s=>s.id!==site.id);
  const p=(await db.request('owner','addSitePrime',{site_id:otherSite.id,prime_name:'가상 원도급',relationship:'원도급사',starts_on:'2026-01-01'})).sitePrimes[0];
  const row={site_id:site.id,kind:'양식',title:'가상 점검표',source_kind:'확인 전',confirmation:'확인 전',detail:'현장 확인 예정',version_label:'',location_note:''};
  await assert.rejects(db.request('manager','addSiteRequirement',{...row,prime_id:p.id}));
  await assert.rejects(db.request('viewer','addSiteRequirement',row));
  await assert.rejects(db.request('manager','addSiteRequirement',{...row,confirmation:'승인 완료'}));
  let data=await db.request('manager','addSiteRequirement',row);assert.equal(data.siteRequirements[0].prime_id,null);assert.equal(data.siteRequirements[0].confirmation,'확인 전');
  await db.request('owner','addSiteRequirement',{...row,site_id:otherSite.id,prime_id:p.id,title:'다른 현장'});
  assert.equal((await db.request('manager','state')).siteRequirements.length,1);assert.equal((await db.request('other','state')).siteRequirements.length,0);assert.equal((await db.request('owner','state')).siteRequirements.length,2);
 }finally{await db.close();}
});
test('list escapes titles and explicitly distinguishes a location note from a file',()=>{
 const esc=x=>String(x??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
 const state={member:{role:'viewer'},sites:[{id:'s',name:'현장',active:true}],sitePrimes:[],siteRequirements:[{site_id:'s',title:'<script>',kind:'양식',source_kind:'확인 전',confirmation:'확인 전',detail:'메모',version_label:'',location_note:''}]};
 const html=renderSiteRequirements(state,esc);assert.match(html,/&lt;script&gt;/);assert.match(html,/파일은 PC 개발 DB에 보관/);assert.doesNotMatch(html,/id="site-requirement-form"|data-revise-requirement=|data-requirement-file=/);assert.match(html,/id="requirement-filter"/);
});
