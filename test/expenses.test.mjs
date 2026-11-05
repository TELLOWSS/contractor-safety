import {test} from 'node:test';
import assert from 'node:assert/strict';
import {openLocalStore} from '../src/local-store.mjs';
test('expense ledger enforces budget link, role and company isolation',async()=>{
 const db=await openLocalStore();
 try{
 const obligation=(await db.request('owner','saveObligation',{title:'가상 의무',reference:'기준',source_version:'v1',effective_on:'2026-01-01',applicability:'pending',reason:'',next_review:'2026-12-01',change_note:'등록'})).obligations[0];
 const r=(await db.request('owner','addResource',{obligation_id:obligation.id,kind:'budget',name:'계획',responsible:'가상',description:'계획',amount:'1000'})).resources[0];
 const expense={resource_id:r.id,spent_on:'2026-11-06',amount:'500',description:'가상 구매',evidence_note:'가상 영수증'};
 assert.equal((await db.request('owner','addExpense',expense)).expenses.length,1);
 assert.equal((await db.request('manager','state')).expenses.length,0);
 await assert.rejects(db.request('manager','addExpense',expense));await assert.rejects(db.request('other','addExpense',expense));
 await assert.rejects(db.request('owner','addExpense',{...expense,amount:'0'}));await assert.rejects(db.request('owner','addExpense',{...expense,evidence_note:' '}));
 const person=(await db.request('owner','addResource',{obligation_id:obligation.id,kind:'personnel',name:'인력',responsible:'가상',description:'배정'})).resources.find(x=>x.kind==='personnel');
 await assert.rejects(db.request('owner','addExpense',{...expense,resource_id:person.id}));
 }finally{await db.close();}
});
