import {test} from 'node:test';
import assert from 'node:assert/strict';
import {PGlite} from '@electric-sql/pglite';
import {openLocalStore,actors} from '../src/local-store.mjs';
import {inspectBackup} from '../src/verify-backup.mjs';
test('full backup restores data, history and row permissions into an isolated database',async()=>{
 const source=await openLocalStore();let restored;
 try{
 const site=(await source.request('manager','state')).sites[0];
 await source.request('manager','addAction',{site_id:site.id,title:'백업 가상 조치',assignee:'가상',due_date:'2026-12-01'});
 await assert.rejects(source.backup('viewer'),/ACCESS_DENIED/);
 const backup=await source.backup('owner');assert.ok(backup.size>0);
 const counts=await inspectBackup(backup);assert.equal(counts.actions,1);assert.equal(counts.companies,2);await assert.rejects(inspectBackup(new Blob(['bad'])));
 restored=await PGlite.create({loadDataDir:backup});
 const row=(await restored.query('select title,events from safety_actions')).rows[0];assert.equal(row.title,'백업 가상 조치');assert.equal(row.events.length,1);
 await restored.query("select set_config('request.jwt.claim.sub',$1,false)",[actors.other.id]);await restored.exec('set role authenticated');assert.equal((await restored.query('select * from safety_actions')).rows.length,0);
 }finally{await restored?.close();await source.close();}
});
