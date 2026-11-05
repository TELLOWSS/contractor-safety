import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';

test('PostgreSQL RLS: company/site boundaries, revoked roles, writes and active-site cap',async t=>{
 const db=new PGlite();
 const id=n=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
 const [a,b,owner,manager,viewer,outsider,s1,s2]=[1,2,11,12,13,14,21,22].map(id);
 try{
 await db.exec(`create role anon; create role authenticated; create schema auth; create table auth.users(id uuid primary key); create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$; grant usage on schema auth to authenticated; grant execute on function auth.uid() to authenticated;`);
 await db.exec(await readFile(new URL('../db/schema.sql',import.meta.url),'utf8'));
 await db.exec(`insert into auth.users values ('${owner}'),('${manager}'),('${viewer}'),('${outsider}'); insert into companies values ('${a}','A'),('${b}','B'); insert into company_members values ('${a}','${owner}','owner',true),('${a}','${manager}','manager',true),('${a}','${viewer}','viewer',true),('${b}','${outsider}','owner',true);`);
 const as=async user=>{await db.exec('reset role');await db.query("select set_config('request.jwt.claim.sub',$1,false)",[user]);await db.exec('set role authenticated');};
 await db.query("select set_config('request.jwt.claim.sub',$1,false)",[owner]);
 await db.exec(`insert into sites(id,company_id,name) values ('${s1}','${a}','A1'),('${s2}','${a}','A2'); insert into site_members values ('${a}','${s1}','${manager}'),('${a}','${s1}','${viewer}');`);
 await t.test('owner sees company sites; other company sees none',async()=>{
  await as(owner);assert.equal((await db.query('select * from sites')).rows.length,2);
  await as(outsider);assert.equal((await db.query('select * from sites')).rows.length,0);
 });
 await t.test('manager sees assigned site only and cannot self-promote',async()=>{
  await as(manager);assert.deepEqual((await db.query('select id from sites')).rows.map(r=>r.id),[s1]);
  await assert.rejects(db.exec("update company_members set role='owner'"),/permission denied/);
 });
 await t.test('manager writes assigned site only; viewer cannot write',async()=>{
  await as(manager);await db.query('insert into pilot_feedback(company_id,site_id,feature,decision,reason) values ($1,$2,$3,$4,$5)',[a,s1,'입력','보완','줄이기']);
  await assert.rejects(db.query('insert into pilot_feedback(company_id,site_id,feature,decision,reason) values ($1,$2,$3,$4,$5)',[a,s2,'입력','보완','줄이기']),/row-level security/);
  await as(viewer);await assert.rejects(db.query('insert into pilot_feedback(company_id,site_id,feature,decision,reason) values ($1,$2,$3,$4,$5)',[a,s1,'입력','보완','줄이기']),/row-level security/);
 });
 await t.test('revocation takes effect without refreshing the JWT',async()=>{
  await db.exec(`reset role; update company_members set active=false where user_id='${manager}'`);
  await as(manager);assert.equal((await db.query('select * from pilot_feedback')).rows.length,0);assert.equal((await db.query('select * from sites')).rows.length,0);
 });
 await t.test('site cap blocks inserts and reactivation; closed sites retained',async()=>{
  await as(owner);
  for(let n=0;n<13;n++)await db.query('insert into sites(company_id,name) values($1,$2)',[a,`현장 ${n}`]);
  await assert.rejects(db.query('insert into sites(company_id,name) values($1,$2)',[a,'16번째']),/ACTIVE_SITE_LIMIT/);
  await db.query('update sites set active=false,revision=2 where id=$1',[s1]);
  await db.query('insert into sites(company_id,name) values($1,$2)',[a,'대체 현장']);
  await assert.rejects(db.query('update sites set active=true,revision=3 where id=$1',[s1]),/ACTIVE_SITE_LIMIT/);
  assert.equal((await db.query('select * from sites')).rows.length,16);
 });
 await t.test('revision conflict and scope reassignment are rejected',async()=>{
  await as(owner);await assert.rejects(db.query('update sites set active=false,revision=1 where id=$1',[s2]),/REVISION_CONFLICT/);
  await assert.rejects(db.query('update sites set company_id=$1 where id=$2',[b,s2]),/permission denied/);
 });
 await t.test('anonymous access and client deletion denied',async()=>{
  await db.exec('reset role; set role anon');await assert.rejects(db.exec('select * from sites'),/permission denied/);
  await as(owner);await assert.rejects(db.exec('delete from sites'),/permission denied/);
 });
 }finally{await db.close();}
});
