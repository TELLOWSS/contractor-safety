import {test} from 'node:test';
import assert from 'node:assert/strict';
import {renderRequirementFiles,renderSiteRequirements} from '../web/site-requirements-ui.js';
const esc=x=>String(x??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const file=(id,rev,name)=>({id,requirement_id:'r',requirement_revision:rev,filename:name,byte_size:3,sha256:'a'.repeat(64)});
test('files remain tied to their saved record version without claiming validity',()=>{
 const files=[file('a',0,'old.txt'),file('b',2,'<current>.txt')];
 let html=renderRequirementFiles(files,2,esc);assert.match(html,/현재 기록에 연결된 파일 1건/);assert.match(html,/이전 기록에 연결된 파일 1건/);assert.match(html,/&lt;current&gt;\.txt/);assert.match(html,/연결 상태는 파일의 최신성·적용 여부·원도급사 승인을 뜻하지 않습니다/);
 html=renderRequirementFiles(files,3,esc);assert.match(html,/현재 기록에 연결된 파일 0건/);assert.match(html,/이전 기록에 연결된 파일 2건/);assert.match(html,/이전 파일을 계속 사용할 수 있는지는 현장 기준을 확인/);
 html=renderRequirementFiles([files[0]],0,esc);assert.match(html,/현재 기록에 연결된 파일 1건/);assert.match(html,/연결 기록 원본/);
});
test('record view isolates file counts per requirement and follows latest revision',()=>{
 const row={id:'r',site_id:'s',title:'실증',kind:'양식',source_kind:'확인 전',confirmation:'확인 전',detail:'내용',version_label:'',location_note:'',created_at:'2026-01-01T00:00:00Z'};
 const state={member:{role:'viewer'},sites:[{id:'s',name:'현장',active:true}],sitePrimes:[],siteRequirements:[row],siteRequirementRevisions:[{...row,requirement_id:'r',revision:1,reason:'변경'}],siteRequirementFiles:[file('a',0,'old.txt'),{...file('b',1,'unrelated.txt'),requirement_id:'other'}]};
 const html=renderSiteRequirements(state,esc);assert.match(html,/현재 기록에 연결된 파일 0건/);assert.match(html,/이전 기록에 연결된 파일 1건/);assert.doesNotMatch(html,/unrelated\.txt/);
});
