import {test} from 'node:test';
import assert from 'node:assert/strict';
import {openLocalStore} from '../src/local-store.mjs';
test('review budget links require same company, same obligation and budget category',async()=>{
 const db=await openLocalStore();try{
 const d={title:'가상 의무',reference:'기준',source_version:'v1',effective_on:'2026-01-01',applicability:'pending',reason:'',next_review:'2027-01-01',change_note:'등록'};
 const o=(await db.request('owner','saveObligation',d)).obligations[0];
 const review=(await db.request('owner','addReview',{obligation_id:o.id,period_start:'2026-01-01',period_end:'2026-06-30',result:'개선 필요',findings:'가상',evidence_note:'가상',followup:'예산 확인'})).reviews[0];
 const r=(await db.request('owner','addResource',{obligation_id:o.id,kind:'budget',name:'가상 예산',responsible:'가상',description:'계획',amount:'1000'})).resources[0];
 const link={review_id:review.id,resource_id:r.id,note:'가상 예산 연계'};
 await assert.rejects(db.request('manager','linkReviewBudget',link));await assert.rejects(db.request('other','linkReviewBudget',link));await assert.rejects(db.request('owner','linkReviewBudget',{...link,note:' '}));
 const person=(await db.request('owner','addResource',{obligation_id:o.id,kind:'personnel',name:'가상 인력',responsible:'가상',description:'배정'})).resources.find(x=>x.kind==='personnel');
 await assert.rejects(db.request('owner','linkReviewBudget',{...link,resource_id:person.id}));
 const second=(await db.request('owner','saveObligation',{...d,title:'다른 의무'})).obligations.find(x=>x.id!==o.id);
 const unrelated=(await db.request('owner','addResource',{obligation_id:second.id,kind:'budget',name:'다른 의무 예산',responsible:'가상',description:'계획',amount:'500'})).resources.find(x=>x.obligation_id===second.id);
 await assert.rejects(db.request('owner','linkReviewBudget',{...link,resource_id:unrelated.id}));
 const state=await db.request('owner','linkReviewBudget',link);assert.equal(state.reviewBudgets.length,1);await assert.rejects(db.request('owner','linkReviewBudget',link));assert.equal((await db.request('manager','state')).reviewBudgets.length,0);
 }finally{await db.close();}
});
