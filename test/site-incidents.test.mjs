import {test} from 'node:test';
import assert from 'node:assert/strict';
import {PGlite} from '@electric-sql/pglite';
import {openLocalStore} from '../src/local-store.mjs';
import {renderIncidents} from '../web/incidents-ui.js';
test('incident records and updates are site scoped, append only and support omitted optional data',async()=>{
 const db=await openLocalStore();let restored;try{
  const assigned=(await db.request('manager','state')).sites[0],owner=await db.request('owner','state'),other=owner.sites.find(s=>s.id!==assigned.id);
  const input={site_id:assigned.id,kind:'아차사고',occurred_on:'2026-11-06',location:'가상 2층',description:'가상 낙하 위험 상황'};
  const action=(await db.request('owner','addAction',{site_id:other.id,title:'다른 현장 조치',assignee:'가상',due_date:'2026-12-01'})).actions[0];
  await assert.rejects(db.request('viewer','addIncident',input));await assert.rejects(db.request('other','addIncident',input));await assert.rejects(db.request('manager','addIncident',{...input,site_id:other.id}));await assert.rejects(db.request('manager','addIncident',{...input,action_id:action.id}));await assert.rejects(db.request('manager','addIncident',{...input,description:' '}));
  let s=await db.request('manager','addIncident',input);const inc=s.incidents[0];assert.equal(inc.immediate_action,'');assert.equal(inc.action_id,null);assert.equal((await db.request('other','state')).incidents.length,0);
  const update={site_id:assigned.id,incident_id:inc.id,kind:'재발방지 검토',noted_on:'2026-11-07',detail:'가상 후속 확인'};
  await assert.rejects(db.request('viewer','addIncidentUpdate',update));await assert.rejects(db.request('owner','addIncidentUpdate',{...update,site_id:other.id}));
  s=await db.request('manager','addIncidentUpdate',update);assert.equal(s.incidents[0].description,input.description);assert.equal(s.incidentUpdates.length,1);assert.equal((await db.request('viewer','state')).incidentUpdates.length,1);assert.equal((await db.request('other','state')).incidentUpdates.length,0);
  const html=renderIncidents({...s,actors:{}},x=>String(x??''));assert.match(html,/후속 기록 1건/);assert.match(html,/신고·조사·사고 종결을 자동으로 판정하지 않습니다/);assert.match(html,/기록 없음·확인 전/);
  const backup=await db.backup('owner');restored=await PGlite.create({loadDataDir:backup});assert.equal((await restored.query('select count(*)::int n from site_incident_updates')).rows[0].n,1);
 }finally{await restored?.close();await db.close();}
});
