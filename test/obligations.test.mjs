import {test} from 'node:test';
import assert from 'node:assert/strict';
import {openLocalStore} from '../src/local-store.mjs';
test('obligation applicability, company isolation and immutable linked version',async t=>{
 const db=await openLocalStore();
 try{
 const data={title:'실증용 위험 확인 절차',reference:'가상 기준 1',source_version:'실증 v1',effective_on:'2026-11-01',applicability:'pending',reason:'',next_review:'2026-12-01',change_note:'등록'};
 let obligation;
 await t.test('only headquarters writes, company members read, outsiders cannot read',async()=>{
  await assert.rejects(db.request('manager','saveObligation',data));await assert.rejects(db.request('viewer','saveObligation',data));
  obligation=(await db.request('owner','saveObligation',data)).obligations[0];
  assert.equal((await db.request('manager','state')).obligations.length,1);assert.equal((await db.request('other','state')).obligations.length,0);
 });
 await t.test('non-applicability requires grounds, reviewer is derived, stale update rejected',async()=>{
  await assert.rejects(db.request('owner','saveObligation',{...data,id:obligation.id,revision:1,applicability:'not_applicable'}),/REASON_REQUIRED/);
  obligation=(await db.request('owner','saveObligation',{...data,id:obligation.id,revision:1,applicability:'not_applicable',reason:'실증용 조건 미해당',reviewed_by:'forged'})).obligations[0];
  assert.equal(obligation.reviewed_by,'00000000-0000-4000-8000-000000000011');assert.equal(obligation.events.length,2);assert.equal(obligation.events[0].after.applicability,'pending');
  await assert.rejects(db.request('owner','saveObligation',{...data,id:obligation.id,revision:1}),/REVISION_CONFLICT/);
 });
 await t.test('linked actions retain original criteria when obligation is revised',async()=>{
  const site=(await db.request('manager','state')).sites[0];
  const action=(await db.request('manager','addAction',{site_id:site.id,title:'연결 조치',assignee:'별칭',due_date:'2026-12-01',obligation_id:obligation.id})).actions[0];
  assert.equal(action.obligation_snapshot.revision,2);
  await db.request('owner','saveObligation',{...data,id:obligation.id,revision:2,applicability:'review',reason:'실증용 조건 변경',source_version:'실증 v2',change_note:'재검토'});
  assert.equal((await db.request('manager','state')).actions[0].obligation_snapshot.source_version,'실증 v1');
  const foreign=(await db.request('other','saveObligation',data)).obligations[0];
  await assert.rejects(db.request('manager','addAction',{site_id:site.id,title:'타사 연결',assignee:'별칭',due_date:'2026-12-01',obligation_id:foreign.id}),/OBLIGATION_ACCESS_DENIED/);
 });
 }finally{await db.close();}
});
