import {PGlite} from '@electric-sql/pglite';
export async function inspectBackup(blob){
 if(!blob||blob.size<16||blob.size>50*1024*1024)throw new Error('INVALID_BACKUP_SIZE');
 let db;
 try{
  db=await PGlite.create({loadDataDir:blob});
  const q=await db.query(`select (select count(*)::int from public.companies) companies,(select count(*)::int from public.sites) sites,(select count(*)::int from public.obligations) obligations,(select count(*)::int from public.safety_actions) actions,(select count(*)::int from public.budget_expenses) expenses,(select count(*)::int from public.expense_corrections) corrections`);
  return q.rows[0];
 }finally{await db?.close();}
}
