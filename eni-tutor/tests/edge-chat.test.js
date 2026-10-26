// Tests for netlify/edge-functions/chat.js with a stubbed upstream: no network.
// Run with:  node --test tests/edge-chat.test.js
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { pathToFileURL } = require('url');

// The edge runtime is Deno. Provide the one global it needs, read from `env`.
const env = {};
globalThis.Deno = { env: { get: (k) => env[k] } };

// Load the module by copying it to a .mjs file, since this package is CommonJS.
const src = fs.readFileSync(path.join(__dirname, '..', 'netlify', 'edge-functions', 'chat.js'), 'utf8');
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'edge-chat-'));
const file = path.join(dir, 'chat.mjs');
fs.writeFileSync(file, src);
const loaded = import(pathToFileURL(file).href).then((m) => m.default);

const SITE = 'https://eni.example.netlify.app';
const goodBody = (extra) => JSON.stringify(Object.assign({
  messages: [{ role: 'system', content: 'persona' }, { role: 'user', content: 'hello' }],
  stream: false, temperature: 0.7, top_p: 0.95, max_tokens: 2048,
}, extra || {}));
const post = (body, headers) => new Request(SITE + '/api/v1/chat/completions', {
  method: 'POST',
  headers: Object.assign({ origin: SITE, 'content-type': 'application/json' }, headers || {}),
  body,
});

// Replace fetch with a stub that returns the given status and body chunks.
function stubFetch(status, chunks, { reject } = {}) {
  const calls = [];
  const real = globalThis.fetch;
  globalThis.fetch = async (url, init) => {
    calls.push({ url, init });
    if (reject) throw new Error(reject);
    const enc = new TextEncoder();
    const body = new ReadableStream({
      start(c) {
        for (const chunk of chunks) c.enqueue(enc.encode(chunk));
        c.close();
      },
    });
    return new Response(body, { status });
  };
  return { calls, restore: () => { globalThis.fetch = real; } };
}

function withKey(key) {
  env.OPENROUTER_API_KEY = key;
}

test('rejects non-POST requests', async () => {
  withKey('k');
  const handler = await loaded;
  const res = await handler(new Request(SITE + '/api/v1/chat/completions', { method: 'GET' }));
  assert.equal(res.status, 405);
});

test('rejects an origin that is not this site', async () => {
  withKey('k');
  const handler = await loaded;
  const res = await handler(post(goodBody(), { origin: 'https://evil.example' }));
  assert.equal(res.status, 403);
});

test('fails closed when the key is not configured', async () => {
  withKey(undefined);
  const handler = await loaded;
  const res = await handler(post(goodBody()));
  assert.equal(res.status, 503);
  assert.match(await res.text(), /OPENROUTER_API_KEY/);
});

test('rejects bodies that are not JSON or break the message rules', async () => {
  withKey('k');
  const handler = await loaded;
  const cases = [
    'not json',
    JSON.stringify({ messages: [] }),
    JSON.stringify({ messages: new Array(41).fill({ role: 'user', content: 'x' }) }),
    JSON.stringify({ messages: [{ role: 'tool', content: 'x' }] }),
    JSON.stringify({ messages: [{ role: 'user', content: 42 }] }),
    JSON.stringify({ messages: [{ role: 'user', content: 'x'.repeat(24001) }] }),
  ];
  for (const body of cases) {
    const res = await handler(post(body));
    assert.equal(res.status, 400, 'expected 400 for ' + body.slice(0, 40));
  }
});

test('rejects oversized bodies before parsing', async () => {
  withKey('k');
  const handler = await loaded;
  const res = await handler(post('x'.repeat(65 * 1024)));
  assert.equal(res.status, 413);
});

test('streams the reply, forces the model and stream flag, caps tokens, sends the key', async () => {
  withKey('test-key-123');
  const handler = await loaded;
  const up = stubFetch(200, [
    'data: {"choices":[{"delta":{"content":"Hel"}}]}\n\n',
    'data: {"choices":[{"delta":{"content":"lo"}}]}\n\n',
    'data: [DONE]\n\n',
  ]);
  try {
    const res = await handler(post(goodBody({ model: 'other/model', max_tokens: 99999, temperature: 9 })));
    assert.equal(res.status, 200);
    assert.match(res.headers.get('content-type'), /text\/event-stream/);
    const text = await res.text();
    assert.match(text, /: waiting/, 'heartbeat is sent first');
    assert.match(text, /"content":"Hel"/);
    assert.match(text, /"content":"lo"/);
    assert.match(text, /\[DONE\]/);
    assert.equal(up.calls.length, 1);
    const sent = JSON.parse(up.calls[0].init.body);
    assert.equal(sent.model, 'nvidia/nemotron-3.5-super-vl:free');
    assert.equal(sent.stream, true);
    assert.equal(sent.max_tokens, 2048);
    assert.equal(sent.temperature, 1.5);
    assert.equal(up.calls[0].init.headers.Authorization, 'Bearer test-key-123');
    assert.equal(up.calls[0].url, 'https://openrouter.ai/api/v1/chat/completions');
  } finally {
    up.restore();
  }
});

test('reports an upstream error as a stream error event with its status', async () => {
  withKey('k');
  const handler = await loaded;
  const up = stubFetch(429, ['{"error":"rate limited"}']);
  try {
    const res = await handler(post(goodBody()));
    assert.equal(res.status, 200);
    const text = await res.text();
    assert.match(text, /HTTP 429/);
    assert.match(text, /rate limited/);
  } finally {
    up.restore();
  }
});

test('reports an unreachable upstream as a stream error event', async () => {
  withKey('k');
  const handler = await loaded;
  const up = stubFetch(200, [], { reject: 'ENOTFOUND' });
  try {
    const res = await handler(post(goodBody()));
    const text = await res.text();
    assert.match(text, /could not reach OpenRouter/);
  } finally {
    up.restore();
  }
});
