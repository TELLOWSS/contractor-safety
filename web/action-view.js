export const actionLabels={open:'진행 중',requested:'확인 요청',verified:'확인 완료'};
export const emptyFilters=()=>({site:'',status:'',query:'',overdue:false});
export function seoulDate(now=new Date()){
 const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(now);
 return ['year','month','day'].map(type=>parts.find(p=>p.type===type).value).join('-');
}
export const actionDate=a=>String(a.due_date).slice(0,10);
export const isOverdue=(a,today)=>a.status!=='verified'&&actionDate(a)<today;
export function filteredActions(state,filters=emptyFilters(),today=seoulDate()){
 const query=filters.query.trim().toLocaleLowerCase('ko-KR');
 return (state.actions??[]).filter(a=>(!filters.site||a.site_id===filters.site)&&(!filters.status||a.status===filters.status)&&(!filters.overdue||isOverdue(a,today))&&(!query||[a.title,a.assignee,a.note,a.evidence_note,state.sites.find(s=>s.id===a.site_id)?.name??''].some(value=>String(value??'').toLocaleLowerCase('ko-KR').includes(query))))
 .sort((a,b)=>actionDate(a).localeCompare(actionDate(b))||String(a.created_at).localeCompare(String(b.created_at))||a.id.localeCompare(b.id));
}
export function filterDescription(state,filters){
 return [filters.site?(state.sites.find(s=>s.id===filters.site)?.name??'선택 현장'):'전체 현장',filters.status?actionLabels[filters.status]:'전체 상태',filters.overdue?'기한 경과만':'기한 전체',filters.query.trim()?`검색: ${filters.query.trim()}`:'검색어 없음'].join(' / ');
}
export function renderReport(state,filters,esc,now=new Date()){
 const rows=filteredActions(state,filters,seoulDate(now));
 return `<div class="report-controls toolbar"><button id="close-report">목록으로 돌아가기</button><button id="print-report" class="primary">인쇄 / PDF 저장</button></div><article class="print-report"><h1>현장 개선조치대장</h1><p><b>${esc(state.member.name)}</b> · ${esc(state.actors[state.actor].label)} 조회 범위</p><p>출력 준비 시각: ${esc(now.toLocaleString('ko-KR',{timeZone:'Asia/Seoul'}))} (한국시간)</p><p>조회 조건: ${esc(filterDescription(state,filters))}</p><p>조회 결과 ${rows.length}건 · 현재 불러온 자료 기준</p><p class="small">개발용 기록입니다. 실제 증빙 파일, 법적 준수 판정 또는 서명·승인을 대신하지 않습니다.</p>${rows.length?`<table><thead><tr><th>현장 / 조치</th><th>담당 / 기한</th><th>상태 / 최근 기록</th></tr></thead><tbody>${rows.map(a=>`<tr><td>${esc(state.sites.find(s=>s.id===a.site_id)?.name??'현장')}<br><b>${esc(a.title)}</b></td><td>${esc(a.assignee)}<br>${esc(actionDate(a))}</td><td>${actionLabels[a.status]}${isOverdue(a,seoulDate(now))?' · 기한 경과':''}<br>${esc(a.note||'등록 후 조치 기록 없음')}</td></tr>`).join('')}</tbody></table><h2>조치별 증빙 메모와 변경 이력</h2>${rows.map(a=>`<section class="report-record"><h3>${esc(a.title)}</h3><p>증빙 메모: ${esc(a.evidence_note||'미등록')}</p><ol>${a.events.map(e=>`<li>${esc(new Date(e.at).toLocaleString('ko-KR',{timeZone:'Asia/Seoul'}))} · ${esc(Object.values(state.actors).find(u=>u.id===e.actor)?.label??'담당자')} · ${actionLabels[e.status]}<p>${esc(e.note)}</p>${e.evidence_note?`<p>당시 증빙 메모: ${esc(e.evidence_note)}</p>`:''}</li>`).join('')}</ol></section>`).join('')}`:'<p>조회 조건에 맞는 기록이 없습니다.</p>'}</article>`;
}
