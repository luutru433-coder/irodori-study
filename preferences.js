'use strict';
let installPrompt=null;
function updateThemeButton(){
  const dark=document.documentElement.dataset.theme==='dark';
  document.querySelector('#theme-toggle').textContent=dark?'☀ Giao diện sáng':'☾ Giao diện tối';
  document.querySelector('#theme-toggle').setAttribute('aria-pressed',String(dark));
  document.querySelector('#theme-color').content=dark?'#14221c':'#315d49';
}
document.querySelector('#theme-toggle').onclick=()=>{
  document.documentElement.dataset.theme=document.documentElement.dataset.theme==='dark'?'light':'dark';
  try{localStorage.setItem('irodori-theme',document.documentElement.dataset.theme);}catch{}
  updateThemeButton();
};
updateThemeButton();
window.addEventListener('beforeinstallprompt',event=>{event.preventDefault();installPrompt=event;});
document.querySelector('#install-app').onclick=async()=>{
  if(installPrompt){await installPrompt.prompt();await installPrompt.userChoice;installPrompt=null;return;}
  const localhost=['127.0.0.1','localhost'].includes(location.hostname);
  notice((localhost?'Đây là địa chỉ trên máy đang chạy app. Để dùng trên điện thoại, cần địa chỉ riêng tư truy cập được từ điện thoại. ':'')+'iPhone: Safari → Chia sẻ → Thêm vào màn hình chính. Android: Chrome → menu ⋮ → Cài đặt ứng dụng hoặc Thêm vào màn hình chính. Tiến độ được lưu riêng trên trình duyệt này. Hãy xuất bản sao định kỳ trong Góc cá nhân.');
};

if ('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js').catch(()=>{});
