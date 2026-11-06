import {test} from 'node:test';
import assert from 'node:assert/strict';
import {PGlite} from '@electric-sql/pglite';
import {openLocalStore} from '../src/local-store.mjs';
import {renderIncidents} from '../web/incidents-ui.js';
const esc=x=>String(x??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
test('follow-up correction keeps original, scope, incident link and backup',async()=>{
 const db=await openLocalStore();let restored;try{
  const site=(await db.request('manager','state')).sites[0],other=(await db.request('owner','state')).sites.find(s=>s.id!==site.id);
  const row={site_id:site.id,kind:'아차사고',occurred_on:'2026-11-06',location:'가상 위치',description:'가상 상황'};
  let s=await db.request('manager','addIncident',row);const incident=s.incidents[0];
  s=await db.request('manager','addIncidentUpdate',{site_id:site.id,incident_id:incident.id,kind:'후속 조치',noted_on:'2026-11-07',detail:'최초 후속'});const u=s.incidentUpdates[0];
  const otherIncident=(await db.request('owner','addIncident',{...row,site_id:other.id})).incidents.find(x=>x.site_id===other.id);
  const change={site_id:site.id,incident_id:incident.id,update_id:u.id,revision:1,kind:'재발방지 검토',noted_on:'2026-11-08',detail:'<정정 후속>',reason:'가상 내용 정정'};
  await assert.rejects(db.request('viewer','reviseIncidentUpdate',change));await assert.rejects(db.request('other','reviseIncidentUpdate',change));await assert.rejects(db.request('manager','reviseIncidentUpdate',{...change,reason:' '}));await assert.rejects(db.request('owner','reviseIncidentUpdate',{...change,incident_id:otherIncident.id,site_id:other.id}));
  s=await db.request('manager','reviseIncidentUpdate',change);assert.equal(s.incidentUpdates[0].detail,'최초 후속');assert.equal(s.incidentUpdateRevisions[0].detail,'<정정 후속>');assert.equal(s.incidents[0].id,incident.id);
  await assert.rejects(db.request('manager','reviseIncidentUpdate',change),/REVISION_CONFLICT/);assert.equal((await db.request('other','state')).incidentUpdateRevisions.length,0);
  const html=renderIncidents({...s,actors:{}},esc);assert.match(html,/후속 원본·정정 이력 2건/);assert.match(html,/최초 후속/);assert.match(html,/&lt;정정 후속&gt;/);assert.match(html,/가상 내용 정정/);
  restored=await PGlite.create({loadDataDir:await db.backup('owner')});assert.equal((await restored.query('select count(*)::int n from site_incident_update_revisions')).rows[0].n,1);
 }finally{await restored?.close();await db.close();}
});
