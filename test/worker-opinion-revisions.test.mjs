import {test} from 'node:test';
import assert from 'node:assert/strict';
import {PGlite} from '@electric-sql/pglite';
import {openLocalStore} from '../src/local-store.mjs';
import {renderWorkerOpinions} from '../web/worker-opinions-ui.js';
const esc=x=>String(x??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
test('opinion and response corrections preserve originals and scope',async()=>{
 const db=await openLocalStore();let restored;try{
  const site=(await db.request('manager','state')).sites[0],other=(await db.request('owner','state')).sites.find(s=>s.id!==site.id);
  const input={site_id:site.id,received_on:'2026-11-06',content:'최초 의견'};
  let s=await db.request('manager','addWorkerOpinion',input);const opinion=s.workerOpinions[0];
  s=await db.request('manager','addWorkerOpinionResponse',{site_id:site.id,opinion_id:opinion.id,kind:'검토 기록',noted_on:'2026-11-06',detail:'최초 검토'});const response=s.workerOpinionResponses[0];
  const edit={...input,opinion_id:opinion.id,revision:1,content:'<정정 의견>',reason:'전달 내용 정정'};
  await assert.rejects(db.request('viewer','reviseWorkerOpinion',edit));await assert.rejects(db.request('other','reviseWorkerOpinion',edit));await assert.rejects(db.request('manager','reviseWorkerOpinion',{...edit,site_id:other.id}));await assert.rejects(db.request('manager','reviseWorkerOpinion',{...edit,reason:' '}));
  s=await db.request('manager','reviseWorkerOpinion',edit);assert.equal(s.workerOpinions[0].content,'최초 의견');assert.equal(s.workerOpinionRevisions[0].content,'<정정 의견>');await assert.rejects(db.request('manager','reviseWorkerOpinion',edit),/REVISION_CONFLICT/);
  const action=(await db.request('owner','addAction',{site_id:other.id,title:'타 현장',assignee:'가상',due_date:'2026-12-01'})).actions[0];
  const reply={site_id:site.id,opinion_id:opinion.id,response_id:response.id,revision:1,kind:'회신 기록',noted_on:'2026-11-07',detail:'정정 회신',reason:'기록 오류'};
  await assert.rejects(db.request('viewer','reviseWorkerResponse',reply));await assert.rejects(db.request('other','reviseWorkerResponse',reply));await assert.rejects(db.request('manager','reviseWorkerResponse',{...reply,action_id:action.id}));await assert.rejects(db.request('manager','reviseWorkerResponse',{...reply,reason:' '}));
  s=await db.request('manager','reviseWorkerResponse',reply);assert.equal(s.workerOpinionResponses[0].detail,'최초 검토');assert.equal(s.workerResponseRevisions[0].detail,'정정 회신');await assert.rejects(db.request('manager','reviseWorkerResponse',reply),/REVISION_CONFLICT/);assert.equal((await db.request('other','state')).workerResponseRevisions.length,0);
  const html=renderWorkerOpinions({...s,actors:{}},esc);assert.match(html,/의견 원본·정정 이력 2건/);assert.match(html,/&lt;정정 의견&gt;/);assert.match(html,/최초 검토/);assert.match(html,/정정 회신/);assert.match(html,/실제 전달이나 조치 완료를 증명하지 않습니다/);
  restored=await PGlite.create({loadDataDir:await db.backup('owner')});assert.equal((await restored.query('select count(*)::int n from worker_response_revisions')).rows[0].n,1);
 }finally{await restored?.close();await db.close();}
});
