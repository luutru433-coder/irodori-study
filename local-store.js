'use strict';
// Browser-only persistence. One IndexedDB transaction makes each update atomic.
window.studyStore=(()=>{
  let contentPromise,manifestPromise,dbPromise;
  const empty=()=>({schema_version:1,attempts:[],reviews:[],handwriting:[],settings:{days:[1,2,3,4,5],time:'20:30'}});
  const content=()=>contentPromise??=fetch('./content.json').then(r=>{if(!r.ok)throw Error('Chưa tải được bài học.');return r.json();});
  const manifest=()=>manifestPromise??=fetch('./writing-manifest.json').then(r=>{if(!r.ok)throw Error('Chưa tải được hướng dẫn viết.');return r.json();});
  function db(){return dbPromise??=new Promise((resolve,reject)=>{const r=indexedDB.open('irodori-study-pages',1);r.onupgradeneeded=()=>r.result.createObjectStore('state');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(Error('Trình duyệt không cho phép lưu dữ liệu.'));});}
  async function transaction(fn,write=false){const database=await db();return new Promise((resolve,reject)=>{const tx=database.transaction('state',write?'readwrite':'readonly'),store=tx.objectStore('state'),req=store.get('learner');let result,error;req.onsuccess=()=>{try{const data=req.result??empty();result=fn(data);if(write)store.put(data,'learner');}catch(e){error=e;tx.abort();}};tx.oncomplete=()=>resolve(result);tx.onabort=tx.onerror=()=>reject(error??Error('Chưa lưu được dữ liệu. Bộ nhớ có thể đã đầy.'));});}
  const clone=v=>JSON.parse(JSON.stringify(v));
  const canonical=v=>JSON.stringify(v, Object.keys(v).sort());
  const uuid=v=>typeof v==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
  const norm=v=>v.normalize('NFKC').trim().toLowerCase().replace(/[。.!！?？]+$/g,'').replace(/\s+/g,' ');
  function validStrokes(strokes){let n=0;if(!Array.isArray(strokes)||strokes.length>400)throw Error('Nét viết không hợp lệ.');for(const s of strokes){if(!['#20352d','#c94d45'].includes(s.color)||typeof s.erase!=='boolean'||!Number.isFinite(s.width)||s.width<1||s.width>30||!Array.isArray(s.points)||!s.points.length)throw Error('Nét viết không hợp lệ.');n+=s.points.length;for(const p of s.points)if(!Array.isArray(p)||p.length!==2||p.some(x=>!Number.isFinite(x)||x<0||x>600))throw Error('Tọa độ nét viết không hợp lệ.');}if(n>25000)throw Error('Bài viết quá nhiều điểm.');}
  function grade(p,item,old){
    const expected=p.mode==='typing'?item.ja:item.kind==='kana'?item.reading:item.meaning;
    const accepted=[expected,...(p.mode==='recognition'?item.aliases:[])];
    if(p.mode==='typing'&&['lesson-2-2','lesson-2-3'].includes(item.id))accepted.push(expected.replace('、',''),item.id==='lesson-2-2'?'もういちどおねがいします':'ゆっくりおねがいします');
    const revealed=p.revealed??false,assisted=p.assisted||revealed;
    const correct=!revealed&&accepted.some(v=>norm(v)===norm(p.answer));
    const independent=!old||Date.parse(old.due_at)<=Date.now();
    const stage=correct&&!assisted?(independent?Math.min((old?.stage??0)+1,5):old.stage):0;
    const due_at=correct&&!assisted?(independent?new Date(Date.now()+[0,1,3,7,14,30][stage]*86400000).toISOString():old.due_at):new Date(Date.now()+600000).toISOString();
    return {correct,expected,accepted,revealed,assisted,stage,due_at};
  }
  async function api(path,payload){
    const c=await content();const items=Object.fromEntries(c.groups.flatMap(g=>g.items).map(i=>[i.id,i]));
    if(path==='state')return transaction(d=>({...c,attempts:clone([...d.attempts].sort((a,b)=>b.created_at.localeCompare(a.created_at)).slice(0,1000)),reviews:clone(d.reviews),settings:clone(d.settings),total:d.attempts.length}));
    if(path==='writing-manifest')return manifest();
    if(path.startsWith('writing?')){const char=new URLSearchParams(path.split('?')[1]).get('char');return transaction(d=>clone(d.handwriting.filter(w=>w.character===char).sort((a,b)=>b.created_at.localeCompare(a.created_at)).slice(0,10)));}
    if(path==='settings'){if(!Array.isArray(payload.days)||payload.days.some(d=>!Number.isInteger(d)||d<0||d>6)||!/^([01]\d|2[0-3]):[0-5]\d$/.test(payload.time))throw Error('Lịch không hợp lệ.');return transaction(d=>(d.settings=clone(payload)),true);}
    if(path==='attempt'){
      const p=clone(payload),item=items[p.item_id];
      if(!uuid(p.id)||!item||!['typing','recognition'].includes(p.mode)||typeof p.answer!=='string'||p.answer.length>2000||typeof p.assisted!=='boolean'||(p.revealed!==undefined&&typeof p.revealed!=='boolean')||p.revision!==c.revision)throw Error('Lượt học không hợp lệ hoặc nội dung đã đổi. Hãy tải lại trang.');
      return transaction(d=>{const old=d.attempts.find(a=>a.id===p.id);if(old){if(old.payload&&canonical(old.payload)!==canonical(p))throw Error('ID lượt học đã có dữ liệu khác.');return clone(old.result);}
        const previous=d.reviews.find(r=>r.item_id===p.item_id&&r.mode===p.mode),result=grade(p,item,previous);
        d.attempts.push({...p,payload:p,correct:result.correct,assisted:result.assisted,revealed:result.revealed,created_at:new Date().toISOString(),result});
        d.reviews=d.reviews.filter(r=>r.item_id!==p.item_id||r.mode!==p.mode);d.reviews.push({item_id:p.item_id,mode:p.mode,stage:result.stage,due_at:result.due_at});return clone(result);
      },true);
    }
    if(path==='writing'){const m=await manifest(),p=clone(payload);if(!uuid(p.id)||!m.segments.some(s=>s.char===p.character)||p.worksheet_hash!==m.worksheet_sha256)throw Error('Bài viết không hợp lệ.');validStrokes(p.strokes);return transaction(d=>{const old=d.handwriting.find(w=>w.id===p.id);if(old){if(old.character!==p.character||JSON.stringify(old.strokes)!==JSON.stringify(p.strokes))throw Error('ID bài viết đã có dữ liệu khác.');return {saved_at:old.created_at};}const created_at=new Date().toISOString();d.handwriting.push({...p,created_at});return {saved_at:created_at};},true);}
    throw Error('Chức năng chưa được hỗ trợ trên Pages.');
  }
  async function exportData(){return transaction(d=>({...clone(d),format:'irodori-pages',exported_at:new Date().toISOString()}));}
  async function importData(raw){
    const c=await content(),ids=new Set(c.groups.flatMap(g=>g.items).map(i=>i.id));
    if(!raw||raw.format!=='irodori-pages'||raw.schema_version!==1||!Array.isArray(raw.attempts)||!Array.isArray(raw.handwriting)||raw.attempts.length>100000||raw.handwriting.length>10000)throw Error('Cần bản sao JSON của Irodori Pages phiên bản 1.');
    const incoming=clone(raw);
    for(const a of incoming.attempts){const r=a.result;if(!uuid(a.id)||!ids.has(a.item_id)||!['typing','recognition'].includes(a.mode)||typeof a.answer!=='string'||typeof a.correct!=='boolean'||typeof a.assisted!=='boolean'||!Number.isFinite(Date.parse(a.created_at))||!r||typeof r.correct!=='boolean'||typeof r.expected!=='string'||!Array.isArray(r.accepted)||r.accepted.some(v=>typeof v!=='string')||!Number.isInteger(r.stage)||r.stage<0||r.stage>5||!Number.isFinite(Date.parse(r.due_at)))throw Error('Bản sao chứa lượt học không hợp lệ.');}
    for(const w of incoming.handwriting){if(!uuid(w.id)||typeof w.character!=='string'||w.character.length!==1||!Number.isFinite(Date.parse(w.created_at)))throw Error('Bản sao chứa bài viết không hợp lệ.');validStrokes(w.strokes);}
    return transaction(d=>{
      for(const table of ['attempts','handwriting']){const existing=new Map(d[table].map(v=>[v.id,v]));for(const v of incoming[table]){if(existing.has(v.id)){if(JSON.stringify(existing.get(v.id))!==JSON.stringify(v))throw Error('Bản sao có ID trùng nhưng nội dung khác. Dữ liệu hiện tại được giữ nguyên.');}else{d[table].push(v);existing.set(v.id,v);}}}
      const latest=new Map();for(const a of [...d.attempts].sort((a,b)=>a.created_at.localeCompare(b.created_at)))latest.set(a.item_id+'|'+a.mode,{item_id:a.item_id,mode:a.mode,stage:a.result.stage,due_at:a.result.due_at});d.reviews=[...latest.values()];
      return {attempts:incoming.attempts.length,handwriting:incoming.handwriting.length};
    },true);
  }
  return {api,exportData,importData};
})();
