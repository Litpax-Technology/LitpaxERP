// ============================================================
// MaterialProd — app.js
// Ek page, do backend:
//   IMS (POST/JSON)  → getOutward   → aaj ka material OUT
//   ERP (JSONP)      → getProductionByDate → aaj ki production complete
// ============================================================

const MPapp = (function () {

  let _mode = 'day';           // 'day' | 'week' | 'month'
  let _view = 'mp';            // 'mp' | 'cell'
  let _models = [];            // BOM models (cell recon)
  let _entryType = 'Bani';     // 'Bani' | 'Dispatch'
  let _hadEntries = false;
  let _loadedFor = '';         // form me kis date|type ki entry load hui
  let _entryReq = 0;           // race guard
  let _fgRows = [];            // FG stock model-wise (last load)
  let _bmRows = [];            // range model-wise (FG range view)
  let _fgFull = false;         // false = range view, true = poora hisaab
  let _fgMeta = {};            // FG badge ke liye from/to
  let _fgReg = null;           // FG Register data (last load)
  // Link se role: ?type=bani → sirf Bani, ?type=dispatch → sirf Dispatch, bina type → dono
  const LINK_TYPE = ({ bani: 'Bani', dispatch: 'Dispatch' })[
    (new URLSearchParams(location.search).get('type') || '').toLowerCase()] || '';
  const GAP_OK_PCT = 5, GAP_WARN_PCT = 15;   // gap % thresholds (card color)

  // ── date helpers ──
  function todayISO() { return toISO(new Date()); }
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
    if (_mode === 'custom') {
      const fv = document.getElementById('from-date').value;
      const tv = document.getElementById('to-date').value;
      if (!fv || !tv) { toast('From aur To dono date daalo', 'err'); return null; }
      if (fv > tv) { toast('From date, To se pehle honi chahiye', 'err'); return null; }
      if (tv > todayISO()) { toast('To date aaj se aage nahi ho sakti', 'err'); return null; }
      return { from: parseISO(fv), to: parseISO(tv), fromISO: fv, toISO: tv };
    }
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
      const tm = setTimeout(() => { resolve({ success: false, message: 'ERP timeout' }); window[cb] = () => {}; s.remove(); }, 20000);
      window[cb] = (res) => { clearTimeout(tm); resolve(res); delete window[cb]; s.remove(); };
      s.onerror = () => { clearTimeout(tm); resolve({ success: false, message: 'ERP network error' }); delete window[cb]; s.remove(); };
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
  let _loadReq = 0;
  async function load() {
    const reqId = ++_loadReq;
    if (_view === 'cell') return loadCell(reqId);
    const R = computeRange();
    if (!R) return;
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
    if (reqId !== _loadReq) return;

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
    if (!items.length) { tb.innerHTML = ''; em.style.display = 'block'; ft.textContent = ''; document.getElementById('mat-count').textContent = '0 items'; return; }
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
    if (!rows.length) { tb.innerHTML = ''; em.style.display = 'block'; ft.textContent = ''; document.getElementById('prod-count').textContent = '0 rows'; return; }
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

    // ============================================================
  // CELL RECONCILIATION
  // ============================================================
  function switchView(v) {
    _view = v;
    document.getElementById('tab-mp').classList.toggle('active', v === 'mp');
    document.getElementById('tab-cell').classList.toggle('active', v === 'cell');
    document.getElementById('view-mp').style.display   = v === 'mp' ? '' : 'none';
    document.getElementById('view-cell').style.display = v === 'cell' ? '' : 'none';
    const allowBani = !LINK_TYPE || LINK_TYPE === 'Bani';
    const allowDisp = !LINK_TYPE || LINK_TYPE === 'Dispatch';
    document.getElementById('btn-bani').style.display = (v === 'cell' && allowBani) ? '' : 'none';
    document.getElementById('btn-disp').style.display = (v === 'cell' && allowDisp) ? '' : 'none';
    document.getElementById('btn-open').style.display = (v === 'cell' && !LINK_TYPE) ? '' : 'none';
    load();
  }

  function num(n) { return (Number(n) || 0).toLocaleString('en-IN'); }

  async function loadCell(reqId) {
    const R = computeRange();
    if (!R) return;
    document.getElementById('range-note').textContent =
      _mode === 'day' ? fmtD(R.from) : (fmtD(R.from) + '  →  ' + fmtD(R.to));
    ['cr-issued', 'cr-bani', 'cr-consumed', 'cr-gap', 'cr-disp', 'cr-fg']
      .forEach(id => { document.getElementById(id).textContent = '…'; });
    document.getElementById('crm-tb').innerHTML = `<tr class="lrow"><td colspan="4"><span class="spin"></span> Loading…</td></tr>`;
    document.getElementById('crd-tb').innerHTML = `<tr class="lrow"><td colspan="7"><span class="spin"></span> Loading…</td></tr>`;
    try {
      const res = await imsApi('getCellRecon', { from: R.fromISO, to: R.toISO });
      if (reqId !== _loadReq) return;
      if (!res || res.error) throw new Error(res && res.error ? res.error : 'IMS error');
      _models = res.models || [];
      renderCell(res);
      setDot('ok', 'Connected');
      if (!LINK_TYPE) loadFGReg(R, reqId);        // FG Register — sirf full link wale ko
    } catch (e) {
      if (reqId !== _loadReq) return;
      setDot('err', 'Error');
      toast('Cell data load nahi hua: ' + e.message, 'err');
      document.getElementById('crm-tb').innerHTML = '';
      document.getElementById('crd-tb').innerHTML = '';
    }
  }

  function renderCell(d) {
    const t = d.totals || {};
    const set = (id, v) => { document.getElementById(id).textContent = v; };
    set('cr-issued', num(t.netIssued));
    set('cr-issued-sub', `Out ${num(t.issuedOut)} − Wapas ${num(t.returned)}`);
    set('cr-bani', num(t.bani));
    set('cr-consumed', num(t.consumed));
    set('cr-gap', (t.gap > 0 ? '+' : '') + num(t.gap));
    set('cr-disp', num(t.dispatched));
    set('cr-fg', num(t.fgPending));

    // gap card color
    const card = document.getElementById('cr-gap-card');
    card.classList.remove('ok', 'warn', 'bad');
    const pct = t.netIssued ? (t.gap / t.netIssued) * 100 : 0;
    let cls, msg;
    if (t.gap < 0)                { cls = 'bad';  msg = 'Issued se zyada consume — entry/BOM check karo'; }
    else if (pct <= GAP_OK_PCT)   { cls = 'ok';   msg = 'Theek hai'; }
    else if (pct <= GAP_WARN_PCT) { cls = 'warn'; msg = pct.toFixed(1) + '% cells ka hisaab baaki'; }
    else                          { cls = 'bad';  msg = pct.toFixed(1) + '% cells ka hisaab baaki'; }
    card.classList.add(cls);
    set('cr-gap-sub', msg + ' · Floor balance ' + num(t.closingBalance));

    // opening line
    const ol = document.getElementById('cr-open');
    if (d.opening && d.opening.startDate) {
      ol.innerHTML = `Hisaab <b>${fmtD(parseISO(d.opening.startDate))}</b> se · Opening: Floor <b>${num(d.opening.floorCells)}</b> cells · FG <b>${num(d.opening.fgTotal)}</b> batteries`;
      ol.style.display = '';
    } else {
      ol.style.display = 'none';
    }

    // notes / warnings
    const notes = [];
    if (!(d.opening && d.opening.startDate)) {
      if (!d.startDate) notes.push('Opening set nahi hai aur koi entry bhi nahi — ⚙️ Opening se start date set karo.');
      else notes.push(`Opening set nahi hai — Floor Balance aur FG ${fmtD(parseISO(d.startDate))} (pehli entry) se 0 maan ke gine ja rahe hain.`);
    }
    if (d.startDate && d.startDate > d.from) notes.push(`${fmtD(parseISO(d.startDate))} se pehle ke din balance me nahi gine gaye.`);
    (d.warnings || []).forEach(x => notes.push('⚠️ ' + x));
    const w = document.getElementById('cr-warn');
    w.innerHTML = notes.map(esc).join('<br>');
    w.style.display = notes.length ? '' : 'none';

    // model-wise
    const bm = d.byModel || [];
    document.getElementById('crm-count').textContent = bm.length + ' models';
    document.getElementById('crm-tb').innerHTML = bm.length ? bm.map(m => `<tr>
      <td class="td-name">${esc(m.model)}</td>
      <td class="r">${m.cpb ? m.cpb : '<span class="neg">0 ⚠️</span>'}</td>
      <td class="r"><span class="qty made">${num(m.bani)}</span></td>
      <td class="r">${num(m.consumed)}</td>
    </tr>`).join('') : `<tr class="lrow"><td colspan="4">Is range me koi entry nahi</td></tr>`;

    // daily (latest upar)
    const days = (d.daily || []).slice().reverse();
    document.getElementById('crd-tb').innerHTML = days.map(x => {
      const hasBal = x.balance != null;
      const close = Number(x.balance) || 0;
      const open = close - (Number(x.gap) || 0);              // Opening = Closing − Gap
      return `<tr>
      <td>${fmtD(parseISO(x.date))}</td>
      <td class="r ${hasBal && open < 0 ? 'neg' : ''}">${hasBal ? num(open) : '—'}</td>
      <td class="r">${num(x.issued)}</td>
      <td class="r">${num(x.bani)}</td>
      <td class="r">${num(x.consumed)}</td>
      <td class="r ${x.gap < 0 ? 'neg' : ''}">${num(x.gap)}</td>
      <td class="r ${hasBal && close < 0 ? 'neg' : ''}"><b>${hasBal ? num(close) : '—'}</b></td>
    </tr>`;
    }).join('');

    // FG stock
    _fgRows = d.fgStock || [];
    _bmRows = bm;
    _fgMeta = {
      from: (d.opening && d.opening.startDate) || d.startDate || '',
      to: d.to,
      hasOpening: !!(d.opening && d.opening.startDate),
    };
    fillFGFilter();
    renderFG();
  }

  function fgModelList() {
    const seen = {}, list = [];
    _fgRows.concat(_bmRows).forEach(r => {
      if (r.model && !seen[r.model]) { seen[r.model] = 1; list.push(r.model); }
    });
    return list;
  }

  function fillFGFilter() {
    const sel = document.getElementById('fg-model');
    const cur = sel.value;
    const list = fgModelList();
    sel.innerHTML = '<option value="">Sabhi Models</option>' +
      list.map(x => `<option value="${esc(x)}">${esc(x)}</option>`).join('');
    if (list.indexOf(cur) > -1) sel.value = cur;
  }

  function rangeLbl() {
    if (_mode === 'week') return 'Is Hafte';
    if (_mode === 'month') return 'Is Mahine';
    if (_mode === 'custom') {
      const fv = document.getElementById('from-date').value;
      const tv = document.getElementById('to-date').value;
      const s = v => { const d = parseISO(v); return d ? d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : '—'; };
      return fv === tv ? s(fv) : s(fv) + ' → ' + s(tv);
    }
    const a = document.getElementById('anchor-date').value;
    return (!a || a === todayISO()) ? 'Aaj' : fmtD(parseISO(a));
  }

  function renderFG() {
    const m = document.getElementById('fg-model').value;
    const showZero = document.getElementById('fg-zero').checked;
    const fgMap = {}, bmMap = {};
    _fgRows.forEach(r => { fgMap[r.model] = r; });
    _bmRows.forEach(r => { bmMap[r.model] = r; });

    const rows = fgModelList().map(model => {
      const f = fgMap[model] || {}, b = bmMap[model] || {};
      return {
        model,
        opening: Number(f.opening) || 0,
        totBani: Number(f.bani) || 0,
        totDisp: Number(f.dispatch) || 0,
        stock:   Number(f.stock) || 0,
        rBani:   Number(b.bani) || 0,
        rDisp:   Number(b.dispatch) || 0,
      };
    }).filter(r => (!m || r.model === m) &&
      (showZero || r.stock !== 0 || (!_fgFull && (r.rBani || r.rDisp))));

    const toLbl = fmtD(parseISO(_fgMeta.to));
    const th = document.getElementById('fg-th');
    const asof = document.getElementById('fg-asof');
    const btn = document.getElementById('fg-full-btn');
    const tb = document.getElementById('fg-tb');
    const ft = document.getElementById('fg-foot');

    if (_fgFull) {
      th.innerHTML = `<tr><th>Model</th><th class="r">Opening</th><th class="r">Total Bani</th><th class="r">Total Dispatch</th><th class="r">FG Stock</th></tr>`;
      asof.textContent = (_fgMeta.from ? fmtD(parseISO(_fgMeta.from)) + ' se ' : '') + toLbl + ' tak' +
        (_fgMeta.hasOpening ? '' : ' · Opening set nahi');
      btn.textContent = '← Wapas';
    } else {
      const rl = esc(rangeLbl());
      th.innerHTML = `<tr><th>Model</th><th class="r">Bani (${rl})</th><th class="r">Dispatch (${rl})</th><th class="r">FG Stock (${esc(toLbl)} tak)</th></tr>`;
      asof.textContent = 'Stock ' + toLbl + ' tak';
      btn.textContent = '📋 Poora Hisaab';
    }

    if (!rows.length) {
      tb.innerHTML = `<tr class="lrow"><td colspan="${_fgFull ? 5 : 4}">Koi FG data nahi</td></tr>`;
      ft.textContent = '';
      return;
    }

    const sum = k => rows.reduce((s, r) => s + r[k], 0);
    const stockTd = r => `<td class="r"><span class="qty ${r.stock < 0 ? 'neg' : 'made'}">${num(r.stock)}</span></td>`;

    if (_fgFull) {
      tb.innerHTML = rows.map(r => `<tr>
        <td class="td-name">${esc(r.model)}</td>
        <td class="r">${num(r.opening)}</td>
        <td class="r">${num(r.totBani)}</td>
        <td class="r">${num(r.totDisp)}</td>
        ${stockTd(r)}
      </tr>`).join('') +
        `<tr class="fg-total"><td>Total</td><td class="r">${num(sum('opening'))}</td><td class="r">${num(sum('totBani'))}</td><td class="r">${num(sum('totDisp'))}</td><td class="r"><span class="qty">${num(sum('stock'))}</span></td></tr>`;
    } else {
      tb.innerHTML = rows.map(r => `<tr>
        <td class="td-name">${esc(r.model)}</td>
        <td class="r">${r.rBani ? '<span class="qty made">' + num(r.rBani) + '</span>' : '0'}</td>
        <td class="r">${num(r.rDisp)}</td>
        ${stockTd(r)}
      </tr>`).join('') +
        `<tr class="fg-total"><td>Total</td><td class="r">${num(sum('rBani'))}</td><td class="r">${num(sum('rDisp'))}</td><td class="r"><span class="qty">${num(sum('stock'))}</span></td></tr>`;
    }
    ft.innerHTML = `${rows.length} model · FG stock <b>${num(sum('stock'))}</b>`;
  }

  function toggleFGFull() { _fgFull = !_fgFull; renderFG(); }

    // ============================================================
  // FG REGISTER — model × date (Cell Recon ke andar, sirf full link)
  // ============================================================
  function ensureFGReg() {
    if (document.getElementById('fgreg')) return true;
    const host = document.getElementById('view-cell');
    if (!host) return false;
    host.insertAdjacentHTML('beforeend', `
      <div id="fgreg" class="panel fg-panel">
        <div class="panel-head">
          <div class="ph-title">📋 FG Register <span id="fgreg-range" class="ph-src"></span></div>
          <div class="fg-tools">
            <label class="fg-chk"><input type="checkbox" id="fgreg-zero" onchange="MPapp.renderFGReg()"> Zero wale bhi dikhao</label>
            <button class="fg-toggle" onclick="MPapp.downloadFGReg()">⬇️ CSV</button>
          </div>
        </div>
        <div class="panel-body"><table class="fgreg-table"><thead id="fgreg-th"></thead><tbody id="fgreg-tb"></tbody></table></div>
        <div id="fgreg-foot" class="panel-foot"></div>
      </div>`);
    return true;
  }

  async function loadFGReg(R, reqId) {
    if (!ensureFGReg()) return;
    const tb = document.getElementById('fgreg-tb');
    document.getElementById('fgreg-th').innerHTML = '';
    tb.innerHTML = `<tr class="lrow"><td><span class="spin"></span> Loading…</td></tr>`;
    try {
      const res = await imsApi('getFGRegister', { from: R.fromISO, to: R.toISO });
      if (reqId !== _loadReq) return;
      if (!res || res.error) throw new Error(res && res.error ? res.error : 'IMS error');
      _fgReg = res;
      renderFGReg();
    } catch (e) {
      if (reqId !== _loadReq) return;
      _fgReg = null;
      tb.innerHTML = `<tr class="lrow"><td>FG Register load nahi hua: ${esc(e.message)}</td></tr>`;
    }
  }

  function ddmm(iso) { const p = String(iso).split('-'); return p[2] + '/' + p[1]; }

  function fgRegVisible() {
    if (!_fgReg) return [];
    const showZero = document.getElementById('fgreg-zero')?.checked;
    return (_fgReg.rows || []).filter(r => showZero || r.opening || r.closing ||
      r.prod.some(v => v) || r.disp.some(v => v));
  }

  function renderFGReg() {
    if (!_fgReg) return;
    const dates = _fgReg.dates || [];
    const rows = fgRegVisible();
    document.getElementById('fgreg-range').textContent =
      fmtD(parseISO(_fgReg.from)) + (_fgReg.from === _fgReg.to ? '' : '  →  ' + fmtD(parseISO(_fgReg.to)));
    document.getElementById('fgreg-th').innerHTML =
      `<tr><th rowspan="2" class="fgreg-model">Model</th><th rowspan="2" class="r">Opening</th>` +
      dates.map(d => `<th colspan="2" class="c fgreg-date">${ddmm(d)}</th>`).join('') +
      `<th rowspan="2" class="r fgreg-date">Closing</th></tr>` +
      `<tr>${dates.map(() => '<th class="r fgreg-date">Prod</th><th class="r">Disp</th>').join('')}</tr>`;

    const tb = document.getElementById('fgreg-tb');
    const ft = document.getElementById('fgreg-foot');
    if (!rows.length) {
      tb.innerHTML = `<tr class="lrow"><td colspan="${dates.length * 2 + 3}">Is range me koi FG data nahi</td></tr>`;
      ft.textContent = '';
      return;
    }
    const cell = v => v ? num(v) : '<span class="fgreg-zero">0</span>';
    const sum = k => rows.reduce((s, r) => s + (r[k] || 0), 0);
    const sumAt = (k, i) => rows.reduce((s, r) => s + (r[k][i] || 0), 0);

    tb.innerHTML = rows.map(r => `<tr>
      <td class="td-name fgreg-model">${esc(r.model)}</td>
      <td class="r">${cell(r.opening)}</td>
      ${dates.map((d, i) => `<td class="r fgreg-date">${r.prod[i] ? '<span class="qty made">' + num(r.prod[i]) + '</span>' : cell(0)}</td><td class="r">${cell(r.disp[i])}</td>`).join('')}
      <td class="r fgreg-date"><b class="${r.closing < 0 ? 'neg' : ''}">${num(r.closing)}</b></td>
    </tr>`).join('') +
      `<tr class="fg-total"><td class="fgreg-model">Total</td><td class="r">${num(sum('opening'))}</td>` +
      dates.map((d, i) => `<td class="r fgreg-date">${num(sumAt('prod', i))}</td><td class="r">${num(sumAt('disp', i))}</td>`).join('') +
      `<td class="r fgreg-date">${num(sum('closing'))}</td></tr>`;

    ft.textContent = rows.length + ' model' +
      (_fgReg.startDate ? ' · Hisaab ' + fmtD(parseISO(_fgReg.startDate)) + ' se' : ' · Opening set nahi');
  }

  function downloadFGReg() {
    if (!_fgReg) return toast('Pehle data load hone do', 'err');
    const dates = _fgReg.dates || [];
    const rows = fgRegVisible();
    if (!rows.length) return toast('Download ke liye koi row nahi', 'err');

    const q = v => { const s = String(v == null ? '' : v); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
    const head = ['Model', 'Opening'];
    dates.forEach(d => head.push(ddmm(d) + ' Prod', ddmm(d) + ' Dispatch'));
    head.push('Closing');

    const lines = [head];
    rows.forEach(r => {
      const l = [r.model, r.opening];
      dates.forEach((d, i) => l.push(r.prod[i] || 0, r.disp[i] || 0));
      l.push(r.closing);
      lines.push(l);
    });
    const tot = ['Total', rows.reduce((s, r) => s + r.opening, 0)];
    dates.forEach((d, i) => tot.push(
      rows.reduce((s, r) => s + (r.prod[i] || 0), 0),
      rows.reduce((s, r) => s + (r.disp[i] || 0), 0)));
    tot.push(rows.reduce((s, r) => s + r.closing, 0));
    lines.push(tot);

    const csv = '\ufeff' + lines.map(l => l.map(q).join(',')).join('\r\n');   // \ufeff = Excel me sahi khule
    const dmy = s => s.split('-').reverse().join('-');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    a.download = `FG_Register_${dmy(_fgReg.from)}_to_${dmy(_fgReg.to)}.csv`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

  // ── Entry modal ──
  function openEntry(type) {
    if (LINK_TYPE && type !== LINK_TYPE) return;
    _entryType = type;
    const isBani = type === 'Bani';
    document.getElementById('en-title').textContent = isBani ? '🔋 Bani Entry — Production' : '🚚 Dispatch Entry';
    document.getElementById('en-qty-h').textContent = isBani ? 'Qty Bani' : 'Qty Dispatch';
    const defDate = _mode === 'custom'
      ? document.getElementById('to-date').value
      : document.getElementById('anchor-date').value;
    document.getElementById('en-date').value = defDate || todayISO();
    try { document.getElementById('en-by').value = localStorage.getItem('mp_enby_' + type) || ''; } catch (e) {}
    document.getElementById('entry-modal').style.display = 'flex';
    loadEntryFor();
  }
  function closeEntry() { document.getElementById('entry-modal').style.display = 'none'; }

  function modelOptions(sel) {
    const inList = !sel || _models.some(m => m.bomName === sel);
    return '<option value="">— Model —</option>' + _models.map(m =>
      `<option value="${esc(m.bomName)}"${m.bomName === sel ? ' selected' : ''}>${esc(m.bomName)}${m.cpb ? ' (' + m.cpb + ' cells)' : ' ⚠️'}</option>`
    ).join('') +
      (inList ? '' : `<option value="${esc(sel)}" selected>${esc(sel)} (purana)</option>`);   // purani entry ka legacy model
  }

  function addEntryRow(r) {
    r = r || {};
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><select class="en-model">${modelOptions(r.model)}</select></td>
      <td class="r"><input type="number" min="0" class="num-inp en-qty" value="${r.qty != null ? r.qty : ''}"></td>
      <td><button class="btn-rm" onclick="MPapp.removeEntryRow(this)">✕</button></td>`;
    document.getElementById('en-tb').appendChild(tr);
  }
  function removeEntryRow(btn) { btn.closest('tr').remove(); }

  async function loadEntryFor() {
    const date = document.getElementById('en-date').value;
    const tb = document.getElementById('en-tb');
    const note = document.getElementById('en-note');
    tb.innerHTML = `<tr class="lrow"><td colspan="3"><span class="spin"></span> Loading…</td></tr>`;
    note.textContent = '';
    _hadEntries = false;
    _loadedFor = '';
    const reqId = ++_entryReq;
    try {
      const res = await imsApi('getCellEntry', { date, type: _entryType });
      if (reqId !== _entryReq) return;                 // purana response, ignore
      if (!res || res.error) throw new Error(res && res.error ? res.error : 'IMS error');
      _loadedFor = date + '|' + _entryType;
      _models = res.models || _models;
      tb.innerHTML = '';
      if (res.entries && res.entries.length) {
        _hadEntries = true;
        res.entries.forEach(e => addEntryRow(e));
        note.textContent = `Is date ki ${_entryType} entry pehle se hai — badal ke Save karoge to replace hogi.`;
      } else {
        addEntryRow();
      }
    } catch (e) {
      if (reqId !== _entryReq) return;
      tb.innerHTML = '';
      addEntryRow();
      toast('Purani entry load nahi hui: ' + e.message, 'err');
    }
  }

  async function saveEntry() {
    const date = document.getElementById('en-date').value;
    const by = document.getElementById('en-by').value.trim();
    if (!date) return toast('Date daalo', 'err');
    if (date > todayISO()) return toast('Future date ki entry nahi', 'err');
    if (!by) return toast('Entered By daalo', 'err');

    const rows = [], seen = {};
    let bad = '';
    document.querySelectorAll('#en-tb tr').forEach(tr => {
      const sel = tr.querySelector('.en-model');
      if (!sel || bad) return;
      const model = sel.value;
      const q = tr.querySelector('.en-qty').value;
      if (!model && q === '') return;                         // khaali row skip
      if (!model) { bad = 'Har row me model select karo'; return; }
      if (q === '') { bad = model + ' ki qty daalo'; return; }
      if (Number(q) < 0) { bad = 'Qty negative nahi ho sakti'; return; }
      if (seen[model]) { bad = model + ' do baar hai'; return; }
      seen[model] = 1;
      if (Number(q) > 0) rows.push({ model, qty: Number(q) });
    });
    if (bad) return toast(bad, 'err');

    // form me purani entry load nahi hui thi → server se check karke merge
    if (_loadedFor !== date + '|' + _entryType) {
      try {
        const chk = await imsApi('getCellEntry', { date, type: _entryType });
        if (!chk || chk.error) throw new Error(chk && chk.error ? chk.error : 'IMS error');
        const missing = (chk.entries || []).filter(e => !seen[e.model]);
        if (missing.length) {
          const list = missing.map(e => e.model + ' (' + e.qty + ')').join(', ');
          if (!confirm(`${date} ki ${_entryType} me pehle se ye model saved hain jo form me nahi hain:\n${list}\n\nOK = inhe bhi rakho (merge)\nCancel = save mat karo`)) return;
          missing.forEach(e => rows.push({ model: e.model, qty: Number(e.qty) || 0 }));
        }
      } catch (e) {
        return toast('Purani entry check nahi hui, save roka: ' + e.message, 'err');
      }
    }

    if (!rows.length) {
      if (!_hadEntries) return toast('Kam se kam ek row bharo', 'err');
      if (!confirm(`${date} ki saari ${_entryType} entry hata dein?`)) return;
    }

    const btn = document.getElementById('en-save');
    btn.disabled = true; btn.textContent = 'Saving…';
    try {
      const res = await imsApi('saveCellEntry', { date, type: _entryType, enteredBy: by, rows });
      if (!res || res.error) throw new Error(res && res.error ? res.error : 'IMS error');
      try { localStorage.setItem('mp_enby_' + _entryType, by); } catch (e) {}
      toast(rows.length ? `${_entryType} saved ✓ ${res.saved} model` : `${_entryType} entry hata di ✓`, 'ok');
      closeEntry();
      load();
    } catch (e) {
      toast('Save fail: ' + e.message, 'err');
    } finally {
      btn.disabled = false; btn.textContent = 'Save';
    }
  }

    // ── Opening modal ──
  async function openOpening() {
    if (LINK_TYPE) return;
    document.getElementById('open-modal').style.display = 'flex';
    const tb = document.getElementById('op-tb');
    const hintEl = document.getElementById('op-hint');
    tb.innerHTML = `<tr class="lrow"><td colspan="3"><span class="spin"></span> Loading…</td></tr>`;
    hintEl.textContent = '';
    try { document.getElementById('op-by').value = localStorage.getItem('mp_opby') || ''; } catch (e) {}
    try {
      const res = await imsApi('getCellOpening', {});
      if (!res || res.error) throw new Error(res && res.error ? res.error : 'IMS error');
      _models = res.models || _models;
      document.getElementById('op-date').value = res.startDate || res.suggestedDate || todayISO();
      document.getElementById('op-floor').value = res.startDate ? res.floorCells : 0;
      const hint = [];
      if (res.suggestedDate) hint.push(`IMS me cells ka opening ${fmtD(parseISO(res.suggestedDate))} ko liya gaya tha.`);
      if (res.startDate) hint.push(`Abhi set: ${fmtD(parseISO(res.startDate))}${res.updatedBy ? ' (' + res.updatedBy + ')' : ''}`);
      hintEl.textContent = hint.join(' · ');
      tb.innerHTML = '';
      const fg = res.fg || {};
      const keys = Object.keys(fg);
      if (keys.length) keys.forEach(k => addOpeningRow({ model: k, qty: fg[k] }));
      else addOpeningRow();
    } catch (e) {
      tb.innerHTML = '';
      addOpeningRow();
      toast('Opening load nahi hua: ' + e.message, 'err');
    }
  }
  function closeOpening() { document.getElementById('open-modal').style.display = 'none'; }

  function addOpeningRow(r) {
    r = r || {};
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><select class="en-model">${modelOptions(r.model)}</select></td>
      <td class="r"><input type="number" min="0" class="num-inp op-qty" value="${r.qty != null ? r.qty : ''}"></td>
      <td><button class="btn-rm" onclick="MPapp.removeEntryRow(this)">✕</button></td>`;
    document.getElementById('op-tb').appendChild(tr);
  }

  async function saveOpening() {
    const startDate = document.getElementById('op-date').value;
    const floorVal = document.getElementById('op-floor').value;
    const by = document.getElementById('op-by').value.trim();
    if (!startDate) return toast('Start date daalo', 'err');
    if (startDate > todayISO()) return toast('Start date future ki nahi ho sakti', 'err');
    if (Number(floorVal) < 0) return toast('Floor cells negative nahi ho sakte', 'err');
    if (!by) return toast('Updated By daalo', 'err');

    const fg = [], seen = {};
    let bad = '';
    document.querySelectorAll('#op-tb tr').forEach(tr => {
      const sel = tr.querySelector('.en-model');
      if (!sel || bad) return;
      const model = sel.value;
      const q = tr.querySelector('.op-qty').value;
      if (!model && q === '') return;
      if (!model) { bad = 'Har row me model select karo'; return; }
      if (q === '') { bad = model + ' ki qty daalo'; return; }
      if (Number(q) < 0) { bad = 'Qty negative nahi ho sakti'; return; }
      if (seen[model]) { bad = model + ' do baar hai'; return; }
      seen[model] = 1;
      if (Number(q) > 0) fg.push({ model, qty: Number(q) });
    });
    if (bad) return toast(bad, 'err');
    if (!confirm('Opening save karne se Floor Balance aur FG ka poora hisaab is date se dobara banega. Save karein?')) return;

    const btn = document.getElementById('op-save');
    btn.disabled = true; btn.textContent = 'Saving…';
    try {
      const res = await imsApi('saveCellOpening', { startDate, floorCells: Number(floorVal) || 0, updatedBy: by, fg });
      if (!res || res.error) throw new Error(res && res.error ? res.error : 'IMS error');
      try { localStorage.setItem('mp_opby', by); } catch (e) {}
      toast(`Opening saved ✓ (${res.fgModels} FG models)`, 'ok');
      closeOpening();
      load();
    } catch (e) {
      toast('Save fail: ' + e.message, 'err');
    } finally {
      btn.disabled = false; btn.textContent = 'Save';
    }
  }

  // ── mode toggle ──
  function setMode(mode) {
    _mode = mode;
    ['day', 'week', 'month', 'custom'].forEach(m => {
      document.getElementById('pill-' + m).classList.toggle('active', m === mode);
    });
    const isC = mode === 'custom';
    document.getElementById('grp-anchor').style.display = isC ? 'none' : '';
    document.getElementById('grp-from').style.display   = isC ? '' : 'none';
    document.getElementById('grp-to').style.display     = isC ? '' : 'none';
    if (isC) {                                         // pehli baar: pichhle 7 din bhar do
      const fEl = document.getElementById('from-date');
      const tEl = document.getElementById('to-date');
      if (!tEl.value) tEl.value = document.getElementById('anchor-date').value || todayISO();
      if (!fEl.value) { const f = parseISO(tEl.value); f.setDate(f.getDate() - 6); fEl.value = toISO(f); }
    }
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
    document.getElementById('from-date').max = todayISO();
    document.getElementById('to-date').max = todayISO();
    if (LINK_TYPE) {                                   // role link: tabs chhupao, seedha Cell tab
      document.querySelector('.tabs').style.display = 'none';
      switchView('cell');
      return;
    }
    if (!MP.ERP_URL || MP.ERP_URL.indexOf('PASTE') > -1) {
      toast('ERP_URL config.js me daalo', 'err');
    }
    load();
  }

  window.addEventListener('load', init);
  return { load, setMode, switchView, openEntry, closeEntry, loadEntryFor, addEntryRow, removeEntryRow, saveEntry,
           openOpening, closeOpening, addOpeningRow, saveOpening, renderFG, toggleFGFull,
           renderFGReg, downloadFGReg };
})();
