/* ============================================================================
   ENI Tutor — shared fake DOM for the headless test suites.

   The real shell (index.html) is only ever reached through
   document.getElementById(), so a per-id registry is enough to exercise the
   whole app: every id that app.js asks for is created on demand.

   Usage:
     eval(fs.read('/app/tests/harness.js'));
     var env = __ENV.boot();          // → { doc, store, A }
   ========================================================================== */
globalThis.__ENV = (function () {
  'use strict';

  function matches(node, sel) {
    // comma-separated groups, each a simple tag / .class / #id / [attr]
    return String(sel).split(',').some(function (part) {
      part = part.trim();
      if (!part) return false;
      if (part.charAt(0) === '.') {
        return node.classList.contains(part.slice(1)) ||
               String(node.className).split(/\s+/).indexOf(part.slice(1)) !== -1;
      }
      if (part.charAt(0) === '#') return node.id === part.slice(1);
      if (part.charAt(0) === '[') {
        var attr = part.replace(/[\[\]]/g, '');
        return Object.prototype.hasOwnProperty.call(node.attributes, attr);
      }
      return node.tagName === part.toUpperCase();
    });
  }

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
      dataset: {},
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
        toggle: function (c, force) {
          var has = this._c.indexOf(c) !== -1;
          var want = (force === undefined) ? !has : !!force;
          if (want) this.add(c); else this.remove(c);
          return want;
        },
        contains: function (c) { return this._c.indexOf(c) !== -1; }
      },
      appendChild: function (c) { node.children.push(c); c.parentNode = node; return c; },
      removeChild: function (c) {
        node.children = node.children.filter(function (x) { return x !== c; });
        return c;
      },
      insertBefore: function (c) { node.children.unshift(c); c.parentNode = node; return c; },
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
      click: function () { node.dispatchEvent({ type: 'click', target: node, preventDefault: function () {} }); },
      requestSubmit: function () { node.dispatchEvent({ type: 'submit', target: node, preventDefault: function () {} }); },
      closest: function (sel) {
        var n = node;
        while (n) { if (matches(n, sel)) return n; n = n.parentNode; }
        return null;
      },
      contains: function () { return false; },
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
      get firstElementChild() { return node.children[0] || null; },
      get classListText() { return node.className; }
    };
    Object.defineProperty(node, 'innerHTML', {
      get: function () { return node._html; },
      set: function (v) { node._html = String(v); node.children = []; },
      configurable: true
    });
    node._html = '';
    node.textContent = '';
    return node;
  }

  function makeDoc() {
    var doc = {
      _byId: {},
      _docListeners: {},
      readyState: 'complete',
      createElement: function (tag) { return makeEl(tag, doc); },
      createTextNode: function (t) { var n = makeEl('#text', doc); n.textContent = t; return n; },
      getElementById: function (id) {
        if (!doc._byId[id]) { var n = makeEl('div', doc); n.id = id; doc._byId[id] = n; }
        return doc._byId[id];
      },
      querySelector: function (sel) { return doc.querySelectorAll(sel)[0] || null; },
      querySelectorAll: function (sel) {
        var out = [];
        Object.keys(doc._byId).forEach(function (id) {
          var n = doc._byId[id];
          if (matches(n, sel)) out.push(n);
          n.querySelectorAll(sel).forEach(function (c) { out.push(c); });
        });
        return out;
      },
      addEventListener: function (t, f) { (doc._docListeners[t] = doc._docListeners[t] || []).push(f); },
      removeEventListener: function () {}
    };
    doc.body = makeEl('body', doc);
    return doc;
  }

  /** Install the globals app.js expects, then evaluate the real sources. */
  function boot(opts) {
    opts = opts || {};
    var doc = makeDoc();
    var store = opts.store || {};

    globalThis.window = globalThis;
    globalThis.document = doc;
    globalThis.innerHeight = 800;
    globalThis.innerWidth = 1200;
    globalThis.requestAnimationFrame = function (f) { setTimeout(f, 0); };
    globalThis.cancelAnimationFrame = function () {};
    globalThis.localStorage = {
      getItem: function (k) { return Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null; },
      setItem: function (k, v) { store[k] = String(v); },
      removeItem: function (k) { delete store[k]; }
    };
    /* Reduced motion on → the demo stream renders with no artificial delay. */
    globalThis.matchMedia = function () { return { matches: true }; };
    globalThis.Image = function () { this.onload = null; this.onerror = null; };
    Object.defineProperty(globalThis.Image.prototype, 'src', {
      set: function () { setTimeout(function () { if (this.onerror) this.onerror(); }, 0); }
    });
    globalThis.Blob = function () {};
    globalThis.URL = { createObjectURL: function () { return 'blob:x'; }, revokeObjectURL: function () {} };
    globalThis.fetch = function () { return Promise.reject(new Error('no network in tests')); };

    if (!opts.noKb) {
      eval(fs.read('/app/data/kb.js'));
      eval(fs.read('/app/data/system-prompt.js'));
      eval(fs.read('/app/lib/retrieval.js'));
    }
    eval(fs.read('/app/app.js'));

    return { doc: doc, store: store, A: globalThis.ENI_APP };
  }

  /** Wait until a streamed turn finishes (or time out). */
  function settled(A, ms) {
    ms = ms || 15000;
    return new Promise(function (resolve) {
      var waited = 0;
      var iv = setInterval(function () {
        waited += 50;
        if (!A.getState().streaming || waited > ms) {
          clearInterval(iv);
          setTimeout(resolve, 120);
        }
      }, 50);
    });
  }

  return { makeEl: makeEl, makeDoc: makeDoc, boot: boot, settled: settled, matches: matches };
})();
