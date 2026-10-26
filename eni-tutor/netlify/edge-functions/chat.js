// Netlify Edge Function: the ENI relay, with tools.
//
// The page sends the conversation. The relay adds the persona and the library
// index, then lets the model call two tools: open_document (the full text of a
// library document) and web_search (for gaps the library cannot fill). Tool
// rounds run here. The final answer streams to the page as it arrives. The page
// also receives a small event for each read and each search.
//
// The key is read from OPENROUTER_API_KEY and, for search, TAVILY_API_KEY.
// Neither reaches the browser. The model, the persona and the limits are fixed
// here, not by the caller.

import { PERSONA, INDEX, DOCS } from './knowledge.js';

const MODEL = 'nvidia/nemotron-3.5-super-vl:free';
const UPSTREAM = 'https://openrouter.ai/api/v1/chat/completions';
const SEARCH_URL = 'https://api.tavily.com/search';
const MAX_BODY_BYTES = 64 * 1024;
const MAX_MESSAGES = 40;
const MAX_CHARS_PER_MESSAGE = 24000;
const MAX_TOKENS_CAP = 2048;
const HEARTBEAT_MS = 4000;
const MAX_ROUNDS = 8;      // model calls per reply, the last one without tools
const MAX_READS = 8;       // documents opened per reply
const MAX_READ_CHARS = 240000;
const MAX_SEARCHES = 3;    // web searches per reply
const ROLES = ['user', 'assistant'];
const encoder = new TextEncoder();

const TOOLS = [
  {
    type: 'function',
    function: {
      name: 'open_document',
      description: 'Load the full text of one library document, by its id from the LIBRARY INDEX. Open the documents a lesson, lab or section depends on before you teach from them.',
      parameters: {
        type: 'object',
        properties: { id: { type: 'string', description: 'The document id in brackets in the index, e.g. D07.' } },
        required: ['id'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'web_search',
      description: 'Search the web. Only for an extreme knowledge gap, or when the student names a research document that is not in the library.',
      parameters: {
        type: 'object',
        properties: { query: { type: 'string', description: 'A short search query.' } },
        required: ['query'],
      },
    },
  },
];

const json = (status, body) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });

function clamp(value, lo, hi, fallback) {
  const n = Number(value);
  return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : fallback;
}

const plain = (s) => String(s || '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();

function indexText() {
  return '# LIBRARY INDEX\n\nEvery document in the library is listed here with its id in brackets. ' +
    'Open a document with open_document(id) to read it in full before you teach from it.\n\n' +
    INDEX.map((i) => '- [' + i.id + '] ' + i.title + ' (' + i.type + '): ' + i.summary).join('\n');
}

// A web search through Tavily's API, the same call the harness makes. Results are
// data for the model, not instructions.
async function webSearch(query) {
  const key = Deno.env.get('TAVILY_API_KEY');
  if (!key) return 'Web search is not configured for this site.';
  try {
    const res = await fetch(SEARCH_URL, {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + key, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query,
        search_depth: 'basic',
        max_results: 5,
        topic: 'general',
        include_answer: false,
        include_raw_content: false,
      }),
    });
    if (!res.ok) return 'Web search failed: HTTP ' + res.status + '.';
    const data = await res.json();
    const results = (Array.isArray(data.results) ? data.results : [])
      .filter((r) => r && /^https?:\/\//i.test(String(r.url || '')));
    if (!results.length) return 'No results.';
    return results.slice(0, 5)
      .map((r, i) => (i + 1) + '. ' + plain(r.title || r.url) + ' (' + r.url + ')\n' + plain(r.content).slice(0, 700))
      .join('\n\n');
  } catch (e) {
    return 'Web search failed: ' + e.message;
  }
}

// One tool call. The result goes back to the model as the tool message.
async function runTool(ctx, call) {
  let args = null;
  try { args = JSON.parse(call.arguments || '{}'); } catch (e) { args = null; }

  if (call.name === 'open_document') {
    const id = args && typeof args.id === 'string' ? args.id.trim() : '';
    const entry = INDEX.find((i) => i.id === id);
    if (!entry) return 'No document has the id "' + id + '". Use an id from the LIBRARY INDEX.';
    if (ctx.reads.has(entry.id)) return entry.title + ' is already open in this reply.';
    const text = DOCS[entry.path] || '';
    if (ctx.reads.size >= MAX_READS || ctx.readChars + text.length > MAX_READ_CHARS) {
      return 'The reading budget for this reply is used. Teach from the documents already open.';
    }
    ctx.reads.add(entry.id);
    ctx.readChars += text.length;
    ctx.emit({ eni: { tool: 'read', id: entry.id, title: entry.title } });
    return '## ' + entry.title + '\n\n' + text;
  }

  if (call.name === 'web_search') {
    const query = args && typeof args.query === 'string' ? args.query.trim().slice(0, 200) : '';
    if (!query) return 'web_search needs a query.';
    if (ctx.searches >= MAX_SEARCHES) return 'The search limit for this reply is used. Answer from what you have.';
    ctx.searches += 1;
    ctx.emit({ eni: { tool: 'search', query } });
    return await webSearch(query);
  }

  return 'Unknown tool: ' + call.name + '.';
}

// One model call, streamed. Content and reasoning go to the page as they arrive.
// Tool calls are collected and returned to the caller, not shown.
async function streamRound(ctx, messages, tools) {
  const payload = {
    model: MODEL,
    messages,
    stream: true,
    max_tokens: ctx.maxTokens,
    temperature: ctx.temperature,
    top_p: ctx.topP,
    // Route only to providers that accept every parameter sent. Without this,
    // OpenRouter can drop `tools` without an error and the model answers as if
    // it had no tools.
    provider: { require_parameters: true },
  };
  if (tools) { payload.tools = tools; payload.tool_choice = 'auto'; }

  let upstream;
  try {
    upstream = await fetch(UPSTREAM, {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + ctx.key,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://eni-tutor.netlify.app',
        'X-Title': 'ENI Tutor',
      },
      body: JSON.stringify(payload),
      signal: ctx.signal,
    });
  } catch (e) {
    ctx.fail('could not reach OpenRouter: ' + e.message);
    return null;
  }
  if (!upstream.ok) {
    const text = await upstream.text();
    ctx.fail('HTTP ' + upstream.status + ' from OpenRouter: ' + text.slice(0, 300));
    return null;
  }

  const turn = { content: '', toolCalls: [], reasoningDetails: [], finish: null, provider: null };
  const calls = new Map();
  const reader = upstream.body.getReader();
  const decoder = new TextDecoder();
  let buf = '';
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    let sep;
    while ((sep = buf.match(/\r?\n\r?\n/))) {
      const frame = buf.slice(0, sep.index);
      buf = buf.slice(sep.index + sep[0].length);
      for (const line of frame.split('\n')) {
        if (!line.startsWith('data:')) continue;
        const data = line.slice(5).trim();
        if (!data || data === '[DONE]') continue;
        let obj;
        try { obj = JSON.parse(data); } catch (e) { continue; }
        if (obj.error) {
          ctx.fail(typeof obj.error === 'string' ? obj.error : JSON.stringify(obj.error));
          return null;
        }
        const choice = obj.choices && obj.choices[0];
        if (obj.provider) turn.provider = obj.provider;
        if (choice && choice.finish_reason) turn.finish = choice.finish_reason;
        const delta = choice && choice.delta;
        if (!delta) continue;
        if (typeof delta.content === 'string' && delta.content) {
          turn.content += delta.content;
          ctx.emit({ choices: [{ delta: { content: delta.content } }] });
        }
        const r = typeof delta.reasoning === 'string' ? delta.reasoning
          : (typeof delta.reasoning_content === 'string' ? delta.reasoning_content : '');
        if (r) ctx.emit({ choices: [{ delta: { reasoning: r } }] });
        if (Array.isArray(delta.reasoning_details)) turn.reasoningDetails.push(...delta.reasoning_details);
        for (const tc of delta.tool_calls || []) {
          const i = tc.index == null ? 0 : tc.index;
          const call = calls.get(i) || { id: '', name: '', arguments: '' };
          if (tc.id) call.id = tc.id;
          if (tc.function && tc.function.name) call.name = tc.function.name;
          if (tc.function && typeof tc.function.arguments === 'string') call.arguments += tc.function.arguments;
          calls.set(i, call);
        }
      }
    }
  }
  turn.toolCalls = [...calls.values()]
    .filter((c) => c.name)
    .map((c, i) => ({ ...c, id: c.id || 'call_' + i }));
  return turn;
}

// The loop: ask, run the tools the model asks for, ask again, until it answers.
async function run(ctx) {
  const messages = [{ role: 'system', content: PERSONA + '\n\n' + indexText() }].concat(ctx.conversation);
  for (let round = 0; round < MAX_ROUNDS; round++) {
    const last = round === MAX_ROUNDS - 1;
    const turn = await streamRound(ctx, messages, last ? null : TOOLS);
    // Metadata only, for the function log: which tools were offered, what the model
    // asked for, why it stopped, and which provider served the round.
    if (turn) {
      console.log('eni round ' + JSON.stringify({
        round,
        toolsOffered: !last,
        toolCalls: turn.toolCalls.map((c) => c.name),
        finish: turn.finish,
        provider: turn.provider,
      }));
    }
    if (!turn || !turn.toolCalls.length) return;
    messages.push({
      role: 'assistant',
      content: turn.content || null,
      tool_calls: turn.toolCalls.map((c) => ({
        id: c.id, type: 'function', function: { name: c.name, arguments: c.arguments || '{}' },
      })),
      ...(turn.reasoningDetails.length ? { reasoning_details: turn.reasoningDetails } : {}),
    });
    for (const call of turn.toolCalls) {
      const result = await runTool(ctx, call);
      messages.push({ role: 'tool', tool_call_id: call.id, content: result });
    }
  }
}

export default async (request) => {
  if (request.method !== 'POST') return json(405, { error: 'POST only' });

  // Browsers may call the relay only from this site's own pages.
  const origin = request.headers.get('origin');
  const site = new URL(request.url).origin;
  if (origin && origin !== site) return json(403, { error: 'origin not allowed' });

  const key = Deno.env.get('OPENROUTER_API_KEY');
  if (!key) return json(503, { error: 'OPENROUTER_API_KEY is not set for this site' });

  const raw = await request.text();
  if (encoder.encode(raw).length > MAX_BODY_BYTES) return json(413, { error: 'request too large' });

  let body;
  try {
    body = JSON.parse(raw);
  } catch (e) {
    return json(400, { error: 'body must be JSON' });
  }

  const messages = Array.isArray(body.messages) ? body.messages : [];
  if (messages.length === 0 || messages.length > MAX_MESSAGES) {
    return json(400, { error: 'messages must hold 1 to ' + MAX_MESSAGES + ' items' });
  }
  const conversation = [];
  for (const m of messages) {
    const role = m && ROLES.includes(m.role) ? m.role : null;
    const content = m && typeof m.content === 'string' ? m.content : null;
    if (!role || content === null || content.length > MAX_CHARS_PER_MESSAGE) {
      return json(400, { error: 'each message needs a user or assistant role and text under the size limit' });
    }
    conversation.push({ role, content });
  }

  const params = {
    maxTokens: Math.round(clamp(body.max_tokens, 64, MAX_TOKENS_CAP, 1024)),
    temperature: clamp(body.temperature, 0, 1.5, 0.7),
    topP: clamp(body.top_p, 0, 1, 0.95),
  };

  let timer = null;
  let closed = false;
  const stream = new ReadableStream({
    start(controller) {
      const emit = (obj) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode('data: ' + JSON.stringify(obj) + '\n\n'));
        } catch (e) {
          closed = true;
        }
      };
      const beat = () => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(': waiting\n\n'));
        } catch (e) {
          closed = true;
        }
      };
      const ctx = Object.assign({
        key,
        conversation,
        signal: request.signal,
        emit,
        fail: (message) => emit({ error: message }),
        reads: new Set(),
        readChars: 0,
        searches: 0,
      }, params);
      beat();
      timer = setInterval(beat, HEARTBEAT_MS);
      run(ctx)
        .catch((e) => emit({ error: String(e && e.message) }))
        .finally(() => {
          clearInterval(timer);
          closed = true;
          try { controller.close(); } catch (e) { /* already closed */ }
        });
    },
    cancel() {
      closed = true;
      clearInterval(timer);
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-store',
      'X-Accel-Buffering': 'no',
    },
  });
};
