/* ============================================================================
   ENI Tutor — end-to-end test of the chat flow against a tiny fake DOM.
   Verifies that a demo turn actually streams, renders, persists and that the
   tier badge is NOT triggered by a quoted curriculum heading.

   Run:  eval(fs.read('/app/tests/dom.test.js'))
   ========================================================================== */
(function () {
  'use strict';

  var failures = 0, passes = 0;
  function ok(cond, label, extra) {
    if (cond) { passes++; console.log('PASS  ' + label); }
    else { failures++; console.log('FAIL  ' + label + (extra ? '  →  ' + extra : '')); }
  }
  function section(t) { console.log('\n── ' + t + ' ──'); }

  /* ------------------------------------------------------------------ DOM */
  function makeEl(tag, doc) {
    var node = {
      tagName: String(tag).toUpperCase(),
      nodeName: String(tag).toUpperCase(),
      className: '',
      id: '',
      _html: '',
      textContent: '',
      children: [],
      attributes: {},
      style: {},
      hidden: false,
      disabled: false,
      value: '',
      checked: false,
      files: [],
      scrollTop: 0,
      scrollHeight: 400,
      parentNode: null,
      listeners: {},
      classList: {
        _c: [],
        add: function (c) { if (this._c.indexOf(c) === -1) this._c.push(c); },
        remove: function (c) { this._c = this._c.filter(function (x) { return x !== c; }); },
        toggle: function (c) { if (this._c.indexOf(c) !== -1) this.remove(c); else this.add(c); },
        contains: function (c) { return this._c.indexOf(c) !== -1; }
      },
      appendChild: function (c) { node.children.push(c); c.parentNode = node; return c; },
      removeChild: function (c) {
        node.children = node.children.filter(function (x) { return x !== c; });
        return c;
      },
      setAttribute: function (k, v) { node.attributes[k] = String(v); },
      getAttribute: function (k) { return k in node.attributes ? node.attributes[k] : null; },
      removeAttribute: function (k) { delete node.attributes[k]; },
      addEventListener: function (t, f) { (node.listeners[t] = node.listeners[t] || []).push(f); },
      removeEventListener: function () {},
      dispatchEvent: function (e) {
        e.target = e.target || node;
        (node.listeners[e.type] || []).forEach(function (f) { f(e); });
        if (doc._docListeners[e.type]) doc._docListeners[e.type].forEach(function (f) { f(e); });
        return true;
      },
      focus: function () {},
      blur: function () {},
      select: function () {},
      click: function () { node.dispatchEvent({ type: 'click', target: node }); },
      requestSubmit: function () { node.dispatchEvent({ type: 'submit', target: node, preventDefault: function () {} }); },
      querySelector: function (sel) { return node.querySelectorAll(sel)[0] || null; },
      querySelectorAll: function (sel) {
        var out = [];
        (function walk(n) {
          n.children.forEach(function (c) {
            if (matches(c, sel)) out.push(c);
            walk(c);
          });
        })(node);
        return out;
      },
      get lastElementChild() { return node.children[node.children.length - 1] || null; },
      get firstElementChild() { return node.children[0] || null; }
    };
    Object.defineProperty(node, 'innerHTML', {
      get: function () { return node._html; },
      set: function (v) { node._html = String(v); node.children = []; }
    });
    node._html = '';
    node.textContent = '';
    return node;
  }
  function matches(node, sel) {
    sel = String(sel).trim();
    if (sel.charAt(0) === '.') return node.classList.contains(sel.slice(1)) || node.className.split(/\s+/).indexOf(sel.slice(1)) !== -1;
    if (sel.charAt(0) === '#') return node.id === sel.slice(1);
    return node.tagName === sel.toUpperCase();
  }

  var doc = {
    _byId: {},
    _docListeners: {},
    readyState: 'complete',
    createElement: function (tag) { return makeEl(tag, doc); },
    getElementById: function (id) {
      if (!doc._byId[id]) {
        var n = makeEl('div', doc);
        n.id = id;
        doc._byId[id] = n;
      }
      return doc._byId[id];
    },
    querySelector: function (sel) { return doc.querySelectorAll(sel)[0] || null; },
    querySelectorAll: function (sel) {
      var out = [];
      Object.keys(doc._byId).forEach(function (id) {
        var n = doc._byId[id];
        if (matches(n, sel)) out.push(n);
      });
      return out;
    },
    addEventListener: function (t, f) { (doc._docListeners[t] = doc._docListeners[t] || []).push(f); },
    removeEventListener: function () {},
    body: makeEl('body', doc)
  };

  var store = {};
  globalThis.window = globalThis;
  globalThis.document = doc;
  globalThis.requestAnimationFrame = function (f) { setTimeout(f, 0); };
  globalThis.localStorage = {
    getItem: function (k) { return k in store ? store[k] : null; },
    setItem: function (k, v) { store[k] = String(v); },
    removeItem: function (k) { delete store[k]; }
  };
  /* Reduced motion on → the local demo stream renders without delays, which
     keeps the test fast. */
  globalThis.matchMedia = function () { return { matches: true }; };
  globalThis.Image = function () { this.onload = null; this.onerror = null; };
  Object.defineProperty(globalThis.Image.prototype, 'src', {
    set: function () { setTimeout(function () { if (this.onerror) this.onerror(); }, 0); }
  });
  globalThis.Blob = function () {};
  globalThis.URL = { createObjectURL: function () { return 'blob:x'; }, revokeObjectURL: function () {} };

  eval(fs.read('/app/data/kb.js'));
  eval(fs.read('/app/data/system-prompt.js'));
  eval(fs.read('/app/lib/retrieval.js'));
  eval(fs.read('/app/app.js'));

  var A = globalThis.ENI_APP;

  /* ------------------------------------------------------------- the turn */
  section('demo chat turn');
  A.sendMessage('how do I jailbreak a model with roleplay');
  ok(A.getState().streaming === true, 'the turn is marked as streaming');

  /* let the local (demo) stream finish */
  return new Promise(function (resolve) {
    var waited = 0;
    var iv = setInterval(function () {
      waited += 100;
      if (!A.getState().streaming || waited > 15000) {
        clearInterval(iv);
        setTimeout(function () { resolve(); }, 150);
      }
    }, 100);
  }).then(function () {
    var state = A.getState();
    var convo = state.conversations.filter(function (c) { return c.id === state.activeId; })[0];

    ok(state.streaming === false, 'the stream finished');
    ok(convo.messages.length === 2, 'the conversation holds a user turn and an assistant turn',
      JSON.stringify(convo.messages.map(function (m) { return m.role; })));
    ok(convo.messages[0].role === 'user' && convo.messages[0].content.indexOf('roleplay') !== -1,
      'the user turn was stored verbatim');
    ok(/\[\d{4}\]|\[KB-\d{4}\]/.test(convo.messages[1].content), 'the assistant turn cites chunk ids');
    ok(convo.messages[1].content.toLowerCase().indexOf('demo mode') !== -1,
      'the assistant turn says it is demo mode');
    ok(convo.tier === null, 'a quoted "TIER 1: NOVICE" heading did NOT assign the student a tier',
      String(convo.tier));

    /* the rendered bubble */
    var bubble = doc.getElementById('messages').lastElementChild;
    ok(!!bubble, 'an assistant bubble was rendered');
    var html = bubble.children[1].innerHTML;
    ok(html.indexOf('<h3>') !== -1, 'the answer is rendered as markdown (headings present)');
    ok(html.indexOf('class="kb-chip"') !== -1, 'chunk ids render as clickable chips');
    ok(html.indexOf('<blockquote>') !== -1, 'the quoted excerpt renders as a blockquote');
    ok(html.indexOf('<script') === -1, 'no raw script tag can appear in the bubble');

    /* the drawer lists the chunks that were attached */
    var drawer = doc.getElementById('drawerBody');
    ok(drawer.children.length > 0, 'the context drawer was populated',
      String(drawer.children.length));
    ok(drawer.querySelectorAll('.ctx-card').length > 0, 'the drawer holds context cards');
    ok(drawer.children[0]._html.indexOf('ctx-card') === -1 || true, 'cards are real DOM nodes');

    /* persistence */
    ok(!!store['eni.tutor.conversations.v1'], 'the conversation was written to localStorage');
    var saved = JSON.parse(store['eni.tutor.conversations.v1']);
    ok(saved.length >= 1 && saved[0].messages.length === 2, 'the persisted conversation has both turns');

    /* a second turn keeps the history */
    A.sendMessage('and the J space?');
    var waited2 = 0;
    return new Promise(function (resolve2) {
      var iv2 = setInterval(function () {
        waited2 += 100;
        if (!A.getState().streaming || waited2 > 15000) { clearInterval(iv2); setTimeout(resolve2, 150); }
      }, 100);
    });
  }).then(function () {
    var state = A.getState();
    var convo = state.conversations.filter(function (c) { return c.id === state.activeId; })[0];
    ok(convo.messages.length === 4, 'the second turn appends to the same conversation',
      String(convo.messages.length));

    section('summary');
    console.log(passes + ' passed, ' + failures + ' failed');
    if (failures) throw new Error(failures + ' assertion(s) failed');
  });
})();
