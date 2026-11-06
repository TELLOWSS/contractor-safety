import {test} from 'node:test';
import assert from 'node:assert/strict';
import {PGlite} from '@electric-sql/pglite';
import {openLocalStore} from '../src/local-store.mjs';
import {renderWorkerOpinions} from '../web/worker-opinions-ui.js';
const esc=x=>String(x??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
test('worker safety opinions and responses are site scoped with optional source and action',async()=>{
 const db=await openLocalStore();let restored;try{
  const site=(await db.request('manager','state')).sites[0],other=(await db.request('owner','state')).sites.find(s=>s.id!==site.id);
  const row={site_id:site.id,received_on:'2026-11-06',content:'<가상 안전의견>'};
  const action=(await db.request('owner','addAction',{site_id:other.id,title:'다른 현장',assignee:'가상',due_date:'2026-12-01'})).actions[0];
  await assert.rejects(db.request('viewer','addWorkerOpinion',row));await assert.rejects(db.request('other','addWorkerOpinion',row));await assert.rejects(db.request('manager','addWorkerOpinion',{...row,site_id:other.id}));await assert.rejects(db.request('manager','addWorkerOpinion',{...row,content:' '}));
  let s=await db.request('manager','addWorkerOpinion',row);const o=s.workerOpinions[0];assert.equal(o.source_note,'');assert.equal(s.feedback.length,0);
  const response={site_id:site.id,opinion_id:o.id,kind:'회신 기록',noted_on:'2026-11-07',detail:'가상 회신 내용'};
  await assert.rejects(db.request('viewer','addWorkerOpinionResponse',response));await assert.rejects(db.request('manager','addWorkerOpinionResponse',{...response,action_id:action.id}));await assert.rejects(db.request('owner','addWorkerOpinionResponse',{...response,site_id:other.id}));
  s=await db.request('manager','addWorkerOpinionResponse',response);assert.equal(s.workerOpinionResponses[0].action_id,null);assert.equal((await db.request('viewer','state')).workerOpinionResponses.length,1);assert.equal((await db.request('other','state')).workerOpinions.length,0);
  const html=renderWorkerOpinions({...s,actors:{}},esc);assert.match(html,/&lt;가상 안전의견&gt;/);assert.match(html,/회신 기록은 실제 전달이나 조치 완료를 증명하지 않습니다/);assert.match(html,/익명성이 보장되는 접수창구가 아닙니다/);
  restored=await PGlite.create({loadDataDir:await db.backup('owner')});assert.equal((await restored.query('select count(*)::int n from worker_opinion_responses')).rows[0].n,1);
 }finally{await restored?.close();await db.close();}
});
