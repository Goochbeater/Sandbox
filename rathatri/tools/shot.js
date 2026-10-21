// node tools/shot.js <scenario.js> [outdir] [query]
// Headless Chromium (Playwright, SwiftShader software GL) against the built single file — file:// URL, no server.
//   env: URL=<full url>   BUILD=<path to html>   W=<px> H=<px> DSF=<n>   MOBILE=1 (phone landscape, touch)   QUIET=1
// Scenario modules receive H = { page, out, eval, shot, pshot, wait, step, tap, touch:{down,move,up}, waitFor }.
const path = require('path'), fs = require('fs');
let chromium;
try { ({ chromium } = require('playwright')); } catch (e) { ({ chromium } = require('/opt/node-tools/node_modules/playwright')); }
(async () => {
  const [, , scen, outArg, qArg] = process.argv;
  const out = path.resolve(outArg || path.join(__dirname, '../out')); fs.mkdirSync(out, { recursive: true });
  const build = process.env.BUILD || path.resolve(__dirname, '../build/game.html');
  const url = process.env.URL || ('file://' + build + (qArg || ''));
  const mobile = !!process.env.MOBILE;
  const W = +(process.env.W || (mobile ? 844 : 1280)), Hh = +(process.env.H || (mobile ? 390 : 720));
  const exe = process.env.CHROME || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
  const browser = await chromium.launch({ executablePath: fs.existsSync(exe) ? exe : undefined, headless: true,
    args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--mute-audio', '--no-sandbox',
      '--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows', '--allow-file-access-from-files', '--autoplay-policy=no-user-gesture-required', '--disable-background-networking', '--disable-component-update', '--disable-sync', '--no-first-run', '--no-default-browser-check', '--disable-default-apps', '--disable-extensions', '--metrics-recording-only', '--disable-features=Translate,OptimizationHints,MediaRouter'] });
  const ctx = await browser.newContext({ viewport: { width: W, height: Hh }, deviceScaleFactor: +(process.env.DSF || 1), hasTouch: mobile, isMobile: mobile });
  const page = await ctx.newPage();
  page.setDefaultTimeout(900000);
  const errors = [];
  page.on('pageerror', (e) => { errors.push('PAGEERROR ' + e.message); console.log('PAGEERROR', e.message, process.env.STACK ? e.stack : ''); });
  page.on('console', (m) => { const t = m.type(); const x = t + ': ' + m.text().slice(0, 3000); if (t === 'error') errors.push(x); if (!process.env.QUIET || t === 'error' || t === 'warning') console.log(x); });
  const t0 = Date.now(); await page.goto(url, { waitUntil: 'load', timeout: 180000 });
  try { await page.waitForFunction(() => typeof MG !== 'undefined' && (MG.ready || MG.bootError), null, { timeout: 300000 }); } catch (e) { console.log('BOOT TIMEOUT'); }
  const be = await page.evaluate(() => typeof MG !== 'undefined' && MG.bootError); if (be) { console.log('BOOT ERROR:\n' + be); await browser.close(); process.exit(1); }
  console.log('booted in', ((Date.now() - t0) / 1000).toFixed(1), 's');
  // puppeteer-style waitForFunction(fn, {timeout}) compatibility
  const wff = page.waitForFunction.bind(page);
  page.waitForFunction = (fn, a, b) => (a && typeof a === 'object' && b === undefined && 'timeout' in a) ? wff(fn, null, a) : wff(fn, a, b);
  const cdp = await ctx.newCDPSession(page); const pts = new Map();
  const sendTouch = (type) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: [...pts.entries()].map(([id, p]) => ({ id, x: p[0], y: p[1] })) });
  const Hn = {
    page, out, eval: (f, a) => page.evaluate(f, a),
    shot: async (name, q) => { const p = `${out}/${name}.jpg`; const data = await page.evaluate((q) => __mg.shot(q || 0.9), q); fs.writeFileSync(p, Buffer.from(data.split(',')[1], 'base64')); console.log('shot', p); return p; },
    pshot: async (name) => { const p = `${out}/${name}.jpg`; await page.evaluate(() => { R.render(0); }); await page.screenshot({ path: p, type: 'jpeg', quality: 88 }); console.log('shot', p); return p; },
    wait: (ms) => new Promise((r) => setTimeout(r, ms)), key: page.keyboard, mouse: page.mouse,
    step: (n, dt) => page.evaluate(([n, dt]) => __mg.step(n, dt), [n, dt || 1 / 60]),
    waitFor: (fn, arg, timeout) => page.waitForFunction(fn, arg, { timeout: timeout || 300000 }),
    tap: async (x, y) => { await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y, id: 99 }] }); await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); },
    touch: {
      down: async (id, x, y) => { pts.set(id, [x, y]); await sendTouch('touchStart'); },
      move: async (id, x, y) => { pts.set(id, [x, y]); await sendTouch('touchMove'); },
      up: async (id) => { pts.delete(id); await sendTouch('touchEnd'); },
    },
  };
  try { await require(path.resolve(scen))(Hn); } catch (e) { errors.push('SCENARIO ' + e.stack); console.log('SCENARIO ERROR', e.stack); }
  try { console.log(JSON.stringify(await page.evaluate(() => __mg.info()))); } catch (e) { /* */ }
  await browser.close(); process.exit(errors.some((e) => e.startsWith('PAGEERROR') || e.startsWith('SCENARIO')) ? 1 : 0);
})();
