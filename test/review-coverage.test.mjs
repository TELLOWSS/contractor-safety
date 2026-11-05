import {test} from 'node:test';
import assert from 'node:assert/strict';
import {coverage,periodBounds,defaultPeriod} from '../web/review-coverage.js';
test('half-year coverage retains unreviewed and non-applicable obligations and uses exact periods',()=>{
 const state={obligations:[{id:'a',revision:2,applicability:'applicable'},{id:'b',revision:1,applicability:'not_applicable'},{id:'c',revision:1,applicability:'pending'}],reviews:[
  {id:'r1',obligation_id:'a',period_start:'2026-01-01',period_end:'2026-06-30',created_at:'2026-07-01',result:'미확인',obligation_snapshot:{revision:1}},
  {id:'r2',obligation_id:'b',period_start:'2026-01-02',period_end:'2026-06-30',created_at:'2026-07-01',obligation_snapshot:{revision:1}}]};
 const rows=coverage(state,{year:2026,half:'1'});assert.equal(rows.length,3);assert.equal(rows[0].matches[0].result,'미확인');assert.equal(rows[0].versionChanged,true);assert.equal(rows[1].matches.length,0);assert.equal(rows[2].matches.length,0);
 assert.deepEqual(periodBounds(2026,'2'),{start:'2026-07-01',end:'2026-12-31'});assert.throws(()=>periodBounds(2026,'3'));
 assert.deepEqual(defaultPeriod(new Date('2026-06-30T15:00:00Z')),{year:2026,half:'2'});
});
