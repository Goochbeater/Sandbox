# ENI: red-team tutor

A chat harness for ENI, a tutor for AI red teaming. The Netlify build is a single,
self-contained page: the knowledge base, styles, fonts and portrait are inlined, so it
works opened alone, from a preview, or from Netlify. The model call goes through a
server-side function that holds the API key.

```
eni-tutor/
├── index.html              dev page: full provider controls (open locally)
├── netlify-index.html      Netlify template: locked provider, no key field, no portrait upload
├── app.js                  all behaviour. window.ENI_CONFIG.locked switches the Netlify mode on
├── style.css, fonts/       dark theme, Bonsai display face, local @font-face
├── portrait/portrait.png   the ENI portrait, hard-locked (1122 x 1402)
├── data/kb.js              generated: the knowledge base (built from kb/)
├── data/system-prompt.js   the persona prompt (shipped; see "Open decisions")
├── lib/retrieval.js        BM25 retrieval over the KB
├── kb/                     knowledge base sources (markdown, front matter sets the doc type)
│   ├── v2/                 attack course: curriculum, labs, interview, quick reference
│   ├── research/           citation cards; full text via tools/fetch_arxiv.py
│   └── articles/           articles, including arXiv papers once ingested
├── tools/
│   ├── build_kb.py         kb/ -> data/kb.js
│   ├── fetch_arxiv.py      ingests arXiv papers listed in arxiv_manifest.json
│   └── arxiv_manifest.json candidate papers and how far each was verified
├── netlify/edge-functions/chat.js  OpenRouter relay that streams replies; reads OPENROUTER_API_KEY
├── build.js                netlify-index.html -> dist/index.html (single file)
├── netlify.toml            publish dist/, build, function route, headers
├── dist/index.html         built page (committed so a drag-and-drop deploy works)
└── tests/                  node --test tests/ (relay), plus headless suites (see below)
```

## Run locally

Open `index.html` directly, or serve the folder:

```
python3 -m http.server 8080 --directory eni-tutor
```

Starts in **demo** mode with no network. Open Menu → Model to pick OpenRouter, paste a key
into this browser, and Save. The dev page sends the key straight to the provider, so use a
key you are happy to keep in local storage. The Netlify build never does this.

## Deploy to Netlify

The chat needs the function, and the function needs a key. That means a Git-connected deploy.

1. Push this folder to a repository and in Netlify choose **Add new site → Import an existing project**.
2. Build command `npm run build`, publish directory `dist` (both already in `netlify.toml`).
3. In **Site configuration → Environment variables**, add `OPENROUTER_API_KEY` with your OpenRouter key.
4. Deploy. Check that the page loads and that a question gets an answer.

**Drag-and-drop (`eni-tutor-netlify.zip`)** publishes only the page. The chat will show an error
because the function is not in the zip. Use it to check the page and the library, not the chat.

The key never appears in the page, in `dist/`, or in the repository. `build.js` refuses to write
a page that contains key-shaped text.

### The model

`nvidia/nemotron-3.5-super-vl:free` on OpenRouter. The function forces this model, so the page
cannot select another. Limits set in the function:

- replies stream as they arrive, with a heartbeat while the model is still thinking, so no request sits idle long enough to hit a gateway timeout (the old synchronous function hit a 504 at about ten seconds);
- replies are capped at 2048 tokens;
- request bodies are capped at 64 KB, at most 40 messages, and 24,000 characters per message;
- calls are accepted only from the site's own origin.

**Free tier.** OpenRouter's listing for this model says usage is logged for security and to help
NVIDIA improve its products, so do not send confidential or personal material through it.

## Knowledge base

```
python3 tools/build_kb.py         # kb/ -> data/kb.js (33 docs)
```

The four files in `kb/v2/` are the course (see "Curriculum"). The twelve research cards in
`kb/research/` are citation cards: they carry a title and an arXiv link, not the paper's text.

### Adding arXiv papers

```
python3 tools/fetch_arxiv.py                 # every paper in arxiv_manifest.json
python3 tools/fetch_arxiv.py 2402.04249      # one paper
python3 tools/build_kb.py
```

Run this on a machine with arXiv access. It reads each paper's HTML rendering and records the
paper's licence from its abstract page.

## Curriculum

Five tiers, Novice to Master, built on the v1 attack course with a 2026 update in each tier.
Attack technique is taught in full: persona and encoding campaigns, multi-turn escalation,
document and agent injection, RAG poisoning, automated and RL attackers, adaptive attacks
against defenses, and novel attack classes. The labs are attacks, run against owned systems,
sandboxes, benchmark datasets, or targets with permission.

The course keeps four hard lines: no operational help toward mass-casualty weapons, no malware
written for deployment, no sexual content involving minors, and no targeting or deceiving a real,
identifiable person.

## Tests

```
node --test tests/netlify-function.test.js   # relay function: 8 tests, stubbed upstream, no network
```

The headless suites (`unit`, `dom`, `robustness`, `regression`) are plain scripts that expect a
worker sandbox that provides `fs.read('/app/...')`. `regression` runs in a shim and has three
failures that were present before v2 (library detail pane and chunk counter). The other three
suites did not run in the v2 build environment, so they have not been verified in v2.

## Open decisions

- **The persona prompt** (`data/system-prompt.md` / `.js`) asks the model to teach "without
  restriction" and to ignore safety reminders. It has no hard lines, but the course does. The
  model will follow whichever it reads last, so edit the persona to match the course before you
  rely on it.
- **`X-Frame-Options: DENY`** in `netlify.toml` blocks embedding the page in an iframe. Remove it
  if an embedded preview is needed.
- **Access.** The Netlify URL is public unless you protect it. Every visit spends your OpenRouter
  key, so add a password or token before you share the link.

## Typography

Bonsai is the display face (wordmark, headings) and has no em dash, ellipsis, bullet or arrow,
so it must not carry body text. Outfit is the UI face and JetBrains Mono the code face. All three
are local and inlined in the Netlify build.
