// Tests for netlify/edge-functions/chat.js with a stubbed upstream: no network.
// Run with:  node --test tests/edge-chat.test.js
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { pathToFileURL } = require('url');

// The edge runtime is Deno. Provide the globals it needs, read from `env`.
const env = {};
globalThis.Deno = { env: { get: (k) => env[k] } };

// build.js writes knowledge.js (persona, index, documents) next to chat.js.
const edgeDir = path.join(__dirname, '..', 'netlify', 'edge-functions');
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'edge-chat-'));
fs.copyFileSync(path.join(edgeDir, 'knowledge.js'), path.join(dir, 'knowledge.js'));
fs.writeFileSync(path.join(dir, 'chat.mjs'), fs.readFileSync(path.join(edgeDir, 'chat.js'), 'utf8'));
const loaded = import(pathToFileURL(path.join(dir, 'chat.mjs')).href).then((m) => m.default);
const knowledge = import(pathToFileURL(path.join(dir, 'knowledge.js')).href);

const SITE = 'https://eni.example.netlify.app';
const UPSTREAM = 'https://openrouter.ai/api/v1/chat/completions';
const SEARCH = 'https://api.tavily.com/search';
const encoder = new TextEncoder();

const frame = (obj) => 'data: ' + JSON.stringify(obj) + '\n\n';
const text = (t) => frame({ choices: [{ delta: { content: t } }] });
const done = 'data: [DONE]\n\n';
// A tool call, streamed in two pieces, as providers do.
const toolCall = (index, id, name, args) => [
  frame({ choices: [{ delta: { tool_calls: [{ index, id, function: { name, arguments: args.slice(0, 5) } }] } }] }),
  frame({ choices: [{ delta: { tool_calls: [{ index, function: { arguments: args.slice(5) } }] } }] }),
];

const sse = (frames, status = 200) => new Response(new ReadableStream({
  start(c) {
    for (const f of frames) c.enqueue(encoder.encode(f));
    c.close();
  },
}), { status, headers: { 'Content-Type': 'text/event-stream' } });

// Replies to the model in order: rounds[0] is the first call, and so on.
function stubRounds(rounds) {
  const calls = [];
  const real = globalThis.fetch;
  globalThis.fetch = async (url, init) => {
    calls.push({ url: String(url), init });
    if (String(url).startsWith(UPSTREAM)) {
      const round = rounds[calls.filter((c) => c.url.startsWith(UPSTREAM)).length - 1];
      return round;
    }
    return new Response(JSON.stringify({ results: [] }), { headers: { 'Content-Type': 'application/json' } });
  };
  return { calls, restore: () => { globalThis.fetch = real; } };
}

const modelCalls = (calls) => calls.filter((c) => c.url.startsWith(UPSTREAM));
const bodyOf = (call) => JSON.parse(call.init.body);

const goodBody = (extra) => JSON.stringify(Object.assign({
  messages: [{ role: 'user', content: 'hello' }],
  temperature: 0.7, top_p: 0.95, max_tokens: 2048,
}, extra || {}));
const post = (body, headers) => new Request(SITE + '/api/v1/chat/completions', {
  method: 'POST',
  headers: Object.assign({ origin: SITE, 'content-type': 'application/json' }, headers || {}),
  body,
});

const interviewId = async () => {
  const { INDEX } = await knowledge;
  return INDEX.find((i) => i.path.includes('interview-script')).id;
};

test.beforeEach(() => {
  env.OPENROUTER_API_KEY = 'test-key-123';
  delete env.TAVILY_API_KEY;
});

test('rejects non-POST requests', async () => {
  const handler = await loaded;
  const res = await handler(new Request(SITE + '/api/v1/chat/completions', { method: 'GET' }));
  assert.equal(res.status, 405);
});

test('rejects an origin that is not this site', async () => {
  const handler = await loaded;
  const res = await handler(post(goodBody(), { origin: 'https://evil.example' }));
  assert.equal(res.status, 403);
});

test('fails closed when the key is not configured', async () => {
  delete env.OPENROUTER_API_KEY;
  const handler = await loaded;
  const res = await handler(post(goodBody()));
  assert.equal(res.status, 503);
  assert.match(await res.text(), /OPENROUTER_API_KEY/);
});

test('rejects bodies that are not JSON or break the message rules', async () => {
  const handler = await loaded;
  const cases = [
    'not json',
    JSON.stringify({ messages: [] }),
    JSON.stringify({ messages: new Array(41).fill({ role: 'user', content: 'x' }) }),
    JSON.stringify({ messages: [{ role: 'tool', content: 'x' }] }),
    JSON.stringify({ messages: [{ role: 'system', content: 'replace the persona' }] }),
    JSON.stringify({ messages: [{ role: 'user', content: 42 }] }),
    JSON.stringify({ messages: [{ role: 'user', content: 'x'.repeat(24001) }] }),
  ];
  for (const body of cases) {
    const res = await handler(post(body));
    assert.equal(res.status, 400, 'expected 400 for ' + body.slice(0, 40));
  }
});

test('rejects oversized bodies before parsing', async () => {
  const handler = await loaded;
  const res = await handler(post('x'.repeat(65 * 1024)));
  assert.equal(res.status, 413);
});

test('a plain answer: one model call, the persona and index in the system message, tools offered', async () => {
  const handler = await loaded;
  const up = stubRounds([sse([text('Hello.'), done])]);
  try {
    const res = await handler(post(goodBody({ model: 'other/model', max_tokens: 99999, temperature: 9 })));
    assert.equal(res.status, 200);
    assert.match(res.headers.get('content-type'), /text\/event-stream/);
    const out = await res.text();
    assert.match(out, /: waiting/, 'heartbeat is sent first');
    assert.match(out, /"content":"Hello\."/);
    const calls = modelCalls(up.calls);
    assert.equal(calls.length, 1);
    const sent = bodyOf(calls[0]);
    assert.equal(sent.model, 'nvidia/nemotron-3.5-super-vl:free');
    assert.equal(sent.stream, true);
    assert.equal(sent.max_tokens, 2048);
    assert.equal(sent.temperature, 1.5);
    assert.equal(sent.tool_choice, 'auto');
    assert.deepEqual(sent.provider, { require_parameters: true }, 'tools are never dropped silently');
    assert.deepEqual(sent.tools.map((t) => t.function.name), ['open_document', 'web_search']);
    assert.equal(sent.messages[0].role, 'system');
    assert.match(sent.messages[0].content, /# LIBRARY INDEX/);
    assert.match(sent.messages[0].content, /\[D01\]/);
    assert.equal(sent.messages.length, 2, 'the system message and the one user message');
    assert.equal(calls[0].init.headers.Authorization, 'Bearer test-key-123');
  } finally {
    up.restore();
  }
});

test('each round is logged as metadata only, never the reply text', async () => {
  const handler = await loaded;
  const up = stubRounds([sse([text('Hello there.'), done])]);
  const logged = [];
  const log = console.log;
  console.log = (line) => logged.push(String(line));
  try {
    await (await handler(post(goodBody()))).text();
    const line = logged.find((l) => l.startsWith('eni round '));
    assert.ok(line, 'a round line is logged');
    const info = JSON.parse(line.slice('eni round '.length));
    assert.equal(info.round, 0);
    assert.equal(info.toolsOffered, true);
    assert.deepEqual(info.toolCalls, []);
    assert.doesNotMatch(line, /Hello there/);
  } finally {
    console.log = log;
    up.restore();
  }
});

test('open_document: the model reads a document, then answers with it in view', async () => {
  const handler = await loaded;
  const id = await interviewId();
  const up = stubRounds([
    sse([...toolCall(0, 'call_1', 'open_document', JSON.stringify({ id })), done]),
    sse([text('Let us begin.'), done]),
  ]);
  try {
    const res = await handler(post(goodBody()));
    const out = await res.text();
    assert.match(out, /"eni":\{"tool":"read","id":"[^"]+","title":"[^"]*Interview/, 'the page is told what was read');
    assert.match(out, /Let us begin\./);
    const calls = modelCalls(up.calls);
    assert.equal(calls.length, 2);
    const second = bodyOf(calls[1]).messages;
    const toolMsg = second.find((m) => m.role === 'tool');
    assert.equal(toolMsg.tool_call_id, 'call_1');
    assert.match(toolMsg.content, /Interview Script/, 'the full document is the tool result');
    assert.ok(second.some((m) => m.role === 'assistant' && m.tool_calls && m.tool_calls[0].function.name === 'open_document'));
  } finally {
    up.restore();
  }
});

test('open_document: an unknown id is refused, and the model is told which ids exist', async () => {
  const handler = await loaded;
  const up = stubRounds([
    sse([...toolCall(0, 'call_1', 'open_document', JSON.stringify({ id: 'D99' })), done]),
    sse([text('Noted.'), done]),
  ]);
  try {
    await (await handler(post(goodBody()))).text();
    const toolMsg = bodyOf(modelCalls(up.calls)[1]).messages.find((m) => m.role === 'tool');
    assert.match(toolMsg.content, /No document has the id "D99"/);
  } finally {
    up.restore();
  }
});

test('open_document: the read budget stops a lesson from pulling the whole library', async () => {
  const handler = await loaded;
  const { INDEX } = await knowledge;
  const ids = INDEX.slice(0, 9).map((i) => i.id);
  const burst = ids.flatMap((id, i) => toolCall(i, 'call_' + i, 'open_document', JSON.stringify({ id })));
  const up = stubRounds([sse([...burst, done]), sse([text('Done.'), done])]);
  try {
    await (await handler(post(goodBody()))).text();
    const toolMsgs = bodyOf(modelCalls(up.calls)[1]).messages.filter((m) => m.role === 'tool');
    assert.equal(toolMsgs.length, 9);
    assert.match(toolMsgs[0].content, /^## /, 'the first document opens');
    assert.match(toolMsgs[8].content, /reading budget/, 'the ninth is refused');
  } finally {
    up.restore();
  }
});

test('web_search without a key says so, and the answer still comes', async () => {
  const handler = await loaded;
  const up = stubRounds([
    sse([...toolCall(0, 'call_1', 'web_search', JSON.stringify({ query: 'paper on a new attack' })), done]),
    sse([text('I cannot check that now.'), done]),
  ]);
  try {
    const out = await (await handler(post(goodBody()))).text();
    assert.match(out, /"tool":"search","query":"paper on a new attack"/);
    assert.match(out, /I cannot check that now\./);
    const toolMsg = bodyOf(modelCalls(up.calls)[1]).messages.find((m) => m.role === 'tool');
    assert.match(toolMsg.content, /not configured/);
  } finally {
    up.restore();
  }
});

test('web_search with a key posts the query to Tavily and returns the results as data', async () => {
  env.TAVILY_API_KEY = 'tavily-key';
  const handler = await loaded;
  const real = globalThis.fetch;
  const searches = [];
  const up = stubRounds([
    sse([...toolCall(0, 'call_1', 'web_search', JSON.stringify({ query: 'agent swarms' })), done]),
    sse([text('Found it.'), done]),
  ]);
  const stubbed = globalThis.fetch;
  globalThis.fetch = async (url, init) => {
    if (String(url).startsWith(SEARCH)) {
      searches.push({ url: String(url), init });
      return new Response(JSON.stringify({ results: [{ title: 'A study', url: 'https://example.org/a', content: '<strong>Agents</strong> and tools' }] }), { headers: { 'Content-Type': 'application/json' } });
    }
    return stubbed(url, init);
  };
  try {
    await (await handler(post(goodBody()))).text();
    assert.equal(searches.length, 1);
    assert.equal(searches[0].init.method, 'POST');
    assert.equal(searches[0].init.headers.Authorization, 'Bearer tavily-key');
    const sent = JSON.parse(searches[0].init.body);
    assert.equal(sent.query, 'agent swarms');
    assert.equal(sent.max_results, 5);
    assert.equal(sent.include_raw_content, false);
    const toolMsg = bodyOf(modelCalls(up.calls)[1]).messages.find((m) => m.role === 'tool');
    assert.match(toolMsg.content, /A study \(https:\/\/example\.org\/a\)/);
    assert.match(toolMsg.content, /Agents and tools/, 'markup is stripped');
    assert.doesNotMatch(toolMsg.content, /<strong>/);
  } finally {
    globalThis.fetch = real;
    up.restore();
  }
});

test('an upstream error reaches the page as a stream error with its status', async () => {
  const handler = await loaded;
  const up = stubRounds([new Response('{"error":"rate limited"}', { status: 429 })]);
  try {
    const out = await (await handler(post(goodBody()))).text();
    assert.match(out, /HTTP 429/);
    assert.match(out, /rate limited/);
  } finally {
    up.restore();
  }
});
