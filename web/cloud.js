import { createClient } from '@supabase/supabase-js';
const url=__SUPABASE_URL__,key=__SUPABASE_KEY__;
const root=document.querySelector('#cloud-content'),notice=document.querySelector('#cloud-message');
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const db=url&&key?createClient(url,key,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:false,storageKey:'contractor-safety-auth'}}):null;
let user=null,company=null,members=[],sites=[],feedback=[],generation=0,busy=false;
const message=s=>{notice.textContent=s;};
function fail(error){
  if(error?.message?.includes('ACTIVE_SITE_LIMIT'))return '활성 현장은 최대 15개입니다.';
  if(error?.message?.includes('REVISION_CONFLICT'))return '다른 사용자가 변경했습니다. 목록을 새로고침하고 다시 시도하세요.';
  return '처리하지 못했습니다. 연결 상태와 계정 권한을 확인한 후 다시 시도하세요.';
}
function login(){root.innerHTML=`<h1>회사 계정 로그인</h1><p class="sub">관리자가 등록한 계정으로 로그인하세요. 소속과 현장 권한은 관리자가 별도로 배정합니다.</p><section class="panel"><form id="login"><label>이메일<input name="email" type="email" autocomplete="username" required maxlength="254"></label><label>비밀번호<input name="password" type="password" autocomplete="current-password" required maxlength="200"></label><button class="primary">로그인</button></form></section>`;}
function render(){
 const member=members.find(m=>m.company_id===company),owner=member?.role==='owner';
 root.innerHTML=`<div class="toolbar"><h1>회사·현장 기록</h1><button id="refresh">새로고침</button><button id="logout">로그아웃</button></div><label>회사<select id="company">${members.map(m=>`<option value="${esc(m.company_id)}" ${m.company_id===company?'selected':''}>${esc(m.companies.name)} · ${m.role==='owner'?'본사 관리자':m.role==='manager'?'현장 담당자':'조회 전용'}</option>`).join('')}</select></label>${!member?'<p class="panel">배정된 회사가 없습니다. 관리자에게 소속 등록을 요청하세요.</p>':`<p class="sub">${owner?'회사 전체 현장':'배정된 현장'} ${sites.length}개 · 서버 저장</p><div class="grid"><section class="panel"><h2>현장 관리</h2>${owner?'<form id="site"><label>현장명<input name="name" required maxlength="60"></label><button class="primary">현장 추가</button></form>':''}${sites.map(s=>`<div class="row"><span>${esc(s.name)}<small class="small"> ${s.active?'진행':'종료'}</small></span>${owner?`<button data-toggle="${esc(s.id)}">${s.active?'종료':'재개'}</button>`:''}</div>`).join('')||'<p>표시할 현장이 없습니다.</p>'}</section><section class="panel"><h2>현장 실증 의견</h2>${member.role!=='viewer'&&sites.some(s=>s.active)?`<form id="feedback"><label>현장<select name="site">${sites.filter(s=>s.active).map(s=>`<option value="${esc(s.id)}">${esc(s.name)}</option>`).join('')}</select></label><label>확인한 기능<input name="feature" required maxlength="100"></label><label>개선 방향<select name="decision"><option>유지</option><option>보완</option><option>보류</option><option>제외 검토</option></select></label><label>이유와 대안<textarea name="reason" required maxlength="2000"></textarea></label><button class="primary">서버에 저장</button></form>`:'<p>의견 작성은 진행 중인 현장에 배정된 담당자에게 제공됩니다.</p>'}${feedback.map(f=>`<article class="record"><b>${esc(sites.find(s=>s.id===f.site_id)?.name??'현장')} · ${esc(f.feature)}</b><span class="tag">${esc(f.decision)}</span><p>${esc(f.reason)}</p><small>${esc(new Date(f.created_at).toLocaleString('ko-KR'))}</small></article>`).join('')}</section></div>`}`;
}
async function load(){
 const ticket=++generation;
 const verified=await db.auth.getUser();
 if(ticket!==generation)return;
 if(verified.error||!verified.data.user){user=null;members=[];sites=[];feedback=[];company=null;login();return;}
 user=verified.data.user;
 const membership=await db.from('company_members').select('company_id,role,companies(name)').eq('user_id',user.id).eq('active',true);
 if(ticket!==generation)return;
 if(membership.error)throw membership.error;
 members=membership.data;
 if(!members.some(m=>m.company_id===company))company=members[0]?.company_id??null;
 if(!company){sites=[];feedback=[];render();return;}
 const [s,f]=await Promise.all([db.from('sites').select('*').eq('company_id',company).order('created_at'),db.from('pilot_feedback').select('*').eq('company_id',company).order('created_at',{ascending:false}).limit(100)]);
 if(ticket!==generation)return;
 if(s.error||f.error)throw s.error||f.error;
 sites=s.data;feedback=f.data;render();
}
async function run(work){if(busy)return;busy=true;message('처리 중…');root.querySelectorAll('button').forEach(b=>b.disabled=true);try{await work();}catch(e){message(fail(e));if(!root.querySelector('button'))root.innerHTML='<section class="panel"><p>회사 정보를 불러오지 못했습니다.</p><button id="refresh">다시 시도</button><button id="logout">로그아웃</button></section>';}finally{busy=false;if(notice.textContent==='처리 중…')message('');root.querySelectorAll('button').forEach(b=>b.disabled=false);}}
root.addEventListener('submit',e=>{e.preventDefault();const form=e.target,values=new FormData(form);run(async()=>{
 if(form.id==='login'){const result=await db.auth.signInWithPassword({email:values.get('email').trim(),password:values.get('password')});if(result.error){message('이메일 또는 비밀번호를 확인하세요.');return;}await load();message('로그인했습니다.');return;}
 let result;
 if(form.id==='site'){const name=values.get('name').trim();if(!name){message('현장명을 입력하세요.');return;}result=await db.from('sites').insert({company_id:company,name});}
 if(form.id==='feedback'){const feature=values.get('feature').trim(),reason=values.get('reason').trim();if(!feature||!reason){message('기능과 이유를 입력하세요.');return;}result=await db.from('pilot_feedback').insert({company_id:company,site_id:values.get('site'),feature,reason,decision:values.get('decision')});}
 if(result?.error)throw result.error;
 form.reset();await load();message('서버에 저장했습니다.');
 });});
root.addEventListener('click',e=>{const b=e.target.closest('button');if(!b||b.type==='submit'&&b.closest('form'))return;run(async()=>{
 if(b.id==='logout'){const {error}=await db.auth.signOut({scope:'local'});if(error)throw error;++generation;user=null;company=null;members=[];sites=[];feedback=[];login();message('이 기기에서 로그아웃했습니다.');return;}
 if(b.dataset.toggle){const s=sites.find(s=>s.id===b.dataset.toggle);const r=await db.from('sites').update({active:!s.active,revision:s.revision+1}).eq('id',s.id).eq('revision',s.revision).select('id');if(r.error)throw r.error;if(!r.data.length)throw new Error('REVISION_CONFLICT');}
 await load();message('최신 내용을 불러왔습니다.');
 });});
root.addEventListener('change',e=>{if(e.target.id==='company')run(async()=>{company=e.target.value;sites=[];feedback=[];root.innerHTML='<p>회사 자료를 불러오고 있습니다.</p>';await load();message('선택한 회사로 전환했습니다.');});});
if(!db){document.querySelector('#connection').textContent='연결 준비 중';root.innerHTML='<h1>회사 워크스페이스 준비 중</h1><section class="panel"><p>별도 DB 프로젝트와 계정 설정을 준비하고 있습니다. 연결 전에는 로그인이나 서버 저장을 제공하지 않습니다.</p><a href="/">기존 실증 화면 사용하기 →</a></section>';}
else{document.querySelector('#connection').textContent='회사 계정';db.auth.onAuthStateChange((event)=>{if(event==='SIGNED_OUT'){++generation;user=null;company=null;members=[];sites=[];feedback=[];login();}});run(load);}
