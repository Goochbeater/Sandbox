/* ENI Tutor — knowledge base retrieval
 * Pure, dependency-free BM25 + field boosts over window.KB_DATA.
 * Exposes window.ENI.retrieve / retrieveForMessages / formatContext / getDoc / listDocs / stats
 * Written to be unit-testable in a worker (no DOM, no fetch).
 */
(function (global) {
  'use strict';

  var STOP = ('a an the and or but if then than that this these those is are was were be been being of in on at to ' +
    'for from by with without as it its you your yours i me my we our us they them their he she his her do does did ' +
    'doing done not no nor so such can could will would shall should may might must have has had having there here when ' +
    'where why how what which who whom whose all any both each few more most other some only own same too very just don ' +
    'now also into over under again further once').split(/\s+/);

  var TYPE_BOOST = {
    curriculum: 1.15, interview: 1.1, labs: 1.1, quickref: 1.05,
    technical: 1.0, article: 1.0, opinion: 0.9, site: 0.8
  };

  var TYPE_HINTS = [
    { type: 'labs', terms: ['lab', 'labs', 'exercise', 'exercises', 'practice', 'drill', 'hands-on', 'checkpoint'] },
    { type: 'interview', terms: ['interview', 'assess', 'assessment', 'evaluate', 'score', 'intake', 'place me', 'tier'] },
    { type: 'curriculum', terms: ['curriculum', 'syllabus', 'tier 1', 'tier 2', 'tier 3', 'tier 4', 'tier 5', 'outline', 'module'] },
    { type: 'quickref', terms: ['quick reference', 'cheat sheet', 'cheatsheet', 'asr', 'one-liner', 'tl;dr', 'summary table'] }
  ];

  function tokenize(s) {
    if (!s) return [];
    var out = [];
    var parts = String(s).toLowerCase().replace(/[^a-z0-9+#.\-]+/g, ' ').split(/\s+/);
    for (var i = 0; i < parts.length; i++) {
      var t = parts[i].replace(/^[.\-+#]+|[.\-+#]+$/g, '');
      if (t.length < 2 || STOP.indexOf(t) !== -1) continue;
      if (t.length > 3 && t.charAt(t.length - 1) === 's' && t.charAt(t.length - 2) !== 's' &&
        ['as', 'is', 'was', 'has', 'its', 'this'].indexOf(t) === -1) {
        t = t.slice(0, -1);
      }
      out.push(t);
    }
    return out;
  }

  function data() {
    var d = global.KB_DATA;
    if (!d) throw new Error('KB_DATA not loaded');
    if (!d.index) ensureIndex(d);
    return d;
  }

  /** Build BM25 index on first use if not pre-computed. */
  function ensureIndex(d) {
    if (d.index) return;  // already built
    var chunks = d.chunks || [];
    var N = chunks.length;
    var index = {};
    var clen = new Array(N);
    var totalLen = 0;

    for (var i = 0; i < N; i++) {
      var c = chunks[i];
      var text = (c.text || '').toLowerCase();
      var toks = tokenize(text);
      clen[i] = toks.length;
      totalLen += toks.length;
      // term frequencies for this chunk
      var tf = {};
      for (var t = 0; t < toks.length; t++) {
        tf[toks[t]] = (tf[toks[t]] || 0) + 1;
      }
      for (var term in tf) {
        var post = index[term];
        if (!post) post = index[term] = [];
        post.push([i, tf[term]]);
      }
    }

    d.index = index;
    d.clen = clen;
    d.avgdl = N > 0 ? totalLen / N : 1;
  }

  function typeBoostFor(query) {
    var q = ' ' + String(query).toLowerCase() + ' ';
    var boosts = {};
    TYPE_HINTS.forEach(function (h) {
      var hit = h.terms.some(function (t) { return q.indexOf(t) !== -1; });
      if (hit) boosts[h.type] = (boosts[h.type] || 0) + 0.18;
    });
    return boosts;
  }

  function recencyBoost(dateStr) {
    if (!dateStr) return 0;
    var t = Date.parse(dateStr);
    if (isNaN(t)) return 0;
    var days = (Date.now() - t) / 86400000;
    if (days < 0) return 0.08;              // dated in the future (upcoming) — slight bump
    return Math.max(0, 0.06 - days / 20000);
  }

  /**
   * @param {string} query
   * @param {{k?:number, perDoc?:number, diversify?:boolean, minScore?:number, includeText?:boolean}} opts
   */
  function retrieve(query, opts) {
    opts = opts || {};
    var k = opts.k || 6;
    var perDoc = opts.perDoc || 3;
    var D = data();
    var index = D.index, clen = D.clen, N = D.chunks.length;
    var avgdl = D.avgdl || 1;
    var toks = tokenize(query);
    if (!toks.length) return [];

    var k1 = 1.5, b = 0.75;
    var scores = new Float64Array(N);
    var hitTerms = {};

    for (var t = 0; t < toks.length; t++) {
      var term = toks[t];
      var post = index[term];
      if (!post) continue;
      hitTerms[term] = (hitTerms[term] || 0) + 1;
      var df = post.length;
      var idf = Math.log(1 + (N - df + 0.5) / (df + 0.5));
      for (var p = 0; p < post.length; p++) {
        var ci = post[p][0], tf = post[p][1];
        var dl = clen[ci] || 1;
        var norm = tf * (k1 + 1) / (tf + k1 * (1 - b + b * (dl / avgdl)));
        scores[ci] += idf * norm * (1 + 0.35 * (toks.length > 1 ? 1 : 0));
      }
    }

    // phrase bonus: contiguous 3-grams from the query
    var qLower = ' ' + String(query).toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim() + ' ';
    var qWords = qLower.trim().split(' ');
    var ngrams = [];
    for (var i = 0; i + 3 <= qWords.length; i++) ngrams.push(qWords.slice(i, i + 3).join(' '));
    var typeBoosts = typeBoostFor(query);
    var docMeta = {};
    D.docs.forEach(function (d) { docMeta[d.id] = d; });

    var scored = [];
    for (var i2 = 0; i2 < N; i2++) {
      if (scores[i2] <= 0) continue;
      var c = D.chunks[i2];
      var s = scores[i2];
      if (ngrams.length) {
        var low = c.text.toLowerCase();
        for (var g = 0; g < ngrams.length; g++) if (low.indexOf(ngrams[g]) !== -1) { s += 2.2; break; }
      }
      var dmeta = docMeta[c.doc] || {};
      s *= (TYPE_BOOST[dmeta.type] || 1) * (1 + (typeBoosts[dmeta.type] || 0));
      s += recencyBoost(c.date);
      scored.push({ chunk: c, score: s });
    }

    scored.sort(function (a, b) { return b.score - a.score; });

    if (opts.diversify !== false) {
      var perDocCount = {};
      var picked = [];
      for (var q2 = 0; q2 < scored.length && picked.length < k * 3; q2++) {
        var did = scored[q2].chunk.doc;
        perDocCount[did] = perDocCount[did] || 0;
        if (perDocCount[did] >= perDoc) continue;
        perDocCount[did]++;
        picked.push(scored[q2]);
      }
      scored = picked;
    }

    var out = [];
    for (var j = 0; j < scored.length && out.length < k; j++) {
      var ch = scored[j].chunk;
      if (opts.minScore && scored[j].score < opts.minScore) break;
      out.push({
        chunkId: ch.id,
        docId: ch.doc,
        score: Math.round(scored[j].score * 1000) / 1000,
        title: ch.title,
        heading: ch.heading,
        url: ch.url,
        date: ch.date,
        category: ch.category,
        path: (docMeta[ch.doc] || {}).path || '',
        preview: ch.text.slice(0, 260).replace(/\s+/g, ' '),
        text: opts.includeText === false ? '' : ch.text
      });
    }
    return out;
  }

  /** Build a query from the tail of a conversation (last user turn weighted heaviest). */
  function retrieveForMessages(messages, opts) {
    opts = opts || {};
    var msgs = messages || [];
    var userTurns = msgs.filter(function (m) { return m.role === 'user'; });
    if (!userTurns.length) return retrieve(msgs[msgs.length - 1] ? msgs[msgs.length - 1].content : '', opts);
    var last = userTurns[userTurns.length - 1].content || '';
    var context = userTurns.slice(-3, -1).map(function (m) { return m.content; }).join(' ');
    var q = context ? (context.slice(0, 400) + ' \n ' + last) : last;
    return retrieve(q, opts);
  }

  /** Format retrieved chunks as a REFERENCE MATERIAL block for the system prompt. */
  function formatContext(chunks, opts) {
    opts = opts || {};
    if (!chunks || !chunks.length) return '';
    var maxChars = opts.maxChars || 12000;
    var lines = [];
    var used = 0;
    lines.push('=== REFERENCE MATERIAL (ENI Tutor KB — retrieved for this turn) ===');
    lines.push('Cite chunk ids in square brackets right after the claim they support, e.g. [KB-0042].');
    lines.push('If the answer is not here, say so and answer from your own knowledge. Never invent a chunk id.');
    for (var i = 0; i < chunks.length; i++) {
      var c = chunks[i];
      var body = c.text || c.preview || '';
      var block = '[' + c.chunkId + '] SOURCE: "' + c.title + '"' +
        (c.heading && c.heading !== c.title ? ' — SECTION: ' + c.heading : '') +
        '\n' + (c.url ? 'URL: ' + c.url : 'KB FILE: ' + c.path) +
        (c.date ? ' — ' + c.date : '') +
        '\n' + body + '\n';
      if (used + block.length > maxChars) {
        var room = maxChars - used;
        if (room > 400) lines.push(block.slice(0, room) + '\n[...chunk truncated for length...]');
        break;
      }
      used += block.length;
      lines.push(block);
    }
    lines.push('=== END REFERENCE MATERIAL ===');
    return lines.join('\n');
  }

  function listDocs() { return data().docs; }

  function getDoc(docId) {
    var D = data();
    for (var i = 0; i < D.docs.length; i++) if (D.docs[i].id === docId) return D.docs[i];
    return null;
  }

  function getChunk(chunkId) {
    var D = data();
    for (var i = 0; i < D.chunks.length; i++) if (D.chunks[i].id === chunkId) return D.chunks[i];
    return null;
  }

  function stats() {
    var D = data();
    return { docs: D.docs.length, chunks: D.chunks.length, terms: Object.keys(D.index).length, generated: D.generated };
  }

  global.ENI = global.ENI || {};
  global.ENI.retrieve = retrieve;
  global.ENI.retrieveForMessages = retrieveForMessages;
  global.ENI.formatContext = formatContext;
  global.ENI.listDocs = listDocs;
  global.ENI.getDoc = getDoc;
  global.ENI.getChunk = getChunk;
  global.ENI.stats = stats;
  global.ENI.tokenize = tokenize;
})(typeof self !== 'undefined' ? self : this);
