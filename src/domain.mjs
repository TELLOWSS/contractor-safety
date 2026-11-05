export const statuses = ['draft','in_progress','review_requested','verified'];
export function authorize(actor, record, write=false) {
  if (!actor || actor.companyId !== record.companyId || !actor.active) throw new Error('ACCESS_DENIED');
  if (!actor.siteIds.includes(record.siteId)) throw new Error('SITE_ACCESS_DENIED');
  if(write && !['manager','reviewer'].includes(actor.role)) throw new Error('READ_ONLY');
}
export function transition(record, next, actor, expectedRevision, note, now=new Date().toISOString()) {
  authorize(actor,record,true);
  if(record.revision!==expectedRevision) throw new Error('REVISION_CONFLICT');
  const allowed={draft:['in_progress'],in_progress:['review_requested'],review_requested:['in_progress','verified'],verified:[]};
  if(!allowed[record.status]?.includes(next)) throw new Error('INVALID_TRANSITION');
  if(!note?.trim()) throw new Error('NOTE_REQUIRED');
  if(next==='review_requested' && !record.evidenceIds.length) throw new Error('EVIDENCE_REQUIRED');
  if(next==='verified' && (actor.role!=='reviewer'||actor.id===record.createdBy)) throw new Error('INDEPENDENT_REVIEW_REQUIRED');
  return {...record,status:next,revision:record.revision+1,events:[...record.events,{actorId:actor.id,from:record.status,to:next,note:note.trim(),at:now,revision:record.revision+1}]};
}
export function createSite(sites,companyId,name,id) {
  if(!name?.trim()||!companyId||!id) throw new Error('INVALID_SITE');
  if(sites.some(s=>s.id===id)) throw new Error('DUPLICATE_SITE');
  if(sites.filter(s=>s.companyId===companyId&&s.active).length>=15) throw new Error('ACTIVE_SITE_LIMIT');
  return {id,companyId,name:name.trim(),active:true};
}
