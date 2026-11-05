import {test} from 'node:test';
import assert from 'node:assert/strict';
import {openLocalStore} from '../src/local-store.mjs';
test('action corrections preserve prior values and reject unauthorized, stale and locked edits',async t=>{
 const db=await openLocalStore();
 try{
 const site=(await db.request('manager','state')).sites[0];
 let a=(await db.request('manager','addAction',{site_id:site.id,title:'원래 제목',assignee:'A',due_date:'2026-11-01'})).actions[0];
 const edit={id:a.id,revision:1,title:'수정 제목',assignee:'B',due_date:'2026-11-08',note:'작업 일정 변경'};
 await t.test('empty reason, viewer and other company edits rejected',async()=>{
  await assert.rejects(db.request('manager','editAction',{...edit,note:' '}),/NOTE_REQUIRED/);
  await assert.rejects(db.request('viewer','editAction',edit));await assert.rejects(db.request('other','editAction',edit));
 });
 await t.test('correction records before and after without losing creation',async()=>{
  a=(await db.request('manager','editAction',edit)).actions[0];assert.equal(a.revision,2);assert.equal(a.events.length,2);assert.equal(a.events[0].after.title,'원래 제목');assert.deepEqual(a.events[1].before,{title:'원래 제목',assignee:'A',due_date:'2026-11-01'});assert.deepEqual(a.events[1].after,{title:'수정 제목',assignee:'B',due_date:'2026-11-08'});
  await assert.rejects(db.request('owner','editAction',edit),/REVISION_CONFLICT/);
  await assert.rejects(db.request('manager','editAction',{...edit,revision:2}),/NO_CHANGES/);
 });
 await t.test('requested and verified records cannot be corrected',async()=>{
  await db.request('manager','transitionAction',{id:a.id,revision:2,status:'requested',note:'조치',evidence_note:'근거'});
  await assert.rejects(db.request('owner','editAction',{...edit,revision:3,title:'승인 중 수정'}),/EDIT_LOCKED/);
  a=(await db.request('owner','transitionAction',{id:a.id,revision:3,status:'verified',note:'별도 확인'})).actions[0];
  await assert.rejects(db.request('owner','editAction',{...edit,revision:4,title:'완료 후 수정'}),/EDIT_LOCKED/);
  assert.equal(a.events.length,4);
 });
 }finally{await db.close();}
});
