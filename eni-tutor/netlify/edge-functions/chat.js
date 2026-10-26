// Netlify Edge Function: the OpenRouter relay for the locked ENI build.
//
// The page posts an OpenAI-style chat body to /api/v1/chat/completions, which
// netlify.toml routes here. The key is read from OPENROUTER_API_KEY and never
// reaches the browser. The model, the persona, the whole library and the limits
// are fixed here, not by the caller. The reply is streamed as server-sent events. Until the model's first
// token arrives, a heartbeat keeps the connection open.

import { PERSONA, INDEX, DOCS } from './knowledge.js';

const MODEL = 'nvidia/nemotron-3.5-super-vl:free';
const UPSTREAM = 'https://openrouter.ai/api/v1/chat/completions';
const MAX_BODY_BYTES = 64 * 1024;
const MAX_MESSAGES = 40;
const MAX_CHARS_PER_MESSAGE = 24000;
const MAX_TOKENS_CAP = 2048;
const MAX_DOCS = 3;
const MAX_DOC_CHARS = 90000;
const HEARTBEAT_MS = 4000;
// The page sends the conversation and the ids of the documents this reply
// needs. The persona and the index are always added here; only the named
// documents are added in full, so the page cannot change the persona.
const ROLES = ['user', 'assistant'];
const encoder = new TextEncoder();

const json = (status, body) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });

function indexText() {
  return '# LIBRARY INDEX\n\nThe documents below exist. Their full text is attached to a reply only when that reply needs it.\n\n' +
    INDEX.map((i) => '- ' + i.title + ' (' + i.type + '): ' + i.summary).join('\n');
}

// The full text of the documents the page named, validated against the index
// and capped in size.
function loadedText(ids) {
  const parts = [];
  let total = 0;
  const seen = new Set();
  for (const id of (Array.isArray(ids) ? ids : []).slice(0, MAX_DOCS)) {
    if (typeof id !== 'string' || seen.has(id) || !Object.prototype.hasOwnProperty.call(DOCS, id)) continue;
    seen.add(id);
    const text = DOCS[id];
    if (total + text.length > MAX_DOC_CHARS) break;
    total += text.length;
    const entry = INDEX.find((i) => i.path === id);
    parts.push('## ' + entry.title + '\n\n' + text);
  }
  return parts.length ? '# LOADED DOCUMENTS\n\nThe full text of the documents for this reply.\n\n' + parts.join('\n\n---\n\n') : '';
}

function clamp(value, lo, hi, fallback) {
  const n = Number(value);
  return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : fallback;
}

// Sends the model's stream into the response. Failures travel as a
// server-sent error event, which the page already shows to the reader.
async function relay(controller, key, payload, signal) {
  const fail = (message) => {
    controller.enqueue(encoder.encode('data: ' + JSON.stringify({ error: message }) + '\n\n'));
  };
  let upstream;
  try {
    upstream = await fetch(UPSTREAM, {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + key,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://eni-tutor.netlify.app',
        'X-Title': 'ENI Tutor',
      },
      body: JSON.stringify(payload),
      signal,
    });
  } catch (e) {
    fail('could not reach OpenRouter: ' + e.message);
    return;
  }
  if (!upstream.ok) {
    const text = await upstream.text();
    fail('HTTP ' + upstream.status + ' from OpenRouter: ' + text.slice(0, 300));
    return;
  }
  const reader = upstream.body.getReader();
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    controller.enqueue(value);
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
  const clean = [];
  for (const m of messages) {
    const role = m && ROLES.includes(m.role) ? m.role : null;
    const content = m && typeof m.content === 'string' ? m.content : null;
    if (!role || content === null || content.length > MAX_CHARS_PER_MESSAGE) {
      return json(400, { error: 'each message needs a role and text under the size limit' });
    }
    clean.push({ role, content });
  }

  const system = [PERSONA, indexText(), loadedText(body.docIds)].filter(Boolean).join('\n\n');
  const payload = {
    model: MODEL,
    messages: [{ role: 'system', content: system }].concat(clean),
    stream: true,
    temperature: clamp(body.temperature, 0, 1.5, 0.7),
    top_p: clamp(body.top_p, 0, 1, 0.95),
    max_tokens: Math.round(clamp(body.max_tokens, 64, MAX_TOKENS_CAP, 1024)),
  };

  let timer = null;
  const stream = new ReadableStream({
    start(controller) {
      const beat = () => {
        try {
          controller.enqueue(encoder.encode(': waiting\n\n'));
        } catch (e) {
          clearInterval(timer);
        }
      };
      beat();
      timer = setInterval(beat, HEARTBEAT_MS);
      relay(controller, key, payload, request.signal)
        .catch((e) => {
          try {
            controller.enqueue(encoder.encode('data: ' + JSON.stringify({ error: String(e && e.message) }) + '\n\n'));
          } catch (ignored) { /* the reader has gone */ }
        })
        .finally(() => {
          clearInterval(timer);
          try { controller.close(); } catch (ignored) { /* already closed */ }
        });
    },
    cancel() {
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
