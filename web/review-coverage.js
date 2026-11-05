import {seoulDate} from './action-view.js';
export function defaultPeriod(now=new Date()){
 const day=seoulDate(now);return {year:Number(day.slice(0,4)),half:Number(day.slice(5,7))<=6?'1':'2'};
}
export function periodBounds(year,half){
 if(!Number.isInteger(year)||year<1900||year>2100||!['1','2'].includes(half))throw new Error('INVALID_PERIOD');
 return {start:`${year}-${half==='1'?'01-01':'07-01'}`,end:`${year}-${half==='1'?'06-30':'12-31'}`};
}
export function coverage(state,period){
 const {start,end}=periodBounds(period.year,period.half);
 return (state.obligations??[]).map(o=>{
  const matches=(state.reviews??[]).filter(r=>r.obligation_id===o.id&&String(r.period_start).slice(0,10)===start&&String(r.period_end).slice(0,10)===end).sort((a,b)=>String(b.created_at).localeCompare(String(a.created_at))||String(b.id).localeCompare(String(a.id)));
  return {obligation:o,matches,versionChanged:matches.length>0&&matches[0].obligation_snapshot.revision!==o.revision};
 });
}
