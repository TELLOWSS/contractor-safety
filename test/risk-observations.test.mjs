import {test} from 'node:test';
import assert from 'node:assert/strict';
import {openLocalStore} from '../src/local-store.mjs';
test('risk observations remain site-scoped, append-only and require evidence notes',async()=>{
 const db=await openLocalStore();try{
 const sites=(await db.request('owner','state')).sites,site=(await db.request('manager','state')).sites[0],other=sites.find(s=>s.id!==site.id);
 const risk=(await db.request('manager','addWorkRisk',{site_id:site.id,work_type:'철근',location:'가상 현장',work_date:'2026-11-06',hazard:'가상 위험',measure:'가상 조치'})).workRisks[0];
 const observation={site_id:site.id,risk_id:risk.id,kind:'조치 후 재확인',observed_on:'2026-11-07',participant_alias:'가상 담당자',detail:'가상 확인',evidence_note:'가상 메모'};
 await assert.rejects(db.request('viewer','addRiskObservation',observation));await assert.rejects(db.request('other','addRiskObservation',observation));await assert.rejects(db.request('manager','addRiskObservation',{...observation,site_id:other.id}));await assert.rejects(db.request('owner','addRiskObservation',{...observation,site_id:other.id}));await assert.rejects(db.request('manager','addRiskObservation',{...observation,evidence_note:' '}));
 const state=await db.request('manager','addRiskObservation',observation);assert.equal(state.riskObservations.length,1);assert.equal(state.riskObservations[0].kind,'조치 후 재확인');assert.equal((await db.request('viewer','state')).riskObservations.length,1);assert.equal((await db.request('other','state')).riskObservations.length,0);
 }finally{await db.close();}
});
