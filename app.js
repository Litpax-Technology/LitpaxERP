const API = 'https://script.google.com/macros/s/AKfycbx_WsXDD14mtXIxB0r9FXy_6fBwRiJHPgp9xYdfdcFa364ZeMpZUw1SVbx83QNYcovVhA/exec';

// AUTH
const uStr = sessionStorage.getItem('erp_user');
if (!uStr) window.location.href = 'index.html';
const user = JSON.parse(uStr || '{}');
document.getElementById('userNm').textContent = user.name || 'User';
document.getElementById('userRl').textContent = user.role || '';
document.getElementById('userAv').textContent = (user.name || 'U')[0].toUpperCase();

// Role access
const roleAccess = {
  Admin:      ['admindashboard','orders','crm','production','accounts','customers','products','suppliers','users'],
  Sales:      ['orders','customers','mydashboard'],
  Accounts:   ['accounts'],
  Production: ['production'],
  CRM:        ['crm','orders']
};
(function applyRole(){
  const allowed = roleAccess[user.role] || roleAccess['Admin'];

  document.querySelectorAll('.nav-item[id^="nav-"]').forEach(el => {
    const mod = el.id.replace('nav-','');
    el.style.display = allowed.includes(mod) ? 'flex' : 'none';
  });

  if (user.role === 'Sales' || user.role === 'Admin') {
    const pipeline = document.getElementById('ordersPipeline');
    if (pipeline) pipeline.style.display = 'none';
  }

  if (user.role === 'Accounts') {
    document.querySelector('.sidebar').style.display = 'flex';
    ['sec-tracking','sec-master','sec-admin','sec-sales','sec-finance'].forEach(id => {
      const el = document.getElementById(id); if (el) el.style.display = 'none';
    });
  } else if (user.role === 'Sales') {
    document.querySelector('.sidebar').style.display = 'flex';
    ['sec-tracking', 'sec-admin'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.style.display = 'none';
    });
  } else if (user.role === 'Production' || user.role === 'CRM') {
    document.querySelector('.sidebar').style.display = 'flex';
    // Sirf relevant section dikhao
    ['sec-sales','sec-master','sec-admin','sec-finance'].forEach(id => {
      const el = document.getElementById(id); if (el) el.style.display = 'none';
    });
  } else if (user.role !== 'Admin') {
    document.querySelector('.sidebar').style.display = 'none';
  }

  if (user.role === 'Production') {
    setTimeout(() => nav('production', document.getElementById('nav-production')), 100);
  } else if (user.role === 'CRM') {
    setTimeout(() => nav('crm', document.getElementById('nav-crm')), 100);
  } else if (user.role === 'Accounts') {
    setTimeout(() => nav('accounts', document.getElementById('nav-accounts')), 100);
  }
})();

// PAGE META
const pageMeta = {
  admindashboard:{title:'Dashboard',sub:'Admin overview & analytics'},
  orders:{title:'Sales Orders',sub:'Manage all customer orders'},
  crm:{title:'CRM Tracker',sub:'Order lifecycle tracking'},
  production:{title:'Production',sub:'Production status & updates'},
  mydashboard:{title:'My Dashboard',sub:'Your orders & production updates'},
  customers:{title:'Customers',sub:'Customer master data'},
  products:{title:'Products',sub:'Product master data'},
  suppliers:{title:'Suppliers',sub:'Supplier master data'},
  users:{title:'Users & Access',sub:'Manage users and roles'},
  accounts:{title:'Accounts',sub:'Order accounts & finance tracking'}
};

function nav(id, el) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.getElementById('page-' + id).classList.add('active');
  if (el) el.classList.add('active');
  const m = pageMeta[id] || {};
  document.getElementById('pageTitle').textContent = m.title || id;
  document.getElementById('pageSub').textContent = m.sub || '';
  loadPage(id);
}

function loadPage(id) {
  if (id === 'admindashboard') loadAdminDashboard();
  else if (id === 'orders') loadOrders();
  else if (id === 'crm') loadCRM();
  else if (id === 'production') loadProduction();
  else if (id === 'mydashboard') loadMyDashboard();
  else if (id === 'customers') loadCustomers();
  else if (id === 'products') loadProducts();
  else if (id === 'suppliers') loadSuppliers();
  else if (id === 'users') loadUsers();
  else if (id === 'accounts') loadAccounts();
}

// ========== ADMIN DASHBOARD ==========
let adAllOrders = [], adAllProd = [], adAllAcc = [];

function parseDMY(s) {
  if (!s) return 0;
  const parts = String(s).split('/');
  if (parts.length !== 3) return 0;
  const d = new Date(parts[2], parseInt(parts[1],10) - 1, parts[0]);
  return d.getTime() || 0;
}

function loadAdminDashboard() {
  const fromEl = document.getElementById('ad-from-date');
  const toEl   = document.getElementById('ad-to-date');
  if (fromEl) fromEl.value = '';
  if (toEl)   toEl.value   = '';
  setAdRangeActiveBtn('all');
  api({ action: 'getOrders' }, or => {
    adAllOrders = (or.success && or.data) ? or.data : [];
    api({ action: 'getProduction' }, pr => {
      adAllProd = (pr.success && pr.data) ? pr.data : [];
      api({ action: 'getAccounts' }, ar => {
        adAllAcc = (ar.success && ar.data) ? ar.data : [];
        renderAdminDashboard();
      });
    });
  });
}

function toInputDateStr(d) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth()+1).padStart(2,'0');
  const dd = String(d.getDate()).padStart(2,'0');
  return `${yyyy}-${mm}-${dd}`;
}

function setAdDateRange(preset) {
  const today = new Date();
  let from = null, to = null;
  if (preset === 'today') { from = today; to = today; }
  else if (preset === 'thismonth') { from = new Date(today.getFullYear(), today.getMonth(), 1); to = today; }
  else if (preset === 'lastmonth') {
    from = new Date(today.getFullYear(), today.getMonth()-1, 1);
    to   = new Date(today.getFullYear(), today.getMonth(), 0);
  } else if (preset === 'thisyear') { from = new Date(today.getFullYear(), 0, 1); to = today; }
  // 'all' → from/to stay null

  document.getElementById('ad-from-date').value = from ? toInputDateStr(from) : '';
  document.getElementById('ad-to-date').value   = to   ? toInputDateStr(to)   : '';
  setAdRangeActiveBtn(preset);
  renderAdminDashboard();
}

function setAdRangeActiveBtn(preset) {
  document.querySelectorAll('.ad-range-btn').forEach(b => b.classList.remove('btn-primary'));
  const btn = document.getElementById('ad-range-' + preset + '-btn');
  if (btn) btn.classList.add('btn-primary');
}

function applyAdDateFilter() {
  setAdRangeActiveBtn('custom'); // no matching button → just clears preset highlight
  renderAdminDashboard();
}

function renderAdminDashboard() {
  const fromVal = document.getElementById('ad-from-date')?.value;
  const toVal   = document.getElementById('ad-to-date')?.value;
  const fromTs  = fromVal ? new Date(fromVal).getTime() : null;
  const toTs    = toVal ? (new Date(toVal).getTime() + 24*60*60*1000 - 1) : null;

  const orders = adAllOrders.filter(o => {
    const t = parseDMY(o['Date']);
    if (fromTs !== null && t < fromTs) return false;
    if (toTs !== null && t > toTs) return false;
    return true;
  });
  const orderIDs = new Set(orders.map(o => o['Order ID']));

  const totalOrders = orders.length;
  const totalValue  = orders.reduce((s,o) => s + (parseFloat(o['Total Order Value']) || 0), 0);
  const totalQty    = orders.reduce((s,o) => s + (parseFloat(o['Total Qty']) || 0), 0);
  const avgValue    = totalOrders ? totalValue / totalOrders : 0;
  const pendingStatuses = ['Advance Pending','Pending','Request Full Payment','Credit'];
  const paymentPendingCount = orders.filter(o => pendingStatuses.includes(o['Payment Status']||'')).length;

  setText('ad-orders', totalOrders);
  setText('ad-value', '₹' + fmt(Math.round(totalValue)));
  setText('ad-qty', totalQty);
  setText('ad-avg', '₹' + fmt(Math.round(avgValue)));
  setText('ad-paypending', paymentPendingCount);

  const spMap = {};
  orders.forEach(o => {
    const sp = o['Sales Person Name'] || 'Unknown';
    if (!spMap[sp]) spMap[sp] = { name: sp, orders: 0, qty: 0, value: 0 };
    spMap[sp].orders++;
    spMap[sp].qty   += parseFloat(o['Total Qty']) || 0;
    spMap[sp].value += parseFloat(o['Total Order Value']) || 0;
  });
  renderSalesPersonPerf(Object.values(spMap).sort((a,b) => b.value - a.value));

  const sorted = [...orders].sort((a,b) => parseDMY(b['Date']) - parseDMY(a['Date']));
  renderRecentOrders(sorted.slice(0, 10));

  // Production/Accounts are linked via Order ID — scope them to the filtered order set
  const prod = adAllProd.filter(p => orderIDs.has(p['Order ID']));
  setText('ad-prod-pending',  prod.filter(p => (p['Status']||'Pending') === 'Pending').length);
  setText('ad-prod-inprog',   prod.filter(p => p['Status'] === 'In Progress').length);
  setText('ad-prod-done',     prod.filter(p => p['Status'] === 'Completed').length);
  setText('ad-prod-delayed',  prod.filter(p => p['Status'] === 'Delayed').length);

  const seen = {};
  let totalReceived = 0, totalBalance = 0;
  adAllAcc.forEach(a => {
    const oid = a['Order ID'];
    if (oid && orderIDs.has(oid) && !seen[oid]) {
      seen[oid] = true;
      totalReceived += parseFloat(a['Total Received']) || parseFloat(a['Received']) || 0;
      totalBalance  += parseFloat(a['Balance']) || 0;
    }
  });
  setText('ad-received', '₹' + fmt(Math.round(totalReceived)));
  setText('ad-balance', '₹' + fmt(Math.round(totalBalance)));
}

function setText(id, val) { const el = document.getElementById(id); if (el) el.textContent = val; }

function renderSalesPersonPerf(list) {
  const el = document.getElementById('ad-salesperson-list');
  if (!el) return;
  if (!list.length) { el.innerHTML = '<div class="empty"><div class="empty-txt">Koi data nahi hai</div></div>'; return; }
  el.innerHTML = list.map(s => `
    <div style="display:flex;align-items:center;justify-content:space-between;padding:10px 16px;border-bottom:1px solid var(--border);">
      <div style="font-size:13px;font-weight:600;color:var(--text);">${s.name}</div>
      <div style="display:flex;gap:18px;align-items:center;">
        <span style="font-size:12px;color:var(--text3);">${s.orders} orders</span>
        <span style="font-size:12px;color:var(--text3);">Qty: ${s.qty}</span>
        <span style="font-size:13px;font-weight:600;color:var(--accent);">₹${fmt(Math.round(s.value))}</span>
      </div>
    </div>`).join('');
}

function renderRecentOrders(list) {
  const el = document.getElementById('ad-recent-orders');
  if (!el) return;
  if (!list.length) { el.innerHTML = '<tr><td colspan="7"><div class="empty"><div class="empty-txt">Koi order nahi hai</div></div></td></tr>'; return; }
  el.innerHTML = list.map(o => `
    <tr>
      <td class="td-id">${o['Order ID']||''}</td>
      <td>${o['Date']||''}</td>
      <td class="td-bold">${o['Customer Name']||''}</td>
      <td>${o['Sales Person Name']||''}</td>
      <td style="font-weight:600;color:var(--accent);">₹${fmt(o['Total Order Value']||0)}</td>
      <td>${orderStatusBadge(o['Order Status'])}</td>
      <td>${payStatusBadge(o['Payment Status'])}</td>
    </tr>`).join('');
}

// API
function api(params, cb) {
  const key = 'cb_' + Date.now() + '_' + Math.random().toString(36).substr(2,5);
  window[key] = function(res) { cb(res); delete window[key]; };
  const qs = Object.entries(params).map(([k,v]) => `${k}=${encodeURIComponent(v)}`).join('&');
  const s = document.createElement('script');
  s.src = `${API}?${qs}&callback=${key}`;
  s.onerror = () => cb({ success: false, message: 'Network error' });
  document.body.appendChild(s);
}

// TOAST
function toast(msg, type='s') {
  const w = document.getElementById('toastWrap');
  const d = document.createElement('div');
  d.className = `toast ${type}`;
  const ico = type==='s'?'✅':type==='e'?'❌':'⚠️';
  d.innerHTML = `<span>${ico}</span><span>${msg}</span>`;
  w.appendChild(d);
  setTimeout(() => d.remove(), 3500);
}

// MODAL
function openModal(id) {
  document.getElementById(id).classList.add('show');
  if (id === 'orderModal') {
    if (!custCache.length) loadCustCache();
    const body = document.getElementById('itemsBody');
    if (body && body.children.length === 0) {
      itemRowCount = 0;
      addItemRow();
    }
  }
}
function closeModal(id) { document.getElementById(id).classList.remove('show'); }
document.querySelectorAll('.modal-overlay').forEach(m => {
  m.addEventListener('click', e => {
    if (m.id === 'orderModal') return;   // sirf ✕ ya Create Order se band hoga
    if (e.target === m) m.classList.remove('show');
  });
});

// BADGE HELPERS
function orderStatusBadge(s) {
  if (!s) return '';
  const cl = s.startsWith('Advance') ? 'b-advance' : s.startsWith('PDC') ? 'b-pdc' : s.startsWith('Credit') ? 'b-credit' : 'b-pending';
  return `<span class="badge ${cl}">${s}</span>`;
}
function payStatusBadge(s) {
  if (!s) return '';
  const cl = s==='Paid'?'b-paid':s==='Advance Received'?'b-ready':s.includes('Delay')?'b-delay':'b-pending';
  return `<span class="badge ${cl}">${s}</span>`;
}
function corridorBadge(s) {
  if (!s) return '';
  const cl = s==='VIP' ? 'b-high' : 'b-low';
  return `<span class="badge ${cl}">${s}</span>`;
}
function fmt(n) { return Number(n||0).toLocaleString('en-IN'); }

function fmtDisplayDate(val) {
  if (!val) return '';
  if (typeof val === 'object' && val instanceof Date) {
    return val.getDate().toString().padStart(2,'0') + '/' +
           (val.getMonth()+1).toString().padStart(2,'0') + '/' +
           val.getFullYear();
  }
  var s = String(val);
  if (s.indexOf('T') > -1 || /^\d{4}-\d{2}-\d{2}/.test(s)) {
    var d = new Date(s);
    if (!isNaN(d.getTime())) {
      var ist = new Date(d.getTime() + (5.5 * 60 * 60 * 1000));
      return ist.getUTCDate().toString().padStart(2,'0') + '/' +
             (ist.getUTCMonth()+1).toString().padStart(2,'0') + '/' +
             ist.getUTCFullYear();
    }
  }
  return s;
}

function toInputDate(val) {
  if (!val) return '';
  var s = String(val);
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(s)) {
    var parts = s.split('/');
    return parts[2] + '-' + parts[1] + '-' + parts[0];
  }
  if (s.indexOf('T') > -1) {
    var d = new Date(s);
    var ist = new Date(d.getTime() + (5.5 * 60 * 60 * 1000));
    return ist.getUTCFullYear() + '-' +
           (ist.getUTCMonth()+1).toString().padStart(2,'0') + '-' +
           ist.getUTCDate().toString().padStart(2,'0');
  }
  return s;
}

// ========== CUSTOMER AUTOFILL (New Order) ==========
let custCache = [];

function loadCustCache() {
  api({ action: 'getCustomers' }, r => {
    custCache = (r.success && r.data) ? r.data : [];
    const dl = document.getElementById('custSuggestions');
    if (dl) dl.innerHTML = custCache.map(c => `<option value="${(c.CompanyName||'').replace(/"/g,'&quot;')}">`).join('');
  });
}

function onCustNameInput() {
  const val = (document.getElementById('o-cust')?.value || '').trim().toLowerCase();
  if (!val) return;
  const match = custCache.find(c => (c.CompanyName||'').trim().toLowerCase() === val);
  if (!match) return;
  const phoneEl = document.getElementById('o-phone');
  const cityEl  = document.getElementById('o-city');
  if (phoneEl && match.Phone) { phoneEl.value = match.Phone; clearErr(phoneEl); }
  if (cityEl && match.City)   { cityEl.value  = match.City;  clearErr(cityEl); }
  toast('Customer details autofill ho gayi ✓');
}

// ========== ORDERS ==========
let allOrders = [], orderFilter = 'all';

function loadOrders() {
  api({ action: 'getOrders' }, r => {
    if (!r.success) { document.getElementById('ordersTable').innerHTML = `<tr><td colspan="13"><div class="empty"><div class="empty-ico">📋</div><div class="empty-txt">No orders found</div></div></td></tr>`; return; }
    let data = r.data || [];
    if (user.role === 'Sales' && user.salesName) {
      data = data.filter(o => (o['Sales Person Name']||'') === user.salesName);
    }
    allOrders = data;
    renderOrders();
  });
}

function renderOrders() {
  let data = allOrders;
  if (orderFilter === 'advance') data = allOrders.filter(o => (o['Order Status']||'').startsWith('Advance'));
  else if (orderFilter === 'pdc') data = allOrders.filter(o => (o['Order Status']||'').startsWith('PDC'));
  else if (orderFilter === 'credit') data = allOrders.filter(o => (o['Order Status']||'').startsWith('Credit'));
  else if (orderFilter === 'dispatched') data = allOrders.filter(o => (o['Order Status']||'').includes('Dispatched'));

  const adv = allOrders.filter(o => (o['Order Status']||'').startsWith('Advance')).length;
  const dis = allOrders.filter(o => (o['Order Status']||'').includes('Dispatched')).length;
  document.getElementById('pc-all').textContent = allOrders.length;
  document.getElementById('pc-adv').textContent = adv;
  document.getElementById('pc-dis').textContent = dis;

  const srch = (document.getElementById('orderSearch').value||'').toLowerCase();
  if (srch) data = data.filter(o => (o['Order ID']||'').toLowerCase().includes(srch) || (o['Customer Name']||'').toLowerCase().includes(srch) || (o['Sales Person Name']||'').toLowerCase().includes(srch));

  if (!data.length) { document.getElementById('ordersTable').innerHTML = `<tr><td colspan="13"><div class="empty"><div class="empty-ico">📋</div><div class="empty-txt">No orders found</div></div></td></tr>`; return; }

  document.getElementById('ordersTable').innerHTML = data.map(o => `
    <tr>
      <td class="td-id">${o['Order ID']||''}</td>
      <td>${fmtDisplayDate(o['Date']||'')}</td>
      <td class="td-bold">${o['Sales Person Name']||''}</td>
      <td class="td-bold">${o['Customer Name']||''}</td>
      <td>${o['City']||''}</td>
      <td style="text-align:right;">${fmt(o['Total Qty'])}</td>
      <td style="font-weight:600;color:var(--accent);">₹${fmt(o['Total Order Value']||0)}</td>
      <td>${o['Payment Mode']||''}</td>
      <td>${orderStatusBadge(o['Order Status'])}</td>
      <td>${payStatusBadge(o['Payment Status'])}</td>
      <td>${corridorBadge(o['Corridor']||o['Priority'])}</td>
      <td>${o['Assigned CRM']||''}</td>
      <td>${o['Final Status'] ? `<span class="badge b-processing">${o['Final Status']}</span>` : '—'}</td>
      <td style="display:flex;gap:4px;">
        <button class="btn btn-sm btn-info" onclick='viewOrder(${JSON.stringify(o)})'>View</button>
        <button class="btn btn-sm btn-success" onclick='openPayDrawer(${JSON.stringify(o)})' title="Payment Slips">💳</button>
      </td>
    </tr>`).join('');
}

function filterOrders(f, el) {
  orderFilter = f;
  document.querySelectorAll('.pipe-node').forEach(n => n.classList.remove('active'));
  if (el) el.classList.add('active');
  renderOrders();
}

function searchOrders() { renderOrders(); }

function viewOrder(o) {
  currentEditOrder = o;
  document.getElementById('detailOrderID').textContent = 'Order: ' + (o['Order ID'] || '');
  const fields = [
    ['Order ID', o['Order ID']], ['Date', fmtDisplayDate(o['Date']||'')], ['Sales Person', o['Sales Person Name']],
    ['Customer Name', o['Customer Name']], ['Customer Phone', o['Customer Phone']], ['City', o['City']],
    ['Total Qty', o['Total Qty']], ['Charger Qty', o['Charger Qty']||'—'],
    ['Total Order Value', o['Total Order Value'] ? '₹'+Number(o['Total Order Value']).toLocaleString('en-IN') : '—'],
    ['Payment Mode', o['Payment Mode']], ['Order Status', o['Order Status']],
    ['Payment Status', o['Payment Status']],
    ['Corridor', o['Corridor']||o['Priority']||'—'],
    ['Suggested Transport', o['Suggested Transport']], ['Plan Dispatch Date', fmtDisplayDate(o['Plan Dispatch Date']||'')],
    ['Transport Charges', o['Transportation Charges']],
    ['Assigned CRM', o['Assigned CRM']], ['Final Status', o['Final Status']], ['Remarks', o['Order Remarks']]
  ];
  document.getElementById('orderDetailBody').innerHTML = `
    <div class="detail-grid">${fields.map(([l,v]) => `<div class="detail-item"><div class="detail-lbl">${l}</div><div class="detail-val">${v||'—'}</div></div>`).join('')}</div>
    <div style="font-size:12px;font-weight:600;color:var(--accent);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:10px;">Order Items</div>
    <div id="detailItems"><div class="loading"><div class="spin"></div></div></div>`;
  openModal('orderDetailModal');
  loadSlips(o['Order ID']);

  api({ action: 'getItemsByOrder', 'Order ID': o['Order ID'] }, r => {
    if (!r.success || !r.data.length) { document.getElementById('detailItems').innerHTML = '<div class="empty"><div class="empty-txt">No items found</div></div>'; return; }
    const batteryItems = r.data.filter(i => (i['Battery Type']||'') !== 'Charger');
    let html = `<table class="items-table"><thead><tr><th>Item ID</th><th>Product Model</th><th>Battery Type</th><th>Price Type</th><th>Qty</th><th>Price/Unit (Ex GST)</th><th>Total (incl. 18% GST)</th><th>CRM</th></tr></thead><tbody>
      ${batteryItems.map(i=>`<tr><td class="td-id">${i['Item ID']||''}</td><td>${i['Product Model']||''}</td><td>${i['Battery Type']||''}</td><td>${i['Price Type']||'—'}</td><td>${i['Qty']||''}</td><td>₹${fmt(i['Price Unit (Excluding GST)'])}</td><td style="font-weight:600;color:var(--accent);">₹${fmt(Math.round(parseFloat(i['Total']||0)*1.18))}</td><td>${i['Assigned CRM']||''}</td></tr>`).join('')}
    </tbody></table>`;
    document.getElementById('detailItems').innerHTML = html;

    api({ action: 'getChargersByOrder', 'Order ID': o['Order ID'] }, cr => {
      if (cr.success && cr.data.length) {
        let chargerHTML = `<div style="margin-top:14px;">
          <div style="font-size:11px;font-weight:600;color:var(--warning);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:8px;">⚡ Charger Details</div>
          <table class="items-table">
            <thead><tr><th>Charger ID</th><th>Model</th><th>Qty</th><th>Price/Unit (₹)</th><th>Total incl. 5% GST (₹)</th><th>Date</th></tr></thead>
            <tbody>
              ${cr.data.map(c => `<tr>
                <td class="td-id">${c['Charger ID']||''}</td>
                <td>${c['Charger Model']||'—'}</td>
                <td>${c['Qty']||''}</td>
                <td>₹${fmt(c['Price/Unit']||0)}</td>
                <td>₹${fmt(c['Total']||0)}</td>
                <td>${fmtDisplayDate(c['Date']||'')}</td>
              </tr>`).join('')}
            </tbody>
          </table>
        </div>`;
        document.getElementById('detailItems').innerHTML += chargerHTML;
      }
    });
  });
}

// ========== ORDER ITEMS LOGIC ==========
let itemRowCount = 1;

function isPerWattMode() { return false; }
function isVAMode() { return true; }

// ========== VALIDATION ==========
function markErr(el) { if (el) el.classList.add('field-error'); }
function clearErr(el) { if (el) el.classList.remove('field-error'); }
function clearErrIds(ids) { ids.forEach(id => clearErr(document.getElementById(id))); }
function isValidPhone(v) { return /^[6-9]\d{9}$/.test((v||'').trim()); }

// Order-level required fields check (Date, Sales Person, Customer Name/Phone/City, Payment Mode, Order Status, Payment Status)
function validateOrderMeta() {
  const fields = [
    ['o-date','Date'],
    ['o-sales','Sales Person'],
    ['o-cust','Customer Name'],
    ['o-phone','Customer Phone'],
    ['o-city','City'],
    ['o-paymode','Payment Mode'],
    ['o-status','Order Status'],
    ['o-paystatus','Payment Status']
  ];
  clearErrIds(fields.map(f => f[0]));
  clearErr(document.getElementById('o-plandispatch'));
  let firstBad = null;
  fields.forEach(([id, label]) => {
    const el = document.getElementById(id);
    const val = (el?.value || '').trim();
    if (!val) { markErr(el); if (!firstBad) firstBad = { el, msg: label + ' zaroori hai' }; }
  });
  const phoneEl  = document.getElementById('o-phone');
  const phoneVal = (phoneEl?.value || '').trim();
  if (phoneVal && !isValidPhone(phoneVal)) {
    markErr(phoneEl);
    if (!firstBad) firstBad = { el: phoneEl, msg: 'Phone number sahi 10-digit number daalo (6-9 se start)' };
  }
  const dateVal     = document.getElementById('o-date')?.value;
  const dispatchVal = document.getElementById('o-plandispatch')?.value;
  if (dateVal && dispatchVal && dispatchVal < dateVal) {
    markErr(document.getElementById('o-plandispatch'));
    if (!firstBad) firstBad = { el: document.getElementById('o-plandispatch'), msg: 'Plan Dispatch Date, Order Date se pehle nahi ho sakti' };
  }
  const planPayVal = document.getElementById('o-planpay')?.value;
  clearErr(document.getElementById('o-planpay'));
  if (dateVal && planPayVal && planPayVal < dateVal) {
    markErr(document.getElementById('o-planpay'));
    if (!firstBad) firstBad = { el: document.getElementById('o-planpay'), msg: 'Plan Payment Date, Order Date se pehle nahi ho sakti' };
  }
  const transEl  = document.getElementById('o-transchg');
  clearErr(transEl);
  if (transEl && transEl.value !== '' && (parseFloat(transEl.value) < 0)) {
    markErr(transEl);
    if (!firstBad) firstBad = { el: transEl, msg: 'Transportation Charges negative nahi ho sakti' };
  }
  if (firstBad) { toast(firstBad.msg, 'e'); firstBad.el?.focus(); return false; }
  return true;
}

// Edit Order modal validation (Customer Name/Phone/City, Payment Mode, Order/Payment Status, dispatch date, transport charges)
function validateEditOrderMeta() {
  const fields = [
    ['e-cust','Customer Name'],
    ['e-phone','Customer Phone'],
    ['e-city','City'],
    ['e-paymode','Payment Mode'],
    ['e-status','Order Status'],
    ['e-paystatus','Payment Status']
  ];
  clearErrIds(fields.map(f => f[0]));
  clearErr(document.getElementById('e-plandispatch'));
  clearErr(document.getElementById('e-transchg'));
  let firstBad = null;
  fields.forEach(([id, label]) => {
    const el = document.getElementById(id);
    const val = (el?.value || '').trim();
    if (!val) { markErr(el); if (!firstBad) firstBad = { el, msg: label + ' zaroori hai' }; }
  });
  const phoneEl  = document.getElementById('e-phone');
  const phoneVal = (phoneEl?.value || '').trim();
  if (phoneVal && !isValidPhone(phoneVal)) {
    markErr(phoneEl);
    if (!firstBad) firstBad = { el: phoneEl, msg: 'Phone number sahi 10-digit number daalo (6-9 se start)' };
  }
  const origDate    = currentEditOrder ? toInputDate(currentEditOrder['Date'] || '') : '';
  const dispatchVal = document.getElementById('e-plandispatch')?.value;
  if (origDate && dispatchVal && dispatchVal < origDate) {
    markErr(document.getElementById('e-plandispatch'));
    if (!firstBad) firstBad = { el: document.getElementById('e-plandispatch'), msg: 'Plan Dispatch Date, Order Date se pehle nahi ho sakti' };
  }
  const transEl = document.getElementById('e-transchg');
  if (transEl && transEl.value !== '' && (parseFloat(transEl.value) < 0)) {
    markErr(transEl);
    if (!firstBad) firstBad = { el: transEl, msg: 'Transportation Charges negative nahi ho sakti' };
  }
  if (firstBad) { toast(firstBad.msg, 'e'); firstBad.el?.focus(); return false; }
  return true;
}

// Item card-level validation used in saveAndAddMore() and submitOrder() last-card flow
function validateItemCard(id, prefix) {
  prefix = prefix || 'im';
  const qtyEl = document.getElementById(`${prefix}-qty-${id}`);
  const qty   = parseFloat(qtyEl?.value) || 0;
  clearErr(qtyEl);
  if (qty <= 0) { markErr(qtyEl); toast('Qty 0 se zyada honi chahiye', 'e'); qtyEl?.focus(); return false; }

  const ptEl = document.getElementById(`${prefix}-pricetype-${id}`);
  const pt   = ptEl?.value || '';
  if (pt === 'Per Watt') {
    const pwEl = document.getElementById(`${prefix}-perwatt-${id}`);
    clearErr(pwEl);
    if ((parseFloat(pwEl?.value)||0) <= 0) { markErr(pwEl); toast('Per Watt Price 0 se zyada honi chahiye', 'e'); pwEl?.focus(); return false; }
  } else {
    const priceEl = document.getElementById(`${prefix}-price-${id}`);
    clearErr(priceEl);
    if ((parseFloat(priceEl?.value)||0) <= 0) { markErr(priceEl); toast('Rate/Unit 0 se zyada hona chahiye', 'e'); priceEl?.focus(); return false; }
  }
  return true;
}

// Charger fields - agar checkbox ticked hai to model+qty+price sab bharna zaroori hai
function validateChargerFields() {
  const checkEl = document.getElementById('chargerCheck');
  if (!checkEl || !checkEl.checked) return true;
  const modelEl = document.getElementById('charger-model');
  const qtyEl   = document.getElementById('charger-qty');
  const priceEl = document.getElementById('charger-price');
  const model = modelEl?.value?.trim();
  const qty   = parseFloat(qtyEl?.value) || 0;
  const price = parseFloat(priceEl?.value) || 0;
  const anyFilled  = model || qty || price;
  const allFilled  = model && qty > 0 && price > 0;
  if (anyFilled && !allFilled) {
    if (!model) markErr(modelEl); else clearErr(modelEl);
    if (qty <= 0) markErr(qtyEl); else clearErr(qtyEl);
    if (price <= 0) markErr(priceEl); else clearErr(priceEl);
    toast('Charger ki saari details bharo (Model, Qty, Price) ya checkbox hata do', 'e');
    return false;
  }
  return true;
}

function markRequired(ids) {
  ids.forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    const grp = el.closest('.form-group');
    const lbl = grp ? grp.querySelector('.form-label') : null;
    if (lbl && !lbl.querySelector('.req-mark')) lbl.innerHTML += ' <span class="req-mark">*</span>';
  });
}

// ========== SAVE + ADD MORE ==========
let currentOrderID = null;
let savedItemsData = [];
let itemSaveInProgress = false;

function saveAndAddMore() {
  const btn = document.getElementById('saveAddMoreBtn');
  const cards = document.querySelectorAll('#itemsBody [id^="item-row-"]');
  if (!cards.length) { toast('Koi item nahi hai', 'e'); return; }
  const card = cards[cards.length - 1];
  const id   = card.id.replace('item-row-', '');

  const model = document.getElementById(`im-model-${id}`)?.value?.trim();
  if (!model) { toast('Product Model bharo pehle (Voltage + Ampere bharo)', 'e'); return; }

  const btype = document.getElementById(`im-btype-${id}`)?.value || '';
  if (!btype) { toast('Battery Type select karo', 'e'); return; }

  const pt      = document.getElementById(`im-pricetype-${id}`)?.value || '';
  if (!pt) { toast('Price Type select karo', 'e'); return; }
  if (!validateItemCard(id, 'im')) return;
  const isDup = savedItemsData.some(it => (it['Product Model']||'').trim().toLowerCase() === model.toLowerCase() && (it['Battery Type']||'') === btype);
  if (isDup) { toast('Yeh item (Model + Battery Type) order mein already add ho chuka hai — Qty badha do uske jagah', 'e'); return; }
  const perWatt = pt === 'Per Watt';
  const volt    = parseFloat(document.getElementById(`im-volt-${id}`)?.value) || 0;
  const amp     = parseFloat(document.getElementById(`im-amp-${id}`)?.value) || 0;
  const pwPrice = perWatt ? (parseFloat(document.getElementById(`im-perwatt-${id}`)?.value) || 0) : 0;
  let pricePerUnit = 0;
  if (perWatt) pricePerUnit = volt * amp * pwPrice;
  else pricePerUnit = parseFloat(document.getElementById(`im-price-${id}`)?.value) || 0;

  const itemData = {
    'Product Model': model,
    'Battery Type':  document.getElementById(`im-btype-${id}`)?.value || '',
    'Qty':           document.getElementById(`im-qty-${id}`)?.value || 0,
    'Price Unit (Excluding GST)': pricePerUnit.toFixed ? pricePerUnit.toFixed(2) : pricePerUnit,
    'Total':         document.getElementById(`im-total-${id}`)?.value || 0,
    'Assigned CRM':  document.getElementById(`im-crm-${id}`)?.value || '',
    'Remarks':       document.getElementById(`im-remarks-${id}`)?.value || '',
    'Voltage':       volt || '',
    'Ampere':        amp || '',
    'Per Watt Price': perWatt ? (document.getElementById(`im-perwatt-${id}`)?.value || '') : '',
    'Price Type':    pt,
    'Warranty':      document.getElementById(`im-warranty-${id}`)?.value || ''
  };

  if (btn) { btn.disabled = true; btn.textContent = 'Saving...'; }
  itemSaveInProgress = true;

  const doSave = (orderID) => {
    api({ action: 'addOrderItem', 'Order ID': orderID, ...itemData }, r => {
      if (r.success) {
        savedItemsData.push({ ...itemData, itemID: r.itemID });
        renderSavedItems();
        card.remove();
        itemRowCount = 0;
        addItemRow();
        if (btn) { btn.disabled = false; btn.textContent = '✓ Save + Add More Item'; }
        itemSaveInProgress = false;
        toast('Item saved!');
        
        setTimeout(() => { document.getElementById('itemsBody')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }, 100);
      } else {
        itemSaveInProgress = false;
        toast(r.message || 'Save failed', 'e');
        if (btn) { btn.disabled = false; btn.textContent = '✓ Save + Add More Item'; }
      }
    });
  };

  if (!currentOrderID) {
    if (!validateOrderMeta()) { itemSaveInProgress = false; if (btn) { btn.disabled = false; btn.textContent = '✓ Save + Add More Item'; } return; }
    const cust = document.getElementById('o-cust').value.trim();
    const todayVal = document.getElementById('o-date')?.value;
    const possibleDup = (allOrders||[]).find(o => (o['Customer Name']||'').trim().toLowerCase() === cust.toLowerCase() && toInputDate(o['Date']||'') === todayVal);
    if (possibleDup) toast(`⚠ ${cust} ka order aaj already hai (${possibleDup['Order ID']}) — duplicate check kar lo`, 'w');

    let totalQty = 0;
    savedItemsData.forEach(i => { totalQty += parseFloat(i['Qty']) || 0; });
    totalQty += parseFloat(document.getElementById(`im-qty-${id}`)?.value) || 0;

    const orderData = {
      action: 'addOrder',
      'Date': document.getElementById('o-date').value,
      'Sales Person Name': document.getElementById('o-sales').value,
      'Customer Name': cust,
      'Customer Phone': document.getElementById('o-phone').value,
      'City': document.getElementById('o-city').value,
      'Total Qty': totalQty,
      'Payment Mode': document.getElementById('o-paymode').value,
      'Plan Payment Date': document.getElementById('o-planpay').value,
      'Order Status': document.getElementById('o-status').value,
      'Payment Status': document.getElementById('o-paystatus').value,
      'Suggested Transport': document.getElementById('o-transport').value,
      'Plan Dispatch Date': document.getElementById('o-plandispatch').value,
      'Order Remarks': document.getElementById('o-remarks').value,
      'Transportation Charges': document.getElementById('o-transchg').value,
      'Priority': document.getElementById('o-priority').value,
      'Corridor': document.getElementById('o-priority').value,
      'Assigned CRM': document.getElementById('o-crm').value,
      'Final Status': document.getElementById('o-finalstatus').value
    };

    api(orderData, r => {
      if (!r.success) {
        itemSaveInProgress = false;
        if (!r.success) { toast(r.message, 'e'); if (btn) { btn.disabled = false; btn.textContent = 'Create Order'; } return; }
        if (btn) { btn.disabled = false; btn.textContent = '✓ Save + Add More Item'; }
        return;
      }
      currentOrderID = r.orderID;
      const badge = document.getElementById('currentOrderBadge');
      if (badge) { badge.style.display = 'inline-flex'; badge.textContent = '📋 ' + currentOrderID; }
      doSave(currentOrderID);
    });
  } else {
    doSave(currentOrderID);
  }
}

function renderSavedItems() {
  const list = document.getElementById('savedItemsList');
  const table = document.getElementById('savedItemsTable');
  if (!list || !table) return;
  if (!savedItemsData.length) { list.style.display = 'none'; return; }
  list.style.display = 'block';
  table.innerHTML = savedItemsData.map((item, i) => `
    <div style="display:flex;align-items:center;justify-content:space-between;padding:8px 14px;border-bottom:1px solid var(--border);">
      <div style="display:flex;align-items:center;gap:10px;">
        <span style="font-size:11px;font-weight:700;color:var(--success);background:var(--success-dim);padding:2px 7px;border-radius:10px;">#${i+1}</span>
        <div>
          <div style="font-size:13px;font-weight:600;color:var(--text);">${item['Product Model']}</div>
          <div style="font-size:11px;color:var(--text3);">${item['Battery Type']||''} | Qty: ${item['Qty']} | ₹${Number(item['Total']||0).toLocaleString('en-IN')}</div>
        </div>
      </div>
      <span style="font-size:11px;color:var(--success);">✓ Saved</span>
    </div>`).join('') + `<div style="padding:6px 14px;font-size:11px;color:var(--text3);">Total ${savedItemsData.length} item(s) saved</div>`;
}

function autoFillCRM() {
  const crmVal = document.getElementById('o-crm').value;
  document.querySelectorAll('[id^="im-crm-"]').forEach(el => { el.value = crmVal; });
}

function addItemRow() {
  itemRowCount++;
  const id     = itemRowCount;
  const crmVal = document.getElementById('o-crm').value;
  const body   = document.getElementById('itemsBody');
  const div    = document.createElement('div');
  div.id = `item-row-${id}`;
  div.style.cssText = 'background:var(--surface);border:1.5px solid var(--border);border-radius:12px;padding:14px 16px 14px 14px;position:relative;transition:border-color 0.15s;overflow:hidden;';

  const btypeOptions = ['2 Wheeler Battery','3 Wheeler Battery','Inverter Battery','Solar Battery','E-Rikshaw Battery']
    .map(o => `<option>${o}</option>`).join('');

  const lbl = (t, req) => `<label style="font-size:10px;font-weight:600;color:var(--text3);text-transform:uppercase;letter-spacing:0.5px;display:block;margin-bottom:5px;">${t}${req ? ' <span class="req-mark">*</span>' : ''}</label>`;

  div.innerHTML = `
    <div style="margin-bottom:10px;">
      <span style="font-size:11px;font-weight:600;color:var(--accent);">New Item</span>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px;">
      <div>${lbl('Product Model')}<input class="form-control" id="im-model-${id}" readonly placeholder="Auto: 48V 20Ah" style="background:var(--accent-dim);color:var(--accent);font-weight:600;font-size:13px;"></div>
      <div>${lbl('Battery Type', true)}<select class="form-control" id="im-btype-${id}" style="font-size:13px;" onchange="autoGST(${id})"><option value="">Select type</option>${btypeOptions}</select></div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px;">
      <div>${lbl('Price Type', true)}
        <select class="form-control" id="im-pricetype-${id}" style="font-size:13px;" onchange="onItemPriceTypeChange(${id})">
          <option value="">Select</option>
          <option>Absolute</option>
          <option>Per Watt</option>
          <option>Last Price</option>
        </select>
      </div>
      <div>${lbl('Voltage (V)')}<input class="form-control" id="im-volt-${id}" type="number" placeholder="48" oninput="calcItemAuto(${id})" style="font-size:13px;"></div>
    </div>
    <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:10px;margin-bottom:10px;">
      <div>${lbl('Ampere (Ah)')}<input class="form-control" id="im-amp-${id}" type="number" placeholder="20" oninput="calcItemAuto(${id})" style="font-size:13px;"></div>
      <div>${lbl('Qty', true)}<input class="form-control" id="im-qty-${id}" type="number" placeholder="0" oninput="calcItemAuto(${id})" style="font-size:13px;"></div>
      <div id="im-pricefield-${id}">
        ${lbl('Rate/Unit (₹)', true)}<input class="form-control" id="im-price-${id}" type="number" placeholder="0" oninput="calcItemAuto(${id})" style="font-size:13px;">
      </div>
      <div id="im-pwfield-${id}" style="display:none;">
        ${lbl('Per Watt Price (₹)', true)}<input class="form-control" id="im-perwatt-${id}" type="number" placeholder="e.g. 12" oninput="calcItemAuto(${id})" style="font-size:13px;">
      </div>
    </div>
    <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:10px;">
      <div>${lbl('Total (₹)')}<input class="form-control" id="im-total-${id}" readonly placeholder="Auto" style="background:var(--success-dim);color:var(--success);font-weight:600;font-size:13px;"></div>
      <div>${lbl('Warranty')}<input class="form-control" id="im-warranty-${id}" placeholder="e.g. 1 Year" style="font-size:13px;"></div>
      <div>${lbl('Assigned CRM')}<input class="form-control" id="im-crm-${id}" value="${crmVal}" placeholder="CRM name" style="font-size:13px;"></div>
      <div>${lbl('Remarks')}<input class="form-control" id="im-remarks-${id}" placeholder="Remarks..." style="font-size:13px;"></div>
    </div>`;

  body.appendChild(div);
}

function removeItemRow(id) {
  const row = document.getElementById(`item-row-${id}`);
  if (row) row.remove();
  updateOrderTotals();
}

function calcItemTotal(id) {
  const qty = parseFloat(document.getElementById(`im-qty-${id}`)?.value) || 0;
  const price = parseFloat(document.getElementById(`im-price-${id}`)?.value) || 0;
  const total = qty * price;
  const totalEl = document.getElementById(`im-total-${id}`);
  if (totalEl) totalEl.value = total ? total.toFixed(2) : '';
  updateOrderTotals();
}

// ========== CHARGER ==========
let savedChargersData = [];

function toggleCharger() {
  const checked = document.getElementById('chargerCheck').checked;
  document.getElementById('chargerFields').style.display = checked ? 'block' : 'none';
}

function calcCharger() {
  const qty   = parseFloat(document.getElementById('charger-qty')?.value) || 0;
  const price = parseFloat(document.getElementById('charger-price')?.value) || 0;
  const total = qty * price * 1.05;
  const el    = document.getElementById('charger-total');
  if (el) el.value = total ? total.toFixed(2) : '';
}

function saveAndAddMoreCharger() {
  const model = document.getElementById('charger-model')?.value?.trim();
  if (!model) { toast('Charger Model bharo', 'e'); return; }
  const qty   = parseFloat(document.getElementById('charger-qty')?.value) || 0;
  if (!qty) { toast('Charger Qty bharo', 'e'); return; }
  const price = parseFloat(document.getElementById('charger-price')?.value) || 0;
  if (!price) { toast('Charger Price bharo', 'e'); return; }
  const total = parseFloat((qty * price * 1.05).toFixed(2));

  savedChargersData.push({ model, qty, price, total });
  renderSavedChargers();

  // Reset fields
  document.getElementById('charger-model').value = '';
  document.getElementById('charger-qty').value   = '';
  document.getElementById('charger-price').value = '';
  document.getElementById('charger-total').value = '';
  toast('Charger saved!');
}

function renderSavedChargers() {
  const list = document.getElementById('savedChargersList');
  if (!list) return;
  if (!savedChargersData.length) { list.style.display = 'none'; return; }
  list.style.display = 'block';
  list.innerHTML = '<div style="padding:6px 14px;background:var(--warning-dim);border-bottom:1px solid var(--warning-b);font-size:11px;font-weight:600;color:var(--warning);text-transform:uppercase;">⚡ Saved Chargers</div>' +
    savedChargersData.map((c, i) => `
      <div style="display:flex;align-items:center;justify-content:space-between;padding:7px 14px;border-bottom:1px solid var(--border);">
        <div>
          <span style="font-size:11px;font-weight:700;color:var(--warning);background:var(--warning-dim);padding:2px 7px;border-radius:10px;">#${i+1}</span>
          <span style="font-size:13px;font-weight:600;color:var(--text);margin-left:8px;">${c.model}</span>
          <span style="font-size:11px;color:var(--text3);margin-left:8px;">Qty: ${c.qty} | ₹${fmt(c.total)}</span>
        </div>
        <span style="font-size:11px;color:var(--success);">✓ Saved</span>
      </div>`).join('') +
    `<div style="padding:5px 14px;font-size:11px;color:var(--text3);">Total ${savedChargersData.length} charger(s)</div>`;
}

function getChargerData() {
  // Abhi current form ka data lo agar kuch fill hai
  const model = document.getElementById('charger-model')?.value?.trim();
  const qty   = parseFloat(document.getElementById('charger-qty')?.value) || 0;
  const price = parseFloat(document.getElementById('charger-price')?.value) || 0;
  if (model && qty && price) {
    return { model, qty, price, total: parseFloat((qty * price * 1.05).toFixed(2)) };
  }
  return null;
}

function getAllChargersData() {
  const allChargers = [...savedChargersData];
  const current = getChargerData();
  if (current) allChargers.push(current);
  return allChargers;
}

function onItemPriceTypeChange(id) {
  const pt      = document.getElementById(`im-pricetype-${id}`)?.value || '';
  const pwField = document.getElementById(`im-pwfield-${id}`);
  const prField = document.getElementById(`im-pricefield-${id}`);
  if (pt === 'Per Watt') {
    if (pwField) pwField.style.display = 'block';
    if (prField) prField.style.display = 'none';
  } else {
    if (pwField) pwField.style.display = 'none';
    if (prField) prField.style.display = 'block';
  }
  calcItemAuto(id);
}

function calcItemAuto(id) {
  const pt   = document.getElementById(`im-pricetype-${id}`)?.value || '';
  const volt = parseFloat(document.getElementById(`im-volt-${id}`)?.value) || 0;
  const amp  = parseFloat(document.getElementById(`im-amp-${id}`)?.value) || 0;
  const qty  = parseFloat(document.getElementById(`im-qty-${id}`)?.value) || 0;

  const modelEl = document.getElementById(`im-model-${id}`);
  if (modelEl && volt && amp) modelEl.value = `${volt}V ${amp}Ah`;

  let total = 0;
  if (pt === 'Per Watt') {
    const pw = parseFloat(document.getElementById(`im-perwatt-${id}`)?.value) || 0;
    total = volt * amp * qty * pw;
  } else {
    const rate = parseFloat(document.getElementById(`im-price-${id}`)?.value) || 0;
    total = qty * rate;
  }

  const totalEl = document.getElementById(`im-total-${id}`);
  if (totalEl) totalEl.value = total ? total.toFixed(2) : '';
  updateOrderTotals();
}

function autoGST(id) { calcVAItem(id); }

function calcVAItem(id) {
  const volt = parseFloat(document.getElementById(`im-volt-${id}`)?.value) || 0;
  const amp  = parseFloat(document.getElementById(`im-amp-${id}`)?.value) || 0;
  const modelEl = document.getElementById(`im-model-${id}`);
  if (modelEl && volt && amp) modelEl.value = `${volt}V ${amp}Ah`;
  calcAbsoluteItem(id);
  updateOrderTotals();
}

function calcAbsoluteItem(id) {
  const qty   = parseFloat(document.getElementById(`im-qty-${id}`)?.value) || 0;
  const rate  = parseFloat(document.getElementById(`im-price-${id}`)?.value) || 0;
  const total = qty * rate;
  const totalEl = document.getElementById(`im-total-${id}`);
  if (totalEl) totalEl.value = total ? total.toFixed(2) : '';
  updateOrderTotals();
}

function updateOrderTotals() {
  let totalQty = 0, totalAmt = 0;
  document.querySelectorAll('[id^="im-qty-"]').forEach(el => {
    const id = el.id.replace('im-qty-', '');
    const row = document.getElementById(`item-row-${id}`);
    if (row) { totalQty += parseFloat(el.value) || 0; totalAmt += parseFloat(document.getElementById(`im-total-${id}`)?.value) || 0; }
  });
  document.getElementById('totalQtyDisplay').textContent = totalQty;
  document.getElementById('totalAmtDisplay').textContent = '₹' + fmt(totalAmt.toFixed(2));
}

function getItemRows() {
  const items = [];
  document.querySelectorAll('[id^="item-row-"]').forEach(row => {
    if (!row.id.startsWith('item-row-')) return;
    const id = row.id.replace('item-row-', '');
    const model = document.getElementById(`im-model-${id}`)?.value?.trim();
    if (model) {
      const pt = document.getElementById(`im-pricetype-${id}`)?.value || '';
      const volt = parseFloat(document.getElementById(`im-volt-${id}`)?.value) || 0;
      const amp  = parseFloat(document.getElementById(`im-amp-${id}`)?.value) || 0;
      let pricePerUnit = 0;
      if (pt === 'Per Watt') {
        const pw = parseFloat(document.getElementById(`im-perwatt-${id}`)?.value) || 0;
        pricePerUnit = volt * amp * pw;
      } else {
        pricePerUnit = parseFloat(document.getElementById(`im-price-${id}`)?.value) || 0;
      }
      items.push({
        'Product Model': model,
        'Battery Type': document.getElementById(`im-btype-${id}`)?.value || '',
        'Qty': document.getElementById(`im-qty-${id}`)?.value || 0,
        'Price Unit (Excluding GST)': pricePerUnit.toFixed ? pricePerUnit.toFixed(2) : pricePerUnit,
        'Total': document.getElementById(`im-total-${id}`)?.value || 0,
        'Assigned CRM': document.getElementById(`im-crm-${id}`)?.value || '',
        'Remarks': document.getElementById(`im-remarks-${id}`)?.value || '',
        'Voltage': volt || '',
        'Ampere': amp || '',
        'Per Watt Price': pt === 'Per Watt' ? (document.getElementById(`im-perwatt-${id}`)?.value || '') : ''
      });
    }
  });
  return items;
}

// Aakhri item card adhoora to nahi? (kuch bhara hai lekin complete nahi)
function hasPartialItemCard() {
  const cards = document.querySelectorAll('#itemsBody [id^="item-row-"]');
  if (!cards.length) return false;
  const card = cards[cards.length - 1];
  const id   = card.id.replace('item-row-', '');

  const model = document.getElementById(`im-model-${id}`)?.value?.trim() || '';
  const btype = document.getElementById(`im-btype-${id}`)?.value || '';
  const pt    = document.getElementById(`im-pricetype-${id}`)?.value || '';
  const volt  = parseFloat(document.getElementById(`im-volt-${id}`)?.value) || 0;
  const amp   = parseFloat(document.getElementById(`im-amp-${id}`)?.value) || 0;
  const qty   = parseFloat(document.getElementById(`im-qty-${id}`)?.value) || 0;
  const price = parseFloat(document.getElementById(`im-price-${id}`)?.value) || 0;
  const pw    = parseFloat(document.getElementById(`im-perwatt-${id}`)?.value) || 0;

  const anyFilled = model || btype || pt || volt || amp || qty || price || pw;
  if (!anyFilled) return false;   // bilkul khaali card = theek hai, skip hoga

  // Kuch bhara hai — to poora complete hona chahiye
  const complete = model && btype && pt && qty > 0 && (pt === 'Per Watt' ? pw > 0 : price > 0);
  return !complete;
}

function submitOrder() {
  const btn = document.getElementById('submitOrderBtn');
  if (btn && btn.disabled) return;
  if (itemSaveInProgress) { toast('Item save ho raha hai — 1 second ruko', 'w'); return; }
  if (hasPartialItemCard()) {
    toast('Aakhri item adhoora bhara hai — pehle poora bharo (ya khaali chhodo), fir Create Order karo', 'e');
    return;
  }

  if (currentOrderID) {
    if (btn) { btn.disabled = true; btn.textContent = 'Creating...'; }
    if (!validateChargerFields()) { if (btn) { btn.disabled = false; btn.textContent = 'Create Order'; } return; }
    const cards = document.querySelectorAll('#itemsBody [id^="item-row-"]');
    const finishOrder = () => {
      const chargers = getAllChargersData();
      if (chargers.length) {
        let pendingC = chargers.length;
        chargers.forEach(charger => {
          api({ action: 'addChargerItem', 'Order ID': currentOrderID, 'Charger Model': charger.model, 'Qty': charger.qty, 'Price/Unit': charger.price, 'Total': charger.total }, () => {
            pendingC--;
            if (pendingC === 0) {
              toast('Order complete: ' + currentOrderID);
              currentOrderID = null; closeModal('orderModal'); resetOrderForm(); loadOrders();
            }
          });
        });
      } else {
        toast('Order complete: ' + currentOrderID);
        currentOrderID = null; closeModal('orderModal'); resetOrderForm(); loadOrders();
      }
    };

    if (cards.length) {
      const card = cards[cards.length - 1];
      const id = card.id.replace('item-row-', '');
      const model = document.getElementById(`im-model-${id}`)?.value?.trim();
      if (model) {
        if (!validateItemCard(id, 'im')) { if (btn) { btn.disabled = false; btn.textContent = 'Create Order'; } return; }
        const btypeChk = document.getElementById(`im-btype-${id}`)?.value || '';
        const isDup = savedItemsData.some(it => (it['Product Model']||'').trim().toLowerCase() === model.toLowerCase() && (it['Battery Type']||'') === btypeChk);
        if (isDup) { toast('Yeh item (Model + Battery Type) order mein already add ho chuka hai — Qty badha do uske jagah', 'e'); if (btn) { btn.disabled = false; btn.textContent = 'Create Order'; } return; }
        if (btn) { btn.disabled = true; btn.textContent = 'Saving...'; }
        const pt = document.getElementById(`im-pricetype-${id}`)?.value || '';
        const volt = parseFloat(document.getElementById(`im-volt-${id}`)?.value) || 0;
        const amp  = parseFloat(document.getElementById(`im-amp-${id}`)?.value) || 0;
        let pricePerUnit = pt === 'Per Watt'
          ? volt * amp * (parseFloat(document.getElementById(`im-perwatt-${id}`)?.value) || 0)
          : parseFloat(document.getElementById(`im-price-${id}`)?.value) || 0;
        const itemData = {
          'Product Model': model,
          'Battery Type': document.getElementById(`im-btype-${id}`)?.value || '',
          'Qty': document.getElementById(`im-qty-${id}`)?.value || 0,
          'Price Unit (Excluding GST)': pricePerUnit.toFixed(2),
          'Total': document.getElementById(`im-total-${id}`)?.value || 0,
          'Assigned CRM': document.getElementById(`im-crm-${id}`)?.value || '',
          'Remarks': document.getElementById(`im-remarks-${id}`)?.value || '',
          'Voltage': volt || '',
          'Ampere': amp || '',
          'Price Type': pt,
          'Warranty': document.getElementById(`im-warranty-${id}`)?.value || ''
        };
        api({ action: 'addOrderItem', 'Order ID': currentOrderID, ...itemData }, () => {
          finishOrder();
        });
        return;
      }
    }
    finishOrder();
    return;
  }

  if (!validateOrderMeta()) return;
  if (!validateChargerFields()) return;
  const cust = document.getElementById('o-cust').value.trim();
  let itemsValid = true;
  const seenCombos = [];
  document.querySelectorAll('[id^="item-row-"]').forEach(row => {
    if (!row.id.startsWith('item-row-') || !itemsValid) return;
    const id = row.id.replace('item-row-', '');
    const model = document.getElementById(`im-model-${id}`)?.value?.trim();
    if (model && !validateItemCard(id, 'im')) { itemsValid = false; return; }
    if (model) {
      const btypeChk = document.getElementById(`im-btype-${id}`)?.value || '';
      const comboKey = model.toLowerCase() + '|' + btypeChk;
      if (seenCombos.includes(comboKey)) { toast('Yeh item (Model + Battery Type) order mein already hai — Qty badha do uske jagah', 'e'); itemsValid = false; return; }
      seenCombos.push(comboKey);
    }
  });
  if (!itemsValid) return;
  const todayVal2 = document.getElementById('o-date')?.value;
  const possibleDup2 = (allOrders||[]).find(o => (o['Customer Name']||'').trim().toLowerCase() === cust.toLowerCase() && toInputDate(o['Date']||'') === todayVal2);
  if (possibleDup2) toast(`⚠ ${cust} ka order aaj already hai (${possibleDup2['Order ID']}) — duplicate check kar lo`, 'w');
  const items = getItemRows();
  if (items.length === 0) { toast('Pehle koi item save karo', 'e'); return; }

  if (btn) { btn.disabled = true; btn.textContent = 'Creating...'; }

  let totalQty = 0;
  document.querySelectorAll('[id^="im-qty-"]').forEach(el => { totalQty += parseFloat(el.value) || 0; });

  const orderData = {
    action: 'addOrder',
    'Date': document.getElementById('o-date').value,
    'Sales Person Name': document.getElementById('o-sales').value,
    'Customer Name': cust,
    'Customer Phone': document.getElementById('o-phone').value,
    'City': document.getElementById('o-city').value,
    'Total Qty': totalQty,
    'Payment Mode': document.getElementById('o-paymode').value,
    'Plan Payment Date': document.getElementById('o-planpay').value,
    'Order Status': document.getElementById('o-status').value,
    'Payment Status': document.getElementById('o-paystatus').value,
    'Suggested Transport': document.getElementById('o-transport').value,
    'Plan Dispatch Date': document.getElementById('o-plandispatch').value,
    'Order Remarks': document.getElementById('o-remarks').value,
    'Transportation Charges': document.getElementById('o-transchg').value,
    'Priority': document.getElementById('o-priority').value,
    'Assigned CRM': document.getElementById('o-crm').value,
    'Final Status': document.getElementById('o-finalstatus').value
  };

  api(orderData, r => {
    if (!r.success) { toast(r.message, 'e'); return; }
    const orderID = r.orderID;
    toast('Order created: ' + orderID);

    if (items.length === 0) { closeModal('orderModal'); resetOrderForm(); loadOrders(); return; }

    let pending = items.length;
    let firstItem = true;
    items.forEach(item => {
      api({ action: 'addOrderItem', 'Order ID': orderID, ...item }, ir => {
        pending--;
        if (firstItem && ir.success) {
          firstItem = false;
          api({ action: 'updateProdItems', 'Order ID': orderID, 'Product Model': item['Product Model'] || '', 'Battery Type': item['Battery Type'] || '' }, () => {});
        }
        if (pending === 0) {
          const charger = getChargerData();
          if (charger) {
            api({ action: 'addChargerItem', 'Order ID': orderID, 'Charger Model': charger.model, 'Qty': charger.qty, 'Price/Unit': charger.price, 'Total': charger.total }, () => { closeModal('orderModal'); resetOrderForm(); loadOrders(); });
          } else {
            closeModal('orderModal'); resetOrderForm(); loadOrders();
          }
        }
      });
    });
  });
}

function resetOrderForm() {
  currentOrderID = null;
  savedItemsData = [];
  document.querySelectorAll('.field-error').forEach(el => el.classList.remove('field-error'));
  const badge = document.getElementById('currentOrderBadge');
  if (badge) badge.style.display = 'none';
  const savedList = document.getElementById('savedItemsList');
  if (savedList) savedList.style.display = 'none';
  const btn = document.getElementById('submitOrderBtn');
  if (btn) { btn.disabled = false; btn.textContent = 'Create Order'; }
  ['o-cust','o-sales'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.disabled = false;
  });
  document.getElementById('perWattField').style.display = 'none';
  savedChargersData = [];
  const savedChargersList = document.getElementById('savedChargersList');
  if (savedChargersList) savedChargersList.style.display = 'none';
  const chargerCheck = document.getElementById('chargerCheck');
  if (chargerCheck) chargerCheck.checked = false;
  document.getElementById('chargerFields').style.display = 'none';
  document.getElementById('charger-model').value = '';
  document.getElementById('charger-qty').value = '';
  document.getElementById('charger-price').value = '';
  document.getElementById('charger-total').value = '';
  ['o-date','o-sales','o-cust','o-phone','o-city','o-paymode','o-planpay',
   'o-status','o-paystatus','o-transport','o-plandispatch','o-transchg',
   'o-crm','o-finalstatus','o-remarks'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  document.getElementById('itemsBody').innerHTML = '';
  itemRowCount = 0;
  addItemRow();
  document.getElementById('totalQtyDisplay').textContent = '0';
  document.getElementById('totalAmtDisplay').textContent = '₹0';
}

// ========== CRM ==========
let allCRM = [];
let crmBilledMap = {};

function loadCRM() {
  api({ action: 'getCRM' }, r => {
    if (!r.success) { document.getElementById('crmTable').innerHTML = `<tr><td colspan="33"><div class="empty"><div class="empty-ico">🎯</div><div class="empty-txt">No CRM records</div></div></td></tr>`; return; }
    allCRM = r.data || [];
    document.getElementById('crm-total').textContent = allCRM.length;
    document.getElementById('crm-prod').textContent = allCRM.filter(c => (c['Current Stage']||'').toLowerCase().includes('production')).length;
    document.getElementById('crm-dispatch').textContent = allCRM.filter(c => (c['Current Stage']||'').toLowerCase().includes('dispatch')).length;
    document.getElementById('crm-paid').textContent = allCRM.filter(c => c['Payment Received Actual']).length;

    // Billings fetch karo
    api({ action: 'getAllBillings' }, br => {
      crmBilledMap = {};
      (br.data || []).forEach(b => {
        const iid = b['Item ID'] || '';
        if (!crmBilledMap[iid]) crmBilledMap[iid] = 0;
        crmBilledMap[iid] += parseFloat(b['Billed Qty']) || 0;
      });
      renderCRM(allCRM);
    });
  });
}

function renderCRM(data) {
  if (!data.length) { document.getElementById('crmTable').innerHTML = '<tr><td colspan="32"><div class="empty"><div class="empty-ico">&#x1F3AF;</div><div class="empty-txt">No records</div></div></td></tr>'; return; }

  // Order wise group karo
  const crmGroups = {};
  const crmSeq = [];
  data.forEach(c => {
    const oid = c['Order ID'] || '';
    if (!crmGroups[oid]) { crmGroups[oid] = []; crmSeq.push(oid); }
    crmGroups[oid].push(c);
  });

  let crmRows = '';
  let crmSr = 1;
  crmSeq.forEach(orderID => {
    const items = crmGroups[orderID];
    const count = items.length;
    const first = items[0];

    items.forEach((c, idx) => {
      const isFirst = idx === 0;
      const bt = (isFirst && crmSr > 1) ? 'border-top:2px solid var(--border2);' : '';

      const orderCells = isFirst ? `
        <td class="td-id" rowspan="${count}" style="vertical-align:middle;${bt}">${orderID}</td>
        <td rowspan="${count}" style="vertical-align:middle;${bt}">${fmtDisplayDate(first['Order Date']||'')}</td>
        <td class="td-bold" rowspan="${count}" style="vertical-align:middle;${bt}">${first['Customer Name']||''}</td>
        <td rowspan="${count}" style="vertical-align:middle;${bt}">${first['Customer No']||''}</td>
        <td rowspan="${count}" style="vertical-align:middle;${bt}">${first['Sales Person']||''}</td>
        <td rowspan="${count}" style="vertical-align:middle;${bt}">${first['Payment Mode']||''}</td>
        <td rowspan="${count}" style="vertical-align:middle;${bt}">${fmtDisplayDate(first['Plan Payment Date']||'')}</td>
        <td rowspan="${count}" style="vertical-align:middle;${bt}">${first['Payment Status']||''}</td>
        <td rowspan="${count}" style="vertical-align:middle;${bt}">${fmtDisplayDate(first['Plan Dispatch Date']||'')}</td>
        <td rowspan="${count}" style="vertical-align:middle;${bt}">
          <button class="btn btn-sm btn-success" onclick='openPaymentModal("${orderID}","${first['Customer Name']||''}")' title="Payments">💰</button>
        </td>
      ` : '';

      crmRows += `<tr>
        <td style="${bt}">${crmSr++}</td>
        <td class="td-id" style="${bt}">${c['Item ID']||''}</td>
        ${orderCells}
        <td style="${bt}">${c['Product Type']||''}</td>
        <td style="${bt}">${c['Product Model']||''}</td>
        <td style="${bt}">${c['Qty']||''}</td>
        <td style="${bt}">${crmBilledMap[c['Item ID']] ? `<span style="color:var(--purple);font-weight:600;">🧾 ${crmBilledMap[c['Item ID']]}</span>` : '—'}</td>
        <td style="${bt}">${fmtDisplayDate(c['Production Start Plan']||'')}</td>
        <td style="${bt}">${fmtDisplayDate(c['Production Start Actual']||'')}</td>
        <td style="${bt}">${fmtDisplayDate(c['Production Complete Plan']||'')}</td>
        <td style="${bt}">${fmtDisplayDate(c['Production Complete Actual']||'')}</td>
        <td style="${bt}">${c['Production Delay']?'<span class="badge b-delay">'+c['Production Delay']+'</span>':''}</td>
        <td style="${bt}">${c['Payment Received Plan']||''}</td>
        <td style="${bt}">${c['Payment Received Actual']||''}</td>
        <td style="${bt}">${c['Payment Delay']?'<span class="badge b-delay">'+c['Payment Delay']+'</span>':''}</td>
        <td style="${bt}">${c['Ready to Dispatch Plan']||''}</td>
        <td style="${bt}">${c['Ready to Dispatch Actual']||''}</td>
        <td style="${bt}">${c['Dispatch Delay']?'<span class="badge b-delay">'+c['Dispatch Delay']+'</span>':''}</td>
        <td style="${bt}">${fmtDisplayDate(c['Billing Docs Actual']||'')}</td>
        <td style="${bt}">${c['Remarks']||''}</td>
        <td style="${bt}"><button class="btn btn-sm btn-warning" onclick='openCRMUpdate(${JSON.stringify(c)})'>Update</button></td>
      </tr>`;
    });
  });
  document.getElementById('crmTable').innerHTML = crmRows;
}

function searchCRM() {
  const q = document.getElementById('crmSearch').value.toLowerCase();
  renderCRM(q ? allCRM.filter(c => (c['Order ID']||'').toLowerCase().includes(q) || (c['Customer Name']||'').toLowerCase().includes(q)) : allCRM);
}

function openCRMUpdate(c) {
  document.getElementById('cu-orderid').value = c['Order ID']||'';
  document.getElementById('cu-stage').value = c['Current Stage']||'';
  document.getElementById('cu-nextstage').value = c['Next Stage']||'';
  document.getElementById('cu-followup').value = c['Follow-up With']||'';
  document.getElementById('cu-ps-plan').value = toInputDate(c['Production Start Plan']||'');
  document.getElementById('cu-ps-actual').value = toInputDate(c['Production Start Actual']||'');
  document.getElementById('cu-pc-plan').value = toInputDate(c['Production Complete Plan']||'');
  document.getElementById('cu-pc-actual').value = toInputDate(c['Production Complete Actual']||'');
  document.getElementById('cu-prod-delay').value = c['Production Delay']||'';
  document.getElementById('cu-pay-plan').value = toInputDate(c['Payment Received Plan']||'');
  document.getElementById('cu-pay-actual').value = toInputDate(c['Payment Received Actual']||'');
  document.getElementById('cu-pay-delay').value = c['Payment Delay']||'';
  document.getElementById('cu-disp-plan').value = toInputDate(c['Ready to Dispatch Plan']||'');
  document.getElementById('cu-disp-actual').value = toInputDate(c['Ready to Dispatch Actual']||'');
  document.getElementById('cu-disp-delay').value = c['Dispatch Delay']||'';
  document.getElementById('cu-remarks').value = c['Remarks']||'';
  openModal('crmUpdateModal');
}

function submitCRMUpdate() {
  var dateFields = ['cu-ps-plan','cu-ps-actual','cu-pc-plan','cu-pc-actual',
                    'cu-pay-plan','cu-pay-actual','cu-disp-plan','cu-disp-actual'];
  var fieldMap = {
    'Current Stage':'cu-stage','Next Stage':'cu-nextstage','Follow-up With':'cu-followup',
    'Production Start Plan':'cu-ps-plan','Production Start Actual':'cu-ps-actual',
    'Production Complete Plan':'cu-pc-plan','Production Complete Actual':'cu-pc-actual',
    'Production Delay':'cu-prod-delay','Payment Received Plan':'cu-pay-plan',
    'Payment Received Actual':'cu-pay-actual','Payment Delay':'cu-pay-delay',
    'Ready to Dispatch Plan':'cu-disp-plan','Ready to Dispatch Actual':'cu-disp-actual',
    'Dispatch Delay':'cu-disp-delay','Remarks':'cu-remarks'
  };
  var params = { action: 'updateCRM', 'Order ID': document.getElementById('cu-orderid').value };
  Object.entries(fieldMap).forEach(([key, id]) => {
    var el = document.getElementById(id);
    if (!el) return;
    var val = el.value;
    if (!val) return;
    if (dateFields.includes(id)) val = fmtDisplayDate(val);
    params[key] = val;
  });
  api(params, r => {
    if (r.success) { toast('CRM updated!'); closeModal('crmUpdateModal'); loadCRM(); }
    else toast(r.message, 'e');
  });
}

// ========== PAYMENTS MODAL ==========
let currentPaymentOrderID = '';
let currentPaymentCustName = '';


function openPaymentModal(orderID, custName) {
  currentPaymentOrderID = orderID;
  currentPaymentCustName = custName;
  document.getElementById('pm-orderid-display').textContent = orderID;
  document.getElementById('pm-cust-display').textContent = custName;
  document.getElementById('pm-amount').value = '';
  document.getElementById('pm-date').value = new Date().toISOString().split('T')[0];
  document.getElementById('pm-mode').value = '';
  document.getElementById('pm-ref').value = '';
  document.getElementById('pm-remarks').value = '';
  document.getElementById('pm-total-received').textContent = '₹0';
  document.getElementById('pm-balance').textContent = '—';
  document.getElementById('pm-orderval-display').textContent = '—';
  openModal('paymentModal');
  const orderData = allOrders.find(o => o['Order ID'] === orderID);
  if (orderData && orderData['Total Order Value']) {
    document.getElementById('pm-orderval-display').textContent = '₹' + fmt(orderData['Total Order Value']);
    loadPaymentsList(orderID);
  } else {
    api({ action: 'getOrders' }, r => {
      const o = (r.data||[]).find(x => x['Order ID'] === orderID);
      if (o) document.getElementById('pm-orderval-display').textContent = '₹' + fmt(o['Total Order Value']||0);
      loadPaymentsList(orderID);
    });
  }
}

function loadPaymentsList(orderID) {
  const el = document.getElementById('pm-payments-list');
  el.innerHTML = '<div class="loading"><div class="spin"></div></div>';
  api({ action: 'getPayments', 'Order ID': orderID }, r => {
    if (!r.success || !r.data.length) {
      el.innerHTML = '<div style="text-align:center;padding:16px;color:var(--text3);font-size:13px;">Koi payment entry nahi abhi</div>';
      document.getElementById('pm-total-received').textContent = '₹0';
      document.getElementById('pm-balance').textContent = document.getElementById('pm-orderval-display').textContent;
      return;
    }
    const total = r.totalReceived || 0;
    document.getElementById('pm-total-received').textContent = '₹' + fmt(total);
    const orderVal = parseFloat((document.getElementById('pm-orderval-display').textContent||'').replace(/[₹,]/g,'')) || 0;
    const balance = orderVal - total;
    document.getElementById('pm-balance').textContent = orderVal ? '₹' + fmt(balance) : '—';
    el.innerHTML = r.data.map(p => `
      <div style="display:flex;align-items:center;justify-content:space-between;padding:10px 12px;border:1px solid var(--border);border-radius:8px;margin-bottom:6px;background:var(--surface);">
        <div style="display:flex;align-items:center;gap:10px;">
          <span style="font-size:18px;">💵</span>
          <div>
            <div style="font-size:13px;font-weight:600;color:var(--success);">₹${fmt(p['Amount']||0)}</div>
            <div style="font-size:11px;color:var(--text3);">${p['Date']||''} · ${p['Mode']||''} ${p['Reference']?'· '+p['Reference']:''}</div>
            ${p['Remarks']?`<div style="font-size:11px;color:var(--text3);">${p['Remarks']}</div>`:''}
          </div>
        </div>
        <span style="font-size:10px;font-family:'JetBrains Mono',monospace;color:var(--text3);">${p['Payment ID']||''}</span>
      </div>`).join('');
  });
}

function submitPayment() {
  const btn = document.getElementById('pm-submit-btn');
  const amount = parseFloat(document.getElementById('pm-amount').value) || 0;
  if (!amount) { toast('Amount bharo', 'e'); return; }
  const mode = document.getElementById('pm-mode').value;
  if (!mode) { toast('Payment mode select karo', 'e'); return; }
  if (btn) { btn.disabled = true; btn.textContent = 'Saving...'; }
  api({
    action: 'addPayment',
    'Order ID': currentPaymentOrderID,
    'Amount': amount,
    'Date': document.getElementById('pm-date').value,
    'Mode': mode,
    'Reference': document.getElementById('pm-ref').value,
    'Remarks': document.getElementById('pm-remarks').value,
    'Added By': user.name || ''
  }, r => {
    if (btn) { btn.disabled = false; btn.textContent = '+ Add Payment'; }
    if (r.success) {
      toast('Payment added!');
      document.getElementById('pm-amount').value = '';
      document.getElementById('pm-ref').value = '';
      document.getElementById('pm-remarks').value = '';
      loadPaymentsList(currentPaymentOrderID);
    } else {
      toast(r.message || 'Failed', 'e');
    }
  });
}

function uploadPaymentSlip(file, orderID, custName, cb) {
  const status = document.getElementById('pm-slip-status');
  const zone   = document.getElementById('pm-slip-zone');
  if (status) { status.style.display = 'block'; status.style.color = 'var(--warning)'; status.textContent = 'Uploading screenshot...'; }
  const ext      = file.name.split('.').pop();
  const fileName = orderID + '_' + (custName||'').replace(/[^a-zA-Z0-9]/g,'') + '_' + Date.now() + '.' + ext;
  const mimeType = file.type || 'image/jpeg';
  api({ action: 'getAccessToken' }, tokenRes => {
    const token = tokenRes?.token || '';
    if (!token) { if (status) { status.style.color = 'var(--error)'; status.textContent = 'Auth error'; } if (cb) cb(); return; }
    api({ action: 'getUploadUrl', orderID, fileName, mimeType }, folderRes => {
      if (!folderRes.success) { if (status) { status.style.color = 'var(--error)'; status.textContent = 'Folder error'; } if (cb) cb(); return; }
      const folderId = folderRes.folderId;
      const meta = JSON.stringify({ name: fileName, parents: [folderId] });
      const form = new FormData();
      form.append('metadata', new Blob([meta], { type: 'application/json' }));
      form.append('file', new Blob([file], { type: mimeType }));
      fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
        method: 'POST', headers: { 'Authorization': 'Bearer ' + token }, body: form
      })
      .then(r => r.json())
      .then(data => {
        if (data.id) {
          fetch('https://www.googleapis.com/drive/v3/files/' + data.id + '/permissions', {
            method: 'POST', headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },
            body: JSON.stringify({ role: 'reader', type: 'anyone' })
          });
          if (status) { status.style.display = 'block'; status.style.color = 'var(--success)'; status.textContent = '✅ Uploaded!'; }
          document.getElementById('pm-slip-input').value = '';
          const nameEl = document.getElementById('pm-slip-name');
          const uploadBtn = document.getElementById('pm-slip-upload-btn');
          if (nameEl) nameEl.textContent = '';
          if (uploadBtn) uploadBtn.style.display = 'none';
        } else {
          if (status) { status.style.color = 'var(--error)'; status.textContent = 'Upload failed'; }
        }
        if (cb) cb();
      })
      .catch(err => { if (status) { status.style.color = 'var(--error)'; status.textContent = err.message; } if (cb) cb(); });
    });
  });
}

function onPmSlipSelect() {
  const file = document.getElementById('pm-slip-input').files[0];
  if (!file) return;
  const nameEl = document.getElementById('pm-slip-name');
  const uploadBtn = document.getElementById('pm-slip-upload-btn');
  const status = document.getElementById('pm-slip-status');
  if (nameEl) nameEl.textContent = file.name;
  if (uploadBtn) uploadBtn.style.display = 'inline-flex';
  if (status) { status.style.display = 'none'; status.textContent = ''; }
}

function uploadPmSlipNow() {
  const file = document.getElementById('pm-slip-input').files[0];
  if (!file) return;
  uploadPaymentSlip(file, currentPaymentOrderID, currentPaymentCustName, () => {});
}

// ========== PRODUCTION ==========
let allProd = [];
function loadProduction() {
  api({ action: 'getProduction' }, r => {
    if (!r.success) { document.getElementById('prodTable').innerHTML = `<tr><td colspan="22"><div class="empty"><div class="empty-ico">⚙️</div><div class="empty-txt">No production records</div></div></td></tr>`; return; }
    allProd = r.data || [];
    document.getElementById('prod-total').textContent = allProd.length;
    document.getElementById('prod-inprog').textContent = allProd.filter(p => p['Status'] === 'In Progress').length;
    document.getElementById('prod-done').textContent = allProd.filter(p => p['Status'] === 'Completed').length;
    document.getElementById('prod-delayed').textContent = allProd.filter(p => p['Status'] === 'Delayed').length;
    if (!allProd.length) { document.getElementById('prodTable').innerHTML = `<tr><td colspan="22"><div class="empty"><div class="empty-ico">⚙️</div><div class="empty-txt">No records yet</div></div></td></tr>`; return; }

    // Billings fetch karo — item level pe billed qty
    api({ action: 'getAllBillings' }, br => {
      const billedMap = {};
      (br.data || []).forEach(b => {
        const iid = b['Item ID'] || '';
        if (!billedMap[iid]) billedMap[iid] = 0;
        billedMap[iid] += parseFloat(b['Billed Qty']) || 0;
      });
      renderProduction(billedMap);
    });
  });
}

function renderProduction(billedMap) {
    billedMap = billedMap || {};
    const prodGroups = {};
    const prodSeq = [];
    allProd.forEach(p => {
      const oid = p['Order ID'] || '';
      if (!prodGroups[oid]) { prodGroups[oid] = []; prodSeq.push(oid); }
      prodGroups[oid].push(p);
    });

    let prodRows = '';
    let prodSr = 1;
    prodSeq.forEach(orderID => {
      const items = prodGroups[orderID];
      const count = items.length;
      const first = items[0];

      items.forEach((p, idx) => {
        const isFirst = idx === 0;
        const bt = (isFirst && prodSr > 1) ? 'border-top:2px solid var(--border2);' : '';
        const statusBadge = `<span class="badge ${p['Status']==='Completed'?'b-ready':p['Status']==='In Progress'?'b-processing':p['Status']==='Delayed'?'b-delay':'b-pending'}">${p['Status']||'Pending'}</span>`;
        const delayBadge  = p['Production Delay'] ? `<span class="badge b-delay">${p['Production Delay']}</span>` : '';

        const orderCells = isFirst ? `
          <td class="td-id" rowspan="${count}" style="vertical-align:middle;${bt}">${orderID}</td>
          <td rowspan="${count}" style="vertical-align:middle;${bt}">${fmtDisplayDate(first['Order Date']||'')}</td>
          <td class="td-bold" rowspan="${count}" style="vertical-align:middle;${bt}">${first['Customer Name']||''}</td>
          <td rowspan="${count}" style="vertical-align:middle;${bt}">${first['Charger Model']||'—'}</td>
          <td rowspan="${count}" style="vertical-align:middle;${bt}">${first['Charger Qty']||'—'}</td>
          <td rowspan="${count}" style="vertical-align:middle;${bt}">${first['Sales Person']||''}</td>
          <td rowspan="${count}" style="vertical-align:middle;${bt}">${first['Assigned CRM']||''}</td>
        ` : '';

        const producedQty = parseFloat(p['Produced Qty']) || 0;
        const totalQty    = parseFloat(p['Qty']) || 0;
        const pendingQty  = parseFloat(p['Pending Qty']) || (totalQty - producedQty);
        const billedQty   = billedMap[p['Item ID']] || 0;
        const qtyDisplay  = producedQty > 0
          ? `<span style="color:var(--success);font-weight:600;">${producedQty}</span>/<span style="font-weight:600;">${totalQty}</span>`
          : `${totalQty}`;
        const pendDisplay = pendingQty > 0
          ? `<span style="color:var(--warning);font-weight:600;">${pendingQty}</span>`
          : `<span style="color:var(--success);font-weight:600;">0 ✅</span>`;
        const billedDisplay = billedQty > 0
          ? `<span style="color:var(--purple);font-weight:600;">🧾 ${billedQty}</span>`
          : `<span style="color:var(--text3);">—</span>`;

        prodRows += `<tr>
          <td style="${bt}">${prodSr++}</td>
          <td class="td-id" style="${bt}">${p['Item ID']||''}</td>
          ${orderCells}
          <td style="${bt}">${p['Sales Remarks']||''}</td>
          <td style="${bt}">${p['Product Model']||''}</td>
          <td style="${bt}">${p['Battery Type']||''}</td>
          <td style="${bt}">${qtyDisplay}</td>
          <td style="${bt}">${pendDisplay}</td>
          <td style="${bt}">${billedDisplay}</td>
          <td style="${bt}">${fmtDisplayDate(p['Production Start Plan']||'')}</td>
          <td style="${bt}">${fmtDisplayDate(p['Production Start Actual']||'')}</td>
          <td style="${bt}">${fmtDisplayDate(p['Production Complete Plan']||'')}</td>
          <td style="${bt}">${fmtDisplayDate(p['Production Complete Actual']||'')}</td>
          <td style="${bt}">${delayBadge}</td>
          <td style="${bt}">${statusBadge}</td>
          <td style="${bt}">${p['Remarks']||''}</td>
          <td style="${bt};white-space:nowrap;">
            <button class="btn btn-sm btn-warning" onclick='openProdUpdate(${JSON.stringify(p)})'>Update</button>
            <button class="btn btn-sm" style="margin-left:6px;background:var(--surface2);border-color:var(--border2);color:var(--text2);" onclick='printProdSlip(${JSON.stringify(p)},${JSON.stringify(first)})'>🖨️ Print</button>
          </td>
        </tr>`;
      });
    });
    document.getElementById('prodTable').innerHTML = prodRows;
}

function openPrintSlip() {
  if (!allProd || !allProd.length) { toast('Pehle Production data load karo', 'w'); return; }

  const todayObj = new Date();
  const yyyy = todayObj.getFullYear();
  const mm = String(todayObj.getMonth()+1).padStart(2,'0');
  const dd = String(todayObj.getDate()).padStart(2,'0');
  const todayISO  = `${yyyy}-${mm}-${dd}`;
  const todayDisp = `${dd}-${mm}-${yyyy}`;

  const todayItems = allProd.filter(p => {
    const sa = toInputDate(p['Production Start Actual'] || '');
    return sa === todayISO;
  });

  if (!todayItems.length) {
    toast(`Aaj (${todayDisp}) ki koi Production Start Actual nahi mili`, 'w');
    return;
  }

  const twoWheeler = todayItems.filter(p => (p['Battery Type']||'').toLowerCase().includes('2 wheeler'));
  const others     = todayItems.filter(p => !(p['Battery Type']||'').toLowerCase().includes('2 wheeler'));

  function buildTable(items, label) {
    if (!items.length) return '';
    const rows = items.map((p, i) => `
      <tr>
        <td>${i+1}</td>
        <td>${p['Order ID']||'—'}</td>
        <td>${p['Item ID']||'—'}</td>
        <td>${p['Product Model']||'—'}</td>
        <td>${p['Battery Type']||'—'}</td>
        <td>${p['Qty']||'—'}</td>
      </tr>`).join('');
    return `
      <div class="section">
        <div class="section-title">${label} <span class="count">${items.length} items</span></div>
        <table>
          <thead><tr><th>#</th><th>Order ID</th><th>Item ID</th><th>Product Model</th><th>Battery Type</th><th>Qty</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>`;
  }

  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8">
  <title>Production Slip — ${todayDisp}</title>
  <style>
    *{margin:0;padding:0;box-sizing:border-box;}
    body{font-family:Arial,sans-serif;padding:18px 22px;color:#111;}
    .header{display:flex;justify-content:space-between;align-items:center;border-bottom:3px solid #1e1b4b;padding-bottom:10px;margin-bottom:16px;}
    .brand{font-size:20px;font-weight:800;color:#1e1b4b;}.brand span{color:#6366f1;}
    .meta{text-align:right;font-size:12px;color:#444;line-height:1.8;}
    .meta strong{font-size:14px;color:#1e1b4b;}
    .no-print{margin-bottom:14px;}
    .no-print button{padding:9px 22px;border-radius:7px;font-size:13px;font-weight:600;cursor:pointer;margin-right:8px;border:none;}
    .btn-print{background:#1e1b4b;color:#fff;}
    .btn-close{background:#f0f0f0;color:#333;border:1px solid #ccc !important;}
    .section{margin-bottom:22px;}
    .section-title{font-size:13px;font-weight:700;color:#1e1b4b;padding:7px 12px;background:#ede9fe;border-left:4px solid #6366f1;border-radius:4px;margin-bottom:8px;display:flex;align-items:center;gap:10px;}
    .count{background:#6366f1;color:#fff;font-size:11px;font-weight:600;padding:2px 9px;border-radius:10px;}
    table{width:100%;border-collapse:collapse;font-size:12px;}
    thead tr{background:#1e1b4b;color:#fff;}
    thead th{padding:8px 10px;text-align:left;font-size:11px;font-weight:600;letter-spacing:0.3px;}
    thead th:last-child{text-align:center;}
    tbody tr:nth-child(even){background:#f7f7fb;}
    tbody td{padding:8px 10px;border-bottom:1px solid #e5e5ef;}
    tbody td:last-child{text-align:center;font-weight:700;font-size:14px;color:#1e1b4b;}
    .footer{margin-top:16px;display:flex;justify-content:space-between;font-size:11px;color:#999;border-top:1px solid #e0e0e0;padding-top:10px;}
    @media print{.no-print{display:none!important;}body{padding:10px 14px;}}
  </style></head><body>

  <div class="header">
    <div>
      <div class="brand">Litpax<span>ERP</span></div>
      <div style="font-size:12px;color:#666;margin-top:2px;">Production Work Order Slip</div>
    </div>
    <div class="meta">
      <strong>📅 ${todayDisp}</strong><br>
      Total Items: <strong>${todayItems.length}</strong>
    </div>
  </div>

  <div class="no-print">
    <button class="btn-print" onclick="window.print()">🖨️ Print</button>
    <button class="btn-close" onclick="window.close()">✕ Close</button>
  </div>

  ${buildTable(twoWheeler, '🛵 2 Wheeler Battery')}
  ${buildTable(others,     '🔋 Other Batteries')}

  <div class="footer">
    <span>Litpax Technology Pvt. Ltd.</span>
    <span>LitpaxERP v3.0 — ${todayDisp}</span>
  </div>
  </body></html>`;

  const win = window.open('', '_blank', 'width=900,height=680');
  win.document.write(html);
  win.document.close();
}

function calcProdQty() {
  const produced = parseFloat(document.getElementById('pu-produced-qty').value) || 0;
  const total    = parseFloat(document.getElementById('pu-total-qty').textContent) || 0;
  const pending  = total - produced;
  document.getElementById('pu-pending-qty').textContent = pending >= 0 ? pending : 0;
}

function openProdUpdate(p) {
  document.getElementById('pu-orderid').value = p['Order ID']||'';
  document.getElementById('pu-itemid').value = p['Item ID']||'';
  document.getElementById('pu-model').value = p['Product Model']||'';
  document.getElementById('pu-btype').value = p['Battery Type']||'';
  document.getElementById('pu-status').value = p['Status']||'Pending';
  document.getElementById('pu-sp').value = toInputDate(p['Production Start Plan']||'');
  document.getElementById('pu-sa').value = toInputDate(p['Production Start Actual']||'');
  document.getElementById('pu-cp').value = toInputDate(p['Production Complete Plan']||'');
  document.getElementById('pu-ca').value = toInputDate(p['Production Complete Actual']||'');
  document.getElementById('pu-delay').value = p['Production Delay']||'';
  document.getElementById('pu-remarks').value = p['Remarks']||'';
  // Produced Qty info
  const totalQty    = parseFloat(p['Qty']) || 0;
  const producedQty = parseFloat(p['Produced Qty']) || 0;
  const pendingQty  = parseFloat(p['Pending Qty']) || (totalQty - producedQty);
  document.getElementById('pu-total-qty').textContent   = totalQty;
  document.getElementById('pu-produced-qty').value = producedQty || '';
  document.getElementById('pu-pending-qty').textContent = pendingQty > 0 ? pendingQty : 0;
  openModal('prodUpdateModal');
}

function submitProdUpdate() {
  const btn = document.getElementById('prodUpdateBtn');
  if (btn) { btn.disabled = true; btn.textContent = 'Updating...'; }

  var itemID  = document.getElementById('pu-itemid').value;
  var orderID = document.getElementById('pu-orderid').value;
  var params  = { action: 'updateProduction', 'Order ID': orderID };
  if (itemID) params['Item ID'] = itemID;

  var dateIds = ['pu-sp','pu-sa','pu-cp','pu-ca'];
  var fields = [
    ['Product Model','pu-model'],['Battery Type','pu-btype'],['Status','pu-status'],
    ['Production Start Plan','pu-sp'],['Production Start Actual','pu-sa'],
    ['Production Complete Plan','pu-cp'],['Production Complete Actual','pu-ca'],
    ['Production Delay','pu-delay'],['Remarks','pu-remarks'],
    ['Produced Qty','pu-produced-qty']
  ];
  fields.forEach(([key, id]) => {
    var el = document.getElementById(id);
    if (!el) return;
    var val = el.value;
    if (!val) return;
    if (dateIds.includes(id)) val = fmtDisplayDate(val);
    params[key] = val;
  });
  var actualStart    = document.getElementById('pu-sa').value;
  var actualComplete = document.getElementById('pu-ca').value;
  if (actualComplete) params['Status'] = 'Completed';
  else if (actualStart) params['Status'] = 'In Progress';

  const resetBtn = () => { if (btn) { btn.disabled = false; btn.textContent = 'Update Production'; } };

  api(params, r => {
    resetBtn();
    if (r.success) {
      const crmParams = { action: 'updateCRM', 'Order ID': orderID };
      if (itemID) crmParams['Item ID'] = itemID;
      if (params['Production Start Plan'])      crmParams['Production Start Plan']      = params['Production Start Plan'];
      if (params['Production Start Actual'])    crmParams['Production Start Actual']    = params['Production Start Actual'];
      if (params['Production Complete Plan'])   crmParams['Production Complete Plan']   = params['Production Complete Plan'];
      if (params['Production Complete Actual']) crmParams['Production Complete Actual'] = params['Production Complete Actual'];
      if (params['Production Delay'])           crmParams['Production Delay']           = params['Production Delay'];
      if (params['Status'] === 'Completed')     crmParams['Current Stage']              = 'Production Complete';
      if (Object.keys(crmParams).length > 2) api(crmParams, () => {});
      toast('Production updated!');
      closeModal('prodUpdateModal');
      loadProduction();
    } else toast(r.message, 'e');
  });
}

// ========== MASTER DATA ==========
function loadCustomers() {
  if (user.role === 'Sales' && user.salesName) {
    const head = document.getElementById('custTableHead');
    if (head) head.innerHTML = '<tr><th>Customer Name</th><th>Contact</th><th>Phone</th><th>GSTIN</th><th>City</th><th>Docs</th></tr>';
    api({ action: 'getCustomers' }, r => {
      let customers = (r.data || []).filter(c => (c['Added By']||'') === user.salesName);
      if (!customers.length) { document.getElementById('custTable').innerHTML = `<tr><td colspan="6"><div class="empty"><div class="empty-ico">👥</div><div class="empty-txt">Koi customer nahi abhi</div></div></td></tr>`; return; }
      document.getElementById('custTable').innerHTML = customers.map(c => `
        <tr>
          <td class="td-bold">${c.CompanyName||''}</td>
          <td>${c.ContactPerson||'—'}</td>
          <td>${c.Phone||'—'}</td>
          <td style="font-family:monospace;font-size:11px;">${c.GSTIN||'—'}</td>
          <td>${c.City||'—'}</td>
          <td><button class="btn btn-sm btn-info" onclick="openCustDocs('${c.CompanyName}')">📎 Docs</button></td>
        </tr>`).join('');
    });
  } else {
    api({ action: 'getCustomers' }, r => {
      if (!r.success || !r.data.length) { document.getElementById('custTable').innerHTML = `<tr><td colspan="7"><div class="empty"><div class="empty-ico">👥</div><div class="empty-txt">No customers</div></div></td></tr>`; return; }
      document.getElementById('custTable').innerHTML = r.data.map(c => `<tr>
        <td class="td-id">${c.CustomerID}</td>
        <td class="td-bold">${c.CompanyName}</td>
        <td>${c.ContactPerson}</td>
        <td>${c.Phone}</td>
        <td style="font-family:monospace;font-size:11px;">${c.GSTIN}</td>
        <td>${c.City}</td>
        <td>${c.CreditDays} days</td>
        <td><button class="btn btn-sm btn-info" onclick="openCustDocs('${c.CompanyName}')">📎 Docs</button></td>
      </tr>`).join('');
    });
  }
}
function submitCust() {
  api({ action:'addCustomer', CompanyName:document.getElementById('c-name').value, ContactPerson:document.getElementById('c-contact').value, Phone:document.getElementById('c-phone').value, GSTIN:document.getElementById('c-gst').value, City:document.getElementById('c-city').value, CreditDays:document.getElementById('c-credit').value, 'Added By': user.salesName || user.name || '' }, r => {
    if (r.success) { toast('Customer added'); closeModal('custModal'); loadCustomers(); } else toast(r.message,'e');
  });
}

function loadProducts() {
  api({ action: 'getProducts' }, r => {
    if (!r.success || !r.data.length) { document.getElementById('productTable').innerHTML = `<tr><td colspan="7"><div class="empty"><div class="empty-ico">⚡</div><div class="empty-txt">No products</div></div></td></tr>`; return; }
    document.getElementById('productTable').innerHTML = r.data.map(p => `<tr><td class="td-id">${p.ProductID}</td><td class="td-bold">${p.ProductName}</td><td>${p.Category}</td><td>₹${fmt(p.SalePrice)}</td><td style="font-family:monospace;font-size:11px;">${p.HSNCode}</td><td>${p.GSTPercent}%</td><td>${p.Unit}</td></tr>`).join('');
  });
}
function submitProduct() {
  api({ action:'addProduct', ProductID:document.getElementById('p-id').value, ProductName:document.getElementById('p-name').value, Category:document.getElementById('p-cat').value, SalePrice:document.getElementById('p-price').value, HSNCode:document.getElementById('p-hsn').value, GSTPercent:document.getElementById('p-gst').value, Unit:document.getElementById('p-unit').value }, r => {
    if (r.success) { toast('Product added'); closeModal('prodModal'); loadProducts(); } else toast(r.message,'e');
  });
}

function loadSuppliers() {
  api({ action: 'getSuppliers' }, r => {
    if (!r.success || !r.data.length) { document.getElementById('suppTable').innerHTML = `<tr><td colspan="6"><div class="empty"><div class="empty-ico">🏭</div><div class="empty-txt">No suppliers</div></div></td></tr>`; return; }
    document.getElementById('suppTable').innerHTML = r.data.map(s => `<tr><td class="td-id">${s.SupplierID}</td><td class="td-bold">${s.CompanyName}</td><td>${s.ContactPerson}</td><td>${s.Phone}</td><td style="font-family:monospace;font-size:11px;">${s.GSTIN}</td><td>${s.City}</td></tr>`).join('');
  });
}
function submitSupp() {
  api({ action:'addSupplier', SupplierID:document.getElementById('s-id').value, CompanyName:document.getElementById('s-name').value, ContactPerson:document.getElementById('s-contact').value, Phone:document.getElementById('s-phone').value, GSTIN:document.getElementById('s-gst').value, City:document.getElementById('s-city').value }, r => {
    if (r.success) { toast('Supplier added'); closeModal('suppModal'); loadSuppliers(); } else toast(r.message,'e');
  });
}

function loadUsers() {
  api({ action: 'getUsers' }, r => {
    if (!r.success || !r.data.length) { document.getElementById('usersTable').innerHTML = `<tr><td colspan="5"><div class="empty"><div class="empty-ico">🔐</div><div class="empty-txt">No users</div></div></td></tr>`; return; }
    document.getElementById('usersTable').innerHTML = r.data.map(u => `<tr><td class="td-id">${u.UserID}</td><td class="td-bold">${u.Name}</td><td>${u.Username}</td><td><span class="badge b-processing">${u.Role}</span></td><td style="color:${u.IsActive===true||u.IsActive==='TRUE'?'var(--success)':'var(--error)'};">${u.IsActive===true||u.IsActive==='TRUE'?'✅ Active':'❌ Inactive'}</td></tr>`).join('');
  });
}
function submitUser() {
  api({ action:'addUser', UserID:document.getElementById('u-id').value, Name:document.getElementById('u-name').value, Username:document.getElementById('u-uname').value, Password:document.getElementById('u-pass').value, Role:document.getElementById('u-role').value, IsActive:true }, r => {
    if (r.success) { toast('User added'); closeModal('userModal'); loadUsers(); } else toast(r.message,'e');
  });
}

// ========== ACCOUNTS ==========
let allAccounts = [];

// orderPayMap: { orderID: { total, balance, orderVal } }
let orderPayMap = {};

function loadAccounts() {
  document.getElementById('accountsTable').innerHTML = '<tr><td colspan="16"><div class="loading"><div class="spin"></div> Loading...</div></td></tr>';
  // Step 1: Accounts data
  api({ action: 'getAccounts' }, r => {
    if (!r.success || !r.data.length) {
      document.getElementById('accountsTable').innerHTML = '<tr><td colspan="16"><div class="empty"><div class="empty-ico">💰</div><div class="empty-txt">No accounts data</div></div></td></tr>';
      return;
    }
    allAccounts = r.data || [];
    const uniqueOrderIDs = [...new Set(allAccounts.map(a => a['Order ID']))];
    const totalQty    = allAccounts.reduce((s,a) => s + (parseFloat(a['Qty'])||0), 0);
    const withCharger = allAccounts.filter(a => a['Charger Qty']).length;
    document.getElementById('acc-total').textContent   = allAccounts.length;
    document.getElementById('acc-orders').textContent  = uniqueOrderIDs.length;
    document.getElementById('acc-qty').textContent     = totalQty;
    document.getElementById('acc-charger').textContent = withCharger;

    // Step 2: Orders data (for Total Value)
    api({ action: 'getOrders' }, or => {
      const ordersData = or.data || [];
      const orderValMap = {};
      ordersData.forEach(o => { orderValMap[o['Order ID']] = parseFloat(o['Total Order Value'])||0; });

      // Step 3: Production data — status + produced/pending qty live fetch
      api({ action: 'getProduction' }, pr => {
        const prodMap = {};
        (pr.data || []).forEach(p => {
          prodMap[p['Item ID']] = {
            status:      p['Status'] || 'Pending',
            producedQty: parseFloat(p['Produced Qty']) || 0,
            pendingQty:  parseFloat(p['Pending Qty'])  || 0
          };
        });
        // Accounts data mein production values merge karo
        allAccounts.forEach(a => {
          const pd = prodMap[a['Item ID']];
          if (pd) {
            a['Produced Qty'] = pd.producedQty;
            a['Pending Qty']  = pd.pendingQty;
          }
        });

        // Step 4: Payments — fetch all unique orders ke payments
        orderPayMap = {};
        let pending = uniqueOrderIDs.length;
        if (!pending) { renderAccounts(allAccounts, prodMap, orderValMap); return; }

        uniqueOrderIDs.forEach(orderID => {
          api({ action: 'getPayments', 'Order ID': orderID }, pr2 => {
            orderPayMap[orderID] = {
              totalReceived: pr2.totalReceived || 0,
              orderVal: orderValMap[orderID] || 0,
              balance: (orderValMap[orderID] || 0) - (pr2.totalReceived || 0)
            };
            pending--;
            if (pending === 0) renderAccounts(allAccounts, prodMap, orderValMap);
          });
        });
      });
    });
  });
}

function renderAccounts(data, prodMap, orderValMap) {
  prodMap = prodMap || {};
  orderValMap = orderValMap || {};
  if (!data.length) {
    document.getElementById('accountsTable').innerHTML = '<tr><td colspan="16"><div class="empty"><div class="empty-ico">💰</div><div class="empty-txt">No records</div></div></td></tr>';
    return;
  }

  // Orders group karo
  const orderGroups = {};
  const orderSeq = [];
  data.forEach(a => {
    const oid = a['Order ID'] || '';
    if (!orderGroups[oid]) { orderGroups[oid] = []; orderSeq.push(oid); }
    orderGroups[oid].push(a);
  });

  let rows = '';
  let sr = 1;
  orderSeq.forEach(orderID => {
    const items   = orderGroups[orderID];
    const count   = items.length;
    const payData = orderPayMap[orderID] || {};
    const orderVal  = payData.orderVal || orderValMap[orderID] || 0;
    const received  = payData.totalReceived || 0;
    const balance   = orderVal - received;
    const balColor  = balance <= 0 ? 'var(--success)' : balance < orderVal ? 'var(--warning)' : 'var(--error)';
    const firstItem = items[0];

    items.forEach((a, idx) => {
      const prodData   = prodMap[a['Item ID']] || {};
      const prodStatus = typeof prodData === 'object' ? (prodData.status || 'Pending') : (prodData || 'Pending');
      const prodBadge  = prodStatus === 'Completed'
        ? '<span class="badge b-ready">✅ Done</span>'
        : prodStatus === 'In Progress'
        ? '<span class="badge b-processing">⚙️ In Progress</span>'
        : prodStatus === 'Delayed'
        ? '<span class="badge b-delay">⚠️ Delayed</span>'
        : '<span class="badge b-pending">⏳ Pending</span>';

      const isFirst = idx === 0;
      const borderTop = isFirst && sr > 1 ? 'border-top:2px solid var(--border2);' : '';

      // Order-level cells sirf pehli row mein (rowspan)
      // Charger info — order level se lo (pehle item se)
      const chargerModel = firstItem['Charger Model'] || '';
      const chargerQty   = firstItem['Charger Qty'] || '';

      const orderCells = isFirst ? `
        <td class="td-id" rowspan="${count}" style="vertical-align:middle;${borderTop}">${orderID}</td>
        <td rowspan="${count}" style="vertical-align:middle;${borderTop}">${fmtDisplayDate(a['Order Date']||'')}</td>
        <td class="td-bold" rowspan="${count}" style="vertical-align:middle;${borderTop}">${a['Customer Name']||''}</td>
        <td rowspan="${count}" style="vertical-align:middle;${borderTop}">${a['Sales Person']||''}</td>
        <td rowspan="${count}" style="vertical-align:middle;${borderTop}">${a['Assigned CRM']||''}</td>
        <td rowspan="${count}" style="font-weight:600;color:var(--accent);vertical-align:middle;${borderTop}">₹${fmt(orderVal)}</td>
        <td rowspan="${count}" style="font-weight:600;color:var(--success);vertical-align:middle;${borderTop}">₹${fmt(received)}</td>
        <td rowspan="${count}" style="font-weight:700;color:${balColor};vertical-align:middle;${borderTop}">₹${fmt(balance)}</td>
        <td rowspan="${count}" style="vertical-align:middle;${borderTop}">${chargerModel || '—'}</td>
        <td rowspan="${count}" style="vertical-align:middle;${borderTop}">${chargerQty || '—'}</td>
        <td rowspan="${count}" style="vertical-align:middle;${borderTop}">
          <button class="btn btn-sm btn-info" onclick='openAccSlipsDrawer("${orderID}","${a['Customer Name']||''}")'>📎 Slips</button>
        </td>
      ` : '';

      const aProd      = parseFloat(a['Produced Qty']) || 0;
      const aTotal     = parseFloat(a['Qty']) || 0;
      const aPending   = parseFloat(a['Pending Qty']) || (aTotal - aProd);
      const aBilledQty = parseFloat(a['Billed Qty']) || 0;
      const aQtyDisp = aProd > 0
        ? `<span style="color:var(--success);font-weight:600;">${aProd}</span>/<span style="font-weight:600;">${aTotal}</span>`
        : `${aTotal}`;
      const aPendDisp = aPending > 0
        ? `<span style="color:var(--warning);font-weight:600;">${aPending}</span>`
        : `<span style="color:var(--success);font-weight:600;">0 ✅</span>`;

      rows += `<tr style="${borderTop}">
        <td style="${borderTop}">${sr++}</td>
        <td class="td-id" style="${borderTop}">${a['Item ID']||''}</td>
        ${orderCells}
        <td style="${borderTop}">${a['Product Model']||''}</td>
        <td style="${borderTop}">${a['Battery Type']||''}</td>
        <td style="${borderTop}">${aQtyDisp}</td>
        <td style="${borderTop}">${aPendDisp}</td>
        <td style="${borderTop};font-weight:600;color:var(--purple);">${aBilledQty > 0 ? aBilledQty : '—'}</td>
        <td style="${borderTop}">${prodBadge}</td>
        <td style="${borderTop}"><button class="btn btn-sm btn-primary" onclick='openBillingModal(${JSON.stringify(a)})'>🧾 Bill</button></td>
      </tr>`;
    });
  });

  document.getElementById('accountsTable').innerHTML = rows;
}

// ========== BILLING ==========
let currentBillingData = {};

function openBillingModal(a) {
  currentBillingData = a;
  document.getElementById('bl-orderid-display').textContent  = a['Order ID'] || '';
  document.getElementById('bl-itemid-display').textContent   = a['Item ID'] || '';
  document.getElementById('bl-product-display').textContent  = a['Product Model'] || '';
  document.getElementById('bl-total-qty').textContent        = a['Qty'] || 0;
  document.getElementById('bl-produced-qty').textContent     = a['Produced Qty'] || 0;
  document.getElementById('bl-invoice-date').value           = new Date().toISOString().split('T')[0];
  document.getElementById('bl-invoice-no').value             = '';
  document.getElementById('bl-billed-qty-input').value       = a['Produced Qty'] || '';
  document.getElementById('bl-invoice-amount').value         = '';
  document.getElementById('bl-remarks').value                = '';
  document.getElementById('bl-billed-qty').textContent       = a['Billed Qty'] || 0;
  openModal('billingModal');
  loadBillingHistory(a['Order ID'], a['Item ID']);
}

function loadBillingHistory(orderID, itemID) {
  const el = document.getElementById('bl-history');
  el.innerHTML = '<div class="loading"><div class="spin"></div></div>';
  api({ action: 'getBillings', 'Order ID': orderID, 'Item ID': itemID }, r => {
    if (!r.success || !r.data.length) {
      el.innerHTML = '<div style="text-align:center;padding:10px;color:var(--text3);font-size:12px;">Koi billing entry nahi abhi</div>';
      return;
    }
    el.innerHTML = '<div style="font-size:11px;font-weight:600;color:var(--text3);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px;">Previous Billings</div>' +
      r.data.map(b => `
        <div style="display:flex;align-items:center;justify-content:space-between;padding:8px 12px;border:1px solid var(--border);border-radius:8px;margin-bottom:5px;background:var(--surface);">
          <div>
            <div style="font-size:12px;font-weight:600;color:var(--text);">Invoice: ${b['Invoice No']||'—'} &nbsp;|&nbsp; Qty: ${b['Billed Qty']||0} &nbsp;|&nbsp; ₹${fmt(b['Invoice Amount']||0)}</div>
            <div style="font-size:11px;color:var(--text3);">${b['Invoice Date']||''} ${b['Remarks']?'· '+b['Remarks']:''}</div>
          </div>
          <span style="font-size:10px;font-family:'JetBrains Mono',monospace;color:var(--text3);">${b['Billing ID']||''}</span>
        </div>`).join('');
  });
}

function submitBilling() {
  const btn = document.getElementById('bl-submit-btn');
  const invoiceNo = document.getElementById('bl-invoice-no').value.trim();
  if (!invoiceNo) { toast('Invoice No bharo', 'e'); return; }
  const billedQty = parseFloat(document.getElementById('bl-billed-qty-input').value) || 0;
  if (!billedQty) { toast('Billed Qty bharo', 'e'); return; }
  const amount = parseFloat(document.getElementById('bl-invoice-amount').value) || 0;
  if (!amount) { toast('Invoice Amount bharo', 'e'); return; }

  if (btn) { btn.disabled = true; btn.textContent = 'Saving...'; }
  api({
    action: 'addBilling',
    'Order ID':       currentBillingData['Order ID'] || '',
    'Item ID':        currentBillingData['Item ID'] || '',
    'Invoice No':     invoiceNo,
    'Invoice Date':   document.getElementById('bl-invoice-date').value,
    'Billed Qty':     billedQty,
    'Invoice Amount': amount,
    'Remarks':        document.getElementById('bl-remarks').value,
    'Added By':       user.name || ''
  }, r => {
    if (btn) { btn.disabled = false; btn.textContent = '🧾 Save Billing'; }
    if (r.success) {
      toast('Billing saved! ' + r.billingID);
      document.getElementById('bl-invoice-no').value    = '';
      document.getElementById('bl-billed-qty-input').value = '';
      document.getElementById('bl-invoice-amount').value = '';
      document.getElementById('bl-remarks').value        = '';
      loadBillingHistory(currentBillingData['Order ID'], currentBillingData['Item ID']);
      loadAccounts();
    } else {
      toast(r.message || 'Failed', 'e');
    }
  });
}

function viewOrderPayments(orderID, custName, orderVal) {
  document.getElementById('vp-orderid').textContent  = orderID;
  document.getElementById('vp-custname').textContent = custName;
  document.getElementById('vp-orderval').textContent = '₹' + fmt(orderVal||0);
  document.getElementById('vp-list').innerHTML = '<div class="loading"><div class="spin"></div></div>';
  document.getElementById('vp-total').textContent   = '₹0';
  document.getElementById('vp-balance').textContent = '—';
  openModal('viewPaymentsModal');
  api({ action: 'getPayments', 'Order ID': orderID }, r => {
    if (!r.success || !r.data.length) {
      document.getElementById('vp-list').innerHTML = '<div style="text-align:center;padding:16px;color:var(--text3);font-size:13px;">Koi payment entry nahi abhi</div>';
      document.getElementById('vp-total').textContent   = '₹0';
      document.getElementById('vp-balance').textContent = '₹' + fmt(orderVal||0);
      return;
    }
    const total   = r.totalReceived || 0;
    const balance = (parseFloat(orderVal)||0) - total;
    document.getElementById('vp-total').textContent   = '₹' + fmt(total);
    document.getElementById('vp-balance').textContent = '₹' + fmt(balance);
    document.getElementById('vp-list').innerHTML = r.data.map(p => `
      <div style="display:flex;align-items:center;justify-content:space-between;padding:10px 12px;border:1px solid var(--border);border-radius:8px;margin-bottom:6px;background:var(--surface);">
        <div style="display:flex;align-items:center;gap:10px;">
          <span style="font-size:18px;">💵</span>
          <div>
            <div style="font-size:13px;font-weight:600;color:var(--success);">₹${fmt(p['Amount']||0)}</div>
            <div style="font-size:11px;color:var(--text3);">${p['Date']||''} · ${p['Mode']||''} ${p['Reference']?'· '+p['Reference']:''}</div>
            ${p['Remarks']?`<div style="font-size:11px;color:var(--text3);">${p['Remarks']}</div>`:''}
          </div>
        </div>
        <span style="font-size:10px;font-family:'JetBrains Mono',monospace;color:var(--text3);">${p['Payment ID']||''}</span>
      </div>`).join('');
  });
}

function searchAccounts() {
  const q = (document.getElementById('accSearch').value||'').toLowerCase();
  if (!q) { loadAccounts(); return; }
  const filtered = allAccounts.filter(a =>
    (a['Order ID']||'').toLowerCase().includes(q) ||
    (a['Customer Name']||'').toLowerCase().includes(q) ||
    (a['Product Model']||'').toLowerCase().includes(q)
  );
  renderAccounts(filtered, {}, {});
}

function logout() { sessionStorage.removeItem('erp_user'); window.location.href = 'index.html'; }

// ========== PAYMENT SLIPS (legacy) ==========
function loadSlips(orderID) {
  const el = document.getElementById('slipsList');
  if (!el) return;
  el.innerHTML = '<div style="font-size:12px;color:var(--text3);">Loading...</div>';
  api({ action: 'getSlips', orderID }, r => {
    if (!r.success) { el.innerHTML = '<div style="font-size:12px;color:var(--text3);">No slips found</div>'; return; }
    if (!r.data.length) { el.innerHTML = '<div style="font-size:12px;color:var(--text3);">No slips uploaded yet</div>'; return; }
    el.innerHTML = r.data.map(s => `
      <div style="display:flex;align-items:center;justify-content:space-between;padding:8px 12px;background:var(--surface2);border:1px solid var(--border);border-radius:8px;margin-bottom:6px;">
        <div>
          <div style="font-size:12px;font-weight:500;color:var(--text);">📎 ${s.name}</div>
          <div style="font-size:11px;color:var(--text3);">Uploaded: ${s.date}</div>
        </div>
        <a href="${s.url}" target="_blank" class="btn btn-sm btn-info" style="text-decoration:none;">View</a>
      </div>`).join('');
  });
}

// ========== ACCOUNTS SLIPS DRAWER ==========
function openAccSlipsDrawer(orderID, custName) {
  document.getElementById('payDrawerTitle').textContent = '📎 ' + orderID + ' Slips';
  document.getElementById('payDrawerSub').textContent   = custName;
  // Hide upload section for accounts role
  const uploadSection = document.getElementById('payUploadZone');
  const uploadStatus  = document.getElementById('payUploadStatus');
  const uploadBtn     = document.getElementById('payUploadBtn');
  const uploadLabel   = uploadBtn ? uploadBtn.parentElement.querySelector('[style*="Upload"]') : null;
  if (user.role === 'Accounts') {
    if (uploadSection) uploadSection.style.display = 'none';
    if (uploadBtn) uploadBtn.style.display = 'none';
    if (uploadStatus) uploadStatus.style.display = 'none';
    // Hide "Upload New Proof" label
    document.querySelectorAll('.pay-drawer-body > div[style*="font-size:11px"]').forEach(el => {
      if (el.textContent.includes('Upload New Proof')) el.style.display = 'none';
    });
  }
  loadPaySlips(orderID, custName);
  document.getElementById('payDrawer').classList.add('open');
  document.getElementById('payDrawerOverlay').classList.add('show');
}

// ========== PAYMENT DRAWER ==========
let currentPayOrder = null;

function openPayDrawerFromDetail() {
  if (!currentEditOrder) return;
  closeModal('orderDetailModal');
  openPayDrawer(currentEditOrder);
}

function openPayDrawer(o) {
  currentPayOrder = o;
  const orderID  = o['Order ID'] || '';
  const custName = o['Customer Name'] || '';
  const total    = o['Total Order Value'] ? '₹' + Number(o['Total Order Value']).toLocaleString('en-IN') : '';
  document.getElementById('payDrawerTitle').textContent = '💳 ' + orderID;
  document.getElementById('payDrawerSub').textContent   = custName + (total ? ' | ' + total : '');
  document.getElementById('paySlipInput').value = '';
  document.getElementById('paySlipNote').value = '';
  document.getElementById('payUploadPrompt').style.display = 'block';
  document.getElementById('payFilePreview').style.display  = 'none';
  document.getElementById('payUploadBtn').disabled = true;
  document.getElementById('payUploadStatus').style.display = 'none';
  document.getElementById('payUploadZone').classList.remove('has-file');
  document.getElementById('payDrawer').classList.add('open');
  document.getElementById('payDrawerOverlay').classList.add('show');
  loadPaySlips(orderID, custName);
}

function closePayDrawer() {
  document.getElementById('payDrawer').classList.remove('open');
  document.getElementById('payDrawerOverlay').classList.remove('show');
  currentPayOrder = null;
}

function loadPaySlips(orderID, custName) {
  const el = document.getElementById('payDrawerSlips');
  el.innerHTML = '<div class="loading"><div class="spin"></div></div>';
  api({ action: 'getSlips', orderID }, r => {
    if (!r.success || !r.data.length) {
      el.innerHTML = '<div style="text-align:center;padding:20px;color:var(--text3);font-size:13px;">No payments uploaded yet</div>';
      return;
    }
    el.innerHTML = r.data.map(s => `
      <div class="slip-item">
        <span class="slip-icon">${s.name.endsWith('.pdf') ? '📄' : '🖼️'}</span>
        <div class="slip-info">
          <div class="slip-name">${s.name}</div>
          <div class="slip-date">${s.date}</div>
          ${s.note ? `<div style="font-size:11px;color:var(--text2);margin-top:3px;padding:4px 8px;background:var(--surface2);border-radius:4px;border-left:2px solid var(--accent);">📝 ${s.note}</div>` : ''}
        </div>
        <a href="${s.url}" target="_blank" class="btn btn-sm btn-info" style="text-decoration:none;flex-shrink:0;">View</a>
      </div>`).join('');
  });
}

function onPaySlipSelect() {
  const file = document.getElementById('paySlipInput').files[0];
  if (!file) return;
  document.getElementById('payUploadPrompt').style.display = 'none';
  document.getElementById('payFilePreview').style.display  = 'block';
  document.getElementById('payFileName').textContent = file.name;
  document.getElementById('payUploadZone').classList.add('has-file');
  document.getElementById('payUploadBtn').disabled = false;
  const thumb = document.getElementById('payFileThumb');
  if (file.type.startsWith('image/')) {
    const reader = new FileReader();
    reader.onload = e => { thumb.innerHTML = `<img src="${e.target.result}" style="max-width:100%;max-height:120px;border-radius:8px;margin:0 auto;display:block;">`; };
    reader.readAsDataURL(file);
  } else {
    thumb.innerHTML = '<div style="font-size:36px;text-align:center;">📄</div>';
  }
}

function uploadPaySlip() {
  const file = document.getElementById('paySlipInput').files[0];
  if (!file || !currentPayOrder) return;
  const orderID  = currentPayOrder['Order ID'] || '';
  const custName = (currentPayOrder['Customer Name'] || '').replace(/[^a-zA-Z0-9]/g, '');
  const ext      = file.name.split('.').pop();
  const fileName = orderID + '_' + custName + '_' + Date.now() + '.' + ext;
  const mimeType = file.type || 'image/jpeg';
  const btn    = document.getElementById('payUploadBtn');
  const status = document.getElementById('payUploadStatus');
  btn.disabled = true; btn.textContent = 'Uploading...';
  status.style.display = 'block'; status.style.color = 'var(--warning)'; status.textContent = '⏳ Uploading...';
  if (file.size > 4 * 1024 * 1024) { status.style.color = 'var(--error)'; status.textContent = '❌ File 4MB se badi hai'; btn.disabled = false; btn.textContent = '⬆ Upload Payment Proof'; return; }

  api({ action: 'getAccessToken' }, tokenRes => {
    const token = tokenRes?.token || '';
    if (!token) { status.style.color = 'var(--error)'; status.textContent = '❌ Auth error'; btn.disabled = false; btn.textContent = '⬆ Upload Payment Proof'; return; }
    api({ action: 'getUploadUrl', orderID, fileName, mimeType }, folderRes => {
      if (!folderRes.success) { status.style.color = 'var(--error)'; status.textContent = '❌ Folder error'; btn.disabled = false; btn.textContent = '⬆ Upload Payment Proof'; return; }
      const folderId = folderRes.folderId;
      const note = (document.getElementById('paySlipNote')?.value || '').trim();
      const meta = JSON.stringify({ name: fileName, parents: [folderId], description: note });
      const form = new FormData();
      form.append('metadata', new Blob([meta], { type: 'application/json' }));
      form.append('file', new Blob([file], { type: mimeType }));
      fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', { method: 'POST', headers: { 'Authorization': 'Bearer ' + token }, body: form })
      .then(r => r.json())
      .then(data => {
        btn.disabled = false; btn.textContent = '⬆ Upload Payment Proof';
        if (data.id) {
          fetch('https://www.googleapis.com/drive/v3/files/' + data.id + '/permissions', { method: 'POST', headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' }, body: JSON.stringify({ role: 'reader', type: 'anyone' }) });
          status.style.color = 'var(--success)'; status.textContent = '✅ Uploaded successfully!';
          document.getElementById('paySlipInput').value = '';
          document.getElementById('paySlipNote').value = '';
          document.getElementById('payUploadPrompt').style.display = 'block';
          document.getElementById('payFilePreview').style.display  = 'none';
          document.getElementById('payUploadZone').classList.remove('has-file');
          btn.disabled = true;
          setTimeout(() => loadPaySlips(orderID, custName), 500);
        } else { status.style.color = 'var(--error)'; status.textContent = '❌ Upload failed'; }
      })
      .catch(err => { btn.disabled = false; btn.textContent = '⬆ Upload Payment Proof'; status.style.color = 'var(--error)'; status.textContent = '❌ ' + err.message; });
    });
  });
}

// ========== CUSTOMER DOCS ==========
let currentCustName = '';

function openCustDocs(custName) {
  currentCustName = custName;
  document.getElementById('custDocsTitle').textContent = '📎 ' + custName + ' — Documents';
  document.getElementById('custDocStatus').style.display = 'none';
  document.getElementById('custDocPreviewWrap').style.display = 'none';
  document.getElementById('custDocFileInput').value = '';
  openModal('custDocsModal');
  loadCustDocs(custName);
}

function loadCustDocs(custName) {
  const el = document.getElementById('custDocsList');
  el.innerHTML = '<div class="loading"><div class="spin"></div></div>';
  api({ action: 'getCustomerDocs', customerName: custName }, r => {
    if (!r.success || !r.data.length) { el.innerHTML = '<div style="font-size:12px;color:var(--text3);text-align:center;padding:12px;">Koi document upload nahi hua abhi</div>'; return; }
    el.innerHTML = r.data.map(d => `
      <div style="display:flex;align-items:center;justify-content:space-between;padding:8px 12px;background:var(--surface2);border:1px solid var(--border);border-radius:8px;margin-bottom:6px;">
        <div>
          <div style="font-size:12px;font-weight:500;color:var(--text);">📄 ${d.name}</div>
          <div style="font-size:11px;color:var(--text3);">Uploaded: ${d.date}</div>
        </div>
        <a href="${d.url}" target="_blank" class="btn btn-sm btn-info" style="text-decoration:none;">View</a>
      </div>`).join('');
  });
}

function previewCustDoc() {
  const file = document.getElementById('custDocFileInput').files[0];
  if (!file) return;
  const wrap = document.getElementById('custDocPreviewWrap');
  const prev = document.getElementById('custDocPreview');
  wrap.style.display = 'block';
  if (file.type.startsWith('image/')) {
    const reader = new FileReader();
    reader.onload = e => { prev.innerHTML = `<img src="${e.target.result}" style="max-width:100%;max-height:120px;border-radius:8px;">`; };
    reader.readAsDataURL(file);
  } else { prev.innerHTML = `<div style="padding:10px;background:var(--surface2);border-radius:8px;font-size:12px;">📄 ${file.name}</div>`; }
  document.getElementById('custDocUploadBtn').style.display = 'inline-flex';
}

function uploadCustDoc() {
  const file = document.getElementById('custDocFileInput').files[0];
  if (!file || !currentCustName) return;
  const status = document.getElementById('custDocStatus');
  const btn    = document.getElementById('custDocUploadBtn');
  status.style.display = 'block'; status.style.color = 'var(--warning)'; status.textContent = '⏳ Uploading...';
  if (btn) { btn.disabled = true; btn.textContent = 'Uploading...'; }
  if (file.size > 4 * 1024 * 1024) { status.style.color = 'var(--error)'; status.textContent = '❌ File 4MB se badi hai'; if (btn) { btn.disabled = false; btn.textContent = '⬆ Upload'; } return; }
  const mimeType     = file.type || 'application/pdf';
  const custFileName = currentCustName.replace(/[^a-zA-Z0-9]/g, '_') + '_' + file.name;
  api({ action: 'getAccessToken' }, tokenRes => {
    const token = tokenRes?.token || '';
    if (!token) { status.style.color = 'var(--error)'; status.textContent = '❌ Token nahi mila'; if (btn) { btn.disabled = false; btn.textContent = '⬆ Upload'; } return; }
    api({ action: 'getCustFolderId' }, folderRes => {
      if (!folderRes.success || !folderRes.folderId) { status.style.color = 'var(--error)'; status.textContent = '❌ Folder error: ' + (folderRes.message || 'Unknown'); if (btn) { btn.disabled = false; btn.textContent = '⬆ Upload'; } return; }
      const folderId = folderRes.folderId;
      const meta = JSON.stringify({ name: custFileName, parents: [folderId] });
      const form = new FormData();
      form.append('metadata', new Blob([meta], { type: 'application/json' }));
      form.append('file', new Blob([file], { type: mimeType }));
      fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', { method: 'POST', headers: { 'Authorization': 'Bearer ' + token }, body: form })
      .then(r => r.json())
      .then(data => {
        if (btn) { btn.disabled = false; btn.textContent = '⬆ Upload'; }
        if (data.id) {
          fetch('https://www.googleapis.com/drive/v3/files/' + data.id + '/permissions', { method: 'POST', headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' }, body: JSON.stringify({ role: 'reader', type: 'anyone' }) });
          status.style.color = 'var(--success)'; status.textContent = '✅ Uploaded!';
          loadCustDocs(currentCustName);
          document.getElementById('custDocFileInput').value = '';
          document.getElementById('custDocPreviewWrap').style.display = 'none';
        } else { status.style.color = 'var(--error)'; status.textContent = '❌ Upload failed: ' + (data.error?.message || JSON.stringify(data)); }
      })
      .catch(err => { if (btn) { btn.disabled = false; btn.textContent = '⬆ Upload'; } status.style.color = 'var(--error)'; status.textContent = '❌ ' + err.message; });
    });
  });
}

// ========== MY DASHBOARD ==========
function loadMyDashboard() {
  const el = document.getElementById('myDashboardContent');
  el.innerHTML = '<div class="loading"><div class="spin"></div> Loading...</div>';
  api({ action: 'getOrders' }, r => {
    let orders = r.data || [];
    if (user.role === 'Sales' && user.salesName) {
      orders = orders.filter(o => (o['Sales Person Name']||'') === user.salesName);
    }
    if (!orders.length) { el.innerHTML = '<div class="empty"><div class="empty-ico">📋</div><div class="empty-txt">Koi orders nahi hain abhi</div></div>'; return; }
    const myOrderIDs = new Set(orders.map(o => o['Order ID']));
    const totalVal   = orders.reduce((s,o) => s + (parseFloat(o['Total Order Value'])||0), 0);
    document.getElementById('my-total').textContent     = orders.length;
    document.getElementById('my-value').textContent     = '₹' + fmt(totalVal);
    document.getElementById('my-dispatched').textContent= orders.filter(o => (o['Order Status']||'').includes('Dispatched') || (o['Order Status']||'').includes('Ready')).length;
    document.getElementById('my-paypending').textContent= orders.filter(o => ['Advance Pending','Pending','Request Full Payment','Credit'].includes(o['Payment Status']||'')).length;
    api({ action: 'getProduction' }, pr => {
      const prodMap = {};
      (pr.data || []).filter(p => myOrderIDs.has(p['Order ID'])).forEach(p => {
        if (!prodMap[p['Order ID']]) prodMap[p['Order ID']] = [];
        prodMap[p['Order ID']].push(p);
      });
      document.getElementById('my-prod').textContent = Object.values(prodMap).flat().filter(p => p['Status'] === 'In Progress').length;
      el.innerHTML = orders.map(o => {
        const oid = o['Order ID'] || '';
        const prods = prodMap[oid] || [];
        const oStatus = o['Order Status'] || '';
        const payStatus = o['Payment Status'] || '';
        let oColor = 'var(--border2)';
        if (oStatus.includes('Dispatched')) oColor = 'var(--accent)';
        else if (oStatus.includes('Ready')) oColor = 'var(--success)';
        else if (oStatus.includes('Processing') || oStatus.includes('Progressing')) oColor = 'var(--info)';
        else if (oStatus.includes('Delay')) oColor = 'var(--error)';
        else if (oStatus.includes('Received')) oColor = 'var(--warning)';
        let payColor = 'var(--text3)';
        if (payStatus === 'Paid') payColor = 'var(--success)';
        else if (payStatus === 'Advance Received') payColor = 'var(--info)';
        else if (['Pending','Advance Pending','Credit','Request Full Payment'].includes(payStatus)) payColor = 'var(--error)';
        const prodHTML = prods.length ? prods.map(p => {
          let pColor = 'var(--border2)', pIcon = '⏳';
          if (p['Status'] === 'Completed') { pColor = 'var(--success)'; pIcon = '✅'; }
          else if (p['Status'] === 'In Progress') { pColor = 'var(--info)'; pIcon = '⚙️'; }
          else if (p['Status'] === 'Delayed') { pColor = 'var(--error)'; pIcon = '⚠️'; }
          const sp = p['Production Start Plan'] ? fmtDisplayDate(p['Production Start Plan']) : '—';
          const sa = p['Production Start Actual'] ? fmtDisplayDate(p['Production Start Actual']) : '—';
          const cp = p['Production Complete Plan'] ? fmtDisplayDate(p['Production Complete Plan']) : '—';
          const ca = p['Production Complete Actual'] ? fmtDisplayDate(p['Production Complete Actual']) : '—';
          return `<div style="display:flex;align-items:flex-start;gap:10px;padding:8px 12px;background:var(--surface2);border-radius:8px;border-left:3px solid ${pColor};margin-bottom:6px;">
            <span style="font-size:16px;margin-top:1px;">${pIcon}</span>
            <div style="flex:1;">
              <div style="font-size:12px;font-weight:600;color:var(--text);">${p['Product Model']||''} <span style="color:var(--text3);font-weight:400;">${p['Battery Type']?'('+p['Battery Type']+')':''}</span> — Qty: ${p['Qty']||''}</div>
              <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px;margin-top:6px;">
                <div style="font-size:10px;color:var(--text3);">Start Plan: <span style="color:var(--text);font-weight:500;">${sp}</span></div>
                <div style="font-size:10px;color:var(--text3);">Start Actual: <span style="color:var(--text);font-weight:500;">${sa}</span></div>
                <div style="font-size:10px;color:var(--text3);">Complete Plan: <span style="color:var(--text);font-weight:500;">${cp}</span></div>
                <div style="font-size:10px;color:var(--text3);">Complete Actual: <span style="color:var(--text);font-weight:500;">${ca}</span></div>
              </div>
              ${p['Production Delay'] ? `<div style="font-size:10px;color:var(--error);margin-top:4px;">⚠ Delay: ${p['Production Delay']}</div>` : ''}
            </div>
            <span style="font-size:10px;font-weight:600;padding:2px 8px;border-radius:8px;background:${pColor}20;color:${pColor};white-space:nowrap;">${p['Status']||'Pending'}</span>
          </div>`;
        }).join('') : '<div style="font-size:12px;color:var(--text3);padding:8px 0;">Production data nahi hai abhi</div>';
        return `<div class="card" style="margin-bottom:14px;border-left:3px solid ${oColor};">
          <div style="padding:12px 16px;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;">
            <div style="display:flex;align-items:center;gap:12px;">
              <span style="font-family:'JetBrains Mono',monospace;font-size:13px;font-weight:600;color:var(--accent);">${oid}</span>
              <span style="font-size:13px;font-weight:600;color:var(--text);">${o['Customer Name']||''}</span>
              <span style="font-size:12px;color:var(--text3);">${o['City']||''}</span>
            </div>
            <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
              <span style="font-size:11px;font-weight:600;padding:3px 10px;border-radius:10px;background:${oColor}15;color:${oColor};">${oStatus}</span>
              <span style="font-size:11px;font-weight:600;padding:3px 10px;border-radius:10px;background:${payColor}15;color:${payColor};">💳 ${payStatus||'—'}</span>
            </div>
          </div>
          <div style="padding:10px 16px;border-bottom:1px solid var(--border);display:flex;flex-wrap:wrap;gap:16px;background:var(--surface2);">
            <div><span style="font-size:10px;color:var(--text3);">DATE </span><span style="font-size:12px;font-weight:500;">${fmtDisplayDate(o['Date']||'')}</span></div>
            <div><span style="font-size:10px;color:var(--text3);">QTY </span><span style="font-size:12px;font-weight:500;">${o['Total Qty']||'0'}</span></div>
            <div><span style="font-size:10px;color:var(--text3);">CHARGER QTY </span><span style="font-size:12px;font-weight:500;">${o['Charger Qty']||'0'}</span></div>
            <div><span style="font-size:10px;color:var(--text3);">VALUE </span><span style="font-size:12px;font-weight:600;color:var(--accent);">₹${fmt(o['Total Order Value']||0)}</span></div>
            <div><span style="font-size:10px;color:var(--text3);">DISPATCH PLAN </span><span style="font-size:12px;font-weight:500;">${fmtDisplayDate(o['Plan Dispatch Date']||'') || '—'}</span></div>
            <div><span style="font-size:10px;color:var(--text3);">PRIORITY </span><span style="font-size:12px;font-weight:500;">${o['Priority']||'—'}</span></div>
          </div>
          <div style="padding:12px 16px;">
            <div style="font-size:10px;font-weight:600;color:var(--text3);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:8px;">⚙️ Production Status</div>
            ${prodHTML}
          </div>
        </div>`;
      }).join('');
    });
  });
}

// ========== EDIT ORDER ==========
let currentEditOrder = null;
let editItemRowCount = 0;

function addEditItemRow(model='', btype='', qty='', price='', total='', crm='', remarks='', isExisting=false, itemID='', volt='', amp='', priceType='', warranty='') {
  editItemRowCount++;
  const id     = 'e' + editItemRowCount;
  const crmVal = crm || document.getElementById('e-crm').value || '';

  const btypeOptions = ['2 Wheeler Battery','3 Wheeler Battery','Inverter Battery','Solar Battery','E-Rikshaw Battery']
    .map(o => `<option ${btype===o?'selected':''}>${o}</option>`).join('');

  const lbl = (t, req) => `<label style="font-size:10px;font-weight:600;color:var(--text3);text-transform:uppercase;letter-spacing:0.5px;display:block;margin-bottom:5px;">${t}${req ? ' <span class="req-mark">*</span>' : ''}</label>`;

  const div = document.createElement('div');
  div.id = `edit-item-row-${id}`;
  div.dataset.existing = isExisting ? 'true' : 'false';
  div.dataset.itemid   = itemID;
  div.style.cssText = 'background:var(--surface);border:1.5px solid var(--border);border-radius:12px;padding:14px 16px;margin-bottom:10px;position:relative;';

  div.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;">
      <span style="font-size:11px;font-weight:600;color:${isExisting?'var(--success)':'var(--accent)'};">${isExisting?'✏️ Existing Item':'New Item'}</span>
      <button class="btn btn-sm btn-danger" onclick="removeEditItemRow('${id}')">✕ Remove</button>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px;">
      <div>${lbl('Product Model')}<input class="form-control" id="eim-model-${id}" value="${model}" readonly placeholder="Auto: 48V 20Ah" style="background:var(--accent-dim);color:var(--accent);font-weight:600;font-size:13px;"></div>
      <div>${lbl('Battery Type', true)}<select class="form-control" id="eim-btype-${id}" style="font-size:13px;"><option value="">Select type</option>${btypeOptions}</select></div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px;">
      <div>${lbl('Price Type', true)}
        <select class="form-control" id="eim-pricetype-${id}" style="font-size:13px;" onchange="onEditItemPriceTypeChange('${id}')">
          <option value="">Select</option>
          <option ${priceType==='Absolute'?'selected':''}>Absolute</option>
          <option ${priceType==='Per Watt'?'selected':''}>Per Watt</option>
          <option ${priceType==='Last Price'?'selected':''}>Last Price</option>
        </select>
      </div>
      <div>${lbl('Voltage (V)')}<input class="form-control" id="eim-volt-${id}" type="number" value="${volt}" placeholder="48" oninput="calcEditItemAuto('${id}')" style="font-size:13px;"></div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px;">
      <div>${lbl('Ampere (Ah)')}<input class="form-control" id="eim-amp-${id}" type="number" value="${amp}" placeholder="20" oninput="calcEditItemAuto('${id}')" style="font-size:13px;"></div>
      <div>${lbl('Qty', true)}<input class="form-control" id="eim-qty-${id}" type="number" value="${qty}" placeholder="0" oninput="calcEditItemAuto('${id}')" style="font-size:13px;"></div>
      <div id="eim-pricefield-${id}">
        ${lbl('Rate/Unit (₹)', true)}<input class="form-control" id="eim-price-${id}" type="number" value="${price}" placeholder="0" oninput="calcEditItemAuto('${id}')" style="font-size:13px;">
      </div>
      <div id="eim-pwfield-${id}" style="display:none;">
        ${lbl('Per Watt Price (₹)', true)}<input class="form-control" id="eim-perwatt-${id}" type="number" placeholder="e.g. 12" oninput="calcEditItemAuto('${id}')" style="font-size:13px;">
      </div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
      <div>${lbl('Total (₹)')}<input class="form-control" id="eim-total-${id}" readonly value="${total}" placeholder="Auto" style="background:var(--success-dim);color:var(--success);font-weight:600;font-size:13px;"></div>
      <div>${lbl('Warranty')}<input class="form-control" id="eim-warranty-${id}" value="${warranty}" placeholder="e.g. 1 Year" style="font-size:13px;"></div>
      <div>${lbl('Assigned CRM')}<input class="form-control" id="eim-crm-${id}" value="${crmVal}" placeholder="CRM name" style="font-size:13px;"></div>
      <div>${lbl('Remarks')}<input class="form-control" id="eim-remarks-${id}" value="${remarks}" placeholder="Remarks..." style="font-size:13px;"></div>
    </div>`;

  document.getElementById('editItemsBody').appendChild(div);

  // Agar priceType set hai to show/hide fields
  if (priceType === 'Per Watt') {
    document.getElementById(`eim-pwfield-${id}`).style.display = 'block';
    document.getElementById(`eim-pricefield-${id}`).style.display = 'none';
  }
}

function removeEditItemRow(id) {
  const row = document.getElementById(`edit-item-row-${id}`);
  if (row) row.remove();
}

function onEditItemPriceTypeChange(id) {
  const pt = document.getElementById(`eim-pricetype-${id}`)?.value || '';
  const pwField = document.getElementById(`eim-pwfield-${id}`);
  const prField = document.getElementById(`eim-pricefield-${id}`);
  if (pt === 'Per Watt') {
    if (pwField) pwField.style.display = 'block';
    if (prField) prField.style.display = 'none';
  } else {
    if (pwField) pwField.style.display = 'none';
    if (prField) prField.style.display = 'block';
  }
  calcEditItemAuto(id);
}

function calcEditItemAuto(id) {
  const pt   = document.getElementById(`eim-pricetype-${id}`)?.value || '';
  const volt = parseFloat(document.getElementById(`eim-volt-${id}`)?.value) || 0;
  const amp  = parseFloat(document.getElementById(`eim-amp-${id}`)?.value) || 0;
  const qty  = parseFloat(document.getElementById(`eim-qty-${id}`)?.value) || 0;

  const modelEl = document.getElementById(`eim-model-${id}`);
  if (modelEl && volt && amp) modelEl.value = `${volt}V ${amp}Ah`;

  let total = 0;
  if (pt === 'Per Watt') {
    const pw = parseFloat(document.getElementById(`eim-perwatt-${id}`)?.value) || 0;
    total = volt * amp * qty * pw;
  } else {
    const rate = parseFloat(document.getElementById(`eim-price-${id}`)?.value) || 0;
    total = qty * rate;
  }
  const totalEl = document.getElementById(`eim-total-${id}`);
  if (totalEl) totalEl.value = total ? total.toFixed(2) : '';
}

function calcEditItemTotal(id) {
  calcEditItemAuto(id);
}

// ========== EDIT ORDER — CHARGER SECTION (dynamically injected) ==========
function ensureEditChargerSection() {
  if (document.getElementById('edit-charger-section')) return;
  const itemsBody = document.getElementById('editItemsBody');
  if (!itemsBody) return;
  const html = `
    <div id="edit-charger-section" style="margin-top:16px;">
      <div style="font-size:11px;font-weight:650;color:var(--text2);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:8px;">⚡ Charger</div>
      <div id="edit-existing-chargers" style="margin-bottom:10px;"></div>
      <div style="background:var(--surface);border:1.5px solid var(--border);border-radius:12px;padding:14px 16px;">
        <div style="font-size:11px;font-weight:600;color:var(--accent);margin-bottom:10px;">+ Add New Charger</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px;">
          <div><label class="form-label">Charger Model</label><input class="form-control" id="ec-model" placeholder="e.g. 48V 5A Charger" style="font-size:13px;margin-top:5px;"></div>
          <div><label class="form-label">Qty</label><input class="form-control" id="ec-qty" type="number" placeholder="0" oninput="calcEditCharger()" style="font-size:13px;margin-top:5px;"></div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
          <div><label class="form-label">Price/Unit (₹)</label><input class="form-control" id="ec-price" type="number" placeholder="0" oninput="calcEditCharger()" style="font-size:13px;margin-top:5px;"></div>
          <div><label class="form-label">Total incl. 5% GST (₹)</label><input class="form-control" id="ec-total" readonly placeholder="Auto" style="background:var(--success-dim);color:var(--success);font-weight:600;font-size:13px;margin-top:5px;"></div>
        </div>
        <button class="btn btn-sm btn-primary" id="ec-save-btn" style="margin-top:10px;" onclick="saveEditCharger()">+ Add Charger to Order</button>
      </div>
    </div>`;
  itemsBody.insertAdjacentHTML('afterend', html);
}

function calcEditCharger() {
  const qty   = parseFloat(document.getElementById('ec-qty')?.value) || 0;
  const price = parseFloat(document.getElementById('ec-price')?.value) || 0;
  const total = qty * price * 1.05;
  const el = document.getElementById('ec-total');
  if (el) el.value = total ? total.toFixed(2) : '';
}

function renderEditChargers(chargers) {
  const el = document.getElementById('edit-existing-chargers');
  if (!el) return;
  if (!chargers.length) { el.innerHTML = '<div style="font-size:12px;color:var(--text3);padding:4px 0 2px;">Koi charger nahi hai is order mein abhi</div>'; return; }
  el.innerHTML = chargers.map(c => `
    <div style="display:flex;align-items:center;justify-content:space-between;padding:8px 12px;border:1px solid var(--border);border-radius:8px;margin-bottom:6px;background:var(--surface2);">
      <div>
        <span style="font-size:12px;font-weight:600;color:var(--text);">${c['Charger Model']||'—'}</span>
        <span style="font-size:11px;color:var(--text3);margin-left:8px;">Qty: ${c['Qty']||0} · ₹${fmt(c['Price/Unit']||0)}/unit · Total ₹${fmt(c['Total']||0)}</span>
      </div>
      <span style="font-size:10px;font-family:'JetBrains Mono',monospace;color:var(--text3);">${c['Charger ID']||''}</span>
    </div>`).join('');
}

function loadEditChargers(orderID) {
  api({ action: 'getChargersByOrder', 'Order ID': orderID }, r => {
    renderEditChargers(r.success ? (r.data || []) : []);
  });
}

function saveEditCharger() {
  const orderID = document.getElementById('e-orderid').value;
  if (!orderID) return;
  const modelEl = document.getElementById('ec-model');
  const qtyEl   = document.getElementById('ec-qty');
  const priceEl = document.getElementById('ec-price');
  const model = modelEl?.value?.trim();
  clearErr(modelEl); clearErr(qtyEl); clearErr(priceEl);
  if (!model) { markErr(modelEl); toast('Charger Model bharo', 'e'); return; }
  const qty = parseFloat(qtyEl?.value) || 0;
  if (qty <= 0) { markErr(qtyEl); toast('Charger Qty 0 se zyada honi chahiye', 'e'); return; }
  const price = parseFloat(priceEl?.value) || 0;
  if (price <= 0) { markErr(priceEl); toast('Charger Price 0 se zyada honi chahiye', 'e'); return; }
  const total = parseFloat((qty * price * 1.05).toFixed(2));
  const btn = document.getElementById('ec-save-btn');
  if (btn) { btn.disabled = true; btn.textContent = 'Saving...'; }
  api({ action: 'addChargerItem', 'Order ID': orderID, 'Charger Model': model, 'Qty': qty, 'Price/Unit': price, 'Total': total }, r => {
    if (btn) { btn.disabled = false; btn.textContent = '+ Add Charger to Order'; }
    if (r.success) {
      toast('Charger order mein add ho gaya!');
      modelEl.value = ''; qtyEl.value = ''; priceEl.value = '';
      document.getElementById('ec-total').value = '';
      loadEditChargers(orderID);
    } else {
      toast(r.message || 'Charger add nahi hua', 'e');
    }
  });
}

function openEditOrder() {
  if (!currentEditOrder) return;
  const o = currentEditOrder;
  ['e-cust','e-phone','e-city','e-paymode','e-status','e-paystatus','e-plandispatch','e-transchg'].forEach(id => clearErr(document.getElementById(id)));
  document.getElementById('e-orderid').value = o['Order ID'] || '';
  document.getElementById('e-cust').value = o['Customer Name'] || '';
  document.getElementById('e-phone').value = o['Customer Phone'] || '';
  document.getElementById('e-city').value = o['City'] || '';
  document.getElementById('e-priority').value = o['Priority'] || '';
  document.getElementById('e-paymode').value = o['Payment Mode'] || '';
  document.getElementById('e-status').value = o['Order Status'] || '';
  document.getElementById('e-paystatus').value = o['Payment Status'] || '';
  document.getElementById('e-transport').value = o['Suggested Transport'] || '';
  document.getElementById('e-plandispatch').value = toInputDate(o['Plan Dispatch Date'] || '');
  document.getElementById('e-transchg').value = o['Transportation Charges'] || '';
  document.getElementById('e-crm').value = o['Assigned CRM'] || '';
  document.getElementById('e-finalstatus').value = o['Final Status'] || '';
  document.getElementById('e-remarks').value = o['Order Remarks'] || '';
  closeModal('orderDetailModal');
  openModal('editOrderModal');
  ensureEditChargerSection();
  ['ec-model','ec-qty','ec-price','ec-total'].forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
  ['ec-model','ec-qty','ec-price'].forEach(id => clearErr(document.getElementById(id)));
  loadEditChargers(o['Order ID']);
  editItemRowCount = 0;
  document.getElementById('editItemsBody').innerHTML = '';
  api({ action: 'getItemsByOrder', 'Order ID': o['Order ID'] }, r => {
    if (r.success && r.data.length) {
      r.data.forEach(item => {
        addEditItemRow(
          item['Product Model']||'',
          item['Battery Type']||'',
          item['Qty']||'',
          item['Price Unit (Excluding GST)']||'',
          item['Total']||'',
          item['Assigned CRM']||'',
          item['Remarks']||'',
          true,
          item['Item ID']||'',
          item['Voltage']||'',
          item['Ampere']||'',
          item['Price Type']||'',
          item['Warranty']||''
        );
      });
    }
    addEditItemRow('','','','','','','', false, '');
  });
}

function submitEditOrder() {
  const orderID = document.getElementById('e-orderid').value;
  if (!orderID) return;
  if (!validateEditOrderMeta()) return;

  const preRows = document.querySelectorAll('[id^="edit-item-row-"]');
  let editItemsValid = true;
  const editSeenCombos = [];
  preRows.forEach(row => {
    if (!editItemsValid) return;
    const id = row.id.replace('edit-item-row-', '');
    const model = document.getElementById(`eim-model-${id}`)?.value?.trim();
    if (!model) return;
    if (!validateItemCard(id, 'eim')) { editItemsValid = false; return; }
    const btypeChk = document.getElementById(`eim-btype-${id}`)?.value || '';
    const comboKey = model.toLowerCase() + '|' + btypeChk;
    if (editSeenCombos.includes(comboKey)) {
      toast('Yeh item (Model + Battery Type) order mein already hai — Qty badha do uske jagah', 'e');
      editItemsValid = false; return;
    }
    editSeenCombos.push(comboKey);
  });
  if (!editItemsValid) return;

  const params = {
    action: 'updateOrder', 'Order ID': orderID,
    'Customer Name': document.getElementById('e-cust').value,
    'Customer Phone': document.getElementById('e-phone').value,
    'City': document.getElementById('e-city').value,
    'Priority': document.getElementById('e-priority').value,
    'Corridor': document.getElementById('e-priority').value,
    'Payment Mode': document.getElementById('e-paymode').value,
    'Order Status': document.getElementById('e-status').value,
    'Payment Status': document.getElementById('e-paystatus').value,
    'Suggested Transport': document.getElementById('e-transport').value,
    'Plan Dispatch Date': fmtDisplayDate(document.getElementById('e-plandispatch').value),
    'Transportation Charges': document.getElementById('e-transchg').value,
    'Assigned CRM': document.getElementById('e-crm').value,
    'Final Status': document.getElementById('e-finalstatus').value,
    'Order Remarks': document.getElementById('e-remarks').value
  };
  const editBtn = document.getElementById('submitEditBtn');
  if (editBtn) { editBtn.disabled = true; editBtn.textContent = 'Saving...'; }

  api(params, r => {
    if (!r.success) { toast(r.message, 'e'); if (editBtn) { editBtn.disabled = false; editBtn.textContent = 'Save Changes'; } return; }
    const allRows = document.querySelectorAll('[id^="edit-item-row-"]');
    const updateTasks = [], addTasks = [];
    allRows.forEach(row => {
      const id = row.id.replace('edit-item-row-', '');
      const model = document.getElementById(`eim-model-${id}`)?.value?.trim();
      if (!model) return;
      const ePT   = document.getElementById(`eim-pricetype-${id}`)?.value || '';
      const eVolt = parseFloat(document.getElementById(`eim-volt-${id}`)?.value) || 0;
      const eAmp  = parseFloat(document.getElementById(`eim-amp-${id}`)?.value) || 0;
      let ePricePerUnit = ePT === 'Per Watt'
        ? eVolt * eAmp * (parseFloat(document.getElementById(`eim-perwatt-${id}`)?.value) || 0)
        : parseFloat(document.getElementById(`eim-price-${id}`)?.value) || 0;

      const itemData = {
        'Product Model': model,
        'Battery Type': document.getElementById(`eim-btype-${id}`)?.value || '',
        'Qty': document.getElementById(`eim-qty-${id}`)?.value || 0,
        'Price Unit (Excluding GST)': ePricePerUnit ? ePricePerUnit.toFixed(2) : (document.getElementById(`eim-price-${id}`)?.value || 0),
        'Total': document.getElementById(`eim-total-${id}`)?.value || 0,
        'Assigned CRM': document.getElementById(`eim-crm-${id}`)?.value || '',
        'Remarks': document.getElementById(`eim-remarks-${id}`)?.value || '',
        'Voltage': eVolt || '',
        'Ampere': eAmp || '',
        'Price Type': ePT,
        'Warranty': document.getElementById(`eim-warranty-${id}`)?.value || ''
      };
      if (row.dataset.existing === 'true' && row.dataset.itemid) updateTasks.push({ ...itemData, 'Item ID': row.dataset.itemid, 'Order ID': orderID });
      else addTasks.push({ ...itemData, 'Order ID': orderID });
    });

    let total = updateTasks.length + addTasks.length;
    let done = 0;
    const finish = () => {
      done++;
      if (done >= total) {
        let totalQty = 0;
        allRows.forEach(row => {
          const id = row.id.replace('edit-item-row-', '');
          const qty = parseFloat(document.getElementById('eim-qty-' + id)?.value) || 0;
          const model = document.getElementById('eim-model-' + id)?.value?.trim();
          if (model) totalQty += qty;
        });
        api({ action: 'updateOrder', 'Order ID': orderID, 'Total Qty': String(totalQty) }, () => {
          toast('Order updated!');
          if (editBtn) { editBtn.disabled = false; editBtn.textContent = 'Save Changes'; }
          closeModal('editOrderModal');
          loadOrders();
        });
      }
    };

    if (total === 0) {
      let totalQty = 0;
      allRows.forEach(row => {
        const id = row.id.replace('edit-item-row-', '');
        const qty = parseFloat(document.getElementById('eim-qty-' + id)?.value) || 0;
        const model = document.getElementById('eim-model-' + id)?.value?.trim();
        if (model) totalQty += qty;
      });
      api({ action: 'updateOrder', 'Order ID': orderID, 'Total Qty': String(totalQty) }, () => {
        toast('Order updated!');
        if (editBtn) { editBtn.disabled = false; editBtn.textContent = 'Save Changes'; }
        closeModal('editOrderModal');
        loadOrders();
      });
      return;
    }

    updateTasks.forEach(item => { api({ action: 'updateOrderItem', ...item }, finish); });
    addTasks.forEach(item => {
      api({ action: 'addOrderItem', ...item }, ir => {
        if (ir.success && currentEditOrder) {
          api({ action: 'updateProdItems', 'Order ID': orderID, 'Product Model': item['Product Model']||'', 'Battery Type': item['Battery Type']||'' }, () => {});
        }
        finish();
      });
    });
  });
}

// ========== SIDEBAR TOGGLE ==========
function toggleSidebar() {
  const sb = document.querySelector('.sidebar');
  const ov = document.getElementById('sidebarOverlay');
  sb.classList.toggle('open');
  ov.classList.toggle('show');
}
function closeSidebar() {
  document.querySelector('.sidebar').classList.remove('open');
  document.getElementById('sidebarOverlay').classList.remove('show');
}
document.querySelectorAll('.nav-item').forEach(el => {
  el.addEventListener('click', () => { if (window.innerWidth <= 768) closeSidebar(); });
});

// ========== INIT ==========
document.getElementById('o-date').value = new Date().toISOString().split('T')[0];

markRequired(['o-date','o-sales','o-cust','o-phone','o-city','o-paymode','o-status','o-paystatus']);
markRequired(['e-cust','e-phone','e-city','e-paymode','e-status','e-paystatus']);

// Field-error class ko auto-clear karo jab user field fix kare
document.addEventListener('input', e => {
  const t = e.target;
  if (t.classList && t.classList.contains('field-error') && t.value && String(t.value).trim()) t.classList.remove('field-error');
});
document.addEventListener('change', e => {
  const t = e.target;
  if (t.classList && t.classList.contains('field-error') && t.value) t.classList.remove('field-error');
});

if (user.role === 'Sales' && user.salesName) {
  const sel = document.getElementById('o-sales');
  if (sel) {
    for (let i = 0; i < sel.options.length; i++) {
      if (sel.options[i].value === user.salesName) {
        sel.selectedIndex = i;
        sel.disabled = true;
        break;
      }
    }
  }
}

loadOrders();
