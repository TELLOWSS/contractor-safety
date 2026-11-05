import {test} from 'node:test';
import assert from 'node:assert/strict';
import {openLocalStore} from '../src/local-store.mjs';
test('resources are owner-only, company-scoped and tied to an obligation',async()=>{
 const db=await openLocalStore();
 try{
 const d={title:'가상 의무',reference:'기준',source_version:'v1',effective_on:'2026-01-01',applicability:'pending',reason:'',next_review:'2026-12-01',change_note:'등록'};
 const obligation=(await db.request('owner','saveObligation',d)).obligations[0];
 const row={obligation_id:obligation.id,kind:'budget',name:'가상 예산',responsible:'가상 책임자',description:'실증 계획',amount:'120000'};
 const result=await db.request('owner','addResource',row);assert.equal(result.resources.length,1);assert.equal(Number(result.resources[0].amount),120000);
 assert.equal((await db.request('manager','state')).resources.length,0);assert.equal((await db.request('viewer','state')).resources.length,0);assert.equal((await db.request('other','state')).resources.length,0);
 await assert.rejects(db.request('manager','addResource',row));await assert.rejects(db.request('other','addResource',row));
 await assert.rejects(db.request('owner','addResource',{...row,amount:'-1'}));await assert.rejects(db.request('owner','addResource',{...row,amount:'1.5'}));
 await db.request('owner','addResource',{...row,kind:'personnel',amount:'',name:'가상 인력'});
 assert.equal((await db.request('owner','state')).resources.length,2);
 }finally{await db.close();}
});
