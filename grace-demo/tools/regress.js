// Headless regression runner for the built page. Runs every suite in tools/regress/ (or the ones named) through
// tools/shot.js and prints one PASS or FAIL line per run. Exit code 1 if anything failed. Usage:
//   node tools/regress.js [suite ...]        e.g. node tools/regress.js rooms endings
// env: W, H, DPR (default 800x357 at 1x) are passed on to shot.js
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const dir = path.join(__dirname, 'regress');
const shot = path.join(__dirname, 'shot.js');
const page = path.resolve(__dirname, '../build/index.html');

function parseEval(raw) {
  let v;
  try { v = JSON.parse(raw); } catch (e) { return raw; }
  if (typeof v === 'string') { try { v = JSON.parse(v); } catch (e) { /* plain string result */ } }
  return v;
}

function runOne(suite, run) {
  const env = Object.assign({}, process.env, { Q: run.query });
  env.W = env.W || '800'; env.H = env.H || '357'; env.DPR = env.DPR || '1';
  const steps = run.steps.filter((s) => s[0] !== 'shot');
  const out = path.join(__dirname, '../out/regress', `${suite.name}-${run.label}`);
  let text;
  try {
    text = execFileSync('node', [shot, page, out, JSON.stringify(steps)],
      { cwd: __dirname, env, encoding: 'utf8', maxBuffer: 1 << 26 });
  } catch (e) {
    const msg = String(e.stderr || e.message).trim().split('\n').pop();
    return `shot.js failed: ${msg}`;
  }
  const lines = text.split('\n');
  const perr = lines.find((l) => l.startsWith('[pageerror]'));
  if (perr) return perr;
  const evals = lines.filter((l) => l.startsWith('[eval] ')).map((l) => parseEval(l.slice(7)));
  try {
    return suite.check(run.label, evals) || null;
  } catch (e) {
    return `check threw: ${e.message}`;
  }
}

const names = process.argv.slice(2);
const files = names.length
  ? names.map((n) => `${n.replace(/\.js$/, '')}.js`)
  : fs.readdirSync(dir).filter((f) => f.endsWith('.js') && f !== 'drv.js').sort();

let passed = 0, failed = 0;
for (const file of files) {
  let suite;
  try { suite = require(path.join(dir, file)); } catch (e) {
    console.log(`FAIL ${file}: ${e.code === 'MODULE_NOT_FOUND' ? 'no such suite' : e.message}`);
    failed++;
    continue;
  }
  for (const run of suite.runs) {
    const id = `${suite.name}/${run.label}`;
    const reason = runOne(suite, run);
    if (reason) { console.log(`FAIL ${id}: ${reason}`); failed++; }
    else { console.log(`PASS ${id}`); passed++; }
  }
}
console.log(`${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
