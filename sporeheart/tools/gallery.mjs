// Isolated character gallery.
//   node tools/build.mjs --gallery --out=/tmp/x/gal.html      (build first)
//   node tools/gallery.mjs --html=/tmp/x/gal.html --out=/tmp/x/shot "witch:yaw:pitch:dist:lookY:fov:clip:t" ...
// spec fields (all optional after the id): yaw(rad) pitch(rad) dist(m) lookY(m) fov(deg) clip t(sec into clip)
//   id = witch | crane | thistle | veil | veil2 | beast | imp   (anything G.chars.build() accepts)
import { chromium } from "/opt/node22/lib/node_modules/playwright/index.mjs";
const args = process.argv.slice(2);
const opt = (n, d) => { const a = args.find((x) => x.startsWith("--" + n + "=")); return a ? a.slice(n.length + 3) : d; };
const html = opt("html"), out = opt("out", "/tmp/gallery"), W = +opt("w", 640), H = +opt("h", 900);
const specs = args.filter((a) => !a.startsWith("--"));
const browser = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
const page = await browser.newPage({ viewport: { width: W, height: H } });
const logs = [];
page.on("console", (m) => { if (m.type() !== "log") logs.push(m.type() + ": " + m.text()); });
page.on("pageerror", (e) => logs.push("PAGEERROR: " + e.message));
await page.goto("file://" + html);
await page.waitForFunction(() => window.G && G.gallery && G.gallery.ready, null, { timeout: 90000 });
let i = 0;
for (const spec of specs) {
  const [id, yaw = "0", pitch = "0.05", dist = "4", lookY = "0.9", fov = "30", clip = "", t = "0.02"] = spec.split(":");
  const err = await page.evaluate(({ id, yaw, pitch, dist, lookY, fov, clip, t }) => {
    try {
      const o = G.chars.build(id);
      G.gallery.show(o, { yaw: +yaw, pitch: +pitch, dist: +dist, lookY: +lookY, fov: +fov, clip: clip || null, t: +t });
      return null;
    } catch (e) { return e.stack; }
  }, { id, yaw, pitch, dist, lookY, fov, clip, t });
  if (err) logs.push("BUILD ERR " + id + ": " + err);
  await page.waitForTimeout(900);
  await page.screenshot({ path: `${out}_${i}_${id}.png` });
  i++;
}
console.log(logs.slice(0, 30).join("\n") || "ok");
await browser.close();
