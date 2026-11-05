import {test} from 'node:test';
import assert from 'node:assert/strict';
import {openLocalStore} from '../src/local-store.mjs';
test('work risk records respect site scope and only link actions at the same site',async()=>{
 const db=await openLocalStore();try{
 const sites=(await db.request('owner','state')).sites,assigned=(await db.request('manager','state')).sites[0],other=sites.find(s=>s.id!==assigned.id);
 const input={site_id:assigned.id,work_type:'거푸집·동바리',location:'가상 1동 2층',work_date:'2026-11-06',hazard:'가상 위험',measure:'가상 조치'};
 const action=(await db.request('manager','addAction',{site_id:assigned.id,title:'가상 조치',assignee:'가상',due_date:'2026-11-10'})).actions[0];
 const state=await db.request('manager','addWorkRisk',{...input,action_id:action.id});assert.equal(state.workRisks.length,1);assert.equal(state.workRisks[0].action_id,action.id);
 await assert.rejects(db.request('viewer','addWorkRisk',input));await assert.rejects(db.request('other','addWorkRisk',input));await assert.rejects(db.request('manager','addWorkRisk',{...input,site_id:other.id}));await assert.rejects(db.request('owner','addWorkRisk',{...input,site_id:other.id,action_id:action.id}));await assert.rejects(db.request('manager','addWorkRisk',{...input,hazard:' '}));
 assert.equal((await db.request('other','state')).workRisks.length,0);assert.equal((await db.request('viewer','state')).workRisks.length,1);
 }finally{await db.close();}
});
