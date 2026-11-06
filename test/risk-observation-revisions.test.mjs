import {test} from 'node:test';
import assert from 'node:assert/strict';
import {PGlite} from '@electric-sql/pglite';
import {openLocalStore} from '../src/local-store.mjs';
import {renderWorkRisks} from '../web/work-risks-ui.js';
const esc=x=>String(x??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
test('observation corrections preserve original and its risk version and reject unauthorized or stale changes',async()=>{const db=await openLocalStore();let restored;try{
 const site=(await db.request('manager','state')).sites[0],other=(await db.request('owner','state')).sites.find(s=>s.id!==site.id),risk=(await db.request('manager','addWorkRisk',{site_id:site.id,work_type:'철근',location:'가상',work_date:'2026-11-06',hazard:'위험',measure:'조치'})).workRisks[0];
 const input={site_id:site.id,risk_id:risk.id,kind:'현장 확인',observed_on:'2026-11-06',participant_alias:'가상',detail:'최초 내용',evidence_note:'최초 근거',risk_revision:0};let s=await db.request('manager','addRiskObservation',input);const obs=s.riskObservations[0];const correction={...input,observation_id:obs.id,revision:1,detail:'정정 내용',reason:'오기 수정'};
 await assert.rejects(db.request('viewer','reviseRiskObservation',correction));await assert.rejects(db.request('other','reviseRiskObservation',correction));await assert.rejects(db.request('manager','reviseRiskObservation',{...correction,site_id:other.id}));await assert.rejects(db.request('manager','reviseRiskObservation',{...correction,reason:' '}));
 s=await db.request('manager','reviseRiskObservation',correction);assert.equal(s.riskObservations[0].detail,'최초 내용');assert.equal(s.riskObservations[0].risk_revision,0);assert.equal(s.riskObservationRevisions[0].detail,'정정 내용');await assert.rejects(db.request('manager','reviseRiskObservation',correction),/REVISION_CONFLICT/);assert.equal((await db.request('other','state')).riskObservationRevisions.length,0);
 const html=renderWorkRisks({...s,actors:{}},esc);assert.match(html,/의견·확인 원본·정정 이력 2건/);assert.match(html,/최초 내용/);assert.match(html,/정정 내용/);assert.match(html,/오기 수정/);assert.match(html,/연결 당시 위험 기록: 원본/);
 restored=await PGlite.create({loadDataDir:await db.backup('owner')});assert.equal((await restored.query('select count(*)::int n from risk_observation_revisions')).rows[0].n,1);
 }finally{await restored?.close();await db.close();}});
