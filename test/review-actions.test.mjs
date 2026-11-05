import {test} from 'node:test';
import assert from 'node:assert/strict';
import {openLocalStore} from '../src/local-store.mjs';
test('review action links require matching obligation and owner; status remains live',async()=>{
 const db=await openLocalStore();try{
 const base={title:'가상 의무',reference:'가상 기준',source_version:'v1',effective_on:'2026-01-01',applicability:'pending',reason:'',next_review:'2027-01-01',change_note:'등록'};
 const o=(await db.request('owner','saveObligation',base)).obligations[0];
 const review=(await db.request('owner','addReview',{obligation_id:o.id,period_start:'2026-01-01',period_end:'2026-06-30',result:'개선 필요',findings:'가상',evidence_note:'가상',followup:'조치'})).reviews[0];
 const site=(await db.request('manager','state')).sites[0];
 const a=(await db.request('manager','addAction',{site_id:site.id,title:'가상 개선',assignee:'가상',due_date:'2026-12-01',obligation_id:o.id})).actions[0];
 const link={review_id:review.id,action_id:a.id,note:'가상 연결'};
 await assert.rejects(db.request('manager','linkReviewAction',link));await assert.rejects(db.request('other','linkReviewAction',link));await assert.rejects(db.request('owner','linkReviewAction',{...link,note:' '}));
 const other=(await db.request('owner','addAction',{site_id:site.id,title:'다른 업무',assignee:'가상',due_date:'2026-12-01'})).actions.find(x=>x.obligation_id===null);
 await assert.rejects(db.request('owner','linkReviewAction',{...link,action_id:other.id}));
 let state=await db.request('owner','linkReviewAction',link);assert.equal(state.reviewActions.length,1);await assert.rejects(db.request('owner','linkReviewAction',link));
 await db.request('manager','transitionAction',{id:a.id,revision:1,status:'requested',note:'조치',evidence_note:'근거'});
 state=await db.request('owner','state');assert.equal(state.actions.find(x=>x.id===a.id).status,'requested');assert.equal((await db.request('manager','state')).reviewActions.length,0);
 }finally{await db.close();}
});
