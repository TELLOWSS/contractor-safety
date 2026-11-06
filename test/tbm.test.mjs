import {test} from 'node:test';
import assert from 'node:assert/strict';
import {openLocalStore} from '../src/local-store.mjs';
test('TBM records enforce site scope, required details and same-site risk links',async()=>{
 const db=await openLocalStore();try{
 const sites=(await db.request('owner','state')).sites,site=(await db.request('manager','state')).sites[0],other=sites.find(s=>s.id!==site.id);
 const risk=(await db.request('manager','addWorkRisk',{site_id:site.id,work_type:'철근',location:'가상 위치',work_date:'2026-11-06',hazard:'가상 위험',measure:'가상 조치'})).workRisks[0];
 const input={site_id:site.id,risk_id:risk.id,started_at:'2026-11-06T07:30',duration_minutes:'10',location:'가상 장소',work_description:'가상 철근 작업',hazard:'가상 위험',instruction:'가상 전달사항',facilitator_alias:'가상 진행자'};
 await assert.rejects(db.request('viewer','addTbm',input));await assert.rejects(db.request('other','addTbm',input));await assert.rejects(db.request('manager','addTbm',{...input,site_id:other.id}));await assert.rejects(db.request('owner','addTbm',{...input,site_id:other.id}));await assert.rejects(db.request('manager','addTbm',{...input,duration_minutes:'0'}));await assert.rejects(db.request('manager','addTbm',{...input,instruction:' '}));
 const state=await db.request('manager','addTbm',input);assert.equal(state.tbmSessions.length,1);assert.equal(state.tbmSessions[0].started_at,'2026-11-06T07:30:00');assert.equal(state.tbmSessions[0].risk_snapshot.hazard,'가상 위험');assert.equal((await db.request('viewer','state')).tbmSessions.length,1);assert.equal((await db.request('other','state')).tbmSessions.length,0);
 }finally{await db.close();}
});
