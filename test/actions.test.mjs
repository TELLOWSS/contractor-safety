import {test} from 'node:test';
import assert from 'node:assert/strict';
import {openLocalStore} from '../src/local-store.mjs';
test('local action workflow enforces review, scope, evidence and history',async t=>{
 const db=await openLocalStore();
 try{
 const site=(await db.request('manager','state')).sites[0];
 const data={site_id:site.id,title:'개구부 덮개 확인',assignee:'개발용 담당자',due_date:'2026-11-10'};
 let action;
 await t.test('manager creates; other company cannot read or mutate',async()=>{
  action=(await db.request('manager','addAction',data)).actions[0];
  assert.equal(action.events.length,1);
  assert.equal((await db.request('other','state')).actions.length,0);
  await assert.rejects(db.request('other','transitionAction',{id:action.id,revision:1,status:'requested',note:'시도',evidence_note:'시도'}));
  await assert.rejects(db.request('viewer','addAction',data));
 });
 await t.test('cannot skip review or omit evidence',async()=>{
  await assert.rejects(db.request('owner','transitionAction',{id:action.id,revision:1,status:'verified',note:'바로 완료'}),/INVALID_TRANSITION/);
  await assert.rejects(db.request('manager','transitionAction',{id:action.id,revision:1,status:'requested',note:'조치 완료'}),/EVIDENCE_REQUIRED/);
 });
 await t.test('request, reject stale update, reject self confirmation',async()=>{
  action=(await db.request('manager','transitionAction',{id:action.id,revision:1,status:'requested',note:'덮개 설치',evidence_note:'가상 확인 기록 A'})).actions[0];
  await assert.rejects(db.request('owner','transitionAction',{id:action.id,revision:1,status:'verified',note:'확인'}),/REVISION_CONFLICT/);
  await assert.rejects(db.request('manager','transitionAction',{id:action.id,revision:2,status:'verified',note:'셀프 확인'}),/INDEPENDENT_REVIEW_REQUIRED/);
 });
 await t.test('return, resubmit and independent confirmation retain history',async()=>{
  await db.request('owner','transitionAction',{id:action.id,revision:2,status:'open',note:'추가 확인 필요'});
  await db.request('manager','transitionAction',{id:action.id,revision:3,status:'requested',note:'추가 조치',evidence_note:'가상 확인 기록 B'});
  action=(await db.request('owner','transitionAction',{id:action.id,revision:4,status:'verified',note:'별도 확인 완료'})).actions[0];
  assert.equal(action.status,'verified');assert.equal(action.events.length,5);assert.equal(action.events[1].evidence_note,'가상 확인 기록 A');
  assert.equal(action.evidence_note,'가상 확인 기록 B');
  await assert.rejects(db.request('owner','transitionAction',{id:action.id,revision:5,status:'open',note:'변경'}),/INVALID_TRANSITION/);
 });
 }finally{await db.close();}
});
