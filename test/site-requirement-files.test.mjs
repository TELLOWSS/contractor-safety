import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {PGlite} from '@electric-sql/pglite';
import {openLocalStore} from '../src/local-store.mjs';
import {inspectBackup} from '../src/verify-backup.mjs';
test('files are scoped, tied to a revision, and restored in DB backup',async()=>{
 const db=await openLocalStore();let restored;try{
  const site=(await db.request('manager','state')).sites[0];const data={site_id:site.id,kind:'양식',title:'가상 양식',source_kind:'확인 전',confirmation:'확인 전',detail:'가상'};
  const req=(await db.request('manager','addSiteRequirement',data)).siteRequirements[0];const bytes=Buffer.from('가상 양식 데이터');const input={site_id:site.id,requirement_id:req.id,requirement_revision:0,filename:'가상.txt',content_base64:bytes.toString('base64')};
  await assert.rejects(db.request('viewer','addRequirementFile',input));await assert.rejects(db.request('other','addRequirementFile',input));await assert.rejects(db.request('manager','addRequirementFile',{...input,filename:'../test.txt'}));await assert.rejects(db.request('manager','addRequirementFile',{...input,content_base64:'not base64'}));
  let s=await db.request('manager','addRequirementFile',input);assert.equal(s.siteRequirementFiles.length,1);const file=s.siteRequirementFiles[0];assert.equal(file.sha256,createHash('sha256').update(bytes).digest('hex'));assert.equal('content' in file,false);
  assert.equal(Buffer.from((await db.request('viewer','getRequirementFile',{id:file.id})).content_base64,'base64').toString(),bytes.toString());await assert.rejects(db.request('other','getRequirementFile',{id:file.id}));
  await db.request('manager','reviseSiteRequirement',{...data,requirement_id:req.id,revision:1,reason:'개정'});await assert.rejects(db.request('manager','addRequirementFile',input),/REVISION_CONFLICT/);
  s=await db.request('manager','addRequirementFile',{...input,requirement_revision:1});assert.equal(s.siteRequirementFiles.length,2);
  const backup=await db.backup('owner');const inspected=await inspectBackup(backup);assert.equal(inspected.files,2);assert.equal(inspected.fileBytes,bytes.length*2);restored=await PGlite.create({loadDataDir:backup});const saved=await restored.query("select encode(content,'base64') data from site_requirement_files where id=$1",[file.id]);assert.deepEqual(Buffer.from(saved.rows[0].data,'base64'),bytes);
  await restored.query('update site_requirement_files set sha256=$1 where id=$2',['0'.repeat(64),file.id]);const tampered=await restored.dumpDataDir('gzip');await assert.rejects(inspectBackup(tampered),/BACKUP_FILE_MISMATCH/);
  await restored.exec('drop table site_requirement_files');const older=await inspectBackup(await restored.dumpDataDir('gzip'));assert.equal(older.files,null);
 }finally{await restored?.close();await db.close();}
});
