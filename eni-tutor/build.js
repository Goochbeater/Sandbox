#!/usr/bin/env node
// Builds the Netlify site into dist/: index.html (OpenRouter) and preview.html
// (demo mode). Both are single self-contained pages.
//
// The CSS, fonts, knowledge base, scripts and portrait are all inlined, so the
// page works when it is opened alone (a preview, a file, a copy in a chat) as
// well as from Netlify. Nothing secret is part of the build: the OpenRouter key
// stays in the site's OPENROUTER_API_KEY variable and is read only by
// netlify/functions/chat.js.

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
