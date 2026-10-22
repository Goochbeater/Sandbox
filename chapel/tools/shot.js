// node tools/shot.js <scenario.js> [outdir] [query]  — headless system Chrome (real GPU), file:// URL, no server.
const puppeteer = require('./node_modules/puppeteer-core');
const path = require('path'), fs = require('fs');
(async () => {
  const [, , scen, outArg, qArg] = process.argv;
  const out = path.resolve(outArg || path.join(__dirname, '../out')); fs.mkdirSync(out, { recursive: true });
  const url = process.env.URL || ('file://' + path.resolve(__dirname, '../build/game.html') + (qArg || ''));
  const W = +(process.env.W || 1280), H = +(process.env.H || 720);
  const browser = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: 'new', protocolTimeout: 900000,
    args: ['--use-angle=metal', '--ignore-gpu-blocklist', '--enable-gpu-rasterization', `--window-size=${W},${H}`, '--mute-audio', '--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows', '--allow-file-access-from-files'] });
  const page = await browser.newPage(); await page.setViewport({ width: W, height: H, deviceScaleFactor: +(process.env.DSF || 1) });
  const errors = [];
  page.on('pageerror', (e) => { errors.push('PAGEERROR ' + e.message); console.log('PAGEERROR', e.message); });
  page.on('console', (m) => { const t = m.type(); const x = t + ': ' + m.text().slice(0, 3000); if (t === 'error') errors.push(x); if (!process.env.QUIET || t === 'error' || t === 'warning') console.log(x); });
  const t0 = Date.now(); await page.goto(url, { waitUntil: 'load', timeout: 120000 });
  try { await page.waitForFunction(() => typeof MG !== 'undefined' && (MG.ready || MG.bootError), { timeout: 300000 }); } catch (e) { console.log('BOOT TIMEOUT'); }
  const be = await page.evaluate(() => typeof MG !== 'undefined' && MG.bootError); if (be) { console.log('BOOT ERROR:\n' + be); await browser.close(); process.exit(1); }
  console.log('booted in', ((Date.now() - t0) / 1000).toFixed(1), 's');
  const Hn = {
    page, out, eval: (f, ...a) => page.evaluate(f, ...a),
    shot: async (name, q) => { const p = `${out}/${name}.jpg`; const data = await page.evaluate((q) => __mg.shot(q || 0.9), q); fs.writeFileSync(p, Buffer.from(data.split(',')[1], 'base64')); console.log('shot', p); return p; },
    pshot: async (name) => { const p = `${out}/${name}.jpg`; await page.evaluate(() => { R.render(0); }); await page.screenshot({ path: p, type: 'jpeg', quality: 88 }); console.log('shot', p); return p; },
    wait: (ms) => new Promise((r) => setTimeout(r, ms)), key: page.keyboard, mouse: page.mouse,
    step: (n, dt) => page.evaluate((n, dt) => __mg.step(n, dt), n, dt || 1 / 60),
  };
  try { await require(path.resolve(scen))(Hn); } catch (e) { errors.push('SCENARIO ' + e.stack); console.log('SCENARIO ERROR', e.stack); }
  try { console.log(JSON.stringify(await page.evaluate(() => __mg.info()))); } catch (e) {}
  await browser.close(); process.exit(errors.some((e) => e.startsWith('PAGEERROR') || e.startsWith('SCENARIO')) ? 1 : 0);
})();
