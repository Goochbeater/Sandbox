// shared headless test helpers (playwright + CDP touch)
import { chromium } from "/opt/node22/lib/node_modules/playwright/index.mjs";
import path from "node:path";
import { fileURLToPath } from "node:url";
export const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
export const SP = "/tmp/claude-0/-home-user-Sandbox/e318f6c8-a392-5ff4-a3ce-7b8788f3ab03/scratchpad";

export async function launch({ w = 1100, h = 540, dev = true, mobile = true, dpr = 1 } = {}) {
  const browser = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist", "--autoplay-policy=no-user-gesture-required"] });
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, hasTouch: true, isMobile: mobile, deviceScaleFactor: dpr });
  const page = await ctx.newPage();
  const logs = [];
  page.on("console", (m) => { if (m.type() !== "log") logs.push(m.type() + ": " + m.text()); });
  page.on("pageerror", (e) => logs.push("PAGEERROR: " + e.message));
  await page.goto("file://" + path.join(root, dev ? "SPOREHEART.dev.html" : "SPOREHEART.html"));
  await page.waitForFunction(() => window.G && G.game && G.game.scene && G.ui && G.ui.root, null, { timeout: 90000 });
  const cdp = await ctx.newCDPSession(page);
  const T = {
    pts: new Map(),
    async send(type) { await cdp.send("Input.dispatchTouchEvent", { type, touchPoints: [...T.pts.entries()].map(([id, p]) => ({ x: p.x, y: p.y, id })) }); },
    async down(id, x, y) { T.pts.set(id, { x, y }); await T.send("touchStart"); },
    async move(id, x, y) { T.pts.set(id, { x, y }); await T.send("touchMove"); },
    async up(id) { T.pts.delete(id); await T.send("touchEnd"); },
    async tap(x, y, ms = 60) { await T.down(99, x, y); await page.waitForTimeout(ms); await T.up(99); }
  };
  return { browser, page, cdp, T, logs, ev: (f, a) => page.evaluate(f, a) };
}
export async function shot(page, name) { await page.screenshot({ path: `${SP}/${name}.png` }); }

export async function btnPos(page, act) {
  return page.evaluate((a) => { const e = document.querySelector(`.sh-b[data-act="${a}"]`); const r = e.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; }, act);
}
export async function press(page, T, act, ms = 80) { const p = await btnPos(page, act); await T.down(50 + act.length, p.x, p.y); await page.waitForTimeout(ms); await T.up(50 + act.length); }
export async function begin(page, T) {
  await page.evaluate(() => [...document.querySelectorAll('.sh-btn')].find(x => /begin/i.test(x.textContent)).click());
  await page.waitForTimeout(600);
}

/* Synthetic multi-touch: dispatches PointerEvents straight at the element under the finger (and keeps
   sending to it, like pointer capture). Deterministic multi-finger tests without CDP quirks. */
export function synth(page) {
  const S = {
    async down(id, x, y) { await page.evaluate(([id, x, y]) => { const el = document.elementFromPoint(x, y); window.__tp = window.__tp || {}; window.__tp[id] = el; el.dispatchEvent(new PointerEvent("pointerdown", { pointerId: id, pointerType: "touch", clientX: x, clientY: y, bubbles: true, cancelable: true, isPrimary: id === 1 })); }, [id, x, y]); },
    async move(id, x, y) { await page.evaluate(([id, x, y]) => { const el = window.__tp[id]; el && el.dispatchEvent(new PointerEvent("pointermove", { pointerId: id, pointerType: "touch", clientX: x, clientY: y, bubbles: true, cancelable: true })); }, [id, x, y]); },
    async up(id, x = 0, y = 0) { await page.evaluate(([id, x, y]) => { const el = window.__tp[id]; el && el.dispatchEvent(new PointerEvent("pointerup", { pointerId: id, pointerType: "touch", clientX: x, clientY: y, bubbles: true, cancelable: true })); delete window.__tp[id]; }, [id, x, y]); },
    async tapBtn(act, ms = 70) { const p = await btnPos(page, act); const id = 60 + act.length * 3; await S.down(id, p.x, p.y); await page.waitForTimeout(ms); await S.up(id, p.x, p.y); }
  };
  return S;
}
