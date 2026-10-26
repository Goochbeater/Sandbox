/* ============================================================================
   ENI Tutor — robustness check: the app must boot (and show a banner) even
   when kb.js / system-prompt.js never arrive.
   Run:  eval(fs.read('/app/tests/robustness.test.js'))
   ========================================================================== */
(function () {
  'use strict';

  var failures = 0, passes = 0;
  function ok(cond, label, extra) {
    if (cond) { passes++; console.log('PASS  ' + label); }
    else { failures++; console.log('FAIL  ' + label + (extra ? '  →  ' + extra : '')); }
  }

  function makeEl(tag) {
    var node = {
      tagName: String(tag).toUpperCase(), className: '', id: '', _html: '', textContent: '',
      children: [], attributes: {}, style: {}, hidden: false, value: '', checked: false, files: [],
      scrollTop: 0, scrollHeight: 400, listeners: {},
      classList: { _c: [], add: function () {}, remove: function () {}, toggle: function () {}, contains: function () { return false; } },
      appendChild: function (c) { node.children.push(c); return c; },
      removeChild: function (c) { return c; },
      setAttribute: function (k, v) { node.attributes[k] = String(v); },
      getAttribute: function (k) { return k in node.attributes ? node.attributes[k] : null; },
      removeAttribute: function (k) { delete node.attributes[k]; },
      addEventListener: function () {}, removeEventListener: function () {},
      dispatchEvent: function () { return true; },
      focus: function () {}, select: function () {}, click: function () {},
      requestSubmit: function () {},
      querySelector: function (sel) {
        var want = String(sel).charAt(0) === '.' ? String(sel).slice(1) : null;
        var found = null;
        (function walk(n) {
          n.children.forEach(function (c) {
            if (!found && want && String(c.className).split(/\s+/).indexOf(want) !== -1) found = c;
            walk(c);
          });
        })(node);
        return found;
      },
      querySelectorAll: function () { return []; },
      get lastElementChild() { return node.children[node.children.length - 1] || null; }
    };
    Object.defineProperty(node, 'innerHTML', {
      get: function () { return node._html; },
      set: function (v) { node._html = String(v); node.children = []; }
    });
    return node;
  }

  var byId = {};
  globalThis.window = globalThis;
  globalThis.document = {
    readyState: 'complete',
    createElement: makeEl,
    getElementById: function (id) { if (!byId[id]) { byId[id] = makeEl('div'); byId[id].id = id; } return byId[id]; },
    querySelectorAll: function () { return []; },
    querySelector: function () { return null; },
    addEventListener: function () {},
    body: makeEl('body')
  };
  globalThis.requestAnimationFrame = function (f) { setTimeout(f, 0); };
  globalThis.localStorage = { getItem: function () { return null; }, setItem: function () {}, removeItem: function () {} };
  globalThis.matchMedia = function () { return { matches: true }; };
  globalThis.Image = function () { this.onload = null; this.onerror = null; };
  Object.defineProperty(globalThis.Image.prototype, 'src', {
    set: function () { setTimeout(function () { if (this.onerror) this.onerror(); }, 0); }
  });

  /* NOTE: kb.js is deliberately NOT loaded here — and any KB left over from a
     previous suite in the same worker is removed, so this really is the
     "kb.js failed to load" path. */
  try { delete globalThis.KB_DATA; } catch (e) { globalThis.KB_DATA = undefined; }
  eval(fs.read('/app/data/system-prompt.js'));
  eval(fs.read('/app/lib/retrieval.js'));
  /* the banner starts hidden in index.html */
  byId['kbBanner'] = makeEl('div');
  byId['kbBanner'].hidden = true;
  byId['kbBannerBody'] = makeEl('div');
  eval(fs.read('/app/app.js'));

  var A = globalThis.ENI_APP;

  console.log('\n── app without a knowledge base ──');
  ok(!!A, 'app.js still boots and exposes window.ENI_APP');
  ok(byId['kbBanner'] && byId['kbBanner'].hidden === false, 'the missing-KB banner is shown, not a white screen');
  ok((byId['kbBannerBody'].textContent || '').length > 20, 'the banner explains what went wrong',
    byId['kbBannerBody'].textContent);
  ok(byId['messages'] !== undefined, 'the chat view still rendered');

  /* The demo turn must not explode when retrieval throws. */
  var threw = null;
  try { A.sendMessage('does this still work offline?'); } catch (e) { threw = e; }
  ok(!threw, 'sending a message without a KB does not throw', threw && threw.message);

  /* wait for the demo turn to finish (it streams word by word) */
  function waitForTurn(cb) {
    var waited = 0;
    var iv = setInterval(function () {
      waited += 100;
      if (!A.getState().streaming || waited > 20000) {
        clearInterval(iv);
        setTimeout(cb, 200);
      }
    }, 100);
  }

  waitForTurn(function () {
    try {
      ok(A.getState().streaming === false, 'the turn ended');
      var convo = A.getState().conversations.filter(function (c) { return c.id === A.getState().activeId; })[0];
      ok(convo.messages.length >= 1, 'the turn was still recorded', String(convo.messages.length));
      ok(!!convo.messages[1], 'the assistant turn exists',
        JSON.stringify(convo.messages.map(function (m) { return m.role; })));
      if (convo.messages[1]) {
        ok(/demo mode/i.test(convo.messages[1].content), 'the demo answer still explains itself');
      }
      console.log('\n' + passes + ' passed, ' + failures + ' failed');
      if (failures) throw new Error(failures + ' assertion(s) failed');
    } catch (e) {
      console.log('robustness assertion error: ' + (e && e.message));
    }
  });

  return new Promise(function (resolve) { setTimeout(resolve, 21000); });
})();
