const API = 'https://script.google.com/a/macros/litpaxtechnology.com/s/AKfycbwMhuUYDdcEw_bgRsB5ykw3kwiucDFOv_QXWZFBgsj6U0y2vXcb4jkRTPHrbAj9RTEk9A/exec';
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
function doLogin(attempt) {
  attempt = attempt || 1;
  const u = document.getElementById('uname').value.trim();
  const p = document.getElementById('pword').value.trim();
  if (!u || !p) { showErr('Username aur password dono bharein'); return; }
  hideErr(); setLoad(true); window._done = false;

  const cbName = 'onLogin_' + Date.now();
  window[cbName] = function(res) {
    if (window._done) return;
    window._done = true;
    setLoad(false);
    delete window[cbName];
    if (res.success) {
      sessionStorage.setItem('erp_user', JSON.stringify(res.user));
      window.location.href = 'app.html';
    } else {
      showErr(res.message || 'Login failed');
    }
  };

  const s = document.createElement('script');
  s.src = `${API}?action=login&username=${encodeURIComponent(u)}&password=${encodeURIComponent(p)}&callback=${cbName}`;
  s.onerror = () => {
    if (window._done) return;
    if (attempt < 2) { s.remove(); doLogin(attempt + 1); return; }
    window._done = true; setLoad(false); delete window[cbName];
    showErr('Network error — dobara try karein');
  };
  document.body.appendChild(s);

  setTimeout(() => {
    if (window._done) return;
    if (attempt < 2) {
      // Cold start — chupchaap ek baar aur try karo
      s.remove();
      doLogin(attempt + 1);
    } else {
      window._done = true; setLoad(false); delete window[cbName];
      showErr('Timeout — please retry');
    }
  }, 15000);
}
