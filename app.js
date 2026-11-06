'use strict';
const $ = selector => document.querySelector(selector);
const escapeHtml = value => String(value).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const shuffle = values => [...values].sort(() => Math.random() - .5);
const normalize = value => value.normalize('NFKC').trim().toLowerCase().replace(/[。.!！?？]+$/g, '').replace(/\s+/g, ' ');
let state, currentView = 'today', course = 'hiragana', lesson = null, session = null, composing = false, busy = false;
let retryPayload = null, graded = null, assisted = false, hintOpened = false;
const source = number => `https://www.irodori.jpf.go.jp/en/starter/audio/lesson0${number}.html`;

async function api(path, payload) { return window.studyStore.api(path, payload); }
function notice(message) { $('#notice').innerHTML = message ? `<div class="error">${escapeHtml(message)}</div>` : ''; }
function dueReviews() { return state.reviews.filter(r => Date.parse(r.due_at) <= Date.now()); }
function itemById(id) { return state.groups.flatMap(g => g.items).find(i => i.id === id); }
function savedSession() { try { return JSON.parse(localStorage.getItem('irodori-session')); } catch { return null; } }
function persistSession() { if(session) localStorage.setItem('irodori-session',JSON.stringify(session)); else localStorage.removeItem('irodori-session'); }
async function refresh() { state = await api('state'); $('#due-badge').textContent=dueReviews().length; }
function go(view) {
  if(busy) return;
  if(typeof stopDictation==='function')stopDictation();
  notice(''); currentView=view; lesson=null;history.replaceState(null,'','#'+view);
  document.querySelectorAll('.nav').forEach(el => el.classList.toggle('active',el.dataset.view===view));
  render(); window.scrollTo(0,0);
}
function button(label, action, css='primary') { return `<button class="${css}" data-action="${action}">${label}</button>`; }
function render() {
  if(currentView==='today') today();
  if(currentView==='library') library();
  if(currentView==='reviews') reviews();
  if(currentView==='progress') progress();
  if(currentView==='settings') settings();
  if(currentView==='writing') renderWriting();
}
function today() {
  const due=dueReviews().length;
  const learned=new Set(state.attempts.map(a=>a.item_id)).size;
  const resumed=savedSession();
  const heroAction=resumed?'resume':'start-first';
  $('#content').innerHTML=`<h1>Một chút tiếng Nhật, mỗi ngày.</h1><p class="subtitle">Không cần vội. Hôm nay, mình cùng tiến thêm một bước nhỏ.</p>
    <div class="hero"><div><span class="pill">LỘ TRÌNH NỀN TẢNG · NHẬP MÔN</span><h2>${resumed?'Tiếp tục buổi học của bạn':'Bắt đầu từ những âm đầu tiên'}</h2><p>Nhìn mặt chữ, hiểu cách đọc và tự gõ tiếng Nhật.<br>Học từng nhóm nhỏ, ôn lại để nhớ lâu hơn.</p>${button(resumed?'Tiếp tục học &nbsp; →':'Học nhóm nguyên âm &nbsp; →',heroAction)}</div><div class="hero-art" aria-hidden="true">あ<br>い う</div></div>
    <div class="stats"><div class="stat"><span class="label">CHỮ & TỪ ĐÃ LUYỆN</span><strong>${learned}</strong><small>theo lịch sử gần đây</small></div><div class="stat"><span class="label">LƯỢT CẦN ÔN</span><strong>${due}</strong><small>nhận diện và typing</small></div><div class="stat"><span class="label">LƯỢT ĐÃ LƯU</span><strong>${state.total}</strong><small>trong trình duyệt này</small></div></div>
    <div class="two-col"><div><div class="section-head"><h2>Nhịp học hôm nay</h2><small>45–60 PHÚT · TÙY SỨC CỦA BẠN</small></div><div class="panel"><div class="plan-row"><span class="step">01</span><div><h3>Đánh thức trí nhớ</h3><p>Ôn lại phần đến hạn và những chữ dễ nhầm.</p></div>${button('Ôn tập','review','ghost')}</div><div class="plan-row"><span class="step">02</span><div><h3>Học một nhóm nhỏ</h3><p>Kana hoặc một mẫu câu Irodori đầu tiên.</p></div>${button('Luyện viết','writing','ghost')}</div><div class="plan-row"><span class="step">03</span><div><h3>Tự nhớ và gõ lại</h3><p>Ẩn cách đọc, thử nhớ trước khi mở gợi ý.</p></div></div></div></div><div><div class="section-head"><h2>Tuần của bạn</h2>${button('Chọn lịch','settings','ghost')}</div><div class="panel"><div class="week">${['CN','T2','T3','T4','T5','T6','T7'].map((d,i)=>`<span class="day ${state.settings.days.includes(i)?'active':''}">${d}</span>`).join('')}</div><p class="small">Giờ học dự kiến <b>${escapeHtml(state.settings.time)}</b>, theo giờ trên máy. Bạn có thể đổi lịch bất cứ lúc nào.</p><div class="quote">「一歩ずつ」<br>Từng bước một, rồi bạn sẽ thấy mình đi xa.</div></div></div></div>`;
}
function library() {
  const groups=state.groups.filter(g=>g.course===course);
  $('#content').innerHTML=`<h1>Thư viện bài học</h1><p class="subtitle">Đi từ chữ cái đến những cuộc hội thoại đầu tiên. Bạn luôn được tự chọn bài.</p><div class="course-tabs">${[['hiragana','Hiragana'],['katakana','Katakana'],['irodori','Irodori Nhập môn']].map(([id,label])=>`<button data-course="${id}" class="${course===id?'active':''}">${label}</button>`).join('')}</div><div class="grid">${groups.map(g=>`<article class="lesson-card"><span class="eyebrow">${g.items.length} MỤC HỌC · ${g.course==='irodori'?'MẪU CÂU':'KANA'}</span><div class="kana-preview">${escapeHtml(g.items.slice(0,3).map(i=>i.ja).join(' '))}</div><h3>${escapeHtml(g.title)}</h3><p>${g.course==='irodori'?'Nội dung luyện tập do ứng dụng biên soạn. Có liên kết tài liệu Irodori để đối chiếu.':'Nhận diện · cách đọc · luyện gõ'}</p><button class="ghost" data-lesson="${g.id}">Mở bài học &nbsp; →</button></article>`).join('')}</div>`;
}
function openLesson(id) {
  lesson=state.groups.find(g=>g.id===id);
  $('#content').innerHTML=`<h1>${escapeHtml(lesson.title)}</h1><p class="subtitle">${escapeHtml(lesson.description)}</p><div class="panel"><span class="eyebrow">LÀM QUEN TRƯỚC KHI LUYỆN NHỚ</span><div class="learn-list">${lesson.items.map(i=>`<div class="learn-item"><div><strong>${escapeHtml(i.ja)}</strong><p>${escapeHtml(i.reading)} ${i.kind==='word'?'· '+escapeHtml(i.meaning):''}</p></div><button class="secondary" data-speak="${escapeHtml(i.ja)}">▶ Nghe</button></div>`).join('')}</div><div class="mode-select">${button('Luyện nhận diện','recognition')}${button('Luyện gõ bàn phím','typing','secondary')}${button('Viết bằng chuột như Paint','writing','secondary')}</div><p class="small">Typing dùng Japanese IME, chế độ Romaji. Ví dụ gõ <b>a</b> → <b>あ</b>, xác nhận chữ bằng Enter, sau đó bấm Nộp. Giọng đọc nút Nghe phụ thuộc giọng tiếng Nhật cài trên trình duyệt.</p><p class="small">Nguồn tham khảo <a target="_blank" rel="noopener" href="${source(lesson.id==='lesson-2'?2:1)}">Irodori · audio và bài học gốc ↗</a>. Các bài luyện trên app là bài tự biên soạn, đang chờ bạn dùng thử.</p></div>`;
}
function start(items) {
  session={queue:shuffle(items).slice(0,15),index:0,correct:0,started:Date.now()};persistSession();question();
}
function question() {
  notice(''); retryPayload=session?.pending??null; graded=session?.grade??null; assisted=session?.assisted??false; hintOpened=false;
  if(!session || session.index>=session.queue.length) return finish();
  const entry=session.queue[session.index], item=itemById(entry.id);
  if(!item){session=null;persistSession();return go('library');}
  const typing=entry.mode==='typing', expected=item.kind==='kana'?item.reading:item.meaning;
  const pool=state.groups.flatMap(g=>g.items).filter(i=>i.kind===item.kind).map(i=>i.kind==='kana'?i.reading:i.meaning);
  const choices=shuffle([expected,...shuffle([...new Set(pool)].filter(v=>v!==expected)).slice(0,3)]);
  $('#content').innerHTML=`<div class="study"><div class="study-top"><button class="back" data-action="today">← Về hôm nay</button><span>Câu ${session.index+1} / ${session.queue.length}</span></div><div class="bar"><div style="width:${session.index/session.queue.length*100}%"></div></div><div class="exercise"><span class="eyebrow">${typing?'TỰ NHỚ · JAPANESE IME':'NHẬN DIỆN · THỬ TRƯỚC KHI XEM GỢI Ý'}</span><p class="prompt">${typing?'Hãy gõ bằng chữ Nhật':'Chọn cách đọc hoặc nghĩa phù hợp'}</p><div class="japanese ${typing||item.kind==='word'?'word':''}">${escapeHtml(typing?(item.kind==='kana'?(item.input_hint??item.reading):item.meaning):item.ja)}</div>${typing?'<div class="answer-row"><input id="answer" aria-label="Đáp án tiếng Nhật" autocomplete="off" spellcheck="false" placeholder="Gõ bằng Japanese IME…"><button id="submit" class="primary" data-action="submit">Nộp đáp án</button></div>':`<div class="choices">${choices.map(c=>`<button class="choice" data-answer="${escapeHtml(c)}">${escapeHtml(c)}</button>`).join('')}</div>`}<div class="actions">${button('Cho tôi một gợi ý','hint','ghost')}<button class="ghost" data-speak="${escapeHtml(item.ja)}">▶ Nghe chữ / từ</button></div><div id="feedback" aria-live="polite"></div><div id="next-actions"></div></div><p class="small">${typing?'Enter trong lúc IME đang chọn chữ sẽ xác nhận chữ. Bấm Nộp khi đã sẵn sàng.':'Một câu đúng có trợ giúp được ghi riêng với tự nhớ độc lập.'}</p></div>`;
  $('#answer')?.focus();
  if(graded)explain('Kết quả lượt này đã được lưu.');
}
function hint() {
  if(busy)return;
  assisted=true;hintOpened=true;session.assisted=true;persistSession();
  const item=itemById(session.queue[session.index].id),typing=session.queue[session.index].mode==='typing';
  $('#feedback').innerHTML=`<div class="feedback wrong">Gợi ý ${typing?'chữ đầu là <b>'+escapeHtml(item.ja[0])+'</b>':'cách đọc bắt đầu bằng <b>'+escapeHtml(item.reading.split(' ')[0][0])+'</b>'}. Hãy thử một lần nữa. ${button('Xem đáp án và giải thích','explain','ghost')}</div>`;
}
async function submit(answer, revealed=false) {
  if(busy || !session)return;
  if(composing) return;
  const entry=session.queue[session.index],item=itemById(entry.id);
  answer=answer??$('#answer')?.value??'';
  if(!answer.trim())return notice('Bạn hãy nhập hoặc chọn một đáp án.');
  if(graded) {
    const ok=(graded.accepted??[graded.expected]).some(value=>normalize(answer)===normalize(value));
    return explain(ok?'Bạn đã sửa đúng. Lượt đầu vẫn được giữ để chọn lần ôn phù hợp.':'Mình cùng xem lại cách đọc và đáp án nhé.');
  }
  busy=true;
  document.querySelectorAll('.choice,#submit').forEach(b=>b.disabled=true);
  retryPayload=retryPayload??{id:crypto.randomUUID(),item_id:item.id,mode:entry.mode,answer,assisted,revealed,revision:state.revision};
  session.pending=retryPayload;persistSession();
  localStorage.setItem('irodori-pending',JSON.stringify(retryPayload));
  try {
    graded=await api('attempt',retryPayload);
    localStorage.removeItem('irodori-pending');
    session.grade=graded;
    if(graded.correct&&!graded.assisted)session.correct+=1;
    persistSession();
    await refresh();
    if(graded.correct){explain(graded.assisted?'Đúng rồi. Lượt này có dùng trợ giúp.':'Đúng rồi! Bạn đã tự nhớ được.');}
    else if(graded.revealed)explain('Đã mở đáp án. Hãy đọc và thử nhớ lại sau.');
    else hint();
  } catch(error) { notice(error.message+' Giữ nguyên đáp án và bấm gửi lại để xác nhận lưu.'); }
  finally {busy=false;document.querySelectorAll('.choice,#submit').forEach(b=>b.disabled=false);if(graded&&!graded.correct&&!graded.revealed)hint();}
}
function explain(message='Cùng xem đáp án và luyện lại ở lần ôn tới.') {
  if(!graded)return;
  const item=itemById(session.queue[session.index].id);
  $('#feedback').innerHTML=`<div class="feedback ${graded.correct?'':'wrong'}"><b>${escapeHtml(message)}</b><br><span lang="ja">${escapeHtml(item.ja)}</span> · ${escapeHtml(item.reading)}${item.kind==='word'?' · '+escapeHtml(item.meaning):''}<br><span class="small">${graded.correct&&!graded.assisted?'Lần ôn kế tiếp: '+new Date(graded.due_at).toLocaleString('vi-VN'):'Nội dung sẽ được ưu tiên ôn lại. Bạn có thể tiếp tục học ngay.'}</span></div>`;
  $('#next-actions').innerHTML=`<div class="actions">${button('Tiếp tục &nbsp; →','next')}</div>`;
}
function finish() {
  const done=session;
  session=null;persistSession();
  $('#content').innerHTML=`<div class="study"><div class="exercise"><span class="eyebrow">THÊM MỘT BƯỚC NHỎ HÔM NAY</span><h1>Đã hoàn thành lượt luyện.</h1><p class="subtitle">${done?`${done.correct} / ${done.queue.length} câu tự trả lời đúng không trợ giúp.`:'Chọn một bài để bắt đầu.'}</p><div class="japanese">よくできました</div><p class="small">Kết quả đã lưu trong trình duyệt này.<br>Hãy quay lại sau vài ngày để kiểm tra khả năng nhớ.</p><div class="actions">${button('Về hôm nay','today')}${button('Chọn bài tiếp','library','secondary')}</div></div></div>`;
}
function reviews() {
  const due=dueReviews();
  $('#content').innerHTML=`<h1>Ôn để nhớ lâu hơn.</h1><a class="secondary" href="./kana-review.pdf" download>↓ Phiếu ôn Hiragana & Katakana (PDF)</a><p class="subtitle">Ôn theo từng chiều nhận diện và typing. Nếu hôm nay chỉ muốn củng cố, như vậy cũng đủ.</p><div class="panel"><h2>${due.length?due.length+' lượt đang chờ bạn':'Bạn đã bắt kịp lịch ôn'}</h2><p class="small">Lịch ôn thử nghiệm dùng các mốc 1, 3, 7, 14 và 30 ngày. Câu sai hoặc có trợ giúp quay lại sớm hơn. Đây là lịch đơn giản của bản dùng thử.</p>${due.length?button('Bắt đầu ôn · tối đa 15 câu','start-review'):button('Học hoặc luyện thêm','library')}<div class="learn-list">${due.slice(0,12).map(r=>{const i=itemById(r.item_id);return i?`<div class="learn-item"><strong>${escapeHtml(i.ja)}</strong><span class="small">${r.mode==='typing'?'Tự gõ':'Nhận diện'}</span></div>`:'';}).join('')}</div></div>`;
}
function progress() {
  const total=state.attempts.length,correct=state.attempts.filter(a=>a.correct&&!a.assisted).length;
  const weak={};state.attempts.filter(a=>!a.correct).forEach(a=>weak[a.item_id]=(weak[a.item_id]||0)+1);
  $('#content').innerHTML=`<h1>Nhìn lại những bước đã đi.</h1><p class="subtitle">Theo dõi bằng câu trả lời thực tế. Cần nhiều lần ôn ở những ngày khác nhau để biết bạn nhớ được bao lâu.</p><div class="stats"><div class="stat"><span class="label">LƯỢT ĐÃ LƯU TOÀN BỘ</span><strong>${state.total}</strong></div><div class="stat"><span class="label">ĐÚNG KHÔNG TRỢ GIÚP</span><strong>${correct}</strong><small>trong ${total} lượt gần nhất</small></div><div class="stat"><span class="label">ĐẾN HẠN ÔN</span><strong>${dueReviews().length}</strong></div></div><div class="two-col"><div class="panel"><h2>Lịch sử gần đây</h2>${total?`<table class="history"><thead><tr><th>Chữ / từ</th><th>Hoạt động</th><th>Kết quả</th></tr></thead><tbody>${state.attempts.slice(0,20).map(a=>`<tr><td>${escapeHtml(itemById(a.item_id)?.ja??a.item_id)}</td><td>${a.mode==='typing'?'Typing':'Nhận diện'}</td><td>${a.revealed?'Đã xem đáp án':(a.correct?(a.assisted?'Đúng · có hỗ trợ':'Đúng'):'Cần ôn')}</td></tr>`).join('')}</tbody></table>`:'<p class="empty">Lượt luyện đầu tiên sẽ xuất hiện ở đây.</p>'}</div><div class="panel"><h2>Chỗ dễ nhầm</h2>${Object.entries(weak).sort((a,b)=>b[1]-a[1]).slice(0,8).map(([id,n])=>`<div class="learn-item"><strong>${escapeHtml(itemById(id)?.ja??id)}</strong><span class="small">${n} lượt cần ôn</span></div>`).join('')||'<p class="small">Bạn sẽ thấy những lỗi thường gặp khi có thêm lượt học.</p>'}</div></div>`;
}
function settings() {
  $('#content').innerHTML=`<h1>Góc cá nhân</h1><p class="subtitle">Lịch học và bản sao dữ liệu của bạn.</p><div class="panel"><div class="setting-row"><h3>Lịch tuần này</h3>${['Chủ nhật','Thứ hai','Thứ ba','Thứ tư','Thứ năm','Thứ sáu','Thứ bảy'].map((d,i)=>`<label><input type="checkbox" name="day" value="${i}" ${state.settings.days.includes(i)?'checked':''}>${d}</label>`).join('')}<div><label>Giờ học <input id="time" type="time" value="${escapeHtml(state.settings.time)}"></label>${button('Lưu lịch','save-settings')}</div></div><div class="setting-row"><h3>Giữ dữ liệu học tập</h3><p class="small">Tiến độ và bài viết lưu riêng trong trình duyệt này. Các thiết bị chưa tự đồng bộ. Xóa dữ liệu trang web có thể làm mất bài học đã lưu. Hãy xuất bản sao mỗi 3–7 ngày và trước khi đổi máy.</p><div class="actions"><button class="secondary" id="export-data">Xuất bản sao JSON</button><label class="secondary">Nhập bản sao JSON<input id="import-data" type="file" accept="application/json,.json" style="display:block;max-width:100%"></label></div><p class="small">Nhập dữ liệu sẽ gộp lượt học và bài viết theo ID; giữ nguyên lịch học hiện tại. Không tải dữ liệu lên GitHub.</p></div><div class="setting-row"><h3>Gia sư Hermes</h3><p class="small">Bản Pages hiện học độc lập; chưa tự gửi kết quả cho Hermes. Không cần API AI để luyện chữ và ôn tập.</p></div></div>`;
  $('#export-data').onclick=async()=>{try{const data=await studyStore.exportData();const url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='irodori-progress-'+new Date().toISOString().slice(0,10)+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),10000);notice('Đã xuất bản sao gồm tiến độ và bài viết đã lưu.');}catch(e){notice(e.message);}};
  $('#import-data').onchange=async event=>{try{const file=event.target.files[0];if(!file)return;if(file.size>30*1024*1024)throw Error('File vượt giới hạn 30 MB.');const result=await studyStore.importData(JSON.parse(await file.text()));await refresh();settings();notice(`Đã gộp ${result.attempts} lượt học và ${result.handwriting} bài viết từ bản sao.`);}catch(e){notice('Chưa nhập dữ liệu: '+e.message);}};
}

function speak(text) {
  if(session&&!graded){assisted=true;session.assisted=true;persistSession();}
  const voice=speechSynthesis.getVoices().find(v=>v.lang.startsWith('ja'));
  if(!voice)return notice('Máy chưa có giọng đọc tiếng Nhật. Mở audio Irodori trong trang bài học để nghe.');
  speechSynthesis.cancel();const utterance=new SpeechSynthesisUtterance(text);utterance.voice=voice;utterance.lang='ja-JP';utterance.rate=.8;speechSynthesis.speak(utterance);
}
document.addEventListener('compositionstart',()=>composing=true);
document.addEventListener('compositionend',()=>composing=false);
document.addEventListener('keydown',event=>{if(event.key==='Enter'&&event.target.id==='answer'&&!event.isComposing&&!composing&&event.keyCode!==229)submit();});
document.addEventListener('click',async event=>{
  const el=event.target.closest('button,a');if(!el||busy)return;
  if(el.dataset.view)return go(el.dataset.view);
  if(el.dataset.course){course=el.dataset.course;return library();}
  if(el.dataset.lesson)return openLesson(el.dataset.lesson);
  if(el.dataset.speak)return speak(el.dataset.speak);
  if(el.dataset.answer)return submit(el.dataset.answer);
  const action=el.dataset.action;
  if(['today','library','progress','settings','writing'].includes(action))return go(action);
  if(action==='review')return go('reviews');
  if(action==='start-first')return openLesson('hiragana-0');
  if(action==='recognition'||action==='typing')return start(lesson.items.map(i=>({id:i.id,mode:action})));
  if(action==='start-review')return start(dueReviews().map(r=>({id:r.item_id,mode:r.mode})));
  if(action==='resume'){session=savedSession();return question();}
  if(action==='submit')return submit();
  if(action==='hint')return hint();
  if(action==='explain'){
    if(graded)return explain();
    assisted=true;
    const entry=session.queue[session.index],item=itemById(entry.id);
    return submit(entry.mode==='typing'?item.ja:(item.kind==='kana'?item.reading:item.meaning),true);
  }
  if(action==='next'){session.index+=1;session.grade=null;session.pending=null;session.assisted=false;persistSession();return question();}
  if(action==='save-settings')try{await api('settings',{days:[...document.querySelectorAll('[name=day]:checked')].map(e=>Number(e.value)),time:$('#time').value});await refresh();notice('Đã lưu lịch học.');}catch(e){notice(e.message);}

});
async function boot(){
  $('#date').textContent=new Date().toLocaleDateString('vi-VN',{weekday:'long',day:'numeric',month:'long'});
  $('#content').innerHTML='<p class="loading">Đang mở góc học của bạn…</p>';
  try{
    await refresh();
    const pending=localStorage.getItem('irodori-pending');
    if(pending){const result=await api('attempt',JSON.parse(pending));const resumed=savedSession();if(resumed?.pending?.id===JSON.parse(pending).id&&!resumed.grade){resumed.grade=result;if(result.correct&&!result.assisted)resumed.correct+=1;localStorage.setItem('irodori-session',JSON.stringify(resumed));}localStorage.removeItem('irodori-pending');await refresh();}
    const requested=location.hash.slice(1);
    go(['today','library','reviews','progress','settings','writing'].includes(requested)?requested:'today');
  }catch(e){notice(e.message);$('#content').innerHTML='<p class="empty">Chưa mở được dữ liệu. Kiểm tra kết nối khi mở lần đầu và cho phép trình duyệt lưu dữ liệu.</p>';}
}
boot();
