// \u2500\u2500 Deployment values: Script Properties, never this file \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
// This file deploys UNCHANGED to every retailer's Apps Script project and
// carries no deployment-specific value. Each value below is read per request
// from the project's Script Properties (Project Settings -> Script
// Properties; docs/gas-activation-runbook.md) by _loadDeploymentConfig():
//   UNSUBSCRIBE_URL     required  https:// unsubscribe destination
//   POSTAL_ADDRESS      required  the retailer's physical postal address
//   PRIVACY_CONTACT     required  privacy / data-request email address
//   RESULT_EMAIL_BCC    optional  lead-intake copy address; blank = no BCC
//   REPLY_TO            optional  reply-to address; blank = the sender
//   LEADS_SHEET_NAME    optional  leads tab name; blank = 'Leads'
// The module-level values start blank and are filled only by
// _loadDeploymentConfig(); a blank or malformed required value refuses the
// request (see the CAN-SPAM block below).
var RESULT_EMAIL_BCC = '';
var REPLY_TO = '';
var DEFAULT_LEADS_SHEET_NAME = 'Leads';
var LEADS_SHEET_NAME = DEFAULT_LEADS_SHEET_NAME;
// The Leads tab's header row, written once when the tab is created. The
// column contract (append-only, right-most additions) is
// docs/gas-rsa-field-addition.md.
var LEADS_HEADER = ['Timestamp', 'Name', 'Email', 'Phone', 'Dream Code', 'Lang',
  'Matches', 'Accessories', 'RSA', 'Send ID'];

// Defensive payload ceiling, not a merchandising limit. The kiosk currently
// selects at most one product per Sleep System step, but future stores may add
// more categories and should not silently lose items after the third.
var MAX_EMAIL_ACCESSORIES = 20;

// Defensive ceiling for the trial-priorities block (0.5). The engine produces
// one to three; anything past the third is hostile or malformed input, never
// legitimate content, so the cap is a hard bound rather than a display choice.
var MAX_EMAIL_PRIORITIES = 3;

// \u2500\u2500 Send identity + duplicate suppression \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
// Every request carries a client-generated `sendId` (crypto.getRandomValues,
// reused for the client's automatic retry of the same content). A request
// without a well-formed one is refused `invalid_request` before anything is
// written or sent. A sendId that already produced a successful send answers
// {success:true, duplicate:true} with NO sheet row and NO email, so a retry
// after a lost response can never mail the customer twice. The record lives
// in the script cache (CacheService; best-effort, 6 h maximum lifetime) and
// the check-then-send runs under the script lock (LockService) so two
// concurrent deliveries of one sendId cannot both pass the check. Neither
// service (nor PropertiesService) needs an OAuth scope beyond the two the
// manifest declares (appsscript.json: script.send_mail for MailApp,
// spreadsheets.currentonly for the bound leads Sheet).
var SEND_ID_PATTERN = /^[A-Za-z0-9_-]{22,40}$/;
var SEND_DEDUPE_PREFIX = 'df-sent:';
var SEND_DEDUPE_TTL_SECONDS = 21600;   // CacheService maximum (6 hours)
var SEND_LOCK_WAIT_MS = 10000;

// \u2500\u2500 Purchase summary ("Your quote") ceilings \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
// The quote is rendered VERBATIM from the client's purchase summary (the same
// formatted strings the kiosk screen shows). The server does no arithmetic on
// it. A summary past these ceilings is refused WHOLE rather than shortened: a
// truncated line list under totals that still count the hidden lines would
// misstate the purchase.
var MAX_QUOTE_LINES = 20;
var MAX_QUOTE_OFFER_TERMS = 6;
var MAX_QUOTE_LINE_DISCOUNTS = 6;
var MAX_QUOTE_LINE_QUANTITY = 99;

// \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
// CAN-SPAM / privacy footer values \u2014 \u26a0\ufe0f UNSET until the deployment's
// Script Properties hold them. The active retailer (Lacks Furniture for this
// deployment) must supply and approve every value BEFORE live lead capture.
// CAN-SPAM requires (a) a working unsubscribe mechanism, honored within 10
// business days and kept live >=30 days, and (b) a valid physical postal
// address in every commercial email. No values are guessed or invented here:
// doPost() REFUSES to send any email (canspam_not_configured) while any of the
// three is unset, blank, malformed or still a RETAILER_APPROVAL_REQUIRED
// placeholder, so live capture is hard-blocked until real, retailer-approved
// values are set AND the unsubscribe inbox is actively monitored. (gasUrl in
// store-config.json must also stay blank until then \u2014 it is blank in this
// deployment.)
// \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
var CANSPAM_SENTINEL = 'RETAILER_APPROVAL_REQUIRED';
var UNSUBSCRIBE_URL = '';
var POSTAL_ADDRESS  = '';
var PRIVACY_CONTACT = '';

// Reads the deployment values from Script Properties into the module-level
// values above (each Apps Script execution starts from a fresh global scope,
// so nothing carries over between requests). Returns the names of the values
// that refuse the request: `required` (CAN-SPAM: unset, blank, malformed or
// a sentinel) and `invalid` (an optional value that is set but malformed).
// Names only - a value is never logged.
function _loadDeploymentConfig() {
  var props = PropertiesService.getScriptProperties();
  var read = function(key) {
    var v = props.getProperty(key);
    return typeof v === 'string' ? v.trim() : '';
  };
  UNSUBSCRIBE_URL = read('UNSUBSCRIBE_URL');
  POSTAL_ADDRESS = read('POSTAL_ADDRESS');
  PRIVACY_CONTACT = read('PRIVACY_CONTACT');
  RESULT_EMAIL_BCC = read('RESULT_EMAIL_BCC');
  REPLY_TO = read('REPLY_TO');
  LEADS_SHEET_NAME = read('LEADS_SHEET_NAME') || DEFAULT_LEADS_SHEET_NAME;

  var required = [];
  var unset = function(v) { return !v || v.indexOf(CANSPAM_SENTINEL) !== -1; };
  if (unset(UNSUBSCRIBE_URL) || !/^https:\/\/[^\s<>"']+\.[^\s<>"']+$/i.test(UNSUBSCRIBE_URL)) required.push('UNSUBSCRIBE_URL');
  if (unset(POSTAL_ADDRESS) || POSTAL_ADDRESS.length > 300) required.push('POSTAL_ADDRESS');
  if (unset(PRIVACY_CONTACT) || !_isValidEmail(PRIVACY_CONTACT)) required.push('PRIVACY_CONTACT');

  var invalid = [];
  if (RESULT_EMAIL_BCC && !_isValidEmail(RESULT_EMAIL_BCC)) invalid.push('RESULT_EMAIL_BCC');
  if (REPLY_TO && !_isValidEmail(REPLY_TO)) invalid.push('REPLY_TO');
  if (LEADS_SHEET_NAME.length > 100) invalid.push('LEADS_SHEET_NAME');
  return { required: required, invalid: invalid };
}

// The leads tab, by name (never whichever tab happens to be active): created
// with the header row when it does not exist yet. The script is container-
// bound to the leads Spreadsheet, so getActiveSpreadsheet() is that file.
function _leadsSheet() {
  var book = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = book.getSheetByName(LEADS_SHEET_NAME);
  if (!sheet) {
    sheet = book.insertSheet(LEADS_SHEET_NAME);
    sheet.appendRow(LEADS_HEADER);
    sheet.setFrozenRows(1);
  }
  return sheet;
}

// Helper: escape five HTML metacharacters; safe for attribute values and text content.
function _escapeHtml(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, function(ch) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch];
  });
}

// Helper: permissive email shape check; not full RFC 5322. Catches empty / missing-@ / obvious typos.
function _isValidEmail(s) {
  if (typeof s !== 'string') return false;
  var t = s.trim();
  if (t.length < 3 || t.length > 254) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(t);
}

// Helper: restrict to supported languages; default to 'en'.
function _normalizeLang(s) {
  return s === 'es' ? 'es' : 'en';
}

// Helper: coerce + bound length only. Does NOT strip characters (accents, apostrophes, hyphens, Spanish chars).
function _safeText(s, max) {
  if (s == null) return '';
  var str = String(s);
  if (max && str.length > max) str = str.slice(0, max);
  return str;
}

// Helper: allow https:// URLs and repo-relative images/ paths only. Empty otherwise (existing fallback block renders).
// URL-encodes the result (encodeURI) so filenames with spaces \u2014 e.g.
// "pro breeze 2.0 medium hybrid.jpg" \u2014 become %20 and load in strict clients
// like desktop Gmail's image proxy. encodeURI is idempotent for already-valid
// URLs (leaves :/?#& and existing %XX intact); falls back to the raw value if
// the string can't be encoded.
function _safeImageUrl(url) {
  if (typeof url !== 'string') return '';
  var t = url.trim();
  if (!t) return '';
  var ok = /^https:\/\//i.test(t) || /^images\//.test(t);
  if (!ok) return '';
  try { return encodeURI(t); } catch (e) { return t; }
}

// Helper: how many of one accessory the customer chose. A whole number from
// 1 to MAX_ACCESSORY_QUANTITY as sent; anything else - absent (a payload
// written before quantities existed), a string, a fraction, zero, negative or
// above the ceiling - is ONE, because a listed accessory is at least one unit
// and an untrusted count is never repeated to the customer as their own.
var MAX_ACCESSORY_QUANTITY = 4;
function _safeQuantity(v) {
  if (typeof v !== 'number' || !isFinite(v) || Math.floor(v) !== v) return 1;
  if (v < 1 || v > MAX_ACCESSORY_QUANTITY) return 1;
  return v;
}

// Helper: coerce to array; returns [] for non-array inputs.
function _safeArray(v) {
  return Array.isArray(v) ? v : [];
}

// Helper: a quote string. STRING-TYPED (a non-string is '', never
// "[object Object]" or a coerced number), trimmed, bounded.
function _quoteText(v, max) {
  var t = typeof v === 'string' ? v.trim() : '';
  return t ? _safeText(t, max) : '';
}

// The purchase summary ("Your quote"), projected onto a fresh closed literal.
// Returns null - the section is then absent from BOTH MIME parts - unless the
// record is a v:1 USD summary whose every line carries a name, a list figure
// and a net figure and whose payment block is one of the three closed kinds
// with its required text. ALL-OR-NOTHING, like the priorities block: a
// malformed or oversized summary is never rendered partially. Numeric fields
// the client carries for its own use (merchandiseMinor, discountMinor,
// paymentMinor) are deliberately not projected: the email shows the screen's
// formatted figures only, and nothing here computes one.
function _safeQuote(q) {
  if (!q || typeof q !== 'object' || Array.isArray(q) || q.v !== 1) return null;
  if (q.currency !== 'USD') return null;
  if (!Array.isArray(q.lines) || q.lines.length === 0 || q.lines.length > MAX_QUOTE_LINES) return null;
  var rawTerms = q.offerTerms == null ? [] : q.offerTerms;
  if (!Array.isArray(rawTerms) || rawTerms.length > MAX_QUOTE_OFFER_TERMS) return null;

  var lines = [];
  for (var i = 0; i < q.lines.length; i++) {
    var l = q.lines[i];
    if (!l || typeof l !== 'object' || Array.isArray(l)) return null;
    var qty = l.quantity;
    if (typeof qty !== 'number' || !isFinite(qty) || Math.floor(qty) !== qty
        || qty < 1 || qty > MAX_QUOTE_LINE_QUANTITY) return null;
    var rawDiscounts = l.discounts == null ? [] : l.discounts;
    if (!Array.isArray(rawDiscounts) || rawDiscounts.length > MAX_QUOTE_LINE_DISCOUNTS) return null;
    var discounts = [];
    for (var d = 0; d < rawDiscounts.length; d++) {
      var rd = rawDiscounts[d];
      var dLabel = _quoteText(rd && rd.label, 200);
      var dAmount = _quoteText(rd && rd.amountText, 60);
      if (!dLabel || !dAmount) return null;
      discounts.push({ label: dLabel, amountText: dAmount });
    }
    var line = {
      name: _quoteText(l.name, 200),
      detail: _quoteText(l.detail, 200),
      quantity: qty,
      listText: _quoteText(l.listText, 60),
      discounts: discounts,
      netText: _quoteText(l.netText, 60)
    };
    if (!line.name || !line.listText || !line.netText) return null;
    lines.push(line);
  }

  var offerTerms = [];
  for (var k = 0; k < rawTerms.length; k++) {
    var term = _quoteText(rawTerms[k], 600);
    if (!term) return null;
    offerTerms.push(term);
  }

  var p = q.payment;
  if (!p || typeof p !== 'object' || Array.isArray(p)) return null;
  var payment;
  if (p.kind === 'full') {
    payment = { kind: 'full', totalText: _quoteText(p.totalText, 60) };
    if (!payment.totalText) return null;
  } else if (p.kind === 'plan') {
    payment = {
      kind: 'plan',
      planLabel: _quoteText(p.planLabel, 200),
      aprText: _quoteText(p.aprText, 60),
      termText: _quoteText(p.termText, 60),
      downText: _quoteText(p.downText, 60),
      financedText: _quoteText(p.financedText, 60),
      paymentText: _quoteText(p.paymentText, 60),
      totalPaidText: _quoteText(p.totalPaidText, 60),
      interestText: _quoteText(p.interestText, 60),
      disclosure: _quoteText(p.disclosure, 1000)
    };
    if (!payment.planLabel || !payment.paymentText || !payment.financedText) return null;
  } else if (p.kind === 'quote-only') {
    payment = { kind: 'quote-only', planLabel: _quoteText(p.planLabel, 200), note: _quoteText(p.note, 400) };
    if (!payment.planLabel) return null;
  } else {
    return null;
  }

  var out = {
    sizeLabel: _quoteText(q.sizeLabel, 60),
    lines: lines,
    listSubtotalText: _quoteText(q.listSubtotalText, 60),
    discountText: _quoteText(q.discountText, 60),
    merchandiseText: _quoteText(q.merchandiseText, 60),
    exclusionsText: _quoteText(q.exclusionsText, 400),
    offerTerms: offerTerms,
    payment: payment,
    provenance: _quoteText(q.provenance, 300)
  };
  if (!out.merchandiseText) return null;
  return out;
}

// Localized labels for the quote section (both MIME parts read the same set).
function _quoteLabels(isEs) {
  return isEs ? {
    heading: 'Tu cotizaci\u00f3n',
    size: 'Tama\u00f1o',
    qty: 'Cant.',
    list: 'Precio de lista',
    net: 'Tu precio',
    listSubtotal: 'Subtotal de lista',
    discounts: 'Descuentos',
    merchandise: 'Subtotal de mercanc\u00eda',
    offerTerms: 'T\u00e9rminos de la oferta',
    payFull: 'Pago de contado',
    total: 'Total',
    plan: 'Plan',
    apr: 'APR',
    term: 'Plazo',
    down: 'Pago inicial',
    financed: 'Monto financiado',
    payment: 'Pago mensual',
    totalPaid: 'Total pagado',
    charge: 'Inter\u00e9s'
  } : {
    heading: 'Your quote',
    size: 'Size',
    qty: 'Qty',
    list: 'List price',
    net: 'Your price',
    listSubtotal: 'List subtotal',
    discounts: 'Discounts',
    merchandise: 'Merchandise subtotal',
    offerTerms: 'Offer terms',
    payFull: 'Pay in full',
    total: 'Total',
    plan: 'Plan',
    apr: 'APR',
    term: 'Term',
    down: 'Down payment',
    financed: 'Amount financed',
    payment: 'Monthly payment',
    totalPaid: 'Total paid',
    charge: 'Interest'
  };
}

// The quote's text/plain block. Angle brackets stripped like the priority
// lines so hostile markup cannot arrive looking like markup.
function buildQuotePlain(quote, isEs) {
  if (!quote) return '';
  var Q = _quoteLabels(isEs);
  var s = function(v) { return String(v || '').replace(/[<>]/g, ''); };
  var out = [Q.heading + (quote.sizeLabel ? ' (' + Q.size + ': ' + s(quote.sizeLabel) + ')' : '') + ':'];
  quote.lines.forEach(function(l, i) {
    out.push((i + 1) + '. ' + s(l.name) + (l.quantity > 1 ? ' x ' + l.quantity : '')
      + (l.detail ? ' - ' + s(l.detail) : ''));
    out.push('   ' + Q.list + ': ' + s(l.listText));
    l.discounts.forEach(function(dc) { out.push('   ' + s(dc.label) + ': ' + s(dc.amountText)); });
    out.push('   ' + Q.net + ': ' + s(l.netText));
  });
  if (quote.listSubtotalText) out.push(Q.listSubtotal + ': ' + s(quote.listSubtotalText));
  if (quote.discountText) out.push(Q.discounts + ': ' + s(quote.discountText));
  out.push(Q.merchandise + ': ' + s(quote.merchandiseText));
  if (quote.exclusionsText) out.push(s(quote.exclusionsText));
  var p = quote.payment;
  if (p.kind === 'full') {
    out.push(Q.payFull + ' - ' + Q.total + ': ' + s(p.totalText));
  } else if (p.kind === 'plan') {
    out.push(Q.plan + ': ' + s(p.planLabel));
    [[Q.apr, p.aprText], [Q.term, p.termText], [Q.down, p.downText], [Q.financed, p.financedText],
     [Q.payment, p.paymentText], [Q.totalPaid, p.totalPaidText], [Q.charge, p.interestText]]
      .forEach(function(r) { if (r[1]) out.push('   ' + r[0] + ': ' + s(r[1])); });
    if (p.disclosure) out.push(s(p.disclosure));
  } else {
    out.push(Q.plan + ': ' + s(p.planLabel));
    if (p.note) out.push(s(p.note));
  }
  if (quote.offerTerms.length) {
    out.push(Q.offerTerms + ':');
    quote.offerTerms.forEach(function(tm) { out.push('- ' + s(tm)); });
  }
  if (quote.provenance) out.push(s(quote.provenance));
  return out.join('\n');
}

// The quote's HTML section: one table row of the outer email table. Simple
// nested tables with inline styles only (Outlook-safe; no flex, no grid, no
// classes); every payload-derived value escaped at its interpolation; nothing
// payload-sourced enters a style attribute. `c`, `sans`, `serif` are the
// template's palette and font stacks.
function buildQuoteHtml(quote, isEs, c, sans, serif) {
  if (!quote) return '';
  var Q = _quoteLabels(isEs);
  var e = _escapeHtml;
  var cell = 'font-family:' + sans + ';font-size:12px;color:' + c.text + ';line-height:1.45;';
  var muted = 'font-family:' + sans + ';font-size:11px;color:' + c.textMuted + ';line-height:1.45;';
  var fig = 'font-family:' + sans + ';font-size:12px;color:' + c.text + ';text-align:right;white-space:nowrap;';
  function row(label, value, strong) {
    return '<tr><td style="' + cell + 'padding:4px 0;' + (strong ? 'font-weight:700;' : '') + '">' + label + '</td>'
      + '<td align="right" style="' + fig + 'padding:4px 0;' + (strong ? 'font-weight:700;' : '') + '">' + value + '</td></tr>';
  }
  var linesHtml = quote.lines.map(function(l) {
    return '<tr><td colspan="2" style="padding:10px 0 2px;border-top:1px solid ' + c.border + ';">'
      + '<div style="font-family:' + serif + ';font-size:15px;color:' + c.text + ';line-height:1.25;">' + e(l.name)
      + (l.quantity > 1 ? ' <span style="white-space:nowrap;">&times; ' + l.quantity + '</span>' : '') + '</div>'
      + (l.detail ? '<div style="' + muted + '">' + e(l.detail) + '</div>' : '')
      + '</td></tr>'
      + row(Q.list, e(l.listText))
      + l.discounts.map(function(dc) { return row(e(dc.label), e(dc.amountText)); }).join('')
      + row(Q.net, e(l.netText), true);
  }).join('');
  var totals = (quote.listSubtotalText ? row(Q.listSubtotal, e(quote.listSubtotalText)) : '')
    + (quote.discountText ? row(Q.discounts, e(quote.discountText)) : '')
    + row(Q.merchandise, e(quote.merchandiseText), true);
  var p = quote.payment;
  var payHtml;
  if (p.kind === 'full') {
    payHtml = row(Q.payFull + ' &mdash; ' + Q.total, e(p.totalText), true);
  } else if (p.kind === 'plan') {
    payHtml = row(Q.plan, e(p.planLabel), true)
      + [[Q.apr, p.aprText], [Q.term, p.termText], [Q.down, p.downText], [Q.financed, p.financedText],
         [Q.payment, p.paymentText], [Q.totalPaid, p.totalPaidText], [Q.charge, p.interestText]]
        .filter(function(r) { return r[1]; })
        .map(function(r) { return row(r[0], e(r[1])); }).join('')
      + (p.disclosure ? '<tr><td colspan="2" style="' + muted + 'padding:6px 0 0;">' + e(p.disclosure) + '</td></tr>' : '');
  } else {
    payHtml = row(Q.plan, e(p.planLabel), true)
      + (p.note ? '<tr><td colspan="2" style="' + muted + 'padding:4px 0 0;">' + e(p.note) + '</td></tr>' : '');
  }
  return '<tr><td style="padding:8px 32px 24px;">'
    + '<div style="font-family:' + sans + ';font-size:10px;letter-spacing:2.5px;color:' + c.accent + ';text-transform:uppercase;font-weight:600;margin-bottom:10px;">'
    + Q.heading + (quote.sizeLabel ? ' &middot; ' + e(quote.sizeLabel) : '') + '</div>'
    + '<table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation" style="background:' + c.surface + ';border:1px solid ' + c.border + ';border-left:4px solid ' + c.red + ';border-radius:3px;">'
    + '<tr><td style="padding:6px 18px 14px;">'
    + '<table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation">'
    + linesHtml
    + '<tr><td colspan="2" style="padding:6px 0 0;border-top:1px solid ' + c.border + ';font-size:0;line-height:0;">&nbsp;</td></tr>'
    + totals
    + (quote.exclusionsText ? '<tr><td colspan="2" style="' + muted + 'padding:2px 0 6px;">' + e(quote.exclusionsText) + '</td></tr>' : '')
    + '<tr><td colspan="2" style="padding:6px 0 0;border-top:1px solid ' + c.border + ';font-size:0;line-height:0;">&nbsp;</td></tr>'
    + payHtml
    + (quote.offerTerms.length
        ? '<tr><td colspan="2" style="padding:10px 0 0;">'
          + '<div style="' + muted + 'font-weight:700;text-transform:uppercase;letter-spacing:1px;font-size:10px;">' + Q.offerTerms + '</div>'
          + quote.offerTerms.map(function(tm) { return '<div style="' + muted + 'margin-top:3px;">' + e(tm) + '</div>'; }).join('')
          + '</td></tr>'
        : '')
    + (quote.provenance ? '<tr><td colspan="2" style="font-family:' + sans + ';font-size:10px;color:' + c.textSubtle + ';padding:8px 0 0;">' + e(quote.provenance) + '</td></tr>' : '')
    + '</table>'
    + '</td></tr></table>'
    + '</td></tr>';
}

// Operator check, run by hand from the Apps Script editor (Run ->
// checkDeployment) after setting Script Properties. It sends NOTHING and
// writes no lead: it reports which properties still refuse (names only), the
// leads tab, and the account's remaining daily recipient quota. Its first run
// is also what prompts the owner's OAuth consent for exactly the two scopes
// the manifest declares, before any customer request arrives.
function checkDeployment() {
  var deployment = _loadDeploymentConfig();
  var report = {
    ready: deployment.required.length === 0 && deployment.invalid.length === 0,
    refusingRequired: deployment.required,
    invalidOptional: deployment.invalid,
    bcc: RESULT_EMAIL_BCC ? 'set' : 'none',
    replyTo: REPLY_TO ? 'set' : 'sender',
    leadsTab: _leadsSheet().getName(),
    remainingDailyRecipients: MailApp.getRemainingDailyQuota()
  };
  Logger.log('checkDeployment: ' + JSON.stringify(report));
  return report;
}

// Response contract (the client classifies exactly these):
//   {success:true}                                  sent (email sent, then row appended)
//   {success:true, duplicate:true}                  this sendId already sent; nothing done
//   {success:false, error:'invalid_request'}        body not an object, or sendId missing/malformed
//   {success:false, error:'invalid_email'}          address fails the shape check
//   {success:false, error:'canspam_not_configured'} a required CAN-SPAM Script Property is
//                                                   unset, blank, malformed or a sentinel
//   {success:false, error:'send_failed'}            anything else (detail in the GAS log only)
function doPost(e) {
  var sendLock = null;
  try {
    var data = JSON.parse(e.postData.contents);

    if (!data || typeof data !== 'object' || Array.isArray(data)) {
      Logger.log('doPost rejected: invalid_request (body is not an object)');
      return ContentService
        .createTextOutput(JSON.stringify({ success: false, error: 'invalid_request' }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // Shape-only summary; full PII (email/name/phone) shouldn't persist in GAS logs.
    // The quote is logged by presence and line count only - never a figure.
    Logger.log('doPost received: name_len=' + (data.name ? String(data.name).length : 0)
      + ', email=' + (data.email ? 'set' : 'unset')
      + ', phone=' + (data.phone ? 'set' : 'unset')
      + ', matches=' + ((data.allMatches || []).length)
      + ', accessories=' + ((data.accessories || []).length)
      + ', lang=' + (data.lang || '')
      + ', sendId=' + (typeof data.sendId === 'string' && SEND_ID_PATTERN.test(data.sendId) ? 'set' : 'invalid')
      + ', quote=' + (data.quote && typeof data.quote === 'object' ? 'present' : 'absent')
      + ', quote_lines=' + (data.quote && Array.isArray(data.quote.lines) ? data.quote.lines.length : 0));

    var sendId = typeof data.sendId === 'string' ? data.sendId : '';
    if (!SEND_ID_PATTERN.test(sendId)) {
      Logger.log('doPost rejected: invalid_request (sendId missing or malformed)');
      return ContentService
        .createTextOutput(JSON.stringify({ success: false, error: 'invalid_request' }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    var lang = _normalizeLang(data.lang);
    var isEs = lang === 'es';

    var email = (data.email || '').toString().trim();
    if (!_isValidEmail(email)) {
      Logger.log('doPost rejected: invalid_email');
      return ContentService
        .createTextOutput(JSON.stringify({ success: false, error: 'invalid_email' }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // Hard block: no commercial email may leave this script until the
    // retailer-approved CAN-SPAM values are set in Script Properties. The log
    // names the refusing properties, never their values.
    var deployment = _loadDeploymentConfig();
    if (deployment.required.length) {
      Logger.log('doPost rejected: canspam_not_configured (retailer approval required)');
      Logger.log('doPost: unset or invalid Script Properties: ' + deployment.required.join(', '));
      return ContentService
        .createTextOutput(JSON.stringify({ success: false, error: 'canspam_not_configured' }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    // A set-but-malformed optional value (BCC, reply-to, tab name) is an
    // operator error, never silently ignored: refused before anything runs.
    if (deployment.invalid.length) {
      Logger.log('doPost rejected: deployment_config_invalid (' + deployment.invalid.join(', ') + ')');
      return ContentService
        .createTextOutput(JSON.stringify({ success: false, error: 'send_failed' }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // Duplicate suppression: under the script lock, a sendId that already
    // produced a successful send is answered success-duplicate with no row and
    // no email. The lock is held through the send and released in finally.
    sendLock = LockService.getScriptLock();
    sendLock.waitLock(SEND_LOCK_WAIT_MS);
    var sendCache = CacheService.getScriptCache();
    var dedupeKey = SEND_DEDUPE_PREFIX + sendId;
    if (sendCache.get(dedupeKey)) {
      Logger.log('doPost duplicate: sendId already sent; no row, no email');
      return ContentService
        .createTextOutput(JSON.stringify({ success: true, duplicate: true }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // Bound client-controlled scalars defensively.
    var name = _safeText(data.name, 200);
    // Slice 6: the lead is a CLOSED contract (chosen / recommended / none).
    // Unknown kinds fail closed to 'none'; a kind without a non-blank name is
    // no lead (a best-match claim over an empty subject is worse than none).
    // matchesSource fails closed to 'recommended': a false "saved" would
    // fabricate customer action; a false "recommended" merely understates it.
    var lead = (function(l) {
      var ok = l && typeof l === 'object';
      var kind = ok && (l.kind === 'chosen' || l.kind === 'recommended') ? l.kind : 'none';
      var leadName = kind !== 'none' ? _safeText(l.name, 200).trim() : '';
      if (!leadName) kind = 'none';
      return {
        kind: kind,
        name: leadName,
        brand: kind !== 'none' ? _safeText(l.brand, 100) : '',
        line: kind !== 'none' ? _safeText(l.line, 120) : '',
        imageUrl: kind !== 'none' ? _safeImageUrl(l.imageUrl) : ''
      };
    })(data.lead);
    var matchesSource = data.matchesSource === 'saved' ? 'saved' : 'recommended';
    var phone = _safeText(data.phone, 40);
    var dreamCode = _safeText(data.dreamCode, 40);
    var sleepProfile = _safeText(data.sleepProfile, 500);
    var rsa = _safeText(data.rsa, 100);
    var discount = _safeText(data.discount || 5, 10);
    var passExpiration = _safeText(data.passExpiration, 80) || '30 days from issue';
    var passScope = _safeText(data.passScope, 300) || 'a qualifying DreamFinder mattress selection';
    var passTerms = _safeText(data.passTerms, 1000)
      || 'Valid on qualifying mattress selections. Cannot be combined with other offers. Final eligibility confirmed by your sleep specialist.';

    // White-label store identity, supplied by the client from STORE_CONFIG.storeName.
    // Falls back to a generic phrase so a missing/blank field never leaks another
    // retailer's name. Used below in plain-text contexts (subject / sender / plain
    // fallback body) with NO HTML escaping; buildSimpleHtml re-escapes for HTML.
    var storeName = _safeText(data.storeName, 100).trim() || (isEs ? 'nuestra tienda' : 'our store');

    // --- The lead row (Google Sheet) ---
    // Built and its tab resolved HERE, so a missing or unreadable Sheet fails
    // the request before any email leaves, but APPENDED only after the email
    // is sent: a failed send writes no row, so the client's retry of the same
    // sendId cannot leave a duplicate. rsa and sendId sit at the right end per
    // the append-don't-insert strategy in docs/gas-rsa-field-addition.md
    // (inserting mid-row would re-index every other column).
    var sheet = _leadsSheet();
    var leadRow = [
      new Date(),
      name,
      email,
      phone,
      dreamCode,
      lang,
      _safeArray(data.allMatches).slice(0, 6).map(function(m) {
        return _safeText(m && m.name, 200) + (m && m.meetsMatchThreshold === true
          ? ' (' + _safeText(m.matchPct, 10) + '%)'
          : ' (additional comparison option)');
      }).join(', '),
      _safeArray(data.accessories).slice(0, MAX_EMAIL_ACCESSORIES).map(function(a) {
        var qty = _safeQuantity(a && a.quantity);
        return _safeText(a && a.name, 200) + (qty > 1 ? ' x' + qty : '');
      }).join(', '),
      rsa,
      sendId
    ];

    // Branding, supplied by the client from STORE_CONFIG (logo wordmark +
    // colors) so customer-visible email identity is config-driven, never
    // hardcoded to any retailer. Neutral fallbacks when absent.
    var branding = (data.branding && typeof data.branding === 'object') ? data.branding : {};
    var safeBranding = {
      logoMain: _safeText(branding.logoMain, 60),
      logoSub: _safeText(branding.logoSub, 60),
      primary: /^#[0-9a-fA-F]{3,8}$/.test(String(branding.primary || '')) ? String(branding.primary) : '',
      accent: /^#[0-9a-fA-F]{3,8}$/.test(String(branding.accent || '')) ? String(branding.accent) : ''
    };

    // Payment Choice (financing) email content \u2014 categories, official URL,
    // and interest state only. Never terms math, approval language, or any
    // application/sensitive data.
    var financing = (data.financing && typeof data.financing === 'object') ? {
      heading: _safeText(data.financing.heading, 120),
      body: _safeText(data.financing.body, 600),
      url: (function(u) { return /^https:\/\//i.test(String(u || '')) ? String(u) : ''; })(data.financing.url),
      confirmNote: _safeText(data.financing.confirmNote, 300),
      interest: _safeText(data.financing.interest, 20)
    } : null;

    // --- Send email with fallback ---
    // Subject leads with the Sleep Brief (the consultation takeaway); the
    // Savings Pass appears only when a code was actually issued this session.
    var subject = dreamCode
      ? (isEs
        ? 'Tu Resumen de Sue\u00f1o y Pase de Ahorro de ' + storeName
        : 'Your Sleep Brief & Savings Pass from ' + storeName)
      : (isEs
        ? 'Tu Resumen de Sue\u00f1o de ' + storeName
        : 'Your Sleep Brief from ' + storeName);
    var senderName = isEs
      ? 'Equipo de Descanso de ' + storeName
      : storeName + ' Sleep Team';
    var firstName = (name || (isEs ? 'amigo' : 'there')).split(' ')[0];

    // Pre-bound payload for buildSimpleHtml; image URLs filtered to https:// or images/ only.
    var safeData = {
      dreamCode: dreamCode,
      sleepProfile: sleepProfile,
      lead: lead,
      matchesSource: matchesSource,
      discount: discount,
      passExpiration: passExpiration,
      passScope: passScope,
      passTerms: passTerms,
      rsa: rsa,
      allMatches: _safeArray(data.allMatches).slice(0, 6).map(function(m) {
        return {
          name: _safeText(m && m.name, 200),
          brand: _safeText(m && m.brand, 100),
          // matchPct stays INTERNAL record data (the sheet row reads the raw
          // payload); customer-facing copy renders the tier-and-position
          // line instead (D3: ordinal, tier-relative, never a naked
          // percentage). String-typed pick, like the consultation fields.
          matchPct: _safeText(m && m.matchPct, 10),
          meetsMatchThreshold: m && m.meetsMatchThreshold === true,
          line: (function(v) { var t = typeof v === 'string' ? v.trim() : ''; return t ? _safeText(t, 120) : ''; })(m && m.line),
          imageUrl: _safeImageUrl(m && m.imageUrl)
        };
      }),
      accessories: _safeArray(data.accessories).slice(0, MAX_EMAIL_ACCESSORIES).map(function(a) {
        return {
          name: _safeText(a && a.name, 200),
          category: _safeText(a && a.category, 100),
          quantity: _safeQuantity(a && a.quantity),
          imageUrl: _safeImageUrl(a && a.imageUrl)
        };
      }),
      // Trial priorities (0.5), pre-localized by the client to data.lang.
      // Untrusted like everything else here: array-coerced, capped, every
      // field bounded, and projected onto a fresh literal so ONLY these three
      // keys can survive into the email - a score, rank, id or raw answer
      // riding on an entry is dropped by construction. Slice 6 (R-8 at the
      // server): the block is ALL-OR-NOTHING - cap first (mirroring the
      // client, which slices before judging), then if ANY capped entry lacks
      // a non-blank name, reason or test, the whole array is [] and the
      // section, label included, is absent from BOTH MIME parts. Never a
      // shortened list, never a partial entry.
      priorities: (function(list) {
        var whole = function(p) {
          return p.name.trim().length > 0 && p.reason.trim().length > 0 && p.test.trim().length > 0;
        };
        return list.length > 0 && list.every(whole) ? list : [];
      })(_safeArray(data.priorities).slice(0, MAX_EMAIL_PRIORITIES).map(function(p) {
        return {
          name: _safeText(p && p.name, 200),
          reason: _safeText(p && p.reason, 400),
          test: _safeText(p && p.test, 400)
        };
      })),
      // Consultation Summary strings (0.6), pre-localized by the client to
      // data.lang from the SAME resolver the kiosk screen renders. Projected
      // onto a fresh three-key literal so nothing else can ride along, each
      // bounded, and STRING-TYPED: unlike _safeText's usual String() coercion
      // a non-string sub-field here is dropped, never coerced - a client bug
      // shipping {} must not put "[object Object]" in a customer email. They
      // render inside the existing Sleep Brief block in both MIME parts and
      // never reach the sheet row.
      consultation: (function(cs) {
        var pick = function(v) { var t = typeof v === 'string' ? v.trim() : ''; return t ? _safeText(t, 300) : ''; };
        return {
          context: pick(cs && cs.context),
          who: pick(cs && cs.who),
          profile: pick(cs && cs.profile)
        };
      })(data.consultation),
      // Website-derived retailer promotions, pre-localized by the client to data.lang.
      promotions: _safeArray(data.emailPromotions).slice(0, 12).map(function(p) {
        return {
          badge: _safeText(p && p.badge, 80),
          headline: _safeText(p && p.headline, 200),
          detail: _safeText(p && p.detail, 400),
          disclosure: _safeText(p && p.disclosure, 400),
          // Optional per-promotion evidence/provenance line (e.g. reconstructed-
          // historical scenarios). Absent in current/website-verified payloads, so
          // it renders only when the client supplies it \u2014 existing behavior intact.
          provenance: _safeText(p && p.provenance, 400),
          expiration: _safeText(p && p.expiration, 80),
          sourceUrl: _safeImageUrl(p && p.sourceUrl)
        };
      }),
      branding: safeBranding,
      financing: financing,
      promoSpanishDraft: _safeText(data.promoSpanishDraft, 200),
      // Scenario-level fields (pre-localized by the client). A non-empty
      // promoDisclosure marks a disclosed scenario (e.g. the historical demo):
      // the promo header drops any "current offer" claim and the disclosure is
      // surfaced. Both empty for genuine current scenarios -> behavior unchanged.
      promoScenario: _safeText(data.promoScenario, 80),
      promoDisclosure: _safeText(data.promoDisclosure, 400),
      // The purchase summary ("Your quote"), pre-localized by the client to
      // data.lang from the same read model the kiosk screen renders. Null
      // (section absent in both parts) unless it is a complete, well-formed
      // v:1 summary; never reaches the sheet row.
      quote: _safeQuote(data.quote)
    };

    // The complete localized plain-text body, built ONCE from safeData before
    // any send. It is the text/plain MIME part of the normal HTML email \u2014 so a
    // text-only or HTML-disabled client still receives the full results,
    // priorities included \u2014 and, unchanged, the entire body of the catch's
    // retry below. One construction, two uses: the paths cannot drift.
    var plainBody = buildPlainBody(safeData, isEs, storeName);

    try {
      // Always build HTML server-side. Client previously sent data.htmlBody but
      // that path was deprecated in 5e \u2014 kiosk no longer ships pre-built HTML.
      var htmlBody = buildSimpleHtml(safeData, firstName, isEs, storeName);

      var mailOptions = {
        htmlBody: htmlBody,
        name: senderName
      };
      if (RESULT_EMAIL_BCC) mailOptions.bcc = RESULT_EMAIL_BCC;
      if (REPLY_TO) mailOptions.replyTo = REPLY_TO;
      MailApp.sendEmail(email, subject, plainBody, mailOptions);

    } catch (emailErr) {
      Logger.log('HTML email failed, trying plain text: ' + emailErr.toString());
      var fallbackOptions = {
        name: senderName
      };
      if (RESULT_EMAIL_BCC) fallbackOptions.bcc = RESULT_EMAIL_BCC;
      if (REPLY_TO) fallbackOptions.replyTo = REPLY_TO;
      MailApp.sendEmail(email, subject, plainBody, fallbackOptions);
    }

    // Record the delivered sendId only AFTER a send succeeded, so a failed
    // attempt stays retryable. A cache write failure is logged, not surfaced:
    // the email has already gone, and reporting failure would invite a retry
    // that mails the customer twice.
    try {
      sendCache.put(dedupeKey, '1', SEND_DEDUPE_TTL_SECONDS);
    } catch (cacheErr) {
      Logger.log('doPost: dedupe record not written: ' + cacheErr.toString());
    }

    // The lead row, now that the email has gone. A write failure is logged,
    // not surfaced, for the same reason: reporting failure would invite a
    // retry that mails the customer twice. The BCC copy (when configured)
    // still carries the lead.
    try {
      sheet.appendRow(leadRow);
    } catch (rowErr) {
      Logger.log('doPost: lead row not written (email was sent): ' + rowErr.toString());
    }

    return ContentService
      .createTextOutput(JSON.stringify({ success: true }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    // Generic error to browser; full detail stays in GAS logs.
    Logger.log('doPost error: ' + err.toString());
    return ContentService
      .createTextOutput(JSON.stringify({ success: false, error: 'send_failed' }))
      .setMimeType(ContentService.MimeType.JSON);
  } finally {
    if (sendLock) {
      try { sendLock.releaseLock(); } catch (lockErr) { Logger.log('doPost: lock release failed: ' + lockErr.toString()); }
    }
  }
}

// The complete localized plain-text results body. `data` is doPost's
// already-sanitized safeData (every scalar bounded, every array capped and
// projected), so nothing here re-validates \u2014 but plain text still gets its own
// hostile-input treatment: angle brackets are stripped from the priority lines
// so hostile markup in a field cannot arrive looking like markup in any client
// that renders text/plain leniently. Sent on BOTH doPost paths \u2014 the normal
// send's text part and the catch retry's whole body \u2014 never rebuilt per path.
function buildPlainBody(data, isEs, storeName) {
  storeName = storeName || (isEs ? 'nuestra tienda' : 'our store');
  var dreamCode = data.dreamCode || '';
  var sleepProfile = data.sleepProfile || '';
  // Slice 6: the lead contract replaces the promoted first list entry; an
  // old payload without it reads as 'none' (no fabricated best-match line).
  var lead = (data.lead && typeof data.lead === 'object') ? data.lead : { kind: 'none' };
  var matchesSource = data.matchesSource === 'saved' ? 'saved' : 'recommended';
  var discount = data.discount || 5;
  var passExpiration = data.passExpiration || '30 days from issue';
  var passScope = data.passScope || 'a qualifying DreamFinder mattress selection';
  var passTerms = data.passTerms
    || 'Valid on qualifying mattress selections. Cannot be combined with other offers. Final eligibility confirmed by your sleep specialist.';
  var financing = (data.financing && typeof data.financing === 'object') ? data.financing : null;
  var allMatches = _safeArray(data.allMatches);
  // The purchase summary ("Your quote"), already projected by _safeQuote.
  var quoteText = buildQuotePlain(data.quote || null, isEs);
  var quoteBlock = quoteText ? '\n\n' + quoteText : '';

  var accessoryLines = _safeArray(data.accessories).map(function(a, i) {
    var qty = _safeQuantity(a.quantity);
    return (i + 1) + '. ' + a.name + (qty > 1 ? ' x ' + qty : '') + (a.category ? ' - ' + a.category : '');
  }).join('\n');
  // Trial priorities (0.5), same order as the HTML body.
  var _plainPriority = function(s) { return String(s || '').replace(/[<>]/g, ''); };
  // Consultation Summary lines (0.6) - the same three resolved strings the
  // kiosk screen shows, directly under the Sleep Brief line in both language
  // branches. Pre-localized by the client; angle brackets stripped like the
  // priority lines so hostile markup cannot arrive looking like markup.
  var consultation = (data.consultation && typeof data.consultation === 'object')
    ? data.consultation : {};
  var consultLines = [consultation.context, consultation.who, consultation.profile]
    .map(function(s) { return _plainPriority(s); })
    .filter(function(s) { return s; });
  var consultBlock = consultLines.length ? consultLines.join('\n') + '\n' : '';
  var priorityLines = _safeArray(data.priorities).map(function(pr, i) {
    return (i + 1) + '. ' + _plainPriority(pr.name)
      + (pr.reason ? ' - ' + _plainPriority(pr.reason) : '')
      + (pr.test
          ? '\n   ' + (isEs ? 'Pru\u00e9balo: ' : 'Try this: ') + _plainPriority(pr.test)
          : '');
  }).join('\n');
  var promoLines = _safeArray(data.promotions).map(function(p) {
    return '- ' + p.badge + ': ' + p.headline
      + (p.detail ? '\n  ' + p.detail : '')
      + (p.disclosure ? '\n  ' + p.disclosure : '')
      + (p.provenance ? '\n  ' + p.provenance : '')
      + (p.expiration ? '\n  ' + p.expiration : '')
      + (p.sourceUrl ? '\n  ' + p.sourceUrl : '');
  }).join('\n');
  // Scenario-aware plain-text promo header: a disclosed scenario (e.g. a
  // historical demo) drops the "current offer" claim and prepends the
  // disclosure line. Retailer name comes from the payload storeName.
  var plainPromoDisclosure = (data.promoDisclosure || '').toString();
  var plainPromoHeader = plainPromoDisclosure
    ? (isEs ? 'Ofertas de ' + storeName : storeName + ' Offers')
    : (isEs ? 'Ofertas Actuales de ' + storeName : 'Current ' + storeName + ' Offers');
  var promoBlock = promoLines
    ? ('\n\n' + plainPromoHeader + ':\n'
        + (plainPromoDisclosure ? plainPromoDisclosure + '\n' : '')
        + (data.promoSpanishDraft && isEs ? data.promoSpanishDraft + '\n' : '')
        + promoLines)
    : '';
  var comparisonLabel = isEs ? 'Opci\u00f3n adicional para comparar' : 'Additional comparison option';
  // Slice 6: the top line speaks the lead kind and the tier-and-position
  // line; no percentage reaches customer copy (D3). sleepProfile prose is
  // suppressed while a complete priorities block renders (its names are the
  // same content), and its label never renders over a blank value.
  var _plainLead = function() {
    if (lead.kind === 'chosen') {
      return (isEs ? 'Tu finalista: ' : 'Your finalist: ') + lead.name
        + (lead.line ? ' (' + lead.line + ')' : '') + '\n';
    }
    if (lead.kind === 'recommended') {
      return (isEs ? 'Punto de partida recomendado: ' : 'Recommended starting point: ') + lead.name
        + (lead.line ? ' (' + lead.line + ')' : '') + '\n'
        + (isEs ? 'El mejor punto de partida en la tienda.' : 'Best place to start in-store.') + '\n';
    }
    return '';
  };
  var _plainBrief = function(priorityText) {
    if (priorityText || !sleepProfile) return '';
    return (isEs ? 'Resumen de sue\u00f1o: ' : 'Sleep Brief: ') + sleepProfile + '\n';
  };
  var _plainListHeader = matchesSource === 'saved'
    ? (isEs ? 'Tus selecciones de colch\u00f3n guardadas:' : 'Your saved mattress picks:')
    : (isEs ? 'Tus colchones recomendados:' : 'Your mattress matches:');
  // Savings Pass lines only when a code was actually issued; Payment
  // Choice lines only when the client sent a financing block (no terms
  // math, no approval language \u2014 categories + official URL only).
  var passBlockEs = dreamCode
    ? ('Tu pase de ahorro de 30 d\u00edas: ' + discount + '% DE DESCUENTO\n'
      + 'C\u00f3digo del pase: ' + dreamCode + '\n\n'
      + 'V\u00e1lido en: ' + passScope + '\n'
      + 'V\u00e1lido hasta: ' + passExpiration + '\n'
      + passTerms + '\n\n')
    : '';
  var passBlockEn = dreamCode
    ? ('Your 30-day Savings Pass: ' + discount + '% OFF\n'
      + 'Savings pass code: ' + dreamCode + '\n\n'
      + 'Valid on: ' + passScope + '\n'
      + 'Good through: ' + passExpiration + '\n'
      + passTerms + '\n\n')
    : '';
  var finBlock = financing
    ? ('\n\n' + (financing.heading || (isEs ? 'Opciones de pago' : 'Payment options')) + ':\n'
      + (financing.body ? financing.body + '\n' : '')
      + (financing.confirmNote ? financing.confirmNote + '\n' : '')
      + (financing.url ? financing.url : ''))
    : '';
  return isEs
    ? ('Tu match de sue\u00f1o de ' + storeName + ' est\u00e1 listo.\n\n'
      + _plainLead()
      + _plainBrief(priorityLines)
      + consultBlock
      + (priorityLines ? 'Lo que probaremos juntos:\n' + priorityLines + '\n' : '')
      + passBlockEs
      + 'Muestra este correo a tu especialista de sue\u00f1o de ' + storeName + '.\n\n'
      + (allMatches.length ? _plainListHeader + '\n' : '')
      + allMatches.map(function(m, i) {
          var lineText = (typeof m.line === 'string' && m.line) ? m.line
            : (m.meetsMatchThreshold ? '' : comparisonLabel);
          return (i+1) + '. ' + m.name + (lineText ? ' - ' + lineText : '');
        }).join('\n')
      + (accessoryLines ? '\n\nTu Sistema de Sue\u00f1o guardado:\n' + accessoryLines : '')
      + quoteBlock
      + promoBlock
      + finBlock
      + '\n\n----------\n'
      + 'Recibiste este correo porque guardaste tu Resumen de Sue\u00f1o en ' + storeName + '.\n'
      + POSTAL_ADDRESS + '\n'
      + 'Cancelar suscripci\u00f3n: ' + UNSUBSCRIBE_URL + '\n'
      + 'Privacidad y solicitudes de datos: ' + PRIVACY_CONTACT)
    : ('Your ' + storeName + ' sleep match is ready.\n\n'
      + _plainLead()
      + _plainBrief(priorityLines)
      + consultBlock
      + (priorityLines ? 'What we will test together:\n' + priorityLines + '\n' : '')
      + passBlockEn
      + 'Show this email to your ' + storeName + ' sleep specialist.\n\n'
      + (allMatches.length ? _plainListHeader + '\n' : '')
      + allMatches.map(function(m, i) {
          var lineText = (typeof m.line === 'string' && m.line) ? m.line
            : (m.meetsMatchThreshold ? '' : comparisonLabel);
          return (i+1) + '. ' + m.name + (lineText ? ' - ' + lineText : '');
        }).join('\n')
      + (accessoryLines ? '\n\nYour saved Sleep System:\n' + accessoryLines : '')
      + quoteBlock
      + promoBlock
      + finBlock
      + '\n\n----------\n'
      + 'You received this email because you saved your Sleep Brief at ' + storeName + '.\n'
      + POSTAL_ADDRESS + '\n'
      + 'Unsubscribe: ' + UNSUBSCRIBE_URL + '\n'
      + 'Privacy & data requests: ' + PRIVACY_CONTACT);
}

function buildSimpleHtml(data, firstName, isEs, storeName) {
  // All user/client-controlled fields below are HTML-escaped at every
  // interpolation site (caller has already _safeText-bounded scalars and
  // _safeImageUrl-filtered image URLs).
  firstName = _escapeHtml(firstName);
  storeName = _escapeHtml(storeName || (isEs ? 'nuestra tienda' : 'our store'));
  var dreamCode = _escapeHtml(data.dreamCode || '');
  // Server-side safety ceilings protect the email renderer from oversized
  // client payloads without imposing the former three-accessory product limit.
  var matches = _safeArray(data.allMatches).slice(0, 6);
  var accs = _safeArray(data.accessories).slice(0, MAX_EMAIL_ACCESSORIES);
  var discount = _escapeHtml(data.discount || 5);
  var passExpiration = _escapeHtml(data.passExpiration || '30 days from issue');
  var passScope = _escapeHtml(data.passScope || 'a qualifying DreamFinder mattress selection');
  var passTerms = _escapeHtml(data.passTerms
    || 'Valid on qualifying mattress selections. Cannot be combined with other offers. Final eligibility confirmed by your sleep specialist.');
  var sleepProfile = _escapeHtml(data.sleepProfile || '');

  // Consultation Summary lines (0.6): the same three resolved strings the
  // kiosk screen renders, shown INSIDE the existing Sleep Brief block - no
  // new section, card or component - and escaped at this interpolation like
  // every other payload-derived value.
  var consultation = (data.consultation && typeof data.consultation === 'object')
    ? data.consultation : {};
  var consultLines = [consultation.context, consultation.who, consultation.profile]
    .map(function(s) { return _escapeHtml(s); })
    .filter(function(s) { return s; });

  var rsa = _escapeHtml((data.rsa || '').toString().trim());

  // Warm-paper neutral palette (retailer-agnostic) with the retailer's own
  // primary/accent colors layered in from the payload branding block (sourced
  // from store-config.colors client-side). `red` retains its legacy key name
  // but is now the retailer PRIMARY accent, brand-neutral brass by default.
  var branding = (data.branding && typeof data.branding === 'object') ? data.branding : {};
  var c = {
    pageBg: '#E7DECF',
    bg: '#FBF7EF',
    surface: '#FFFDF8',
    surfaceAlt: '#EFE7DA',
    border: '#D1C5B6',
    text: '#2F271E',
    textMuted: '#665D54',
    textSubtle: '#7A6E61',
    accent: branding.accent || '#9A7445',
    accentHover: '#7D5B34',
    red: branding.primary || '#9A7445',
    redLight: branding.primary || '#9A7445'
  };
  var logoMain = _escapeHtml(branding.logoMain || storeName);
  var logoSub = _escapeHtml(branding.logoSub || '');

  var serif = "Georgia, 'Times New Roman', serif";
  var sans = "-apple-system, 'Segoe UI', 'Helvetica Neue', Arial, sans-serif";

  // Localized strings (headline is impersonal / showroom-safe \u2014 no first
  // name; retailer identity comes from the payload storeName, never
  // hardcoded).
  var L = isEs ? {
    eyebrow: 'TUS RESULTADOS',
    headline: 'Tu match de sue\u00f1o de ' + storeName + ' est\u00e1 listo',
    headlineAccent: 'match de sue\u00f1o de ' + storeName,
    leadChosen: 'TU FINALISTA',
    leadRecommended: 'PUNTO DE PARTIDA RECOMENDADO',
    bestStart: 'El mejor punto de partida en la tienda.',
    comparisonOption: 'Opci\u00f3n adicional para comparar',
    briefLabel: 'TU RESUMEN DE SUE\u00d1O',
    prioritiesLabel: 'LO QUE PROBAREMOS JUNTOS',
    savingsLabel: 'TU PASE DE AHORRO DE 30 D\u00cdAS',
    savingsHint: discount + '% DE DESCUENTO en ' + passScope,
    savingsExpiry: 'V\u00e1lido hasta ' + passExpiration,
    savingsTerms: passTerms,
    savedLabel: 'TUS SELECCIONES DE COLCH\u00d3N GUARDADAS',
    recommendedLabel: 'TUS COLCHONES RECOMENDADOS',
    accLabel: 'TU SISTEMA DE SUE\u00d1O GUARDADO',
    ctaMain: 'Lleva este correo a tu especialista de sue\u00f1o de ' + storeName + ' \u2014 tendr\u00e1n tus opciones listas.',
    helpedBy: rsa ? 'Atendido por ' + rsa + ' en ' + storeName : '',
    ctaSaved: dreamCode
      ? 'Tu Pase de Ahorro est\u00e1 guardado. T\u00f3mate tu tiempo.'
      : 'Tu plan est\u00e1 guardado. T\u00f3mate tu tiempo.',
    unsubWhy: 'Recibiste este correo porque guardaste tu Resumen de Sue\u00f1o en ' + storeName + '.',
    unsubAction: 'Cancelar suscripci\u00f3n',
    privacyLine: 'Privacidad y solicitudes de datos: ' + PRIVACY_CONTACT,
    viewSite: 'Ver en el sitio de ' + storeName
  } : {
    eyebrow: 'YOUR RESULTS',
    headline: 'Your ' + storeName + ' sleep match is ready',
    headlineAccent: storeName + ' sleep match',
    leadChosen: 'YOUR FINALIST',
    leadRecommended: 'RECOMMENDED STARTING POINT',
    bestStart: 'Best place to start in-store.',
    comparisonOption: 'Additional comparison option',
    briefLabel: 'YOUR SLEEP BRIEF',
    prioritiesLabel: 'WHAT WE WILL TEST TOGETHER',
    savingsLabel: 'YOUR 30-DAY SAVINGS PASS',
    savingsHint: discount + '% OFF ' + passScope,
    savingsExpiry: 'Good through ' + passExpiration,
    savingsTerms: passTerms,
    savedLabel: 'YOUR SAVED MATTRESS PICKS',
    recommendedLabel: 'YOUR MATTRESS MATCHES',
    accLabel: 'YOUR SAVED SLEEP SYSTEM',
    ctaMain: 'Bring this email to your ' + storeName + ' sleep specialist \u2014 they\u2019ll have your picks ready.',
    helpedBy: rsa ? 'Helped by ' + rsa + ' at ' + storeName : '',
    ctaSaved: dreamCode
      ? 'Your Savings Pass is saved. Take your time.'
      : 'Your plan is saved. Take your time.',
    unsubWhy: 'You received this email because you saved your Sleep Brief at ' + storeName + '.',
    unsubAction: 'Unsubscribe',
    privacyLine: 'Privacy & data requests: ' + PRIVACY_CONTACT,
    viewSite: 'View on ' + storeName + '\u2019s site'
  };

  // Render the headline: escape any raw ampersand in the store name and
  // italicize the brand phrase in brass. storeName was escaped above, so the
  // remaining raw '&' handling covers the pre-escape fallback strings only.
  function headlineHtml() {
    var h = L.headline.split('&amp;').join('&').split('&').join('&amp;');
    var a = L.headlineAccent.split('&amp;').join('&').split('&').join('&amp;');
    return h.split(a).join('<em style="color:' + c.accent + ';font-style:italic;">' + a + '</em>');
  }

  // Helper: one mattress card. hero=true => elevated top-match treatment with a
  // red rule, larger name, a brass match-chip, and the showroom start line.
  // Slice 6: the hero card is the LEAD contract (chosen / recommended),
  // labelled by kind and chipped with the tier-and-position line - never a
  // percentage, never a promoted list entry. 'none' renders no hero at all.
  function leadCard(lead) {
    var name = _escapeHtml(lead.name || '');
    var brand = _escapeHtml(lead.brand || '');
    var line = _escapeHtml(lead.line || '');
    var img = _escapeHtml(lead.imageUrl || '');
    var label = lead.kind === 'chosen' ? L.leadChosen : L.leadRecommended;
    var chip = line
      ? '<span style="display:inline-block;background:' + c.surfaceAlt + ';color:' + c.text + ';font-family:' + sans + ';font-size:12px;font-weight:600;letter-spacing:0.5px;padding:5px 12px;border-radius:3px;border:1px solid ' + c.border + ';">' + line + '</span>'
      : '';
    var heroImg = '<td width="110" valign="middle" style="padding:0;background:' + c.surfaceAlt + ';border-right:1px solid ' + c.border + ';">'
      + (img
          ? '<img src="' + img + '" width="110" height="108" alt="' + name + '" style="display:block;border:0;width:110px;height:108px;object-fit:cover;background:' + c.surfaceAlt + ';">'
          : '<div style="width:110px;height:108px;background:' + c.surfaceAlt + ';"></div>')
      + '</td>';
    return ''
      + '<table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation" style="background:' + c.surface + ';border:1px solid ' + c.border + ';border-left:4px solid ' + c.red + ';margin-bottom:6px;border-radius:3px;">'
      + '<tr>'
      + heroImg
      + '<td valign="middle" style="padding:18px 20px;">'
      + '<div style="font-family:' + sans + ';font-size:10px;letter-spacing:2.5px;color:' + c.red + ';text-transform:uppercase;font-weight:700;margin-bottom:8px;">' + label + '</div>'
      + '<div style="font-family:' + serif + ';font-size:25px;color:' + c.text + ';font-weight:normal;line-height:1.15;margin-bottom:5px;">' + name + '</div>'
      + '<div style="font-family:' + sans + ';font-size:12px;color:' + c.textMuted + ';margin-bottom:12px;">' + brand + '</div>'
      + chip
      + (lead.kind === 'recommended'
          ? '<div style="font-family:' + sans + ';font-size:11px;color:' + c.textSubtle + ';margin-top:10px;">' + L.bestStart + '</div>'
          : '')
      + '</td>'
      + '</tr>'
      + '</table>';
  }

  function mattressCard(m) {
    var name = _escapeHtml(m.name || '');
    var brand = _escapeHtml(m.brand || '');
    var meets = m.meetsMatchThreshold === true;
    var img = _escapeHtml(m.imageUrl || '');
    var line = _escapeHtml((typeof m.line === 'string' && m.line) || '');
    var matchLine = line || (meets ? '' : L.comparisonOption);
    var imgCell = '<td width="80" valign="middle" style="padding:0;background:' + c.surfaceAlt + ';border-right:1px solid ' + c.border + ';">'
      + (img
          ? '<img src="' + img + '" width="80" height="72" alt="' + name + '" style="display:block;border:0;width:80px;height:72px;object-fit:cover;background:' + c.surfaceAlt + ';">'
          : '<div style="width:80px;height:72px;background:' + c.surfaceAlt + ';"></div>')
      + '</td>';
    return ''
      + '<table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation" style="background:' + c.surface + ';border:1px solid ' + c.border + ';margin-bottom:8px;border-radius:3px;">'
      + '<tr>'
      + imgCell
      + '<td valign="middle" style="padding:12px 16px;">'
      + '<div style="font-family:' + serif + ';font-size:16px;color:' + c.text + ';font-weight:normal;line-height:1.2;margin-bottom:3px;">' + name + '</div>'
      + '<div style="font-family:' + sans + ';font-size:11px;color:' + c.textMuted + ';margin-bottom:5px;">' + brand + '</div>'
      + (matchLine ? '<div style="font-family:' + sans + ';font-size:11px;letter-spacing:1px;color:' + c.accent + ';text-transform:uppercase;font-weight:600;">' + matchLine + '</div>' : '')
      + '</td>'
      + '</tr>'
      + '</table>';
  }

  var heroCard = (data.lead && data.lead.kind !== 'none') ? leadCard(data.lead) : '';
  var listLabel = data.matchesSource === 'saved' ? L.savedLabel : L.recommendedLabel;
  var secondaryRows = matches.map(function(m) { return mattressCard(m); }).join('');

  // Accessories - single column rows (Outlook table-cell math is unreliable).
  var accRows = accs.map(function(a) {
    var name = _escapeHtml(a.name || '');
    var category = _escapeHtml(a.category || '');
    var img = _escapeHtml(a.imageUrl || '');
    // The customer's own count, beside the name it belongs to. One is the
    // unmarked case, as on the kiosk's itemised summary.
    var qty = _safeQuantity(a.quantity);
    var qtyHtml = qty > 1 ? ' <span style="white-space:nowrap;">&times; ' + qty + '</span>' : '';
    return ''
      + '<table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation" style="background:' + c.surface + ';border:1px solid ' + c.border + ';margin-bottom:8px;border-radius:3px;">'
      + '<tr>'
      + '<td width="60" valign="middle" style="padding:0;background:' + c.surfaceAlt + ';">'
      + (img
          ? '<img src="' + img + '" width="60" height="60" alt="' + name + '" style="display:block;border:0;width:60px;height:60px;object-fit:cover;">'
          : '<div style="width:60px;height:60px;background:' + c.surfaceAlt + ';"></div>')
      + '</td>'
      + '<td valign="middle" style="padding:10px 14px;">'
      + '<div style="font-family:' + serif + ';font-size:14px;color:' + c.text + ';line-height:1.2;">' + name + qtyHtml + '</div>'
      + '<div style="font-family:' + sans + ';font-size:11px;letter-spacing:1.5px;color:' + c.textSubtle + ';text-transform:uppercase;margin-top:3px;">' + category + '</div>'
      + '</td>'
      + '</tr>'
      + '</table>';
  }).join('');

  var accSection = accs.length > 0
    ? '<tr><td style="padding:8px 32px 24px;">'
      + '<div style="font-family:' + sans + ';font-size:10px;letter-spacing:2.5px;color:' + c.accent + ';text-transform:uppercase;font-weight:600;margin-bottom:14px;">' + L.accLabel + '</div>'
      + accRows
      + '</td></tr>'
    : '';

  // Website-derived retailer offers - calmer than hero/brief (brass label +
  // badges, smaller type) so it does not overpower the top match and Sleep
  // Brief. Retailer name from the payload (already HTML-escaped above).
  var promos = Array.isArray(data.promotions) ? data.promotions : [];
  var promoDisclosure = (data.promoDisclosure || '').toString();
  var promoHeader = promoDisclosure
    ? (isEs ? 'Ofertas de ' + storeName : storeName + ' Offers')
    : (isEs ? 'Ofertas Actuales de ' + storeName : 'Current ' + storeName + ' Offers');
  var promoSection = promos.length > 0
    ? '<tr><td style="padding:4px 32px 22px;">'
      + '<div style="font-family:' + sans + ';font-size:10px;letter-spacing:2.5px;color:' + c.accent + ';text-transform:uppercase;font-weight:600;margin-bottom:8px;">'
      + promoHeader + '</div>'
      + (promoDisclosure ? '<div style="font-family:' + sans + ';font-size:10px;font-weight:600;color:' + c.accent + ';background:rgba(154,116,69,0.08);border:1px solid ' + c.border + ';border-radius:2px;padding:8px 10px;margin-bottom:10px;line-height:1.45;">' + _escapeHtml(promoDisclosure) + '</div>' : '')
      + (data.promoSpanishDraft ? '<div style="font-family:' + sans + ';font-size:10px;font-style:italic;color:' + c.textSubtle + ';margin-bottom:10px;">' + _escapeHtml(data.promoSpanishDraft) + '</div>' : '')
      + promos.map(function(p) {
          return '<div style="border-top:1px solid ' + c.border + ';padding:9px 0;">'
            + '<div style="font-family:' + sans + ';font-size:10px;font-weight:700;color:' + c.accent + ';letter-spacing:0.5px;text-transform:uppercase;">' + _escapeHtml(p.badge) + '</div>'
            + '<div style="font-family:' + sans + ';font-size:12px;color:' + c.text + ';margin-top:3px;line-height:1.4;">' + _escapeHtml(p.headline) + '</div>'
            + (p.detail ? '<div style="font-family:' + sans + ';font-size:10px;color:' + c.textMuted + ';margin-top:2px;line-height:1.5;">' + _escapeHtml(p.detail) + '</div>' : '')
            + (p.disclosure ? '<div style="font-family:' + sans + ';font-size:10px;color:' + c.textSubtle + ';margin-top:2px;line-height:1.45;">' + _escapeHtml(p.disclosure) + '</div>' : '')
            + (p.provenance ? '<div style="font-family:' + sans + ';font-size:10px;color:' + c.textSubtle + ';margin-top:2px;line-height:1.45;">' + _escapeHtml(p.provenance) + '</div>' : '')
            + (p.expiration ? '<div style="font-family:' + sans + ';font-size:10px;color:' + c.textSubtle + ';font-weight:600;margin-top:2px;">' + _escapeHtml(p.expiration) + '</div>' : '')
            + (p.sourceUrl ? '<div style="font-family:' + sans + ';font-size:10px;margin-top:2px;"><a href="' + _escapeHtml(p.sourceUrl) + '" style="color:' + c.accent + ';">' + L.viewSite + '</a></div>' : '')
            + '</div>';
        }).join('')
      + '</td></tr>'
    : '';

  // Payment Choice (financing) section — program categories, the official
  // retailer URL, and the confirmation note only. No rates, no payments, no
  // approval implication; the client never sends terms math in this block.
  var fin = (data.financing && typeof data.financing === 'object') ? data.financing : null;
  var finSection = fin
    ? '<tr><td style="background:' + c.surfaceAlt + ';border-top:1px solid ' + c.border + ';border-bottom:1px solid ' + c.border + ';padding:24px 32px;">'
      + '<div style="font-family:' + sans + ';font-size:10px;letter-spacing:3px;color:' + c.red + ';text-transform:uppercase;font-weight:700;margin-bottom:10px;">' + _escapeHtml(fin.heading || (isEs ? 'Opciones de pago' : 'Payment options')) + '</div>'
      + (fin.body ? '<div style="font-family:' + sans + ';font-size:13px;color:' + c.text + ';line-height:1.55;margin-bottom:8px;">' + _escapeHtml(fin.body) + '</div>' : '')
      + (fin.confirmNote ? '<div style="font-family:' + sans + ';font-size:11px;color:' + c.textMuted + ';line-height:1.5;margin-bottom:8px;">' + _escapeHtml(fin.confirmNote) + '</div>' : '')
      + (fin.url ? '<div style="font-family:' + sans + ';font-size:12px;"><a href="' + _escapeHtml(fin.url) + '" style="color:' + c.accent + ';">' + _escapeHtml(fin.url.replace(/^https:\/\//i, '')) + '</a></div>' : '')
      + '</td></tr>'
    : '';

  return ''
    + '<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">'
    + '<html xmlns="http://www.w3.org/1999/xhtml">'
    + '<head>'
    + '<meta http-equiv="Content-Type" content="text/html; charset=UTF-8">'
    + '<meta name="viewport" content="width=device-width,initial-scale=1">'
    + '<title>' + storeName + ' Sleep Match</title>'
    + '<!--[if mso]><style>td,div,p,a {font-family: Georgia, "Times New Roman", serif !important;}</style><![endif]-->'
    + '</head>'
    + '<body style="margin:0;padding:0;background:' + c.pageBg + ';">'
    + '<table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation" style="background:' + c.pageBg + ';">'
    + '<tr><td align="center" style="padding:24px 12px;">'
    + '<table width="600" cellpadding="0" cellspacing="0" border="0" role="presentation" style="background:' + c.bg + ';max-width:600px;width:100%;border:1px solid ' + c.border + ';">'

    + '<tr><td style="height:4px;background:' + c.red + ';font-size:0;line-height:0;">&nbsp;</td></tr>'

    + '<tr><td style="padding:30px 32px 24px;text-align:center;border-bottom:1px solid ' + c.border + ';">'
    + '<div style="font-family:' + serif + ';font-size:30px;line-height:1;color:' + c.text + ';font-weight:700;letter-spacing:0.5px;">' + logoMain
    + (logoSub ? '<span style="font-family:' + sans + ';font-size:13px;letter-spacing:3px;color:' + c.textMuted + ';text-transform:lowercase;font-weight:400;"> ' + logoSub + '</span>' : '') + '</div>'
    + '<div style="font-family:' + sans + ';font-size:10px;letter-spacing:3px;color:' + c.accent + ';text-transform:uppercase;font-weight:600;margin:18px 0 10px;">' + L.eyebrow + '</div>'
    + '<div style="font-family:' + serif + ';font-size:26px;line-height:1.25;color:' + c.text + ';font-weight:normal;">' + headlineHtml() + '</div>'
    + '</td></tr>'

    + (heroCard ? '<tr><td style="padding:24px 32px 8px;">' + heroCard + '</td></tr>' : '')

    + ((function() {
        // Slice 6: with a complete priorities block on the page, the brief
        // prose (largely the same names, lowercased) is redundant and is
        // suppressed; consultation rows keep the block alive either way.
        var briefProse = (data.priorities || []).length ? '' : sleepProfile;
        return (briefProse || consultLines.length)
        ? '<tr><td style="padding:8px 32px 16px;">'
          + '<div style="font-family:' + sans + ';font-size:10px;letter-spacing:2.5px;color:' + c.accent + ';text-transform:uppercase;font-weight:600;margin-bottom:8px;">' + L.briefLabel + '</div>'
          + (briefProse ? '<div style="font-family:' + serif + ';font-size:17px;color:' + c.text + ';line-height:1.35;">' + briefProse + '</div>' : '')
          + consultLines.map(function(line) {
              return '<div style="font-family:' + sans + ';font-size:12px;color:' + c.textMuted + ';line-height:1.5;margin-top:6px;">' + line + '</div>';
            }).join('')
          + '</td></tr>'
        : '';
      })())

    // Trial priorities (0.5), directly under the Sleep Brief line it expands
    // on. Numbered divs rather than <ol> for email-client robustness (the
    // ordered-list-semantics requirement is the Consultation Summary's); the
    // number glyphs carry the engine's order visibly. Every payload-derived
    // value is escaped AT the interpolation, matching the promotions block -
    // never the escape-once-at-top discipline - and nothing payload-sourced
    // enters a style attribute. Empty array: the whole block, label included,
    // is absent. Known 1.6 email debt: the brief line above is largely these
    // same names lowercased; recorded in the roadmap, not fixable additively.
    + ((data.priorities || []).length
        ? '<tr><td style="padding:0 32px 16px;">'
          + '<div style="font-family:' + sans + ';font-size:10px;letter-spacing:2.5px;color:' + c.accent + ';text-transform:uppercase;font-weight:600;margin-bottom:8px;">'
          + L.prioritiesLabel + '</div>'
          + data.priorities.map(function(pr, i) {
              return '<div style="font-family:' + sans + ';font-size:13px;color:' + c.text + ';line-height:1.5;margin-bottom:8px;">'
                + '<strong>' + (i + 1) + '. ' + _escapeHtml(pr.name) + '</strong>'
                + (pr.reason ? ' &mdash; ' + _escapeHtml(pr.reason) : '')
                + (pr.test
                    ? '<br><span style="color:' + c.textMuted + ';">'
                      + (isEs ? 'Pru\u00e9balo: ' : 'Try this: ') + _escapeHtml(pr.test) + '</span>'
                    : '')
                + '</div>';
            }).join('')
          + '</td></tr>'
        : '')

    + (dreamCode
        ? '<tr><td style="background:' + c.surfaceAlt + ';border-top:1px solid ' + c.border + ';border-bottom:1px solid ' + c.border + ';padding:28px 32px;text-align:center;">'
          + '<div style="font-family:' + sans + ';font-size:10px;letter-spacing:3px;color:' + c.red + ';text-transform:uppercase;font-weight:700;margin-bottom:12px;">' + L.savingsLabel + '</div>'
          + '<div style="font-family:' + serif + ';font-size:34px;letter-spacing:5px;color:' + c.accent + ';line-height:1;margin-bottom:12px;">' + dreamCode + '</div>'
          + '<div style="font-family:' + sans + ';font-size:13px;color:' + c.text + ';margin-bottom:6px;">' + L.savingsHint + '</div>'
          + '<div style="font-family:' + sans + ';font-size:12px;color:' + c.red + ';font-weight:600;margin-bottom:10px;">' + L.savingsExpiry + '</div>'
          + '<div style="font-family:' + sans + ';font-size:11px;line-height:1.5;color:' + c.textMuted + ';">' + L.savingsTerms + '</div>'
          + '</td></tr>'
        : '')

    + promoSection

    + finSection

    + (secondaryRows
        ? '<tr><td style="padding:16px 32px 8px;">'
          + '<div style="font-family:' + sans + ';font-size:10px;letter-spacing:2.5px;color:' + c.accent + ';text-transform:uppercase;font-weight:600;margin-bottom:14px;">' + listLabel + '</div>'
          + secondaryRows
          + '</td></tr>'
        : '')

    + accSection

    + buildQuoteHtml(data.quote || null, isEs, c, sans, serif)

    + '<tr><td style="padding:24px 32px 14px;text-align:center;border-top:1px solid ' + c.border + ';">'
    + '<div style="font-family:' + sans + ';font-size:13px;color:' + c.text + ';margin-bottom:8px;line-height:1.5;">' + L.ctaMain + '</div>'
    + (L.helpedBy ? '<div style="font-family:' + sans + ';font-size:12px;color:' + c.textMuted + ';margin-bottom:8px;">' + L.helpedBy + '</div>' : '')
    + '<div style="font-family:' + serif + ';font-size:17px;color:' + c.red + ';font-style:italic;line-height:1.3;">' + L.ctaSaved + '</div>'
    + '</td></tr>'

    + '<tr><td style="padding:8px 32px 28px;text-align:center;">'
    + '<div style="font-family:' + sans + ';font-size:10px;color:' + c.textSubtle + ';line-height:1.7;border-top:1px solid ' + c.border + ';padding-top:16px;">'
    + L.unsubWhy + '<br>'
    + _escapeHtml(POSTAL_ADDRESS) + '<br>'
    + '<a href="' + _escapeHtml(UNSUBSCRIBE_URL) + '" style="color:' + c.textSubtle + ';">' + _escapeHtml(L.unsubAction) + '</a>'
    + ' &nbsp;&middot;&nbsp; ' + _escapeHtml(L.privacyLine)
    + '</div>'
    + '</td></tr>'

    + '</table>'
    + '</td></tr></table>'
    + '</body></html>';
}
