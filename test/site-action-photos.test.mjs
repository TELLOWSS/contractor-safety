import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {PGlite} from '@electric-sql/pglite';
import {openLocalStore} from '../src/local-store.mjs';
import {inspectBackup} from '../src/verify-backup.mjs';
import {renderActions} from '../web/actions-ui.js';
const esc=x=>String(x??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
test('action photos are scoped, bounded, tied to an action revision, and backed up',async()=>{
 const db=await openLocalStore();let restored;try{
  const site=(await db.request('manager','state')).sites[0],other=(await db.request('owner','state')).sites.find(s=>s.id!==site.id);
  let s=await db.request('manager','addAction',{site_id:site.id,title:'가상 조치',assignee:'가상',due_date:'2026-12-01'});const action=s.actions[0],bytes=Buffer.from([137,80,78,71,13,10,26,10,1,2,3]);
  const data={site_id:site.id,action_id:action.id,action_revision:action.revision,phase:'작업 전',filename:'가상.png',content_base64:bytes.toString('base64')};
  await assert.rejects(db.request('viewer','addActionPhoto',data));await assert.rejects(db.request('other','addActionPhoto',data));await assert.rejects(db.request('manager','addActionPhoto',{...data,site_id:other.id}));await assert.rejects(db.request('manager','addActionPhoto',{...data,content_base64:Buffer.from('not image').toString('base64')}));await assert.rejects(db.request('manager','addActionPhoto',{...data,filename:'../unsafe.png'}));await assert.rejects(db.request('manager','addActionPhoto',{...data,action_revision:99}));
  s=await db.request('manager','addActionPhoto',data);const photo=s.actionPhotos[0];assert.equal(photo.sha256,createHash('sha256').update(bytes).digest('hex'));assert.equal('content' in photo,false);assert.deepEqual(Buffer.from((await db.request('viewer','getActionPhoto',{id:photo.id})).content_base64,'base64'),bytes);await assert.rejects(db.request('other','getActionPhoto',{id:photo.id}));
  const html=renderActions({...s,actors:{manager:{id:'test'}}},esc);assert.match(html,/연결된 사진 1건/);assert.match(html,/사진 구분은 촬영 시점이나 개선 완료의 증명이 아닙니다/);
  await db.request('manager','transitionAction',{id:action.id,revision:action.revision,status:'requested',note:'확인 요청',evidence_note:'가상 메모'});await assert.rejects(db.request('manager','addActionPhoto',data));
  const backup=await db.backup('owner'),report=await inspectBackup(backup);assert.equal(report.photos,1);assert.equal(report.photoBytes,bytes.length);
  restored=await PGlite.create({loadDataDir:backup});const stored=await restored.query("select encode(content,'base64') data from site_action_photos where id=$1",[photo.id]);assert.deepEqual(Buffer.from(stored.rows[0].data,'base64'),bytes);
  await restored.query('update site_action_photos set sha256=$1 where id=$2',['0'.repeat(64),photo.id]);await assert.rejects(inspectBackup(await restored.dumpDataDir('gzip')),/BACKUP_FILE_MISMATCH/);
 }finally{await restored?.close();await db.close();}
});
