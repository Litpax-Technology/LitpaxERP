// ============================================================
// MaterialProd — app.js
// Ek page, do backend:
//   IMS (POST/JSON)  → getOutward   → aaj ka material OUT
//   ERP (JSONP)      → getProductionByDate → aaj ki production complete
// ============================================================

const MPapp = (function () {

  let _mode = 'day';           // 'day' | 'week' | 'month'

  // ── date helpers ──
  function todayISO() { return new Date().toISOString().slice(0, 10); }
  function toISO(d) {
    return d.getFullYear() + '-' +
      String(d.getMonth() + 1).padStart(2, '0') + '-' +
      String(d.getDate()).padStart(2, '0');
  }
  function parseISO(s) {
    if (!s) return null;
    const str = String(s).trim();
    let m = str.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (m) return new Date(+m[1], +m[2] - 1, +m[3]);
    m = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);       // dd/mm/yyyy (ERP)
    if (m) return new Date(+m[3], +m[2] - 1, +m[1]);
    const d = new Date(str);
    return isNaN(d.getTime()) ? null : new Date(d.getFullYear(), d.getMonth(), d.getDate());
  }
  function fmtD(d) {
    if (!d) return '—';
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  // anchor date se range nikalo
  function computeRange() {
    const anchorVal = document.getElementById('anchor-date').value || todayISO();
    const anchor = parseISO(anchorVal);
    let from, to = anchor;
    if (_mode === 'day') {
      from = anchor;
    } else if (_mode === 'week') {
      from = new Date(anchor); from.setDate(from.getDate() - 6);   // rolling 7 din
    } else {
      from = new Date(anchor.getFullYear(), anchor.getMonth(), 1); // is mahine ka 1
    }
    return { from, to, fromISO: toISO(from), toISO: toISO(to) };
  }

  // ── backend calls ──
  function erpApi(params) {
    return new Promise((resolve) => {
      const cb = 'mp_cb_' + Date.now() + '_' + Math.floor(Math.random() * 10000);
      const s = document.createElement('script');
      window[cb] = (res) => { resolve(res); delete window[cb]; s.remove(); };
      s.onerror = () => { resolve({ success: false, message: 'ERP network error' }); delete window[cb]; s.remove(); };
      const qs = Object.entries(params).map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('&');
      s.src = `${MP.ERP_URL}?${qs}&callback=${cb}`;
      document.head.appendChild(s);
    });
  }

  async function imsApi(action, body) {
    const r = await fetch(MP.IMS_URL, {
      method: 'POST', redirect: 'follow',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify({ action, ...(body || {}) }),
    });
    const text = await r.text();
    return JSON.parse(text);
  }

  // ── main load ──
  async function load() {
    const R = computeRange();
    document.getElementById('range-note').textContent =
      _mode === 'day' ? fmtD(R.from) : (fmtD(R.from) + '  →  ' + fmtD(R.to));

    // panels ko loading state
    document.getElementById('mat-tb').innerHTML  = `<tr class="lrow"><td colspan="3"><span class="spin"></span> Loading…</td></tr>`;
    document.getElementById('prod-tb').innerHTML = `<tr class="lrow"><td colspan="5"><span class="spin"></span> Loading…</td></tr>`;
    document.getElementById('mat-empty').style.display = 'none';
    document.getElementById('prod-empty').style.display = 'none';
    document.getElementById('mat-foot').textContent = '';
    document.getElementById('prod-foot').textContent = '';

    // dono ek saath
    const [matRes, prodRes] = await Promise.allSettled([
      loadMaterial(R),
      loadProduction(R),
    ]);

    let ok = true;
    if (matRes.status === 'fulfilled') renderMaterial(matRes.value);
    else { ok = false; renderMaterial([]); toast('IMS load nahi hua', 'err'); }

    if (prodRes.status === 'fulfilled') renderProduction(prodRes.value);
    else { ok = false; renderProduction([]); toast('ERP load nahi hua', 'err'); }

    setDot(ok ? 'ok' : 'err', ok ? 'Connected' : 'Error');
  }

  // ── IMS material out ──
  async function loadMaterial(R) {
    let rows;
    if (_mode === 'day') {
      rows = await imsApi('getOutward', { date: R.fromISO });      // server-side filter (fast)
    } else {
      rows = await imsApi('getOutward', {});                        // sab, phir client filter
    }
    rows = Array.isArray(rows) ? rows : (rows && rows.data ? rows.data : []);

    // purpose=Production + range + aggregate by item
    const map = {};
    rows.forEach(r => {
      if ((r.purpose || 'Production') !== 'Production') return;
      const d = parseISO(r.date);
      if (!d || d < R.from || d > R.to) return;
      const key = r.itemName || '—';
      if (!map[key]) map[key] = { name: key, qty: 0, unit: r.unit || '' };
      map[key].qty += Number(r.qty) || 0;
    });
    return Object.values(map).sort((a, b) => a.name.localeCompare(b.name));
  }

  function renderMaterial(items) {
    const tb = document.getElementById('mat-tb');
    const em = document.getElementById('mat-empty');
    const ft = document.getElementById('mat-foot');
    if (!items.length) { tb.innerHTML = ''; em.style.display = 'block'; ft.textContent = ''; return; }
    em.style.display = 'none';
    tb.innerHTML = items.map(i => `<tr>
      <td class="td-name">${esc(i.name)}</td>
      <td class="r"><span class="qty out">${i.qty}</span></td>
      <td class="unit">${esc(i.unit) || '—'}</td>
    </tr>`).join('');
    document.getElementById('mat-count').textContent = items.length + ' items';
    const totalQty = items.reduce((s, i) => s + i.qty, 0);
    ft.innerHTML = `${items.length} item · total qty <b>${totalQty}</b>`;
  }

  // ── ERP production complete ──
  async function loadProduction(R) {
    const res = await erpApi({ action: 'getProductionByDate', from: R.fromISO, to: R.toISO });
    if (!res || !res.success) throw new Error(res && res.message ? res.message : 'ERP error');
    let rows = res.data || [];
    rows.sort((a, b) => String(a['Order ID']).localeCompare(String(b['Order ID'])));
    return rows;
  }

  function renderProduction(rows) {
    const tb = document.getElementById('prod-tb');
    const em = document.getElementById('prod-empty');
    const ft = document.getElementById('prod-foot');
    if (!rows.length) { tb.innerHTML = ''; em.style.display = 'block'; ft.textContent = ''; return; }
    em.style.display = 'none';
    tb.innerHTML = rows.map(p => {
      const q = Number(p['Produced Qty']) || Number(p['Qty']) || 0;
      return `<tr>
        <td class="td-id">${esc(p['Order ID'])}</td>
        <td class="td-name">${esc(p['Customer Name'])}</td>
        <td>${esc(p['Product Model'])}</td>
        <td>${esc(p['Battery Type'])}</td>
        <td class="r"><span class="qty made">${q}</span></td>
      </tr>`;
    }).join('');
    const orders = new Set(rows.map(p => p['Order ID'])).size;
    const totalBatt = rows.reduce((s, p) => s + (Number(p['Produced Qty']) || Number(p['Qty']) || 0), 0);
    document.getElementById('prod-count').textContent = rows.length + ' rows';
    ft.innerHTML = `${orders} order · total battery <b>${totalBatt}</b>`;
  }

  // ── mode toggle ──
  function setMode(mode) {
    _mode = mode;
    ['day', 'week', 'month'].forEach(m => {
      document.getElementById('pill-' + m).classList.toggle('active', m === mode);
    });
    load();
  }

  // ── utils ──
  function esc(v) {
    return String(v == null ? '' : v).replace(/[<>&"']/g, c =>
      ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&#39;' }[c]));
  }
  function setDot(state, lbl) {
    const d = document.getElementById('dot'); if (d) d.className = 'dot ' + state;
    const l = document.getElementById('dot-lbl'); if (l) l.textContent = lbl;
  }
  let _tt;
  function toast(msg, type) {
    const t = document.getElementById('toast');
    t.textContent = msg; t.className = 'toast show ' + (type || '');
    clearTimeout(_tt); _tt = setTimeout(() => t.className = 'toast', 3000);
  }

  // ── init ──
  function init() {
    document.getElementById('anchor-date').value = todayISO();
    if (!MP.ERP_URL || MP.ERP_URL.indexOf('PASTE') > -1) {
      toast('ERP_URL config.js me daalo', 'err');
    }
    load();
  }

  window.addEventListener('load', init);
  return { load, setMode };
})();
