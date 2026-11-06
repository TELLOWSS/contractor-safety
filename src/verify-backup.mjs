import {PGlite} from '@electric-sql/pglite';
import {createHash} from 'node:crypto';
const MAX_FILES=1000, MAX_FILE_BYTES=100*1024*1024;
export async function inspectBackup(blob){
 if(!blob||blob.size<16||blob.size>50*1024*1024)throw new Error('INVALID_BACKUP_SIZE');
 let db;
 try{
  db=await PGlite.create({loadDataDir:blob});
  const q=await db.query(`select (select count(*)::int from public.companies) companies,(select count(*)::int from public.sites) sites,(select count(*)::int from public.obligations) obligations,(select count(*)::int from public.safety_actions) actions,(select count(*)::int from public.budget_expenses) expenses,(select count(*)::int from public.expense_corrections) corrections`);
  const counts=q.rows[0],tables=[['site_requirement_files','files','fileBytes'],['site_action_photos','photos','photoBytes']];let totalCount=0,totalBytes=0n;
  for(const [table,countKey,bytesKey] of tables){
   const exists=(await db.query('select to_regclass($1) as name',[`public.${table}`])).rows[0].name;
   if(!exists){counts[countKey]=null;counts[bytesKey]=null;continue;}
   const totals=(await db.query(`select count(*)::int count,coalesce(sum(byte_size),0)::bigint bytes from public.${table}`)).rows[0];
   totalCount+=Number(totals.count);totalBytes+=BigInt(totals.bytes);if(totalCount>MAX_FILES||totalBytes>BigInt(MAX_FILE_BYTES))throw new Error('BACKUP_FILE_LIMIT');
   const ids=(await db.query(`select id from public.${table} order by id`)).rows;
   for(const {id} of ids){const row=(await db.query(`select byte_size,sha256,encode(content,'base64') data from public.${table} where id=$1`,[id])).rows[0];const bytes=Buffer.from(row.data,'base64');if(bytes.length!==row.byte_size||createHash('sha256').update(bytes).digest('hex')!==row.sha256)throw new Error('BACKUP_FILE_MISMATCH');}
   counts[countKey]=ids.length;counts[bytesKey]=Number(totals.bytes);
  }
  return counts;
 }finally{await db?.close();}
}
