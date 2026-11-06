import {PGlite} from '@electric-sql/pglite';
import {createHash} from 'node:crypto';
const MAX_FILES=1000, MAX_FILE_BYTES=100*1024*1024;
export async function inspectBackup(blob){
 if(!blob||blob.size<16||blob.size>50*1024*1024)throw new Error('INVALID_BACKUP_SIZE');
 let db;
 try{
  db=await PGlite.create({loadDataDir:blob});
  const q=await db.query(`select (select count(*)::int from public.companies) companies,(select count(*)::int from public.sites) sites,(select count(*)::int from public.obligations) obligations,(select count(*)::int from public.safety_actions) actions,(select count(*)::int from public.budget_expenses) expenses,(select count(*)::int from public.expense_corrections) corrections`);
  const counts=q.rows[0],hasFiles=(await db.query("select to_regclass('public.site_requirement_files') as name")).rows[0].name;
  if(!hasFiles)return {...counts,files:null,fileBytes:null};
  const totals=(await db.query('select count(*)::int count,coalesce(sum(byte_size),0)::bigint bytes from public.site_requirement_files')).rows[0];
  if(Number(totals.count)>MAX_FILES||BigInt(totals.bytes)>BigInt(MAX_FILE_BYTES))throw new Error('BACKUP_FILE_LIMIT');
  const ids=(await db.query('select id from public.site_requirement_files order by id')).rows;
  for(const {id} of ids){
   const row=(await db.query("select byte_size,sha256,encode(content,'base64') data from public.site_requirement_files where id=$1",[id])).rows[0];
   const bytes=Buffer.from(row.data,'base64');
   if(bytes.length!==row.byte_size||createHash('sha256').update(bytes).digest('hex')!==row.sha256)throw new Error('BACKUP_FILE_MISMATCH');
  }
  return {...counts,files:ids.length,fileBytes:Number(totals.bytes)};
 }finally{await db?.close();}
}
