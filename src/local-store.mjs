import {PGlite} from '@electric-sql/pglite';
import {readFile} from 'node:fs/promises';
export const actors={owner:{id:'00000000-0000-4000-8000-000000000011',label:'A사 본사 관리자'},manager:{id:'00000000-0000-4000-8000-000000000012',label:'A사 현장 담당자'},viewer:{id:'00000000-0000-4000-8000-000000000013',label:'A사 조회 전용'},other:{id:'00000000-0000-4000-8000-000000000014',label:'B사 본사 관리자'}};
export async function openLocalStore(path){
 const db=new PGlite(path);
 const exists=await db.query("select to_regclass('public.companies') as name");
 if(!exists.rows[0].name){
  await db.exec(`create role anon; create role authenticated; create schema auth; create table auth.users(id uuid primary key); create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$; grant usage on schema auth to authenticated; grant execute on function auth.uid() to authenticated;`);
  await db.exec(await readFile(new URL('../db/schema.sql',import.meta.url),'utf8'));
  await db.exec('begin');
  try{
   for(const a of Object.values(actors))await db.query('insert into auth.users values ($1)',[a.id]);
   await db.exec("insert into companies(id,name) values ('00000000-0000-4000-8000-000000000001','개발용 A사'),('00000000-0000-4000-8000-000000000002','개발용 B사')");
   for(const [role,a] of Object.entries(actors))await db.query('insert into company_members values($1,$2,$3,true)',[`00000000-0000-4000-8000-00000000000${role==='other'?2:1}`,a.id,role==='other'?'owner':role]);
   await db.query("select set_config('request.jwt.claim.sub',$1,true)",[actors.owner.id]);
   const site=await db.query("insert into sites(company_id,name) values('00000000-0000-4000-8000-000000000001','개발용 A 현장 1'),('00000000-0000-4000-8000-000000000001','개발용 A 현장 2') returning id");
   for(const a of [actors.manager,actors.viewer])await db.query("insert into site_members values('00000000-0000-4000-8000-000000000001',$1,$2)",[site.rows[0].id,a.id]);
   await db.exec('commit');
  }catch(e){await db.exec('rollback');throw e;}
 }
 if(!(await db.query("select to_regclass('public.safety_actions') as name")).rows[0].name){
  await db.exec(await readFile(new URL('../db/local-actions.sql',import.meta.url),'utf8'));
 }
 await db.exec('create table if not exists private.local_schema_versions(version text primary key); revoke all on private.local_schema_versions from public,anon,authenticated');
 if(!(await db.query("select version from private.local_schema_versions where version='action-edit-v1'")).rows.length){
  await db.exec(await readFile(new URL('../db/local-action-edit.sql',import.meta.url),'utf8'));
 }
 if(!(await db.query("select version from private.local_schema_versions where version='obligations-v1'")).rows.length){
  await db.exec(await readFile(new URL('../db/local-obligations.sql',import.meta.url),'utf8'));
 }
 if(!(await db.query("select version from private.local_schema_versions where version='resources-v1'")).rows.length){
  await db.exec(await readFile(new URL('../db/local-resources.sql',import.meta.url),'utf8'));
 }
 let queue=Promise.resolve();
 async function execute(actor,action,input={}){
  if(!Object.hasOwn(actors,actor))throw new Error('INVALID_ACTOR');
  return db.transaction(async tx=>{
   await tx.query("select set_config('request.jwt.claim.sub',$1,true)",[actors[actor].id]);
   await tx.exec('set local role authenticated');
   const member=(await tx.query('select m.company_id,m.role,c.name from company_members m join companies c on c.id=m.company_id where m.active')).rows[0];
   if(!member)throw new Error('ACCESS_DENIED');
   if(action==='addSite')await tx.query('insert into sites(company_id,name) values($1,$2)',[member.company_id,input.name?.trim()]);
   else if(action==='toggleSite'){
    if(typeof input.active!=='boolean'||!Number.isInteger(input.revision))throw new Error('INVALID_INPUT');
    const result=await tx.query('update sites set active=$1,revision=revision+1 where id=$2 and revision=$3 returning id',[input.active,input.id,input.revision]);
    if(!result.rows.length)throw new Error('REVISION_CONFLICT_OR_ACCESS_DENIED');
   }else if(action==='feedback')await tx.query('insert into pilot_feedback(company_id,site_id,feature,decision,reason) values($1,$2,$3,$4,$5)',[member.company_id,input.site_id,input.feature?.trim(),input.decision,input.reason?.trim()]);
   else if(action==='addAction')await tx.query('insert into safety_actions(company_id,site_id,title,assignee,due_date,obligation_id) values($1,$2,$3,$4,$5,$6)',[member.company_id,input.site_id,input.title?.trim(),input.assignee?.trim(),input.due_date,input.obligation_id||null]);
   else if(action==='saveObligation'){
    const values=[input.title?.trim(),input.reference?.trim(),input.source_version?.trim(),input.effective_on,input.applicability,input.reason?.trim()??'',input.next_review,input.change_note?.trim()??''];
    if(input.id){
     if(!Number.isInteger(input.revision))throw new Error('INVALID_INPUT');
     const result=await tx.query('update obligations set title=$1,reference=$2,source_version=$3,effective_on=$4,applicability=$5,reason=$6,next_review=$7,change_note=$8,revision=revision+1 where id=$9 and revision=$10 returning id',[...values,input.id,input.revision]);
     if(!result.rows.length)throw new Error('REVISION_CONFLICT_OR_ACCESS_DENIED');
    }else await tx.query('insert into obligations(title,reference,source_version,effective_on,applicability,reason,next_review,change_note,company_id) values($1,$2,$3,$4,$5,$6,$7,$8,$9)',[...values,member.company_id]);
   }
   else if(action==='addResource'){
    const amount=input.kind==='budget'?input.amount:null;
    if(input.kind==='budget'&&(!/^\d{1,13}$/.test(String(amount))||Number(amount)>1000000000000))throw new Error('INVALID_INPUT');
    await tx.query('insert into obligation_resources(company_id,obligation_id,kind,name,responsible,description,amount) values($1,$2,$3,$4,$5,$6,$7)',[member.company_id,input.obligation_id,input.kind,input.name?.trim(),input.responsible?.trim(),input.description?.trim(),amount]);
   }
   else if(action==='editAction'){
    if(!Number.isInteger(input.revision))throw new Error('INVALID_INPUT');
    const result=await tx.query('update safety_actions set title=$1,assignee=$2,due_date=$3,note=$4,revision=revision+1 where id=$5 and revision=$6 returning id',[input.title?.trim(),input.assignee?.trim(),input.due_date,input.note?.trim()??'',input.id,input.revision]);
    if(!result.rows.length)throw new Error('REVISION_CONFLICT_OR_ACCESS_DENIED');
   }
   else if(action==='transitionAction'){
    if(!Number.isInteger(input.revision))throw new Error('INVALID_INPUT');
    const result=await tx.query('update safety_actions set status=$1,note=$2,evidence_note=$3,revision=revision+1 where id=$4 and revision=$5 returning id',[input.status,input.note?.trim()??'',input.evidence_note?.trim()??'',input.id,input.revision]);
    if(!result.rows.length)throw new Error('REVISION_CONFLICT_OR_ACCESS_DENIED');
   }
   else if(!['state','export'].includes(action))throw new Error('INVALID_ACTION');
   return {actor,member,sites:(await tx.query('select * from sites order by created_at,id')).rows,feedback:(await tx.query('select * from pilot_feedback order by created_at desc')).rows,actions:(await tx.query('select * from safety_actions order by due_date,created_at')).rows,obligations:(await tx.query('select * from obligations order by next_review,title')).rows,resources:(await tx.query('select * from obligation_resources order by created_at desc')).rows};
  });
 }
 return {request(actor,action,input){const next=queue.then(()=>execute(actor,action,input));queue=next.catch(()=>{});return next;},async close(){await queue;await db.close();}};
}
