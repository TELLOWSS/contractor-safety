import {test} from 'node:test';
import assert from 'node:assert/strict';
import {PGlite} from '@electric-sql/pglite';
import {openLocalStore} from '../src/local-store.mjs';
import {renderIncidents} from '../web/incidents-ui.js';
const esc=x=>String(x??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
test('incident corrections preserve original and follow-up, enforce scope and optimistic revision',async()=>{
 const db=await openLocalStore();let restored;try{
  const site=(await db.request('manager','state')).sites[0],all=(await db.request('owner','state')).sites,other=all.find(s=>s.id!==site.id);
  const row={site_id:site.id,kind:'확인 필요',occurred_on:'2026-11-06',location:'가상 위치',description:'최초 상황'};
  const r=(await db.request('manager','addIncident',row)).incidents[0];
  await db.request('manager','addIncidentUpdate',{site_id:site.id,incident_id:r.id,kind:'후속 조치',noted_on:'2026-11-07',detail:'기존 후속 기록'});
  const foreign=(await db.request('owner','addAction',{site_id:other.id,title:'타 현장',assignee:'가상',due_date:'2026-12-01'})).actions[0];
  const correction={...row,incident_id:r.id,revision:1,kind:'아차사고',description:'정정 상황',reason:'추가 확인'};
  await assert.rejects(db.request('viewer','reviseIncident',correction));await assert.rejects(db.request('other','reviseIncident',correction));await assert.rejects(db.request('manager','reviseIncident',{...correction,reason:' '}));await assert.rejects(db.request('manager','reviseIncident',{...correction,action_id:foreign.id}));
  let s=await db.request('manager','reviseIncident',correction);assert.equal(s.incidents[0].description,'최초 상황');assert.equal(s.incidentRevisions[0].description,'정정 상황');assert.equal(s.incidentUpdates[0].detail,'기존 후속 기록');
  await assert.rejects(db.request('manager','reviseIncident',correction),/REVISION_CONFLICT/);assert.equal((await db.request('other','state')).incidentRevisions.length,0);
  const html=renderIncidents({...s,actors:{}},esc);assert.match(html,/상황 원본·정정 이력 2건/);assert.match(html,/최초 상황/);assert.match(html,/정정 상황/);assert.match(html,/기존 후속 기록/);assert.match(html,/추가 확인/);
  const backup=await db.backup('owner');restored=await PGlite.create({loadDataDir:backup});assert.equal((await restored.query('select count(*)::int n from site_incident_revisions')).rows[0].n,1);
 }finally{await restored?.close();await db.close();}
});
