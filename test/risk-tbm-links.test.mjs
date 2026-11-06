import {test} from 'node:test';
import assert from 'node:assert/strict';
import {renderRiskTbmLinks,renderWorkRisks} from '../web/work-risks-ui.js';
import {renderTbm} from '../web/tbm-ui.js';
const esc=x=>String(x??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const risk={id:'r',site_id:'s',work_type:'철근',location:'2층',work_date:'2026-11-06',hazard:'위험',measure:'조치',created_at:'2026-11-06',recorded_by:'actor'},tbm={id:'t',risk_id:'r',site_id:'s',started_at:'2026-11-06T07:30:00',duration_minutes:10,location:'<가상 장소>',work_description:'가상 작업',hazard:'위험',instruction:'전달',facilitator_alias:'가상',risk_snapshot:{work_type:'철근',location:'2층',hazard:'위험'},created_at:'2026-11-06'};
const state={member:{role:'viewer'},sites:[{id:'s',name:'현장',active:true}],actions:[],actors:{},workRisks:[risk],tbmSessions:[tbm,{...tbm,id:'other',site_id:'other'},{...tbm,id:'other-risk',risk_id:'other'}]};
test('risk displays only same-site linked TBM and keeps participation optional',()=>{const html=renderRiskTbmLinks(state,risk,esc);assert.match(html,/연결된 TBM 기록 1건/);assert.match(html,/#tbm-t/);assert.match(html,/&lt;가상 장소&gt;/);assert.doesNotMatch(html,/#tbm-other/);assert.match(html,/연결 여부는 참석·교육 이수/);assert.match(renderWorkRisks(state,esc),/id="risk-r"/);});
test('TBM links back only when its risk is accessible at the same site',()=>{let html=renderTbm({...state,tbmSessions:[tbm]},esc);assert.match(html,/id="tbm-t"/);assert.match(html,/href="#risk-r"/);html=renderTbm({...state,workRisks:[{...risk,site_id:'other'}],tbmSessions:[tbm]},esc);assert.doesNotMatch(html,/href="#risk-r"/);assert.match(html,/철근 · 2층 · 위험/);});
