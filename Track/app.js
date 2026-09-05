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

var orderInput = document.getElementById('orderId');
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
[orderInput, phoneInput].forEach(function (inp) {
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
function track() {
  var orderId = orderInput.value.trim();
  var phone   = phoneInput.value.trim();

  var bad = false;
  if (!orderId) { orderInput.classList.add('err'); bad = true; }
  if (phone.replace(/\D/g, '').length < 10) { phoneInput.classList.add('err'); bad = true; }
  if (bad) { showMsg('Please enter a valid Order ID and phone number.'); return; }

  if (!API || API.indexOf('PASTE') === 0) {
    showMsg('Tracking is not configured yet.');
    return;
  }

  clearMsg();
  setLoading(true);
  resultBox.innerHTML = '';

  jsonp({ action: 'getPublicTrack', 'Order ID': orderId, 'Phone': phone }, function (res) {
    setLoading(false);

    if (res && res._network) {
      // network fail — inputs waise hi rehne do, dobara try kar sake
      showMsg('Could not connect. Please check your internet and try again.');
      return;
    }
    if (!res || !res.success) {
      showMsg((res && res.message) || 'No order found. Please check your details.');
      return;
    }
    renderResult(res);
  });
}
trackBtn.addEventListener('click', track);

/* ---------- render ---------- */
function esc(v) {
  return String(v == null ? '' : v).replace(/[<>&"']/g, function (c) {
    return { '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&#39;' }[c];
  });
}

function renderResult(r) {
  var o = r.order || {};

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

  resultBox.innerHTML = html;
  resultBox.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/* ---------- PWA (installable) ---------- */
if ('serviceWorker' in navigator) {
  window.addEventListener('load', function () {
    navigator.serviceWorker.register('sw.js').catch(function () { /* ignore */ });
  });
}
