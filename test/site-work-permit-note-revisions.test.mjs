import {test} from 'node:test';
import assert from 'node:assert/strict';
import {PGlite} from '@electric-sql/pglite';
import {openLocalStore} from '../src/local-store.mjs';
import {renderWorkPermits} from '../web/work-permits-ui.js';
const esc=x=>String(x??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
test('permit note corrections preserve original, work link and site scope',async()=>{
 const db=await openLocalStore();let restored;try{
  const site=(await db.request('manager','state')).sites[0],other=(await db.request('owner','state')).sites.find(s=>s.id!==site.id);
  const row={site_id:site.id,work_on:'2026-11-06',work_name:'가상 작업',location:'가상 구역',permit_need:'확인 전',managing_party:'확인 전'};
  let s=await db.request('manager','addWorkPermit',row);const permit=s.workPermits[0];
  s=await db.request('manager','addWorkPermitNote',{site_id:site.id,work_permit_id:permit.id,kind:'허가 확인 메모',noted_on:'2026-11-06',detail:'최초 가상 메모'});const note=s.workPermitNotes[0];
  const otherPermit=(await db.request('owner','addWorkPermit',{...row,site_id:other.id})).workPermits.find(p=>p.site_id===other.id);
  const correction={site_id:site.id,work_permit_id:permit.id,note_id:note.id,revision:1,kind:'안전시설 확인 메모',noted_on:'2026-11-07',detail:'<정정 가상 메모>',reason:'확인 내용 정정'};
  await assert.rejects(db.request('viewer','reviseWorkPermitNote',correction));await assert.rejects(db.request('other','reviseWorkPermitNote',correction));await assert.rejects(db.request('manager','reviseWorkPermitNote',{...correction,reason:' '}));await assert.rejects(db.request('owner','reviseWorkPermitNote',{...correction,site_id:other.id,work_permit_id:otherPermit.id}));
  s=await db.request('manager','reviseWorkPermitNote',correction);assert.equal(s.workPermitNotes[0].detail,'최초 가상 메모');assert.equal(s.workPermitNoteRevisions[0].detail,'<정정 가상 메모>');assert.equal(s.workPermits[0].id,permit.id);
  await assert.rejects(db.request('manager','reviseWorkPermitNote',correction),/REVISION_CONFLICT/);assert.equal((await db.request('other','state')).workPermitNoteRevisions.length,0);
  const html=renderWorkPermits({...s,actors:{}},esc);assert.match(html,/확인 메모 원본·정정 이력 2건/);assert.match(html,/최초 가상 메모/);assert.match(html,/&lt;정정 가상 메모&gt;/);assert.match(html,/확인 내용 정정/);assert.match(html,/실제 허가나 작업 상태를 변경하지 않습니다/);
  restored=await PGlite.create({loadDataDir:await db.backup('owner')});assert.equal((await restored.query('select count(*)::int n from site_work_permit_note_revisions')).rows[0].n,1);
 }finally{await restored?.close();await db.close();}
});
