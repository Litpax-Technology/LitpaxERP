const API = window.GAS_URL;

// AUTH — sessionStorage se, warna localStorage se restore (Lead Tracker se wapas aane pe)
let uStr = sessionStorage.getItem('erp_user');
if (!uStr) {
  const backup = localStorage.getItem('erp_user');
  if (backup) {
    uStr = backup;
    sessionStorage.setItem('erp_user', backup);   // session me wapas daal do
  }
}
if (!uStr) window.location.href = 'index.html';
const user = JSON.parse(uStr || '{}');
document.getElementById('userNm').textContent = user.name || 'User';
document.getElementById('userRl').textContent = user.role || '';
document.getElementById('userAv').textContent = (user.name || 'U')[0].toUpperCase();

// Role access
const roleAccess = {
  Admin:      ['admindashboard','ordertracking','orders','pendingorders','completedorders','crm','production','batteryexchange','dispatch','accounts','customers','products','suppliers','users'],
  Sales:      ['orders','pendingorders','completedorders','customers','mydashboard'],
  Accounts:   ['accounts'],
  Production: ['production','batteryexchange','deliverychallan'],
  CRM:        ['crm','orders','pendingorders','completedorders'],
  Dispatch:   ['dispatch']
};
(function applyRole(){
  const allowed = roleAccess[user.role] || roleAccess['Admin'];

  document.querySelectorAll('.nav-item[id^="nav-"]').forEach(el => {
    const mod = el.id.replace('nav-','');
    el.style.display = allowed.includes(mod) ? 'flex' : 'none';
  });

  // Create Lead button — har Sales user ko dikhega
  const leadBtn = document.getElementById('btnCreateLead');
  if (leadBtn && user.role === 'Sales') leadBtn.style.display = 'inline-flex';

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
  } else if (user.role === 'Production') {
    document.querySelector('.sidebar').style.display = 'flex';
    // Production sirf Production tracker — Sales tabs hata diye, filter Production page ke andar hi hai
    ['sec-sales','sec-master','sec-admin','sec-finance'].forEach(id => {
      const el = document.getElementById(id); if (el) el.style.display = 'none';
    });
  } else if (user.role === 'CRM' || user.role === 'Dispatch') {
    document.querySelector('.sidebar').style.display = 'flex';
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
  } else if (user.role === 'Dispatch') {
    setTimeout(() => nav('dispatch', document.getElementById('nav-dispatch')), 100);
  }
})();

// PAGE META
const pageMeta = {
  admindashboard:{title:'Dashboard',sub:'Admin overview & analytics'},
  ordertracking:{title:'Track Order',sub:'Order ID se poori history'},
  orders:{title:'Sales Orders',sub:'Manage all customer orders'},
  crm:{title:'CRM Tracker',sub:'Order lifecycle tracking'},
    production:{title:'Production',sub:'Production status & updates'},
  batteryexchange:{title:'Advance Battery Replacement',sub:'Warranty battery exchange tracking'},
  dispatch:{title:'Dispatch',sub:'Dispatch queue & delivery tracking'},
  deliverychallan:{title:'Delivery Challan',sub:'Generate & track delivery challans'},
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

function navOrdersFiltered(filter, el) {
  // Orders page hi kholo, par filter set karke
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.getElementById('page-orders').classList.add('active');
  if (el) el.classList.add('active');

  const titles = {
    pending:   { title: 'Pending Orders',   sub: 'Production abhi baaki hai' },
    completed: { title: 'Completed Orders',  sub: 'Production complete ho chuka hai' }
  };
  const m = titles[filter] || {};
  document.getElementById('pageTitle').textContent = m.title || 'Orders';
  document.getElementById('pageSub').textContent = m.sub || '';

  orderFilter = filter;
  loadOrders();   // load hone ke baad renderOrders() filter apply karega

  // pipeline node highlight bhi karo (agar dikh raha hai)
  document.querySelectorAll('#ordersPipeline .pipe-node').forEach(n => n.classList.remove('active'));
  const pipeBtn = document.querySelector(`#ordersPipeline .pipe-node[onclick*="'${filter}'"]`);
  if (pipeBtn) pipeBtn.classList.add('active');
}

function loadPage(id) {
  if (id === 'admindashboard') loadAdminDashboard();
  else if (id === 'ordertracking') loadOrderTracking();
  else if (id === 'orders') loadOrders();
  else if (id === 'crm') loadCRM();
  else if (id === 'production') loadProduction();
  else if (id === 'dispatch') loadDispatch();
  else if (id === 'deliverychallan') loadDeliveryChallan();
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

  // Date object (sheet se direct aata hai kabhi kabhi)
  if (s instanceof Date) return isNaN(s.getTime()) ? 0 : s.getTime();

  const str = String(s).trim();

  // dd/mm/yyyy  ya  dd-mm-yyyy
  let m = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
  if (m) {
    const d = new Date(parseInt(m[3],10), parseInt(m[2],10) - 1, parseInt(m[1],10));
    return d.getTime() || 0;
  }

  // ISO with time (2026-08-21T18:30:00.000Z) — IST me convert karke date nikalo
  if (str.indexOf('T') > -1) {
    const dt = new Date(str);
    if (!isNaN(dt.getTime())) {
      const ist = new Date(dt.getTime() + (5.5 * 60 * 60 * 1000));  // UTC → IST
      return new Date(ist.getUTCFullYear(), ist.getUTCMonth(), ist.getUTCDate()).getTime();
    }
  }

  // yyyy-mm-dd (bina time)
  m = str.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (m) {
    const d = new Date(parseInt(m[1],10), parseInt(m[2],10) - 1, parseInt(m[3],10));
    return d.getTime() || 0;
  }

  // aakhri koshish — jo bhi Date samajh sake
  const d = new Date(str);
  return isNaN(d.getTime()) ? 0 : d.getTime();
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
function closeModal(id) {
  if (id === 'orderModal' && currentOrderID) {
    const ok = confirm(`Order ${currentOrderID} already ban chuka hai (items save ho gaye). Band karoge to order rahega hi — sirf naya item add karna ruk jayega. Band karein?`);
    if (!ok) return;
  }
  document.getElementById(id).classList.remove('show');
  if (id === 'orderModal') resetOrderForm();
}
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

function isOrderCompleted(o) {
  return String(o['Final Status'] || '').toLowerCase().includes('production complete');
}

function renderOrders() {
  let data = allOrders;
  if (orderFilter === 'advance') data = allOrders.filter(o => (o['Order Status']||'').startsWith('Advance'));
  else if (orderFilter === 'pdc') data = allOrders.filter(o => (o['Order Status']||'').startsWith('PDC'));
  else if (orderFilter === 'credit') data = allOrders.filter(o => (o['Order Status']||'').startsWith('Credit'));
  else if (orderFilter === 'dispatched') data = allOrders.filter(o => (o['Order Status']||'').includes('Dispatched'));
  else if (orderFilter === 'completed') data = allOrders.filter(o => isOrderCompleted(o));
  else if (orderFilter === 'pending') data = allOrders.filter(o => !isOrderCompleted(o));

  const adv = allOrders.filter(o => (o['Order Status']||'').startsWith('Advance')).length;
  const dis = allOrders.filter(o => (o['Order Status']||'').includes('Dispatched')).length;
  const completed = allOrders.filter(o => isOrderCompleted(o)).length;
  document.getElementById('pc-all').textContent = allOrders.length;
  document.getElementById('pc-pending').textContent = allOrders.length - completed;
  document.getElementById('pc-completed').textContent = completed;
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
        <button class="btn btn-sm" style="background:var(--accent-dim);color:var(--accent);border-color:var(--accent-b);" onclick='openTrackModal("${o['Order ID']||''}")'>🔍 Track</button>
        <button class="btn btn-sm btn-success" onclick='openPaymentModal("${o['Order ID']||''}","${(o['Customer Name']||'').replace(/"/g,'&quot;')}")' title="Payment Entry">💰</button>
        <button class="btn btn-sm" onclick='openPayDrawer(${JSON.stringify(o)})' title="Payment Slips">💳</button>
        <button class="btn btn-sm" onclick='printOrderRow(${JSON.stringify(o)})' title="Print / PDF">🖨️</button>
        ${(user.role === 'Admin' || user.role === 'Sales') ? `<button class="btn btn-sm btn-danger" onclick='confirmDeleteOrder("${o['Order ID']||''}")' title="Delete Order">🗑️</button>` : ''}
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

// ========== DELETE ORDER (permanent) ==========
let pendingDeleteOrderID = '';

function confirmDeleteOrder(orderID) {
  pendingDeleteOrderID = orderID;
  document.getElementById('del-order-id-display').textContent = orderID;
  document.getElementById('del-order-id-input').value = '';
  document.getElementById('del-order-btn').disabled = true;
  openModal('deleteOrderModal');
}

function onDeleteOrderIdInput() {
  const val = document.getElementById('del-order-id-input').value.trim();
  document.getElementById('del-order-btn').disabled = (val !== pendingDeleteOrderID);
}

function submitDeleteOrder() {
  const typed = document.getElementById('del-order-id-input').value.trim();
  if (typed !== pendingDeleteOrderID) { toast('Order ID match nahi kar raha', 'e'); return; }
  const btn = document.getElementById('del-order-btn');
  btn.disabled = true; btn.textContent = 'Deleting...';
  api({ action: 'deleteOrder', 'Order ID': pendingDeleteOrderID }, r => {
    btn.textContent = '🗑️ Delete Permanently';
    if (r.success) {
      toast('Order deleted: ' + pendingDeleteOrderID);
      closeModal('deleteOrderModal');
      pendingDeleteOrderID = '';
      loadOrders();
    } else {
      btn.disabled = false;
      toast(r.message || 'Delete failed', 'e');
    }
  });
}

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
      'Billing Address': document.getElementById('o-billing').value,
      'Shipping Address': document.getElementById('o-shipping').value,
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
    'Billing Address': document.getElementById('o-billing').value,
    'Shipping Address': document.getElementById('o-shipping').value,
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
  'o-crm','o-finalstatus','o-remarks','o-billing','o-shipping'].forEach(id => {
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
  api({ action: 'getCRMBundle' }, r => {
    if (!r.success) { document.getElementById('crmTable').innerHTML = `<tr><td colspan="33"><div class="empty"><div class="empty-ico">🎯</div><div class="empty-txt">No CRM records</div></div></td></tr>`; return; }
    allCRM = r.crm || [];
    document.getElementById('crm-total').textContent = allCRM.length;
    document.getElementById('crm-prod').textContent = allCRM.filter(c => (c['Current Stage']||'').toLowerCase().includes('production')).length;
    document.getElementById('crm-dispatch').textContent = allCRM.filter(c => (c['Current Stage']||'').toLowerCase().includes('dispatch')).length;
    document.getElementById('crm-paid').textContent = allCRM.filter(c => c['Payment Received Actual']).length;
    crmBilledMap = r.billed || {};
    renderCRM(allCRM);
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
        <div style="display:flex;align-items:center;gap:8px;">
          <span style="font-size:10px;font-family:'JetBrains Mono',monospace;color:var(--text3);">${p['Payment ID']||''}</span>
          <button class="btn btn-sm btn-danger" title="Delete payment" onclick="deletePayment('${p['Payment ID']||''}','${orderID}','${fmt(p['Amount']||0)}')">🗑️</button>
        </div>
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

function deletePayment(paymentID, orderID, amountLabel) {
  if (!paymentID) { toast('Payment ID nahi mila', 'e'); return; }
  if (!confirm(`Payment ₹${amountLabel} (${paymentID}) delete karein? Ye wapas nahi hoga.`)) return;
  api({ action: 'deletePayment', 'Payment ID': paymentID, 'Order ID': orderID }, r => {
    if (r.success) {
      toast('Payment deleted');
      loadPaymentsList(orderID);   // list + Total Received + Balance refresh
    } else {
      toast(r.message || 'Delete failed', 'e');
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
// ========== PRODUCTION ==========
let allProd = [], prodFilter = 'all', prodBilledMap = {};

function prodLiveStatus(p) {
  const t = parseFloat(p['Qty']) || 0, q = parseFloat(p['Produced Qty']) || 0;
  return (t > 0 && q >= t) ? 'Completed' : (q > 0 || p['Production Start Actual']) ? 'In Progress' : 'Pending';
}

function loadProduction() {
  api({ action: 'getProductionBundle' }, r => {
    if (!r.success) { document.getElementById('prodTable').innerHTML = `<tr><td colspan="22"><div class="empty"><div class="empty-ico">⚙️</div><div class="empty-txt">No production records</div></div></td></tr>`; return; }
    allProd = r.production || [];
    prodBilledMap = r.billed || {};
    const pendingCount = allProd.filter(p => prodLiveStatus(p) === 'Pending').length;
    const inprogCount  = allProd.filter(p => prodLiveStatus(p) === 'In Progress').length;
    const doneCount    = allProd.filter(p => prodLiveStatus(p) === 'Completed').length;
    document.getElementById('prod-total').textContent = allProd.length;
    document.getElementById('prod-inprog').textContent = inprogCount;
    document.getElementById('prod-done').textContent = doneCount;
    document.getElementById('prod-delayed').textContent = allProd.filter(p => p['Production Delay']).length;
    setText('ppc-all', allProd.length);
    setText('ppc-pending', pendingCount);
    setText('ppc-inprog', inprogCount);
    setText('ppc-completed', doneCount);
    if (!allProd.length) { document.getElementById('prodTable').innerHTML = `<tr><td colspan="22"><div class="empty"><div class="empty-ico">⚙️</div><div class="empty-txt">No records yet</div></div></td></tr>`; return; }
    renderProduction(prodBilledMap);
  });
}

function filterProduction(f, el) {
  prodFilter = f;
  document.querySelectorAll('#prodPipeline .pipe-node').forEach(n => n.classList.remove('active'));
  if (el) el.classList.add('active');
  renderProduction(prodBilledMap);
}

const OVERDUE_DAYS = 5;   // itne din se purana + incomplete = overdue highlight

function isProdOverdue(p) {
  if (prodLiveStatus(p) === 'Completed') return false;   // ban gaya to overdue nahi
  const t = parseDMY(fmtDisplayDate(p['Order Date'] || ''));
  if (!t) return false;
  const days = (Date.now() - t) / (1000 * 60 * 60 * 24);
  return days > OVERDUE_DAYS;
}

function renderProduction(billedMap) {
    billedMap = billedMap || {};
    let list = allProd;
    if (prodFilter === 'pending')         list = allProd.filter(p => prodLiveStatus(p) === 'Pending');
    else if (prodFilter === 'inprogress') list = allProd.filter(p => prodLiveStatus(p) === 'In Progress');
    else if (prodFilter === 'completed')  list = allProd.filter(p => prodLiveStatus(p) === 'Completed');
    if (!list.length) { document.getElementById('prodTable').innerHTML = `<tr><td colspan="22"><div class="empty"><div class="empty-ico">⚙️</div><div class="empty-txt">Is filter mein koi item nahi</div></div></td></tr>`; return; }
    const prodGroups = {};
    const prodSeq = [];
    list.forEach(p => {
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
        let bt = (isFirst && prodSr > 1) ? 'border-top:2px solid var(--border2);' : '';
        if (isProdOverdue(p)) bt += 'background:#FEF2F2;';   // 5+ din purana + incomplete → halka red
        const _tQty = parseFloat(p['Qty']) || 0;
        const _pQty = parseFloat(p['Produced Qty']) || 0;
        const liveStatus = (_tQty > 0 && _pQty >= _tQty) ? 'Completed'
                         : (_pQty > 0 || p['Production Start Actual']) ? 'In Progress'
                         : 'Pending';
        const statusBadge = `<span class="badge ${liveStatus==='Completed'?'b-ready':liveStatus==='In Progress'?'b-processing':'b-pending'}">${liveStatus}</span>`;
        const delayBadge  = p['Production Delay'] ? `<span class="badge b-delay">${p['Production Delay']}</span>` : '';

        const orderCells = isFirst ? `
          <td class="td-id" rowspan="${count}" style="vertical-align:middle;${bt}">${orderID}</td>
          <td rowspan="${count}" style="vertical-align:middle;${bt}">${fmtDisplayDate(first['Order Date']||'')}</td>
          <td class="td-bold" rowspan="${count}" style="vertical-align:middle;${bt}">
            <div>${first['Customer Name']||''}</div>
            <button class="btn btn-sm" style="margin-top:6px;white-space:nowrap;background:var(--warning-dim);color:var(--warning);border-color:var(--warning-b);" onclick='showProdSpec(${JSON.stringify(first['Customer Name']||'')})' title="Is customer ki battery spec dekho">🔋 Spec</button>
          </td>
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
          <td style="${bt}">${fmtDisplayDate(p['Production Start Actual']||'')}</td>
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

// ========== PRODUCTION — CUSTOMER BATTERY SPEC (read-only view) ==========
function ensureProdSpecModal() {
  if (document.getElementById('prodSpecModal')) return;
  const html = `
  <div id="prodSpecModal" style="display:none;position:fixed;inset:0;z-index:9999;background:rgba(15,23,42,0.55);align-items:flex-start;justify-content:center;padding:40px 16px;overflow-y:auto;">
    <div style="background:var(--surface,#fff);border-radius:14px;max-width:840px;width:100%;box-shadow:0 20px 60px rgba(0,0,0,0.25);overflow:hidden;">
      <div style="display:flex;align-items:center;justify-content:space-between;padding:16px 20px;border-bottom:1px solid var(--border,#e5e7eb);">
        <div id="prodSpecTitle" style="font-size:15px;font-weight:700;color:var(--text,#111);">🔋 Battery Spec</div>
        <button onclick="closeProdSpec()" style="background:none;border:none;font-size:20px;cursor:pointer;color:var(--text3,#888);">✕</button>
      </div>
      <div style="padding:16px 20px;">
        <div style="font-size:12px;color:var(--text3,#888);margin-bottom:12px;">Is customer ki battery pe kya-kya jayega — Sticker, BMS, Connector, Box waghera. (Sirf dekhne ke liye)</div>
        <div id="prodSpecBody" style="overflow-x:auto;"></div>
      </div>
      <div style="display:flex;justify-content:flex-end;padding:12px 20px;border-top:1px solid var(--border,#e5e7eb);">
        <button class="btn" onclick="closeProdSpec()">Band karo</button>
      </div>
    </div>
  </div>`;
  document.body.insertAdjacentHTML('beforeend', html);
  document.getElementById('prodSpecModal').addEventListener('click', function (e) {
    if (e.target === this) closeProdSpec();
  });
}

function closeProdSpec() {
  const m = document.getElementById('prodSpecModal');
  if (m) m.style.display = 'none';
}

function showProdSpec(custName) {
  ensureProdSpecModal();
  const box = document.getElementById('prodSpecBody');
  document.getElementById('prodSpecTitle').textContent = '🔋 ' + custName + ' — Battery Spec';
  box.innerHTML = '<div class="loading"><div class="spin"></div></div>';
  document.getElementById('prodSpecModal').style.display = 'flex';

  api({ action: 'getBatterySpec', customerName: custName }, r => {
    const cols = (r.success && r.columns) ? r.columns : [];
    const rows = (r.success && r.data) ? r.data : [];
    if (!cols.length || !rows.length) {
      box.innerHTML = '<div style="text-align:center;padding:24px;color:var(--text3,#888);font-size:13px;">Is customer ki battery spec abhi set nahi hui hai.</div>';
      return;
    }
    const esc = v => String(v == null ? '' : v).replace(/[<>&]/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c]));
    let html = '<table style="width:100%;border-collapse:collapse;font-size:12.5px;"><thead><tr>' +
      cols.map(c => `<th style="text-align:left;padding:8px 10px;border-bottom:2px solid var(--border,#e5e7eb);white-space:nowrap;color:var(--text3,#888);text-transform:uppercase;font-size:10px;letter-spacing:0.4px;">${esc(c)}</th>`).join('') +
      '</tr></thead><tbody>';
    html += rows.map(row => '<tr>' + cols.map(c =>
      `<td style="padding:8px 10px;border-bottom:1px solid var(--border,#eee);color:var(--text,#111);">${esc(row[c]) || '—'}</td>`
    ).join('') + '</tr>').join('');
    html += '</tbody></table>';
    box.innerHTML = html;
  });
}

// ========== PLANNED PRODUCTION SLIP ==========
let plannedPickerItems = [];
let plannedSel = {};   // Item ID -> planned qty (string)

function plannedPending(p) {
  const t = parseFloat(p['Qty']) || 0;
  const pr = parseFloat(p['Produced Qty']) || 0;
  const pend = parseFloat(p['Pending Qty']);
  return isNaN(pend) ? (t - pr) : pend;
}

function openPlannedSlip() {
  if (!allProd || !allProd.length) { toast('Pehle Production data load karo', 'w'); return; }
  plannedPickerItems = allProd.filter(p => plannedPending(p) > 0);

  // Har order ka charger bhi ek row ki tarah picker me daalo (jaise battery)
  const chgSeen = {};
  const chargerRows = [];
  allProd.forEach(p => {
    const oid = String(p['Order ID']||'').trim();
    if (!oid || chgSeen[oid]) return;
    const cQty = parseFloat(p['Charger Qty']) || 0;
    if (cQty > 0) {
      chgSeen[oid] = true;
      chargerRows.push({
        'Order ID':      oid,
        'Item ID':       'CHG-' + oid,
        'Customer Name': p['Customer Name'] || '',
        'Product Model': p['Charger Model'] || 'Charger',
        'Battery Type':  '⚡ Charger',
        'Qty':           cQty,
        'Produced Qty':  0,
        'Pending Qty':   cQty,
        '_isCharger':    true
      });
    }
  });
  // charger rows ko battery items ke saath mila do
  plannedPickerItems = plannedPickerItems.concat(chargerRows);

  plannedSel = {};
  const d = new Date();
  document.getElementById('ps-plan-date').value =
    d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
  document.getElementById('ps-search').value = '';
  const sa = document.getElementById('ps-select-all'); if (sa) sa.checked = false;
  openModal('plannedSlipModal');
  renderPlannedPicker();
}

function plannedFiltered() {
  const q = (document.getElementById('ps-search')?.value || '').toLowerCase();
  if (!q) return plannedPickerItems;
  return plannedPickerItems.filter(p =>
    String(p['Order ID']||'').toLowerCase().includes(q) ||
    String(p['Customer Name']||'').toLowerCase().includes(q) ||
    String(p['Item ID']||'').toLowerCase().includes(q) ||
    String(p['Product Model']||'').toLowerCase().includes(q));
}

function renderPlannedPicker() {
  const data = plannedFiltered();
  const body = document.getElementById('ps-picker-body');
  if (!data.length) { body.innerHTML = '<tr><td colspan="10"><div class="empty"><div class="empty-txt">Koi pending item nahi</div></div></td></tr>'; updatePlannedSummary(); return; }
  body.innerHTML = data.map(p => {
    const iid = p['Item ID'] || '';
    const pend = plannedPending(p);
    const checked = plannedSel[iid] !== undefined;
    const val = checked ? plannedSel[iid] : '';
    return `<tr>
      <td><input type="checkbox" ${checked?'checked':''} onchange="togglePlannedItem('${iid}',this)" style="width:15px;height:15px;accent-color:var(--accent);cursor:pointer;"></td>
      <td class="td-id">${p['Order ID']||''}</td>
      <td class="td-id">${iid}</td>
      <td class="td-bold">${p['Customer Name']||''}</td>
      <td>${p['Product Model']||''}</td>
      <td>${p['Battery Type']||''}</td>
      <td>${parseFloat(p['Qty'])||0}</td>
      <td style="color:var(--success);font-weight:600;">${parseFloat(p['Produced Qty'])||0}</td>
      <td style="color:var(--warning);font-weight:600;">${pend}</td>
      <td><input class="form-control" type="number" min="1" value="${val}" placeholder="0" oninput="setPlannedQty('${iid}',this.value)" style="font-size:12px;padding:5px 8px;" ${checked?'':'disabled'}></td>
    </tr>`;
  }).join('');
  updatePlannedSummary();
}

function togglePlannedItem(iid, el) {
  const p = plannedPickerItems.find(x => (x['Item ID']||'') === iid);
  if (!p) return;
  const input = el.closest('tr')?.querySelector('input[type="number"]');
  if (el.checked) {
    plannedSel[iid] = '';
    if (input) { input.disabled = false; input.value = ''; input.focus(); }
  } else {
    delete plannedSel[iid];
    if (input) { input.disabled = true; input.value = ''; }
  }
  updatePlannedSummary();
}

function setPlannedQty(iid, val) {
  if (plannedSel[iid] === undefined) return;
  plannedSel[iid] = val;
  updatePlannedSummary();
}

function togglePlannedSelectAll() {
  const on = document.getElementById('ps-select-all').checked;
  plannedFiltered().forEach(p => {
    const iid = p['Item ID'] || '';
    if (on) plannedSel[iid] = '';   // select to karega, par qty khaali — user khud daalega
    else delete plannedSel[iid];
  });
  renderPlannedPicker();
}

function updatePlannedSummary() {
  const ids = Object.keys(plannedSel);
  let qty = 0;
  ids.forEach(iid => { qty += parseFloat(plannedSel[iid]) || 0; });
  document.getElementById('ps-sel-count').textContent = ids.length;
  document.getElementById('ps-sel-qty').textContent = qty;
}

function confirmPlannedSlip() {
  const planDate = document.getElementById('ps-plan-date').value;
  if (!planDate) { toast('Plan Date select karo', 'e'); return; }
  const ids = Object.keys(plannedSel);

  const rows = [], warns = [];
  for (const iid of ids) {
    const p = plannedPickerItems.find(x => (x['Item ID']||'') === iid);
    if (!p) continue;
    const planned = parseFloat(plannedSel[iid]) || 0;
    if (planned <= 0) continue;   // khaali/0 wale skip — sirf qty daale hue items lo
    const pend = plannedPending(p);
    if (planned > pend) warns.push(`${p['Product Model']||iid}: planned ${planned} > pending ${pend}`);
    rows.push({
      'Plan Date': fmtDisplayDate(planDate),
      'Order ID': p['Order ID']||'',
      'Item ID': iid,
      'Customer Name': p['Customer Name']||'',
      'Product Model': p['Product Model']||'',
      'Battery Type': p['Battery Type']||'',
      'Total Qty': parseFloat(p['Qty'])||0,
      'Produced Qty': parseFloat(p['Produced Qty'])||0,
      'Planned Qty': planned
    });
  }
  if (!rows.length) { toast('Kam se kam ek item me Planned Qty daalo', 'e'); return; }

  if (warns.length) {
    const ok = confirm('⚠ Dhyan do:\n\n• ' + warns.join('\n• ') + '\n\nFir bhi slip banayein?');
    if (!ok) return;
  }

  const btn = document.getElementById('ps-confirm-btn');
  if (btn) { btn.disabled = true; btn.textContent = 'Saving...'; }

  // popup CLICK ke saath kholo — warna browser block karta hai
  const win = window.open('', '_blank', 'width=900,height=680');
  if (win) win.document.write('<p style="font-family:Arial;padding:24px;color:#555;">Planned slip ban rahi hai...</p>');

  const planDateDisp = fmtDisplayDate(planDate);

  // Charger data ABHI nikaal lo (allProd se) — taaki print ke waqt available rahe
  const orderIDsInSlip = [...new Set(rows.map(r => String(r['Order ID']||'').trim()).filter(Boolean))];
  const chgSeen = {};
  const chargerList = [];
  (allProd || []).forEach(p => {
    const oid = String(p['Order ID']||'').trim();
    if (!oid || chgSeen[oid] || orderIDsInSlip.indexOf(oid) === -1) return;
    const cQty = parseFloat(p['Charger Qty']) || 0;
    if (cQty > 0) {
      chgSeen[oid] = true;
      chargerList.push({
        'Order ID': oid,
        'Customer Name': p['Customer Name'] || '',
        'Charger Model': p['Charger Model'] || 'Charger',
        'Charger Qty': cQty
      });
    }
  });

  let pending = rows.length, failed = 0;
  rows.forEach(r => {
    api({ action: 'addPlannedProduction', ...r, 'Added By': user.name || '' }, res => {
      if (!res || !res.success) failed++;
      if (--pending === 0) {
        if (btn) { btn.disabled = false; btn.textContent = '✓ Confirm & Generate Slip'; }
        if (failed) toast(failed + ' item save nahi hue (baaki ho gaye)', 'w');
        else toast('Planned production saved!');
        const html = buildPlannedSlipPrint(rows, planDateDisp, chargerList);
        if (win) { win.document.open(); win.document.write(html); win.document.close(); }
        closeModal('plannedSlipModal');
      }
    });
  });
}

function buildPlannedSlipPrint(rows, planDateDisp, chargerList) {
  chargerList = chargerList || [];
  const two = rows.filter(r => (r['Battery Type']||'').toLowerCase().includes('2 wheeler'));
  const oth = rows.filter(r => !(r['Battery Type']||'').toLowerCase().includes('2 wheeler'));
  const totPlanned = rows.reduce((s,r)=> s + (parseFloat(r['Planned Qty'])||0), 0);

  function chargerTbl() {
    if (!chargerList.length) return '';
    const totCharger = chargerList.reduce((s,c)=> s + (parseFloat(c['Charger Qty'])||0), 0);
    const body = chargerList.map((c,i) => `
      <tr>
        <td>${i+1}</td><td>${c['Order ID']||'—'}</td>
        <td>${c['Customer Name']||'—'}</td><td>${c['Charger Model']||'—'}</td>
        <td class="pq">${c['Charger Qty']||'—'}</td>
      </tr>`).join('');
    return `<div class="section">
      <div class="section-title">⚡ Chargers <span class="count">${chargerList.length} orders · ${totCharger} qty</span></div>
      <table>
        <thead><tr><th>#</th><th>Order ID</th><th>Customer</th><th>Charger Model</th><th>Charger Qty</th></tr></thead>
        <tbody>${body}</tbody>
      </table></div>`;
  }

  function tbl(items, label) {
    if (!items.length) return '';
    const sub = items.reduce((s,r)=> s + (parseFloat(r['Planned Qty'])||0), 0);
    const body = items.map((r,i) => `
      <tr>
        <td>${i+1}</td><td>${r['Order ID']||'—'}</td><td>${r['Item ID']||'—'}</td>
        <td>${r['Customer Name']||'—'}</td><td>${r['Product Model']||'—'}</td>
        <td>${r['Battery Type']||'—'}</td><td>${r['Total Qty']||'—'}</td>
        <td class="pq">${r['Planned Qty']||'—'}</td>
      </tr>`).join('');
    return `<div class="section">
      <div class="section-title">${label} <span class="count">${items.length} items · ${sub} planned</span></div>
      <table>
        <thead><tr><th>#</th><th>Order ID</th><th>Item ID</th><th>Customer</th><th>Product Model</th><th>Battery Type</th><th>Total Qty</th><th>Planned Qty</th></tr></thead>
        <tbody>${body}</tbody>
      </table></div>`;
  }

  return `<!DOCTYPE html><html><head><meta charset="UTF-8">
  <title>Planned Production Slip — ${planDateDisp}</title>
  <style>
    *{margin:0;padding:0;box-sizing:border-box;}
    body{font-family:Arial,sans-serif;padding:18px 22px;color:#111;}
    .header{display:flex;justify-content:space-between;align-items:center;border-bottom:3px solid #1e1b4b;padding-bottom:10px;margin-bottom:16px;}
    .brand{font-size:20px;font-weight:800;color:#1e1b4b;}.brand span{color:#6366f1;}
    .meta{text-align:right;font-size:12px;color:#444;line-height:1.8;}.meta strong{font-size:14px;color:#1e1b4b;}
    .no-print{margin-bottom:14px;}
    .no-print button{padding:9px 22px;border-radius:7px;font-size:13px;font-weight:600;cursor:pointer;margin-right:8px;border:none;}
    .btn-print{background:#1e1b4b;color:#fff;}.btn-close{background:#f0f0f0;color:#333;border:1px solid #ccc !important;}
    .section{margin-bottom:22px;}
    .section-title{font-size:13px;font-weight:700;color:#1e1b4b;padding:7px 12px;background:#ede9fe;border-left:4px solid #6366f1;border-radius:4px;margin-bottom:8px;display:flex;align-items:center;gap:10px;}
    .count{background:#6366f1;color:#fff;font-size:11px;font-weight:600;padding:2px 9px;border-radius:10px;}
    table{width:100%;border-collapse:collapse;font-size:12px;}
    thead tr{background:#1e1b4b;color:#fff;}thead th{padding:8px 10px;text-align:left;font-size:11px;font-weight:600;}
    thead th:last-child{text-align:center;}
    tbody tr:nth-child(even){background:#f7f7fb;}tbody td{padding:8px 10px;border-bottom:1px solid #e5e5ef;}
    tbody td.pq{text-align:center;font-weight:700;font-size:14px;color:#6366f1;}
    .footer{margin-top:16px;display:flex;justify-content:space-between;font-size:11px;color:#999;border-top:1px solid #e0e0e0;padding-top:10px;}
    @media print{.no-print{display:none!important;}body{padding:10px 14px;}}
  </style></head><body>
  <div class="header">
    <div><div class="brand">Litpax<span>ERP</span></div>
    <div style="font-size:12px;color:#666;margin-top:2px;">Planned Production Slip</div></div>
    <div class="meta"><strong>📅 ${planDateDisp}</strong><br>
    Items: <strong>${rows.length}</strong> · Planned Qty: <strong>${totPlanned}</strong></div>
  </div>
  <div class="no-print">
    <button class="btn-print" onclick="window.print()">🖨️ Print</button>
    <button class="btn-close" onclick="window.close()">✕ Close</button>
  </div>
  ${tbl(two, '🛵 2 Wheeler Battery')}
  ${tbl(oth, '🔋 Other Batteries')}
  ${chargerTbl()}
  <div class="footer"><span>Litpax Technology Pvt. Ltd.</span><span>LitpaxERP v3.0 — ${planDateDisp}</span></div>
  </body></html>`;
}
function printOrderRow(o) { currentEditOrder = o; printOrder(); }

function printAccountsOrder(orderID) {
  const o = accOrderFull[orderID];
  if (!o) { toast('Order data nahi mila — page refresh karo', 'e'); return; }
  currentEditOrder = o;
  printOrder();   // wahi Sales waala PDF/print
}

// ========== ORDER PRINT / PDF ==========
function printOrder() {
  if (!currentEditOrder) { toast('Order data nahi mila', 'e'); return; }
  const o   = currentEditOrder;
  const oid = o['Order ID'] || '';

  // Window CLICK ke saath hi kholni hai — async callback se kholi to browser block kar deta hai
  const win = window.open('', '_blank', 'width=960,height=720');
  if (!win) { toast('Popup block ho gaya — address bar ke popup icon se allow karo', 'e'); return; }
  win.document.write('<p style="font-family:Arial;padding:24px;color:#555;">Order data load ho raha hai...</p>');

  api({ action: 'getItemsByOrder', 'Order ID': oid }, ir => {
    const items = (ir.data || []).filter(i => (i['Battery Type'] || '') !== 'Charger');
    api({ action: 'getChargersByOrder', 'Order ID': oid }, cr => {
      api({ action: 'getPayments', 'Order ID': oid }, pr => {
        const payments = (pr.success && pr.data) ? pr.data : [];
        const totalReceived = pr.totalReceived || 0;
        win.document.open();
        win.document.write(buildOrderPrint(o, items, cr.data || [], payments, totalReceived));
        win.document.close();
      });
    });
  });
}

function buildOrderPrint(o, items, chargers, payments, totalReceived) {
  payments = payments || [];
  totalReceived = totalReceived || 0;
  const oid = o['Order ID'] || '';
  const esc = v => String(v == null ? '' : v).replace(/[<>&]/g, c => ({'<':'&lt;','>':'&gt;','&':'&amp;'}[c]));

  const info = (l, v) => `<div class="cell"><span class="lbl">${l}</span><span class="val">${esc(v) || '—'}</span></div>`;

  const itemRows = items.map((i, n) => `
    <tr>
      <td>${n + 1}</td>
      <td>${esc(i['Item ID'])}</td>
      <td>${esc(i['Product Model'])}</td>
      <td>${esc(i['Battery Type'])}</td>
      <td>${esc(i['Warranty']) || '—'}</td>
      <td class="r">${esc(i['Qty'])}</td>
      <td class="r">₹${fmt(i['Price Unit (Excluding GST)'])}</td>
      <td class="r b">₹${fmt(Math.round(parseFloat(i['Total'] || 0) * 1.18))}</td>
    </tr>`).join('');

  const chargerBlock = chargers.length ? `
    <div class="sec-t">⚡ Charger</div>
    <table>
      <thead><tr><th>#</th><th>Charger ID</th><th>Model</th><th class="r">Qty</th><th class="r">Rate/Unit</th><th class="r">Total (incl. 5% GST)</th></tr></thead>
      <tbody>${chargers.map((c, n) => `
        <tr>
          <td>${n + 1}</td>
          <td>${esc(c['Charger ID'])}</td>
          <td>${esc(c['Charger Model'])}</td>
          <td class="r">${esc(c['Qty'])}</td>
          <td class="r">₹${fmt(c['Price/Unit'] || 0)}</td>
          <td class="r b">₹${fmt(c['Total'] || 0)}</td>
        </tr>`).join('')}</tbody>
    </table>` : '';

    const orderVal = parseFloat(o['Total Order Value'] || 0);
  const balance  = orderVal - totalReceived;

  const paymentRows = payments.map((p, n) => `
    <tr>
      <td>${n + 1}</td>
      <td>${esc(fmtDisplayDate(p['Date'] || ''))}</td>
      <td>${esc(p['Mode'])}</td>
      <td>${esc(p['Reference']) || '—'}</td>
      <td>${esc(p['Remarks']) || '—'}</td>
      <td class="r b">₹${fmt(p['Amount'] || 0)}</td>
    </tr>`).join('');

  const paymentBlock = `
<div class="sec-t">💵 Payment Details</div>
<div class="tot" style="justify-content:flex-start;">
  <div style="text-align:left;"><span class="lbl">Total Received</span><span class="amt">₹${fmt(totalReceived)}</span></div>
  <div style="text-align:left;"><span class="lbl">Balance Pending</span><span class="amt" style="color:${balance > 0 ? '#C0392B' : '#157A5C'};">₹${fmt(balance)}</span></div>
  <div style="text-align:left;"><span class="lbl">Payment Status</span><span class="amt" style="color:#0D1F3C;font-size:13px;">${esc(o['Payment Status']) || '—'}</span></div>
</div>
${payments.length ? `
<table style="margin-top:10px;">
  <thead><tr><th>#</th><th>Date</th><th>Mode</th><th>Reference</th><th>Remarks</th><th class="r">Amount</th></tr></thead>
  <tbody>${paymentRows}</tbody>
</table>` : '<div style="margin-top:10px;color:#888;font-size:11.5px;">Koi payment entry nahi abhi</div>'}`;

  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8">
<title>${esc(oid)} — ${esc(o['Customer Name'])}</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box;}
  body{font-family:Arial,Helvetica,sans-serif;padding:20px 24px;color:#1A2333;font-size:12px;}
  .head{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:3px solid #0D1F3C;padding-bottom:10px;margin-bottom:14px;}
  .brand{font-size:20px;font-weight:800;color:#0D1F3C;}
  .brand span{color:#157A5C;}
  .sub{font-size:11px;color:#666;margin-top:2px;}
  .meta{text-align:right;font-size:11px;color:#444;line-height:1.7;}
  .meta .oid{font-size:15px;font-weight:700;color:#157A5C;}
  .no-print{margin-bottom:14px;}
  .no-print button{padding:9px 20px;border-radius:6px;font-size:12px;font-weight:600;cursor:pointer;margin-right:8px;border:none;}
  .b-print{background:#157A5C;color:#fff;}
  .b-close{background:#f0f0f0;color:#333;border:1px solid #ccc !important;}
  .sec-t{font-size:11px;font-weight:700;color:#0D1F3C;background:#EEF5F2;border-left:4px solid #157A5C;padding:6px 11px;border-radius:3px;margin:16px 0 8px;text-transform:uppercase;letter-spacing:0.4px;}
  .grid{display:grid;grid-template-columns:repeat(3,1fr);gap:0;border:1px solid #E4E6EA;border-radius:4px;overflow:hidden;}
  .cell{padding:7px 11px;border-right:1px solid #E4E6EA;border-bottom:1px solid #E4E6EA;}
  .lbl{display:block;font-size:9px;color:#828A98;text-transform:uppercase;letter-spacing:0.4px;font-weight:600;}
  .val{display:block;font-size:12px;font-weight:600;margin-top:2px;}
  table{width:100%;border-collapse:collapse;font-size:11.5px;}
  thead tr{background:#0D1F3C;color:#fff;}
  th{padding:7px 9px;text-align:left;font-size:10px;font-weight:600;letter-spacing:0.3px;}
  td{padding:7px 9px;border-bottom:1px solid #E4E6EA;}
  tbody tr:nth-child(even){background:#FAFAFB;}
  .r{text-align:right;}
  .b{font-weight:700;color:#0D1F3C;}
  .tot{display:flex;justify-content:flex-end;gap:26px;margin-top:12px;padding:11px 14px;background:#EEF5F2;border:1px solid #C7DED6;border-radius:5px;}
  .tot div{text-align:right;}
  .tot .lbl{font-size:9px;}
  .tot .amt{font-size:17px;font-weight:800;color:#157A5C;}
  .rem{margin-top:12px;padding:9px 12px;border:1px solid #E4E6EA;border-radius:4px;font-size:11.5px;}
  .sign{display:flex;justify-content:space-between;margin-top:44px;font-size:11px;color:#666;}
  .sign div{border-top:1px solid #999;padding-top:5px;width:180px;text-align:center;}
  .foot{margin-top:20px;display:flex;justify-content:space-between;font-size:10px;color:#999;border-top:1px solid #E4E6EA;padding-top:8px;}
  @media print{.no-print{display:none!important;}body{padding:12px 16px;}}
</style></head><body>

<div class="head">
  <div>
    <div class="brand">Litpax<span>ERP</span></div>
    <div class="sub">Sales Order Confirmation</div>
  </div>
  <div class="meta">
    <div class="oid">${esc(oid)}</div>
    Order Date: <b>${esc(fmtDisplayDate(o['Date'] || ''))}</b><br>
    Printed: ${new Date().toLocaleDateString('en-IN')}
  </div>
</div>

<div class="no-print">
  <button class="b-print" onclick="window.print()">🖨️ Print / Save as PDF</button>
  <button class="b-close" onclick="window.close()">✕ Close</button>
</div>

<div class="sec-t">Customer &amp; Order Details</div>
<div class="grid">
  ${info('Customer Name', o['Customer Name'])}
  ${info('Phone', o['Customer Phone'])}
  ${info('City', o['City'])}
  ${info('Sales Person', o['Sales Person Name'])}
  ${info('Assigned CRM', o['Assigned CRM'])}
  ${info('Corridor', o['Corridor'] || o['Priority'])}
  ${info('Payment Mode', o['Payment Mode'])}
  ${info('Payment Status', o['Payment Status'])}
  ${info('Order Status', o['Order Status'])}
  ${info('Plan Payment Date', fmtDisplayDate(o['Plan Payment Date'] || ''))}
  ${info('Plan Dispatch Date', fmtDisplayDate(o['Plan Dispatch Date'] || ''))}
  ${info('Suggested Transport', o['Suggested Transport'])}
</div>

<div class="sec-t">📦 Order Items</div>
<table>
  <thead><tr><th>#</th><th>Item ID</th><th>Product Model</th><th>Battery Type</th><th>Warranty</th><th class="r">Qty</th><th class="r">Rate/Unit (Ex GST)</th><th class="r">Total (incl. 18% GST)</th></tr></thead>
  <tbody>${itemRows || '<tr><td colspan="8" style="text-align:center;color:#888;">Koi item nahi</td></tr>'}</tbody>
</table>

${chargerBlock}

<div class="tot">
  <div><span class="lbl">Total Qty</span><span class="amt" style="color:#0D1F3C;">${fmt(o['Total Qty'] || 0)}</span></div>
  <div><span class="lbl">Transport Charges</span><span class="amt" style="color:#0D1F3C;">₹${fmt(o['Transportation Charges'] || 0)}</span></div>
  <div><span class="lbl">Total Order Value</span><span class="amt">₹${fmt(o['Total Order Value'] || 0)}</span></div>
</div>
${paymentBlock}
${o['Order Remarks'] ? `<div class="rem"><b>Remarks:</b> ${esc(o['Order Remarks'])}</div>` : ''}

<div class="sign"><div>Customer Signature</div><div>For Litpax Technology Pvt. Ltd.</div></div>
<div class="foot"><span>Litpax Technology Pvt. Ltd.</span><span>LitpaxERP v3.0</span></div>
</body></html>`;

  return html;
}

function calcProdQty() {
  const produced = parseFloat(document.getElementById('pu-produced-qty').value) || 0;
  const total    = parseFloat(document.getElementById('pu-total-qty').textContent) || 0;
  const pending  = total - produced;
  document.getElementById('pu-pending-qty').textContent = pending >= 0 ? pending : 0;
}

function toggleProdDate(which) {
  const chk    = document.getElementById(`pu-${which}-chk`);
  const dateEl = document.getElementById(`pu-${which}`);
  if (!chk || !dateEl) return;
  if (chk.checked) {
    if (!dateEl.value) dateEl.value = new Date().toISOString().split('T')[0];
  } else {
    dateEl.value = '';
  }
}

function openProdUpdate(p) {
  document.getElementById('pu-orderid').value = p['Order ID']||'';
  document.getElementById('pu-itemid').value = p['Item ID']||'';
  document.getElementById('pu-model').value = p['Product Model']||'';
  document.getElementById('pu-btype').value = p['Battery Type']||'';
  document.getElementById('pu-status').value = p['Status']||'Pending';
  const saVal = toInputDate(p['Production Start Actual']||'');
  const caVal = toInputDate(p['Production Complete Actual']||'');
  document.getElementById('pu-sa').value = saVal;
  document.getElementById('pu-ca').value = caVal;
  document.getElementById('pu-sa-chk').checked = !!saVal;
  document.getElementById('pu-ca-chk').checked = !!caVal;
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

  var dateIds = ['pu-sa','pu-ca'];
  var fields = [
    ['Product Model','pu-model'],['Battery Type','pu-btype'],['Status','pu-status'],
    ['Production Start Actual','pu-sa'],
    ['Production Complete Actual','pu-ca'],
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
  var actualStart  = document.getElementById('pu-sa').value;
  var producedQty  = parseFloat(document.getElementById('pu-produced-qty').value) || 0;
  var totalQtyVal  = parseFloat(document.getElementById('pu-total-qty').textContent) || 0;
  if (totalQtyVal > 0 && producedQty >= totalQtyVal) params['Status'] = 'Completed';
  else if (producedQty > 0 || actualStart)           params['Status'] = 'In Progress';
  else                                               params['Status'] = 'Pending';

  const resetBtn = () => { if (btn) { btn.disabled = false; btn.textContent = 'Update Production'; } };

  api(params, r => {
    resetBtn();
    if (r.success) {
      const crmParams = { action: 'updateCRM', 'Order ID': orderID };
      if (itemID) crmParams['Item ID'] = itemID;
      if (params['Production Start Actual'])    crmParams['Production Start Actual']    = params['Production Start Actual'];
      if (params['Production Complete Actual']) crmParams['Production Complete Actual'] = params['Production Complete Actual'];
      if (params['Production Delay'])           crmParams['Production Delay']           = params['Production Delay'];
      if (params['Status'] === 'Completed') {
        // Sirf tab jab is order ke SAARE items Completed hon
        const orderItems = allProd.filter(x => x['Order ID'] === orderID);
        const allDone = orderItems.every(x =>
          (x['Item ID'] === itemID) ? true : (x['Status'] === 'Completed')
        );
        if (allDone) crmParams['Current Stage'] = 'Production Complete';
      }
      if (Object.keys(crmParams).length > 2) api(crmParams, () => {});

      // FMS: Start / Complete checkbox ticked hai to us step ko Done karo
      if (document.getElementById('pu-sa-chk').checked) {
        api({ action: 'markFMSProductionDone', 'Item ID': itemID, 'Step': 'start', 'Actual': params['Production Start Actual'] || '' }, () => {});
      }
      if (document.getElementById('pu-ca-chk').checked) {
        api({ action: 'markFMSProductionDone', 'Item ID': itemID, 'Step': 'complete', 'Actual': params['Production Complete Actual'] || '' }, () => {});
      }

      toast('Production updated!');
      closeModal('prodUpdateModal');
      loadProduction();
    } else toast(r.message, 'e');
  });
}

// ========== DISPATCH ==========
// ========== DISPATCH ==========
let allDspItems = [], dspTotals = {}, dspBilled = {}, dspPayMap = {}, dspOrderMap = {};
let currentDispatchData = null;
let dspFilter = 'all';

function dspStatus(p) {
  const qty  = parseFloat(p['Qty'])||0;
  const disp = dspTotals[p['Item ID']]||0;
  const prod = parseFloat(p['Produced Qty'])||0;
  if (disp >= qty && qty > 0) return 'done';
  if (disp > 0)               return 'partial';
  if (prod > 0)               return 'ready';
  return 'waiting';
}

function filterDispatch(f, el) {
  dspFilter = f;
  document.querySelectorAll('#dspPipeline .pipe-node').forEach(n => n.classList.remove('active'));
  if (el) el.classList.add('active');
  renderDispatch();
}

function loadDispatch() {
  document.getElementById('dispatchTable').innerHTML = '<tr><td colspan="17"><div class="loading"><div class="spin"></div> Loading...</div></td></tr>';
  api({ action: 'getDispatchBundle' }, r => {
    if (!r.success) { document.getElementById('dispatchTable').innerHTML = '<tr><td colspan="17"><div class="empty"><div class="empty-txt">Load failed</div></div></td></tr>'; return; }
    allDspItems = r.production || [];
    dspOrderMap = r.orderMap || {};
    dspTotals   = r.dispTotals || {};
    dspBilled   = r.billed || {};
    const payTotals = r.payTotals || {};
    dspPayMap = {};
    [...new Set(allDspItems.map(p => p['Order ID']))].forEach(oid => {
      const ov = parseFloat(dspOrderMap[oid]?.['Total Order Value']) || 0;
      const received = payTotals[oid] || 0;
      dspPayMap[oid] = { received, orderVal: ov, balance: ov - received };
    });
    renderDispatch();
  });
}

function renderDispatch() {
  const q = (document.getElementById('dspSearch')?.value||'').toLowerCase();
  let data = allDspItems;
  if (q) data = data.filter(p => (p['Order ID']||'').toLowerCase().includes(q) || (p['Customer Name']||'').toLowerCase().includes(q));

  // Stats
  let ready = 0, partial = 0, done = 0;
  allDspItems.forEach(p => {
    const qty  = parseFloat(p['Qty'])||0;
    const disp = dspTotals[p['Item ID']]||0;
    if (disp >= qty && qty > 0) done++;
    else if (disp > 0) partial++;
    else if ((parseFloat(p['Produced Qty'])||0) > 0) ready++;
  });
  setText('dsp-total', allDspItems.length);
  setText('dsp-ready', ready);
  setText('dsp-partial', partial);
  setText('dsp-done', done);

  // Pipeline counts — hamesha full set pe (search ke andar bhi sahi rahe)
  setText('dpc-all', allDspItems.length);
  setText('dpc-waiting', allDspItems.filter(p => dspStatus(p) === 'waiting').length);
  setText('dpc-ready',   allDspItems.filter(p => dspStatus(p) === 'ready').length);
  setText('dpc-partial', allDspItems.filter(p => dspStatus(p) === 'partial').length);
  setText('dpc-done',    allDspItems.filter(p => dspStatus(p) === 'done').length);

  // Status filter
  if (dspFilter !== 'all') data = data.filter(p => dspStatus(p) === dspFilter);

  if (!data.length) { document.getElementById('dispatchTable').innerHTML = '<tr><td colspan="19"><div class="empty"><div class="empty-ico">🚚</div><div class="empty-txt">Is filter mein koi record nahi</div></div></td></tr>'; return; }

  // Order-wise grouping (Production jaisa)
  const groups = {}, seq = [];
  data.forEach(p => {
    const oid = p['Order ID']||'';
    if (!groups[oid]) { groups[oid] = []; seq.push(oid); }
    groups[oid].push(p);
  });

  let rows = '', sr = 1;
  seq.forEach(orderID => {
    const items = groups[orderID];
    const count = items.length;
    const first = items[0];
    const o = dspOrderMap[orderID] || {};
    const pay = dspPayMap[orderID] || {};
    const bal = pay.balance || 0;
    const payCell = pay.orderVal
      ? `<div style="font-size:11px;">Rcvd: <b style="color:var(--success);">₹${fmt(pay.received)}</b></div>
         <div style="font-size:11px;">Bal: <b style="color:${bal<=0?'var(--success)':'var(--error)'};">₹${fmt(bal)}</b></div>`
      : '—';

    items.forEach((p, idx) => {
      const isFirst = idx === 0;
      const bt = (isFirst && sr > 1) ? 'border-top:2px solid var(--border2);' : '';
      const qty      = parseFloat(p['Qty'])||0;
      const produced = parseFloat(p['Produced Qty'])||0;
      const billed   = dspBilled[p['Item ID']]||0;
      const disp     = dspTotals[p['Item ID']]||0;
      const pend     = qty - disp;
      const statusBadge = disp >= qty && qty > 0
        ? '<span class="badge b-dispatched">🚚 Dispatched</span>'
        : disp > 0
        ? '<span class="badge b-processing">Partial</span>'
        : produced > 0
        ? '<span class="badge b-ready">Ready</span>'
        : '<span class="badge b-pending">Waiting</span>';

      const orderCells = isFirst ? `
        <td class="td-id" rowspan="${count}" style="vertical-align:middle;${bt}">${orderID}</td>
        <td rowspan="${count}" style="vertical-align:middle;${bt}">${fmtDisplayDate(first['Order Date']||'')}</td>
        <td class="td-bold" rowspan="${count}" style="vertical-align:middle;${bt}">${first['Customer Name']||''}</td>
        <td rowspan="${count}" style="vertical-align:middle;${bt}">${o['City']||''}</td>
        <td rowspan="${count}" style="vertical-align:middle;${bt}">${first['Charger Model']||'—'}</td>
        <td rowspan="${count}" style="vertical-align:middle;${bt}">${first['Charger Qty']||'—'}</td>
        <td rowspan="${count}" style="vertical-align:middle;${bt}">${payCell}</td>
        <td rowspan="${count}" style="vertical-align:middle;${bt}">${fmtDisplayDate(o['Plan Dispatch Date']||'') || '—'}</td>
      ` : '';

      rows += `<tr>
        <td style="${bt}">${sr++}</td>
        <td class="td-id" style="${bt}">${p['Item ID']||''}</td>
        ${orderCells}
        <td style="${bt}">${p['Product Model']||''}</td>
        <td style="${bt}">${p['Battery Type']||''}</td>
        <td style="${bt}">${qty}</td>
        <td style="${bt};color:var(--success);font-weight:600;">${produced}</td>
        <td style="${bt};color:var(--purple);font-weight:600;">${billed || '—'}</td>
        <td style="${bt};color:var(--warning);font-weight:600;">${disp || '—'}</td>
        <td style="${bt};font-weight:600;color:${pend<=0?'var(--success)':'var(--warning)'};">${pend<=0?'0 ✅':pend}</td>
        <td style="${bt}">${statusBadge}</td>
        <td style="${bt}"><button class="btn btn-sm btn-primary" onclick='openDispatchModal(${JSON.stringify(p)})'>🚚 Dispatch</button></td>
      </tr>`;
    });
  });
  document.getElementById('dispatchTable').innerHTML = rows;
}

function searchDispatch() { renderDispatch(); }

// ========== DELIVERY CHALLAN ==========
// 👇 Apni asli company details bhar do (photo wale challan se)
const CHALLAN_HEADER = {
  company: 'Litpax Technology Pvt. Ltd.',
  gstin:   '06AAECL9497K1ZR',
  address: 'Sirsa, Haryana',   // 👈 poora address
  phones:  ''                  // 👈 phone number(s)
};

let allDC = [];               // saare challan rows
let dcSentMap = {};           // Item ID -> total qty already bheji
let dcItems = [];             // production rows (item list)
let dcOrderMap = {};          // Order ID -> order row
let currentChallanItems = []; // abhi fetch kiye gaye order ke items

function loadDeliveryChallan() {
  const rec = document.getElementById('dcRecent');
  if (rec) rec.innerHTML = '<div class="loading"><div class="spin"></div></div>';
  api({ action: 'getDispatchBundle' }, r => {
    dcItems    = (r.success && r.production) ? r.production : [];
    dcOrderMap = (r.success && r.orderMap) ? r.orderMap : {};
    buildOrderDatalist();
    reloadDCTotals(renderRecentChallans);
  });
}

function buildOrderDatalist() {
  const seen = {}, opts = [];
  dcItems.forEach(p => {
    const oid = String(p['Order ID'] || '').trim();
    if (!oid || seen[oid]) return;
    const o = dcOrderMap[oid] || {};
    const st = String(o['Order Status'] || o['Status'] || '');
    // status pata ho aur "complete" na ho to skip; warna list me rakho
    if (st && !st.toLowerCase().includes('complet')) return;
    seen[oid] = true;
    opts.push(`<option value="${oid}">${(p['Customer Name'] || '')}</option>`);
  });
  const dl = document.getElementById('dc-orderlist');
  if (dl) dl.innerHTML = opts.join('');
}

function reloadDCTotals(cb) {
  api({ action: 'getDeliveryChallans' }, r => {
    allDC = (r.success && r.data) ? r.data : [];
    dcSentMap = {};
    allDC.forEach(d => {
      const iid = String(d['Item ID'] || '').trim();
      if (!iid) return;
      dcSentMap[iid] = (dcSentMap[iid] || 0) + (parseFloat(d['Qty']) || 0);
    });
    if (cb) cb();
  });
}

function fetchChallanOrder() {
  const oid = (document.getElementById('dc-orderid').value || '').trim();
  const wrap = document.getElementById('dc-items-wrap');
  const meta = document.getElementById('dc-order-meta');
  if (!oid) { toast('Order ID daalo', 'e'); return; }
  const items = dcItems.filter(p => String(p['Order ID']).trim().toLowerCase() === oid.toLowerCase());
  if (!items.length) {
    wrap.style.display = 'none';
    meta.innerHTML = '';
    toast('Is Order ID ke items nahi mile', 'e');
    return;
  }
  const orderID = items[0]['Order ID'];
  const o = dcOrderMap[String(orderID).trim()] || {};
  document.getElementById('dc-address').value = o['Shipping Address'] || o['Billing Address'] || '';
  document.getElementById('dc-note').value = '';
  document.getElementById('dc-date').value = '';

  // Charger bhi laao — alag row ki tarah dikhega
  api({ action: 'getChargersByOrder', 'Order ID': orderID }, cr => {
    const chargers = (cr.success && cr.data) ? cr.data : [];
    const chargerItems = chargers.map(c => ({
      'Item ID':       c['Charger ID'] || '',
      'Order ID':      orderID,
      'Customer Name': items[0]['Customer Name'] || '',
      'Product Model': c['Charger Model'] || 'Charger',
      'Battery Type':  'Charger',
      'Qty':           c['Qty'] || 0,
      '_isCharger':    true
    }));
    const all = items.concat(chargerItems);
    currentChallanItems = all;
    meta.innerHTML = `Customer: ${items[0]['Customer Name'] || '—'} &nbsp;·&nbsp; ${items.length} item(s)` +
      (chargerItems.length ? ` <span style="color:var(--warning);">+ ${chargerItems.length} charger</span>` : '');
    renderChallanItems(all);
    wrap.style.display = 'block';
  });
}

function renderChallanItems(items) {
  let rows = '';
  items.forEach((p, i) => {
    const iid = String(p['Item ID'] || '').trim();
    const qty = parseFloat(p['Qty']) || 0;
    const sent = dcSentMap[iid] || 0;
    const pend = qty - sent;
    const sentDisp = sent > 0 ? `<span style="color:var(--warning);font-weight:600;">${sent}</span>` : '<span style="color:var(--text3);">—</span>';
    const penDisp  = pend <= 0 ? '<span style="color:var(--success);font-weight:600;">0 ✅</span>' : `<span style="color:var(--warning);font-weight:600;">${pend}</span>`;
    const partic = p['_isCharger']
      ? (p['Product Model'] || 'Charger')
      : ((p['Product Model'] || '') + ' ' + (p['Battery Type'] || '')).trim();
    rows += `<tr>
      <td><input type="checkbox" id="dc-chk-${i}" ${pend > 0 ? 'checked' : ''} style="width:16px;height:16px;cursor:pointer;"></td>
      <td class="td-id">${iid}</td>
      <td>${p['Product Model'] || ''}</td>
      <td>${p['_isCharger'] ? '⚡ Charger' : (p['Battery Type'] || '')}</td>
      <td>${qty}</td>
      <td>${sentDisp}</td>
      <td>${penDisp}</td>
      <td><input class="form-control" type="number" id="dc-qty-${i}" value="${pend > 0 ? pend : ''}" style="padding:5px 8px;font-size:12px;"></td>
      <td><input class="form-control" type="number" id="dc-amt-${i}" placeholder="0" style="padding:5px 8px;font-size:12px;"></td>
      <td><input class="form-control" id="dc-part-${i}" value="${partic.replace(/"/g,'&quot;')}" style="padding:5px 8px;font-size:12px;"></td>
    </tr>`;
  });
  document.getElementById('dc-item-rows').innerHTML = rows;
}

function submitChallan() {
  const lines = [];
  currentChallanItems.forEach((p, i) => {
    const chk = document.getElementById('dc-chk-' + i);
    if (!chk || !chk.checked) return;
    const q = parseFloat(document.getElementById('dc-qty-' + i).value) || 0;
    if (q <= 0) return;
    lines.push({
      itemId: String(p['Item ID'] || '').trim(),
      qty: q,
      amount: parseFloat(document.getElementById('dc-amt-' + i).value) || 0,
      particulars: document.getElementById('dc-part-' + i).value.trim(),
      _total: parseFloat(p['Qty']) || 0,
      _sent: dcSentMap[String(p['Item ID'] || '').trim()] || 0
    });
  });
  if (!lines.length) { toast('Kam se kam ek item select karo + qty daalo', 'e'); return; }

  const address = document.getElementById('dc-address').value.trim();
  if (!address) { toast('Name & Address bharo', 'e'); return; }

  const over = lines.filter(l => l.qty > (l._total - l._sent));
  if (over.length) {
    if (!confirm(`⚠ ${over.length} item ki challan qty pending se zyada hai. Fir bhi banayein?`)) return;
  }

  const oid = String(currentChallanItems[0]['Order ID']).trim();
  const cust = currentChallanItems[0]['Customer Name'] || '';
  const note = document.getElementById('dc-note').value.trim();
  const billNo = document.getElementById('dc-billno').value.trim();
  const dateVal = document.getElementById('dc-date').value; // yyyy-mm-dd or ''

  const btn = document.getElementById('dc-save-btn');
  if (btn) { btn.disabled = true; btn.textContent = 'Saving...'; }
  const win = window.open('', '_blank', 'width=820,height=700');
  if (win) win.document.write('<p style="font-family:Arial;padding:24px;color:#555;">Challan ban raha hai...</p>');

  api({
    action: 'addDeliveryChallan',
    'Order ID': oid,
    'Customer Name': cust,
    'Address': address,
    'Note': note,
    'Bill No': billNo,
    'Date': dateVal,
    'Items': JSON.stringify(lines.map(l => ({ itemId: l.itemId, qty: l.qty, amount: l.amount, particulars: l.particulars }))),
    'Created By': (typeof user !== 'undefined' && user.name) ? user.name : ''
  }, r => {
    if (btn) { btn.disabled = false; btn.textContent = '💾 Save & Print Challan'; }
    if (r && r.success) {
      toast(`Challan saved — DC #${r.dcNo} (${r.lines} item)`);
      const ch = {
        dcNo: r.dcNo,
        date: fmtDisplayDate(dateVal || new Date().toISOString().split('T')[0]),
        orderId: oid, customer: cust, address: address, note: note, billNo: billNo,
        items: lines.map(l => ({ itemId: l.itemId, particulars: l.particulars, qty: l.qty, amount: l.amount }))
      };
      const html = buildChallanPrint(ch);
      if (win) { win.document.open(); win.document.write(html); win.document.close(); }
      document.getElementById('dc-items-wrap').style.display = 'none';
      document.getElementById('dc-orderid').value = '';
      document.getElementById('dc-billno').value = '';
      document.getElementById('dc-order-meta').innerHTML = '';
      reloadDCTotals(renderRecentChallans);
    } else {
      if (win) win.close();
      toast((r && r.message) || 'Save failed', 'e');
    }
  });
}

function groupDC() {
  const g = {};
  allDC.forEach(d => {
    const no = String(d['DC No']);
if (!g[no]) g[no] = { dcNo: d['DC No'], date: d['Date'], orderId: d['Order ID'], customer: d['Customer Name'], address: d['Address'], note: d['Note'], billNo: d['Bill No'], items: [] };
    g[no].items.push({ itemId: d['Item ID'], particulars: d['Particulars'], qty: d['Qty'], amount: d['Amount'] });
  });
  return g;
}

function renderRecentChallans() {
  const el = document.getElementById('dcRecent');
  setText('dc-count', Object.keys(groupDC()).length);
  if (!el) return;
  const g = groupDC();
  const nos = Object.keys(g).sort((a, b) => Number(b) - Number(a)).slice(0, 30);
  if (!nos.length) { el.innerHTML = '<div style="text-align:center;padding:14px;color:var(--text3);font-size:13px;">Abhi koi challan nahi bana</div>'; return; }
  el.innerHTML = nos.map(no => {
    const c = g[no];
    const totQty = c.items.reduce((s, x) => s + (parseFloat(x.qty) || 0), 0);
    const totAmt = c.items.reduce((s, x) => s + (parseFloat(x.amount) || 0), 0);
    return `<div style="display:flex;align-items:center;justify-content:space-between;padding:9px 12px;border:1px solid var(--border);border-radius:8px;margin-bottom:6px;background:var(--surface);">
      <div>
        <div style="font-size:13px;font-weight:600;color:var(--text);">📄 DC #${c.dcNo} <span style="font-size:11px;color:var(--text3);font-weight:400;margin-left:6px;">${c.orderId || ''} · ${c.items.length} item</span></div>
        <div style="font-size:11px;color:var(--text3);">${fmtDisplayDate(c.date || '')} · ${c.customer || ''} · Qty: ${totQty}${totAmt ? ' · ₹' + fmt(totAmt) : ''}${c.note ? ' · ' + c.note : ''}</div>
      </div>
      <button class="btn btn-sm btn-info" onclick="reprintChallan('${no}')">🖨️ Reprint</button>
    </div>`;
  }).join('');
}

function reprintChallan(no) {
  const c = groupDC()[String(no)];
  if (!c) { toast('Challan nahi mila', 'e'); return; }
  const win = window.open('', '_blank', 'width=820,height=700');
  if (!win) { toast('Popup block ho gaya — allow karo', 'e'); return; }
  win.document.write(buildChallanPrint(c));
  win.document.close();
}

function buildChallanPrint(ch) {
  const esc = v => String(v == null ? '' : v).replace(/[<>&]/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c]));
  const dateDisp = fmtDisplayDate(ch.date || '') || new Date().toLocaleDateString('en-IN');
  const H = CHALLAN_HEADER;
  let totQty = 0, totAmt = 0, body = '';
  ch.items.forEach((it, idx) => {
    const q = parseFloat(it.qty) || 0, a = parseFloat(it.amount) || 0;
    totQty += q; totAmt += a;
    body += `<tr><td>${idx + 1}</td><td>${esc(it.particulars) || esc(it.itemId) || '—'}</td><td class="r">${q}</td><td class="r">${a ? '₹' + fmt(a) : '—'}</td></tr>`;
  });
  return `<!DOCTYPE html><html><head><meta charset="UTF-8">
<title>Delivery Challan #${esc(ch.dcNo)}</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box;}
  body{font-family:Arial,Helvetica,sans-serif;padding:22px 26px;color:#1a1a1a;font-size:13px;}
  .no-print{margin-bottom:14px;}
  .no-print button{padding:9px 20px;border-radius:6px;font-size:12px;font-weight:600;cursor:pointer;margin-right:8px;border:none;}
  .b-print{background:#b91c5c;color:#fff;}
  .b-close{background:#f0f0f0;color:#333;border:1px solid #ccc !important;}
  .box{border:2px solid #b91c5c;border-radius:6px;padding:16px 18px;}
  .head{text-align:center;border-bottom:2px solid #b91c5c;padding-bottom:10px;margin-bottom:12px;}
  .company{font-size:22px;font-weight:800;color:#b91c5c;letter-spacing:0.5px;}
  .cinfo{font-size:12px;color:#444;margin-top:4px;line-height:1.6;}
  .title{text-align:center;font-size:14px;font-weight:700;letter-spacing:2px;margin:6px 0 12px;color:#333;text-transform:uppercase;}
  .meta{display:flex;justify-content:space-between;font-size:13px;margin-bottom:12px;}
  .meta b{color:#b91c5c;}
  .addr{border:1px solid #ddd;border-radius:5px;padding:10px 12px;margin-bottom:14px;font-size:13px;white-space:pre-wrap;min-height:52px;}
  .addr .lbl{font-size:10px;color:#888;text-transform:uppercase;font-weight:600;display:block;margin-bottom:4px;}
  table{width:100%;border-collapse:collapse;font-size:13px;margin-bottom:4px;}
  th,td{border:1px solid #ccc;padding:8px 10px;}
  thead tr{background:#fce7f0;}
  th{text-align:left;font-size:12px;color:#333;}
  .r{text-align:right;}
  .warn{margin:14px 0;font-size:13px;font-weight:700;color:#b91c5c;text-align:center;letter-spacing:0.5px;}
  .sign{display:flex;justify-content:space-between;margin-top:48px;font-size:12px;color:#555;}
  .sign div{border-top:1px solid #999;padding-top:5px;width:190px;text-align:center;}
  @media print{.no-print{display:none!important;}body{padding:12px 16px;}}
</style></head><body>
<div class="no-print">
  <button class="b-print" onclick="window.print()">🖨️ Print / Save as PDF</button>
  <button class="b-close" onclick="window.close()">✕ Close</button>
</div>
<div class="box">
  <div class="head">
    <div class="company">${esc(H.company)}</div>
    <div class="cinfo">${H.gstin ? 'GSTIN: ' + esc(H.gstin) : ''}${H.address ? ' &nbsp;|&nbsp; ' + esc(H.address) : ''}${H.phones ? '<br>' + esc(H.phones) : ''}</div>
  </div>
  <div class="title">Delivery Challan</div>
  <div class="meta">
    <div>Challan No: <b>${esc(ch.dcNo)}</b></div>
    <div>Order ID: <b>${esc(ch.orderId)}</b></div>
    ${ch.billNo ? `<div>Bill No: <b>${esc(ch.billNo)}</b></div>` : ''}
    <div>Date: <b>${esc(dateDisp)}</b></div>
  </div>
  <div class="addr"><span class="lbl">Name &amp; Address</span>${esc(ch.address)}</div>
  <table>
    <thead><tr><th style="width:44px;">#</th><th>Particulars</th><th class="r" style="width:90px;">Qty</th><th class="r" style="width:130px;">Amount (₹)</th></tr></thead>
    <tbody>
      ${body}
      <tr><td></td><td class="r" style="font-weight:700;">Total</td><td class="r" style="font-weight:700;">${totQty}</td><td class="r" style="font-weight:700;">${totAmt ? '₹' + fmt(totAmt) : '—'}</td></tr>
    </tbody>
  </table>
  ${ch.note ? `<div style="font-size:12px;color:#666;margin-bottom:4px;">Note: ${esc(ch.note)}</div>` : ''}
  <div class="warn">Only for Warranty — not for Sale</div>
  <div class="sign">
    <div>Customer Signature</div>
    <div>For ${esc(H.company)}<br>Manager / Prop.</div>
  </div>
</div>
</body></html>`;
}

function toggleDispatchFMS() {
  const chk    = document.getElementById('dsp-fms-chk');
  const dateEl = document.getElementById('dsp-date');
  if (!chk || !dateEl) return;
  if (chk.checked) {
    if (!dateEl.value) dateEl.value = new Date().toISOString().split('T')[0];
  } else {
    dateEl.value = '';
  }
}

function openDispatchModal(p) {
  const oid  = p['Order ID']||'';
  const iid  = p['Item ID']||'';
  const qty      = parseFloat(p['Qty'])||0;
  const produced = parseFloat(p['Produced Qty'])||0;
  const billed   = dspBilled[iid]||0;
  const disp     = dspTotals[iid]||0;
  const pay      = dspPayMap[oid]||{};
  currentDispatchData = { p, oid, iid, qty, produced, billed, disp, balance: pay.balance||0 };

  document.getElementById('dsp-orderid-display').textContent = oid;
  document.getElementById('dsp-itemid-display').textContent  = iid;
  document.getElementById('dsp-product-display').textContent = p['Product Model']||'';
  document.getElementById('dsp-m-total').textContent      = qty;
  document.getElementById('dsp-m-produced').textContent   = produced;
  document.getElementById('dsp-m-billed').textContent     = billed;
  document.getElementById('dsp-m-dispatched').textContent = disp;

  const warnEl = document.getElementById('dsp-pay-warning');
  if ((pay.balance||0) > 0) {
    warnEl.style.display = 'block';
    warnEl.textContent = '⚠ Payment pending: ₹' + fmt(pay.balance) + ' balance hai is order ka';
  } else warnEl.style.display = 'none';

  document.getElementById('dsp-qty').value      = (qty - disp) > 0 ? (qty - disp) : '';
  document.getElementById('dsp-date').value     = '';
  document.getElementById('dsp-fms-chk').checked = false;
  document.getElementById('dsp-transport').value= dspOrderMap[oid]?.['Suggested Transport'] || '';
  document.getElementById('dsp-vehicle').value  = '';
  document.getElementById('dsp-lr').value       = '';
  document.getElementById('dsp-driver').value   = '';
  document.getElementById('dsp-remarks').value  = '';
  openModal('dispatchModal');
  loadDispatchHistory(oid, iid);
}

function loadDispatchHistory(orderID, itemID) {
  const el = document.getElementById('dsp-history');
  el.innerHTML = '<div class="loading"><div class="spin"></div></div>';
  api({ action: 'getAllDispatches' }, r => {
    const list = (r.data||[]).filter(d => d['Order ID'] === orderID && d['Item ID'] === itemID);
    if (!list.length) { el.innerHTML = '<div style="text-align:center;padding:8px;color:var(--text3);font-size:12px;">Koi dispatch entry nahi abhi</div>'; return; }
    el.innerHTML = '<div style="font-size:11px;font-weight:600;color:var(--text3);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px;">Previous Dispatches</div>' +
      list.map(d => `
        <div style="display:flex;align-items:center;justify-content:space-between;padding:8px 12px;border:1px solid var(--border);border-radius:8px;margin-bottom:5px;background:var(--surface);">
          <div>
            <div style="font-size:12px;font-weight:600;color:var(--text);">Qty: ${d['Dispatch Qty']||0} &nbsp;|&nbsp; ${d['Transport Name']||'—'} ${d['LR No']?'· LR: '+d['LR No']:''}</div>
            <div style="font-size:11px;color:var(--text3);">${fmtDisplayDate(d['Dispatch Date']||'')} ${d['Vehicle No']?'· '+d['Vehicle No']:''} ${d['Remarks']?'· '+d['Remarks']:''}</div>
          </div>
          <span style="font-size:10px;font-family:'JetBrains Mono',monospace;color:var(--text3);">${d['Dispatch ID']||''}</span>
        </div>`).join('');
  });
}

function submitDispatch() {
  const c = currentDispatchData;
  if (!c) return;
  const btn = document.getElementById('dsp-submit-btn');
  const dq  = parseFloat(document.getElementById('dsp-qty').value) || 0;
  if (dq <= 0) { toast('Dispatch Qty 0 se zyada bharo', 'e'); return; }
  const transport = document.getElementById('dsp-transport').value.trim();
  if (!transport) { toast('Transport Name bharo', 'e'); return; }

  // ⚠ WARNINGS — block kuch nahi, sirf confirm
  const warn = [];
  if (c.balance > 0) warn.push('Payment pending hai — Balance ₹' + fmt(c.balance));
  if (dq + c.disp > c.billed)   warn.push('Billed qty (' + c.billed + ') se zyada dispatch ho raha hai');
  if (dq + c.disp > c.produced) warn.push('Produced qty (' + c.produced + ') se zyada dispatch ho raha hai');
  if (dq + c.disp > c.qty)      warn.push('Order qty (' + c.qty + ') se zyada dispatch ho raha hai');
  if (warn.length) {
    const ok = confirm('⚠ Dhyan do:\n\n• ' + warn.join('\n• ') + '\n\nFir bhi dispatch karein?');
    if (!ok) return;
  }

  if (btn) { btn.disabled = true; btn.textContent = 'Saving...'; }
  api({
    action: 'addDispatch',
    'Order ID': c.oid,
    'Item ID': c.iid,
    'Dispatch Qty': dq,
    'Dispatch Date': fmtDisplayDate(document.getElementById('dsp-date').value),
    'Transport Name': transport,
    'Vehicle No': document.getElementById('dsp-vehicle').value,
    'LR No': document.getElementById('dsp-lr').value,
    'Driver No': document.getElementById('dsp-driver').value,
    'Remarks': document.getElementById('dsp-remarks').value,
    'Added By': user.name || ''
  }, r => {
    if (btn) { btn.disabled = false; btn.textContent = '🚚 Save Dispatch'; }
    if (r.success) {
      // FMS: Dispatch checkbox ticked hai to us step ko Done karo
      if (document.getElementById('dsp-fms-chk')?.checked) {
        api({ action: 'markFMSProductionDone', 'Item ID': c.iid, 'Step': 'dispatch', 'Actual': fmtDisplayDate(document.getElementById('dsp-date').value) }, () => {});
      }
      toast('Dispatch saved! ' + r.dispatchID + (r.orderDispatched ? ' — 🎉 Pura order Dispatched ho gaya!' : ''));
      closeModal('dispatchModal');
      loadDispatch();
    } else toast(r.message || 'Failed', 'e');
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
          <td style="white-space:nowrap;">
          <button class="btn btn-sm btn-warning" onclick='openCustEdit(${JSON.stringify(c)})' title="Edit">📝</button>
          <button class="btn btn-sm btn-info" onclick="openCustDocs('${c.CompanyName}')" style="margin-left:4px;">📎</button>
          <button class="btn btn-sm" onclick="openBatterySpec('${c.CompanyName}')" style="margin-left:4px;background:var(--warning-dim);color:var(--warning);border-color:var(--warning-b);" title="Battery Spec">🔋</button>
        </td>
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
        <td style="white-space:nowrap;"><button class="btn btn-sm btn-info" onclick="openCustDocs('${c.CompanyName}')">📎</button> <button class="btn btn-sm" onclick="openBatterySpec('${c.CompanyName}')" style="background:var(--warning-dim);color:var(--warning);border-color:var(--warning-b);" title="Battery Spec">🔋</button></td>
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
let accFilter = 'all', accProdMap = {}, accOrderValMap = {};
let accOrderFull = {};   // orderID -> poora order row (Transport Charges + PDF print ke liye)

function accStatus(a) {
  const pd = accProdMap[a['Item ID']] || {};
  return (typeof pd === 'object' ? (pd.status || 'Pending') : (pd || 'Pending'));
}

function filterAccounts(f, el) {
  accFilter = f;
  document.querySelectorAll('#accPipeline .pipe-node').forEach(n => n.classList.remove('active'));
  if (el) el.classList.add('active');
  renderAccounts(allAccounts, accProdMap, accOrderValMap);
}

// orderPayMap: { orderID: { total, balance, orderVal } }
let orderPayMap = {};

// accItemMap: { itemID: OrderItems row } — Price Type + Rate ke liye
let accItemMap = {};

function loadAccounts() {
  document.getElementById('accountsTable').innerHTML = '<tr><td colspan="16"><div class="loading"><div class="spin"></div> Loading...</div></td></tr>';
  api({ action: 'getAccountsBundle' }, r => {
    if (!r.success || !r.accounts || !r.accounts.length) {
      document.getElementById('accountsTable').innerHTML = '<tr><td colspan="16"><div class="empty"><div class="empty-ico">💰</div><div class="empty-txt">No accounts data</div></div></td></tr>';
      return;
    }
    allAccounts       = r.accounts || [];
    const prodMap     = r.prodMap || {};
    const orderValMap = r.orderValMap || {};
    const payTotals   = r.payTotals || {};
    accItemMap        = r.itemMap || {};

    const uniqueOrderIDs = [...new Set(allAccounts.map(a => a['Order ID']))];
    const totalQty    = allAccounts.reduce((s,a) => s + (parseFloat(a['Qty'])||0), 0);
    const withCharger = allAccounts.filter(a => a['Charger Qty']).length;
    document.getElementById('acc-total').textContent   = allAccounts.length;
    document.getElementById('acc-orders').textContent  = uniqueOrderIDs.length;
    document.getElementById('acc-qty').textContent     = totalQty;
    document.getElementById('acc-charger').textContent = withCharger;

    // Production produced/pending merge
    allAccounts.forEach(a => {
      const pd = prodMap[a['Item ID']];
      if (pd) { a['Produced Qty'] = pd.producedQty; a['Pending Qty'] = pd.pendingQty; }
    });

    // orderPayMap banao
    orderPayMap = {};
    uniqueOrderIDs.forEach(orderID => {
      const received = payTotals[orderID] || 0;
      const ov = orderValMap[orderID] || 0;
      orderPayMap[orderID] = { totalReceived: received, orderVal: ov, balance: ov - received };
    });

        accProdMap = prodMap;
    accOrderValMap = orderValMap;

    // Poore order rows laao — Transport Charges dikhane aur PDF print ke liye
    api({ action: 'getOrders' }, ordRes => {
      accOrderFull = {};
      (ordRes.data || []).forEach(o => { accOrderFull[o['Order ID']] = o; });
      renderAccounts(allAccounts, prodMap, orderValMap);
    });
  });
}

function renderAccounts(data, prodMap, orderValMap) {
  prodMap = prodMap || {};
  orderValMap = orderValMap || {};

  // Pipeline counts (Production status wise) — hamesha full set pe
  setText('apc-all', allAccounts.length);
  setText('apc-pending', allAccounts.filter(a => accStatus(a) === 'Pending').length);
  setText('apc-inprog',  allAccounts.filter(a => accStatus(a) === 'In Progress').length);
  setText('apc-completed', allAccounts.filter(a => accStatus(a) === 'Completed').length);

  // Production-status filter
  if (accFilter === 'pending')         data = data.filter(a => accStatus(a) === 'Pending');
  else if (accFilter === 'inprogress') data = data.filter(a => accStatus(a) === 'In Progress');
  else if (accFilter === 'completed')  data = data.filter(a => accStatus(a) === 'Completed');

  if (!data.length) {
    document.getElementById('accountsTable').innerHTML = '<tr><td colspan="22"><div class="empty"><div class="empty-ico">💰</div><div class="empty-txt">Is filter mein koi record nahi</div></div></td></tr>';
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

      const transCharge = parseFloat((accOrderFull[orderID] || {})['Transportation Charges']) || 0;
      const orderCells = isFirst ? `
        <td class="td-id" rowspan="${count}" style="vertical-align:middle;${borderTop}">${orderID}</td>
        <td rowspan="${count}" style="vertical-align:middle;${borderTop}">${fmtDisplayDate(a['Order Date']||'')}</td>
        <td class="td-bold" rowspan="${count}" style="vertical-align:middle;${borderTop}">${a['Customer Name']||''}</td>
        <td rowspan="${count}" style="vertical-align:middle;${borderTop}">${a['Sales Person']||''}</td>
        <td rowspan="${count}" style="vertical-align:middle;${borderTop}">${a['Assigned CRM']||''}</td>
        <td rowspan="${count}" style="font-weight:600;color:var(--accent);vertical-align:middle;${borderTop}">₹${fmt(orderVal)}</td>
        <td rowspan="${count}" style="font-weight:600;color:var(--success);vertical-align:middle;${borderTop}">₹${fmt(received)}</td>
        <td rowspan="${count}" style="font-weight:700;color:${balColor};vertical-align:middle;${borderTop}">₹${fmt(balance)}</td>
        <td rowspan="${count}" style="vertical-align:middle;${borderTop}">${transCharge ? '₹'+fmt(transCharge) : '—'}</td>
        <td rowspan="${count}" style="vertical-align:middle;${borderTop}">${chargerModel || '—'}</td>
        <td rowspan="${count}" style="vertical-align:middle;${borderTop}">${chargerQty || '—'}</td>
        <td rowspan="${count}" style="vertical-align:middle;${borderTop}">
          <button class="btn btn-sm btn-info" onclick='openAccSlipsDrawer("${orderID}","${a['Customer Name']||''}")'>📎 Slips</button>
          <button class="btn btn-sm" style="margin-top:4px;" onclick="printAccountsOrder('${orderID}')">🖨️ Print</button>
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

      const itm      = accItemMap[a['Item ID']] || {};
      const pType    = itm['Price Type'] || '—';
      const rateUnit = parseFloat(itm['Price Unit (Excluding GST)']) || 0;
      const perWatt  = parseFloat(itm['Per Watt Price']) || 0;
      const pTypeCls = pType === 'Per Watt' ? 'b-pdc' : pType === 'Absolute' ? 'b-advance' : pType === 'Last Price' ? 'b-credit' : 'b-pending';

      let rateCell;
      if (pType === 'Per Watt') {
        rateCell = perWatt
          ? `<span style="font-weight:600;color:var(--purple);">₹${fmt(perWatt)}/W</span>` +
            (rateUnit ? `<div style="font-size:10px;color:var(--text3);">= ₹${fmt(rateUnit)}/unit</div>` : '')
          : '<span style="color:var(--text3);">—</span>';
      } else {
        rateCell = rateUnit
          ? `<span style="font-weight:600;color:var(--text);">₹${fmt(rateUnit)}/unit</span>`
          : '<span style="color:var(--text3);">—</span>';
      }

      rows += `<tr style="${borderTop}">
        <td style="${borderTop}">${sr++}</td>
        <td class="td-id" style="${borderTop}">${a['Item ID']||''}</td>
        ${orderCells}
        <td style="${borderTop}">${a['Product Model']||''}</td>
        <td style="${borderTop}">${a['Battery Type']||''}</td>
        <td style="${borderTop}">${pType !== '—' ? `<span class="badge ${pTypeCls}">${pType}</span>` : '—'}</td>
        <td style="${borderTop}">${rateCell}</td>
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
  document.getElementById('bl-invoice-date').value           = '';
  document.getElementById('bl-invoice-no').value             = '';
  document.getElementById('bl-billed-qty-input').value       = a['Produced Qty'] || '';
  document.getElementById('bl-invoice-amount').value         = '';
  document.getElementById('bl-remarks').value                = '';
  document.getElementById('bl-billed-qty').textContent       = a['Billed Qty'] || 0;
  document.getElementById('bl-fms-chk').checked              = false;
  openModal('billingModal');
  loadBillingHistory(a['Order ID'], a['Item ID']);
}

function toggleBillingFMS() {
  const chk    = document.getElementById('bl-fms-chk');
  const dateEl = document.getElementById('bl-invoice-date');
  if (!chk || !dateEl) return;
  if (chk.checked) {
    if (!dateEl.value) dateEl.value = new Date().toISOString().split('T')[0];
  } else {
    dateEl.value = '';
  }
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
      // FMS: Billing checkbox ticked hai to us step ko Done karo
      if (document.getElementById('bl-fms-chk')?.checked) {
        api({ action: 'markFMSProductionDone', 'Item ID': currentBillingData['Item ID'] || '', 'Step': 'billing', 'Actual': fmtDisplayDate(document.getElementById('bl-invoice-date').value) }, () => {});
      }
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
  renderAccounts(filtered, accProdMap, accOrderValMap);
}

function logout() {
  sessionStorage.removeItem('erp_user');
  localStorage.removeItem('erp_user');   // backup bhi hatao, warna dobara auto-login ho jayega
  window.location.href = 'index.html';
}

const LEAD_TRACKER_URL = 'https://litpax-technology.github.io/SalesLeadTracker/';

// ERP user ko Lead Tracker ke role se map karo
// (Lead Tracker me jinke account hain sirf unhe auto-login milega)
function leadTrackerRoleFor(u) {
  if (!u) return null;
  if (u.role === 'Admin') return 'admin';
  const key = (u.salesName || u.name || '').trim().toLowerCase();
  const known = ['mohit', 'vijay', 'sahil', 'sneha'];   // 👈 naye salesman add karne ho to yahan + Lead Tracker ROLES me daalo
  return known.includes(key) ? key : null;
}

function goToLeadTracker() {
  // ERP login ko localStorage me backup rakho — Lead Tracker se wapas aane pe restore ho jayega
  try {
    const cur = sessionStorage.getItem('erp_user');
    if (cur) localStorage.setItem('erp_user', cur);
  } catch (e) {}

  const ltRole = leadTrackerRoleFor(user);
  if (ltRole) {
    try {
      sessionStorage.setItem('ltx_session', JSON.stringify({ role: ltRole, time: Date.now() }));
    } catch (e) {}
  }
  window.location.href = LEAD_TRACKER_URL;
}

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

// ========== BATTERY SPEC (customer-wise, sheet-driven columns) ==========
// Columns yahan hardcode NAHI — GAS BatterySpec sheet ke header se aate hain.
// Naya column chahiye? Sheet me "Customer Name" ke baad, "Updated By" se pehle header add kar do.
let currentSpecCust = '';
let currentSpecColumns = [];

function openBatterySpec(custName) {
  currentSpecCust = custName;
  currentSpecColumns = [];
  document.getElementById('batterySpecTitle').textContent = '🔋 ' + custName + ' — Battery Spec';
  document.getElementById('specStatus').style.display = 'none';
  document.getElementById('specThead').innerHTML = '';
  document.getElementById('specTbody').innerHTML =
    `<tr><td><div class="loading"><div class="spin"></div></div></td></tr>`;
  openModal('batterySpecModal');
  loadBatterySpec(custName);
}

function loadBatterySpec(custName) {
  api({ action: 'getBatterySpec', customerName: custName }, r => {
    currentSpecColumns = (r.success && r.columns) ? r.columns : [];
    if (!currentSpecColumns.length) {
      document.getElementById('specThead').innerHTML = '';
      document.getElementById('specTbody').innerHTML =
        `<tr><td style="padding:16px;color:var(--error);font-size:12px;">Sheet me koi column header nahi mila — BatterySpec sheet check karo</td></tr>`;
      return;
    }
    document.getElementById('specThead').innerHTML =
      '<tr>' + currentSpecColumns.map(c => `<th>${c}</th>`).join('') + '<th style="width:44px;"></th></tr>';
    document.getElementById('specTbody').innerHTML = '';
    const rows = (r.success && r.data) ? r.data : [];
    if (!rows.length) { addSpecRow(); return; }
    rows.forEach(row => addSpecRow(row));
  });
}

function addSpecRow(values) {
  values = values || {};
  if (!currentSpecColumns.length) return;
  const tb = document.getElementById('specTbody');
  const tr = document.createElement('tr');
  tr.innerHTML = currentSpecColumns.map(c =>
    `<td><input class="form-control" data-col="${c}" value="${(values[c] || '').toString().replace(/"/g, '&quot;')}" placeholder="${c}" style="font-size:12px;padding:5px 8px;"></td>`
  ).join('') +
  `<td style="text-align:center;"><button class="btn btn-sm btn-danger" onclick="this.closest('tr').remove()" title="Remove">✕</button></td>`;
  tb.appendChild(tr);
}

function collectSpecRows() {
  const rows = [];
  document.querySelectorAll('#specTbody tr').forEach(tr => {
    const obj = {}; let any = false;
    tr.querySelectorAll('input[data-col]').forEach(inp => {
      const v = inp.value.trim();
      obj[inp.dataset.col] = v;
      if (v) any = true;
    });
    if (any) rows.push(obj);
  });
  return rows;
}

function saveBatterySpec() {
  const btn = document.getElementById('specSaveBtn');
  const status = document.getElementById('specStatus');
  const rows = collectSpecRows();
  if (btn) { btn.disabled = true; btn.textContent = 'Saving...'; }
  api({ action: 'saveBatterySpec', customerName: currentSpecCust, rows: JSON.stringify(rows), 'Added By': user.name || '' }, r => {
    if (btn) { btn.disabled = false; btn.textContent = '💾 Save Spec'; }
    if (r.success) {
      toast('Battery spec saved!');
      status.style.display = 'block'; status.style.color = 'var(--success)'; status.textContent = '✅ Saved ' + rows.length + ' row(s)';
    } else {
      toast(r.message || 'Save failed', 'e');
      status.style.display = 'block'; status.style.color = 'var(--error)'; status.textContent = '❌ ' + (r.message || 'Failed');
    }
  });
}

// ---- Column editor (headings rename/add/delete) ----
function openSpecColumns() {
  const list = document.getElementById('specColsList');
  // Jo abhi table me dikh rahe hain (server se aaye) wahi editable
  const cols = currentSpecColumns.length ? currentSpecColumns.slice() : [];
  list.innerHTML = cols.map(c => specColRowHTML(c)).join('');
  if (!cols.length) addSpecColInput();
  document.getElementById('specColsStatus').style.display = 'none';
  openModal('specColsModal');
}

function specColRowHTML(name) {
  const safe = (name || '').toString().replace(/"/g, '&quot;');
  return `<div class="spec-col-row" style="display:flex;gap:8px;align-items:center;margin-bottom:6px;">
    <input class="form-control spec-col-input" value="${safe}" placeholder="Column name" style="font-size:13px;">
    <button class="btn btn-sm btn-danger" onclick="this.closest('.spec-col-row').remove()" title="Remove column">✕</button>
  </div>`;
}

function addSpecColInput() {
  document.getElementById('specColsList').insertAdjacentHTML('beforeend', specColRowHTML(''));
}

function saveSpecColumns() {
  const btn = document.getElementById('specColsSaveBtn');
  const status = document.getElementById('specColsStatus');
  const cols = [];
  let bad = false;
  document.querySelectorAll('#specColsList .spec-col-input').forEach(inp => {
    const v = inp.value.trim();
    if (!v) return;                       // khaali skip
    if (cols.some(c => c.toLowerCase() === v.toLowerCase())) bad = true;  // duplicate
    cols.push(v);
  });
  if (!cols.length) { toast('Kam se kam ek column rakho', 'e'); return; }
  if (bad) { toast('Do columns ka naam same hai — alag rakho', 'e'); return; }

  if (btn) { btn.disabled = true; btn.textContent = 'Saving...'; }
  api({ action: 'setBatterySpecColumns', columns: JSON.stringify(cols) }, r => {
    if (btn) { btn.disabled = false; btn.textContent = '💾 Save Columns'; }
    if (r.success) {
      toast('Columns updated!');
      closeModal('specColsModal');
      loadBatterySpec(currentSpecCust);   // table naye columns ke sath reload
    } else {
      status.style.display = 'block'; status.style.color = 'var(--error)'; status.textContent = '❌ ' + (r.message || 'Failed');
      toast(r.message || 'Failed', 'e');
    }
  });
}


// ========== MY DASHBOARD ==========
let myAllOrders = [];

function loadMyDashboard() {
  const fromEl = document.getElementById('my-from-date');
  const toEl   = document.getElementById('my-to-date');
  if (fromEl) fromEl.value = '';
  if (toEl)   toEl.value   = '';
  setMyRangeActiveBtn('all');
  api({ action: 'getOrders' }, r => {
    let orders = r.data || [];
    if (user.role === 'Sales' && user.salesName) {
      orders = orders.filter(o => (o['Sales Person Name']||'') === user.salesName);
    }
    myAllOrders = orders;
    renderMyDashboard();
  });
}

function setMyDateRange(preset) {
  const today = new Date();
  let from = null, to = null;
  if (preset === 'today') { from = today; to = today; }
  else if (preset === 'thismonth') { from = new Date(today.getFullYear(), today.getMonth(), 1); to = today; }
  else if (preset === 'lastmonth') {
    from = new Date(today.getFullYear(), today.getMonth()-1, 1);
    to   = new Date(today.getFullYear(), today.getMonth(), 0);
  } else if (preset === 'thisyear') { from = new Date(today.getFullYear(), 0, 1); to = today; }
  document.getElementById('my-from-date').value = from ? toInputDateStr(from) : '';
  document.getElementById('my-to-date').value   = to   ? toInputDateStr(to)   : '';
  setMyRangeActiveBtn(preset);
  renderMyDashboard();
}

function setMyRangeActiveBtn(preset) {
  document.querySelectorAll('.my-range-btn').forEach(b => b.classList.remove('btn-primary'));
  const btn = document.getElementById('my-range-' + preset + '-btn');
  if (btn) btn.classList.add('btn-primary');
}

function applyMyDateFilter() {
  setMyRangeActiveBtn('custom');
  renderMyDashboard();
}

function renderMyDashboard() {
  const fromVal = document.getElementById('my-from-date')?.value;  // "2026-08-22"
  const toVal   = document.getElementById('my-to-date')?.value;

  // from/to ko bhi parseDMY jaisa local-midnight banao (warna IST/UTC mismatch)
  function inputToTs(v, endOfDay) {
    if (!v) return null;
    const p = v.split('-');   // yyyy-mm-dd
    const d = new Date(parseInt(p[0],10), parseInt(p[1],10) - 1, parseInt(p[2],10));
    let ts = d.getTime();
    if (endOfDay) ts += 24*60*60*1000 - 1;
    return ts;
  }
  const fromTs = inputToTs(fromVal, false);
  const toTs   = inputToTs(toVal, true);

  const orders = myAllOrders.filter(o => {
    const t = parseDMY(o['Date']);
    if (fromTs !== null && t < fromTs) return false;
    if (toTs !== null && t > toTs) return false;
    return true;
  });

  const completedOrders = orders.filter(o => isOrderCompleted(o));
  const pendingOrders   = orders.filter(o => !isOrderCompleted(o));

  const totalSale     = orders.reduce((s,o)          => s + (parseFloat(o['Total Order Value'])||0), 0);
  const completedSale = completedOrders.reduce((s,o) => s + (parseFloat(o['Total Order Value'])||0), 0);
  const pendingSale   = pendingOrders.reduce((s,o)   => s + (parseFloat(o['Total Order Value'])||0), 0);

  setText('my-total-sale',     '₹' + fmt(Math.round(totalSale)));
  setText('my-pending-sale',   '₹' + fmt(Math.round(pendingSale)));
  setText('my-completed-sale', '₹' + fmt(Math.round(completedSale)));
  setText('my-total-orders',     orders.length);
  setText('my-pending-orders',   pendingOrders.length);
  setText('my-completed-orders', completedOrders.length);
}

// ========== EDIT ORDER ==========
let currentEditOrder = null;
let editItemRowCount = 0;

function addEditItemRow(model='', btype='', qty='', price='', total='', crm='', remarks='', isExisting=false, itemID='', volt='', amp='', priceType='', warranty='', perwatt='') {
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
        ${lbl('Per Watt Price (₹)', true)}<input class="form-control" id="eim-perwatt-${id}" type="number" value="${perwatt}" placeholder="e.g. 12" oninput="calcEditItemAuto('${id}')" style="font-size:13px;">
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
  // Agar priceType set hai to show/hide fields
  if (priceType === 'Per Watt') {
    document.getElementById(`eim-pwfield-${id}`).style.display = 'block';
    document.getElementById(`eim-pricefield-${id}`).style.display = 'none';
  }
  calcEditItemAuto(id);
}

function removeEditItemRow(id) {
  const row = document.getElementById(`edit-item-row-${id}`);
  if (!row) return;
  const itemID  = row.dataset.itemid;
  const isExist = row.dataset.existing === 'true';
  const orderID = document.getElementById('e-orderid')?.value || '';

  // Naya (abhi tak save nahi hua) item — sirf screen se hatao
  if (!isExist || !itemID) { row.remove(); return; }

  // Existing item — backend se bhi delete karo
  if (!confirm('Yeh item order se hata dein? (Production/Accounts se bhi hat jayega)')) return;
  row.remove();
  api({ action: 'deleteOrderItem', 'Item ID': itemID, 'Order ID': orderID }, r => {
    if (r.success) toast('Item removed');
    else toast(r.message || 'Delete failed', 'e');
  });
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
  el.innerHTML = chargers.map(c => {
    const cid = c['Charger ID'] || '';
    return `
    <div id="echg-row-${cid}" style="border:1px solid var(--border);border-radius:8px;margin-bottom:6px;background:var(--surface2);padding:8px 12px;">
      <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;">
        <div>
          <span style="font-size:12px;font-weight:600;color:var(--text);">${c['Charger Model']||'—'}</span>
          <span style="font-size:11px;color:var(--text3);margin-left:8px;">Qty: ${c['Qty']||0} · ₹${fmt(c['Price/Unit']||0)}/unit · Total ₹${fmt(c['Total']||0)}</span>
        </div>
        <div style="display:flex;gap:6px;flex-shrink:0;">
          <button class="btn btn-sm btn-warning" onclick="toggleChargerEdit('${cid}')">✏️</button>
          <button class="btn btn-sm btn-danger" onclick="deleteEditCharger('${cid}')">🗑️</button>
        </div>
      </div>
      <div id="echg-edit-${cid}" style="display:none;margin-top:10px;padding-top:10px;border-top:1px dashed var(--border);">
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;">
          <div><label style="font-size:10px;color:var(--text3);">Model</label><input class="form-control" id="echg-model-${cid}" value="${(c['Charger Model']||'').replace(/"/g,'&quot;')}" style="font-size:12px;margin-top:3px;"></div>
          <div><label style="font-size:10px;color:var(--text3);">Qty</label><input class="form-control" id="echg-qty-${cid}" type="number" value="${c['Qty']||0}" oninput="calcEditChargerRow('${cid}')" style="font-size:12px;margin-top:3px;"></div>
          <div><label style="font-size:10px;color:var(--text3);">Price/Unit (₹)</label><input class="form-control" id="echg-price-${cid}" type="number" value="${c['Price/Unit']||0}" oninput="calcEditChargerRow('${cid}')" style="font-size:12px;margin-top:3px;"></div>
        </div>
        <div style="display:flex;align-items:center;justify-content:space-between;margin-top:8px;">
          <span style="font-size:11px;color:var(--text3);">Total incl. 5% GST: <b id="echg-total-${cid}" style="color:var(--success);">₹${fmt(c['Total']||0)}</b></span>
          <button class="btn btn-sm btn-primary" onclick="saveEditChargerRow('${cid}')">💾 Save</button>
        </div>
      </div>
    </div>`;
  }).join('');
}

function toggleChargerEdit(cid) {
  const el = document.getElementById(`echg-edit-${cid}`);
  if (el) el.style.display = el.style.display === 'none' ? 'block' : 'none';
}

function calcEditChargerRow(cid) {
  const qty   = parseFloat(document.getElementById(`echg-qty-${cid}`)?.value) || 0;
  const price = parseFloat(document.getElementById(`echg-price-${cid}`)?.value) || 0;
  const total = qty * price * 1.05;
  const el = document.getElementById(`echg-total-${cid}`);
  if (el) el.textContent = '₹' + fmt(total.toFixed(2));
}

function saveEditChargerRow(cid) {
  const orderID = document.getElementById('e-orderid').value;
  const model = document.getElementById(`echg-model-${cid}`)?.value?.trim();
  const qty   = parseFloat(document.getElementById(`echg-qty-${cid}`)?.value) || 0;
  const price = parseFloat(document.getElementById(`echg-price-${cid}`)?.value) || 0;
  if (!model) { toast('Charger Model bharo', 'e'); return; }
  if (qty <= 0) { toast('Qty 0 se zyada honi chahiye', 'e'); return; }
  if (price <= 0) { toast('Price 0 se zyada honi chahiye', 'e'); return; }
  const total = parseFloat((qty * price * 1.05).toFixed(2));
  api({ action: 'updateChargerItem', 'Charger ID': cid, 'Order ID': orderID, 'Charger Model': model, 'Qty': qty, 'Price/Unit': price, 'Total': total }, r => {
    if (r.success) { toast('Charger updated!'); loadEditChargers(orderID); }
    else toast(r.message || 'Update failed', 'e');
  });
}

function deleteEditCharger(cid) {
  const orderID = document.getElementById('e-orderid').value;
  if (!confirm('Yeh charger delete karein?')) return;
  api({ action: 'deleteChargerItem', 'Charger ID': cid, 'Order ID': orderID }, r => {
    if (r.success) { toast('Charger deleted'); loadEditChargers(orderID); }
    else toast(r.message || 'Delete failed', 'e');
  });
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
  document.getElementById('e-billing').value = o['Billing Address'] || '';
  document.getElementById('e-shipping').value = o['Shipping Address'] || '';
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
          item['Warranty']||'',
          item['Per Watt Price']||''
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
    'Order Remarks': document.getElementById('e-remarks').value,
    'Billing Address': document.getElementById('e-billing').value,
    'Shipping Address': document.getElementById('e-shipping').value
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
          const btype = document.getElementById('eim-btype-' + id)?.value || '';
          if (qty > 0 && (model || btype)) totalQty += qty;   // model ya btype koi bhi ho, qty count karo
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
document.getElementById('o-date').readOnly = true;
document.getElementById('o-date').style.background = 'var(--surface2)';
document.getElementById('o-date').style.cursor = 'not-allowed';

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

/* ============================================================
   ORDER TRACKING (Admin) — Order ID daalo, poori history
   IIFE mein wrapped hai taaki esc/render private rahein.
   ============================================================ */
(function () {

  function esc(v) {
    return String(v == null ? '' : v).replace(/[<>&"']/g, c => ({
      '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&#39;'
    }[c]));
  }

  let otListBuilt = false;

  window.openTrackModal = function (orderID) {
    openModal('orderTrackModal');
    document.getElementById('trackModalTitle').textContent = '🔍 Track Order — ' + orderID;
    document.getElementById('ot-result').innerHTML = '<div class="loading"><div class="spin"></div> History load ho rahi hai...</div>';
    const inp = document.getElementById('ot-orderid');
    if (inp) inp.value = orderID;   // trackOrder isi input se padhta hai
    trackOrder();
  };

  window.loadOrderTracking = function () {
    if (otListBuilt) return;
    api({ action: 'getOrders' }, r => {
      if (!r.success) return;
      const dl = document.getElementById('ot-orderlist');
      if (dl) dl.innerHTML = (r.data || [])
        .sort((a, b) => String(b['Order ID']).localeCompare(String(a['Order ID'])))
        .map(o => `<option value="${esc(o['Order ID'] || '')}">${esc(o['Customer Name'] || '')}</option>`).join('');
      otListBuilt = true;
    });
  };

  window.trackOrder = function () {
    const oid = (document.getElementById('ot-orderid').value || '').trim();
    if (!oid) { toast('Order ID daalo', 'e'); return; }
    const box = document.getElementById('ot-result');
    box.innerHTML = '<div class="loading"><div class="spin"></div> History load ho rahi hai...</div>';

    // Ek hi call me poora data — bahut fast
    api({ action: 'getTrackOrder', 'Order ID': oid }, r => {
      if (!r || !r.success) {
        box.innerHTML = `<div class="empty"><div class="empty-ico">⚠️</div><div class="empty-txt">${(r && r.message) || 'History load nahi hui'}</div></div>`;
        return;
      }
      const bag = {
        order:         r.order || null,
        items:         r.items || [],
        chargers:      r.chargers || [],
        payments:      r.payments || [],
        totalReceived: r.totalReceived || 0,
        prod:          r.prod || [],
        crm:           r.crm || [],
        billings:      r.billings || [],
        dispatches:    r.dispatches || [],
        challans:      r.challans || [],
        slips:         r.slips || []
      };
      render(oid, bag);
      const inp = document.getElementById('ot-orderid');
      if (inp) inp.select();
    });
  };

  function render(oid, b) {
    const box = document.getElementById('ot-result');
    if (!b.order) {
      box.innerHTML = `<div class="empty"><div class="empty-ico">🔍</div><div class="empty-txt">Order <b>${esc(oid)}</b> nahi mila</div></div>`;
      return;
    }
    const o = b.order;

    const prodBy = {}; b.prod.forEach(p => { prodBy[p['Item ID']] = p; });
    const billQ = {}; b.billings.forEach(x => { const k = x['Item ID']; billQ[k] = (billQ[k] || 0) + (parseFloat(x['Billed Qty']) || 0); });
    const dispQ = {}; b.dispatches.forEach(d => { const k = d['Item ID']; dispQ[k] = (dispQ[k] || 0) + (parseFloat(d['Dispatch Qty']) || 0); });

    const orderVal = parseFloat(o['Total Order Value']) || 0;
    const received = b.totalReceived || 0;
    const balance  = orderVal - received;

    const totalQ   = b.items.reduce((s, i) => s + (parseFloat(i['Qty']) || 0), 0);
    const totalDsp = Object.values(dispQ).reduce((s, x) => s + x, 0);

    const anyProdStart = b.prod.some(p => p['Production Start Actual'] || (parseFloat(p['Produced Qty']) || 0) > 0);
    const allProdDone  = b.prod.length > 0 && b.prod.every(p => { const t = parseFloat(p['Qty']) || 0, q = parseFloat(p['Produced Qty']) || 0; return t > 0 && q >= t; });
    const anyBilled    = b.billings.length > 0;
    const anyDsp       = b.dispatches.length > 0;
    const fullDsp      = totalQ > 0 && totalDsp >= totalQ;

    const steps = [
      { l: 'Order Received', s: 'done' },
      { l: 'Production',     s: allProdDone ? 'done' : anyProdStart ? 'active' : 'todo' },
      { l: 'Billing',       s: anyBilled ? 'done' : 'todo' },
      { l: 'Dispatch',      s: fullDsp ? 'done' : anyDsp ? 'active' : 'todo' },
      
    ];
    const stepHTML = steps.map((st, i) => {
      const col = st.s === 'done' ? 'var(--success)' : st.s === 'active' ? 'var(--warning)' : 'var(--border2)';
      const ic  = st.s === 'done' ? '✓' : st.s === 'active' ? '•' : (i + 1);
      const line = i < steps.length - 1
        ? `<div style="flex:1;height:2px;background:${steps[i + 1].s !== 'todo' ? 'var(--success)' : 'var(--border2)'};margin-top:15px;min-width:20px;"></div>`
        : '';
      return `<div style="display:flex;align-items:flex-start;${i < steps.length - 1 ? 'flex:1;' : ''}">
        <div style="display:flex;flex-direction:column;align-items:center;gap:6px;min-width:60px;">
          <div style="width:30px;height:30px;border-radius:50%;background:${col};color:#fff;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:700;">${ic}</div>
          <div style="font-size:10px;font-weight:600;color:${st.s === 'todo' ? 'var(--text3)' : 'var(--text)'};text-align:center;line-height:1.2;">${st.l}</div>
        </div>${line}</div>`;
    }).join('');

    const meta = [
      ['Order ID', esc(o['Order ID'])],
      ['Order Date', fmtDisplayDate(o['Date'] || '')],
      ['Customer', esc(o['Customer Name'])],
      ['Phone', esc(o['Customer Phone'])],
      ['City', esc(o['City'])],
      ['Sales Person', esc(o['Sales Person Name'])],
      ['Assigned CRM', esc(o['Assigned CRM'])],
      ['Payment Mode', esc(o['Payment Mode'])],
      ['Plan Dispatch', fmtDisplayDate(o['Plan Dispatch Date'] || '')]
    ].map(([l, v]) => `<div class="detail-item"><div class="detail-lbl">${l}</div><div class="detail-val">${v || '—'}</div></div>`).join('');

    const balColor = balance <= 0 ? 'var(--success)' : balance < orderVal ? 'var(--warning)' : 'var(--error)';
    const moneyStrip = `
      <div class="stats-row" style="margin-bottom:0;">
        <div class="stat c-teal"><div class="stat-lbl">Order Value</div><div class="stat-val" style="font-size:18px;">₹${fmt(orderVal)}</div></div>
        <div class="stat c-green"><div class="stat-lbl">Received</div><div class="stat-val" style="font-size:18px;">₹${fmt(received)}</div></div>
        <div class="stat ${balance <= 0 ? 'c-green' : 'c-red'}"><div class="stat-lbl">Balance</div><div class="stat-val" style="font-size:18px;color:${balColor};">₹${fmt(balance)}</div></div>
        <div class="stat c-blue"><div class="stat-lbl">Total Qty</div><div class="stat-val">${totalQ}</div></div>
      </div>`;

    const itemRows = b.items.map((it, n) => {
      const iid = it['Item ID'];
      const p = prodBy[iid] || {};
      const tq = parseFloat(it['Qty']) || 0;
      const pq = parseFloat(p['Produced Qty']) || 0;
      const pend = (tq - pq) > 0 ? (tq - pq) : 0;
      const bq = billQ[iid] || 0;
      const dq = dispQ[iid] || 0;
      const st = (tq > 0 && pq >= tq)
        ? '<span class="badge b-ready">Done</span>'
        : (pq > 0 || p['Production Start Actual'])
        ? '<span class="badge b-processing">In Progress</span>'
        : '<span class="badge b-pending">Pending</span>';
      return `<tr>
        <td>${n + 1}</td>
        <td class="td-id">${esc(iid)}</td>
        <td>${esc(it['Product Model'])}</td>
        <td>${esc(it['Battery Type'])}</td>
        <td style="text-align:right;">${tq}</td>
        <td style="text-align:right;color:var(--success);font-weight:600;">${pq}</td>
        <td style="text-align:right;color:${pend ? 'var(--warning)' : 'var(--success)'};font-weight:600;">${pend || '0 ✅'}</td>
        <td style="text-align:right;color:var(--purple);font-weight:600;">${bq || '—'}</td>
        <td style="text-align:right;color:var(--accent);font-weight:600;">${dq || '—'}</td>
        <td>${st}</td>
      </tr>`;
    }).join('');

    const chargerRows = b.chargers.map((c, n) => `
      <tr>
        <td>${n + 1}</td>
        <td class="td-id">${esc(c['Charger ID'])}</td>
        <td>${esc(c['Charger Model'])}</td>
        <td style="text-align:right;">${esc(c['Qty'] || 0)}</td>
        <td style="text-align:right;">₹${fmt(c['Price/Unit'] || 0)}</td>
        <td style="text-align:right;color:var(--accent);font-weight:600;">₹${fmt(c['Total'] || 0)}</td>
      </tr>`).join('');

    const prodRows = b.prod.map(p => `
      <tr>
        <td class="td-id">${esc(p['Item ID'])}</td>
        <td>${esc(p['Product Model'])}</td>
        <td>${fmtDisplayDate(p['Production Start Actual'] || '') || '—'}</td>
        <td>${fmtDisplayDate(p['Production Complete Actual'] || '') || '—'}</td>
        <td>${p['Production Delay'] ? '<span class="badge b-delay">' + esc(p['Production Delay']) + '</span>' : '—'}</td>
      </tr>`).join('');

    const billRows = b.billings.map(x => `
      <tr>
        <td>${esc(x['Invoice No'] || '—')}</td>
        <td>${fmtDisplayDate(x['Invoice Date'] || '') || '—'}</td>
        <td class="td-id">${esc(x['Item ID'])}</td>
        <td style="text-align:right;">${esc(x['Billed Qty'] || 0)}</td>
        <td style="text-align:right;color:var(--accent);font-weight:600;">₹${fmt(x['Invoice Amount'] || 0)}</td>
      </tr>`).join('');

    const dspRows = b.dispatches.map(d => `
      <tr>
        <td class="td-id">${esc(d['Item ID'])}</td>
        <td style="text-align:right;">${esc(d['Dispatch Qty'] || 0)}</td>
        <td>${fmtDisplayDate(d['Dispatch Date'] || '') || '—'}</td>
        <td>${esc(d['Transport Name'] || '—')}</td>
        <td>${esc(d['Vehicle No'] || '—')}</td>
        <td>${esc(d['LR No'] || '—')}</td>
        <td>${esc(d['Driver No'] || '—')}</td>
      </tr>`).join('');

    const chGroups = {};
    b.challans.forEach(d => {
      const no = String(d['DC No']);
      if (!chGroups[no]) chGroups[no] = { no: d['DC No'], date: d['Date'], qty: 0, amt: 0, n: 0 };
      chGroups[no].qty += parseFloat(d['Qty']) || 0;
      chGroups[no].amt += parseFloat(d['Amount']) || 0;
      chGroups[no].n++;
    });
    const chRows = Object.values(chGroups).sort((a, b2) => Number(b2.no) - Number(a.no)).map(c => `
      <tr>
        <td class="td-id">DC #${esc(c.no)}</td>
        <td>${fmtDisplayDate(c.date || '') || '—'}</td>
        <td style="text-align:right;">${c.n}</td>
        <td style="text-align:right;">${c.qty}</td>
        <td style="text-align:right;">${c.amt ? '₹' + fmt(c.amt) : '—'}</td>
      </tr>`).join('');

    const payRows = b.payments.map(p => `
      <tr>
        <td>${fmtDisplayDate(p['Date'] || '') || '—'}</td>
        <td>${esc(p['Mode'] || '—')}</td>
        <td>${esc(p['Reference'] || '—')}</td>
        <td>${esc(p['Remarks'] || '')}</td>
        <td style="text-align:right;color:var(--success);font-weight:600;">₹${fmt(p['Amount'] || 0)}</td>
      </tr>`).join('');

    const slipHTML = b.slips.length ? b.slips.map(s => `
      <a href="${esc(s.url)}" target="_blank" class="slip-item" style="text-decoration:none;">
        <span class="slip-icon">${String(s.name || '').toLowerCase().endsWith('.pdf') ? '📄' : '🖼️'}</span>
        <div class="slip-info"><div class="slip-name">${esc(s.name)}</div><div class="slip-date">${esc(s.date)}</div></div>
        <span class="btn btn-sm btn-info">View</span>
      </a>`).join('') : '<div style="padding:14px;text-align:center;color:var(--text3);font-size:12px;">Koi payment slip upload nahi hui</div>';

    const crm0 = b.crm[0] || {};
    const crmNote = (crm0['Current Stage'] || crm0['Remarks'])
      ? `<div style="padding:12px 16px;">
           ${crm0['Current Stage'] ? `<div style="margin-bottom:6px;"><span class="detail-lbl">Current Stage</span> <span class="badge b-processing">${esc(crm0['Current Stage'])}</span></div>` : ''}
           ${crm0['Follow-up With'] ? `<div style="font-size:12px;color:var(--text2);margin-bottom:4px;">Follow-up: <b>${esc(crm0['Follow-up With'])}</b></div>` : ''}
           ${crm0['Remarks'] ? `<div style="font-size:12px;color:var(--text2);">📝 ${esc(crm0['Remarks'])}</div>` : ''}
         </div>`
      : '';

    const cardTbl = (title, heads, rows, empty) => `
      <div class="card">
        <div class="card-head"><div class="card-title">${title}</div></div>
        ${rows
          ? `<div class="table-wrap"><table><thead><tr>${heads.map(h => `<th>${h}</th>`).join('')}</tr></thead><tbody>${rows}</tbody></table></div>`
          : `<div style="padding:16px;text-align:center;color:var(--text3);font-size:12px;">${empty}</div>`}
      </div>`;

    box.innerHTML = `
      <div class="card">
        <div class="card-head" style="flex-wrap:wrap;gap:8px;">
          <div class="card-title">${esc(o['Order ID'])} — ${esc(o['Customer Name'])}</div>
          <div style="display:flex;gap:6px;flex-wrap:wrap;">${orderStatusBadge(o['Order Status'])} ${payStatusBadge(o['Payment Status'])}</div>
        </div>
        <div style="padding:16px;">
          <div style="display:flex;align-items:flex-start;margin-bottom:18px;overflow-x:auto;padding-bottom:4px;">${stepHTML}</div>
          <div class="detail-grid" style="margin-bottom:14px;">${meta}</div>
          ${moneyStrip}
          ${o['Order Remarks'] ? `<div style="margin-top:14px;padding:9px 12px;border:1px solid var(--border);border-radius:var(--r);font-size:12px;"><b>Remarks:</b> ${esc(o['Order Remarks'])}</div>` : ''}
        </div>
      </div>
      ${cardTbl('📦 Order Items', ['#', 'Item ID', 'Product Model', 'Battery Type', 'Qty', 'Produced', 'Pending', 'Billed', 'Dispatched', 'Prod Status'], itemRows, 'Koi item nahi')}
      ${b.chargers.length ? cardTbl('⚡ Chargers', ['#', 'Charger ID', 'Model', 'Qty', 'Rate/Unit', 'Total (incl. GST)'], chargerRows, '') : ''}
      ${cardTbl('⚙️ Production', ['Item ID', 'Product Model', 'Start Actual', 'Complete Actual', 'Delay'], prodRows, 'Production data nahi hai abhi')}
      ${cardTbl('🧾 Billing', ['Invoice No', 'Invoice Date', 'Item ID', 'Billed Qty', 'Amount'], billRows, 'Koi billing entry nahi')}
      ${cardTbl('🚚 Dispatch', ['Item ID', 'Qty', 'Date', 'Transport', 'Vehicle', 'LR No', 'Driver'], dspRows, 'Koi dispatch nahi hua abhi')}
      ${cardTbl('📄 Delivery Challans', ['DC No', 'Date', 'Items', 'Total Qty', 'Amount'], chRows, 'Koi challan nahi bana')}
      ${cardTbl('💵 Payments', ['Date', 'Mode', 'Reference', 'Remarks', 'Amount'], payRows, 'Koi payment entry nahi')}
      <div class="card"><div class="card-head"><div class="card-title">📎 Payment Slips</div></div><div style="padding:12px 16px;">${slipHTML}</div></div>
      ${crmNote ? `<div class="card"><div class="card-head"><div class="card-title">🎯 CRM</div></div>${crmNote}</div>` : ''}
    `;
  }

})();

