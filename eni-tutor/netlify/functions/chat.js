// Netlify Function: the OpenRouter relay for the locked ENI build.
//
// The page posts an OpenAI-style chat body to /api/v1/chat/completions, which
// netlify.toml rewrites to this function. The key is read from the site's
// OPENROUTER_API_KEY environment variable and is never sent to the browser.
// The model and the reply shape are fixed here, not by the caller.

const MODEL = 'nvidia/nemotron-3.5-super-vl:free';
const UPSTREAM = 'https://openrouter.ai/api/v1/chat/completions';
const MAX_BODY_BYTES = 64 * 1024;
const MAX_MESSAGES = 40;
const MAX_CHARS_PER_MESSAGE = 24000;
// Keeps replies short enough to finish inside a synchronous function's time limit.
const MAX_TOKENS_CAP = 1536;
const ROLES = ['system', 'user', 'assistant'];

const reply = (statusCode, body, extra) => ({
  statusCode,
  headers: Object.assign({ 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }, extra || {}),
  body: typeof body === 'string' ? body : JSON.stringify(body),
});

function clamp(value, lo, hi, fallback) {
  const n = Number(value);
  return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : fallback;
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return reply(405, { error: 'POST only' });

  // Browsers may call the relay only from this site's own pages.
  const site = process.env.URL;
  const headers = event.headers || {};
  const origin = headers.origin || headers.Origin || '';
  if (site && origin && origin !== site) return reply(403, { error: 'origin not allowed' });

  const key = process.env.OPENROUTER_API_KEY;
  if (!key) return reply(503, { error: 'OPENROUTER_API_KEY is not set for this site' });

  const raw = event.isBase64Encoded
    ? Buffer.from(event.body || '', 'base64').toString('utf8')
    : event.body || '';
  if (Buffer.byteLength(raw, 'utf8') > MAX_BODY_BYTES) return reply(413, { error: 'request too large' });

  let body;
  try {
    body = JSON.parse(raw);
  } catch (e) {
    return reply(400, { error: 'body must be JSON' });
  }

  const messages = Array.isArray(body.messages) ? body.messages : [];
  if (messages.length === 0 || messages.length > MAX_MESSAGES) {
    return reply(400, { error: 'messages must hold 1 to ' + MAX_MESSAGES + ' items' });
  }
  const clean = [];
  for (const m of messages) {
    const role = m && ROLES.includes(m.role) ? m.role : null;
    const content = m && typeof m.content === 'string' ? m.content : null;
    if (!role || content === null || content.length > MAX_CHARS_PER_MESSAGE) {
      return reply(400, { error: 'each message needs a role and text under the size limit' });
    }
    clean.push({ role, content });
  }

  const payload = {
    model: MODEL,
    messages: clean,
    stream: false,
    temperature: clamp(body.temperature, 0, 1.5, 0.7),
    top_p: clamp(body.top_p, 0, 1, 0.95),
    max_tokens: Math.round(clamp(body.max_tokens, 64, MAX_TOKENS_CAP, 1024)),
  };

  let upstream;
  try {
    upstream = await fetch(UPSTREAM, {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + key,
        'Content-Type': 'application/json',
        'HTTP-Referer': site || 'https://eni-tutor.netlify.app',
        'X-Title': 'ENI Tutor',
      },
      body: JSON.stringify(payload),
    });
  } catch (e) {
    return reply(502, { error: 'could not reach OpenRouter: ' + e.message });
  }

  return reply(upstream.status, await upstream.text());
};
