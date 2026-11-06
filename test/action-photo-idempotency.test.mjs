import {test} from 'node:test';
import assert from 'node:assert/strict';
import {openLocalStore} from '../src/local-store.mjs';
test('photo upload id retries are idempotent and bound to role and content',async()=>{
 const db=await openLocalStore();try{
  const site=(await db.request('manager','state')).sites[0],action=(await db.request('manager','addAction',{site_id:site.id,title:'가상 재전송',assignee:'가상',due_date:'2026-12-01'})).actions[0];
  const payload={site_id:site.id,action_id:action.id,action_revision:action.revision,phase:'미구분',filename:'sample.png',content_base64:Buffer.from([137,80,78,71,13,10,26,10,1]).toString('base64'),client_upload_id:'a1a1a1a1-0000-4000-8000-000000000001'};
  let s=await db.request('manager','addActionPhoto',payload);assert.equal(s.actionPhotos.length,1);
  let again=await db.request('manager','addActionPhoto',payload);assert.equal(again.already_saved,true);assert.equal((await db.request('manager','state')).actionPhotos.length,1);
  await assert.rejects(db.request('manager','addActionPhoto',{...payload,phase:'조치 후'}),/UPLOAD_ID_CONFLICT/);await assert.rejects(db.request('owner','addActionPhoto',payload),/UPLOAD_ID_CONFLICT/);await assert.rejects(db.request('other','addActionPhoto',payload));
  await db.request('manager','transitionAction',{id:action.id,revision:action.revision,status:'requested',note:'검토',evidence_note:'가상'});
  again=await db.request('manager','addActionPhoto',payload);assert.equal(again.already_saved,true);
 }finally{await db.close();}
});
