import {test} from 'node:test';
import assert from 'node:assert/strict';
import {openLocalStore} from '../src/local-store.mjs';
test('expense correction keeps original, rejects stale and unauthorized changes',async()=>{
 const db=await openLocalStore();try{
 const o=(await db.request('owner','saveObligation',{title:'의무',reference:'기준',source_version:'1',effective_on:'2026-01-01',applicability:'pending',reason:'',next_review:'2027-01-01',change_note:'등록'})).obligations[0];
 const r=(await db.request('owner','addResource',{obligation_id:o.id,kind:'budget',name:'계획',responsible:'담당',description:'가상',amount:'1000'})).resources[0];
 const e=(await db.request('owner','addExpense',{resource_id:r.id,spent_on:'2026-11-06',amount:'500',description:'가상',evidence_note:'영수증'})).expenses[0];
 const correction={expense_id:e.id,revision:1,spent_on:'2026-11-07',amount:'600',description:'가상 변경',evidence_note:'수정 영수증',reason:'입력 오류'};
 await assert.rejects(db.request('manager','correctExpense',correction));await assert.rejects(db.request('other','correctExpense',correction));await assert.rejects(db.request('owner','correctExpense',{...correction,reason:' '}));
 const state=await db.request('owner','correctExpense',correction);assert.equal(Number(state.expenses[0].amount),500);assert.equal(Number(state.expenseCorrections[0].amount),600);
 await assert.rejects(db.request('owner','correctExpense',correction),/REVISION_CONFLICT/);
 assert.equal((await db.request('manager','state')).expenseCorrections.length,0);
 }finally{await db.close();}
});
