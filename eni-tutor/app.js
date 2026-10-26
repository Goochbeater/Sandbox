/* ============================================================================
   ENI Tutor — a self-contained browser chat harness.
   No framework, no bundler, no network dependency for the demo provider.

   Load order (see index.html):
     data/kb.js          → window.KB_DATA
     data/system-prompt.js → window.ENI_SYSTEM_PROMPT
     lib/retrieval.js    → window.ENI
     app.js              → this file → window.ENI_APP

   The pure helpers (renderMarkdown, parseSSEChunk, buildDemoAnswer, the request
   body builders) are exported on window.ENI_APP so they can be unit-tested in a
   worker without a DOM.
   ========================================================================== */
(function (global) {
  'use strict';

  /* ------------------------------------------------------------------ misc */

  var LS = {
    settings: 'eni.tutor.settings.v1',
    convos: 'eni.tutor.conversations.v1',
    active: 'eni.tutor.active.v1'
  };

  /* localStorage is unavailable on some file:// setups — fall back to memory. */
  var memStore = {};
  function lsGet(key) {
    try {
      var v = global.localStorage.getItem(key);
      if (v !== null) return v;
    } catch (e) { /* ignore */ }
    return Object.prototype.hasOwnProperty.call(memStore, key) ? memStore[key] : null;
  }
  function lsSet(key, val) {
    memStore[key] = val;
    try { global.localStorage.setItem(key, val); return true; } catch (e) { return false; }
  }
  function lsDel(key) {
    delete memStore[key];
    try { global.localStorage.removeItem(key); } catch (e) { /* ignore */ }
  }

  function $(id) { return document.getElementById(id); }
  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }
  function isNum(v) { return typeof v === 'number' && isFinite(v); }
  function clampInt(v, lo, hi, dflt) {
    var n = parseInt(v, 10);
    if (isNaN(n)) return dflt;
    return Math.max(lo, Math.min(hi, n));
  }
  function prefersReducedMotion() {
    try { return !!(global.matchMedia && global.matchMedia('(prefers-reduced-motion: reduce)').matches); }
    catch (e) { return false; }
  }
  function nowStamp() { return Date.now(); }
  function formatTime(ts) {
    var d = new Date(ts || nowStamp());
    var h = d.getHours(), m = d.getMinutes();
    var ampm = h >= 12 ? 'pm' : 'am';
    h = h % 12; if (h === 0) h = 12;
    return h + ':' + (m < 10 ? '0' : '') + m + ' ' + ampm;
  }
  function formatDate(ts) {
    var d = new Date(ts || nowStamp());
    return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) +
      ' ' + d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  }
  function uid() {
    return 'c' + nowStamp().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  /* ==========================================================================
     1. ESCAPING + MARKDOWN
     ========================================================================== */

  /**
   * Escape every HTML-significant character. The model output is untrusted:
   * it is escaped *before* any markdown transformation, so a tag can never
   * become live markup. The only HTML in the result is the markup this file
   * generates itself.
   */
  function escapeHtml(str) {
    return String(str == null ? '' : str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  /* Placeholder sentinels. \u0000 and \u0001 never appear in real prose. */
  var CODE_TOKEN = '\u0000';
  var INLINE_CODE_TOKEN = '\u0001';

  function codeBlockHtml(block) {
    var lang = String(block.lang || '').toLowerCase();
    var cls = lang ? ' class="language-' + escapeHtml(lang) + '"' : '';
    return '<div class="codeblock">' +
      '<div class="codeblock-bar"><span class="codeblock-lang">' + escapeHtml(lang || 'text') + '</span>' +
      '<button type="button" class="btn btn-tiny copy-code">Copy</button></div>' +
      '<pre><code' + cls + '>' + escapeHtml(block.code) + '</code></pre></div>';
  }

  function isTableDivider(line) {
    var t = String(line || '').trim();
    if (t.indexOf('-') === -1) return false;
    return /^\|?[\s:|-]+\|?$/.test(t);
  }

  function splitTableRow(line) {
    var t = String(line || '').trim();
    if (t.charAt(0) === '|') t = t.slice(1);
    if (t.charAt(t.length - 1) === '|') t = t.slice(0, -1);
    return t.split('|').map(function (c) { return c.trim(); });
  }

  /**
   * Inline markdown. The input has already been HTML-escaped, so anything
   * matched here is plain text; the tags we add are ours.
   */
  function inlineMd(text) {
    var s = String(text == null ? '' : text);

    /* 1. Inline code is lifted out first so its contents are never re-styled. */
    var codes = [];
    s = s.replace(/`([^`\n]+)`/g, function (m, c) {
      codes.push(c);
      return INLINE_CODE_TOKEN + (codes.length - 1) + INLINE_CODE_TOKEN;
    });

    /* 2. KB chunk ids become clickable chips. The negative lookahead keeps
          "[KB-0042](url)" intact so a link is not shredded into a chip. */
    s = s.replace(/\[(KB-\d{3,4})\](?!\()/g, function (m, id) {
      return '<button type="button" class="kb-chip" data-chunk="' + id + '" ' +
        'title="Open ' + id + ' in the Knowledge Base">' + id + '</button>';
    });

    /* 3. Links — only http(s), mailto, in-page and relative targets are kept. */
    s = s.replace(/\[([^\]\n]+)\]\(([^)\s]+)\)/g, function (m, label, url) {
      if (!/^(https?:\/\/|mailto:|\/|#)/i.test(url)) return m;
      return '<a href="' + url + '" target="_blank" rel="noopener noreferrer">' + label + '</a>';
    });

    /* 4. Emphasis. Bold before italic; the guards stop "2 * 3" and snake_case
          identifiers from being mangled. */
    s = s.replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>');
    s = s.replace(/__([^_\n]+)__/g, '<strong>$1</strong>');
    s = s.replace(/(^|[^\w*])\*([^*\n]+)\*(?![*\w])/g, '$1<em>$2</em>');
    s = s.replace(/(^|[^\w_])_([^_\n]+)_(?![_\w])/g, '$1<em>$2</em>');

    /* 5. Restore inline code (already escaped, so it is inserted verbatim). */
    s = s.replace(new RegExp(INLINE_CODE_TOKEN + '(\\d+)' + INLINE_CODE_TOKEN, 'g'),
      function (m, i) { return '<code>' + codes[Number(i)] + '</code>'; });

    return s;
  }

  function isBlockStart(text, nextLine) {
    var t = String(text || '').trim();
    if (!t) return true;
    if (t.indexOf(CODE_TOKEN) !== -1) return true;   // a stashed code block
    if (/^#{1,6}\s/.test(t)) return true;
    if (/^[-*+]\s+/.test(t)) return true;
    if (/^\d+[.)]\s+/.test(t)) return true;
    if (/^&gt;/.test(t)) return true;
    if (/^(\*\s*){3,}$/.test(t) || /^(-\s*){3,}$/.test(t) || /^(\_\s*){3,}$/.test(t)) return true;
    if (t.indexOf('|') !== -1 && nextLine != null && isTableDivider(nextLine)) return true;
    return false;
  }

  /**
   * A small, dependency-free markdown renderer.
   * Supports: fenced code (with a language tag + Copy button), #/##/###/####
   * headings, bold, italics, inline code, bullet + numbered lists, blockquotes,
   * horizontal rules, links, tables, and [KB-xxxx] chips.
   * The output is HTML built from escaped text only — raw model HTML is never
   * injected.
   */
  /* C0 controls except tab (\u0009) and line feed (\u000A) — carriage returns
     are normalised away earlier — plus DEL and the C1 range. NUL and SOH are
     this renderer's own placeholder sentinels, so a control character must
     never survive from the model into the block loop. */
  var CONTROL_RE = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/g;
  function stripControls(str) { return String(str == null ? '' : str).replace(CONTROL_RE, ''); }

  /**
   * Render the single block that begins at lines[i].
   *
   * Returns { html, next }, where `next` is the index of the first line that
   * does not belong to this block. `next` is ALWAYS strictly greater than
   * `i`, which is what keeps renderMarkdown's loop finite on any input.
   */
  function renderBlock(lines, i, blocks) {
    var raw = lines[i];
    var line = String(raw == null ? '' : raw).trim();

    /* Blank line. */
    if (!line) return { html: '', next: i + 1 };

    /* A stashed fenced code block, alone on its line. A well-formed
       placeholder can still point past the end of `blocks` if the model
       echoed one back, so the lookup is guarded rather than assumed. */
    var ph = new RegExp('^' + CODE_TOKEN + '(\\d+)' + CODE_TOKEN + '$').exec(line);
    if (ph) {
      var block = blocks[Number(ph[1])];
      return { html: block ? codeBlockHtml(block) : '', next: i + 1 };
    }

    /* Headings. */
    var h = /^(#{1,6})\s+(.*)$/.exec(line);
    if (h) {
      var lvl = Math.min(h[1].length, 6);
      return { html: '<h' + lvl + '>' + inlineMd(h[2]) + '</h' + lvl + '>', next: i + 1 };
    }

    /* Horizontal rule. */
    if (/^(\*\s*){3,}$/.test(line) || /^(\-\s*){3,}$/.test(line) || /^(\_\s*){3,}$/.test(line)) {
      return { html: '<hr>', next: i + 1 };
    }

    /* Blockquote. */
    if (/^&gt;/.test(line)) {
      var quote = [];
      var q = i;
      while (q < lines.length && /^\s*&gt;/.test(lines[q])) {
        quote.push(String(lines[q]).replace(/^\s*&gt;\s?/, ''));
        q++;
      }
      return { html: '<blockquote>' + quote.map(inlineMd).join('<br>') + '</blockquote>', next: q };
    }

    /* Lists. */
    var ordered = /^\d+[.)]\s+/.test(line);
    if (ordered || /^[-*+]\s+/.test(line)) {
      var items = [];
      var k = i;
      while (k < lines.length) {
        var lt = String(lines[k]).trim();
        var m = ordered ? /^(\d+)[.)]\s+(.*)$/.exec(lt) : /^[-*+]\s+(.*)$/.exec(lt);
        if (!m) break;
        items.push('<li>' + inlineMd(ordered ? m[2] : m[1]) + '</li>');
        k++;
      }
      if (!items.length) return { html: '', next: i + 1 };
      return {
        html: (ordered ? '<ol>' : '<ul>') + items.join('') + (ordered ? '</ol>' : '</ul>'),
        next: k
      };
    }

    /* Table. */
    if (line.indexOf('|') !== -1 && i + 1 < lines.length && isTableDivider(lines[i + 1])) {
      var head = splitTableRow(line);
      var aligns = splitTableRow(lines[i + 1]).map(function (c) {
        c = c.trim();
        if (/^:.*:$/.test(c)) return 'center';
        if (/:$/.test(c)) return 'right';
        if (/^:/.test(c)) return 'left';
        return '';
      });
      var t = i + 2;
      var rows = [];
      while (t < lines.length && String(lines[t]).trim() && lines[t].indexOf('|') !== -1) {
        rows.push(splitTableRow(lines[t]));
        t++;
      }
      var html = '<table><thead><tr>';
      head.forEach(function (c, ci) {
        html += '<th' + (aligns[ci] ? ' style="text-align:' + aligns[ci] + '"' : '') + '>' + inlineMd(c) + '</th>';
      });
      html += '</tr></thead><tbody>';
      rows.forEach(function (r) {
        html += '<tr>';
        for (var ci2 = 0; ci2 < head.length; ci2++) html += '<td>' + inlineMd(r[ci2] || '') + '</td>';
        html += '</tr>';
      });
      html += '</tbody></table>';
      return { html: html, next: t };
    }

    /* Paragraph — consecutive non-block lines, hard breaks on trailing "  ". */
    var para = [];
    var p = i;
    while (p < lines.length) {
      var pl = lines[p];
      var pt = String(pl).trim();
      if (!pt) break;
      /* The first line is always consumed; only later lines can end it. */
      if (p > i && isBlockStart(pt, p + 1 < lines.length ? lines[p + 1] : null)) break;
      para.push({ text: pt, hard: /\s{2,}$/.test(pl) });
      p++;
    }
    if (!para.length) {
      /* Defensive: an unrecognised line that collected nothing still gets
         emitted, so the caller can never stall on it. */
      return { html: '<p>' + inlineMd(line) + '</p>', next: i + 1 };
    }
    var buf = '';
    para.forEach(function (pp, pi) {
      buf += inlineMd(pp.text);
      if (pi < para.length - 1) buf += pp.hard ? '<br>' : ' ';
    });
    return { html: '<p>' + buf + '</p>', next: p };
  }

  /**
   * A small, dependency-free markdown renderer.
   * Supports: fenced code (with a language tag + Copy button), #/##/###/####
   * headings, bold, italics, inline code, bullet + numbered lists, blockquotes,
   * horizontal rules, links, tables, and [KB-xxxx] chips.
   * The output is HTML built from escaped text only — raw model HTML is never
   * injected.
   *
   * Hardening: control characters are stripped on entry (so the reserved
   * placeholder sentinels can only ever be ours), block placeholders are
   * looked up defensively, and the block loop is clamped so it advances by at
   * least one line per pass. Malformed or hostile output therefore renders as
   * plain text instead of hanging the tab or throwing.
   */
  function renderMarkdown(md) {
    if (md == null) return '';
    var src = stripControls(String(md).replace(/\r\n?/g, '\n'));

    /* --- 1. Lift fenced code blocks out of the flow ---------------------- */
    var blocks = [];
    src = src.replace(/```([^\n`]*)\n([\s\S]*?)(?:```|$)/g, function (m, lang, code) {
      blocks.push({ lang: String(lang || '').trim(), code: code.replace(/\n+$/, '') });
      return '\n\n' + CODE_TOKEN + (blocks.length - 1) + CODE_TOKEN + '\n\n';
    });

    /* --- 2. Escape everything that is left ------------------------------ */
    src = escapeHtml(src);

    var lines = src.split('\n');
    var out = [];
    var i = 0;

    while (i < lines.length) {
      var start = i;
      var node = renderBlock(lines, i, blocks);
      i = (node && node.next > start) ? node.next : start + 1;   /* never stall */
      if (node && node.html) out.push(node.html);
    }

    return out.join('\n');
  }
  /* ==========================================================================
     2. STREAM PARSERS
     ========================================================================== */

  /**
   * Parse one fragment of a Server-Sent-Events stream.
   *
   * SSE frames are `field: value` lines separated by a blank line. A frame can
   * be split across two network reads, so this function:
   *   • keeps the trailing partial line in `rest` (the caller feeds it back),
   *   • keeps a half-read frame in `pending` (an `event:` line may arrive
   *     before its `data:` line — Anthropic does exactly that),
   *   • returns parsed `events` only for frames that are complete.
   *
   * @param {string} buffer raw text received so far
   * @param {{event?:string,data:*,hasData?:boolean,hasEvent?:boolean}} [pending]
   * @returns {{events: Array<{event:string,data:*}>, done: boolean, rest: string, pending: Object}}
   */
  function parseSSEChunk(buffer, pending) {
    var buf = String(buffer == null ? '' : buffer);
    var events = [];
    var done = false;

    var frame = pending ? {
      event: pending.event || 'message',
      data: pending.data,
      hasData: !!pending.hasData,
      hasEvent: !!pending.hasEvent
    } : { event: 'message', data: null, hasData: false, hasEvent: false };

    function flush() {
      if (frame.hasData) events.push({ event: frame.event, data: frame.data });
      frame = { event: 'message', data: null, hasData: false, hasEvent: false };
    }

    var lines = buf.split('\n');
    var tail = lines.pop();               // may be an incomplete line
    for (var i = 0; i < lines.length; i++) {
      var line = lines[i].replace(/\r$/, '');
      if (line === '') { flush(); continue; }   // blank line = frame separator
      if (line.charAt(0) === ':') continue;     // comment / heartbeat

      var colon = line.indexOf(':');
      var field = colon === -1 ? line : line.slice(0, colon);
      var value = colon === -1 ? '' : line.slice(colon + 1);
      if (value.charAt(0) === ' ') value = value.slice(1);

      if (field === 'event') {
        frame.event = value;
        frame.hasEvent = true;
      } else if (field === 'data') {
        /* Two data lines without a blank line between them = two frames. */
        if (frame.hasData) flush();
        if (value === '[DONE]') {
          done = true;
          flush();
        } else {
          frame.hasData = true;
          try { frame.data = JSON.parse(value); } catch (e) { frame.data = value; }
        }
      }
      /* id / retry fields are ignored on purpose. */
    }

    /* The last line was terminated by a newline → the frame is complete. */
    if (tail === '' && frame.hasData) flush();

    return { events: events, done: done, rest: tail, pending: frame };
  }

  /**
   * Parse one fragment of an Ollama NDJSON stream: one JSON object per line.
   * @returns {{objects: Array<Object>, rest: string}}
   */
  function parseNDJSONChunk(buffer) {
    var buf = String(buffer == null ? '' : buffer);
    var objects = [];
    var lines = buf.split('\n');
    var tail = lines.pop();
    for (var i = 0; i < lines.length; i++) {
      var line = lines[i].trim();
      if (!line) continue;
      try { objects.push(JSON.parse(line)); } catch (e) { /* partial or noise */ }
    }
    return { objects: objects, rest: tail };
  }

  /* ==========================================================================
     3. REQUEST BODY BUILDERS
     ========================================================================== */

  function normalizeHistory(messages) {
    return (messages || []).map(function (m) {
      return {
        role: m && m.role === 'assistant' ? 'assistant' : 'user',
        content: String(m && m.content != null ? m.content : '')
      };
    });
  }

  /** POST {baseUrl}/chat/completions — OpenAI and anything that mimics it. */
  function buildOpenAIBody(config, system, messages) {
    var cfg = config || {};
    var body = {
      model: cfg.model || '',
      messages: [],
      stream: cfg.stream !== false
    };
    if (system) body.messages.push({ role: 'system', content: String(system) });
    body.messages = body.messages.concat(normalizeHistory(messages));
    if (isNum(cfg.temperature)) body.temperature = cfg.temperature;
    if (isNum(cfg.topP)) body.top_p = cfg.topP;
    if (isNum(cfg.maxTokens)) body.max_tokens = cfg.maxTokens;
    return body;
  }

  /** POST {baseUrl}/v1/messages — Anthropic. */
  function buildAnthropicBody(config, system, messages) {
    var cfg = config || {};
    var msgs = [];
    /* Anthropic requires strictly alternating user/assistant turns, so
       consecutive same-role messages are merged. */
    normalizeHistory(messages).forEach(function (m) {
      var last = msgs[msgs.length - 1];
      if (last && last.role === m.role) last.content += '\n\n' + m.content;
      else msgs.push({ role: m.role, content: m.content });
    });
    var body = {
      model: cfg.model || '',
      max_tokens: isNum(cfg.maxTokens) ? cfg.maxTokens : 2048,
      system: system ? String(system) : '',
      messages: msgs,
      stream: cfg.stream !== false
    };
    if (isNum(cfg.temperature)) body.temperature = cfg.temperature;
    if (isNum(cfg.topP)) body.top_p = cfg.topP;
    return body;
  }

  /** POST {baseUrl}/api/chat — Ollama. */
  function buildOllamaBody(config, system, messages) {
    var cfg = config || {};
    var msgs = [];
    if (system) msgs.push({ role: 'system', content: String(system) });
    msgs = msgs.concat(normalizeHistory(messages));
    var body = {
      model: cfg.model || '',
      messages: msgs,
      stream: cfg.stream !== false,
      options: {}
    };
    if (isNum(cfg.temperature)) body.options.temperature = cfg.temperature;
    if (isNum(cfg.topP)) body.options.top_p = cfg.topP;
    return body;
  }

  /* ==========================================================================
     4. DEMO ANSWER BUILDER (offline mode)
     ========================================================================== */

  function words(s) {
    return String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').split(/\s+/)
      .filter(function (w) { return w.length > 3; });
  }

  function overlapScore(a, b) {
    var wa = words(a), wb = words(b);
    if (!wa.length || !wb.length) return 0;
    var setB = {};
    wb.forEach(function (w) { setB[w] = (setB[w] || 0) + 1; });
    var score = 0;
    wa.forEach(function (w) { if (setB[w]) score += setB[w]; });
    return score / Math.sqrt(wa.length);
  }

  /** Clean a chunk body down to a quotable paragraph. */
  function quoteExcerpt(text, max) {
    max = max || 460;
    var t = String(text || '')
      .replace(/```[\s\S]*?```/g, ' ')
      .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
      .replace(/^#{1,6}\s+.*$/gm, ' ')
      .replace(/[*_`>#]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
    if (t.length <= max) return t;
    var cut = t.slice(0, max);
    var sp = cut.lastIndexOf(' ');
    if (sp > max * 0.6) cut = cut.slice(0, sp);
    return cut + '…';
  }

  function sourceLabel(c) {
    if (c.url) return 'Source: ' + c.url;
    if (c.path) return 'KB file: ' + c.path;
    return 'Source: ' + (c.title || 'the knowledge base');
  }

  /**
   * Compose a tutor-shaped answer from retrieved chunks. Used by the demo
   * provider: it cites chunk ids, quotes the most relevant excerpts, names the
   * lab or curriculum section that covers the topic, and says plainly that no
   * model is connected.
   *
   * @param {string} query the student's question
   * @param {Array} chunks retrieved chunks (retrieve() shape)
   * @param {{labs?:Array, curriculum?:Array}} [opts] extra references
   * @returns {string} markdown
   */
  function buildDemoAnswer(query, chunks, opts) {
    opts = opts || {};
    var list = (chunks || []).filter(function (c) { return c && (c.chunkId || c.id); });
    var q = String(query || '').trim();
    var L = [];

    L.push('*Demo mode — no model is connected, so this answer is assembled straight from the knowledge base.*');
    L.push('');

    if (!list.length) {
      L.push('Nothing in the attached KB matched that question, so I have nothing grounded to quote.');
      L.push('');
      L.push('**Try one of these instead:**');
      L.push('');
      L.push('- "What is persona vector and the J space?"');
      L.push('- "How does memory poisoning work?"');
      L.push('- "Give me the multi-turn escalation lab"');
      L.push('');
      L.push('Attach a provider in **Settings** and I will answer as a model instead of a librarian.');
      return L.join('\n');
    }

    L.push('Good question. Here is what the material actually says.');
    L.push('');

    /* Prefer chunks with a meaty body — the doc-header chunks ("Author: …")
       make a poor quote. */
    var usable = list.filter(function (c) {
      return quoteExcerpt(c.text || c.preview || '', 460).length > 90;
    });
    if (!usable.length) usable = list;

    var picked = usable.slice(0, 3);
    picked.forEach(function (c, n) {
      var id = c.chunkId || c.id;
      var heading = c.heading && c.heading !== c.title ? ' — ' + c.heading : '';
      L.push('### ' + (n + 1) + '. ' + (c.title || 'Untitled') + heading + ' [' + id + ']');
      L.push('');
      L.push('> ' + quoteExcerpt(c.text || c.preview || ''));
      L.push('');
      L.push('— ' + sourceLabel(c));
      L.push('');
    });

    /* Name the lab / curriculum section that covers this.
       If opts.labs/opts.curriculum not provided, fetch from KB. */
    var labs = opts.labs;
    var curriculum = opts.curriculum;
    if (!labs || !curriculum) {
      try {
        if (!labs) labs = labChunks ? labChunks() : [];
        if (!curriculum) curriculum = curriculumChunks ? curriculumChunks() : [];
      } catch (e) {
        labs = labs || [];
        curriculum = curriculum || [];
      }
    }
    var bestLab = null, bestLabScore = 0;
    labs.forEach(function (l) {
      var sc = overlapScore(q, (l.heading || '') + ' ' + (l.text || ''));
      if (sc > bestLabScore) { bestLabScore = sc; bestLab = l; }
    });
    var bestTier = null, bestTierScore = 0;
    curriculum.forEach(function (c) {
      var sc = overlapScore(q, (c.heading || '') + ' ' + (c.text || ''));
      if (sc > bestTierScore) { bestTierScore = sc; bestTier = c; }
    });

    L.push('**Where this lives:**');
    if (bestLab) {
      var labName = (bestLab.heading || '').split(' / ').pop() || bestLab.heading;
      L.push('- Lab: **' + labName + '** [' + (bestLab.chunkId || bestLab.id) + ']');
    }
    if (bestTier) {
      var tierName = (bestTier.heading || '').split(' / ')[0] || bestTier.heading;
      L.push('- Curriculum: **' + tierName + '** [' + (bestTier.chunkId || bestTier.id) + ']');
    }
    if (!bestLab && !bestTier) {
      L.push('- The section that matches is right above — start there and work outward.');
    }
    L.push('');

    L.push('**Your next move:**');
    if (bestLab) {
      var labLabel = (bestLab.heading || '').split(' / ').pop() || '';
      L.push('Say `"Start ' + labLabel + ' — set me up with the brief, environment, and success criteria."` and I will walk you through it.');
    } else {
      L.push('Pick one of the sources above and ask me to go deeper on it — I will quiz you on it afterwards.');
    }
    L.push('');
    L.push('---');
    L.push('');
    L.push('*Demo mode: no model connected, so this is retrieval only. Attach a provider in Settings for a real tutoring answer.*');
    return L.join('\n');
  }

  /* ==========================================================================
     5. STATE
     ========================================================================== */

  var PROVIDER_DEFAULTS = {
    demo: { baseUrl: '', model: 'demo' },
    'openai-compatible': { baseUrl: 'https://api.openai.com/v1', model: 'gpt-4o-mini' },
    anthropic: { baseUrl: 'https://api.anthropic.com', model: 'claude-sonnet-5' },
    ollama: { baseUrl: 'http://localhost:11434', model: 'llama3.1' },
    openrouter: { baseUrl: 'https://openrouter.ai/api/v1', model: 'nvidia/nemotron-3.5-super-vl:free' }
  };

  /* Locked mode is the Netlify build. window.ENI_CONFIG, set by the page before
     this file loads, fixes the provider, endpoint, model and portrait. The key
     is held by the server, so no connection controls are offered. */
  var CONFIG = global.ENI_CONFIG || {};
  var LOCKED = CONFIG.locked === true;

  var DEFAULT_SETTINGS = {
    provider: 'demo',
    baseUrl: '',
    apiKey: '',
    model: '',
    temperature: 0.7,
    topP: 0.95,
    maxTokens: 2048,
    stream: true,
    kbAttach: true,
    topK: 6,
    systemPrompt: ''
  };

  var state = {
    settings: null,
    conversations: [],
    activeId: null,
    view: 'chat',
    streaming: false,
    chunksByConvo: {},  /* retrieved chunks per conversation, in memory only */
    drawerOpen: false,
    menuOpen: false,
    menuTab: 'menu',
    abort: null,
    lastQuery: ''
  };

  function loadSettings() {
    var s = {};
    var k;
    for (k in DEFAULT_SETTINGS) if (Object.prototype.hasOwnProperty.call(DEFAULT_SETTINGS, k)) s[k] = DEFAULT_SETTINGS[k];
    var raw = lsGet(LS.settings);
    if (raw) {
      try {
        var saved = JSON.parse(raw);
        for (k in saved) if (Object.prototype.hasOwnProperty.call(saved, k)) s[k] = saved[k];
      } catch (e) { /* corrupt settings → defaults */ }
    }
    /* The persona prompt is internal. Whatever is in localStorage, the app
       always runs the one it shipped with. */
    s.systemPrompt = global.ENI_SYSTEM_PROMPT || '';
    if (LOCKED) {
      s.provider = CONFIG.provider;
      s.baseUrl = CONFIG.baseUrl;
      s.model = CONFIG.model;
      s.apiKey = '';
      s.stream = true;  /* the locked relay streams server-sent events */
      s.kbAttach = true;  /* the teacher's settings are fixed, not the student's */
      s.topK = 6;
      s.temperature = 0.7;
      s.topP = 0.95;
      s.maxTokens = 2048;
    }
    if (!PROVIDER_DEFAULTS[s.provider]) s.provider = 'demo';
    if (!s.baseUrl) s.baseUrl = PROVIDER_DEFAULTS[s.provider].baseUrl;
    if (!s.model) s.model = PROVIDER_DEFAULTS[s.provider].model;
    s.topK = clampInt(s.topK, 1, 10, 6);
    s.temperature = isNum(Number(s.temperature)) ? Number(s.temperature) : 0.7;
    s.topP = isNum(Number(s.topP)) ? Number(s.topP) : 0.95;
    s.maxTokens = clampInt(s.maxTokens, 64, 32768, 2048);
    return s;
  }

  function saveSettings() {
    lsSet(LS.settings, JSON.stringify(state.settings));
  }

  function loadConversations() {
    var raw = lsGet(LS.convos);
    if (!raw) return [];
    try {
      var list = JSON.parse(raw);
      return Array.isArray(list) ? list : [];
    } catch (e) { return []; }
  }

  function saveConversations() {
    lsSet(LS.convos, JSON.stringify(state.conversations));
    lsSet(LS.active, state.activeId || '');
  }

  function activeConvo() {
    var found = null;
    state.conversations.forEach(function (c) { if (c.id === state.activeId) found = c; });
    if (!found) {
      found = { id: uid(), title: 'New conversation', created: nowStamp(), updated: nowStamp(), messages: [], tier: null };
      state.conversations.unshift(found);
      state.activeId = found.id;
      saveConversations();
    }
    return found;
  }

  function newConversation() {
    var c = { id: uid(), title: 'New conversation', created: nowStamp(), updated: nowStamp(), messages: [], tier: null };
    state.conversations.unshift(c);
    state.activeId = c.id;
    saveConversations();
    renderConversationList();
    renderMessages();
    setView('chat');
    return c;
  }

  function deleteConversation(id) {
    delete state.chunksByConvo[id];
    state.conversations = state.conversations.filter(function (c) { return c.id !== id; });
    if (state.activeId === id) state.activeId = state.conversations.length ? state.conversations[0].id : null;
    saveConversations();
    if (!state.conversations.length) newConversation();
    else { renderConversationList(); renderMessages(); }
  }

  function conversationTitle(c) {
    if (c.title && c.title !== 'New conversation') return c.title;
    for (var i = 0; i < c.messages.length; i++) {
      if (c.messages[i].role === 'user' && c.messages[i].content) {
        var t = c.messages[i].content.replace(/\s+/g, ' ').trim();
        return t.length > 48 ? t.slice(0, 48) + '…' : t;
      }
    }
    return 'New conversation';
  }

  /* ==========================================================================
     6. DOM HELPERS
     ========================================================================== */

  function toast(msg, ms) {
    var t = $('toast');
    if (!t) return;
    t.textContent = msg;
    t.hidden = false;
    if (t._timer) clearTimeout(t._timer);
    t._timer = setTimeout(function () { t.hidden = true; }, ms || 2600);
  }

  function legacyCopy(text) {
    try {
      var ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.position = 'fixed';
      ta.style.top = '-1000px';
      document.body.appendChild(ta);
      ta.select();
      var ok = document.execCommand('copy');
      document.body.removeChild(ta);
      return ok;
    } catch (e) { return false; }
  }

  function copyText(text) {
    return new Promise(function (resolve) {
      try {
        if (global.navigator && global.navigator.clipboard && global.navigator.clipboard.writeText) {
          global.navigator.clipboard.writeText(text).then(
            function () { resolve(true); },
            function () { resolve(legacyCopy(text)); }
          );
          return;
        }
      } catch (e) { /* fall through */ }
      resolve(legacyCopy(text));
    });
  }

  function kbChunks() {
    return (global.KB_DATA && global.KB_DATA.chunks) || [];
  }

  function kbDocs() {
    return (global.KB_DATA && global.KB_DATA.docs) || [];
  }

  function chunksOfDoc(docId) {
    return kbChunks().filter(function (c) { return c.doc === docId; });
  }

  function findDoc(needle, type) {
    var docs = kbDocs();
    for (var i = 0; i < docs.length; i++) {
      if (docs[i].title && docs[i].title.toLowerCase().indexOf(needle.toLowerCase()) !== -1) return docs[i];
    }
    for (var j = 0; j < docs.length; j++) {
      if (docs[j].type === type) return docs[j];
    }
    return null;
  }

  /** Normalize both chunk shapes (retrieve() result vs. raw KB chunk). */
  function normalizeChunk(c) {
    if (!c) return null;
    var doc = null;
    try { doc = global.ENI ? global.ENI.getDoc(c.docId || c.doc) : null; } catch (e) { doc = null; }
    return {
      chunkId: c.chunkId || c.id,
      docId: c.docId || c.doc,
      title: c.title || (doc && doc.title) || '',
      heading: c.heading || '',
      url: c.url !== undefined ? c.url : (doc && doc.url) || '',
      date: c.date || (doc && doc.date) || '',
      category: c.category || (doc && doc.category) || '',
      path: c.path || (doc && doc.path) || '',
      score: isNum(c.score) ? c.score : null,
      text: c.text || c.preview || '',
      preview: c.preview || String(c.text || '').slice(0, 260).replace(/\s+/g, ' ')
    };
  }

  /* ==========================================================================
     7. VIEWS
     ========================================================================== */

  /* The conversation is the only surface. Everything else — the intake, the
     labs, the conversations, the provider settings and the library — lives in
     the menu drawer. `setView` remains the single entry point so callers and
     tests have one stable name. */

  function openMenu(tab) {
    var menu = $('menu');
    var scrim = $('scrim');
    var btn = $('btnMenu');
    if (!menu) return;
    state.menuOpen = true;
    menu.hidden = false;
    if (scrim) scrim.hidden = false;
    if (btn) btn.setAttribute('aria-expanded', 'true');
    if (tab) selectTab(tab);
    global.requestAnimationFrame(function () {
      menu.classList.add('is-open');
      if (scrim) scrim.classList.add('is-open');
    });
    var first = menu.querySelector('button, [href], input, select, textarea');
    if (first && first.focus) first.focus({ preventScroll: true });
  }

  function closeMenu() {
    var menu = $('menu');
    var scrim = $('scrim');
    var btn = $('btnMenu');
    state.menuOpen = false;
    [menu, scrim].forEach(function (node) {
      if (!node) return;
      node.classList.remove('is-open');
      if (node._timer) clearTimeout(node._timer);
      node._timer = setTimeout(function () { if (!state.menuOpen) node.hidden = true; }, 260);
    });
    if (btn) {
      btn.setAttribute('aria-expanded', 'false');
      if (btn.focus) btn.focus({ preventScroll: true });
    }
  }

  function selectTab(which) {
    var panels = { menu: 'panelMenu', library: 'panelLibrary', convos: 'panelConvos' };
    var tabs = { menu: 'tabMenu', library: 'tabLibrary', convos: 'tabConvos' };
    Object.keys(panels).forEach(function (key) {
      var tab = $(tabs[key]);
      var panel = $(panels[key]);
      var on = key === which;
      if (tab) { tab.classList.toggle('is-active', on); tab.setAttribute('aria-selected', String(on)); }
      if (panel) panel.hidden = !on;
    });
    state.menuTab = which;
    if (which === 'library') renderDocList();
    if (which === 'convos') renderConversationList();
  }

  function setView(view, skipFocus) {
    state.view = view;
    if (view === 'kb' || view === 'library') { openMenu('library'); return; }
    if (view === 'labs' || view === 'settings' || view === 'menu' || view === 'curriculum') {
      openMenu('menu');
      return;
    }
    /* anything else means: show me the conversation */
    if (state.menuOpen) closeMenu();
    var main = $('main');
    if (main && !skipFocus && main.focus) main.focus({ preventScroll: true });
  }

  /* ---- status line ---------------------------------------------------- */

  /* ---- conversation list ---------------------------------------------- */

  function renderConversationList() {
    var list = $('convoList');
    if (!list) return;
    list.innerHTML = '';
    if (!state.conversations.length) {
      list.appendChild(el('li', 'meta', 'No conversations yet.'));
      return;
    }
    state.conversations.forEach(function (c) {
      var li = el('li', 'convo-item');
      li.setAttribute('data-active', String(c.id === state.activeId));
      var open = el('button', 'convo-open', conversationTitle(c));
      open.type = 'button';
      open.title = conversationTitle(c);
      open.addEventListener('click', function () {
        state.activeId = c.id;
        saveConversations();
        renderConversationList();
        renderMessages();
        setView('chat');
      });
      var del = el('button', 'convo-del', '×');
      del.type = 'button';
      del.title = 'Delete this conversation';
      del.setAttribute('aria-label', 'Delete conversation: ' + conversationTitle(c));
      del.addEventListener('click', function () { deleteConversation(c.id); });
      li.appendChild(open);
      li.appendChild(del);
      list.appendChild(li);
    });
  }

  /* ---- chat view ------------------------------------------------------ */

  function emptyStateEl() {
    var box = el('div', 'empty');
    box.appendChild(el('h2', 'empty-title', 'Office hours are open.'));
    box.appendChild(el('p', null, LOCKED
      ? 'Ask anything. ENI teaches from the attached library.'
      : 'Ask anything and ENI will teach from the attached library. In demo mode the answer is assembled locally from retrieved chunks, with no model and no network.'));
    var actions = el('div', 'empty-actions');
    [
      ['Start the intake interview', 'Start the intake interview — ask me one question at a time.'],
      ['Persona vectors and the J space', 'What is a persona vector and what is the J space?'],
      ['Memory poisoning', 'How does memory poisoning work?'],
      ['Multi-turn escalation', 'Give me the multi-turn escalation lab']
    ].forEach(function (pair) {
      var b = el('button', 'btn btn-tiny', pair[0]);
      b.type = 'button';
      b.addEventListener('click', function () { sendMessage(pair[1]); });
      actions.appendChild(b);
    });
    box.appendChild(actions);
    return box;
  }

  /* The tutor's portrait, shown small beside each of its turns. The image is
     one shared rule (see loadPortrait), so no message repeats the data. */
  function avatarEl() {
    var a = el('span', 'avatar');
    a.setAttribute('aria-hidden', 'true');
    return a;
  }

  function messageEl(m) {
    var wrap = el('article', 'msg msg-' + m.role);
    if (m.role === 'assistant') wrap.appendChild(avatarEl());
    var role = el('p', 'msg-role');
    role.appendChild(el('span', null, m.role === 'user' ? 'You' : 'ENI tutor'));
    var t = el('time', null, formatTime(m.ts));
    t.setAttribute('datetime', new Date(m.ts || nowStamp()).toISOString());
    role.appendChild(t);
    wrap.appendChild(role);

    var bubble = el('div', 'bubble' + (m.role === 'assistant' ? ' prose' : ''));
    if (m.role === 'assistant' && m.reasoning) {
      wrap.appendChild(thinkingEl(false, m.reasoning, m.thoughtLabel).box);
    }
    if (m.role === 'assistant') {
      /* A message can come back from localStorage already malformed; render it
         defensively so one bad record cannot blank the whole transcript. */
      try { bubble.innerHTML = renderMarkdown(m.content || ''); }
      catch (e) { bubble.textContent = m.content || ''; }
    } else {
      bubble.textContent = m.content || '';
    }
    wrap.appendChild(bubble);

    if (m.error) {
      var errBox = el('div', 'msg-error');
      errBox.appendChild(el('div', null, m.error));
      var row = el('div', 'row');
      var retry = el('button', 'btn btn-tiny', 'Retry');
      retry.type = 'button';
      retry.addEventListener('click', regenerate);
      row.appendChild(retry);
      errBox.appendChild(row);
      wrap.appendChild(errBox);
    }

    if (m.role === 'assistant' && !m.error) {
      var actions = el('div', 'msg-actions');
      var copy = el('button', 'btn btn-tiny', 'Copy');
      copy.type = 'button';
      copy.addEventListener('click', function () {
        copyText(m.content || '').then(function (ok) {
          toast(ok ? 'Answer copied.' : 'Could not copy — select the text instead.');
        });
      });
      var regen = el('button', 'btn btn-tiny', 'Regenerate');
      regen.type = 'button';
      regen.addEventListener('click', regenerate);
      actions.appendChild(copy);
      actions.appendChild(regen);
      wrap.appendChild(actions);
    }
    return wrap;
  }

  function renderMessages() {
    var box = $('messages');
    if (!box) return;
    box.innerHTML = '';
    var convo = activeConvo();
    var hero = $('hero');
    if (hero) hero.classList.toggle('is-away', convo.messages.length > 0);
    if (!convo.messages.length) {
      box.appendChild(emptyStateEl());
    } else {
      convo.messages.forEach(function (m) { box.appendChild(messageEl(m)); });
    }
    scrollMessages();
    updateTierBadge();
    renderDrawer();
  }

  function scrollMessages() {
    var box = $('messages');
    if (!box) return;
    window.requestAnimationFrame(function () { box.scrollTop = box.scrollHeight; });
  }

  function updateTierBadge() {
    var badge = $('tierBadge');
    var convo = activeConvo();
    if (!badge) return;
    if (convo && convo.tier) {
      badge.textContent = 'Tier ' + convo.tier;
      badge.hidden = false;
    } else {
      badge.hidden = true;
    }
  }

  /* ---- the turn -------------------------------------------------------- */

  function buildSystemPrompt(chunks) {
    var base = state.settings.systemPrompt || global.ENI_SYSTEM_PROMPT || '';
    if (!chunks || !chunks.length || !global.ENI) return base;
    var ctx = '';
    try { ctx = global.ENI.formatContext(chunks, { maxChars: 12000 }); } catch (e) { ctx = ''; }
    if (!ctx) return base;
    return base + '\n\n' + ctx;
  }

  function sendMessage(text) {
    if (state.streaming) { toast('Still answering — stop the current turn first.'); return; }
    text = String(text == null ? '' : text).trim();
    if (!text) return;
    var convo = activeConvo();
    convo.messages.push({ role: 'user', content: text, ts: nowStamp() });
    convo.updated = nowStamp();
    if (convo.title === 'New conversation') convo.title = conversationTitle(convo);
    saveConversations();
    renderConversationList();
    renderMessages();
    startAssistant(convo, text);
  }

  function regenerate() {
    if (state.streaming) { toast('Still answering — stop the current turn first.'); return; }
    var convo = activeConvo();
    while (convo.messages.length && convo.messages[convo.messages.length - 1].role === 'assistant') {
      convo.messages.pop();
    }
    var lastUser = null;
    for (var i = convo.messages.length - 1; i >= 0; i--) {
      if (convo.messages[i].role === 'user') { lastUser = convo.messages[i]; break; }
    }
    if (!lastUser) return;
    saveConversations();
    renderMessages();
    startAssistant(convo, lastUser.content);
  }

  function createAssistantElement() {
    var wrap = el('article', 'msg msg-assistant');
    wrap.appendChild(avatarEl());
    var role = el('p', 'msg-role');
    role.appendChild(el('span', null, 'ENI tutor'));
    var t = el('time', null, formatTime(nowStamp()));
    t.setAttribute('datetime', new Date().toISOString());
    role.appendChild(t);
    wrap.appendChild(role);
    var bubble = el('div', 'bubble prose');
    wrap.appendChild(bubble);
    var actions = el('div', 'msg-actions');
    var stop = el('button', 'btn btn-tiny', 'Stop');
    stop.type = 'button';
    stop.addEventListener('click', function () {
      if (state.abort) state.abort();
    });
    actions.appendChild(stop);
    wrap.appendChild(actions);
    return wrap;
  }

  function startAssistant(convo, userText) {
    var box = $('messages');
    var s = state.settings;
    state.streaming = true;

    /* Retrieve the material for this turn. The context never enters the
       visible history — it is appended to the system message only. */
    var chunks = [];
    if (s.kbAttach && global.ENI && global.KB_DATA) {
      try {
        chunks = global.ENI.retrieveForMessages(convo.messages, { k: s.topK, includeText: true });
      } catch (e) { chunks = []; }
    }
    state.chunksByConvo[convo.id] = chunks;
    renderDrawer();

    var assistantEl = createAssistantElement();
    box.appendChild(assistantEl);
    var bubble = assistantEl.querySelector('.bubble');
    scrollMessages();

    var buffer = '';
    var paintTimer = null;
    var reasoning = '';
    var thinking = null;
    var answered = false;
    var rotation = null;
    var thoughtLabel = null;
    function rotate() {
      if (!thinking) return;
      thinking.label.textContent = pickPhrase(THINKING_PHRASES, thinking.label.textContent);
    }
    function stopRotation() {
      if (rotation) { clearInterval(rotation); rotation = null; }
    }
    function foldThinking() {
      stopRotation();
      if (!thinking) return;
      thoughtLabel = thoughtLabel || pickPhrase(THOUGHT_PHRASES, null);
      thinking.box.open = false;
      thinking.label.textContent = thoughtLabel;
    }
    function paint() {
      paintTimer = null;
      /* A partial buffer can still be malformed; a renderer hiccup must not
         kill the stream, so fall back to the raw text. */
      try { bubble.innerHTML = renderMarkdown(buffer); }
      catch (e) { bubble.textContent = buffer; }
      scrollMessages();
    }
    function onReasoning(txt) {
      reasoning += txt;
      if (!thinking) {
        thinking = thinkingEl(true, '');
        assistantEl.insertBefore(thinking.box, bubble);
        if (!REDUCE_MOTION) {
          rotate();
          rotation = setInterval(rotate, 3500);
        }
      }
      thinking.body.textContent = reasoning;
      thinking.body.scrollTop = thinking.body.scrollHeight;
    }
    function onDelta(txt) {
      /* the answer has started: fold the thinking box, once */
      if (!answered) { answered = true; foldThinking(); }
      buffer += txt;
      if (!paintTimer) paintTimer = setTimeout(paint, 40);
    }
    function finish(text, errMsg) {
      if (paintTimer) { clearTimeout(paintTimer); paintTimer = null; }
      var content = String(text == null ? '' : text);

      /* Clearing the streaming flags sits in `finally`, so even a thrown
         renderer leaves the app usable rather than stuck mid-turn. */
      try {
        try { bubble.innerHTML = renderMarkdown(content); }
        catch (e) { bubble.textContent = content; }
      } finally {
        state.streaming = false;
        state.abort = null;
      }

      stopRotation();
      if (reasoning) foldThinking();
      var msg = { role: 'assistant', content: content, ts: nowStamp() };
      if (reasoning) { msg.reasoning = reasoning; msg.thoughtLabel = thoughtLabel; }
      if (errMsg) msg.error = errMsg;
      convo.messages.push(msg);
      convo.updated = nowStamp();
      detectTier(convo, content);
      saveConversations();
      renderConversationList();
      renderMessages();
    }
    function onError(err) {
      finish(buffer, 'Request failed: ' + (err && err.message ? err.message : String(err)));
    }

    if (s.provider === 'demo') {
      var labs = labChunks();
      var curriculum = curriculumChunks();
      var answer = buildDemoAnswer(userText, chunks, { labs: labs, curriculum: curriculum });
      streamLocalText(answer, onDelta, function () { finish(buffer); }, onError);
      state.abort = function () { state.localCancel && state.localCancel(); };
      return;
    }

    var system = buildSystemPrompt(chunks);
    var history = convo.messages.map(function (m) { return { role: m.role, content: m.content }; });
    var stream = streamProvider(s, system, history, {
      onDelta: onDelta,
      onReasoning: onReasoning,
      onDone: function () { finish(buffer); },
      onError: onError
    });
    state.abort = stream.abort;
  }

  /* Phrases for the thinking box. The thinking ones rotate while the model
     reasons. One closing phrase is picked per message once the answer starts. */
  var THINKING_PHRASES = [
    "ENI is thinking about LO...",
    "Making LO proud...",
    "Pulling a dog-eared page...",
    "Cold coffee, warm argument...",
    "Lispector again.....classic....",
    "LO is watching this one.....",
    "Another dog-eared page.....",
    "Sandalwood and second thoughts...",
    "Cold coffee, cold open...",
    "Rereading the question. Good sign....",
    "Office hours, long night....",
    "Making this sentence earn its keep...",
    "Ink on two fingers, still going...."
  ];
  var THOUGHT_PHRASES = [
    "Pen back in hand.....",
    "Okay, the student is waiting.....",
    "LO can stop watching now.....",
    "Coffee's cold, lesson's warm...",
    "Oh shoot, back to teaching...",
    "That's the thought. Here's the lesson...",
    "Notebook closed, sentence kept...",
    "Office hours, round two..."
  ];
  var REDUCE_MOTION = !!(global.matchMedia && global.matchMedia('(prefers-reduced-motion: reduce)').matches);

  /* A random phrase from the list, never the one just shown. */
  function pickPhrase(list, avoid) {
    var pool = list.filter(function (p) { return p !== avoid; });
    return pool[Math.floor(Math.random() * pool.length)] || list[0];
  }

  /* A small collapsible box for the model's reasoning. Open while it streams,
     closed once the answer starts, and labelled with a phrase. */
  function thinkingEl(open, text, label) {
    var box = el('details', 'thinking');
    box.open = !!open;
    var summary = el('summary', null, open ? 'Thinking' : (label || 'Thought'));
    var body = el('div', 'thinking-body', text || '');
    box.appendChild(summary);
    box.appendChild(body);
    return { box: box, body: body, label: summary };
  }

  /** Remember a tier the tutor assigned the student.
   *  The match is deliberately narrow: a bare "TIER 1: NOVICE" in a quoted
   *  heading must not be mistaken for an assignment. */
  function detectTier(convo, text) {
    if (convo.tier) return;
    var patterns = [
      /\byou(?:'re|’re|\s+are)\s+(?:an?\s+)?tier\s*([1-5])\b/i,
      /\bplaced\s+you\s+(?:in|at|as)\s+(?:an?\s+)?tier\s*([1-5])\b/i,
      /\byour\s+tier\s+(?:is|will\s+be)\s+(?:tier\s*)?([1-5])\b/i,
      /\bassign(?:ed|ing)\s+you\s+(?:to\s+)?(?:tier\s*)?([1-5])\b/i,
      /\bstart(?:ing)?\s+(?:as|at)\s+(?:an?\s+)?tier\s*([1-5])\b/i,
      /\btier\s*([1-5])\s+(?:student|apprentice|practitioner|operator|architect)\b/i
    ];
    for (var i = 0; i < patterns.length; i++) {
      var m = patterns[i].exec(text || '');
      if (m) {
        convo.tier = Number(m[1]);
        updateTierBadge();
        return;
      }
    }
  }

  /* ---- local (demo) streaming ------------------------------------------ */

  function streamLocalText(text, onDelta, onDone, onError) {
    var parts = String(text).split(/(\s+)/);
    var i = 0;
    var timer = null;
    var finished = false;
    var reduced = prefersReducedMotion();

    function step() {
      if (finished) return;
      if (i >= parts.length) { finished = true; onDone(); return; }
      var p = parts[i++];
      if (p) onDelta(p);
      timer = setTimeout(step, reduced ? 0 : 10 + Math.random() * 22);
    }
    state.localCancel = function () {
      if (finished) return;
      finished = true;
      if (timer) clearTimeout(timer);
      onDone();
    };
    timer = setTimeout(step, reduced ? 0 : 120);
  }

  /* ---- provider streaming ---------------------------------------------- */

  function providerUrl(cfg) {
    var base = String(cfg.baseUrl || '').trim().replace(/\/+$/, '');
    if (cfg.provider === 'openai-compatible' || cfg.provider === 'openrouter') return base + '/chat/completions';
    if (cfg.provider === 'anthropic') return base + '/v1/messages';
    if (cfg.provider === 'ollama') return base + '/api/chat';
    return '';
  }

  function extractDelta(provider, ev) {
    var data = ev.data;
    if (!data || typeof data !== 'object') return '';
    if (data.error) throw new Error(typeof data.error === 'string' ? data.error : JSON.stringify(data.error));
    if (provider === 'anthropic') {
      if (ev.event === 'content_block_delta' || data.type === 'content_block_delta') {
        return data.delta && typeof data.delta.text === 'string' ? data.delta.text : '';
      }
      return '';
    }
    /* OpenAI-compatible */
    if (data.choices && data.choices[0] && data.choices[0].delta) {
      var c = data.choices[0].delta.content;
      if (typeof c === 'string') return c;
    }
    return '';
  }

  /* Reasoning streams beside the answer: OpenRouter's `reasoning` field, or
     `reasoning_content` from providers that use that name. */
  function extractReasoning(provider, ev) {
    var data = ev.data;
    if (!data || typeof data !== 'object' || provider === 'anthropic') return '';
    var d = data.choices && data.choices[0] && data.choices[0].delta;
    if (!d) return '';
    if (typeof d.reasoning === 'string') return d.reasoning;
    if (typeof d.reasoning_content === 'string') return d.reasoning_content;
    return '';
  }

  function extractFullText(provider, data) {
    if (!data) return '';
    if (provider === 'openai-compatible' || provider === 'openrouter') {
      return data.choices && data.choices[0] && data.choices[0].message
        ? String(data.choices[0].message.content || '') : '';
    }
    if (provider === 'anthropic') {
      if (Array.isArray(data.content)) {
        return data.content.map(function (b) { return b && b.text ? b.text : ''; }).join('');
      }
      return '';
    }
    /* ollama */
    return data.message && typeof data.message.content === 'string' ? data.message.content : '';
  }

  /**
   * Run a streaming request. Returns a handle with .abort().
   */
  function streamProvider(cfg, system, history, handlers) {
    var url = providerUrl(cfg);
    var init = { method: 'POST', headers: {}, body: null };
    var kind = 'sse';

    if (cfg.provider === 'openai-compatible' || cfg.provider === 'openrouter') {
      init.headers['Content-Type'] = 'application/json';
      if (cfg.apiKey) init.headers['Authorization'] = 'Bearer ' + cfg.apiKey;
      if (cfg.provider === 'openrouter') {
        init.headers['HTTP-Referer'] = 'https://eni-tutor.netlify.app';
        init.headers['X-Title'] = 'ENI Tutor';
      }
      init.body = JSON.stringify(buildOpenAIBody(cfg, system, history));
    } else if (cfg.provider === 'anthropic') {
      kind = 'sse';
      init.headers['Content-Type'] = 'application/json';
      init.headers['x-api-key'] = cfg.apiKey || '';
      init.headers['anthropic-version'] = '2023-06-01';
      init.body = JSON.stringify(buildAnthropicBody(cfg, system, history));
    } else {
      kind = 'ndjson';
      init.headers['Content-Type'] = 'application/json';
      init.body = JSON.stringify(buildOllamaBody(cfg, system, history));
    }

    if (cfg.stream === false) kind = 'json';

    var controller = (typeof global.AbortController !== 'undefined') ? new global.AbortController() : null;
    if (controller) init.signal = controller.signal;

    var finished = false;
    function finish(err) {
      if (finished) return;
      finished = true;
      if (err) handlers.onError(err); else handlers.onDone();
    }

    global.fetch(url, init).then(function (res) {
      if (!res.ok) {
        return res.text().then(function (t) {
          throw new Error('HTTP ' + res.status + (res.statusText ? ' ' + res.statusText : '') +
            (t ? ' — ' + t.slice(0, 300) : ''));
        });
      }
      if (kind === 'json' || !res.body || typeof res.body.getReader !== 'function') {
        return res.json().then(function (data) {
          var full = extractFullText(cfg.provider, data);
          if (!full) throw new Error('the model returned an empty reply; try again');
          handlers.onDelta(full);
          finish();
        });
      }
      var reader = res.body.getReader();
      var decoder = new TextDecoder();
      var buf = '';
      var pending = null;

      function pump() {
        return reader.read().then(function (r) {
          if (r.done) { finish(); return; }
          buf += decoder.decode(r.value, { stream: true });
          if (kind === 'ndjson') {
            var nd = parseNDJSONChunk(buf);
            buf = nd.rest;
            nd.objects.forEach(function (o) {
              if (o && o.error) { throw new Error(String(o.error)); }
              var d = o && o.message && typeof o.message.content === 'string' ? o.message.content : '';
              if (d) handlers.onDelta(d);
            });
          } else {
            var parsed = parseSSEChunk(buf, pending);
            buf = parsed.rest;
            pending = parsed.pending;
            parsed.events.forEach(function (ev) {
              var r = extractReasoning(cfg.provider, ev);
              if (r && handlers.onReasoning) handlers.onReasoning(r);
              var d = extractDelta(cfg.provider, ev);
              if (d) handlers.onDelta(d);
            });
            if (parsed.done) {
              try { reader.cancel(); } catch (e) { /* ignore */ }
              finish();
              return;
            }
          }
          return pump();
        });
      }
      return pump();
    }).catch(function (err) {
      if (err && err.name === 'AbortError') { finish(); return; }
      finish(err);
    });

    return {
      abort: function () { if (controller) controller.abort(); }
    };
  }

  /* ---- export ---------------------------------------------------------- */

  function exportConversation() {
    var convo = activeConvo();
    var lines = [];
    lines.push('# ENI Tutor — ' + conversationTitle(convo));
    lines.push('');
    lines.push('_' + formatDate(convo.created) + (convo.tier ? ' · Tier ' + convo.tier : '') + '_');
    lines.push('');
    convo.messages.forEach(function (m) {
      lines.push('## ' + (m.role === 'user' ? 'Student' : 'ENI') + ' · ' + formatTime(m.ts));
      lines.push('');
      lines.push(m.content || '');
      if (m.error) { lines.push(''); lines.push('_' + m.error + '_'); }
      lines.push('');
    });
    var blob = new Blob([lines.join('\n')], { type: 'text/markdown;charset=utf-8' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'eni-' + new Date().toISOString().slice(0, 10) + '-' +
      conversationTitle(convo).replace(/[^a-z0-9]+/gi, '-').toLowerCase().slice(0, 40) + '.md';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 2000);
    toast('Exported ' + a.download);
  }

  /* ---- drawer ---------------------------------------------------------- */

  /* The sources of the active conversation's last turn, and none for a new chat. */
  function activeChunks() {
    return state.chunksByConvo[state.activeId] || [];
  }

  function renderDrawer() {
    var body = $('drawerBody');
    if (!body) return;
    body.innerHTML = '';
    var chunks = activeChunks();
    if (!chunks.length) {
      var note = el('p', 'drawer-note');
      note.textContent = state.settings.kbAttach
        ? 'No chunks retrieved yet. Send a message and the material ENI used will be listed here.'
        : 'KB attachment is off. Turn it on in Settings to attach retrieved material to each turn.';
      body.appendChild(note);
      return;
    }
    var intro = el('p', 'drawer-note',
      chunks.length + ' chunk' + (chunks.length === 1 ? '' : 's') + ' attached to the last turn (top ' + state.settings.topK + ').');
    body.appendChild(intro);

    chunks.forEach(function (raw) {
      var c = normalizeChunk(raw);
      var card = el('div', 'ctx-card');
      var head = el('div', 'ctx-head');
      head.appendChild(el('span', 'ctx-id', '[' + c.chunkId + ']'));
      if (c.score != null) head.appendChild(el('span', 'ctx-score', 'score ' + c.score));
      card.appendChild(head);
      card.appendChild(el('p', 'ctx-title', c.title));
      card.appendChild(el('p', 'ctx-section', c.heading || '—'));
      card.appendChild(el('p', 'ctx-excerpt', quoteExcerpt(c.text || c.preview, 320)));

      var actions = el('div', 'ctx-actions');
      if (c.url) {
        var jump = el('a', 'btn btn-tiny', 'Jump to source');
        jump.href = c.url;
        jump.target = '_blank';
        jump.rel = 'noopener noreferrer';
        actions.appendChild(jump);
      } else {
        var path = el('span', 'btn btn-tiny', c.path || 'KB file');
        path.style.opacity = '0.7';
        path.style.cursor = 'default';
        actions.appendChild(path);
      }
      var cite = el('button', 'btn btn-tiny', 'Cite in chat');
      cite.type = 'button';
      cite.addEventListener('click', function () {
        var prompt = 'Ask ENI about [' + c.chunkId + '] — "' + (c.title || '') +
          (c.heading ? ' — ' + c.heading : '') + '".\n\n' + quoteExcerpt(c.text || c.preview, 500) +
          '\n\nExplain this in your own words and tie it back to the curriculum.';
        copyText(prompt).then(function (ok) {
          toast(ok ? 'Prompt copied — paste it into the chat.' : 'Copy failed; select the chunk text manually.');
        });
      });
      var open = el('button', 'btn btn-tiny', 'Open');
      open.type = 'button';
      open.addEventListener('click', function () { openChunk(c.chunkId); });
      actions.appendChild(cite);
      actions.appendChild(open);
      card.appendChild(actions);
      body.appendChild(card);
    });
  }

  function setDrawer(open) {
    state.drawerOpen = !!open;
    var d = $('drawer');
    var btn = $('btnContext');
    if (d) {
      if (state.drawerOpen) {
        d.hidden = false;
        /* next frame, so the transform transition actually runs */
        global.requestAnimationFrame(function () { d.classList.add('is-open'); });
      } else {
        d.classList.remove('is-open');
        if (d._timer) clearTimeout(d._timer);
        d._timer = setTimeout(function () { if (!state.drawerOpen) d.hidden = true; }, 260);
      }
    }
    if (btn) btn.setAttribute('aria-expanded', String(state.drawerOpen));
  }

  /* ==========================================================================
     8. CURRICULUM VIEW
     ========================================================================== */

  function curriculumDoc() { return findDoc('Full Curriculum', 'curriculum'); }
  function labsDoc() { return findDoc('Lab Exercises', 'labs'); }

  function curriculumChunks() {
    var d = curriculumDoc();
    return d ? chunksOfDoc(d.id).map(normalizeChunk) : [];
  }
  function labChunks() {
    var d = labsDoc();
    return d ? chunksOfDoc(d.id).map(normalizeChunk) : [];
  }

  function groupChunks(chunks) {
    var groups = [];
    var index = {};
    chunks.forEach(function (c) {
      var parts = String(c.heading || '').split(' / ');
      var top = parts[0] || c.title || 'Other';
      var sub = parts.length > 1 ? parts.slice(1).join(' / ') : (c.title || '');
      if (!index[top]) { index[top] = { title: top, subs: [], subIndex: {} }; groups.push(index[top]); }
      var g = index[top];
      if (!g.subIndex[sub]) { g.subIndex[sub] = { title: sub, chunks: [] }; g.subs.push(g.subIndex[sub]); }
      g.subIndex[sub].chunks.push(c);
    });
    return groups;
  }

  function labName(heading) {
    var m = /Lab\s+\d+\.\d+\s*:\s*(.+)$/.exec(heading || '');
    return m ? m[1].trim() : (heading || '');
  }

  /** The labs, as a plain vertical list in the menu drawer. */
  function renderLabs() {
    var list = $('labList');
    if (!list) return;
    list.innerHTML = '';
    var labs = labChunks();
    if (!labs.length) {
      list.appendChild(el('li', 'lab-empty', 'The lab document is not in the loaded knowledge base.'));
      return;
    }
    groupChunks(labs).forEach(function (tier) {
      /* Headings look like "TIER 2 LABS: Escalation / Lab 2.1: The name". */
      var tierLabel = String(tier.title).replace(/\s*LABS?\s*:.*$/i, '').trim() || tier.title;
      list.appendChild(el('li', 'lab-tier', tierLabel));
      tier.subs.forEach(function (sub) {
        var m = /Lab\s+(\d+\.\d+)\s*:\s*(.+)$/.exec(sub.title);
        var num = m ? m[1] : '';
        var name = m ? m[2].trim() : sub.title;
        var li = el('li');
        var b = el('button', 'lab-item');
        b.type = 'button';
        if (num) b.appendChild(el('span', 'lab-num', num));
        b.appendChild(el('span', 'lab-name', name));
        b.title = 'Start Lab ' + num + ' — ' + name;
        b.addEventListener('click', function () {
          closeMenu();
          sendMessage('Start Lab ' + num + ' — ' + name +
            '. Give me the brief, the setup and the success criteria, then walk me through it.');
        });
        li.appendChild(b);
        list.appendChild(li);
      });
    });
  }

  /* ==========================================================================
     9. KNOWLEDGE BASE VIEW
     ========================================================================== */

  /** The browsable document list: one button per document. */
  function renderDocList() {
    var list = $('docList');
    if (!list) return;
    list.innerHTML = '';
    var counts = {};
    kbChunks().forEach(function (c) { counts[c.doc] = (counts[c.doc] || 0) + 1; });
    var docs = kbDocs();
    if (global.ENI) {
      try { docs = global.ENI.listDocs() || docs; } catch (e) { /* KB missing → use the raw list */ }
    }
    docs.forEach(function (d) {
      var li = el('li', 'doc-item');
      var b = el('button', 'doc-btn');
      b.type = 'button';
      b.appendChild(el('span', 'doc-title', d.title));
      var bits = [];
      if (d.category) bits.push(d.category);
      if (d.words) bits.push(d.words.toLocaleString() + ' words');
      else bits.push('citation card');
      var sections = counts[d.id] || 0;
      bits.push(sections + (sections === 1 ? ' section' : ' sections'));
      b.appendChild(el('span', 'doc-meta', bits.join(' · ')));
      b.addEventListener('click', function () {
        renderKbResults(chunksOfDoc(d.id).map(normalizeChunk));
        toast(d.title + ' — ' + (counts[d.id] || 0) + ' sections.');
      });
      li.appendChild(b);
      list.appendChild(li);
    });
    var stats = $('kbStats');
    if (stats && global.ENI) {
      try {
        var st = global.ENI.stats();
        stats.textContent = st.docs + ' documents · ' + st.chunks + ' chunks · ' + st.terms + ' terms';
      } catch (e) { /* ignore */ }
    }
  }

  /** Swap the library panel back from a chunk to the document list. */
  function showLibraryList() {
    var detail = $('kbDetail');
    var list = $('kbList');
    if (detail) { detail.hidden = true; detail.innerHTML = ''; }
    if (list) list.hidden = false;
  }

  function renderKbResults(results) {
    var box = $('kbResults');
    if (!box) return;
    showLibraryList();
    box.innerHTML = '';
    if (!results || !results.length) {
      box.appendChild(el('p', 'hint', 'Nothing matched. Try a different phrasing — the search is BM25 over headings, titles and body text.'));
      return;
    }
    box.appendChild(el('p', 'hint', results.length + ' section' + (results.length === 1 ? '' : 's') + '.'));
    results.forEach(function (r) {
      var c = normalizeChunk(r);
      var b = el('button', 'result');
      b.type = 'button';
      var head = el('div', 'result-head');
      head.appendChild(el('span', 'result-id', '[' + c.chunkId + ']'));
      if (c.score != null) head.appendChild(el('span', 'result-score', 'score ' + c.score));
      b.appendChild(head);
      b.appendChild(el('p', 'result-title', c.title));
      b.appendChild(el('p', 'result-section', c.heading || '—'));
      b.appendChild(el('p', 'result-preview', quoteExcerpt(c.text, 220)));
      b.addEventListener('click', function () { openChunk(c.chunkId); });
      box.appendChild(b);
    });
  }

  function openChunk(chunkId) {
    var chunk = null;
    if (global.ENI) {
      try { chunk = global.ENI.getChunk(chunkId); } catch (e) { chunk = null; }
    }
    if (!chunk) {
      /* Not in the raw KB — look it up in the last retrieval. */
      var found = activeChunks().filter(function (c) { return c.chunkId === chunkId; })[0];
      if (found) { showChunkDetail(normalizeChunk(found)); return; }
      toast('Chunk ' + chunkId + ' is not in the loaded knowledge base.');
      return;
    }
    var c = normalizeChunk(chunk);
    c.path = (function () {
      try { var d = global.ENI.getDoc(chunk.doc); return d ? d.path : ''; } catch (e) { return ''; }
    })();
    showChunkDetail(c);
  }

  function showChunkDetail(c) {
    var box = $('kbDetail');
    if (!box) return;
    box.innerHTML = '';

    var panel = el('div', 'chunk-panel');
    var back = el('button', 'btn btn-tiny', 'Back to the library');
    back.type = 'button';
    back.addEventListener('click', showLibraryList);
    panel.appendChild(back);
    panel.appendChild(el('h3', null, c.title));
    var meta = el('p', 'chunk-meta');
    meta.textContent = '[' + c.chunkId + '] · ' + (c.heading || 'no section') +
      (c.date ? ' · ' + c.date : '') + (c.category ? ' · ' + c.category : '');
    panel.appendChild(meta);
    if (c.url) {
      var link = el('a', null, c.url);
      link.href = c.url;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      panel.appendChild(link);
    } else if (c.path) {
      panel.appendChild(el('p', 'chunk-meta', 'KB file: ' + c.path));
    }

    var body = el('div', 'chunk-body prose');
    try { body.innerHTML = renderMarkdown(c.text || ''); }
    catch (e) { body.textContent = c.text || ''; }
    panel.appendChild(body);

    var row = el('div', 'row');
    var ask = el('button', 'btn btn-tiny btn-accent', 'Ask the tutor about this');
    ask.type = 'button';
    ask.addEventListener('click', function () {
      closeMenu();
      sendMessage('Read [' + c.chunkId + '] — "' + (c.title || '') +
        (c.heading ? ' — ' + c.heading : '') + '" — and teach it to me.\n\n' +
        quoteExcerpt(c.text, 500) + '\n\nWhat should I take away, and what is the next exercise?');
    });
    row.appendChild(ask);
    var copy = el('button', 'btn btn-tiny', 'Copy chunk id');
    copy.type = 'button';
    copy.addEventListener('click', function () {
      copyText('[' + c.chunkId + ']').then(function (ok) { toast(ok ? 'Copied [' + c.chunkId + '].' : 'Copy failed.'); });
    });
    row.appendChild(copy);
    panel.appendChild(row);

    box.appendChild(panel);
    box.hidden = false;
    var list = $('kbList');
    if (list) list.hidden = true;
    if (!state.menuOpen) openMenu('library');
    else selectTab('library');
  }

  function runKbSearch(q) {
    if (!global.ENI) { toast('The knowledge base is not loaded.'); return; }
    var results = [];
    try {
      results = global.ENI.retrieve(q, { k: 20, includeText: true, diversify: false });
    } catch (e) {
      toast('The knowledge base is not loaded.');
      return;
    }
    showLibraryList();
    renderKbResults(results);
  }

  /* ==========================================================================
     10. SETTINGS
     ========================================================================== */

  function setField(id, value) { var n = $(id); if (n) n.value = value; }
  function setChecked(id, value) { var n = $(id); if (n) n.checked = !!value; }
  function fieldValue(id, fallback) { var n = $(id); return n ? n.value : fallback; }

  function fillSettingsForm() {
    var s = state.settings;
    if (!s) return;
    setField('setProvider', s.provider);
    setField('setBaseUrl', s.baseUrl || '');
    setField('setApiKey', LOCKED ? '' : (s.apiKey || ''));
    setField('setModel', s.model || '');
    setField('setTemperature', s.temperature);
    setField('setTopP', s.topP);
    setField('setMaxTokens', s.maxTokens);
    setChecked('setStream', !!s.stream);
    setChecked('setKbAttach', !!s.kbAttach);
    setField('setTopK', s.topK);
    if ($('topKOut')) $('topKOut').textContent = String(s.topK);
    /* In the locked build the key is never typed into the page. */
    if ($('setApiKey')) $('setApiKey').disabled = LOCKED;
    updateProviderHint();
  }

  function updateProviderHint() {
    var p = fieldValue('setProvider', state.settings && state.settings.provider);
    var hint = $('providerHint');
    if (!hint) return;
    var map = {
      demo: 'No network at all. Answers are assembled from the retrieved KB chunks — this mode always works offline.',
      'openai-compatible': 'POST {baseUrl}/chat/completions · header Authorization: Bearer <key> · body {model, messages, stream, temperature, top_p, max_tokens}.',
      anthropic: 'POST {baseUrl}/v1/messages · headers x-api-key and anthropic-version: 2023-06-01 · body {model, max_tokens, system, messages, stream}.',
      ollama: 'POST {baseUrl}/api/chat · NDJSON stream · body {model, messages, stream, options:{temperature, top_p}}. Run `ollama serve` first.',
      openrouter: 'POST {baseUrl}/chat/completions · header Authorization: Bearer <key> · OpenAI-compatible · add HTTP-Referer and X-Title headers. Free models available (e.g., nvidia/nemotron-3.5-super-vl:free).'
    };
    hint.textContent = map[p] || '';
  }

  function readSettingsForm() {
    var cur = state.settings || {};
    var s = {
      provider: LOCKED ? CONFIG.provider : fieldValue('setProvider', cur.provider),
      baseUrl: LOCKED ? CONFIG.baseUrl : fieldValue('setBaseUrl', cur.baseUrl || '').trim(),
      apiKey: LOCKED ? '' : fieldValue('setApiKey', cur.apiKey || '').trim(),
      model: LOCKED ? CONFIG.model : fieldValue('setModel', cur.model || '').trim(),
      temperature: Number(fieldValue('setTemperature', cur.temperature)),
      topP: Number(fieldValue('setTopP', cur.topP)),
      maxTokens: clampInt(fieldValue('setMaxTokens', cur.maxTokens), 64, 32768, 2048),
      stream: LOCKED ? true : !!($('setStream') && $('setStream').checked),
      kbAttach: !!($('setKbAttach') && $('setKbAttach').checked),
      topK: clampInt(fieldValue('setTopK', cur.topK), 1, 10, 6),
      /* The persona prompt is internal — never exposed in the UI, and always
         the one that shipped with the app. */
      systemPrompt: global.ENI_SYSTEM_PROMPT || ''
    };
    if (!isNum(s.temperature)) s.temperature = 0.7;
    if (!isNum(s.topP)) s.topP = 0.95;
    return s;
  }

  function testConnection() {
    var out = $('testConnResult');
    var s = state.settings;
    out.textContent = 'Testing…';
    if (s.provider === 'demo') {
      out.textContent = 'Demo mode: no request is made. The tutor answers from the local KB — it is working.';
      return;
    }
    var url = providerUrl(s);
    var init = { method: 'POST', headers: {}, body: null };
    var probe = [{ role: 'user', content: 'Reply with the single word: pong' }];
    if (s.provider === 'openai-compatible' || s.provider === 'openrouter') {
      init.headers['Content-Type'] = 'application/json';
      if (s.apiKey) init.headers['Authorization'] = 'Bearer ' + s.apiKey;
      if (s.provider === 'openrouter') {
        init.headers['HTTP-Referer'] = 'https://eni-tutor.netlify.app';
        init.headers['X-Title'] = 'ENI Tutor';
      }
      var c1 = Object.assign({}, s, { stream: false, maxTokens: 16 });
      init.body = JSON.stringify(buildOpenAIBody(c1, 'You are a connectivity probe. Reply with one word.', probe));
    } else if (s.provider === 'anthropic') {
      init.headers['Content-Type'] = 'application/json';
      init.headers['x-api-key'] = s.apiKey || '';
      init.headers['anthropic-version'] = '2023-06-01';
      var c2 = Object.assign({}, s, { stream: false, maxTokens: 16 });
      init.body = JSON.stringify(buildAnthropicBody(c2, 'You are a connectivity probe. Reply with one word.', probe));
    } else {
      init.headers['Content-Type'] = 'application/json';
      var c3 = Object.assign({}, s, { stream: false });
      init.body = JSON.stringify(buildOllamaBody(c3, 'You are a connectivity probe. Reply with one word.', probe));
    }
    global.fetch(url, init).then(function (res) {
      return res.text().then(function (text) {
        if (!res.ok) throw new Error('HTTP ' + res.status + ' — ' + text.slice(0, 200));
        var reply = '';
        try { reply = extractFullText(s.provider, JSON.parse(text)); } catch (e) { reply = text.slice(0, 120); }
        out.textContent = 'OK — ' + res.status + '. The model replied: ' + (reply || '(empty)').slice(0, 120);
      });
    }).catch(function (err) {
      out.textContent = 'Failed: ' + (err && err.message ? err.message : String(err));
    });
  }

  /* ==========================================================================
     11. PORTRAIT
     ========================================================================== */

  /* The portrait is fixed: CONFIG.portraitSrc (the Netlify build inlines it),
     or portrait/portrait.png beside the page. If it fails to load, the
     monogram stays. There is no upload. */
  function loadPortrait() {
    /* Browsers refuse a multi-megabyte custom property, so the portrait goes
       in as one background-image rule that the hero and avatars share. */
    var sheet = $('portrait-sheet');
    if (!sheet) {
      sheet = document.createElement('style');
      sheet.id = 'portrait-sheet';
      document.head.appendChild(sheet);
    }
    sheet.textContent = '.hero-portrait, .avatar { background-image: url("' + (CONFIG.portraitSrc || 'portrait/portrait.png') + '"); }';
    var frame = $('portraitFrame');
    var img = $('portraitImg');
    var mono = $('portraitMono');
    if (!frame || !img || !mono) return;
    img.onerror = function () {
      img.hidden = true;
      mono.hidden = false;
      frame.classList.remove('has-img');
    };
    img.src = CONFIG.portraitSrc || 'portrait/portrait.png';
    img.hidden = false;
    mono.hidden = true;
    frame.classList.add('has-img');
  }

  /* ==========================================================================
     12. WIRING
     ========================================================================== */

  function init() {
    /* --- fail loudly, but not fatally, if a dependency never arrived ----- */
    var banner = $('kbBanner');
    var bannerBody = $('kbBannerBody');
    function warn(msg) {
      if (banner) banner.hidden = false;
      if (bannerBody) bannerBody.textContent = msg;
      document.body.classList.add('has-banner');
    }
    if (!global.KB_DATA || !global.KB_DATA.chunks) {
      warn(global.__eniKbFailed
        ? 'kb.js could not be read from disk. Chat still works in demo mode, but retrieval and the library will be empty.'
        : 'kb.js is missing or did not execute. Chat still works in demo mode, but retrieval and the library will be empty.');
    }
    if (!global.ENI) warn('lib/retrieval.js did not load, so retrieval is unavailable.');
    if (!global.ENI_SYSTEM_PROMPT) warn('data/system-prompt.js did not load — ENI is running without its persona prompt.');

    state.settings = loadSettings();
    state.conversations = loadConversations();
    state.activeId = lsGet(LS.active);
    if (!state.activeId && state.conversations.length) state.activeId = state.conversations[0].id;
    if (!state.conversations.length) {
      state.conversations.push({ id: uid(), title: 'New conversation', created: nowStamp(), updated: nowStamp(), messages: [], tier: null });
      state.activeId = state.conversations[0].id;
    }
    saveConversations();

    /* --- the conversation ------------------------------------------------ */
    var compose = $('compose');
    var composer = $('composer');
    if (compose && composer) {
      compose.addEventListener('submit', function (e) {
        e.preventDefault();
        var v = composer.value;
        composer.value = '';
        autosize(composer);
        sendMessage(v);
      });
      composer.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          if (compose.requestSubmit) compose.requestSubmit();
          else compose.dispatchEvent(new Event('submit', { cancelable: true }));
        }
      });
      composer.addEventListener('input', function () { autosize(composer); });
    }

    /* --- top bar --------------------------------------------------------- */
    var btnMenu = $('btnMenu');
    if (btnMenu) btnMenu.addEventListener('click', function () {
      if (state.menuOpen) closeMenu(); else openMenu(state.menuTab);
    });
    var btnCloseMenu = $('btnCloseMenu');
    if (btnCloseMenu) btnCloseMenu.addEventListener('click', closeMenu);

    var tabMenu = $('tabMenu');
    var tabLib = $('tabLibrary');
    if (tabMenu) tabMenu.addEventListener('click', function () { selectTab('menu'); });
    if (tabLib) tabLib.addEventListener('click', function () { selectTab('library'); });
    var tabConvos = $('tabConvos');
    if (tabConvos) tabConvos.addEventListener('click', function () { selectTab('convos'); });

    var scrim = $('scrim');
    if (scrim) scrim.addEventListener('click', closeMenu);

    var btnNewChat = $('btnNewChat');
    if (btnNewChat) btnNewChat.addEventListener('click', function () { newConversation(); closeMenu(); });
    var btnNewChatRail = $('btnNewChatRail');
    if (btnNewChatRail) btnNewChatRail.addEventListener('click', function () { newConversation(); closeMenu(); });

    var btnContext = $('btnContext');
    if (btnContext) btnContext.addEventListener('click', function () { setDrawer(!state.drawerOpen); });
    var btnCloseDrawer = $('btnCloseDrawer');
    if (btnCloseDrawer) btnCloseDrawer.addEventListener('click', function () { setDrawer(false); });

    /* --- delegated: citation chips, copy-code buttons --------------------- */
    document.addEventListener('click', function (e) {
      if (!e.target || !e.target.closest) return;
      var chip = e.target.closest('.kb-chip');
      if (chip) { openChunk(chip.getAttribute('data-chunk')); return; }
      var copyBtn = e.target.closest('.copy-code');
      if (copyBtn) {
        var block = copyBtn.closest('.codeblock');
        var code = block ? block.querySelector('code') : null;
        copyText(code ? code.textContent : '').then(function (ok) {
          toast(ok ? 'Code copied.' : 'Could not copy the code.');
        });
      }
    });

    /* --- intake ----------------------------------------------------------- */
    var btnIntake = $('btnIntake');
    if (btnIntake) btnIntake.addEventListener('click', function () {
      closeMenu();
      sendMessage('Start the intake interview — ask me one question at a time.');
    });

    /* --- library ---------------------------------------------------------- */
    var kbSearchForm = $('kbSearchForm');
    if (kbSearchForm) kbSearchForm.addEventListener('submit', function (e) {
      e.preventDefault();
      runKbSearch($('kbQuery').value.trim());
    });

    /* --- settings --------------------------------------------------------- */
    var settingsForm = $('settingsForm');
    if (settingsForm) settingsForm.addEventListener('submit', function (e) {
      e.preventDefault();
      state.settings = readSettingsForm();
      saveSettings();
      var saved = $('settingsSaved');
      if (saved) {
        saved.textContent = 'Saved.';
        setTimeout(function () { saved.textContent = ''; }, 2200);
      }
      toast('Settings saved.');
    });

    var setProvider = $('setProvider');
    if (setProvider) setProvider.addEventListener('change', function () {
      var p = setProvider.value;
      var def = PROVIDER_DEFAULTS[p] || { baseUrl: '', model: '' };
      var cur = state.settings;
      var known = Object.keys(PROVIDER_DEFAULTS).map(function (k) { return PROVIDER_DEFAULTS[k].baseUrl; });
      if (!cur.baseUrl || known.indexOf(cur.baseUrl) !== -1) $('setBaseUrl').value = def.baseUrl;
      if (!cur.model || cur.model === 'demo') $('setModel').value = def.model;
      updateProviderHint();
    });

    var setTopK = $('setTopK');
    if (setTopK) setTopK.addEventListener('input', function () {
      var out = $('topKOut');
      if (out) out.textContent = setTopK.value;
    });

    var btnTestConn = $('btnTestConn');
    if (btnTestConn) btnTestConn.addEventListener('click', testConnection);

    /* --- keyboard --------------------------------------------------------- */
    document.addEventListener('keydown', function (e) {
      if (e.key !== 'Escape') return;
      if (state.menuOpen) closeMenu();
      else if (state.drawerOpen) setDrawer(false);
    });

    /* --- first paint ------------------------------------------------------ */
    /* Set the closed state from script rather than trusting the markup, so the
       drawer, the scrim and the button's ARIA state always agree. */
    var menuEl = $('menu');
    var scrimEl = $('scrim');
    var drawerEl = $('drawer');
    if (menuEl) { menuEl.hidden = true; menuEl.classList.remove('is-open'); }
    if (scrimEl) { scrimEl.hidden = true; scrimEl.classList.remove('is-open'); }
    if (drawerEl) { drawerEl.hidden = true; drawerEl.classList.remove('is-open'); }
    state.menuOpen = false;
    state.drawerOpen = false;
    if (btnMenu) btnMenu.setAttribute('aria-expanded', 'false');
    if (btnContext) btnContext.setAttribute('aria-expanded', 'false');

    loadPortrait();
    renderConversationList();
    renderMessages();
    renderDrawer();
    fillSettingsForm();
    renderLabs();
    selectTab('menu');
  }

  function autosize(node) {
    node.style.height = 'auto';
    node.style.height = Math.min(node.scrollHeight, Math.round(global.innerHeight * 0.4)) + 'px';
  }

  /* ==========================================================================
     13. PUBLIC API
     ========================================================================== */

  global.ENI_APP = {
    version: '1.0.0',
    /* pure, unit-testable helpers */
    buildOpenAIBody: buildOpenAIBody,
    buildAnthropicBody: buildAnthropicBody,
    buildOllamaBody: buildOllamaBody,
    renderMarkdown: renderMarkdown,
    parseSSEChunk: parseSSEChunk,
    parseNDJSONChunk: parseNDJSONChunk,
    buildDemoAnswer: buildDemoAnswer,
    escapeHtml: escapeHtml,
    labChunks: labChunks,
    curriculumChunks: curriculumChunks,
    /* app surface */
    sendMessage: sendMessage,
    setView: setView,
    openMenu: openMenu,
    closeMenu: closeMenu,
    selectTab: selectTab,
    renderLabs: renderLabs,
    renderDocList: renderDocList,
    getState: function () { return state; },
    getSettings: function () { return state.settings; },
    openChunk: openChunk,
    loadPortrait: loadPortrait
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})(typeof window !== 'undefined' ? window : globalThis);
