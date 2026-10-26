#!/usr/bin/env node
// Builds the Netlify site into dist/: index.html (OpenRouter) and preview.html
// (demo mode). Both are single self-contained pages.
//
// The CSS, fonts, knowledge base, scripts and portrait are all inlined, so the
// page works when it is opened alone (a preview, a file, a copy in a chat) as
// well as from Netlify. Nothing secret is part of the build: the OpenRouter key
// stays in the site's OPENROUTER_API_KEY variable and is read only by
// netlify/edge-functions/chat.js. The knowledge module goes to netlify/edge-lib,
// outside the functions folder, because Netlify builds every file there as a
// function and it has no default export.

const fs = require('fs');
const path = require('path');

const root = __dirname;
const outDir = path.join(root, 'dist');
const MIME = {
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
};

const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const dataUri = (file) =>
  'data:' + MIME[path.extname(file)] + ';base64,' + fs.readFileSync(path.join(root, file)).toString('base64');
// A literal "</script" or "</style" in inlined code would end the element early.
const inline = (text) => text.replace(/<\/(script|style)/gi, '<\\/$1');

let html = read('netlify-index.html');

// 1. Stylesheet, with its fonts inlined.
let css = read('style.css').replace(/url\((['"]?)(fonts\/[^'")]+)\1\)/g, (m, q, file) => 'url(' + dataUri(file) + ')');
const styleTag = '<link rel="stylesheet" href="style.css">';
if (html.split(styleTag).length !== 2) throw new Error('stylesheet link not found once in netlify-index.html');
html = html.replace(styleTag, () => '<style>\n' + inline(css) + '\n</style>');

// 2. Scripts, in the order the template loads them.
html = html.replace(/<script src="([^"]+)"><\/script>/g, (m, file) => '<script>\n' + inline(read(file)) + '\n</script>');

// 3. The portrait is hard-locked: embedded in the page, not fetched.
const portraitRef = "portraitSrc: 'portrait/portrait.png'";
if (html.split(portraitRef).length !== 2) throw new Error('portrait config not found once');
html = html.replace(portraitRef, () => "portraitSrc: '" + dataUri('portrait/portrait.png') + "'");

// 4. Refuse to write a page that refers to anything outside itself, or that
//    contains anything key-shaped.
if (/<script src=|<link rel="stylesheet" href="(?!https?:)/.test(html)) throw new Error('an external file reference survived inlining');
if (/ENI_NETLIFY_API_KEY|sk-or-[A-Za-z0-9]/.test(html)) throw new Error('key-like text found in the build; refusing to write it');

fs.mkdirSync(outDir, { recursive: true });
const size = (text) => (Buffer.byteLength(text, 'utf8') / 1048576).toFixed(2) + ' MB';
fs.writeFileSync(path.join(outDir, 'index.html'), html, 'utf8');
console.log('built dist/index.html (' + size(html) + ', self-contained, OpenRouter)');

// The same page in demo mode: no key and no network, answers from the library.
// It is the preview: open it anywhere, or at /preview.html on the site.
const demoConfig = "provider: 'openrouter',";
if (html.split(demoConfig).length !== 2) throw new Error('provider line not found once in the config');
const preview = html.replace(demoConfig, "provider: 'demo',");
fs.writeFileSync(path.join(outDir, 'preview.html'), preview, 'utf8');
console.log('built dist/preview.html (' + size(preview) + ', demo mode)');

// The knowledge library. The persona and an index of every document are always
// sent to the model. Full documents are sent only when a reply needs them, so
// the index is what the model sees by default. Dev page: data/kb-docs.js.
function walkMd(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const full = path.join(dir, e.name);
    return e.isDirectory() ? walkMd(full) : (e.name.endsWith('.md') ? [full] : []);
  });
}
function readDoc(file) {
  const raw = fs.readFileSync(file, 'utf8');
  let title = path.basename(file, '.md');
  let type = '';
  let tags = [];
  let body = raw;
  const fm = raw.match(/^---\n([\s\S]*?)\n---\n?/);
  if (fm) {
    const t = fm[1].match(/^title:\s*"?(.*?)"?\s*$/m);
    if (t) title = t[1];
    const y = fm[1].match(/^type:\s*(\S+)/m);
    if (y) type = y[1];
    const g = fm[1].match(/^tags:\s*\[(.*)\]/m);
    if (g) tags = g[1].split(',').map((x) => x.trim().replace(/^["']|["']$/g, '')).filter(Boolean);
    body = raw.slice(fm[0].length);
  }
  body = body.trim();
  // the first real sentence of the body, as the index summary
  const para = body.split(/\n\s*\n/).find((p) => p.trim() && !/^#/.test(p.trim())) || '';
  const summary = tags.length ? tags.join(', ') : para.replace(/\s+/g, ' ').trim().slice(0, 180);
  return { path: path.relative(root, file).split(path.sep).join('/'), title, type, tags, summary, body };
}
const docs = walkMd(path.join(root, 'kb')).sort().map(readDoc);
docs.forEach((d, i) => { d.id = 'D' + String(i + 1).padStart(2, '0'); });
const index = docs.map(({ id, path: p, title, type, tags, summary }) => ({ id, path: p, title, type, tags, summary }));
const texts = Object.fromEntries(docs.map((d) => [d.path, d.body]));
const persona = fs.readFileSync(path.join(root, 'data', 'system-prompt.md'), 'utf8');

fs.mkdirSync(path.join(root, 'netlify', 'edge-lib'), { recursive: true });
fs.writeFileSync(path.join(root, 'netlify', 'edge-lib', 'knowledge.js'),
  'export const PERSONA = ' + JSON.stringify(persona) + ';\n\n' +
  'export const INDEX = ' + JSON.stringify(index) + ';\n\n' +
  'export const DOCS = ' + JSON.stringify(texts) + ';\n', 'utf8');
fs.writeFileSync(path.join(root, 'data', 'kb-docs.js'),
  'window.KB_INDEX = ' + JSON.stringify(index) + ';\nwindow.KB_DOCS = ' + JSON.stringify(texts) + ';\n', 'utf8');
const bytes = Object.values(texts).reduce((n, t) => n + Buffer.byteLength(t, 'utf8'), 0);
console.log('library: ' + docs.length + ' documents indexed, ' + (bytes / 1024).toFixed(0) + ' KB of full text, sent only on request');
