/* ============================================================
   LitpaxTrack — public order tracking (frontend logic)
   Cross-origin GitHub Pages -> GAS, isliye JSONP (callback).
   ============================================================ */

var CFG = window.APP_CONFIG || {};
var API = CFG.API_URL;

// footer/company text
(function () {
  var el = document.getElementById('footCompany');
  if (el && CFG.COMPANY) el.textContent = CFG.COMPANY;
})();

var phoneInput = document.getElementById('phone');
var trackBtn   = document.getElementById('trackBtn');
var formMsg    = document.getElementById('formMsg');
var resultBox  = document.getElementById('result');

/* ---------- JSONP helper (ERP jaisa) with timeout ---------- */
function jsonp(params, cb) {
  var key = 'ltk_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);
  var done = false;
  var timer;

  window[key] = function (res) {
    if (done) return;
    done = true;
    clearTimeout(timer);
    cleanup();
    cb(res);
  };

  var qs = Object.keys(params)
    .map(function (k) { return encodeURIComponent(k) + '=' + encodeURIComponent(params[k]); })
    .join('&');

  var s = document.createElement('script');
  s.src = API + '?' + qs + '&callback=' + key;
  s.onerror = function () {
    if (done) return;
    done = true;
    clearTimeout(timer);
    cleanup();
    cb({ success: false, _network: true, message: 'Network error' });
  };

  function cleanup() {
    try { delete window[key]; } catch (e) { window[key] = undefined; }
    if (s.parentNode) s.parentNode.removeChild(s);
  }

  timer = setTimeout(function () {
    if (done) return;
    done = true;
    cleanup();
    cb({ success: false, _network: true, message: 'Request timed out' });
  }, 15000);

  document.body.appendChild(s);
}

/* ---------- input helpers ---------- */
function showMsg(text) {
  formMsg.textContent = text;
  formMsg.classList.add('show');
}
function clearMsg() {
  formMsg.textContent = '';
  formMsg.classList.remove('show');
}
[phoneInput].forEach(function (inp) {
  inp.addEventListener('input', function () {
    inp.classList.remove('err');
    clearMsg();
  });
  inp.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') track();
  });
});

function setLoading(on) {
  if (on) { trackBtn.classList.add('loading'); trackBtn.disabled = true; }
  else    { trackBtn.classList.remove('loading'); trackBtn.disabled = false; }
}

/* ---------- main action ---------- */
var currentPhone = '';

function track() {
  var phone = phoneInput.value.trim();

  if (phone.replace(/\D/g, '').length < 10) {
    phoneInput.classList.add('err');
    showMsg('Please enter a valid 10-digit phone number.');
    return;
  }

  if (!API || API.indexOf('PASTE') === 0) {
    showMsg('Tracking is not configured yet.');
    return;
  }

  currentPhone = phone;
  clearMsg();
  setLoading(true);
  resultBox.innerHTML = '';

  jsonp({ action: 'getOrdersByPhone', 'Phone': phone }, function (res) {
    setLoading(false);

    if (res && res._network) {
      showMsg('Could not connect. Please check your internet and try again.');
      return;
    }
    if (!res || !res.success) {
      showMsg((res && res.message) || 'No orders found for this phone number.');
      return;
    }
    renderOrderList(res.orders || []);
  });
}
trackBtn.addEventListener('click', track);

/* ---------- render ---------- */
function esc(v) {
  return String(v == null ? '' : v).replace(/[<>&"']/g, function (c) {
    return { '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&#39;' }[c];
  });
}

/* ---------- orders list (phone ke saare orders) ---------- */
function renderOrderList(orders) {
  if (!orders.length) { showMsg('No orders found for this phone number.'); return; }

  var rowsHTML = orders.map(function (o) {
    var cls = o.status === 'Dispatched' ? 'b-dispatched'
            : o.status === 'Ready'      ? 'b-ready'
            : o.status === 'In Production' ? 'b-inprod'
            : 'b-pending';
    return '<div class="order-row" onclick="openOrder(\'' + esc(o.orderId) + '\')">' +
        '<div class="order-row-main">' +
          '<div class="order-row-id">' + esc(o.orderId) + '</div>' +
          '<div class="order-row-sub">' + esc(o.orderDate || '') +
            (o.city ? '  ·  ' + esc(o.city) : '') + '</div>' +
        '</div>' +
        '<span class="badge ' + cls + '">' + esc(o.status) + '</span>' +
        '<span class="order-row-arrow">›</span>' +
      '</div>';
  }).join('');

  resultBox.innerHTML =
    '<div class="card">' +
      '<div class="sec-title">Your Orders (' + orders.length + ')</div>' +
      rowsHTML +
    '</div>';
  resultBox.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/* ek order pe click -> uski poori detail */
function openOrder(orderId) {
  clearMsg();
  setLoading(true);
  resultBox.innerHTML = '<div class="card"><div class="loading-box">Loading order ' + esc(orderId) + '…</div></div>';

  jsonp({ action: 'getPublicTrack', 'Order ID': orderId, 'Phone': currentPhone }, function (res) {
    setLoading(false);
    if (res && res._network) { showMsg('Could not connect. Please try again.'); return; }
    if (!res || !res.success) { showMsg((res && res.message) || 'Could not load this order.'); return; }
    renderResult(res, true);
  });
}

function renderResult(r, showBack) {
  var o = r.order || {};
  var backHTML = showBack
    ? '<button class="btn-back" onclick="track()">‹ Back to all orders</button>'
    : '';

  var meta = [];
  if (o.orderDate)        meta.push(['Order Date', o.orderDate]);
  if (o.city)             meta.push(['City', o.city]);
  if (o.expectedDispatch) meta.push(['Expected Dispatch', o.expectedDispatch]);

  var metaHTML = meta.map(function (m) {
    return '<span class="m"><b>' + esc(m[1]) + '</b><br>' +
      '<span style="color:var(--text3);font-size:11px;">' + esc(m[0]) + '</span></span>';
  }).join('');

  // stepper
  var steps = r.steps || [];
  var stepHTML = steps.map(function (st, i) {
    var dotCls = st.state === 'done' ? 'done' : st.state === 'active' ? 'active' : '';
    var ic = st.state === 'done' ? '✓' : (i + 1);
    var line = '';
    if (i < steps.length - 1) {
      var next = steps[i + 1];
      var lineDone = (next.state === 'done' || next.state === 'active') ? 'done' : '';
      line = '<div class="step-line ' + lineDone + '"></div>';
    }
    return '<div class="step">' +
        '<div class="step-core">' +
          '<div class="step-dot ' + dotCls + '">' + ic + '</div>' +
          '<div class="step-label ' + (st.state === 'todo' ? '' : 'on') + '">' + esc(st.label) + '</div>' +
        '</div>' + line +
      '</div>';
  }).join('');

  // items
  var items = r.items || [];
  var itemHTML = items.map(function (it) {
    var cls = it.status === 'Dispatched' ? 'b-dispatched'
            : it.status === 'Ready'      ? 'b-ready'
            : it.status === 'In Production' ? 'b-inprod'
            : 'b-pending';
    var sub = [it.type, 'Qty: ' + it.qty].filter(Boolean).join('  ·  ');
    return '<div class="item">' +
        '<div class="item-main">' +
          '<div class="item-model">' + esc(it.model || 'Item') + '</div>' +
          '<div class="item-sub">' + esc(sub) + '</div>' +
        '</div>' +
        '<span class="badge ' + cls + '">' + esc(it.status) + '</span>' +
      '</div>';
  }).join('');

  // dispatch detail
  var dsp = r.dispatches || [];
  var dspHTML = dsp.map(function (d) {
    var parts = [];
    if (d.transport) parts.push('<span class="k">Transport:</span> ' + esc(d.transport));
    if (d.lrNo)      parts.push('<span class="k">LR No:</span> ' + esc(d.lrNo));
    if (d.vehicle)   parts.push('<span class="k">Vehicle:</span> ' + esc(d.vehicle));
    return '<div class="dsp">' +
        '<div class="dsp-top">' + esc(d.date || '') + '  ·  Qty ' + esc(d.qty) + '</div>' +
        (parts.length ? '<div class="dsp-sub">' + parts.join('&nbsp; · &nbsp;') + '</div>' : '') +
      '</div>';
  }).join('');

  var html =
    '<div class="card">' +
      '<div class="res-head">' +
        '<div class="res-order">' + esc(o.orderId || '') + '</div>' +
        (o.customerName ? '<div class="res-cust">' + esc(o.customerName) + '</div>' : '') +
      '</div>' +
      (metaHTML ? '<div class="res-meta">' + metaHTML + '</div>' : '') +
      '<div class="stepper">' + stepHTML + '</div>' +
    '</div>';

  if (items.length) {
    html += '<div class="card">' +
        '<div class="sec-title">Items</div>' + itemHTML +
      '</div>';
  }

  if (dsp.length) {
    html += '<div class="card">' +
        '<div class="sec-title">Dispatch Details</div>' + dspHTML +
      '</div>';
  }

   resultBox.innerHTML = backHTML + html;
  resultBox.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/* ---------- PWA (installable) ---------- */
if ('serviceWorker' in navigator) {
  window.addEventListener('load', function () {
    navigator.serviceWorker.register('sw.js').catch(function () { /* ignore */ });
  });
}
