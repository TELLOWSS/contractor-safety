import {test} from 'node:test';
import assert from 'node:assert/strict';
import {reviewTiming,renderObligations} from '../web/obligations-ui.js';
import {seoulDate} from '../web/action-view.js';
test('review schedule uses calendar boundaries and flags invalid dates',()=>{
 const today='2026-11-06';
 for(const [date,expected] of [['2026-11-05','overdue'],['2026-11-06','today'],['2026-12-06','soon'],['2026-12-07','later'],['2026-02-30','unknown'],['','unknown']]) assert.equal(reviewTiming(date,today),expected);
 assert.equal(seoulDate(new Date('2026-11-05T15:00:00Z')),today);
});
test('review list shows upcoming items without implying legal compliance',()=>{
 const today=seoulDate(), earlier='2000-01-01';
 const row=(id,title,next_review)=>({id,title,next_review,applicability:'pending',reference:'실증',source_version:'1',effective_on:earlier,reason:'',reviewed_by:'a',reviewed_at:'2026-01-01T00:00:00Z',revision:1,events:[]});
 const esc=x=>String(x??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
 const html=renderObligations({member:{role:'owner'},actors:{},actions:[],obligations:[row('1','<가상 의무>',today),row('2','기한 경과',earlier),row('3','먼 일정','2099-01-01')]},esc);
 assert.match(html,/재검토 일정 확인 2건/);assert.match(html,/&lt;가상 의무&gt;/);assert.match(html,/오늘 예정/);assert.match(html,/기한 경과/);assert.match(html,/법적 기한이나 검토 완료 여부를 판정하지 않습니다/);
});
