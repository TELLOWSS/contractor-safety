import {test} from 'node:test';
import assert from 'node:assert/strict';
import {PGlite} from '@electric-sql/pglite';
import {openLocalStore} from '../src/local-store.mjs';
import {renderWorkPermits} from '../web/work-permits-ui.js';
const esc=x=>String(x??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
test('work permit notes are site scoped and never imply approval',async()=>{
 const db=await openLocalStore();let restored;try{
  const site=(await db.request('manager','state')).sites[0],other=(await db.request('owner','state')).sites.find(s=>s.id!==site.id);
  const prime=(await db.request('owner','addSitePrime',{site_id:other.id,prime_name:'타 현장 원도급',relationship:'원도급',starts_on:'2026-01-01'})).sitePrimes[0];
  const data={site_id:site.id,work_on:'2026-11-06',work_name:'<가상 작업>',location:'가상 구역',permit_need:'확인 전',managing_party:'확인 전'};
  await assert.rejects(db.request('viewer','addWorkPermit',data));await assert.rejects(db.request('other','addWorkPermit',data));await assert.rejects(db.request('manager','addWorkPermit',{...data,site_id:other.id}));await assert.rejects(db.request('manager','addWorkPermit',{...data,prime_id:prime.id}));await assert.rejects(db.request('manager','addWorkPermit',{...data,permit_need:'승인됨'}));
  let s=await db.request('manager','addWorkPermit',data);const r=s.workPermits[0];assert.equal(r.prime_id,null);assert.equal(r.conditions,'');assert.equal(r.permit_need,'확인 전');
  const note={site_id:site.id,work_permit_id:r.id,kind:'안전시설 확인 메모',noted_on:'2026-11-06',detail:'가상 확인 내용'};
  await assert.rejects(db.request('viewer','addWorkPermitNote',note));await assert.rejects(db.request('owner','addWorkPermitNote',{...note,site_id:other.id}));
  s=await db.request('manager','addWorkPermitNote',note);assert.equal(s.workPermitNotes.length,1);assert.equal((await db.request('viewer','state')).workPermitNotes.length,1);assert.equal((await db.request('other','state')).workPermits.length,0);
  const html=renderWorkPermits({...s,actors:{}},esc);assert.match(html,/&lt;가상 작업&gt;/);assert.match(html,/작업허가 신청·발급·승인이나 안전시설 점검을 대신하지 않습니다/);assert.match(html,/미입력·확인 전/);
  restored=await PGlite.create({loadDataDir:await db.backup('owner')});assert.equal((await restored.query('select count(*)::int n from site_work_permit_notes')).rows[0].n,1);
 }finally{await restored?.close();await db.close();}
});
