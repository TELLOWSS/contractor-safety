import {test} from 'node:test';
import assert from 'node:assert/strict';
import {openLocalStore} from '../src/local-store.mjs';
test('half-year review captures obligation version and enforces headquarters scope',async()=>{
 const db=await openLocalStore();try{
 const d={title:'실증 의무',reference:'가상 기준',source_version:'v1',effective_on:'2026-01-01',applicability:'pending',reason:'',next_review:'2027-01-01',change_note:'등록'};
 const o=(await db.request('owner','saveObligation',d)).obligations[0];
 const review={obligation_id:o.id,period_start:'2026-01-01',period_end:'2026-06-30',result:'개선 필요',findings:'가상 점검',evidence_note:'가상 자료',followup:'개선 확인'};
 await assert.rejects(db.request('manager','addReview',review));await assert.rejects(db.request('other','addReview',review));await assert.rejects(db.request('owner','addReview',{...review,period_end:'2025-12-31'}));await assert.rejects(db.request('owner','addReview',{...review,evidence_note:' '}));
 let s=await db.request('owner','addReview',review);assert.equal(s.reviews.length,1);assert.equal(s.reviews[0].obligation_snapshot.source_version,'v1');
 await db.request('owner','saveObligation',{...d,id:o.id,revision:1,source_version:'v2'});
 s=await db.request('owner','state');assert.equal(s.reviews[0].obligation_snapshot.source_version,'v1');assert.equal((await db.request('manager','state')).reviews.length,0);assert.equal((await db.request('other','state')).reviews.length,0);
 }finally{await db.close();}
});
