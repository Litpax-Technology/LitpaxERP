const API = 'https://script.google.com/macros/s/AKfycbwzkTFlKya4OGRzJRzowYjbIVI-NPvj12AylEUaweFBToiOM8U71QKUYAQpiBnVMl5SPA/exec';

document.getElementById('pword').addEventListener('keydown', e => {
  if (e.key === 'Enter') doLogin();
});
document.getElementById('uname').addEventListener('keydown', e => {
  if (e.key === 'Enter') document.getElementById('pword').focus();
});

function toggleEye() {
  const i = document.getElementById('pword');
  i.type = i.type === 'password' ? 'text' : 'password';
}

function setLoad(on) {
  document.getElementById('loginBtn').disabled = on;
  document.getElementById('spin').style.display = on ? 'block' : 'none';
  document.getElementById('btnTxt').textContent = on ? 'Signing in...' : 'Sign In →';
}

function showErr(m) {
  document.getElementById('errTxt').textContent = m;
  document.getElementById('errBox').classList.add('show');
}

function hideErr() {
  document.getElementById('errBox').classList.remove('show');
}

function doLogin() {
  const u = document.getElementById('uname').value.trim();
  const p = document.getElementById('pword').value.trim();
  if (!u || !p) { showErr('Username aur password dono bharein'); return; }
  hideErr(); setLoad(true); window._done = false;
  const s = document.createElement('script');
  s.src = `${API}?action=login&username=${encodeURIComponent(u)}&password=${encodeURIComponent(p)}&callback=onLogin`;
  s.onerror = () => { setLoad(false); showErr('Network error — dobara try karein'); };
  document.body.appendChild(s);
  setTimeout(() => {
    if (!window._done) { setLoad(false); showErr('Timeout — please retry'); }
  }, 12000);
}

function onLogin(res) {
  window._done = true; setLoad(false);
  if (res.success) {
    sessionStorage.setItem('erp_user', JSON.stringify(res.user));
    window.location.href = 'app.html';
  } else {
    showErr(res.message || 'Login failed');
  }
}
