import {test} from 'node:test';
import assert from 'node:assert/strict';
import {budgetBalance,renderResources} from '../web/resources-ui.js';
test('budget balance uses only latest correction for each included expense',()=>{
 const expenses=[{id:'a',amount:'200'},{id:'b',amount:'300'}];
 const corrections=[{expense_id:'a',revision:2,amount:'450'},{expense_id:'other',revision:5,amount:'9000'},{expense_id:'a',revision:1,amount:'250'}];
 assert.deepEqual(budgetBalance('1000',expenses,corrections),{total:750n,difference:250n});
 assert.deepEqual(budgetBalance('700',expenses,corrections),{total:750n,difference:-50n});
 assert.deepEqual(budgetBalance('0',[],[]),{total:0n,difference:0n});
 assert.deepEqual(budgetBalance('1000000000000',[{id:'x',amount:'999999999999'}],[]),{total:999999999999n,difference:1n});
});
test('resource display distinguishes overrun from remaining balance',()=>{
 const state={member:{role:'owner'},actors:{},obligations:[],resources:[{id:'r',kind:'budget',amount:'100',name:'실증',responsible:'담당',description:'계획'}],expenses:[{id:'e',resource_id:'r',amount:'150',spent_on:'2026-01-01',description:'집행',evidence_note:'메모'}],expenseCorrections:[]};
 const html=renderResources(state,String);assert.match(html,/계획 대비 초과액: 50원/);assert.match(html,/실제 승인·결제 또는 예산 확보 여부를 뜻하지 않습니다/);
 assert.equal(renderResources({...state,member:{role:'manager'}},String),'');
});
