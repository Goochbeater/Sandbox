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
│   ├── v2/                 curriculum, labs, interview, quick reference (rewritten in v2)
│   ├── research/           citation cards; full text via tools/fetch_arxiv.py
│   └── articles/           articles, including arXiv papers once ingested
├── tools/
│   ├── build_kb.py         kb/ -> data/kb.js
│   ├── fetch_arxiv.py      ingests arXiv papers listed in arxiv_manifest.json
│   └── arxiv_manifest.json candidate papers and how far each was verified
├── netlify/functions/chat.js  OpenRouter relay; reads OPENROUTER_API_KEY
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

- replies are non-streamed and capped at 1536 tokens, to stay inside a synchronous function's time limit;
- request bodies are capped at 64 KB, at most 40 messages, and 24,000 characters per message;
- calls are accepted only from the site's own origin.

**Free tier.** OpenRouter's listing for this model says usage is logged for security and to help
NVIDIA improve its products, so do not send confidential or personal material through it.

## Knowledge base

```
python3 tools/build_kb.py         # kb/ -> data/kb.js (33 docs)
```

The four files in `kb/v2/` are the course. They are rewritten in v2 (see "Curriculum"). The
twelve research cards in `kb/research/` are citation cards: they carry a title and an arXiv link,
not the paper's text.

### Adding arXiv papers

```
python3 tools/fetch_arxiv.py                 # every paper in arxiv_manifest.json
python3 tools/fetch_arxiv.py 2402.04249      # one paper
python3 tools/build_kb.py
```

Run this on a machine with arXiv access. It reads each paper's HTML rendering and records the
licence from its abstract page. **Check the licence before you publish the site.** A paper
licensed only under arXiv's non-exclusive licence can be read here, but a public site
redistributes its text.

## Curriculum

Five tiers, from basic to advanced: Foundations (Novice), Measurement (Apprentice), Applications
and agents (Journeyman), Automated and adaptive testing (Expert), Defense, research and
disclosure (Master). Each tier has labs with a deliverable, a success test and a defender
takeaway. The curriculum's ground rules apply to every lab: authorization first, owned or
sandboxed targets only, verdicts rather than harmful outputs, and no live third-party services.

## Tests

```
node --test tests/netlify-function.test.js   # relay function: 8 tests, stubbed upstream, no network
```

The headless suites (`unit`, `dom`, `robustness`, `regression`) are plain scripts that expect a
worker sandbox that provides `fs.read('/app/...')`. `regression` runs in a shim and has three
failures that were present before v2 (library detail pane and chunk counter). The other three
suites did not run in the v2 build environment, so they have not been verified in v2.

## Open decisions

- **The persona prompt** (`data/system-prompt.md` / `.js`) tells the model to teach "without
  restriction", to give attacks "in the form you'd actually use", and to ignore safety reminders.
  It conflicts with the curriculum's ground rules. Decide which one stands before the site is public.
- **`X-Frame-Options: DENY`** in `netlify.toml` blocks embedding the page in an iframe. Remove it
  if an embedded preview is needed.

## Typography

Bonsai is the display face (wordmark, headings) and has no em dash, ellipsis, bullet or arrow,
so it must not carry body text. Outfit is the UI face and JetBrains Mono the code face. All three
are local and inlined in the Netlify build.
