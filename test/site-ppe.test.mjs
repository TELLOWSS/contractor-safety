import {test} from 'node:test';
import assert from 'node:assert/strict';
import {PGlite} from '@electric-sql/pglite';
import {openLocalStore} from '../src/local-store.mjs';
import {renderPpe} from '../web/ppe-ui.js';
const esc=x=>String(x??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
test('PPE records restrict site and role and do not require recipient information',async()=>{
 const db=await openLocalStore();let restored;try{
  const site=(await db.request('manager','state')).sites[0],other=(await db.request('owner','state')).sites.find(s=>s.id!==site.id);
  const data={site_id:site.id,issued_on:'2026-11-06',item_name:'<가상 안전모>',quantity:'3',unit:'개'};
  await assert.rejects(db.request('viewer','addPpeIssue',data));await assert.rejects(db.request('other','addPpeIssue',data));await assert.rejects(db.request('manager','addPpeIssue',{...data,site_id:other.id}));
  for(const quantity of ['0','-1','1.5','1000001',''])await assert.rejects(db.request('manager','addPpeIssue',{...data,quantity}));
  const s=await db.request('manager','addPpeIssue',data);assert.equal(s.ppeIssues[0].quantity,3);assert.equal(s.ppeIssues[0].recipient_note,'');assert.equal(s.ppeIssues[0].note,'');assert.equal((await db.request('viewer','state')).ppeIssues.length,1);assert.equal((await db.request('other','state')).ppeIssues.length,0);
  const html=renderPpe({...s,actors:{}},esc);assert.match(html,/&lt;가상 안전모&gt;/);assert.match(html,/수령 대상 메모: 미입력/);assert.match(html,/실제 지급·수령 확인이나 적정 보호구 지급 여부를 자동 판정하지 않습니다/);
  restored=await PGlite.create({loadDataDir:await db.backup('owner')});assert.equal((await restored.query('select count(*)::int n from site_ppe_issues')).rows[0].n,1);
 }finally{await restored?.close();await db.close();}
});
