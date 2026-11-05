import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {openLocalStore} from '../src/local-store.mjs';
test('local persistent PostgreSQL: restart, concurrent role isolation and denied writes',async()=>{
 const path=join(await mkdtemp(join(tmpdir(),'contractor-local-test-')),'db');
 let db=await openLocalStore(path);
 try{
  const states=await Promise.all(['owner','manager','viewer','other'].map(a=>db.request(a,'state')));
  assert.deepEqual(states.map(s=>s.sites.length),[2,1,1,0]);
  const site=states[1].sites[0];
  await db.request('manager','feedback',{site_id:site.id,feature:'지속 저장 검증',decision:'보완',reason:'서버를 종료해도 보존'});
  await assert.rejects(db.request('viewer','feedback',{site_id:site.id,feature:'불가',decision:'보완',reason:'조회 전용'}));
  await assert.rejects(db.request('manager','addSite',{name:'불가'}));
  assert.equal((await db.request('other','state')).feedback.length,0);
  await db.close();db=await openLocalStore(path);
  assert.equal((await db.request('owner','state')).feedback[0].feature,'지속 저장 검증');
  const results=await Promise.all(['owner','other','manager','viewer'].map(a=>db.request(a,'state')));
  assert.deepEqual(results.map(s=>s.feedback.length),[1,0,1,1]);
  await assert.rejects(db.request('__proto__','state'),/INVALID_ACTOR/);
 }finally{await db.close();}
});
