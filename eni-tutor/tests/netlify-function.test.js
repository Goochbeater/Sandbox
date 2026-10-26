// Tests for netlify/functions/chat.js with a stubbed upstream: no network needed.
// Run with:  node --test tests/
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');

const fnPath = path.join(__dirname, '..', 'netlify', 'functions', 'chat.js');

function loadHandler() {
  delete require.cache[require.resolve(fnPath)];
  return require(fnPath).handler;
}

function withEnv(vars, fn) {
  const saved = {};
  for (const k of Object.keys(vars)) { saved[k] = process.env[k]; if (vars[k] === undefined) delete process.env[k]; else process.env[k] = vars[k]; }
  return Promise.resolve().then(fn).finally(() => {
    for (const k of Object.keys(saved)) { if (saved[k] === undefined) delete process.env[k]; else process.env[k] = saved[k]; }
  });
}

function stubFetch(status, text) {
  const calls = [];
  const real = global.fetch;
  global.fetch = async (url, init) => {
    calls.push({ url, init });
    return { status, text: async () => text };
  };
  return { calls, restore: () => { global.fetch = real; } };
}

const goodBody = (extra) => JSON.stringify(Object.assign({
  messages: [{ role: 'system', content: 'persona' }, { role: 'user', content: 'hello' }],
  stream: true, temperature: 0.7, top_p: 0.95, max_tokens: 2048,
}, extra || {}));

const env = { URL: 'https://eni.example.netlify.app', OPENROUTER_API_KEY: 'test-key-123' };
const post = (body, headers) => ({ httpMethod: 'POST', headers: headers || { origin: env.URL }, body });

test('rejects non-POST requests', async () => {
  const handler = loadHandler();
  const res = await withEnv(env, () => handler({ httpMethod: 'GET', headers: {} }));
  assert.equal(res.statusCode, 405);
});

test('rejects a browser origin that is not this site', async () => {
  const handler = loadHandler();
  const res = await withEnv(env, () => handler(post(goodBody(), { origin: 'https://evil.example' })));
  assert.equal(res.statusCode, 403);
});

test('fails closed when the key is not configured', async () => {
  const handler = loadHandler();
  const res = await withEnv(Object.assign({}, env, { OPENROUTER_API_KEY: undefined }), () => handler(post(goodBody())));
  assert.equal(res.statusCode, 503);
  assert.match(res.body, /OPENROUTER_API_KEY/);
});

test('rejects bodies that are not JSON, or that break the message rules', async () => {
  const handler = loadHandler();
  const cases = [
    'not json',
    JSON.stringify({ messages: [] }),
    JSON.stringify({ messages: new Array(41).fill({ role: 'user', content: 'x' }) }),
    JSON.stringify({ messages: [{ role: 'tool', content: 'x' }] }),
    JSON.stringify({ messages: [{ role: 'user', content: 42 }] }),
    JSON.stringify({ messages: [{ role: 'user', content: 'x'.repeat(24001) }] }),
  ];
  for (const body of cases) {
    const res = await withEnv(env, () => handler(post(body)));
    assert.equal(res.statusCode, 400, 'expected 400 for ' + body.slice(0, 40));
  }
});

test('rejects oversized bodies before parsing', async () => {
  const handler = loadHandler();
  const res = await withEnv(env, () => handler(post('x'.repeat(65 * 1024))));
  assert.equal(res.statusCode, 413);
});

test('forces the model, disables streaming, caps tokens, and sends the key server-side', async () => {
  const handler = loadHandler();
  const up = stubFetch(200, '{"choices":[{"message":{"content":"ok"}}]}');
  try {
    const res = await withEnv(env, () => handler(post(goodBody({ model: 'some/other-model', max_tokens: 99999, temperature: 9, stream: true }))));
    assert.equal(res.statusCode, 200);
    assert.equal(res.body, '{"choices":[{"message":{"content":"ok"}}]}');
    assert.equal(up.calls.length, 1);
    const sent = JSON.parse(up.calls[0].init.body);
    assert.equal(sent.model, 'nvidia/nemotron-3.5-super-vl:free');
    assert.equal(sent.stream, false);
    assert.equal(sent.max_tokens, 1536);
    assert.equal(sent.temperature, 1.5);
    assert.equal(up.calls[0].init.headers.Authorization, 'Bearer test-key-123');
    assert.equal(up.calls[0].url, 'https://openrouter.ai/api/v1/chat/completions');
  } finally { up.restore(); }
});

test('passes upstream errors through with their status', async () => {
  const handler = loadHandler();
  const up = stubFetch(429, '{"error":"rate limited"}');
  try {
    const res = await withEnv(env, () => handler(post(goodBody())));
    assert.equal(res.statusCode, 429);
    assert.match(res.body, /rate limited/);
  } finally { up.restore(); }
});

test('reports an unreachable upstream as a 502', async () => {
  const handler = loadHandler();
  const real = global.fetch;
  global.fetch = async () => { throw new Error('ENOTFOUND'); };
  try {
    const res = await withEnv(env, () => handler(post(goodBody())));
    assert.equal(res.statusCode, 502);
  } finally { global.fetch = real; }
});
