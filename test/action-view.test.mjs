import {test} from 'node:test';
import assert from 'node:assert/strict';
import {filteredActions,seoulDate,renderReport,emptyFilters} from '../web/action-view.js';
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const base={actor:'manager',actors:{manager:{id:'u',label:'현장 담당자'}},member:{name:'가상 회사'},sites:[{id:'s1',name:'동쪽 현장'},{id:'s2',name:'서쪽 현장'}],actions:[
 {id:'a',site_id:'s1',title:'덮개 확인',assignee:'담당 A',due_date:'2026-11-04',status:'open',note:'보완',events:[],created_at:'2026-11-01'},
 {id:'b',site_id:'s1',title:'안전 난간',assignee:'담당 B',due_date:'2026-11-05',status:'requested',evidence_note:'사진 002',events:[],created_at:'2026-11-01'},
 {id:'c',site_id:'s2',title:'통로 점검',assignee:'담당 C',due_date:'2026-11-03',status:'verified',events:[],created_at:'2026-11-01'}]};
test('Seoul midnight and overdue logic exclude today and completed records',()=>{
 assert.equal(seoulDate(new Date('2026-11-04T15:01:00Z')),'2026-11-05');
 assert.deepEqual(filteredActions(base,{...emptyFilters(),overdue:true},'2026-11-05').map(a=>a.id),['a']);
});
test('combined filters and Korean evidence/site searches keep only matching rows',()=>{
 assert.deepEqual(filteredActions(base,{site:'s1',status:'requested',query:'사진',overdue:false}).map(a=>a.id),['b']);
 assert.deepEqual(filteredActions(base,{...emptyFilters(),query:'서쪽'}).map(a=>a.id),['c']);
 assert.equal(filteredActions(base,{...emptyFilters(),site:'unknown'}).length,0);
});
test('report matches selected scope, includes zero state and escapes user text',()=>{
 const state=structuredClone(base);state.actions[0].title='<img src=x onerror=alert(1)>';
 const report=renderReport(state,{...emptyFilters(),status:'open'},esc,new Date('2026-11-05T00:00:00Z'));
 assert.match(report,/조회 결과 1건/);assert.match(report,/&lt;img/);assert.doesNotMatch(report,/<img/);assert.doesNotMatch(report,/통로 점검/);
 assert.match(renderReport(state,{...emptyFilters(),query:'없는 검색어'},esc),/조회 결과 0건/);
});
