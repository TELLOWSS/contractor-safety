import {test} from 'node:test';
import assert from 'node:assert/strict';
import {PGlite} from '@electric-sql/pglite';
import {openLocalStore} from '../src/local-store.mjs';
import {currentWorkRisks,renderWorkRisks} from '../web/work-risks-ui.js';
import {renderTbm} from '../web/tbm-ui.js';
const esc=x=>String(x??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
test('risk correction preserves source, same-site scope and TBM snapshots before and after correction',async()=>{const db=await openLocalStore();let restored;try{
 const site=(await db.request('manager','state')).sites[0],other=(await db.request('owner','state')).sites.find(s=>s.id!==site.id),input={site_id:site.id,work_type:'철근',location:'최초 위치',work_date:'2026-11-06',hazard:'최초 위험',measure:'최초 조치'};
 const risk=(await db.request('manager','addWorkRisk',input)).workRisks[0];const tbm={site_id:site.id,risk_id:risk.id,started_at:'2026-11-06T07:30',duration_minutes:'10',location:'현장',work_description:'작업',hazard:'위험',instruction:'전달',facilitator_alias:'가상'};
 await db.request('manager','addTbm',tbm);const revision={...input,risk_id:risk.id,revision:1,location:'정정 위치',hazard:'정정 위험',reason:'추가 확인'};
 await assert.rejects(db.request('viewer','reviseWorkRisk',revision));await assert.rejects(db.request('other','reviseWorkRisk',revision));await assert.rejects(db.request('manager','reviseWorkRisk',{...revision,site_id:other.id}));await assert.rejects(db.request('manager','reviseWorkRisk',{...revision,reason:' '}));
 let s=await db.request('manager','reviseWorkRisk',revision);assert.equal(s.workRisks[0].hazard,'최초 위험');assert.equal(currentWorkRisks(s)[0].hazard,'정정 위험');assert.equal(s.tbmSessions[0].risk_snapshot.hazard,'최초 위험');await assert.rejects(db.request('manager','reviseWorkRisk',revision),/REVISION_CONFLICT/);
 s=await db.request('manager','addTbm',{...tbm,started_at:'2026-11-07T07:30'});const later=s.tbmSessions.find(t=>t.started_at.startsWith('2026-11-07'));assert.equal(later.risk_snapshot.hazard,'정정 위험');assert.equal(later.risk_snapshot.revision,1);const html=renderWorkRisks({...s,actors:{}},esc);assert.match(html,/원본·정정 이력 2건/);assert.match(html,/최초 위험/);assert.match(html,/정정 위험/);assert.match(html,/추가 확인/);assert.match(renderTbm({...s,actors:{}},esc),/최초 연결 당시 정정 1/);assert.equal((await db.request('other','state')).workRiskRevisions.length,0);
 restored=await PGlite.create({loadDataDir:await db.backup('owner')});assert.equal((await restored.query('select count(*)::int n from work_risk_revisions')).rows[0].n,1);
 }finally{await restored?.close();await db.close();}});
