import {test} from 'node:test';
import assert from 'node:assert/strict';
import {PGlite} from '@electric-sql/pglite';
import {openLocalStore} from '../src/local-store.mjs';
import {renderRequirementFiles} from '../web/site-requirements-ui.js';
test('relink an earlier file to the current revision with preserved provenance',async()=>{
 const db=await openLocalStore();let restored;try{
  const site=(await db.request('manager','state')).sites[0],data={site_id:site.id,kind:'양식',title:'실증 양식',source_kind:'확인 전',confirmation:'확인 전',detail:'가상'};
  const r=(await db.request('manager','addSiteRequirement',data)).siteRequirements[0];
  let s=await db.request('manager','addRequirementFile',{site_id:site.id,requirement_id:r.id,requirement_revision:0,filename:'sample.txt',content_base64:Buffer.from('가상').toString('base64')});const f=s.siteRequirementFiles[0];
  const link={site_id:site.id,requirement_id:r.id,file_id:f.id,requirement_revision:1,reason:'현장 확인 후 동일 양식 사용'};
  await assert.rejects(db.request('manager','linkRequirementFile',link),/REVISION_CONFLICT/);
  await db.request('manager','reviseSiteRequirement',{...data,requirement_id:r.id,revision:1,reason:'메모 정정'});
  const ownerState=await db.request('owner','state'),otherSite=ownerState.sites.find(x=>x.id!==site.id);const otherReq=(await db.request('owner','addSiteRequirement',{...data,site_id:otherSite.id,title:'다른 현장'})).siteRequirements.find(x=>x.site_id===otherSite.id);await db.request('owner','reviseSiteRequirement',{...data,site_id:otherSite.id,requirement_id:otherReq.id,revision:1,reason:'실증'});await assert.rejects(db.request('owner','linkRequirementFile',{...link,site_id:otherSite.id,requirement_id:otherReq.id}));
  await assert.rejects(db.request('viewer','linkRequirementFile',link));await assert.rejects(db.request('other','linkRequirementFile',link));await assert.rejects(db.request('manager','linkRequirementFile',{...link,reason:' '}));
  s=await db.request('manager','linkRequirementFile',link);assert.equal(s.siteRequirementFiles.length,1);assert.equal(s.siteRequirementFiles[0].requirement_revision,0);assert.equal(s.siteRequirementFileLinks.length,1);
  await assert.rejects(db.request('manager','linkRequirementFile',link));assert.equal((await db.request('other','state')).siteRequirementFileLinks.length,0);
  const html=renderRequirementFiles(s.siteRequirementFiles,1,x=>String(x??''),s.siteRequirementFileLinks,true);assert.match(html,/현재 기록에 연결된 파일 1건/);assert.match(html,/현장 확인 후 동일 양식 사용/);assert.match(html,/최초 연결 기록 원본/);
  await db.request('manager','reviseSiteRequirement',{...data,requirement_id:r.id,revision:2,reason:'추가 정정'});await assert.rejects(db.request('manager','linkRequirementFile',{...link,reason:'다시'}),/REVISION_CONFLICT/);
  const backup=await db.backup('owner');restored=await PGlite.create({loadDataDir:backup});assert.equal((await restored.query('select count(*)::int n from site_requirement_file_links')).rows[0].n,1);assert.equal((await restored.query('select count(*)::int n from site_requirement_files')).rows[0].n,1);
 }finally{await restored?.close();await db.close();}
});
