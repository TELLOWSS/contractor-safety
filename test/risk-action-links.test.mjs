import {test} from 'node:test';
import assert from 'node:assert/strict';
import {renderActionRisks,renderActions} from '../web/actions-ui.js';
import {renderWorkRisks} from '../web/work-risks-ui.js';
const esc=x=>String(x??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const action={id:'a',site_id:'s',title:'<점검>',assignee:'가상',due_date:'2026-12-01',status:'open',events:[],revision:1},risk={id:'r',site_id:'s',action_id:'a',work_type:'철근',location:'2층',work_date:'2026-11-06',hazard:'<위험>',measure:'조치',created_at:'2026-11-06'};
const state={actor:'viewer',member:{role:'viewer'},actors:{},sites:[{id:'s',name:'현장',active:true}],actions:[action],workRisks:[risk,{...risk,id:'wrong',site_id:'other'}]};
test('action lists only same site linked risks with escaped names',()=>{const html=renderActionRisks(state,action,esc);assert.match(html,/연결된 작업 위험 1건/);assert.match(html,/href="#risk-r"/);assert.match(html,/&lt;위험&gt;/);assert.doesNotMatch(html,/#risk-wrong/);assert.match(renderActions(state,esc),/id="action-a"/);});
test('risk links back to the accessible same-site action',()=>{let html=renderWorkRisks({...state,workRisks:[risk]},esc);assert.match(html,/href="#action-a"/);assert.match(html,/&lt;점검&gt;/);html=renderWorkRisks({...state,actions:[{...action,site_id:'other'}],workRisks:[risk]},esc);assert.doesNotMatch(html,/href="#action-a"/);assert.match(html,/연결 없음/);});
