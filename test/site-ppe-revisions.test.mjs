import {test} from 'node:test';
import assert from 'node:assert/strict';
import {PGlite} from '@electric-sql/pglite';
import {openLocalStore} from '../src/local-store.mjs';
import {renderPpe} from '../web/ppe-ui.js';
const esc=x=>String(x??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
test('PPE corrections retain original, enforce site scope and reject stale changes',async()=>{
 const db=await openLocalStore();let restored;try{
  const site=(await db.request('manager','state')).sites[0],other=(await db.request('owner','state')).sites.find(s=>s.id!==site.id);
  const base={site_id:site.id,issued_on:'2026-11-06',item_name:'가상 안전모',quantity:'3',unit:'개'};
  const original=(await db.request('manager','addPpeIssue',base)).ppeIssues[0];
  const change={...base,issue_id:original.id,revision:1,quantity:'5',item_name:'<정정 안전모>',reason:'수량 입력 정정'};
  await assert.rejects(db.request('viewer','revisePpeIssue',change));await assert.rejects(db.request('other','revisePpeIssue',change));await assert.rejects(db.request('manager','revisePpeIssue',{...change,site_id:other.id}));await assert.rejects(db.request('manager','revisePpeIssue',{...change,reason:' '}));
  for(const quantity of ['0','-1','1.5','1000001'])await assert.rejects(db.request('manager','revisePpeIssue',{...change,quantity}));
  let s=await db.request('manager','revisePpeIssue',change);assert.equal(s.ppeIssues[0].quantity,3);assert.equal(s.ppeRevisions[0].quantity,5);assert.equal(s.ppeRevisions[0].recipient_note,'');
  await assert.rejects(db.request('manager','revisePpeIssue',change),/REVISION_CONFLICT/);assert.equal((await db.request('other','state')).ppeRevisions.length,0);
  const html=renderPpe({...s,actors:{}},esc);assert.match(html,/지급 원본·정정 이력 2건/);assert.match(html,/가상 안전모 3개/);assert.match(html,/&lt;정정 안전모&gt;/);assert.match(html,/수량 입력 정정/);
  restored=await PGlite.create({loadDataDir:await db.backup('owner')});assert.equal((await restored.query('select count(*)::int n from site_ppe_revisions')).rows[0].n,1);
 }finally{await restored?.close();await db.close();}
});
