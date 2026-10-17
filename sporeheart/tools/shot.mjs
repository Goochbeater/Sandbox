// headless screenshot harness: node tools/shot.mjs <out.png> [js-to-eval-after-boot] [waitMs] [w] [h]
import { chromium } from "/opt/node22/lib/node_modules/playwright/index.mjs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const [out, js = "", wait = "2500", W = "1100", H = "540"] = process.argv.slice(2);
const browser = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist", "--enable-webgl"] });
const page = await browser.newPage({ viewport: { width: +W, height: +H }, hasTouch: true, isMobile: false });
const logs = [];
page.on("console", (m) => logs.push(m.type() + ": " + m.text()));
page.on("pageerror", (e) => logs.push("PAGEERROR: " + e.message));
await page.goto("file://" + path.join(root, process.env.DEV ? "SPOREHEART.dev.html" : "SPOREHEART.html"));
await page.waitForTimeout(+wait);
if (js) { try { const r = await page.evaluate(js); if (r !== undefined) logs.push("eval: " + JSON.stringify(r)); } catch (e) { logs.push("EVALERR: " + e.message); } await page.waitForTimeout(+wait); }
await page.screenshot({ path: out });
console.log(logs.slice(0, 40).join("\n"));
await browser.close();
