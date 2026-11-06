import {test} from 'node:test';
import assert from 'node:assert/strict';
import {PGlite} from '@electric-sql/pglite';
import {openLocalStore} from '../src/local-store.mjs';
import {renderWorkRisks} from '../web/work-risks-ui.js';
const esc=x=>String(x??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
test('observations record their risk version, reject stale input and survive backup',async()=>{const db=await openLocalStore();let restored;try{
 const site=(await db.request('manager','state')).sites[0],input={site_id:site.id,work_type:'철근',location:'가상',work_date:'2026-11-06',hazard:'최초',measure:'조치'},risk=(await db.request('manager','addWorkRisk',input)).workRisks[0],obs={site_id:site.id,risk_id:risk.id,kind:'현장 확인',observed_on:'2026-11-06',participant_alias:'가상',detail:'확인',evidence_note:'메모',risk_revision:0};
 let state=await db.request('manager','addRiskObservation',obs);assert.equal(state.riskObservations[0].risk_revision,0);
 state=await db.request('manager','reviseWorkRisk',{...input,risk_id:risk.id,revision:1,hazard:'정정',reason:'확인'});await assert.rejects(db.request('manager','addRiskObservation',obs),/REVISION_CONFLICT/);state=await db.request('manager','addRiskObservation',{...obs,risk_revision:1});assert.deepEqual(state.riskObservations.map(x=>x.risk_revision).sort(),[0,1]);
 const html=renderWorkRisks({...state,actors:{}},esc);assert.match(html,/연결 당시 위험 기록: 원본 · 현재 위험 기록과 버전이 다릅니다/);assert.match(html,/연결 당시 위험 기록: 정정 1/);assert.match(html,/data-risk-revision="1"/);assert.equal((await db.request('other','state')).riskObservations.length,0);
 restored=await PGlite.create({loadDataDir:await db.backup('owner')});assert.deepEqual((await restored.query('select risk_revision from risk_observations order by risk_revision')).rows.map(x=>x.risk_revision),[0,1]);
 }finally{await restored?.close();await db.close();}});
test('legacy observations are not falsely assigned a version',()=>{const state={member:{role:'viewer'},actors:{},sites:[{id:'s',name:'현장',active:true}],actions:[],workRisks:[{id:'r',site_id:'s',work_type:'철근',location:'위치',work_date:'2026-11-06',hazard:'위험',measure:'조치',created_at:'2026-11-06'}],riskObservations:[{risk_id:'r',kind:'현장 확인',observed_on:'2026-11-06',participant_alias:'가상',detail:'확인',evidence_note:'메모',risk_revision:null,created_at:'2026-11-06'}]};assert.match(renderWorkRisks(state,esc),/확인 불가 \(기존 기록\)/);});
