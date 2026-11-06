import {test} from 'node:test';
import assert from 'node:assert/strict';
import {PGlite} from '@electric-sql/pglite';
import {openLocalStore} from '../src/local-store.mjs';
import {renderWorkPermits} from '../web/work-permits-ui.js';
const esc=x=>String(x??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
test('work permit corrections retain original and notes while enforcing site boundaries',async()=>{
 const db=await openLocalStore();let restored;try{
  const site=(await db.request('manager','state')).sites[0],other=(await db.request('owner','state')).sites.find(s=>s.id!==site.id);
  const row={site_id:site.id,work_on:'2026-11-06',work_name:'가상 작업',location:'가상 구역',permit_need:'확인 전',managing_party:'확인 전'};
  const r=(await db.request('manager','addWorkPermit',row)).workPermits[0];
  await db.request('manager','addWorkPermitNote',{site_id:site.id,work_permit_id:r.id,kind:'허가 확인 메모',noted_on:'2026-11-06',detail:'가상 확인 메모'});
  const otherPrime=(await db.request('owner','addSitePrime',{site_id:other.id,prime_name:'타 현장 원청',relationship:'원도급',starts_on:'2026-01-01'})).sitePrimes[0];
  const change={...row,work_permit_id:r.id,revision:1,work_name:'<정정 작업>',permit_need:'필요로 확인',managing_party:'원도급사',reason:'현장 확인'};
  await assert.rejects(db.request('viewer','reviseWorkPermit',change));await assert.rejects(db.request('other','reviseWorkPermit',change));await assert.rejects(db.request('manager','reviseWorkPermit',{...change,reason:' '}));await assert.rejects(db.request('manager','reviseWorkPermit',{...change,prime_id:otherPrime.id}));await assert.rejects(db.request('manager','reviseWorkPermit',{...change,permit_need:'승인됨'}));
  const s=await db.request('manager','reviseWorkPermit',change);assert.equal(s.workPermits[0].permit_need,'확인 전');assert.equal(s.workPermitRevisions[0].permit_need,'필요로 확인');assert.equal(s.workPermitNotes[0].detail,'가상 확인 메모');await assert.rejects(db.request('manager','reviseWorkPermit',change),/REVISION_CONFLICT/);assert.equal((await db.request('other','state')).workPermitRevisions.length,0);
  const html=renderWorkPermits({...s,actors:{}},esc);assert.match(html,/작업 확인 원본·정정 이력 2건/);assert.match(html,/&lt;정정 작업&gt;/);assert.match(html,/가상 확인 메모/);assert.match(html,/현장 확인/);assert.match(html,/실제 승인이나 발급을 의미하지 않습니다/);
  restored=await PGlite.create({loadDataDir:await db.backup('owner')});assert.equal((await restored.query('select count(*)::int n from site_work_permit_revisions')).rows[0].n,1);
 }finally{await restored?.close();await db.close();}
});
