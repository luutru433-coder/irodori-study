'use strict';
let writingManifest = null;
let writingIndex = 0;
let writingStrokes = [];
let activeStroke = null;
let writingPen = {color:'#20352d',width:5,erase:false};
let writingSaveId = null;
let writingTimer = null;
let writingAudio = null;
let writingCountdown = null;
let writingGeneration = 0;
let dictationRunning = false;

function writingReading(char) {
  const item=state.groups.filter(g=>g.course==='hiragana').flatMap(g=>g.items).find(i=>i.ja===char);
  return (item?.reading??'').toUpperCase();
}
function stopDictation() {
  dictationRunning=false;
  if(writingTimer) clearTimeout(writingTimer);
  if(writingCountdown) clearInterval(writingCountdown);
  writingTimer = writingCountdown = null;
  if(writingAudio){writingAudio.pause();writingAudio.onended=null;}
}
function writingDraft() {
  writingSaveId=null;
  try { localStorage.setItem('irodori-writing-'+writingManifest.segments[writingIndex].char, JSON.stringify(writingStrokes)); }
  catch { notice('Bộ nhớ nháp của trình duyệt đã đầy. Bấm Lưu bài viết để giữ bài trong trình duyệt.'); }
  $('#writing-save-status').textContent='Bản nháp trên trình duyệt · bấm Lưu bài viết để giữ lâu dài';
}
async function renderWriting() {
  stopDictation();
  $('#content').innerHTML='<p class="loading">Đang mở góc luyện viết…</p>';
  try {
    writingManifest=writingManifest??await api('writing-manifest');
    if(currentView!=='writing')return;
    $('#content').innerHTML=`<h1>Nghe âm. Nhớ chữ. Viết lại.</h1><p class="subtitle">Xem thứ tự nét, nghe cách đọc rồi luyện bằng chuột. Hai ô tô theo mẫu và hai ô trống để tự viết.</p>
      <div class="writing-controls panel"><label>Chữ Hiragana <select id="writing-char" aria-label="Chọn chữ Hiragana">${writingManifest.segments.map((s,i)=>`<option value="${i}" ${i===writingIndex?'selected':''}>${i+1}. ${s.char} — ${writingReading(s.char)}</option>`).join('')}</select></label><button class="secondary" id="writing-prev">← Chữ trước</button><button class="secondary" id="writing-next">Chữ tiếp →</button><button class="primary" id="writing-listen">▶ Nghe chữ này</button><label><input type="checkbox" id="writing-show" checked>Hiện hướng dẫn nét</label></div>
      <div class="writing-layout"><div class="panel writing-reference"><div class="section-head"><h2>Thứ tự nét viết</h2><span class="small" id="writing-page-label"></span></div><div class="writing-pronunciation"><span id="writing-letter" lang="ja"></span><div><small>CÁCH ĐỌC</small><strong id="writing-reading"></strong></div></div><img id="writing-template" alt="Hướng dẫn từng nét viết theo thứ tự đánh số"><p class="small">Nét đỏ là nét mới ở bước đó. Mẫu chuyển thể từ <a href="https://kanjivg.tagaini.net/" target="_blank" rel="noopener">KanjiVG</a> · <a href="https://creativecommons.org/licenses/by-sa/3.0/" target="_blank" rel="noopener">CC BY-SA 3.0</a>.</p><div id="writing-hidden" hidden>Đã ẩn mẫu. Nghe âm và tự nhớ mặt chữ.</div></div>
      <div class="panel writing-pad"><div class="section-head"><h2>Khung viết của bạn</h2><span class="small">2 ô tô theo · 2 ô tự viết</span></div><div class="paint-tools"><button class="secondary" id="writing-pen">Bút</button><button class="secondary" id="writing-eraser">Tẩy</button><label>Cỡ bút <input id="writing-width" type="range" min="2" max="14" value="${writingPen.width}"></label><select id="writing-color" aria-label="Màu bút"><option value="#20352d">Mực đen</option><option value="#c94d45">Mực đỏ</option></select><button class="secondary" id="writing-undo">↶ Hoàn tác</button><button class="secondary" id="writing-clear">Xóa nét</button></div><div class="paint-board"><div class="paint-ghost" id="writing-ghosts"></div><canvas id="writing-canvas" width="600" height="600" aria-label="Khung viết Hiragana bằng chuột"></canvas></div><p class="small" id="writing-save-status">Nét viết được giữ làm bản nháp trên trình duyệt.</p><div class="actions"><button class="primary" id="writing-save">Lưu bài viết</button><button class="secondary" id="writing-png">Tải ảnh PNG</button></div><div id="writing-history" class="small"></div></div></div>
      <div class="panel writing-audio"><h2>Audio nghe rồi viết</h2><p class="small">46 chữ Hiragana theo thứ tự bảng chữ. File tải về có khoảng nghỉ 10 giây sau mỗi chữ, dài khoảng 8 phút. Bạn có thể dừng audio bất cứ lúc nào để viết chậm hơn.</p><audio id="writing-track" controls preload="metadata" src="./media/hiragana-dictation-10s.mp3"></audio><div class="actions"><a class="secondary" download="Hiragana-nghe-viet-10-giay.mp3" href="./media/hiragana-dictation-10s.mp3">↓ Tải file audio MP3</a><label>Khoảng nghỉ trong app <select id="writing-pause"><option value="5">5 giây</option><option value="10" selected>10 giây</option><option value="15">15 giây</option></select></label><button class="primary" id="writing-auto">▶ Luyện từ chữ đang chọn</button><button class="secondary" id="writing-stop">Dừng</button></div><p id="writing-audio-status" class="small" aria-live="polite">Nghe một chữ, viết vào ô, rồi chuyển chữ tiếp theo.</p><p class="small">Giọng đọc gốc của The Japan Foundation, Irodori Nhập môn 01-30. Bản luyện viết được thêm khoảng nghỉ phục vụ học miễn phí cùng Irodori. <a href="https://www.irodori.jpf.go.jp/en/starter/audio/lesson01.html" target="_blank" rel="noopener">Nguồn audio ↗</a></p></div>`;
    bindWriting();
    await selectWriting(writingIndex);
  }catch(error){notice(error.message);}
}
function redrawWriting() {
  const canvas=$('#writing-canvas'); if(!canvas)return;
  const context=canvas.getContext('2d');context.clearRect(0,0,600,600);
  for(const stroke of [...writingStrokes,...(activeStroke?[activeStroke]:[])]) {
    context.globalCompositeOperation=stroke.erase?'destination-out':'source-over';
    context.strokeStyle=stroke.color;context.fillStyle=stroke.color;context.lineWidth=stroke.width;
    context.lineCap='round';context.lineJoin='round';
    if(stroke.points.length===1){context.beginPath();context.arc(stroke.points[0][0],stroke.points[0][1],stroke.width/2,0,Math.PI*2);context.fill();continue;}
    context.beginPath();stroke.points.forEach(([x,y],i)=>i?context.lineTo(x,y):context.moveTo(x,y));context.stroke();
  }
  context.globalCompositeOperation='source-over';
}
function canvasPoint(event) {
  const rect=$('#writing-canvas').getBoundingClientRect();
  return [Math.max(0,Math.min(600,(event.clientX-rect.left)*600/rect.width)),Math.max(0,Math.min(600,(event.clientY-rect.top)*600/rect.height))];
}
async function selectWriting(index) {
  const generation=++writingGeneration;
  writingIndex=Math.max(0,Math.min(45,index));writingSaveId=null;activeStroke=null;
  const segment=writingManifest.segments[writingIndex];
  $('#writing-char').value=String(writingIndex);
  $('#writing-template').src=`./media/guide-${String(segment.page).padStart(2,'0')}.svg`;
  $('#writing-page-label').textContent=`Chữ ${segment.page} / 46`;
  $('#writing-letter').textContent=segment.char;
  $('#writing-reading').textContent=writingReading(segment.char);
  $('#writing-ghosts').innerHTML=Array.from({length:4},(_,i)=>`<span><small>${i<2?'Tô theo mẫu':'Tự viết'}</small>${i<2?segment.char:''}</span>`).join('');
  writingStrokes=[];
  let draft=null;
  try{draft=JSON.parse(localStorage.getItem('irodori-writing-'+segment.char));}catch{}
  if(Array.isArray(draft))writingStrokes=draft;
  redrawWriting();
  $('#writing-save-status').textContent='Đang kiểm tra bài viết đã lưu…';
  try {
    const history=await api('writing?char='+encodeURIComponent(segment.char));
    if(generation!==writingGeneration||currentView!=='writing')return;
    if(!draft&&history.length){writingStrokes=history[0].strokes;redrawWriting();}
    $('#writing-history').textContent=history.length?`Có ${history.length} bài viết gần nhất. Lần lưu gần nhất ${new Date(history[0].created_at).toLocaleString('vi-VN')}.`:'';
    $('#writing-save-status').textContent=draft?'Đã mở bản nháp trên trình duyệt.':history.length?'Đã mở bài viết gần nhất.':'Bắt đầu viết bằng chuột vào khung bên trên.';
  }catch(error){if(generation===writingGeneration)notice(error.message);}
}
function bindWriting() {
  const canvas=$('#writing-canvas');
  $('#writing-track').onplay=stopDictation;
  canvas.addEventListener('pointerdown',event=>{
    if(event.button!==0||activeStroke)return;
    if(writingStrokes.length>=400)return notice('Bài viết đã nhiều nét. Hãy lưu và chuyển sang chữ tiếp.');
    event.preventDefault();canvas.setPointerCapture(event.pointerId);
    activeStroke={...writingPen,points:[canvasPoint(event)]};redrawWriting();
  });
  canvas.addEventListener('pointermove',event=>{
    if(!activeStroke)return;
    const point=canvasPoint(event),last=activeStroke.points.at(-1);
    if(Math.hypot(point[0]-last[0],point[1]-last[1])>=1.5){activeStroke.points.push(point);redrawWriting();}
  });
  const finishStroke=()=>{if(activeStroke){writingStrokes.push(activeStroke);activeStroke=null;redrawWriting();writingDraft();}};
  canvas.addEventListener('pointerup',finishStroke);canvas.addEventListener('pointercancel',finishStroke);
  $('#writing-char').onchange=()=>{stopDictation();selectWriting(Number($('#writing-char').value));};
  $('#writing-prev').onclick=()=>{stopDictation();selectWriting(writingIndex-1);};
  $('#writing-next').onclick=()=>{stopDictation();selectWriting(writingIndex+1);};
  $('#writing-pen').onclick=()=>{writingPen.erase=false;canvas.style.cursor='crosshair';};
  $('#writing-eraser').onclick=()=>{writingPen.erase=true;canvas.style.cursor='cell';};
  $('#writing-width').oninput=()=>writingPen.width=Number($('#writing-width').value);
  $('#writing-color').onchange=()=>writingPen.color=$('#writing-color').value;
  $('#writing-undo').onclick=()=>{writingStrokes.pop();redrawWriting();writingDraft();};
  $('#writing-clear').onclick=()=>{writingStrokes=[];redrawWriting();writingDraft();};
  $('#writing-show').onchange=()=>{const show=$('#writing-show').checked;$('#writing-template').hidden=!show;$('#writing-hidden').hidden=show;};
  $('#writing-listen').onclick=()=>{stopDictation();playWritingClip();};
  $('#writing-save').onclick=saveWriting;
  $('#writing-png').onclick=downloadWriting;
  $('#writing-auto').onclick=()=>{stopDictation();dictationRunning=true;advanceDictation();};
  $('#writing-stop').onclick=()=>{stopDictation();$('#writing-audio-status').textContent='Đã dừng. Bạn có thể viết tiếp hoặc nghe lại chữ đang chọn.';};
}
function playWritingClip() {
  const segment=writingManifest.segments[writingIndex];
  $('#writing-track')?.pause();
  writingAudio=new Audio('./media/'+segment.file);
  writingAudio.play().catch(()=>notice('Chưa phát được audio. Hãy bấm Nghe để thử lại.'));
  return writingAudio;
}
function advanceDictation() {
  if(currentView!=='writing'||!dictationRunning)return stopDictation();
  $('#writing-audio-status').textContent=`Đang đọc chữ thứ ${writingIndex+1} / 46…`;
  const clip=playWritingClip();
  clip.onended=()=>{
    if(!dictationRunning)return;
    let remaining=Number($('#writing-pause').value);
    const tick=()=>$('#writing-audio-status').textContent=`Thời gian viết còn ${remaining} giây. Có thể bấm Dừng để viết thêm.`;
    tick();writingCountdown=setInterval(()=>{remaining-=1;tick();},1000);
    writingTimer=setTimeout(async()=>{
      clearInterval(writingCountdown);writingCountdown=null;
      if(writingIndex===45){stopDictation();$('#writing-audio-status').textContent='Bạn đã đi hết 46 chữ. Có thể chọn lại chữ muốn luyện.';return;}
      await selectWriting(writingIndex+1);if(dictationRunning)advanceDictation();
    },remaining*1000);
  };
}
async function saveWriting() {
  if(!writingStrokes.some(stroke=>!stroke.erase))return notice('Hãy viết ít nhất một nét bút trước khi lưu.');
  const segment=writingManifest.segments[writingIndex];
  const strokes=JSON.parse(JSON.stringify(writingStrokes));
  writingSaveId=writingSaveId??crypto.randomUUID();
  const payload={id:writingSaveId,character:segment.char,worksheet_hash:writingManifest.worksheet_sha256,strokes};
  $('#writing-save').disabled=true;
  try {
    const result=await api('writing',payload);
    if(currentView==='writing'&&writingManifest.segments[writingIndex].char===segment.char){
      $('#writing-save-status').textContent=`Đã lưu bài viết ${segment.char} · ${new Date(result.saved_at).toLocaleString('vi-VN')}`;
    }
    notice('');
  }catch(error){notice(error.message+' Bản nháp vẫn còn trên trình duyệt.');}
  finally{if($('#writing-save'))$('#writing-save').disabled=false;}
}
function downloadWriting() {
  const output=document.createElement('canvas');output.width=output.height=600;
  const context=output.getContext('2d');context.fillStyle='#fff';context.fillRect(0,0,600,600);
  context.strokeStyle='#cfdbc8';context.lineWidth=1;
  for(let i=0;i<=600;i+=150){context.beginPath();context.moveTo(i,0);context.lineTo(i,600);context.stroke();context.beginPath();context.moveTo(0,i);context.lineTo(600,i);context.stroke();}
  {context.fillStyle='#b5c2aa';context.font='230px "Yu Gothic", Meiryo, sans-serif';context.textAlign='center';context.textBaseline='middle';for(const x of [150,450])context.fillText(writingManifest.segments[writingIndex].char,x,150);}
  context.drawImage($('#writing-canvas'),0,0);
  const link=document.createElement('a');link.download=`Hiragana-${writingIndex+1}.png`;link.href=output.toDataURL('image/png');link.click();
}
