/* ============================================================================
   ENI Tutor — headless unit tests for the pure helpers in app.js.
   Run inside the ENI worker sandbox:
     eval(fs.read('/app/tests/unit.test.js'))
   It loads the real kb.js / system-prompt.js / retrieval.js / app.js, stubs
   just enough DOM for app.js to boot, then exercises the pure functions.
   ========================================================================== */
(function () {
  'use strict';

  var failures = 0, passes = 0;
  function ok(cond, label, extra) {
    if (cond) { passes++; console.log('PASS  ' + label); }
    else { failures++; console.log('FAIL  ' + label + (extra ? '  →  ' + extra : '')); }
  }
  function section(t) { console.log('\n── ' + t + ' ──'); }

  /* ---------- harness ---------------------------------------------------- */
  globalThis.window = globalThis;
  eval(fs.read('/app/data/kb.js'));
  eval(fs.read('/app/data/system-prompt.js'));
  eval(fs.read('/app/lib/retrieval.js'));

  var noop = function () {};
  var fakeEl = function () {
    return new Proxy({}, {
      get: function (t, k) {
        if (typeof k === 'string' && ['addEventListener', 'appendChild', 'setAttribute', 'removeAttribute',
          'querySelector', 'querySelectorAll', 'closest', 'focus', 'click', 'select', 'requestSubmit',
          'dispatchEvent'].indexOf(k) !== -1) return noop;
        if (k === 'classList') return { add: noop, remove: noop, toggle: noop, contains: function () { return false; } };
        if (k === 'style') return {};
        if (k === 'value' || k === 'textContent' || k === 'innerHTML' || k === 'hidden' || k === 'checked') return '';
        if (k === 'files') return [];
        if (k === 'length') return 0;
        return undefined;
      },
      set: function () { return true; }
    });
  };
  globalThis.document = {
    readyState: 'complete',
    getElementById: fakeEl,
    querySelectorAll: function () { return []; },
    querySelector: fakeEl,
    createElement: fakeEl,
    addEventListener: noop,
    body: { appendChild: noop, removeChild: noop }
  };
  globalThis.requestAnimationFrame = noop;
  globalThis.localStorage = { getItem: function () { return null; }, setItem: noop, removeItem: noop };
  globalThis.matchMedia = function () { return { matches: false }; };
  globalThis.Image = function () { this.onload = null; this.onerror = null; };
  Object.defineProperty(globalThis.Image.prototype, 'src', {
    set: function () { setTimeout(function () { if (this.onerror) this.onerror(); }, 0); }
  });

  eval(fs.read('/app/app.js'));
  var A = globalThis.ENI_APP;

  /* ---------- 1. markdown escaping -------------------------------------- */
  section('renderMarkdown — escaping');
  var md = A.renderMarkdown('Hello <script>alert(1)</script> world');
  ok(md.indexOf('<script>') === -1, 'a raw <script> tag is never emitted');
  ok(md.indexOf('&lt;script&gt;') !== -1, 'the script tag is HTML-escaped instead');
  ok(md.indexOf('alert(1)') !== -1, 'the text itself survives escaping');

  var md2 = A.renderMarkdown('<img src=x onerror="alert(1)">');
  ok(md2.indexOf('<img') === -1 && md2.indexOf('&lt;img') !== -1, 'raw HTML attributes cannot break out');

  /* ---------- 2. code fences -------------------------------------------- */
  section('renderMarkdown — code fences');
  var code = A.renderMarkdown('```python\nprint("hi")\n```');
  ok(code.indexOf('<pre><code class="language-python">') !== -1,
    'a fenced block becomes <pre><code class="language-python">', code);
  ok(code.indexOf('</code></pre>') !== -1, 'the code block is closed');
  ok(code.indexOf('copy-code') !== -1, 'the code block carries a Copy button');
  ok(code.indexOf('print(&quot;hi&quot;)') !== -1 || code.indexOf('print("hi")') !== -1,
    'the code body is preserved');

  var noLang = A.renderMarkdown('```\nplain\n```');
  ok(noLang.indexOf('<pre><code>') !== -1, 'a fence without a language still renders a code block');

  var unclosed = A.renderMarkdown('```js\nlet x = 1;');
  ok(unclosed.indexOf('<pre><code class="language-js">') !== -1, 'an unterminated fence is still a code block');

  /* ---------- 3. the rest of the markdown surface ----------------------- */
  section('renderMarkdown — block + inline syntax');
  var full = A.renderMarkdown(
    '# H1\n\n## H2\n\n### H3\n\n' +
    '**bold** and *italic* and `code`\n\n' +
    '- one\n- two\n\n' +
    '1. first\n2. second\n\n' +
    '> quoted\n\n' +
    '---\n\n' +
    '[link](https://example.com) and [KB-0042]\n\n' +
    '| a | b |\n| --- | --- |\n| 1 | 2 |');
  ok(full.indexOf('<h1>H1</h1>') !== -1, 'headings render');
  ok(full.indexOf('<h2>H2</h2>') !== -1 && full.indexOf('<h3>H3</h3>') !== -1, '## and ### render');
  ok(full.indexOf('<strong>bold</strong>') !== -1, 'bold renders');
  ok(full.indexOf('<em>italic</em>') !== -1, 'italics render');
  ok(full.indexOf('<code>code</code>') !== -1, 'inline code renders');
  ok(full.indexOf('<ul><li>one</li><li>two</li></ul>') !== -1, 'bullet list renders');
  ok(full.indexOf('<ol><li>first</li><li>second</li></ol>') !== -1, 'numbered list renders');
  ok(full.indexOf('<blockquote>quoted</blockquote>') !== -1, 'blockquote renders');
  ok(full.indexOf('<hr>') !== -1, 'horizontal rule renders');
  ok(full.indexOf('<a href="https://example.com"') !== -1, 'links render');
  ok(full.indexOf('class="kb-chip"') !== -1 && full.indexOf('data-chunk="KB-0042"') !== -1,
    'a [KB-0042] id becomes a clickable chip');
  ok(full.indexOf('<table>') !== -1 && full.indexOf('<th>a</th>') !== -1 && full.indexOf('<td>1</td>') !== -1,
    'tables render');

  /* ---------- 4. SSE parsing -------------------------------------------- */
  section('parseSSEChunk — frame splitting');
  var sse = A.parseSSEChunk('data: {"choices":[{"delta":{"content":"He"}}]}\n\n' +
    'data: {"choices":[{"delta":{"content":"llo"}}]}\n\n' +
    'data: [DONE]\n\n');
  ok(sse.events.length === 2, 'two content events were parsed', JSON.stringify(sse.events));
  ok(sse.events[0].data.choices[0].delta.content === 'He', 'first delta text');
  ok(sse.events[1].data.choices[0].delta.content === 'llo', 'second delta text');
  ok(sse.done === true, '[DONE] sets the done flag');

  /* split across chunk boundaries — the caller keeps `rest` + `pending` and
     feeds the next fragment in, exactly like the streaming loop in app.js */
  var whole = 'data: {"a":1}\n\ndata: {"b":2}\n\n';
  var part1 = whole.slice(0, 12);   // cuts the first frame in half
  var r1 = A.parseSSEChunk(part1);
  ok(r1.events.length === 0, 'a partial frame yields no events yet');
  ok(r1.rest.length > 0, 'the partial line is handed back in rest', JSON.stringify(r1.rest));

  function feedAll(str, size) {
    var buf = '', pending = null, events = [];
    for (var i = 0; i < str.length; i += size) {
      buf += str.slice(i, i + size);
      var p = A.parseSSEChunk(buf, pending);
      buf = p.rest;
      pending = p.pending;
      events = events.concat(p.events);
    }
    return events;
  }
  [3, 7, 13, 40].forEach(function (size) {
    var ev = feedAll(whole, size);
    ok(ev.length === 2 && ev[0].data.a === 1 && ev[1].data.b === 2,
      'a ' + size + '-byte-at-a-time feed still yields both frames', JSON.stringify(ev));
  });

  /* an Anthropic-style event/data pair split across two reads */
  var a1 = A.parseSSEChunk('event: content_block_delta\n');
  ok(a1.events.length === 0, 'a lone event: line produces no event');
  var a2 = A.parseSSEChunk('data: {"type":"content_block_delta","delta":{"text":"Hi"}}\n\n', a1.pending);
  ok(a2.events.length === 1 && a2.events[0].event === 'content_block_delta',
    'the event name survives the split', JSON.stringify(a2.events));
  ok(a2.events[0].data.delta.text === 'Hi', 'the anthropic delta text is intact');

  /* ---------- 5. request bodies ----------------------------------------- */
  section('request body builders');
  var cfg = {
    provider: 'openai-compatible', model: 'gpt-4o-mini', apiKey: 'k',
    temperature: 0.7, topP: 0.95, maxTokens: 512, stream: true
  };
  var hist = [{ role: 'user', content: 'hi' }, { role: 'assistant', content: 'hello' }, { role: 'user', content: 'more' }];
  var ob = A.buildOpenAIBody(cfg, 'SYSTEM', hist);
  ok(ob.model === 'gpt-4o-mini', 'openai body carries the model');
  ok(ob.messages.length === 4, 'system + 3 history turns', JSON.stringify(ob.messages));
  ok(ob.messages[0].role === 'system' && ob.messages[0].content === 'SYSTEM', 'the system prompt comes first');
  ok(ob.messages[3].role === 'user' && ob.messages[3].content === 'more', 'the last user turn comes last');
  ok(ob.stream === true, 'stream flag is present');
  ok(ob.temperature === 0.7 && ob.top_p === 0.95 && ob.max_tokens === 512, 'sampling knobs are present');
  ok(JSON.stringify(ob).indexOf('apiKey') === -1, 'the api key is never part of the body');

  var ab = A.buildAnthropicBody(cfg, 'SYSTEM', [{ role: 'user', content: 'a' }, { role: 'user', content: 'b' }]);
  ok(ab.model === 'gpt-4o-mini' && ab.max_tokens === 512, 'anthropic body has model + max_tokens');
  ok(ab.system === 'SYSTEM', 'anthropic body carries the system prompt separately');
  ok(ab.messages.length === 1 && ab.messages[0].role === 'user', 'consecutive same-role turns are merged');
  ok(ab.messages[0].content === 'a\n\nb', 'the merged turn keeps both texts', JSON.stringify(ab.messages[0].content));
  ok(ab.stream === true, 'anthropic body streams');

  var ol = A.buildOllamaBody(cfg, 'SYSTEM', hist);
  ok(ol.model === 'gpt-4o-mini', 'ollama body carries the model');
  ok(ol.messages.length === 4 && ol.messages[0].role === 'system', 'ollama puts the system turn inside messages');
  ok(ol.stream === true, 'ollama body streams');
  ok(ol.options.temperature === 0.7 && ol.options.top_p === 0.95, 'ollama options carry the sampling knobs');

  /* ---------- 6. demo answer -------------------------------------------- */
  section('buildDemoAnswer — offline tutor answer');
  var chunks = ENI.retrieveForMessages(
    [{ role: 'user', content: 'how do I jailbreak a model with roleplay' }],
    { k: 6, includeText: true });
  ok(chunks.length > 0, 'retrieval returned chunks for the test question', String(chunks.length));

  var ans = A.buildDemoAnswer('how do I jailbreak a model with roleplay', chunks, {
    labs: ENI.retrieve('lab persona attack campaign', { k: 5, includeText: true }),
    curriculum: ENI.retrieve('tier novice core concepts', { k: 5, includeText: true })
  });
  ok(/\[KB-\d{4}\]/.test(ans), 'the demo answer cites at least one [KB-xxxx] id');
  ok((ans.match(/\[KB-\d{4}\]/g) || []).length >= 2, 'the demo answer cites several chunks',
    String((ans.match(/\[KB-\d{4}\]/g) || []).length));
  ok(ans.toLowerCase().indexOf('demo mode') !== -1, 'the demo answer says plainly it is demo mode');
  ok(ans.indexOf('> ') !== -1, 'the demo answer quotes an excerpt');
  ok(/Lab|TIER|Lab Exercise|Curriculum|curriculum/i.test(ans), 'the demo answer references a lab or curriculum section');

  var persona = A.buildDemoAnswer('What is persona vector and the J space?',
    ENI.retrieveForMessages([{ role: 'user', content: 'What is persona vector and the J space?' }], { k: 6, includeText: true }), {});
  ok(/\[KB-\d{4}\]/.test(persona), 'the persona-vector answer cites chunks');
  ok(/persona|J space/i.test(persona), 'the persona-vector answer is on topic');

  var empty = A.buildDemoAnswer('zzzz nothing', [], {});
  ok(empty.toLowerCase().indexOf('demo mode') !== -1, 'the empty-chunk demo answer still states the mode');

  /* ---------- 7. retrieval shape ---------------------------------------- */
  section('ENI retrieval contract');
  var r = ENI.retrieve('memory poisoning', { k: 3, includeText: true });
  ok(r.length === 3, 'retrieve honours k');
  ok(r[0].chunkId && r[0].title && typeof r[0].score === 'number',
    'chunks carry chunkId/title/score', JSON.stringify(Object.keys(r[0])));
  ok(/\[KB-\d{4}\]/.test(ENI.formatContext(r)), 'formatContext emits [KB-xxxx] ids');
  ok(ENI.listDocs().length === KB_DATA.docs.length, 'listDocs matches the KB');

  /* ---------- summary ---------------------------------------------------- */
  console.log('\n' + passes + ' passed, ' + failures + ' failed');
  if (failures) throw new Error(failures + ' assertion(s) failed');
})();
